const terrarium = (() => {
/* A tiny garden in glass. Decorative compositions never spend game resources. */
const TERRA_SPECIES = ['daisy','lavender','sunflower','tulip','mint','cactus','rose','monstera','fern','orchid','aloe'];
const TERRA_VESSELS = ['jar','dome','bowl','drop','faceted','flask','sphere'];
const TERRA_SOILS = ['forest','sand','rose'];
const TERRA_KINDS = ['plant','moss','stone','path','wood','bridge','ladder','house','snail','butterfly'];
const TERRA_VESSEL_NAMES = [['jar','Банка с пробкой'],['dome','Стеклянный купол'],['bowl','Открытая чаша'],['drop','Стеклянная капля'],['faceted','Многогранник'],['flask','Ботаническая колба'],['sphere','Подвесная сфера']];
const TERRA_DECOR_NAMES = [['moss','Мох'],['stone','Камни'],['path','Дорожка'],['wood','Коряга'],['bridge','Мостик'],['ladder','Лестница'],['house','Домик'],['snail','Улитка'],['butterfly','Бабочка']];
const terraRecord = value => !!value && typeof value === 'object' && !Array.isArray(value);
const terraId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
const terraText = (value, fallback, max=60) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max) || fallback : fallback;
const terraChoice = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
const terraBound = (value,min,max,fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.min(max,Math.max(min,value)) : fallback;
const terraEsc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const terraNewId = () => 'terra-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const terraPlant = (id,speciesId,x,y,scale=1) => ({id,kind:'plant',speciesId,x,y,scale,rotation:0});
const terraDecor = (id,kind,x,y,scale=1,rotation=0) => ({id,kind,x,y,scale,rotation});
const TERRA_ITEM_LIMIT = 24;
const TERRA_SHELF_LIMIT = 6;
const TERRA_BRUSH_LIMIT = 16;
const TERRA_HISTORY_LIMIT = 40;
const TERRA_MOSS_TEXTURES = Object.freeze({
  dry:{name:'Сухой',base:'#9c9661',dot:'#aca570',tip:'#d4c995'},
  damp:{name:'Влажный',base:'#547b57',dot:'#72946c',tip:'#a8c5a0'},
  dense:{name:'Плотный',base:'#52743f',dot:'#6e914e',tip:'#a7bb75'},
});

function terrariumPreset(preset='forest',id='first-terrarium') {
  const common={id:terraId(id)?id:'first-terrarium',name:'Лесной уголок',vessel:'jar',soil:'forest',view:{angle:0,grid:false,fog:false},strokes:[],items:[]};
  if(preset==='shore')return {...common,name:'Тёплый берег',vessel:'bowl',soil:'sand',items:[terraDecor('sand-path','path',.49,.62,1.2,-15),terraPlant('shore-aloe','aloe',.38,.48,.8),terraPlant('shore-cactus','cactus',.66,.58,.62),terraDecor('shore-stone','stone',.22,.77,.9),terraDecor('shore-stones','stone',.77,.81,.65)]};
  if(preset==='bloom')return {...common,name:'Цветочный сон',vessel:'dome',soil:'rose',items:[terraDecor('bloom-moss','moss',.35,.57,1.4),terraPlant('bloom-lavender','lavender',.33,.48,.78),terraPlant('bloom-orchid','orchid',.62,.54,.8),terraDecor('bloom-path','path',.58,.87,.8,15),terraDecor('bloom-stone','stone',.23,.86,.65)]};
  return {...common,items:[terraDecor('forest-moss','moss',.47,.52,1.4),terraDecor('forest-log','wood',.7,.58,.85,-10),terraPlant('forest-fern','fern',.39,.47,.95),terraPlant('forest-mint','mint',.65,.57,.66),terraDecor('forest-stone','stone',.26,.83,.82),terraDecor('forest-path','path',.51,.83,.8,12)]};
}

function defaultTerrariumState() {
  return {version:1,draft:terrariumPreset(),saved:[],templates:[]};
}

function terraSpeciesSet(catalog) {
  const ids=Array.isArray(catalog)&&catalog.length?catalog.map(s=>typeof s==='string'?s:s?.id):TERRA_SPECIES;
  return new Set(ids.filter(id=>TERRA_SPECIES.includes(id)));
}

function normalizeScene(raw,allowed,fallbackId='terrarium') {
  if(!terraRecord(raw))return null;
  const items=[],seen=new Set();
  for(const item of (Array.isArray(raw.items)?raw.items:[]).slice(0,100)) {
    if(items.length>=TERRA_ITEM_LIMIT)break;
    if(!terraRecord(item)||!terraId(item.id)||seen.has(item.id)||!TERRA_KINDS.includes(item.kind))continue;
    if(item.kind==='plant'&&!allowed.has(item.speciesId))continue;
    seen.add(item.id);
    items.push({id:item.id,kind:item.kind,...(item.kind==='plant'?{speciesId:item.speciesId}:{}),x:terraBound(item.x,0,1,.5),y:terraBound(item.y,0,1,.55),scale:terraBound(item.scale,.45,1.45,1),rotation:terraBound(item.rotation,-35,35,0),layer:Math.round(terraBound(item.layer,-TERRA_ITEM_LIMIT,TERRA_ITEM_LIMIT,0))});
  }
  const view=raw.view;
  return {id:terraId(raw.id)?raw.id:fallbackId,name:terraText(raw.name,'Маленький мир'),vessel:terraChoice(raw.vessel,TERRA_VESSELS,'jar'),soil:terraChoice(raw.soil,TERRA_SOILS,'forest'),view:{angle:terraBound(view?.angle,-18,18,0),grid:view?.grid===true,snap:view?.snap===true,fog:view?.fog===true,wipes:normalizeTerraWipes(view?.wipes)},strokes:normalizeTerraStrokes(raw.strokes),items};
}

function normalizeTerraWipes(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.slice(-20).filter(Array.isArray).map(line=>line.slice(0,80)
    .filter(point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite))
    .map(([x,y])=>[terraBound(x,0,760,0),terraBound(y,0,620,0)])).filter(line=>line.length);
}

function normalizeTerraStrokes(raw){
 const out=[],seen=new Set();
 for(const line of (Array.isArray(raw)?raw:[]).slice(0,50)){
  if(out.length>=TERRA_BRUSH_LIMIT)break;
  if(!terraRecord(line)||!terraId(line.id)||seen.has(line.id)||!['moss','grass'].includes(line.kind))continue;
  const points=[];for(const p of (Array.isArray(line.points)?line.points:[]).slice(0,64)){if(!Array.isArray(p)||p.length<2||!p.slice(0,2).every(x=>typeof x==='number'&&Number.isFinite(x)))continue;points.push([Math.max(0,Math.min(1,p[0])),Math.max(0,Math.min(1,p[1]))]);}
  if(points.length){seen.add(line.id);out.push({id:line.id,kind:line.kind,points,width:terraBound(line.width,.5,2,1),opacity:terraBound(line.opacity,.15,1,1),...(line.kind==='moss'?{texture:terraChoice(line.texture,Object.keys(TERRA_MOSS_TEXTURES),'damp')}:{})});}
 }
 return out;
}
function addTerrariumStroke(scene,kind,points,id=terraNewId(),brushStyle={}){
 const clean=normalizeScene(scene,terraSpeciesSet([]));if(!clean||clean.strokes.length>=TERRA_BRUSH_LIMIT)return clean;
 const stroke=normalizeTerraStrokes([{id,kind,points,...brushStyle}])[0];if(!stroke||clean.strokes.some(s=>s.id===stroke.id))return clean;
 return {...clean,strokes:[...clean.strokes,stroke]};
}
function terraMossTuft(x,y,r,texture){
 const {base,dot,tip}=TERRA_MOSS_TEXTURES[texture]||TERRA_MOSS_TEXTURES.damp;
 return `<g transform="translate(${x} ${y})"><circle r="${r}" fill="${dot}"/>${texture==='dense'?`<ellipse cx="${r*.55}" cy="-2" rx="${r*.8}" ry="${r*.63}" fill="${base}"/>`:''}<path d="M-4 3l-2-6m2 6 4-9m-2 9 5-5" fill="none" stroke="${tip}" stroke-width="1.3" stroke-linecap="round"/>${texture==='damp'?'<circle cx="3" cy="-4" r="1.35" fill="#d7e8c9" opacity=".88"/>':''}</g>`;
}
function terraBrushMarkup(strokes){
 return strokes.map(line=>{
  const points=line.points.map(([x,y])=>[190+x*380,400+y*85]);
  if(line.kind==='moss'){
   const texture=line.texture||'damp',colors=TERRA_MOSS_TEXTURES[texture];
   const path=points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
   return `<g class="terra-brush-stroke terra-brush-moss" data-terra-stroke="${line.id}" data-terra-texture="${texture}" opacity="${line.opacity}"><path d="${path}" fill="none" stroke="${colors.base}" stroke-width="${20*line.width}" stroke-linecap="round" stroke-linejoin="round"/>${points.map(([x,y],i)=>terraMossTuft(x,y,(8+i%4)*line.width,texture)).join('')}</g>`;
  }
  return `<g class="terra-brush-stroke terra-brush-grass" data-terra-stroke="${line.id}" opacity="${line.opacity}">${points.map(([x,y],i)=>`<path class="terra-grass-growing" style="--blade-delay:${Math.min(i*.025,.5)}s" d="M${x-2} ${y+3}q-6-9-5-15m5 15q1-16 6-22m-5 22q5-9 10-10" fill="none" stroke="${i%2?'#76975c':'#95ab73'}" stroke-width="${2.2*line.width}" stroke-linecap="round"/>`).join('')}</g>`;
 }).join('');
}

function normalizeTerrariumState(raw,catalog=[]) {
  const allowed=terraSpeciesSet(catalog),base=defaultTerrariumState();
  if(!terraRecord(raw)||raw.version!==1)return {...base,draft:normalizeScene(base.draft,allowed)};
  const draft=normalizeScene(raw.draft,allowed,'first-terrarium')||normalizeScene(base.draft,allowed);
  function shelf(value) {
    const scenes=[],seen=new Set();
    for (const scene of (Array.isArray(value)?value:[]).slice(0,60)) {
      if (scenes.length>=TERRA_SHELF_LIMIT) break;
      if (!terraRecord(scene)||!terraId(scene.id)||seen.has(scene.id)) continue;
      const clean=normalizeScene(scene,allowed);
      if (clean) {
        seen.add(clean.id);
        scenes.push(clean);
      }
    }
    return scenes;
  }
  return {version:1,draft,saved:shelf(raw.saved),templates:shelf(raw.templates)};
}

function moveTerrariumItem(scene,id,changes={}) {
  const clean=normalizeScene(scene,terraSpeciesSet([]));
  if(!clean)return null;
  const safe=terraRecord(changes)?changes:{};
  return {...clean,items:clean.items.map(item=>item.id!==id?item:{...item,x:terraBound(safe.x,0,1,item.x),y:terraBound(safe.y,0,1,item.y),scale:terraBound(safe.scale,.45,1.45,item.scale),rotation:terraBound(safe.rotation,-35,35,item.rotation)})};
}

function addTerrariumItem(scene,kind,speciesId,{x=.5,y=.55,id=terraNewId()}={}) {
  const clean=normalizeScene(scene,terraSpeciesSet([]));
  if(!clean||clean.items.length>=TERRA_ITEM_LIMIT||!TERRA_KINDS.includes(kind)||!terraId(id)||clean.items.some(item=>item.id===id)||kind==='plant'&&!TERRA_SPECIES.includes(speciesId))return clean;
  return {...clean,items:[...clean.items,{id,kind,...(kind==='plant'?{speciesId}:{}),x:terraBound(x,0,1,.5),y:terraBound(y,0,1,.55),scale:kind==='plant'?.78:1,rotation:0}]};
}

function terraSortedItems(items) {
  return items.slice().sort((a,b)=>(a.layer||0)-(b.layer||0)||a.y-b.y);
}

function reorderTerrariumItems(scene,ids,toFront) {
  const selected=new Set(ids),ordered=terraSortedItems(scene.items);
  const moving=ordered.filter(item=>selected.has(item.id));
  const stationary=ordered.filter(item=>!selected.has(item.id));
  if(!moving.length||!stationary.length)return scene;
  const items=toFront?[...stationary,...moving]:[...moving,...stationary];
  return {...scene,items:items.map((item,index)=>({...item,layer:index}))};
}

function moveTerrariumItems(scene,ids,dx,dy,snap=false) {
  const selected=new Set(ids),moving=scene.items.filter(item=>selected.has(item.id));
  if(!moving.length||!Number.isFinite(dx)||!Number.isFinite(dy))return scene;
  const [anchor]=moving;
  if(snap) {
    dx=Math.round((anchor.x+dx)*10)/10-anchor.x;
    dy=Math.round((anchor.y+dy)*5)/5-anchor.y;
  }
  dx=terraBound(dx,-Math.min(...moving.map(item=>item.x)),1-Math.max(...moving.map(item=>item.x)),0);
  dy=terraBound(dy,-Math.min(...moving.map(item=>item.y)),1-Math.max(...moving.map(item=>item.y)),0);
  return {...scene,items:scene.items.map(item=>selected.has(item.id)
    ?{...item,x:terraBound(item.x+dx,0,1,item.x),y:terraBound(item.y+dy,0,1,item.y)}
    :item)};
}

function cloneTerrariumItem(scene,id,newId=terraNewId()) {
  const source=scene.items.find(item=>item.id===id);
  if(!source||!terraId(newId)||scene.items.length>=TERRA_ITEM_LIMIT||scene.items.some(item=>item.id===newId))return scene;
  const shiftedX=source.x>.95?source.x-.05:source.x+.05;
  return {...scene,items:[...scene.items,{...source,id:newId,x:shiftedX}]};
}

function exportTerrariumProject(scene,catalog=[]) {
  const draft=normalizeScene(scene,terraSpeciesSet(catalog));
  if(!draft)throw new Error('Композицию не удалось прочитать.');
  return JSON.stringify({format:'FloraKeepTerrarium',version:1,draft},null,2);
}

function importTerrariumProject(text,catalog=[],id=terraNewId()) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>256000)throw new Error('Файл флорариума должен быть меньше 256 КБ.');
  let data;
  try{data=JSON.parse(text);}catch{throw new Error('Файл флорариума повреждён.');}
  if(data?.format!=='FloraKeepTerrarium'||data.version!==1)throw new Error('Выберите редактируемый проект флорариума Flora Keep.');
  const draft=normalizeScene(data.draft,terraSpeciesSet(catalog));
  if(!draft||!terraId(id))throw new Error('В проекте нет композиции.');
  return {...draft,id};
}

