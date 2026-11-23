const storyStudio = (() => {
/* Local paper theatre and factual garden comics. Everything exported is explicit. */
const storyEscape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const storyText=(value,max=80)=>typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,max):'';
const storyChoice=(value,choices,fallback)=>choices.includes(value)?value:fallback;
const storyBound=(value,min,max,fallback)=>typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
const storyId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value)&&!['__proto__','prototype','constructor'].includes(value);
const storyBackgrounds={meadow:['#eff2df','#ceddb4','#75945f'],dawn:['#f4e5d7','#e3d1a7','#9c8662'],night:['#19362e','#385545','#adc399']};
const storyMotions=['still','sway','float','orbit','grow'];
const storyDefaultScene=()=>({id:'scene-draft',name:'Маленький театр сада',background:'meadow',duration:12,items:[{id:'scene-plant',type:'plant',speciesId:'daisy',x:.34,y:.86,scale:1,motion:'sway',text:''},{id:'scene-bee',type:'bee',speciesId:'daisy',x:.7,y:.42,scale:1,motion:'float',text:''},{id:'scene-caption',type:'label',speciesId:'daisy',x:.68,y:.84,scale:1,motion:'still',text:'Здесь растут маленькие чудеса'}]});
function defaultStoryStudioState(){return {version:1,draft:storyDefaultScene(),saved:[],program:{title:'Спектакль моего сада',order:[]},comic:{title:'Маленькие истории моего сада',selected:[],initialized:false}};}
function normalizeStoryPath(value){
 return Array.isArray(value)?value.slice(0,40).filter(point=>Number.isFinite(point?.x)&&Number.isFinite(point?.y))
   .map(point=>({x:storyBound(point.x,.06,.94,.5),y:storyBound(point.y,.2,.94,.75)})):[];
}
function normalizeStoryCamera(value){
 const frame=raw=>({zoom:storyBound(raw?.zoom,1,2.4,1),x:storyBound(raw?.x,0,1,.5),y:storyBound(raw?.y,0,1,.5)});
 return {start:frame(value?.start),end:frame(value?.end)};
}
function normalizeStoryDialogue(value){
 return Array.isArray(value)?value.slice(0,8).filter(row=>row&&typeof row==='object').map(row=>({
   speaker:storyText(row.speaker,28),text:storyText(row.text,140),duration:storyBound(row.duration,1,12,3)
 })):[];
}
function normalizeStorySoundtrack(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.notes))return null;
 const notes=Array.from({length:8},(_,i)=>Math.round(storyBound(value.notes[i],0,5,0)));
 if(!notes.some(Boolean))return null;
 return {name:storyText(value.name,42).trim()||'Мелодия',notes,
   voice:storyChoice(value.voice,['sine','triangle','square','sawtooth'],'sine'),
   tempo:Math.round(storyBound(value.tempo,55,160,112))};
}
function normalizeStoryScene(raw,catalog=[]){
 const fallback=storyDefaultScene(),value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const species=catalog.map(s=>typeof s==='string'?s:s.id),defaultSpecies=species.includes('daisy')?'daisy':species[0]||'daisy';
 const duration=Math.round(storyBound(value.duration,6,30,12));
 const used=new Set(),items=[];
 for(const [index,item]of (Array.isArray(value.items)?value.items:fallback.items).slice(0,20).entries()){
  if(!item||typeof item!=='object'||Array.isArray(item)||!['plant','bee','label'].includes(item.type))continue;
  let id=storyId(item.id)&&!used.has(item.id)?item.id:'item-'+index;while(used.has(id))id+='x';used.add(id);
  const enter=storyBound(item.enter,0,duration,0),leave=storyBound(item.leave,enter,duration,duration);
  items.push({id,enter,leave,path:normalizeStoryPath(item.path),type:item.type,speciesId:species.includes(item.speciesId)?item.speciesId:defaultSpecies,x:storyBound(item.x,.06,.94,.5),y:storyBound(item.y,.2,.94,.75),scale:storyBound(item.scale,.45,1.6,1),motion:storyChoice(item.motion,storyMotions,'still'),text:storyText(item.text,80)});
 }
 return {id:storyId(value.id)?value.id:fallback.id,name:storyText(value.name,60).trim()||fallback.name,background:storyChoice(value.background,Object.keys(storyBackgrounds),'meadow'),duration,camera:normalizeStoryCamera(value.camera),dialogue:normalizeStoryDialogue(value.dialogue),soundtrack:normalizeStorySoundtrack(value.soundtrack),items};
}
function normalizeStoryStudioState(raw,catalog=[]){
 const out=defaultStoryStudioState(),value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 out.draft=normalizeStoryScene(value.draft,catalog);
 const ids=new Set();for(const scene of (Array.isArray(value.saved)?value.saved:[]).slice(0,4)){if(!scene||typeof scene!=='object')continue;const normalized=normalizeStoryScene(scene,catalog);if(ids.has(normalized.id))continue;ids.add(normalized.id);out.saved.push(normalized);}
 out.program=normalizeStoryProgram(value.program,out.saved);
 const comic=value.comic&&typeof value.comic==='object'?value.comic:{};out.comic={title:storyText(comic.title,70).trim()||out.comic.title,selected:Array.isArray(comic.selected)?[...new Set(comic.selected.filter(storyId))].slice(0,6):[],initialized:typeof comic.initialized==='boolean'?comic.initialized:Array.isArray(comic.selected)};return out;
}
function storySafeSVG(svg){if(typeof svg!=='string'||!/^<svg\b/.test(svg)||/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|file:|javascript:|\/\/)/i.test(svg))throw new Error('Недопустимая иллюстрация.');return svg;}
function storyArtwork(item,art){
 if(item.type==='bee')return storySafeSVG(art.beeArt('','happy')).replace('<svg ','<svg x="-52" y="-94" width="104" height="94" ');
 if(item.type==='plant')return storySafeSVG(art.plantArt(item.speciesId,{id:'story-'+item.id,growth:1,pot:'cream',treatment:'cutout'})).replace('<svg ','<svg x="-98" y="-220" width="196" height="220" ');
 const words=(item.text||'Ваши слова').split(/\s+/),lines=[];let line='';for(const word of words){const chunks=[];for(let i=0;i<word.length;i+=19)chunks.push(word.slice(i,i+19));for(const chunk of chunks){if(line&&(line+' '+chunk).length>19){lines.push(line);line=chunk;}else line=line?line+' '+chunk:chunk;}}if(line)lines.push(line);
 return `<rect x="-112" y="${-36-lines.length*23}" width="224" height="${44+lines.length*23}" rx="9" fill="#fff9e8" stroke="#c3cba7"/><path d="M-95 -22H95" stroke="#c6b888"/><text text-anchor="middle" fill="#526346" font-family="Georgia,serif" font-size="20">${lines.map((line,i)=>`<tspan x="0" y="${-33-(lines.length-1-i)*23}">${storyEscape(line)}</tspan>`).join('')}</text>`;
}
// The player is serialized with exported scenes. Keep these frame helpers self-contained.
function storyFrameAt(data,seconds,motion=true){
 const duration=Math.max(1,data.duration),time=Math.min(duration,Math.max(0,seconds));
 const interpolate=(a,b,f)=>a+(b-a)*f;
 const cameras=data.camera,phase=time/duration;
 const viewPhase=motion?phase*phase*(3-2*phase):Number(phase>=.5);
 const zoom=interpolate(cameras.start.zoom,cameras.end.zoom,viewPhase);
 const width=800/zoom,height=500/zoom;
 const x=(800-width)*interpolate(cameras.start.x,cameras.end.x,viewPhase);
 const y=(500-height)*interpolate(cameras.start.y,cameras.end.y,viewPhase);
 const actors=data.items.map(actor=>{
   const shown=time>=actor.enter&&(time<actor.leave||actor.leave===duration);
   const points=actor.path;
   if(!shown||!motion||!points.length)return {id:actor.id,shown,x:actor.x,y:actor.y,scale:actor.scale};
   const progress=Math.min(1,Math.max(0,(time-actor.enter)/Math.max(.1,actor.leave-actor.enter)));
   const index=(points.length-1)*progress,from=points[Math.floor(index)],to=points[Math.ceil(index)];
   return {id:actor.id,shown,x:interpolate(from.x,to.x,index%1),y:interpolate(from.y,to.y,index%1),scale:actor.scale};
 });
 let cursor=0,dialogue=null;
 for(const line of data.dialogue){
   if(!line.text.trim())continue;
   if(time>=cursor&&time<cursor+line.duration){dialogue=line;break;}
   cursor+=line.duration;
 }
 return {actors,viewBox:[x,y,width,height].map(number=>number.toFixed(3)).join(' '),dialogue};
}
function makeStoryFramePainter(container,{calm}){
 const svg=container.querySelector('[data-story-timeline]');
 const dialogue=container.querySelector('.story-play-dialogue');
 if(!svg)return ()=>{};
 const data=JSON.parse(svg.getAttribute('data-story-timeline'));
 const nodes=new Map([...svg.querySelectorAll('[data-story-item]')].map(node=>[node.dataset.storyItem,node]));
 return seconds=>{
   const frame=storyFrameAt(data,seconds,!calm());
   svg.setAttribute('viewBox',frame.viewBox);
   for(const actor of frame.actors){
     const node=nodes.get(actor.id);
     if(!node)continue;
     node.style.visibility=actor.shown?'visible':'hidden';
     node.setAttribute('transform','translate('+actor.x*800+' '+actor.y*500+') scale('+actor.scale+')');
   }
   if(dialogue){
     const text=frame.dialogue?(frame.dialogue.speaker?frame.dialogue.speaker+': ':'')+frame.dialogue.text:'';
     dialogue.hidden=!text;
     if(dialogue.textContent!==text)dialogue.textContent=text;
   }
 };
}
function storyPaperApron(){
 return '<g data-story-paper-apron="true" pointer-events="none"><path d="M0 455Q185 467 386 454T800 457V500H0Z" fill="#826348"/><path d="M0 461Q148 471 339 462T800 465V500H0Z" fill="#bf9c6f"/><path d="M0 471Q238 478 431 471T800 473V500H0Z" fill="#dcb98b"/><path d="M0 481Q195 489 416 479T800 484V500H0Z" fill="#a58059"/><path d="M0 485Q205 495 360 485T800 489" stroke="#e8c79b" fill="none" stroke-width="1.5" opacity=".65"/></g>';
}
function storyPathGuide(points){
 if(!points||points.length<2)return '';
 const xy=points.map(({x,y})=>[x*800,y*500]);
 const [startX,startY]=xy[0],[endX,endY]=xy.at(-1);
 const index=Math.floor((xy.length-1)/2),[fromX,fromY]=xy[index],[toX,toY]=xy[index+1];
 const angle=Math.atan2(toY-fromY,toX-fromX)*180/Math.PI;
 const path=xy.map(([x,y])=>`${x},${y}`).join(' ');
 const arrow=`<path d="M-6-5L7 0L-6 5Z" transform="translate(${(fromX+toX)/2} ${(fromY+toY)/2}) rotate(${angle})" fill="#31574c" stroke="#f9f5e4" stroke-width="1"/>`;
 return `<g class="story-path-guide" pointer-events="none" aria-hidden="true"><polyline points="${path}" stroke="#fbf5df" stroke-width="5" fill="none"/><polyline points="${path}" stroke="#31574c" stroke-dasharray="7 7" stroke-width="2.6" fill="none"/><circle cx="${startX}" cy="${startY}" r="6" fill="#f8f4dc" stroke="#31574c" stroke-width="2"/><rect x="${endX-5}" y="${endY-5}" width="10" height="10" rx="2" fill="#31574c" stroke="#f8f4dc" stroke-width="1.35"/>${arrow}<g fill="#253e34" stroke="#fff9e7" stroke-width="3" paint-order="stroke" font-family="sans-serif" font-size="12" text-anchor="middle"><text x="${startX}" y="${startY-11}">Начало</text><text x="${endX}" y="${endY-11}">Конец</text></g></g>`;
}
function storySceneThumb(scene){
 const [sky,ground,ink]=storyBackgrounds[scene.background]||storyBackgrounds.meadow;
 const items=scene.items.map(item=>{
  const x=item.x*144,y=item.y*80;
  if(item.type==='plant')return `<g transform="translate(${x} ${y}) scale(${item.scale})" fill="${ink}"><path d="M0 1V-18M0-7Q-14-10-12-19Q-4-20 0-7M0-12Q12-24 13-16Q10-10 0-12"/><path d="M-5-3H5L4 3H-4Z" fill="#a67653"/></g>`;
  if(item.type==='bee')return `<g fill="#d2a857" transform="translate(${x} ${y-3})"><ellipse cx="-2" cy="-2" rx="3" ry="2" fill="#f8efcf"/><ellipse rx="4" ry="2.7"/></g>`;
  return `<rect x="${x-10}" y="${y-7}" width="20" height="7" rx="2" fill="#ffefd6" stroke="${ink}" stroke-width=".8"/>`;
 }).join('');
 return `<svg class="story-scene-thumb" viewBox="0 0 144 80" aria-hidden="true" focusable="false"><rect width="144" height="80" rx="6" fill="${sky}"/><circle cx="114" cy="17" r="9" fill="#fff1c7" opacity=".8"/><path d="M0 55Q51 45 90 55T144 53V80H0Z" fill="${ground}"/>${items}<path d="M0 75Q62 78 144 75V80H0Z" fill="#ae8c67"/></svg>`;
}
function renderStoryScene(raw,{art,catalog=[],selectedId='',interactive=false,playing=false}={}){
 const scene=normalizeStoryScene(raw,catalog),[sky,ground,ink]=storyBackgrounds[scene.background];
 const timeline=storyEscape(JSON.stringify({duration:scene.duration,camera:scene.camera,dialogue:scene.dialogue,items:scene.items.map(({id,x,y,scale,enter,leave,path})=>({id,x,y,scale,enter,leave,path}))}));
 if(!art?.plantArt||!art?.beeArt)throw new Error('Нужны рисунки растений и Жужи.');
 return `<svg class="story-stage-svg ${playing?'is-playing':''}" data-story-background="${scene.background}" data-story-timeline="${timeline}" style="--story-duration:${scene.duration}s" viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg" ${interactive?'role="group" aria-label="Сцена. Выберите предмет; переместите мышью, касанием или стрелками."':'role="img" aria-label="'+storyEscape(scene.name)+'"'}><rect width="800" height="500" rx="20" fill="${sky}"/><circle cx="650" cy="85" r="43" fill="${scene.background==='night'?'#f0e5bc':'#fff5c7'}" opacity=".8"/><path d="M0 336Q170 265 380 331T800 305V500H0Z" fill="${ground}"/><path d="M0 408Q270 345 800 410" fill="none" stroke="${ink}" opacity=".2" stroke-width="2"/><g fill="${ink}" opacity=".25">${Array.from({length:16},(_,i)=>`<circle cx="${42+i*47}" cy="${37+(i*31)%140}" r="${1+i%3}"/>`).join('')}</g>${interactive?storyPathGuide(scene.items.find(item=>item.id===selectedId)?.path):''}${scene.items.map(item=>`<g data-story-item="${item.id}" transform="translate(${item.x*800} ${item.y*500}) scale(${item.scale})" ${interactive?'tabindex="0" role="button" aria-label="'+storyEscape(item.type==='plant'?(catalog.find(s=>s.id===item.speciesId)?.name||'Растение'):item.type==='bee'?'Жужа':item.text||'Надпись')+'"':''}><g class="story-motion" data-motion="${item.motion}">${storyArtwork(item,art)}</g>${interactive&&item.id===selectedId?'<rect class="story-selection" x="-115" y="-238" width="230" height="252" rx="13" fill="none" stroke="#8a9c55" stroke-width="2" stroke-dasharray="6 5"/>':''}</g>`).join('')}${storyPaperApron()}</svg>`;
}
function gardenComicEvents(journal=[],catalog=[]){
 const ids=new Set(catalog.map(s=>s.id)),seen=new Set(),events=[];
 for(const [index,row]of (Array.isArray(journal)?journal:[]).slice(0,200).entries()){
  if(!row||typeof row!=='object'||!Number.isSafeInteger(row.at)||row.at<0||row.at>8640000000000000||typeof row.text!=='string')continue;
  const text=storyText(row.text,220),kind=row.plantsAdded>0?'plant':/взросл|расцв|цветен|раскрыл|вырос/i.test(text)?'bloom':/откры|найден|изуч|секрет/i.test(text)?'discovery':row.kind==='water'?'care':null;
  if(!kind)continue;let hash=2166136261;for(const ch of text)hash=Math.imul(hash^ch.charCodeAt(0),16777619);const id='event-'+row.at.toString(36)+'-'+(hash>>>0).toString(36);if(seen.has(id))continue;seen.add(id);
  events.push({id,at:row.at,text,kind,speciesId:ids.has(row.speciesId)?row.speciesId:null});if(events.length===30)break;
 }
 return events;
}
function comicPanels(events,{art,catalog=[]}={}){
 const labels={plant:'Маленькое начало',bloom:'День большого чуда',discovery:'Новое открытие',care:'Капелька заботы'};
 return events.map((event,i)=>`<article class="story-comic-panel"><div class="story-comic-number">${String(i+1).padStart(2,'0')}</div><div class="story-comic-art">${event.speciesId?storySafeSVG(art.plantArt(event.speciesId,{id:'comic-'+i,growth:event.kind==='plant'?.08:event.kind==='care'?.45:1,pot:'cream'})):storySafeSVG(art.beeArt('','curious'))}</div><div class="story-comic-copy"><small>${storyEscape(new Date(event.at).toLocaleDateString('ru-RU'))} · ${labels[event.kind]}</small><p>${storyEscape(event.text)}</p></div></article>`).join('');
}
const storyPortableCSS=`:root{font-family:system-ui,sans-serif;color:#36503c;background:#f5f2e7}*{box-sizing:border-box}body{margin:0;padding:25px 18px}main{max-width:1000px;margin:auto}h1{font:clamp(28px,5vw,44px)/1.2 Georgia,serif;overflow-wrap:anywhere}p{line-height:1.7}button{min-height:46px;border:1px solid #c4d0b7;background:#fffdf3;color:#35573e;padding:11px 20px;border-radius:12px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #b58a37;outline-offset:3px}.story-stage-svg{display:block;width:100%;height:auto;border-radius:20px;border:1px solid #cfd8bb;overflow:hidden}.story-motion{transform-box:fill-box;transform-origin:center bottom;animation-play-state:paused!important}.is-playing [data-motion=sway]{animation:story-sway var(--story-duration,12s) ease-in-out infinite}.is-playing [data-motion=float]{animation:story-float calc(var(--story-duration,12s)*.6) ease-in-out infinite}.is-playing [data-motion=orbit]{animation:story-orbit var(--story-duration,12s) linear infinite}.is-playing [data-motion=grow]{animation:story-grow var(--story-duration,12s) ease-in-out infinite}.is-playing .story-motion{animation-play-state:running!important}.story-comic-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.story-comic-panel{position:relative;overflow:hidden;background:#fffdf4;border:1px solid #d7dcc4;border-radius:18px;min-width:0}.story-comic-number{position:absolute;top:13px;left:15px;font:20px Georgia;color:#98a179}.story-comic-art{height:240px;background:linear-gradient(#edf0dd,#f5f1e2);padding:18px}.story-comic-art>svg{width:100%;height:100%;display:block}.story-comic-copy{padding:18px}.story-comic-copy small{font-size:12px;color:#7c896a}.story-comic-copy p{font:20px/1.5 Georgia;overflow-wrap:anywhere}.story-export-toolbar{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:18px 0}.story-export-foot{font-size:12px;color:#748068;margin-top:25px}@keyframes story-sway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(3deg)}}@keyframes story-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-24px)}}@keyframes story-orbit{0%{transform:translate(-20px,0) rotate(-5deg)}25%{transform:translate(0,-24px) rotate(3deg)}50%{transform:translate(20px,0) rotate(5deg)}75%{transform:translate(0,12px) rotate(-3deg)}100%{transform:translate(-20px,0) rotate(-5deg)}}@keyframes story-grow{0%,100%{transform:scale(.65);opacity:.6}40%,70%{transform:scale(1);opacity:1}}@media(max-width:600px){body{padding:20px 12px}.story-comic-grid{grid-template-columns:1fr}.story-comic-art{height:220px}}@media(prefers-reduced-motion:reduce){.story-motion{animation:none!important}}`;
function buildStoryHTML(raw,{art,catalog=[]}={}){
 const scene=normalizeStoryScene(raw,catalog);
 return buildStoryProgramHTML({title:scene.name,order:[scene.id]},[scene],{art,catalog});
}
function normalizeStoryProgram(raw,scenes) {
 const valid=new Set(scenes.map(scene=>scene.id));
 return {
   title:storyText(raw?.title,70).trim()||'Спектакль моего сада',
   order:Array.isArray(raw?.order)?[...new Set(raw.order.slice(0,20).filter(id=>valid.has(id)))].slice(0,4):[]
 };
}
function renderStoryProgram(raw,scenes,{art,catalog=[]}={}) {
 const program=normalizeStoryProgram(raw,scenes),ordered=program.order.map(id=>scenes.find(scene=>scene.id===id));
 if(!ordered.length)throw new Error('Добавьте хотя бы одну сцену в спектакль.');
 return `<section class="story-program-view" aria-label="Спектакль сада">
   <nav class="story-program-toc" aria-label="Оглавление">
      ${ordered.map((scene,index)=>`<button type="button" data-program-index="${index}" ${index===0?'aria-current="step"':''}>${storySceneThumb(scene)}<span><strong>${storyEscape(scene.name)}</strong><small>${scene.duration} с</small></span></button>`).join('')}
   </nav>
   <div class="story-program-stage"></div>
   <div class="story-program-controls">
     <button type="button" data-program-prev>← Предыдущая сцена</button>
     <button type="button" data-program-play aria-pressed="false">Воспроизвести спектакль</button>
     <button type="button" data-program-next>Следующая сцена →</button>
   </div>
   <p class="story-program-status" role="status"></p>
   ${ordered.map(scene=>`<template data-program-scene data-name="${storyEscape(scene.name)}" data-duration="${scene.duration}" data-soundtrack="${storyEscape(JSON.stringify(normalizeStorySoundtrack(scene.soundtrack)))}">${renderStoryScene(scene,{art,catalog})}<p class="story-play-dialogue" aria-live="polite" hidden></p></template>`).join('')}
 </section>`;
}

