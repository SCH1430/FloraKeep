const exchange = (() => {
/** Password-protected, offline shared-garden files. Every password holder can
 * edit the file; names are labels, never authenticated server identities. */
const CLASSROOM_MAX_BYTES = 1024 * 1024;
const CLASSROOM_SPECIES = new Set(['daisy','lavender','sunflower','tulip','mint','cactus','rose','monstera','fern','orchid','aloe']);
const CLASSROOM_ITERATIONS = 600000;
const CLASSROOM_HISTORY_LIMIT = 320;
const CLASSROOM_COMMENT_LIMIT = 200;
const MAX_ROOM_TIME = 8640000000000000;
const roomObject = value => value!==null && typeof value==='object' && !Array.isArray(value);
const roomNumber = (n,a,b) => typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const roomTime = n => Number.isSafeInteger(n)&&n>=0&&n<=MAX_ROOM_TIME;
const roomId = id => typeof id==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(id)&&!['__proto__','prototype','constructor'].includes(id);
function textLabel(value,limit,field) {
  if(typeof value!=='string'||value.trim().length<1||value.trim().length>limit||/[\u0000-\u001f\u007f]/.test(value))throw new Error(`${field}: от 1 до ${limit} символов без управляющих знаков.`);
  return value.trim();
}
function newRoomId() {
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  if(globalThis.crypto?.getRandomValues)return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
  throw new Error('Браузер не поддерживает безопасный генератор идентификаторов.');
}
function contribution(value) {
  if(value===undefined||value==='')return '';
  return textLabel(value,240,'Заметка о вкладе');
}
function timeline(raw, limit, transform) {
  if(!Array.isArray(raw))return [];
  if(raw.length>limit)throw new Error('Общий сад содержит слишком много записей.');
  const records=new Map();
  for(const entry of raw){
    if(!roomObject(entry)||!roomId(entry.id)||!roomId(entry.key)||!roomTime(entry.at))throw new Error('Повреждена запись общего сада.');
    records.set(entry.id,{id:entry.id,key:entry.key,at:entry.at,author:textLabel(entry.author,40,'Псевдоним участника'),...transform(entry)});
  }
  return [...records.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
}
function roomChangeTime(...rooms){
  return Math.min(MAX_ROOM_TIME,Math.max(Date.now(),...rooms.map(room=>room.updatedAt+1)));
}
function roomEvent(kind,key,author,at){return {id:newRoomId(),key,at,author,kind};}
function mergeTimeline(a,b,limit){
  const merged=new Map(b.map(entry=>[entry.id,entry]));
  for(const entry of a)merged.set(entry.id,entry);
  return [...merged.values()].sort((p,q)=>p.at-q.at||p.id.localeCompare(q.id)).slice(-limit);
}
function sharedPlant(raw) {
  if(!roomObject(raw)||!roomId(raw.id)||!CLASSROOM_SPECIES.has(raw.speciesId)||!roomNumber(raw.growth,0,1)||!roomNumber(raw.moisture,0,100)||!roomNumber(raw.health,0,100)||!roomTime(raw.plantedAt)||!roomTime(raw.lastUpdated)||raw.lastUpdated<raw.plantedAt)throw new Error('В общем саду найдено повреждённое растение.');
  const plant={id:raw.id,lineageId:roomId(raw.lineageId)?raw.lineageId:raw.id,speciesId:raw.speciesId,growth:raw.growth,moisture:raw.moisture,health:raw.health,plantedAt:raw.plantedAt,lastUpdated:raw.lastUpdated};
  if(typeof raw.name==='string'&&raw.name.length<=60)plant.name=raw.name;
  if(roomObject(raw.appearance)){
    plant.appearance={};
    const allowed={pot:['clay','sage','cream','pink'],shape:['classic','tall','bowl'],material:['clay','glaze','paper','painted']};
    for(const [key,values]of Object.entries(allowed))if(values.includes(raw.appearance[key]))plant.appearance[key]=raw.appearance[key];
  }
  return plant;
}
function validateClassroom(raw) {
  if(!roomObject(raw)||raw.format!=='FloraKeepClassroomData'||raw.version!==1||!roomId(raw.id)||!roomTime(raw.createdAt)||!roomTime(raw.updatedAt)||raw.updatedAt<raw.createdAt||!Array.isArray(raw.plants)||raw.plants.length>100)throw new Error('Неверный формат общего сада.');
  const name=textLabel(raw.name,60,'Название сада'),ownerName=textLabel(raw.ownerName,40,'Псевдоним создателя');
  const keys=new Set(),plants=raw.plants.map(entry=>{
    if(!roomObject(entry)||!roomId(entry.key)||keys.has(entry.key)||!roomTime(entry.sharedAt))throw new Error('Неверная или повторная запись общего сада.');
    keys.add(entry.key);const plant=sharedPlant(entry.plant);
    if(entry.key!==plant.lineageId)throw new Error('Идентификатор общего растения не совпадает с его происхождением.');
    const note=contribution(entry.note);
    return {key:entry.key,contributor:textLabel(entry.contributor,40,'Псевдоним участника'),sharedAt:entry.sharedAt,plant,...(note?{note}:{})};
  });
  const removed=Array.isArray(raw.removed)?raw.removed:[];
  if(removed.length>10000||removed.some(x=>!roomObject(x)||!roomId(x.key)||!roomTime(x.at)))throw new Error('Повреждена история удалений общего сада.');
  if(new Set(plants.map(p=>p.contributor)).size>40)throw new Error('В общем саду может быть до 40 подписей участников.');
  const history=timeline(raw.history,CLASSROOM_HISTORY_LIMIT,entry=>{
    if(!['add','update','remove','resolve'].includes(entry.kind))throw new Error('Неизвестное действие в журнале общего сада.');
    return {kind:entry.kind};
  });
  const comments=timeline(raw.comments,CLASSROOM_COMMENT_LIMIT,entry=>({text:textLabel(entry.text,240,'Комментарий')}));
  if(raw.deltaSince!==undefined&&(!roomTime(raw.deltaSince)||raw.deltaSince<raw.createdAt||raw.deltaSince>raw.updatedAt))throw new Error('Неверная дата предыдущего обмена.');
  return {format:'FloraKeepClassroomData',version:1,id:raw.id,name,ownerName,createdAt:raw.createdAt,updatedAt:raw.updatedAt,plants,removed:removed.map(x=>({key:x.key,at:x.at})),history,comments,...(raw.deltaSince===undefined?{}:{deltaSince:raw.deltaSince})};
}
function createClassroom(name,ownerName) {
  const now=Date.now();return validateClassroom({format:'FloraKeepClassroomData',version:1,id:newRoomId(),name,ownerName,createdAt:now,updatedAt:now,plants:[],removed:[]});
}
function addClassroomPlants(room,plants,contributor,note='') {
  const result=validateClassroom(room),label=textLabel(contributor,40,'Псевдоним участника');
  if(!Array.isArray(plants)||!plants.length||plants.length>100)throw new Error('Выберите от 1 до 100 растений.');
  const message=contribution(note);
  const entries=new Map(result.plants.map(entry=>[entry.key,entry])),now=roomChangeTime(result),history=[];
  for(const raw of plants){
    const plant=sharedPlant(raw),key=plant.lineageId,previous=entries.get(key);
    const plantNote=message||previous?.note;
    entries.set(key,{key,contributor:label,sharedAt:now,plant,...(plantNote?{note:plantNote}:{})});
    history.push(roomEvent(previous?'update':'add',key,label,now));
  }
  if(entries.size>100)throw new Error('В общем саду помещается до 100 растений.');
  const addedKeys=new Set(plants.map(p=>p.lineageId||p.id));
  return validateClassroom({...result,plants:[...entries.values()],removed:result.removed.filter(e=>!addedKeys.has(e.key)),updatedAt:now,history:mergeTimeline(result.history,history,CLASSROOM_HISTORY_LIMIT)});
}
function removeClassroomPlants(room,ids,author=room?.ownerName) {
  const result=validateClassroom(room);if(!Array.isArray(ids))throw new Error('Не выбран список растений.');
  const label=textLabel(author,40,'Псевдоним участника');
  const selected=new Set(ids),at=roomChangeTime(result),removed=new Map(result.removed.map(e=>[e.key,e])),history=[];
  for(const p of result.plants)if(selected.has(p.key)){
    removed.set(p.key,{key:p.key,at});
    history.push(roomEvent('remove',p.key,label,at));
  }
  if(!history.length)return result;
  return validateClassroom({...result,plants:result.plants.filter(p=>!selected.has(p.key)),removed:[...removed.values()],history:mergeTimeline(result.history,history,CLASSROOM_HISTORY_LIMIT),updatedAt:at});
}
function setContributionNote(room,key,note,author) {
  const current=validateClassroom(room),target=current.plants.find(item=>item.key===key);
  if(!target)throw new Error('Растение исчезло из общего сада.');
  const label=textLabel(author,40,'Псевдоним участника'),at=roomChangeTime(current);
  const plants=current.plants.map(item=>item.key===key?{...item,note:contribution(note),sharedAt:at}:item);
  const history=mergeTimeline(current.history,[roomEvent('update',key,label,at)],CLASSROOM_HISTORY_LIMIT);
  return validateClassroom({...current,plants,history,updatedAt:at});
}
function addClassroomComment(room,key,text,author) {
  const current=validateClassroom(room);
  if(!current.plants.some(item=>item.key===key))throw new Error('Растение исчезло из общего сада.');
  const at=roomChangeTime(current);
  const comment={id:newRoomId(),key,at,author,text};
  return validateClassroom({...current,comments:mergeTimeline(current.comments,[comment],CLASSROOM_COMMENT_LIMIT),updatedAt:at});
}
function classroomDelta(room,since) {
  const current=validateClassroom(room);
  if(!roomTime(since)||since<current.createdAt||since>current.updatedAt)throw new Error('Выберите отметку предыдущего обмена.');
  const after=list=>list.filter(entry=>(entry.sharedAt??entry.at)>since);
  return validateClassroom({...current,deltaSince:since,plants:after(current.plants),removed:after(current.removed),history:after(current.history),comments:after(current.comments)});
}
function classroomVersions(room){
  const versions=new Map(room.plants.map(entry=>[entry.key,{kind:'plant',at:entry.sharedAt,entry}]));
  for(const removed of room.removed)if(!versions.has(removed.key)||versions.get(removed.key).at<=removed.at){
    versions.set(removed.key,{kind:'removed',at:removed.at,entry:removed});
  }
  return versions;
}
function sameVersion(a,b){
  if(a?.kind!==b?.kind)return false;
  if(!a||a.kind==='removed')return true;
  const {sharedAt: _first,...first}=a.entry, {sharedAt: _second,...second}=b.entry;
  return JSON.stringify(first)===JSON.stringify(second);
}
function preferredVersion(a,b){
  if(!a)return b;
  if(!b)return a;
  return b.at>a.at || (b.at===a.at && b.kind==='removed') ? b : a;
}
function getClassroomMerge(current,incoming){
  const a=validateClassroom(current),b=validateClassroom(incoming);
  if(a.id!==b.id)throw new Error('Это другой общий сад. Откройте его отдельно, а не объединяйте.');
  if(a.deltaSince!==undefined || (b.deltaSince!==undefined&&a.updatedAt<b.deltaSince))throw new Error('Сначала откройте полный общий файл; этот файл содержит только более поздние изменения.');
  const left=classroomVersions(a),right=classroomVersions(b);
  const rows=[...new Set([...left.keys(),...right.keys()])].map(key=>{
    const mine=left.get(key),theirs=right.get(key),chosen=preferredVersion(mine,theirs);
    return {key,mine,theirs,chosen,conflict:Boolean(mine&&theirs&&!sameVersion(mine,theirs))};
  });
  return {a,b,rows};
}
function classroomDiff(current,incoming){
  const {a,b,rows}=getClassroomMerge(current,incoming);
  const changes=rows.filter(row=>row.conflict||!sameVersion(row.mine,row.chosen)).map(row=>({
    ...row,kind:row.chosen?.kind==='removed'?'remove':row.mine?.kind!=='plant'?'add':'update',
  }));
  const known=new Set(a.comments.map(comment=>comment.id));
  return {changes,newComments:b.comments.filter(comment=>!known.has(comment.id)).length};
}
function mergeClassrooms(current,incoming,choices={},author=current?.ownerName) {
  const {a,b,rows}=getClassroomMerge(current,incoming);
  const at=roomChangeTime(a,b),history=[],plants=[],removed=[];
  let added=0,updated=0,skipped=0;
  for(const row of rows){
    const selection=Object.hasOwn(choices,row.key)?choices[row.key]:'';
    let version=row.chosen;
    if(row.conflict && (selection==='current'||selection==='incoming')){
      version=selection==='current'?row.mine:row.theirs;
      history.push(roomEvent('resolve',row.key,textLabel(author,40,'Псевдоним участника'),at));
      const timeField=version.kind==='plant'?'sharedAt':'at';
      version={...version,at,entry:{...version.entry,[timeField]:at}};
    }
    if(version.kind==='removed')removed.push(version.entry);
    if(version.kind==='plant'){
      plants.push(version.entry);
      if(row.mine?.kind!=='plant')added++;
      else if(!sameVersion(row.mine,version))updated++;
      else if(row.theirs)skipped++;
    }
  }
  if(plants.length>100)throw new Error('После объединения получится больше 100 растений. Сначала освободите место в композиции.');
  const room=validateClassroom({...a,plants,removed,updatedAt:at,history:mergeTimeline(mergeTimeline(a.history,b.history,CLASSROOM_HISTORY_LIMIT),history,CLASSROOM_HISTORY_LIMIT),comments:mergeTimeline(a.comments,b.comments,CLASSROOM_COMMENT_LIMIT)});
  return {room,added,updated,skipped};
}
function cryptography() {
  if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)throw new Error('В этом браузере недоступно шифрование локальных файлов. Откройте index.html в современном Edge, Chrome или Safari.');
  return globalThis.crypto;
}
function passwordText(password) {
  if(typeof password!=='string'||password.length<10||password.length>128)throw new Error('Пароль общего файла: от 10 до 128 символов.');
  return password;
}
function toBase64(bytes){let text='';for(const n of bytes)text+=String.fromCharCode(n);return btoa(text);}
function fromBase64(text,max) {
  if(typeof text!=='string'||text.length>Math.ceil(max/3)*4+4||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))throw new Error('Повреждено содержимое зашифрованного файла.');
  const binary=atob(text);if(binary.length>max)throw new Error('Зашифрованный файл слишком большой.');return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function derive(password,salt) {
  const crypto=cryptography();
  const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(passwordText(password)),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:CLASSROOM_ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encodeClassroom(room,password) {
  const checked=validateClassroom(room),bytes=new TextEncoder().encode(JSON.stringify(checked));
  if(bytes.length>CLASSROOM_MAX_BYTES-1000)throw new Error('Общий сад слишком большой для передачи.');
  const version=checked.deltaSince===undefined?1:2;
  const crypto=cryptography(),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const key=await derive(password,salt),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`FloraKeepClassroom:${version}`)},key,bytes);
  return {format:'FloraKeepClassroom',version,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:CLASSROOM_ITERATIONS,salt:toBase64(salt),iv:toBase64(iv),ciphertext:toBase64(new Uint8Array(encrypted))};
}
async function decodeClassroom(text,password) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>CLASSROOM_MAX_BYTES*1.4)throw new Error('Файл общего сада слишком большой.');
  let data;try{data=JSON.parse(text);}catch{throw new Error('Не удалось прочитать файл общего сада.');}
  if(!roomObject(data)||data.format!=='FloraKeepClassroom'||![1,2].includes(data.version)||data.cipher!=='AES-256-GCM'||data.kdf!=='PBKDF2-SHA256'||data.iterations!==CLASSROOM_ITERATIONS)throw new Error('Неподдерживаемый формат зашифрованного общего сада.');
  const salt=fromBase64(data.salt,16),iv=fromBase64(data.iv,12),encrypted=fromBase64(data.ciphertext,CLASSROOM_MAX_BYTES);
  if(salt.length!==16||iv.length!==12||encrypted.length<16)throw new Error('В зашифрованном файле отсутствуют необходимые данные.');
  const key=await derive(password,salt);let plain;
  try{plain=await cryptography().subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(`FloraKeepClassroom:${data.version}`)},key,encrypted);}catch{throw new Error('Пароль не подходит или файл повреждён. Общий сад не изменён.');}
  try{
    const room=validateClassroom(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain)));
    if((data.version===2)!==(room.deltaSince!==undefined))throw new Error('Тип защищённого файла не совпадает с содержимым.');
    return room;
  }catch(error){if(error instanceof SyntaxError)throw new Error('Расшифрованный файл содержит неверный JSON.');throw error;}
}

return Object.freeze({ CLASSROOM_MAX_BYTES, validateClassroom, createClassroom, addClassroomPlants, removeClassroomPlants, setContributionNote, addClassroomComment, classroomDelta, classroomDiff, mergeClassrooms, encodeClassroom, decodeClassroom });
})();
