const gift = (() => {
/* Living gifts: a deliberately separate, self-contained seed and a personal note.
 * No personal garden, inventory, journal, profile IDs or notes enter the gift. */
const giftThemes = ['moss', 'petal', 'night'];
const giftText = (value, max) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').slice(0, max) : '';
const giftEscape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const giftJSON = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

function defaultGiftDraft() {
  return {speciesId:'daisy',recipient:'',sender:'',message:'Пусть каждый день приносит что-нибудь хорошее. Этот маленький росток — для тебя.',bloomMessage:'',theme:'moss',paper:'cotton',ribbon:'sage',pattern:'leaves',layout:'origami'};
}
function normalizeGiftDraft(raw, catalog=[]) {
  const initial=defaultGiftDraft(), value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  const ids=catalog.map(x=>typeof x==='string'?x:x.id);
  return {speciesId:ids.includes(value.speciesId)?value.speciesId:ids.includes('daisy')?'daisy':ids[0]||initial.speciesId,
    recipient:giftText(value.recipient,60),sender:giftText(value.sender,60),
    message:typeof value.message==='string'?giftText(value.message,500):initial.message,
    bloomMessage:giftText(value.bloomMessage,500),
    theme:giftThemes.includes(value.theme)?value.theme:'moss',
    paper:['cotton','kraft','lined'].includes(value.paper)?value.paper:'cotton',ribbon:['sage','rose','gold'].includes(value.ribbon)?value.ribbon:'sage',pattern:['leaves','dots','stars'].includes(value.pattern)?value.pattern:'leaves',layout:['letter','origami','popup'].includes(value.layout)?value.layout:'origami'};
}

const giftDraftLimit=10;
const isGiftDraftId=value=>typeof value==='string'&&/^draft-[A-Za-z0-9_-]{1,64}$/.test(value);
const newGiftDraftId=()=> 'draft-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));

function normalizeGiftWorkspace(raw,catalog=[]) {
  const draft=normalizeGiftDraft(raw,catalog);
  const candidates=Array.isArray(raw?.drafts)?raw.drafts.slice(0,40):[];
  const seen=new Set(),drafts=[];
  for(const entry of candidates){
    if(drafts.length>=giftDraftLimit)break;
    if(!isGiftDraftId(entry?.id)||seen.has(entry.id))continue;
    seen.add(entry.id);
    drafts.push({id:entry.id,...normalizeGiftDraft(entry,catalog)});
  }
  return {...draft,activeDraftId:isGiftDraftId(raw?.activeDraftId)?raw.activeDraftId:'',drafts};
}

/* This exact pure model is also embedded in the downloaded HTML. */
function giftProgressModel() {
  const cooldown=15000,growTime=300000,maxTime=8640000000000000;
  const validTime=x=>Number.isSafeInteger(x)&&x>=0&&x<=maxTime;
  const nowValue=x=>validTime(x)?x:Date.now();
  const initial=()=>({version:1,opened:false,plantedAt:null,lastUpdated:0,lastWaterAt:null,growth:0,waterings:0});
  function normalize(raw) {
    const value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    const result=initial();result.opened=value.opened===true;
    if(!result.opened||!validTime(value.plantedAt))return result;
    result.plantedAt=value.plantedAt;result.lastUpdated=Math.max(result.plantedAt,validTime(value.lastUpdated)?value.lastUpdated:result.plantedAt);
    result.lastWaterAt=validTime(value.lastWaterAt)?Math.max(result.plantedAt,value.lastWaterAt):null;
    result.waterings=Number.isInteger(value.waterings)?Math.min(4,Math.max(0,value.waterings)):0;
    if(result.lastWaterAt===null)result.waterings=0;
    if(result.waterings===0)result.lastWaterAt=null;
    result.lastUpdated=Math.max(result.lastUpdated,result.lastWaterAt||0);
    result.growth=typeof value.growth==='number'&&Number.isFinite(value.growth)?Math.min(1,Math.max(.04,value.growth)):.04;
    if(!result.waterings)result.growth=.04;
    return result;
  }
  function advance(raw, now=Date.now()) {
    const state=normalize(raw),at=nowValue(now);
    if(state.plantedAt===null||at<=state.lastUpdated)return state;
    if(state.waterings)state.growth=Math.min(1,state.growth+Math.min(growTime,at-state.lastUpdated)/growTime);
    state.lastUpdated=at;return state;
  }
  function action(raw,type,now=Date.now()) {
    const state=advance(raw,now),at=nowValue(now),result=(success,message)=>({state,success,message});
    if(type==='open'){state.opened=true;return result(true,'Письмо открыто. Можно посадить свой росток.');}
    if(type==='plant'){
      if(!state.opened)return result(false,'Сначала откройте письмо.');
      if(state.plantedAt!==null)return result(false,'Ваш росток уже посажен.');
      state.plantedAt=at;state.lastUpdated=at;state.growth=.04;
      return result(true,'Первый росток появился. Подарите ему немного воды.');
    }
    if(type==='water'){
      if(state.plantedAt===null)return result(false,'Сначала посадите семечко.');
      if(state.growth>=1)return result(false,'Растение уже выросло. Подарок останется с вами.');
      if(state.lastWaterAt!==null&&at-state.lastWaterAt<cooldown)return result(false,'Вода ещё впитывается. Следующий полив через '+Math.ceil((cooldown-(at-state.lastWaterAt))/1000)+' сек.');
      state.waterings=Math.min(4,state.waterings+1);state.lastWaterAt=at;state.lastUpdated=Math.max(state.lastUpdated,at);state.growth=Math.min(1,state.growth+.25);
      return result(true,state.growth>=1?'Маленькое чудо выросло. Пусть впереди будет много хорошего!':'Спасибо за заботу. Росток продолжит расти, даже когда вы закроете файл.');
    }
    return result(false,'Неизвестное действие.');
  }
  function valid(raw){if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1)return false;const normalized=normalize(raw);return Object.keys(normalized).every(key=>raw[key]===normalized[key]);}
  return {initial,normalize,advance,action,valid,cooldown,growTime};
}
function initialGiftProgress(){return giftProgressModel().initial();}
function normalizeGiftProgress(raw){return giftProgressModel().normalize(raw);}
function advanceGiftProgress(raw,now){return giftProgressModel().advance(raw,now);}
function applyGiftAction(raw,action,now){return giftProgressModel().action(raw,action,now);}

/* Local botanical stationery. Shapes follow the selected plant, never user markup. */
function giftLeafShape(speciesId) {
  if(speciesId==='monstera')return 'M0 0C-17 -4 -31 -18 -28 -32L-15 -23L-24 -39L-10 -32L-13 -46Q0 -51 6 -39Q20 -47 28 -31L13 -23L29 -23Q24 -9 0 0Z';
  if(['lavender','fern','aloe'].includes(speciesId))return 'M0 0Q-14 -19 0 -53Q12 -22 0 0Z';
  if(speciesId==='cactus')return 'M0 0C-16 -2 -19 -19 -10 -35Q0 -47 10 -35C19 -19 16 -2 0 0Z';
  if(speciesId==='mint')return 'M0 0L-11 -8L-12 -14L-22 -20L-18 -27L-22 -35L-10 -38L0 -49L9 -40L19 -36L16 -28L21 -20L12 -14L10 -7Z';
  if(['orchid','tulip'].includes(speciesId))return 'M0 0Q-28 -28 0 -60Q23 -25 0 0Z';
  return 'M0 0Q-30 -15 -23 -33Q-14 -45 0 -49Q24 -32 21 -18Q16 -5 0 0Z';
}
function giftInitials(name) {return Array.from(name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase('ru')).slice(0,2).join('')||'Ф';}
function giftSeal(name,speciesId,art) {
 const fallback=`<svg viewBox="-32 -56 64 62" focusable="false"><path d="${giftLeafShape(speciesId)}" fill="currentColor"/><path d="M0 0L0 -36" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
 const sign=art?.brandMark?.({color:'currentColor'});
 return `<div class="seal gift-wax" aria-hidden="true"><div class="gift-seal-sign">${sign||fallback}</div><span>${giftEscape(giftInitials(name))}</span></div>`;
}
function giftSeedPortrait(){
 return '<svg id="gift-reply-seed" viewBox="0 0 320 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="166" cy="251" rx="81" ry="16" fill="#725845" opacity=".14"/><path d="M113 220c-22-44 18-111 99-118 33 59-6 126-64 135-17 3-28-2-35-17Z" fill="#a77b53" stroke="#765338" stroke-width="4"/><path d="M126 216c1-42 38-77 76-98m-63 69c4-19 17-34 31-43m-18 71c22-10 40-30 48-46" fill="none" stroke="#dfbb83" stroke-width="3.4" stroke-linecap="round"/><path d="M123 202c-10 1-19 9-20 18s7 17 4 26" fill="none" stroke="#f4dcaa" stroke-width="4.2" stroke-linecap="round"/><path d="M61 270q97 20 198 0" fill="none" stroke="#bba485" stroke-width="2" opacity=".66"/></svg>';
}
function giftBotanicalFrame(speciesId) {
  const leaf=giftLeafShape(speciesId);
  const side=(flip)=>`<g transform="${flip?'translate(400 0) scale(-1 1)':''}"><path d="M26 430Q65 310 32 203Q8 115 51 30" fill="none" stroke="currentColor" stroke-width="1.3" opacity=".48"/>${Array.from({length:7},(_,i)=>`<g class="gift-frame-leaf" data-growth-level="${Math.floor(i/2)}" transform="translate(${31+Math.sin(i)*10} ${404-i*55}) rotate(${i%2?-36:53}) scale(${.27+i*.018})"><path d="${leaf}" fill="currentColor"/><path d="M0 0Q2 -22 0 -39" stroke="var(--card,#fcfdf7)" fill="none" stroke-width="1.4"/></g>`).join('')}</g>`;
  return `<svg class="gift-botanical-frame" data-botanical-species="${giftEscape(speciesId)}" viewBox="0 0 400 460" preserveAspectRatio="none" aria-hidden="true" focusable="false">${side(false)}${side(true)}</svg>`;
}
function giftUniqueSVG(svg,prefix) {
  const ids=new Map();let n=0;
  let result=svg.replace(/\bid="([^"]+)"/g,(_,id)=>{const replacement=prefix+'-'+(++n);ids.set(id,replacement);return 'id="'+replacement+'"';});
  result=result.replace(/url\(#([^)]*)\)/g,(match,id)=>ids.has(id)?'url(#'+ids.get(id)+')':match);
  return result.replace(/((?:href|xlink:href)=["'])#([^"']+)(["'])/g,(match,start,id,end)=>ids.has(id)?start+'#'+ids.get(id)+end:match);
}
function giftPostage(species,svg,date=new Date(),prefix='gift-preview-postage') {
  const printed=new Intl.DateTimeFormat('ru',{day:'2-digit',month:'2-digit',year:'numeric'}).format(date);
  return `<div class="gift-postage" aria-hidden="true"><div class="gift-postage-image">${giftUniqueSVG(svg,prefix)}</div><span>${giftEscape(species.name)}</span><small>FLORA KEEP</small></div><div class="gift-postmark" aria-hidden="true"><span>С заботой</span><time>${giftEscape(printed)}</time><i></i></div>`;
}

function giftOrigamiFlower(){return `<svg viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(80 80)">${Array.from({length:6},(_,i)=>`<g class="origami-petal" style="--fold:${i}" transform="rotate(${i*60})"><path d="M0 4L-31 -29L0 -69L28 -30Z" fill="${i%2?'#c3cfa5':'#e2e6c3'}" stroke="#8eaa7b" stroke-width=".7"/><path d="M0 4V-69L28 -30Z" fill="#fff7dd" opacity=".4"/></g>`).join('')}<path d="M-13-8L0-18L16-7L12 12L-8 15Z" fill="#d9bb72"/></g></svg>`;}

function giftRuntime(model,uniqueSVG) {
  'use strict';
  const config=JSON.parse(document.getElementById('gift-config').textContent),stages=JSON.parse(document.getElementById('gift-stages').textContent);
  const $=id=>document.getElementById(id),key='flora-living-gift-v1-'+config.id;
  let state=model.initial(),failed=false,lastStage=-1,lastPersisted='',wasComplete=false;
  const calm=window.matchMedia('(prefers-reduced-motion: reduce)');
  function flourish(name){if(calm.matches)return;const scene=$('gift-scene');scene.classList.remove(name);void scene.offsetWidth;scene.classList.add(name);}
  function status(text){$('gift-status').textContent=text;}
  function warning(){failed=true;$('gift-storage-warning').hidden=false;}
  try{const stored=localStorage.getItem(key);if(stored){const parsed=JSON.parse(stored);if(model.valid(parsed))state=model.advance(parsed);else warning();}}catch{warning();}
  function persist(){const encoded=JSON.stringify(state);if(encoded===lastPersisted)return;try{localStorage.setItem(key,encoded);lastPersisted=encoded;failed=false;$('gift-storage-warning').hidden=true;}catch{warning();}}
  function render(){
    $('gift-envelope').hidden=state.opened;$('gift-letter').hidden=!state.opened;
    $('gift-recipient').textContent=config.recipient||'Для дорогого человека';
    $('gift-recipient-open').textContent=config.recipient?config.recipient+', этот росток для тебя':'Этот росток — для тебя';
    $('gift-message').textContent=config.message||'Иногда маленький росток говорит больше тысячи слов.';
    $('gift-sender').textContent=config.sender?'С теплом, '+config.sender:'С теплом и заботой';
    $('gift-species').textContent=config.species.name;$('gift-latin').textContent=config.species.latinName;
    const planted=state.plantedAt!==null,complete=state.growth>=1;
    if(complete&&!wasComplete){status('Ваше маленькое чудо выросло. Письмо и растение останутся с вами.');if(lastStage>=0)flourish('gift-blooming');}wasComplete=complete;
    $('gift-plant').hidden=planted;$('gift-water').hidden=!planted||complete;$('gift-progress-wrap').hidden=!planted;$('gift-complete').hidden=!complete;
    const stage=!planted?0:state.growth<.22?0:state.growth<.55?1:state.growth<1?2:3;
    if(stage!==lastStage){$('gift-plant-art').innerHTML=stages[stage];lastStage=stage;}
    $('gift-letter').dataset.growth=String(stage);$('gift-letter').classList.toggle('gift-letter-complete',complete);
    $('gift-poster-card').hidden=!complete;
    $('gift-bloom-letter').hidden=!complete||!config.bloomMessage;
    $('gift-bloom-text').textContent=complete?config.bloomMessage||'':'';
    if(complete&&!$('gift-poster-art').hasChildNodes()){
      $('gift-poster-art').innerHTML=uniqueSVG(stages[3],'gift-poster');
      $('gift-reply-bloom').innerHTML=uniqueSVG(stages[3],'gift-reply-bloom');
    }
    $('gift-poster-title').textContent=config.recipient?config.recipient+', для тебя':'Для дорогого человека';
    $('gift-poster-message').textContent=config.message||'Иногда маленький росток говорит больше тысячи слов.';
    $('gift-poster-sender').textContent=config.sender?'С теплом, '+config.sender:'С теплом и заботой';
    $('gift-scene').dataset.stage=String(stage);$('gift-scene').classList.toggle('gift-completed',complete);
    $('gift-stage-label').textContent=!planted?'Одно семечко — начало маленькой истории':complete?'Ваше маленькое чудо выросло':state.growth<.22?'Первый росток':state.growth<.55?'Появляются листья':state.growth<.85?'Растение набирается сил':'Совсем скоро взрослое растение';
    const percent=Math.round(state.growth*100);$('gift-progress').value=percent;$('gift-progress').setAttribute('aria-valuetext',percent+'% роста');$('gift-percent').textContent=percent+'%';
    const wait=state.lastWaterAt===null?0:Math.max(0,Math.ceil((model.cooldown-(Date.now()-state.lastWaterAt))/1000));
    $('gift-water').disabled=wait>0;$('gift-water').textContent=wait?'Вода впитывается · '+wait+' сек':'Полить росток';
    $('gift-care-hint').textContent=!planted?'Сначала посадите семечко. Всё необходимое уже внутри этого файла.':complete?'Больше ничего делать не нужно. Письмо и растение останутся здесь.':!state.waterings?'Первый полив запустит рост. Воды хватит на всё.':'После первого полива растение вырастет не дольше чем за 5 минут. Полив раз в 15 секунд ускоряет рост; пропускать его можно.';
  }
  const showInk=()=>{$('gift-letter').classList.add('gift-ink-complete');$('gift-show-text').hidden=true;};
  $('gift-show-text').addEventListener('click',showInk);
  const ribbon=$('gift-ribbon');let pull=null;
  ribbon.addEventListener('pointerdown',event=>{if(event.button!==0)return;pull={x:event.clientX,y:event.clientY,id:event.pointerId};ribbon.setPointerCapture(event.pointerId);});
  ribbon.addEventListener('pointermove',event=>{if(!pull||event.pointerId!==pull.id)return;const distance=Math.min(110,Math.hypot(event.clientX-pull.x,event.clientY-pull.y));ribbon.style.setProperty('--ribbon-pull',distance+'px');});
  ribbon.addEventListener('pointerup',event=>{if(!pull)return;const distance=Math.hypot(event.clientX-pull.x,event.clientY-pull.y);pull=null;ribbon.style.removeProperty('--ribbon-pull');if(distance>45)$('gift-open').click();});
  ribbon.addEventListener('pointercancel',()=>{pull=null;ribbon.style.removeProperty('--ribbon-pull');});
  ribbon.addEventListener('click',()=>{if(!state.opened)$('gift-open').click();});
  function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  for(const type of ['open','plant','water'])$('gift-'+type).addEventListener('click',()=>{
    const firstWater=type==='water'&&state.waterings===0,result=model.action(state,type);state=result.state;persist();render();status(result.message);
    if(result.success&&type==='open'){$('gift-letter').classList.add('gift-reveal');if(calm.matches)showInk();}
    if(result.success&&type==='plant')flourish('gift-sprouting');
    if(result.success&&type==='water')flourish(firstWater?'gift-first-water':'gift-watered');
  });
  async function savePoster(reply=false){
    const button=$(reply?'gift-reply-save':'gift-poster');
    if(state.growth<1)return;
    const replyText=$('gift-reply-text').value.trim();
    if(reply&&!replyText){status('Напишите несколько слов для ответной открытки.');$('gift-reply-text').focus();return;}
    button.disabled=true;
    try{
      const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(!ctx)throw new Error('Этот браузер не поддерживает сохранение картинки.');
      const lines=(text,font,width)=>{ctx.font=font;const output=[];for(const paragraph of text.replace(/\n{3,}/g,'\n\n').split('\n')){let line='';for(const word of paragraph.split(/\s+/)){const joined=line?line+' '+word:word;if(ctx.measureText(joined).width<=width){line=joined;continue;}if(line){output.push(line);line='';}for(const char of Array.from(word)){if(line&&ctx.measureText(line+char).width>width){output.push(line);line=char;}else line+=char;}}output.push(line);}return output;};
      const title=lines(reply?(config.sender?'Для '+config.sender:'Спасибо за росток'):(config.recipient?config.recipient+', для тебя':'Для дорогого человека'),'italic 58px Georgia',920);
      const message=lines(reply?replyText:config.message||'Иногда маленький росток говорит больше тысячи слов.','30px Georgia',850);
      const author=reply?config.recipient:config.sender;
      const sender=lines(author?'С теплом, '+author:'С теплом и заботой','italic 28px Georgia',850);
      const titleY=172,artY=titleY+title.length*68+22,messageY=artY+640;
      canvas.width=1200;canvas.height=Math.max(1500,messageY+message.length*48+sender.length*42+240);
      const palettes={moss:['#f8f7ed','#31533c','#769168','#d8dec6'],petal:['#fff4ed','#764e5a','#a87a85','#ecd8d0'],night:['#1e372e','#edf0d9','#a6bd8f','#52694c']},[paper,ink,green,line]=palettes[config.theme]||palettes.moss;
      ctx.fillStyle=paper;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle=line;ctx.lineWidth=2;ctx.strokeRect(42,42,1116,canvas.height-84);ctx.strokeRect(54,54,1092,canvas.height-108);
      const leafPath=new Path2D(document.querySelector('.gift-frame-leaf path').getAttribute('d'));
      for(const flip of [false,true]){ctx.save();if(flip){ctx.translate(1200,0);ctx.scale(-1,1);}ctx.strokeStyle=green;ctx.fillStyle=green;ctx.lineWidth=2;ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(90,canvas.height-150);ctx.bezierCurveTo(160,canvas.height*.65,50,canvas.height*.35,100,120);ctx.stroke();for(let i=0;i<16;i++){const y=180+i*(canvas.height-380)/15;ctx.save();ctx.translate(100+Math.sin(i*.9)*10,y);ctx.rotate(i%2?-.55:.6);ctx.scale(.65,.65);ctx.fill(leafPath);ctx.restore();}ctx.restore();}
      const textLines=(list,font,y,step,color=ink)=>{ctx.font=font;ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='top';for(const [i,text] of list.entries())ctx.fillText(text,600,y+i*step);};
      textLines([reply?'FLORA KEEP  ·  ОТВЕТНАЯ ОТКРЫТКА':'FLORA KEEP  ·  ЖИВОЙ ПОДАРОК'],'20px sans-serif',98,28,green);textLines(title,'italic 58px Georgia',titleY,68);
      const loadImage=svg=>new Promise((resolve,reject)=>{
        const image=new Image();
        image.onload=()=>resolve(image);
        image.onerror=()=>reject(new Error('Не удалось подготовить иллюстрацию.'));
        image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
      });
      const plantImage=await loadImage(stages[3]);
      if(reply){
        const seed=await loadImage($('gift-reply-seed').outerHTML);
        const panels=[[seed,192,'Подаренное семечко'],[plantImage,630,'Взрослое растение']];
        for(const [illustration,x,label] of panels){
          ctx.strokeStyle=line;ctx.lineWidth=2;ctx.strokeRect(x,artY+25,378,460);
          ctx.drawImage(illustration,x+9,artY+30,360,405);
          ctx.font='21px Georgia';ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='top';
          ctx.fillText(label,x+189,artY+450);
        }
        ctx.strokeStyle=green;ctx.beginPath();ctx.moveTo(600,artY+135);ctx.lineTo(600,artY+402);ctx.stroke();
      }else ctx.drawImage(plantImage,340,artY,520,585);
      textLines([config.species.name],'32px Georgia',artY+570,40);textLines([config.species.latinName],'italic 20px Georgia',artY+610,30,green);
      textLines(message,'30px Georgia',messageY+34,48);textLines(sender,'italic 28px Georgia',messageY+message.length*48+76,42,green);
      ctx.strokeStyle=line;ctx.beginPath();ctx.moveTo(450,canvas.height-142);ctx.lineTo(750,canvas.height-142);ctx.stroke();textLines(['Маленькое чудо, выращенное с заботой'],'20px Georgia',canvas.height-115,28,green);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('Браузер не смог сохранить картинку.');download(blob,reply?'flora-gift-reply.png':'flora-gift-poster.png','image/png');status(reply?'Ответная открытка сохранена в PNG.':'Открытка сохранена в PNG. Её можно распечатать или отправить близкому человеку.');
    }catch(error){status(error.message||'Не удалось сохранить открытку. Попробуйте ещё раз.');}finally{button.disabled=false;}
  }
  $('gift-poster').addEventListener('click',()=>savePoster());
  $('gift-reply-save').addEventListener('click',()=>savePoster(true));
  $('gift-save').addEventListener('click',()=>{state=model.advance(state);persist();download(JSON.stringify({format:'FloraKeepGiftProgress',version:1,giftId:config.id,progress:state},null,2),'flora-gift-progress.json','application/json');status('Прогресс скачан. Храните его вместе с HTML-подарком.');});
  $('gift-import').addEventListener('change',async event=>{const file=event.target.files[0];if(!file)return;try{
    if(file.size>20000)throw new Error('Слишком большой файл прогресса.');
    const data=JSON.parse(await file.text());if(data.format!=='FloraKeepGiftProgress'||data.version!==1||data.giftId!==config.id||!model.valid(data.progress))throw new Error('Это не исправная копия прогресса данного подарка.');
    state=model.advance(data.progress);persist();render();status('Росток восстановлен из файла.');
  }catch(error){status(error instanceof SyntaxError?'Не удалось прочитать JSON. Текущий росток сохранён.':error.message);}finally{event.target.value='';}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){state=model.advance(state);persist();render();}});
  window.addEventListener('pagehide',()=>{state=model.advance(state);persist();});
  setInterval(()=>{if(document.hidden||state.plantedAt===null)return;const before=state.growth;state=model.advance(state);render();if(Math.floor(before*100)!==Math.floor(state.growth*100))persist();},1000);
  render();if(state.opened)persist();
}

const giftStandaloneCSS = `
.gift-bloom-letter,.gift-reply{margin:18px 0 0;padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--card)}.gift-bloom-letter h2{font:22px Georgia;margin:0 0 8px}.gift-bloom-letter p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.gift-reply textarea{font:inherit;width:100%;box-sizing:border-box;padding:10px;color:var(--ink);background:var(--page);border:1px solid var(--line);border-radius:8px}.gift-reply button{margin-top:10px}
:root{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--page:#eef1e7;--card:#fcfdf7;--ink:#294b38;--muted:#5f755e;--line:#d5dfcb;--accent:#355f45;--button:#fffdf4;--glow:#e7eccf;color:var(--ink);background:var(--page);color-scheme:light}
*{box-sizing:border-box}body{display:flow-root;margin:0;min-width:280px;min-height:100vh;color:var(--ink);background:radial-gradient(ellipse at 15% 10%,var(--glow),transparent 55%),var(--page)}body[data-theme=petal]{--page:#f3eae7;--card:#fffaf5;--ink:#67474d;--muted:#86676b;--line:#e4d3d0;--accent:#9e5f70;--glow:#f5dedb}body[data-theme=night]{--page:#152e28;--card:#203c32;--ink:#ecf0db;--muted:#b5c5a4;--line:#50654b;--accent:#c2d1a0;--button:#21352a;--glow:#304b3b;color-scheme:dark}
[hidden]{display:none!important}button,input{font:inherit}button,.file-label{min-height:48px;padding:14px 23px;border:1px solid var(--line);border-radius:14px;background:var(--card);color:var(--ink);cursor:pointer;line-height:1.4;white-space:normal;overflow-wrap:anywhere}button:focus-visible,.file-label:focus-within{outline:3px solid var(--accent);outline-offset:4px}button:disabled{opacity:.65;cursor:default}.primary{background:var(--accent);color:var(--button);border-color:var(--accent);font-weight:650}main{width:min(100% - 32px,880px);margin:30px auto 28px}.brand{text-align:center;text-transform:uppercase;letter-spacing:.22em;font-size:12px;margin:0 0 28px;color:var(--muted)}.envelope{position:relative;max-width:600px;margin:8vh auto 0;padding:65px 28px 38px;text-align:center;border:1px solid var(--line);background:var(--card);border-radius:24px;box-shadow:0 25px 65px #243e3012;overflow:hidden}.envelope:before{content:"";position:absolute;inset:0 0 auto;height:170px;background:linear-gradient(145deg,var(--glow),var(--page));clip-path:polygon(0 0,100% 0,50% 100%);opacity:.75}.seal{position:relative;margin:auto auto 26px;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:var(--accent);color:var(--button);font:38px Georgia;box-shadow:0 5px 20px #263b301a}.eyebrow{font-size:12px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);line-height:1.6}.envelope h1{position:relative;font:clamp(30px,7vw,48px)/1.16 Georgia,serif;margin:15px 0}.envelope p{line-height:1.7;position:relative;overflow-wrap:anywhere}.envelope button{margin-top:18px;width:min(100%,320px)}.letter{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);background:var(--card);border:1px solid var(--line);border-radius:26px;overflow:hidden;box-shadow:0 25px 70px #243e3012}.letter-copy{padding:36px 30px;display:flex;flex-direction:column;justify-content:center}.letter-copy h1{font:clamp(29px,5vw,42px)/1.18 Georgia,serif;overflow-wrap:anywhere;margin:14px 0 24px}.message{font:20px/1.75 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.sender{color:var(--muted);margin:24px 0 0;line-height:1.7;overflow-wrap:anywhere}.plant-side{padding:28px 24px;background:linear-gradient(160deg,var(--glow),transparent)}.scene{position:relative;text-align:center;overflow:hidden;border:1px solid var(--line);border-radius:180px 180px 20px 20px;background:var(--page);padding:15px 8px 20px}.scene:before{content:"";position:absolute;inset:20px 20px 50px;border:1px solid var(--line);border-radius:150px 150px 0 0;pointer-events:none}.art{position:relative;height:280px}.art>svg{width:100%;height:100%;display:block}.scene small{display:block;position:relative;padding:0 13px;line-height:1.5;color:var(--muted)}.species{text-align:center;font:26px/1.25 Georgia,serif;margin:18px 0 4px;overflow-wrap:anywhere}.latin{text-align:center;font:italic 14px/1.5 Georgia,serif;color:var(--muted);margin:0 0 21px;overflow-wrap:anywhere}.care-button{width:100%;margin:5px 0 0}.progress-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;margin:19px 0;color:var(--muted);font-size:14px}progress{width:100%;height:7px;appearance:none;border:0;border-radius:10px;overflow:hidden;background:var(--line);accent-color:var(--accent)}progress::-webkit-progress-bar{background:var(--line)}progress::-webkit-progress-value{background:var(--accent)}progress::-moz-progress-bar{background:var(--accent)}.hint{font-size:13px;line-height:1.7;color:var(--muted);margin:16px 0 0}.complete{padding:15px;border:1px solid var(--line);border-radius:12px;text-align:center;font:21px/1.4 Georgia,serif;color:var(--ink)}.storage-warning{background:#fff0cd;color:#614b1d;border:1px solid #d9c897;border-radius:14px;padding:17px;line-height:1.6;margin:18px 0}.status{min-height:26px;text-align:center;line-height:1.6;margin:20px auto;max-width:650px;color:var(--ink)}details{max-width:680px;margin:20px auto;padding:18px 20px;border:1px solid var(--line);border-radius:15px;font-size:14px;line-height:1.7}summary{cursor:pointer;min-height:30px;font-weight:600}.backup-controls{display:flex;flex-wrap:wrap;gap:12px;margin:18px 0}.file-label{display:inline-flex;align-items:center;position:relative}.file-label input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer}.footer{text-align:center;color:var(--muted);font-size:12px;line-height:1.8;margin:28px auto;max-width:600px;padding:0 15px}.gift-completed{box-shadow:inset 0 0 55px var(--glow)}
@media(max-width:650px){main{width:calc(100% - 24px);margin-top:22px}.letter{grid-template-columns:1fr}.letter-copy{padding:27px 23px}.letter-copy h1{font-size:32px}.message{font-size:19px}.plant-side{padding:22px}.scene{max-width:360px;margin:auto}.art{height:255px}.envelope{margin-top:5vh;padding:55px 20px 30px}.envelope h1{font-size:32px}.backup-controls>*{width:100%;justify-content:center}.brand{font-size:11px}.footer{font-size:12px}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
/* Botanical correspondence, entirely inside the gift file. */
body{background-image:radial-gradient(ellipse at 15% 10%,var(--glow),transparent 55%),repeating-linear-gradient(0deg,transparent 0 3px,#88795404 3px 4px)}
button{transition:transform .18s,box-shadow .18s}button:not(:disabled):active{transform:translateY(2px)}button:not(:disabled):hover{box-shadow:0 5px 16px #203b3014}
.envelope{padding-top:82px;border-radius:8px 8px 20px 20px;box-shadow:0 3px 0 var(--line),0 9px 0 -3px var(--card),0 30px 65px #243e3024;isolation:isolate;perspective:900px}
.envelope:before{height:220px;z-index:-1;filter:drop-shadow(0 3px 2px #213d3220);transform-origin:top;transition:transform .4s}.envelope:active:before{transform:rotateX(25deg)}
.envelope:after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(32deg,transparent 49.6%,var(--line) 50%,transparent 50.4%) left bottom/50% 44% no-repeat,linear-gradient(-32deg,transparent 49.6%,var(--line) 50%,transparent 50.4%) right bottom/50% 44% no-repeat;pointer-events:none}
.gift-wax{width:82px;height:82px;border-radius:48% 52% 47% 53%/53% 45% 55% 47%;background:radial-gradient(circle at 32% 25%,#ce8c70,#a75648 67%,#853e36);color:#ffe2bc;box-shadow:inset 0 2px 3px #fff0ca66,inset 0 -4px 6px #703b4566,0 4px 7px #663b3838;display:grid;place-items:center;border:4px double #f1bc9659;transform:rotate(-9deg)}
.gift-wax svg{position:absolute;inset:12px 21px;width:32px;height:35px;opacity:.7}.gift-wax span{position:relative;font:italic 27px/1 Georgia,serif;align-self:end;margin-bottom:12px;text-shadow:0 1px 1px #763c35}
.gift-postage{position:absolute;right:20px;top:20px;width:65px;min-height:88px;padding:5px 5px 6px;border:3px dotted var(--line);background:var(--card);text-align:center;transform:rotate(8deg);color:var(--ink);box-shadow:1px 3px 6px #213d3214;overflow:hidden}.gift-postage-image{height:51px}.gift-postage-image>svg{width:100%;height:100%;display:block}.gift-postage span{display:block;font:9px/1.25 Georgia,serif;overflow-wrap:anywhere}.gift-postage small{display:block;font:6px/1.6 system-ui;letter-spacing:.12em;margin-top:3px}
.gift-postmark{position:absolute;top:37px;right:68px;border:1px solid var(--muted);width:68px;height:68px;display:flex;flex-direction:column;justify-content:center;border-radius:50%;font:9px/1.7 Georgia,serif;color:var(--muted);transform:rotate(-14deg);opacity:.65;text-align:center;pointer-events:none}.gift-postmark i{position:absolute;left:58px;top:20px;width:45px;height:20px;border-top:1px solid;border-bottom:1px solid;transform:skewY(-7deg)}.gift-postmark span{text-transform:uppercase;letter-spacing:.08em;font-size:8px}.gift-postmark time{font-size:8px}
.envelope h1,.letter-copy h1,.gift-poster-paper h2{font-family:"Segoe Print","Bradley Hand","Apple Chancery",cursive;line-height:1.3;overflow-wrap:anywhere}
.letter{position:relative;isolation:isolate;perspective:1000px}.letter-copy{position:relative;padding:36px 46px 46px;min-width:0}.letter-copy>*{position:relative;z-index:1}.letter-copy h1{font-size:clamp(27px,3.5vw,38px)}.gift-letter-postage{height:100px;margin-bottom:6px}.gift-letter-postage .gift-postage{right:-20px;top:0}.gift-letter-postage .gift-postmark{right:28px;top:15px}.letter-copy .gift-botanical-frame{position:absolute;z-index:0}
.gift-botanical-frame{position:absolute;inset:0;width:100%;height:100%;color:var(--accent);opacity:.48;pointer-events:none}.gift-frame-leaf{transition:opacity 1.4s}.letter[data-growth="0"] [data-growth-level="1"],.letter[data-growth="0"] [data-growth-level="2"],.letter[data-growth="0"] [data-growth-level="3"],.letter[data-growth="1"] [data-growth-level="2"],.letter[data-growth="1"] [data-growth-level="3"],.letter[data-growth="2"] [data-growth-level="3"]{opacity:.04}
.gift-opening-fold{position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(125deg,var(--card),var(--glow));visibility:hidden;transform-origin:0 50%;border-radius:inherit}.gift-reveal .gift-opening-fold{animation:gift-letter-unfold .85s ease-in-out both}.gift-reveal .art{animation:gift-paper-sprout 1s .25s both}.gift-sprouting .art{animation:gift-paper-sprout .7s both}
.gift-water-drop{position:absolute;left:calc(50% - 8px);top:15%;width:18px;height:25px;background:#8fc4cf;border:1px solid #d1f0ec;border-radius:58% 42% 60% 40%;transform:rotate(45deg);opacity:0;z-index:3;pointer-events:none}.gift-first-water .gift-water-drop,.gift-watered .gift-water-drop{animation:gift-first-drop .9s ease-in both}.gift-sparkles,.gift-petals{position:absolute;inset:0;z-index:4;pointer-events:none;overflow:hidden}.gift-sparkles i{position:absolute;left:50%;top:55%;width:5px;height:5px;border-radius:50%;background:#e3d28e;opacity:0}.gift-first-water .gift-sparkles i{animation:gift-spark 1.3s .7s ease-out both}.gift-petals i{position:absolute;left:calc(12% + var(--petal)*9%);top:12%;width:8px;height:14px;background:#dba79d;border-radius:80% 20% 70% 30%;opacity:0}.gift-petals i:nth-child(3n){background:#e5d29b}.gift-blooming .gift-petals i{animation:gift-petal-fall 2.5s calc(var(--petal)*.08s) ease-out both}.gift-letter-complete{box-shadow:0 25px 70px #243e3012,0 0 65px var(--glow)}
.gift-poster-card{margin:38px auto 0;max-width:620px;text-align:center;padding:20px 18px 24px;border:1px solid var(--line);border-radius:20px;background:var(--card)}.gift-poster-paper{position:relative;isolation:isolate;padding:35px 38px 32px;background:var(--page);border:1px solid var(--line);box-shadow:0 9px 22px #243e3012;margin-bottom:20px;overflow:hidden}.gift-poster-paper>*:not(.gift-botanical-frame){position:relative}.gift-poster-paper h2{font-size:clamp(26px,5vw,36px);font-weight:400;margin:0 0 5px}.gift-poster-art{height:290px;max-width:300px;margin:auto}.gift-poster-art>svg{width:100%;height:100%;display:block}.gift-poster-species{font:24px/1.3 Georgia,serif;margin:4px 0 24px}.gift-poster-species small{display:block;font:italic 12px/1.7 Georgia,serif;color:var(--muted);margin-top:5px}.gift-poster-paper blockquote{margin:0;font:18px/1.75 Georgia,serif;white-space:pre-wrap;overflow-wrap:anywhere}.gift-poster-paper #gift-poster-sender{font:italic 15px/1.7 Georgia,serif;color:var(--muted);margin-top:24px;overflow-wrap:anywhere}.gift-poster-card>.primary{max-width:100%}.gift-poster-card>.hint{max-width:380px;margin:15px auto 0}
@keyframes gift-letter-unfold{0%{visibility:visible;transform:rotateY(0);opacity:1}75%{opacity:.8}100%{visibility:hidden;transform:rotateY(-105deg);opacity:0}}@keyframes gift-paper-sprout{from{opacity:0;transform:translateY(40px) scale(.8)}to{opacity:1;transform:none}}@keyframes gift-first-drop{0%{opacity:0;transform:translateY(-35px) rotate(45deg) scale(.6)}25%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translateY(140px) rotate(45deg) scale(.6)}}@keyframes gift-spark{0%{opacity:0;transform:rotate(calc(var(--petal)*40deg)) translateY(0)}25%{opacity:1}100%{opacity:0;transform:rotate(calc(var(--petal)*40deg)) translateY(-80px)}}@keyframes gift-petal-fall{0%{opacity:0;transform:translateY(0) rotate(0)}18%{opacity:.8}100%{opacity:0;transform:translateY(200px) rotate(calc(var(--petal)*32deg + 90deg))}}
@media(max-width:650px){.letter-copy{padding:28px 34px 36px}.gift-letter-postage{height:86px}.gift-postage{right:13px;top:15px;width:58px;min-height:80px}.gift-postmark{right:56px;top:29px;width:58px;height:58px}.gift-postmark i{left:50px;width:34px}.envelope{padding-top:102px}.gift-poster-paper{padding:30px 27px}.gift-poster-card{padding:17px 12px}.gift-poster-art{height:240px}.gift-poster-paper blockquote{font-size:17px}}@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation:none!important;transition:none!important;scroll-behavior:auto!important}.gift-opening-fold{display:none!important}}
`;

const giftWrappingCSS = `/* Personal packaging, origami and paper-stage edition. */
.gift-wax .gift-seal-sign{position:absolute;inset:7% 7% 17%;opacity:.48;color:var(--paper,#fff3d7);pointer-events:none}.gift-wax .gift-seal-sign>svg{display:block;width:100%;height:100%;position:static;inset:auto;transform:none}.gift-wax span{position:relative;z-index:1;text-shadow:0 1px 2px #543126}.gift-reply-diptych{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem;margin:0 0 .75rem}.gift-reply-diptych figure{margin:0;min-width:0;border:1px solid var(--line);border-radius:.5rem;background:var(--page);overflow:hidden}.gift-reply-diptych svg{width:100%;height:auto;display:block;aspect-ratio:8/9}.gift-reply-diptych figcaption{font-size:.82rem;padding:.55rem;color:var(--ink);text-align:center;overflow-wrap:anywhere}
body{--ribbon:#7e9b77}body[data-ribbon=rose]{--ribbon:#b97882}body[data-ribbon=gold]{--ribbon:#c49b52}
body:not([data-theme=night])[data-paper=kraft]{--card:#eadabe;--page:#f2e8d5;--line:#cabb9d}body:not([data-theme=night])[data-paper=lined]{--card:#fffdf1}
[data-paper=lined] .letter-copy,[data-paper=lined] .envelope{background-image:repeating-linear-gradient(0deg,transparent 0 29px,#8b9e8124 29px 30px)}
[data-pattern=dots] .envelope,[data-pattern=dots] .letter-copy{background-image:radial-gradient(#8e9a7622 1.5px,transparent 1.5px);background-size:15px 15px}
[data-pattern=stars] .envelope:after,[data-pattern=stars] .letter-copy:after{content:'✦ · ✧ · ✦';position:absolute;bottom:16px;left:0;right:0;text-align:center;letter-spacing:1em;opacity:.35;color:var(--accent);pointer-events:none}
[data-pattern=dots] .gift-botanical-frame,[data-pattern=stars] .gift-botanical-frame{opacity:.15}
.gift-origami{position:absolute!important;left:12px;bottom:63px;width:125px;height:125px;opacity:.65;pointer-events:none;transform:rotate(-12deg)}.gift-origami>svg{display:block;width:100%;height:100%}[data-layout=letter] .gift-origami,[data-layout=popup] .gift-origami{display:none}
.gift-ribbon{position:relative!important;display:block;margin:15px auto 8px!important;height:94px;min-height:94px;width:min(100%,290px)!important;padding:0!important;background:none!important;border:0!important;color:var(--ink);touch-action:none;box-shadow:none!important}
.ribbon-loop{position:absolute;top:8px;left:calc(50% - 51px);width:55px;height:35px;border:10px solid var(--ribbon);border-radius:80% 80% 12% 75%;transform:rotate(19deg);box-shadow:inset 0 0 3px #fff6,0 3px 5px #263b3020}.ribbon-right{left:calc(50% - 4px);transform:rotate(-19deg) scaleX(-1)}.ribbon-tail{position:absolute;top:28px;left:calc(50% - 10px);height:40px;width:20px;background:linear-gradient(90deg,#fff2,transparent),var(--ribbon);clip-path:polygon(0 0,100% 0,100% 100%,50% 86%,0 100%);transform:translate(var(--ribbon-pull,0px),calc(var(--ribbon-pull,0px)*.2)) rotate(-12deg);transition:transform .1s}.ribbon-caption{position:absolute;bottom:0;left:0;right:0;font-size:12px;color:var(--muted);line-height:1.4;overflow-wrap:anywhere}
.gift-show-text{display:block;min-height:40px!important;padding:7px 12px!important;margin:12px 0 18px!important;font-size:12px!important;background:transparent!important;box-shadow:none!important;border-style:dashed!important;color:var(--muted)}
.gift-reveal .gift-ink{animation:gift-ink-reveal 2.7s .25s both}.gift-ink-complete .gift-ink{animation:none!important;clip-path:none!important}
.scene>small{position:relative;z-index:3}.gift-popup-layer{position:absolute;left:8%;right:8%;bottom:12%;height:22%;border:1px solid var(--line);border-radius:50% 50% 0 0;background:var(--glow);box-shadow:0 8px 8px #233b3020;opacity:.8;transform-origin:50% 100%;pointer-events:none}.popup-back{bottom:15%;height:30%;transform:rotateX(32deg)}.popup-front{background:var(--card);clip-path:polygon(0 37%,15% 14%,38% 39%,63% 0,83% 27%,100% 12%,100% 100%,0 100%);bottom:5%;z-index:1;opacity:.65}.art{position:relative;z-index:2}[data-layout=letter] .gift-popup-layer{display:none}
[data-layout=popup] .gift-reveal .popup-back{animation:gift-pop-back .9s .12s both}[data-layout=popup] .gift-reveal .popup-front{animation:gift-pop-back .9s .25s both}[data-layout=popup] .gift-reveal .art{animation:gift-pop-plant 1.1s .18s both}
[data-layout=origami] .gift-opening-fold{background:linear-gradient(145deg,var(--glow) 0 49.5%,var(--card) 50%);clip-path:polygon(0 0,100% 0,100% 100%,0 100%)}[data-layout=origami] .gift-opening-fold:before,[data-layout=origami] .gift-opening-fold:after{content:'';position:absolute;inset:0;background:linear-gradient(35deg,var(--page),var(--glow));clip-path:polygon(0 0,50% 50%,0 100%);border:1px solid var(--line)}[data-layout=origami] .gift-opening-fold:after{transform:scaleX(-1)}
@keyframes gift-ink-reveal{from{clip-path:inset(0 100% 0 0);opacity:.3}to{clip-path:inset(0 0 0 0);opacity:1}}@keyframes gift-pop-back{from{transform:rotateX(88deg);opacity:0}to{transform:rotateX(0);opacity:.8}}@keyframes gift-pop-plant{from{transform:perspective(600px) rotateX(76deg) translateY(30px);opacity:0}to{transform:none;opacity:1}}
@media(max-width:400px){.gift-origami{width:90px;height:90px;left:-15px;bottom:95px;opacity:.35}.ribbon-caption{font-size:11px}.gift-ribbon{height:96px}.gift-show-text{width:100%;font-size:12px}}
@media(prefers-reduced-motion:reduce){.gift-ink{clip-path:none!important}.ribbon-tail{transition:none!important}.gift-popup-layer{animation:none!important}}
.gift-origami-reveal{display:none;position:absolute;z-index:8;top:40%;left:50%;width:180px;height:180px;pointer-events:none;opacity:0}.gift-origami-reveal>svg{width:100%;height:100%;display:block}[data-layout=origami] .gift-reveal .gift-origami-reveal{display:block;animation:gift-origami-open 1.25s ease-in-out both}[data-layout=origami] .gift-reveal .gift-origami-reveal .origami-petal path{transform-origin:center bottom;animation:gift-petal-unfold 1.1s calc(var(--fold)*.035s) both}@keyframes gift-origami-open{0%{opacity:1;transform:translate(-50%,-50%) scale(.65) rotate(-20deg)}55%{opacity:1;transform:translate(-50%,-50%) scale(1.8) rotate(0)}100%{opacity:0;transform:translate(-50%,-50%) scale(5) rotate(20deg)}}@keyframes gift-petal-unfold{0%{transform:scaleX(.18)}60%,100%{transform:scaleX(1)}}@media(prefers-reduced-motion:reduce){.gift-origami-reveal{display:none!important}}

`;

function buildGiftHTML(config={}, {art,catalog}={}) {
  if(!art||typeof art.plantArt!=='function'||!Array.isArray(catalog)||!catalog.length)throw new Error('Для подарка нужны иллюстрации и каталог растений.');
  const draft=normalizeGiftDraft(config,catalog),species=catalog.find(s=>s.id===draft.speciesId);
  if(!species)throw new Error('Выберите растение из каталога.');
  const candidate=config.giftId;
  const id=typeof candidate==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(candidate)&&!['constructor','prototype','__proto__'].includes(candidate)?candidate:(globalThis.crypto?.randomUUID?.()||'gift-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14));
  const data={format:'FloraKeepLivingGift',version:1,id,...draft,species:{id:species.id,name:species.name,latinName:species.latinName}};
  const stages=[.04,.35,.72,1].map((growth,i)=>art.plantArt(species.id,{id:'gift-'+id+'-'+i,variant:id,growth,pot:draft.theme==='petal'?'pink':draft.theme==='night'?'sage':'cream',light:draft.theme==='night'?'night':'day'}));
  for(const svg of stages)if(typeof svg!=='string'||!/^<svg\b/.test(svg)||/<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|file:|javascript:)/i.test(svg))throw new Error('В иллюстрации подарка недопустимое содержимое.');
  const stationery=giftBotanicalFrame(species.id),stampDate=new Date(),stamp=giftPostage(species,stages[3],stampDate,'gift-envelope-stamp'),letterStamp=giftPostage(species,stages[3],stampDate,'gift-letter-stamp');
  const petals=Array.from({length:9},(_,i)=>`<i style="--petal:${i}" aria-hidden="true"></i>`).join('');
  const title=draft.recipient?'Росток для '+draft.recipient:'Маленький живой подарок';
  return `<!doctype html>\n<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="${draft.theme==='night'?'dark':'light'}"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>${giftEscape(title)}</title><style>${giftStandaloneCSS}${giftWrappingCSS}</style></head>
<body data-theme="${draft.theme}" data-paper="${draft.paper}" data-ribbon="${draft.ribbon}" data-pattern="${draft.pattern}" data-layout="${draft.layout}"><main><p class="brand">Flora Keep · письмо с ростком</p>
<section id="gift-envelope" class="envelope" aria-labelledby="gift-recipient">${stamp}<div class="gift-origami" aria-hidden="true">${giftOrigamiFlower()}</div>${giftSeal(draft.recipient,species.id,art)}<p class="eyebrow">Внутри — немного тепла</p><h1 id="gift-recipient"></h1><p>Этот подарок не спешит.<br>Откройте письмо и вырастите маленькое чудо.</p><button id="gift-ribbon" class="gift-ribbon" type="button" aria-label="Потянуть ленту и открыть подарок"><span class="ribbon-loop ribbon-left" aria-hidden="true"></span><span class="ribbon-loop ribbon-right" aria-hidden="true"></span><span class="ribbon-tail" aria-hidden="true"></span><span class="ribbon-caption">Потяните ленточку или нажмите</span></button><button id="gift-open" class="primary">Открыть подарок</button></section>
<section id="gift-letter" class="letter" data-growth="0" hidden><div class="gift-opening-fold" aria-hidden="true"></div><div class="gift-origami-reveal" aria-hidden="true">${giftOrigamiFlower()}</div><div class="letter-copy">${stationery}<div class="gift-letter-postage">${letterStamp}</div><p class="eyebrow">Однажды из маленького семечка…</p><h1 id="gift-recipient-open"></h1><p id="gift-message" class="message gift-ink"></p><button id="gift-show-text" class="gift-show-text" type="button">Показать письмо целиком</button><p id="gift-sender" class="sender"></p><section id="gift-bloom-letter" class="gift-bloom-letter" hidden><h2>Письмо после цветения</h2><p id="gift-bloom-text"></p></section></div><div class="plant-side"><div id="gift-scene" class="scene"><div class="gift-popup-layer popup-back" aria-hidden="true"></div><div class="gift-popup-layer popup-front" aria-hidden="true"></div><div class="gift-water-drop" aria-hidden="true"></div><div class="gift-sparkles" aria-hidden="true">${petals}</div><div class="gift-petals" aria-hidden="true">${petals}</div><div id="gift-plant-art" class="art" aria-hidden="true"></div><small id="gift-stage-label"></small></div><h2 id="gift-species" class="species"></h2><p id="gift-latin" class="latin"></p><div id="gift-progress-wrap" class="progress-wrap" hidden><progress id="gift-progress" max="100" value="0" aria-label="Рост подаренного растения"></progress><span id="gift-percent"></span></div><button id="gift-plant" class="primary care-button">Посадить семечко</button><button id="gift-water" class="primary care-button" hidden>Полить росток</button><p id="gift-complete" class="complete" hidden>Маленькое чудо выросло. Оно останется с вами ♡</p><p id="gift-care-hint" class="hint"></p></div></section>
<section id="gift-poster-card" class="gift-poster-card" hidden aria-labelledby="gift-poster-title"><p class="eyebrow">Ваше маленькое чудо · на память</p><div class="gift-poster-paper">${stationery}<h2 id="gift-poster-title"></h2><div id="gift-poster-art" class="gift-poster-art" aria-hidden="true"></div><p class="gift-poster-species">${giftEscape(species.name)}<small>${giftEscape(species.latinName)}</small></p><blockquote id="gift-poster-message"></blockquote><p id="gift-poster-sender"></p></div><button id="gift-poster" class="primary">Сохранить открытку · PNG</button><p class="hint">Растение, письмо и имя — в одной картинке для печати или отправки.</p><div class="gift-reply"><div class="gift-reply-diptych" role="group" aria-label="Из семечка во взрослое растение"><figure>${giftSeedPortrait()}<figcaption>Подаренное семечко</figcaption></figure><figure><div id="gift-reply-bloom" aria-hidden="true"></div><figcaption>Взрослое растение</figcaption></figure></div><label for="gift-reply-text">Ответное послание</label><textarea id="gift-reply-text" rows="3" maxlength="500" placeholder="Спасибо за росток…"></textarea><button id="gift-reply-save" class="primary">Скачать ответную открытку</button></div></section>
<div id="gift-storage-warning" class="storage-warning" hidden>Браузер не смог сохранить росток. Игра работает в памяти: скачайте прогресс ниже, чтобы не потерять его после закрытия.</div><p id="gift-status" class="status" role="status" aria-live="polite"></p>
<details><summary>Как сохранить и перенести подарок</summary><p>Этот HTML работает без интернета. Росток автоматически сохраняется только в этом браузере. При переносе или переименовании файла хранилище может измениться. Скачайте прогресс и передавайте его вместе с подарком.</p><div class="backup-controls"><button id="gift-save">Скачать прогресс</button><label class="file-label">Восстановить прогресс<input id="gift-import" type="file" accept=".json,application/json" aria-label="Выбрать файл прогресса подарка"></label></div><p>После первого полива рост продолжается до взрослого состояния не дольше 5 минут, в том числе после закрытия. Полив раз в 15 секунд ускоряет его. Ничего не засыхает, воды всегда достаточно. Это игровая открытка, а не инструкция по уходу за настоящим растением.</p></details>
<p class="footer">Создано с заботой в Flora Keep.<br>Проект учениц 8-И класса школы № 1430.<br>В подарке только выбранное растение и письмо. Личный сад отправителя не передаётся.</p></main>
<script type="application/json" id="gift-config">${giftJSON(data)}<\/script><script type="application/json" id="gift-stages">${giftJSON(stages)}<\/script><script>const model=(${giftProgressModel.toString()})();(${giftRuntime.toString()})(model,(${giftUniqueSVG.toString()}));<\/script></body></html>`;
}

function createGiftFeature(api) {
  let disposeCurrent=()=>{}, draft=defaultGiftDraft(), pendingDraft=null, draftRevision=0;
  const pendingSaves=new Set();
  async function flush(){while(pendingSaves.size)await Promise.all([...pendingSaves]);}
  function dispose(){disposeCurrent();disposeCurrent=()=>{};}
  function open(speciesId,workspace){
    dispose();
    const saved=normalizeGiftWorkspace(workspace||pendingDraft||api.extras.giftDraft,api.game.CATALOG);
    let activeDraftId=saved.activeDraftId||newGiftDraftId();
    let library=saved.drafts;
    let previewStage='envelope';
    draft=normalizeGiftDraft(saved,api.game.CATALOG);
    if(api.game.CATALOG.some(s=>s.id===speciesId))draft.speciesId=speciesId;
    const escape=api.esc||giftEscape;
    const options=api.game.CATALOG.map(s=>`<option value="${escape(s.id)}" ${s.id===draft.speciesId?'selected':''}>${escape(s.name)}</option>`).join('');
    const collection=`<div class="gift-drafts">
      <label class="field"><span>Ваши черновики</span><select data-gift="draft-list"><option value="">Выберите письмо</option>
      ${library.map((item,index)=>`<option value="${item.id}" ${item.id===activeDraftId?'selected':''}>${escape(item.recipient||'Без адресата')+' · '+(index+1)}</option>`).join('')}</select></label>
      <button class="button secondary" type="button" data-gift="new-draft">Новое письмо</button>
      ${library.some(item=>item.id===activeDraftId)?'<button class="button secondary" type="button" data-gift="remove-draft">Убрать черновик</button>':''}
    </div>`;
    api.showDialog('Письмо с живым ростком',`<div class="gift-composer"><div class="gift-intro"><span class="gift-kicker">Маленькое чудо для близкого человека</span><p>Напишите несколько тёплых слов и вложите семечко. Получатель откроет подарок в браузере и вырастит его сам.</p></div><div class="gift-compose-grid"><form id="gift-composer-form" class="gift-form">${collection}<label class="field"><span>Кому</span><input name="recipient" maxlength="60" autocomplete="off" placeholder="Имя или ласковое обращение" value="${escape(draft.recipient)}"></label><label class="field"><span>От кого</span><input name="sender" maxlength="60" autocomplete="off" placeholder="Ваше имя или подпись" value="${escape(draft.sender)}"></label><label class="field"><span>Ваше письмо</span><textarea name="message" rows="5" maxlength="500" placeholder="Что вы хотите пожелать?">${escape(draft.message)}</textarea><small class="gift-letter-count" aria-live="off">${draft.message.length} / 500</small></label><label class="field"><span>Послание после цветения</span><textarea name="bloomMessage" maxlength="500" rows="3" placeholder="Эти слова появятся, когда растение вырастет">${escape(draft.bloomMessage)}</textarea></label><div class="gift-form-options"><label class="field"><span>Семечко</span><select name="speciesId">${options}</select></label><label class="field"><span>Цвет письма</span><select name="theme"><option value="moss" ${draft.theme==='moss'?'selected':''}>Тёплый мох</option><option value="petal" ${draft.theme==='petal'?'selected':''}>Розовый лепесток</option><option value="night" ${draft.theme==='night'?'selected':''}>Тихая ночь</option></select></label></div><fieldset class="gift-wrap-options"><legend>Личная упаковка</legend>${[['paper','Бумага',[['cotton','Хлопковая'],['kraft','Крафт'],['lined','В линейку']]],['ribbon','Лента',[['sage','Шалфей'],['rose','Роза'],['gold','Мёд']]],['pattern','Рисунок',[['leaves','Листья'],['dots','Горошек'],['stars','Звёздочки']]],['layout','Раскрытие',[['origami','Цветок оригами'],['popup','Объёмная открытка'],['letter','Ботаническое письмо']]]].map(([key,label,choices])=>`<label class="field"><span>${label}</span><select name="${key}">${choices.map(([value,text])=>`<option value="${value}" ${draft[key]===value?'selected':''}>${text}</option>`).join('')}</select></label>`).join('')}</fieldset><button class="button primary gift-download" type="submit">Скачать живой подарок · HTML</button><button class="button secondary" type="button" data-gift="save-draft">Сохранить черновик</button></form><div class="gift-preview-wrap"><label class="field"><span>Глазами получателя</span><select id="gift-preview-stage"><option value="envelope">Конверт</option><option value="letter">Открытое письмо</option><option value="sprout">Первый росток</option><option value="bloom">Взрослое растение</option></select></label><div id="gift-composer-preview" class="gift-preview"></div><p class="gift-preview-note">В подарке начнётся новая история — с маленького ростка.</p></div></div><div class="gift-sharing-note"><strong>Передайте один HTML-файл</strong><p>Он открывается без сервера и интернета. Получатель сам нажмёт «Посадить семечко». Файл содержит только выбранный вид, имена и письмо — без вашего сада, монет и личных заметок. Отправка выполняется вами после скачивания.</p><p>На телефоне файл должен открываться браузером с поддержкой HTML, а не только предпросмотром файлового приложения.</p></div></div>`,'gift',true);
    const form=document.getElementById('gift-composer-form'),preview=document.getElementById('gift-composer-preview');
    if(!form||!preview)return;
    const abort=new AbortController();disposeCurrent=()=>abort.abort();
    function read(){const values=Object.fromEntries(new FormData(form));draft=normalizeGiftDraft(values,api.game.CATALOG);return draft;}
    function update(){
      read();
      const species=api.game.CATALOG.find(item=>item.id===draft.speciesId);
      preview.dataset.theme=draft.theme;
      for(const key of ['paper','ribbon','pattern','layout'])preview.dataset[key]=draft[key];
      const pot=draft.theme==='petal'?'pink':draft.theme==='night'?'sage':'cream';
      const light=draft.theme==='night'?'night':'day';
      const growth={letter:.04,sprout:.35,bloom:1}[previewStage]||0;
      const illustration=api.art.plantArt(species.id,{id:'gift-preview',variant:'gift-preview',growth:Math.max(.04,growth),pot,light});
      const frame=giftBotanicalFrame(species.id);
      if(previewStage==='envelope'){
        preview.innerHTML=`<div class="gift-preview-origami" aria-hidden="true">${giftOrigamiFlower()}</div><div class="gift-preview-ribbon" aria-hidden="true"></div>${frame}
        <div class="gift-preview-postage">${giftPostage(species,api.art.plantArt(species.id,{id:'gift-stamp-preview',growth:1,pot,light}))}</div>
        ${giftSeal(draft.recipient,species.id,api.art)}<p class="gift-preview-to">${escape(draft.recipient||'Для дорогого человека')}</p><small>Закрытый конверт</small>`;
      }else{
        const bloom=previewStage==='bloom'&&draft.bloomMessage
          ?`<p class="gift-preview-message"><strong>Письмо после цветения</strong><br>${escape(draft.bloomMessage)}</p>`:'';
        preview.innerHTML=`${frame}<p class="gift-preview-to">${escape(draft.recipient?draft.recipient+', этот росток для тебя':'Этот росток — для тебя')}</p>
        <p class="gift-preview-message">${escape(draft.message||'Иногда маленький росток говорит больше тысячи слов.')}</p>
        <p class="gift-preview-from">${escape(draft.sender?'С теплом, '+draft.sender:'С теплом и заботой')}</p>
        <div class="gift-preview-art">${illustration}</div><strong>${escape(species.name)}</strong>
        <small>${{letter:'Одно семечко — начало маленькой истории',sprout:'Появились первые листья',bloom:'Ваше маленькое чудо выросло'}[previewStage]}</small>${bloom}`;
      }
      form.querySelector('.gift-letter-count').textContent=draft.message.length+' / 500';
    }
    function persistWorkspace(next,message) {
      const revision=++draftRevision;
      pendingDraft=next;
      const task=Promise.resolve(api.commit(({extras})=>{extras.giftDraft=next;},message))
        .then(()=>{if(revision===draftRevision)pendingDraft=null;});
      pendingSaves.add(task);
      task.then(()=>pendingSaves.delete(task),()=>pendingSaves.delete(task));
      return task;
    }
    function captureDraft(){
      const value=read();
      const found=library.some(item=>item.id===activeDraftId);
      if(!found&&library.length>=giftDraftLimit)throw new Error('Сохранено десять черновиков. Освободите место для нового письма.');
      const entry={...value,id:activeDraftId};
      library=found?library.map(item=>item.id===activeDraftId?entry:item):[...library,entry];
      return {...value,activeDraftId,drafts:library};
    }
    async function saveDraft(message) {
      const workspace=captureDraft();
      await persistWorkspace(workspace,message);
      return workspace;
    }
    async function openAnother(selected) {
      const current=read();
      const hasEdits=JSON.stringify(current)!==JSON.stringify(normalizeGiftDraft(saved,api.game.CATALOG));
      if(hasEdits)captureDraft();
      const next=selected?library.find(item=>item.id===selected):null;
      const value={...normalizeGiftDraft(next,api.game.CATALOG),activeDraftId:next?.id||newGiftDraftId(),drafts:library};
      await persistWorkspace(value);
      if(form.isConnected)open(undefined,value);
    }
    document.getElementById('gift-preview-stage').addEventListener('change',event=>{previewStage=event.target.value;update();},{signal:abort.signal});
    const report=error=>api.toast(error.message||'Не удалось сохранить черновик.');
    form.querySelector('[data-gift="draft-list"]').addEventListener('change',event=>{
      if(event.target.value)openAnother(event.target.value).catch(report);
    },{signal:abort.signal});
    form.querySelector('[data-gift="new-draft"]').addEventListener('click',()=>openAnother('').catch(report),{signal:abort.signal});
    form.querySelector('[data-gift="remove-draft"]')?.addEventListener('click',async()=>{
      library=library.filter(item=>item.id!==activeDraftId);
      const value={...normalizeGiftDraft(null,api.game.CATALOG),activeDraftId:newGiftDraftId(),drafts:library};
      try{await persistWorkspace(value,'Черновик убран.');if(form.isConnected)open(undefined,value);}catch(error){report(error);}
    },{signal:abort.signal});
    form.addEventListener('input',update,{signal:abort.signal});form.addEventListener('change',update,{signal:abort.signal});
    form.querySelector('[data-gift="save-draft"]').addEventListener('click',async()=>{try{const value=await saveDraft('Черновик подарка сохранён в этом саду.');if(form.isConnected)open(undefined,value);}catch(error){report(error);}},{signal:abort.signal});
    form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('[type="submit"]');button.disabled=true;try{const value={...read()},html=buildGiftHTML(value,{art:api.art,catalog:api.game.CATALOG});api.download(new Blob([html],{type:'text/html;charset=utf-8'}),'flora-living-gift.html');await saveDraft('Живой подарок скачан. Передайте HTML-файл получателю.');}catch(error){api.toast(error.message||'Не удалось подготовить подарок.');}finally{if(button.isConnected)button.disabled=false;}},{signal:abort.signal});
    update();
  }
  return {open,dispose,flush};
}

return Object.freeze({ defaultGiftDraft, normalizeGiftDraft, normalizeGiftWorkspace, initialGiftProgress, normalizeGiftProgress, advanceGiftProgress, applyGiftAction, buildGiftHTML, createGiftFeature });
})();