const terraVesselPath = vessel => ({
  jar:'M271 114V157C185 181 132 259 142 354L157 496Q167 549 380 551Q593 549 603 496L618 354C628 259 575 181 489 157V114Z',
  dome:'M145 520V292C145 52 615 52 615 292V520Q380 576 145 520Z',
  bowl:'M125 260C110 418 183 540 380 548C577 540 650 418 635 260Q380 220 125 260Z',
  drop:'M380 85C335 158 144 228 144 386C144 494 235 553 380 553C525 553 616 494 616 386C616 228 425 158 380 85Z',
  faceted:'M380 91L568 184L631 387L571 524L380 552L189 524L129 387L192 184Z',
  flask:'M328 102H432V213L597 408Q630 450 599 502Q557 552 380 552Q203 552 161 502Q130 450 163 408L328 213Z',
  sphere:'M380 90C243 90 140 190 140 325C140 467 243 553 380 553C517 553 620 467 620 325C620 190 517 90 380 90Z'
})[vessel] || terraVesselPath('jar');
const terraPosition = item => ({x:190+item.x*380,y:400+item.y*85});
const terraLabel = (item,catalog) => item.kind==='plant'?(catalog.find(s=>s.id===item.speciesId)?.name||item.speciesId):TERRA_DECOR_NAMES.find(([kind])=>kind===item.kind)?.[1]||'Украшение';
const terraBounds = kind => ({plant:[-164,-258,328,266],moss:[-64,-31,126,53],stone:[-41,-27,86,49],path:[-33,-40,70,80],wood:[-63,-38,113,62],bridge:[-66,-55,132,70],ladder:[-29,-90,58,105],house:[-44,-99,88,111],snail:[-25,-26,58,38],butterfly:[-33,-54,66,61]})[kind];

function terraDecoration(item) {
  if(item.kind==='moss')return `<g class="terra-moss"><path d="M-60 2Q-64-13-48-18Q-40-30-24-23Q-9-34 5-24Q24-33 35-20Q54-22 57-6Q67 4 52 12Q34 22 11 15Q-8 24-26 13Q-49 20-60 2Z" fill="#78935e"/><ellipse cx="-5" cy="-11" rx="37" ry="13" fill="#93aa72"/>${Array.from({length:27},(_,i)=>{const x=-49+(i*23%103),y=-16+(i*11%28);return `<path d="M${x} ${y+4}l-2-5m2 5l3-7m-3 7l5-2" stroke="${i%3?'#b4c58c':'#617e4d'}" stroke-width="1.7" stroke-linecap="round"/>`;}).join('')}</g>`;
  if(item.kind==='stone')return '<g><path d="M-34 5Q-31-17-15-20Q6-22 12 4Q-7 17-34 5" fill="#a7a99a"/><path d="M-3 9Q-4-13 15-18Q37-18 39 8Q19 22-3 9" fill="#c3c2ae"/><path d="M-27-3Q-20-12-12-10M7 0Q13-10 24-6" fill="none" stroke="#e4e3cf" stroke-width="2" stroke-linecap="round"/></g>';
  if(item.kind==='wood')return '<g><path d="M-54 6Q-22-12 7-7L41-27M-5-5L22 9M-29-5L-38-25" stroke="#887055" stroke-width="15" stroke-linecap="round" fill="none"/><path d="M-48 2Q-21-16 5-11L36-28" stroke="#baa283" stroke-width="3" stroke-linecap="round" fill="none"/></g>';
  if(item.kind==='bridge')return '<g class="terra-miniature"><path d="M-61 5Q0-47 61 5L61 12Q0-34-61 12Z" fill="#b79a70"/><path d="M-58-13Q0-61 58-13M-58-13V8M58-13V8M-29-29V-7M0-35V-15M29-29V-7" stroke="#8b7756" stroke-width="4" stroke-linecap="round"/><path d="M-43-7L-37 1M-23-19L-19-10M0-24V-15M23-19L19-10M43-7L37 1" stroke="#dbc6a1" stroke-width="3"/></g>';
  if(item.kind==='ladder')return '<g class="terra-miniature" transform="rotate(13 0 -35)"><path d="M-18 8V-82M18 8V-82" stroke="#8b7659" stroke-width="6" stroke-linecap="round"/><path d="M-18-5H18M-18-23H18M-18-41H18M-18-59H18M-18-77H18" stroke="#ccb590" stroke-width="5" stroke-linecap="round"/></g>';
  if(item.kind==='house')return '<g class="terra-miniature"><path d="M-31-51H31V6H-31Z" fill="#dfd0ac"/><path d="M-42-50L0-91L42-50Z" fill="#986f5b"/><path d="M-36-52L0-84L36-52" stroke="#ba9680" stroke-width="3" fill="none"/><path d="M-10 6V-18A10 10 0 0 1 10-18V6" fill="#728268"/><rect x="15" y="-38" width="10" height="13" rx="2" fill="#f5e8b2" stroke="#ac9972"/><path d="M20-38V-25M15-31H25" stroke="#ac9972"/><path d="M18-76V-91H27V-67" fill="#9e8265"/><circle cx="5" cy="-8" r="1.5" fill="#e6d3a6"/></g>';
  if(item.kind==='snail')return '<g class="terra-creature"><path d="M-20 5Q-8-4 15-1L25-13Q31-8 26 1Q23 10-20 9Z" fill="#b9bd8f"/><path d="M25-10L25-20M29-9L34-18" stroke="#87956b" stroke-width="1.8" stroke-linecap="round"/><circle cx="25" cy="-21" r="1.8" fill="#586744"/><circle cx="34" cy="-19" r="1.8" fill="#586744"/><circle cx="-5" cy="-8" r="16" fill="#c49e6e"/><path d="M-13-1C-27-22 14-32 8-5C5 7-13 4-12-7C-12-17 1-17 1-9Q1-4-4-6" stroke="#94734d" stroke-width="2" fill="none"/><path d="M-16-16Q-11-23-4-22" stroke="#ead0a4" stroke-width="2" stroke-linecap="round" fill="none"/></g>';
  if(item.kind==='butterfly')return '<g class="terra-creature terra-butterfly"><path d="M0-22C-35-59-40-13-9-11C-37-4-18 19 0-7C18 19 37-4 9-11C40-13 35-59 0-22Z" fill="#e0b887" stroke="#bc9165" stroke-width="1.2"/><path d="M-6-22Q-24-41-26-24M6-22Q24-41 26-24M-8-3L-17 1M8-3L17 1" stroke="#f6e5c2" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M0-29V-5M-1-27L-6-35M1-27L6-35" stroke="#6c7451" stroke-width="3" stroke-linecap="round"/></g>';
  return '<g fill="#d6cdb1" stroke="#b8b092" stroke-width="1"><ellipse cx="-14" cy="-29" rx="11" ry="5"/><ellipse cx="6" cy="-20" rx="12" ry="6"/><ellipse cx="-4" cy="-8" rx="15" ry="7"/><ellipse cx="15" cy="6" rx="16" ry="8"/><ellipse cx="-1" cy="21" rx="19" ry="9"/></g>';
}

