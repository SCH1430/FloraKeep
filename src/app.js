const artCache = new Map();
const galleryArtLimit=10;
let galleryArtObserver;
function plantArt(speciesId, options={}) {
  const rounded={...options,growth:Math.round((options.growth??1)*100)/100};
  if(Number.isFinite(rounded.moisture))rounded.moisture=Math.round(rounded.moisture);
  const key=speciesId+JSON.stringify(rounded);
  const cached=artCache.get(key);
  if(cached){artCache.delete(key);artCache.set(key,cached);return cached;}
  if(artCache.size>=350)artCache.delete(artCache.keys().next().value);
  const svg=art.plantArt(speciesId,rounded);
  artCache.set(key,svg);
  return svg;
}
const beeArt=art.beeArt;
function gardenArt(options={}) {
  return art.gardenArt({...featureModule.resolvedAtmosphere(extras.settings),...options,appearance:featureModule.gardenAppearance(extras)});
}
let features=null,updateRequested=false,previousNavIndex=0;
const diagnosticErrors=[];
window.addEventListener('error',e=>{diagnosticErrors.push({type:'error',name:e.error?.name||'Error',line:e.lineno,column:e.colno});});
window.addEventListener('unhandledrejection',e=>{diagnosticErrors.push({type:'promise',name:e.reason?.name||'Error'});});

const isFileMode = location.protocol === 'file:';
const isStandalone = globalThis.__FLORA_STANDALONE__ === true;
const assetUrl = name => globalThis.__FLORA_ASSETS__?.[name] || (name === 'icon' ? './icon.svg' : `./assets/${name}.wav`);