// Shared by the editor preview and the downloaded, standalone performance.
// Audio starts only after the explicit Play gesture.
function createStorySoundtrack(tone){
 let audio=null,timer=0;
 function activate(){
   const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
   if(!Audio)return;
   try{
     audio??=new Audio();
     void audio.resume().catch(()=>{});
   }catch{}
 }
 function pause(){clearTimeout(timer);timer=0;}
 function play(tune,elapsed=0){
   pause();
   if(!audio||!tune||!tune.notes?.some(Boolean))return;
   const beatLength=60000/tune.tempo;
   let index=Math.ceil(elapsed/beatLength);
   const start=performance.now()-elapsed;
   function beat(){
     tone(audio,tune.notes[index%tune.notes.length],tune.voice);
     index++;
     timer=setTimeout(beat,Math.max(0,index*beatLength-(performance.now()-start)));
   }
   timer=setTimeout(beat,Math.max(0,index*beatLength-elapsed));
 }
 function close(){
   pause();
   if(audio)void audio.close().catch(()=>{});
   audio=null;
 }
 return {activate,pause,play,close};
}
function attachStoryProgram(root,{signal,tone,calm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches}={}) {
 const scenes=[...root.querySelectorAll('template[data-program-scene]')];
 const audio=createStorySoundtrack(tone);
 const stage=root.querySelector('.story-program-stage'),status=root.querySelector('.story-program-status');
 const play=root.querySelector('[data-program-play]'),prev=root.querySelector('[data-program-prev]'),next=root.querySelector('[data-program-next]');
 const toc=[...root.querySelectorAll('[data-program-index]')];
 let index=0,timer=0,started=0,remaining=0,running=false,finished=false,animation=0,paint=()=>{};
 const duration=()=>Number(scenes[index].dataset.duration)*1000;
 const listen=(node,event,fn)=>node.addEventListener(event,fn,signal?{signal}:undefined);
 function controls(){
   play.textContent=running?'Пауза':finished?'С начала':remaining<duration()?'Продолжить':'Воспроизвести спектакль';
   play.setAttribute('aria-pressed',String(running));
   prev.disabled=index===0;
   next.disabled=index===scenes.length-1;
   toc.forEach((button,position)=>{
     if(position===index)button.setAttribute('aria-current','step');
     else button.removeAttribute('aria-current');
   });
   stage.querySelector('svg')?.classList.toggle('is-playing',running&&!calm());
 }
 function jump(position){
   index=Math.max(0,Math.min(scenes.length-1,position));
   remaining=duration();
   finished=false;
   stage.replaceChildren(scenes[index].content.cloneNode(true));
   paint=makeStoryFramePainter(stage,{calm});
   paint(0);
   const frame=stage.firstElementChild;
   if(frame&&!calm())frame.animate?.([{opacity:.15},{opacity:1}],{duration:230,easing:'ease-out'});
   status.textContent=`Сцена ${index+1} из ${scenes.length} · ${scenes[index].dataset.name}`;
   controls();
 }
 function pause(){
   if(running)remaining=Math.max(0,remaining-(performance.now()-started));
   running=false;
   clearTimeout(timer);
   cancelAnimationFrame(animation);
   audio.pause();
   controls();
 }
 function run(){
   if(finished)jump(0);
   running=true;
   started=performance.now();
   controls();
   const elapsed=duration()-remaining;
   audio.play(JSON.parse(scenes[index].dataset.soundtrack),elapsed);
   function frame(now){if(running){paint((elapsed+now-started)/1000);animation=requestAnimationFrame(frame);}}
   animation=requestAnimationFrame(frame);
   timer=setTimeout(()=>{
     remaining=0;
     running=false;
     cancelAnimationFrame(animation);
     audio.pause();
     paint(duration()/1000);
     if(index+1<scenes.length){jump(index+1);run();}
     else{finished=true;controls();status.textContent='Спектакль завершён.';}
   },remaining);
 }
 function move(position){
   const playing=running;
   pause();
   jump(position);
   if(playing)run();
 }
 listen(play,'click',()=>{if(running)pause();else{audio.activate();run();}});
 listen(prev,'click',()=>move(index-1));
 listen(next,'click',()=>move(index+1));
 for(const [position,button] of toc.entries())listen(button,'click',()=>move(position));
 listen(document,'visibilitychange',()=>{if(document.hidden&&running)pause();});
 signal?.addEventListener('abort',()=>{clearTimeout(timer);cancelAnimationFrame(animation);audio.close();},{once:true});
 listen(window,'pagehide',()=>audio.close());
 jump(0);
}

