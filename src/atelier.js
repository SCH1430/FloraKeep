const atelier = (() => {
/* Local pottery wheel. The saved geometry is data, never user-authored SVG. */
const atelierRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const atelierId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value);
const atelierBound=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const atelierText=(value,fallback)=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,60)||fallback:fallback;
const atelierEsc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const atelierNewId=()=>'pot-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const atelierHeights=[267,282,300,320,338];
const potProfiles = {
 bowl:[62,65,57,46,35],
 tall:[38,39,39,38,34],
 planter:[60,60,58,52,46]
};
const potPatterns = [['','Без рисунка'],['dots','Крапинки'],['leaves','Листья'],['stripes','Полосы']];
const seriesColors = ['#b98b93','#94a983','#b29671'];
const atelierColor=(value,fallback)=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;
function atelierPot(raw,fallback='first-pot'){
 const value=atelierRecord(raw)?raw:{};
 const color=atelierColor(value.color,'#c69a7c');
 return {
   id:atelierId(value.id)?value.id:fallback,
   name:atelierText(value.name,'Горшок моей работы'),
   profile:[50,52,48,42,35].map((r,i)=>atelierBound(value.profile?.[i],22,68,r)),
   color,finish:value.finish==='glaze'?'glaze':'matte',
   glazeColor:atelierColor(value.glazeColor,color),
   glazeBorder:atelierBound(value.glazeBorder,15,85,52),
   pattern:potPatterns.some(([key])=>key===value.pattern)?value.pattern:'',
   patternScale:atelierBound(value.patternScale,.5,2,1),
   patternAngle:atelierBound(value.patternAngle,-180,180,0),
   ...(atelierId(value.seriesOf)&&Number.isInteger(value.seriesSlot)&&value.seriesSlot>=0&&value.seriesSlot<3
     ?{seriesOf:value.seriesOf,seriesSlot:value.seriesSlot}:{})
 };
}

function buildPotSeries(raw,pots,count) {
 const layout=atelierPot(raw);
 const needed=Math.min(seriesColors.length,Math.max(0,Math.trunc(count)));
 const result=[];
 for(let slot=0;slot<needed;slot++) {
   const previous=pots.find(pot=>pot.seriesOf===layout.id&&pot.seriesSlot===slot);
   const color=seriesColors[slot];
   const name=layout.name.slice(0,50)+' · '+(slot+1);
   result.push({...layout,id:previous?.id||atelierNewId(),name,color,
     glazeColor:layout.glazeColor===layout.color?color:layout.glazeColor,seriesOf:layout.id,seriesSlot:slot});
 }
 return result;
}
function defaultAtelierState(){return {version:1,draft:atelierPot(null),pots:[]};}
function normalizeAtelierState(raw){
 if(!atelierRecord(raw)||raw.version!==1)return defaultAtelierState();
 const pots=[],seen=new Set();for(const candidate of (Array.isArray(raw.pots)?raw.pots:[]).slice(0,50)){if(pots.length>=8)break;if(!atelierRecord(candidate)||!atelierId(candidate.id)||seen.has(candidate.id))continue;seen.add(candidate.id);pots.push(atelierPot(candidate));}
 return {version:1,draft:atelierPot(raw.draft),pots};
}
function reshapeAtelierPot(raw,index,radius){const pot=atelierPot(raw);if(Number.isInteger(index)&&index>=0&&index<5)pot.profile[index]=atelierBound(radius,22,68,pot.profile[index]);return pot;}
function getAtelierPotOptions(raw){const pot=atelierPot(raw);const {profile,color,finish,glazeColor,glazeBorder,pattern,patternScale,patternAngle}=pot;
 return {customPot:{profile:profile.slice(),color,finish,glazeColor,glazeBorder,pattern,patternScale,patternAngle}};}