const $ = (selector, parent = document) => parent.querySelector(selector);
const BASE_KEY = 'flora-keep-web-v1';
const PROFILE_INDEX = BASE_KEY+'-profiles';
let profileId='main';
try {const selected=localStorage.getItem(BASE_KEY+'-selected-profile');if(selected&&/^[a-zA-Z0-9_-]{1,80}$/.test(selected)&&!['constructor','prototype','__proto__'].includes(selected))profileId=selected;}catch{}
const KEY = profileId==='main'?BASE_KEY:BASE_KEY+'-profile-'+profileId;
const BACKUP = `${KEY}-previous`;
const profileKey = id => id === 'main' ? BASE_KEY : BASE_KEY + '-profile-' + id;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numberFormat = new Intl.NumberFormat('ru-RU');
const dateFormat = new Intl.DateTimeFormat('ru-RU', {day:'numeric',month:'long'});
const timeFormat = new Intl.DateTimeFormat('ru-RU', {hour:'2-digit',minute:'2-digit'});
const saveTimeFormat = new Intl.DateTimeFormat('ru-RU', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
const num = n => numberFormat.format(Math.floor(n));
const date = ts => dateFormat.format(ts);
const icons = {
 seed:'M6 17C2 10 9 3 19 3c1 10-5 19-12 15Zm1 0 9-10M9 15l-1-4m4 1 4-1',
 wateringcan:'M4 10h10l-1 10H5L4 10Zm1 3C0 7 0 19 5 17M14 12l6-5 2 2-8 8M8 10V7h4v3M19 14l1 2m1-3 1 2',
 leaf:'M20 4C11 2 3 6 5 14c2 8 14 7 15-10ZM5 19 16 8M9 15v-4m4 0h4',
 garden:'M4 12h16l-2 9H6l-2-9ZM12 12V5m0 4C6 9 5 5 5 3c5 0 7 2 7 6Zm0-2c0-4 3-5 7-5 0 3-2 5-7 5Z',
 grid:'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',
 book:'M12 5C8 3 4 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-2-1-6-1-10 1Zm0 0v15',
 journal:'M6 3h14v18H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM8 8h8m-8 4h8m-8 4h5',
 settings:'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 arrow:'M5 12h14m-5-5 5 5-5 5', plus:'M12 5v14M5 12h14', close:'m6 6 12 12M6 18 18 6',
 water:'M12 2C9 7 5 10 5 14a7 7 0 0 0 14 0c0-4-4-7-7-12ZM8 14c0 2 1 3 3 3',
 sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
 coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v10m3-9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9',
 clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2',
 check:'m5 12 4 4L19 6', search:'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1 5 6 6',
 heart:'M12 20C1 13 1 6 6 4c3-1 5 1 6 3 1-2 3-4 6-3 5 2 5 9-6 16Z',
 spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
 sound:'M11 4 5 9H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
 mute:'M11 4 5 9H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6',
 download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
 info:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 11v6m0-10v1',
 trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',
 camera:'M4 7h4l2-3h4l2 3h4v14H4V7Zm12 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
 expand:'M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6',
 cloud:'M7 18a5 5 0 1 1 1-10 6 6 0 0 1 11 2 4 4 0 0 1 0 8H7Z',
 chevron:'m8 4 8 8-8 8', lock:'M6 10h12v11H6V10Zm2 0V6a4 4 0 0 1 8 0v4',
};
function icon(name, size=20) {
  const id=Object.hasOwn(icons,name)?name:'leaf';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#flora-icon-${id}"/></svg>`;
}
function mountIconSprite() {
  const symbols=Object.entries(icons).map(([name,path])=>`<symbol id="flora-icon-${name}" viewBox="0 0 24 24"><path d="${path}"/></symbol>`).join('');
  document.body.insertAdjacentHTML('afterbegin',`<svg class="flora-icon-sprite" width="0" height="0" aria-hidden="true">${symbols}${gardenDesign.growthSymbols()}</svg>`);
}
const species = id => game.CATALOG.find(s => s.id === id);
const defaultPrefs = {sounds:false, music:false, calm:matchMedia('(prefers-reduced-motion: reduce)').matches, pot:'clay'};
let state, prefs={...defaultPrefs}, journal=[], extras=featureModule.defaultExtras(), saveProblem=false, recovered=false, savedSnapshot=null, validatedSnapshot=null, migrationSource=null;
let backgroundDirty=false;
const autoSaveInterval=5*60*1000;
function journalPlantIds(value) {
  if(!Array.isArray(value))return [];
  return [...new Set(value.slice(0,100).filter(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)))];
}
function pruneExtrasForPlants(raw,plants) {
 const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},ids=new Set(plants.map(p=>p.id));
 const result={...source,appearance:Object.fromEntries(Object.entries(source.appearance&&typeof source.appearance==='object'&&!Array.isArray(source.appearance)?source.appearance:{}).filter(([id])=>ids.has(id))),order:Array.isArray(source.order)?source.order.filter(id=>ids.has(id)):[]};
 if(result.layout?.sillPlantId&&!ids.has(result.layout.sillPlantId)){
   result.layout={...result.layout};
   delete result.layout.sillPlantId;
 }
 return result;
}
function unpack(raw) {
  try {
    const data = JSON.parse(raw);
    if (data?.format !== 'FloraKeepWeb' || data.version !== 1) return null;
    const parsed = game.validateState(data.game);
    if (!parsed) return null;
    const migration=saveFormat.migrateExtras(data.extras);
    const restoredExtras=featureModule.normalizeExtras(pruneExtrasForPlants(migration.extras,parsed.plants),game.CATALOG);
    const events=Array.isArray(data.journal)?data.journal.slice(0,2000).filter(e => e && typeof e.text==='string' && e.text.length<=500 && Number.isSafeInteger(e.at) && e.at>=0 && e.at<=8640000000000000).map(e=>({...(typeof e.id==='string'&&/^e_[a-zA-Z0-9-]{1,90}$/.test(e.id)?{id:e.id}:{}),at:e.at,text:e.text,kind:typeof e.kind==='string' && Object.hasOwn(icons,e.kind)?e.kind:'leaf',plantId:typeof e.plantId==='string'?e.plantId.slice(0,128):null,plantIds:journalPlantIds(e.plantIds),speciesId:game.CATALOG.some(s=>s.id===e.speciesId)?e.speciesId:null,...Object.fromEntries(['plantsAdded','plantsWatered'].filter(k=>Number.isInteger(e[k])&&e[k]>=0&&e[k]<=100).map(k=>[k,e[k]]))})).sort((a,b)=>b.at-a.at):[];
    const pinned=e=>restoredExtras.pinned.includes(e.id || `${e.at}-${String(e.text).slice(0,55)}`);
    const retained=[...events.filter(pinned).slice(0,60),...events.filter(e=>!pinned(e)).slice(0,200)].sort((a,b)=>b.at-a.at);
    return {state:parsed, extras:restoredExtras, prefs:{...defaultPrefs,
      sounds:data.prefs?.sounds===true, music:data.prefs?.music===true,
      calm:typeof data.prefs?.calm==='boolean'?data.prefs.calm:defaultPrefs.calm,
      pot:['clay','sage','cream'].includes(data.prefs?.pot)?data.prefs.pot:'clay'},
      journal:retained,migrated:migration.migrated};
  } catch { return null; }
}
try {
  const current = localStorage.getItem(KEY); savedSnapshot=current;
  let loadedRaw=current, saved=unpack(current);
  if (current && !saved) { loadedRaw=localStorage.getItem(BACKUP);saved=unpack(loadedRaw);recovered=!!saved; }
  if (saved?.migrated) migrationSource=loadedRaw;
  if(saved) {
    if(loadedRaw===current)validatedSnapshot=current;
    state=saved.state; prefs=saved.prefs; journal=saved.journal; extras=saved.extras;
  }
  else if(current) saveProblem=true;
} catch { saveProblem=true; }
const returnBefore=state;
state = game.advance(state || game.initialState(), Date.now());
featureModule.recordHistory(extras,state);
const routes = new Set(['garden','catalog','herbarium','journal']);
let page = routeFromHash().page;
let filter='all', query='', sort='new', dialogKind=null, dialogPlantId=null, importPending=null, returnFocus=null, toastTimer, deferredInstall;
const app=$('#app'), dialog=$('#dialog'), toastElement=$('#toast'), soundCaptionElement=$('#sound-caption');
let audioMusic;
function payload() { return {format:'FloraKeepWeb', version:1, savedAt:Date.now(), game:state, prefs, journal, extras}; }
function save() {
  try {
    const old=localStorage.getItem(KEY);
    if (migrationSource && localStorage.getItem(BACKUP)!==migrationSource) localStorage.setItem(BACKUP,migrationSource);
    const stamp=Date.now();
    const serialized=JSON.stringify({...payload(),extras:{...extras,lastSavedAt:stamp}});
    try {localStorage.setItem(KEY,serialized);} catch(error) {
      if(error?.name!=='QuotaExceededError')throw error;
      // Old recovery points may yield space to current progress. Never touch
      // another profile or the current garden when recovering storage quota.
      const snapshotKey=KEY+'-snapshots',raw=JSON.parse(localStorage.getItem(snapshotKey)||'[]');
      if(!Array.isArray(raw)||!raw.length)throw error;
      const rows=raw.slice().sort((a,b)=>(Number(b?.at)||0)-(Number(a?.at)||0));
      let stored=false;
      while(rows.length){rows.pop();if(rows.length)localStorage.setItem(snapshotKey,JSON.stringify(rows));else localStorage.removeItem(snapshotKey);try{localStorage.setItem(KEY,serialized);stored=true;break;}catch(next){if(next?.name!=='QuotaExceededError')throw next;}}
      if(!stored)throw error;
    }
    const previous=savedSnapshot===validatedSnapshot?validatedSnapshot:null;
    savedSnapshot=serialized;validatedSnapshot=serialized;extras.lastSavedAt=stamp;
    backgroundDirty=false;
    migrationSource=null;
    saveProblem=false;
    // A failed previous-copy write must not block the primary save.
    try {if(old&&old!==serialized&&(old===previous||unpack(old)))localStorage.setItem(BACKUP,old);}catch{}
    updateSaveStatus(true);
    return true;
  } catch {
    const firstFailure = !saveProblem;
    saveProblem = true;
    updateSaveStatus();
    if (firstFailure) toast('Не удалось сохранить сад. Скачайте аварийную копию.');
    return false;
  }
}
function syncLatest() {
  try {
    const raw=localStorage.getItem(KEY);
    if(!raw||raw===savedSnapshot)return false;
    const incoming=unpack(raw);
    if(!incoming)return false;
    state=game.advance(incoming.state,Date.now());
    prefs=incoming.prefs;journal=incoming.journal;extras=incoming.extras;
    savedSnapshot=raw;validatedSnapshot=raw;migrationSource=incoming.migrated?raw:null;backgroundDirty=false;
    return true;
  } catch{return false;}
}
async function exclusive(action) {
  let entered = false;
  try {
    if (!navigator.locks?.request) { entered = true; return action(); }
    return await navigator.locks.request(KEY, () => { entered = true; return action(); });
  } catch (error) {
    // Some browsers expose Web Locks on file: but deny access to its origin.
    // Fall back only before invoking the action: never execute a mutation twice.
    if (!entered && ['SecurityError', 'NotSupportedError'].includes(error?.name)) return action();
    throw error;
  }
}
function refreshDialog() {
  if (dialog.contains(document.activeElement) && document.activeElement?.matches('input, textarea, select, summary, [contenteditable]')) return;
  if (dialogKind === 'plant') showPlant(dialogPlantId, false);
  if (dialogKind === 'supplies') showSupplies(false);
}
function log(text, kind='leaf', metadata={}) { const p=state.plants.find(p=>p.id===(Object.hasOwn(metadata,'plantId')?metadata.plantId:state.selectedPlantId));journal.unshift({id:'e_'+newLocalId(),at:Date.now(),text,kind,plantId:p?.id||null,plantIds:journalPlantIds(metadata.plantIds),speciesId:metadata.speciesId??p?.speciesId??null,...Object.fromEntries(['plantsAdded','plantsWatered'].filter(k=>Number.isInteger(metadata[k])&&metadata[k]>=0&&metadata[k]<=100).map(k=>[k,metadata[k]]))}); const pinned=e=>extras.pinned.includes(e.id || `${e.at}-${String(e.text).slice(0,55)}`);journal=[...journal.filter(pinned).slice(0,60),...journal.filter(e=>!pinned(e)).slice(0,200)].sort((a,b)=>b.at-a.at); }
function toast(text) { features?.notify(text); const el=toastElement; el.textContent=text; el.classList.add('visible'); clearTimeout(toastTimer); const seconds=extras.settings.notificationSeconds;toastTimer=setTimeout(()=>el.classList.remove('visible'),([5,10,20,60].includes(seconds)?seconds:5)*1000); }
let soundCaptionTimer;
function sound(name) {
  if(prefs.sounds) {
    const audio=new Audio(assetUrl(name));
    audio.volume=extras.workbench.volumes.effects;
    audio.play().catch(()=>{});
  }
  const labels={water:'Звук воды',plant:'Звук посадки',coins:'Звон монет'};
  const caption=soundCaptionElement;
  if(!caption || !extras.workbench.soundCaptions || !Object.hasOwn(labels,name))return;
  (dialog.open?dialog:document.body).append(caption);
  caption.textContent=labels[name];
  caption.hidden=false;
  clearTimeout(soundCaptionTimer);
  soundCaptionTimer=setTimeout(()=>{caption.hidden=true;},2200);
}
function music() {
  const context=extras.workbench;
  try {sceneAudio.play(context?.soundscape||'off',context?.volumes?.atmosphere??.2);} catch {}
  if(!audioMusic) { audioMusic=new Audio(assetUrl('music')); audioMusic.loop=true; }
  audioMusic.volume=extras.workbench?.volumes?.music ?? .14;
  if(prefs.music) audioMusic.play().catch(()=>toast('Нажмите переключатель музыки ещё раз, чтобы включить её.'));
  else audioMusic.pause();
}
function recordStateTransition(previous, now, notify=false, actionMessage='') {
  if (!previous) return;
  const oldPlants = new Map(previous.plants.map(plant => [plant.id, plant]));
  const milestones = new Set(extras.achievements);
  for (const plant of state.plants) {
    const old = oldPlants.get(plant.id);
    const key = `mature:${plant.speciesId}`;
    if (plant.growth >= 1 && !milestones.has(key)) {
      milestones.add(key);
      if (old && old.growth < 1) {
        const name = species(plant.speciesId).name;
        log(`${name}: первое взросление. Теперь доступны монеты.`, 'spark', {plantId: plant.id, speciesId: plant.speciesId});
        if (notify) toast(`${name}: растение выросло.`);
      }
    }
  }
  extras.achievements = [...milestones];
  gardenUpgrades.record(extras, previous, state, now, actionMessage);
}
function apply(result, kind='leaf', audio=null) {
  if(result.success)checkpoint('Перед действием');
  const previous=state;
  state=result.state;
  recordStateTransition(previous, Date.now(), false, result.success ? result.message : '');
  extras=pruneExtrasForPlants(extras,state.plants);
  featureModule.recordHistory(extras,state,Date.now(),result.success);
  if(result.success) {const added=state.plants.filter(p=>!previous.plants.some(q=>q.id===p.id)),watered=state.plants.filter(p=>p.research>(previous.plants.find(q=>q.id===p.id)?.research??p.research)),changed=added.length?added:watered;log(result.message,kind,{...(changed.length?{plantId:changed.length===1?changed[0].id:null,speciesId:changed.length===1?changed[0].speciesId:null}:{}),plantIds:changed.map(plant=>plant.id),plantsAdded:added.length,plantsWatered:watered.length});if(audio)sound(audio);}
  const saved = save();
  render();
  if (saved || !result.success) toast(result.message);
  if(dialogKind==='plant') showPlant(dialogPlantId, false);
  if(dialogKind==='supplies') showSupplies(false);
  if(result.success&&kind==='water'){
    const selected=state.selectedPlantId;
    features?.afterCare(selected,previous.plants.find(plant=>plant.id===selected)?.moisture);
  }
  return result.success;
}
const nav = [{id:'garden',icon:'garden',name:'Мой сад',short:'Сад'},{id:'catalog',icon:'grid',name:'Каталог растений',short:'Каталог'},{id:'herbarium',icon:'book',name:'Гербарий',short:'Гербарий'},{id:'journal',icon:'journal',name:'Журнал роста',short:'Журнал'}];
const focusSelector = 'a[href],button,input,textarea,select,summary,[tabindex]';
function visibleControl(element) {
  return Boolean(element?.isConnected && !element.disabled && element.getClientRects().length);
}
function focusSignature(element) {
  const {action, feature, id, value} = element.dataset;
  const card = element.closest('[data-plant-id]')?.dataset.plantId;
  const section = element.closest('.mobile-nav, .sidebar, .topbar, .next-care-card, .care-queue, .favorite-shelf, .garden-welcome')?.classList[0];
  const label = element.matches('summary') ? element.textContent.trim() : '';
  return JSON.stringify([element.tagName, element.id, element.getAttribute('name'), element.getAttribute('href'), action, feature, id, value, card, section, label]);
}
function captureFocus(scope) {
  const element = document.activeElement;
  if (!element || !scope.contains(element)) return null;
  return {signature: focusSignature(element), start: element.selectionStart, end: element.selectionEnd};
}
function restoreFocus(scope, focus) {
  if (!focus) return false;
  const element = [...scope.querySelectorAll(focusSelector)].find(candidate => visibleControl(candidate) && focusSignature(candidate) === focus.signature);
  if (!element) return false;
  element.focus({preventScroll:true});
  if (typeof focus.start === 'number' && element.setSelectionRange) element.setSelectionRange(focus.start, focus.end);
  return true;
}
function saveStatusLabel() {
  if (saveProblem) return 'Ошибка сохранения';
  if (!extras.lastSavedAt) return 'Запись после первого действия';
  return 'Сохранено в ' + saveTimeFormat.format(extras.lastSavedAt);
}
function updateSaveStatus(recent=false) {
  const warning = $('#storage-warning');
  const status = $('[data-save-status]');
  if (warning) warning.hidden = !saveProblem;
  if (status) {
    const label=saveStatusLabel();
    if(status.textContent!==label)status.textContent=label;
  }
  const indicator=$('[data-save-indicator]');
  if(indicator){
    indicator.dataset.saveIndicator=saveIndicatorState();
    if(recent&&gardenDesign.motionAllowed(prefs))indicator.animate?.([{opacity:.42},{opacity:1}],{duration:210});
  }
}
function saveIndicatorState() { return saveProblem?'error':extras.lastSavedAt?'saved':'pending'; }
function brandBadge() {
  return art.brandMark
    ? `<span class="brand-stamp" aria-hidden="true">${art.brandMark()}</span>`
    : `<img src="${assetUrl('icon')}" alt="">`;
}
function render() {
  const focus = captureFocus(app);
  const catalogFilters = page === 'catalog' ? $('.catalog-more-filters')?.open : undefined;
  const expandedPlants = new Set([...app.querySelectorAll('[data-plant-id] details[open]')]
    .map(detail => detail.closest('[data-plant-id]').dataset.plantId));
  document.documentElement.classList.toggle('calm',prefs.calm);
  document.documentElement.classList.toggle('sidebar-collapsed',extras.layout?.sidebarCollapsed===true);
  document.documentElement.dataset.page=page;
  const navIndex=Math.max(0,nav.findIndex(n=>n.id===page)),navStyle=`--nav-index:${navIndex};--nav-from:${previousNavIndex}`;previousNavIndex=navIndex;
  app.innerHTML=`
    <aside class="sidebar"><button class="sidebar-toggle" data-action="toggle-sidebar" aria-label="${extras.layout?.sidebarCollapsed?'Развернуть навигацию':'Свернуть навигацию'}" aria-expanded="${!extras.layout?.sidebarCollapsed}" title="${extras.layout?.sidebarCollapsed?'Развернуть навигацию':'Свернуть навигацию'}">${icon('chevron',18)}</button><a class="brand" href="#garden" aria-label="Flora Keep — мой сад">${brandBadge()}<span>flora<span class="brand-keep">keep</span><small>РАСТИТЕ С ЗАБОТОЙ</small></span></a>
    <div class="nav-label">ВАШ ЗЕЛЁНЫЙ МИР</div><nav class="botanical-nav" style="${navStyle}" aria-label="Основная навигация"><span class="nav-leaf-marker" aria-hidden="true">${icon('leaf',14)}</span>${nav.map(n=>`<a href="#${n.id}" class="nav-item ${page===n.id?'active':''}" aria-label="${n.name}" title="${n.name}" ${page===n.id?'aria-current="page"':''}>${icon(n.icon)}<span>${n.name}</span>${page===n.id?'<i></i>':''}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="bee-note"><div class="bee-note-art">${beeArt()}</div><span class="tiny-label">ЖУЖА РЯДОМ</span><h3>Всё в своём темпе.</h3><p>Даже самый большой сад начинается с маленького ростка.</p><button class="text-button" data-action="help">Давайте знакомиться ${icon('arrow',16)}</button></div><button class="sidebar-settings" data-action="settings" aria-label="Настройки сада" title="Настройки сада">${icon('settings')} <span>Настройки сада</span></button><div class="sidebar-foot">С любовью к маленьким чудесам ${icon('heart',13)}</div></div></aside>
    <div class="workspace"><header class="topbar"><a class="mobile-brand" href="#garden">${brandBadge()}flora keep</a><div class="breadcrumb">Мой зелёный уголок <span>/</span> <strong>${nav.find(n=>n.id===page).name}</strong></div><div class="resources"><button class="resource compact-profile" data-feature="profiles" title="Переключить сад" aria-label="Открытый сад: ${esc(extras.gardenName)}">${esc(extras.gardenName)}</button><button class="resource coins" data-action="supplies" aria-label="${num(state.coins)} монет. Открыть запасы">${icon('coin',19)}<strong>${num(state.coins)}</strong></button><button class="resource water" data-action="supplies" aria-label="Вода: ${state.water}. Открыть запасы">${icon('water',18)}<strong>${state.water}</strong><span class="resource-plus">+</span></button><span class="header-divider"></span><button class="icon-button sound-button" data-action="sound" aria-label="${prefs.sounds?'Выключить':'Включить'} звуки" aria-pressed="${prefs.sounds}">${icon(prefs.sounds?'sound':'mute')}</button><button class="avatar" data-action="settings" aria-label="Настройки сада">${icon('leaf',20)}</button></div></header>
    <main id="main" tabindex="-1"><div class="storage-warning" id="storage-warning"${saveProblem?'':' hidden'}><span>Браузер не смог записать сад.</span> <button type="button" class="button secondary" data-action="emergency-export">Скачать аварийную копию</button></div>${page==='garden'?gardenView():page==='catalog'?catalogView():page==='herbarium'?herbariumView():journalView()}</main>
    <footer class="footer"><span>${icon('leaf',14)} Немного заботы. Немного магии. Ваш сад.</span><button class="text-button" data-action="about">История Flora Keep ${icon('arrow',14)}</button></footer></div>
    <nav class="mobile-nav" style="${navStyle}" aria-label="Навигация на телефоне"><span class="nav-leaf-marker" aria-hidden="true">${icon('leaf',12)}</span>${nav.map(n=>`<a href="#${n.id}" class="${page===n.id?'active':''}" ${page===n.id?'aria-current="page"':''}>${icon(n.icon,21)}<span>${n.short}</span></a>`).join('')}</nav>`;
  features?.afterRender();
  floraLocale.decorate(app,render);
  watchDeferredArt(true);
  const catalog = $('.catalog-more-filters');
  if (catalog && catalogFilters !== undefined) catalog.open = catalogFilters;
  for (const detail of app.querySelectorAll('[data-plant-id] details')) {
    detail.open = expandedPlants.has(detail.closest('[data-plant-id]').dataset.plantId);
    if(detail.open)refreshCardHistory(detail.closest('[data-plant-id]'));
  }
  restoreFocus(app, focus);
}
function pageHeading(eyebrow,title,subtitle,aside='') { return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div>${aside}</div>`; }
function dailyCareState(thirsty=state.plants.filter(game.needsWater).length) {
 const start=new Date();
 start.setHours(0,0,0,0);
 const end=new Date(start);
 end.setDate(end.getDate()+1);
 const from=start.getTime(),until=end.getTime();
 const care=journal.reduce((count,entry)=>count+Number(visualJournal.eventType(entry)==='water'&&entry.at>=from&&entry.at<until),0);
 return {care,thirsty,key:`${from}-${care}-${thirsty}`};
}
function dailyCareMarkup({care,thirsty,key}=dailyCareState()){
 const complete=care>0&&!thirsty;
 return `<div class="daily-bloom ${complete?'is-complete':''}" data-care-key="${key}">${art.careBlossomArt(complete)}<div><strong>${complete?'Сегодня сад окружён заботой':'Маленький ритуал дня'}</strong><span>${complete?'Цветок раскрылся: все растения напоены.':thirsty?'Полейте ждущие растения — и бутон раскроется.':'Загляните к листьям. Сейчас растениям хорошо.'}</span></div></div>`;
}
function plantDisplayName(p){return extras.appearance[p.id]?.name||species(p.speciesId).name;}
function plantStatus(p){return p.health<70?'Нужна забота':game.needsWater(p)?'Ждёт полива':p.growth>=1?'Взрослое растение':p.growth>=.75?(game.CATALOG.find(s=>s.id===p.speciesId)?.category==='flowers'?'Скоро расцветёт':'Скоро вырастет'):'Растёт с заботой';}
let sillSeed=windowsill.seeds[0];
function welcomeView() {
  const model=windowsill.shelfModel(state.plants,extras.order,extras.layout.sillPlantId,state.selectedPlantId,game.needsWater);
  const atmosphere=featureModule.resolvedAtmosphere(extras.settings);
  const cost=plantCost(sillSeed);
  const name=plant=>extras.appearance[plant.id]?.name||floraLocale.t(plant.speciesId);
  const view={model,atmosphere,icon,esc,species,t:floraLocale.t,language:floraLocale.get(),seed:sillSeed,cost,canPlant:cost<=state.coins,
    water:state.water,title:extras.gardenName,description:extras.description,
    name,thirsty:game.needsWater,artKey:gardenCardArtKey,
    options:model.pages>1?model.ordered.map((plant,index)=>[plant.id,`${index+1}. ${name(plant)}`]):[],
    image:plant=>features.image(plant,{id:'sill-'+plant.id,air:atmosphere.scene==='balcony'||atmosphere.weather==='rain'?'wind':'still'}).replace('<svg ','<svg preserveAspectRatio="xMidYMax meet" '),
    seedImage:id=>plantArt(id,{id:'sill-seed-'+id,pot:'cream'}),
    environment:()=>art.windowsillEnvironment(atmosphere)};
  view.key=windowsill.key(view);
  return view;
}
function selectSill(id,source,seed=false) {
  if(seed){
    if(!windowsill.seeds.includes(id))return;
    sillSeed=id;
  }else{
    if(!state.plants.some(plant=>plant.id===id))return;
    if(extras.layout.sillPlantId!==id){
      extras.layout.sillPlantId=id;
      save();
    }
  }
  const old=$('.windowsill');
  if(!old)return;
  const view=welcomeView();
  if(old.dataset.welcomeKey!==view.key)old.outerHTML=windowsill.markup(view);
  const root=$('.windowsill');
  const sameArrow=source.classList.contains('sill-step') && [...root.querySelectorAll('.sill-step:not(:disabled)')].find(button=>button.getAttribute('aria-label')===source.getAttribute('aria-label'));
  const focus=source.id==='sill-quick-pick'?$('#sill-quick-pick'):sameArrow||$('.sill-pot[aria-pressed="true"]',root);
  focus?.focus({preventScroll:true});
  floraLocale.apply(root);
}
function focusSillResult(effect) {
  const pot=$('.sill-pot[aria-pressed="true"]');
  if(!pot)return;
  pot.focus({preventScroll:true});
  if(gardenDesign.motionAllowed(prefs)&&extras.delights.motion!=='still')pot.dataset.sillEffect=effect;
}
function careQueueView(thirsty=state.plants.filter(game.needsWater)){
 const rows=thirsty.slice().sort((a,b)=>a.moisture-b.moisture).slice(0,3)
  .map(plant=>({id:plant.id,name:plantDisplayName(plant),moisture:Math.round(plant.moisture)}));
 return {rows,key:JSON.stringify([rows,state.water>0])};
}
function careQueueMarkup({rows,key}=careQueueView()){
 const batch=rows.length>1?`<button type="button" class="text-button" data-action="${state.water?'water-all':'supplies'}">${state.water?'Полить растения':'Набрать воду'}</button>`:'';
 return rows.length?`<section class="care-queue" data-queue-key="${esc(key)}" aria-label="Сегодня нужна забота"><div class="care-queue-label">${icon('water',17)}<strong>Сегодня нужна забота</strong>${batch}</div><div class="care-queue-items">${rows.map(plant=>`<button data-action="plant-detail" data-id="${plant.id}"><span>${esc(plant.name)}</span><small>${plant.moisture}% влаги</small>${icon('arrow',15)}</button>`).join('')}</div></section>`:'';
}
function nextCareView() {
  const next=gardenDesign.nextCare(game,state);
  if(!next)return null;
  const name=plantDisplayName(next.plant);
  return {...next,name,key:[next.plant.id,next.label,name,gardenCardArtKey(next.plant)].join('|')};
}
function nextCareCard(next=nextCareView()) {
  if(!next)return '';
  const {plant,label,name,key,time}=next;
  const dateLabel=Number.isFinite(time)&&!Number.isNaN(new Date(time).getTime())
    ? `<time datetime="${new Date(time).toISOString()}">${esc(label)}</time>`:esc(label);
  return `<section class="next-care-card" data-next-care-key="${esc(key)}" aria-labelledby="next-care-heading"><div><h2 id="next-care-heading">Следующая забота</h2><p class="next-care-time">${dateLabel}</p><button type="button" class="text-button" data-action="plant-detail" data-id="${plant.id}">${esc(name)} ${icon('arrow',13)}</button></div><div class="next-care-image" aria-hidden="true">${features.image(plant,{id:'next-care'})}</div></section>`;
}
function moistureFilterIndicator(thirsty,total) {
  const share=gardenDesign.filterRatio(thirsty,total);
  return `${thirsty?` <span data-water-count>${thirsty}</span>`:''}<span class="filter-water-share" aria-hidden="true" data-water-share data-share="${share}" style="--water-share:${share}%"></span><span class="sr-only" data-water-description>Из ${total} растений ждут полива ${thirsty}.</span>`;
}
function gardenView() {
 const empty=!state.plants.length, thirstyPlants=state.plants.filter(game.needsWater),thirsty=thirstyPlants.length;
 const daily=dailyCareState(thirsty), ready=incomeReady();
 
 const tasks=game.tasks(state).filter(t=>!t.claimed).slice(0,2);
 const favorites=state.plants.filter(p=>(extras.layout?.favorites||[]).includes(p.id));
 const view=extras.layout?.collectionView || 'grid';
 return `${windowsill.markup(welcomeView())}
 <div class="garden-workspace"><section class="garden-collection" id="garden-collection" tabindex="-1" aria-label="Ваша коллекция растений">
 ${careQueueMarkup(careQueueView(thirstyPlants))}
 <div class="section-heading"><div><h2>${empty?'С чего начнётся ваш сад?':`Ваши растения <span class="count">${state.plants.length}</span>`}</h2><p>${empty?'Выберите растение по душе.':'Каждый росток — маленькая история.'}</p></div><button class="text-button" data-action="browse">${empty?'Весь каталог':'Добавить растение'} ${icon('plus',17)}</button></div>
 ${favorites.length?`<section class="favorite-shelf" aria-label="Любимые растения"><h3>${icon('heart',16)} На любимой полке</h3><div class="favorite-shelf-items">${favorites.map(p=>`<button class="favorite-preview" data-action="plant-detail" data-id="${p.id}"><span class="favorite-picture" aria-hidden="true">${features?features.image(p,{id:'favorite-'+p.id}):plantArt(p.speciesId,{id:'favorite-'+p.id,growth:p.growth,pot:prefs.pot})}</span><span>${esc(plantDisplayName(p))}<small>${plantStatus(p)}</small></span>${icon('arrow',15)}</button>`).join('')}</div></section>`:''}
 ${empty?`<div class="starter-grid">${['daisy','lavender','monstera'].map((id,i)=>catalogCard(species(id),['СОЛНЕЧНЫЙ ХАРАКТЕР','ТИХАЯ КЛАССИКА','ТРОПИЧЕСКИЙ АКЦЕНТ'][i],true)).join('')}</div>`:`<div class="garden-toolbar"><div class="tabs" role="group" aria-label="Фильтр растений">${[['all','Все растения'],['thirsty','Нужен уход'],['mature','Взрослые']].map(([id,label])=>`<button data-action="filter" data-value="${id}" class="${filter===id?'selected':''}" aria-pressed="${filter===id}">${label}${id==='thirsty'?moistureFilterIndicator(thirsty,state.plants.length):''}</button>`).join('')}</div><div class="collection-display"><label class="sort-label"><span class="sr-only">Порядок растений</span><select id="sort"><option value="custom" ${sort==='custom'?'selected':''}>Мой порядок</option><option value="new" ${sort==='new'?'selected':''}>Сначала новые</option><option value="name" ${sort==='name'?'selected':''}>По названию</option><option value="growth" ${sort==='growth'?'selected':''}>По росту</option></select></label><div class="view-switch" role="group" aria-label="Вид коллекции"><button data-action="collection-view" data-value="grid" aria-label="Сетка растений" aria-pressed="${view==='grid'}" title="Сетка">${icon('grid',18)}</button><button data-action="collection-view" data-value="list" aria-label="Список растений" aria-pressed="${view==='list'}" title="Список">${icon('journal',18)}</button><button data-action="collection-view" data-value="compact" aria-label="Компактная таблица" aria-pressed="${view==='compact'}" title="Компактная таблица">${icon('leaf',18)}</button></div></div></div><div class="plant-grid collection-${view}" data-collection-view="${view}">${gardenCards()}</div>`}
 <div class="bottom-note">${icon('cloud',18)} <span>Локальное хранение</span><span class="save-dot" data-save-indicator="${saveIndicatorState()}" aria-hidden="true"></span><small data-save-status>${saveStatusLabel()}</small><button class="text-button" data-action="quiet">Побыть в саду</button></div></section>
 <aside class="garden-context" aria-label="Ритм и подсказки сада"><section class="stats" aria-label="Состояние сада"><div class="stat"><div class="stat-icon sage">${icon('garden',23)}</div><div><span>Растений в саду</span><strong>${state.plants.length}<small>${state.plants.length?'маленьких историй':'всё только начинается'}</small></strong></div></div><div class="stat"><div class="stat-icon lilac">${icon('book',23)}</div><div><span>Коллекция видов</span><strong>${state.discovered.length}<small>/ ${game.CATALOG.length} открыто</small></strong></div><div class="mini-dots">${game.CATALOG.map(s=>`<i class="${state.discovered.includes(s.id)?'filled':''}"></i>`).join('')}</div></div><div class="stat" data-income-stat>${incomeStatMarkup({ready,amount:ready?num(ready):daily.care})}</div></section>
 ${empty?'':nextCareCard()}
  ${empty?`<div class="first-seed-note">${art.seedPacketArt()}<div><strong>В каждом семечке — целый сад</strong><span>Посадите растение, чтобы здесь появились ваши открытия.</span></div></div>`:dailyCareMarkup(daily)}
 <section class="garden-context-tasks" aria-label="Текущие открытия"><h3>На пути к открытиям</h3>${tasks.length?`<ul>${tasks.map(t=>`<li><span>${esc(t.title)}</span><small>${t.progress} / ${t.target}${t.complete?' · готово':''}</small><progress value="${t.progress}" max="${Math.max(1,t.target)}" aria-label="${esc(t.title)}: ${t.progress} из ${t.target}"></progress></li>`).join('')}</ul>`:'<p>Все текущие задания выполнены. Можно расти в своём ритме.</p>'}<button class="text-button" data-feature="plans">Все открытия ${icon('arrow',16)}</button></section>
 <section class="garden-context-note"><span class="tiny-label">МАЛЕНЬКИЙ СОВЕТ</span><h3>Забота важнее спешки.</h3><p>Приходите, когда хочется. Жужа подскажет, что нужно вашим растениям.</p><button class="text-button" data-action="help">Спросить Жужу ${icon('arrow',16)}</button></section></aside></div>`;
}
function visibleGardenPlants() {
  const plants = state.plants.filter(plant => filter === 'thirsty' ? game.needsWater(plant) : filter === 'mature' ? plant.growth >= 1 : true);
  const rank = new Map(extras.order.map((id, index) => [id, index]));
  const comparison = {
    custom: (a,b) => (rank.get(a.id) ?? 100) - (rank.get(b.id) ?? 100),
    name: (a,b) => plantDisplayName(a).localeCompare(plantDisplayName(b), 'ru'),
    growth: (a,b) => b.growth - a.growth,
    new: (a,b) => b.plantedAt - a.plantedAt,
  };
  return plants.sort(comparison[sort] || comparison.new);
}
function groupBadge(plant) {
  const group = extras.appearance[plant.id]?.group;
  return group ? '<span class="group-tag">' + esc(group) + '</span>' : '';
}
function gardenCard(p, eager=true) {
  const favorite=(extras.layout?.favorites||[]).includes(p.id);
  const name=plantDisplayName(p);
  const thirsty=game.needsWater(p),status=plantStatus(p);
  const illustration=eager||typeof IntersectionObserver!=='function'
    ? gardenCardArt(p):'<span class="deferred-plant-art" aria-hidden="true"></span>';
  return `<article class="plant-card living-card" data-plant-id="${p.id}"${state.selectedPlantId===p.id?' data-last-opened':''} data-art-stage="${gardenCardArtKey(p)}">
    <button class="plant-open" data-action="plant-detail" data-id="${p.id}" aria-label="Уход: ${esc(name)}">
      <div class="plant-visual ${p.speciesId}"><span class="plant-tag${thirsty?' needs-water':''}" data-plant-status="${status}">${thirsty?icon('water',12)+' ':''}${status}</span>
        ${illustration}<span class="plant-open-arrow">${icon('arrow',18)}</span></div>
      <div class="plant-content"><h3>${esc(name)}</h3>${groupBadge(p)}<p class="latin">${species(p.speciesId).latinName}</p>
        ${gardenDesign.growthRibbon(p.growth)}${gardenDesign.compactReadings(p)}</div>
    </button>
    <button class="favorite-toggle" data-action="favorite" data-id="${p.id}" aria-pressed="${favorite}" aria-label="${favorite?'Убрать из избранного':'В избранное'}: ${esc(name)}" title="${favorite?'Убрать с любимой полки':'На любимую полку'}">${icon('heart',17)}</button>
    <details class="plant-details"><summary>Подробнее о росте ${icon('chevron',14)}</summary><div class="plant-meters"><span>${icon('water',14)} ${Math.round(p.moisture)}%</span><span>${icon('leaf',14)} ${Math.round(p.growth*100)}%</span><span>${icon('heart',14)} ${Math.round(p.health)}%</span></div>
      <div class="growth-track"><i style="width:${p.growth*100}%"></i></div><div class="card-history-plot"></div></details>
    <button class="card-care" data-action="plant-detail" data-id="${p.id}">Позаботиться ${icon('arrow',16)}</button></article>`;
}
function starterArt(s) {
  return `<span class="starter-seed-art" aria-hidden="true">${art.seedPacketArt()}<span class="starter-seed-portrait">${plantArt(s.id,{id:'seed-'+s.id,pot:'cream'})}</span></span>`;
}
function emptyGardenFilter() { return '<div class="empty-inline">'+art.seedPacketArt()+'<h3>Здесь пока тихо</h3><p>Растений с таким состоянием пока нет.</p><button class="text-button" data-action="filter" data-value="all">Показать все растения</button></div>'; }
function gardenCardArtKey(plant) {
  return [Math.floor(plant.growth*20),art.plantVisualStage(Math.round(featureModule.artworkGrowth(plant)*100)/100),game.bloomInfo(plant).phase,Math.floor(plant.moisture/10),gardenDesign.soilBand(plant.moisture)].join('-');
}
function gardenCardArt(plant) {
  return features ? features.image(plant) : plantArt(plant.speciesId,{id:plant.id,growth:plant.growth,pot:prefs.pot});
}
function watchDeferredArt(reset=false) {
  if(typeof IntersectionObserver!=='function')return;
  if(!galleryArtObserver)galleryArtObserver=new IntersectionObserver(entries=>{
    const plantsById=new Map(state.plants.map(plant=>[plant.id,plant]));
    for(const entry of entries) {
      if(!entry.isIntersecting)continue;
      galleryArtObserver.unobserve(entry.target);
      if(!entry.target.isConnected)continue;
      const card=entry.target.closest('[data-plant-id]');
      const plant=plantsById.get(card?.dataset.plantId);
      if(plant)entry.target.outerHTML=gardenCardArt(plant);
    }
  },{rootMargin:'220px'});
  if(reset)galleryArtObserver.disconnect();
  for(const slot of app.querySelectorAll('.deferred-plant-art'))galleryArtObserver.observe(slot);
}
function gardenCards() { return visibleGardenPlants().map((plant,index)=>gardenCard(plant,index<galleryArtLimit)).join('') || emptyGardenFilter(); }
function plantCost(id) { return extras.creative ? 0 : game.price(state,id); }
function catalogCard(s,label='',starter=false) {
 const cost=plantCost(s.id), owned=state.discovered.includes(s.id);
 return `<article class="plant-card${starter?' starter-seed-card':''}"><button class="plant-open" data-action="preview" data-id="${s.id}"><div class="plant-visual ${s.id}"><span class="plant-tag">${label|| (owned?'Уже в коллекции':s.growthHours+' ч до взрослого растения')}</span>${starter?starterArt(s):plantArt(s.id,{id:'catalog-'+s.id,pot:prefs.pot})}<span class="plant-open-arrow">${icon('arrow',18)}</span></div><div class="plant-content"><h3>${s.name}</h3><p class="latin">${s.latinName}</p><div class="plant-card-bottom"><span>${icon('clock',14)} ${s.growthHours} ч до ${['mint','monstera'].includes(s.id)?'взросления':'цветения'}</span><span class="price ${!cost?'free':''}">${!cost?'В подарок':icon('coin',14)+' '+num(cost)}</span></div></div></button>${!starter?`<button class="card-care" data-action="preview" data-id="${s.id}">${icon('plus',15)} Посадить в сад</button>`:''}</article>`;
}
function catalogView() {
 return `${pageHeading('МИР МАЛЕНЬКИХ БОТАНИЧЕСКИХ ОТКРЫТИЙ','Каталог растений','От нежной ромашки до тропической монстеры. Найдите своё растение.',state.discovered.length?'':'<span class="free-badge">'+icon('spark',18)+' Первое растение в подарок</span>')}
 <div class="catalog-toolbar"><div class="tabs" role="group" aria-label="Категория растений">${[['all','Все растения'],['flowers','Цветущие'],['leaves','Зелёные'],['succulents','Суккуленты']].map(([id,label])=>`<button data-action="filter" data-value="${id}" class="${filter===id?'selected':''}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div><label class="search">${icon('search',18)}<input id="search" type="search" placeholder="Найти растение" value="${esc(query)}" aria-label="Найти растение"></label></div><div class="plant-grid catalog-grid" id="catalog-results">${catalogResults()}</div><div class="catalog-footnote">${icon('info',17)} Сроки роста и цены придуманы для игры. Все покупки — только за игровые монеты.</div>`;
}
function catalogResults() {
 return game.CATALOG.filter(species=>filter==='all'||species.category===filter).map(species=>catalogCard(species)).join('');
}
let herbariumSelection = {speciesId:page==='herbarium'?routeFromHash().speciesId:null};
function herbariumView() {
  return cyanotype.render(cyanotype.collection(game.CATALOG,state,herbariumSelection),{
    draw:plantArt, portrait:(plant,options)=>features.image(plant,options),
    nickname:plant=>extras.appearance[plant.id]?.name, research:id=>game.researchLevel(state,id)
  });
}
function selectHerbariumSpecies(speciesId,plantId,focusPlate=false) {
  if(!state.discovered.includes(speciesId))return;
  herbariumSelection={speciesId,plantId};
  render();
  if(focusPlate)$('#cyan-name')?.focus();
}
function journalView() {
 return `${pageHeading('У КАЖДОГО РОСТКА ЕСТЬ ИСТОРИЯ','Журнал роста','Здесь остаются ваши маленькие шаги и большие открытия.')}<div class="journal-layout"><section class="journal-list">${journal.length?journal.map((e,i)=>`<article class="journal-entry"><div class="journal-icon">${icon(icons[e.kind]?e.kind:'leaf',20)}</div><div><time datetime="${new Date(e.at).toISOString()}">${date(e.at)} · ${timeFormat.format(e.at)}</time><p>${esc(e.text)}</p></div>${i===0?'<span class="journal-new">Последнее</span>':''}</article>`).join(''):`<div class="journal-empty">${art.emptyState?.('journal')||icon('journal',46)}<h2>Первая страница ещё впереди</h2><p>Посадите росток — и начнётся история вашего сада.</p><button class="button primary" data-action="browse">Выбрать растение ${icon('arrow',18)}</button></div>`}</section><aside class="journal-aside">${beeArt()}<h3>Ничего не бывает<br>слишком маленьким.</h3><p>Один полив, новый лист, первое цветение — всё это стоит запомнить.</p><span class="tip-signature">Ваша Жужа</span></aside></div>`;
}
function navigate(id) { closeDialog(); filter='all'; query=''; if(location.hash!==`#${id}`) location.hash=id; else {page=id;render();} }
function routeFromHash(){
  const [page,speciesId] = location.hash.slice(1).split('/');
  return {page:routes.has(page)?page:'garden',speciesId:species(speciesId)?.id || null};
}
function openLinkedSpecies(route) {
  if (!route.speciesId) return;
  if (route.page==='catalog') showPreview(route.speciesId);
  if (route.page==='herbarium' && state.discovered.includes(route.speciesId)) showSpecimen(route.speciesId);
}
window.addEventListener('hashchange',()=>{
  const route=routeFromHash();
  page=route.page; filter='all'; query='';
  if(page==='herbarium'&&route.speciesId)herbariumSelection={speciesId:route.speciesId};
  render();
  window.scrollTo({top:0,behavior:'instant'});
  $('#main').focus({preventScroll:true});
  openLinkedSpecies(route);
});
function showDialog(title,content,kind,wide=false) {
 features?.disposeExperiences?.();
 const sameDialog = dialog.open && dialogKind === kind;
 const focusKey = sameDialog ? captureFocus(dialog) : null;
 const scroll=dialog.open&&dialogKind===kind?dialog.scrollTop:0;
 if(!dialog.open) returnFocus=document.activeElement;
 dialogKind=kind;
 dialog.className=wide?'wide':'';
 dialog.dataset.kind=kind||'feature';
 dialog.innerHTML=`<div class="dialog-head"><div><span class="eyebrow">FLORA KEEP</span><h2 id="dialog-title" tabindex="-1">${title}</h2></div><button class="icon-button close-dialog" data-action="close" aria-label="Закрыть">${icon('close',22)}</button></div><div class="dialog-body">${content}</div>`;
 dialog.append(toastElement);
 if(soundCaptionElement)dialog.append(soundCaptionElement);
 if(!dialog.open) dialog.showModal();
 if (!restoreFocus(dialog, focusKey)) $('#dialog-title', dialog).focus({preventScroll:true});
 dialog.scrollTop=scroll;
 features?.afterDialog?.(kind,dialogPlantId);
 features?.updateTutorial();
 floraLocale.apply(dialog);
}
function closeDialog() { features?.disposeExperiences?.(); if(dialog.open) dialog.close(); dialogKind=null; importPending=null; }
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  features?.disposeExperiences?.();
  document.body.append(toastElement);
  if(soundCaptionElement)document.body.append(soundCaptionElement);
  dialogKind = null;
  importPending = null;
  document.body.classList.remove('quiet-mode');
  const fallback = [...app.querySelectorAll('.nav-item.active, .mobile-nav .active')].find(visibleControl);
  const target = visibleControl(returnFocus) ? returnFocus : fallback || $('#main');
  target?.focus({preventScroll:true});
  returnFocus = null;
});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) closeDialog();}});
function showPreview(id) {
 const s=species(id); if(!s)return;
 const cost=plantCost(id), first=!state.discovered.length&&!state.plants.length;
 showDialog(s.name,`<div class="preview-layout"><div class="preview-art ${id}">${plantArt(id,{id:'preview',pot:prefs.pot})}<span>Так выглядит взрослое растение</span></div><div class="preview-info"><p class="latin">${s.latinName}</p><p class="botanical-fact">${s.fact}</p><div class="preview-stats"><div>${icon('clock')}<span>Взросление<strong>${s.growthHours} часов</strong></span></div><div>${icon('coin')}<span>Доход взрослого<strong>${s.incomePerHour} монет / ч</strong></span></div></div><div class="gentle-note">${icon('leaf',20)}<p>${first?'Первый росток — наш подарок. Начнём с чуть сухой земли, чтобы вы сразу попробовали полив.':'Вы посадите маленький росток. С водой и заботой он вырастет в это растение.'}</p></div><button class="button primary full" data-action="plant" data-id="${id}" ${cost>state.coins?'disabled':''}>${icon('plus',18)} ${!cost?'Посадить бесплатно':'Посадить · '+num(cost)+' монет'}</button>${cost>state.coins?'<p class="form-help">Не хватает монет. Взрослые растения приносят доход.</p>':''}</div></div>`,'preview',true);
  $('.dialog-body',dialog).insertAdjacentHTML('beforeend', `<p><a class="text-button" href="#catalog/${s.id}">Постоянная ссылка на вид</a></p>`);
}
function meter(name,value,kind,color) { const label=kind==='water'?(value<=70?'можно полить':'влажная почва'):kind==='leaf'?(value>=100?'взрослое растение':value<15?'росток':value<75?'растут листья':'готовится к взрослению'):value<70?'нужна забота':'хорошее состояние'; return `<div class="care-meter" data-care-meter="${kind}" role="meter" aria-label="${name}: ${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}"><div><span>${icon(kind,16)} ${name}</span><strong data-meter-value>${Math.round(value)}%</strong></div><div class="meter-track"><i style="width:${value}%;background:${color}"></i></div><small class="meter-description">${label}</small></div>`; }

