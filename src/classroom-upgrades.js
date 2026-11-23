const classroomUpgrades = (() => {
const changeLabels={add:'Добавлено',update:'Изменено',remove:'Удалено',resolve:'Конфликт разрешён'};
const formatDate=value=>new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'}).format(value);

const thumbnailPots=new Map([['clay','#bc8063'],['sage','#93a68c'],['cream','#e1c5a0'],['pink','#c7898f']]);
function exhibitThumbnail(plant){
  const color=thumbnailPots.get(plant.appearance?.pot)||thumbnailPots.get('clay');
  const id=plant.speciesId;
  const leaves=['cactus','aloe'].includes(id)
    ? '<path d="M49 59C37 39 42 18 51 12 58 23 63 42 51 59M53 58Q61 37 75 28Q73 49 53 58M47 58Q21 43 25 30Q39 32 47 58" fill="#749a71" stroke="#537b62"/>'
    : '<path d="M50 65V25M50 49l-16-9M50 43l18-13" fill="none" stroke="#51765d" stroke-width="2.6"/><path d="M49 55q-24 0-23-20q17-4 23 20M51 47q17-25 29-15q-2 13-29 15M49 41Q38 26 49 20q13 5 0 21" fill="#81a582"/>';
  const flowers=({daisy:'#fcf1cb',lavender:'#a787b6',sunflower:'#e4ab49',tulip:'#d98b84',rose:'#c57889',orchid:'#cfa4bd'})[id];
  const flower=typeof flowers==='string'?`<g fill="${flowers}" stroke="#a18b63" stroke-width=".6"><path d="M50 25C37 28 37 17 43 15C39 6 51 4 52 12C62 7 68 19 58 20C63 28 54 30 50 25Z"/><circle cx="51" cy="18" r="2.7" fill="#c29552"/></g>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 94" aria-hidden="true" focusable="false"><rect width="100" height="94" rx="9" fill="#eaefdc"/><ellipse cx="50" cy="84" rx="35" ry="4" fill="#9aa88b" opacity=".24"/>${leaves}${flower}<path d="M31 61H69L63 82Q50 87 37 82Z" fill="${color}"/><path d="M29 61q20-6 42 0v4q-22 6-42 0Z" fill="${color}" stroke="#805f4b" stroke-width=".8"/></svg>`;
}

const exhibitCSS=`
:root{font-family:system-ui,sans-serif;color:#253d2d;background:#f6f4e8;line-height:1.5}*{box-sizing:border-box}main{max-width:65rem;padding:clamp(1rem,4vw,2.25rem);margin:auto}h1,h2,h3{font-family:Georgia,serif;line-height:1.18}h1{font-weight:500;font-size:clamp(2rem,8vw,4.3rem);margin:0 0 1.5rem;overflow-wrap:anywhere}h2{margin-top:2rem}ul,ol{list-style:none;padding:0}.exhibit-index{padding:1rem 1.15rem;background:#fffcf1;border:1px solid #c9d1bd;border-radius:.9rem}.exhibit-index h2{margin-top:0}.exhibit-index h3{margin-top:.85rem}.exhibit-index ul,.exhibit-cards,.exhibit-labels{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr));gap:.75rem}.exhibit-index a{display:grid;grid-template-columns:3.3rem minmax(0,1fr);align-items:center;gap:.55rem;color:inherit;text-underline-offset:.2em}.exhibit-index svg{width:100%;height:auto}.exhibit-index a:focus-visible{outline:2px solid #355f4b;outline-offset:4px}.exhibit-cards li,.exhibit-labels li,.exhibit-poster{background:#fffdf4;border:1px solid #ccd8c5;border-radius:.65rem;padding:1rem;break-inside:avoid;overflow-wrap:anywhere}.exhibit-cards svg{display:block;width:100%;height:auto;max-height:12rem}.exhibit-cards h3,.exhibit-labels h3{margin:.65rem 0 .3rem}.exhibit-cards p,.exhibit-labels p,.exhibit-poster p{margin:.32rem 0}.species,.exhibit-credit{font-size:.9rem;color:#49624f}.exhibit-label-number{font:600 2.35rem/1 Georgia,serif;color:#365d46}.exhibit-poster{display:grid;justify-items:center;text-align:center;gap:.65rem;margin-bottom:1rem;padding:clamp(1rem,5vw,3rem);background:#f4eddf}.exhibit-poster svg{width:min(100%,27rem);height:auto}.exhibit-poster h2{font-size:clamp(1.55rem,4vw,2.75rem);margin:0}.exhibit-poster-notes{max-width:36rem}.exhibit-labels li{min-height:6.8rem;border-style:dashed}@media print{@page{size:A4;margin:15mm}:root,.exhibit-index,li,.exhibit-poster{background:white;color:#1d3124}main{padding:0}h1{font-size:2rem}.exhibit-labels{grid-template-columns:repeat(2,minmax(0,1fr));gap:6mm}.exhibit-labels li{min-height:30mm;border-color:#777}.exhibit-poster svg{max-height:125mm}a{text-decoration:none}}
`;
function exhibitHTML(rooms,{title='Выставка Flora Keep',withAuthors=true,speciesName=id=>id,esc,mode='display',heroKey='',plantArt}={}){
  let number=0;
  const grouped=rooms.map(({name,entries},roomIndex)=>({name,entries:entries.map((entry,index)=>({
    entry,anchor:'exhibit-'+roomIndex+'-'+index,number:++number
  }))}));
  const names=entry=>({species:speciesName(entry.plant.speciesId),name:entry.plant.name||speciesName(entry.plant.speciesId)});
  const author=entry=>withAuthors?`<p class="exhibit-credit">Автор: ${esc(entry.contributor)}</p>`:'';
  const all=grouped.flatMap(room=>room.entries);
  let layout='';
  if(mode==='labels'){
    layout=`<ol class="exhibit-labels">${all.map(({entry,number})=>{
      const {species,name}=names(entry);
      return `<li><span class="exhibit-label-number" aria-label="Экспонат ${number}">${String(number).padStart(2,'0')}</span><h3>${esc(name)}</h3><p class="species">${esc(species)}</p>${entry.note?`<p>${esc(entry.note.slice(0,140))}</p>`:''}${author(entry)}</li>`;
    }).join('')}</ol>`;
  }else{
    const hero=mode==='poster'?all.find(row=>row.entry.key===heroKey)||all[0]:null;
    const index=mode==='catalog'?`<nav class="exhibit-index" aria-label="Оглавление выставки"><h2>Оглавление</h2>${grouped.map(({name,entries})=>`<h3>${esc(name)}</h3><ul>${entries.map(({entry,anchor})=>`<li><a href="#${anchor}">${exhibitThumbnail(entry.plant)}<span>${esc(names(entry).name)}</span></a></li>`).join('')}</ul>`).join('')}</nav>`:'';
    const poster=hero?posterMarkup(hero.entry):'';
    const sections=grouped.map(({name,entries})=>`<section><h2>${esc(name)}</h2><ul class="exhibit-cards">${entries.filter(row=>row!==hero).map(({entry,anchor})=>{
      const labels=names(entry);
      return `<li id="${anchor}">${exhibitThumbnail(entry.plant)}<h3>${esc(labels.name)}</h3><p class="species">${esc(labels.species)}</p>${author(entry)}${entry.note?`<p>${esc(entry.note)}</p>`:''}</li>`;
    }).join('')}</ul></section>`).join('');
    layout=poster+index+(hero&&all.length===1?'':sections);
  }
  function posterMarkup(entry){
    const labels=names(entry),plant=entry.plant;
    const artwork=plantArt?.(plant.speciesId,{id:'classroom-poster',growth:Math.max(.12,plant.growth||0),...plant.appearance});
    const safe=typeof artwork==='string'&&/^<svg\b/.test(artwork)&&!/<(?:script|foreignObject)\b|\son\w+\s*=|(?:href|src)\s*=\s*['"](?!#|data:image\/)/i.test(artwork);
    return `<article class="exhibit-poster">${safe?artwork:exhibitThumbnail(plant)}<h2>${esc(labels.name)}</h2><p class="species">${esc(labels.species)}</p>${author(entry)}${entry.note?`<p class="exhibit-poster-notes">${esc(entry.note)}</p>`:''}</article>`;
  }
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>${esc(title)}</title><style>${exhibitCSS}</style></head><body><main><h1>${esc(title)}</h1>${layout}</main></body></html>`;
}

function create({api,open,getRoom,saveRoom,showRoom}){
  const {esc,exchange}=api;
  const catalogRooms=new Map();
  let incoming=null, exhibit=null;
  const speciesName=id=>api.game.CATALOG.find(species=>species.id===id)?.name||id;
  const entryName=entry=>entry.plant.name||speciesName(entry.plant.speciesId);
  const button=(action,label,id='')=>`<button type="button" class="button secondary" data-feature="${action}"${id?` data-id="${esc(id)}"`:''}>${esc(label)}</button>`;
  const submitButton=label=>`<button class="button primary" type="submit">${esc(label)}</button>`;
  const authorField=()=>'<label class="field"><span>Ваш псевдоним</span><input name="author" required maxlength="40" autocomplete="off"></label>';
  const noteField=(label,value='',required=false)=>`<label class="field"><span>${esc(label)}</span><textarea name="message" maxlength="240"${required?' required':''}>${esc(value)}</textarea></label>`;
  const passwordField=()=>'<label class="field"><span>Пароль общего файла</span><input type="password" name="password" required minlength="10" maxlength="128" autocomplete="off"></label>';
  const openForm=(title,action,body,label)=>open(title,`<form data-feature-form="${action}">${body}${submitButton(label)}</form>`);
  const current=()=>{
    const room=getRoom();
    if(!room)throw new Error('Сначала откройте общий сад.');
    return room;
  };
  const selectedEntry=key=>{
    const entry=current().plants.find(item=>item.key===key);
    if(!entry)throw new Error('Растение исчезло из общего сада.');
    return entry;
  };
  const saveAndShow=value=>{saveRoom(value);showRoom();};
  const stampKey=room=>`${api.storageKey}-classroom-export-${room.id}`;
  function recordFullExport(room){
    try{localStorage.setItem(stampKey(room),String(room.updatedAt));}catch{}
  }
  function previousExport(room){
    try{
      const raw=localStorage.getItem(stampKey(room));
      const stamp=Number(raw);
      if(raw&&Number.isSafeInteger(stamp)&&stamp>=room.createdAt&&stamp<=room.updatedAt)return stamp;
    }catch{}
    return null;
  }
  function tools(room){
    if(!room)return '';
    const cards=room.plants.map(entry=>`<li><strong>${esc(entryName(entry))}</strong> · ${esc(entry.contributor)}${entry.note?`<p>${esc(entry.note)}</p>`:''}<div class="collection-actions">${button('room-plus-note','Заметка о вкладе',entry.key)}${button('room-plus-comments','Комментарии',entry.key)}</div></li>`).join('');
    return `<details><summary>Журнал, выставка и обмен изменениями</summary><div class="collection-actions">${button('room-plus-history','Журнал изменений')}${button('room-plus-delta','Файл изменений')}${button('room-plus-exhibit','Выставочная копия')}${button('room-plus-poster','Афиша для печати')}${button('room-plus-labels','Этикетки экспонатов')}${button('room-plus-catalog','Каталог команд')}</div>${cards?`<ul>${cards}</ul>`:''}</details>`;
  }
  function versionLabel(version){
    if(!version)return 'Нет записи';
    if(version.kind==='removed')return `Удалено · ${formatDate(version.at)}`;
    const entry=version.entry;
    const styles={clay:'терракота',sage:'шалфей',cream:'крем',pink:'розовый',classic:'классический',tall:'высокий',bowl:'чаша',glaze:'глазурь',paper:'бумага',painted:'роспись'};
    const pot=Object.values(entry.plant.appearance||{}).map(value=>styles[value]).filter(Boolean).join(', ');
    return `${entryName(entry)} · ${entry.contributor} · рост ${Math.round(entry.plant.growth*100)}%, влага ${Math.round(entry.plant.moisture)}%, здоровье ${Math.round(entry.plant.health)}%${pot?` · горшок: ${pot}`:''} · ${formatDate(version.at)}${entry.note?` · ${entry.note}`:''}`;
  }
  function openImport(room){
    incoming=room;
    const own=getRoom();
    if(!own||own.id!==room.id){
      if(room.deltaSince!==undefined)throw new Error('Сначала откройте полный файл этого общего сада.');
      openForm('Открыть общий сад','room-plus-merge',`<p>${esc(room.name)} · растений ${room.plants.length}. Эта копия откроется как текущий общий сад.</p>${button('classroom','Отмена')}`,'Открыть');
      return;
    }
    const diff=exchange.classroomDiff(own,room);
    const list=diff.changes.map(row=>`<li><strong>${esc(changeLabels[row.kind])}</strong><p>У вас: ${esc(versionLabel(row.mine))}</p><p>Из файла: ${esc(versionLabel(row.theirs))}</p>${row.conflict?`<label class="field"><span>Выбор версии для ${esc((row.mine?.entry?.plant&&entryName(row.mine.entry))||(row.theirs?.entry?.plant&&entryName(row.theirs.entry))||row.key)}</span><select name="pick-${esc(row.key)}"><option value="">Более свежая версия</option><option value="current">Оставить местную</option><option value="incoming">Взять из файла</option></select></label>`:''}</li>`).join('');
    const conflicts=diff.changes.some(row=>row.conflict);
    const author=conflicts?'<label class="field"><span>Псевдоним для журнала при ручном выборе</span><input name="author" maxlength="40" autocomplete="off"></label>':'';
    openForm('Сравнить версии общего сада','room-plus-merge',`<p>${room.deltaSince!==undefined?`Изменения после ${esc(formatDate(room.deltaSince))}. `:''}Изменений растений: ${diff.changes.length}. Новых комментариев: ${diff.newComments}.</p>${list?`<ol>${list}</ol>`:'<p>Изменений растений нет.</p>'}${author}${button('classroom','Отмена')}`,'Объединить');
  }
  function openHistory(){
    const room=current(),entries=new Map(room.plants.map(entry=>[entry.key,entryName(entry)]));
    const list=[...room.history].reverse().map(event=>`<li><time datetime="${new Date(event.at).toISOString()}">${esc(formatDate(event.at))}</time> · ${esc(event.author)} · ${esc(changeLabels[event.kind])} · ${esc(entries.get(event.key)||'Архивное растение')}</li>`).join('');
    open('Журнал общего сада',`${list?`<ol>${list}</ol>`:'<p>Здесь появятся обновления от участников.</p>'}${button('classroom','К общему саду')}`);
  }
  function openComments(key){
    const entry=selectedEntry(key);
    const list=current().comments.filter(comment=>comment.key===key).map(comment=>`<li><strong>${esc(comment.author)}</strong> · ${esc(formatDate(comment.at))}<p>${esc(comment.text)}</p></li>`).join('');
    openForm(`Комментарии · ${entryName(entry)}`,'room-plus-add-comment',`${list?`<ol>${list}</ol>`:'<p>Комментариев пока нет.</p>'}<input name="key" type="hidden" value="${esc(key)}">${authorField()}${noteField('Комментарий','',true)}${button('classroom','К общему саду')}`,'Добавить комментарий');
  }
  function openDelta(){
    const room=current(),since=previousExport(room);
    const description=since===null?'Скачайте полный файл, чтобы задать исходную точку обмена.':`Отметка предыдущего обмена: ${formatDate(since)}. После неё в файл попадут изменённые растения, удаления, комментарии и записи журнала.`;
    const delta=since===null?null:exchange.classroomDelta(room,since);
    const summary=(label,entries)=>`<details><summary>${esc(label)}</summary><p>${entries.map(item=>`${esc(entryName(item))} · ${esc(item.contributor)}`).join(' / ')||'Нет растений'}</p></details>`;
    openForm('Файл изменений','room-plus-delta-export',`<p>${esc(description)}</p><label class="field"><span>Содержимое</span><select name="mode"><option value="full">Полная копия с новой отметкой</option>${delta?'<option value="delta" selected>Только изменения</option>':''}</select></label>${summary('Растения и авторы в полной копии',room.plants)}${delta?summary('Растения и авторы в файле изменений',delta.plants):''}${passwordField()}`,'Скачать защищённый файл');
  }
  function openRemove(key){
    const entry=selectedEntry(key);
    openForm('Убрать выставочное растение','room-plus-remove-entry',`<p>${esc(entryName(entry))} исчезнет из общего сада. В журнале останется запись.</p><input type="hidden" name="key" value="${esc(key)}">${authorField()}${button('classroom','Отмена')}`,'Убрать растение');
  }
  function openExhibit(mode){
    const room=current();
    const list=room.plants.map(entry=>`<label><input type="checkbox" name="entry" value="${esc(entry.key)}" checked> ${esc(entryName(entry))} · ${esc(entry.contributor)}${entry.note?` · ${esc(entry.note)}`:''}</label>`).join('');
    const hero=mode==='poster'&&list?`<label class="field"><span>Главный экспонат</span><select name="hero">${room.plants.map(entry=>`<option value="${esc(entry.key)}">${esc(entryName(entry))}</option>`).join('')}</select></label>`:'';
    const titles={poster:'Афиша для печати',labels:'Этикетки экспонатов',display:'Выставочная копия'};
    const empty=`<div class="exhibit-empty">${api.art?.emptyState?.('exhibit')||''}<p>Добавьте в общий сад хотя бы одно растение.</p></div>`;
    openForm(titles[mode],'room-plus-prepare-exhibit',`<input name="mode" type="hidden" value="${mode}"><label class="field"><span>Заголовок</span><input name="title" maxlength="90" value="${esc(room.name)}" required></label>${hero}<div class="batch-list">${list||empty}</div><label class="check-field"><input type="checkbox" name="authors" checked> Показать имена авторов</label><label class="check-field"><input type="checkbox" name="notes" checked> Показать заметки о вкладе</label>`,'Проверить содержимое');
  }
  function openCatalog(){
    const own=current();
    const teams=[own,...catalogRooms.values()];
    const names=teams.map(room=>`<li>${esc(room.name)} · растений ${room.plants.length}${room.id!==own.id?` ${button('room-plus-team-remove','Убрать из каталога',room.id)}`:''}</li>`).join('');
    openForm('Каталог команд','room-plus-team-add',`<ol>${names}</ol><label class="field"><span>Защищённый файл другой команды</span><input name="file" type="file" accept=".json,application/json" required></label>${passwordField()}${button('room-plus-team-export','Скачать каталог команд')}`,'Добавить команду');
  }
  function exportExhibit(rooms,options,filename){
    const html=exhibitHTML(rooms,{...options,speciesName,esc,plantArt:api.art?.plantArt});
    api.download(new Blob([html],{type:'text/html;charset=utf-8'}),filename);
  }
  function handle(action,id){
    if(action==='room-plus-history')return openHistory();
    if(action==='room-plus-comments')return openComments(id);
    if(action==='room-plus-remove')return openRemove(id);
    if(action==='room-plus-note'){
      const entry=selectedEntry(id);
      return openForm(`Заметка · ${entryName(entry)}`,'room-plus-save-note',`<input name="key" type="hidden" value="${esc(id)}">${authorField()}${noteField('Что вы сделали и почему',entry.note)}`,'Сохранить заметку');
    }
    if(action==='room-plus-delta')return openDelta();
    if(action==='room-plus-exhibit')return openExhibit('display');
    if(action==='room-plus-poster')return openExhibit('poster');
    if(action==='room-plus-labels')return openExhibit('labels');
    if(action==='room-plus-catalog')return openCatalog();
    if(action==='room-plus-team-remove'){catalogRooms.delete(id);return openCatalog();}
    if(action==='room-plus-team-export'){
      const teams=[current(),...catalogRooms.values()];
      return exportExhibit(teams.map(room=>({name:room.name,entries:room.plants})),{title:'Каталог команд Flora Keep',mode:'catalog'},'flora-classroom-catalog.html');
    }
    if(action==='room-plus-exhibit-download'&&exhibit){
      const names={poster:'flora-classroom-poster.html',labels:'flora-classroom-labels.html',display:'flora-classroom-exhibit.html'};
      return exportExhibit(exhibit.rooms,exhibit.options,names[exhibit.mode]);
    }
  }
  async function submit(kind,form){
    const get=name=>String(form.get(name)||'');
    if(kind==='room-plus-merge'&&incoming){
      const own=getRoom();
      const choices=Object.fromEntries([...form].filter(([key,value])=>key.startsWith('pick-')&&value).map(([key,value])=>[key.slice(5),value]));
      const author=get('author').trim();
      if(Object.keys(choices).length&&!author)throw new Error('Укажите псевдоним для ручного выбора версии.');
      const result=own?.id===incoming.id?exchange.mergeClassrooms(own,incoming,choices,author||own.ownerName).room:incoming;
      incoming=null;
      return saveAndShow(result);
    }
    if(kind==='room-plus-save-note')return saveAndShow(exchange.setContributionNote(current(),get('key'),get('message'),get('author')));
    if(kind==='room-plus-remove-entry')return saveAndShow(exchange.removeClassroomPlants(current(),[get('key')],get('author')));
    if(kind==='room-plus-add-comment'){
      const key=get('key');
      saveRoom(exchange.addClassroomComment(current(),key,get('message'),get('author')));
      return openComments(key);
    }
    if(kind==='room-plus-delta-export'){
      const room=current(),delta=get('mode')==='delta';
      const data=delta?exchange.classroomDelta(room,previousExport(room)):room;
      const encrypted=await exchange.encodeClassroom(data,get('password'));
      api.download(new Blob([JSON.stringify(encrypted)],{type:'application/json'}),delta?'flora-classroom-changes.json':'flora-classroom.encrypted.json');
      recordFullExport(room);
      return showRoom();
    }
    if(kind==='room-plus-prepare-exhibit'){
      const room=current(),ids=new Set(form.getAll('entry'));
      const withAuthors=form.has('authors');
      const entries=room.plants.filter(entry=>ids.has(entry.key)).map(entry=>form.has('notes')?entry:{...entry,note:''});
      if(!entries.length)throw new Error('Выберите хотя бы одно растение.');
      const title=get('title').trim().slice(0,90)||room.name;
      const mode=['poster','labels'].includes(get('mode'))?get('mode'):'display';
      const hero=mode==='poster'?(entries.find(entry=>entry.key===get('hero'))||entries[0]):null;
      exhibit={rooms:[{name:room.name,entries}],options:{title,withAuthors,mode,heroKey:hero?.key},mode};
      const list=entries.map(entry=>`<li><strong>${esc(entryName(entry))}</strong>${withAuthors?` · ${esc(entry.contributor)}`:''}${entry.note?`<p>${esc(entry.note)}</p>`:''}</li>`).join('');
      const preview=hero?`<figure class="exhibit-poster-preview">${exhibitThumbnail(hero.plant)}<figcaption><strong>${esc(entryName(hero))}</strong>${withAuthors?`<small>Автор: ${esc(hero.contributor)}</small>`:''}</figcaption></figure>`:'';
      const edit={poster:'room-plus-poster',labels:'room-plus-labels',display:'room-plus-exhibit'};
      return open('Проверьте выставочную копию',`<h3>${esc(title)}</h3>${preview}<ol>${list}</ol>${button('room-plus-exhibit-download','Скачать HTML')}${button(edit[mode],'Изменить подборку')}`);
    }
    if(kind==='room-plus-team-add'){
      const file=form.get('file');
      if(!file||typeof file.text!=='function'||!file.size||file.size>2*1024*1024)throw new Error('Выберите защищённый файл команды до 2 МБ.');
      const room=await exchange.decodeClassroom(await file.text(),get('password'));
      if(room.deltaSince!==undefined)throw new Error('Для каталога нужен полный файл команды.');
      if(room.id===current().id)throw new Error('Текущий сад уже включён в каталог.');
      if(catalogRooms.size>=12&&!catalogRooms.has(room.id))throw new Error('В каталог помещаются ещё 12 команд.');
      catalogRooms.set(room.id,room);
      return openCatalog();
    }
  }
  return {tools,handle,submit,openImport,recordFullExport};
}

return Object.freeze({create,exhibitHTML});
})();
