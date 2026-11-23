const visualJournal = (() => {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  })[char]);
  const dateTime = new Intl.DateTimeFormat('ru', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
  const monthDay = new Intl.DateTimeFormat('ru', {day:'numeric', month:'short'});
  const weekday = new Intl.DateTimeFormat('ru', {weekday:'short'});
  const hour = 3600000;
  const gapThreshold = 3*hour;
  const validTime = value => Number.isFinite(value) && value >= 0 && value <= 8640000000000000;
  const number = value => Number(value.toFixed(2));
  const bounded = (value,min,max) => Math.min(max,Math.max(min,value));
  const growthGlyphs = {
    water:'<path d="M9 2c-2 3-5 6-5 9a5 5 0 0010 0c0-3-3-6-5-9Z"/>',
    fertilizer:'<path d="M9 2 10.7 7.3 16 9 10.7 10.7 9 16 7.3 10.7 2 9 7.3 7.3Z"/>',
    plant:'<path d="M9 16v-5c0-5 3-7 7-7-1 4-3 6-7 7-4-1-6-3-7-7 4 0 7 2 7 7"/>',
    observe:'<circle cx="7.5" cy="7.5" r="4.5"/><path d="m11 11 4 4"/>',
  };
  function glyph(kind) {
    return `<svg viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${growthGlyphs[kind]}</svg>`;
  }
  function eventType(event) {
    const text = typeof event?.text === 'string' ? event.text : '';
    if (event?.kind==='water') {
      const watered=Number.isInteger(event.plantsWatered)
        ? event.plantsWatered>0
        : !/колод|набрал|запас вод/iu.test(text)&&/полито|полит|полив|напои/iu.test(text);
      return watered?'water':null;
    }
    if (event?.kind==='spark'&&/подкорм|удобрен|ускорен/iu.test(text)) return 'fertilizer';
    if (event?.kind==='garden'&&(event.plantsAdded>0||/посаж|посеян|черенок/iu.test(text))) return 'plant';
    return null;
  }
  function careEventsForPlant(entries,id,first=-Infinity,last=Infinity) {
    return entries.filter(event=>event&&validTime(event.at)&&event.at>=first&&event.at<=last
      &&(event.plantId===id||Array.isArray(event.plantIds)&&event.plantIds.includes(id)))
      .map(event=>({at:event.at,type:eventType(event)}))
      .filter(event=>event.type==='water'||event.type==='fertilizer')
      .sort((a,b)=>a.at-b.at);
  }
  function hasObservationGap(first,last) {
    return last-first>=gapThreshold;
  }
  function growthChart(rows=[],entries=[],plantId) {
    const ordered = rows.filter(row=>validTime(row?.at)&&Number.isFinite(row.growth)).sort((a,b)=>a.at-b.at);
    if (!ordered.length) return '<p class="visual-chart-empty">График появится после первого наблюдения.</p>';
    const left=54, right=590, top=44, bottom=185, width=right-left;
    const start=ordered[0].at, end=ordered.at(-1).at;
    const x=at=>start===end?left+width/2:number(left+(at-start)/(end-start)*width);
    const y=growth=>number(bottom-bounded(growth,0,1)*(bottom-top));
    const gaps=[],segments=[[]];
    ordered.forEach((row,index)=>{
      const previous=ordered[index-1];
      if (previous && hasObservationGap(previous.at,row.at)) {
        gaps.push([x(previous.at),x(row.at)]);
        segments.push([]);
      }
      segments.at(-1).push(`${x(row.at)},${y(row.growth)}`);
    });
    const levels=[1,.75,.5,.25,0].map(level=>`<path d="M${left} ${y(level)}H${right}" class="visual-chart-rule"/><text x="${left-7}" y="${y(level)+4}" text-anchor="end" class="visual-chart-label">${level*100}%</text>`).join('');
    const missing=gaps.map(([a,b])=>{
      const strokes=[];
      for(let line=a+5;line<b+(bottom-top);line+=10) {
        const atTop=Math.min(b,line), atBottom=Math.max(a,line-(bottom-top));
        const yTop=top+Math.max(0,line-b), yBottom=top+Math.min(bottom-top,line-a);
        if (yBottom>yTop) strokes.push(`M${number(atTop)} ${number(yTop)}L${number(atBottom)} ${number(yBottom)}`);
      }
      return `<g data-visual-gap><rect x="${a}" y="${top}" width="${Math.max(0,b-a)}" height="${bottom-top}"/><path d="${strokes.join('')}"/></g>`;
    }).join('');
    const trend=segments.filter(segment=>segment.length>1).map(segment=>`<polyline class="visual-chart-series" points="${segment.join(' ')}"/>`).join('');
    const points=ordered.map(row=>`<circle cx="${x(row.at)}" cy="${y(row.growth)}" r="3.5" class="visual-chart-point"><title>${escape(dateTime.format(row.at))} · ${Math.round(bounded(row.growth,0,1)*100)}%</title></circle>`).join('');
    const careEvents=careEventsForPlant(entries,plantId,start,end);
    const markers=careEvents.map(({at,type})=>{
      const lane=type==='water'?25:7;
      return `<g data-visual-event="${type}" transform="translate(${x(at)} 0)"><title>${type==='water'?'Полив':'Подкормка'} · ${escape(dateTime.format(at))}</title><path class="visual-event-stem" d="M0 ${lane+15}V${top}"/><g transform="translate(-7 ${lane}) scale(.8)">${growthGlyphs[type]}</g></g>`;
    }).join('');
    const list=careEvents.length?`<details class="visual-chart-events"><summary>Отметки ухода · ${careEvents.length}</summary><ul>${careEvents.map(({at,type})=>`<li>${escape(dateTime.format(at))} · ${type==='water'?'Полив':'Подкормка'}</li>`).join('')}</ul></details>`:'';
    return `<figure class="visual-growth-figure"><svg viewBox="0 0 610 220" role="img" aria-label="Рост в процентах по ${ordered.length} сохранённым наблюдениям. Отметки полива, подкормки и пауз на шкале времени.">${missing}${levels}${trend}${points}${markers}<text class="visual-chart-label" x="${start===end?x(start):left}" y="210" text-anchor="${start===end?'middle':'start'}">${escape(dateTime.format(start))}</text>${start!==end?`<text class="visual-chart-label" x="${right}" y="210" text-anchor="end">${escape(dateTime.format(end))}</text>`:''}</svg><figcaption><div class="visual-chart-legend"><span class="visual-water-label">${glyph('water')} Полив</span><span class="visual-fertilizer-label">${glyph('fertilizer')} Подкормка</span><span><i class="visual-gap-swatch" aria-hidden="true"></i> Пауза от 3 ч</span></div>${list}</figcaption></figure>`;
  }
  function experimentChart(rows=[]) {
    const samples=rows.filter(row=>Number.isFinite(row?.at)&&Number.isFinite(row.a?.moisture)&&Number.isFinite(row.b?.moisture));
    if (!samples.length) return '';
    const left=45,right=327,top=20,bottom=139;
    const min=Math.min(...samples.map(row=>row.at)),max=Math.max(...samples.map(row=>row.at));
    const x=value=>number(left+(max===min?0:(value-min)/(max-min))*(right-left));
    const y=value=>number(bottom-bounded(value,0,100)*(bottom-top)/100);
    const series=[['a','А'],['b','Б']].map(([key,label])=>({key,label,rawY:y(samples.at(-1)[key].moisture)}));
    const sorted=series.slice().sort((a,b)=>a.rawY-b.rawY);
    const half=9,mid=bounded((sorted[0].rawY+sorted[1].rawY)/2,top+half,bottom-half);
    if(sorted[1].rawY-sorted[0].rawY<half*2) {
      sorted[0].labelY=mid-half;
      sorted[1].labelY=mid+half;
    }
    const grid=[0,25,50,75,100].map(value=>`<text x="${left-5}" y="${y(value)+4}" text-anchor="end" class="visual-chart-label">${value}%</text><path class="visual-chart-rule" d="M${left} ${y(value)}H${right}"/>`).join('');
    const printLines=series.map(({key,label,rawY,labelY=rawY})=>{
      const points=samples.map(row=>`${x(row.at)},${y(row[key].moisture)}`).join(' ');
      const ending=x(samples.at(-1).at);
      const style=key==='b'?' stroke-dasharray="6 4"':'';
      return `<g class="visual-experiment-${key}"><polyline points="${points}"${style}/><path d="M${ending} ${rawY}l10 ${number(labelY-rawY)}"/><text x="${ending+14}" y="${labelY+4}" class="visual-direct-label">Группа ${label}</text></g>`;
    }).join('');
    return `<svg class="experiment-graph visual-experiment-chart" viewBox="0 0 423 169" role="img" aria-label="Влажность почвы. Группа А — сплошная линия, группа Б — пунктир. Значения по часам доступны в таблице."><g>${grid}${printLines}</g><text x="${left}" y="160" class="visual-chart-label">${min} ч</text><text x="${right}" y="160" text-anchor="end" class="visual-chart-label">${max} ч</text></svg>`;
  }
  function startOfDay(time) {
    const date = new Date(time);
    date.setHours(0,0,0,0);
    return date;
  }
  function weekData(entries=[],history={},now=Date.now()) {
    const today=startOfDay(now);
    const days=new Map();
    for(let offset=6;offset>=0;offset--) {
      const date=new Date(today);
      date.setDate(date.getDate()-offset);
      days.set(date.getTime(),{date,today:offset===0,water:0,plant:0,observe:0});
    }
    const dayStarts=[...days.keys()];
    const first=dayStarts[0];
    const next=new Date(today);
    next.setDate(next.getDate()+1);
    function match(at){
      if(!validTime(at)||at<first||at>=next.getTime())return null;
      for(let index=dayStarts.length-1;index>=0;index--){
        if(at>=dayStarts[index])return days.get(dayStarts[index]);
      }
      return null;
    }
    for(const entry of entries) {
      const day=match(entry?.at),type=eventType(entry);
      if(day&&type==='water')day.water+=entry.plantsWatered>0?entry.plantsWatered:1;
      if(day&&type==='plant')day.plant+=entry.plantsAdded>0?entry.plantsAdded:1;
    }
    for(const rows of Object.values(history)) {
      if(!Array.isArray(rows))continue;
      for(const entry of rows) {
        const day=match(entry?.at);
        if(day)day.observe++;
      }
    }
    return [...days.values()];
  }
  function weekGrid(entries,history,now) {
    const actions=[['water','Полив'],['plant','Посадка'],['observe','Наблюдения']];
    return `<section class="visual-week" aria-label="Неделя по дням"><ol>${weekData(entries,history,now).map(day=>`<li${day.today?' aria-current="date"':''}><time datetime="${day.date.getFullYear()}-${String(day.date.getMonth()+1).padStart(2,'0')}-${String(day.date.getDate()).padStart(2,'0')}" aria-label="${escape(monthDay.format(day.date))}"><span>${escape(weekday.format(day.date))}</span><strong>${day.date.getDate()}</strong></time><ul>${actions.map(([key,label])=>`<li class="visual-week-${key}${day[key]?' visual-week-active':''}"><span class="visual-chart-sr">${label}: </span>${glyph(key)}<span>${day[key]||'—'}</span></li>`).join('')}</ul></li>`).join('')}</ol><p class="visual-chart-legend">${actions.map(([key,label])=>`<span class="visual-week-${key}">${glyph(key)} ${label}</span>`).join('')}</p></section>`;
  }
  function lineageRows(all,id) {
    const selected=all.find(plant=>plant.id===id);
    if(!selected)return {rows:[],missing:false};
    const identity=plant=>plant.lineageId||plant.id;
    const byId=new Map(all.map(plant=>[identity(plant),plant]));
    const ancestors=new Set();
    let root=selected;
    while(byId.has(root.parentLineageId)&&!ancestors.has(root.parentLineageId)){
      ancestors.add(identity(root));
      if(root.parentLineageId===identity(root))break;
      root=byId.get(root.parentLineageId);
    }
    const children=new Map();
    for(const plant of all){
      if(!plant.parentLineageId)continue;
      const group=children.get(plant.parentLineageId)||[];
      group.push(plant);
      children.set(plant.parentLineageId,group);
    }
    const rows=[],seen=new Set();
    for(let row=[root];row.length;){
      row=row.filter(plant=>{
        const key=identity(plant);
        if(seen.has(key))return false;
        seen.add(key);
        return true;
      });
      if(!row.length)break;
      rows.push(row);
      row=row.flatMap(plant=>children.get(identity(plant))||[]);
    }
    return {rows,missing:Boolean(root.parentLineageId&&!byId.has(root.parentLineageId))};
  }
  function scaleBar(label='Условная шкала схемы') {
    return `<span class="visual-scale-bar"><span class="visual-scale-rule" aria-hidden="true"><svg viewBox="0 0 80 11" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3v6h76V3M21 5v4m19-6v6m19-4v4"/></svg><span><b>0</b><b>¼</b></span></span><span>${escape(label)}<span class="visual-chart-sr">. Длина линейки — четверть ширины рисунка.</span></span></span>`;
  }
  function plate(illustration,caption) {
    return `<figure class="visual-study-plate">${illustration}<figcaption>${scaleBar(caption)}</figcaption></figure>`;
  }
  return Object.freeze({ eventType, careEventsForPlant, hasObservationGap, growthChart, experimentChart, weekData, weekGrid, lineageRows, scaleBar, plate });
})();
