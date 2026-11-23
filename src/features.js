const featureModule = (() => {








/* Extended local-first Flora Keep experience. No external dependencies. */
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const short = (value,max=120) => typeof value === 'string' ? value.slice(0,max) : '';
const choice = (value,options,fallback) => options.includes(value)?value:fallback;
const validTime = value => Number.isSafeInteger(value)&&value>=0&&value<=8640000000000000;
const time = value => validTime(value)?value:0;
const bounded = (value,min,max,fallback=min) => Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const unique = list => [...new Set(list)];
const plainRecord = value => value!==null&&typeof value==='object'&&!Array.isArray(value);
const numericChoice = (value,choices,fallback) => choice(typeof value==='number'||typeof value==='string'&&/^\d{1,3}$/.test(value)?Number(value):NaN,choices,fallback);
const measured = (value,min,max) => typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
function safeHistoryRow(row) {
 if(!plainRecord(row)||!validTime(row.at)||!measured(row.growth,0,1)||!measured(row.moisture,0,100))return null;
 const sample={at:row.at,growth:row.growth,moisture:row.moisture,health:measured(row.health,0,100)?row.health:null};
 if(row.growth===1&&['bloom','bud','rest'].includes(row.bloomPhase))sample.bloomPhase=row.bloomPhase;
 return sample;
}
function appearanceMap(raw) {
 const result={};if(!plainRecord(raw))return result;
 for(const [id,a]of Object.entries(raw).slice(0,100))if(safeId(id)&&plainRecord(a))result[id]={name:short(a.name,60),note:short(a.note,1200),group:short(a.group,30),pot:choice(a.pot,['clay','sage','cream','pink'],'clay'),shape:choice(a.shape,['classic','tall','bowl'],'classic'),material:choice(a.material,['clay','glaze','paper','painted'],'clay'),...(safeId(a.potId)?{potId:a.potId}:{})};
 return result;
}
function settingsRecord(raw) {
 const s=plainRecord(raw)?raw:{};
 return {theme:choice(s.theme,['light','night','auto'],'light'),light:choice(s.light,['auto','day','dawn','sunset','night'],'auto'),season:choice(s.season,['auto','spring','summer','autumn','winter'],'auto'),weather:choice(s.weather,['clear','rain','snow'],'clear'),scene:choice(s.scene,['window','balcony','desk'],'window'),outside:choice(s.outside,['auto','courtyard','roofs','grove'],'auto'),platform:choice(s.platform,['wood','stone'],'wood'),shelf:choice(s.shelf,['low','medium','high'],'medium'),decor:Array.isArray(s.decor)?unique(s.decor.slice(0,100).filter(x=>['stones','label','tools'].includes(x))):[],contrast:s.contrast===true,textScale:numericChoice(s.textScale,[100,125,150,200],100),shortcuts:s.shortcuts!==false,notificationSeconds:numericChoice(s.notificationSeconds,[5,10,20,60],5),backupReminders:s.backupReminders!==false};
}
function storyImages(raw) {
 if(!Array.isArray(raw))return [];
 const result=[];
 for(const image of raw.slice(0,30)){
  if(result.length>=3)break;
  if(!plainRecord(image)||typeof image.data!=='string'||image.data.length>Math.ceil(400000/3)*4+32)continue;
  const match=/^data:image\/(png|jpeg);base64,(([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?)$/.exec(image.data);
  if(!match)continue;
  const data=match[2],bytes=data.length*3/4-(data.endsWith('==')?2:data.endsWith('=')?1:0);
  if(bytes>400000||bytes<8||match[1]==='png'&&!data.startsWith('iVBORw0KGgo')||match[1]==='jpeg'&&!data.startsWith('/9j/'))continue;
  result.push({author:short(image.author,80).trim(),date:typeof image.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(image.date)?image.date:'',name:short(image.name,80).replace(/[\u0000-\u001f\u007f]/g,'').trim()||'Авторский эскиз',data:image.data});
 }
 return result;
}
const APP_VERSION = '__FLORA_VERSION__';
function defaultExtras() {
 return {schema:saveFormat.extrasVersion,layout:{sidebarCollapsed:false,collectionView:'grid',favorites:[],lastWorkshop:null},gardenName:'Мой маленький сад',description:'',appearance:{},order:[],groups:[],layouts:[],wishes:[],goal:null,history:{},pinned:[],notifications:[],achievements:[],lastExportAt:0,lastSavedAt:0,lastReminderAt:0,tutorial:0,firstEvening:[],demo:false,storyImages:[],terrariums:terrarium.defaultTerrariumState(),flight:flight.defaultFlightState(),giftDraft:gift.defaultGiftDraft(),delights:delights.defaultDelightsState(),atelier:atelier.defaultAtelierState(),playground:playground.defaultPlaygroundState(),storyStudio:storyStudio.defaultStoryStudioState(),
 creative:false,gardenUpgrades:gardenUpgrades.normalize(null),workbench:floraWorkbench.normalize(null),settings:settingsRecord(null),classroom:null};
}
function normalizeExtras(raw, catalog=[]) {
 const out=defaultExtras();if(!plainRecord(raw))return out;
 const species=new Set(catalog.map(s=>typeof s==='string'?s:s.id));
 out.gardenName=short(raw.gardenName,60).trim()||out.gardenName;out.description=short(raw.description,240);out.demo=raw.demo===true;
 out.creative=raw.creative===true;
 out.gardenUpgrades = gardenUpgrades.normalize(raw.gardenUpgrades);
 out.workbench = floraWorkbench.normalize(raw.workbench);
 for(const key of ['lastExportAt','lastSavedAt','lastReminderAt'])out[key]=time(raw[key]);
 out.tutorial=Math.floor(bounded(raw.tutorial,0,4));
 for(const key of ['pinned','achievements','firstEvening'])out[key]=Array.isArray(raw[key])?unique(raw[key].slice(0,1000).filter(x=>typeof x==='string').map(x=>short(x,120))).slice(0,60):[];
 out.wishes=Array.isArray(raw.wishes)?unique(raw.wishes.slice(0,1000).filter(id=>species.has(id))):[];
 out.goal=species.has(raw.goal)?raw.goal:null;
 out.order=Array.isArray(raw.order)?unique(raw.order.slice(0,1000).filter(safeId)).slice(0,100):[];
 out.groups=Array.isArray(raw.groups)?unique(raw.groups.slice(0,1000).filter(x=>typeof x==='string'&&x.trim()).map(x=>short(x.trim(),30))).slice(0,20):[];
 out.settings=settingsRecord(raw.settings);out.appearance=appearanceMap(raw.appearance);
 const layout=plainRecord(raw.layout)?raw.layout:{};
 out.layout={sidebarCollapsed:layout.sidebarCollapsed===true,collectionView:['list','compact'].includes(layout.collectionView)?layout.collectionView:'grid',favorites:Array.isArray(layout.favorites)?unique(layout.favorites.slice(0,1000).filter(safeId)).slice(0,100):[],lastWorkshop:plainRecord(layout.lastWorkshop)&&['terrarium','scene-studio'].includes(layout.lastWorkshop.kind)&&validTime(layout.lastWorkshop.at)?{kind:layout.lastWorkshop.kind,at:layout.lastWorkshop.at}:null};
 if(safeId(layout.sillPlantId))out.layout.sillPlantId=layout.sillPlantId;
 if(plainRecord(raw.history))for(const [id,rows]of Object.entries(raw.history).slice(0,100))if(safeId(id)&&Array.isArray(rows)){
  const records=new Map();for(const row of rows.slice(-10000)){const sample=safeHistoryRow(row);if(sample)records.set(sample.at,sample);}
  out.history[id]=[...records.values()].sort((a,b)=>a.at-b.at).slice(-48);
 }
 out.notifications=Array.isArray(raw.notifications)?raw.notifications.slice(0,1000).filter(n=>plainRecord(n)&&typeof n.text==='string'&&validTime(n.at)).slice(0,40).map(n=>({text:short(n.text,400),at:n.at})):[];
 out.layouts=Array.isArray(raw.layouts)?raw.layouts.slice(0,100).filter(l=>plainRecord(l)&&typeof l.name==='string').slice(0,8).map(l=>({name:short(l.name,40),order:Array.isArray(l.order)?unique(l.order.slice(0,1000).filter(safeId)).slice(0,100):[],settings:settingsRecord(l.settings),appearance:appearanceMap(l.appearance)})):[];
 out.storyImages=storyImages(raw.storyImages);
 out.terrariums=terrarium.normalizeTerrariumState(raw.terrariums,catalog);
 out.flight=flight.normalizeFlightState(raw.flight);
 out.giftDraft=(gift.normalizeGiftWorkspace || gift.normalizeGiftDraft)(raw.giftDraft,catalog);
 out.delights=delights.normalizeDelightsState(raw.delights,catalog);out.atelier=atelier.normalizeAtelierState(raw.atelier,catalog);out.playground=playground.normalizePlaygroundState(raw.playground,catalog);out.storyStudio=storyStudio.normalizeStoryStudioState(raw.storyStudio,catalog);
 // Classroom documents have a separate strict validator and never enter via raw extras.
 return out;
}
function recordHistory(extras,state,now=Date.now(),force=false) {
 if(!validTime(now)||!Array.isArray(state?.plants))return false;
 if(!plainRecord(extras.history))extras.history={};
 const alive=new Set();
 let changed=false;
 for(const p of state.plants){
  if(!safeId(p.id))continue;
  alive.add(p.id);
  const rows=Array.isArray(extras.history[p.id])?extras.history[p.id]:[];
  const last=rows.at(-1);
  const replace=Boolean(last&&now===last.at&&force);
  const append=!last||now>last.at&&(force||now-last.at>=30*60000||p.growth-last.growth>=.03);
  if(!replace&&!append)continue;
  const sample=safeHistoryRow({at:now,growth:p.growth,moisture:p.moisture,health:p.health,
   bloomPhase:p.growth===1?game.bloomInfo(p).phase:undefined});
  if(!sample)continue;
  if(replace)rows[rows.length-1]=sample;
  else {
   if(rows.length>=48)rows.shift();
   rows.push(sample);
  }
  extras.history[p.id]=rows;
  changed=true;
 }
 for(const key of Object.keys(extras.history)){
  if(alive.has(key))continue;
  delete extras.history[key];
  changed=true;
 }
 return changed;
}
const potIndexes = new WeakMap();
const decorationIndexes = new WeakMap();
function gardenAppearance(extras) {
 const {appearance}=extras;
 const pots=extras.atelier.pots;
 const current=decorationIndexes.get(appearance);
 if(current?.pots===pots)return current.entries;
 let potIndex=potIndexes.get(pots);
 if(!potIndex){
  potIndex=new Map(pots.map(pot=>[pot.id,atelier.getAtelierPotOptions(pot)]));
  potIndexes.set(pots,potIndex);
 }
 const entries=Object.fromEntries(Object.entries(appearance).map(([id,entry])=>{
  const custom=potIndex.get(entry.potId);
  return [id,custom?{...entry,...custom}:entry];
 }));
 decorationIndexes.set(appearance,{pots,entries});
 return entries;
}
function resolvedAtmosphere(settings,now=new Date()) {
 const h=now.getHours(),m=now.getMonth();
 const light=settings.light==='auto'?(h<6||h>=21?'night':h<9?'dawn':h>=17?'sunset':'day'):settings.light;
 return {...settings,light,season:settings.season==='auto'?['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter'][m]:settings.season,night:settings.theme==='night'||settings.theme==='auto'&&light==='night'};
}
function artworkGrowth(plant,phase=plant.growth>=1?game.bloomInfo(plant).phase:null) {
 return phase==='rest'?.65:phase==='bud'?.85:plant.growth;
}
function createFeatures(api) {
 const {game,art,media,backup,knowledge,exchange,esc,icon}=api;
 const garden = gardenUpgrades.create(api);
 const workbench = floraWorkbench.create(api);
 const factories = {
  terrarium:terrarium.createTerrariumFeature,
  flight:flight.createFlightFeature,
  gift:gift.createGiftFeature,
  delights:delights.createDelightsFeature,
  atelier:atelier.createAtelierFeature,
  playground:playground.createPlaygroundFeature,
  storyStudio:storyStudio.createStoryStudioFeature,
 };
 const initialized = new Map();
 function experience(name) {
   if (!initialized.has(name)) initialized.set(name, factories[name](api));
   return initialized.get(name);
 }
 async function flushExperiences(){for(const experience of initialized.values())await experience.flush?.();await api.flushMutations?.();}
 const $=(s,p=document)=>p.querySelector(s);
 const button=(action,label,id='',kind='secondary')=>`<button class="button ${kind}" data-feature="${action}"${id?` data-id="${esc(id)}"`:''}>${label}</button>`;
 const options=(items,current)=>items.map(([id,label])=>`<option value="${esc(id)}" ${String(current)===String(id)?'selected':''}>${esc(label)}</option>`).join('');
 const input=(name,label,value='',type='text',max=120)=>`<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" maxlength="${max}"></label>`;
 const select=(name,label,items,value)=>`<label class="field"><span>${label}</span><select name="${name}">${options(items,value)}</select></label>`;
 const species=id=>game.CATALOG.find(s=>s.id===id);
 const name=p=>api.extras.appearance[p.id]?.name||species(p.speciesId)?.name||'Растение';
 const stampFormat=new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
 const stamp=t=>stampFormat.format(t);
 const interval=ms=>!Number.isFinite(ms)?'после восстановления':ms<=0?'сейчас':ms<3600000?`${Math.ceil(ms/60000)} мин`:`${Math.ceil(ms/3600000)} ч`;
 const decoratedAppearance=()=>gardenAppearance(api.extras);
 function image(p,opts={}) {
  const growth=artworkGrowth(p);
  const {light,season}=resolvedAtmosphere(api.extras.settings);
  const appearance=decoratedAppearance()[p.id]||{};
  return art.plantArt(p.speciesId,{
   id:p.id,moisture:p.moisture,variant:p.lineageId||p.id,growth,pot:appearance.pot||api.prefs.pot,
   shape:appearance.shape,material:appearance.material,customPot:appearance.customPot,
   light,season,...opts,
  });
 }
 let compare=[],chosen=new Set(),journalQuery='',journalKind='all',journalSpecies='',journalDays=0,catPrice='',catHours='',wishOnly=false;
 let studioOptions={target:'garden',format:'portrait',caption:'',showName:true,showDate:true,before:false},studioBlob=null,studioJob=null;
 let transferPending=null,room=null,roomPassword='',currentSettings=false,dragId=null,lastTutorialAction=null;
 const close=()=>api.closeDialog();
 const classroomTools = classroomUpgrades.create({api,open:(...args)=>open(...args),getRoom:()=>room,saveRoom,showRoom:()=>classroom()});
 const open=(title,html,kind='feature',wide=true)=>{currentSettings=false;api.showDialog(esc(title),html,kind,wide);const dialog=document.querySelector('dialog');if(dialog)dialog.dataset.featureSize=['hub','worlds','greenhouse','studio'].includes(kind)?'canvas':/data-feature-form="(?:identity|goal|vacation|care-profile|layout|profile-create)"/.test(html)?'compact':'regular';};
 const sorted=()=>{const rank=new Map(api.extras.order.map((id,i)=>[id,i]));return api.state.plants.slice().sort((a,b)=>(rank.get(a.id)??999)-(rank.get(b.id)??999));};
 function applyAtmosphere(){const a=resolvedAtmosphere(api.extras.settings);const root=document.documentElement;root.classList.toggle('theme-night',a.night);root.classList.toggle('high-contrast',a.contrast);root.dataset.season=a.season;root.dataset.scene=a.scene;root.dataset.light=a.light;root.dataset.weather=a.weather;root.dataset.textScale=a.textScale;root.style.setProperty('--text-scale',a.textScale/100);root.style.setProperty('--keyboard-height',`${Math.max(0,innerHeight-(globalThis.visualViewport?.height||innerHeight))}px`);experience('delights').applyDesign();}
 function resumeCard(){const last=api.extras.layout.lastWorkshop;if(!last)return '';const scene=last.kind==='terrarium'?api.extras.terrariums.draft:api.extras.storyStudio.draft;if(!scene)return '';const action=last.kind==='terrarium'?'terrariums':'scene-studio',plant=scene.items.find(i=>(i.kind==='plant'||i.type==='plant')&&species(i.speciesId)),picture=plant?art.plantArt(plant.speciesId,{id:'resume-'+action,growth:1,pot:'cream'}):art.beeArt('','happy');return `<article class="resume-workshop" data-tone="lilac"><div class="resume-art" aria-hidden="true">${picture}</div><div><span class="tiny-label">ПРОДОЛЖИТЬ ТВОРИТЬ</span><h3>${esc(scene.name)}</h3><p>${last.kind==='terrarium'?'Флорариум':'Живая сцена'} · ${scene.items.length} предметов</p><button class="text-button" data-feature="${action}">Открыть черновик ${icon('arrow',16)}</button></div></article>`;}
 function worlds(){const cards=[['terrariums','sage','Флорариумы','Маленький лес под стеклом. Мох, тропинки и собственная композиция.',art.plantArt('fern',{id:'world-fern',growth:1,pot:'cream'})],['flight','honey','Полёт Жужи','Полетайте над поляной, раскройте тайники и соберите цветной нектар.',art.beeArt('','curious')],['playground','honey','Садовые игры','Девять занятий со светом, водой, музыкой и маленькими загадками.',art.plantArt('sunflower',{id:'world-games',growth:1,pot:'cream'})],['living-gift','rose','Живой подарок','Письмо, которое раскрывается, и росток, который продолжает расти.',art.plantArt('daisy',{id:'world-gift',growth:.15,pot:'pink'})],['scene-studio','lilac','Живые сцены','Бумажный театр с растениями, Жужей и вашими словами.',art.plantArt('lavender',{id:'world-scene',growth:1,pot:'cream'})]];open('Маленькие миры',`<p class="dialog-intro">Выберите, чем наполнить эту минуту: исследованием, творчеством или тёплым подарком.</p>${resumeCard()}<div class="world-gallery">${cards.map(([action,tone,title,description,picture])=>`<button class="world-card" data-tone="${tone}" data-feature="${action}"><span class="world-visual" aria-hidden="true">${picture}</span><span class="world-copy"><strong>${title}</strong><span>${description}</span><b>Открыть ${icon('arrow',17)}</b></span></button>`).join('')}</div><div class="world-workshops"><span>Ещё немного творчества</span>${button('atelier',icon('garden',18)+' Ателье горшков')}${button('garden-comic',icon('journal',18)+' Комикс сада')}${button('atlas',icon('book',18)+' Атлас растений')}</div>`,'worlds');}
 function toolbar(){return `<div class="feature-toolbar compact-feature-toolbar" aria-label="Возможности сада">${button('worlds',icon('spark',17)+' Маленькие миры')}${button('hub',icon('grid',17)+' Возможности')}</div>`;}
 function afterRender(){
 applyAtmosphere();const main=$('#main');if(!main)return;
 const herbariumIndex=api.page==='herbarium' ? main.querySelector('.cyan-index') : null;
 if(herbariumIndex)herbariumIndex.insertAdjacentHTML('beforebegin',toolbar());
 else main.querySelector('.page-heading')?.insertAdjacentHTML('afterend',toolbar());
 garden?.afterRender();
 workbench?.afterRender();
 if(api.extras.demo || api.extras.creative)main.insertAdjacentHTML('afterbegin',`<div class="demo-banner">${api.extras.creative?'Творческий сад · семена бесплатны':'Демонстрационный сад · отдельный учебный профиль'} ${button('exit-demo','Вернуться к моему саду')}</div>`);
 const mainTitle=$('#main h1');if(api.page==='garden'&&mainTitle){mainTitle.textContent=api.extras.gardenName;if(api.extras.description)mainTitle.nextElementSibling.textContent=api.extras.description;}
 if(api.state.vacationUntil>Date.now())main.querySelector('.feature-toolbar')?.insertAdjacentHTML('afterend',`<div class="vacation-banner">Сад отдыхает до ${stamp(api.state.vacationUntil)}. Рост, высыхание и доход приостановлены. ${button('vacation-end','Завершить отпуск')}</div>`);
 if(api.page==='garden'){
 main.querySelector('.garden-context')?.insertAdjacentHTML('beforeend',resumeCard());
 const heading=$('.section-heading');if(api.state.plants.length)heading?.insertAdjacentHTML('afterend',`<details class="collection-management"><summary>${icon('settings',16)} Управление коллекцией</summary><div class="collection-actions">${button('batch','Выбрать растения для полива')}${button('greenhouse','Изменить порядок')}${button('identity','Имя и описание сада')}</div></details>`);
 if(api.extras.goal){const s=species(api.extras.goal),cost=api.plantCost(s.id);heading?.insertAdjacentHTML('beforebegin',`<div class="goal-banner"><span>Копим на ${esc(s.name)}: ${Math.min(api.state.coins,cost)} / ${cost} монет</span><progress aria-label="Накопление на растение" value="${Math.min(api.state.coins,cost)}" max="${Math.max(1,cost)}"></progress>${button('goal','Изменить цель')}</div>`);}

 }
 if(api.page==='catalog'){
 $('.catalog-toolbar')?.insertAdjacentHTML('afterend',`<details class="catalog-more-filters"><summary>${icon('settings',16)} Цена, время и избранное</summary><div class="advanced-filters">${input('catalog-price','Цена до',catPrice,'number')}${input('catalog-hours','Взросление до, ч',catHours,'number')}<label class="check-field"><input id="wishes-only" type="checkbox" ${wishOnly?'checked':''}> Избранные виды</label>${button('compare',`Сравнить (${compare.length}/3)`)}</div></details>`);
 const catalogToolbar=$('.catalog-toolbar'),moreFilters=$('.catalog-more-filters');if(catalogToolbar&&moreFilters){moreFilters.open=globalThis.matchMedia?.('(min-width: 901px)').matches===true;const holder=document.createElement('div');holder.className='catalog-filter-dock';catalogToolbar.before(holder);holder.append(catalogToolbar,moreFilters);}
 $('#catalog-results')?.insertAdjacentHTML('beforebegin','<div class="catalog-filter-status" aria-label="Активные фильтры"></div>');
 enhanceCatalog();
 }
 if(api.page==='journal')enhanceJournal();
 const reminder=api.extras.settings.backupReminders&&api.state.plants.length&&Date.now()-api.extras.lastExportAt>7*86400000&&Date.now()-api.extras.lastReminderAt>86400000;
 if(reminder)main.insertAdjacentHTML('beforeend',`<aside class="backup-reminder">Сохраните отдельную копию сада — особенно перед переносом HTML-файла. ${button('backup-center','Сохранения')}${button('remind-later','Позже')}</aside>`);
 updateTutorial();
 }
 function svgElement(svg){return new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;}
 function enhanceCatalog(){
 const results=$('#catalog-results');
 if(!results)return;
 const cards=[...results.querySelectorAll('.plant-card')];
 const ceilingPrice=catPrice===''?Infinity:Number(catPrice);
 const ceilingHours=catHours===''?Infinity:Number(catHours);
 const wishes=new Set(api.extras.wishes);
 let hasTitleMatch=false;
 for(const card of cards){
 const id=card.querySelector('[data-id]')?.dataset.id,s=species(id);if(!s)continue;
 const titleMatches=api.matchesCatalogSearch(s);
 const wished=wishes.has(id);
 const hidden=!titleMatches||api.plantCost(id)>ceilingPrice||s.growthHours>ceilingHours||wishOnly&&!wished;
 if(card.hidden!==hidden)card.hidden=hidden;
 hasTitleMatch||=titleMatches;
 if(!card.querySelector('.catalog-extras'))card.insertAdjacentHTML('beforeend',`<div class="catalog-extras"><button data-feature="wish" data-id="${id}" aria-pressed="${wished}">${icon('heart',15)} ${wished?'В избранном':'Хочу вырастить'}</button><button data-feature="compare-toggle" data-id="${id}" aria-pressed="${compare.includes(id)}">${compare.includes(id)?'✓':'+'} Сравнить</button></div>`);
 }
 const controls=[
   ...(catPrice!==''?[['price','До '+catPrice+' монет']]:[]),
   ...(catHours!==''?[['hours','До '+catHours+' ч']]:[]),
   ...(wishOnly?[['wish','Избранные виды']]:[]),
   ...($('#search')?.value.trim()?[['query','Поиск: '+$('#search').value.trim()]]:[]),
   ...(api.catalogFilter!=='all'?[['category','Категория: '+($('.catalog-toolbar [aria-pressed="true"]')?.textContent.trim()||'выбрана')]]:[]),
 ];
 const chipMarkup=controls.map(([filter,label])=>`<button type="button" class="button secondary" data-feature="catalog-clear-filter" data-id="${filter}" aria-label="Снять фильтр: ${esc(label)}">${esc(label)} ×</button>`).join('');
 const chips=$('.catalog-filter-status');
 if(chips&&chips.innerHTML!==chipMarkup)chips.innerHTML=chipMarkup;
 const existing = results.querySelector('.catalog-filter-empty');
 const filteredOut=!cards.length||cards.every(card=>card.hidden);
 const emptyReason=hasTitleMatch?'limits':'search';
 if(filteredOut&&existing?.dataset.reason!==emptyReason){
   existing?.remove();
   const suggestion=hasTitleMatch
     ? '<h3>По этим ограничениям ничего не нашлось</h3><p>Расширьте цену или срок взросления либо покажите все виды.</p>'+button('catalog-clear-filter','Снять дополнительные ограничения','advanced')
     : '<h3>Такого ростка пока нет</h3><p>Попробуйте другое название или категорию.</p><button class="text-button" data-action="clear-search">Сбросить поиск</button>';
   results.insertAdjacentHTML('beforeend',`<div class="empty-inline catalog-filter-empty" data-reason="${emptyReason}">${suggestion}</div>`);
 }
 if(!filteredOut)existing?.remove();
 }
 function clearCatalogFilter(key){
   if(key==='price'||key==='advanced')catPrice='';
   if(key==='hours'||key==='advanced')catHours='';
   if(key==='wish'||key==='advanced')wishOnly=false;
   if(key==='query'||key==='category')return api.clearCatalogFilter(key);
   api.render();
   ($('input[name="catalog-price"]')?.getClientRects().length ? $('input[name="catalog-price"]') : $('#search'))?.focus();
 }
 function enhanceJournal(){
 if(!api.journal.length){const empty=$('.journal-empty');if(empty)empty.innerHTML=`<div class="journal-blank-art" aria-hidden="true">${art.emptyState('journal')}</div><h2>У вашей истории ещё чистые страницы</h2><p>${api.state.plants.length?'Позаботьтесь о ростке — первая запись появится здесь.':'Посадите первый росток — и история сада начнётся.'}</p>${api.state.plants.length?`<button class="button primary" data-action="plant-detail" data-id="${api.state.plants[0].id}">Открыть моё растение ${icon('arrow',17)}</button>`:`<button class="button primary" data-action="browse">Выбрать растение ${icon('arrow',17)}</button>`}`;return;}
 $('.journal-layout')?.insertAdjacentHTML('beforebegin',`<div class="journal-filters">${input('journal-search','Найти событие',journalQuery)}${select('journal-kind','Действие',[['all','Все действия'],['water','Полив'],['garden','Посадка'],['spark','Рост и удобрения'],['coin','Монеты']],journalKind)}${select('journal-species','Растение',[['','Все растения'],...game.CATALOG.map(s=>[s.id,s.name])],journalSpecies)}${select('journal-days','Период',[['0','Вся история'],['7','За неделю'],['30','За месяц']],journalDays)}</div><div class="collection-actions">${button('calendar','Календарь заботы')}${button('weekly','Итоги недели')}${button('journal-html','Скачать HTML')}${button('journal-csv','Скачать CSV')}</div>`);
 const rows=[...document.querySelectorAll('.journal-entry')];rows.forEach((row,i)=>{const e=api.journal[i],key=eventId(e),pin=api.extras.pinned.includes(key);row.dataset.eventId=key;row.hidden=!journalMatch(e);row.insertAdjacentHTML('beforeend',`<button class="pin-event" data-feature="pin" data-id="${esc(key)}" aria-label="${pin?'Открепить':'Закрепить'} событие" aria-pressed="${pin}">${pin?'★':'☆'}</button>`);});
 }
 const eventId = event => event.id || `${event.at}-${String(event.text).slice(0,55)}`;
 function journalMatch(e){return (!journalQuery||e.text.toLowerCase().includes(journalQuery.toLowerCase()))&&(journalKind==='all'||e.kind===journalKind)&&(!journalSpecies||e.speciesId===journalSpecies||e.text.includes(species(journalSpecies).name))&&(!journalDays||e.at>=Date.now()-journalDays*86400000);}
 function hub(){const groups=[['Заботиться','sage','Всё, что помогает вашему саду расти',[['greenhouse','garden','Оранжерея','Полки, группы и порядок растений'],['batch','water','Общий полив','Выбрать растения для заботы'],['plans','spark','Открытия','Цели, достижения и задания'],['guide','info','Помощь Жужи','Подсказки, словарь и обучение'],['identity','leaf','Имя сада','Название и небольшая история']]],['Создавать','lilac','Место для фантазии и маленьких подарков',[['worlds','spark','Маленькие миры','Все творческие занятия вместе'],['terrariums','garden','Флорариумы','Композиции под стеклом'],['atelier','garden','Ателье горшков','Вылепить свою форму'],['scene-studio','camera','Живые сцены','Собрать анимацию'],['living-gift','heart','Живой подарок','Росток с пожеланием'],['garden-comic','journal','Комикс сада','Настоящие события в картинках'],['studio','camera','Фотостудия','Снимки и живые открытки'],['workshop','sun','Мастерская','Свет, сезоны и материалы'],['personal-design','sun','Цвет и движение','Палитра и удобная рука']]],['Исследовать','honey','Находки, наблюдения и спокойные игры',[['flight','spark','Полёт Жужи','Секреты цветочной поляны'],['playground','spark','Садовые игры','Девять маленьких загадок'],['atlas','book','Атлас растений','Рисунки, записи и закладки'],['seed-packets','leaf','Коробочка семян','Раскрыть знакомые виды'],['notifications','journal','Сообщения','Последние подсказки сада']]],['Сохранять','rose','Ваши миры остаются с вами',[['backup-center','download','Сохранения','Копии и восстановление'],['profiles','leaf','Мои сады','Отдельные локальные профили'],['classroom','heart','Сад класса','Защищённый файл для обмена'],['accessibility','settings','Удобство','Крупный текст и доступность'],['diagnostics','info','О приложении','Версия и технический отчёт']]]];open('Возможности сада',`<p class="dialog-intro">Четыре направления — выбирайте то, что хочется сейчас.</p><div class="hub-sections">${groups.map(([title,tone,description,items])=>`<section class="hub-section" data-tone="${tone}"><header><span class="hub-section-mark" aria-hidden="true">${icon(items[0][1],22)}</span><div><h3>${title}</h3><p>${description}</p></div></header><div class="hub-grid">${items.map(([action,i,t,d])=>`<button data-feature="${action}">${icon(i,23)}<strong>${t}</strong><span>${d}</span></button>`).join('')}</div></section>`).join('')}</div>`,'hub');}
 async function rememberWorkshop(kind){await api.commit(({extras})=>{extras.layout.lastWorkshop={kind,at:Date.now()};});}
 function workshopSettings(fields,previous) {
   const scene=Object.fromEntries(['theme','light','season','weather','scene','outside','platform','shelf'].map(key=>[key,fields.get(key)]));
   return settingsRecord({...previous,...scene,decor:fields.getAll('decor')});
 }
 function workshopArtwork(settings) {
   const plants=gardenDesign.pickStillLife(api.state.plants).map(plant=>({...plant,growth:artworkGrowth(plant)}));
   return art.gardenArt({...resolvedAtmosphere(settings),plants,appearance:decoratedAppearance()});
 }
 function workshop(){const e=api.extras,s=e.settings;open('Мастерская сада',`<form data-feature-form="workshop"><div class="form-grid">${select('theme','Тема',[['light','Светлая'],['night','Ночной сад'],['auto','По времени суток']],s.theme)}${select('light','Освещение',[['auto','По местному времени'],['day','День'],['dawn','Рассвет'],['sunset','Закат'],['night','Ночь']],s.light)}${select('season','Время года',[['auto','Текущий сезон'],['spring','Весна'],['summer','Лето'],['autumn','Осень'],['winter','Зима']],s.season)}${select('weather','За окном',[['clear','Ясно'],['rain','Дождь'],['snow','Снег']],s.weather)}${select('scene','Окружение',[['window','Подоконник'],['balcony','Балкон'],['desk','Рабочий стол']],s.scene)}${select('outside','Вид за окном',[['auto','По месту'],['courtyard','Двор с деревом'],['roofs','Крыши'],['grove','Роща']],s.outside)}${select('platform','Материал полок',[['wood','Дерево'],['stone','Камень']],s.platform)}${select('shelf','Высота полок',[['low','Низкие'],['medium','Средние'],['high','Высокие']],s.shelf)}</div><p class="form-help">Погода — оформление сцены. Она не расходует воду и не заменяет полив.</p><fieldset class="decor-choices"><legend>Украшения за открытия</legend>${[['stones','Камни',1],['label','Бирки',3],['tools','Инструменты',6]].map(([id,label,n])=>`<label><input type="checkbox" name="decor" value="${id}" ${s.decor.includes(id)?'checked':''} ${api.state.discovered.length<n?'disabled':''}>${label} · ${n} ${n===1?'вид':'вида'}${api.state.discovered.length<n?' (пока закрыто)':''}</label>`).join('')}</fieldset><button class="button primary" type="submit">Применить оформление</button></form><div class="workshop-preview">${workshopArtwork(s)}</div><p class="form-help">Форму, материал и цвет отдельного горшка меняйте в уходе → «Имя и горшок».</p>`);}
 function accessibility(){const s=api.extras.settings;open('Удобно именно вам',`<form data-feature-form="accessibility"><div class="form-grid">${select('textScale','Размер текста',[['100','100%'],['125','125%'],['150','150%'],['200','200%']],s.textScale)}${select('notificationSeconds','Длительность сообщений',[['5','5 секунд'],['10','10 секунд'],['20','20 секунд'],['60','1 минута']],s.notificationSeconds)}</div><label class="check-field"><input name="contrast" type="checkbox" ${s.contrast?'checked':''}>Повышенный контраст</label><label class="check-field"><input name="shortcuts" type="checkbox" ${s.shortcuts?'checked':''}>Горячие клавиши</label><label class="check-field"><input name="backupReminders" type="checkbox" ${s.backupReminders?'checked':''}>Напоминать о резервной копии</label><button class="button primary">Сохранить</button></form><details class="info-details"><summary>Клавиши садовода</summary><p>Alt+1 — сад, Alt+2 — каталог, Alt+3 — гербарий, Alt+4 — журнал. Alt+F — поиск, Alt+W — уход за выбранным растением, Escape — закрыть окно. Сочетания не срабатывают при вводе текста.</p></details>`);}
 function identity(){open('Сад по имени',`<form data-feature-form="identity">${input('gardenName','Название сада',api.extras.gardenName,'text',60)}<label class="field"><span>Небольшое описание</span><textarea name="description" maxlength="240">${esc(api.extras.description)}</textarea></label><button class="button primary">Сохранить</button></form>`);}
 function editPlant(id){const p=api.state.plants.find(p=>p.id===id);if(!p)return;const a=api.extras.appearance[id]||{};open('Имя, заметки и горшок',`<form data-feature-form="plant-meta" data-id="${id}"><div class="form-grid">${input('name','Личное имя',a.name||'','text',60)}${input('group','Группа растений',a.group||'','text',30)}${select('pot','Цвет',[['clay','Терракота'],['sage','Шалфей'],['cream','Молочный'],['pink','Розовый']],a.pot||api.prefs.pot)}${select('shape','Форма',[['classic','Классический'],['tall','Высокое кашпо'],['bowl','Низкая чаша']],a.shape||'classic')}${select('material','Материал',[['clay','Глина'],['glaze','Глазурь'],['paper','Крафт'],['painted','Ботаническая роспись']],a.material||'clay')}${select('potId','Авторская форма',[['','Обычный горшок'],...api.extras.atelier.pots.map(p=>[p.id,p.name])],a.potId||'')}</div><label class="field"><span>Ваши наблюдения</span><textarea name="note" maxlength="1200" rows="4">${esc(a.note||'')}</textarea></label><button class="button primary">Сохранить растение</button></form>`);}
 function careExtras(p){const f=game.forecast(api.state,p.id,Date.now()),a=api.extras.appearance[p.id],b=game.bloomInfo(p);return `<div class="care-v2">${species(p.speciesId)?.category==='flowers'?button('bloom-preview','Посмотреть цветение',p.id):''}<div class="care-forecast"><h3>Ближайшая забота</h3><p>Полив: ${f.nextWaterAt===null?'после отпуска':interval(f.nextWaterAt-Date.now())}. ${p.growth<1?`До взросления с регулярным уходом: ${interval(f.withCareMatureAt-Date.now())}.`:''}</p>${!f.canMatureWithoutWater&&p.growth<1?'<p>До взросления понадобится дополнительный полив.</p>':''}${p.growth>=1?`<p>${esc(b.label||'Взрослое растение')} · до ${Math.round(f.incomePerHour)} монет/ч при влажной почве и живом растении. Исследование повышает доход на ${game.researchLevel(api.state,p.speciesId)*10}%.</p>`:''}</div>${a?.note?`<blockquote>${esc(a.note)}</blockquote>`:''}<div class="care-extra-actions">${button('edit-plant','Имя и горшок',p.id)}${button('living-gift','Подарить такой росток',p.speciesId)}${button('history','История роста',p.id)}${button('ask-bee','Спросить Жужу',p.id)}${button('propagate','Получить черенок',p.id)}${button('repot','Пересадить · 200 монет',p.id)}${button('recover','Восстановить здоровье',p.id)}</div><p class="form-help">Черенок доступен у взрослого растения после отдыха. Пересадка после 25% роста уменьшает расход воды на 20%. Восстановление при здоровье ниже 70% расходует 1 воду и занимает 2 часа.</p></div>`;}
 function greenhouse(group=''){const all=sorted(),plants=group?all.filter(p=>api.extras.appearance[p.id]?.group===group):all;open('Ваша оранжерея',`<div class="greenhouse-scene">${art.greenhouseArt(plants,{...resolvedAtmosphere(api.extras.settings),appearance:decoratedAppearance(),columns:Math.min(4,Math.max(2,Math.ceil(Math.sqrt(plants.length))))})}</div><div class="collection-actions">${button('workshop','Оформление сцены')}${button('save-layout','Запомнить композицию')}${button('layouts','Мои композиции')}${button('studio','Снять весь сад')}</div><label class="field"><span>Группа</span><select id="greenhouse-group">${options([['','Все растения'],...unique(all.map(p=>api.extras.appearance[p.id]?.group).filter(Boolean)).map(g=>[g,g])],group)}</select></label><p class="form-help">Перетаскивайте строки или используйте стрелки. Порядок сохраняется для оранжереи и сортировки «Мой порядок».</p><div class="order-list">${plants.map(p=>`<div class="order-row" draggable="true" data-order-id="${p.id}"><span class="order-handle" aria-hidden="true">⠿</span><span>${esc(name(p))}<small>${esc(api.extras.appearance[p.id]?.group||species(p.speciesId).latinName)}</small></span><button data-feature="move-left" data-id="${p.id}" aria-label="${esc(name(p))}: левее">↑</button><button data-feature="move-right" data-id="${p.id}" aria-label="${esc(name(p))}: правее">↓</button><button data-action="plant-detail" data-id="${p.id}">Уход</button></div>`).join('')||'<p>Посадите первый росток, чтобы собрать оранжерею.</p>'}</div>`,'greenhouse');}
 async function reorder(id,to){await api.commit(({extras,state})=>{const ids=unique([...extras.order,...state.plants.map(p=>p.id)]).filter(x=>state.plants.some(p=>p.id===x));const from=ids.indexOf(id);if(from<0)return;ids.splice(from,1);ids.splice(Math.max(0,Math.min(to,ids.length)),0,id);extras.order=ids;});greenhouse();}
 function batch(){chosen=new Set();open('Позаботиться вместе',`<p class="dialog-intro">Отметьте растения. Один полезный полив расходует одну порцию воды.</p><div class="batch-list">${sorted().map(p=>`<label><input type="checkbox" name="batch-plant" value="${p.id}" ${!game.needsWater(p)?'disabled':''}><span>${esc(name(p))}<small>${Math.round(p.moisture)}% влаги · ${game.needsWater(p)?'можно полить':'почва ещё влажная'}</small></span></label>`).join('')}</div><p id="batch-cost">Выбрано: 0 · воды в запасе: ${api.state.water}</p>${button('batch-apply','Полить выбранные','','primary')}`);}
 function compareView(){const list=compare.map(species).filter(Boolean);open('Сравним растения',list.length?`<div class="compare-grid">${list.map(s=>`<article>${art.plantArt(s.id)}<h3>${esc(s.name)}</h3><dl><dt>Взросление</dt><dd>${s.growthHours} ч</dd><dt>Цена сейчас</dt><dd>${api.plantCost(s.id)} монет</dd><dt>Базовый доход</dt><dd>${s.incomePerHour} монет/ч</dd></dl>${button('wish',api.extras.wishes.includes(s.id)?'В избранном':'Хочу вырастить',s.id)}<button class="button primary" data-action="preview" data-id="${s.id}">Выбрать</button></article>`).join('')}</div>`:'<p>Отметьте до трёх видов кнопкой «Сравнить» в каталоге.</p>');}
 function goal(){open('Следующий росток',`<form data-feature-form="goal">${select('goal','На какое растение копим?',[['','Без цели'],...game.CATALOG.map(s=>[s.id,`${s.name} · ${api.plantCost(s.id)} монет`])],api.extras.goal||'')}<button class="button primary">Запомнить цель</button></form>`);}
 function plans(){const tasks=game.tasks(api.state),mature=unique([...api.extras.achievements.filter(x=>x.startsWith('mature:')).map(x=>x.slice(7)),...api.state.plants.filter(p=>p.growth>=1).map(p=>p.speciesId)]).filter(species);open('Маленькие открытия',`<div class="collection-actions">${button('goal','Выбрать цель')}${button('vacation','Режим отпуска')}${button('care-profile','Правила полива')}</div><p class="dialog-intro">Задания без срока. Никаких потерянных серий и штрафов за перерыв.</p><div class="task-list">${tasks.map(t=>`<article><div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p><span>${t.progress} / ${t.target} · награда ${t.reward} монет</span></div><button class="button secondary" data-feature="claim" data-id="${t.id}" ${!t.complete||t.claimed?'disabled':''}>${t.claimed?'Получено':'Забрать награду'}</button></article>`).join('')}</div><h3>Ваши вехи</h3><div class="milestones">${api.state.discovered.map(id=>`<span>${icon('leaf',14)} Открыто: ${esc(species(id).name)}</span>`).join('')}${mature.map(id=>`<span>${icon('spark',14)} Впервые выросло: ${esc(species(id).name)}</span>`).join('')}${game.CATALOG.every(s=>api.state.discovered.includes(s.id))?`<span>${icon('book',14)} Вся коллекция видов открыта</span>`:''}${!api.state.discovered.length?'<p>Первый росток станет началом вашей коллекции.</p>':''}</div>`);}
 function careProfile(){open('Ритм полива',`<p>Классический режим сохраняет правила Android: 4% влаги в час. В естественном игровом режиме виды отличаются потреблением воды. Это условности игры, не инструкция для настоящих растений.</p><form data-feature-form="care-profile">${select('profile','Режим',[['classic','Классический'],['natural','Разный характер видов']],api.state.careProfile)}<button class="button primary">Применить с этого момента</button></form><ul>${game.CATALOG.map(s=>`<li>${esc(s.name)}: ${s.waterPerHour??4}% в час в естественном режиме</li>`).join('')}</ul>`);}
 function vacation(){open('Пусть сад отдохнёт',`<p>Во время отпуска останавливаются рост, высыхание, доход и отсчёт ускорений. Прогресс не потеряется, но монеты за паузу не начисляются.</p><form data-feature-form="vacation">${select('hours','Продолжительность',[['24','Один день'],['72','Три дня'],['168','Неделя'],['336','Две недели'],['720','30 дней']],24)}<button class="button primary">Начать отпуск</button></form>`);}
 function history(id){
   const plant=api.state.plants.find(item=>item.id===id);
   if(!plant)return;
   const rows=api.extras.history[id]||[];
   const table=rows.slice().reverse().map(row=>`<tr><td>${stamp(row.at)}</td><td>${Math.round(row.growth*100)}%</td><td>${Math.round(row.moisture)}%</td><td>${row.health===null?'Не записано':Math.round(row.health)+'%'}</td></tr>`).join('');
   open('История: '+name(plant),`<p class="dialog-intro">Наблюдения, сохранённые этим садом.</p>${button('growth-book',floraLocale.t('plantChronicle'),id)}${visualJournal.growthChart(rows,api.journal,id)}<div class="history-table"><table><thead><tr><th>Время</th><th>Рост</th><th>Влага</th><th>Здоровье</th></tr></thead><tbody>${table}</tbody></table></div>${button('before-after','Открытка «было — стало»',id)}`,'history');
 }
 function calendar(){const days=Array.from({length:35},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-34+i);return d;});open('Календарь заботы',`<p>Каждый день с заботой — маленькая история. Пропуски ничего не отнимают.</p><div class="care-calendar">${days.map(d=>{const count=api.journal.filter(e=>new Date(e.at).toDateString()===d.toDateString()&&['water','garden','spark'].includes(e.kind)).length;return `<div class="${count?'cared':''}" title="${dateLabel(d)}: ${count} действий"><span>${d.getDate()}</span><small>${count?count+' забот':'—'}</small></div>`;}).join('')}</div>`);}
 const dateLabel=d=>new Date(d).toLocaleDateString('ru-RU',{day:'numeric',month:'long'});
 function weeklySummary(now=Date.now()) {
   const days=visualJournal.weekData(api.journal,api.extras.history,now);
   const since=days[0].date.getTime();
   const growth=api.state.plants.flatMap(plant=>{
     const rows=(api.extras.history[plant.id]||[]).filter(row=>row.at>=since&&row.at<=now);
     return rows.length<2?[]:[(rows.at(-1).growth-rows[0].growth)*100];
   });
   return {
     since,now,added:days.reduce((sum,day)=>sum+day.plant,0),watered:days.reduce((sum,day)=>sum+day.water,0),
     growthSamples:growth.length,growth:growth.length?Math.round(growth.reduce((sum,value)=>sum+value,0)/growth.length):null,
   };
 }
 function weekly(){const summary=weeklySummary();open('Семь дней маленьких чудес',`<div class="weekly-summary"><span>${summary.added}<small>новых растений</small></span><span>${summary.watered}<small>политых растений</small></span><span>${summary.growth===null?'—':(summary.growth>0?'+':'')+summary.growth+' п.п.'}<small>средний прирост</small></span></div><p>Период: ${dateLabel(summary.since)} — ${dateLabel(summary.now)}. Итог основан на сохранённых событиях журнала. ${summary.growthSamples?'Прирост сравнивает реальные наблюдения за эту неделю у растений: '+summary.growthSamples+'.':'Для прироста нужны хотя бы два сохранённых наблюдения за неделю.'}</p>${visualJournal.weekGrid(api.journal,api.extras.history,summary.now)}${button('weekly-photo','Сохранить итог открыткой')}`);}
 function journalExport(format){const entries=api.journal.filter(journalMatch);if(format==='csv'){const cell=v=>{let text=String(v);if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};const csv='\ufeffДата,Действие,Запись\r\n'+entries.map(e=>[new Date(e.at).toISOString(),e.kind,e.text].map(cell).join(',')).join('\r\n');api.download(new Blob([csv],{type:'text/csv;charset=utf-8'}),'flora-journal.csv');}else{const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Журнал Flora Keep</title><style>body{max-width:850px;margin:40px auto;padding:20px;font:17px/1.7 system-ui;color:#294331}article{padding:15px 0;border-bottom:1px solid #ddd}time{color:#65775b}h1{font-family:Georgia}</style><h1>${esc(api.extras.gardenName)}</h1><p>Журнал сохранённых событий · Flora Keep</p>${entries.map(e=>`<article><time>${stamp(e.at)}</time><p>${esc(e.text)}</p></article>`).join('')}</html>`;api.download(new Blob([html],{type:'text/html;charset=utf-8'}),'flora-journal.html');}api.toast('Журнал сохранён отдельным файлом.');}
 function guide(){open('Жужа рядом',`<div class="guide-hero">${art.beeArt('','curious')}<p>Наблюдайте, спрашивайте и двигайтесь в своём темпе.</p></div><div class="hub-grid">${[['tutorial','Показать по шагам'],['picker','Подобрать первый вид'],['glossary','Словарь сада'],['first-evening','Мой первый вечер'],['notifications','История подсказок'],['transfer','Перенос на устройство']].map(([a,t])=>`<button data-feature="${a}"><strong>${t}</strong></button>`).join('')}</div>${api.state.selectedPlantId?button('ask-bee','Спросить о моём растении',api.state.selectedPlantId):''}`);}
 function glossary(){const terms=knowledge.BOTANICAL_GLOSSARY||{};const list=Array.isArray(terms)?terms:Object.entries(terms).map(([term,description])=>({term,description}));open('Словарь маленького сада',`<dl class="glossary">${list.map(t=>`<dt>${esc(t.term||t.name||t.title||'')}</dt><dd>${esc(t.description||t.text||t.definition||'')}</dd>`).join('')}<dt>Доход</dt><dd>Игровые монеты от взрослого, живого растения с влажной почвой. Исследования повышают доход.</dd><dt>Офлайн-рост</dt><dd>После возвращения учитываются первые 24 часа отсутствия. Отпуск приостанавливает рост и доход.</dd><dt>Полезный полив</dt><dd>Полив при влажности не выше 70%. Он расходует одну порцию воды и добавляет опыт исследования.</dd></dl>`);}
 function picker(){open('Какой росток ваш?',`<p>Все виды доступны бесплатно для первой посадки. Выберите то, что вам ближе.</p><div class="picker-grid">${[['daisy','Быстро увидеть результат','Ромашка взрослеет за 6 часов при достаточной влаге.'],['lavender','Нежные цветы','Лавандовые соцветия и спокойная палитра.'],['monstera','Большие зелёные листья','Монстера растёт дольше, зато создаёт тропический уголок.'],['cactus','Более редкая забота','Кактус теряет влагу медленнее в естественном игровом режиме.']].map(([id,t,d])=>`<article>${art.plantArt(id)}<h3>${t}</h3><p>${d}</p><button class="button primary" data-action="preview" data-id="${id}">Посмотреть ${esc(species(id).name)}</button></article>`).join('')}</div>`);}
 function askBee(id){const p=api.state.plants.find(p=>p.id===id);if(!p)return;const f=game.forecast(api.state,id,Date.now());open(`Жужа о растении «${name(p)}»`,`<div class="guide-hero">${art.beeArt('',p.moisture<=70?'watering':'hint')}<p>${p.health<70?'Сейчас полезнее всего помочь растению восстановиться.':p.moisture<=70?'Почва уже достаточно подсохла для полезного полива.':'Сейчас у растения всё спокойно. Можно просто понаблюдать.'}</p></div><details open class="info-details"><summary>Когда поливать?</summary><p>Сейчас ${Math.round(p.moisture)}% влаги. Следующий полезный полив — ${interval(f.nextWaterAt-Date.now())}. В запасе ${api.state.water} порций воды.</p>${api.state.water===0?'<button class="button secondary" data-action="supplies">Открыть бесплатный колодец</button>':''}</details><details class="info-details"><summary>Почему растение ещё не выросло?</summary><p>Рост: ${Math.round(p.growth*100)}%. Влага и здоровье должны быть выше нуля. Удобрение ускоряет рост на четыре часа; отпуск ставит сад на паузу.</p></details><details class="info-details"><summary>Почему нет дохода?</summary><p>Монеты начисляются взрослому растению при положительных влаге и здоровье. Дробные монеты накапливаются до целого значения. Во время отпуска доход остановлен.</p></details>${button('study','Узнать о виде',p.speciesId)}`);}
 function startTutorial(){api.commit(({extras})=>{extras.tutorial=1;}).then(()=>{close();api.navigate('catalog');api.toast('Шаг 1: откройте карточку понравившегося растения. Обучение можно завершить в любой момент.');updateTutorial();});}
 function updateTutorial(){document.querySelectorAll('.tutorial-highlight').forEach(e=>e.classList.remove('tutorial-highlight'));document.querySelector('.tutorial-ribbon')?.remove();const step=api.extras.tutorial;if(!step||step>=4)return;const selectors={1:'[data-action="preview"]',2:'[data-action="plant"]',3:'[data-action="water"]'};const target=[...document.querySelectorAll(selectors[step])].find(e=>e.offsetParent!==null&&!e.disabled);target?.classList.add('tutorial-highlight');const text={1:'Откройте карточку растения.',2:'Посадите росток. Цена показана на кнопке.',3:'Полейте росток, если почва уже подсохла.'}[step];const parent=$('dialog[open] .dialog-body')||$('#main');parent?.insertAdjacentHTML('afterbegin',`<div class="tutorial-ribbon"><span>Шаг ${step} из 3 · ${text}</span><button data-feature="tutorial-end">Завершить</button></div>`);}
 function onAction(action,success=true){if(!success)return;let next=null;if(action==='preview'&&api.extras.tutorial===1)next=2;if(action==='plant'&&api.extras.tutorial===2)next=3;if(action==='water'&&api.extras.tutorial===3)next=4;if(next){api.extras.tutorial=next;api.save();if(next===4)api.toast('Первые шаги пройдены. Дальше сад растёт в вашем ритме.');}if(['plant','water','specimen'].includes(action)&&!api.extras.firstEvening.includes(action)){api.extras.firstEvening.push(action);api.save();}updateTutorial();}
 function firstEvening(){open('Первый вечер в саду',`<p>Три маленьких шага. Можно сделать сейчас, завтра или пропустить — никаких таймеров.</p><ol class="evening-list">${[['plant','Посадить свой росток'],['water','Сделать полезный полив'],['specimen','Прочитать историю вида']].map(([id,t])=>`<li>${api.extras.firstEvening.includes(id)?'✓':'○'} ${t}</li>`).join('')}</ol>${button('tutorial','Показать шаги')}`);}
 function study(id,mode='leaf'){const s=species(id);if(!s)return;const level=game.researchLevel(api.state,id),raw=knowledge.getKnowledge(id,level),facts=Array.isArray(raw)?raw:raw?.facts||[];const entry=knowledge.KNOWLEDGE[id]||{};open(`Ботанический кабинет · ${s.name}`,`<div class="study-tabs">${button('study-leaf','Лист',id)}${button('study-roots','Корни',id)}${button('quiz','Наблюдение',id)}${art.hasFlowerProfile?.(id)?button('study-profile','Вид сбоку',id):''}${button('study-macro','Крупный план',id)}${button('season-atlas','Четыре сезона',id)}</div><div class="study-art">${visualJournal.plate(art.studyArt(id,mode),'Условная шкала схемы')}</div><p class="form-help">Учебная иллюстрация строения. Она не показывает реальное состояние корней вашего игрового растения.</p><h3>Исследование ${level}/5</h3><div class="knowledge-facts">${facts.map((f,i)=>`<article><span>${i+1}</span><p>${f.unlocked===false?'Откроется на уровне '+f.level:esc(typeof f==='string'?f:f.text||f.fact||'')}</p>${typeof f==='object'&&f.unlocked!==false&&(f.sourceUrl||f.source)?`<a href="${esc(f.sourceUrl||f.source.url||f.source)}" target="_blank" rel="noopener noreferrer">Источник</a>`:''}</article>`).join('')}</div><details class="info-details"><summary>Настоящее растение и игровые условности</summary><p>${esc(entry.reality||entry.realLife||s.fact)}</p><p>Часы роста, монеты и правила полива придуманы для игры. Для живого растения ориентируйтесь на условия выращивания, а не игровые шкалы.</p></details>${renderSources(entry)}<p class="form-help">Полезные поливы открывают новые факты. Следующий уровень — после каждых трёх действий.</p>`,'study');onAction('specimen');}
 function renderSources(entry){let sources=entry.sources||[];if(!Array.isArray(sources))sources=[];return `<details class="info-details"><summary>Источники и проверка</summary><ul>${sources.map(s=>`<li><a href="${esc(typeof s==='string'?s:s.url)}" target="_blank" rel="noopener noreferrer">${esc(typeof s==='string'?s:s.title||s.label||s.name||s.url)}</a></li>`).join('')}</ul><p>Проверено: ${esc(entry.checkedAt||entry.verifiedAt||knowledge.KNOWLEDGE_CHECKED_AT||'12 ноября 2026')}. Ссылки открываются только по вашему нажатию.</p></details>`;}
 function seasonalAtlas(id) {
   const plant=species(id);
   if(!plant)return;
   const seasons=[['spring','Весна','dawn','clear'],['summer','Лето','day','clear'],['autumn','Осень','sunset','rain'],['winter','Зима','day','snow']];
   open('Сезоны · '+plant.name,`<p>Четыре художественных вида из окна. Вид растения можно сравнить в разном свете и погоде.</p><div class="motion-example">${seasons.map(([season,label,light,weather])=>`<figure>${art.gardenArt({season,light,weather,plants:[{id:'season-'+season,speciesId:id,growth:1}]})}<figcaption>${label}</figcaption></figure>`).join('')}</div>${button('study','К ботанической карточке',id)}`,'season-atlas');
 }
 function bloomPreview(id) {
   const plant=api.state.plants.find(item=>item.id===id);
   if(!plant)return;
   const phases=[['Бутон',.56],['Раскрытие',.83],['Цветение',1]];
   const still=!gardenDesign.motionAllowed(api.prefs);
   const frames=phases.map(([label,growth],index)=>`<figure class="bloom-preview-frame" data-bloom-step="${index}">${image({...plant,growth},{id:'bloom-frame-'+plant.id+'-'+index,growth})}<figcaption>${label}</figcaption></figure>`).join('');
   open('Как раскрывается цветок',`<div class="bloom-preview${still?' is-static':''}" id="bloom-preview-scene">${frames}</div><div class="collection-actions">${still?'':'<button class="button secondary" type="button" id="bloom-preview-replay">Повторить</button>'}<button class="button secondary" data-action="plant-detail" data-id="${plant.id}">Вернуться к растению</button></div>`,'bloom-preview',true);
   const preview=$('#bloom-preview-scene');
   $('#bloom-preview-replay')?.addEventListener('click',()=>{
     for(const frame of preview.querySelectorAll('.bloom-preview-frame'))frame.getAnimations?.().forEach(animation=>{animation.currentTime=0;animation.play();});
   });
 }
 function afterCare(id,previousMoisture) {
   const scene=$('.care-scene'),plant=api.state.plants.find(item=>item.id===id);
   if(!scene||!plant||!Number.isFinite(previousMoisture)||plant.moisture<=previousMoisture)return;
   const drawing=scene.querySelector(':scope>svg');
   const bee=scene.querySelector('.care-bee');
   if(drawing)drawing.outerHTML=image(plant,{id:'care-'+id,wet:true});
   if(bee)bee.innerHTML=art.beeArt('','complete');
   gardenDesign.wetMoistureValue(scene.closest('dialog'),previousMoisture,plant.moisture,api.prefs);
   const still=!gardenDesign.motionAllowed(api.prefs);
   scene.classList.add(still?'care-wet-still':'watering-active');
   scene.insertAdjacentHTML('beforeend',`<span class="care-result-frame">После полива · ${Math.round(plant.moisture)}% влаги</span>`);
   if(still)return;
   setTimeout(()=>{
     if(!scene.isConnected)return;
     scene.classList.remove('watering-active');
     scene.querySelector('.care-result-frame')?.remove();
     const svg=scene.querySelector(':scope>svg');
     if(svg)svg.outerHTML=image(plant,{id:'care-'+id});
   },1400);
 }
 function quiz(id){const all=knowledge.QUIZZES;const q=Array.isArray(all)?all.find(x=>x.speciesId===id)||all[0]:all?.[id]?.[0]||all?.[id];if(!q){api.toast('Для этого вида пока нет отдельного наблюдения.');return;}const answers=q.options||q.answers||[];open('Маленькое наблюдение',`<div class="study-art">${art.studyArt(id,'leaf')}</div><h3>${esc(q.question)}</h3><div class="quiz-options">${answers.map((a,i)=>`<button class="button secondary" data-feature="quiz-answer" data-id="${id}" data-value="${i}">${esc(typeof a==='string'?a:a.text)}</button>`).join('')}</div><div id="quiz-feedback" role="status"></div><p class="form-help">Здесь нет штрафов. Любой ответ — повод узнать новое.</p>`);}
 function quizAnswer(id,value){const all=knowledge.QUIZZES,q=Array.isArray(all)?all.find(x=>x.speciesId===id)||all[0]:all?.[id]?.[0]||all?.[id];const correct=q.correctIndex??q.correct??q.answer;$('#quiz-feedback').textContent=(Number(value)===Number(correct)?'Верно! ':'Давайте посмотрим внимательнее. ')+(q.explanation||'Прочитайте описание вида в ботаническом кабинете.');}
 function showReturn(before,after){if(!before?.plants?.length)return;const last=Math.max(...before.plants.map(p=>p.lastUpdated));if(Date.now()-last<10*60000)return;const matured=after.plants.filter(p=>p.growth>=1&&before.plants.find(q=>q.id===p.id)?.growth<1),earned=Math.floor(after.plants.reduce((n,p)=>n+p.earned,0)-before.plants.reduce((n,p)=>n+p.earned,0)),thirsty=after.plants.filter(game.needsWater),growth=Math.round(after.plants.reduce((sum,p)=>sum+Math.max(0,p.growth-(before.plants.find(q=>q.id===p.id)?.growth??p.growth)),0)/after.plants.length*100);open('С возвращением в сад',`<div class="guide-hero">${art.beeArt('','happy')}<p>Пока вас не было, в саду шла своя маленькая жизнь.</p></div><ul class="return-list"><li>Средний прирост растений: +${growth} п.п.</li><li>Взрослых новых растений: ${matured.length}</li><li>Накоплено монет: ${Math.max(0,earned)}</li><li>Ждут полезного полива: ${thirsty.length}</li></ul><p class="form-help">Учитываются первые 24 часа отсутствия, кроме периода отпуска.</p>${thirsty.length?`<button class="button primary" data-action="plant-detail" data-id="${thirsty[0].id}">Перейти к растению</button>`:button('greenhouse','Посмотреть сад')}`);}
 async function exportBackup(){try{await flushExperiences();api.checkpoint('Перед экспортом');const data=await backup.encodeBackup(api.payload());api.download(new Blob([JSON.stringify(data)],{type:'application/json'}),`flora-keep-${new Date().toISOString().slice(0,10)}.json`);await api.commit(({extras})=>{extras.lastExportAt=Date.now();},'Копия с проверкой целостности сохранена.');}catch(e){api.toast(e.message||'Не удалось создать копию.');}}
 async function importFile(file){if(!file)return;if(file.size>backup.MAX_BACKUP_BYTES){api.toast('Выберите копию сада до 2 МБ.');return;}try{const data=await backup.decodeBackup(await file.text(),{validateGame:game.validateState});previewImport(data);}catch(e){api.toast(e.message||'Файл повреждён. Ваш сад не изменён.');}}
 function previewImport(data) {
   const parsed = api.inspectPayload(data.payload);
   if (!parsed) return api.toast('В копии не найден исправный сад.');
   transferPending = data;
   api.setPendingImport(parsed);
   const current = api.payload();
   const comparable = backup.compareBackups(current,data.payload);
   const rows = [
     ['Растения',comparable.before.plants,comparable.after.plants],
     ['Монеты',comparable.before.coins,comparable.after.coins],
     ['Вода',comparable.before.water,comparable.after.water],
     ['Записи журнала',current.journal.length,parsed.journal.length],
     ['Флорариумы',current.extras.terrariums.saved.length,parsed.extras.terrariums.saved.length],
     ['Театральные сцены',current.extras.storyStudio.saved.length,parsed.extras.storyStudio.saved.length],
     ['Горшки ателье',current.extras.atelier.pots.length,parsed.extras.atelier.pots.length],
     ['Дата записи',stamp(comparable.before.savedAt),stamp(comparable.after.savedAt)],
   ];
   const workNames = extras => [...extras.terrariums.saved,...extras.storyStudio.saved].map(row=>row.name).join(', ') || 'Пусто';
   open('Восстановить сад?',`<div class="restore-preview"><h3>${data.metadata.plants} растений · ${data.metadata.species} видов</h3><p>${data.source==='android'?'Копия Android':'Веб-копия'} · ${data.metadata.checksum?'целостность проверена':'ранний формат копии'}</p></div>
     <table class="backup-comparison"><thead><tr><th>Раздел</th><th>Сейчас</th><th>В копии</th></tr></thead><tbody>${rows.map(([label,before,after])=>`<tr><th scope="row">${esc(label)}</th><td>${esc(before)}</td><td>${esc(after)}</td></tr>`).join('')}</tbody></table>
     <details><summary>Содержимое творческих полок</summary><p><strong>Сейчас.</strong> ${esc(workNames(current.extras))}</p><p><strong>В копии.</strong> ${esc(workNames(parsed.extras))}</p></details>
     ${data.warnings.map(w=>`<p class="form-help">${esc(w)}</p>`).join('')}
     <p>Сохраните текущий сад отдельным файлом перед заменой.</p>
     <div class="backup-actions"><button class="button secondary" data-action="emergency-export">Скачать текущий сад</button><button class="button primary" data-action="restore">Восстановить</button>${button('restore-trial','Открыть в пробном профиле')}${button('merge-preview','Добавить отдельные растения')}</div>
     <button class="text-button cancel-restore" data-action="settings">Вернуться к настройкам</button>`,'restore');
 }
 function mergePreview(){if(!transferPending)return;open('Добавить из копии',`<p>Монеты, запасы и накопленный доход не переносятся. Уже добавленные экземпляры распознаются даже после удаления, поэтому копию нельзя использовать для повторного начисления.</p><form data-feature-form="merge"><div class="batch-list">${transferPending.payload.game.plants.map(p=>`<label><input type="checkbox" name="plant" value="${p.id}"><span>${esc(species(p.speciesId).name)} · ${Math.round(p.growth*100)}% роста</span></label>`).join('')}</div><button class="button primary">Добавить выбранные</button></form>`);}
 function prepareBackupSelection(form) {
   const payload=api.payload();
   const fields=new FormData(form);
   const extras={...payload.extras};
   if(!fields.has('images'))extras.storyImages=[];
   if(!fields.has('history'))extras.history={};
   if(!fields.has('workshops')){
     extras.terrariums=terrarium.defaultTerrariumState();
     extras.storyStudio=storyStudio.defaultStoryStudioState();
     extras.atelier=atelier.defaultAtelierState();
     extras.giftDraft=gift.defaultGiftDraft();
   }
   return {...payload,extras,journal:fields.has('journal')?payload.journal:[]};
 }
 function refreshBackupSize(form) {
   const output=form.querySelector('output'), submit=form.querySelector('button[type="submit"]');
   try {
     const bytes=backup.estimateBackupBytes(prepareBackupSelection(form));
     output.textContent=`${Math.ceil(bytes/1024)} КБ из ${backup.MAX_BACKUP_BYTES/1024} КБ`;
     submit.disabled=bytes>backup.MAX_BACKUP_BYTES;
   } catch(error){
     output.textContent=error.message;
     submit.disabled=true;
   }
 }
 function backupOptions(){
   const sections=[['images','Авторские изображения'],['history','Наблюдения роста'],['workshops','Творческие проекты и черновики'],['journal','Журнал действий']];
   open('Размер и состав копии',`<form data-feature-form="backup-selection"><p>Состояние сада, запасы и настройки входят в копию.</p><fieldset><legend>Вложения</legend>${sections.map(([key,label])=>`<label class="check-field"><input type="checkbox" name="${key}" checked> ${label}</label>`).join('')}</fieldset><p><output aria-live="polite"></output></p><button type="submit" class="button primary">Скачать выбранное</button></form>`,'backup-options');
   refreshBackupSize($('[data-feature-form="backup-selection"]'));
 }
 function backupCenter(){const snapshots=api.checkpoints();open('Ваш сад сохранён',`<p class="dialog-intro">Последняя запись: ${api.extras.lastSavedAt?stamp(api.extras.lastSavedAt):'после первого действия'}. Последняя выгрузка: ${api.extras.lastExportAt?stamp(api.extras.lastExportAt):'ещё не было'}.</p><div class="backup-actions"><button class="button primary" data-action="export">Скачать JSON-копию</button>${button('backup-options','Размер и состав копии')}<button class="button secondary" data-feature="import-open">Открыть веб- или Android-копию</button></div><input id="feature-import-file" type="file" accept=".json,application/json" hidden><div class="collection-actions">${button('checkpoint','Создать точку восстановления')}${button('transfer','Как перенести сад')}${button('export-settings','Скачать только настройки')}${button('import-settings','Загрузить настройки')}</div><input id="settings-import-file" type="file" accept=".json,application/json" hidden><h3>Точки восстановления</h3><div class="snapshot-list">${snapshots.map(s=>`<article><span><strong>${esc(s.label||'Автоматическая копия')}</strong><small>${stamp(s.at)} · ${s.payload.game.plants.length} растений</small></span>${button('snapshot-review','Посмотреть',s.id)}</article>`).join('')||'<p>Создайте первую точку или выполните игровое действие.</p>'}</div><p class="form-help">Хранятся до шести локальных точек. Они тоже удаляются при очистке данных браузера, поэтому JSON-файл храните отдельно. Переносимый HTML содержит приложение, а не ваш прогресс.</p>`);}
 function transfer(){open('Сад на другом устройстве',`<ol class="transfer-steps"><li><strong>Сохраните копию сада</strong><p>Нажмите «Скачать JSON-копию». Не закрывайте исходный сад до проверки переноса.</p><button class="button secondary" data-action="export">Скачать JSON-копию</button></li><li><strong>Передайте приложение и копию</strong><p>Перенесите самостоятельный index.html и JSON через файл, флешку или обычный способ обмена. Приложение ничего не отправляет автоматически.</p></li><li><strong>Откройте на другом устройстве</strong><p>В настройках выберите восстановление, сравните число растений и подтвердите замену.</p></li><li><strong>Проверьте результат</strong><p>Откройте сад и гербарий, затем перезагрузите страницу. Если браузер не сохраняет локальные файлы, держите свежую JSON-копию.</p></li></ol><p class="form-help">Это перенос файлами без сервера. Автоматической облачной синхронизации нет.</p>`);}
 function profiles() {
   const rows = api.listProfiles(true);
   const profileRow = row => {
     const status = row.removed?' · в корзине':row.id===api.profileId?' · открыт':row.creative?' · творческий':row.demo?' · учебный':'';
     const controls = row.removed ? button('profile-recover','Вернуть',row.id)
       : (row.id!==api.profileId?button('profile-switch','Открыть',row.id):'') + (row.id!=='main'?button('profile-name','Переименовать',row.id):'')
         + (row.id!=='main'&&row.id!==api.profileId?button('profile-trash','В корзину',row.id):'');
     return `<article><span>${esc(row.name+status)}</span><div class="collection-actions">${controls}</div></article>`;
   };
   open('Мои отдельные сады',`<div class="profile-list">${rows.map(profileRow).join('')}</div><form data-feature-form="profile-create">${input('name','Название нового сада','','text',40)}<button class="button primary">Создать пустой сад</button></form><div class="collection-actions">${button('demo','Открыть демонстрационный сад')}${button('profile-archive-export','Скачать все профили')}${button('profile-archive-import','Открыть архив профилей')}</div><input id="profile-archive-file" type="file" accept=".json,application/json" hidden>`);
 }
 function settingsExport(){const data={format:'FloraKeepSettings',version:1,prefs:api.prefs,settings:api.extras.settings};api.download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'flora-settings.json');api.toast('Настройки сохранены отдельно от растений.');}
 async function settingsImport(file){if(!file)return;try{if(file.size>20000)throw new Error('Слишком большой файл настроек.');const data=JSON.parse(await file.text());if(data.format!=='FloraKeepSettings'||data.version!==1)throw new Error('Это не файл настроек Flora Keep.');const settings=normalizeExtras({settings:data.settings},game.CATALOG).settings;await api.commit(({extras,prefs})=>{extras.settings=settings;for(const key of ['sounds','music','calm'])if(typeof data.prefs?.[key]==='boolean')prefs[key]=data.prefs[key];if(typeof data.prefs?.calm==='boolean')extras.delights.motion=prefs.calm?'still':extras.delights.motion==='still'?'smooth':extras.delights.motion;if(['clay','sage','cream'].includes(data.prefs?.pot))prefs.pot=data.prefs.pot;},'Настройки применены. Растения и запасы сохранены.');api.music();backupCenter();}catch(e){api.toast(e.message||'Не удалось прочитать настройки.');}}
 function classroom(){const current=room||readRoom();if(current)room=current;open('Общий сад · обмен файлами',`<p class="dialog-intro">Без сервера и публичных профилей. Передавайте зашифрованный файл участникам и объединяйте их изменения у себя.</p>${room?`<h3>${esc(room.name)}</h3><p>${room.plants.length} растений · создатель: ${esc(room.ownerName)}</p><div class="greenhouse-scene">${art.greenhouseArt(room.plants.map(x=>x.plant),{...resolvedAtmosphere(api.extras.settings),appearance:Object.fromEntries(room.plants.map(x=>[x.plant.id,x.plant.appearance||{}])),columns:3})}</div><form data-feature-form="room-add">${input('contributor','Ваше имя или псевдоним','','text',40)}<div class="batch-list">${api.state.plants.map(p=>`<label><input type="checkbox" name="plant" value="${p.id}"><span>${esc(name(p))}</span></label>`).join('')}</div><button class="button secondary">Добавить выбранные в общий файл</button></form><div class="room-members">${room.plants.map(x=>`<div><span>${esc(species(x.plant.speciesId)?.name||x.plant.speciesId)} · ${esc(x.contributor)}</span>${button('room-remove','Убрать',x.key)}</div>`).join('')}</div>${classroomTools.tools(room)}<form data-feature-form="room-export">${input('password','Пароль файла (от 10 символов)',roomPassword,'password',128)}<button class="button primary">Скачать защищённый файл</button></form>`:`<form data-feature-form="room-create">${input('name','Название общего сада','','text',60)}${input('ownerName','Имя или псевдоним создателя','','text',40)}<button class="button primary">Создать общий сад</button></form>`}<hr><form data-feature-form="room-import"><label class="field"><span>Файл от другого участника</span><input name="file" type="file" accept=".json,application/json" required></label>${input('password','Пароль полученного файла','','password',128)}<button class="button secondary">Проверить и открыть</button></form><p class="form-help">Доступ даёт файл и пароль. Любой получивший их участник может редактировать копию; ролей администратора и автоматической синхронизации здесь нет. Монеты и личные заметки не передаются. Пароль в приложении не сохраняется.</p>`,'classroom');}
 function readRoom(){try{return exchange.validateClassroom(JSON.parse(localStorage.getItem(api.storageKey+'-classroom')));}catch{return null;}}
 function saveRoom(value){room=value;try{localStorage.setItem(api.storageKey+'-classroom',JSON.stringify(value));}catch{api.toast('Общий сад пока только в памяти. Скачайте защищённый файл.');}}
 function studio(id=null) {
   if (id) studioOptions.target = id;
   const plant = api.state.plants.find(item=>item.id===studioOptions.target);
   if (!plant && !['garden','selection'].includes(studioOptions.target)) studioOptions.target='garden';
   const history = plant ? api.extras.history[plant.id] || [] : [];
   const timeOptions = history.map(row=>[String(row.at),stamp(row.at)]);
   const checked = key => studioOptions[key] ? ' checked' : '';
   const optionsForPrint = Object.entries(media.POSTCARD_FORMATS).map(([key,format])=>[key,`${format.label} · ${format.width} × ${format.height}`]);
   const ranges = [['zoom','Масштаб',80,180,100],['x','Сдвиг по горизонтали',-35,35,0],['y','Сдвиг по вертикали',-35,35,0]];
   const photoDates = history.length && studioOptions.before ? `<div class="form-grid">${select('start','Первый кадр',timeOptions,studioOptions.start||timeOptions[0][0])}${select('end','Второй кадр',[['','Текущее состояние'],...timeOptions],studioOptions.end||'')}</div>` : '';
   const selection = studioOptions.target==='selection' ? `<fieldset><legend>Растения в кадре</legend><div class="batch-list">${sorted().map(p=>`<label><input name="plants" type="checkbox" value="${esc(p.id)}"${studioOptions.plants?.includes(p.id)?' checked':''}> ${esc(name(p))}</label>`).join('')}</div></fieldset>` : '';
   open('Фотостудия маленьких чудес',`<form data-feature-form="studio"><div class="form-grid">${select('target','Что снимаем?',[['garden','Вся оранжерея'],['selection','Выбранные растения'],...sorted().map(p=>[p.id,name(p)])],studioOptions.target)}${select('format','Формат',optionsForPrint,studioOptions.format)}</div>
     ${selection}${input('caption','Подпись или пожелание',studioOptions.caption,'text',160)}
     <div class="check-row"><label><input name="showName" type="checkbox"${checked('showName')}> Название сада</label><label><input name="showDate" type="checkbox"${checked('showDate')}> Дата</label><label><input name="before" type="checkbox"${checked('before')}> Было — стало</label></div>
     ${photoDates}${media.photoDesignFields(studioOptions,history,stamp)}<div class="form-grid">${ranges.map(([key,label,min,max,base])=>`<label class="field"><span>${label}</span><input name="${key}" type="range" min="${min}" max="${max}" value="${studioOptions[key]??base}"></label>`).join('')}</div>
     <button class="button secondary">Обновить предпросмотр</button></form>
     <div class="studio-preview" id="studio-preview">${previewSVG()}</div><p class="form-help" id="studio-size">${sizeLabel()}</p>
     <div class="studio-actions">${button('studio-png','Сохранить PNG','','primary')}${button('studio-gif','Живая GIF')}${history.length>1?button('studio-timelapse','Таймлапс роста'):''}${history.length>=4?button('studio-growth-strip','Альбомная полоса'):''}${api.state.plants.length?button('studio-contact-sheet','Контактный лист'):''}${plant?button('studio-sticker','Прозрачный стикер'):''}${button('studio-share','Поделиться файлом')}${button('print-herbarium','Гербарий для печати')}</div>
     <div class="studio-progress" hidden><progress max="1" value="0" aria-label="Подготовка GIF"></progress> ${button('studio-cancel','Отменить')}</div>`,'studio');
 }
 function sizeLabel(){const f=media.POSTCARD_FORMATS[studioOptions.format];return `${f.width} × ${f.height} px · PNG${studioOptions.before?' · сравнение по сохранённым наблюдениям':''}`;}
 function studioData() {
   const plant=api.state.plants.find(item=>item.id===studioOptions.target);
   const rows=api.extras.history[plant?.id] || [];
   const first=studioOptions.before && (rows.find(row=>String(row.at)===studioOptions.start) || rows[0]);
   const last=studioOptions.before && rows.find(row=>String(row.at)===studioOptions.end);
   const frame=svg=>media.frameArtwork(svg,studioOptions);
   const plants=studioOptions.target==='selection' ? sorted().filter(item=>studioOptions.plants?.includes(item.id)) : sorted();
   const options={...resolvedAtmosphere(api.extras.settings),appearance:decoratedAppearance(),columns:3};
   const artwork=plant ? image(last?{...plant,...last}:plant,{id:'studio-active-'+plant.id}) : art.greenhouseArt(plants,options);
   return {
     artwork:frame(artwork),
     title:studioOptions.showName?api.extras.gardenName:plant?name(plant):'Маленькие чудеса',
     subtitle:'flora keep',caption:studioOptions.caption,
     dateLabel:studioOptions.showDate?dateLabel(Date.now()):'',format:studioOptions.format,
     beforeArtwork:first&&plant?frame(image({...plant,...first},{id:'studio-before-'+plant.id})):null,
     beforeLabel:first?stamp(first.at):'Раньше',afterLabel:last?stamp(last.at):'Сегодня',
     ...media.normalizePhotoDesign(studioOptions),
   };
 }
 function previewSVG(){try{return media.postcardSVG({...studioData(),preview:true});}catch{return '<p>Посадите растение, чтобы сделать открытку.</p>';}}
 async function exportStudioSheet(kind) {
   const plant=api.state.plants.find(item=>item.id===studioOptions.target);
   const form=$('form[data-feature-form="studio"]');
   const selectedPhotos=form?media.readPhotoDesign(new FormData(form)):studioOptions;
   const fixed={...studioOptions,fixedFrame:true};
   let entries;
   if(kind==='strip'){
     if(!plant)return api.toast('Выберите растение с четырьмя наблюдениями.');
     const samples=media.photoGrowthSamples(api.extras.history[plant.id]||[],selectedPhotos.historyDates);
     if(samples.length<4)return api.toast('Для альбомной полосы нужны четыре наблюдения.');
     entries=samples.map((sample,index)=>({
       artwork:media.frameArtwork(image({...plant,...sample},{id:'photo-strip-'+plant.id+'-'+index}),fixed),
       label:stamp(sample.at),
     }));
   }else{
     const choices=studioOptions.target==='selection'
       ? sorted().filter(item=>studioOptions.plants?.includes(item.id))
       : sorted();
     entries=choices.slice(0,12).map(item=>({
       artwork:media.frameArtwork(image(item,{id:'photo-grid-'+item.id}),fixed),
       label:name(item)+' · '+dateLabel(Date.now()),
     }));
     if(!entries.length)return api.toast('Выберите растения для контактного листа.');
   }
   const title=kind==='strip'?name(plant)+' · рост':api.extras.gardenName;
   const svg=media.photoSheetSVG(entries,{kind,title});
   const blob=await media.rasterizeSVG(svg);
   api.download(blob,kind==='strip'?'flora-keep-growth-strip.png':'flora-keep-contact-sheet.png');
 }
 async function studioPNG(share=false){try{const data=studioData();if(studioOptions.before&&!data.beforeArtwork){api.toast('Для сравнения выберите одно растение с записью истории.');return;}studioBlob=await media.renderPostcard(data);if(share){const file=new File([studioBlob],'flora-keep.png',{type:'image/png'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:api.extras.gardenName});return;}api.toast('Передача файлов в этом браузере недоступна. Сохраняю PNG.');}api.download(studioBlob,'flora-keep-postcard.png');api.toast('Открытка сохранена.');}catch(e){if(e.name!=='AbortError')api.toast(e.message||'Не удалось сохранить изображение.');}}
 async function studioGIF(historyOnly=false) {
   if (studioJob) return;
   const progressRow = $('.studio-progress');
   const progress = progressRow?.querySelector('progress');
   const controller = new AbortController();
   studioJob = controller;
   if (progressRow) progressRow.hidden=false;
   try {
     const data = studioData();
     const plant = api.state.plants.find(item=>item.id===studioOptions.target);
     const rows = api.extras.history[plant?.id] || [];
     const exportFrame = artwork => media.postcardSVG({...data,beforeArtwork:null,artwork,width:400,height:400,format:'square'});
     let frames;
     if (historyOnly) {
       if (rows.length<2) throw new Error('Для таймлапса нужны хотя бы два наблюдения.');
       const count = Math.min(rows.length,12);
       frames = Array.from({length:count},(_,index)=>{
         const sample=rows[Math.round(index*(rows.length-1)/(count-1))];
         return exportFrame(media.frameArtwork(image({...plant,...sample},{id:'timelapse-'+plant.id+'-'+sample.at}),{...studioOptions,fixedFrame:true}));
       });
     } else {
       frames = Array.from({length:8},(_,index)=>{
         const phase=index/8*Math.PI*2;
         return exportFrame(media.frameArtwork(data.artwork,{zoom:104,x:Math.sin(phase),y:Math.cos(phase)}));
       });
     }
     const blob = await media.createAnimatedPostcard({frames,width:400,height:400,delay:historyOnly?26:12,signal:controller.signal,onProgress:value=>{if(progress)progress.value=value;}});
     api.download(blob,historyOnly?'flora-growth-timelapse.gif':'flora-keep-alive.gif');
     api.toast('GIF сохранён.');
   } catch(error) {
     if (error.name!=='AbortError') api.toast(error.message);
   } finally {
     studioJob = null;
     if (progressRow?.isConnected) progressRow.hidden=true;
     if (progress) progress.value=0;
   }
 }
 function printHerbarium() {
   const known=game.CATALOG.filter(item=>api.state.discovered.includes(item.id));
   const cards=known.map(plant=>`<article class="print-plant">${art.plantArt(plant.id,{id:'print-'+plant.id})}<h2>${esc(plant.name)}</h2><i>${esc(plant.latinName)}</i><p>${esc(plant.fact)}</p></article>`).join('');
   const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Гербарий Flora Keep</title>
     <style>@page{size:A4;margin:14mm}body{font:13px/1.5 Georgia;color:#294731}header{text-align:center}
     .print-logo svg{width:47px;height:47px}.print-lace svg{display:block;width:min(250px,80%);height:32px;margin:0 auto 8mm}
     .grid{display:grid;grid-template-columns:1fr 1fr;gap:9mm}article{break-inside:avoid;border:1px solid #c8d4bc;padding:5mm;text-align:center}
     .print-plant>svg{width:100%;height:48mm}h2{font-size:18px;margin:3mm 0}p{margin:2mm}button{padding:12px;margin:14px}
     @media print{button{display:none}body{color:#1d211e}.print-lace,.print-logo{color:#292d28}}
     </style>
     <header><span class="print-logo">${art.brandMark()}</span><h1>${esc(api.extras.gardenName)} · гербарий</h1>
     <p>Flora Keep · школа № 1430</p><span class="print-lace">${art.botanicalOrnament()}</span>
     <button type="button" onclick="window.print()">Распечатать на A4</button></header>
     <div class="grid">${cards||'<p>Откройте первый вид в своём саду.</p>'}</div></html>`;
   api.download(new Blob([html],{type:'text/html;charset=utf-8'}),'flora-herbarium-A4.html');
   api.toast('Печатный гербарий сохранён.');
 }
 function notifications(){open('Подсказки, которые остаются',`<div class="notification-history">${api.extras.notifications.map(n=>`<article><time>${stamp(n.at)}</time><p>${esc(n.text)}</p></article>`).join('')||'<p>Важные сообщения появятся здесь после действий в саду.</p>'}</div>${button('accessibility','Изменить длительность сообщений')}`);}
 function diagnostics(){open('Flora Keep · '+APP_VERSION,`<dl class="diagnostics"><dt>Запуск</dt><dd>${location.protocol==='file:'?'Из HTML-файла':'Веб-адрес'}</dd><dt>Устройство</dt><dd>${innerWidth} × ${innerHeight}, масштаб ${api.extras.settings.textScale}%</dd><dt>Хранение</dt><dd>${api.saveProblem?'Недоступно или повреждено; сохраняйте JSON':'Последняя запись '+(api.extras.lastSavedAt?stamp(api.extras.lastSavedAt):'пока не создана')}</dd><dt>Сеть</dt><dd>Не используется для игры и обмена файлами</dd><dt>Версия</dt><dd>${APP_VERSION}</dd><dt>Сборка</dt><dd>${esc(globalThis.__FLORA_BUILD_INFO__?.id||'локальная')}${globalThis.__FLORA_BUILD_INFO__?.sourceUrl?` · <a href="${esc(globalThis.__FLORA_BUILD_INFO__.sourceUrl)}" target="_blank" rel="noopener noreferrer">Исходная ревизия</a>`:''}</dd></dl>${button('diagnostic-export','Скачать технический отчёт')}<p class="form-help">В отчёт не входят растения, названия сада, личные заметки, пароли и содержимое резервных копий.</p>${button('story','История проекта')}`);}
 function story(){open('Из тетради — в живой сад',`<div class="story-timeline"><article><span>01 · Идея</span><h3>Росток, забота и Жужа</h3><p>Проект учениц 8-И класса школы № 1430 начался с бумажного замысла сада. Оригиналы эскизов не включены в эту сборку.</p><div class="story-reconstruction">${art.plantArt('daisy',{growth:.08,pot:'cream'})}${art.beeArt()}</div><small>Иллюстрация по мотивам идеи. Это реконструкция, не фотография оригинала.</small></article><article><span>02 · Android</span><h3>Идея становится игрой</h3><p>Появились восемь видов растений, уход, исследования, оранжерея и резервные копии.</p></article><article><span>03 · Веб</span><h3>Сад в одном HTML-файле</h3><p>Теперь растение можно вырастить в браузере без сервера. Новые возможности сохраняют авторство и спокойный ритм проекта.</p></article></div><h3>Авторские эскизы</h3><p class="form-help">Добавьте предоставленные авторами PNG или JPEG. Они сохраняются только в вашем саду и его резервной копии.</p><input id="story-images" type="file" accept="image/png,image/jpeg" multiple><div class="story-images">${(api.extras.storyImages||[]).map((x,index)=>`<figure><img src="${x.data}" alt="${esc(x.name)}"><figcaption>${esc([x.name,x.author,x.date].filter(Boolean).join(' · '))}${button('story-sketch-credit','Указать авторство и дату',String(index))}</figcaption></figure>`).join('')}</div>`);}
 async function handle(action,id,value,el){
 if(action.startsWith('room-plus-'))return classroomTools.handle(action,id);
 if(action==='catalog-clear-filter')return clearCatalogFilter(id);
 if(action==='season-atlas')return seasonalAtlas(id);
 if(action==='bloom-preview')return bloomPreview(id);
 if(action==='studio-growth-strip')return exportStudioSheet('strip');
 if(action==='studio-contact-sheet')return exportStudioSheet('contact');
 if(action==='story-sketch-credit'){
   const item=api.extras.storyImages[Number(id)];
   if(item)open('Подпись к оригинальному эскизу',`<form data-feature-form="story-credit" data-id="${esc(id)}">${input('author','Автор',item.author||'','text',80)}${input('date','Дата',item.date||'','date')}<button class="button primary">Сохранить подпись</button></form>`,'sketch-credit');
   return;
 }
 if(action==='atelier')experience('atelier').open();else if(action==='playground')experience('playground').open(id||'snail');else if(action==='scene-studio'){experience('storyStudio').open('scene');await rememberWorkshop('scene-studio');}else if(action==='garden-comic')experience('storyStudio').open('comic');else if(action==='atlas')experience('delights').open('atlas',id);else if(action==='growth-book')experience('delights').open('book',id);else if(action==='seed-packets')experience('delights').open('seeds');else if(action==='personal-design')experience('delights').open('design');else if(action==='terrariums'){experience('terrarium').open();await rememberWorkshop('terrarium');}else if(action==='flight')experience('flight').open();else if(action==='living-gift')experience('gift').open(id||undefined);else if(action==='worlds')worlds();else if(action==='hub')hub();else if(action==='workshop')workshop();else if(action==='accessibility')accessibility();else if(action==='identity')identity();else if(action==='edit-plant')editPlant(id);else if(action==='greenhouse')greenhouse();
 else if(action==='move-left'||action==='move-right'){const i=sorted().findIndex(p=>p.id===id);await reorder(id,i+(action==='move-left'?-1:1));}
 else if(action==='save-layout')open('Запомнить композицию',`<form data-feature-form="layout">${input('name','Название композиции','','text',40)}<button class="button primary">Сохранить</button></form>`);
 else if(action==='layouts')open('Мои композиции',`<div class="profile-list">${api.extras.layouts.map((l,i)=>`<article><span>${esc(l.name)}</span>${button('load-layout','Применить',String(i))}</article>`).join('')||'<p>Сохраните оформление и порядок растений в оранжерее.</p>'}</div>`);
 else if(action==='load-layout'){const l=api.extras.layouts[Number(id)];if(l){await api.commit(({extras})=>{extras.order=l.order.slice();extras.settings={...extras.settings,...l.settings};for(const [plantId,a]of Object.entries(l.appearance)){extras.appearance[plantId]={...extras.appearance[plantId],...Object.fromEntries(['pot','shape','material','potId'].filter(k=>typeof a[k]==='string').map(k=>[k,a[k]]))};}},'Композиция восстановлена.');greenhouse();}}
 else if(action==='batch')batch();else if(action==='batch-apply'){await api.runGame(s=>game.waterSelected(s,[...chosen],Date.now()),'water','water');close();}
 else if(action==='wish'){await api.commit(({extras})=>{extras.wishes=extras.wishes.includes(id)?extras.wishes.filter(x=>x!==id):[...extras.wishes,id];});if(api.dialogKind==='feature')compareView();}
 else if(action==='compare-toggle'){compare=compare.includes(id)?compare.filter(x=>x!==id):compare.length<3?[...compare,id]:compare;if(compare.length===3&&!compare.includes(id))api.toast('Можно сравнить до трёх видов.');api.render();}
 else if(action==='compare')compareView();else if(action==='goal')goal();else if(action==='plans')plans();else if(action==='claim'){await api.runGame(s=>game.claimTask(s,id,Date.now()),'coin','coins');plans();}
 else if(action==='care-profile')careProfile();else if(action==='vacation')vacation();else if(action==='vacation-end'){await api.runGame(s=>game.setVacation(s,0,Date.now()));close();}
 else if(action==='propagate'||action==='repot'||action==='recover'){await api.runGame(s=>game[action](s,id,Date.now()),action==='recover'?'water':action==='repot'?'leaf':'garden',action==='recover'?'water':'plant');api.showPlant(id,false);}
 else if(action==='history')history(id);else if(action==='calendar')calendar();else if(action==='weekly')weekly();else if(action==='weekly-photo'){const summary=weeklySummary();studioOptions={...studioOptions,target:'garden',format:'wide',caption:`За неделю: новых растений ${summary.added}, полито ${summary.watered}${summary.growth===null?'':', средний прирост '+summary.growth+' п.п.'}`};studio();}
 else if(action==='pin'){await api.commit(({extras})=>{extras.pinned=extras.pinned.includes(id)?extras.pinned.filter(x=>x!==id):[...extras.pinned,id].slice(-60);});}
 else if(action==='journal-html')journalExport('html');else if(action==='journal-csv')journalExport('csv');else if(action==='guide')guide();else if(action==='glossary')glossary();else if(action==='picker')picker();else if(action==='ask-bee')askBee(id);else if(action==='tutorial')startTutorial();else if(action==='tutorial-end'){await api.commit(({extras})=>{extras.tutorial=4;},'Подсказки завершены. Их можно включить снова в помощи.');document.querySelector('.tutorial-ribbon')?.remove();}
 else if(action==='first-evening')firstEvening();else if(['study','study-leaf','study-roots','study-profile','study-macro'].includes(action))study(id,['study','study-leaf'].includes(action)?'leaf':action.slice(6));else if(action==='quiz')quiz(id);else if(action==='quiz-answer')quizAnswer(id,value);
 else if(action==='backup-center')backupCenter();else if(action==='import-open')$('#feature-import-file')?.click();else if(action==='merge-preview')mergePreview();
 else if(action==='restore-trial'&&transferPending)await api.openTrialProfile(transferPending.payload);
 else if(action==='profile-name'){const row=api.listProfiles(true).find(profile=>profile.id===id);if(row)open('Название профиля',`<form data-feature-form="profile-rename" data-id="${esc(id)}">${input('name','Название',row.name,'text',60)}<button class="button primary">Сохранить</button></form>`);}
 else if(action==='profile-trash'||action==='profile-recover'){if(api.updateProfile(id,{removed:action==='profile-trash'}))profiles();}
 else if(action==='profile-archive-export')await api.exportProfiles();
 else if(action==='profile-archive-import')$('#profile-archive-file')?.click();
 else if(action==='backup-options')backupOptions();else if(action==='checkpoint'){api.checkpoint('Сохранено вручную',true);backupCenter();}
 else if(action==='snapshot-review'){const snapshot=api.checkpoints().find(x=>x.id===id);if(snapshot)previewImport({payload:snapshot.payload,source:'web',warnings:['Это локальная точка восстановления.'],metadata:{plants:snapshot.payload.game.plants.length,species:snapshot.payload.game.discovered.length,coins:snapshot.payload.game.coins,water:snapshot.payload.game.water,createdAt:snapshot.at,checksum:false}});}
 else if(action==='transfer')transfer();else if(action==='profiles')profiles();else if(action==='profile-switch')api.switchProfile(id);else if(action==='demo')api.createProfile('Демонстрационный сад',true);else if(action==='exit-demo')api.switchProfile('main');else if(action==='export-settings')settingsExport();else if(action==='import-settings')$('#settings-import-file')?.click();
 else if(action==='remind-later')await api.commit(({extras})=>{extras.lastReminderAt=Date.now();});
 else if(action==='classroom')classroom();else if(action==='room-remove')return classroomTools.handle('room-plus-remove',id);
 else if(action==='studio')studio(id||null);else if(action==='before-after'){studioOptions.target=id;studioOptions.before=true;studio();}else if(action==='studio-png')await studioPNG();else if(action==='studio-share')await studioPNG(true);else if(action==='studio-gif')await studioGIF();
 else if(action==='studio-timelapse')await studioGIF(true);
 else if(action==='studio-cancel')studioJob?.abort();
 else if(action==='studio-sticker'){const plant=api.state.plants.find(item=>item.id===studioOptions.target);if(plant){const svg=image(plant);const blob=await media.rasterizeSVG(svg,{width:800,height:900});api.download(blob,'flora-sticker.png');}}else if(action==='print-herbarium')printHerbarium();
 else if(action==='notifications')notifications();else if(action==='diagnostics')diagnostics();else if(action==='story')story();
 else if(action==='diagnostic-export'){const data={app:'FloraKeep',version:APP_VERSION,createdAt:new Date().toISOString(),protocol:location.protocol,viewport:{width:innerWidth,height:innerHeight,scale:devicePixelRatio},capabilities:{localStorage:!api.saveProblem,locks:!!navigator.locks,serviceWorker:'serviceWorker'in navigator,crypto:!!globalThis.crypto?.subtle,share:!!navigator.share,dialog:typeof HTMLDialogElement!=='undefined',reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches},errors:api.errors.slice(-15)};api.download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'flora-diagnostics.json');api.toast('Технический отчёт сохранён без содержимого сада.');}
 else if(action==='update-app'){await flushExperiences();if(!api.save()){api.toast('Сначала скачайте JSON-копию: текущий сад не удалось записать. Обновление пока не применено.');return;}const reg=await navigator.serviceWorker.getRegistration();if(reg?.waiting){api.markUpdateRequested();reg.waiting.postMessage({type:'SKIP_WAITING'});}else api.toast('Новая версия пока не готова.');}
 }
 async function submit(form){const f=new FormData(form),kind=form.dataset.featureForm,id=form.dataset.id;const get=k=>String(f.get(k)||'').trim();
 if(kind.startsWith('room-plus-'))return classroomTools.submit(kind,f);
 if(kind==='story-credit'){
   const index=Number(id),author=get('author'),date=get('date');
   await api.commit(({extras})=>{if(extras.storyImages[index])extras.storyImages[index]={...extras.storyImages[index],author,date};});
   return story();
 }
 if(kind==='workshop'){await api.commit(({extras})=>{extras.settings=workshopSettings(f,extras.settings);},'Оформление сада сохранено.');workshop();}
 else if(kind==='accessibility'){await api.commit(({extras})=>{extras.settings.textScale=Number(get('textScale'));extras.settings.notificationSeconds=Number(get('notificationSeconds'));for(const k of ['contrast','shortcuts','backupReminders'])extras.settings[k]=f.has(k);},'Настройки удобства сохранены.');accessibility();}
 else if(kind==='identity'){await api.commit(({extras})=>{extras.gardenName=get('gardenName')||'Мой маленький сад';extras.description=get('description');},'Имя сада сохранено.');close();}
 else if(kind==='plant-meta'){await api.commit(({extras})=>{extras.appearance[id]={name:get('name'),note:get('note'),group:get('group'),pot:get('pot'),shape:get('shape'),material:get('material'),potId:get('potId')};if(get('group'))extras.groups=unique([...extras.groups,get('group')]);},'Растение оформлено.');api.showPlant(id,false);}
 else if(kind==='goal'){await api.commit(({extras})=>{extras.goal=get('goal')||null;},'Цель сохранена.');close();}
 else if(kind==='care-profile'){await api.runGame(s=>game.setCareProfile(s,get('profile'),Date.now()));close();}
 else if(kind==='vacation'){await api.runGame(s=>game.setVacation(s,Number(get('hours')),Date.now()));close();}
 else if(kind==='layout'){if(!get('name')){api.toast('Введите имя композиции.');return;}await api.commit(({extras})=>{extras.layouts=[...extras.layouts,{name:get('name'),order:sorted().map(p=>p.id),settings:{...extras.settings},appearance:Object.fromEntries(Object.entries(extras.appearance).map(([id,a])=>[id,Object.fromEntries(['pot','shape','material','potId'].filter(k=>typeof a[k]==='string').map(k=>[k,a[k]]))]))}].slice(-8);},'Композиция сохранена.');greenhouse();}
 else if(kind==='backup-selection'){
   await flushExperiences();
   const selected=prepareBackupSelection(form);
   const checked=await backup.encodeBackup(selected);
   api.download(new Blob([JSON.stringify(checked)],{type:'application/json'}),'flora-keep-selected.json');
   await api.commit(({extras})=>{extras.lastExportAt=Date.now();},'Копия сохранена.');
 }
 else if(kind==='profile-rename'){const name=get('name').trim().slice(0,60);if(!name)throw new Error('Введите название профиля.');if(api.updateProfile(id,{name}))profiles();}
 else if(kind==='profile-create'){if(!get('name')){api.toast('Введите имя сада.');return;}api.createProfile(get('name'),false);}
 else if(kind==='merge'&&transferPending){const ids=f.getAll('plant');await api.commit(({state,extras})=>{const result=backup.mergePlants(state,transferPending.payload.game,ids,{validateGame:game.validateState});for(const id of result.added){const a=transferPending.payload.extras?.appearance?.[id],h=transferPending.payload.extras?.history?.[id];if(a)extras.appearance[id]=a;if(h)extras.history[id]=h;}api.toast(result.message);return {state:result.state};});close();}
 else if(kind==='studio'){
   const target=get('target');
   studioOptions={...studioOptions,...media.readPhotoDesign(f),target,format:Object.hasOwn(media.POSTCARD_FORMATS,get('format'))?get('format'):'portrait',caption:get('caption'),showName:f.has('showName'),showDate:f.has('showDate'),before:f.has('before'),plants:target==='selection'?f.getAll('plants').slice(0,12):[],start:get('start'),end:get('end'),zoom:Number(get('zoom')),x:Number(get('x')),y:Number(get('y'))};
   studio();
 }
 else if(kind==='room-create'){saveRoom(exchange.createClassroom(get('name'),get('ownerName')));classroom();}
 else if(kind==='room-add'&&room){const ids=f.getAll('plant');saveRoom(exchange.addClassroomPlants(room,api.state.plants.filter(p=>ids.includes(p.id)).map(p=>{const a=api.extras.appearance[p.id]||{};return {...p,name:a.name||species(p.speciesId).name,appearance:{pot:a.pot||api.prefs.pot,shape:a.shape||'classic',material:a.material||'clay'}};}),get('contributor')));classroom();}
 else if(kind==='room-export'&&room){const encoded=await exchange.encodeClassroom(room,get('password'));api.download(new Blob([JSON.stringify(encoded)],{type:'application/json'}),'flora-classroom.encrypted.json');classroomTools.recordFullExport(room);roomPassword='';form.reset();api.toast('Защищённый файл сохранён. Передайте пароль участникам отдельно.');}
 else if(kind==='room-import'){const file=f.get('file');if(!(file instanceof File)||!file.size)throw new Error('Выберите файл общего сада.');if(file.size>2*1024*1024)throw new Error('Файл общего сада должен быть не больше 2 МБ.');const classroomIncoming=await exchange.decodeClassroom(await file.text(),get('password'));return classroomTools.openImport(classroomIncoming);}
 }
 async function importStory(files){const data=[];for(const file of [...files].slice(0,3)){if(!['image/png','image/jpeg'].includes(file.type)||file.size>10*1024*1024)continue;const bitmap=await createImageBitmap(file);const scale=Math.min(1,800/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const url=canvas.toDataURL('image/jpeg',.65);if(url.length<400000)data.push({name:file.name.slice(0,80),data:url});}await api.commit(({extras})=>{extras.storyImages=[...(extras.storyImages||[]),...data].slice(-3);},data.length?'Эскизы добавлены с подписью происхождения.':'Выберите PNG или JPEG до 10 МБ.');story();}
 document.addEventListener('click',e=>{const el=e.target.closest('[data-feature]');if(!el||el.disabled)return;e.preventDefault();Promise.resolve(handle(el.dataset.feature,el.dataset.id,el.dataset.value,el)).catch(error=>api.toast(error.message||'Не получилось выполнить действие.'));});
 document.addEventListener('submit',e=>{const form=e.target.closest('[data-feature-form]');if(!form)return;e.preventDefault();submit(form).catch(error=>api.toast(error.message||'Не удалось сохранить изменения.'));});
 document.addEventListener('input',e=>{
 if(e.target.name==='catalog-price')catPrice=e.target.value;
 if(e.target.name==='catalog-hours')catHours=e.target.value;
 if(['catalog-price','catalog-hours'].includes(e.target.name))enhanceCatalog();
 if(e.target.name==='journal-search'){journalQuery=e.target.value;document.querySelectorAll('.journal-entry').forEach((row,i)=>{row.hidden=!journalMatch(api.journal[i]);});}
 });
 document.addEventListener('change',e=>{
 if(e.target.form?.dataset.featureForm==='backup-selection')refreshBackupSize(e.target.form);
 if(e.target.id==='wishes-only'){wishOnly=e.target.checked;enhanceCatalog();}
 if(e.target.name==='batch-plant'){if(e.target.checked)chosen.add(e.target.value);else chosen.delete(e.target.value);$('#batch-cost').textContent=`Выбрано: ${chosen.size} · потребуется ${chosen.size} воды · в запасе ${api.state.water}`;}
 if(e.target.name==='journal-kind')journalKind=e.target.value;
 if(e.target.name==='journal-species')journalSpecies=e.target.value;
 if(e.target.name==='journal-days')journalDays=Number(e.target.value);
 if(['journal-kind','journal-species','journal-days'].includes(e.target.name))document.querySelectorAll('.journal-entry').forEach((row,i)=>{row.hidden=!journalMatch(api.journal[i]);});
 if(e.target.form?.dataset.featureForm==='workshop'){
   const preview=$('.workshop-preview');
   if(preview)preview.innerHTML=workshopArtwork(workshopSettings(new FormData(e.target.form),api.extras.settings));
 }
 if(e.target.id==='greenhouse-group')greenhouse(e.target.value);
 if(e.target.id==='feature-import-file')importFile(e.target.files[0]);
 if(e.target.id==='profile-archive-file'&&e.target.files[0])api.importProfiles(e.target.files[0]).then(count=>{profiles();api.toast('Загружено профилей: '+count);}).catch(error=>api.toast(error.message));
 if(e.target.id==='settings-import-file')settingsImport(e.target.files[0]);
 if(e.target.id==='story-images')importStory(e.target.files).catch(()=>api.toast('Не получилось прочитать изображение.'));
 });
 let touchOrder=null,dropPreview=null;
 function previewPotDrop(row,source) {
   const target=row&&row.dataset.orderId!==source?row:null;
   if(dropPreview===target)return;
   dropPreview?.classList.remove('pot-drop-target');
   dropPreview=target;
   dropPreview?.classList.add('pot-drop-target');
 }
 document.addEventListener('pointerdown',e=>{const handle=e.target.closest('.order-handle');if(!handle||e.pointerType==='mouse')return;const row=handle.closest('[data-order-id]');touchOrder={id:row.dataset.orderId,pointer:e.pointerId,target:row.dataset.orderId};handle.setPointerCapture?.(e.pointerId);e.preventDefault();});
 document.addEventListener('pointermove',e=>{if(!touchOrder||e.pointerId!==touchOrder.pointer)return;const row=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-order-id]');touchOrder.target=row?.dataset.orderId||touchOrder.id;previewPotDrop(row,touchOrder.id);});
 document.addEventListener('pointerup',e=>{if(!touchOrder||e.pointerId!==touchOrder.pointer)return;const {id,target}=touchOrder;touchOrder=null;previewPotDrop(null);if(id!==target)reorder(id,sorted().findIndex(p=>p.id===target));});
 document.addEventListener('pointercancel',()=>{touchOrder=null;previewPotDrop(null);});
 document.addEventListener('dragstart',e=>{const row=e.target.closest('[data-order-id]');if(!row)return;dragId=row.dataset.orderId;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId);});
 document.addEventListener('dragover',e=>{if(!dragId)return;const row=e.target.closest('[data-order-id]');previewPotDrop(row,dragId);if(row)e.preventDefault();});
 document.addEventListener('drop',e=>{const row=e.target.closest('[data-order-id]');if(!row||!dragId)return;e.preventDefault();const id=dragId;dragId=null;previewPotDrop(null);reorder(id,sorted().findIndex(p=>p.id===row.dataset.orderId));});
 document.addEventListener('dragend',()=>{dragId=null;previewPotDrop(null);});
 document.addEventListener('keydown',e=>{if(!api.extras.settings.shortcuts||!e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;const k=({Digit1:'1',Digit2:'2',Digit3:'3',Digit4:'4',KeyF:'f',KeyW:'w'})[e.code]||e.key.toLowerCase(),pages={'1':'garden','2':'catalog','3':'herbarium','4':'journal'};if(pages[k]){e.preventDefault();api.navigate(pages[k]);}else if(k==='f'){e.preventDefault();api.navigate('catalog');setTimeout(()=>$('#search')?.focus(),0);}else if(k==='w'&&api.state.selectedPlantId){e.preventDefault();api.showPlant(api.state.selectedPlantId);}});
 globalThis.visualViewport?.addEventListener('resize',applyAtmosphere);
 return {afterDialog:(kind,id)=>{const dialog=document.querySelector('dialog');if(dialog)delete dialog.dataset.featureSize;if(kind!=='studio')studioJob?.abort();experience('delights').afterDialog(kind,id);garden?.afterDialog(kind,id);workbench?.afterDialog(kind);},animatePlanting:(...args)=>experience('delights').animatePlanting(...args),animateCareTransition:(...args)=>experience('delights').animateCareTransition(...args),flushExperiences,disposeExperiences(){for(const experience of initialized.values())experience.dispose();},afterRender,applyAtmosphere,careExtras,enhanceCatalog,showStudy:study,showStudio:studio,showReturn,showStory:story,guide,hub,updateTutorial,onAction,exportBackup,importFile,previewImport,image,sorted,
  extendSettings(){const body=$('dialog .dialog-body');if(body&&!body.querySelector('.settings-more'))body.insertAdjacentHTML('beforeend',`<div class="settings-more"><h3>Больше возможностей</h3><div class="collection-actions">${button('workshop','Мастерская')}${button('personal-design','Цвет и движение')}${button('accessibility','Удобство')}${button('backup-center','Сохранения')}${button('profiles','Мои сады')}${button('classroom','Общий файл класса')}${button('identity','Имя сада')}</div></div>`);},
  notify(text){api.extras.notifications.unshift({at:Date.now(),text:String(text).slice(0,400)});api.extras.notifications=api.extras.notifications.slice(0,40);},
   afterCare,
  showUpdate(){if(!$('#app-update'))$('#main')?.insertAdjacentHTML('afterbegin',`<div id="app-update" class="update-banner">Готова новая версия сада. ${button('update-app','Сохранить и обновить')}</div>`);},
 };
}

return Object.freeze({ APP_VERSION, defaultExtras, normalizeExtras, recordHistory, gardenAppearance, resolvedAtmosphere, artworkGrowth, createFeatures });
})();