function atelierPotMarkup(raw,prefix='atelier-pot'){
 const pot=atelierPot(raw),p=String(prefix).replace(/[^A-Za-z0-9_-]/g,'').slice(0,90)||'atelier-pot',r=pot.profile;
 const left=r.map((radius,i)=>`${i?'L':'M'}${160-radius} ${atelierHeights[i]}`).join(' '),right=r.slice().reverse().map((radius,i)=>`L${160+radius} ${atelierHeights[4-i]}`).join(' ');
 return `<defs><linearGradient id="${p}-ceramic"><stop stop-color="#000" stop-opacity=".15"/><stop offset=".3" stop-color="#fff" stop-opacity=".28"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs><g data-custom-pot="true" data-pot-finish="${pot.finish}">${art.customPotSurface(p,`${left}Q160 349 ${160+r[4]} 338 ${right}Z`,pot)}<path d="${left}Q160 349 ${160+r[4]} 338 ${right}Z" fill="url(#${p}-ceramic)"/>${art.customPotRim(pot)}<ellipse cx="160" cy="267" rx="${Math.max(12,r[0]-6)}" ry="5" fill="#776049"/><path d="M${160-r[0]+5} 272Q160 282 ${160+r[0]-5} 272" stroke="#fff9e9" stroke-opacity=".3" fill="none"/>${pot.finish==='glaze'?`<path d="M${164-r[1]} 284Q${159-r[2]} 305 ${168-r[3]} 324" stroke="#fff" stroke-opacity=".38" stroke-width="5" fill="none" stroke-linecap="round"/>`:Array.from({length:24},(_,i)=>`<circle cx="${136+i*19%46}" cy="${285+i*13%48}" r=".65" fill="${i%2?'#fff0d9':'#664936'}" opacity=".2"/>`).join('')}</g>`;
}
function atelierActiveRing(pot,index){
  const y=atelierHeights[index],frame=pot.profile[index];
  return `<g class="atelier-active-section" aria-hidden="true" pointer-events="none"><path d="M${160-frame} ${y-4}Q160 ${y-11} ${160+frame} ${y-4}V${y+4}Q160 ${y+11} ${160-frame} ${y+4}Z" fill="#e8bd63" fill-opacity=".39" stroke="#8b6238" stroke-opacity=".56" stroke-width=".7"/><path d="M${160-frame} ${y}H${160+frame}M${160-frame} ${y-4}v8M${160+frame} ${y-4}v8" fill="none" stroke="#476d53" stroke-width="1.3"/></g>`;
}
function renderPotSVG(raw,{id='atelier-preview',interactive=false,activeRing=2}={}){
 const pot=atelierPot(raw),p=String(id).replace(/[^A-Za-z0-9_-]/g,'').slice(0,70);
 return `<svg class="atelier-pot-art" viewBox="70 215 180 145" xmlns="http://www.w3.org/2000/svg" role="${interactive?'group':'img'}" aria-label="${atelierEsc(pot.name)}"><title>${atelierEsc(pot.name)}</title><ellipse class="atelier-wheel-shadow" cx="160" cy="350" rx="79" ry="6" fill="#344c36" opacity=".12"/><g class="atelier-wheel"><ellipse cx="160" cy="344" rx="73" ry="9" fill="#baa180"/><ellipse cx="160" cy="341" rx="73" ry="9" fill="#dac6a3"/><path d="M91 340Q160 332 228 340M101 345Q160 337 219 345" fill="none" stroke="#af9472" stroke-width=".8"/><g transform="translate(160 341) scale(1 .12)"><g class="atelier-wheel-turn" stroke="#af9472" stroke-width="1.5" opacity=".55">${Array.from({length:8},(_,i)=>`<path d="M0 0L${Math.cos(i*Math.PI/4)*72} ${Math.sin(i*Math.PI/4)*72}"/>`).join('')}</g></g></g>${atelierPotMarkup(pot,p)}${interactive?atelierActiveRing(pot,activeRing):''}${interactive?pot.profile.map((r,i)=>`<g class="atelier-ring ${activeRing===i?'is-active':''}" data-pot-ring="${i}" tabindex="0" role="slider" aria-label="${['Край','Плечики','Середина','Нижняя стенка','Основание'][i]}" aria-valuemin="22" aria-valuemax="68" aria-valuenow="${Math.round(r)}"><path d="M${160-r} ${atelierHeights[i]}H${160+r}" stroke="#57714d" stroke-opacity="${activeRing===i?.94:.18}" stroke-dasharray="2 3"/><circle cx="${160+r}" cy="${atelierHeights[i]}" r="${activeRing===i?5:3.5}" fill="${activeRing===i?'#f3d28f':'#fffdf4'}" stroke="${activeRing===i?'#526f55':'#748f5b'}" stroke-width="${activeRing===i?1.65:1.2}"/><path d="M${160+r-8} ${atelierHeights[i]-8}h16v16h-16Z" fill="transparent"/></g>`).join(''):''}</svg>`;
}
function createAtelierFeature(api){
 let state=defaultAtelierState(),root=null,abort=null,drag=null,activeRing=2,busy=false,opened=false,generation=0,plantId='',selectedGroup='';
 const pending=new Set(),esc=api.esc||atelierEsc;
 const read=()=>normalizeAtelierState(api.extras.atelier);
 function dispose(){opened=false;generation++;abort?.abort();abort=null;root=null;drag=null;}
 async function persist(message,mutate){const token=generation,value=normalizeAtelierState(state),task=api.commit(({extras})=>{extras.atelier=value;mutate?.(extras);},message);pending.add(task);try{await task;}finally{pending.delete(task);}if(!opened||token!==generation)return false;state=read();return true;}
 function draw(){for(const b of root?.querySelectorAll('[data-atelier=ring]')||[])b.setAttribute('aria-pressed',String(Number(b.dataset.index)===activeRing));const holder=root?.querySelector('.atelier-wheel-stage');if(holder)holder.innerHTML=renderPotSVG(state.draft,{interactive:true,activeRing});const input=root?.querySelector('[name=atelier-radius]');if(input)input.value=String(Math.round(state.draft.profile[activeRing]));const label=root?.querySelector('.atelier-ring-name');if(label)label.textContent=['Край','Плечики','Середина','Нижняя стенка','Основание'][activeRing];previewPlant();drawMaterialReference();}
 function drawMaterialReference(){
   const top=root?.querySelector('.atelier-pot-top');
   const materials=root?.querySelector('.atelier-materials');
   if(top&&api.art.potTopView)top.innerHTML=api.art.potTopView({customPot:state.draft});
   if(materials&&api.art.materialSamples)materials.innerHTML=api.art.materialSamples(state.draft.color);
 }
 function previewPlant(){
   const holder=root?.querySelector('.atelier-plant-preview');
   if(!holder)return;
   const plant=api.state.plants.find(candidate=>candidate.id===plantId);
   if(!plant){holder.innerHTML='';return;}
   holder.innerHTML=api.art.plantArt(plant.speciesId,{
     id:'atelier-plant-'+plant.id,growth:plant.growth,moisture:plant.moisture,
     ...getAtelierPotOptions(state.draft)
   });
 }
 function labelsMarkup(){
   const draft=state.draft;
   const patternOptions=potPatterns.map(([value,label])=>`<option value="${value}" ${value===draft.pattern?'selected':''}>${label}</option>`).join('');
   return `<div class="atelier-shape-presets">
     <label class="field"><span>Заготовка формы</span><select name="atelier-shape"><option value="">Выберите форму</option><option value="bowl">Чаша</option><option value="tall">Узкий вазон</option><option value="planter">Широкое кашпо</option></select></label>
   </div>
   <div class="atelier-decoration">
     <label class="field"><span>Второй цвет глазури</span><input name="atelier-glaze" type="color" value="${draft.glazeColor}"></label>
     <label class="field"><span>Граница оттенков глазури</span><input name="atelier-glaze-border" type="range" min="15" max="85" value="${draft.glazeBorder}"></label>
     <label class="field"><span>Роспись</span><select name="atelier-pattern">${patternOptions}</select></label>
     <label class="field"><span>Масштаб рисунка</span><input name="atelier-pattern-scale" type="range" min="50" max="200" step="5" value="${draft.patternScale*100}"></label>
     <label class="field"><span>Поворот рисунка</span><input name="atelier-pattern-angle" type="range" min="-180" max="180" value="${draft.patternAngle}"></label>
   </div>`;
 }
 function applyMarkup(plants){
   const groups=[...new Set(plants.map(plant=>api.extras.appearance[plant.id]?.group).filter(Boolean))];
   const options=plants.map(plant=>{
     const name=api.extras.appearance[plant.id]?.name||api.game.CATALOG.find(species=>species.id===plant.speciesId)?.name||'Растение';
     return `<option value="${esc(plant.id)}" ${plant.id===plantId?'selected':''}>${esc(name)}</option>`;
   }).join('');
   const selection=groups.map(group=>`<option value="${esc(group)}" ${group===selectedGroup?'selected':''}>${esc(group)}</option>`).join('');
   return `<label class="field"><span>Растение для примерки</span><select name="atelier-plant">${options}</select></label>
     <div class="atelier-plant-preview" role="img" aria-label="Примерка горшка на выбранное растение"></div>
     <button class="button secondary" data-atelier="apply">Применить к растению</button>
     ${groups.length?`<label class="field"><span>Оформить группу серией горшков</span><select name="atelier-group"><option value="">Выберите группу</option>${selection}</select></label><button class="button secondary" data-atelier="apply-series" ${selectedGroup?'':'disabled'}>Применить серию</button>`:''}`;
 }
 function render(){if(!opened)return;const plants=api.state.plants||[];
  if(!plants.some(plant=>plant.id===plantId))plantId=plants[0]?.id||'';
  api.showDialog('Гончарное ателье',`<section class="atelier"><p class="atelier-kicker">ФОРМА, СОЗДАННАЯ ВАШИМИ РУКАМИ</p><p class="atelier-intro">Потяните за край горшка или выберите уровень и измените ширину. Сохранённую работу можно поставить в сад.</p><div class="atelier-layout"><div class="atelier-stage"><div class="atelier-wheel-stage"></div><div class="atelier-reference"><figure><div class="atelier-pot-top"></div><figcaption>Вид сверху</figcaption></figure><figure><div class="atelier-materials"></div><figcaption>Оттенок на разных поверхностях</figcaption></figure></div><button class="button secondary" data-atelier="spin" aria-pressed="false">Вращать круг</button></div><div class="atelier-controls"><label class="field"><span>Название работы</span><input name="atelier-name" maxlength="60" value="${esc(state.draft.name)}"></label>${labelsMarkup()}<div class="atelier-rings" role="group" aria-label="Уровень стенки">${['Край','Плечики','Середина','Низ','Основание'].map((name,i)=>`<button type="button" data-atelier="ring" data-index="${i}" aria-pressed="${i===activeRing}">${name}</button>`).join('')}</div><label class="field"><span>Ширина: <b class="atelier-ring-name"></b></span><input type="range" name="atelier-radius" min="22" max="68" step="1" value="${Math.round(state.draft.profile[activeRing])}" aria-label="Ширина выбранного уровня"></label><div class="atelier-radius-actions"><button class="button secondary" data-atelier="narrow">Уже −</button><button class="button secondary" data-atelier="widen">Шире +</button></div><label class="field"><span>Цвет керамики</span><input type="color" name="atelier-color" value="${state.draft.color}"></label><label class="field"><span>Поверхность</span><select name="atelier-finish"><option value="matte" ${state.draft.finish==='matte'?'selected':''}>Матовая глина</option><option value="glaze" ${state.draft.finish==='glaze'?'selected':''}>Глазурь</option></select></label><div class="atelier-save"><button class="button primary" data-atelier="save">Сохранить работу</button><button class="button secondary" data-atelier="new">Новая заготовка</button><button class="button secondary" data-atelier="png">Скачать PNG</button></div>${plants.length?applyMarkup(plants):'<p class="form-help">Когда в саду появится растение, сюда можно будет примерить готовый горшок.</p>'}</div></div><h3>Ваши работы <small>${state.pots.length} / 8</small></h3><div class="atelier-gallery">${state.pots.map((pot,i)=>`<article>${renderPotSVG(pot,{id:'atelier-saved-'+i})}<h4>${esc(pot.name)}</h4><button class="button secondary" data-atelier="load" data-id="${pot.id}">Продолжить работу</button></article>`).join('')||'<p class="atelier-empty">На этой полке появится ваша первая керамика.</p>'}</div><p class="form-help">Формы сохраняются в этом профиле и входят в JSON-копию сада. Глина и игровые запасы не расходуются.</p></section>`,'atelier',true);
  root=document.querySelector('.atelier');if(!root)return;opened=true;abort=new AbortController();const opts={signal:abort.signal};root.addEventListener('click',onClick,opts);root.addEventListener('input',onInput,opts);root.addEventListener('change',onChange,opts);root.addEventListener('pointerdown',onDown,opts);root.addEventListener('pointermove',onMove,opts);root.addEventListener('pointerup',onUp,opts);root.addEventListener('pointercancel',onCancel,opts);root.addEventListener('keydown',onKey,opts);document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWheel();},opts);draw();setBusy(busy);
 }
 function stopWheel(){root?.classList.remove('is-spinning');const button=root?.querySelector('[data-atelier=spin]');if(button){button.setAttribute('aria-pressed','false');button.textContent='Вращать круг';}}
 function setBusy(value){root?.setAttribute('aria-busy',String(value));for(const el of root?.querySelectorAll('button,input,select')||[]){if(value&&!el.disabled){el.dataset.atelierBusy='true';el.disabled=true;}else if(!value&&el.dataset.atelierBusy){delete el.dataset.atelierBusy;el.disabled=false;}}}
 async function perform(fn){if(busy)return;busy=true;setBusy(true);try{await fn();}catch(error){api.toast(error?.message||'Не удалось сохранить работу.');}finally{busy=false;setBusy(false);}}
 function remember(){const draft=atelierPot(state.draft);const found=state.pots.findIndex(p=>p.id===draft.id);if(found<0&&state.pots.length>=8)throw new Error('На полке восемь работ. Откройте одну из них, чтобы обновить её.');if(found>=0)state.pots[found]=draft;else state.pots.push(draft);}
 async function onClick(event){const control=event.target.closest('[data-atelier]');if(!control||busy)return;const action=control.dataset.atelier;if(action==='ring'){activeRing=Number(control.dataset.index);draw();for(const b of root.querySelectorAll('[data-atelier=ring]'))b.setAttribute('aria-pressed',String(Number(b.dataset.index)===activeRing));return;}if(action==='spin'){const spin=root.classList.toggle('is-spinning');control.setAttribute('aria-pressed',String(spin));control.textContent=spin?'Остановить круг':'Вращать круг';return;}await perform(async()=>{
  if(action==='save'){remember();if(await persist('Керамика сохранена на вашей полке.'))render();}
  else if(action==='new'){state.draft=atelierPot(null,atelierNewId());activeRing=2;if(await persist())render();}
  else if(action==='load'){const pot=state.pots.find(p=>p.id===control.dataset.id);if(pot){state.draft=atelierPot(pot);if(await persist())render();}}
  else if(action==='narrow'||action==='widen'){state.draft=reshapeAtelierPot(state.draft,activeRing,state.draft.profile[activeRing]+(action==='widen'?2:-2));draw();await persist();}
  else if(action==='apply'){const plantId=root.querySelector('[name=atelier-plant]')?.value;if(!api.state.plants.some(p=>p.id===plantId))return;remember();const potId=state.draft.id;if(await persist('Авторский горшок появился у растения.',extras=>{extras.appearance[plantId]={...extras.appearance[plantId],potId};}))render();}
  else if(action==='apply-series'){
    const group=root.querySelector('[name=atelier-group]')?.value;
    if(!group)return;
    const plants=api.state.plants.filter(plant=>api.extras.appearance[plant.id]?.group===group);
    if(!plants.length)return;
    const series=buildPotSeries(state.draft,state.pots,plants.length);
    const reused=new Set(series.map(pot=>pot.id));
    const remaining=state.pots.filter(pot=>!reused.has(pot.id));
    if(remaining.length+series.length>8)throw new Error('На полке недостаточно места для новой серии.');
    state.pots=[...remaining,...series];
    if(await persist('Группа получила серию горшков.',extras=>{
      for(const [index,plant] of plants.entries()){
        const potId=series[index%series.length].id;
        extras.appearance[plant.id]={...extras.appearance[plant.id],potId};
      }
    }))render();
  }
  else if(action==='png'){const blob=await api.media.rasterizeSVG(renderPotSVG(state.draft,{id:'pot-export'}),{width:1080,height:870});api.download(blob,'flora-keep-pottery.png');}
 });}
 function onInput(event){
  const {name,value}=event.target;
  if(name==='atelier-name'){state.draft.name=atelierText(value,'Горшок моей работы');return;}
  if(name==='atelier-radius')state.draft=reshapeAtelierPot(state.draft,activeRing,Number(value));
  else if(name==='atelier-color'){
    if(state.draft.glazeColor===state.draft.color)state.draft.glazeColor=value;
    state.draft.color=value;
  }else if(name==='atelier-glaze')state.draft.glazeColor=value;
  else if(name==='atelier-glaze-border')state.draft.glazeBorder=Number(value);
  else if(name==='atelier-pattern-scale')state.draft.patternScale=Number(value)/100;
  else if(name==='atelier-pattern-angle')state.draft.patternAngle=Number(value);
  else return;
  draw();
 }
 function onChange(event){
  const {name,value}=event.target;
  if(name==='atelier-plant'){plantId=value;previewPlant();return;}
  if(name==='atelier-group'){
    selectedGroup=value;
    root.querySelector('[data-atelier="apply-series"]').disabled=!selectedGroup;
    return;
  }
  if(name==='atelier-shape'){
    if(!Object.hasOwn(potProfiles,value))return;
    state.draft.profile=potProfiles[value].slice();
    event.target.value='';
  }else if(name==='atelier-finish')state.draft.finish=value;
  else if(name==='atelier-pattern')state.draft.pattern=value;
  else if(!['atelier-name','atelier-radius','atelier-color','atelier-glaze','atelier-glaze-border','atelier-pattern-angle','atelier-pattern-scale'].includes(name))return;
  draw();
  void perform(()=>persist());
 }
 function point(event){const svg=root?.querySelector('.atelier-pot-art');if(!svg?.getScreenCTM())return null;return new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());}
 function onDown(event){if(busy||event.button!==0||!event.target.closest('.atelier-wheel-stage'))return;const p=point(event);if(!p||p.y<253||p.y>350)return;const ring=event.target.closest('[data-pot-ring]');activeRing=ring?Number(ring.dataset.potRing):atelierHeights.reduce((best,y,i)=>Math.abs(p.y-y)<Math.abs(p.y-atelierHeights[best])?i:best,0);drag={pointer:event.pointerId,before:atelierPot(state.draft)};root.setPointerCapture?.(event.pointerId);state.draft=reshapeAtelierPot(state.draft,activeRing,Math.abs(p.x-160));draw();event.preventDefault();}
 function onMove(event){if(!drag||drag.pointer!==event.pointerId)return;const p=point(event);if(!p)return;state.draft=reshapeAtelierPot(state.draft,activeRing,Math.abs(p.x-160));draw();event.preventDefault();}
 function onUp(event){if(!drag||drag.pointer!==event.pointerId)return;drag=null;void perform(()=>persist());}
 function onCancel(){if(drag){state.draft=drag.before;drag=null;draw();}}
 function onKey(event){const ring=event.target.closest('[data-pot-ring]');if(!ring||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();activeRing=Number(ring.dataset.potRing);const delta=['ArrowRight','ArrowUp'].includes(event.key)?2:-2;state.draft=reshapeAtelierPot(state.draft,activeRing,state.draft.profile[activeRing]+delta);draw();root?.querySelector(`[data-pot-ring="${activeRing}"]`)?.focus();void perform(()=>persist());}
 return {open(){dispose();plantId='';selectedGroup='';if(pending.size){api.showDialog('Гончарное ателье','<p role="status">Сохраняем вашу последнюю работу…</p>','atelier',true);opened=true;const token=generation;void Promise.allSettled([...pending]).then(()=>{if(!opened||token!==generation)return;state=read();render();});return;}state=read();opened=true;render();},dispose,async flush(){while(pending.size)await Promise.all([...pending]);}};
}

return Object.freeze({ defaultAtelierState, normalizeAtelierState, reshapeAtelierPot, buildPotSeries, getAtelierPotOptions, atelierPotMarkup, renderPotSVG, createAtelierFeature });
})();