function showPlant(id,initial=true) {
 const p=state.plants.find(p=>p.id===id); if(!p){closeDialog();return;}
 dialogPlantId=id;
 if(initial) {state={...state,selectedPlantId:id};save();}
 const s=species(p.speciesId), thirsty=game.needsWater(p);
 const remaining=Math.max(0,(1-p.growth)*s.growthHours);
 if(initial){for(const card of document.querySelectorAll('[data-plant-id]'))card.toggleAttribute('data-last-opened',card.dataset.plantId===id);}
 showDialog(s.name,`<div class="care-layout"><div class="care-scene ${p.speciesId}"><span class="plant-tag">${p.growth>=1?'Уже взрослое':p.growth<.15?'Маленькое начало':'Растёт с заботой'}</span>${features?features.image(p,{id:'care-'+id}):plantArt(p.speciesId,{id:'care-'+id,growth:p.growth,pot:prefs.pot})}<div class="care-bee">${beeArt('',thirsty?'watering':featureModule.resolvedAtmosphere(extras.settings).light==='night'?'sleep':'happy')}</div><span class="scene-caption">С вами с ${date(p.plantedAt)}</span></div><div class="care-info"><p class="latin">${s.latinName}</p><div class="care-status">${icon(thirsty?'water':'leaf',19)} ${thirsty?'Самое время полить':'Растению хорошо'}</div>${meter('Влага',p.moisture,'water','#7298a1')}${meter('Рост',p.growth*100,'leaf','#73885a')}${meter('Здоровье',p.health,'heart','#bb8e79')}<p class="growth-estimate">${p.growth>=1?`Приносит до ${Math.floor(s.incomePerHour*(1+game.researchLevel(state,s.id)*.1))} монет в час`:`До взросления ≈ ${remaining<1?Math.ceil(remaining*60)+' мин':Math.ceil(remaining)+' ч'} без ускорения`}${p.boost>1?`<br><strong>Ускорение ×${p.boost} до ${new Date(p.boostUntil).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</strong>`:''}</p><button class="button primary full care-water-action" data-action="water" data-id="${id}" ${!thirsty?'disabled':''}>${icon('water',19)} ${thirsty?'Полить растение · 1 вода':'Почва ещё влажная'}</button><button class="button secondary full" data-action="fertilize" data-id="${id}" ${p.growth>=1||p.boost>=1.5?'disabled':''}>${icon('spark',17)} Ускорить рост ×1,5 <span class="button-stock">${state.fertilizer}</span></button><button class="text-button super-boost" data-action="super-fertilize" data-id="${id}" ${p.growth>=1||p.boost>=2.5?'disabled':''}>Суперудобрение ×2,5 · в запасе ${state.superFertilizer}</button><div class="care-tools"><button data-action="photo" data-id="${id}">${icon('camera',17)} Фото</button><button data-action="specimen" data-id="${s.id}">${icon('book',17)} О виде</button><button data-action="remove-ask" data-id="${id}" aria-label="Убрать растение из сада">${icon('trash',17)}</button></div><p class="form-help">${!thirsty?'Полив доступен, когда влажность опустится до 70%.':state.water===0?'Вода закончилась. Откройте запасы и бесплатный колодец.':'Один полив расходует одну порцию воды.'} ${p.growth>=1?'Взрослому растению ускорение не требуется.':p.boost>1?'Ускорение уже активно; повтор того же удобрения не расходуется.':''}</p>${state.water===0?'<button class="button secondary" data-action="supplies">К бесплатному колодцу</button>':''}</div></div>${features?.careExtras(p)||''}<nav class="tablet-care-list" aria-label="Другие растения">${state.plants.map(other=>`<button data-action="plant-detail" data-id="${other.id}" aria-current="${other.id===id?'true':'false'}">${esc(extras.appearance[other.id]?.name||species(other.speciesId).name)} · ${Math.round(other.moisture)}%</button>`).join('')}</nav>`,'plant',true);
 if(initial&&gardenDesign.motionAllowed(prefs))dialog.classList.add('garden-care-enter');
 features?.updateTutorial();
}
function showSupplies(initial=true) {
 const wait=Math.max(0,30*60*1000-(Date.now()-state.lastWellAt)), wellReady=!state.lastWellAt||!wait;
 showDialog('Всё для заботы',`<p class="dialog-intro">Маленькие помощники для большого зелёного мира.</p><div class="well-card"><div class="well-icon">${icon('water',34)}</div><div><h3>Садовый колодец</h3><p>Одна порция воды бесплатно каждые 30 минут.</p></div><button class="button primary" data-action="well" ${!wellReady?'disabled':''}>${wellReady?'Набрать воду':`Через ${Math.ceil(wait/60000)} мин`}</button></div><div class="supply-list">${[{id:'WATER',name:'Чистая вода',desc:'Один полив — один счастливый росток.',count:state.water,cost:250,icon:'water'},{id:'FERTILIZER',name:'Удобрение',desc:'Рост быстрее в 1,5 раза на 4 часа.',count:state.fertilizer,cost:350,icon:'leaf'},{id:'SUPER_FERTILIZER',name:'Суперудобрение',desc:'Рост быстрее в 2,5 раза на 4 часа.',count:state.superFertilizer,cost:1000,icon:'spark'}].map(s=>`<div class="supply-row"><div class="supply-icon">${icon(s.icon,25)}</div><div class="supply-description"><h3>${s.name} <small>в запасе ${s.count}</small></h3><p>${s.desc}</p></div><button class="button secondary" data-action="buy" data-id="${s.id}" ${s.cost>state.coins?'disabled':''}>${icon('coin',16)} ${s.cost} ${icon('plus',15)}</button></div>`).join('')}</div><div class="dialog-balance">${icon('coin',18)} В вашем кошельке <strong>${num(state.coins)} монет</strong></div><p class="form-help">Только игровые монеты. Никаких покупок за настоящие деньги.</p>`,'supplies',true);
}
function showSettings() {
 showDialog('Настройки сада',`<div class="settings-group"><h3>Атмосфера</h3>${[['sounds','Звуки заботы','Капли воды, посадка и звон монет.'],['music','Музыка сада','Тихая мелодия, чтобы замедлиться.'],['calm','Спокойное движение','Меньше анимаций, столько же красоты.']].map(([key,title,desc])=>`<label class="setting-row"><span><strong>${title}</strong><small>${desc}</small></span><input type="checkbox" role="switch" data-pref="${key}" ${prefs[key]?'checked':''}></label>`).join('')}</div><div class="settings-group"><h3>Цвет ваших горшков</h3><div class="pot-choices">${[['clay','Терракота'],['sage','Шалфей'],['cream','Молочный']].map(([value,label])=>`<button data-action="pot" data-value="${value}" class="${prefs.pot===value?'selected':''}" aria-pressed="${prefs.pot===value}"><i class="pot-swatch ${value}"></i>${label}</button>`).join('')}</div></div><div class="settings-group"><h3>Ваш сад всегда с вами</h3><p>Сад хранится в этом браузере. Скачайте копию, чтобы перенести его на другое устройство или сохранить отдельно.</p><div class="backup-actions"><button class="button secondary" data-action="export">${icon('download',18)} Сохранить копию</button><button class="button secondary" data-action="import">${icon('upload',18)} Восстановить</button></div><input type="file" id="import-file" accept="application/json,.json" hidden><p class="form-help">${isFileMode?'При переносе или переименовании HTML-файла браузер может открыть отдельный сад. Сохраните JSON-копию для переноса. ':''}Поддерживаются копии веб-версии и проверенные копии Android 1.4.</p></div>${deferredInstall?'<button class="button primary full" data-action="install">Установить Flora Keep</button>':''}<button class="text-button" data-action="about">История и авторы проекта ${icon('arrow',16)}</button>`,'settings');
 features?.extendSettings();
}
function showSpecimen(id) {
 const s=species(id);if(!s)return;
 const level=game.researchLevel(state,id),care=state.researchBySpecies[id]||0;
 showDialog(s.name,`<div class="specimen-detail botanical-passport"><div class="passport-heading"><span>HERBARIUM · FLORA KEEP</span><span class="passport-seal">${icon('leaf',18)}</span></div><div class="specimen-detail-art">${plantArt(id,{id:'study',pot:prefs.pot})}</div><p class="latin">${s.latinName}</p><p class="botanical-fact">${s.fact}</p><div class="research"><span>Исследование вида</span><strong>${level} / 5</strong><div>${Array.from({length:5},(_,i)=>`<i class="${i<level?'filled':''}"></i>`).join('')}</div></div><p class="form-help">Каждые 3 полезных полива открывают уровень исследования. Он повышает доход и цену новых растений этого вида на 10%. ${level<5?`До следующего уровня: ${3-care%3} полива.`:'Вы полностью изучили этот вид!'}</p><button class="button secondary full" data-action="preview" data-id="${id}">Посадить ещё одно ${icon('plus',17)}</button><button class="button secondary full" data-feature="study" data-id="${id}">Рассмотреть лист и корни</button></div>`,'specimen');
 features?.onAction('specimen');
}
function showHelp() { if(features){features.guide();return;} showDialog('Привет, я Жужа!',`<div class="help-bee">${beeArt()}</div><p class="dialog-intro">Давайте вырастим что-нибудь хорошее. Здесь не нужно торопиться.</p><ol class="help-steps"><li><span>01</span><div><h3>Выберите свой росток</h3><p>Любое первое растение — бесплатно. В саду можно собрать все ${game.CATALOG.length} видов.</p></div></li><li><span>02</span><div><h3>Подарите ему заботу</h3><p>Поливайте, когда влага опустится до 70%. Воду можно бесплатно набрать в колодце раз в 30 минут.</p></div></li><li><span>03</span><div><h3>Наблюдайте за маленьким чудом</h3><p>Взрослые растения приносят монеты. Рост продолжается после закрытия — учитываются первые 24 часа отсутствия.</p></div></li></ol><button class="button primary full" data-action="${state.plants.length?'close':'browse'}">${state.plants.length?'Вернуться в сад':'Выбрать первый росток'} ${icon('arrow',18)}</button>`,'help'); }
function showAbout() { if(features){features.showStory();return;} showDialog('Из тетради — в живой сад',`<div class="about-art">${gardenArt()}</div><span class="story-badge">ШКОЛЬНАЯ ИДЕЯ, КОТОРАЯ ВЫРОСЛА</span><h3 class="about-title">Проект учениц 8-И класса<br>школы № 1430</h3><p>Всё началось с бумажных эскизов: коллекции горшков и ростка, за которым помогает ухаживать пчела Жужа. Идея проста — наблюдать, заботиться и постепенно собирать свой сад.</p><p>Веб-версия продолжает эту историю на телефонах, планшетах и компьютерах. Растения нарисованы кодом, а все маленькие достижения сохраняются на вашем устройстве.</p><div class="gentle-note">${icon('heart',21)}<p>Без рекламы и покупок за реальные деньги. Сроки роста и правила ухода условные: это художественная игра.</p></div>`,'about'); }
const quietOptions={frame:'garden',minutes:0};
let quietTimer;
function showQuiet() {
  const chosen=state.plants.find(plant=>plant.id===quietOptions.frame);
  const frames=[['garden','Весь сад'],...state.plants.map(plant=>[plant.id,plantDisplayName(plant)])];
  const artwork=chosen ? features.image(chosen,{id:'quiet-plant'}) : gardenArt({plants:state.plants});
  showDialog('Минутка тишины',`<div class="quiet-scene">${artwork}<div class="quiet-bee">${beeArt()}</div></div>
    <form id="quiet-controls"><label class="field"><span>Кадр</span><select name="frame">${frames.map(([id,label])=>`<option value="${esc(id)}"${id===quietOptions.frame?' selected':''}>${esc(label)}</option>`).join('')}</select></label>
    <label class="field"><span>Время наблюдения</span><select name="minutes">${[[0,'Свободно'],[1,'1 мин'],[3,'3 мин'],[5,'5 мин']].map(([value,label])=>`<option value="${value}"${value===quietOptions.minutes?' selected':''}>${label}</option>`).join('')}</select></label><button class="button secondary">Применить</button></form>
    <p id="quiet-status" class="quiet-caption" role="status">Можно просто понаблюдать.</p><button class="button secondary" data-action="close">Вернуться к заботам ${icon('arrow',17)}</button>`,'quiet',true);
  dialog.classList.add('quiet-dialog');
  clearTimeout(quietTimer);
  if (quietOptions.minutes) {
    $('#quiet-status').textContent=`Сеанс на ${quietOptions.minutes} мин начался.`;
    quietTimer=setTimeout(()=>{
      if(dialogKind==='quiet')$('#quiet-status').textContent='Сеанс завершён. Можно остаться в саду.';
    },quietOptions.minutes*60000);
  }
  $('#quiet-controls').addEventListener('submit',event=>{
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    quietOptions.frame=String(fields.get('frame'));
    quietOptions.minutes=Number(fields.get('minutes'));
    showQuiet();
  });
}
async function photo(id) {
 const p=state.plants.find(p=>p.id===id);if(!p)return;
 const svg=plantArt(p.speciesId,{id:'photo',growth:p.growth,pot:prefs.pot});
 const img=new Image(), url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try {
 await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#f0f1e6';ctx.fillRect(0,0,1080,1350);ctx.drawImage(img,100,100,880,990);
 ctx.textAlign='center';ctx.fillStyle='#214e3b';ctx.font='56px Georgia';ctx.fillText(species(p.speciesId).name,540,1160);ctx.font='24px Georgia';ctx.fillText('flora keep · '+date(Date.now()),540,1220);
 const blob=await new Promise(r=>canvas.toBlob(r,'image/png'));if(!blob)throw new Error();download(blob,`flora-keep-${p.speciesId}.png`);toast('Открытка сохранена. Маленькое чудо можно оставить себе.');
 }catch{toast('Не получилось сохранить открытку в этом браузере.');}finally{URL.revokeObjectURL(url);}
}
function download(blob,name) {const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function downloadEmergencyCopy() {
  const date = new Date().toISOString().slice(0,10);
  download(new Blob([JSON.stringify(payload())], {type:'application/json'}), `flora-emergency-${date}.json`);
}
function restoreGarden(incoming) {
  checkpoint('Перед восстановлением', true);
  const previous = {state, prefs, journal, extras};
  const now = Date.now();
  state = game.advance(incoming.state, now);
  prefs = incoming.prefs;
  journal = [...incoming.journal];
  extras = structuredClone(incoming.extras || featureModule.defaultExtras());
  recordStateTransition(incoming.state, now);
  log('Сад восстановлен из резервной копии.', 'upload');
  if (!save()) {
    ({state, prefs, journal, extras} = previous);
    updateSaveStatus();
    toast('Восстановление не записалось. Откройте другую копию или освободите место в браузере.');
    return false;
  }
  closeDialog();
  music();
  navigate('garden');
  toast('Сад восстановлен и записан.');
  return true;
}
async function importFile(file) {
 if(features)return features.importFile(file);
 if(!file)return;
 if(file.size>2*1024*1024){toast('Файл слишком большой. Выберите копию сада до 2 МБ.');return;}
 try {
 const parsed=unpack(await file.text());
 if(!parsed){toast('Файл не похож на исправную копию веб-сада. Ваш сад не изменён.');return;}
 importPending=parsed;
 showDialog('Восстановить этот сад?',`<div class="restore-preview">${icon('garden',42)}<h3>${parsed.state.plants.length} растений · ${parsed.state.discovered.length} видов</h3><p>${num(parsed.state.coins)} монет и ${parsed.state.water} порций воды</p></div><p>Этот сад заменит текущий на этом устройстве. Сохраните свою копию, если хотите вернуться к нему позже.</p><div class="backup-actions"><button class="button secondary" data-action="export">Скачать текущий сад</button><button class="button primary" data-action="restore">Восстановить</button></div><button class="text-button cancel-restore" data-action="settings">Отмена, оставить мой сад</button>`,'restore');
 }catch{toast('Не удалось прочитать файл. Ваш сад не изменён.');}
}
function handleAction(button) {
 const {action,id,value}=button.dataset;
 if(action==='close')closeDialog();
 else if(action==='browse')navigate('catalog');
 else if(action==='sill-select'||action==='sill-page'||action==='sill-seed')selectSill(id,button,action==='sill-seed');
 else if(action==='sill-collection')$('#garden-collection')?.focus();
 else if(action==='preview'){showPreview(id);features?.onAction('preview');}
 else if(action==='plant') {
 const first=!state.discovered.length&&!state.plants.length,newSpecies=!state.discovered.includes(id),plantingOrigin=button.getBoundingClientRect();
 const funded=extras.creative?{...state,coins:Math.max(state.coins,game.price(state,id)||0)}:state;
 let result=game.plant(funded,id,Date.now());
 if (extras.creative) result = {...result,state:{...result.state,coins:state.coins}};
 if(first&&result.success)result.state={...result.state,plants:result.state.plants.map(p=>p.id===result.state.selectedPlantId?{...p,moisture:55}:p)};
 if(result.success)extras.layout.sillPlantId=result.state.selectedPlantId;
 const onSill=button.dataset.onSill==='true';
 if(!onSill)closeDialog();
 if(apply(result,'garden','plant')) {
   features?.onAction('plant');
   if(onSill)focusSillResult('planted');
   else {navigate('garden');showPlant(state.selectedPlantId);features?.animatePlanting?.(plantingOrigin,id,newSpecies);}
 }
 }
 else if(action==='plant-detail'){const source=button.closest('.plant-card')?.querySelector('.plant-visual>svg')?.getBoundingClientRect();showPlant(id);features?.animateCareTransition?.(source);}
 else if(action==='water'){
   const onSill=button.dataset.onSill==='true';
   if(onSill&&state.plants.some(plant=>plant.id===id))extras.layout.sillPlantId=id;
   const ok=apply(game.water(state,id,Date.now()),'water','water');
   features?.onAction('water',ok);
   if(onSill&&ok)focusSillResult('watered');
 }
 else if(action==='water-all')apply(game.waterAll(state,Date.now()),'water','water');
 else if(action==='fertilize'||action==='super-fertilize')apply(game.fertilize(state,id,action==='super-fertilize',Date.now()),'spark');
 else if(action==='collect')apply(game.collect(state,Date.now()),'coin','coins');
 else if(action==='well')apply(game.drawWater(state,Date.now()),'cloud','water');
 else if(action==='buy')apply(game.buy(state,id,1),'coin');
 else if(action==='supplies')showSupplies();
 else if(action==='settings')showSettings();
 else if(action==='help')showHelp();
 else if(action==='about')showAbout();
 else if(action==='specimen')showSpecimen(id);
 else if(action==='cyan-species')selectHerbariumSpecies(id,null,true);
 else if(action==='quiet')showQuiet();
 else if(action==='photo')features?features.showStudio(id):photo(id);
 else if(action==='toggle-sidebar'){extras.layout.sidebarCollapsed=!extras.layout.sidebarCollapsed;save();render();}
 else if(action==='collection-view'&&['grid','list','compact'].includes(value)){extras.layout.collectionView=value;save();render();}
 else if(action==='favorite'&&state.plants.some(p=>p.id===id)){const ids=extras.layout.favorites;extras.layout.favorites=ids.includes(id)?ids.filter(x=>x!==id):[...ids,id].slice(-100);save();render();}
 else if(action==='filter'){filter=value;render();}
 else if(action==='clear-search'){filter='all';query='';render();$('#search')?.focus();}
 else if(action==='sound'){prefs.sounds=!prefs.sounds;save();render();if(prefs.sounds)sound('water');toast(prefs.sounds?'Звуки сада включены':'Звуки сада выключены');}
 else if(action==='pot'){prefs.pot=value;save();render();showSettings();}
 else if(action==='export'&&features){features.exportBackup();}
 else if(action==='emergency-export')downloadEmergencyCopy();
 else if(action==='export'){download(new Blob([JSON.stringify(payload(),null,2)],{type:'application/json'}),`flora-keep-${new Date().toISOString().slice(0,10)}.json`);toast('Копия сада сохранена в файл.');}
 else if(action==='import')$('#import-file').click();
 else if(action==='restore'&&importPending)restoreGarden(importPending);
 else if(action==='remove-ask') {const p=state.plants.find(p=>p.id===id);if(!p)return;showDialog('Освободить место в саду?',`<p>Растение «${species(p.speciesId).name}» будет удалено вместе с его несобранным доходом. Открытый вид и исследования останутся в гербарии.</p><div class="backup-actions"><button class="button secondary" data-action="plant-detail" data-id="${id}">Оставить растение</button><button class="button danger" data-action="remove" data-id="${id}">Убрать из сада</button></div>`,'remove');}
 else if(action==='remove'){const result=game.remove(state,id);closeDialog();apply(result);}
 else if(action==='install'&&deferredInstall){deferredInstall.prompt();deferredInstall=null;showSettings();}
}
const mutations=new Set(['plant','water','water-all','fertilize','super-fertilize','collect','well','buy','pot','sound','restore','remove','plant-detail','toggle-sidebar','collection-view','favorite','sill-select','sill-page']);
document.addEventListener('click',e=>{if(e.target.closest('.skip-link')){e.preventDefault();$('#main').focus();return;}const button=e.target.closest('[data-action]');if(!button||button.disabled)return;if(mutations.has(button.dataset.action))exclusive(()=>{syncLatest();handleAction(button);});else handleAction(button);});
document.addEventListener('input',e=>{if(e.target.id==='search'){query=e.target.value;features?.enhanceCatalog();floraLocale.apply($('#catalog-results'));}});
document.addEventListener('change',e=>{
 if(e.target.id==='sill-quick-pick'){const selected=e.target.value;exclusive(()=>{syncLatest();selectSill(selected,e.target);});}
 if(e.target.id==='cyan-species')selectHerbariumSpecies(e.target.value);
 if(e.target.id==='cyan-plant')selectHerbariumSpecies(e.target.dataset.species,e.target.value);
 if(e.target.id==='sort'){sort=e.target.value;render();$('#sort')?.focus();}
 if(e.target.dataset.pref){const key=e.target.dataset.pref,checked=e.target.checked;exclusive(()=>{syncLatest();prefs[key]=checked;if(key==='calm')extras.delights.motion=checked?'still':extras.delights.motion==='still'?'smooth':extras.delights.motion;save();document.documentElement.classList.toggle('calm',prefs.calm);if(key==='music')music();if(key==='sounds')sound('water');render();});}
 if(e.target.id==='import-file')importFile(e.target.files[0]);
});
window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;if(!syncLatest())return;render();refreshDialog();if(!prefs.music)audioMusic?.pause();});
function tick() {
 if(document.hidden)return;
 return exclusive(()=>{
 syncLatest();
 const before = state, previousJournal = journal, now = Date.now();
 state = game.advance(state, now);
 recordStateTransition(before, now, true);
 const historyChanged=featureModule.recordHistory(extras,state,now);
 if (before.plants.length) backgroundDirty=true;
 if (historyChanged || journal!==previousJournal || saveProblem || backgroundDirty&&now-extras.lastSavedAt>=autoSaveInterval) save();
 refreshDialog();
 const oldAtmosphere=['light','season','weather','scene'].map(k=>document.documentElement.dataset[k]).join('|');features?.applyAtmosphere();
 const atmosphereChanged=oldAtmosphere!==['light','season','weather','scene'].map(k=>document.documentElement.dataset[k]).join('|');
 if (atmosphereChanged || page === 'journal' && previousJournal !== journal) render();
 else if (!dialog.open && page === 'garden') refreshLiveGarden();
 });
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    audioMusic?.pause();
    sceneAudio.suspend();
    if(backgroundDirty)void exclusive(()=>{if(!syncLatest()&&backgroundDirty)save();});
  }else{
    tick();
    if(prefs.music||extras.workbench?.soundscape!=='off')music();
  }
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
function checkpoints(){try{const list=JSON.parse(localStorage.getItem(KEY+'-snapshots')||'[]');return Array.isArray(list)?list.filter(s=>s&&typeof s.id==='string'&&Number.isSafeInteger(s.at)&&unpack(JSON.stringify(s.payload))).slice(0,6):[];}catch{return [];}}
function checkpoint(label='Автоматическая копия',force=false){
 try{const rows=checkpoints();if(!force&&rows.length&&Date.now()-rows[0].at<5*60000)return;const item={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),at:Date.now(),label,payload:payload()};let list=[item,...rows].slice(0,6);while(list.length){try{localStorage.setItem(KEY+'-snapshots',JSON.stringify(list));return;}catch{list.pop();}}}catch{}
}
function newLocalId() {
  return globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}
