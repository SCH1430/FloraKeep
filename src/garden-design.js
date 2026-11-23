const gardenDesign = (() => {
  const DAY=24*60*60*1000;
  const timeOfDay=new Intl.DateTimeFormat('ru-RU',{hour:'2-digit',minute:'2-digit'});
  const dateTime=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  const limit=(value,min,max)=>Math.max(min,Math.min(max,value));
  const percent=value=>Math.round(limit(Number.isFinite(value)?value:0,0,100));
  const number=value=>value.toFixed(2);
  const silhouettes=[
    '<path d="M8 13c-3-3 0-6 5-4 3 4-1 8-5 4Z"/>',
    '<path d="M10 17v-6M10 13C7 12 4 9 5 7c3 0 5 2 5 6Zm0-2c1-4 3-6 6-6 1 3-2 6-6 6Z"/>',
    '<path d="M10 18V7M10 12C4 12 2 9 3 6c5 0 7 2 7 6Zm0-2c1-4 3-6 8-6 0 4-3 6-8 6Zm0 6c1-3 3-4 6-4 0 3-2 4-6 4Z"/>',
    '<path d="M10 18V9m0 5c-3-4-4-4-6-3 0 3 2 4 6 4m0 1c2-3 5-4 7-3 0 3-3 4-7 4M10 9C6 9 5 6 7 5 6 2 9 1 10 3c2-2 5 0 3 2 3 2 1 4-3 4Z"/>',
  ];
  const stageNames=['Семя','Росток','Молодое растение','Взрослое растение'];

  function pickStillLife(plants) {
    const diverse=[],replacement=[],species=new Set();
    for(const plant of plants.slice().reverse()){
      if(species.has(plant.speciesId))replacement.push(plant);
      else {
        species.add(plant.speciesId);
        diverse.push(plant);
      }
      if(diverse.length===3)break;
    }
    return [...diverse,...replacement].slice(0,3).reverse();
  }
  function soilBand(value) {
    const moisture=percent(value);
    return moisture<35?'dry':moisture<48?'drooping':moisture<75?'moist':'wet';
  }
  function nextCare(game,state,now=Date.now()) {
    if(!state.plants.length)return null;
    let chosen=null;
    for(const plant of state.plants){
      const time=game.forecast(state,plant.id,now)?.nextWaterAt;
      if(!Number.isFinite(time))continue;
      if(!chosen||time<chosen.time||time===chosen.time&&plant.moisture<chosen.plant.moisture)chosen={plant,time};
    }
    if(!chosen)return {plant:state.plants[0],label:'После отпуска',time:null};
    const start=new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(start.getDate()+1);
    const label=chosen.time<=now?'Сейчас':chosen.time<start.getTime()?timeOfDay.format(chosen.time):dateTime.format(chosen.time);
    return {...chosen,label};
  }
  function growthStage(growth) {
    return growth>=1?3:growth>=.35?2:growth>0?1:0;
  }
  function growthSymbols() {
    return silhouettes.map((path,index)=>`<symbol id="flora-growth-${index}" viewBox="0 0 20 20">${path}</symbol>`).join('');
  }
  function growthRibbon(growth) {
    const current=growthStage(growth);
    return `<span class="growth-stage" role="img" aria-label="Стадия: ${stageNames[current]}" data-growth-stage="${current}">${silhouettes.map((_,index)=>`<span class="growth-stage-step${index===current?' is-current':''}${index<current?' is-past':''}" aria-hidden="true"><svg width="21" height="21" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round"><use href="#flora-growth-${index}"/></svg></span>`).join('')}</span>`;
  }
  function refreshRibbon(element,growth) {
    const stage=growthStage(growth);
    if(!element||Number(element.dataset.growthStage)===stage)return;
    element.dataset.growthStage=stage;
    element.setAttribute('aria-label','Стадия: '+stageNames[stage]);
    for(const [index,marker] of [...element.children].entries()){
      marker.classList.toggle('is-current',index===stage);
      marker.classList.toggle('is-past',index<stage);
    }
  }
  function compactReading(kind,label,value) {
    const shown=percent(value);
    return `<span class="compact-reading compact-reading-${kind}" data-reading="${kind}" style="--reading:${shown}%"><span>${label}</span><span class="compact-reading-track" aria-hidden="true"><i></i></span><strong data-reading-value>${shown}%</strong></span>`;
  }
  function compactReadings(plant) {
    return `<span class="compact-metrics" data-compact-values>${compactReading('water','Влага',plant.moisture)}${compactReading('growth','Рост',plant.growth*100)}</span>`;
  }
  function refreshReadings(holder,plant) {
    if(!holder)return;
    for(const [kind,value] of [['water',plant.moisture],['growth',plant.growth*100]]){
      const row=holder.querySelector('[data-reading="'+kind+'"]');
      const label=row?.querySelector('[data-reading-value]');
      const rounded=percent(value)+'%';
      if(!label||label.textContent===rounded)continue;
      label.textContent=rounded;
      row.style.setProperty('--reading',rounded);
    }
  }
  function moistureSeries(rows,journal,plantId,now=Date.now()) {
    const start=now-DAY;
    const samples=rows.filter(row=>Number.isFinite(row.at)&&Number.isFinite(row.moisture)&&row.at>=start&&row.at<=now)
      .slice().sort((a,b)=>a.at-b.at);
    const x=time=>6+limit((time-start)/DAY,0,1)*196;
    const y=value=>40-percent(value)*.34;
    const xAt=time=>{
      const next=samples.findIndex(row=>row.at>=time);
      if(next<=0)return samples[next<0?samples.length-1:0]?.moisture??0;
      const a=samples[next-1],b=samples[next];
      return a.moisture+(b.moisture-a.moisture)*(time-a.at)/Math.max(1,b.at-a.at);
    };
    const recorded=journal.filter(entry=>visualJournal.eventType(entry)==='water'&&(entry.plantId===plantId||entry.plantIds?.includes(plantId))&&entry.at>=start&&entry.at<=now).map(entry=>entry.at);
    return {
      points:samples.map(row=>[x(row.at),y(row.moisture)]),
      watered:[...new Set(recorded)].map(at=>[x(at),y(xAt(at))]),
    };
  }
  function moistureChart(rows,journal,plantId,now=Date.now()) {
    const {points,watered}=moistureSeries(rows,journal,plantId,now);
    if(points.length<2)return '<p class="moisture-trace-empty">За последние 24 часа пока мало наблюдений.</p>';
    const path=points.map(([x,y])=>number(x)+','+number(y)).join(' ');
    const dots=watered.map(([x,y])=>`<circle cx="${number(x)}" cy="${number(y)}" r="2.5" class="moisture-trace-dot"/>`).join('');
    return `<figure class="moisture-trace"><figcaption>Влага за 24 часа</figcaption><svg viewBox="0 0 208 51" role="img" aria-label="График влажности, отметок полива: ${watered.length}"><path d="M6 7h196M6 24h196M6 40h196" class="moisture-trace-grid"/><polyline points="${path}" class="moisture-trace-line"/>${dots}<text x="6" y="50">−24 ч</text><text x="202" y="50" text-anchor="end">Сейчас</text></svg>${watered.length?'<small><span aria-hidden="true">●</span> Полив</small>':''}</figure>`;
  }
  function filterRatio(thirsty,total) {
    return total?percent(thirsty/total*100):0;
  }
  function motionAllowed(prefs={}) {
    return !prefs.calm&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }
  function wetMoistureValue(root,previous,current,prefs) {
    const leaf=root?.querySelector('[data-care-meter="water"] [data-meter-value]');
    if(!leaf)return;
    if(!motionAllowed(prefs)||!globalThis.requestAnimationFrame){
      leaf.textContent=percent(current)+'%';
      return;
    }
    let started;
    const frame=now=>{
      if(!leaf.isConnected)return;
      if(started===undefined)started=now;
      const phase=limit((now-started)/470,0,1),ease=1-Math.pow(1-phase,3);
      leaf.textContent=percent(previous+(current-previous)*ease)+'%';
      if(phase<1)globalThis.requestAnimationFrame(frame);
    };
    leaf.textContent=percent(previous)+'%';
    globalThis.requestAnimationFrame(frame);
  }
  return Object.freeze({pickStillLife,soilBand,nextCare,growthSymbols,growthRibbon,refreshRibbon,compactReadings,refreshReadings,moistureSeries,moistureChart,filterRatio,motionAllowed,wetMoistureValue});
})();
