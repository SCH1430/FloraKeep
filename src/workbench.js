const floraWorkbench = (() => {
  const text = (value, limit=120) => typeof value === 'string' ? value.trim().slice(0,limit) : '';
  const asList = value => Array.isArray(value) ? value : [];
  const stamp = value => Number.isSafeInteger(value) && value >= 0 && value < 8640000000000000 ? value : 0;
  const normalizeAssignment = raw => ({
    title:text(raw?.title,80), goal:text(raw?.goal,500), materials:text(raw?.materials,300),
    criteria:text(raw?.criteria,500), example:text(raw?.example,500),
    minutes:Number.isInteger(raw?.minutes) ? Math.max(5,Math.min(120,raw.minutes)) : 20,
  });
  const defaultAssignment = Object.freeze({
    title:'Как два режима полива влияют на рост?', minutes:20,
    goal:'Сравнить рост двух одинаковых ромашек и объяснить результат.',
    materials:'Flora Keep, лист наблюдений, карандаш.',
    example:'Гипотеза: при регулярном поливе растение дольше сохранит влагу. В таблице зафиксированы время, рост и влажность обоих растений.',
    criteria:'Есть гипотеза, одинаковые начальные условия, числа из двух групп и вывод.',
  });
  const actions = Object.freeze([
    ['supplies','Запасы и колодец','вода монеты магазин ресурсы'],
    ['settings','Настройки сада','тема движение звук размер'],
    ['help','Помощь Жужи','обучение первый запуск'],
    ['catalog','Каталог растений','семена посадка'],
    ['garden','Мой сад','главная растения'],
    ['herbarium','Гербарий','справочник виды'],
    ['journal','Журнал роста','записи календарь'],
    ['backup-center','Сохранения','копия json экспорт перенос бэкап'],
    ['terrariums','Флорариумы','стекло мох композиция'],
    ['atelier','Гончарное ателье','горшок вазон'],
    ['scene-studio','Маленький театр','сцены спектакль'],
    ['flight','Полёт Жужи','пчела поляна нектар'],
    ['studio','Фотостудия','открытка фото png gif'],
    ['school','Учебная лаборатория','школа урок эксперимент'],
    ['portfolio','Выставка и портфолио','галерея сад работы выставка'],
    ['bee-stories','Истории Жужи','рассказы вехи жуже'],
    ['feedback','Сообщить об ошибке','отчёт диагностика предложение'],
    ['species-proposal','Предложить новый вид','семена предложение ботаника новый вид'],
  ]);
  const actionKeys = new Set(actions.map(([key]) => key));
  function normalize(raw) {
    return {
      favorites:[...new Set(asList(raw?.favorites).filter(key => actionKeys.has(key)))].slice(0,6),
      assignment:raw?.assignment?.title ? normalizeAssignment(raw.assignment) : defaultAssignment,
      hypothesis:text(raw?.hypothesis,500),
      archive:asList(raw?.archive).slice(-30).filter(row => row && typeof row === 'object')
        .map(row => ({at:stamp(row.at),hypothesis:text(row.hypothesis,500),conclusion:text(row.conclusion,500),
          rhythm:[12,24,36].includes(row.rhythm) ? row.rhythm : 24})),
      volumes:{music:volume(raw?.volumes?.music,.14), effects:volume(raw?.volumes?.effects,.35), atmosphere:volume(raw?.volumes?.atmosphere,.2)},
      soundscape:['rain','wind'].includes(raw?.soundscape)?raw.soundscape:'off',
      soundCaptions:raw?.soundCaptions===true,
      atmospheres:asList(raw?.atmospheres).filter(item=>typeof item?.name==='string' && item.name.trim()).slice(-8).map(item=>({
        name:text(item.name,60),
        light:['auto','day','dawn','sunset','night'].includes(item.light)?item.light:'auto',
        weather:['clear','rain','snow'].includes(item.weather)?item.weather:'clear',
        soundscape:['rain','wind'].includes(item.soundscape)?item.soundscape:'off',
      })),
    };
  }
  function volume(value, fallback) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(0,Math.min(1,value)) : fallback; }
  function simulateExperiment(game, interval) {
    const start = 1_800_000_000_000;
    const hour = 60*60*1000;
    const planted = game.plant(game.initialState(start),'daisy',start).state;
    const id = planted.selectedPlantId;
    let frequent = {...planted,water:20};
    let sparse = frequent;
    const rows = [];
    for (let at=0;at<=72;at+=6) {
      const now = start + at*hour;
      frequent = game.advance(frequent, now);
      sparse = game.advance(sparse, now);
      if (at && at%12===0) frequent = game.water(frequent,id,now).state;
      if (at && at%interval===0) sparse = game.water(sparse,id,now).state;
      const sample = ({plants}) => {
        const plant = plants[0];
        return {growth:Math.round(plant.growth*100),moisture:Math.round(plant.moisture),health:Math.round(plant.health)};
      };
      rows.push({at,a:sample(frequent),b:sample(sparse)});
    }
    return rows;
  }
  function create(api) {
    const data = () => api.extras.workbench;
    const {esc} = api;
    const $ = selector => document.querySelector(selector);
    const actionButton = (action,label) => `<button type="button" class="button secondary" data-workbench="${action}">${label}</button>`;
    const field = (key,label,value='',type='text') => `<label class="field"><span>${label}</span><input type="${type}" name="${key}" value="${esc(value)}" required></label>`;
    const area = (key,label,value='',max=500) => `<label class="field"><span>${label}</span><textarea name="${key}" maxlength="${max}" rows="3">${esc(value)}</textarea></label>`;
    const saveFile = (name,value,type='application/json') => api.download(new Blob([value],{type}),name);
    const open = (title,body,kind) => api.showDialog(title,body,kind,true);
    let rhythm = 24;
    function afterRender() {
      const toolbar = $('.feature-toolbar');
      if (!toolbar) return;
      toolbar.insertAdjacentHTML('beforeend',actionButton('search','Найти действие'));
      if (api.page !== 'garden') return;
      const favorites = actions.filter(([id]) => data().favorites.includes(id));
      if (favorites.length) toolbar.insertAdjacentHTML('afterend',`<div class="feature-toolbar pinned-tools" aria-label="Закреплённые инструменты">${favorites.map(([id,label])=>actionButton('launch-'+id,esc(label))).join('')}</div>`);
    }
    function afterDialog(kind) {
      if (kind==='settings') $('.dialog-body')?.insertAdjacentHTML('beforeend',`<section class="settings-group"><h3>Учёба и обратная связь</h3><div class="collection-actions">${actionButton('school','Учебная лаборатория')}${actionButton('feedback','Сообщить об ошибке')}${actionButton('audio','Громкость')}${actionButton('motion','Предпросмотр эффектов')}${actionButton('atmospheres','Избранные атмосферы')}</div></section>`);
    }
    function search() {
      open('Найти действие',`<label class="field"><span>Название или задача</span><input id="workbench-search" type="search" placeholder="Например, копия или горшок"></label><p class="form-help">Закрепите до шести действий на главной странице.</p><ul class="workbench-actions"></ul>`,'tool-search');
      paintActions('');
      $('#workbench-search')?.focus();
    }
    function paintActions(value) {
      const target = $('.workbench-actions');
      if (!target) return;
      const words = value.toLocaleLowerCase('ru').trim().split(/\s+/);
      const matches = actions.filter(parts => words.every(word => parts.join(' ').toLocaleLowerCase('ru').includes(word)));
      target.innerHTML = matches.map(([id,label]) => {
        const favorite = data().favorites.includes(id);
        return `<li>${actionButton('launch-'+id,esc(label))}<button type="button" class="button secondary" data-workbench="pin-${id}" aria-pressed="${favorite}" aria-label="${favorite?'Открепить':'Закрепить'} ${esc(label)}">${favorite?'★':'☆'}</button></li>`;
      }).join('') || '<li>Попробуйте название другого действия.</li>';
    }
    function launch(id) {
      if (['garden','catalog','journal','herbarium'].includes(id)) return api.navigate(id);
      if (id==='school') return school();
      if (id==='portfolio') return portfolio();
      if (id==='bee-stories') return beeStories();
      if (id==='feedback') return feedback();
      if (id==='species-proposal') return speciesProposal();
      const button = document.createElement('button');
      button.dataset[['settings','help','supplies'].includes(id)?'action':'feature'] = id;
      button.hidden = true;
      document.body.append(button);
      button.click();
      button.remove();
    }
    function school() {
      const assignment = data().assignment;
      open('Учебная лаборатория',`<section class="workbench-panel"><h3>${esc(assignment.title)}</h3><p>${esc(assignment.goal)}</p><p>${assignment.minutes} мин · ${esc(assignment.materials)}</p><p><strong>Критерии.</strong> ${esc(assignment.criteria)}</p><div class="collection-actions">${actionButton('experiment','Провести опыт')}${actionButton('assignment','Редактировать задание')}${actionButton('assignment-export','Скачать задание')}${actionButton('assignment-import','Открыть задание')}${actionButton('worksheet','Лист наблюдений')}${actionButton('worksheet-key','Материалы учителя')}${actionButton('observations','Скачать числовые наблюдения')}${actionButton('portfolio','Выставка и портфолио')}</div><input id="workbench-assignment-file" type="file" accept=".json,application/json" hidden>${assignment.example?`<details><summary>Пример работы</summary><p>${esc(assignment.example)}</p></details>`:''}</section>`,'school');
    }
    function assignmentForm() {
      const assignment = data().assignment;
      open('Задание для урока',`<form data-workbench-form="assignment">${field('title','Тема',assignment.title)}${field('minutes','Длительность в минутах',assignment.minutes,'number')}${area('goal','Цель',assignment.goal)}${area('materials','Материалы',assignment.materials,300)}${area('criteria','Критерии',assignment.criteria)}${area('example','Пример',assignment.example)}<button class="button primary">Сохранить задание</button></form>`,'assignment');
    }
    function experiment() {
      const rows = simulateExperiment(api.game,rhythm);
      open('Опыт с двумя ромашками',`<p>Одинаковые начальные условия. Меняется только периодичность полива. График показывает влажность, таблица — влажность, рост и здоровье.</p><form data-workbench-form="experiment"><label class="field"><span>Полив группы Б</span><select id="workbench-rhythm" name="rhythm">${[12,24,36].map(hours=>`<option value="${hours}" ${hours===rhythm?'selected':''}>Каждые ${hours} ч</option>`).join('')}</select></label><p>Группа А получает полив каждые 12 ч.</p>${area('hypothesis','Гипотеза',data().hypothesis)}${visualJournal.experimentChart(rows)}<div class="workbench-table"><table><caption>Влажность, рост и здоровье в процентах</caption><thead><tr><th>Часы</th><th>Влага А</th><th>Влага Б</th><th>Рост А</th><th>Рост Б</th><th>Здоровье А</th><th>Здоровье Б</th></tr></thead><tbody>${rows.map(row=>`<tr><th>${row.at}</th><td>${row.a.moisture}</td><td>${row.b.moisture}</td><td>${row.a.growth}</td><td>${row.b.growth}</td><td>${row.a.health}</td><td>${row.b.health}</td></tr>`).join('')}</tbody></table></div>${area('conclusion','Вывод')}<button class="button primary">Записать опыт</button></form>`,'experiment');
    }
    function worksheet(key) {
      const a = data().assignment;
      const createRows = () => Array.from({length:6},()=>'<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('');
      const body = key ? `<h2>Ход занятия</h2><ol><li>Сформулируйте гипотезу до запуска модели.</li><li>Сравните строки с одинаковым временем.</li><li>Попросите участников объяснить, почему изменилась влажность.</li></ol><p><strong>Критерии.</strong> ${esc(a.criteria)}</p><p><strong>Пример.</strong> ${esc(a.example)}</p>` : `<p>Гипотеза _____________________________________</p><table><thead><tr><th>Часы</th><th>Группа А</th><th>Группа Б</th><th>Наблюдение</th></tr></thead><tbody>${createRows()}</tbody></table><p>Вывод ________________________________________</p>`;
      saveFile(key?'flora-teacher.html':'flora-worksheet.html',`<!doctype html><html lang="ru"><meta charset="utf-8"><title>${esc(a.title)}</title><style>body{margin:2cm;font:16px Georgia;color:#243d30}td,th{padding:.5em;border:1px solid #999}table{border-collapse:collapse;width:100%}</style><h1>${esc(a.title)}</h1><p>${esc(a.goal)}</p>${body}</html>`,'text/html;charset=utf-8');
    }
    function beeStories() {
      const chapters=[
        [api.state.discovered.length>0,'Записка у горшка','Сегодня у меня появился новый сосед. Я облетела горшок три раза, а на четвёртый заметила, как поднялся крошечный лист. Подожду тут до следующего утра.','Посадите первый росток'],
        [api.extras.achievements.some(key=>key.startsWith('mature:')),'Утро первого цветка','Утром на подоконнике стало светлее. Я решила, что опять показалось солнце, и подлетела ближе. Это цветок раскрылся у самого стекла.','Вырастите первое взрослое растение'],
        [api.extras.terrariums.saved.length>0,'Стеклянный лес','Я заглянула под крышку и увидела мох размером с целый лес. Там даже камешки отбрасывают длинные тени. Пока кто-то не проложил тропу, буду смотреть сверху.','Сохраните флорариум'],
        [api.state.discovered.length>=5,'Сад знакомых запахов','Лаванда пахнет у края полки, а мяту я нахожу с закрытыми глазами. Я попробовала нарисовать карту сада по запахам и поняла, что на ней уже не хватит места.','Откройте пять видов'],
      ];
      open('Истории Жужи',`<div class="workbench-panel">${chapters.map(([unlocked,title,story,condition])=>`<article><h3>${title}</h3><p>${unlocked?story:condition}</p></article>`).join('')}</div>`,'bee-stories');
    }
    function exhibitionItems() {
      const options={art:api.art,catalog:api.game.CATALOG};
      return [
        {id:'garden',title:api.extras.gardenName,section:'Сад',svg:()=>api.art.greenhouseArt(api.state.plants,{columns:3})},
        ...api.extras.terrariums.saved.map(scene=>({id:'terrarium-'+scene.id,title:scene.name,section:'Флорариум',svg:()=>terrarium.renderTerrariumSVG(scene,{...options,id:'exhibit-'+scene.id})})),
        ...api.extras.storyStudio.saved.map(scene=>({id:'scene-'+scene.id,title:scene.name,section:'Театр',svg:()=>storyStudio.renderStoryScene(scene,options)})),
      ];
    }
    function portfolio() {
      const items=exhibitionItems();
      open('Выставка и портфолио',`<form data-workbench-form="portfolio">${items.length===1&&!api.state.plants.length?`<div class="exhibit-empty-illustration">${api.art.emptyState('exhibit')}</div>`:''}${field('title','Название выставки',api.extras.gardenName)}${area('credit','Подпись автора или команды','',100)}<fieldset><legend>Работы</legend><div class="batch-list">${items.map(item=>`<label><input type="checkbox" name="work" value="${esc(item.id)}"${item.id==='garden'?' checked':''}> ${esc(item.section+' · '+item.title)}</label>`).join('')}</div></fieldset><button class="button primary">Открыть предпросмотр</button></form>`,'portfolio');
    }
    function previewExhibition(form,title,credit) {
      const chosen=new Set(new FormData(form).getAll('work'));
      const selected=exhibitionItems().filter(item=>chosen.has(item.id));
      if(!selected.length)throw new Error('Выберите хотя бы одну работу.');
      const sections=selected.map(item=>`<article><h2>${esc(item.title)}</h2><p>${esc(item.section)}</p>${item.svg()}</article>`).join('');
      const heading=`<header><h1>${esc(title)}</h1><p>${esc(credit)}</p><time>${new Date().toLocaleDateString('ru-RU')}</time></header>`;
      const file=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><style>body{font:18px Georgia;margin:4vw;color:#264634}header,article{break-inside:avoid}header{min-height:45vh}article{padding:1rem 0;border-top:1px solid #b4c4a9}svg{display:block;width:min(100%,38rem);height:auto}</style>${heading}${sections}</html>`;
      open('Предпросмотр выставки',`<div class="workbench-panel">${heading}<ol>${selected.map(item=>`<li>${esc(item.title)}</li>`).join('')}</ol><button id="download-exhibit" class="button primary">Скачать портфолио HTML</button>${sections}</div>`,'exhibit');
      $('#download-exhibit')?.addEventListener('click',()=>saveFile('flora-portfolio.html',file,'text/html;charset=utf-8'),{once:true});
    }
    function feedback() {
      open('Сообщить об ошибке',`<p>Соберите локальный отчёт, проверьте его и передайте команде проекта.</p><form data-workbench-form="feedback">${field('title','Название')}${area('steps','Как повторить')}${area('expected','Ожидаемый результат')}${area('actual','Фактический результат')}<fieldset><legend>Технические сведения</legend><label><input type="checkbox" name="version" checked> Версия и способ запуска</label> <label><input type="checkbox" name="viewport"> Размер окна</label> <label><input type="checkbox" name="errors"> Последние коды ошибок</label></fieldset><button class="button primary">Предпросмотр</button></form>`,'feedback');
    }
    function speciesProposal(){
      open('Предложить новый вид',`<p>Скачайте карточку предложения для обсуждения с авторами проекта.</p><form data-workbench-form="species">${field('name','Русское название')}${field('latin','Научное название')}${field('source','Ссылка на источник','','url')}${area('visual','Идея иллюстрации', '',300)}<button class="button primary">Скачать предложение</button></form>`,'species-proposal');
    }
    function audio() {
      const volumes = data().volumes;
      open('Громкость сада',`<form data-workbench-form="audio"><label class="field"><span>Фоновая музыка</span><input name="music" type="range" min="0" max="100" value="${Math.round(volumes.music*100)}"></label><label class="field"><span>Звуки ухода</span><input name="effects" type="range" min="0" max="100" value="${Math.round(volumes.effects*100)}"></label><label class="field"><span>Погода</span><input name="atmosphere" type="range" min="0" max="100" value="${Math.round(volumes.atmosphere*100)}"></label><label class="field"><span>Звуковой пейзаж</span><select name="soundscape">${[['off','Тишина'],['rain','Дождь по стеклу'],['wind','Ветер']].map(([key,label])=>`<option value="${key}"${key===data().soundscape?' selected':''}>${label}</option>`).join('')}</select></label><label class="check-field"><input type="checkbox" name="captions"${data().soundCaptions?' checked':''}> Текстовые подписи к игровым звукам</label><button class="button primary">Применить</button></form>`,'audio');
    }
    function motion(){
      open('Предпросмотр эффектов',`<p>Два неподвижных кадра показывают, как меняется растение после действия.</p><div class="motion-example"><figure>${api.art.plantArt('daisy',{id:'motion-dry',growth:.7,moisture:35})}<figcaption>Перед поливом</figcaption></figure><figure>${api.art.plantArt('daisy',{id:'motion-wet',growth:.7,moisture:95,wet:true})}<figcaption>Сразу после полива</figcaption></figure></div>`,'motion-sample');
    }
    function atmospheres() {
      const rows=data().atmospheres;
      const list=rows.length?`<ol>${rows.map((item,index)=>`<li>${esc(item.name)} ${actionButton('atmosphere-'+index,'Применить')}</li>`).join('')}</ol>`:'<p>Здесь можно сохранить текущий свет, погоду и звук.</p>';
      open('Избранные атмосферы',`${list}<form data-workbench-form="atmosphere">${field('name','Название текущей атмосферы')}<button class="button primary">Сохранить сочетание</button></form>`,'atmospheres');
    }
    document.addEventListener('input',event => {
      if (event.target.id==='workbench-search') paintActions(event.target.value);
    });
    document.addEventListener('change',async event => {
      try {
        if (event.target.id==='workbench-rhythm') {
          rhythm = Number(event.target.value);
          const hypothesis = text(event.target.form.elements.hypothesis.value,500);
          await api.commit(({extras})=>{extras.workbench.hypothesis=hypothesis;});
          experiment();
        }
        if (event.target.id!=='workbench-assignment-file') return;
        const file = event.target.files[0];
        if (!file || file.size>25000) return;
        const imported = JSON.parse(await file.text());
        if (imported.format!=='FloraKeepAssignment' || imported.version!==1 || !imported.assignment?.title) throw new Error('Выберите файл задания Flora Keep.');
        const assignment = normalizeAssignment(imported.assignment);
        await api.commit(({extras})=>{extras.workbench.assignment=assignment;});
        school();
      } catch (error) { api.toast(error.message); }
    });
    document.addEventListener('click',event => {
      const control = event.target.closest('[data-workbench]');
      if (!control) return;
      const action = control.dataset.workbench;
      if (action.startsWith('launch-')) return launch(action.slice(7));
      if (action.startsWith('atmosphere-')) {
        const preset=data().atmospheres[Number(action.slice(11))];
        if (preset) api.commit(({extras})=>{
          extras.settings.light=preset.light;
          extras.settings.weather=preset.weather;
          extras.workbench.soundscape=preset.soundscape;
        },'Атмосфера применена.').then(()=>{api.music();atmospheres();}).catch(error=>api.toast(error.message));
        return;
      }
      if (action.startsWith('pin-')) {
        const id = action.slice(4);
        if (!actionKeys.has(id)) return;
        return api.commit(({extras})=>{
          const current=extras.workbench.favorites;
          extras.workbench.favorites=current.includes(id)?current.filter(key=>key!==id):[...current,id].slice(-6);
        }).then(()=>paintActions($('#workbench-search')?.value||'')).catch(error=>api.toast(error.message));
      }
      const commands = {
        search, school, assignment:assignmentForm, experiment, feedback, audio, portfolio, motion, atmospheres,
        'assignment-export':()=>saveFile('flora-assignment.json',JSON.stringify({format:'FloraKeepAssignment',version:1,assignment:data().assignment})),
        'assignment-import':()=>$('#workbench-assignment-file')?.click(),
        worksheet:()=>worksheet(false), 'worksheet-key':()=>worksheet(true),
        observations:()=>{
          const rows = data().archive.flatMap(record=>simulateExperiment(api.game,record.rhythm).map(row=>[new Date(record.at).toISOString(),record.rhythm,row.at,row.a.moisture,row.b.moisture,row.a.growth,row.b.growth,row.a.health,row.b.health].join(',')));
          saveFile('flora-observations.csv','\uFEFFДата,Полив Б (ч),Время (ч),Влага А,Влага Б,Рост А,Рост Б,Здоровье А,Здоровье Б\r\n'+rows.join('\r\n'),'text/csv;charset=utf-8');
        },
      };
      if (Object.hasOwn(commands,action)) commands[action]();
    });
    document.addEventListener('submit',async event=>{
      const form = event.target.closest('[data-workbench-form]');
      if (!form) return;
      event.preventDefault();
      const fields = Object.fromEntries(new FormData(form));
      try {
        if (form.dataset.workbenchForm==='assignment') {
          const assignment = normalizeAssignment({...fields,minutes:Number(fields.minutes)});
          if (!assignment.title) throw new Error('Введите тему занятия.');
          await api.commit(({extras})=>{extras.workbench.assignment=assignment;});
          school();
        }
        if (form.dataset.workbenchForm==='experiment') {
          await api.commit(({extras})=>{
            const observation = {at:Date.now(),rhythm,hypothesis:fields.hypothesis,conclusion:fields.conclusion};
            extras.workbench.hypothesis=observation.hypothesis;
            extras.workbench.archive=[...extras.workbench.archive,observation].slice(-30);
          },'Опыт добавлен к наблюдениям.');
        }
        if (form.dataset.workbenchForm==='audio') {
          await api.commit(({extras})=>{extras.workbench.volumes={music:Number(fields.music)/100,effects:Number(fields.effects)/100,atmosphere:Number(fields.atmosphere)/100};extras.workbench.soundscape=fields.soundscape;extras.workbench.soundCaptions=fields.captions==='on';});
          api.music();
          api.closeDialog();
        }
        if (form.dataset.workbenchForm==='atmosphere') {
          const name=text(fields.name,60);
          if(!name)throw new Error('Введите название атмосферы.');
          await api.commit(({extras})=>{
            const {light,weather}=extras.settings;
            const records=extras.workbench.atmospheres.filter(item=>item.name!==name);
            extras.workbench.atmospheres=[...records,{name,light,weather,soundscape:extras.workbench.soundscape}].slice(-8);
          });
          atmospheres();
        }
        if (form.dataset.workbenchForm==='species') {
          const url=new URL(fields.source);
          if(!['https:','http:'].includes(url.protocol))throw new Error('Добавьте обычную веб-ссылку на источник.');
          saveFile('flora-species-proposal.json',JSON.stringify({format:'FloraKeepSpeciesProposal',version:1,name:text(fields.name,80),latinName:text(fields.latin,100),source:url.href,illustration:text(fields.visual,300)},null,2));
        }
        if (form.dataset.workbenchForm==='portfolio') previewExhibition(form,text(fields.title,120),text(fields.credit,100));
        if (form.dataset.workbenchForm==='feedback') {
          const report = {title:text(fields.title),steps:text(fields.steps,500),expected:text(fields.expected,500),actual:text(fields.actual,500)};
          if (fields.version) report.application={version:featureModule.APP_VERSION,protocol:location.protocol};
          if (fields.viewport) report.viewport={width:innerWidth,height:innerHeight};
          if (fields.errors) report.errors=api.errors.slice(-15);
          const raw = JSON.stringify(report,null,2);
          open('Предпросмотр отчёта',`<pre class="workbench-report">${esc(raw)}</pre><button class="button primary" id="workbench-report-download">Скачать отчёт</button>`,'feedback-preview');
          $('#workbench-report-download')?.addEventListener('click',()=>saveFile('flora-feedback.json',raw),{once:true});
        }
      } catch (error) { api.toast(error.message); }
    });
    return {afterRender,afterDialog};
  }
  return Object.freeze({normalize,create,simulateExperiment});
})();
