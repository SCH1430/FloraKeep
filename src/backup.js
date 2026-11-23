const backup = (() => {
/** Portable checked backups. No DOM, network or external dependency. */
const MAX_BACKUP_BYTES = 2 * 1024 * 1024;
const MAX_TIME = 8640000000000000;
const ANDROID_SPECIES = ['daisy','lavender','sunflower','tulip','mint','cactus','rose','monstera'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (n, low=0, high=MAX_TIME) => Number.isSafeInteger(n) && n>=low && n<=high;
const fail = message => { throw new Error(message); };
function cleanJSON(value, depth=0, budget={nodes:0}) {
  if (++budget.nodes>100000 || depth>24) fail('Копия слишком сложная или содержит чрезмерно вложенные данные.');
  if (value===null || typeof value==='boolean') return value;
  if (typeof value==='number') {if(!Number.isFinite(value))fail('В копии найдено неверное число.');return value;}
  if (typeof value==='string') {if(value.length>200000&&!(value.length<=600000&&/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]*={0,2}$/.test(value)))fail('В копии найдена слишком длинная строка.');return value;}
  if (Array.isArray(value)) {if(value.length>20000)fail('В копии слишком много записей.');return value.map(v=>cleanJSON(v,depth+1,budget));}
  if (object(value)) {
    const result={};
    for(const [key,entry] of Object.entries(value)) {
      if(['__proto__','prototype','constructor'].includes(key))fail('Копия содержит недопустимое имя поля.');
      result[key]=cleanJSON(entry,depth+1,budget);
    }
    return result;
  }
  fail('Копия содержит неподдерживаемые данные.');
}
function parse(text, allowEnvelope=false) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)fail('Копия сада должна быть не больше 2 МБ.');
  // Bound nesting before JSON.parse to avoid deeply nested adversarial input.
  let depth=0, quoted=false, escaped=false;
  for(const ch of text){if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;}else if(ch==='"')quoted=true;else if(ch==='{'||ch==='['){if(++depth>26)fail('Копия содержит слишком много вложенных данных.');}else if(ch==='}'||ch===']')depth--;}
  try{
    const value=JSON.parse(text);
    // The checked envelope deliberately contains a serialized document. Its
    // total bytes are bounded above; validate that document separately after
    // verifying its checksum instead of treating it as a user text field.
    const envelope=allowEnvelope&&object(value)&&typeof value.payload==='string'&&((value.format==='FloraKeepWeb'&&value.version===2)||(value.format==='FloraKeepGarden'&&value.schemaVersion===1));
    if(envelope){const payload=value.payload;return {...cleanJSON({...value,payload:''}),payload};}
    return cleanJSON(value);
  }catch(error){if(error instanceof SyntaxError)fail('Не удалось прочитать JSON-копию сада.');throw error;}
}
/** SHA-256 fallback for browsers that omit SubtleCrypto for file:// pages. */
function sha256Fallback(text) {
  const input=new TextEncoder().encode(text), size=Math.ceil((input.length+9)/64)*64;
  const data=new Uint8Array(size);data.set(input);data[input.length]=128;
  const view=new DataView(data.buffer), bits=input.length*8;
  view.setUint32(size-8,Math.floor(bits/4294967296));view.setUint32(size-4,bits>>>0);
  const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],w=new Uint32Array(64),r=(x,n)=>(x>>>n)|(x<<(32-n));
  for(let offset=0;offset<size;offset+=64){
    for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);
    for(let i=16;i<64;i++){const a=w[i-15],b=w[i-2];w[i]=(w[i-16]+(r(a,7)^r(a,18)^(a>>>3))+w[i-7]+(r(b,17)^r(b,19)^(b>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,j]=h;
    for(let i=0;i<64;i++){const t1=(j+(r(e,6)^r(e,11)^r(e,25))+((e&f)^(~e&g))+k[i]+w[i])>>>0,t2=((r(a,2)^r(a,13)^r(a,22))+((a&b)^(a&c)^(b&c)))>>>0;j=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    [a,b,c,d,e,f,g,j].forEach((v,i)=>h[i]=(h[i]+v)>>>0);
  }
  return h.map(v=>v.toString(16).padStart(8,'0')).join('');
}
async function sha256(text) {
  try {if(globalThis.crypto?.subtle){const hash=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');}}catch{}
  return sha256Fallback(text);
}
function validatePayload(raw, validateGame) {
  if(!object(raw)||raw.format!=='FloraKeepWeb'||raw.version!==1||typeof validateGame!=='function')fail('Неподдерживаемая версия веб-копии.');
  const game=validateGame(raw.game);if(!game)fail('Сад повреждён или содержит неизвестные растения.');
  if(raw.savedAt!==undefined&&!integer(raw.savedAt))fail('В копии неверная дата.');
  const result=cleanJSON(raw);
  result.game=game;result.savedAt=raw.savedAt??0;
  result.prefs=object(raw.prefs)?cleanJSON(raw.prefs):{};
  result.journal=Array.isArray(raw.journal)?raw.journal.filter(e=>object(e)&&integer(e.at)&&typeof e.text==='string'&&e.text.length<=500).slice(0,2000).map(e=>({...e,kind:typeof e.kind==='string'&&/^[a-z-]{1,30}$/.test(e.kind)?e.kind:'leaf'})):[];
  result.extras=object(raw.extras)?cleanJSON(raw.extras):{};
  return result;
}
async function encodeBackup(payload) {
  if(!object(payload)||payload.format!=='FloraKeepWeb'||payload.version!==1||!object(payload.game))fail('Не удалось подготовить сад к сохранению.');
  const raw=JSON.stringify(cleanJSON(payload));
  const envelope={format:'FloraKeepWeb',version:2,createdAt:Date.now(),payload:raw,sha256:await sha256(raw)};
  if(new TextEncoder().encode(JSON.stringify(envelope)).length>MAX_BACKUP_BYTES)fail('Копия превышает 2 МБ. Сократите историю перед экспортом.');
  return envelope;
}
function estimateBackupBytes(payload) {
  const raw = JSON.stringify(cleanJSON(payload));
  const envelope = {format:'FloraKeepWeb',version:2,createdAt:Date.now(),payload:raw,sha256:'0'.repeat(64)};
  return new TextEncoder().encode(JSON.stringify(envelope)).length;
}
function exactKeys(value, keys, label) {
  if(!object(value)||Object.keys(value).sort().join('|')!==keys.slice().sort().join('|'))fail(`Неизвестная структура ${label} Android-копии.`);
}
function validateAndroidStyle(style) {
  exactKeys(style,['scene','season','weather','material','cover','pattern','potColor','nameTag','stand'],'оформления');
  const choices={scene:['WINDOW','BALCONY','DESK','CONSERVATORY'],season:['SPRING','SUMMER','AUTUMN','WINTER'],weather:['CLEAR','RAIN','SNOW'],material:['CLAY','CERAMIC','METAL','WICKER'],cover:['EARTH','MOSS','PEBBLES','BARK']};
  if(Object.entries(choices).some(([key,values])=>!values.includes(style[key]))||!integer(style.pattern,0,3)||!integer(style.stand,0,3)||!integer(style.potColor,0xff000000,0xffffffff)||typeof style.nameTag!=='boolean')fail('Некорректное оформление в Android-копии.');
}
function validateAndroidGroups(value, ids) {
  exactKeys(value,['game','studio','journal','visuals','audio','experience'],'разделов');
  exactKeys(value.studio,['style','introSeen','order','specimens'],'мастерской');
  validateAndroidStyle(value.studio.style);
  if(typeof value.studio.introSeen!=='boolean'||!Array.isArray(value.studio.order)||value.studio.order.length>100||new Set(value.studio.order).size!==value.studio.order.length||value.studio.order.some(id=>!ids.has(id))||!object(value.studio.specimens)||Object.keys(value.studio.specimens).length>100)fail('Некорректная расстановка в Android-копии.');
  for(const [id,style]of Object.entries(value.studio.specimens)){if(!ids.has(id))fail('Оформление ссылается на неизвестное растение.');validateAndroidStyle(style);}
  if(!object(value.journal)||Object.keys(value.journal).length>100)fail('Некорректный журнал Android-копии.');
  for(const [group,keys]of Object.entries({visuals:['motion'],audio:['music','effects','haptics'],experience:['tutorialDone','tutorialStep','celebratedSpecies']}))if(!object(value[group])||Object.keys(value[group]).some(key=>!keys.includes(key)))fail('Неизвестные настройки Android-копии.');
  if(value.visuals.motion!==undefined&&!['FULL','CALM'].includes(value.visuals.motion))fail('Некорректный режим движения.');
  for(const key of ['music','effects'])if(value.audio[key]!==undefined&&(typeof value.audio[key]!=='number'||value.audio[key]<0||value.audio[key]>1))fail('Некорректная громкость.');
  if(value.audio.haptics!==undefined&&typeof value.audio.haptics!=='boolean')fail('Некорректная настройка вибрации.');
  if(value.experience.tutorialDone!==undefined&&typeof value.experience.tutorialDone!=='boolean')fail('Некорректное обучение.');
  if(value.experience.tutorialStep!==undefined&&!integer(value.experience.tutorialStep,0,3))fail('Некорректный шаг обучения.');
  if(value.experience.celebratedSpecies!==undefined&&(!Array.isArray(value.experience.celebratedSpecies)||value.experience.celebratedSpecies.length>8||value.experience.celebratedSpecies.some(id=>!ANDROID_SPECIES.includes(id))))fail('Некорректная история цветения.');
}
function nearestPot(color) {
  const palette={clay:0xc9815c,sage:0x92a084,cream:0xded0b5,pink:0xc99388};
  const distance=other=>[0,8,16].reduce((sum,shift)=>sum+(((color>>>shift)&255)-((other>>>shift)&255))**2,0);
  return Object.keys(palette).sort((a,b)=>distance(palette[a])-distance(palette[b]))[0];
}
function androidStyle(style={}) {
  const material={CLAY:'clay',CERAMIC:'glaze',METAL:'glaze',WICKER:'paper'}[style.material]||'clay';
  return {material,pot:nearestPot(style.potColor??0xffc9815c),shape:'classic',scene:{WINDOW:'window',BALCONY:'balcony',DESK:'desk',CONSERVATORY:'window'}[style.scene]||'window',season:typeof style.season==='string'?style.season.toLowerCase():'summer',weather:{CLEAR:'clear',RAIN:'rain',SNOW:'snow'}[style.weather]||'clear',stand:integer(style.stand,0,3)?style.stand:0};
}
function androidPayload(root, value, validateGame) {
  if(!object(value)||!object(value.game)||value.game.schemaVersion!==1)fail('Неизвестная структура Android-копии.');
  exactKeys(value.game,['schemaVersion','coins','water','fertilizer','superFertilizer','lastWellAt','selectedPlantId','discovered','researchBySpecies','plants'],'игры');
  if(!integer(root.createdAt,0,253402300799999))fail('Некорректная дата Android-копии.');
  if(Array.isArray(value.game.plants))for(const p of value.game.plants){
    exactKeys(p,['id','speciesId','plantedAt','lastUpdated','growth','moisture','health','boost','boostUntil','research','earned'],'растения');
    if(!integer(p.plantedAt,0,253402300799999)||!integer(p.lastUpdated,0,253402300799999)||!integer(p.boostUntil,0,253402300799999)||!integer(p.research,0,1000000)||typeof p.earned!=='number'||p.earned<0||p.earned>2147483647)fail('Некорректные показатели Android-растения.');
  }
  const androidGame={...value.game};delete androidGame.schemaVersion;
  if(!Array.isArray(androidGame.plants)||androidGame.plants.some(p=>!ANDROID_SPECIES.includes(p.speciesId)))fail('Android-копия содержит неизвестный вид.');
  const game=validateGame(androidGame);if(!game)fail('Игровые данные Android-копии повреждены.');
  const ids=new Set(game.plants.map(p=>p.id));
  validateAndroidGroups(value,ids);
  const style=androidStyle(value.studio?.style),appearance={},history={};
  for(const id of ids)appearance[id]=androidStyle(value.studio.specimens[id]||value.studio.style);
  if(object(value.journal))for(const [id,rows]of Object.entries(value.journal)){
    if(!ids.has(id)||!Array.isArray(rows)||rows.length>64)fail('В Android-журнале неверный список наблюдений.');
    let previous=-1;
    history[id]=rows.map(row=>{exactKeys(row,['t','g','m'],'наблюдения');if(!object(row)||!integer(row.t)||row.t<previous||typeof row.g!=='number'||row.g<0||row.g>1||typeof row.m!=='number'||row.m<0||row.m>100)fail('В Android-журнале неверное наблюдение.');previous=row.t;return {at:row.t,growth:row.g,moisture:row.m,health:null};});
  }
  const order=Array.isArray(value.studio?.order)?[...new Set(value.studio.order.filter(id=>ids.has(id)))]:[];
  const prefs={sounds:Number(value.audio?.effects)>0,music:Number(value.audio?.music)>0,calm:value.visuals?.motion==='CALM',pot:'clay',...style};
  const payload={format:'FloraKeepWeb',version:1,savedAt:root.createdAt,game,prefs,journal:[{at:root.createdAt,text:'Сад перенесён из Android-копии Flora Keep. История роста сохранена отдельно.',kind:'upload'}],extras:{appearance,history,order,settings:{scene:style.scene,season:style.season,weather:style.weather},tutorial:value.experience?.tutorialDone===true?4:0,androidMigration:{appVersion:typeof root.appVersion==='string'?root.appVersion:'неизвестно',createdAt:root.createdAt,tutorialDone:value.experience?.tutorialDone===true}}};
  const rawObservations=Object.values(history).reduce((count,rows)=>count+rows.length,0);
  const retainedObservations=Object.values(history).reduce((count,rows)=>count+Math.min(48,new Set(rows.map(row=>row.at)).size),0);
  const appearanceCount=Object.keys(appearance).length;
  const hasHaptics=Object.hasOwn(value.audio,'haptics');
  return {payload,warnings:[
    `Растения: перенесено ${game.plants.length}. Наблюдения: ${retainedObservations} сохранится, ${rawObservations-retainedObservations} не войдёт из-за повторов или лимита истории.`,
    `Оформление горшков: преобразовано ${appearanceCount} карточек. Цвета, узоры и покрытия заменены ближайшими вариантами.`,
    `Вибрация: ${hasHaptics?1:0} параметров пропущено. Отдельные фоны, подставки, таблички, точные громкости и фотографии Android не поддерживаются.`,
  ]};
}
async function decodeBackup(text,{validateGame}={}) {
  const root=parse(text,true);if(!object(root))fail('Это не копия сада Flora Keep.');
  let payload,warnings=[],source='web';
  if(root.format==='FloraKeepWeb'&&root.version===1){payload=validatePayload(root,validateGame);warnings.push('Это старая веб-копия без контрольной суммы. После восстановления сохраните новую копию.');}
  else if((root.format==='FloraKeepWeb'&&root.version===2)||(root.format==='FloraKeepGarden'&&root.schemaVersion===1)){
    if(typeof root.payload!=='string'||typeof root.sha256!=='string'||!/^[a-fA-F0-9]{64}$/.test(root.sha256)||!integer(root.createdAt))fail('В копии отсутствуют контрольная сумма или дата.');
    if((await sha256(root.payload))!==root.sha256.toLowerCase())fail('Копия повреждена: контрольная сумма не совпадает.');
    const value=parse(root.payload);
    if(root.format==='FloraKeepGarden'){source='android';({payload,warnings}=androidPayload(root,value,validateGame));}
    else payload=validatePayload(value,validateGame);
  } else fail('Формат или версия копии пока не поддерживаются.');
  return {payload,warnings,source,metadata:{createdAt:root.createdAt??payload.savedAt,plants:payload.game.plants.length,species:payload.game.discovered.length,coins:payload.game.coins,water:payload.game.water,checksum:root.version===2||source==='android'}};
}
function compareBackups(current,incoming) {
  const a=current.game||current,b=incoming.game||incoming;
  const ids=new Set(a.plants.map(p=>p.id));
  return {before:{plants:a.plants.length,coins:a.coins,water:a.water,savedAt:current.savedAt||0},after:{plants:b.plants.length,coins:b.coins,water:b.water,savedAt:incoming.savedAt||0},newPlants:b.plants.filter(p=>!ids.has(p.id)).length,missingPlants:a.plants.filter(p=>!b.plants.some(q=>q.id===p.id)).length};
}
/** Import specimens, never currency/stock or accumulated earnings. Durable receipts
 * prevent a deleted specimen being minted repeatedly from the same old backup. */
function mergePlants(current,incoming,selectedIds,{validateGame,now=Date.now()}={}) {
  if(typeof validateGame!=='function')fail('Проверка игрового состояния обязательна.');
  const target=validateGame(current),source=validateGame(incoming);
  if(!target||!source||!Array.isArray(selectedIds))fail('Нельзя объединить повреждённые сады.');
  const requested=new Set(selectedIds),seen=new Set(target.plants.flatMap(p=>[p.id,p.lineageId||p.id]));
  const receipts=new Set(Array.isArray(current.importedPlantIds)?current.importedPlantIds:[]);
  for(const id of receipts)seen.add(id);
  const added=[],skipped=[];
  for(const specimen of source.plants){
    if(!requested.has(specimen.id))continue;
    const lineage=specimen.lineageId||specimen.id;
    if(seen.has(specimen.id)||seen.has(lineage)){skipped.push({id:specimen.id,reason:'already-imported'});continue;}
    if(target.plants.length+added.length>=100){skipped.push({id:specimen.id,reason:'capacity'});continue;}
    if(receipts.size+(receipts.has(specimen.id)?0:1)+(lineage!==specimen.id&&!receipts.has(lineage)?1:0)>10000){skipped.push({id:specimen.id,reason:'receipt-capacity'});continue;}
    added.push({...specimen,earned:0,lastUpdated:Math.max(specimen.lastUpdated,now),boost:1,boostUntil:0,lineageId:lineage});
    seen.add(specimen.id);seen.add(lineage);receipts.add(specimen.id);receipts.add(lineage);
  }
  const plants=[...target.plants,...added],discovered=[...new Set([...target.discovered,...added.map(p=>p.speciesId)])];
  const researchBySpecies={...target.researchBySpecies};for(const p of added)researchBySpecies[p.speciesId]=Math.max(researchBySpecies[p.speciesId]||0,p.research||0);
  const draft={...target,plants,discovered,researchBySpecies,selectedPlantId:target.selectedPlantId||plants[0]?.id||null,importedPlantIds:[...receipts]};
  const checked=validateGame(draft);if(!checked)fail('Объединённый сад не прошёл проверку.');
  // Keep receipts even when used with a legacy validator. Callers must persist them.
  const state={...checked,importedPlantIds:[...receipts]};
  return {state,added:added.map(p=>p.id),skipped,message:`Добавлено растений: ${added.length}. Пропущено: ${skipped.length}. Монеты, запасы и старый доход не переносятся.`};
}

return Object.freeze({ MAX_BACKUP_BYTES, sha256Fallback, sha256, encodeBackup, estimateBackupBytes, decodeBackup, compareBackups, mergePlants });
})();