function readProfileIndex() {
  try {
    const rows = JSON.parse(localStorage.getItem(PROFILE_INDEX) || '[]');
    return (Array.isArray(rows) ? rows : []).filter(row =>
      row && /^garden-[a-zA-Z0-9_-]{1,70}$/.test(row.id) && typeof row.name === 'string'
    ).map(row => ({id:row.id, name:row.name.slice(0,60), demo:row.demo===true, creative:row.creative===true, removed:row.removed===true})).slice(0,7);
  } catch { return []; }
}
function listProfiles(includeRemoved=false) {
  return [{id:'main',name:'Мой основной сад',demo:false}, ...readProfileIndex().filter(row => includeRemoved || !row.removed)];
}
function switchProfile(id, flushed=false) {
  if (!flushed && features?.flushExperiences) {
    return features.flushExperiences().then(() => switchProfile(id,true))
      .catch(() => { toast('Скачайте копию текущего сада перед переходом.'); return false; });
  }
  if (!listProfiles().some(row => row.id === id)) return false;
  if (!save()) return false;
  try {
    localStorage.setItem(BASE_KEY+'-selected-profile', id);
    location.reload();
    return true;
  } catch {
    toast('Браузер не разрешает переключить профиль.');
    return false;
  }
}
function profileDocument(name, mode) {
  const now = Date.now();
  const extras = featureModule.defaultExtras();
  extras.gardenName = name;
  extras.demo = mode === true;
  extras.creative = mode === 'creative';
  let state = game.initialState(now);
  if (extras.creative) state.coins = 100000;
  if (extras.demo) {
    state.coins = 20000;
    for (const [index, species] of game.CATALOG.slice(0,8).entries()) {
      state = game.plant(state, species.id, now).state;
      const plant = state.plants.at(-1);
      Object.assign(plant, {growth:[1,.65,.12,.9][index%4],moisture:55+index*5,earned:index*25});
    }
  }
  featureModule.recordHistory(extras, state, now);
  return {format:'FloraKeepWeb', version:1, savedAt:now, game:state, prefs:{...defaultPrefs}, journal:[], extras};
}
function writeNewProfiles(records) {
  const rows = readProfileIndex();
  if (rows.length + records.length > 7) throw new Error('В хранилище доступно до восьми профилей с учётом корзины.');
  const added = records.map(({name,data}) => ({
    id:'garden-'+newLocalId(), name, demo:data.extras?.demo===true, creative:data.extras?.creative===true, data,
  }));
  const written = [];
  try {
    for (const row of added) {
      localStorage.setItem(profileKey(row.id), JSON.stringify(row.data));
      written.push(row.id);
    }
    localStorage.setItem(PROFILE_INDEX, JSON.stringify([...rows,...added.map(({data,...row}) => row)]));
  } catch (error) {
    for (const id of written) {
      try { localStorage.removeItem(profileKey(id)); } catch {}
    }
    throw error;
  }
  return added;
}
async function createProfile(name, demo=false) {
  try {
    await features?.flushExperiences?.();
    if (!save()) return false;
    const title = String(name).trim().slice(0,60) || 'Новый сад';
    const [created] = writeNewProfiles([{name:title,data:profileDocument(title,demo)}]);
    return switchProfile(created.id,true);
  } catch(error) {
    toast(error?.name==='QuotaExceededError'?'Для нового профиля не хватает места в браузере.':error.message);
    return false;
  }
}
function updateProfile(id, patch) {
  const rows = readProfileIndex();
  const profile = rows.find(row => row.id === id);
  if (!profile || patch.removed && id === profileId) return false;
  localStorage.setItem(PROFILE_INDEX, JSON.stringify(rows.map(row => row.id===id ? {...row,...patch} : row)));
  return true;
}
async function openTrialProfile(data) {
  const parsed = unpack(JSON.stringify(data));
  if (!parsed) throw new Error('Копия сада не прошла проверку.');
  await features?.flushExperiences?.();
  if (!save()) return false;
  const name = ('Проверка · '+parsed.extras.gardenName).slice(0,60);
  const [created] = writeNewProfiles([{name,data:{...data,extras:{...parsed.extras,gardenName:name}}}]);
  return switchProfile(created.id, true);
}
async function exportProfiles() {
  await features?.flushExperiences?.();
  const profiles = listProfiles().map(row => {
    const raw = row.id===profileId ? JSON.stringify(payload()) : localStorage.getItem(profileKey(row.id));
    return unpack(raw) ? {name:row.name,data:JSON.parse(raw)} : null;
  }).filter(Boolean);
  download(new Blob([JSON.stringify({format:'FloraKeepProfiles',version:1,profiles})], {type:'application/json'}), 'flora-keep-profiles.json');
}
async function importProfiles(file) {
  if (!file || file.size > 12*1024*1024) throw new Error('Выберите архив профилей до 12 МБ.');
  const archive = JSON.parse(await file.text());
  if (archive?.format!=='FloraKeepProfiles' || archive.version!==1 || !Array.isArray(archive.profiles) || !archive.profiles.length || archive.profiles.length>8) throw new Error('Это не архив профилей Flora Keep.');
  const rows = archive.profiles.map(row => {
    const parsed = unpack(JSON.stringify(row?.data));
    if (!parsed) throw new Error('Один из профилей повреждён. Архив не загружен.');
    const name = (typeof row.name === 'string' ? row.name.trim().slice(0,60) : '') || parsed.extras.gardenName;
    const data = {format:'FloraKeepWeb',version:1,savedAt:Date.now(),game:parsed.state,prefs:parsed.prefs,journal:parsed.journal,extras:parsed.extras};
    return {name,data};
  });
  // An empty main profile can hold the eighth profile from a complete archive.
  const useMain = rows.length === 8 && profileId === 'main' && !state.plants.length && !journal.length && readProfileIndex().length === 0;
  if (!useMain) return writeNewProfiles(rows).length;
  const main = rows.shift();
  const previous = localStorage.getItem(BASE_KEY);
  try {
    localStorage.setItem(BASE_KEY, JSON.stringify(main.data));
    const added = writeNewProfiles(rows);
    syncLatest();
    render();
    return added.length + 1;
  } catch (error) {
    try {
      if (previous === null) localStorage.removeItem(BASE_KEY);
      else localStorage.setItem(BASE_KEY, previous);
    } catch {}
    throw error;
  }
}
async function commit(mutator, message) {
  return exclusive(() => {
    syncLatest();
    checkpoint();
    const previous = state;
    const patch = mutator({state,prefs,extras,journal});
    if (patch?.state) state = patch.state;
    if (patch?.prefs) prefs = patch.prefs;
    if (patch?.extras) extras = patch.extras;
    if (patch?.journal) journal = patch.journal;
    extras = featureModule.normalizeExtras(pruneExtrasForPlants(extras,state.plants),game.CATALOG);
    const now = Date.now();
    if (previous !== state) recordStateTransition(previous,now);
    featureModule.recordHistory(extras,state,now,true);
    const stored = save();
    render();
    if (message && stored) toast(message);
    if (!stored) throw new Error('Запись в браузере не удалась. Скачайте аварийную копию.');
    return patch;
  });
}
function incomeReady() {
  return Math.floor(state.plants.reduce((sum,plant)=>sum+plant.earned,0));
}
function incomeInfo(daily,ready=incomeReady()) {
  return {ready,amount:ready?num(ready):(daily||dailyCareState()).care};
}
function incomeStatMarkup({ready,amount} = incomeInfo()) {
  return `<div class="stat-icon sand">${icon(ready?'coin':'heart',23)}</div><div><span>${ready?'Доход вашего сада':'Забота сегодня'}</span><strong><span data-income-amount>${amount}</span><small>${ready?'монет к сбору':'добрых действий'}</small></strong></div>${ready?'<button class="mini-button" data-action="collect" aria-label="Собрать доход">'+icon('arrow')+'</button>':''}`;
}
function updateGardenCard(card, plant) {
  const values = [plant.moisture, plant.growth * 100, plant.health];
  gardenDesign.refreshReadings(card.querySelector('[data-compact-values]'),plant);
  gardenDesign.refreshRibbon(card.querySelector('[data-growth-stage]'),plant.growth);
  if(card.querySelector('.plant-details[open]'))refreshCardHistory(card);
  card.querySelectorAll('.plant-meters span').forEach((element, index) => {
    const value = ' ' + Math.round(values[index]) + '%';
    const label = element.lastChild;
    if (label?.nodeType === 3 && label.data !== value) label.data = value;
  });
  const bar = card.querySelector('.growth-track i');
  const growthWidth=values[1].toFixed(2)+'%';
  if(bar&&bar.style.width!==growthWidth)bar.style.width=growthWidth;
  const stage = gardenCardArtKey(plant);
  if (stage !== card.dataset.artStage) {
    const illustration = card.querySelector('.plant-visual > svg');
    if (illustration) illustration.outerHTML = features.image(plant);
    card.dataset.artStage = stage;
  }
  const status = plantStatus(plant);
  const tag = card.querySelector('.plant-tag');
  const thirsty = game.needsWater(plant);
  if (tag && (tag.dataset.plantStatus !== status || tag.classList.contains('needs-water') !== thirsty)) {
    tag.dataset.plantStatus=status;
    tag.classList.toggle('needs-water', thirsty);
    tag.innerHTML = (thirsty ? icon('water', 12) + ' ' : '') + status;
    return true;
  }
  return false;
}
function refreshCardHistory(card) {
  const id=card?.dataset.plantId,plot=card?.querySelector('.card-history-plot');
  if(!id||!plot)return;
  const rows=extras.history[id]||[];
  const now=Date.now();
  const key=[rows.length,rows.at(-1)?.at,journal[0]?.at,Math.floor(now/(5*60000))].join('|');
  if(plot.dataset.historyKey===key)return;
  plot.dataset.historyKey=key;
  plot.innerHTML=gardenDesign.moistureChart(rows,journal,id,now);
}
document.addEventListener('toggle',event=>{
  const target=event.target;
  if(target.open&&target.matches?.('.plant-details'))refreshCardHistory(target.closest('[data-plant-id]'));
},true);
function refreshThirstyBadge(count) {
  const tab=$('.garden-toolbar [data-value="thirsty"]');
  const badge=tab?.querySelector('[data-water-count]');
  if (badge && !count) badge.remove();
  else if(badge&&badge.textContent!==String(count))badge.textContent=count;
  else if (count&&!badge) tab?.insertAdjacentHTML('afterbegin',`<span data-water-count>${count}</span> `);
  const meter=tab?.querySelector('[data-water-share]');
  const share=String(gardenDesign.filterRatio(count,state.plants.length));
  if(meter&&meter.dataset.share!==share){
    meter.dataset.share=share;
    meter.style.setProperty('--water-share',share+'%');
  }
  const description=tab?.querySelector('[data-water-description]');
  const label=`Из ${state.plants.length} растений ждут полива ${count}.`;
  if(description&&description.textContent!==label)description.textContent=label;
}
function refreshGardenCollection(thirsty) {
  const grid = $('[data-collection-view]');
  if (!grid) return false;
  refreshThirstyBadge(thirsty);
  const plants = visibleGardenPlants();
  const currentCards = new Map([...grid.querySelectorAll('[data-plant-id]')].map(card => [card.dataset.plantId, card]));
  if (!plants.length) {
    if(grid.querySelector('.empty-inline'))return false;
    grid.innerHTML=emptyGardenFilter();
    return true;
  }
  const currentIds = new Set(plants.map(plant => plant.id));
  grid.querySelector('.empty-inline')?.remove();
  for (const [id, card] of currentCards) if (!currentIds.has(id)) card.remove();
  let inserted=false, changed=false;
  for (const [index, plant] of plants.entries()) {
    const card = currentCards.get(plant.id);
    const reference = grid.children[index];
    if (!card) {
      if (reference) reference.insertAdjacentHTML('beforebegin', gardenCard(plant,index<galleryArtLimit));
      else grid.insertAdjacentHTML('beforeend', gardenCard(plant,index<galleryArtLimit));
      inserted=true;
    } else {
      if (card !== reference) grid.insertBefore(card, reference || null);
      changed=updateGardenCard(card,plant)||changed;
    }
  }
  if(inserted)watchDeferredArt();
  return inserted||changed;
}
function refreshLiveGarden() {
  const active = document.activeElement;
  const focus = captureFocus(app);
  const thirsty=state.plants.filter(game.needsWater);
  const ready=incomeReady();
  const welcome=welcomeView();
  const welcomeElement=$('.garden-welcome');
  let translatedContentChanged=false;
  if(welcomeElement&&welcomeElement.dataset.welcomeKey!==welcome.key&&active?.id!=='sill-quick-pick'){
    welcomeElement.outerHTML=windowsill.markup(welcome);
    translatedContentChanged=true;
  }
  const nextCare=$('.next-care-card');
  if(nextCare){
    const next=nextCareView();
    if(nextCare.dataset.nextCareKey!==next?.key){nextCare.outerHTML=nextCareCard(next);translatedContentChanged=true;}
  }
  const queue=careQueueView(thirsty),queueElement=$('.care-queue');
  if(queueElement&&queueElement.dataset.queueKey!==queue.key){
    queueElement.outerHTML=careQueueMarkup(queue);
    translatedContentChanged=true;
  }else if(!queueElement&&queue.rows.length){
    $('.garden-collection')?.insertAdjacentHTML('afterbegin',careQueueMarkup(queue));
    translatedContentChanged=true;
  }
  const dailyState=dailyCareState(thirsty.length);
  const daily = $('.daily-bloom');
  if(daily&&daily.dataset.careKey!==dailyState.key){
    daily.outerHTML=dailyCareMarkup(dailyState);
    translatedContentChanged=true;
  }
  translatedContentChanged=refreshGardenCollection(thirsty.length)||translatedContentChanged;
  const stat = $('[data-income-stat]');
  const info = incomeInfo(dailyState,ready);
  if (stat) {
    if(Boolean(stat.querySelector('button'))===Boolean(info.ready)){
      const value=stat.querySelector('[data-income-amount]');
      if(value.textContent!==String(info.amount))value.textContent=info.amount;
    }else{
      stat.innerHTML=incomeStatMarkup(info);
      translatedContentChanged=true;
    }
  }
  if(translatedContentChanged)floraLocale.apply(app);
  if (focus && active !== document.activeElement && !restoreFocus(app, focus)) {
    ($('.garden-toolbar [aria-pressed="true"]') || $('#main'))?.focus({preventScroll:true});
  }
}
function tuneBackgroundDetail() {
  if(typeof globalThis.requestAnimationFrame!=='function' || prefs.calm || document.hidden)return;
  const gaps=[];
  let previous;
  const sample=now=>{
    if(previous!==undefined)gaps.push(now-previous);
    previous=now;
    if(gaps.length<24)globalThis.requestAnimationFrame(sample);
    else if(gaps.filter(gap=>gap>27).length>=8)document.documentElement.classList.add('low-background-detail');
  };
  globalThis.requestAnimationFrame(sample);
}
features=featureModule.createFeatures({game,art:{...art,plantArt},media,backup,exchange,knowledge,esc,icon,
 get state(){return state;},get prefs(){return extras.delights.motion==='still'&&!prefs.calm?{...prefs,calm:true}:prefs;},get extras(){return extras;},get journal(){return journal;},get page(){return page;},get catalogFilter(){return filter;},matchesCatalogSearch:species=>!query.trim()||gardenUpgrades.matchesSpecies(species,query),clearCatalogFilter:key=>{if(key==='query')query='';if(key==='category')filter='all';render();$('#search')?.focus();},get dialogKind(){return dialogKind;},get saveProblem(){return saveProblem;},get profileId(){return profileId;},get storageKey(){return KEY;},get errors(){return diagnosticErrors;},
 showDialog,closeDialog,showPlant,navigate,toast,download,music,save,render,payload,plantCost,downloadEmergencyCopy,flushMutations:()=>exclusive(()=>{}),checkpoint,checkpoints,listProfiles,switchProfile,createProfile,updateProfile,openTrialProfile,exportProfiles,importProfiles,commit,markUpdateRequested:()=>{updateRequested=true;},
 runGame:async(fn,kind='leaf',audio=null)=>exclusive(()=>{syncLatest();return apply(fn(state),kind,audio);}),
 inspectPayload:data=>unpack(JSON.stringify(data)),setPendingImport:parsed=>{importPending=parsed;},
});
setInterval(tick,30000);
const startupJournal=journal;
recordStateTransition(returnBefore, Date.now());
if(startupJournal!==journal) save();
mountIconSprite();
render();
tuneBackgroundDetail();
const openingRoute=routeFromHash();
if (openingRoute.speciesId) openLinkedSpecies(openingRoute);
else features.showReturn(returnBefore,state);
if(recovered)toast('Основное сохранение было повреждено. Сад восстановлен из предыдущей копии.');
if (!isFileMode && !isStandalone && ['http:', 'https:'].includes(location.protocol) && isSecureContext) {
  const manifest = document.createElement('link');
  manifest.rel = 'manifest'; manifest.href = './manifest.webmanifest'; document.head.append(manifest);
  if ('serviceWorker' in navigator) {
 let refreshing=false,hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',async()=>{
  const previouslyControlled=hadController;hadController=!!navigator.serviceWorker.controller;
  if(refreshing||(!previouslyControlled&&!updateRequested))return;
  refreshing=true;
  try{await features?.flushExperiences?.();if(!save()){refreshing=false;toast('Новая версия готова, но текущий сад не записан. Скачайте JSON-копию перед обновлением страницы.');return;}location.reload();}
  catch{refreshing=false;toast('Обновление ждёт сохранения изменений. Скачайте JSON-копию перед перезагрузкой.');}
 });
 navigator.serviceWorker.register('./sw.js').then(reg=>{if(reg.waiting)features.showUpdate();reg.addEventListener('updatefound',()=>{const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)features.showUpdate();});});}).catch(()=>{});
 }
}
