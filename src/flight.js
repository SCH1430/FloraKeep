const flight = (() => {
/* A quiet, local garden walk in flight. This module never changes game resources. */
const FLIGHT_FLOWERS = Object.freeze([
  {id:'chamomile',name:'Ромашковая поляна',x:15,y:17,color:'#f8f1cd',petals:9},
  {id:'lavender',name:'Лавандовый островок',x:33,y:40,color:'#b4a2ce',petals:6},
  {id:'rose',name:'Розовый уголок',x:47,y:14,color:'#dba8ad',petals:7},
  {id:'sunflower',name:'Солнечный цветок',x:64,y:32,color:'#e7be65',petals:10},
  {id:'bluebell',name:'Голубая полянка',x:80,y:16,color:'#a5c3cc',petals:6},
  {id:'tulip',name:'Последний лепесток',x:90,y:45,color:'#d59a8c',petals:7},
]);
const FLIGHT_SECRETS = Object.freeze([
  {id:'dew',name:'Капля росы',x:24,y:50,description:'В большой капле отражается целый маленький мир.'},
  {id:'firefly',name:'Тихий светлячок',x:57,y:7,description:'Светлячок оставил на листе тёплый фонарик.'},
  {id:'snail',name:'Домик улитки',x:80,y:53,description:'Улитка тоже путешествует — просто в своём темпе.'},
]);
const FLIGHT_MAPS = Object.freeze({
  meadow:{name:'Ромашковая поляна',color:'#8b674c'},
  pond:{name:'Берег пруда',color:'#537e86',positions:[[24,22],[35,46],[57,15],[73,26],[49,51],[85,50]],secrets:[[68,43],[12,34],[93,21]],
    variants:{bluebell:{speciesId:'mint',name:'Береговая мята',color:'#b2c58c'},tulip:{speciesId:'orchid',name:'Садовая орхидея',color:'#cba9cc'}}},
  shade:{name:'Под тенью листьев',color:'#625486',positions:[[26,43],[14,18],[39,26],[65,10],[86,36],[62,49]],secrets:[[92,20],[45,41],[56,18]],
    variants:{bluebell:{speciesId:'fern',name:'Папоротниковый уголок',color:'#a0b285'},tulip:{speciesId:'aloe',name:'Алоэ на тёплом камне',color:'#e6a997'}}}
});
const flowerSpecies={chamomile:'daisy',lavender:'lavender',rose:'rose',sunflower:'sunflower',tulip:'tulip'};
const safeMap=value=>typeof value==='string'&&Object.hasOwn(FLIGHT_MAPS,value)?value:'meadow';

function flightMapLayout(id) {
  const key=safeMap(id),map=FLIGHT_MAPS[key];
  const flowers=FLIGHT_FLOWERS.map((flower,index)=>{
    const [x,y]=map.positions?.[index]||[flower.x,flower.y];
    return {...flower,x,y,speciesId:flowerSpecies[flower.id]||null,...map.variants?.[flower.id]};
  });
  const secrets=FLIGHT_SECRETS.map((secret,index)=>{
    const [x,y]=map.secrets?.[index]||[secret.x,secret.y];
    return {...secret,x,y};
  });
  return {id:key,name:map.name,color:map.color,flowers,secrets};
}
const FLIGHT_MOODS = Object.freeze([
  {id:'day',name:'Ромашковый день',caption:'Тёплый свет на лепестках'},
  {id:'lavender',name:'Лавандовый вечер',caption:'Когда луг становится тише'},
  {id:'sunset',name:'Золотистый закат',caption:'Последние лучи для маленькой прогулки'},
]);
const WIDTH=100,HEIGHT=62,SPEED=23;
const finite=(v,min,max,fallback)=>typeof v==='number'&&Number.isFinite(v)?Math.min(max,Math.max(min,v)):fallback;
const counter=v=>Math.floor(finite(v,0,1000000,0));
const routePoints=raw=>Array.isArray(raw)?raw.slice(0,160).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({x:finite(p.x,4,96,8),y:finite(p.y,5,57,40)})):[];
const NECTAR_ORDER=Object.freeze(['chamomile','lavender','rose']);
function collectNectar(raw,id){const state=normalizeFlightState(raw);if(state.nectar.length===NECTAR_ORDER.length)return state;if(id===NECTAR_ORDER[state.nectar.length])state.nectar.push(id);else state.nectar=id===NECTAR_ORDER[0]?[id]:[];return state;}
const nectarPrefix=raw=>{const out=[];if(Array.isArray(raw))for(let i=0;i<3;i++){if(raw[i]!==NECTAR_ORDER[i])break;out.push(raw[i]);}return out;};
const collectIds=(raw,allowed)=>Array.isArray(raw)?[...new Set(raw.slice(0,100).filter(id=>allowed.some(t=>t.id===id)))]:[];
function flightRun(raw={}) {
  return {x:finite(raw.x,4,96,8),y:finite(raw.y,5,57,40),pollen:collectIds(raw.pollen,FLIGHT_FLOWERS),
    secrets:collectIds(raw.secrets,FLIGHT_SECRETS),route:routePoints(raw.route),path:routePoints(raw.path),
    revealed:collectIds(raw.revealed,FLIGHT_SECRETS),nectar:nectarPrefix(raw.nectar),
    explored:Array.isArray(raw.explored)?[...new Set(raw.explored.slice(0,20).filter(n=>Number.isInteger(n)&&n>=0&&n<6))]:[3]};
}
const cleanRouteName=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,45):'';
const safeRouteId=value=>typeof value==='string'&&/^route-[A-Za-z0-9_-]{1,72}$/.test(value);
function normalizeNamedRoutes(raw) {
  if(!Array.isArray(raw))return [];
  const routes=[],seen=new Set();
  for(const entry of raw.slice(0,30)){
    if(routes.length>=10)break;
    if(!safeRouteId(entry?.id)||seen.has(entry.id))continue;
    const name=cleanRouteName(entry.name),points=routePoints(entry.points);
    if(name&&points.length>=2){
      seen.add(entry.id);
      routes.push({id:entry.id,map:safeMap(entry.map),name,points});
    }
  }
  return routes;
}
function defaultFlightState(){
  return {version:1,run:0,completedTours:0,map:'meadow',maps:{},mood:'day',zoom:1,showPath:true,namedRoutes:[],...flightRun()};
}
function normalizeFlightState(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return defaultFlightState();
  const map=safeMap(raw.map),maps={};
  for(const id of Object.keys(FLIGHT_MAPS))if(id!==map&&raw.maps?.[id])maps[id]=flightRun(raw.maps[id]);
  return {version:1,run:counter(raw.run),completedTours:counter(raw.completedTours),map,maps,
    mood:FLIGHT_MOODS.some(m=>m.id===raw.mood)?raw.mood:'day',zoom:[1,1.8,2.5].includes(raw.zoom)?raw.zoom:1,
    showPath:raw.showPath!==false,namedRoutes:normalizeNamedRoutes(raw.namedRoutes),...flightRun(raw)};
}
const allFlightFinds=state=>state.pollen.length===FLIGHT_FLOWERS.length&&state.secrets.length===FLIGHT_SECRETS.length;
function isFlightComplete(raw){return allFlightFinds(normalizeFlightState(raw));}
function startNewFlight(raw){
  const old=normalizeFlightState(raw);
  return {...old,...flightRun(),run:Math.min(1000000,old.run+1)};
}
function selectFlightMap(raw,id){
  const state=normalizeFlightState(raw),map=safeMap(id);
  if(map===state.map)return state;
  const maps={...state.maps,[state.map]:flightRun(state)};
  const next=flightRun(maps[map]);
  delete maps[map];
  return {...state,...next,map,maps,run:Math.min(1000000,state.run+1)};
}
function nextFlightHint(raw,level=1){
  const state=normalizeFlightState(raw),{secrets}=flightMapLayout(state.map);
  const remaining=secrets.filter(secret=>!state.secrets.includes(secret.id));
  if(!remaining.length)return {id:'',text:'Все тайники этой карты уже найдены.'};
  const distance=secret=>Math.hypot(secret.x-state.x,secret.y-state.y);
  const secret=remaining.sort((a,b)=>distance(a)-distance(b))[0];
  if(level>2)return {id:secret.id,text:'Тайник «'+secret.name+'» находится в точке '+secret.x+', '+secret.y+'.'};
  const dx=secret.x-state.x,dy=secret.y-state.y;
  const directions=[Math.abs(dx)>4?(dx<0?'левее':'правее'):'',Math.abs(dy)>4?(dy<0?'выше':'ниже'):''].filter(Boolean);
  const text=directions.length?'Ближайший тайник '+directions.join(' и ')+'.':'Тайник совсем рядом.';
  return {id:secret.id,text:level===2?text+' Расстояние по карте около '+Math.round(distance(secret))+' шагов.':text};
}
function stepFlight(raw,input={},seconds=0){
  const before=normalizeFlightState(raw),state={...before,pollen:[...before.pollen],secrets:[...before.secrets]},events=[];
  const {flowers,secrets}=flightMapLayout(state.map);
  const dt=finite(seconds,0,.1,0);let dx=finite(input?.dx,-1,1,0),dy=finite(input?.dy,-1,1,0);
  let maxTravel=SPEED*dt;
  if(input?.target&&Number.isFinite(input.target.x)&&Number.isFinite(input.target.y)&&!dx&&!dy){dx=finite(input.target.x,4,96,8)-state.x;dy=finite(input.target.y,5,57,40)-state.y;maxTravel=Math.min(maxTravel,Math.hypot(dx,dy));}
  const distance=Math.hypot(dx,dy);if(distance>0){state.x=finite(state.x+dx/distance*maxTravel,4,96,8);state.y=finite(state.y+dy/distance*maxTravel,5,57,40);}
  if(dt>0){
    if(!state.path.length&&Math.hypot(state.x-before.x,state.y-before.y)>.001)state.path=[{x:before.x,y:before.y}];
    const previous=state.path.at(-1);
    if(previous&&Math.hypot(state.x-previous.x,state.y-previous.y)>1.5)state.path=[...state.path.slice(-159),{x:state.x,y:state.y}];
    for(const flower of flowers)if(!state.pollen.includes(flower.id)&&Math.hypot(state.x-flower.x,state.y-flower.y)<=3.5){state.pollen.push(flower.id);events.push({type:'pollen',id:flower.id,text:'Пыльца собрана: '+flower.name.toLocaleLowerCase('ru')+'.'});}
    for(const secret of secrets)if(!state.secrets.includes(secret.id)&&Math.hypot(state.x-secret.x,state.y-secret.y)<=3.8){state.secrets.push(secret.id);events.push({type:'secret',id:secret.id,text:secret.name+'. '+secret.description});}
    if(!allFlightFinds(before)&&allFlightFinds(state)){state.completedTours=Math.min(1000000,state.completedTours+1);events.push({type:'complete',text:'Все шесть цветков и три маленьких секрета найдены. Спасибо за прогулку!'});}
  }
  return {state,events};
}
function mergeFlightProgress(current,incoming){
  const a=normalizeFlightState(current),b=normalizeFlightState(incoming);
  if(b.run<a.run)return a;
  if(b.run>a.run)return b;
  return {...b,pollen:[...new Set([...a.pollen,...b.pollen])],secrets:[...new Set([...a.secrets,...b.secrets])],completedTours:Math.max(a.completedTours,b.completedTours),revealed:[...new Set([...a.revealed,...b.revealed])],explored:[...new Set([...a.explored,...b.explored])]};
}
function flowerHead(f){
 return `${Array.from({length:f.petals},(_,i)=>`<ellipse cx="0" cy="-2.3" rx="1.3" ry="2.7" fill="${f.color}" stroke="#fff8" stroke-width=".12" transform="rotate(${i*360/f.petals})"/>`).join('')}<circle r="1.5" fill="#d5a54b"/><circle r=".65" fill="#b5853e" opacity=".55"/>`;
}
function flowerSVG(f){
 return `<g transform="translate(${f.x} ${f.y})" class="flight-flower" data-flight-flower="${f.id}"><ellipse class="flight-flower-shadow" cx="1" cy="8.6" rx="3.5" ry=".7" fill="#496748" opacity=".14"/><g class="flight-flower-stem"><path d="M0 0Q-1 5 1 8" stroke="#62835b" stroke-width=".55"/><path d="M0 4Q-4 1-3 5Q-1 6 1 6M1 6Q4 2 5 4Q4 6 1 7" fill="#809e6d"/><g class="flight-flower-head">${flowerHead(f)}<circle class="flight-pollen-halo" r="6" stroke="#f4d384" stroke-width=".25" stroke-dasharray=".6 1.2" fill="none"/><path class="flight-flower-check" d="m-1.3 0 .9 .9 1.8-2" fill="none" stroke="#315839" stroke-width=".6" stroke-linecap="round" stroke-linejoin="round"/></g></g></g>`;
}
function secretDrawing(id){
 if(id==='dew')return '<path d="M0-4C-1-2-3 0-3 1A3 3 0 0 0 3 1C3 0 1-2 0-4Z" fill="#a7d0cd" stroke="#659e9b" stroke-width=".3"/><path d="M-1.5 0Q-2 2 0 2" fill="none" stroke="#fbfff4" stroke-width=".5"/><path d="M-.5-2.4.5-1" stroke="#e3f3e9" stroke-width=".3"/>';
 if(id==='firefly')return '<path d="M-6 1Q-2-6 5 0Q1 4-6 1" fill="#7c9d70"/><path d="m-5 1 8-1" stroke="#b8c9a6" stroke-width=".35"/><ellipse cx="0" cy="0" rx=".8" ry="1.2" fill="#e4be6a"/><path d="M-.7-.5Q-2-2-2.4-.8Q-1.7.3-.6.3M.7-.5Q2-2 2.4-.8Q1.7.3.6.3" fill="#e0e8ca" stroke="#829578" stroke-width=".2"/><circle cx="0" cy="-.9" r=".55" fill="#485c3c"/>';
 return '<path d="M-3 2Q3-1 5 1L6 3H-4Z" fill="#a7ad80"/><circle cx="-1" cy="0" r="2.8" fill="#c3a482"/><path d="M-1 2C-4-1 0-4 1-1C2 1-1 2-1 0" fill="none" stroke="#917457" stroke-width=".45"/><path d="m4 1 1-2m-2 2 .1-2" stroke="#73825d" stroke-width=".4"/><circle cx="5" cy="-1" r=".3" fill="#465a3b"/>';
}
function albumSketch(secret){
 return `<svg class="flight-sketch" viewBox="-10 -9 20 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M-8 6Q-3 5 6 6M-7 7H4" stroke="currentColor" stroke-width=".12" fill="none" opacity=".4"/>${secretDrawing(secret.id)}<path d="M-8-5V-7H-6M6 7H8V5" stroke="currentColor" stroke-width=".18" fill="none" opacity=".35"/></svg>`;
}
function flightBeeSVG(flowers=FLIGHT_FLOWERS){
 return `<svg class="flight-bee-drawing" viewBox="0 0 100 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="flight-bee-honey" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe9a9"/><stop offset=".55" stop-color="#ebc268"/><stop offset="1" stop-color="#c99542"/></linearGradient><linearGradient id="flight-bee-wing" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffdf0" stop-opacity=".85"/><stop offset="1" stop-color="#c3dddb" stop-opacity=".35"/></linearGradient></defs>
 <g class="flight-wing flight-wing-back"><path d="M47 44C16 35 10 14 24 12C38 10 48 30 49 43Z" fill="url(#flight-bee-wing)" stroke="#b2cbbd" stroke-width="1"/><path d="M24 17Q36 27 44 39" stroke="#fffdf1" stroke-width="1.4" fill="none" opacity=".8"/></g><g class="flight-wing flight-wing-front"><path d="M50 42C49 14 63 5 71 14C80 24 65 41 52 46Z" fill="url(#flight-bee-wing)" stroke="#a5c3b5" stroke-width="1"/><path d="M67 15Q60 26 54 38" stroke="#fffdf1" stroke-width="1.6" fill="none" opacity=".85"/></g>
 <path d="M24 55L15 60L25 64" fill="#665b42"/><ellipse cx="47" cy="54" rx="25" ry="20" transform="rotate(-13 47 54)" fill="url(#flight-bee-honey)"/><path d="M33 36Q26 53 36 71M46 34Q40 52 51 73" stroke="#6b5c40" stroke-width="7"/><path d="M36 39Q44 34 51 37" stroke="#fff2bd" stroke-opacity=".7" stroke-width="1.8" fill="none"/><ellipse cx="67" cy="49" rx="15" ry="16" transform="rotate(-15 67 49)" fill="#f1d58d"/>
 <path class="flight-antennae" d="M62 35Q56 25 52 26M72 35Q73 22 78 23" stroke="#665a3f" stroke-width="2" stroke-linecap="round" fill="none"/><g fill="#665a3f"><circle cx="53" cy="26" r="2.2"/><circle cx="78" cy="23" r="2.2"/></g><g class="flight-eyes-awake" fill="#4c4e36"><circle cx="66" cy="46" r="2.1"/><circle cx="75" cy="45" r="1.8"/></g><path class="flight-eyes-sleep" d="M63 46q3 3 6 0m3-1q3 3 5 0" stroke="#665a3f" stroke-width="1.5" fill="none" stroke-linecap="round"/><path class="flight-smile" d="M69 53Q73 57 77 51" stroke="#67583e" stroke-width="1.5" fill="none" stroke-linecap="round"/><ellipse class="flight-curious-mouth" cx="73" cy="54" rx="1.4" ry="2" fill="#67583e"/><ellipse cx="64" cy="52" rx="3" ry="1.5" fill="#e8a17f" opacity=".65"/><path d="M43 72L42 78M57 70L60 77" stroke="#665a3f" stroke-width="2" stroke-linecap="round"/>
 <g class="flight-pollen-baskets">${flowers.map((f,i)=>`<g data-flight-pollen="${f.id}" class="flight-pollen-grain"><circle cx="${41+i%3*3.1+(i>2?13:0)}" cy="${76+i%2*2}" r="2.6" fill="${f.color}" stroke="#bc934d" stroke-width=".45"/><circle cx="${40.5+i%3*3.1+(i>2?13:0)}" cy="${75.1+i%2*2}" r=".55" fill="#fffae5"/></g>`).join('')}</g></svg>`;
}
function wreathSVG(){
 return `<svg class="flight-wreath" viewBox="0 0 180 155" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M69 137C20 127 13 62 43 28M111 137C160 127 167 62 137 28" fill="none" stroke="#7b9768" stroke-width="1.8"/>${Array.from({length:12},(_,i)=>{const a=(i*28+8)*Math.PI/180,x=90+64*Math.cos(a),y=75+59*Math.sin(a);return `<g transform="translate(${x} ${y}) rotate(${i*28})"><path d="M0 0Q-13-1-14-12Q-3-14 0 0M1 0Q13 1 13 11Q2 13 1 0" fill="${i%2?'#9baa7d':'#778f64'}" opacity=".9"/></g>`;}).join('')}${FLIGHT_FLOWERS.map((f,i)=>{const a=(i*60-90)*Math.PI/180;return `<g transform="translate(${90+63*Math.cos(a)} ${75+57*Math.sin(a)}) scale(2.1)">${flowerHead(f)}</g>`;}).join('')}<path d="M85 132L72 150L88 144L92 154L98 135" fill="#d5b686"/><path d="M85 134Q75 121 78 116Q90 115 94 130Q99 114 108 119Q112 128 96 135Z" fill="#e0c69a"/><circle cx="92" cy="134" r="4" fill="#c6a16f"/></svg>`;
}
function flightNaturalBorder(){
 const corners=[[0,0,0],[100,0,90],[100,62,180],[0,62,270]];
 const leaves=corners.map(([x,y,angle])=>`<g transform="translate(${x} ${y}) rotate(${angle})"><path d="M0 0H14Q5 1 5 8Q3 12 0 13Z" fill="var(--flight-near)" opacity=".68"/><path d="M0 1Q6 2 12 0M0 6Q3 1 8 0" stroke="var(--flight-grass)" stroke-width=".3" fill="none"/><ellipse cx="4" cy="1.6" rx="2.3" ry="1.2" fill="var(--flight-grass)" opacity=".55"/><ellipse cx="2" cy="4" rx="1.2" ry="2.6" fill="var(--flight-grass)" opacity=".53"/></g>`).join('');
 return `<g class="flight-natural-border" pointer-events="none">${leaves}<path d="M20 61.4Q26 59.7 32 61.4M61 61.4Q67 59.6 74 61.4M.65 22Q2.2 28 .65 33M99.4 31Q97.9 36 99.4 41" fill="none" stroke="var(--flight-grass)" stroke-width=".48" stroke-opacity=".7"/></g>`;
}
function flightAnchor(id){
 if(id==='pond')return '<g data-flight-landmark="bridge" transform="translate(68 42)"><ellipse rx="12" ry="5.6" fill="#9cbdb8"/><path d="M-10 1Q0-7 10 1V3Q0-4-10 3Z" fill="#ba9470" stroke="#785e49" stroke-width=".45"/><path d="M-9-1Q0-9 9-1M-9-1V2M9-1V2M-4-4V-.1M4-4V-.1" fill="none" stroke="#9c7958" stroke-width=".65"/></g>';
 if(id==='shade')return '<g data-flight-landmark="stone" transform="translate(72 26)"><ellipse cy="2.8" rx="9.8" ry="2.5" fill="#6c7868" opacity=".35"/><path d="M-9 1Q-10-6-3-8L5-6Q10-4 10 1Q4 6-9 1Z" fill="#929888" stroke="#687468" stroke-width=".5"/><path d="m-8-2 5-4 8 1.4 3 3.5" fill="none" stroke="#bac1a8" stroke-width=".8"/><path d="M-8 1Q-10-3-5-4Q-3-1 0 1" fill="#748865"/></g>';
 return '<g data-flight-landmark="stump" transform="translate(25 27)"><ellipse cy="5" rx="8.2" ry="2.1" fill="#798365" opacity=".35"/><path d="M-5-3Q0-6 5-3L6 3Q1 7-8 4L-5-3Z" fill="#9f7b59" stroke="#795d46" stroke-width=".5"/><ellipse cy="-3" rx="5.4" ry="2.4" fill="#d1aa78" stroke="#826648" stroke-width=".5"/><ellipse cy="-3" rx="3.2" ry="1.2" fill="none" stroke="#a7865e" stroke-width=".35"/><path d="M-4-.5L-5 3M0 0V4M3-.4L4 3M-8 4l-2 1m13 0 4 1" stroke="#75543d" stroke-width=".5"/></g>';
}
function sceneSVG(layout){
 const {flowers,secrets}=layout;
 return `<svg class="flight-landscape" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="flight-meadow" x2="0" y2="1"><stop class="flight-meadow-top"/><stop offset="1" class="flight-meadow-bottom"/></linearGradient><radialGradient id="flight-glow"><stop stop-color="#fff8c3" stop-opacity=".9"/><stop offset="1" stop-color="#fff8c3" stop-opacity="0"/></radialGradient><pattern id="flight-paper-grain" width="2.1" height="2.1" patternUnits="userSpaceOnUse"><circle cx=".3" cy=".3" r=".06" fill="#536748" opacity=".25"/><circle cx="1.4" cy="1.5" r=".08" fill="#fffce4" opacity=".45"/></pattern></defs>
 <rect width="100" height="62" rx="3" fill="url(#flight-meadow)"/><g data-flight-layer="far"><circle class="flight-sun" cx="83" cy="8" r="17" fill="url(#flight-glow)"/><path d="M-8 23Q15 6 28 13T57 9T108 19V-8H-8Z" fill="var(--flight-far)"/><path d="M-9 27Q14 14 28 20T65 16T110 29" fill="none" stroke="var(--flight-far)" stroke-width="4" opacity=".35"/><g fill="var(--flight-far)" opacity=".7"><ellipse cx="8" cy="6" rx="11" ry="5"/><ellipse cx="43" cy="2" rx="12" ry="4"/></g></g>
 <g data-flight-layer="near"><path d="M-8 58Q19 45 34 51T69 48T108 56V70H-8Z" fill="var(--flight-near)"/><path d="M5 44Q20 27 36 32T62 25T95 37" fill="none" stroke="#f2e9ce" stroke-width="6" stroke-linecap="round" opacity=".62"/><path d="M5 44Q20 27 36 32T62 25T95 37" fill="none" stroke="#bfb48f" stroke-width=".2" stroke-dasharray="1 1.2" opacity=".65"/><ellipse cx="18" cy="53" rx="10" ry="4.6" fill="#a9c5b8"/><ellipse cx="18" cy="52.5" rx="8.5" ry="3.4" fill="#c4dcd1"/><path d="M11 54Q16 52 23 53" fill="none" stroke="#f7f8df" stroke-width=".4"/></g>
 ${secrets.map(s=>`<g data-flight-secret="${s.id}" transform="translate(${s.x} ${s.y})"><circle class="flight-secret-glow" r="4.2" fill="url(#flight-glow)"/>${secretDrawing(s.id)}<path class="flight-secret-spark" d="M3-4v2M2-3h2" stroke="#fff7ce" stroke-width=".3" stroke-linecap="round"/></g>`).join('')}
 ${flightLandmarks(layout.name)}${flightAnchor(layout.id)}${flowers.map(flowerSVG).join('')}${flightNaturalBorder()}<g data-flight-layer="foreground">${[-3,3,8,18,29,39,48,61,71,92,97,103].map((x,i)=>`<g transform="translate(${x} ${60-i%3})"><path d="M0 5Q-2-2-3-3M0 5Q1-1 0-5M0 5Q2-2 3-3" stroke="var(--flight-grass)" stroke-width="${.4+i%3*.1}" fill="none"/><path d="M0 4Q-5 0-5-2Q-1-2 0 4M1 4Q5 0 6 1Q6 4 1 4" fill="var(--flight-grass)" opacity=".55"/></g>`).join('')}</g><g opacity=".5" fill="#f7f7db">${[[8,10],[35,7],[43,51],[68,47],[95,28],[39,23],[67,11]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".35"/>`).join('')}</g><rect width="100" height="62" fill="url(#flight-paper-grain)" opacity=".55" pointer-events="none"/></svg>`;
}
function flightLandmarks(name) {
 if(name===FLIGHT_MAPS.pond.name)return '<g fill="none" stroke="#689292" stroke-width=".9"><path d="M48 51Q58 40 72 43T96 37" stroke-dasharray="2 1"/><path d="M16 35Q29 31 40 37T57 34"/></g><g fill="#a7bd8d"><ellipse cx="66" cy="43" rx="6" ry="2"/><ellipse cx="91" cy="34" rx="4" ry="1.6"/><ellipse cx="78" cy="46" rx="4.5" ry="1.8"/></g>';
 if(name===FLIGHT_MAPS.shade.name)return '<g fill="#617d58" opacity=".65"><path d="M2 2Q19-3 29 9Q17 12 7 8ZM98 2Q72-1 69 12Q90 15 98 6ZM35 8Q42 0 53 3Q50 9 35 8Z"/></g><path d="M8 50Q28 46 37 37Q44 32 58 35T78 29Q87 24 98 28" fill="none" stroke="#b9af92" stroke-width="2" stroke-dasharray="1 1"/><g fill="#b7a98e"><ellipse cx="61" cy="53" rx="9" ry="2.8"/><ellipse cx="86" cy="40" rx="7" ry="2"/></g>';
 return '';
}
function flightDetailsSVG(secrets){return `<svg class="flight-detail-layer" viewBox="0 0 100 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g class="flight-micro-life"><g transform="translate(35 22)"><path d="M-2 3h4L1-2h-2Z" fill="#e4d8ba"/><path d="M-5-1Q0-8 5-1Z" fill="#bd8778"/><circle cx="-1" cy="-3" r=".5" fill="#fff5d6"/><circle cx="2" cy="-2" r=".4" fill="#fff5d6"/></g><g transform="translate(70 41)"><ellipse rx="1.8" ry="2.7" fill="#c5836d"/><path d="M0-2V2" stroke="#625e43" stroke-width=".25"/><g fill="#6a6046"><circle cx="-.8" cy="-.8" r=".35"/><circle cx=".8" cy=".8" r=".35"/></g></g><g transform="translate(18 35)"><path d="M0 3V-2" stroke="#68845e" stroke-width=".3"/><path d="M0 0Q-5-5-3-7Q1-5 0 0M0 0Q5-5 3-7Q-1-5 0 0" fill="#bfc8a5"/></g></g>${secrets.map(secret=>`<g class="flight-secret-cover" data-secret-cover="${secret.id}" transform="translate(${secret.x} ${secret.y})"><path d="M-5 3Q-8-4 4-6Q9 1-5 3" fill="#8b9e6f" stroke="#69825a" stroke-width=".3"/><path d="M-5 3 3-4" stroke="#bdc99c" stroke-width=".3"/></g>`).join('')}<polyline class="flight-recent-trail" fill="none" stroke="#fff5c2" stroke-width=".5" stroke-linecap="round"/><polyline class="flight-drawn-route" fill="none" stroke="#7a8c62" stroke-width=".3" stroke-dasharray="1 1"/>${Array.from({length:6},(_,i)=>`<rect data-flight-area="${i}" x="${i%3*100/3}" y="${Math.floor(i/3)*31}" width="${100/3}" height="31" fill="#f7f2d4" opacity=".14"/>`).join('')}</svg>`;}
function flightMapDetail(){
 return Array.from({length:6},(_,i)=>{
  const x=i%3*100/3,y=Math.floor(i/3)*31;
  return `<g data-flight-map-detail="${i}" transform="translate(${x} ${y})"><rect width="33.34" height="31" fill="#dce6c9"/><path d="M1 23Q13 15 33 22M0 26Q17 19 33 25" stroke="#b6cba6" stroke-width=".8" fill="none"/><path d="M7 12v7m-3-4 3 2 3-2m12-7v7m-3-4 3 2 3-2m7 12v6" stroke="#78936b" stroke-width=".85" stroke-linecap="round" fill="none"/></g>`;
 }).join('');
}
function flightMiniMap(layout){
 const flowers=layout.flowers.map(flower=>`<g data-flight-map-flower="${flower.id}" transform="translate(${flower.x} ${flower.y})" fill="${flower.color}" stroke="#516548" stroke-width=".55"><path d="M0-3.3C2.6-4.5 4-1.1 2.3.5C3.7 3.2.7 4.3 0 2.5C-1.8 4.6-4.2 2.9-2.5.6C-4-1.5-2.8-4.1 0-3.3Z"/><circle r=".9" fill="#d9a34d" stroke="none"/></g>`).join('');
 const secrets=layout.secrets.map(secret=>`<rect data-flight-map-secret="${secret.id}" x="${secret.x-1.65}" y="${secret.y-1.65}" width="3.3" height="3.3" rx=".55" fill="#765d83" stroke="#faf0d9" stroke-width=".65"/>`).join('');
 return `<div class="flight-minimap" role="img" aria-label="Карта поляны. Цветы отмечены лепестками, тайники — квадратами, маршрут — ромбами, Жужа — кругом."><svg viewBox="0 0 100 62" aria-hidden="true"><rect width="100" height="62" rx="4" fill="#edf0d7"/>${flightMapDetail()}<polyline class="flight-map-travelled" fill="none" stroke="${layout.color}" stroke-width="1.2" stroke-linecap="round"/>${flowers}${secrets}<g class="flight-map-waypoints" fill="#fff6d8" stroke="#42695f" stroke-width=".65"></g><rect class="flight-map-window" fill="none" stroke="#597b5b" stroke-width="1"/><circle class="flight-map-bee" r="3" fill="#d0a449" stroke="#536e50" stroke-width=".6"/></svg></div>`;
}
function flightWaypoints(route){
 const stride=Math.max(1,Math.ceil(route.length/10));
 return route.filter((_,index)=>index%stride===0||index===route.length-1).map(({x,y})=>`<path d="M${x} ${y-1.9}l1.9 1.9-1.9 1.9-1.9-1.9Z"/>`).join('');
}
function createFlightFeature(api){
 let active=null,generation=0,saveQueue=Promise.resolve(),pendingSnapshot=null,pendingRevision=0;
 function dispose(){
  if(!active)return;const old=active;active=null;generation++;cancelAnimationFrame(old.frame);old.controller.abort();old.keys.clear();old.target=null;
  if(old.dirty)persist(old.state);
 }
 function persist(snapshot){
  const captured=normalizeFlightState(snapshot),revision=++pendingRevision;
  pendingSnapshot=pendingSnapshot?mergeFlightProgress(pendingSnapshot,captured):captured;
  saveQueue=saveQueue.catch(()=>{}).then(()=>api.commit(({extras})=>{extras.flight=mergeFlightProgress(extras.flight,captured);})).catch(()=>{api.toast('Прогулка пока в памяти. Сохраните копию сада перед закрытием.');}).finally(()=>{if(revision===pendingRevision)pendingSnapshot=null;});
  return saveQueue;
 }
 function open(override){
  const stored=normalizeFlightState(api.extras.flight),saved=override?.version===1?override:pendingSnapshot?mergeFlightProgress(stored,pendingSnapshot):stored,complete=isFlightComplete(saved);
  const layout=flightMapLayout(saved.map),{flowers,secrets}=layout;
  const html=`<section class="flight-app" data-flight-mood="${saved.mood}"><div class="flight-intro"><div><span class="flight-kicker">МАЛЕНЬКОЕ ПУТЕШЕСТВИЕ</span><h3>У сада есть свои секреты</h3><p>Шесть цветков, три тихие находки и сколько угодно времени. Летите туда, где интересно.</p></div><span class="flight-stamp">без спешки<br><b>и без проигрыша</b></span></div>
 <label class="field"><span>Карта для прогулки</span><select data-flight-map>${Object.entries(FLIGHT_MAPS).map(([id,map])=>`<option value="${id}" ${saved.map===id?'selected':''}>${map.name}</option>`).join('')}</select></label><fieldset class="flight-moods"><legend>Настроение поляны</legend><div>${FLIGHT_MOODS.map(m=>`<button type="button" data-flight-mood-choice="${m.id}" aria-pressed="${saved.mood===m.id}"><i aria-hidden="true" class="flight-mood-swatch flight-mood-${m.id}"></i><span>${m.name}</span></button>`).join('')}</div><p class="flight-mood-caption">${FLIGHT_MOODS.find(m=>m.id===saved.mood).caption}</p></fieldset>
 <div class="flight-score" aria-label="Найдено"><span>Пыльца <b data-flight-count="pollen">${saved.pollen.length} / 6</b></span><span>Секреты <b data-flight-count="secrets">${saved.secrets.length} / 3</b></span><button type="button" class="button secondary" data-flight-action="pause">Начать полёт</button></div>
 <div class="flight-stage" tabindex="0" role="group" aria-label="Поляна для полёта Жужи" aria-describedby="flight-instructions"><div class="flight-world">${sceneSVG(layout)}${flightDetailsSVG(secrets)}<div class="flight-destination" hidden aria-hidden="true"></div><div class="flight-bee" aria-hidden="true">${flightBeeSVG(flowers)}</div></div>${flightMiniMap(layout)}<div class="flight-overlay"><span>${complete?'Все маленькие чудеса найдены':'Привет, я Жужа!'}</span><p>${complete?'Можно просто полетать или начать новую прогулку.':'Нажмите «Начать полёт» и выберите место на поляне.'}</p></div></div>
 <div class="flight-explorer-tools"><label class="field"><span>Приближение и камера</span><select data-flight-zoom><option value="1" ${saved.zoom===1?'selected':''}>Вся поляна</option><option value="1.8" ${saved.zoom===1.8?'selected':''}>Ближе · камера за Жужей</option><option value="2.5" ${saved.zoom===2.5?'selected':''}>Микромир · жучки и грибы</option></select></label><div class="flight-route-tools"><button class="button secondary" data-flight-action="draw-route" aria-pressed="false">Рисовать маршрут</button><button class="button secondary" data-flight-action="route-template">Маршрут через цветы</button><button class="button primary" data-flight-action="follow-route">Пройти маршрут</button><button class="button secondary" data-flight-action="clear-route">Очистить линию</button></div><details class="flight-named-routes"><summary>Сохранённые маршруты</summary><div class="flight-route-library"><label class="field"><span>Название текущего маршрута</span><input data-flight-route-name maxlength="45"></label><button type="button" class="button secondary" data-flight-action="save-named-route">Сохранить маршрут</button><label class="field"><span>Маршруты этой карты</span><select data-flight-saved-routes></select></label><button type="button" class="button secondary" data-flight-action="remove-named-route">Убрать из списка</button></div></details><label class="flight-trail-control"><input type="checkbox" data-flight-trail ${saved.showPath?'checked':''}> Показывать путь на мини-карте</label><p class="flight-route-hint">В режиме рисования проведите линию пальцем. Или используйте готовый путь через цветы.</p></div>
 <details class="flight-extra-challenges"><summary>Секреты под листьями и цветной нектар</summary><button class="button secondary" data-flight-action="hint">Подсказка к тайнику</button><div class="flight-leaf-buttons">${secrets.map(secret=>`<button class="button secondary" data-flight-lift="${secret.id}" aria-pressed="${saved.revealed.includes(secret.id)}">Приподнять лист: ${secret.name.toLocaleLowerCase('ru')}</button>`).join('')}</div><p>Нектарный узор: посетите ромашку, лаванду и розу именно в этом порядке. Можно вернуться к уже знакомым цветкам.</p><div class="flight-nectar-order">${NECTAR_ORDER.map(id=>{const f=flowers.find(f=>f.id===id);return `<span data-nectar="${id}"><i style="background:${f.color}"></i>${f.name}</span>`;}).join('')}</div><div class="flight-actions"><button class="button secondary" data-flight-action="nectar-reset">Начать узор сначала</button><button class="button secondary" data-flight-action="nectar-next">К следующему цвету</button></div></details>
 <div class="flight-completion" aria-label="Прогулка завершена"><div class="flight-completion-art" aria-hidden="true">${wreathSVG()}<div class="flight-wreath-bee">${api.art.beeArt('','happy')}</div></div><div><span class="flight-kicker">МАЛЕНЬКОЕ БОЛЬШОЕ ОТКРЫТИЕ</span><h3>Весь луг — в одном венке</h3><p>Шесть цветков и три секрета. Жужа собрала для вас воспоминание об этой прогулке.</p></div></div>
 <div class="flight-specimen" hidden></div><p class="flight-status" role="status" aria-live="polite">${complete?'Прогулка завершена. Ваши находки сохранены.':'Полетим к цветку с золотым кружком?'}</p>
 <div class="flight-controls"><div class="flight-dpad" aria-label="Направление полёта"><button type="button" data-flight-direction="up" aria-label="Лететь вверх">↑</button><button type="button" data-flight-direction="left" aria-label="Лететь влево">←</button><button type="button" data-flight-direction="down" aria-label="Лететь вниз">↓</button><button type="button" data-flight-direction="right" aria-label="Лететь вправо">→</button></div><div class="flight-actions"><button type="button" class="button primary" data-flight-action="next">К следующей находке</button><button type="button" class="button secondary" data-flight-action="restart">Новая прогулка</button></div></div>
 <p id="flight-instructions" class="form-help">Коснитесь поляны или ведите пальцем. На клавиатуре — стрелки или WASD; пробел ставит полёт на паузу. Кнопка «К следующей находке» помогает пройти весь маршрут без точного управления. В спокойном режиме она переносит Жужу сразу.</p>
 <div class="flight-reset-confirm" hidden><p>Начать прогулку заново? Находки этой прогулки очистятся. Основной сад останется прежним.</p><div><button type="button" class="button primary" data-flight-action="confirm-restart">Да, новая прогулка</button><button type="button" class="button secondary" data-flight-action="cancel-restart">Оставить находки</button></div></div>
 <details class="flight-discoveries"><summary>Альбом маленьких находок</summary><ol>${secrets.map(s=>`<li data-flight-album="${s.id}"><span class="flight-album-tick" aria-label="${saved.secrets.includes(s.id)?'Найдено':'Пока не найдено'}">${saved.secrets.includes(s.id)?'✓':'○'}</span><figure>${albumSketch(s)}<figcaption>${api.esc(s.name)}</figcaption></figure><div><p>${saved.secrets.includes(s.id)?api.esc(s.description):'Пока не найдено. Осмотритесь у пруда, листьев и дорожки.'}</p></div></li>`).join('')}</ol></details><p class="flight-footer">Это отдельная прогулка. Вода, монеты и растения вашего сада не расходуются.</p></section>`;
  api.showDialog('Полёт Жужи',html,'flight',true);
  const root=document.querySelector('.flight-app');if(!root)return;
  const controller=new AbortController(),signal=controller.signal,token=++generation;
  const scene=root.querySelector('.flight-stage'),bee=root.querySelector('.flight-bee');
  active={state:saved,root,scene,bee,controller,frame:0,keys:new Set(),target:null,paused:true,dirty:false,last:0,pointer:null,facing:1,tilt:0,travel:0,moving:false,emotionUntil:0,token,drawRoute:false,following:false,routeCursor:0,trail:[],lastVisited:null,hintTarget:'',hintLevel:0,camera:{x:0,y:0,zoom:saved.zoom},mapMarksKey:''};
  const listen=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal});
  function setStatus(text){root.querySelector('.flight-status').textContent=text;}
  function routeLibrary(selected=''){
    const select=root.querySelector('[data-flight-saved-routes]');
    select.innerHTML='<option value="">Выберите маршрут</option>'+active.state.namedRoutes.filter(route=>route.map===active.state.map)
      .map(route=>`<option value="${route.id}">${api.esc(route.name)}</option>`).join('');
    select.value=selected;
    root.querySelector('[data-flight-action="remove-named-route"]').disabled=!select.value;
  }
  function showSpecimen(flower){
    if(!flower?.speciesId)return;
    const species=api.game.CATALOG.find(entry=>entry.id===flower.speciesId);
    if(!species)return;
    const card=root.querySelector('.flight-specimen');
    card.hidden=false;
    card.innerHTML=`<strong>${api.esc(species.name)}</strong><span>${api.esc(species.latinName)}</span><button type="button" class="button secondary" data-feature="study" data-id="${species.id}">Открыть карточку вида</button>`;
  }
  function setPaused(paused,reason=''){
   if(!active||active.token!==token)return;cancelAnimationFrame(active.frame);active.frame=0;active.paused=paused;active.last=0;active.keys.clear();active.target=null;
   root.querySelector('[data-flight-action="pause"]').textContent=paused?'Продолжить полёт':'Пауза';root.classList.toggle('is-paused',paused);root.classList.remove('is-moving');bee.classList.remove('is-celebrating');bee.dataset.emotion=paused?'paused':'happy';bee.style.setProperty('--flight-tilt','0deg');bee.style.setProperty('--flight-lift','0px');
   const overlay=root.querySelector('.flight-overlay');overlay.hidden=!paused;overlay.querySelector('span').textContent=paused?'Маленькая передышка':'';overlay.querySelector('p').textContent=reason||'Находки остаются с вами. Продолжайте, когда захотите.';
   if(paused){active.pointer=null;if(active.dirty){persist(active.state);active.dirty=false;}}
   root.querySelector('.flight-destination').hidden=true;
   if(!paused&&!document.hidden)active.frame=requestAnimationFrame(frame);
  }
  const mapAreas=[...root.querySelectorAll('[data-flight-map-detail]')],mapFlowers=[...root.querySelectorAll('[data-flight-map-flower]')],mapSecrets=[...root.querySelectorAll('[data-flight-map-secret]')];
  const mapWaypoints=root.querySelector('.flight-map-waypoints');
  function paintMapMarks(s){
   const route=s.showPath?flightWaypoints(s.route):'';
   const key=[s.explored.join(','),s.pollen.join(','),s.revealed.join(','),s.secrets.join(','),route].join('|');
   if(key===active.mapMarksKey)return;
   active.mapMarksKey=key;
   for(const area of mapAreas)area.classList.toggle('is-explored',s.explored.includes(Number(area.dataset.flightMapDetail)));
   for(const flower of mapFlowers)flower.classList.toggle('is-found',s.pollen.includes(flower.dataset.flightMapFlower));
   for(const secret of mapSecrets)secret.classList.toggle('is-revealed',s.revealed.includes(secret.dataset.flightMapSecret)||s.secrets.includes(secret.dataset.flightMapSecret));
   if(mapWaypoints.innerHTML!==route)mapWaypoints.innerHTML=route;
  }
  function paint(events=[]){
   if(!active||active.token!==token)return;const s=active.state;
   const world=root.querySelector('.flight-world'),zoom=s.zoom,cameraX=zoom===1?0:Math.max(1-zoom,Math.min(0,.5-s.x/100*zoom))*100,cameraY=zoom===1?0:Math.max(1-zoom,Math.min(0,.5-s.y/62*zoom))*100;active.camera={x:cameraX,y:cameraY,zoom};world.style.transform=`translate(${cameraX}%,${cameraY}%) scale(${zoom})`;root.classList.toggle('is-zoomed',zoom>1);root.querySelector('.flight-map-bee').setAttribute('cx',s.x);root.querySelector('.flight-map-bee').setAttribute('cy',s.y);const view=root.querySelector('.flight-map-window');view.setAttribute('x',-cameraX/zoom);view.setAttribute('y',-cameraY/100*62/zoom);view.setAttribute('width',100/zoom);view.setAttribute('height',62/zoom);root.querySelector('.flight-drawn-route').setAttribute('points',s.route.map(p=>p.x+','+p.y).join(' '));root.querySelector('.flight-recent-trail').setAttribute('points',active.trail.map(p=>p.x+','+p.y).join(' '));root.querySelectorAll('[data-secret-cover]').forEach(el=>el.classList.toggle('is-lifted',s.revealed.includes(el.dataset.secretCover)||s.secrets.includes(el.dataset.secretCover)));root.querySelectorAll('[data-flight-area]').forEach(el=>el.classList.toggle('is-explored',s.explored.includes(Number(el.dataset.flightArea))));root.querySelectorAll('[data-nectar]').forEach(el=>el.classList.toggle('is-filled',s.nectar.includes(el.dataset.nectar)));
   bee.style.left=s.x/WIDTH*100+'%';bee.style.top=s.y/HEIGHT*100+'%';bee.style.setProperty('--flight-facing',active.facing);
   const calm=api.prefs.calm||matchMedia('(prefers-reduced-motion: reduce)').matches;
   root.classList.toggle('is-calm',calm);root.classList.toggle('is-moving',active.moving&&!active.paused);root.classList.toggle('is-complete',allFlightFinds(s));
   root.querySelector('.flight-map-travelled').setAttribute('points',s.showPath?s.path.map(point=>point.x+','+point.y).join(' '):'');
    paintMapMarks(s);
   const curious=secrets.some(secret=>!s.secrets.includes(secret.id)&&Math.hypot(s.x-secret.x,s.y-secret.y)<12);
   if(events.some(e=>e.type==='pollen'||e.type==='secret')){active.emotionUntil=performance.now()+2200;if(!calm&&!active.paused){bee.classList.remove('is-celebrating');void bee.offsetWidth;bee.classList.add('is-celebrating');}}
   bee.dataset.emotion=active.paused?'paused':performance.now()<active.emotionUntil?'happy':curious?'curious':'happy';
   bee.style.setProperty('--flight-tilt',(calm?0:active.tilt).toFixed(2)+'deg');bee.style.setProperty('--flight-lift',(calm||active.paused?0:Math.sin(active.travel*.26)*1.8).toFixed(2)+'px');
   const offsets={far:.45,near:1.1,foreground:2.2};
   root.querySelectorAll('[data-flight-layer]').forEach(el=>{const speed=calm?0:offsets[el.dataset.flightLayer];el.setAttribute('transform',`translate(${((50-s.x)/50*speed).toFixed(3)} ${((31-s.y)/31*speed*.3).toFixed(3)})`);});
   root.querySelectorAll('[data-flight-pollen]').forEach(el=>el.classList.toggle('is-collected',s.pollen.includes(el.dataset.flightPollen)));
   root.querySelector('[data-flight-count="pollen"]').textContent=s.pollen.length+' / 6';root.querySelector('[data-flight-count="secrets"]').textContent=s.secrets.length+' / 3';
   root.querySelectorAll('[data-flight-flower]').forEach(el=>{const f=flowers.find(f=>f.id===el.dataset.flightFlower);el.classList.toggle('is-collected',s.pollen.includes(f.id));el.classList.toggle('is-near',Math.hypot(s.x-f.x,s.y-f.y)<7);});
   root.querySelectorAll('[data-flight-secret]').forEach(el=>el.classList.toggle('is-found',s.secrets.includes(el.dataset.flightSecret)));
   for(const secret of secrets){const row=root.querySelector(`[data-flight-album="${secret.id}"]`);row.classList.toggle('is-found',s.secrets.includes(secret.id));row.querySelector('.flight-album-tick').textContent=s.secrets.includes(secret.id)?'✓':'○';row.querySelector('.flight-album-tick').setAttribute('aria-label',s.secrets.includes(secret.id)?'Найдено':'Пока не найдено');row.querySelector('p').textContent=s.secrets.includes(secret.id)?secret.description:'Пока не найдено. Осмотритесь у пруда, листьев и дорожки.';}
   for(const event of events)if(event.type==='pollen')showSpecimen(flowers.find(flower=>flower.id===event.id));
   if(events.length){setStatus(events.map(e=>e.text).join(' '));persist(s);active.dirty=false;}
   if(events.some(e=>e.type==='complete')){root.classList.add('is-complete');setPaused(true,'Все шесть цветков и три секрета найдены. Можно начать новую прогулку или просто полетать.');root.querySelector('.flight-overlay>span').textContent='Сад рассказал свои секреты';}
  }
  function start(){if(active?.token===token){setPaused(false);scene.focus({preventScroll:true});}}
  function target(point){if(!active||active.token!==token)return;if(active.paused)start();active.keys.clear();active.target={x:finite(point.x,4,96,8),y:finite(point.y,5,57,40)};const marker=root.querySelector('.flight-destination');marker.hidden=false;marker.style.left=active.target.x+'%';marker.style.top=active.target.y/HEIGHT*100+'%';}
  function fromPointer(event){const box=root.querySelector('.flight-world').getBoundingClientRect();return {x:(event.clientX-box.left)/Math.max(1,box.width)*WIDTH,y:(event.clientY-box.top)/Math.max(1,box.height)*HEIGHT};}
  function frame(time){
   if(!active||active.token!==token||!root.isConnected)return;
   active.frame=0;const a=active,dt=a.last?Math.min(.05,(time-a.last)/1000):0;a.last=time;
   if(!a.paused&&!document.hidden){
    const dx=Number(a.keys.has('right'))-Number(a.keys.has('left')),dy=Number(a.keys.has('down'))-Number(a.keys.has('up'));
    if(a.following&&!a.target&&a.state.route[a.routeCursor])a.target=a.state.route[a.routeCursor];
    const old=a.state,result=stepFlight(old,{dx,dy,target:a.target},dt);a.state=result.state;
    const area=Math.min(2,Math.floor(a.state.x/100*3))+(a.state.y>=31?3:0);if(!a.state.explored.includes(area)){a.state.explored.push(area);a.dirty=true;}
    const visit=flowers.find(f=>Math.hypot(a.state.x-f.x,a.state.y-f.y)<3.6)?.id||null;if(visit&&visit!==a.lastVisited&&a.state.nectar.length<3){a.state=collectNectar(a.state,visit);a.dirty=true;if(a.state.nectar.length===3)setStatus('Нектарный узор собран: ромашка, лаванда и роза!');}a.lastVisited=visit;
    const travelX=result.state.x-old.x,travelY=result.state.y-old.y,distance=Math.hypot(travelX,travelY);a.moving=distance>.001;a.travel+=distance;if(distance>.001&&(!a.trail.length||Math.hypot(a.state.x-a.trail.at(-1).x,a.state.y-a.trail.at(-1).y)>.6)){a.trail.push({x:a.state.x,y:a.state.y});a.trail=a.trail.slice(-80);}
    if(Math.abs(travelX)>.001)a.facing=travelX>0?1:-1;
    const tilt=a.moving?Math.max(-22,Math.min(22,travelY/Math.max(.1,distance)*20)):0;a.tilt+=(tilt-a.tilt)*Math.min(1,dt*9);
    if(result.state.x!==old.x||result.state.y!==old.y)a.dirty=true;
    if(a.target&&Math.hypot(a.state.x-a.target.x,a.state.y-a.target.y)<.4){a.target=null;root.querySelector('.flight-destination').hidden=true;if(a.following){a.routeCursor++;if(a.routeCursor>=a.state.route.length){a.following=false;setStatus('Нарисованный маршрут пройден. Можно придумать новый!');persist(a.state);a.dirty=false;}}}
    paint(result.events);
   }
   if(active?.token===token&&!active.paused&&!document.hidden)active.frame=requestAnimationFrame(frame);
  }
  const directionFor=e=>({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right'})[e.code]||({w:'up',s:'down',a:'left',d:'right'})[e.key?.toLowerCase()];
  listen(root,'keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,textarea,select'))return;const d=directionFor(e);if(d){e.preventDefault();if(active.paused)start();active.target=null;active.following=false;active.keys.add(d);}else if(e.code==='Space'&&!e.target.closest('button,summary')){e.preventDefault();setPaused(!active.paused);}});
  listen(document,'keyup',e=>{const d=directionFor(e);if(d)active?.keys.delete(d);});
  listen(window,'blur',()=>setPaused(true));
  listen(document,'visibilitychange',()=>{if(document.hidden)setPaused(true,'Вкладка скрыта, поэтому Жужа отдыхает. Продолжите полёт, когда вернётесь.');});
  listen(scene,'pointerdown',e=>{if(e.button!==0||e.target.closest('.flight-minimap'))return;e.preventDefault();active.pointer=e.pointerId;scene.setPointerCapture?.(e.pointerId);if(active.drawRoute){active.state.route=[];appendRoute(fromPointer(e));}else{active.following=false;target(fromPointer(e));}});
  listen(scene,'pointermove',e=>{if(active.pointer===e.pointerId){if(active.drawRoute)appendRoute(fromPointer(e));else target(fromPointer(e));}});
  function appendRoute(point){if(!active)return;const last=active.state.route.at(-1);if(active.state.route.length<160&&(!last||Math.hypot(last.x-point.x,last.y-point.y)>1)){active.state.route.push({x:finite(point.x,4,96,8),y:finite(point.y,5,57,40)});active.dirty=true;paint();}}
  const releasePointer=e=>{if(active?.pointer===e.pointerId){active.pointer=null;if(active.drawRoute){persist(active.state);active.dirty=false;setStatus('Маршрут нарисован: '+active.state.route.length+' точек. Нажмите «Пройти маршрут».');}}};listen(scene,'pointerup',releasePointer);listen(scene,'pointercancel',releasePointer);
  root.querySelectorAll('[data-flight-direction]').forEach(button=>{
   listen(button,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();start();active.keys.add(button.dataset.flightDirection);button.setPointerCapture?.(e.pointerId);});
   for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(button,type,()=>active?.keys.delete(button.dataset.flightDirection));
   listen(button,'click',e=>{if(e.detail!==0)return;const d=button.dataset.flightDirection,delta={up:[0,-8],down:[0,8],left:[-8,0],right:[8,0]}[d];target({x:active.state.x+delta[0],y:active.state.y+delta[1]});});
  });
  listen(root.querySelector('[data-flight-map]'),'change',event=>{
    if(!active)return;
    const next=selectFlightMap(active.state,event.target.value);
    active.dirty=false;
    persist(next);
    open(next);
    document.querySelector('[data-flight-map]')?.focus({preventScroll:true});
  });
  listen(root.querySelector('[data-flight-trail]'),'change',event=>{
    active.state.showPath=event.target.checked;paint();persist(active.state);
  });
  listen(root.querySelector('[data-flight-saved-routes]'),'change',event=>{
    const route=active.state.namedRoutes.find(entry=>entry.id===event.target.value&&entry.map===active.state.map);
    root.querySelector('[data-flight-action="remove-named-route"]').disabled=!route;
    if(!route)return;
    setPaused(true);
    active.following=false;
    active.state.route=routePoints(route.points);
    root.querySelector('[data-flight-route-name]').value=route.name;
    paint();
    persist(active.state);
    setStatus('Маршрут «'+route.name+'» открыт.');
  });
  listen(root.querySelector('[data-flight-zoom]'),'change',e=>{active.state.zoom=Number(e.target.value);paint();persist(active.state);setStatus(active.state.zoom>1?'Камера следует за Жужей. На приближении видны маленькие жители поляны.':'Вся поляна снова перед вами.');});
  listen(root,'animationend',e=>{if(e.target.classList?.contains('flight-bee-drawing'))bee.classList.remove('is-celebrating');});
  listen(root,'click',e=>{
   const lift=e.target.closest('[data-flight-lift]');if(lift){const id=lift.dataset.flightLift;if(!active.state.revealed.includes(id))active.state.revealed.push(id);lift.setAttribute('aria-pressed','true');paint();persist(active.state);setStatus('Лист приподнят. Подлетите к тайнику, чтобы записать находку.');return;}
   const mood=e.target.closest('[data-flight-mood-choice]')?.dataset.flightMoodChoice;
   if(mood&&active&&FLIGHT_MOODS.some(m=>m.id===mood)){
    active.state={...active.state,mood};root.dataset.flightMood=mood;
    root.querySelectorAll('[data-flight-mood-choice]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.flightMoodChoice===mood)));
    root.querySelector('.flight-mood-caption').textContent=FLIGHT_MOODS.find(m=>m.id===mood).caption;
    persist(active.state);active.dirty=false;return;
   }
   const action=e.target.closest('[data-flight-action]')?.dataset.flightAction;if(!action||!active)return;
   if(action==='save-named-route'){
      const name=cleanRouteName(root.querySelector('[data-flight-route-name]').value);
      const state=active.state,existing=state.namedRoutes.find(route=>route.map===state.map&&route.name===name);
      if(!name||state.route.length<2){setStatus('Введите название и нарисуйте маршрут из двух или более точек.');return;}
      if(!existing&&state.namedRoutes.length>=10){setStatus('Сохранено десять маршрутов. Освободите место для нового.');return;}
      const id=existing?.id||'route-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
      const entry={id,map:state.map,name,points:routePoints(state.route)};
      state.namedRoutes=existing?state.namedRoutes.map(route=>route.id===id?entry:route):[...state.namedRoutes,entry];
      routeLibrary(id);persist(state);setStatus('Путь «'+name+'» сохранён.');
   }else if(action==='remove-named-route'){
      const id=root.querySelector('[data-flight-saved-routes]').value;
      active.state.namedRoutes=active.state.namedRoutes.filter(route=>route.id!==id);
      routeLibrary();persist(active.state);setStatus('Маршрут убран из списка.');
   }else if(action==='hint'){
      const first=nextFlightHint(active.state);
      active.hintLevel=first.id===active.hintTarget?Math.min(3,active.hintLevel+1):1;
      active.hintTarget=first.id;
      setStatus(nextFlightHint(active.state,active.hintLevel).text);
   }else if(action==='draw-route'){setPaused(true);active.drawRoute=!active.drawRoute;root.classList.toggle('is-drawing-route',active.drawRoute);e.target.closest('button').setAttribute('aria-pressed',String(active.drawRoute));setStatus(active.drawRoute?'Проведите линию по поляне. Камера остаётся на месте.':'Обычное управление полётом.');}
   else if(action==='route-template'){active.state.route=flowers.map(f=>({x:f.x,y:f.y}));active.following=false;paint();persist(active.state);setStatus('Маршрут через шесть цветков готов. Нажмите «Пройти маршрут».');}
   else if(action==='clear-route'){active.state.route=[];active.following=false;paint();persist(active.state);}
   else if(action==='follow-route'){if(active.state.route.length<2){setStatus('Нарисуйте минимум две точки или выберите маршрут через цветы.');return;}active.drawRoute=false;root.classList.remove('is-drawing-route');root.querySelector('[data-flight-action=draw-route]').setAttribute('aria-pressed','false');start();active.following=true;active.routeCursor=0;if(api.prefs.calm||matchMedia('(prefers-reduced-motion: reduce)').matches){for(const point of active.state.route){const result=stepFlight({...active.state,x:point.x,y:point.y},{},.01);active.state=result.state;const f=flowers.find(f=>Math.hypot(point.x-f.x,point.y-f.y)<3.6);if(f)active.state=collectNectar(active.state,f.id);paint(result.events);}active.following=false;persist(active.state);setPaused(true);setStatus('Нарисованный маршрут пройден в спокойном режиме.');}}
   else if(action==='nectar-reset'){active.state.nectar=[];active.lastVisited=null;paint();persist(active.state);setStatus('Начнём с ромашки, затем лаванда и роза.');}
   else if(action==='nectar-next'){const id=NECTAR_ORDER[active.state.nectar.length];if(!id){setStatus('Все три цвета уже собраны!');return;}const flower=flowers.find(f=>f.id===id);if(api.prefs.calm||matchMedia('(prefers-reduced-motion: reduce)').matches){active.state=collectNectar({...active.state,x:flower.x,y:flower.y},id);paint();persist(active.state);setStatus(active.state.nectar.length===3?'Нектарный узор собран!':'Нужный цвет добавлен.');}else target(flower);}
   else if(action==='pause')setPaused(!active.paused);
   else if(action==='restart'){setPaused(true);root.querySelector('.flight-reset-confirm').hidden=false;root.querySelector('[data-flight-action="confirm-restart"]').focus({preventScroll:true});}
   else if(action==='cancel-restart')root.querySelector('.flight-reset-confirm').hidden=true;
   else if(action==='confirm-restart'){active.state=startNewFlight(active.state);active.dirty=false;persist(active.state);root.classList.remove('is-complete');root.querySelector('.flight-reset-confirm').hidden=true;setStatus('Новая прогулка. Знакомая поляна ждёт Жужу.');paint();setPaused(true);}
   else if(action==='next'){
    const s=active.state,next=flowers.find(f=>!s.pollen.includes(f.id))||secrets.find(f=>!s.secrets.includes(f.id));
    if(!next){setStatus('Все находки уже в альбоме. Можно полетать свободно или начать новую прогулку.');return;}
    if(api.prefs.calm||matchMedia('(prefers-reduced-motion: reduce)').matches){start();const result=stepFlight({...s,x:next.x,y:next.y},{},.01);active.state=result.state;paint(result.events);}
    else{target(next);setStatus('Летим к находке: '+next.name.toLocaleLowerCase('ru')+'.');}
   }
  });
  root.classList.add('is-paused');routeLibrary();paint();
 }
 return {open,dispose,flush:()=>{if(active?.dirty){persist(active.state);active.dirty=false;}return saveQueue;}};
}

return Object.freeze({ FLIGHT_FLOWERS, FLIGHT_SECRETS, FLIGHT_MAPS, flightMapLayout, selectFlightMap, nextFlightHint, FLIGHT_MOODS, NECTAR_ORDER, collectNectar, defaultFlightState, normalizeFlightState, isFlightComplete, startNewFlight, stepFlight, mergeFlightProgress, renderFlightLandscape:sceneSVG, renderFlightMinimap:flightMiniMap, createFlightFeature });
})();