function buildStoryProgramHTML(raw,scenes,options={}) {
 const program=normalizeStoryProgram(raw,scenes),markup=renderStoryProgram(program,scenes,options);
 return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
 <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'">
 <title>${storyEscape(program.title)}</title><style>${storyPortableCSS}.story-program-toc,.story-program-controls{display:flex;flex-wrap:wrap;gap:8px;margin-block:12px}.story-program-toc [aria-current]{background:#e2eccf}.story-program-toc button{display:grid;grid-template-columns:5rem minmax(0,1fr);align-items:center;gap:.7rem;text-align:left;max-width:100%}.story-program-toc span{min-width:0;overflow-wrap:anywhere}.story-program-toc small{display:block;margin-top:.25rem}.story-scene-thumb{display:block;width:100%;border-radius:.38rem}.story-program-stage{min-width:0}</style>
 </head><body><main><h1>${storyEscape(program.title)}</h1>${markup}</main><script>${storyFrameAt.toString()};${makeStoryFramePainter.toString()};${createStorySoundtrack.toString()};(${attachStoryProgram.toString()})(document.querySelector('.story-program-view'),{tone:${media.synthesizeGardenNote.toString()}});<\/script></body></html>`;
}
function buildComicHTML(selected,{art,catalog=[],title='Маленькие истории моего сада'}={}){
 const clean=(Array.isArray(selected)?selected:[]).slice(0,6).filter(e=>e&&['plant','bloom','care','discovery'].includes(e.kind)&&Number.isSafeInteger(e.at)&&e.at>=0&&e.at<=8640000000000000).map(e=>({...e,text:storyText(e.text,220),speciesId:catalog.some(s=>s.id===e.speciesId)?e.speciesId:null}));
 if(!clean.length)throw new Error('Выберите хотя бы одно событие журнала.');
 return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'"><title>${storyEscape(storyText(title,70))}</title><style>${storyPortableCSS}</style></head><body><main><p>FLORA KEEP · ИСТОРИЯ В КАРТИНКАХ</p><h1>${storyEscape(storyText(title,70))}</h1><section class="story-comic-grid">${comicPanels(clean,{art,catalog})}</section><p class="story-export-foot">Каждый кадр — выбранное событие настоящего журнала сада.</p></main></body></html>`;
}
function createStoryStudioFeature(api){
 let current=defaultStoryStudioState(),pending=null,revision=0,disposeCurrent=()=>{},selectedId='',playing=false;
 const toolGroups={};
 const tasks=new Set();
 function save(){const snapshot=normalizeStoryStudioState(current,api.game.CATALOG),rev=++revision;pending=snapshot;const task=Promise.resolve(api.commit(({extras})=>{extras.storyStudio=snapshot;})).then(()=>{if(rev===revision)pending=null;});tasks.add(task);task.then(()=>tasks.delete(task),()=>tasks.delete(task));return task;}
 async function flush(){while(tasks.size)await Promise.all([...tasks]);}
 function dispose(){disposeCurrent();disposeCurrent=()=>{};playing=false;}
 function open(mode='scene'){
  dispose();current=normalizeStoryStudioState(pending||api.extras.storyStudio,api.game.CATALOG);
  if(mode==='comic')openComic();else openScene();
 }
 function openScene(){
  selectedId=current.draft.items.some(i=>i.id===selectedId)?selectedId:current.draft.items[0]?.id||'';
  const scene=current.draft,options=api.game.CATALOG.map(s=>`<option value="${storyEscape(s.id)}">${storyEscape(s.name)}</option>`).join('');
  api.showDialog('Маленький театр сада',`<div class="story-studio"><p class="story-intro">Соберите сцену из растений, Жужи и своих слов. Выберите движение каждого персонажа и подарите историю одним HTML-файлом.</p><div class="story-editor-grid"><div class="story-stage-column"><div id="story-stage" class="story-stage"></div><div class="story-play-tools"><button type="button" class="button primary" data-story="play" aria-pressed="false">Оживить сцену</button><button type="button" class="button secondary" data-story="export">Скачать историю · HTML</button></div><p class="story-hint">Перетащите персонажа. Для точной расстановки используйте стрелки на клавиатуре или кнопки ниже. До 20 предметов.</p></div><div class="story-controls"><label class="field"><span>Название</span><input id="story-name" maxlength="60" value="${storyEscape(scene.name)}"></label><div class="story-control-pair"><label class="field"><span>Декорации</span><select id="story-background">${[['meadow','Тихий луг'],['dawn','Тёплый рассвет'],['night','Ночь светлячков']].map(([v,t])=>`<option value="${v}" ${scene.background===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="field"><span>Цикл движения · сек</span><input id="story-duration" type="range" min="6" max="30" step="1" value="${scene.duration}"><output id="story-duration-value">${scene.duration}</output></label></div><div class="story-add-tools"><label class="field"><span>Растение</span><select id="story-species">${options}</select></label><button type="button" class="button secondary" data-story="add-plant">Добавить растение</button><button type="button" class="button secondary" data-story="add-bee">Добавить Жужу</button><button type="button" class="button secondary" data-story="add-label">Добавить подпись</button></div><div id="story-selection-controls" aria-label="Инструменты выбранного персонажа"></div></div></div><div class="story-library-tools"><button type="button" class="button primary" data-story="save-scene">Сохранить сцену на полку</button><button type="button" class="button secondary" data-story="save-copy">Сохранить как новую</button><span id="story-count" class="story-hint"></span></div><div id="story-timeline-tools"></div><div id="story-program-editor"></div><div id="story-library" class="story-library"></div><p id="story-status" class="story-status" role="status" aria-live="polite"></p></div>`,'story-studio',true);
  const root=document.querySelector('.story-studio'),stage=document.getElementById('story-stage');if(!root||!stage)return;
  const abort=new AbortController(),editorSound=createStorySoundtrack(api.media.synthesizeGardenNote),gallerySound=createStorySoundtrack(api.media.synthesizeGardenNote);let drag=null,gallery=null,programAbort=null,mainFrame=0,galleryFrame=0,drawingPath=false;disposeCurrent=()=>{closeGallery(false);editorSound.close();cancelAnimationFrame(mainFrame);programAbort?.abort();abort.abort();if(drag){drag=null;save().catch(()=>api.toast('Не удалось сохранить последнее перемещение.'));}stage.querySelector('.story-stage-svg')?.classList.remove('is-playing');};
  const listen=(element,name,fn)=>element.addEventListener(name,fn,{signal:abort.signal});
  const status=text=>{root.querySelector('#story-status').textContent=text;};
  const safeSave=()=>save().catch(()=>status('Не удалось сохранить. Скачайте HTML, чтобы сохранить сцену.'));
  const selected=()=>current.draft.items.find(i=>i.id===selectedId);
   function playTimeline(container,duration) {
     const calm=()=>api.prefs.calm||matchMedia('(prefers-reduced-motion: reduce)').matches;
     const paint=makeStoryFramePainter(container,{calm});
     let request=0,start=null;
     function frame(now){
       if(!container.isConnected)return;
       start??=now;
       paint(((now-start)/1000)%duration);
       request=requestAnimationFrame(frame);
       if(container===stage)mainFrame=request;
       else galleryFrame=request;
     }
     request=requestAnimationFrame(frame);
     if(container===stage)mainFrame=request;
     else galleryFrame=request;
   }
   function draw(){
     cancelAnimationFrame(mainFrame);
     stage.innerHTML=renderStoryScene(current.draft,{art:api.art,catalog:api.game.CATALOG,selectedId:playing?'':selectedId,interactive:!playing,playing:playing&&!api.prefs.calm&&!matchMedia('(prefers-reduced-motion: reduce)').matches})+'<p class="story-play-dialogue" aria-live="polite" hidden></p>';
     if(playing){playTimeline(stage,current.draft.duration);editorSound.play(current.draft.soundtrack);}
     else editorSound.pause();
     root.querySelector('#story-count').textContent=current.draft.items.length+' / 20 предметов · '+current.saved.length+' / 4 сцены';
     const position=root.querySelector('.story-position-readout output'),item=selected();
     if(position&&item)position.textContent=Math.round(item.x*100)+'% · '+Math.round(item.y*100)+'%';
   }
  function controls(){const item=selected(),holder=root.querySelector('#story-selection-controls');holder.innerHTML=item?`<fieldset class="story-selected"><legend>${storyEscape(item.type==='label'?'Подпись':item.type==='bee'?'Жужа':api.game.CATALOG.find(s=>s.id===item.speciesId)?.name||'Растение')}</legend><label class="field"><span>Движение</span><select id="story-motion">${[['still','Неподвижно'],['sway','Покачивание'],['float','Парение'],['orbit','Маленький круг'],['grow','Появление и рост']].map(([v,t])=>`<option value="${v}" ${item.motion===v?'selected':''}>${t}</option>`).join('')}</select></label><label class="field"><span>Размер</span><input id="story-size" type="range" min="45" max="160" value="${Math.round(item.scale*100)}"></label><div class="story-actor-timing">
   <label class="field"><span>Появление · сек</span><input type="number" min="0" max="${current.draft.duration}" step=".5" id="story-enter" value="${item.enter??0}"></label>
   <label class="field"><span>Исчезновение · сек</span><input type="number" min="0" max="${current.draft.duration}" step=".5" id="story-leave" value="${item.leave??current.draft.duration}"></label>
   <button type="button" class="button secondary" data-story="draw-path" aria-pressed="${drawingPath}">Нарисовать траекторию</button>
   <button type="button" class="button secondary" data-story="clear-path" ${item.path?.length?'':'disabled'}>Убрать траекторию</button>
 </div>${item.type==='label'?`<label class="field"><span>Текст на сцене</span><textarea id="story-label" maxlength="80" rows="3">${storyEscape(item.text)}</textarea></label>`:''}<div class="story-position-readout" aria-live="off">Положение: <output>${Math.round(item.x*100)}% · ${Math.round(item.y*100)}%</output></div><div class="story-nudge" role="group" aria-label="Передвинуть персонажа">${[['left','←'],['up','↑'],['down','↓'],['right','→']].map(([v,t])=>`<button type="button" class="button secondary" data-story="nudge" data-direction="${v}" aria-label="${{left:'Влево',up:'Выше',down:'Ниже',right:'Вправо'}[v]}">${t}</button>`).join('')}</div><button type="button" class="button secondary" data-story="delete">Убрать со сцены</button></fieldset>`:'<p class="story-hint">Добавьте предмет или выберите его на сцене.</p>';}
  function library(){root.querySelector('#story-library').innerHTML=current.saved.map((scene,i)=>`<article><div class="story-mini">${renderStoryScene(scene,{art:api.art,catalog:api.game.CATALOG})}</div><strong>${storyEscape(scene.name)}</strong><div><button type="button" class="button secondary" data-story="gallery" data-index="${i}">Рассмотреть</button><button type="button" class="button secondary" data-story="load" data-index="${i}">Открыть</button><button type="button" class="button secondary" data-story="remove-saved" data-index="${i}">Удалить</button></div></article>`).join('')||`<div class="story-library-empty"><div aria-hidden="true">${api.art.beeArt('','happy')}</div><h3>У каждой истории есть первая сцена</h3><p>Ваш театр уже готов к премьере. Сохраните композицию — и она займёт место в галерее.</p><button type="button" class="button primary" data-story="save-first">Сохранить первую сцену</button></div>`;}
     function timelineTools() {
    const holder=root.querySelector('#story-timeline-tools');
    const open=holder.firstElementChild?.open??false;
    const camera=current.draft.camera;
    const tunes=api.extras.playground.music?.library||[];
    const chosen=current.draft.soundtrack;
    const equivalent=tunes.findIndex(tune=>JSON.stringify(normalizeStorySoundtrack(tune))===JSON.stringify(chosen));
    const frames=[['start','Начальный кадр'],['end','Конечный кадр']];
    holder.innerHTML=`<details class="story-timeline-editor" ${open?'open':''}><summary>Реплики, камера и музыка</summary>
      <label class="field"><span>Мелодия сцены</span><select data-story-tune>
       <option value="">Тишина</option>${chosen&&equivalent<0?`<option value="attached" selected>${storyEscape(chosen.name)} · прикреплена</option>`:''}
       ${tunes.map((tune,index)=>`<option value="${index}" ${equivalent===index?'selected':''}>${storyEscape(tune.name)}</option>`).join('')}
      </select></label>
      ${!tunes.length&&!chosen?'<p class="form-help">Сохраните мелодию в «Цветочной мелодии», чтобы добавить её в сцену.</p>':''}
      <div class="story-camera-frames">${frames.map(([key,title])=>`<fieldset><legend>${title}</legend>
       ${[['zoom','Приближение',1,2.4,.1],['x','Горизонталь',0,1,.05],['y','Вертикаль',0,1,.05]]
          .map(([axis,label,min,max,step])=>`<label class="field"><span>${label}</span><input type="number" min="${min}" max="${max}" step="${step}" data-story-camera="${key}" data-camera-axis="${axis}" value="${camera[key][axis]}"></label>`).join('')}
      </fieldset>`).join('')}</div>
      <h3>Реплики по порядку</h3>
      <div class="story-lines">${current.draft.dialogue.map((line,index)=>`<fieldset><legend>Реплика ${index+1}</legend>
       <label class="field"><span>Кто говорит</span><input data-story-line="${index}" data-line-field="speaker" maxlength="28" value="${storyEscape(line.speaker)}"></label>
       <label class="field"><span>Текст</span><textarea data-story-line="${index}" data-line-field="text" maxlength="140" rows="2">${storyEscape(line.text)}</textarea></label>
       <label class="field"><span>Длительность · сек</span><input data-story-line="${index}" data-line-field="duration" type="number" min="1" max="12" step=".5" value="${line.duration}"></label>
       <button type="button" class="button secondary" data-story="remove-line" data-index="${index}">Убрать реплику</button>
      </fieldset>`).join('')}</div>
      <button type="button" class="button secondary" data-story="new-line" ${current.draft.dialogue.length>=8?'disabled':''}>Добавить реплику</button>
    </details>`;
   }
   function programEditor() {
     const holder=root.querySelector('#story-program-editor');
     programAbort?.abort();
     programAbort=null;
     current.program=normalizeStoryProgram(current.program,current.saved);
     const {title,order}=current.program;
     const action=(name,label,id='',disabled=false)=>`<button type="button" class="button secondary" data-story="program-${name}" ${id?`data-id="${id}"`:''} ${disabled?'disabled':''}>${label}</button>`;
     const unused=current.saved.filter(scene=>!order.includes(scene.id));
     holder.innerHTML=`<details class="story-program-editor" ${toolGroups.program?'open':''}>
       <summary>Спектакль из сцен</summary>
       <label class="field"><span>Название спектакля</span><input id="story-program-title" maxlength="70" value="${storyEscape(title)}"></label>
       <ol class="story-filmstrip">${order.map((id,index)=>{
         const scene=current.saved.find(scene=>scene.id===id);
         return `<li>${storySceneThumb(scene)}<div class="story-filmstrip-label"><strong>${storyEscape(scene.name)}</strong><small>${scene.duration} с</small></div><div class="story-filmstrip-actions">${action('up','Левее',id,index===0)}${action('down','Правее',id,index===order.length-1)}${action('remove','Убрать',id)}</div></li>`;
       }).join('')}</ol>
       ${unused.length?`<label class="field"><span>Сохранённые сцены</span><select id="story-program-scene">${unused.map(scene=>`<option value="${scene.id}">${storyEscape(scene.name)}</option>`).join('')}</select></label>${action('add','Добавить сцену в спектакль')}`:''}
       ${!current.saved.length?'<p>Сохраните первую сцену, чтобы включить её в спектакль.</p>':''}
       ${action('preview','Посмотреть спектакль','',!order.length)}${action('export','Скачать спектакль · HTML','',!order.length)}
       <div id="story-program-preview"></div>
     </details>`;
     listen(holder.querySelector('details'),'toggle',event=>{toolGroups.program=event.currentTarget.open;});
   }
   async function programAction(action,button) {
     const order=current.program.order;
     const options={art:api.art,catalog:api.game.CATALOG};
     if(action==='preview'){
       const preview=root.querySelector('#story-program-preview');
       programAbort?.abort();
       programAbort=new AbortController();
       preview.innerHTML=renderStoryProgram(current.program,current.saved,options);
       attachStoryProgram(preview.firstElementChild,{signal:programAbort.signal,tone:api.media.synthesizeGardenNote,calm:()=>api.prefs.calm||matchMedia('(prefers-reduced-motion: reduce)').matches});
       preview.querySelector('[data-program-play]')?.focus();
       return;
     }
     if(action==='export'){
       const html=buildStoryProgramHTML(current.program,current.saved,options);
       api.download(new Blob([html],{type:'text/html;charset=utf-8'}),'flora-garden-play.html');
       status('Спектакль скачан.');
       return;
     }
     if(action==='add'){
       const id=root.querySelector('#story-program-scene')?.value;
       if(id&&!order.includes(id))order.push(id);
     }else{
       const index=order.indexOf(button.dataset.id);
       if(index<0)return;
       if(action==='remove')order.splice(index,1);
       else{
         const target=index+(action==='up'?-1:1);
         if(target<0||target>=order.length)return;
         [order[index],order[target]]=[order[target],order[index]];
       }
     }
     toolGroups.program=true;
     await safeSave();
     if(root.isConnected)programEditor();
   }
   function arrangeWorkbench(){
   stage.after(root.querySelector('#story-selection-controls'));
   const tools=root.querySelector('.story-controls'),wrap=(nodes,title,key)=>{const group=document.createElement('details');group.className='story-tool-group';group.dataset.toolGroup=key;group.open=Object.hasOwn(toolGroups,key)?toolGroups[key]:!matchMedia('(max-width:760px)').matches||key==='cast';const summary=document.createElement('summary');summary.textContent=title;nodes[0].before(group);group.append(summary,...nodes);listen(group,'toggle',()=>toolGroups[key]=group.open);listen(summary,'click',event=>{event.preventDefault();group.open=!group.open;toolGroups[key]=group.open;if(group.open&&matchMedia('(max-width:760px)').matches)for(const other of root.querySelectorAll('.story-tool-group'))if(other!==group){other.open=false;toolGroups[other.dataset.toolGroup]=false;}});};
   wrap([tools.querySelector('.story-control-pair')],'Свет и ритм','setting');wrap([tools.querySelector('.story-add-tools')],'Добавить персонажа','cast');
  }
  function closeGallery(restore=true){gallerySound.close();cancelAnimationFrame(galleryFrame);if(!gallery)return;const {panel,trigger,dialog,scroll}=gallery;panel.remove();root.classList.remove('is-gallery');dialog?.classList.remove('story-gallery-open');if(dialog)dialog.scrollTop=scroll;gallery=null;if(restore&&trigger?.isConnected)trigger.focus({preventScroll:true});}
  function openGallery(index,trigger){
   if(!current.saved.length)return;closeGallery(false);playing=false;draw();root.querySelector('[data-story="play"]').textContent='Оживить сцену';root.querySelector('[data-story="play"]').setAttribute('aria-pressed','false');const panel=document.createElement('section'),dialog=root.closest('dialog');panel.className='story-full-gallery';panel.setAttribute('aria-label','Галерея сохранённых сцен');panel.tabIndex=-1;gallery={panel,trigger,dialog,scroll:dialog?.scrollTop||0,index:Math.min(index,current.saved.length-1),playing:false};root.append(panel);root.classList.add('is-gallery');dialog?.classList.add('story-gallery-open');
   const paint=()=>{gallerySound.pause();cancelAnimationFrame(galleryFrame);const scene=current.saved[gallery.index],motion=gallery.playing&&!api.prefs.calm&&!matchMedia('(prefers-reduced-motion: reduce)').matches;panel.innerHTML=`<header><div><span>БУМАЖНЫЙ ТЕАТР · ${gallery.index+1} / ${current.saved.length}</span><h3>${storyEscape(scene.name)}</h3></div><button type="button" class="button secondary" data-story-gallery="exit">К мастерской</button></header><div class="story-gallery-art">${renderStoryScene(scene,{art:api.art,catalog:api.game.CATALOG,playing:motion})}<p class="story-play-dialogue" aria-live="polite" hidden></p></div><nav aria-label="Просмотр сцен"><button type="button" class="button secondary" data-story-gallery="prev" ${current.saved.length<2?'disabled':''}>← Предыдущая</button><button type="button" class="button primary" data-story-gallery="play" aria-pressed="${gallery.playing}">${gallery.playing?'Пауза':'Оживить'}</button><button type="button" class="button secondary" data-story-gallery="next" ${current.saved.length<2?'disabled':''}>Следующая →</button></nav>`;if(gallery.playing){playTimeline(panel.querySelector('.story-gallery-art'),scene.duration);gallerySound.play(scene.soundtrack);}};
   const step=delta=>{gallery.index=(gallery.index+delta+current.saved.length)%current.saved.length;paint();panel.querySelector(`[data-story-gallery="${delta>0?'next':'prev'}"]`)?.focus({preventScroll:true});};
   listen(panel,'click',event=>{const action=event.target.closest('[data-story-gallery]')?.dataset.storyGallery;if(action==='exit')closeGallery();else if(action==='prev')step(-1);else if(action==='next')step(1);else if(action==='play'){gallery.playing=!gallery.playing;if(gallery.playing)gallerySound.activate();paint();panel.querySelector('[data-story-gallery="play"]').focus({preventScroll:true});}});listen(panel,'keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeGallery();}else if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();step(event.key==='ArrowRight'?1:-1);}});paint();if(dialog)dialog.scrollTop=0;panel.querySelector('[data-story-gallery="exit"]').focus({preventScroll:true});
  }
  function move(dx,dy){const item=selected();if(!item)return;item.x=storyBound(item.x+dx,.06,.94,.5);item.y=storyBound(item.y+dy,.2,.94,.75);draw();safeSave();}
  function point(event){const svg=stage.querySelector('svg'),rect=svg.getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};}
     listen(stage,'pointerdown',event=>{
    if(drawingPath&&selected()&&event.button===0){
      const start=point(event);
      playing=false;
      const playButton=root.querySelector('[data-story="play"]');
      playButton.textContent='Оживить сцену';playButton.setAttribute('aria-pressed','false');
      drag={id:event.pointerId,path:true,last:start};
      selected().path=normalizeStoryPath([start]);
      stage.setPointerCapture(event.pointerId);
      draw();event.preventDefault();return;
    }
    const item=event.target.closest('[data-story-item]');if(!item||event.button!==0)return;selectedId=item.dataset.storyItem;playing=false;root.querySelector('[data-story="play"]').textContent='Оживить сцену';root.querySelector('[data-story="play"]').setAttribute('aria-pressed','false');const start=point(event),value=selected();drag={id:event.pointerId,x:start.x,y:start.y,startX:value.x,startY:value.y};stage.setPointerCapture(event.pointerId);controls();draw();event.preventDefault();});
  listen(stage,'pointermove',event=>{if(!drag||event.pointerId!==drag.id)return;const p=point(event),item=selected();
    if(drag.path){
      if(item.path.length<40&&Math.hypot(p.x-drag.last.x,p.y-drag.last.y)>.027){
        item.path=normalizeStoryPath([...item.path,p]);drag.last=p;draw();
      }
      return;
    }
    item.x=storyBound(drag.startX+p.x-drag.x,.06,.94,.5);item.y=storyBound(drag.startY+p.y-drag.y,.2,.94,.75);draw();});
  listen(stage,'pointerup',event=>{if(!drag||event.pointerId!==drag.id)return;const wasPath=drag.path;
    drag=null;
    if(wasPath){drawingPath=false;status('Траектория сохранена. Оживите сцену, чтобы увидеть движение.');}
    controls();safeSave();});listen(stage,'pointercancel',()=>{if(drag){drag=null;safeSave();}});
  listen(stage,'keydown',event=>{const target=event.target.closest('[data-story-item]');if(!target)return;selectedId=target.dataset.storyItem;const d={ArrowLeft:[-.015,0],ArrowRight:[.015,0],ArrowUp:[0,-.015],ArrowDown:[0,.015]}[event.key];if(d){event.preventDefault();move(...d);stage.querySelector(`[data-story-item="${selectedId}"]`)?.focus();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();controls();draw();stage.querySelector('[data-story-item="'+selectedId+'"]')?.focus();}});
  listen(root,'input',event=>{const id=event.target.id,item=selected();if(id==='story-program-title'){current.program.title=event.target.value;safeSave();return;}else if(id==='story-name')current.draft.name=storyText(event.target.value,60);else if(id==='story-duration'){current.draft.duration=Number(event.target.value);root.querySelector('#story-duration-value').textContent=event.target.value;}else if(id==='story-size'&&item)item.scale=Number(event.target.value)/100;else if(id==='story-label'&&item)item.text=storyText(event.target.value,80);else return;draw();safeSave();});
  listen(root,'change',event=>{
    const target=event.target;
    if(target.hasAttribute('data-story-tune')){
      if(target.value==='attached')return;
      const library=api.extras.playground.music?.library||[];
      current.draft.soundtrack=target.value===''?null:normalizeStorySoundtrack(library[Number(target.value)]);
    }else if(target.dataset.storyCamera){
      const frame=current.draft.camera[target.dataset.storyCamera],axis=target.dataset.cameraAxis;
      frame[axis]=Number(target.value);
      current.draft.camera=normalizeStoryCamera(current.draft.camera);
      target.value=String(current.draft.camera[target.dataset.storyCamera][axis]);
    }else if(target.dataset.storyLine!==undefined){
      const field=target.dataset.lineField,line=current.draft.dialogue[Number(target.dataset.storyLine)];
      line[field]=field==='duration'?storyBound(Number(target.value),1,12,3):storyText(target.value,field==='speaker'?28:140);
      target.value=String(line[field]);
    }else if((target.id==='story-enter'||target.id==='story-leave')&&selected()){
      const item=selected(),duration=current.draft.duration;
      if(target.id==='story-enter'){
        item.enter=storyBound(Number(target.value),0,duration,0);
        item.leave=Math.max(item.enter,item.leave);
      }else item.leave=storyBound(Number(target.value),item.enter,duration,duration);
      root.querySelector('#story-enter').value=String(item.enter);root.querySelector('#story-leave').value=String(item.leave);
    }else if(event.target.id==='story-background')current.draft.background=event.target.value;else if(event.target.id==='story-motion'&&selected())selected().motion=event.target.value;else return;draw();safeSave();});
  listen(root,'click',async event=>{const button=event.target.closest('[data-story]');if(!button)return;const action=button.dataset.story==='save-first'?'save-scene':button.dataset.story;
       if(action.startsWith('program-')){try{await programAction(action.slice(8),button);}catch(error){status(error.message);}return;}
    if(action==='gallery'){openGallery(Number(button.dataset.index)||0,button);return;}
   if(action==='play'){drawingPath=false;playing=!playing;if(playing)editorSound.activate();button.textContent=playing?'Пауза':'Оживить сцену';button.setAttribute('aria-pressed',String(playing));draw();if(api.prefs.calm||matchMedia('(prefers-reduced-motion: reduce)').matches)status('Спокойный режим включён: сцена остаётся неподвижной.');}
       else if(action==='draw-path'){
      if(!selected())return;
      if(playing){playing=false;root.querySelector('[data-story="play"]').textContent='Оживить сцену';root.querySelector('[data-story="play"]').setAttribute('aria-pressed','false');}
      drawingPath=!drawingPath;button.setAttribute('aria-pressed',String(drawingPath));
      draw();
      status(drawingPath?'Проведите линию по сцене, чтобы задать путь выбранному персонажу.':'Рисование пути выключено.');
    }
    else if(action==='clear-path'&&selected()){selected().path=[];draw();controls();safeSave();}
    else if(action==='new-line'||action==='remove-line'){
      if(action==='new-line'&&current.draft.dialogue.length<8)current.draft.dialogue.push({speaker:'',text:'',duration:3});
      else if(action==='remove-line')current.draft.dialogue.splice(Number(button.dataset.index),1);
      timelineTools();draw();safeSave();
    }
    else if(action.startsWith('add-')){if(current.draft.items.length>=20){status('На сцене уже 20 предметов. Уберите один, чтобы добавить новый.');return;}const type=action.slice(4),id='item-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);current.draft.items.push({id,type,speciesId:root.querySelector('#story-species').value,x:.3+current.draft.items.length%4*.14,y:type==='bee'?.4:.85,scale:1,enter:0,leave:current.draft.duration,path:[],motion:type==='bee'?'float':type==='plant'?'sway':'still',text:type==='label'?'Ваши слова':''});selectedId=id;draw();controls();safeSave();}
   else if(action==='nudge'){const d={left:[-.025,0],right:[.025,0],up:[0,-.025],down:[0,.025]}[button.dataset.direction];if(d)move(...d);}
   else if(action==='delete'){current.draft.items=current.draft.items.filter(i=>i.id!==selectedId);selectedId=current.draft.items[0]?.id||'';draw();controls();safeSave();}
   else if(action==='save-scene'||action==='save-copy'){const snapshot=normalizeStoryScene(current.draft,api.game.CATALOG),index=action==='save-copy'?-1:current.saved.findIndex(s=>s.id===snapshot.id);if(index>=0)current.saved[index]=snapshot;else{if(current.saved.length>=4){status('На полке четыре сцены. Удалите одну или откройте существующую для обновления.');return;}snapshot.id='saved-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6);current.draft.id=snapshot.id;current.saved.push(snapshot);}await safeSave();if(!root.isConnected)return;library();programEditor();draw();status('Сцена сохранена в этом саду.');}
   else if(action==='load'){const scene=current.saved[Number(button.dataset.index)];if(!scene)return;current.draft=normalizeStoryScene(scene,api.game.CATALOG);await safeSave();if(root.isConnected)open('scene');}
   else if(action==='remove-saved'){const index=Number(button.dataset.index);if(!Number.isInteger(index)||!current.saved[index])return;if(!globalThis.confirm('Убрать сохранённую сцену с полки? Черновик останется.'))return;current.saved.splice(index,1);safeSave();library();programEditor();draw();}
   else if(action==='export'){try{api.download(new Blob([buildStoryHTML(current.draft,{art:api.art,catalog:api.game.CATALOG})],{type:'text/html;charset=utf-8'}),'flora-paper-theatre.html');status('История скачана. Она открывается отдельно без сервера.');}catch(error){status(error.message);}}
  });
  listen(document,'visibilitychange',()=>{if(document.hidden){gallerySound.pause();cancelAnimationFrame(galleryFrame);if(gallery){gallery.playing=false;gallery.panel.querySelector('.story-stage-svg')?.classList.remove('is-playing');const g=gallery.panel.querySelector('[data-story-gallery=play]');if(g){g.textContent='Оживить';g.setAttribute('aria-pressed','false');}}playing=false;const button=root.querySelector('[data-story="play"]');button.textContent='Оживить сцену';button.setAttribute('aria-pressed','false');draw();}});
  arrangeWorkbench();draw();controls();library();timelineTools();programEditor();
 }
 function openComic(){
  const events=gardenComicEvents(api.journal,api.game.CATALOG),initialize=!current.comic.initialized&&events.length>0;let selection=current.comic.selected.filter(id=>events.some(e=>e.id===id));if(initialize)selection=events.slice(0,4).map(e=>e.id);
  api.showDialog('Садовый комикс',`<div class="story-comic"><p class="story-intro">Выберите до шести настоящих событий. Рисунки расскажут о посадках, заботе, открытиях и взрослении растений.</p><label class="field"><span>Заголовок истории</span><input id="comic-title" maxlength="70" value="${storyEscape(current.comic.title)}"></label>${events.length?`<details class="comic-event-picker" open><summary>События журнала · до 6 кадров</summary><div>${events.map(e=>`<label><input type="checkbox" value="${e.id}" ${selection.includes(e.id)?'checked':''}><span><small>${storyEscape(new Date(e.at).toLocaleDateString('ru-RU'))}</small>${storyEscape(e.text)}</span></label>`).join('')}</div></details><div id="comic-preview" class="story-comic-grid"></div><button type="button" class="button primary" data-comic="export">Скачать комикс · HTML</button>`:'<div class="story-comic-empty"><p>Пока нет событий для комикса.</p><p>Посадите растение, полейте его или дождитесь взросления. Здесь появятся ваши настоящие истории.</p></div>'}<p id="comic-status" role="status" aria-live="polite"></p></div>`,'story-comic',true);
  const root=document.querySelector('.story-comic');if(!root)return;const abort=new AbortController();disposeCurrent=()=>abort.abort();
  const chosen=()=>events.filter(e=>selection.includes(e.id)).reverse();
  const status=text=>{root.querySelector('#comic-status').textContent=text;};
  const preview=()=>{if(root.querySelector('#comic-preview'))root.querySelector('#comic-preview').innerHTML=comicPanels(chosen(),{art:api.art,catalog:api.game.CATALOG});};
  const persist=()=>{current.comic.selected=selection;current.comic.initialized=true;save().catch(()=>status('Не удалось сохранить выбор. Можно скачать готовый комикс.'));};
  root.addEventListener('input',event=>{if(event.target.id==='comic-title'){current.comic.title=storyText(event.target.value,70);persist();}},{signal:abort.signal});
  root.addEventListener('change',event=>{if(event.target.type!=='checkbox')return;const id=event.target.value;if(event.target.checked){if(selection.length>=6){event.target.checked=false;status('Выбрано шесть кадров. Сначала снимите один флажок.');return;}selection.push(id);}else selection=selection.filter(v=>v!==id);preview();persist();},{signal:abort.signal});
  root.querySelector('[data-comic="export"]')?.addEventListener('click',()=>{try{api.download(new Blob([buildComicHTML(chosen(),{art:api.art,catalog:api.game.CATALOG,title:current.comic.title})],{type:'text/html;charset=utf-8'}),'flora-garden-comic.html');status('Комикс скачан. В нём только выбранные события.');}catch(error){status(error.message);}},{signal:abort.signal});
  preview();if(initialize)persist();
 }
 return {open,dispose,flush};
}

return Object.freeze({ defaultStoryStudioState, normalizeStoryStudioState, createStorySoundtrack, storyFrameAt, renderStoryScene, gardenComicEvents, buildStoryHTML, buildStoryProgramHTML, normalizeStoryProgram, buildComicHTML, createStoryStudioFeature });
})();