const TERRA_GLASS=Object.freeze({
 jar:{edge:3.5,band:15,glint:4,tint:'#86aa9f',highlight:'M192 228Q146 334 177 444',light:'M575 223Q621 343 585 455'},
 dome:{edge:2.5,band:11,glint:3,tint:'#91aeab',highlight:'M172 241Q209 137 330 125',light:'M428 127Q549 150 591 242'},
 bowl:{edge:5,band:18,glint:4,tint:'#8eafa0',highlight:'M143 319Q165 431 226 486',light:'M504 481Q591 434 620 338'},
 drop:{edge:3,band:10,glint:3,tint:'#8caba5',highlight:'M350 151Q213 246 173 366',light:'M405 176Q546 245 586 357'},
 faceted:{edge:4.2,band:13,glint:4,tint:'#789f92',highlight:'M208 203L150 379L204 488',light:'M551 196L604 382L560 509'},
 flask:{edge:3.8,band:12,glint:3,tint:'#7ca69e',highlight:'M344 116V222L176 414',light:'M417 127V218L591 410'},
 sphere:{edge:2.4,band:20,glint:5,tint:'#8eaeb1',highlight:'M279 151Q173 215 172 322',light:'M535 182Q586 219 594 306'},
});

function terraOutlineFilter(prefix){
 return `<filter id="${prefix}selection" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="expanded"/><feComposite in="expanded" in2="SourceAlpha" operator="out" result="edge"/><feFlood flood-color="#285e52" result="ink"/><feComposite in="ink" in2="edge" operator="in" result="outline"/><feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}

function terraSoilCut(prefix,stones,roots){
 const grains=Array.from({length:29},(_,i)=>`<path d="M${130+17*i} ${486+i%5*3}l5 1" stroke="${i%2?'#8b6a49':'#f2dcac'}" stroke-opacity=".72" stroke-width="${1+i%2}"/>`).join('');
 return `<g class="terra-earth-layers"><g data-soil-layer="earth"><path d="M115 451Q380 401 645 451L642 491Q380 515 118 491Z" fill="url(#${prefix}earth)"/><path d="M115 453H645V492H115Z" fill="url(#${prefix}soil-grain)"/></g><g data-soil-layer="sand"><path d="M118 489Q380 510 642 489L634 521Q380 542 126 521Z" fill="#d7b990"/><path d="M120 490Q380 513 640 490" stroke="#edce9c" stroke-width="2" opacity=".72"/>${grains}</g><g data-soil-layer="drainage"><path d="M126 518Q380 538 634 518L610 554H150Z" fill="#857966"/>${stones}</g><g class="terra-roots" fill="none" stroke="#e2cf9f" stroke-width="1.5" stroke-linecap="round" opacity=".7">${roots}</g></g>`;
}

function terraDepthSVG(items,selected=new Set()){
 const bands=['#dce8dc','#e9ead5','#f3e4cc'];
 const dots=terraSortedItems(items).map(item=>{
  const depth=Math.min(2,Math.floor(item.y*3)),x=24+item.x*272,y=13+17*depth+(item.layer%3);
  const color=item.kind==='plant'?'#547c64':'#a6855e';
  return `<circle cx="${x}" cy="${y}" r="${selected.has(item.id)?4.6:3.1}" fill="${color}" stroke="${selected.has(item.id)?'#244e40':'#fffcf0'}" stroke-width="${selected.has(item.id)?1.8:1}"/>`;
 }).join('');
 return `<svg viewBox="0 0 320 60" role="img" aria-label="Схема глубины: задний, средний и передний планы">${bands.map((color,i)=>`<rect x="14" y="${5+17*i}" rx="4" width="292" height="16" fill="${color}"/>`).join('')}${dots}</svg>`;
}

function terraSnapCue({x,y}){
 if(!Number.isFinite(x)||!Number.isFinite(y))return '';
 const col=Math.round(x*10),row=Math.round(y*5),dots=[];
 for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
  if(col+dx<0||col+dx>10||row+dy<0||row+dy>5)continue;
  dots.push(`<circle cx="${190+(col+dx)*38}" cy="${400+(row+dy)*17}" r="${dx||dy?2:3.2}" fill="${dx||dy?'#f4fae5':'#f5c381'}" stroke="#315a49" stroke-width=".8"/>`);
 }
 return `<g class="terra-snap-points" aria-hidden="true" pointer-events="none">${dots.join('')}</g>`;
}

function terraSelection(item,interactive) {
  const [x,y,w,h]=terraBounds(item.kind);
  return `<g class="terra-selection" fill="none" stroke="#536d53" stroke-width="1.6">${[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([cx,cy])=>`<circle class="terra-resize-handle" ${interactive?'data-terra-resize="true"':''} cx="${cx}" cy="${cy}" r="6" fill="#fffdf4" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')}</g>`;
}

function renderTerrariumSVG(scene,{art,catalog=[],id='terrarium-art',selectedId='',selectedIds=[],interactive=false,ghost=null,landingId='',wipes,viewport,snapPoint}={}) {
  const clean=normalizeScene(scene,terraSpeciesSet(catalog))||defaultTerrariumState().draft;
  const prefix='fk-terrarium-'+String(id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)+'-';
  const path=terraVesselPath(clean.vessel),glass=TERRA_GLASS[clean.vessel],soil={forest:['#657d4c','#8da16b','#685443'],sand:['#d1bb8f','#ead7b0','#aa8966'],rose:['#8d8362','#b6aa83','#806356']}[clean.soil];
  const ghostItem=ghost&&TERRA_KINDS.includes(ghost.kind)?addTerrariumItem({...clean,items:[]},ghost.kind,ghost.speciesId,{id:'terra-placement-ghost',x:ghost.x,y:ghost.y}).items[0]:null;
 const visibleItems=ghostItem?[...clean.items,ghostItem]:clean.items;
 const plants=terraSortedItems(visibleItems).map(item=>{
    const pos=terraPosition(item),label=terraEsc(terraLabel(item,catalog)),selected=selectedId===item.id||selectedIds.includes(item.id),isGhost=item.id==='terra-placement-ghost';
    let drawing=terraDecoration(item);
    if(item.kind==='plant') {
      const svg=art?.plantArt?art.plantArt(item.speciesId,{id:prefix+item.id,variant:item.id,growth:1,pot:'clay'}):'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 360"><path d="M160 270V100M160 200Q75 195 95 125Q150 120 160 200M160 165Q235 150 225 85Q165 95 160 165" stroke="#547954" fill="#8ca873" stroke-width="7"/></svg>';
      const body=svg.replace(/^<svg[^>]*>/,'').replace(/<\/svg>\s*$/,'');
      drawing=`<svg x="-160" y="-254" width="320" height="254" viewBox="0 0 320 254" overflow="hidden">${body}</svg>`;
    }
    const shadowWidth=item.kind==='plant'?34:item.kind==='butterfly'?15:terraBounds(item.kind)[2]*.38;
    return `<g class="terra-object${selected?' is-selected':''}${isGhost?' terra-ghost':''}${landingId===item.id?' is-landing':''}" data-terra-item="${item.id}" data-terra-kind="${item.kind}" transform="translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})"${interactive&&!isGhost?` tabindex="0" role="button" aria-label="${label}: выбрать и переместить" aria-pressed="${selected}"`:''}><g transform="rotate(${item.rotation}) scale(${item.scale})"><ellipse class="terra-contact-shadow" cy="9" rx="${shadowWidth}" ry="7" fill="#3e4c30" opacity=".13"/><ellipse cy="8" rx="${shadowWidth*.65}" ry="3.5" fill="#3e4c30" opacity=".11"/><g class="terra-landing-visual"${selected&&interactive?` filter="url(#${prefix}selection)"`:''}>${drawing}</g>${selected&&interactive?terraSelection(item,interactive):''}</g>${interactive&&!isGhost?'<ellipse class="terra-hit" cy="-12" rx="36" ry="26" fill="transparent"/>':''}</g>`;
  }).join('');
  const roots=clean.items.filter(item=>item.kind==='plant').map(item=>{const x=terraPosition(item).x;return `<path d="M${x} 455q-10 24 3 48l-9 20m7-27l-20 12m22-30l16 13m-14 17l12 10"/>`;}).join('');
  const stones=Array.from({length:28},(_,i)=>`<ellipse cx="${154+i*17}" cy="${524+(i%3)*6}" rx="${7+i%4}" ry="${3+i%3}" fill="${['#b9ac8a','#d6c9a9','#918d73'][i%3]}"/>`).join('');
  const drops=[[182,300,3],[572,315,4],[550,384,2.5],[208,367,2],[589,420,3],[230,260,2.5],[522,253,2]].map(([x,y,r])=>`<g transform="translate(${x} ${y})"><path d="M0 ${-r*2}C${-r*2} 0 ${-r} ${r*2} 0 ${r*2}C${r*2} ${r*2} ${r*2} 0 0 ${-r*2}Z" fill="#f5fff8" fill-opacity=".58" stroke="#93b4a3" stroke-opacity=".45" stroke-width=".7"/><path d="M${-r*.5} 0v${r}" stroke="white" stroke-linecap="round"/></g>`).join('');
  const lid=clean.vessel==='jar'?'<path d="M270 108Q380 91 490 108V124Q380 140 270 124Z" fill="#bd9d75"/><ellipse cx="380" cy="108" rx="110" ry="17" fill="#d3b78d"/><path d="M283 112Q380 126 478 112" fill="none" stroke="#ead8b9" stroke-width="2"/>':clean.vessel==='dome'?'<ellipse cx="380" cy="548" rx="245" ry="19" fill="#b59977"/><rect x="136" y="525" width="488" height="21" rx="9" fill="#c3aa86"/><path d="M155 529H603" stroke="#dfccaa" stroke-width="2"/>':clean.vessel==='bowl'?'<ellipse cx="380" cy="260" rx="255" ry="30" fill="none" stroke="#bacfc0" stroke-width="5"/><path d="M145 249Q380 225 607 249" stroke="#fffef4" stroke-width="2" fill="none"/>':clean.vessel==='flask'?'<ellipse cx="380" cy="103" rx="54" ry="9" fill="#dce8dc" stroke="#9db9aa" stroke-width="3"/><path d="M342 117V209" stroke="white" stroke-opacity=".6" stroke-width="5"/>':clean.vessel==='sphere'?'<path d="M345 93L380 31L415 93" stroke="#b1a184" stroke-width="3"/><path d="M380 31V0" stroke="#98876d" stroke-width="3"/><ellipse cx="380" cy="92" rx="39" ry="10" fill="none" stroke="#b1c6b6" stroke-width="4"/>':'';
  const facets=clean.vessel==='faceted'?'<g stroke="#789985" stroke-width="2" stroke-opacity=".65" fill="none"><path d="M380 91V552M192 184L380 243L568 184M129 387L380 471L631 387M192 184L189 524M568 184L571 524"/></g>':'';
  const angle=clean.view.angle,worldTransform=`translate(380 445) skewX(${(angle*.18).toFixed(2)}) scale(${Math.cos(angle*Math.PI/180).toFixed(4)} 1) translate(-380 -445)`;
  const cue=interactive&&clean.view.snap&&snapPoint?terraSnapCue(snapPoint):'';
  const grid=interactive&&clean.view.grid?`<g class="terra-blueprint" pointer-events="none" fill="none" stroke="#647f77" stroke-opacity=".55" stroke-width=".8" stroke-dasharray="3 4">${Array.from({length:11},(_,i)=>`<path d="M${190+i*38} 384V493"/>`).join('')}${Array.from({length:6},(_,i)=>`<path d="M175 ${400+i*17}H585"/>`).join('')}<path d="M190 496H570" stroke-dasharray="none"/><g fill="#4f7066" stroke="none" font-family="sans-serif" font-size="9">${[0,25,50,75,100].map((n,i)=>`<text x="${190+i*95}" y="510" text-anchor="middle">${n}</text>`).join('')}</g></g>`:'';
  const clearLines=normalizeTerraWipes(wipes??clean.view.wipes).map(points=>points.slice(0,80).filter(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)).map(([x,y],i)=>`${i?'L':'M'}${Math.max(0,Math.min(760,x)).toFixed(1)} ${Math.max(0,Math.min(620,y)).toFixed(1)}`).join(' ')).filter(Boolean);
  const fogMask=interactive&&clean.view.fog?`<mask id="${prefix}wipe"><rect width="760" height="620" fill="white"/>${clearLines.map(d=>`<path d="${d}" stroke="black" stroke-width="76" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`).join('')}</mask>`:'';
  const fog=interactive&&clean.view.fog?`<path class="terra-wipe-fog" d="${path}" fill="#eef5e7" fill-opacity=".69" mask="url(#${prefix}wipe)" pointer-events="none"/>`:'';
  return `<svg class="terrarium-art" data-vessel="${clean.vessel}" xmlns="http://www.w3.org/2000/svg" viewBox="${viewport??'0 0 760 620'}" fill="none" role="${interactive?'group':'img'}" aria-label="${terraEsc(clean.name)} — декоративный флорариум"><title>${terraEsc(clean.name)}</title><defs><linearGradient id="${prefix}back" x2="1" y2="1"><stop stop-color="#f8f4e8"/><stop offset="1" stop-color="#e6eddb"/></linearGradient><linearGradient id="${prefix}glass" x2="1" y2=".4"><stop stop-color="#c4ded1" stop-opacity=".46"/><stop offset=".18" stop-color="#fafff5" stop-opacity=".1"/><stop offset=".65" stop-color="#ffffff" stop-opacity=".03"/><stop offset="1" stop-color="#afcbbb" stop-opacity=".48"/></linearGradient><linearGradient id="${prefix}earth" x2="0" y2="1"><stop stop-color="${soil[0]}"/><stop offset="1" stop-color="${soil[2]}"/></linearGradient><linearGradient id="${prefix}reflection" x2="1" y2="1"><stop stop-color="#fffdf1" stop-opacity=".8"/><stop offset="1" stop-color="#fffdf1" stop-opacity="0"/></linearGradient><clipPath id="${prefix}clip"><path d="${path}"/></clipPath>${interactive?terraOutlineFilter(prefix):''}${fogMask}<pattern id="${prefix}soil-grain" width="31" height="23" patternUnits="userSpaceOnUse"><circle cx="3" cy="5" r="1" fill="#e8d6ad" opacity=".36"/><circle cx="19" cy="16" r="1.3" fill="#342e21" opacity=".2"/><path d="M25 4l3 2" stroke="#d4c099" stroke-opacity=".3"/></pattern></defs><rect width="760" height="620" rx="28" fill="url(#${prefix}back)"/><circle cx="593" cy="132" r="77" fill="#f8e9b4" opacity=".45"/><path d="M564 56L303 558H385L655 176Z" fill="#fffdf2" opacity=".25"/><g fill="#a8b396" opacity=".36"><circle cx="103" cy="201" r="3"/><circle cx="637" cy="372" r="3"/><circle cx="166" cy="113" r="2"/></g><ellipse cx="380" cy="568" rx="264" ry="20" fill="#657354" opacity=".08"/><ellipse cx="380" cy="566" rx="216" ry="10" fill="#657354" opacity=".1"/><path d="${path}" fill="url(#${prefix}glass)" stroke="${glass.tint}" stroke-width="${glass.edge}"/><g clip-path="url(#${prefix}clip)"><g class="terra-world-space" transform="${worldTransform}">${terraSoilCut(prefix,stones,roots)}<ellipse cx="380" cy="445" rx="248" ry="49" fill="${soil[1]}"/><path d="M173 451Q330 416 562 444" stroke="${soil[0]}" stroke-opacity=".4" stroke-width="2" fill="none"/>${grid}${terraBrushMarkup(clean.strokes)}${cue}${plants}</g><g class="terra-glass-reflections" pointer-events="none"><path class="terra-refraction" d="${glass.highlight}" fill="none" stroke="url(#${prefix}reflection)" stroke-width="${glass.band}" stroke-linecap="round" opacity=".82"/><path d="${glass.light}" fill="none" stroke="#fffef5" stroke-width="${glass.glint}" stroke-linecap="round" opacity=".53"/><path d="M176 499Q380 567 584 499" stroke="#fafff4" stroke-width="3" opacity=".45"/><g class="terra-condensation">${drops}</g></g></g><path d="${path}" fill="none" stroke="${glass.tint}" stroke-width="${glass.edge}" pointer-events="none"/>${fog}<g pointer-events="none">${facets}${lid}</g><text x="380" y="601" text-anchor="middle" fill="#788867" font-family="Georgia,serif" font-size="15" letter-spacing="3">FLORA KEEP · МАЛЕНЬКИЙ МИР</text></svg>`;
}

function createTerrariumFeature(api) {
  const catalog=api.game.CATALOG,esc=api.esc||terraEsc;
  let state=defaultTerrariumState(),selectedId='',tool='select',plantSpecies='fern',pendingDelete='',abort=null,root=null,drag=null,busy=false,generation=0,viewOpen=false,ghost=null,landingId='',brush=null,wiping=null,gallery=null;
  const toolGroups={};
  const selectedIds=new Set();
  const undoStack=[],redoStack=[];
  let committedDraft=null,comparisonVessel='',brushStyle={width:1,opacity:1,texture:'damp'};
  let camera={zoom:1,x:.5,y:.5};
  const button=(action,label,extra='',kind='secondary')=>`<button type="button" class="button ${kind}" data-terrarium="${action}" ${extra}>${label}</button>`;
  const pendingWrites=new Set();
  const read=()=>normalizeTerrariumState(api.extras.terrariums,catalog);
  const selected=()=>state.draft.items.find(item=>item.id===selectedId);

  function selectItem(id,extend=false) {
    if(!extend)selectedIds.clear();
    if(id) {
      if(extend&&selectedIds.has(id))selectedIds.delete(id);
      else selectedIds.add(id);
    }
    selectedId=Array.from(selectedIds).at(-1)||'';
  }

  function keepSelection() {
    for(const id of selectedIds)if(!state.draft.items.some(item=>item.id===id))selectedIds.delete(id);
    selectedId=Array.from(selectedIds).at(-1)||'';
  }

  function saveHistory(stack,draft) {
    stack.push(draft);
    if(stack.length>TERRA_HISTORY_LIMIT)stack.shift();
  }

  async function store(message,{track=true}={}) {
    const started=generation,snapshot=normalizeTerrariumState(state,catalog);
    const pending=api.commit(({extras})=>{extras.terrariums=snapshot;},message);
    pendingWrites.add(pending);
    try{await pending;}finally{pendingWrites.delete(pending);}
    if(started!==generation||!viewOpen)return false;
    state=read();
    if(track&&committedDraft&&JSON.stringify(committedDraft)!==JSON.stringify(state.draft)) {
      saveHistory(undoStack,committedDraft);
      redoStack.length=0;
    }
    committedDraft=state.draft;
    // Pointer edits mutate transient points until release.
    state.draft=structuredClone(state.draft);
    keepSelection();
    return true;
  }

  async function replayHistory(action) {
    const from=action==='undo'?undoStack:redoStack,to=action==='undo'?redoStack:undoStack;
    if(!from.length)return;
    const current=state.draft;
    state.draft=from.at(-1);
    try {
      if(!await store(undefined,{track:false}))return;
    } catch(error) {
      state.draft=current;
      throw error;
    }
    from.pop();
    saveHistory(to,current);
    comparisonVessel='';
    render();
    root?.querySelector('[data-terrarium="'+action+'"]:not([disabled])')?.focus({preventScroll:true});
  }

  function dispose() {
    closeGallery(false);
    generation++;
    viewOpen=false;
    abort?.abort();
    abort=null;
    if(drag){state.draft=drag.before;drag=null;}
    if(brush){state.draft=brush.before;brush=null;}
    if(wiping){state.draft=wiping.before;wiping=null;}
    root=null;
  }

  function drawCanvas() {
    const holder=root?.querySelector('.terrarium-canvas');
    if(!holder)return;
    const width=760/camera.zoom,height=620/camera.zoom;
    const viewport=[(760-width)*camera.x,(620-height)*camera.y,width,height].join(' ');
    const snapPoint=ghost||((drag?.moved&&!drag.resize)?selected():null);
    holder.innerHTML=renderTerrariumSVG(state.draft,{art:api.art,catalog,selectedIds:[...selectedIds],interactive:true,ghost,landingId,viewport,snapPoint});
    const depth=root.querySelector('.terrarium-depth-visual');
    if(depth)depth.innerHTML=terraDepthSVG(state.draft.items,selectedIds);
  }

  function openDraft() {
    state=read();
    committedDraft=state.draft;
    state.draft=structuredClone(state.draft);
    viewOpen=true;
    render();
  }

  const toolLabel=()=>tool==='wipe'?'Протирание стекла':tool==='brush-moss'?'Кисть мха':tool==='brush-grass'?'Прорастающая трава':tool==='plant'?(catalog.find(s=>s.id===plantSpecies)?.name||'Растение'):terraLabel({kind:tool},catalog);
  function mossTextureOptions(){
    return `<fieldset class="terrarium-moss-textures"><legend>Фактура мха</legend>${Object.entries(TERRA_MOSS_TEXTURES).map(([id,texture])=>`<label><input type="radio" name="terrarium-brush-texture" value="${id}"${brushStyle.texture===id?' checked':''}><svg viewBox="0 0 72 32" aria-hidden="true"><ellipse cx="36" cy="20" rx="30" ry="9" fill="${texture.base}"/>${[17,29,42,55].map((x,i)=>terraMossTuft(x,16+i%2*3,8,id)).join('')}</svg><span>${texture.name}</span></label>`).join('')}</fieldset>`;
  }
  function viewControls(){return `<div class="terrarium-view-controls"><label class="field"><span>Ракурс: <output>${state.draft.view.angle}°</output></span><input name="terrarium-angle" type="range" min="-18" max="18" step="1" value="${state.draft.view.angle}" aria-label="Повернуть миниатюрный мир"></label><div class="terrarium-view-buttons">${button('grid','Чертёж',`aria-pressed="${state.draft.view.grid}"`)}${button('snap','Привязка к сетке',`aria-pressed="${state.draft.view.snap}"`)}${button('fog','Запотевшее стекло',`aria-pressed="${state.draft.view.fog}"`)}${state.draft.view.fog?button('wipe','Протереть пальцем',`aria-pressed="${tool==='wipe'}"`)+button('clear-glass','Протереть полностью'):''}</div><div class="terrarium-brushes"><span>Рисовать по земле</span>${button('brush-moss','Кисть мха',`aria-pressed="${tool==='brush-moss'}"`)}${button('brush-grass','Кисть травы',`aria-pressed="${tool==='brush-grass'}"`)}${button('stroke-center','Штрих в центре',!tool.startsWith('brush-')?'disabled':'')}${button('undo-stroke','Убрать последний штрих',!state.draft.strokes.length?'disabled':'')}</div><div class="terrarium-brush-options"><label class="field"><span>Ширина кисти</span><input name="terrarium-brush-width" type="range" min="50" max="200" step="5" value="${brushStyle.width*100}"></label><label class="field"><span>Непрозрачность кисти</span><input name="terrarium-brush-opacity" type="range" min="15" max="100" step="5" value="${brushStyle.opacity*100}"></label>${tool==='brush-moss'?mossTextureOptions():''}</div><small>${state.draft.strokes.length} / 16 штрихов · кисть сохраняется с композицией</small></div>`;}
  function layerControls() {
    const sorted=terraSortedItems(state.draft.items).reverse();
    return `<details class="terrarium-object-list" ${toolGroups.objects?'open':''}><summary>Предметы и слои</summary><figure class="terrarium-depth"><div class="terrarium-depth-visual">${terraDepthSVG(state.draft.items,selectedIds)}</div><figcaption><span>Задний план</span><span>Середина</span><span>Передний план</span></figcaption></figure><div class="terrarium-layer-items">${sorted.map(item=>`<label><input type="checkbox" name="terrarium-selected" value="${item.id}" ${selectedIds.has(item.id)?'checked':''}>${esc(terraLabel(item,catalog))}</label>`).join('')||'<p>Добавьте предмет на композицию.</p>'}</div><div class="terrarium-view-buttons">${button('layer-front','На передний план',selectedIds.size?'':'disabled')}${button('layer-back','На задний план',selectedIds.size?'':'disabled')}</div></details>`;
  }

  function cameraControls() {
    return `<details class="terrarium-camera" ${toolGroups.camera?'open':''}><summary>Приближение и смещение</summary>
      <label class="field"><span>Масштаб</span><input name="terrarium-zoom" type="range" min="100" max="250" step="5" value="${camera.zoom*100}"></label>
      <label class="field"><span>Положение по горизонтали</span><input name="terrarium-pan-x" type="range" min="0" max="100" value="${camera.x*100}"></label>
      <label class="field"><span>Положение по вертикали</span><input name="terrarium-pan-y" type="range" min="0" max="100" value="${camera.y*100}"></label>
      ${button('camera-reset','Сбросить ракурс просмотра')}
    </details>`;
  }

  function comparisonMarkup() {
    if(!comparisonVessel||comparisonVessel===state.draft.vessel)return '';
    const compared={...state.draft,vessel:comparisonVessel};
    return `<div class="terrarium-vessel-preview" aria-label="Сравнение сосудов">
      <figure>${renderTerrariumSVG(state.draft,{art:api.art,catalog,id:'current-vessel'})}<figcaption>Текущий сосуд</figcaption></figure>
      <figure>${renderTerrariumSVG(compared,{art:api.art,catalog,id:'candidate-vessel'})}<figcaption>Новый сосуд</figcaption></figure>
      <div class="terrarium-view-buttons">${button('apply-vessel','Применить новый сосуд')}${button('discard-vessel','Отменить смену')}</div>
    </div>`;
  }

  function templatesMarkup() {
    return `<div class="terrarium-templates"><h3>Ваши шаблоны</h3>
      <div class="terrarium-view-buttons">${button('save-template','Сохранить текущий как шаблон')}</div>
      ${state.templates.map(scene=>`<article><span>${esc(scene.name)}</span>${button('apply-template','Создать из шаблона',`data-id="${scene.id}"`)}${button('remove-template','Убрать шаблон',`data-id="${scene.id}"`)}</article>`).join('')||'<p>Из сохранённого шаблона можно начать новый мир.</p>'}
    </div>`;
  }

  function render() {
    if(!viewOpen)return;
    const item=selected(),label=item?terraLabel(item,catalog):'';
    const choices=(values,current)=>values.map(([value,label])=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('');
    api.showDialog('Маленький мир в стекле',`<section class="terrarium-editor"><div class="terrarium-intro"><span class="terrarium-kicker">АТЕЛЬЕ ФЛОРАРИУМОВ</span><p>Мох, тёплые камни и немного воображения. Соберите свой тихий уголок — без расхода семян и монет.</p></div><div class="terrarium-presets" aria-label="Начать с композиции">${button('preset','Лесной уголок','data-preset="forest"')}${button('preset','Тёплый берег','data-preset="shore"')}${button('preset','Цветочный сон','data-preset="bloom"')}</div><div class="terrarium-workbench"><div class="terrarium-stage"><div class="terrarium-canvas" aria-label="Поле композиции"></div><p class="terrarium-placement" role="status">${tool==='select'?'Перетаскивайте предметы. Круглые ручки меняют размер; стрелки двигают выбранный предмет.':`Выбрано: ${esc(toolLabel())}. ${tool==='wipe'?'Проведите по стеклу; можно также протереть его целиком кнопкой.':tool.startsWith('brush-')?'Проведите по земле, чтобы оставить живой штрих.':'Коснитесь земли внутри сосуда.'}`}</p><div class="terrarium-stage-actions">${button('select','Выбирать и двигать',`aria-pressed="${tool==='select'}"`)}${button('add-center','Добавить в центр',tool==='select'||tool==='wipe'||tool.startsWith('brush-')?'disabled':'')}</div><small class="terrarium-count">${state.draft.items.length} / 24 предмета · композиция сохраняется в этом саду</small>${viewControls()}${cameraControls()}</div><div class="terrarium-tools"><label class="field"><span>Имя вашего мира</span><input name="terrarium-name" maxlength="60" value="${esc(state.draft.name)}"></label><div class="terrarium-settings"><label class="field"><span>Сосуд</span><select name="terrarium-vessel">${choices(TERRA_VESSEL_NAMES,comparisonVessel||state.draft.vessel)}</select></label><label class="field"><span>Почва</span><select name="terrarium-soil">${choices([['forest','Лесной мох'],['sand','Тёплый песок'],['rose','Мягкая земля']],state.draft.soil)}</select></label>${comparisonMarkup()}</div><h3>Посадить в композицию</h3><label class="field"><span>Декоративное растение</span><select name="terrarium-species">${choices(catalog.map(s=>[s.id,s.name]),plantSpecies)}</select></label>${button('tool','Добавить растение',`data-tool="plant" aria-pressed="${tool==='plant'}"`)}<div class="terrarium-palette" aria-label="Материалы">${TERRA_DECOR_NAMES.map(([kind,title])=>`<button type="button" data-terrarium="tool" data-tool="${kind}" aria-pressed="${tool===kind}"><span aria-hidden="true"><svg viewBox="${terraBounds(kind).join(' ')}" fill="none" aria-hidden="true">${terraDecoration({kind})}</svg></span>${title}</button>`).join('')}</div><div class="terrarium-inspector"><h3>${item?esc(label):'Место для маленьких деталей'}</h3>${item?`<label class="field"><span>Размер</span><input name="terrarium-scale" type="range" min="45" max="145" value="${Math.round(item.scale*100)}" aria-label="Размер выбранного предмета"></label><div class="form-grid"><label class="field"><span>Положение по горизонтали, %</span><input name="terrarium-coordinate-x" type="number" min="0" max="100" value="${Math.round(item.x*100)}"></label><label class="field"><span>Положение по вертикали, %</span><input name="terrarium-coordinate-y" type="number" min="0" max="100" value="${Math.round(item.y*100)}"></label><label class="field"><span>Размер, %</span><input name="terrarium-numeric-scale" type="number" min="45" max="145" value="${Math.round(item.scale*100)}"></label></div><div class="terrarium-nudges" aria-label="Переместить выбранный предмет">${button('move','←','data-dx="-.04" data-dy="0" aria-label="Левее"')}${button('move','↑','data-dx="0" data-dy="-.08" aria-label="Дальше"')}${button('move','↓','data-dx="0" data-dy=".08" aria-label="Ближе"')}${button('move','→','data-dx=".04" data-dy="0" aria-label="Правее"')}</div><div class="terrarium-item-actions">${button('rotate','Повернуть','aria-label="Повернуть предмет на 10 градусов"')}${button('duplicate-item','Дублировать',state.draft.items.length>=TERRA_ITEM_LIMIT?'disabled':'')}${button('remove-item','Убрать предмет')}</div>`:'<p>Добавьте растение или украшение, затем выберите его на рисунке.</p>'}${layerControls()}</div></div></div><div class="terrarium-savebar">${button('save','Сохранить композицию','','primary')}${button('save-copy','Сохранить как новую')}${button('png','Скачать PNG')}${button('export-project','Скачать проект')}${button('import-project','Открыть проект')}<input type="file" name="terrarium-project-file" accept="application/json,.json" hidden></div><div class="terrarium-view-buttons">${button('undo','Отменить',undoStack.length?'':'disabled')}${button('redo','Вернуть',redoStack.length?'':'disabled')}</div>${templatesMarkup()}<p class="form-help">Флорариум — декоративная композиция. Игровые растения и их уход остаются в основном саду. Черновик и сохранённые миры входят в JSON-копию сада.</p><div class="terrarium-library-heading"><h3>Миры на вашей полке</h3><span>${state.saved.length} / 6</span>${state.saved.length?button('gallery','Смотреть галерею','aria-label="Открыть галерею флорариумов"'):''}</div><div class="terrarium-library">${state.saved.map((scene,i)=>`<article class="terrarium-shelf-world terrarium-pedestal-world"><div class="terrarium-mini">${renderTerrariumSVG(scene,{art:api.art,catalog,id:'terrarium-library-'+i})}</div><h4 class="terrarium-shelf-label">${esc(scene.name)}</h4><div>${button('gallery','Рассмотреть',`data-id="${scene.id}"`)}${button('load','Открыть',`data-id="${scene.id}"`)}${button('delete-ask','Удалить',`data-id="${scene.id}"`)}</div>${pendingDelete===scene.id?`<div class="terrarium-confirm"><p>Удалить эту композицию с полки?</p>${button('delete-confirm','Да, удалить',`data-id="${scene.id}"`,'danger')}${button('delete-cancel','Оставить')}</div>`:''}</article>`).join('')||`<div class="terrarium-empty"><div class="terrarium-empty-art" aria-hidden="true">${renderTerrariumSVG(state.draft,{art:api.art,catalog,id:'empty-glass'}).replace(/ data-terra-item="[^"]*"/g,'')}</div><h4>Здесь поселятся ваши маленькие миры</h4><p>Первый флорариум уже на столе. Сохраните его — и откроется ваша выставка.</p>${button('save-first','Сохранить первый мир','','primary')}</div>`}</div></section>`,'terrarium',true);
    root=document.querySelector('.terrarium-editor');if(!root)return;viewOpen=true;arrangeWorkbench();
    abort=new AbortController();const opts={signal:abort.signal};
    for(const [selector,key] of [['.terrarium-object-list','objects'],['.terrarium-camera','camera']])root.querySelector(selector)?.addEventListener('toggle',event=>{toolGroups[key]=event.currentTarget.open;},opts);
    drawCanvas();root.querySelector('.terrarium-canvas')?.addEventListener('pointerleave',()=>{if(ghost&&!drag){ghost=null;drawCanvas();}},opts);root.addEventListener('click',onClick,opts);root.addEventListener('change',onChange,opts);root.addEventListener('input',onInput,opts);root.addEventListener('pointerdown',onPointerDown,opts);root.addEventListener('pointermove',onPointerMove,opts);root.addEventListener('pointerup',onPointerUp,opts);root.addEventListener('pointercancel',onPointerCancel,opts);root.addEventListener('keydown',onKeyDown,opts);setBusy(busy);
  }
  function arrangeWorkbench(){
    const canvas=root.querySelector('.terrarium-canvas'),inspector=root.querySelector('.terrarium-inspector');
    canvas.after(inspector);inspector.classList.add('terrarium-context-tools');inspector.setAttribute('aria-label','Выбранный предмет');
    const wrap=(nodes,title,key)=>{const present=nodes.filter(Boolean);if(!present.length)return;const group=document.createElement('details');group.className='terrarium-tool-group';group.dataset.toolGroup=key;group.open=Object.hasOwn(toolGroups,key)?toolGroups[key]:!matchMedia('(max-width:760px)').matches||key==='materials';const summary=document.createElement('summary');summary.textContent=title;present[0].before(group);group.append(summary,...present);group.addEventListener('toggle',()=>toolGroups[key]=group.open);summary.addEventListener('click',event=>{event.preventDefault();group.open=!group.open;toolGroups[key]=group.open;if(group.open&&matchMedia('(max-width:760px)').matches)for(const other of root.querySelectorAll('.terrarium-tool-group'))if(other!==group){other.open=false;toolGroups[other.dataset.toolGroup]=false;}});};
    wrap([root.querySelector('.terrarium-view-controls')],'Стекло, ракурс и кисти','view');
    wrap([root.querySelector('.terrarium-settings')],'Сосуд и почва','setting');
    const tools=root.querySelector('.terrarium-tools');wrap([...tools.children].filter(el=>!el.matches('.field,.terrarium-tool-group')),'Растения и украшения','materials');
  }
  function closeGallery(restore=true){if(!gallery)return;const {panel,trigger,dialog,scroll}=gallery;panel.remove();root?.classList.remove('is-gallery');dialog?.classList.remove('terrarium-gallery-open');if(dialog)dialog.scrollTop=scroll;gallery=null;if(restore&&trigger?.isConnected)trigger.focus({preventScroll:true});}
  function openGallery(id,trigger){
    if(!state.saved.length)return;closeGallery(false);const panel=document.createElement('section'),dialog=root.closest('dialog');panel.className='terrarium-full-gallery';panel.setAttribute('aria-label','Галерея сохранённых флорариумов');panel.tabIndex=-1;gallery={panel,dialog,trigger,scroll:dialog?.scrollTop||0,index:Math.max(0,state.saved.findIndex(s=>s.id===id))};root.append(panel);root.classList.add('is-gallery');dialog?.classList.add('terrarium-gallery-open');
    const draw=()=>{const scene=state.saved[gallery.index];panel.innerHTML=`<header><div><span>ВАША ВЫСТАВКА · ${gallery.index+1} / ${state.saved.length}</span><h3>${esc(scene.name)}</h3></div><button type="button" class="button secondary" data-terra-gallery="exit">К мастерской</button></header><div class="terrarium-gallery-art">${renderTerrariumSVG(scene,{art:api.art,catalog,id:'full-gallery-'+gallery.index})}</div><nav aria-label="Просмотр галереи"><button type="button" class="button secondary" data-terra-gallery="prev" ${state.saved.length<2?'disabled':''}>← Предыдущий</button><button type="button" class="button secondary" data-terra-gallery="next" ${state.saved.length<2?'disabled':''}>Следующий →</button></nav>`;};
    const step=delta=>{gallery.index=(gallery.index+delta+state.saved.length)%state.saved.length;draw();panel.querySelector(`[data-terra-gallery="${delta>0?'next':'prev'}"]`)?.focus({preventScroll:true});};
    panel.addEventListener('click',event=>{const action=event.target.closest('[data-terra-gallery]')?.dataset.terraGallery;if(action==='exit')closeGallery();else if(action==='prev')step(-1);else if(action==='next')step(1);});panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeGallery();}else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();step(event.key==='ArrowRight'?1:-1);}});draw();if(dialog)dialog.scrollTop=0;panel.querySelector('[data-terra-gallery="exit"]').focus({preventScroll:true});
  }
  function setBusy(value){if(!root)return;root.setAttribute('aria-busy',String(value));for(const control of root.querySelectorAll('[data-terrarium],input,select')){if(value&&!control.disabled){control.dataset.terraBusyDisabled='true';control.disabled=true;}else if(!value&&control.dataset.terraBusyDisabled){delete control.dataset.terraBusyDisabled;control.disabled=false;}}}
  async function perform(action){if(busy)return;busy=true;setBusy(true);try{await action();}catch(error){api.toast(error?.message||'Не получилось изменить флорариум.');}finally{busy=false;setBusy(false);}}
  async function onClick(event) {
    const control=event.target.closest('[data-terrarium]');if(busy||!control||!root?.contains(control))return;
    const action=control.dataset.terrarium==='save-first'?'save':control.dataset.terrarium;
    if(action==='gallery'){openGallery(control.dataset.id,control);return;}
    if(action==='tool'){tool=control.dataset.tool;selectItem('');ghost=null;render();return;}
    if(action==='select'){tool='select';ghost=null;render();return;}
    if(action==='wipe'||action==='brush-moss'||action==='brush-grass'){tool=action;selectItem('');ghost=null;render();return;}
    if(action==='delete-ask'){pendingDelete=control.dataset.id;render();return;}
    if(action==='delete-cancel'){pendingDelete='';render();return;}
    if(action==='import-project'){root.querySelector('[name="terrarium-project-file"]').click();return;}
    if(action==='camera-reset'){camera={zoom:1,x:.5,y:.5};render();return;}
    if(action==='discard-vessel'){comparisonVessel='';render();return;}
    await perform(async()=>{
      if(action==='undo'||action==='redo'){await replayHistory(action);}
      else if(action==='snap'){
        state.draft.view.snap=!state.draft.view.snap;
        
        if(await store())render();
      }
      else if(action==='apply-vessel'){
        state.draft.vessel=terraChoice(comparisonVessel,TERRA_VESSELS,state.draft.vessel);
        comparisonVessel='';
        if(await store())render();
      }
      else if(action==='layer-front'||action==='layer-back'){
        state.draft=reorderTerrariumItems(state.draft,selectedIds,action==='layer-front');
        if(await store())render();
      }
      else if(action==='duplicate-item'){
        const next=cloneTerrariumItem(state.draft,selectedId);
        if(next===state.draft)return;
        state.draft=next;
        selectItem(next.items.at(-1).id);
        if(await store())render();
      }
      else if(action==='save-template'){
        const template=normalizeScene(state.draft,terraSpeciesSet(catalog));
        const found=state.templates.findIndex(scene=>scene.id===template.id);
        if(found<0&&state.templates.length>=TERRA_SHELF_LIMIT)throw new Error('На полке шесть шаблонов. Уберите один, чтобы добавить новый.');
        if(found<0)state.templates.push(template);
        else state.templates[found]=template;
        if(await store('Шаблон сохранён.'))render();
      }
      else if(action==='apply-template'){
        const template=state.templates.find(scene=>scene.id===control.dataset.id);
        if(!template)return;
        state.draft={...structuredClone(template),id:terraNewId()};
        comparisonVessel='';
        selectItem('');
        if(await store('Создан черновик из шаблона.'))render();
      }
      else if(action==='remove-template'){
        state.templates=state.templates.filter(scene=>scene.id!==control.dataset.id);
        if(await store('Шаблон убран с полки.'))render();
      }
      else if(action==='export-project'){
        const document=exportTerrariumProject(state.draft,catalog);
        api.download(new Blob([document],{type:'application/json'}),'flora-keep-terrarium.json');
      }
      else if(action==='grid'){state.draft.view.grid=!state.draft.view.grid;if(await store())render();}
      else if(action==='fog'){state.draft.view.fog=!state.draft.view.fog;state.draft.view.wipes=[];if(!state.draft.view.fog&&tool==='wipe')tool='select';if(await store())render();}
      else if(action==='clear-glass'){state.draft.view.fog=false;state.draft.view.wipes=[];tool='select';if(await store('Стекло снова прозрачное.'))render();}
      else if(action==='undo-stroke'){state.draft.strokes=state.draft.strokes.slice(0,-1);if(await store())render();}
      else if(action==='stroke-center'){state.draft=addTerrariumStroke(state.draft,tool==='brush-moss'?'moss':'grass',[[.32,.65],[.4,.58],[.48,.62],[.56,.5],[.64,.55]],terraNewId(),brushStyle);if(await store())render();}
      else if(action==='preset'){state.draft=terrariumPreset(control.dataset.preset,terraNewId());comparisonVessel='';selectItem('');tool='select';if(await store('Новая композиция готова. Сохранённые миры остались на полке.'))render();}
      else if(action==='add-center')await addAt(.5,.6);
      else if(action==='move'){if(selectedIds.size){nudge(Number(control.dataset.dx),Number(control.dataset.dy),event.altKey);if(await store())render();}}
      else if(action==='rotate'){const item=selected();if(item){state.draft=moveTerrariumItem(state.draft,item.id,{rotation:item.rotation>=30?-30:item.rotation+10});if(await store())render();}}
      else if(action==='remove-item'){state.draft={...state.draft,items:state.draft.items.filter(item=>item.id!==selectedId)};keepSelection();if(await store())render();}
      else if(action==='save'||action==='save-copy'){
        state.draft.name=terraText(root.querySelector('[name="terrarium-name"]').value,'Маленький мир');
        const found=state.saved.findIndex(scene=>scene.id===state.draft.id);
        if((action==='save-copy'||found<0)&&state.saved.length>=6){api.toast('На полке уже шесть миров. Удалите один или обновите открытую композицию.');return;}
        if(action==='save-copy')state.draft={...state.draft,id:terraNewId()};
        const snapshot=normalizeScene(state.draft,terraSpeciesSet(catalog));
        if(action==='save'&&found>=0)state.saved[found]=snapshot;else state.saved.push(snapshot);
        if(await store('Маленький мир сохранён на вашей полке.'))render();
      }
      else if(action==='load'){const scene=state.saved.find(s=>s.id===control.dataset.id);if(scene){state.draft=normalizeScene(scene,terraSpeciesSet(catalog));comparisonVessel='';selectItem('');tool='select';if(await store())render();}}
      else if(action==='delete-confirm'){state.saved=state.saved.filter(scene=>scene.id!==control.dataset.id);pendingDelete='';if(await store('Композиция убрана с полки. Текущий черновик сохранён.'))render();}
      else if(action==='png'){control.disabled=true;try{const svg=renderTerrariumSVG(state.draft,{art:api.art,catalog});const blob=await api.media.rasterizeSVG(svg,{width:1520,height:1240});api.download(blob,'flora-keep-terrarium.png');api.toast('Флорариум сохранён в PNG.');}finally{if(control.isConnected)control.disabled=false;}}
    });
  }
  function nudge(dx,dy,skipSnap=false) {
    const snap=state.draft.view.snap&&!skipSnap;
    const stepX=snap?Math.sign(dx)*.1:dx,stepY=snap?Math.sign(dy)*.2:dy;
    state.draft=moveTerrariumItems(state.draft,selectedIds,stepX,stepY,snap);
  }

  function snapPosition(x,y,skipSnap=false) {
    if(!state.draft.view.snap||skipSnap)return {x,y};
    return {x:Math.round(x*10)/10,y:Math.round(y*5)/5};
  }

  async function addAt(x,y,skipSnap=false) {
    if(tool==='select'||tool==='wipe'||tool.startsWith('brush-'))return;
    const next=addTerrariumItem(state.draft,tool,plantSpecies,snapPosition(x,y,skipSnap));
    if(next.items.length===state.draft.items.length){api.toast('В одном флорариуме помещаются до 24 предметов.');return;}
    state.draft=next;
    selectItem(next.items.at(-1).id);
    landingId=selectedId;
    ghost=null;
    tool='select';
    if(await store()){
      render();
      const landed=landingId;
      setTimeout(()=>{
        root?.querySelector('[data-terra-item="'+landed+'"]')?.classList.remove('is-landing');
        if(landingId===landed)landingId='';
      },800);
    }
  }

  async function onChange(event) {
    const {name:key,value,checked,files}=event.target;
    if(!key?.startsWith('terrarium-'))return;
    if(key==='terrarium-selected'){
      if(checked!==selectedIds.has(value))selectItem(value,true);
      toolGroups.objects=true;
      render();
      root?.querySelector('input[name="terrarium-selected"][value="'+value+'"]')?.focus({preventScroll:true});
      return;
    }
    if(key==='terrarium-vessel'){
      comparisonVessel=value===state.draft.vessel?'':terraChoice(value,TERRA_VESSELS,'');
      render();
      root?.querySelector(comparisonVessel?'[data-terrarium="apply-vessel"]':'[name="terrarium-vessel"]')?.focus({preventScroll:true});
      return;
    }
    if(key==='terrarium-species'){plantSpecies=value;return;}
    if(key==='terrarium-brush-texture'){brushStyle.texture=terraChoice(value,Object.keys(TERRA_MOSS_TEXTURES),'damp');return;}
    if(key==='terrarium-project-file'){
      const file=files?.[0];
      if(!file)return;
      await perform(async()=>{
        if(file.size>256000)throw new Error('Файл флорариума должен быть меньше 256 КБ.');
        state.draft=importTerrariumProject(await file.text(),catalog);
        comparisonVessel='';
        selectItem('');
        if(await store('Проект открыт как черновик. Предыдущий черновик можно вернуть.'))render();
      });
      return;
    }
    if(!['terrarium-name','terrarium-angle','terrarium-soil','terrarium-scale','terrarium-coordinate-x','terrarium-coordinate-y','terrarium-numeric-scale'].includes(key))return;
    await perform(async()=>{
      if(key==='terrarium-soil')state.draft.soil=terraChoice(value,TERRA_SOILS,'forest');
      const coordinateKeys={'terrarium-coordinate-x':'x','terrarium-coordinate-y':'y','terrarium-numeric-scale':'scale'};
      const item=selected();
      if (item && Object.hasOwn(coordinateKeys,key) && Number.isFinite(event.target.valueAsNumber)) state.draft=moveTerrariumItem(state.draft,item.id,{[coordinateKeys[key]]:event.target.valueAsNumber/100});
      if(await store()&&key!=='terrarium-name'){
        render();
        root?.querySelector('[name="'+key+'"]')?.focus({preventScroll:true});
      }
    });
  }

  function onInput(event) {
    const {name,value}=event.target;
    if(name==='terrarium-name'){state.draft.name=terraText(value,'Маленький мир');return;}
    if(name==='terrarium-brush-width'){brushStyle.width=Number(value)/100;return;}
    if(name==='terrarium-brush-opacity'){brushStyle.opacity=Number(value)/100;return;}
    if(name==='terrarium-angle'){
      state.draft.view.angle=terraBound(Number(value),-18,18,0);
      const output=root?.querySelector('.terrarium-view-controls output');
      if(output)output.textContent=state.draft.view.angle+'°';
    }else if(name==='terrarium-scale'){
      if(selected())state.draft=moveTerrariumItem(state.draft,selectedId,{scale:Number(value)/100});
    }else if(name==='terrarium-zoom')camera.zoom=Number(value)/100;
    else if(name==='terrarium-pan-x')camera.x=Number(value)/100;
    else if(name==='terrarium-pan-y')camera.y=Number(value)/100;
    else return;
    drawCanvas();
  }

  function canvasPoint(event,glass=false){const svg=root?.querySelector(glass?'.terrarium-canvas>svg':'.terrarium-canvas .terra-world-space')||root?.querySelector('.terrarium-canvas>svg');if(!svg)return null;const matrix=svg.getScreenCTM();if(!matrix)return null;const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());return {rawX:point.x,rawY:point.y,x:(point.x-190)/380,y:(point.y-400)/85};}
  function onPointerDown(event) {
    if(busy||event.button!==0||!event.target.closest('.terrarium-canvas'))return;
    const point=canvasPoint(event,tool==='wipe');
    if(!point)return;
    if(tool==='wipe'&&state.draft.view.fog){
      const points=[[point.rawX,point.rawY],[point.rawX+.01,point.rawY+.01]];
      wiping={pointerId:event.pointerId,points,before:state.draft};
      state.draft={...state.draft,view:{...state.draft.view,wipes:[...state.draft.view.wipes.slice(-19),points]}};
      root.setPointerCapture?.(event.pointerId);
      drawCanvas();
      event.preventDefault();
      return;
    }
    const onSoil=point.rawX>=170&&point.rawX<=590&&point.rawY>=383&&point.rawY<=495;
    if(tool.startsWith('brush-')){
      if(!onSoil)return;
      if(state.draft.strokes.length>=TERRA_BRUSH_LIMIT){api.toast('Можно сохранить 16 штрихов. Уберите последний, чтобы нарисовать другой.');return;}
      const before=state.draft,id=terraNewId();
      state.draft=addTerrariumStroke(state.draft,tool==='brush-moss'?'moss':'grass',[[point.x,point.y]],id,brushStyle);
      brush={pointerId:event.pointerId,id,before,last:point};
      root.setPointerCapture?.(event.pointerId);
      drawCanvas();
      event.preventDefault();
      return;
    }
    if(tool!=='select'){
      if(onSoil){event.preventDefault();void perform(()=>addAt(point.x,point.y,event.altKey));}
      return;
    }
    const item=event.target.closest('[data-terra-item]');
    if(!item||item.dataset.terraItem==='terra-placement-ghost')return;
    const id=item.dataset.terraItem;
    if(event.shiftKey){
      selectItem(id,true);
      render();
      return;
    }
    if(!selectedIds.has(id))selectItem(id);
    const current=state.draft.items.find(entry=>entry.id===id);
    if(!current)return;
    selectedId=id;
    ghost=null;
    drag={id,pointerId:event.pointerId,start:point,item:current,before:state.draft,moved:false,resize:!!event.target.closest('[data-terra-resize]')};
    root.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    drawCanvas();
  }

  function onPointerMove(event) {
    if(wiping&&event.pointerId===wiping.pointerId){
      const point=canvasPoint(event,true);
      if(point&&wiping.points.length<80){wiping.points.push([point.rawX,point.rawY]);drawCanvas();event.preventDefault();}
      return;
    }
    if(brush&&event.pointerId===brush.pointerId){
      const point=canvasPoint(event);
      if(point&&Math.hypot(point.rawX-brush.last.rawX,point.rawY-brush.last.rawY)>7){
        const stroke=state.draft.strokes.find(row=>row.id===brush.id);
        if(stroke&&stroke.points.length<64){
          stroke.points.push([terraBound(point.x,0,1,0),terraBound(point.y,0,1,0)]);
          brush.last=point;
          drawCanvas();
        }
      }
      event.preventDefault();
      return;
    }
    if(!drag){
      if(TERRA_KINDS.includes(tool)&&event.target.closest('.terrarium-canvas')){
        const point=canvasPoint(event);
        ghost=point&&point.rawX>=170&&point.rawX<=590&&point.rawY>=383&&point.rawY<=495
          ?{kind:tool,speciesId:plantSpecies,...snapPosition(point.x,point.y,event.altKey)}:null;
        drawCanvas();
      }
      return;
    }
    if(event.pointerId!==drag.pointerId)return;
    const point=canvasPoint(event);
    if(!point)return;
    drag.moved=drag.moved||Math.abs(point.rawX-drag.start.rawX)+Math.abs(point.rawY-drag.start.rawY)>3;
    if(!drag.moved)return;
    if(drag.resize){
      const center=terraPosition(drag.item);
      const initial=Math.hypot(drag.start.rawX-center.x,drag.start.rawY-center.y);
      const current=Math.hypot(point.rawX-center.x,point.rawY-center.y);
      state.draft=moveTerrariumItem(drag.before,drag.id,{scale:drag.item.scale*current/Math.max(1,initial)});
    }else{
      state.draft=moveTerrariumItems(drag.before,selectedIds,point.x-drag.start.x,point.y-drag.start.y,state.draft.view.snap&&!event.altKey);
    }
    drawCanvas();
    event.preventDefault();
  }

  async function onPointerUp(event) {
    if(wiping?.pointerId===event.pointerId)wiping=null;
    else if(brush?.pointerId===event.pointerId)brush=null;
    else if(drag?.pointerId===event.pointerId){
      const moved=drag.moved;
      drag=null;
      if(!moved){render();return;}
    }else return;
    await perform(async()=>{if(await store())render();});
  }

  function onPointerCancel() {
    const prior=drag?.before||brush?.before||wiping?.before;
    drag=null;
    brush=null;
    wiping=null;
    if(prior){state.draft=prior;drawCanvas();}
  }

  function onKeyDown(event) {
    const node=event.target.closest('[data-terra-item]');
    const isText=event.target.matches('input:not([type="checkbox"]),textarea,select');
    if(!isText&&(event.ctrlKey||event.metaKey)&&['z','y','я','н'].includes(event.key.toLowerCase())){
      event.preventDefault();
      const redo=event.shiftKey||['y','н'].includes(event.key.toLowerCase());
      void perform(()=>replayHistory(redo?'redo':'undo'));
      return;
    }
    if(!node)return;
    const id=node.dataset.terraItem;
    const moves={ArrowLeft:[-.04,0],ArrowRight:[.04,0],ArrowUp:[0,-.08],ArrowDown:[0,.08]};
    if(event.key==='Enter'||event.key===' '){
      event.preventDefault();
      selectItem(id,event.shiftKey);
      tool='select';
      render();
      root?.querySelector('.terrarium-inspector input')?.focus();
    }else if(moves[event.key]){
      event.preventDefault();
      if(!selectedIds.has(id))selectItem(id);
      void perform(async()=>{
        nudge(...moves[event.key],event.altKey);
        if(await store()){
          drawCanvas();
          root?.querySelector('[data-terra-item="'+id+'"]')?.focus();
        }
      });
    }
  }

  return {
    open(){
      selectItem('');
      pendingDelete='';
      tool='select';
      ghost=null;
      landingId='';
      comparisonVessel='';
      camera={zoom:1,x:.5,y:.5};
      undoStack.length=0;
      redoStack.length=0;
      plantSpecies=catalog.some(s=>s.id==='fern')?'fern':catalog[0]?.id||'daisy';
      if(pendingWrites.size){
        api.showDialog('Маленький мир в стекле','<p class="dialog-intro" role="status">Сохраняем последние изменения… Флорариум откроется через мгновение.</p>','terrarium',true);
        viewOpen=true;
        const opening=generation;
        void Promise.allSettled([...pendingWrites]).then(()=>{
          if(viewOpen&&generation===opening)openDraft();
        });
      }else openDraft();
    },
    dispose,
    async flush(){while(pendingWrites.size)await Promise.allSettled([...pendingWrites]);}
  };
}

return Object.freeze({ terrariumPreset, defaultTerrariumState, addTerrariumStroke, normalizeTerrariumState, moveTerrariumItem, moveTerrariumItems, reorderTerrariumItems, cloneTerrariumItem, addTerrariumItem, exportTerrariumProject, importTerrariumProject, renderTerrariumSVG, createTerrariumFeature });
})();
