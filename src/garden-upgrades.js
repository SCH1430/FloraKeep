const gardenUpgrades = (() => {
  const HOUR = 3600000;
  const DAY = 24 * HOUR;
  const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0,limit) : '';
  const time = value => Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000 ? value : 0;
  const safeId = value => typeof value === 'string' && /^[a-z\d_-]{1,128}$/i.test(value) && !['constructor','prototype','__proto__'].includes(value);
  const asArray = value => Array.isArray(value) ? value : [];
  const entries = value => value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
  const boundedNumber = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(value,2147483647) : 0;
  const speciesById = new Map(game.CATALOG.map(species => [species.id,species]));
  const validSpecies = key => speciesById.has(key);
  const printableDate = value => value ? new Intl.DateTimeFormat('ru-RU',{dateStyle:'medium',timeStyle:'short'}).format(value) : '—';
  const displayNumber = value => new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value);
  const aliases = {
    daisy:'ромашка аптечная ромашка лекарственная matricaria recutita chamomilla recutita',
    lavender:'лаванда английская лаванда узколистная lavandula officinalis',
    sunflower:'подсолнечник однолетний подсолнух', tulip:'тюльпан садовый тюльпан геснера',
    mint:'мята колосистая мята зелёная мята садовая', cactus:'маммиллярия удлинённая кактус',
    rose:'роза галльская роза французская', monstera:'монстера деликатесная монстера привлекательная',
    fern:'нефролепис возвышенный нефролепис папоротник', orchid:'фаленопсис орхидные', aloe:'алоэ вера алоэ настоящее алоэ барбадосское',
  };
  const groups = [
    ['Луковица',['tulip'],'Подземный побег с запасом веществ'],
    ['Мясистые листья',['aloe','orchid'],'Толстая листовая пластинка'],
    ['Воздушные корни',['orchid','monstera'],'Корни расположены и над субстратом'],
    ['Соцветие-корзинка',['daisy','sunflower'],'Много мелких цветков в одном соцветии'],
    ['Сложный лист',['rose','fern'],'У розы видны листочки, у нефролеписа — сегменты вайи'],
  ];
  const seasonalStudies = {
    'spring-study':['Весна','Заметьте изменения молодых листьев и бутонов.'],
    'summer-study':['Лето','Сравните скорость высыхания в разных местах.'],
    'autumn-study':['Осень','Запишите, как меняются освещение и оформление вашей полки.'],
    'winter-study':['Зима','Сравните приёмы ухода за растениями, которые отдыхают и продолжают расти.'],
  };

  function matchesSpecies(species, query) {
    const fold = value => String(value ?? '').toLocaleLowerCase('ru').replaceAll('ё','е').trim();
    const search = fold([species.name,species.latinName,aliases[species.id],knowledge.KNOWLEDGE[species.id]?.family].join(' '));
    return fold(query).split(/\s+/).every(word=>search.includes(word));
  }

  function normalize(raw) {
    const milestones = Object.fromEntries(entries(raw?.milestones).filter(([id,row])=>safeId(id) && row && validSpecies(row.speciesId)).sort(([,a],[,b])=>time(b.plantedAt)-time(a.plantedAt)).slice(0,500).map(([id,row])=>[id,{
      speciesId:row.speciesId, plantedAt:time(row.plantedAt), flowerAt:time(row.flowerAt), repottedAt:time(row.repottedAt),
    }]));
    const ledger = asArray(raw?.ledger).filter(row=>row && time(row.at) && typeof row.delta==='number' && Number.isSafeInteger(row.delta) && row.delta!==0).slice(0,100).map(row=>({
      at:row.at,delta:Math.sign(row.delta)*boundedNumber(Math.abs(row.delta)),reason:text(row.reason,120),
      earned:Object.fromEntries(entries(row.earned).filter(([key])=>validSpecies(key)).map(([key,value])=>[key,boundedNumber(value)])),
    }));
    const tags = Object.fromEntries(entries(raw?.tags).filter(([key,values])=>safeId(key) && Array.isArray(values)).slice(0,100).map(([key,values])=>[key,[...new Set(values.map(value=>text(value,30)).filter(Boolean))].slice(0,8)]));
    const lists = asArray(raw?.lists).filter(row=>row && text(row.name,40)).slice(0,12).map(row=>({name:text(row.name,40),tag:text(row.tag,30),favorite:row.favorite===true,water:row.water===true}));
    const archive = asArray(raw?.archive).filter(row=>row && safeId(row.id) && validSpecies(row.speciesId)).slice(0,24).map(row=>({
      id:row.id,lineageId:safeId(row.lineageId)?row.lineageId:row.id,parentLineageId:safeId(row.parentLineageId)?row.parentLineageId:null,
      speciesId:row.speciesId,name:text(row.name,60),note:text(row.note,1200),growth:Math.min(1,boundedNumber(row.growth)),
      pot:['clay','sage','cream','pink'].includes(row.pot)?row.pot:'clay',
      shape:['classic','tall','bowl'].includes(row.shape)?row.shape:'classic',
      material:['clay','glaze','paper','painted'].includes(row.material)?row.material:'clay',
      history:asArray(row.history).filter(sample=>sample && time(sample.at)).slice(-48).map(sample=>({at:sample.at,growth:Math.min(1,boundedNumber(sample.growth)),moisture:Math.min(100,boundedNumber(sample.moisture))})),
      plantedAt:time(row.plantedAt),flowerAt:time(row.flowerAt),repottedAt:time(row.repottedAt),archivedAt:time(row.archivedAt),
    }));
    let photoBytes = 0;
    const field = asArray(raw?.field).filter(row=>row && time(row.at) && text(row.note,500)).slice(0,10).map(row=>{
      const photo = typeof row.photo==='string'&&row.photo.length<=140000&&photoBytes+row.photo.length<=420000&&/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(row.photo) ? row.photo : '';
      photoBytes += photo.length;
      return {at:row.at,note:text(row.note,500),photo};
    });
    const seenExamples = [...new Set(asArray(raw?.seenExamples).filter(value=>['terrarium','atelier','story-studio'].includes(value)))];
    const fieldChecks = [...new Set(asArray(raw?.fieldChecks).filter(value=>['opposite','basket','veins','rosette'].includes(value)))];
    const budgets = {seeds:Math.floor(boundedNumber(raw?.budgets?.seeds)),shelf:Math.floor(boundedNumber(raw?.budgets?.shelf))};
    const season = Object.hasOwn(seasonalStudies,raw?.season?.kind) && time(raw.season.startAt) ? {
      kind:raw.season.kind,startAt:raw.season.startAt,paused:raw.season.paused===true,visits:Math.min(4,Math.floor(boundedNumber(raw.season.visits))),lastVisit:time(raw.season.lastVisit),
    } : null;
    const displaySign = game.TASK_DEFINITIONS.some(task=>task.id===raw?.displaySign) ? raw.displaySign : '';
    const resume = raw?.resume && text(raw.resume.title,120) ? {title:text(raw.resume.title,120),plantId:safeId(raw.resume.plantId)?raw.resume.plantId:null} : null;
    return {milestones,ledger,tags,lists,archive,field,seenExamples,fieldChecks,budgets,season,displaySign,resume};
  }

  function record(extras, before, after, now, reason='') {
    if(!before || !after) return;
    const data = extras.gardenUpgrades ||= normalize(null);
    const oldPlants = new Map(before.plants.map(plant=>[plant.id,plant]));
    for(const plant of after.plants) {
      const previous = oldPlants.get(plant.id);
      const record = data.milestones[plant.id] ||= {speciesId:plant.speciesId,plantedAt:plant.plantedAt,flowerAt:0,repottedAt:0};
      if(previous && previous.growth<1 && plant.growth>=1 && game.bloomInfo(plant).cycle>0 && !record.flowerAt) {
        const predicted=game.forecast(before,plant.id,previous.lastUpdated)?.matureAt;
        record.flowerAt=predicted===null||predicted===undefined ? now : Math.min(now,Math.round(predicted));
      }
      if(previous && previous.potSize!==2 && plant.potSize===2) record.repottedAt = now;
    }
    if(reason) data.resume = {title:text(reason,120),plantId:after.selectedPlantId};
    const delta = after.coins - before.coins;
    if(!delta) return;
    const earned = {};
    if(delta>0 && reason.startsWith('Собрано монет')) {
      // The lastUpdated snapshot can predate collection by seconds. Recompute
      // to the action time so newly accrued currency belongs to the right kind.
      const advanced = game.advance(before,now);
      for(const plant of advanced.plants) {
        const next = after.plants.find(candidate=>candidate.id===plant.id);
        const taken = next ? Math.max(0,plant.earned-next.earned) : 0;
        if(taken) earned[plant.speciesId] = (earned[plant.speciesId] || 0) + taken;
      }
    }
    const reported = Object.values(earned).reduce((sum,value)=>sum+value,0);
    if(reported>delta) for(const key of Object.keys(earned)) earned[key] *= delta / reported;
    data.ledger.unshift({at:now,delta,reason,earned});
    data.ledger = data.ledger.slice(0,100);
  }

  function careExplanation(state, plant, now) {
    if(state.vacationUntil>now) return 'Идёт отпуск. Возобновите уход, если хотите продолжить рост сегодня.';
    if(plant.moisture<=0) return 'Почва пересохла. Полейте растение, чтобы вернуть влагу.';
    if(plant.health<=0 && plant.recoveryUntil<=now) return 'Здоровье исчерпано. Запустите мягкое восстановление.';
    if(plant.growth>=1) return 'Растение взрослое. Уход поддерживает здоровье и позволяет накапливать доход.';
    return 'Влаги и здоровья хватает. Рост продолжается.';
  }

  function create(api) {
    const {esc,art} = api;
    const data = () => api.extras.gardenUpgrades || normalize(null);
    const name = plant => api.extras.appearance[plant.id]?.name || speciesById.get(plant.speciesId).name;
    const plantById = id => api.state.plants.find(plant=>plant.id===id);
    const button = (action,label,id='',kind='secondary') => `<button type="button" class="button ${kind}" data-garden-upgrade="${action}"${id?` data-id="${esc(id)}"`:''}>${esc(label)}</button>`;
    const native = (action,label,id='') => `<button type="button" class="button secondary" data-action="${action}"${id?` data-id="${esc(id)}"`:''}>${esc(label)}</button>`;
    const feature = (action,label,id='') => `<button type="button" class="button secondary" data-feature="${action}"${id?` data-id="${esc(id)}"`:''}>${esc(label)}</button>`;
    const actions = (...buttons) => `<div class="garden-upgrade-actions">${buttons.join('')}</div>`;
    const open = (title,body) => api.showDialog(esc(title),`<section class="garden-upgrade">${body}</section>`,'garden-upgrade',true);
    const options = (rows,current) => rows.map(([value,label])=>`<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('');
    const select = (field,label,rows,current) => `<label class="field"><span>${esc(label)}</span><select name="${field}">${options(rows,current)}</select></label>`;
    const input = (field,label,current='',max=40) => `<label class="field"><span>${esc(label)}</span><input name="${field}" value="${esc(current)}" maxlength="${max}" required></label>`;
    const save = (update,message) => api.commit(({extras})=>{ const model = extras.gardenUpgrades ||= normalize(null); update(model); },message);
    const siteChoices = [['center','Середина полки'],['window','У окна'],['shade','В тени']];
    const soilChoices = [['standard','Обычный'],['porous','Рыхлый'],['retaining','Влагоёмкий']];
    let demo = null;
    let demoStep = 0;
    let demoStart = 0;

    function onboarding() {
      open('С чего начнём?',`<div class="garden-upgrade-grid"><article><h3>Вырастить росток</h3><p>Выберите вид и оживите первый маленький сад.</p>${native('browse','Открыть каталог')}</article><article><h3>Изучить растения</h3><p>Сравните листья и познакомьтесь со строением цветка.</p>${button('botany','Открыть ботаническую лабораторию')}</article><article><h3>Украсить мир</h3><p>Начните со схемы лесного уголка в сосуде.</p>${feature('terrariums','Открыть флорариумы')}</article></div>${actions(button('demo-start','Пройти учебный цикл'),button('tutorial','Вернуться к шагам обучения'),button('creative-profile','Создать отдельный творческий сад'))}`);
    }

    function training() {
      const plant = demo.plants[0];
      const steps = ['Посадите ромашку','Полейте учебный росток','Промотайте восемь игровых часов','Соберите доход'];
      const stage = steps[demoStep] || 'Учебный цикл завершён';
      open('Учебная теплица',`<p>Ускоренная проба. Тренировочные растения и монеты остаются в этой теплице.</p><div class="garden-training">${art.plantArt('daisy',{id:'training-daisy',growth:plant?.growth ?? 0})}<div><p><strong>${stage}</strong></p><p>Влага: ${plant?`${displayNumber(plant.moisture)}%`:'—'} · рост: ${plant?`${displayNumber(100*plant.growth)}%`:'—'}</p><p>Кошелёк: ${demo.coins} · к сбору: ${Math.floor(plant?.earned || 0)}</p>${demoStep<steps.length?button('demo-step',stage,'','primary'):button('onboarding','Вернуться к маршрутам')}</div></div><ol>${steps.map((step,index)=>`<li>${index<demoStep?'✓ ':''}${step}</li>`).join('')}</ol>`);
    }

    function playTrainingStep() {
      const id = demo.plants[0]?.id;
      if(demoStep===0) {
        demo = game.plant(demo,'daisy',demoStart).state;
        demo.plants[0] = {...demo.plants[0],moisture:55};
      } else if(demoStep===1) demo = game.water(demo,id,demoStart).state;
      else if(demoStep===2) demo = game.advance(demo,demoStart+8*HOUR);
      else if(demoStep===3) demo = game.collect(demo,demoStart+8*HOUR).state;
      demoStep++;
      training();
    }

    function tutorial() {
      const selected = plantById(api.state.selectedPlantId) || api.state.plants[0];
      open('Шаги знакомства',`<ol><li>${button('tutorial-step','Открыть карточку семян','1')}</li><li>${button('tutorial-step','Выбрать и посадить росток','2')}</li><li>${selected?button('tutorial-step',`Проверить полив · ${name(selected)}`,'3'):'После посадки здесь появится путь к поливу.'}</li></ol>`);
    }

    function plans() {
      const now = Date.now();
      const queue = game.careQueue(api.state,now);
      const ready = queue.filter(game.needsWater).slice(0,api.state.water);
      const weakest = [...queue].filter(plant=>plant.health<70 && plant.recoveryUntil<=now).sort((a,b)=>a.health-b.health)[0];
      const calendar = [];
      for(const plant of queue) {
        const estimate = game.forecast(api.state,plant.id,now);
        const info = game.bloomInfo(plant);
        calendar.push([estimate.nextWaterAt,plant,'Полив']);
        if(estimate.boostEndsAt>now) calendar.push([estimate.boostEndsAt,plant,'Подкормка закончится']);
        if(info.phase==='bud' && info.cycle>0) calendar.push([Math.max(now,estimate.pausedUntil)+(info.nextPhaseHours || 0)*HOUR,plant,'Цветение при продолжении ухода']);
        if(plant.growth<1 && info.phase!=='leaves') calendar.push([estimate.withCareMatureAt,plant,'Взросление и первое цветение при уходе']);
      }
      calendar.sort(([a],[b])=>a-b);
      const season = data().season;
      const seasonForm = `<form data-garden-form="season" class="garden-upgrade-form">${select('study','Наблюдение',Object.entries(seasonalStudies).map(([key,[label]])=>[key,label]),'spring-study')}<label class="field"><span>Дата начала</span><input type="date" name="date" required></label><button class="button secondary">Запланировать</button></form>`;
      const seasonSummary = season ? `<p>${esc(seasonalStudies[season.kind][1])} Наблюдения: ${season.visits} из 4. Старт: ${esc(printableDate(season.startAt))}.</p>${actions(season.visits<4?button('season-pause',season.paused?'Продолжить':'Поставить на паузу'):'',!season.paused&&season.visits<4?button('season-visit','Отметить наблюдение'):'')}${season.visits===4?seasonForm:''}` : seasonForm;
      const careMode = api.state.careProfile==='studio' ? feature('care-profile','Выбрать классический или видовой уход') : button('care-mode','Включить расширенный уход');
      const commands = actions(careMode,button('economy','Кошелёк сада'),button('creative-profile','Создать творческий сад'));
      open('План сада',`<p>Расширенный режим учитывает положение горшка и состав грунта.</p>${commands}<h3>Очередь ухода</h3>${queue.length?`<ol class="garden-upgrade-list">${queue.map(plant=>`<li>${native('plant-detail',name(plant),plant.id)} <span>${displayNumber(plant.moisture)}% влаги · ${displayNumber(plant.health)}% здоровья</span></li>`).join('')}</ol>`:'<p>Посадите растение, чтобы появилось расписание.</p>'}${actions(ready.length?button('water-queue',`Полить первые ${ready.length} в очереди`):'',!api.state.water?native('supplies','Набрать воду в колодце'):'',weakest?button('recover-next',`Начать восстановление · ${name(weakest)}`,weakest.id):'')}<h3>Ближайшие события</h3><ul class="garden-upgrade-list">${calendar.slice(0,18).map(([at,plant,label])=>`<li><time>${esc(printableDate(at))}</time> · ${esc(name(plant))} · ${esc(label)}</li>`).join('')}</ul><h3>Сезонное наблюдение</h3>${seasonSummary}`);
    }

    function conditions(id) {
      const plant = plantById(id);
      if(!plant)return;
      const old = game.forecast(api.state,id);
      open(`Место и грунт · ${name(plant)}`,`<p>Яркие места ускоряют рост и высыхание. Влагоёмкий грунт удерживает влагу и немного замедляет рост.</p>${api.state.careProfile==='studio'?`<p>Текущее место: ${displayNumber(old.waterPerHour)} п.п. влаги в час. Полив: ${esc(printableDate(old.nextWaterAt))}.</p><form data-garden-form="conditions" data-id="${esc(id)}" class="garden-upgrade-form">${select('site','Место',siteChoices,plant.site||'center')}${select('soil','Субстрат',soilChoices,plant.substrate||'standard')}<p data-conditions-preview role="status">Выберите место и грунт для сравнения.</p><button class="button primary">Применить условия</button></form>`:actions(button('plans','Настроить режим ухода'))}${actions(button('mulch','Добавить мульчу · 1 подкормка',id),button('passport','Открыть паспорт',id))}`);
    }

    function previewConditions(form) {
      const id = form.dataset.id;
      const plant = plantById(id);
      if(!plant)return;
      const config = new FormData(form);
      const now = Date.now();
      const projected = game.setEnvironment(api.state,id,config.get('site'),config.get('soil'),now);
      if(!projected.success)return;
      const old = game.forecast(api.state,id,now);
      const next = game.forecast(projected.state,id,now);
      form.querySelector('[data-conditions-preview]').textContent = `Расход влаги: ${displayNumber(old.waterPerHour)} → ${displayNumber(next.waterPerHour)} п.п./ч. Следующий полив: ${printableDate(old.nextWaterAt)} → ${printableDate(next.nextWaterAt)}. Взросление при уходе: ${printableDate(old.withCareMatureAt)} → ${printableDate(next.withCareMatureAt)}.`;
    }

    function economy() {
      const {ledger,budgets} = data();
      const income = new Map();
      for(const row of ledger) for(const [id,value] of Object.entries(row.earned)) income.set(id,(income.get(id)||0)+value);
      const taskRows = game.tasks(api.state).filter(task=>task.complete && !task.claimed);
      open('Кошелёк сада',`<p>Доступно: <strong>${displayNumber(api.state.coins)} монет</strong>. В запасах: ${api.state.water} воды и ${api.state.fertilizer} подкормки.</p><h3>Личные конверты</h3><p>На семена отложено ${displayNumber(budgets.seeds)} монет, на оформление полки — ${displayNumber(budgets.shelf)}.</p><form data-garden-form="budget" class="garden-upgrade-form">${select('budget','Конверт',[['seeds','Семена'],['shelf','Оформление полки']],'seeds')}${select('direction','Действие',[['reserve','Отложить из кошелька'],['release','Вернуть в кошелёк']],'reserve')}<label class="field"><span>Игровые монеты</span><input type="number" name="amount" min="1" max="2147483647" step="1" required></label><button class="button secondary">Переложить монеты</button></form>${actions(button('compare','Сравнить два вида'),button('supplies-exchange','Обменять 5 воды на подкормку'),native('supplies','Открыть запасы'))}<h3>Награды</h3>${taskRows.length?taskRows.map(task=>`<form data-garden-form="reward" data-id="${esc(task.id)}" class="garden-upgrade-form"><p>${esc(task.title)}</p>${select('reward','Награда',[['coins',`${task.reward} монет`],['supplies','2 воды и 1 подкормка'],['decor','Памятная табличка']],'coins')}<button class="button secondary">Получить</button></form>`).join(''):'<p>Завершённые задания появятся здесь.</p>'}<h3>Доход по видам за последние записи</h3>${income.size?`<ul>${[...income].sort(([,a],[,b])=>b-a).map(([id,value])=>`<li>${esc(speciesById.get(id).name)} · ${displayNumber(value)} монет</li>`).join('')}</ul>`:'<p>Доход появится после следующего сбора монет.</p>'}<h3>Движение монет</h3>${ledger.length?`<ol class="garden-upgrade-list">${ledger.slice(0,30).map(row=>`<li><time>${esc(printableDate(row.at))}</time> · <strong>${row.delta>0?'+':''}${displayNumber(row.delta)}</strong> · ${esc(row.reason||'Изменение кошелька')}</li>`).join('')}</ol>`:'<p>Пока нет записей.</p>'}`);
    }

    function compare(first='daisy',second='lavender') {
      const rows = game.CATALOG.map(species=>[species.id,species.name]);
      const columns = [first,second].map(id=>{
        const target = speciesById.get(id);
        const perHour = (api.state.careProfile==='classic'?4:target.waterPerHour);
        const income = target.incomePerHour * (1 + game.researchLevel(api.state,id)*.1) * 24;
        const water = (24*perHour)/60;
        return `<article><h3>${esc(target.name)}</h3><dl><dt>Доход взрослого за сутки</dt><dd>${displayNumber(income)} монет</dd><dt>Средний расход воды</dt><dd>${displayNumber(water)} порций/сутки</dd><dt>Место на полке</dt><dd>Обычный горшок, средние условия</dd></dl></article>`;
      }).join('');
      open('Уход и доход за сутки',`<p>Оценка для взрослых растений при регулярном уходе. Полив добавляет до 60 п.п. влаги. Для только что купленного растения сроки другие.</p><form data-garden-form="compare" class="garden-upgrade-form">${select('first','Первый вид',rows,first)}${select('second','Второй вид',rows,second)}<button class="button secondary">Сравнить</button></form><div class="garden-upgrade-grid">${columns}</div>`);
    }

    function passport(id) {
      const plant = plantById(id);
      if(!plant)return;
      const entry = data().milestones[id] || {};
      const tags = data().tags[id] || [];
      const note = api.extras.appearance[id]?.note;
      const samples = api.extras.history[id]?.length || 0;
      open(`Паспорт · ${name(plant)}`,`<p class="latin">${esc(speciesById.get(plant.speciesId).latinName)}</p><dl class="garden-passport"><dt>Посадка</dt><dd>${esc(printableDate(plant.plantedAt))}</dd><dt>Первое цветение</dt><dd>${esc(printableDate(entry.flowerAt))}</dd><dt>Последняя пересадка</dt><dd>${esc(printableDate(entry.repottedAt))}</dd><dt>Наблюдений роста</dt><dd>${samples}</dd></dl>${note?`<p>${esc(note)}</p>`:''}<form data-garden-form="tags" data-id="${esc(id)}" class="garden-upgrade-form"><label class="field"><span>Метки через запятую</span><input name="tags" value="${esc(tags.join(', '))}" maxlength="247"></label><button class="button secondary">Сохранить метки</button></form>${actions(button('lineage','Родословная',id),button('archive-plant','Сохранить портрет в архиве',id),native('plant-detail','Вернуться к уходу',id))}`);
    }

    function lineage(id) {
      const selected = plantById(id);
      if(!selected)return;
      const all = [...api.state.plants,...data().archive.filter(item=>!plantById(item.id))];
      const {rows,missing}=visualJournal.lineageRows(all,id);
      const byLineage=new Map(all.map(plant=>[plant.lineageId||plant.id,plant]));
      const portraits = new Map();
      function portrait(member) {
        const key = member.speciesId + '-' + (member.growth>=1?'adult':member.growth>.45?'young':'sprout');
        if (!portraits.has(key)) {
          const symbolId = 'lineage-portrait-' + portraits.size;
          const growth = member.growth>=1?1:member.growth>.45?.61:.15;
          const artwork=art.plantArt(member.speciesId,{growth,id:symbolId});
          const silhouette=artwork.replace(/^<svg[^>]*>|<\/svg>$/g,'');
          portraits.set(key,{symbolId,definition:`<symbol id="${symbolId}" viewBox="0 0 320 360">${silhouette}</symbol>`});
        }
        const {symbolId}=portraits.get(key);
        return `<svg viewBox="0 0 320 360" aria-hidden="true" focusable="false"><use href="#${symbolId}"/></svg>`;
      }
      function tile(member) {
        const live=plantById(member.id);
        const title=live?name(member):member.name||speciesById.get(member.speciesId)?.name||'Растение';
        const parent=byLineage.get(member.parentLineageId);
        const source=parent&&parent!==member?`<small>Черенок от ${esc(parent.name||name(parent))}</small>`:'';
        const art=portrait(member);
        const caption=`<strong>${esc(title)}</strong>${source}${member.id===id?'<small>Выбранное растение</small>':live?'':'<small>В архиве</small>'}`;
        return live?`<button type="button" class="visual-lineage-tile" data-action="plant-detail" data-id="${esc(member.id)}"${member.id===id?' aria-current="true"':''}>${art}${caption}</button>`
          :`<div class="visual-lineage-tile">${art}${caption}</div>`;
      }
      const generations=rows.map((row,index)=>`<li><h3>${index===0?'Старшее поколение':`Поколение ${index+1}`}</h3><ul>${row.map(member=>`<li>${tile(member)}</li>`).join('')}</ul></li>`).join('');
      const definitions=`<svg width="0" height="0" class="flora-icon-sprite" aria-hidden="true"><defs>${[...portraits.values()].map(row=>row.definition).join('')}</defs></svg>`;
      const source=missing?'<p>Первоначальный родитель отсутствует в сохранённой коллекции.</p>':'';
      open(`Родословная · ${name(selected)}`,`${source}${definitions}<ol class="visual-lineage">${generations}</ol>${actions(button('passport','Открыть паспорт',id))}`);
    }

    function archive() {
      const cards = data().archive.map(entry=>{
        const portrait = art.plantArt(entry.speciesId,{id:`archive-${entry.id}`,growth:entry.growth,pot:entry.pot,shape:entry.shape,material:entry.material});
        const timeline = entry.history.length ? `<details><summary>Наблюдения роста · ${entry.history.length}</summary><ul>${entry.history.map(sample=>`<li>${esc(printableDate(sample.at))} · рост ${displayNumber(sample.growth*100)}% · влага ${displayNumber(sample.moisture)}%</li>`).join('')}</ul></details>` : '';
        return `<article>${portrait}<h3>${esc(entry.name||speciesById.get(entry.speciesId).name)}</h3><p>Посажено ${esc(printableDate(entry.plantedAt))}</p><p>Сохранено ${esc(printableDate(entry.archivedAt))}</p>${entry.flowerAt?`<p>Цветение ${esc(printableDate(entry.flowerAt))}</p>`:''}${entry.note?`<p>${esc(entry.note)}</p>`:''}${timeline}</article>`;
      });
      open('Памятные растения',`<p>Здесь сохранены портреты, заметки и наблюдения роста.</p>${cards.length?`<div class="garden-upgrade-grid">${cards.join('')}</div>`:'<p>Памятных портретов ещё нет. Откройте паспорт растения и сохраните первый.</p>'}`);
    }

    function collections() {
      const model = data();
      const collectionRows = model.lists.map((list,index)=>{
        const candidates = api.state.plants.filter(plant=>(!list.water||game.needsWater(plant)) && (!list.favorite||api.extras.layout.favorites.includes(plant.id)) && (!list.tag||model.tags[plant.id]?.includes(list.tag)));
        return `<details><summary>${esc(list.name)} · ${candidates.length}</summary>${candidates.length?`<ul>${candidates.map(plant=>`<li>${native('plant-detail',name(plant),plant.id)}</li>`).join('')}</ul>`:'<p>Под условия сейчас ничего не попадает.</p>'}${button('list-delete','Убрать подборку',String(index))}</details>`;
      });
      const marks = (api.state.decorRewards || []).map(id=>game.TASK_DEFINITIONS.find(task=>task.id===id)).filter(Boolean);
      open('Коллекция сада',`${actions(button('archive','Архив растений'),button('print-herbarium','Выбрать карточки для печати'),button('botany','Ботанические подборки'))}<h3>Мои подборки</h3>${collectionRows.join('')||'<p>Сохраните сочетание условий, чтобы пользоваться им повторно.</p>'}<form data-garden-form="list" class="garden-upgrade-form">${input('name','Имя подборки')}<label class="field"><span>Метка растения</span><input name="tag" maxlength="30"></label><label><input type="checkbox" name="favorite"> Только избранные</label><label><input type="checkbox" name="water"> Нужен полив</label><button class="button secondary">Сохранить подборку</button></form><h3>Памятные таблички</h3>${marks.length?`<ul class="garden-awards">${marks.map(mark=>`<li>${esc(mark.title)} ${button('display-sign',model.displaySign===mark.id?'Убрать из сада':'Поставить в сад',mark.id)}</li>`).join('')}</ul>`:'<p>Выберите табличку в награду за завершённое задание.</p>'}`);
    }

    function printHerbarium() {
      const known = game.CATALOG.filter(species=>api.state.discovered.includes(species.id));
      open('Карточки гербария для печати',known.length?`<form data-garden-form="print-herbarium" class="garden-upgrade-form">${known.map(species=>`<label><input type="checkbox" name="species" value="${esc(species.id)}" checked> ${esc(species.name)}</label>`).join('')}<button class="button primary">Скачать лист A4</button></form>`:'<p>Посадите растение, чтобы открыть его гербарную карточку.</p>');
    }

    function downloadHerbarium(ids) {
      const known = ids.filter(id=>api.state.discovered.includes(id)).map(id=>speciesById.get(id));
      if(!known.length){api.toast('Выберите хотя бы одну карточку.');return;}
      const cards = known.map(species=>{
        const planted = Object.values(data().milestones).filter(entry=>entry.speciesId===species.id).map(entry=>entry.plantedAt).filter(Boolean).sort((a,b)=>a-b)[0];
        return `<article>${art.plantArt(species.id,{id:`print-${species.id}`})}<div><h2>${esc(species.name)}</h2><p><i>${esc(species.latinName)}</i></p><p>${esc(species.fact)}</p>${planted?`<p>Первая известная посадка: ${esc(printableDate(planted))}</p>`:''}</div></article>`;
      }).join('');
      const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Флора · гербарий</title><style>@page{size:A4;margin:14mm}body{font:13px Georgia,serif;color:#264334}article{display:flex;align-items:center;gap:14px;break-inside:avoid;border-bottom:1px solid #cedbcb;padding:8px 0}svg{flex:none;width:85px;height:95px}p,h2{margin:4px 0}</style><h1>Гербарий Flora Keep</h1>${cards}</html>`;
      api.download(new Blob([html],{type:'text/html;charset=UTF-8'}),'flora-herbarium-selection.html');
    }

    const speciesOptions = game.CATALOG.map(species=>[species.id,species.name]);
    const flowerParts = {
      petal:['Лепестки','Форма и окраска могут привлекать опылителей.'],
      stamen:['Тычинки','В пыльниках образуется пыльца.'],
      pistil:['Пестик','На рыльце может попасть пыльца. В завязи находятся семязачатки.'],
      sepal:['Чашелистики','Чашелистики обычно прикрывают бутон снаружи.'],
    };
    const fieldPrompts = {
      opposite:'Найдите пару листьев, растущих напротив друг друга на одном узле.',
      basket:'Рассмотрите соцветие-корзинку и найдите различия между цветками по краю и в центре.',
      veins:'Проследите пальцем по рисунку листа от центральной жилки к боковым.',
      rosette:'Поищите листья, расходящиеся из одной короткой общей розетки.',
    };

    function botany() {
      open('Ботаническая лаборатория',`${actions(button('flower','Разрез цветка'),button('leaves','Сравнить листья'),button('identify','Определитель'),button('germination','Прорастание'),button('ranges','Природный ареал'),button('field','Дневник прогулок'),button('organ-quiz','Органы и их функции'))}<h3>Подборки по признакам</h3><div class="garden-upgrade-grid">${groups.map(([title,ids,description])=>`<article><h4>${esc(title)}</h4><p>${esc(description)}</p>${ids.map(id=>feature('study',speciesById.get(id).name,id)).join('')}</article>`).join('')}</div>`);
    }

    function glossaryEntry(term) {
      const article = knowledge.BOTANICAL_GLOSSARY.find(item=>item.term===term);
      return article ? `<details class="garden-glossary"><summary>${esc(article.term)} · словарь</summary><p>${esc(article.definition)}</p></details>` : '';
    }

    function flower(part='petal') {
      const item = flowerParts[part];
      const weight = key=>key===part?4:1.3;
      const anatomy=`<g transform="translate(94 8)"><path fill="#d1a2ad" stroke="#965374" stroke-width="${weight('petal')}" d="M107 132C53 138 18 96 27 37C70 41 103 80 107 132ZM113 132C167 138 202 96 193 37C150 41 117 80 113 132Z"/><path fill="#91ab76" stroke="#476444" stroke-width="${weight('sepal')}" d="M109 135Q54 141 45 114Q93 117 109 135Q125 117 175 114Q165 139 111 135V168H106Z"/><path stroke="#9e7238" stroke-width="${weight('stamen')}" fill="#e2bb72" d="M96 124L83 70M124 124L138 70M79 63a6 6 0 1 1-2 12a6 6 0 0 1 2-12ZM142 63a6 6 0 1 1 2 12a6 6 0 0 1-2-12Z"/><path stroke="#456547" stroke-width="${weight('pistil')}" fill="#a9bb79" d="M109 114V52L101 47H120L112 52V114Q130 126 112 134Q88 125 109 114Z"/></g>`;
      const callouts=[
        ['petal',15,49,'M15 56H96L125 65',125,65],
        ['sepal',15,143,'M15 150H105L152 133',152,133],
        ['stamen',287,75,'M287 83H263L235 78',235,78],
        ['pistil',287,153,'M287 160H253L205 139',205,139],
      ].map(([key,x,y,path,ax,ay])=>`<g fill="#385643" stroke="#526e50"><path d="${path}" fill="none"/><circle cx="${ax}" cy="${ay}" r="2.2"/><text x="${x}" y="${y}" stroke="none" font-size="13" font-weight="${key===part?700:400}">${esc(flowerParts[key][0])}</text></g>`).join('');
      const drawing=`<svg class="flower-section" viewBox="0 0 385 193" role="img" aria-label="Условный разрез. Лепестки по краям, тычинки вокруг центрального пестика, чашелистики у основания."><rect width="385" height="193" rx="10" fill="#f2f3e7"/>${anatomy}${callouts}</svg>`;
      open('Условный разрез цветка',`<div class="garden-training">${visualJournal.plate(drawing,'Условная шкала цветка')}<article><h3>${esc(item[0])}</h3><p>${esc(item[1])}</p>${glossaryEntry(item[0])}</article></div>${actions(...Object.entries(flowerParts).map(([key,[label]])=>button('flower-part',label,key,key===part?'primary':'secondary')),feature('glossary','Словарь сада'),button('botany','К лаборатории'))}`);
    }

    function leafArtwork(id,aligned=false) {
      if(!['mint','rose'].includes(id)) return art.studyArt(id,'leaf',{labels:!aligned,comparison:aligned});
      const opposite = id==='mint';
      const leaflet = 'M0 0C-25 12-49 4-58-13L-51-14L-55-20L-47-20L-48-26L-38-26L-34-32L-25-28L-20-31Q-5-22 0 0ZM0 0Q-27-12-49-18';
      const shapes = opposite ? [[70,67,0],[70,67,180],[70,120,0],[70,120,180]] : [[70,68,16],[70,68,165],[70,108,16],[70,108,165],[70,53,72]];
      const leaves = shapes.map(([x,y,angle],index)=>`<path d="${leaflet}" transform="translate(${x} ${y}) rotate(${angle}) scale(${opposite?.78:.52})" fill="${index%2?'#aac686':'#9dbb75'}" stroke="#52754e" stroke-width="2.8"/>`).join('');
      const guide=aligned?'<path class="study-comparison-axis" d="M260 49v254" fill="none" stroke="#f5f3d9" stroke-width="2.4" stroke-dasharray="5 5"/><path d="M260 49v254" fill="none" stroke="#315748" stroke-width="1.1" stroke-dasharray="5 5"/>':'';
      return `<svg viewBox="0 0 520 340" role="img" aria-label="${opposite?'Листья мяты расположены попарно':'Несколько листочков на общей оси листа розы'}"><rect width="520" height="340" rx="14" fill="#f2f3e7"/><g transform="translate(113 0) scale(2.1)"><path d="M70 142V41" stroke="#b07e46" stroke-width="3.5"/>${leaves}<circle cx="70" cy="67" r="6" stroke="#975d35" fill="none" stroke-width="2"/><circle cx="70" cy="${opposite?120:108}" r="6" stroke="#975d35" fill="none" stroke-width="2"/></g>${guide}</svg>`;
    }

    function leaves(first='mint',second='rose') {
      const columns = [first,second].map(id=>{
        const species = speciesById.get(id);
        const leaf = knowledge.KNOWLEDGE[id].leaf;
        const term = ({mint:'Супротивные листья',rose:'Сложный лист',fern:'Вайя',aloe:'Розетка'})[id] || 'Жилки';
        return `<article><div class="leaf-axis-wrap">${visualJournal.plate(leafArtwork(id,true),'Условная шкала листа')}</div><h3>${esc(species.name)} · ${esc(leaf.label)}</h3><p>${esc(leaf.description)}</p><p><strong>Признаки:</strong> ${esc(leaf.highlights.join(' · '))}</p>${glossaryEntry(term)}</article>`;
      }).join('');
      open('Сравните листья',`<form data-garden-form="leaves" class="garden-upgrade-form">${select('first','Первый вид',speciesOptions,first)}${select('second','Второй вид',speciesOptions,second)}<button class="button secondary">Сопоставить</button></form><p class="form-help">Пунктир отмечает срединную жилку или общую ось образца.</p><div class="garden-upgrade-grid leaf-examples">${columns}</div>${actions(feature('glossary','Словарь признаков'),button('botany','К лаборатории'))}`);
    }

    const traits = {
      daisy:['basket','divided'], lavender:['spike','narrow'], sunflower:['basket','wide'],
      tulip:['cup','strap'], mint:['spike','toothed'], cactus:['small','spines'],
      rose:['many-petals','divided'], monstera:['unseen','holes'], fern:['unseen','divided'],
      orchid:['spike','fleshy'], aloe:['spike','fleshy'],
    };
    const habits = {
      daisy:'herb',lavender:'shrub',sunflower:'herb',tulip:'bulb',mint:'herb',cactus:'succulent',
      rose:'shrub',monstera:'climber',fern:'herb',orchid:'epiphyte',aloe:'succulent',
    };

    function identify(flowering='',leaf='',habit='') {
      const form = `<form data-garden-form="identify" class="garden-upgrade-form">${select('flower','Цветение',[['','Любое'],['basket','Корзинка'],['spike','Группа вдоль цветоноса'],['cup','Чашевидный цветок'],['many-petals','Много заметных лепестков'],['small','Небольшие цветки'],['unseen','Цветков не видно']],flowering)}${select('leaf','Форма листа',[['','Любая'],['divided','Разделённый или сложный'],['wide','Широкий'],['narrow','Узкий'],['strap','Ремневидный'],['toothed','Зубчатый'],['holes','Прорези или отверстия'],['fleshy','Мясистый'],['spines','Колючки вместо видимых листьев']],leaf)}${select('habit','Общий облик',[['','Любой'],['herb','Травянистое'],['shrub','Кустарник'],['bulb','Луковичное'],['succulent','Суккулент'],['climber','Лазящее'],['epiphyte','Эпифит']],habit)}<button class="button secondary">Найти варианты</button></form>`;
      const matches = game.CATALOG.filter(species=> (!flowering||traits[species.id][0]===flowering) && (!leaf||traits[species.id][1]===leaf) && (!habit||habits[species.id]===habit));
      open('Определитель видов из каталога',`<p>Сопоставьте несколько видимых признаков. Результаты охватывают только растения из Flora Keep.</p>${form}${matches.length?actions(...matches.map(species=>feature('study',species.name,species.id))):'<p>Ослабьте одно из условий, чтобы увидеть близкие варианты.</p>'}`);
    }

    const germinationSteps = [
      ['Семя','Внутри семени есть зародыш и запас веществ.'],
      ['Набухание','Семя впитывает воду, и процессы внутри него активизируются.'],
      ['Первичный корень','Корешок выходит первым и закрепляется в субстрате.'],
      ['Всход','Побег поднимается, раскрываются семядоли.'],
      ['Первые настоящие листья','Новые листья постепенно принимают характерную для вида форму.'],
    ];

    function germination() {
      open('Как прорастает семя',`<p>Условная схема для знакомства с основными стадиями.</p><label class="field"><span>Стадия прорастания</span><input type="range" min="0" max="4" value="0" step="1" data-germination></label><div data-germination-stage></div>${actions(button('botany','К лаборатории'))}`);
      paintGermination(document.querySelector('[data-germination]'));
    }

    function paintGermination(control) {
      const step = Number(control.value);
      const [title,description] = germinationSteps[step];
      control.setAttribute('aria-valuetext',title);
      const drawing = `<svg viewBox="0 0 250 142" role="img" aria-label="${esc(title)}"><path d="M27 78H223V130H27Z" fill="#e8dbc3"/><ellipse cx="122" cy="85" rx="${13+step/2}" ry="${6+step/2}" fill="#bc936b" transform="rotate(-18 122 85)"/>${step>=2?'<path d="M124 89Q127 100 112 118M123 102Q132 108 138 114" fill="none" stroke="#8c6a54" stroke-width="2.5"/>':''}${step>=3?'<path d="M121 85Q127 66 122 53" stroke="#527057" stroke-width="4"/><path d="M123 59Q98 59 96 46Q109 43 123 59Q136 44 152 47Q147 62 123 59Z" fill="#91ad72"/>':''}${step>=4?'<path d="M122 55Q117 38 124 27" stroke="#527057" stroke-width="4"/><path d="M123 36Q102 37 99 19Q115 20 123 36Q134 13 152 17Q145 32 123 36Z" fill="#5f8b62"/>':''}</svg>`;
      document.querySelector('[data-germination-stage]').innerHTML = `<div class="garden-training">${visualJournal.plate(drawing,'Условная шкала семени')}<article><h3>${esc(title)}</h3><p>${esc(description)}</p></article></div>`;
    }

    function ranges(id='monstera') {
      const item = speciesById.get(id);
      const source = knowledge.KNOWLEDGE[id].sources[0];
      const region=id==='monstera'?'<path class="range-map-area" d="M141 110Q169 112 181 125T232 144" stroke-width="13" stroke-linecap="round"/>':'<circle class="range-map-area" cx="111" cy="88" r="10" stroke-width="6"/>';
      const world = `<figure class="range-map-figure"><svg viewBox="0 0 270 172" role="img" aria-label="Схематичный ареал на карте Мексики и Центральной Америки"><path class="range-map-land" d="M12 12H175L165 30L144 43L131 62L144 80L169 89L183 106L209 115L226 133L247 141L250 157L224 151L210 138L189 136L170 127L154 121L151 106L136 118L109 111L86 98L66 82L55 58L36 54L15 31Z"/><path class="range-map-land" d="M119 83L132 94L127 102" fill="none"/>${region}<text x="66" y="69" class="range-map-label">Мексика</text><text x="193" y="167" class="range-map-label">Панама</text><text x="231" y="26" class="range-map-label">С</text><path d="M236 53V33m-5 7 5-7 5 7" stroke="currentColor" opacity=".65" fill="none"/></svg><figcaption class="range-map-legend"><span><i class="range-swatch-live" aria-hidden="true"></i>Природный ареал</span><span><i aria-hidden="true"></i>Суша</span></figcaption></figure>`;
      open(`Ареал · ${item.name}`,`<div class="garden-training">${world}<article><p>${id==='monstera'?'Ареал монстеры простирается от Мексики до Панамы.':'Маммиллярия удлинённая встречается в Центральной Мексике.'}</p><p>Область отмечена схематично.</p>${source?`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label || 'Источник')}</a>`:''}</article></div>${actions(button('range','Монстера','monstera'),button('range','Маммиллярия','cactus'),button('botany','К лаборатории'))}`);
    }

    function field() {
      const model = data();
      open('Дневник прогулок',`<h3>На что посмотреть</h3><ul class="garden-upgrade-list">${Object.entries(fieldPrompts).map(([key,prompt])=>`<li><label><input type="checkbox" data-field-check="${key}" ${model.fieldChecks.includes(key)?'checked':''}> ${esc(prompt)}</label></li>`).join('')}</ul><h3>Ваши наблюдения</h3><form data-garden-form="field-note" class="garden-upgrade-form"><label class="field"><span>Что заметили?</span><textarea name="note" maxlength="500" required></textarea></label><label class="field"><span>Фотография наблюдения</span><input type="file" name="photo" accept="image/jpeg,image/png"></label><button class="button primary">Добавить запись</button></form>${model.field.map(row=>`<article class="garden-field-note"><time>${esc(printableDate(row.at))}</time><p>${esc(row.note)}</p>${row.photo?`<img src="${esc(row.photo)}" alt="Фотография наблюдения" loading="lazy">`:''}</article>`).join('')}${actions(button('botany','К лаборатории'))}`);
    }

    async function fieldPhoto(file) {
      if(!file?.size) return '';
      if(!['image/jpeg','image/png'].includes(file.type) || file.size>8*1024*1024) throw new Error('Выберите PNG или JPEG размером до 8 МБ.');
      const img = await createImageBitmap(file);
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1,600/Math.max(img.width,img.height));
        canvas.width = Math.max(1,Math.round(img.width*scale));
        canvas.height = Math.max(1,Math.round(img.height*scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg',.58);
        if(dataUrl.length>140000) throw new Error('Изображение получилось крупным. Выберите фотографию меньшего размера.');
        return dataUrl;
      } finally { img.close(); }
    }

    function organQuiz() {
      const answers = [['','Выберите назначение'],['water','Запасает воду'],['anchorage','Удерживает растение и поглощает воду'],['pollen','Образует пыльцу']];
      open('Орган и его функция',`<form data-garden-form="organ-quiz" class="garden-upgrade-form">${select('aloe','Мясистый лист алоэ',answers,'')}${select('root','Корень',answers,'')}${select('stamen','Пыльник тычинки',answers,'')}<button class="button primary">Проверить</button><p data-organ-feedback role="status"></p></form>${actions(button('botany','К лаборатории'))}`);
    }

    function afterRender() {
      const main = document.querySelector('#main');
      const toolbar = main?.querySelector('.feature-toolbar');
      if(!toolbar || main.querySelector('.garden-upgrade-toolbar')) return;
      const routes = [button('plans','План ухода'),button('collections','Коллекция'),button('botany','Ботаника')];
      if(api.page==='garden' && !api.state.plants.length) routes.unshift(button('onboarding','С чего начать?','','primary'));
      if(api.page==='herbarium') routes.push(button('print-herbarium','Печать подборки'));
      toolbar.insertAdjacentHTML('afterend',`<nav class="garden-upgrade-toolbar" aria-label="Уход, коллекция и ботанические занятия">${routes.join('')}</nav>`);
      if(api.page==='garden' && api.state.decorRewards?.includes(data().displaySign)) {
        const sign=game.TASK_DEFINITIONS.find(task=>task.id===data().displaySign);
        main.querySelector('.garden-upgrade-toolbar').insertAdjacentHTML('afterend',`<div class="garden-sign">${esc(sign.title)}</div>`);
      }
      if(api.page==='journal') {
        const rows = Object.values(data().milestones).filter(entry=>entry.flowerAt).sort((a,b)=>b.flowerAt-a.flowerAt).slice(0,10);
        if(rows.length) main.querySelector('.garden-upgrade-toolbar').insertAdjacentHTML('afterend',`<details class="garden-bloom-milestones"><summary>Первые цветения · ${rows.length}</summary><ul>${rows.map(row=>`<li>${esc(speciesById.get(row.speciesId).name)} · ${esc(printableDate(row.flowerAt))}</li>`).join('')}</ul></details>`);
      }
    }

    function showStudioExample(body, kind) {
      if(data().seenExamples.includes(kind)) return;
      const catalog=game.CATALOG;
      let example;
      if(kind==='terrarium') {
        const intro=body.querySelector('.terrarium-intro');
        if(!intro)return;
        example = {intro,description:'Начните с готового лесного уголка и сдвиньте один камень в композиции.',action:'Открыть пример',artwork:terrarium.renderTerrariumSVG(terrarium.terrariumPreset('forest'),{art,catalog,id:'garden-example-terra'})};
      }
      if(kind==='atelier') {
        const intro=body.querySelector('.atelier-intro');
        if(!intro)return;
        example = {intro,description:'Выберите готовую чашу и измените ширину одного кольца.',action:'Взять профиль чаши',artwork:atelier.renderPotSVG(atelier.defaultAtelierState().draft,{id:'garden-example-pot'})};
      }
      if(kind==='story-studio') {
        const intro=body.querySelector('.story-intro');
        if(!intro)return;
        example = {intro,description:'Посмотрите, как движутся персонажи на готовой сцене, и затем выберите движение своего героя.',action:'Проиграть сцену',artwork:storyStudio.renderStoryScene(storyStudio.defaultStoryStudioState().draft,{art,catalog})};
      }
      if(example) example.intro.insertAdjacentHTML('afterend',`<aside class="garden-example garden-training" data-garden-overlay>${example.artwork}<div><strong>Пример завершённой работы</strong><p>${esc(example.description)}</p>${actions(button('studio-example',example.action,kind))}</div></aside>`);
    }

    function afterDialog(kind,id) {
      const body = document.querySelector('#dialog .dialog-body');
      if(!body || body.querySelector('[data-garden-overlay]'))return;
      if(kind==='preview') {
        const plantAction = body.querySelector('[data-action="plant"]');
        const species = speciesById.get(plantAction?.dataset.id);
        if(!species)return;
        if(plantAction.disabled) {
          const ready = api.state.plants.reduce((total,plant)=>total+plant.earned,0)>=1;
          const goal = ready ? button('collect-from-preview','Собрать доступный доход',species.id) : feature('plans','Проверить доступные награды');
          plantAction.insertAdjacentHTML('afterend',actions(goal));
        }
        if(api.state.plants.length)return;
        const rate = api.state.careProfile==='classic'?4:species.waterPerHour;
        const firstHours = species.growthHours*.12;
        const waterHours = 30/rate;
        plantAction.insertAdjacentHTML('beforebegin',`<p data-garden-overlay class="garden-inline-note">В учебном старте полив доступен сразу. После полива ещё один понадобится примерно через ${displayNumber(waterHours)} ч. Первое заметное изменение ростка — примерно через ${displayNumber(firstHours)} ч достаточной влажности.</p>`);
      }
      if(kind==='plant') {
        const plant = plantById(id);
        if(!plant)return;
        const first = api.state.plants.length===1 && api.state.discovered.length===1;
        const validFirstCare = first && plant.research===0 && game.needsWater(plant);
        const carePanel = body.querySelector('.care-info');
        if(validFirstCare) carePanel?.querySelector('[data-action="water"]')?.insertAdjacentHTML('beforebegin',`<p class="garden-inline-note">Влажность ${displayNumber(plant.moisture)}%. Полив уже доступен, потому что показатель опустился до 70% или ниже.</p>`);
        const next = first && plant.research===1 ? actions(feature('study','Узнать один факт',plant.speciesId),feature('edit-plant','Дать имя или выбрать горшок',plant.id)) : '';
        carePanel?.insertAdjacentHTML('beforeend',`<div data-garden-overlay><p class="garden-inline-note">${esc(careExplanation(api.state,plant,Date.now()))}</p>${actions(button('conditions','Место, грунт и мульча',id),button('passport','Паспорт растения',id))}${next}</div>`);
      }
      if(kind==='supplies') {
        const prices = {WATER:game.WATER_PRICE,FERTILIZER:game.FERTILIZER_PRICE,SUPER_FERTILIZER:game.SUPER_FERTILIZER_PRICE};
        for(const buy of body.querySelectorAll('[data-action="buy"]')) {
          const cost = prices[buy.dataset.id];
          const after = api.state.coins-cost;
          const note = `garden-quote-${buy.dataset.id}`;
          buy.setAttribute('aria-describedby',note);
          buy.closest('.supply-row')?.querySelector('.supply-description')?.insertAdjacentHTML('beforeend',`<p id="${note}">Цена: ${displayNumber(cost)} монет · ${after>=0?`останется ${displayNumber(after)}`:`не хватает ${displayNumber(-after)}`}</p>`);
        }
        body.insertAdjacentHTML('beforeend',`<div data-garden-overlay>${actions(button('economy','Кошелёк и операции'),button('supplies-exchange','Обменять 5 воды на 1 подкормку'))}</div>`);
      }
      if(kind==='remove') {
        const plant = body.querySelector('[data-action="remove"]');
        if(plant) plant.insertAdjacentHTML('beforebegin',button('archive-remove','Сохранить портрет и убрать',plant.dataset.id));
      }
      showStudioExample(body,kind);
      if(kind==='feature' && body.querySelector('.return-list')) {
        const workshop = api.extras.layout.lastWorkshop;
        const workshopResume = workshop ? feature(workshop.kind==='terrarium'?'terrariums':'scene-studio','Продолжить последнюю мастерскую') : '';
        const recent = data().resume;
        const recentPlant = recent && plantById(recent.plantId);
        const note = recent ? `<p>Последнее действие: ${esc(recent.title)}</p>` : '';
        body.insertAdjacentHTML('beforeend',`<div data-garden-overlay><p>Влажность снижается со временем. Взрослые растения накапливают монеты, пока почва влажная и остаётся здоровье.</p>${note}${actions(recentPlant?native('plant-detail',`Открыть · ${name(recentPlant)}`,recentPlant.id):'',workshopResume,button('plans','Посмотреть ближайший уход'))}</div>`);
      }
      if(body.querySelector('.atlas-writing')) body.querySelector('.atlas-writing').insertAdjacentHTML('beforeend',`<div data-garden-overlay>${actions(button('ranges','Карты природных ареалов'))}</div>`);
    }

    const openRoutes = {
      onboarding, tutorial, plans, economy, compare, collections, archive, botany, flower, leaves, identify, germination, field,
      ranges, passport, conditions, lineage, 'print-herbarium':printHerbarium, 'organ-quiz':organQuiz,
    };
    for(const action of ['onboarding','tutorial','plans','economy','compare','collections','archive','botany','flower','leaves','identify','germination','field','ranges','print-herbarium','organ-quiz']) {
      const show=openRoutes[action];
      openRoutes[action]=()=>show();
    }

    async function archivePlant(id) {
      const plant = plantById(id);
      if(!plant)return false;
      await save(model=>{
        const appearance = api.extras.appearance[id];
        const entry = model.milestones[id] || {};
        const snapshot = {...entry,id,plantedAt:plant.plantedAt,speciesId:plant.speciesId,lineageId:plant.lineageId,parentLineageId:plant.parentLineageId,name:name(plant),note:appearance?.note || '',growth:plant.growth,pot:appearance?.pot || api.prefs.pot,shape:appearance?.shape,material:appearance?.material,history:api.extras.history[id] || [],archivedAt:Date.now()};
        model.archive = [snapshot,...model.archive.filter(item=>item.id!==id)].slice(0,24);
      },'Портрет сохранён в архиве.');
      return !api.saveProblem;
    }

    async function handleClick(action,id) {
      if(Object.hasOwn(openRoutes,action)) { openRoutes[action](id);return; }
      if(action==='flower-part' && Object.hasOwn(flowerParts,id)) flower(id);
      if(action==='range' && ['monstera','cactus'].includes(id)) ranges(id);
      if(action==='demo-start') { demoStart=Date.now();demo=game.initialState(demoStart);demoStep=0;training(); }
      if(action==='demo-step' && demo && demoStep<4) playTrainingStep();
      if(action==='creative-profile') await api.createProfile('Творческий сад','creative');
      if(action==='tutorial-step' && ['1','2','3'].includes(id)) {
        await api.commit(({extras})=>{extras.tutorial=Number(id);});
        api.closeDialog();
        const plant = plantById(api.state.selectedPlantId) || api.state.plants[0];
        if(id==='3' && plant) {api.navigate('garden');api.showPlant(plant.id);}
        else api.navigate('catalog');
      }
      if(action==='care-mode') {
        await api.runGame(state=>game.setCareProfile(state,'studio'));
        plans();
      }
      if(action==='collect-from-preview' && validSpecies(id)) {
        const collected=await api.runGame(state=>game.collect(state),'coin','coins');
        if(collected) open('Доход собран',`<p>В кошельке ${displayNumber(api.state.coins)} монет.</p>${actions(native('preview',`Вернуться · ${speciesById.get(id).name}`,id),button('economy','Кошелёк сада'))}`);
      }
      if(action==='water-queue') {
        await api.runGame(state=>game.waterAll(state),'water','water');
        plans();
      }
      if(action==='recover-next') {
        await api.runGame(state=>game.recover(state,id),'water','water');
        plans();
      }
      if(action==='mulch') {
        await api.runGame(state=>game.spreadMulch(state,id));
        conditions(id);
      }
      if(action==='supplies-exchange') {
        const from = api.dialogKind;
        await api.runGame(state=>game.exchangeSupplies(state),'coin');
        if(from!=='supplies')economy();
      }
      if(action==='archive-plant' || action==='archive-remove') {
        const archived = await archivePlant(id);
        if(archived && action==='archive-remove') document.querySelector('#dialog [data-action="remove"]')?.click();
        else if(archived) passport(id);
      }
      if(action==='list-delete') {
        await save(model=>{model.lists=model.lists.filter((_,index)=>index!==Number(id));},'Подборка убрана.');
        collections();
      }
      if(action==='display-sign' && api.state.decorRewards?.includes(id)) {
        await save(model=>{model.displaySign=model.displaySign===id?'':id;});
        collections();
      }
      if(action==='season-pause') {
        await save(model=>{if(model.season) model.season.paused=!model.season.paused;});
        plans();
      }
      if(action==='season-visit') {
        const now=Date.now();
        const current=data().season;
        if(!current || current.paused || current.startAt>now || new Date(current.lastVisit).toDateString()===new Date(now).toDateString() || !api.state.plants.length) {
          api.toast('Отметка доступна после начала задания по одному наблюдению в день в саду с растениями.');return;
        }
        await save(model=>{
          if(model.season?.startAt===current.startAt && new Date(model.season.lastVisit).toDateString()!==new Date(now).toDateString()) {
            model.season.visits=Math.min(4,model.season.visits+1);model.season.lastVisit=now;
          }
        },'Наблюдение отмечено.');
        plans();
      }
      if(action==='studio-example' && ['terrarium','atelier','story-studio'].includes(id)) {
        await save(model=>{model.seenExamples.push(id);});
        const dialog = document.querySelector('#dialog');
        dialog?.querySelector('.garden-example')?.remove();
        if(id==='terrarium') dialog?.querySelector('[data-terrarium="preset"][data-preset="forest"]')?.click();
        if(id==='story-studio') dialog?.querySelector('[data-story="play"]')?.click();
        if(id==='atelier') {
          const select=dialog?.querySelector('[name="atelier-shape"]');
          if(select) {select.value='bowl';select.dispatchEvent(new Event('change',{bubbles:true}));}
        }
      }
    }

    async function handleForm(form) {
      const {gardenForm:action,id} = form.dataset;
      const values = new FormData(form);
      if(action==='conditions') {
        await api.runGame(state=>game.setEnvironment(state,id,values.get('site'),values.get('soil')));
        conditions(id);
      }
      if(action==='budget') {
        const key=values.get('budget'),direction=values.get('direction'),amount=Number(values.get('amount'));
        if(!['seeds','shelf'].includes(key) || !['reserve','release'].includes(direction) || !Number.isSafeInteger(amount) || amount<1) throw new Error('Введите положительное целое число монет.');
        await api.commit(({extras,state})=>{
          const model=extras.gardenUpgrades ||= normalize(null);
          const reserve = direction==='reserve';
          const available = reserve?state.coins:model.budgets[key];
          if(amount>available) throw new Error('Недостаточно монет для этой операции.');
          if((reserve?model.budgets[key]:state.coins)+amount>2147483647) throw new Error('Сумма превышает вместимость кошелька.');
          model.budgets[key] += reserve?amount:-amount;
          return {state:{...state,coins:state.coins+(reserve?-amount:amount)}};
        },'Монеты переложены.');
        economy();
      }
      if(action==='reward') {
        await api.runGame(state=>game.claimTask(state,id,Date.now(),values.get('reward')),'spark');
        economy();
      }
      if(action==='tags') {
        await save(model=>{model.tags[id]=String(values.get('tags')).split(',');},'Метки сохранены.');
        passport(id);
      }
      if(action==='list') {
        await save(model=>{model.lists=[...model.lists.filter(list=>list.name!==text(values.get('name'),40)),{name:text(values.get('name'),40),tag:text(values.get('tag'),30),favorite:values.has('favorite'),water:values.has('water')}].slice(-12);},'Подборка сохранена.');
        collections();
      }
      if(action==='compare' || action==='leaves') {
        const first=values.get('first'),second=values.get('second');
        if(validSpecies(first) && validSpecies(second)) (action==='compare'?compare:leaves)(first,second);
      }
      if(action==='print-herbarium') downloadHerbarium(values.getAll('species'));
      if(action==='identify') identify(values.get('flower'),values.get('leaf'),values.get('habit'));
      if(action==='field-note') {
        const note = text(values.get('note'),500);
        if(!note) throw new Error('Добавьте наблюдение.');
        const photo = await fieldPhoto(values.get('photo'));
        await save(model=>{
          const used = model.field.slice(0,9).reduce((bytes,row)=>bytes+row.photo.length,0);
          if(used + photo.length > 420000) throw new Error('Дневник заполнен фотографиями. Сохраните наблюдение только с текстом или выберите меньшее изображение.');
          model.field.unshift({at:Date.now(),note,photo});
        },'Наблюдение добавлено.');
        field();
      }
      if(action==='organ-quiz') {
        const right = Number(values.get('aloe')==='water')+Number(values.get('root')==='anchorage')+Number(values.get('stamen')==='pollen');
        form.querySelector('[data-organ-feedback]').textContent = right===3?'Все три пары верны.':`${right} из 3. Подсказка: пыльца образуется в пыльнике, корень закрепляет растение, алоэ запасает воду в листьях.`;
      }
      if(action==='season') {
        const date = String(values.get('date'));
        const kind=values.get('study');
        if(!Object.hasOwn(seasonalStudies,kind))throw new Error('Выберите сезонное наблюдение.');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Введите дату в формате ГГГГ-ММ-ДД.');
        const startAt = new Date(`${date}T00:00:00`).getTime();
        const formatted = new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit'});
        const parts = Number.isFinite(startAt)?Object.fromEntries(formatted.formatToParts(startAt).map(part=>[part.type,part.value])):{};
        if(!time(startAt) || `${parts.year}-${parts.month}-${parts.day}`!==date) throw new Error('Укажите существующую дату.');
        await save(model=>{model.season={kind,startAt,paused:false,visits:0,lastVisit:0};},'Сезонное наблюдение запланировано.');
        plans();
      }
    }

    function quizHint(control) {
      const id=control.dataset.id;
      const selected=Number(control.dataset.value);
      const question=knowledge.QUIZZES.find(item=>item.speciesId===id);
      const feedback=document.querySelector('#quiz-feedback');
      const result=question && knowledge.checkQuizAnswer(question.id,selected);
      if(!feedback || !result)return;
      if(feedback.nextElementSibling?.matches('[data-garden-quiz-hint]')) feedback.nextElementSibling.remove();
      if(!result.correct) {
        const view=['tulip','monstera'].includes(id) ? 'roots' : ['mint','rose','aloe','daisy','sunflower'].includes(id) ? 'leaf' : 'plant';
        const drawing = view==='roots' ? art.studyArt(id,'roots') : view==='leaf' ? leafArtwork(id) : art.plantArt(id,{id:`quiz-hint-${id}`});
        feedback.insertAdjacentHTML('afterend',`<figure data-garden-quiz-hint class="garden-training">${drawing}<figcaption>${esc(result.explanation)}</figcaption></figure>`);
      }
    }

    document.addEventListener('click',event=>{
      const action=event.target.closest('[data-garden-upgrade]');
      if(action && !action.disabled) {
        event.preventDefault();
        handleClick(action.dataset.gardenUpgrade,action.dataset.id).catch(error=>api.toast(error?.message || 'Не получилось выполнить действие.'));
      }
      const answer=event.target.closest('[data-feature="quiz-answer"]');
      if(answer) quizHint(answer);
    });
    document.addEventListener('submit',event=>{
      const form=event.target.closest('[data-garden-form]');
      if(!form)return;
      event.preventDefault();
      handleForm(form).catch(error=>api.toast(error?.message || 'Не получилось сохранить изменение.'));
    });
    document.addEventListener('input',event=>{
      if(event.target.matches('[data-germination]')) paintGermination(event.target);
    });
    document.addEventListener('change',event=>{
      const conditionForm=event.target.closest('[data-garden-form="conditions"]');
      if(conditionForm) previewConditions(conditionForm);
      const key=event.target.dataset.fieldCheck;
      if(key && Object.hasOwn(fieldPrompts,key)) save(model=>{
        model.fieldChecks=event.target.checked?[...model.fieldChecks,key]:model.fieldChecks.filter(value=>value!==key);
      }).catch(error=>api.toast(error?.message || 'Не получилось сохранить отметку.'));
    });
    return {afterRender,afterDialog};
  }

  return Object.freeze({normalize,record,matchesSpecies,create});
})();
