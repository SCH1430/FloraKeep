const media = (() => {
/* Local-only postcard and GIF tools. No external assets, services or dependencies. */
const POSTCARD_FORMATS = Object.freeze({
 square:Object.freeze({width:1080,height:1080,label:'Квадрат'}),
 portrait:Object.freeze({width:1080,height:1350,label:'Портрет'}),
 wide:Object.freeze({width:1600,height:900,label:'Широкая открытка'}),
 print:Object.freeze({width:1311,height:1819,label:'A6 со служебными полями'}),
});
const xmlText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function artDimensions(format,width,height){
 const preset=POSTCARD_FORMATS[format]||POSTCARD_FORMATS.portrait;
 const w=Number.isInteger(width)?width:preset.width,h=Number.isInteger(height)?height:preset.height;
 if(w<32||h<32||w>4096||h>4096||w*h>12000000)throw new RangeError('Размер открытки должен быть от 32 до 4096 пикселей, до 12 мегапикселей.');
 return {width:w,height:h};
}
function placeSVG(artwork,x,y,width,height,fit='meet'){
 if(typeof artwork!=='string'||!/^\s*<svg\b/.test(artwork))throw new TypeError('Для открытки нужен SVG рисунок.');
 if(/<script|<foreignObject|\son\w+\s*=|(?:href|src)\s*=\s*['"](?!#|data:image\/)/i.test(artwork))throw new Error('Внешнее или исполняемое содержимое в открытках запрещено.');
 return artwork.replace(/^\s*<svg\b([^>]*)>/,(_,attributes)=>`<svg${attributes.replace(/\s(?:x|y|width|height|preserveAspectRatio|overflow)=(?:"[^"]*"|'[^']*')/gi,'')} x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid ${fit==='slice'?'slice':'meet'}" overflow="hidden">`);
}
function lines(text,max=44,count=2){
 const words=String(text||'').trim().split(/\s+/),result=[];let line='';
 for(const word of words){if((line+' '+word).trim().length>max&&line){result.push(line);line=word;}else line=(line+' '+word).trim();}
 if(line)result.push(line);
 return result.slice(0,count).map((line,i)=>i===count-1&&result.length>count?line.slice(0,max-1)+'…':line);
}
const photoRange=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
function normalizePhotoDesign(raw={}){
 const layout=raw.layout==='full'?'full':'classic';
 return {
  layout,mat:photoRange(raw.mat,0,12,layout==='full'?0:4),guides:['thirds','center'].includes(raw.guides)?raw.guides:'none',
  historyDates:Array.isArray(raw.historyDates)?raw.historyDates.slice(0,4).map(at=>Number.isSafeInteger(at)&&at>=0?at:null):[],
 };
}
function readPhotoDesign(form){
 const value=name=>form.get(name);
 const numeric=name=>{const raw=value(name);return raw===null||raw===''?undefined:Number(raw);};
 return normalizePhotoDesign({
  layout:value('photo-layout'),mat:numeric('photo-mat'),guides:value('photo-guides'),
  historyDates:Array.from({length:4},(_,index)=>numeric(`photo-history-${index}`)),
 });
}
function photoGrowthSamples(history,dates=[]){
 const samples=[...new Map((Array.isArray(history)?history:[]).filter(row=>Number.isSafeInteger(row?.at)&&row.at>=0).map(row=>[row.at,row])).values()].sort((a,b)=>a.at-b.at);
 if(samples.length<4)return [];
 const available=new Map(samples.map(row=>[row.at,row]));
 const chosen=[];
 for(let index=0;index<4;index++){
  const preferred=available.get(dates[index]);
  const fallback=samples[Math.round(index*(samples.length-1)/3)];
  const sample=preferred||available.get(fallback.at)||available.values().next().value;
  if(!sample)break;
  chosen.push(sample);
  available.delete(sample.at);
 }
 return chosen;
}
function photoDesignFields(options,history,formatDate){
 const {layout,mat,guides,historyDates}=normalizePhotoDesign(options);
 const select=(name,label,choices,value)=>`<label class="field"><span>${xmlText(label)}</span><select name="${name}">${choices.map(([id,title])=>`<option value="${xmlText(id)}"${String(id)===String(value)?' selected':''}>${xmlText(title)}</option>`).join('')}</select></label>`;
 const selected=photoGrowthSamples(history,historyDates);
 const samples=selected.length===4?`<details class="photo-series-fields"><summary>Кадры полосы роста</summary><div class="form-grid">${selected.map((row,index)=>select(`photo-history-${index}`,`Кадр ${index+1}`,history.map(sample=>[sample.at,formatDate(sample.at)]),row.at)).join('')}</div></details>`:'';
 return `<fieldset class="photo-design-fields"><legend>Композиция</legend><div class="form-grid">${select('photo-layout','Макет',[['classic','Открытка с подписью'],['full','На весь лист']],layout)}<label class="field"><span>Поля паспарту, %</span><input name="photo-mat" type="range" min="0" max="12" step="1" value="${mat}"></label>${select('photo-guides','Направляющие предпросмотра',[['none','Скрыть'],['thirds','Правило третей'],['center','Центр кадра']],guides)}</div>${samples}</fieldset>`;
}
function photoGuides(mode,x,y,w,h){
 if(mode==='none')return '';
 const strokes=(mode==='thirds'?[1/3,2/3]:[.5]).map(ratio=>`M${x+w*ratio} ${y}v${h} M${x} ${y+h*ratio}h${w}`).join(' ');
 return `<g aria-hidden="true" data-photo-guides="${mode}" fill="none" pointer-events="none"><path d="${strokes}" stroke="#253f32" opacity=".75" stroke-width="2"/><path d="${strokes}" stroke="#fffdf1" stroke-width="1.6" stroke-dasharray="10 8" opacity=".94"/></g>`;
}
function postcardSVG({artwork,title='Мой маленький сад',subtitle='flora keep',caption='',dateLabel='',format='portrait',width,height,beforeArtwork=null,beforeLabel='Раньше',afterLabel='Сегодня',background='#f0f1e6',layout,mat,guides,preview=false}={}){
 const size=artDimensions(format,width,height),w=size.width,h=size.height;
 const bg=/^#[0-9a-f]{3,8}$/i.test(background)?background:'#f0f1e6';
 const design=normalizePhotoDesign({layout,mat,guides}),full=design.layout==='full'&&!beforeArtwork;
 const matPixels=Math.min(w,h)*design.mat/100;
 const pad=full?matPixels:w*.035+matPixels*.5;
 const top=full?matPixels:h*.038+matPixels*.2;
 const artHeight=full?h-2*matPixels:h*.71-matPixels*.15,titleY=h*.82;
 const innerWidth=w-pad*2;
 let illustration;
 if(beforeArtwork){
  illustration=placeSVG(beforeArtwork,pad,top,(w-pad*3)/2,artHeight)+placeSVG(artwork,w/2+pad/2,top,(w-pad*3)/2,artHeight);
  illustration+=`<path d="M${w/2} ${h*.1}V${h*.68}" stroke="#d3dcc6" stroke-width="2" stroke-dasharray="7 8"/><text x="${w*.25}" y="${h*.76}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${w*.022}" fill="#728163">${xmlText(beforeLabel)}</text><text x="${w*.75}" y="${h*.76}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${w*.022}" fill="#728163">${xmlText(afterLabel)}</text>`;
 }else illustration=placeSVG(artwork,pad,top,innerWidth,artHeight,full?'slice':'meet');
 const titleSize=w*(format==='wide'?.031:.041),captionSize=w*.022;
 const captionRows=lines(caption,format==='wide'?80:48,2);
 const cutMarks = format === 'print' ? printMarks(w,h) : '';
 const copy=full
   ? `<rect x="${pad}" y="${h-matPixels-h*.1}" width="${innerWidth}" height="${h*.1}" fill="#fcf8ed" fill-opacity=".93"/><text x="${pad+innerWidth*.035}" y="${h-matPixels-h*.036}" font-family="Georgia, serif" font-size="${Math.min(w*.027,h*.045)}" fill="#315640">${xmlText(lines(caption||title,58,1)[0]||'')}</text>`
   : `<rect x="${pad/2}" y="${pad/2}" width="${w-pad}" height="${h-pad}" rx="${pad/3}" fill="none" stroke="#d9e0ce" stroke-width="2"/><text x="${w/2}" y="${titleY}" text-anchor="middle" font-family="Georgia, serif" font-size="${titleSize}" fill="#315640">${xmlText(String(title).slice(0,56))}</text>${captionRows.map((line,i)=>`<text x="${w/2}" y="${h*.865+i*captionSize*1.4}" text-anchor="middle" font-family="Georgia, serif" font-size="${captionSize}" fill="#6e805e">${xmlText(line)}</text>`).join('')}<text x="${w/2}" y="${h*.936}" text-anchor="middle" font-family="Georgia, serif" font-size="${w*.019}" fill="#667958">${xmlText([subtitle,dateLabel].filter(Boolean).join(' · '))}</text>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${xmlText(title)}" data-photo-layout="${full?'full':'classic'}"><rect width="${w}" height="${h}" fill="${bg}"/>${matPixels?`<rect x="0" y="0" width="${w}" height="${h}" fill="#faf6e9"/><rect x="${matPixels}" y="${matPixels}" width="${w-2*matPixels}" height="${h-2*matPixels}" rx="${Math.min(18,matPixels/2)}" fill="${bg}"/>`:''}${illustration}${copy}${preview?photoGuides(design.guides,pad,top,innerWidth,artHeight):''}${cutMarks}</svg>`;
}
function photoSheetSVG(entries,{kind='contact',title='Снимки сада'}={}){
 const isStrip=kind==='strip';
 if(!Array.isArray(entries)||(isStrip?entries.length!==4:entries.length<1||entries.length>12))throw new RangeError('Для полосы роста выберите четыре кадра, для контактного листа — до двенадцати.');
 const columns=isStrip?4:Math.min(entries.length,3), rows=Math.ceil(entries.length/columns);
 const cellWidth=280,cellHeight=310,pad=42,gap=18,top=100;
 const w=pad*2+columns*cellWidth+(columns-1)*gap,h=top+rows*cellHeight+(rows-1)*gap+pad;
 const frames=entries.map(({artwork,label},i)=>{
  const x=pad+i%columns*(cellWidth+gap),y=top+Math.floor(i/columns)*(cellHeight+gap);
  return `<g data-photo-frame="${i+1}"><rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="6" fill="#fffdf4" stroke="#c7ceba"/><rect x="${x+12}" y="${y+12}" width="${cellWidth-24}" height="${cellHeight-60}" fill="#edf0df"/>${placeSVG(artwork,x+12,y+12,cellWidth-24,cellHeight-60)}<text x="${x+cellWidth/2}" y="${y+cellHeight-21}" text-anchor="middle" font-family="Arial, sans-serif" font-size="17" fill="#385546">${xmlText(lines(label,31,1)[0]||'')}</text></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${xmlText(title)}" data-photo-sheet="${isStrip?'strip':'contact'}"><rect width="${w}" height="${h}" fill="#f3eedf"/><text x="${pad}" y="59" font-family="Georgia, serif" font-size="34" fill="#294a3b">${xmlText(lines(title,54,1)[0]||'')}</text><path d="M${pad} 77H${w-pad}" stroke="#b6bfa8"/>${frames}</svg>`;
}
function printMarks(width,height) {
 const marks = [[36,36,1,1],[width-36,36,-1,1],[36,height-36,1,-1],[width-36,height-36,-1,-1]];
 return '<g fill="none" stroke="#555" stroke-width="2">' + marks.map(([x,y,dx,dy]) =>
   `<path d="M${x-dx*6} ${y}h${-dx*20} M${x} ${y-dy*6}v${-dy*20}"/>`).join('') + '</g>';
}
function frameArtwork(artwork,{zoom=100,x=0,y=0,fixedFrame=false}={}) {
 const scale=photoRange(zoom,80,180,100)/100;
 const offsetX=photoRange(x,-35,35,0)*8,offsetY=photoRange(y,-35,35,0)*6;
 if(!fixedFrame&&scale===1&&offsetX===0&&offsetY===0)return artwork;
 const anchorY=fixedFrame?530:300;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"${fixedFrame?' data-photo-frame-lock="true"':''}><g transform="translate(${400+offsetX} ${anchorY+offsetY}) scale(${scale}) translate(-400 -${anchorY})">${placeSVG(artwork,0,0,800,600)}</g></svg>`;
}
async function canvasFromSVG(svg,{width,height,readPixels=false,surface}={}){
 if(typeof document==='undefined'||typeof Image==='undefined')throw new Error('Экспорт изображения доступен в браузере.');
 const image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Не получилось прочитать рисунок.'));image.src=url;});
  const size=artDimensions('portrait',width||image.naturalWidth,height||image.naturalHeight);
  const canvas=surface?.canvas??document.createElement('canvas');
  if(canvas.width!==size.width)canvas.width=size.width;
  if(canvas.height!==size.height)canvas.height=size.height;
  const ctx=surface?.ctx??canvas.getContext('2d',readPixels?{willReadFrequently:true}:undefined);
  if(!ctx)throw new Error('Браузер не поддерживает рисование открыток.');
  if(surface)ctx.clearRect(0,0,size.width,size.height);
  ctx.drawImage(image,0,0,size.width,size.height);
  return {canvas,ctx};
 }finally{URL.revokeObjectURL(url);}
}
async function rasterizeSVG(svg,{width,height}={}){
 const {canvas}=await canvasFromSVG(svg,{width,height});
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Не удалось сохранить PNG.')),'image/png'));
}
async function renderPostcard(options={}){
 const dimensions=artDimensions(options.format,options.width,options.height);
 return rasterizeSVG(postcardSVG({...options,preview:false}),dimensions);
}

/* GIF89a: deterministic RGB332 palette and valid 9-bit LZW literal runs.
 * A clear code every 200 pixels keeps the dictionary below its 10-bit boundary.
 * This bounded, simple encoder favours predictable export over large dictionaries.
 * 12 × 480×480 frames stay below 3.2 MB before container overhead.
 */
function encodeGIF(frames,width,height,delayCentiseconds=12,progress=()=>{}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>640||height>640)throw new RangeError('GIF: размер должен быть от 1 до 640 пикселей.');
 if(!Array.isArray(frames)||frames.length<1||frames.length>16)throw new RangeError('GIF: требуется от 1 до 16 кадров.');
 if(width*height*frames.length>4000000)throw new RangeError('GIF слишком большой: уменьшите размер или число кадров.');
 if(!Number.isInteger(delayCentiseconds)||delayCentiseconds<2||delayCentiseconds>1000)throw new RangeError('GIF: задержка кадра должна быть от 2 до 1000 сотых секунды.');
 const pixelCount=width*height,clearInterval=200;
 const codeCount=pixelCount+Math.ceil(pixelCount/clearInterval)+1;
 const packedSize=Math.ceil(codeCount*9/8);
 const frameOverhead=19+Math.ceil(packedSize/255)+1;
 // GIF header and palette (781 bytes), loop extension (19 bytes), and trailer (1 byte).
 const bytes=new Uint8Array(801+(frameOverhead+packedSize)*frames.length);
 const packed=new Uint8Array(packedSize);
 const palette3=new Uint8Array(256),palette2=new Uint8Array(256);
 for(let value=0;value<256;value++){
  palette3[value]=Math.round(value*7/255);
  palette2[value]=Math.round(value*3/255);
 }
 const background=(palette3[240]<<5)|(palette3[241]<<2)|palette2[230];
 let cursor=0;
 function append(...values){bytes.set(values,cursor);cursor+=values.length;}
 function word(value){bytes[cursor++]=value&255;bytes[cursor++]=value>>>8;}
 function ascii(text){for(let index=0;index<text.length;index++)bytes[cursor++]=text.charCodeAt(index);}
 ascii('GIF89a');word(width);word(height);append(0xf7,0,0);
 for(let i=0;i<256;i++)append(Math.round((i>>5)*255/7),Math.round(((i>>2)&7)*255/7),Math.round((i&3)*255/3));
 // NETSCAPE2.0 loop count 0 means indefinitely.
 append(0x21,0xff,11);ascii('NETSCAPE2.0');append(3,1,0,0,0);
 for(const [index,frame] of frames.entries()){
  const data=frame?.data??frame;
  if(!(data instanceof Uint8Array||data instanceof Uint8ClampedArray)||data.length!==pixelCount*4)throw new TypeError('GIF: каждый кадр должен содержать полный массив RGBA.');
  append(0x21,0xf9,4,0x04);word(delayCentiseconds);append(0,0);
  append(0x2c);word(0);word(0);word(width);word(height);append(0,8);
  let pending=0,bits=0,used=0;
  function code(value){
   pending|=value<<bits;
   packed[used++]=pending&255;
   pending>>>=8;
   bits++;
   if(bits===8){packed[used++]=pending;pending=0;bits=0;}
  }
  for(let pixel=0;pixel<pixelCount;pixel++){
   if(pixel%clearInterval===0)code(256);
   const j=pixel*4,opacity=data[j+3];
   if(opacity===255)code((palette3[data[j]]<<5)|(palette3[data[j+1]]<<2)|palette2[data[j+2]]);
   else if(opacity===0)code(background);
   else {
    const alpha=opacity/255,uncovered=1-alpha;
    const r=Math.round(data[j]*alpha+240*uncovered);
    const g=Math.round(data[j+1]*alpha+241*uncovered);
    const b=Math.round(data[j+2]*alpha+230*uncovered);
    code((palette3[r]<<5)|(palette3[g]<<2)|palette2[b]);
   }
  }
  code(257);if(bits)packed[used++]=pending;
  for(let offset=0;offset<used;offset+=255){
   const chunk=packed.subarray(offset,Math.min(offset+255,used));
   bytes[cursor++]=chunk.length;
   bytes.set(chunk,cursor);
   cursor+=chunk.length;
  }
  bytes[cursor++]=0;
  progress(index+1,frames.length);
 }
 bytes[cursor]=0x3b;
 return bytes;
}
async function createAnimatedPostcard({frames,width=400,height=400,delay=12,signal,onProgress=()=>{}}={}){
 if(!Array.isArray(frames)||frames.length<2||frames.length>12)throw new RangeError('Для открытки нужно от 2 до 12 кадров.');
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<32||height<32||width>480||height>480)throw new RangeError('Открытка GIF ограничена размером 480 × 480.');
 const pixels=[];
 let surface;
 for(const [index,svg] of frames.entries()){
  signal?.throwIfAborted();
  surface=await canvasFromSVG(svg,{width,height,readPixels:true,surface});
  signal?.throwIfAborted();
  pixels.push(surface.ctx.getImageData(0,0,width,height).data);
  onProgress((index+1)/(frames.length*2));
  await new Promise(resolve=>setTimeout(resolve,0));
 }
 signal?.throwIfAborted();
 const progress = (count,total) => onProgress(.5+count/(total*2));
 const bytes = await encodeInWorker(pixels,width,height,delay,signal,progress);
 return new Blob([bytes],{type:'image/gif'});
}
async function encodeInWorker(pixels,width,height,delay,signal,progress) {
 if (typeof Worker !== 'function') return encodeGIF(pixels,width,height,delay,progress);
 const source = `const encodeGIF=${encodeGIF.toString()};onmessage=event=>{const {pixels,width,height,delay}=event.data;try{const output=encodeGIF(pixels,width,height,delay,(done,total)=>postMessage({done,total}));postMessage({output},[output.buffer]);}catch(error){postMessage({error:error.message});}};`;
 const url = URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
 let worker;
 try {
  worker = new Worker(url);
 } catch {
  URL.revokeObjectURL(url);
  return encodeGIF(pixels,width,height,delay,progress);
 }
 try {
  return await new Promise((resolve,reject)=>{
   if (signal?.aborted) return reject(signal.reason);
   const finish = callback => value => { signal?.removeEventListener('abort',onAbort); callback(value); };
   const success = finish(resolve);
   const failure = finish(reject);
   const onAbort = ()=>failure(signal.reason || new DOMException('Создание GIF отменено.','AbortError'));
   worker.onmessage = ({data})=>{
    if (data.output) success(data.output);
    else if (data.error) failure(new Error(data.error));
    else progress(data.done,data.total);
   };
   worker.onerror = ()=>failure(new Error('Браузер не смог собрать кадры GIF.'));
   signal?.addEventListener('abort',onAbort,{once:true});
   try {
    worker.postMessage({pixels,width,height,delay},pixels.map(frame=>frame.buffer));
   } catch(error) {
    failure(error);
   }
  });
 } finally {
  worker.terminate();
  URL.revokeObjectURL(url);
 }
}

function synthesizeGardenNote(audio,note,voice='sine') {
 const frequency=[0,261.63,293.66,329.63,392,440][note];
 if(!audio||!frequency)return;
 const waves=['sine','triangle','square','sawtooth'];
 try {
  const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
  oscillator.type=waves.includes(voice)?voice:'sine';
  oscillator.frequency.value=frequency;
  gain.gain.setValueAtTime(0,now);
  gain.gain.linearRampToValueAtTime(['square','sawtooth'].includes(voice)?.035:.09,now+.035);
  gain.gain.exponentialRampToValueAtTime(.001,now+.4);
  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(now+.45);
 } catch {}
}

return Object.freeze({ POSTCARD_FORMATS, postcardSVG, frameArtwork, rasterizeSVG, renderPostcard, encodeGIF, createAnimatedPostcard, synthesizeGardenNote, normalizePhotoDesign, readPhotoDesign, photoGrowthSamples, photoDesignFields, photoSheetSVG });
})();
