const delights = (() => {
/* Offline interaction, atlas and personal design. No timers survive a closed view. */
const DHEX=/^#[a-f\d]{6}$/i;
const dEsc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function defaultDelightsState(){return {version:1,bookmarks:[],openedSeeds:[],palette:{enabled:false,paper:'#f7f4eb',accent:'#456b51'},motion:'smooth',hand:'right'};}
function normalizeDelightsState(raw,catalog=[]){const d=defaultDelightsState(),r=raw&&typeof raw==='object'?raw:{},ids=new Set(catalog.map(s=>typeof s==='string'?s:s.id));for(const k of ['bookmarks','openedSeeds'])d[k]=Array.isArray(r[k])?[...new Set(r[k].filter(x=>ids.has(x)))].slice(0,40):[];d.motion=['smooth','playful','still'].includes(r.motion)?r.motion:d.motion;d.hand=r.hand==='left'?'left':'right';const p=r.palette||{};d.palette={enabled:p.enabled===true,paper:typeof p.paper==='string'&&DHEX.test(p.paper)?p.paper:d.palette.paper,accent:typeof p.accent==='string'&&DHEX.test(p.accent)?p.accent:d.palette.accent};return d;}
function readableInk(hex){if(typeof hex!=='string'||!DHEX.test(hex))return '#233d30';const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4),l=v[0]*.2126+v[1]*.7152+v[2]*.0722;return l>.179?'#000000':'#ffffff';}
function waterFlaskSVG(amount=0){const n=Math.max(0,Math.floor(Number(amount)||0)),level=Math.min(1,n/10),y=71-level*43;return `<svg class="water-flask" viewBox="0 0 72 92" role="img" aria-label="${n} порций воды"><defs><clipPath id="flora-water-flask-clip"><path d="M26 13h20v22l14 34q4 13-10 13H22Q8 82 12 69l14-34Z"/></clipPath></defs><path d="M26 13h20v22l14 34q4 13-10 13H22Q8 82 12 69l14-34Z" fill="#c5e5e522" stroke="#799fa0" stroke-width="2"/><g clip-path="url(#flora-water-flask-clip)"><path class="flask-water" d="M6 ${y}Q20 ${y-5} 36 ${y}T68 ${y}V86H6Z" fill="#8fbfc3" opacity=".75"/><circle class="flask-bubble" cx="29" cy="65" r="2" fill="#eaffff"/><circle class="flask-bubble second" cx="43" cy="72" r="1.6" fill="#eaffff"/></g><path d="M24 12h24m-23 4h22M48 50h6m-9 10h12m-15 10h15" stroke="#799fa0" stroke-width="2"/><text x="35" y="68" text-anchor="middle" fill="#284950" font-family="sans-serif" font-size="16">${n}</text></svg>`;}
function createDelightsFeature(api){
 let abort=null,version=0,disposed=false;const pending=new Set(),animations=new Set(),timeouts=new Set();
 const current=()=>normalizeDelightsState(api.extras.delights,api.game.CATALOG),esc=api.esc||dEsc;
 function calm(){return api.prefs.calm||current().motion==='still'||globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
 function delay(fn,ms){const id=setTimeout(()=>{timeouts.delete(id);fn();},ms);timeouts.add(id);return id;}
 function dispose(){version++;disposed=true;abort?.abort();abort=null;for(const a of animations){a.cancel();a.effect?.target?.classList?.contains('flying-seed')&&a.effect.target.remove();}animations.clear();for(const id of timeouts)clearTimeout(id);timeouts.clear();document.querySelectorAll('.delight-overlay').forEach(e=>e.remove());}
 function begin(){disposed=false;abort?.abort();abort=new AbortController();return abort.signal;}
 function save(edit,message){const task=Promise.resolve(api.commit(({extras,prefs})=>{const s=normalizeDelightsState(extras.delights,api.game.CATALOG);edit(s,prefs);extras.delights=s;},message));pending.add(task);task.then(()=>pending.delete(task),()=>pending.delete(task));return task;}
 async function flush(){while(pending.size)await Promise.all([...pending]);}
 function animate(el,frames,options){if(calm()||!el?.animate)return null;const a=el.animate(frames,options);animations.add(a);a.finished.then(()=>animations.delete(a),()=>animations.delete(a));return a;}
 function applyDesign(){const s=current(),root=document.documentElement;root.dataset.motion=s.motion;root.dataset.hand=s.hand;root.classList.toggle('motion-still',s.motion==='still');root.classList.toggle('calm',api.prefs.calm||s.motion==='still');root.classList.toggle('personal-palette',s.palette.enabled&&!root.classList.contains('theme-night')&&!root.classList.contains('high-contrast'));root.style.setProperty('--personal-paper',s.palette.paper);root.style.setProperty('--personal-ink',readableInk(s.palette.paper));root.style.setProperty('--personal-accent',s.palette.accent);root.style.setProperty('--personal-button-ink',readableInk(s.palette.accent));}
 function showDesign(){api.showDialog('Цвет и характер вашего сада',`<form id="delight-design"><div class="form-grid"><label class="field"><span>Бумага</span><input name="paper" type="color" value="${current().palette.paper}"></label><label class="field"><span>Акцент</span><input name="accent" type="color" value="${current().palette.accent}"></label></div><label class="check-field"><input type="checkbox" name="enabled" ${current().palette.enabled?'checked':''}>Применить личные цвета в светлой теме</label><div class="palette-presets">${[['Лес','#f4f1df','#476e50'],['Лаванда','#f0eaf4','#785f86'],['Глина','#f8eee1','#a46247'],['Глубина','#213f38','#9fc7b0']].map(([n,p,a])=>`<button type="button" data-palette="${p},${a}" style="--swatch:${a}">${esc(n)}</button>`).join('')}</div><div id="palette-preview" class="palette-preview"><small>Ваш маленький мир</small><h3>Пусть хорошее растёт</h3><p>Согласованные цвета и читаемый текст.</p><span>Позаботиться о ростке</span></div><div class="form-grid"><label class="field"><span>Характер движения</span><select name="motion">${[['smooth','Плавный'],['playful','Игривый'],['still','Почти неподвижный']].map(([v,t])=>`<option value="${v}" ${current().motion===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="field"><span>Удобная рука</span><select name="hand"><option value="right" ${current().hand==='right'?'selected':''}>Правая</option><option value="left" ${current().hand==='left'?'selected':''}>Левая</option></select></label></div><p class="form-help">На телефоне инструменты ухода и игровая панель располагаются со стороны выбранной руки. Системное уменьшение движения всегда учитывается.</p><button class="button primary">Сохранить оформление</button></form>`,'delights',true);const signal=begin(),f=document.querySelector('#delight-design'),preview=document.querySelector('#palette-preview');
 const update=()=>{const paper=f.elements.paper.value,accent=f.elements.accent.value;preview.style.background=paper;preview.style.color=readableInk(paper);const b=preview.querySelector('span');b.style.background=accent;b.style.color=readableInk(accent);preview.dataset.motion=f.elements.motion.value;};f.addEventListener('input',update,{signal});f.addEventListener('click',e=>{const b=e.target.closest('[data-palette]');if(!b)return;const [p,a]=b.dataset.palette.split(',');f.elements.paper.value=p;f.elements.accent.value=a;f.elements.enabled.checked=true;update();},{signal});f.addEventListener('submit',async e=>{e.preventDefault();const values={palette:{enabled:f.elements.enabled.checked,paper:f.elements.paper.value,accent:f.elements.accent.value},motion:f.elements.motion.value,hand:f.elements.hand.value};try{await save((s,prefs)=>{Object.assign(s,values);prefs.calm=values.motion==='still';},'Цвета и движения сохранены.');applyDesign();}catch{api.toast('Не удалось сохранить оформление.');}},{signal});update();}
 function bookmarksHTML(){return `<nav class="atlas-bookmarks" aria-label="Закладки растений">${current().bookmarks.map(id=>{const s=api.game.CATALOG.find(x=>x.id===id);return `<button data-delight-bookmark="${esc(id)}" title="${esc(s.name)}">${api.icon('leaf',17)}<span>${esc(s.name)}</span></button>`;}).join('')}</nav>`;}
 function showAtlas(id,view='specimen') {
  const catalogue=api.game.CATALOG;
  const species=catalogue.find(entry=>entry.id===id)||catalogue[0];
  const owned=api.state.plants.filter(plant=>plant.speciesId===species.id);
  const family=api.knowledge?.KNOWLEDGE?.[species.id]?.family;
  const views=[['specimen','Весь вид'],...(api.art.hasFlowerProfile?.(species.id)?[['profile','Сбоку']]:[]),['macro','Деталь']];
  const illustration=api.art.plantArt(species.id,{
   id:'atlas-'+species.id,growth:1,...(view==='specimen'?{}:{view}),
  });
  const viewButtons=views.map(([key,label])=>`<button type="button" class="button secondary" data-delight-view="${key}" aria-pressed="${view===key}">${label}</button>`).join('');
  const observations=owned.map(plant=>`<div class="atlas-observation"><strong>${esc(api.extras.appearance[plant.id]?.name||species.name)}</strong><p>${esc(api.extras.appearance[plant.id]?.note||'Наблюдения ещё не записаны.')}</p><button class="text-button" data-feature="growth-book" data-id="${plant.id}">${floraLocale.t('plantChronicle')} →</button></div>`).join('');
  const collection=catalogue.map(entry=>`<button type="button" data-delight-species="${entry.id}" aria-pressed="${entry.id===species.id}">${esc(entry.name)}</button>`).join('');
  api.showDialog('Ботанический атлас',`
   <div class="atlas-spread atlas-folio">
    <div class="atlas-plate">
     ${illustration}
     <div class="atlas-view-switch" role="group" aria-label="Ракурс ботанического рисунка">${viewButtons}</div>
    </div>
    <div class="atlas-writing">
     <span class="eyebrow">Лист ${String(catalogue.indexOf(species)+1).padStart(2,'0')} / ${catalogue.length}</span>
     <h3>${esc(species.name)}</h3>
     <dl class="atlas-taxonomy" aria-label="Научная этикетка">
      <dt>Научное название</dt><dd><i lang="la">${esc(species.latinName)}</i></dd>
      ${family?`<dt>Семейство</dt><dd>${esc(family)}</dd>`:''}
     </dl>
     <p>${esc(species.fact)}</p>
     <dl><dt>Игровое взросление</dt><dd>${species.growthHours} ч</dd><dt>Растений в вашем саду</dt><dd>${owned.length}</dd></dl>
     <button class="button secondary" data-delight="bookmark" data-id="${species.id}">${current().bookmarks.includes(species.id)?'Убрать закладку':'Заложить листочек'}</button>
     ${observations}
    </div>
   </div>
   ${bookmarksHTML()}<div class="atlas-index">${collection}</div>`,'atlas',true);
  const signal=begin(),dialog=document.querySelector('dialog');
  dialog.addEventListener('click',event=>{
   const button=event.target.closest('[data-delight-species],[data-delight-bookmark],[data-delight=bookmark],[data-delight-view]');
   if(!button)return;
   if(button.dataset.delightView){
    const next=button.dataset.delightView;
    if(!views.some(([key])=>key===next)||view===next)return;
    showAtlas(species.id,next);
    dialog.querySelector('[data-delight-view][aria-pressed="true"]')?.focus();
    return;
   }
   if(button.dataset.delight==='bookmark'){
    const token=version;
    save(state=>{
     state.bookmarks=state.bookmarks.includes(species.id)?state.bookmarks.filter(saved=>saved!==species.id):[...state.bookmarks,species.id];
    }).then(()=>{
     if(token===version&&dialog.isConnected&&document.querySelector('.atlas-spread'))showAtlas(species.id,view);
    }).catch(()=>api.toast('Закладка не сохранена.'));
   }else{
    showAtlas(button.dataset.delightSpecies||button.dataset.delightBookmark);
    dialog.querySelector('[data-delight-species][aria-pressed="true"]')?.focus();
   }
  },{signal});
 }
 function showBook(id){
  const plant=id?api.state.plants.find(item=>item.id===id):api.state.plants[0];
  if(!plant){api.toast(floraLocale.t('chronicleSelect'));return;}
  const model=growthChronicle.prepare(plant,api.extras.history[plant.id]||[],api.journal);
  const name=api.extras.appearance[plant.id]?.name||floraLocale.t(plant.speciesId);
  api.showDialog(floraLocale.t('plantChronicle'),growthChronicle.markup(model,esc(name),api.art.plantArt),'growth-book',true);
  growthChronicle.connect(document.querySelector('.growth-chronicle'),model,api.art.plantArt,animate,begin());
 }
 function showSeeds(){api.showDialog('Коробочка семян',`<p class="dialog-intro">Знакомые виды оставляют маленькие пакетики на память. Откройте их и рассмотрите семена.</p><div class="seed-packet-grid">${api.game.CATALOG.map(s=>{const known=api.state.discovered.includes(s.id),opened=current().openedSeeds.includes(s.id);return `<button class="seed-packet ${opened?'is-open':''}" data-seed-packet="${s.id}" ${!known?'disabled':''} aria-expanded="${opened}"><span class="packet-flap"></span><span class="packet-label">${esc(s.name)}</span><span class="packet-illustration">${api.art.plantArt(s.id,{id:'packet-'+s.id,growth:.15})}</span><span class="packet-seeds" aria-hidden="true">${Array.from({length:5},(_,i)=>`<i style="--seed:${i}"></i>`).join('')}</span><small>${!known?'Откроется после посадки':opened?'Семена в коллекции':'Раскрыть пакетик'}</small></button>`;}).join('')}</div>`,'seeds',true);const signal=begin();document.querySelector('.seed-packet-grid').addEventListener('click',async e=>{const b=e.target.closest('[data-seed-packet]');if(!b||b.disabled)return;b.classList.add('is-open');b.setAttribute('aria-expanded','true');b.querySelector('small').textContent='Семена в коллекции';try{await save(s=>{if(!s.openedSeeds.includes(b.dataset.seedPacket))s.openedSeeds.push(b.dataset.seedPacket);});}catch{api.toast('Пакетик пока не сохранён.');}},{signal});}
 function afterDialog(kind,id){const signal=begin(),d=document.querySelector('dialog');if(!d)return;
 if(kind==='plant'){const p=api.state.plants.find(p=>p.id===id);if(!p)return;const tools=d.querySelector('.care-tools');tools?.insertAdjacentHTML('afterend',`<div class="delight-care-tools"><button class="button secondary" data-delight="future" aria-pressed="false">Контур будущего</button><button class="button secondary" data-feature="growth-book" data-id="${p.id}">${floraLocale.t('plantChronicle')}</button><button class="button secondary" data-feature="atelier">Вылепить горшок</button></div>`);d.querySelector('[data-delight=future]')?.addEventListener('click',e=>{const b=e.currentTarget,active=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(active));const scene=d.querySelector('.care-scene');scene.querySelector('.future-canopy')?.remove();if(active)scene.insertAdjacentHTML('beforeend',`<div class="future-canopy" aria-label="Условный контур взрослого растения">${api.art.plantArt(p.speciesId,{id:'future-'+p.id,growth:1})}<span>Когда вырастет</span></div>`);},{signal});}
 if(kind==='specimen'){const s=d.querySelector('[data-action=preview]')?.dataset.id;if(s){d.querySelector('.botanical-passport')?.insertAdjacentHTML('beforeend',`<button class="button secondary" data-feature="atlas" data-id="${s}">Открыть разворот атласа</button>`);}}
 if(kind==='supplies'){const well=d.querySelector('.well-icon');if(well)well.innerHTML=waterFlaskSVG(api.state.water);d.querySelector('.supply-list')?.classList.add('toolbox');d.querySelectorAll('.supply-row').forEach((row,i)=>{row.dataset.drawerIndex=i;const title=row.querySelector('h3')?.childNodes[0]?.textContent||'Запасы';row.insertAdjacentHTML('afterbegin',`<button class="drawer-handle" data-drawer="${i}" aria-expanded="false" aria-label="Развернуть отделение: ${esc(title)}"><span></span></button>`);});d.addEventListener('click',e=>{const b=e.target.closest('button[data-drawer]');if(!b)return;const row=b.closest('.supply-row'),open=!row.classList.contains('drawer-open');row.classList.toggle('drawer-open',open);b.setAttribute('aria-expanded',String(open));},{signal});}
 if(d.querySelector('.task-list')){d.querySelectorAll('.task-list article').forEach(row=>{const b=row.querySelector('button');if(b?.textContent==='Получено')row.insertAdjacentHTML('beforeend','<span class="achievement-stamp">ВЫРАЩЕНО<br>С ЗАБОТОЙ ✓</span>');});}
 }
 function animatePlanting(origin,id,isNew){const scene=document.querySelector('.care-scene');if(!scene)return;scene.classList.add('seedling-unfold');if(isNew)scene.classList.add('drawing-reveal');delay(()=>scene.classList.remove('seedling-unfold','drawing-reveal'),1700);if(calm()){
    scene.insertAdjacentHTML('beforeend',`<span class="care-result-frame">Росток посажен</span>`);
    return;
  }
  scene.insertAdjacentHTML('beforeend',`<span class="seed-transit" aria-hidden="true">${api.art.seedPacketArt()}</span>`);
  const packet=scene.querySelector('.seed-transit');
  delay(()=>packet?.remove(),820);
  const target=scene.getBoundingClientRect(),seed=document.createElement('span');seed.className='delight-overlay flying-seed';document.querySelector('dialog').append(seed);const start={x:origin?.left+origin?.width/2||target.left+target.width*.8,y:origin?.top||target.top},end={x:target.left+target.width*.5,y:target.top+target.height*.75};seed.style.left='0';seed.style.top='0';const a=animate(seed,[{transform:`translate(${start.x}px,${start.y}px) rotate(-35deg)`,opacity:1},{transform:`translate(${(start.x+end.x)/2}px,${Math.min(start.y,end.y)-50}px) rotate(25deg)`,offset:.45,opacity:1},{transform:`translate(${end.x}px,${end.y}px) rotate(75deg) scale(.4)`,opacity:0}],{duration:950,easing:'ease-in-out',fill:'forwards'});a?.finished.then(()=>seed.remove(),()=>seed.remove());}
 function animateCareTransition(origin){const art=document.querySelector('.care-scene>svg');if(!art||calm()||!origin?.width)return;const r=art.getBoundingClientRect(),clone=art.cloneNode(true);clone.classList.add('delight-overlay','care-transition');Object.assign(clone.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:100,pointerEvents:'none'});document.querySelector('dialog').append(clone);const a=animate(clone,[{transform:`translate(${origin.left-r.left}px,${origin.top-r.top}px) scale(${origin.width/r.width},${origin.height/r.height})`,transformOrigin:'0 0',opacity:.7},{transform:'none',transformOrigin:'0 0',opacity:0}],{duration:420,easing:'cubic-bezier(.2,.8,.3,1)'});a?.finished.then(()=>clone.remove(),()=>clone.remove());}
 function open(mode,id){if(mode==='atlas')showAtlas(id);else if(mode==='book')showBook(id);else if(mode==='seeds')showSeeds();else showDesign();}
 return {open,dispose,flush,applyDesign,afterDialog,animatePlanting,animateCareTransition};
}

return Object.freeze({ defaultDelightsState, normalizeDelightsState, readableInk, waterFlaskSVG, createDelightsFeature });
})();
