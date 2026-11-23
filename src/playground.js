const playground = (() => {
/* Flora Keep 2.3. Small offline puzzles: all drawing and rules live in this file. */
const PLAYGROUND_MODES=Object.freeze([
 {id:'snail',name:'Дорожка улитки',hint:'Нарисуйте дорожку или расставьте камешки кнопками. Затем отправьте улитку в путь.'},
 {id:'wind',name:'Лабиринт ветра',hint:'Направляйте лепесток порывами ветра. Обойдите камни и долетите до золотого цветка.'},
 {id:'mirrors',name:'Зеркальная оранжерея',hint:'Поворачивайте три зеркала. Проведите солнечный луч к цветку справа внизу.'},
 {id:'channels',name:'Садовые ручейки',hint:'Поворачивайте желобки. Вода должна пройти от левого края к правой чаше.'},
 {id:'music',name:'Цветочная мелодия',hint:'Выберите ноты на восьми шагах. Огонёк играет цветы по очереди; звук включается только по вашей кнопке.'},
 {id:'fireflies',name:'Рисуем светлячками',hint:'Нарисуйте узор пальцем или мышью. Светлячки повторят линию. Есть готовые фигуры и отмена.'},
 {id:'stars',name:'Созвездия семян',hint:'Соедините звёзды по порядку от 1 до 6. Законченное созвездие пробудит лунный цветок.'},
 {id:'shadows',name:'Головоломка теней',hint:'Двигайте три горшка перед лампой. Совместите тени с пунктирными силуэтами на стене.'},
 {id:'sketch',name:'Сад по эскизу',hint:'Рассмотрите три силуэта на карточке задания и выберите подходящие растения для трёх мест.'},
]);
const finite=(v,a,b,f)=>typeof v==='number'&&Number.isFinite(v)?Math.min(b,Math.max(a,v)):f;
const integer=(v,a,b,f)=>Math.round(finite(v,a,b,f));
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const safeMode=id=>PLAYGROUND_MODES.some(m=>m.id===id)?id:'snail';
const points=raw=>Array.isArray(raw)?raw.slice(0,180).filter(p=>object(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({x:finite(p.x,3,97,50),y:finite(p.y,5,95,50)})):[];
const array=(raw,n,lo,hi,fallback)=>Array.from({length:n},(_,i)=>integer(raw?.[i],lo,hi,fallback[i]));
const STAR_POINTS=[[15,72],[27,27],[45,44],[56,15],[75,34],[86,70]];
const FLOWER_IDS=['daisy','fern','cactus','tulip'];
const SKETCHES=[[1,0,2],[3,2,1],[0,3,2]];
const WIND_LEVELS=[
  {name:'Лёгкий ветер',walls:new Set(['1,1','1,2','3,1','3,2','3,3','5,2','5,3'])},
  {name:'Каменистая тропа',walls:new Set(['1,2','2,2','2,3','2,4','4,0','4,2','4,4','5,2','6,2'])},
  {name:'Извилистый склон',walls:new Set(['0,2','1,2','2,1','2,2','2,3','4,1','4,2','4,3','5,3','6,3'])}
];
const SHADOW_GOAL=[39,50,61];
const SOLUTION_CHANNELS=[[1,2],[1,2],[2,3],[0,2],[1,3],[0,3],[0,2],[1,2],[0,2],[0,2],[0,1],[0,3]];
const CHANNEL_SHAPES=[{name:'Угол',ports:[0,1]},{name:'Прямой',ports:[0,2]},{name:'Развилка',ports:[0,1,2]},{name:'Заглушка',ports:[]}];
const CHANNEL_START=4,CHANNEL_END=7;
const MIRROR_TARGETS=[{x:4,y:4},{x:4,y:0},{x:0,y:1}];
const MUSIC_VOICES=[['sine','Мягкий звук'],['triangle','Колокольчик'],['square','Электронный звук'],['sawtooth','Струнный звук']];
const defaultNotes=[1,0,3,0,5,0,3,0];
const tuneName=value=>typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,42):'';

function normalizeMusic(raw) {
  const tempo=integer(raw?.tempo,55,160,112);
  const voice=MUSIC_VOICES.some(([id])=>id===raw?.voice)?raw.voice:'sine';
  const library=[],seen=new Set();
  for(const tune of (Array.isArray(raw?.library)?raw.library:[]).slice(0,30)){
    if(library.length>=8)break;
    const name=tuneName(tune?.name);
    if(!name||seen.has(name))continue;
    seen.add(name);
    library.push({
      name,notes:array(tune.notes,8,0,5,defaultNotes),
      tempo:integer(tune.tempo,55,160,112),voice:MUSIC_VOICES.some(([id])=>id===tune.voice)?tune.voice:'sine'
    });
  }
  return {tempo,voice,library};
}

function defaultPlaygroundState(){
  return {version:1,mode:'snail',completed:[],snail:[{x:10,y:78}],fireflies:[],
    wind:{x:0,y:3,level:0},mirrors:[1,1,0],multiMirror:false,
    channels:[1,2,0,1,1,1,3,0,2,1,2,3],channelDesign:null,channelCustom:false,
    notes:defaultNotes.slice(),music:normalizeMusic(),stars:[],shadows:[22,72,43],sketch:{task:0,picks:[0,0,0],design:null,custom:false}};
}
function normalizePlaygroundState(raw){
  const d=defaultPlaygroundState();
  if(!object(raw))return d;
  const level=integer(raw.wind?.level,0,WIND_LEVELS.length-1,0);
  const x=integer(raw.wind?.x,0,6,0),y=integer(raw.wind?.y,0,4,3);
  const wind=WIND_LEVELS[level].walls.has(x+','+y)?{x:0,y:3,level}:{x,y,level};
  const design=Array.isArray(raw.sketch?.design)?array(raw.sketch.design,3,0,3,SKETCHES[0]):null;
  const channelDesign=Array.isArray(raw.channelDesign)?array(raw.channelDesign,12,0,3,Array(12).fill(1)):null;
  const snail=points(raw.snail);
  return {
    version:1,mode:safeMode(raw.mode),completed:Array.isArray(raw.completed)?[...new Set(raw.completed.slice(0,30).filter(id=>PLAYGROUND_MODES.some(m=>m.id===id)))]:[],
    snail:snail.length?snail:d.snail,fireflies:points(raw.fireflies),wind,
    mirrors:array(raw.mirrors,3,0,1,d.mirrors),multiMirror:raw.multiMirror===true,
    channels:array(raw.channels,12,0,3,d.channels),channelDesign,channelCustom:raw.channelCustom===true&&!!channelDesign,
    notes:array(raw.notes,8,0,5,d.notes),music:normalizeMusic(raw.music),
    stars:Array.isArray(raw.stars)?[...new Set(raw.stars.slice(0,36).filter(n=>Number.isInteger(n)&&n>=0&&n<6))].slice(0,6):[],
    shadows:array(raw.shadows,3,20,80,d.shadows),
    sketch:{task:integer(raw.sketch?.task,0,2,0),picks:array(raw.sketch?.picks,3,0,3,d.sketch.picks),design,custom:raw.sketch?.custom===true&&!!design}
  };
}

function canMoveWind(x,y,level) {
  return x>=0&&x<=6&&y>=0&&y<=4&&!WIND_LEVELS[level].walls.has(x+','+y);
}
function moveWindPetal(raw,dx,dy){
  const s=normalizePlaygroundState(raw),x=s.wind.x+Math.sign(Number(dx)||0),y=s.wind.y+Math.sign(Number(dy)||0);
  if(!canMoveWind(x,y,s.wind.level))return {state:s,moved:false,complete:false};
  s.wind={...s.wind,x,y};
  return {state:s,moved:true,complete:x===6&&y===1};
}
function windHint(raw){
  const {x,y,level}=normalizePlaygroundState(raw).wind;
  const queue=[{x,y,first:''}],seen=new Set([x+','+y]);
  const choices=[['вверх',0,-1],['вправо',1,0],['вниз',0,1],['влево',-1,0]];
  for(const point of queue){
    if(point.x===6&&point.y===1)return point.first;
    for(const [name,dx,dy] of choices){
      const nx=point.x+dx,ny=point.y+dy,key=nx+','+ny;
      if(!canMoveWind(nx,ny,level)||seen.has(key))continue;
      seen.add(key);
      queue.push({x:nx,y:ny,first:point.first||name});
    }
  }
  return '';
}

function traceMirrors(raw){
  const s=normalizePlaygroundState(raw),mirrors=[{x:2,y:3},{x:2,y:1},{x:4,y:1}];
  const targets=s.multiMirror?MIRROR_TARGETS:MIRROR_TARGETS.slice(0,1);
  let x=-1,y=3,dx=1,dy=0;
  const route=[{x,y}],seen=new Set();
  for(let i=0;i<50;i++){
    x+=dx;y+=dy;route.push({x,y});
    if(targets.some(target=>target.x===x&&target.y===y))return {route,complete:true,target:{x,y}};
    if(x<0||x>5||y<0||y>4)break;
    const key=[x,y,dx,dy].join(',');
    if(seen.has(key))break;
    seen.add(key);
    const mirror=mirrors.findIndex(point=>point.x===x&&point.y===y);
    if(mirror>=0){
      const incoming=dx,factor=s.mirrors[mirror]===0?-1:1;
      dx=dy*factor;dy=incoming*factor;
    }
  }
  return {route,complete:false};
}

function channelNeighbour(index,side){
  const x=index%4+[0,1,0,-1][side],y=Math.floor(index/4)+[-1,0,1,0][side];
  return x>=0&&x<=3&&y>=0&&y<=2?y*4+x:-1;
}
const tilePorts=(s,position)=>s.channelCustom?CHANNEL_SHAPES[s.channelDesign[position]].ports:SOLUTION_CHANNELS[position];
const rotatePorts=(ports,rotation)=>ports.map(port=>(port+rotation)%4);
function channelFlow(raw){
  const s=normalizePlaygroundState(raw);
  const ports=s.channels.map((rotation,index)=>rotatePorts(tilePorts(s,index),rotation));
  const reached=new Set(),queue=ports[CHANNEL_START].includes(3)?[CHANNEL_START]:[];
  for(const index of queue){
    if(reached.has(index))continue;
    reached.add(index);
    for(const side of ports[index]){
      const next=channelNeighbour(index,side);
      if(next>=0&&!reached.has(next)&&ports[next].includes((side+2)%4))queue.push(next);
    }
  }
  return {ports,reached:[...reached],complete:reached.has(CHANNEL_END)&&ports[CHANNEL_END].includes(1)};
}
function solveChannelDesign(design){
  if(!Array.isArray(design)||design.length!==12||design.some(tile=>!Number.isInteger(tile)||!CHANNEL_SHAPES[tile]))return null;
  const solution=Array(12).fill(0);
  function visit(index,from,passed){
    if(passed&(1<<index))return false;
    const options=CHANNEL_SHAPES[design[index]].ports;
    for(let rotation=0;rotation<4;rotation++){
      const ports=rotatePorts(options,rotation);
      if(!ports.includes(from))continue;
      solution[index]=rotation;
      if(index===CHANNEL_END&&ports.includes(1))return true;
      for(const side of ports){
        const next=channelNeighbour(index,side);
        if(side!==from&&next>=0&&visit(next,(side+2)%4,passed|(1<<index)))return true;
      }
    }
    return false;
  }
  return visit(CHANNEL_START,3,0)?solution:null;
}

const sketchTargets=sketch=>sketch.custom?sketch.design:SKETCHES[sketch.task];
function playgroundSolved(raw,mode=raw?.mode){
  const s=normalizePlaygroundState(raw);
  switch(mode){
    case 'wind':return s.wind.x===6&&s.wind.y===1;
    case 'mirrors':return traceMirrors(s).complete;
    case 'channels':return channelFlow(s).complete;
    case 'stars':return s.stars.length===6&&s.stars.every((n,i)=>n===i);
    case 'shadows':return s.shadows.every((n,i)=>Math.abs(n-SHADOW_GOAL[i])<=2);
    case 'sketch':return s.sketch.picks.every((n,i)=>n===sketchTargets(s.sketch)[i]);
    default:return false;
  }
}
const svgOpen='<svg viewBox="0 0 640 400" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
const flower=(x,y,color='#dbb778',scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0V35M0 25Q-24 25-18 10Q-5 10 0 25M0 20Q25 10 20 28Q6 32 0 20" stroke="#5b795a" stroke-width="3" fill="#8da67b"/>${Array.from({length:7},(_,i)=>`<ellipse cy="-12" rx="7" ry="14" transform="rotate(${i*360/7})" fill="${color}"/>`).join('')}<circle r="7" fill="#ac843e"/></g>`;
const snail=(x,y)=>`<g class="pg-snail" transform="translate(${x} ${y})"><path d="M-16 9Q13-6 27 8L31 15H-24Z" fill="#9da875"/><circle cx="-4" cy="-1" r="15" fill="#c9ab86"/><path d="M-3 11C-22-7 2-22 5-6C8 8-9 11-8-1" fill="none" stroke="#907353" stroke-width="2"/><path d="M23 8l3-13m-10 12 1-12" stroke="#75875f" stroke-width="2"/><circle cx="26" cy="-5" r="2" fill="#43563d"/></g>`;
const bg=(night=false)=>`<rect width="640" height="400" rx="20" fill="${night?'#203b38':'#eef0de'}"/><path d="M0 300Q130 220 270 300T640 270V400H0Z" fill="${night?'#2e5148':'#dce5c8'}"/><path d="M0 360Q240 280 640 350" stroke="${night?'#527363':'#c5d0af'}" stroke-width="2" fill="none"/>`;
function silhouette(id,x,y,scale=1,fill='#5b6e53'){return `<g transform="translate(${x} ${y}) scale(${scale})" fill="${fill}"><path d="M-19 7H19L15 32H-15Z"/><path d="M0 10V-48" stroke="${fill}" stroke-width="3"/>${id===1?Array.from({length:6},(_,i)=>`<path d="M0 ${-i*8}Q-40 ${-i*8-25}-30 ${-i*8-25}Q-5 ${-i*8-12} 0 ${-i*8}M0 ${-i*8}Q40 ${-i*8-25} 30 ${-i*8-25}Q5 ${-i*8-12} 0 ${-i*8}"/>`).join(''):id===2?'<rect x="-13" y="-68" width="26" height="79" rx="13"/><rect x="-31" y="-40" width="14" height="42" rx="7"/><rect x="20" y="-51" width="14" height="46" rx="7"/>':id===3?'<path d="M0-45Q-29-54-22-83L0-71L22-83Q30-53 0-45M0 0Q-42-10-26-35Q-7-30 0 0M0-8Q39-35 30-12Q20 4 0-8"/>':Array.from({length:7},(_,i)=>`<ellipse cx="0" cy="-63" rx="7" ry="14" transform="rotate(${i*360/7} 0 -48)"/>`).join('')}</g>`;}
function windStreaks(wind,vector){
 const [dx,dy]=vector,angle=Math.atan2(dy,dx)*180/Math.PI,x=60+wind.x*85,y=50+wind.y*68;
 const strength=wind.level+1,strokes=Array.from({length:strength+1},(_,i)=>{
  const offset=(i-strength/2)*(13-strength*2),length=17+strength*5+i%2*4;
  return `<path d="M${-48-i%2*5} ${offset}q${length*.42} -4 ${length} 0" fill="none" stroke-width="${i===strength?2.5:1.5}" stroke-dasharray="${strength*2+1} ${9-strength*2}"/>`;
 }).join('');
 return `<g class="pg-wind-streaks" fill="none" stroke="#47756b" stroke-linecap="round" opacity=".85" transform="translate(${x} ${y}) rotate(${angle})" aria-hidden="true">${strokes}<path d="M23 -5l7 5-7 5" stroke-width="2.2"/></g>`;
}
function buildMirrorsArt(state){
 const structure='<rect x="38" y="25" width="550" height="340" rx="45" fill="#f7f1d9" stroke="#b6c4a3" stroke-width="6"/><path d="M313 28V365M42 195H585" stroke="#d2d8bf" stroke-width="4"/>';
 const traced=traceMirrors(state),xy=p=>({x:82+p.x*90,y:48+p.y*68});
 const ray=traced.route.map(point=>{const q=xy(point);return `${q.x},${q.y}`;}).join(' ');
 const mirrors=[[2,3],[2,1],[4,1]].map(([x,y],i)=>{
  const q=xy({x,y}),lit=traced.route.some(point=>point.x===x&&point.y===y);
  const beamContact=lit?'<g class="pg-mirror-contact" aria-hidden="true"><circle r="13" fill="#ffedaf" opacity=".75"/><path d="M0-12 3-4 12 0 3 4 0 12-3 4-12 0-3-4Z" fill="#fffbe8" stroke="#d0922f" stroke-width="1.5"/><circle r="3" fill="#ffe281"/></g>':'';
  return `<g data-pg-mirror="${i}" class="pg-clickable" transform="translate(${q.x} ${q.y})"><circle r="25" fill="#fffdf4" stroke="#becab1"/><path d="${state.mirrors[i]?'M-17-17 17 17':'M-17 17 17-17'}" stroke="#8caeb0" stroke-width="6"/>${beamContact}<text y="39" text-anchor="middle" fill="#506d4e" font-size="15">${i+1}</text></g>`;
 }).join('');
 const targets=(state.multiMirror?MIRROR_TARGETS:MIRROR_TARGETS.slice(0,1)).map(target=>{
  const q=xy(target),lit=traced.target?.x===target.x&&traced.target?.y===target.y;
  return flower(q.x,q.y,lit?'#edbb62':'#c5c6b6',.8);
 }).join('');
 return `${structure}<polyline class="pg-ray" points="${ray}" fill="none" stroke="#e9c65f" stroke-width="6" stroke-linecap="round"/>${mirrors}${targets}`;
}
function buildChannelsArt(state){
 const {ports,reached,complete}=channelFlow(state),wet=new Set(reached);
 const depth=new Map(reached.map((index,distance)=>[index,distance]));
 const point=index=>[110+index%4*140,70+Math.floor(index/4)*125];
 const wetRoute=(x,y,nx,ny)=>`<path class="pg-water-flow pg-current" d="M${x} ${y}L${nx} ${ny}" stroke="#e3fff0" stroke-width="2.8" stroke-dasharray="6 11" fill="none" pointer-events="none"/>`;
 const inlet='<path d="M0 195H110M530 195H640" stroke="#989f89" stroke-width="14"/>';
 const waterEnds=(wet.has(CHANNEL_START)?wetRoute(0,195,110,195):'')+(complete?wetRoute(530,195,640,195):'');
 const connections=ports.map((tile,i)=>[1,2].map(side=>{
  const j=channelNeighbour(i,side);
  if(j<0||!tile.includes(side)||!ports[j].includes((side+2)%4))return '';
  const [x,y]=point(i),[nx,ny]=point(j),running=wet.has(i)&&wet.has(j);
  const upstream=depth.get(i)<=depth.get(j);
  return `<path d="M${x} ${y}L${nx} ${ny}" stroke="${running?'#83b6be':'#adae94'}" stroke-width="15" fill="none"/>${running?(upstream?wetRoute(x,y,nx,ny):wetRoute(nx,ny,x,y)):''}`;
 }).join('')).join('');
 const tiles=ports.map((tile,i)=>{
  const [x,y]=point(i),running=wet.has(i);
  const branches=tile.map(port=>{
   const nx=x+[0,55,0,-55][port],ny=y+[-50,0,50,0][port],j=channelNeighbour(i,port);
   const flowing=running&&((j>=0&&wet.has(j)&&ports[j].includes((port+2)%4))||(i===CHANNEL_START&&port===3)||(i===CHANNEL_END&&port===1&&complete));
   const inward=(i===CHANNEL_START&&port===3)||depth.get(j)<depth.get(i);
   return `<path d="M${x} ${y}L${nx} ${ny}" stroke="${running?'#83b6be':'#adae94'}" stroke-width="15" fill="none" stroke-linecap="round"/>${flowing?(inward?wetRoute(nx,ny,x,y):wetRoute(x,y,nx,ny)):''}`;
  }).join('');
  return `<g data-pg-tile="${i}" class="pg-clickable"><rect x="${x-53}" y="${y-50}" width="106" height="100" rx="13" fill="#e0d6b9" stroke="#a8ab8f"/>${branches}<circle cx="${x}" cy="${y}" r="4" fill="${running?'#659aa6':'#a7a88d'}"/><text x="${x+35}" y="${y+38}" font-size="13" text-anchor="middle" fill="#556048">${i+1}</text></g>`;
 }).join('');
 return inlet+waterEnds+connections+tiles+'<path d="M597 172h40l-6 43h-29Z" fill="#b8c5ba"/>';
}
function buildMusicArt(notes,playIndex,playing){
 const colors=['','#dcaa4e','#a280b7','#bc6573','#6d9fb3','#809b59'];
 const row=notes.map((note,i)=>{
  const x=61+i*74,active=playing&&playIndex===i;
  const y=156+(i%2)*17;
  const stem=`<path d="M0 0V109M0 52Q-20 37-20 49Q-12 61 0 52M0 76Q20 59 20 70Q13 83 0 76" fill="#91a776" stroke="#638661" stroke-width="3" stroke-linecap="round"/>`;
  const petals=Array.from({length:7},(_,index)=>`<ellipse cy="-11" rx="6.5" ry="12" transform="rotate(${index*360/7})" fill="${colors[note]}"/>`).join('');
  const blossom=note?`${stem}<g ${active?'class="pg-note-open"':''}><g transform="scale(${active?1:.53})">${petals}<circle r="6" fill="#f4db94"/></g></g>`:'<path d="M-11 62H11" stroke="#6d8268" stroke-width="3" stroke-linecap="round"/>';
  return `<g data-pg-note="${i}"><rect x="${x-32}" y="92" width="64" height="204" rx="25" fill="${active?'#f9e5a9':'#f7f4e3'}" stroke="${active?'#96764b':'#d4d9ba'}" stroke-width="${active?2:1}"/><g transform="translate(${x} ${y})">${blossom}</g><text x="${x}" y="325" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#4d6a52">${i+1}</text></g>`;
 }).join('');
 return '<path d="M28 298H611" stroke="#bcbd9f" stroke-width="1"/>'+row;
}
function buildStarsArt(state){
 const xy=STAR_POINTS.map(([x,y])=>[x*6.4,y*4]),path=xy.map(point=>point.join(',')).join(' ');
 const next=state.stars.length;
 const stars=xy.map(([x,y],i)=>{
  const found=state.stars.includes(i),upcoming=i===next;
  return `<g data-pg-star="${i}" class="pg-clickable">${upcoming?`<circle class="pg-next-star" cx="${x}" cy="${y}" r="27" fill="#e7ce82" fill-opacity=".15" stroke="#f8e6a9" stroke-width="2.3" stroke-dasharray="2 3"/>`:''}<circle cx="${x}" cy="${y}" r="21" fill="${found?'#dac887':'#35554b'}" stroke="${upcoming?'#fff2b9':'#aebc8a'}" stroke-width="${upcoming?2:1}"/><text x="${x}" y="${y+6}" fill="${found?'#344c3c':'#f5eed0'}" font-size="18" text-anchor="middle">${i+1}</text></g>`;
 }).join('');
 const distant='<g fill="#b9c7a9" opacity=".5">'+Array.from({length:24},(_,i)=>`<circle cx="${24+i*71%590}" cy="${20+i*47%290}" r="${1+i%2}"/>`).join('')+'</g>';
 const trail=state.stars.map(i=>xy[i].join(',')).join(' ');
 const moon=playgroundSolved(state)?`<g class="pg-moon-flower">${flower(320,260,'#b8b9df',1.7)}<ellipse cx="320" cy="328" rx="75" ry="12" fill="#d7dfb1" opacity=".15"/></g>`:'';
 return `${distant}<polyline points="${path}" fill="none" stroke="#d1dfb5" stroke-width="1.5" stroke-dasharray="3 7" opacity=".64"/><polyline points="${trail}" fill="none" stroke="#f0dc99" stroke-width="2.5"/>${stars}${moon}`;
}

function renderPlaygroundIllustration(s,{art,mode=s.mode,playing=false,playIndex=0,cursor={x:50,y:50},windVector=[1,0]}={}){
  let body=bg(['fireflies','stars'].includes(mode));
   if(mode==='snail'||mode==='fireflies'){const route=s[mode];body+=mode==='snail'?`${flower(565,95,'#e1c58d',1.4)}<path d="M55 325Q160 350 260 315T570 320" stroke="#d0c5a4" stroke-width="5" fill="none"/>`:'<circle cx="550" cy="65" r="28" fill="#e9dfaf"/>';if(route.length)body+=`<polyline points="${route.map(p=>p.x*6.4+','+p.y*4).join(' ')}" fill="none" stroke="${mode==='snail'?'#b0a17c':'#dde7a7'}" stroke-width="${mode==='snail'?2:1.5}" opacity=".65"/>`+route.filter((_,i)=>i%Math.max(1,Math.floor(route.length/55))===0).map((p,i)=>mode==='snail'?`<ellipse class="pg-stone" style="--i:${i}" cx="${p.x*6.4}" cy="${p.y*4+9}" rx="${7+i%3}" ry="4" fill="${i%2?'#c8c4aa':'#a8ac96'}"/>`:`<circle cx="${p.x*6.4}" cy="${p.y*4}" r="${2+i%2}" fill="#f0e8a0" opacity=".65"/>`).join('');const p=route[Math.min(playIndex,Math.max(0,route.length-1))]||{x:10,y:78};body+=mode==='snail'?snail(p.x*6.4,p.y*4):`<g class="pg-live-firefly" transform="translate(${p.x*6.4} ${p.y*4})"><circle r="13" fill="#f1e19c" opacity=".15"/><circle r="5" fill="#f1e19c"/></g>`;body+=`<circle class="pg-draw-cursor" cx="${cursor.x*6.4}" cy="${cursor.y*4}" r="8" fill="none" stroke="#9ca877" stroke-dasharray="3 3"/>`;}
   if(mode==='wind'){body+='<path d="M35 85Q180 38 290 95T590 65" stroke="#c4d3c3" stroke-width="3" fill="none"/>';for(let y=0;y<5;y++)for(let x=0;x<7;x++){const xx=60+x*85,yy=50+y*68;body+=`<rect x="${xx-30}" y="${yy-27}" width="60" height="54" rx="15" fill="${WIND_LEVELS[s.wind.level].walls.has(x+','+y)?'#a6ad96':'#f8f8ed'}" stroke="#d4ddc4"/>`;if(WIND_LEVELS[s.wind.level].walls.has(x+','+y))body+=`<path d="M${xx-20} ${yy+11}q-3-24 19-27q25 6 21 27Z" fill="#8c967e"/>`;}body+=windStreaks(s.wind,windVector)+flower(570,118,'#dfba5d',.8)+`<g class="pg-petal" transform="translate(${60+s.wind.x*85} ${50+s.wind.y*68})"><path d="M0 20Q-31-1 0-24Q28 0 0 20Z" fill="#dba8b3"/><path d="M0 16V-16" stroke="#fff1e5" stroke-width="2"/></g>`;}
   if(mode==='mirrors')body+=buildMirrorsArt(s);
   if(mode==='channels')body+=buildChannelsArt(s);
   if(mode==='music')body+=buildMusicArt(s.notes,playIndex,playing);
   if(mode==='stars')body+=buildStarsArt(s);
   if(mode==='shadows'){body+='<rect x="35" y="22" width="570" height="235" rx="15" fill="#e3dcc2"/><path d="M320 364L60 28H580Z" fill="#fff4ca" opacity=".5"/>';SHADOW_GOAL.forEach((v,i)=>{body+=`<g opacity=".3" stroke="#a07a46" stroke-dasharray="4 4">${silhouette(i,2*v*6.4-320,170,1,'none')}</g>`;});s.shadows.forEach((v,i)=>{const px=v*6.4,shadowX=2*px-320;body+=silhouette(i,shadowX,170,1,'#65705c88')+silhouette(i,px,300,.55,['#79976b','#b9977d','#8d9eae'][i]);});body+='<path d="M308 350h24l-6 27h-12Z" fill="#b99962"/><circle cx="320" cy="347" r="10" fill="#f5d774"/>';}
   if(mode==='sketch'){body+='<rect x="105" y="20" width="430" height="135" rx="10" fill="#fcf8ea" stroke="#c7c9ab"/><text x="320" y="45" text-anchor="middle" font-size="14" fill="#78835e">ЭСКИЗ ВАШЕГО САДА</text>';sketchTargets(s.sketch).forEach((id,i)=>{body+=silhouette(id,190+i*130,120,.7,'#a1ab8a');});body+='<path d="M65 345H575v12H65Z" fill="#c6af8d"/>';s.sketch.picks.forEach((id,i)=>{const svg=art.plantArt(FLOWER_IDS[id],{id:'pg-sketch-'+i,growth:1,pot:['cream','sage','clay'][i]});body+=svg.replace('<svg ',`<svg x="${65+i*180}" y="165" width="160" height="180" `);});}
  return svgOpen+body+'</svg>';
}
function createPlaygroundFeature(api){
 let active=null,latest=null,queue=Promise.resolve(),revision=0;
 const esc=api.esc||((v)=>String(v).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])));
 const calm=()=>api.prefs?.calm||matchMedia('(prefers-reduced-motion: reduce)').matches;
 function persist(state){const captured=normalizePlaygroundState(state),n=++revision;latest=captured;queue=queue.catch(()=>{}).then(()=>api.commit(({extras})=>{extras.playground=captured;for(const id of captured.completed)if(!extras.achievements.includes('playground:'+id))extras.achievements.push('playground:'+id);})).catch(()=>api.toast('Мастерская пока в памяти. Сохраните JSON-копию сада.')).finally(()=>{if(n===revision)latest=null;});return queue;}
 function stop(){if(!active)return;cancelAnimationFrame(active.frame);clearTimeout(active.timer);active.frame=0;active.timer=0;active.playing=false;active.audio?.close().catch(()=>{});active.audio=null;active.root?.classList.remove('is-playing');}
 function dispose(){if(!active)return;stop();active.abort.abort();if(active.dirty)persist(active.state);active=null;}
 function open(mode){dispose();const state=normalizePlaygroundState(latest||api.extras.playground);if(mode)state.mode=safeMode(mode);api.showDialog('Сад маленьких открытий',`<section class="pg-app"><div class="pg-intro"><span class="eyebrow">ИГРАТЬ · ПРИДУМЫВАТЬ · НАБЛЮДАТЬ</span><h3>У каждого открытия — своя история</h3><label class="field"><span>Выберите занятие</span><select data-pg-mode>${PLAYGROUND_MODES.map(m=>`<option value="${m.id}" ${state.mode===m.id?'selected':''}>${m.name}</option>`).join('')}</select></label></div><p class="pg-hint"></p><div class="pg-stage" tabindex="0" role="group" aria-label="Игровая сцена"></div><div class="pg-controls"></div><p class="pg-status" role="status" aria-live="polite"></p><div class="pg-footer"><button class="button secondary" data-pg="reset">Начать эту сцену снова</button><span>Без таймера и потери ресурсов. Всё сохраняется в этом саду.</span></div></section>`,'playground',true);
  const root=document.querySelector('.pg-app');if(!root)return;const abort=new AbortController();active={root,state,abort,frame:0,timer:0,playing:false,audio:null,dirty:false,pointer:null,playIndex:0,windVector:[1,0],cursor:{x:50,y:50},mode:state.mode,channelDraft:state.channelDesign?.slice()||Array(12).fill(1),sketchDraft:state.sketch.design?.slice()||SKETCHES[0].slice(),tuneSelection:''};const a=active;const listen=(el,type,fn,opts={})=>el.addEventListener(type,fn,{...opts,signal:abort.signal});const stage=root.querySelector('.pg-stage'),controls=root.querySelector('.pg-controls');
  const status=text=>root.querySelector('.pg-status').textContent=text;
  const button=(action,label,extra='')=>`<button type="button" class="button secondary" data-pg="${action}" ${extra}>${label}</button>`;
  const save=()=>{a.dirty=false;persist(a.state);};
  function completed(mode=a.state.mode){if(!a.state.completed.includes(mode)){a.state.completed.push(mode);save();}status('Готово! Маленькое открытие добавлено в ваш альбом.');root.classList.add('pg-won');}
  function sync(result=''){if(active!==a)return;a.state=normalizePlaygroundState(a.state);a.mode=a.state.mode;root.dataset.pgMode=a.mode;root.classList.toggle('pg-calm',calm());root.classList.toggle('pg-won',playgroundSolved(a.state));root.querySelector('.pg-hint').textContent=PLAYGROUND_MODES.find(m=>m.id===a.mode).hint;stage.setAttribute('aria-label',PLAYGROUND_MODES.find(m=>m.id===a.mode).name);renderStage();renderControls();if(result)status(result);if(playgroundSolved(a.state))completed();}
  function renderStage(){
   stage.innerHTML=renderPlaygroundIllustration(a.state,{art:api.art,mode:a.mode,playing:a.playing,playIndex:a.playIndex,cursor:a.cursor,windVector:a.windVector});
   stage.classList.toggle('is-drawing',['snail','fireflies'].includes(a.mode));
  }
     function channelEditor(){
     return `<details class="pg-channel-designer"><summary>Создать свой уровень</summary><div class="pg-designer-options">${a.channelDraft.map((value,i)=>`<label class="field"><span>Клетка ${i+1}</span><select data-pg-channel-design="${i}">${CHANNEL_SHAPES.map((shape,index)=>`<option value="${index}" ${value===index?'selected':''}>${shape.name}</option>`).join('')}</select></label>`).join('')}</div><div class="pg-action-row">${button('channel-verify','Проверить решение')}${button('channel-custom','Перейти к своему уровню')}${button('channel-default','Открыть обычный уровень')}</div></details>`;
   }
   function musicControls(state){
     const settings=state.music;
     const voices=MUSIC_VOICES.map(([id,label])=>`<option value="${id}" ${id===settings.voice?'selected':''}>${label}</option>`).join('');
     const saved=settings.library.map(tune=>`<option value="${esc(tune.name)}" ${tune.name===a.tuneSelection?'selected':''}>${esc(tune.name)}</option>`).join('');
     return `<div class="pg-music-settings">
       <label class="field"><span>Темп · ударов в минуту</span><input type="number" min="55" max="160" value="${settings.tempo}" data-pg-tempo></label>
       <label class="field"><span>Тембр</span><select data-pg-voice>${voices}</select></label>
       <label class="field"><span>Название мелодии</span><input data-pg-tune-name value="${esc(a.tuneSelection)}" maxlength="42"></label>
       <label class="field"><span>Сохранённые мелодии</span><select data-pg-tune><option value="">Выберите мелодию</option>${saved}</select></label>
       <div class="pg-action-row">${button('save-tune','Сохранить мелодию')}${button('remove-tune','Убрать из списка',a.tuneSelection?'':'disabled')}</div>
     </div>`;
   }
   function sketchEditor(){
     const flowers=['Ромашка','Папоротник','Кактус','Тюльпан'];
     return `<details class="pg-sketch-designer"><summary>Создать свою загадку</summary><div class="pg-designer-options">
       ${a.sketchDraft.map((choice,i)=>`<label class="field"><span>Силуэт ${i+1}</span><select data-pg-sketch-design="${i}">
       ${flowers.map((name,index)=>`<option value="${index}" ${choice===index?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}
       </div>${button('own-sketch','Играть по моему эскизу')}</details>`;
   }
   function renderControls(){const s=a.state;let html='';
   if(a.mode==='snail'||a.mode==='fireflies')html=`<div class="pg-action-row">${button('play',a.playing?'Остановить':a.mode==='snail'?'Отправить улитку':'Зажечь светлячков')}${button('undo','Убрать последнюю точку')}${button('template',a.mode==='snail'?'Извилистая дорожка':'Нарисовать сердце')}</div><div class="pg-keyboard-draw"><span>Точное рисование: стрелки двигают курсор, Enter ставит точку.</span>${button('point','Добавить точку в центре')}${['up','left','down','right'].map((d,i)=>button('cursor',['↑','←','↓','→'][i],`data-dir="${d}" aria-label="Сдвинуть курсор ${['вверх','влево','вниз','вправо'][i]}"`)).join('')}</div>`;
   if(a.mode==='wind')html=`<label class="field"><span>Маршрут</span><select data-pg-wind-level>${WIND_LEVELS.map((level,i)=>`<option value="${i}" ${i===s.wind.level?'selected':''}>${level.name}</option>`).join('')}</select></label>${button('wind-hint','Подсказать первый шаг')}<div class="pg-dpad">${['up','left','down','right'].map((d,i)=>button('wind',['Ветер вверх ↑','Ветер влево ←','Ветер вниз ↓','Ветер вправо →'][i],`data-dir="${d}"`)).join('')}</div>`;
   if(a.mode==='mirrors')html=`<label class="field"><span>Цель для луча</span><select data-pg-mirror-goal><option value="single" ${!s.multiMirror?'selected':''}>Нижний цветок</option><option value="any" ${s.multiMirror?'selected':''}>Любой из трёх цветков</option></select></label><div class="pg-action-row">${[0,1,2].map(i=>button('mirror','Повернуть зеркало '+(i+1),`data-i="${i}"`)).join('')}</div>`;
   if(a.mode==='channels')html=`<div class="pg-tile-buttons">${s.channels.map((_,i)=>button('tile','Желобок '+(i+1),`data-i="${i}" aria-label="Повернуть желобок ${i+1}"`)).join('')}</div>${channelEditor()}`;
   if(a.mode==='music')html=`<div class="pg-note-grid">${s.notes.map((n,i)=>`<label class="field"><span>Шаг ${i+1}</span><select data-pg-note-select="${i}">${['Пауза','До · ромашка','Ре · лаванда','Ми · роза','Соль · колокольчик','Ля · лист'].map((name,j)=>`<option value="${j}" ${n===j?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}</div>${button('play',a.playing?'Остановить мелодию':'Слушать мою мелодию')}${musicControls(s)}`;
   if(a.mode==='stars')html=`<div class="pg-action-row">${STAR_POINTS.map((_,i)=>button('star','Звезда '+(i+1),`data-i="${i}" ${s.stars.includes(i)?'disabled':''}`)).join('')}</div>`;
   if(a.mode==='shadows')html=`<div class="pg-shadow-sliders">${s.shadows.map((n,i)=>`<label class="field"><span>Горшок ${i+1} · положение <output>${n}</output></span><input type="range" min="20" max="80" step="1" value="${n}" data-pg-shadow="${i}"></label>`).join('')}</div>`;
   if(a.mode==='sketch')html=`<div class="pg-sketch-picks">${s.sketch.picks.map((n,i)=>`<label class="field"><span>Место ${i+1}</span><select data-pg-pick="${i}">${['Ромашка','Папоротник','Кактус','Тюльпан'].map((name,j)=>`<option value="${j}" ${n===j?'selected':''}>${name}</option>`).join('')}</select></label>`).join('')}</div>${button('next-sketch','Другой эскиз')}${sketchEditor()}`;
   const opened=['.pg-channel-designer','.pg-sketch-designer'].filter(selector=>controls.querySelector(selector)?.open);
    controls.innerHTML=html;
    for(const selector of opened){const details=controls.querySelector(selector);if(details)details.open=true;}
  }
  function pointFrom(e){const box=stage.getBoundingClientRect();return {x:finite((e.clientX-box.left)/box.width*100,3,97,50),y:finite((e.clientY-box.top)/box.height*100,5,95,50)};}
  function appendPoint(p){if(!['snail','fireflies'].includes(a.mode))return;const route=a.state[a.mode],last=route.at(-1);if(route.length>=180){status('Дорожка заполнена: 180 точек. Можно отменить последнюю или начать заново.');return;}if(last&&Math.hypot(last.x-p.x,last.y-p.y)<1.7)return;route.push({...p});a.cursor={...p};a.dirty=true;renderStage();}
  function musicNote(note){api.media.synthesizeGardenNote(a.audio,note,a.state.music.voice);}
  function play(){if(a.playing){stop();renderStage();renderControls();return;}if(a.mode==='music'){if(!a.state.notes.some(Boolean)){status('Выберите хотя бы одну ноту — пока все шаги молчат.');return;}const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;try{if(Audio){a.audio=new Audio();a.audio.resume().catch(()=>{});}}catch{}a.playing=true;a.playIndex=0;root.classList.add('is-playing');let count=0;const beat=()=>{if(active!==a||!a.playing||document.hidden)return;musicNote(a.state.notes[a.playIndex]);renderStage();a.playIndex=(a.playIndex+1)%8;if(++count===8)completed('music');a.timer=setTimeout(beat,60000/a.state.music.tempo);};beat();renderControls();return;}
   const route=a.state[a.mode];if(!route||route.length<3){status('Сначала добавьте хотя бы три точки.');return;}a.playing=true;a.playIndex=0;root.classList.add('is-playing');const step=()=>{if(active!==a||!a.playing||document.hidden)return;renderStage();if(a.playIndex>=route.length-1){stop();renderControls();completed();return;}a.playIndex+=1;a.timer=setTimeout(step,calm()?10:Math.max(30,2100/route.length));};step();renderControls();}
  const delta=d=>({up:[0,-1],left:[-1,0],down:[0,1],right:[1,0]})[d];
  function wind(d){const [dx,dy]=delta(d),r=moveWindPetal(a.state,dx,dy);a.windVector=[dx,dy];a.state=r.state;sync(r.moved?'Лепесток подхватил ветер.':'Камень задержал ветер. Попробуйте другое направление.');save();}
     function resetCustomChannels(solution=solveChannelDesign(a.state.channelDesign)){
    if(!solution){a.state.channelCustom=false;a.state.channels=defaultPlaygroundState().channels;return;}
    a.state.channels=solution.map((rotation,index)=>(rotation+1+index%2)%4);
    if(channelFlow(a.state).complete){
      const source=CHANNEL_SHAPES[a.state.channelDesign[CHANNEL_START]].ports;
      a.state.channels[CHANNEL_START]=[0,1,2,3].find(rotation=>!rotatePorts(source,rotation).includes(3));
    }
   }
   function command(action,i,dir){if(action==='play'){play();return;}stop();if(action==='reset'){const fresh=defaultPlaygroundState();if(a.mode==='sketch')a.state.sketch.picks=[0,0,0];else if(a.mode==='wind')a.state.wind={x:0,y:3,level:a.state.wind.level};else if(a.mode==='channels'&&a.state.channelCustom){resetCustomChannels();}else for(const key of [a.mode==='wind'?'wind':a.mode==='mirrors'?'mirrors':a.mode==='channels'?'channels':a.mode==='music'?'notes':a.mode==='stars'?'stars':a.mode==='shadows'?'shadows':a.mode])a.state[key]=fresh[key];a.playIndex=0;sync('Эта сцена готова к новой попытке.');save();return;}
       if(action==='wind-hint'){
      const next=windHint(a.state);
      status(next?'Дайте ветру направление '+next+'.':'Лепесток уже у цели.');
      return;
    }
    if(action==='channel-verify'||action==='channel-custom'){
      const solution=solveChannelDesign(a.channelDraft);
      if(!solution){status('У этого расположения нет решения. Попробуйте заменить несколько деталей.');return;}
      if(action==='channel-verify'){status('Есть путь от входа до чаши. Можно сыграть.');return;}
      a.state.channelDesign=a.channelDraft.slice();
      a.state.channelCustom=true;
      resetCustomChannels(solution);
      sync('Открылся ваш уровень. Соедините вход и чашу.');
      save();
      return;
    }
    if(action==='channel-default'){
      a.state.channelCustom=false;
      a.state.channels=defaultPlaygroundState().channels;
      sync('Открыт обычный уровень.');
      save();
      return;
    }
    if(action==='save-tune'||action==='remove-tune'){
      const input=root.querySelector('[data-pg-tune-name]'),name=tuneName(input.value);
      const library=a.state.music.library;
      if(action==='remove-tune'){
        a.state.music.library=library.filter(tune=>tune.name!==a.tuneSelection);
        a.tuneSelection='';
        status('Мелодия убрана из списка.');
      }else{
        if(!name||!a.state.notes.some(Boolean)){status('Введите название и выберите хотя бы одну ноту.');return;}
        const index=library.findIndex(tune=>tune.name===name);
        if(index<0&&library.length>=8){status('Сохранено восемь мелодий. Освободите место для новой.');return;}
        const tune={name,notes:a.state.notes.slice(),tempo:a.state.music.tempo,voice:a.state.music.voice};
        if(index<0)library.push(tune);
        else library[index]=tune;
        a.tuneSelection=name;
        status('Мелодия сохранена.');
      }
      renderControls();save();return;
    }
    if(action==='own-sketch'){
      a.state.sketch.design=a.sketchDraft.slice();
      a.state.sketch.custom=true;
      a.state.sketch.picks=[0,0,0];
      sync('Ваш эскиз готов. Подберите растения к силуэтам.');
      save();
      return;
    }
    if(action==='wind'){wind(dir);return;}if(action==='mirror')a.state.mirrors[i]=1-a.state.mirrors[i];if(action==='tile')a.state.channels[i]=(a.state.channels[i]+1)%4;
   if(action==='star'){if(i!==a.state.stars.length){status('Следующая звезда — '+(a.state.stars.length+1)+'.');return;}a.state.stars.push(i);}
   if(action==='undo'){a.state[a.mode].pop();a.playIndex=0;}if(action==='point'){appendPoint(a.cursor);save();return;}
   if(action==='cursor'){const [dx,dy]=delta(dir);a.cursor={x:finite(a.cursor.x+dx*5,3,97,50),y:finite(a.cursor.y+dy*5,5,95,50)};renderStage();status('Курсор: '+Math.round(a.cursor.x)+', '+Math.round(a.cursor.y)+'. Добавьте точку.');return;}
   if(action==='template'){a.state[a.mode]=a.mode==='snail'?Array.from({length:45},(_,i)=>({x:10+i*1.8,y:76-i*.8+Math.sin(i*.22)*15})):Array.from({length:90},(_,i)=>{const t=i/89*Math.PI*2;return {x:50+Math.pow(Math.sin(t),3)*30,y:45-(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))*2};});a.playIndex=0;}
   if(action==='next-sketch')a.state.sketch={...a.state.sketch,task:(a.state.sketch.task+Number(!a.state.sketch.custom))%3,picks:[0,0,0],custom:false};sync();save();
  }
  listen(root.querySelector('[data-pg-mode]'),'change',e=>{stop();a.state.mode=safeMode(e.target.value);a.playIndex=0;sync('Новая сцена открыта.');save();});
  listen(root,'click',e=>{const b=e.target.closest('[data-pg]');if(b){if(b.dataset.pg==='play'){play();return;}command(b.dataset.pg,Number(b.dataset.i)||0,b.dataset.dir);return;}const mirror=e.target.closest('[data-pg-mirror]'),tile=e.target.closest('[data-pg-tile]'),star=e.target.closest('[data-pg-star]');if(mirror)command('mirror',Number(mirror.dataset.pgMirror));if(tile)command('tile',Number(tile.dataset.pgTile));if(star)command('star',Number(star.dataset.pgStar));});
   listen(root,'change',event=>{
    const target=event.target;
    const index=attribute=>Number(target.getAttribute(attribute));
    if(target.hasAttribute('data-pg-wind-level')){
      const level=Number(target.value);a.state.wind={x:0,y:3,level};sync('Маршрут открыт.');save();
    }else if(target.hasAttribute('data-pg-mirror-goal')){
      a.state.multiMirror=target.value==='any';
      sync(a.state.multiMirror?'Достаточно осветить один из трёх цветков.':'Луч должен попасть в нижний цветок.');
      save();
    }else if(target.hasAttribute('data-pg-channel-design')){
      a.channelDraft[index('data-pg-channel-design')]=Number(target.value);
    }else if(target.hasAttribute('data-pg-note-select')){
      a.state.notes[index('data-pg-note-select')]=Number(target.value);renderStage();save();
    }else if(target.hasAttribute('data-pg-tempo')||target.hasAttribute('data-pg-voice')){
      if(target.hasAttribute('data-pg-tempo')){
        a.state.music.tempo=integer(Number(target.value),55,160,112);
        target.value=String(a.state.music.tempo);
      }else a.state.music.voice=target.value;
      save();
    }else if(target.hasAttribute('data-pg-tune')){
      const tune=a.state.music.library.find(record=>record.name===target.value);
      if(!tune)return;
      stop();
      a.state.notes=tune.notes.slice();a.state.music.tempo=tune.tempo;a.state.music.voice=tune.voice;
      a.tuneSelection=tune.name;
      renderStage();renderControls();root.querySelector('[data-pg-tune]')?.focus();
      status('Сохранённая мелодия открыта.');
      save();
    }else if(target.hasAttribute('data-pg-pick')){
      a.state.sketch.picks[index('data-pg-pick')]=Number(target.value);
      sync();root.querySelector('[data-pg-pick="'+index('data-pg-pick')+'"]')?.focus();save();
    }else if(target.hasAttribute('data-pg-sketch-design')){
      a.sketchDraft[index('data-pg-sketch-design')]=Number(target.value);
    }
   });
  listen(root,'input',e=>{if(e.target.hasAttribute('data-pg-shadow')){a.state.shadows[Number(e.target.dataset.pgShadow)]=Number(e.target.value);e.target.parentElement.querySelector('output').textContent=e.target.value;renderStage();a.dirty=true;if(playgroundSolved(a.state))completed();}});
  listen(root,'change',e=>{if(e.target.hasAttribute('data-pg-shadow'))save();});
  listen(stage,'pointerdown',e=>{if(e.button!==0||!['snail','fireflies'].includes(a.mode))return;e.preventDefault();stop();a.pointer=e.pointerId;stage.setPointerCapture(e.pointerId);appendPoint(pointFrom(e));});listen(stage,'pointermove',e=>{if(a.pointer===e.pointerId)appendPoint(pointFrom(e));});for(const type of ['pointerup','pointercancel'])listen(stage,type,e=>{if(a.pointer===e.pointerId){a.pointer=null;save();}});
  listen(stage,'keydown',e=>{const d={ArrowUp:'up',ArrowLeft:'left',ArrowDown:'down',ArrowRight:'right'}[e.key];if(d){e.preventDefault();if(a.mode==='wind')wind(d);else if(['snail','fireflies'].includes(a.mode))command('cursor',0,d);}else if(e.key==='Enter'&&['snail','fireflies'].includes(a.mode)){e.preventDefault();command('point');}});
  function park(message=''){if(active!==a)return;a.pointer=null;if(a.dirty)save();stop();renderControls();if(message)status(message);}
  listen(document,'visibilitychange',()=>{if(document.hidden)park('Вкладка скрыта — движение и звук приостановлены.');});listen(window,'blur',()=>park());sync();status('Выберите действие — здесь можно пробовать без спешки.');
 }
 return {open,dispose,flush:()=>{if(active?.dirty){persist(active.state);active.dirty=false;}return queue;}};
}

return Object.freeze({ PLAYGROUND_MODES, defaultPlaygroundState, normalizePlaygroundState, moveWindPetal, windHint, traceMirrors, channelFlow, solveChannelDesign, playgroundSolved, renderPlaygroundIllustration, createPlaygroundFeature });
})();
