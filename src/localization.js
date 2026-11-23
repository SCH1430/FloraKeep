const floraLocale = (() => {
  const storageKey = 'flora-keep-language';
  const locales = ['ru','en'];
  const phrases = {
    garden:['Мой сад','My garden'], gardenShort:['Сад','Garden'], catalog:['Каталог растений','Plant catalogue'], catalogShort:['Каталог','Catalogue'],
    herbarium:['Гербарий','Herbarium'], journal:['Журнал роста','Growth journal'], journalShort:['Журнал','Journal'],
    mainNavigation:['Основная навигация','Main navigation'], mobileNavigation:['Навигация на телефоне','Mobile navigation'],
    expandNavigation:['Развернуть навигацию','Expand navigation'], collapseNavigation:['Свернуть навигацию','Collapse navigation'],
    gardenSettings:['Настройки сада','Garden settings'], switchGarden:['Переключить сад','Switch garden'],
    gardenCorner:['Мой зелёный уголок','My green corner'], brandGarden:['Flora Keep — мой сад','Flora Keep — my garden'],
    growWithCare:['РАСТИТЕ С ЗАБОТОЙ','GROW WITH CARE'], greenWorld:['ВАШ ЗЕЛЁНЫЙ МИР','YOUR GREEN WORLD'],
    beeNearby:['ЖУЖА РЯДОМ','ZHUZHA IS HERE'], smallBeginnings:['Даже самый большой сад начинается с маленького ростка.','Even the biggest garden starts with a little sprout.'],
    ownPace:['Всё в своём темпе.','Take it at your own pace.'], sayHello:['Давайте знакомиться','Let’s get to know each other'],
    madeWithLove:['С любовью к маленьким чудесам','For the love of little wonders'], footer:['Немного заботы. Немного магии. Ваш сад.','A little care. A little magic. Your garden.'],
    projectStory:['История Flora Keep','The story of Flora Keep'], enableSounds:['Включить звуки','Turn on sounds'], disableSounds:['Выключить звуки','Turn off sounds'],
    close:['Закрыть','Close'], skip:['К содержимому','Skip to content'], back:['Вернуться','Go back'],
    storageFailed:['Браузер не смог записать сад.','The browser could not save your garden.'], backupEmergency:['Скачать аварийную копию','Download emergency backup'],
    saveCopy:['Сохранить копию','Save a backup'], restore:['Восстановить','Restore'], saved:['Автосохранение','Autosave'],
    worlds:['Маленькие миры','Little worlds'], tools:['Возможности','Tools'], planCare:['План ухода','Care plan'], collection:['Коллекция','Collection'],
    botany:['Ботаника','Botany'], start:['С чего начать?','Where should I start?'], printCollection:['Печать подборки','Print selection'],
    helpRoutes:['Уход, коллекция и ботанические занятия','Care, collections and botanical activities'],
    botanicalDiscovery:['МИР МАЛЕНЬКИХ БОТАНИЧЕСКИХ ОТКРЫТИЙ','A WORLD OF LITTLE BOTANICAL DISCOVERIES'],
    discoverPlants:['От нежной ромашки до тропической монстеры. Найдите своё растение.','From delicate chamomile to tropical monstera. Find a plant for your garden.'],
    giftFirst:['Первое растение в подарок','Your first plant is a gift'], allPlants:['Все растения','All plants'], flowering:['Цветущие','Flowering'],
    foliage:['Зелёные','Foliage'], succulents:['Суккуленты','Succulents'], categories:['Категория растений','Plant category'],
    findPlant:['Найти растение','Find a plant'], filterAdvanced:['Цена, время и избранное','Price, time and favourites'],
    maxPrice:['Цена до','Maximum price'], maxGrowing:['Взросление до, ч','Maximum growing time, h'], onlyFavourites:['Избранные виды','Favourite species'],
    resetSearch:['Сбросить поиск','Reset search'], plantSearchEmpty:['Такого ростка пока нет','No plants found'],
    findAnother:['Попробуйте другое название или категорию.','Try a different name or category.'],
    gamePrices:['Сроки роста и цены придуманы для игры. Все покупки — только за игровые монеты.','Growing times and prices are part of the game. Purchases use in-game coins.'],
    alreadyOwned:['Уже в коллекции','Already in your collection'], gift:['В подарок','Free'], plantInGarden:['Посадить в сад','Plant in the garden'],
    herbariumIntro:['КОЛЛЕКЦИЯ МАЛЕНЬКИХ ОТКРЫТИЙ','A COLLECTION OF LITTLE DISCOVERIES'], yourHerbarium:['Ваш гербарий','Your herbarium'],
    cyanotype:['Цианотипия','Cyanotype'], cyanotypeIntro:['Сравните отпечатки взрослых растений с экземплярами из своего сада.','Compare prints of mature plants with specimens from your garden.'],
    printIndex:['Указатель видов','Species index'], printSpecies:['Открытый вид','Discovered species'], printCount:['Открыто видов: {count} из {total}','Species discovered: {count} of {total}'],
    matureImprint:['Отпечаток взрослого растения','Mature plant print'], livePortrait:['Живой экземпляр','Living specimen'], referencePortrait:['Справочный рисунок','Reference illustration'],
    viewRecord:['Карточка вида','Species record'], seeSpecimen:['Уход за экземпляром','Care for this specimen'], archiveNote:['Вид уже открыт. Сейчас в саду нет его экземпляров.','This species is in your collection. There are currently no living specimens in your garden.'],
    researchScore:['Исследование {level}/5','Research {level}/5'], nextImprint:['Первый отпечаток','Your first print'],
    nextImprintHint:['Посадите семена. Их вид откроет первую страницу гербария.','Plant some seeds to open the first page of your herbarium.'],
    pickFirstSpecies:['Выбрать первый вид','Choose your first species'], pagePrint:['Лист {number}','Plate {number}'], plantChronicle:['Фотохроника роста','Growth chronicle'],
    herbariumDescription:['Посадите растение, чтобы открыть его историю. Ухаживайте — чтобы узнать больше.','Plant a specimen to unlock its story. Care for it to learn more.'],
    unlockPlant:['Посадите, чтобы открыть','Plant to unlock'], journalIntro:['У КАЖДОГО РОСТКА ЕСТЬ ИСТОРИЯ','EVERY SPROUT HAS A STORY'],
    journalDescription:['Здесь остаются ваши маленькие шаги и большие открытия.','Your little steps and big discoveries are recorded here.'],
    journalEmpty:['Первая страница ещё впереди','The first page is still waiting'], journalEmptyDescription:['Посадите росток — и начнётся история вашего сада.','Plant a sprout to start your garden’s story.'],
    choosePlant:['Выбрать растение','Choose a plant'], latest:['Последнее','Latest'],
    atmospheric:['Атмосфера','Atmosphere'], careSounds:['Звуки заботы','Care sounds'], shortSounds:['Капли воды, посадка и звон монет.','Water drops, planting and the sound of coins.'],
    music:['Музыка сада','Garden music'], slowMusic:['Тихая мелодия, чтобы замедлиться.','A gentle melody to slow down with.'],
    gentleMotion:['Спокойное движение','Reduced motion'], lowerMotion:['Меньше анимаций, столько же красоты.','Fewer animations, with the same illustrations.'],
    potColour:['Цвет ваших горшков','Your pot colours'], terracotta:['Терракота','Terracotta'], sage:['Шалфей','Sage'], cream:['Молочный','Cream'],
    gardenStays:['Ваш сад всегда с вами','Keep your garden with you'], browserSave:['Сад хранится в этом браузере. Скачайте копию, чтобы перенести его на другое устройство или сохранить отдельно.','Your garden is saved in this browser. Download a copy to move it to another device or keep a separate backup.'],
    moreSettings:['Больше возможностей','More tools'], atelier:['Мастерская','Workshop'], appearance:['Цвет и движение','Colour and motion'],
    accessibility:['Удобство','Accessibility'], backups:['Сохранения','Backups'], profiles:['Мои сады','My gardens'], nameGarden:['Имя сада','Garden name'],
    classFile:['Общий файл класса','Shared class file'], storyAuthors:['История и авторы проекта','Project story and credits'],
    install:['Установить Flora Keep','Install Flora Keep'],
    chooseFirstSprout:['Выбрать первый росток','Choose your first sprout'], startingStory:['ПЕРВАЯ МАЛЕНЬКАЯ ИСТОРИЯ','A LITTLE STORY BEGINS'],
    sillTitle:['Интерактивный подоконник','Interactive windowsill'], sillPlants:['Растения на подоконнике','Plants on the windowsill'],
    sillSeedName:['Семена · {name}','Seeds · {name}'], sillPrevious:['Предыдущее','Previous'], sillNext:['Следующее','Next'],
    sillPreviousShelf:['Предыдущая полка','Previous shelf'], sillNextShelf:['Следующая полка','Next shelf'], sillShelf:['Полка {current} / {total}','Shelf {current} / {total}'],
    sillSeedPosition:['Семена {current} из {total}','Seed packet {current} of {total}'], sillPlantPosition:['Растение {current} из {total}','Plant {current} of {total}'],
    sillThirsty:['Нужен полив','Needs water'], sillMoist:['Почва влажная','Soil is moist'], sillMoisture:['{status} · {value}% влаги','{status} · {value}% moisture'],
    sillPaidSeed:['Посадить · {cost} монет','Plant · {cost} coins'], sillWater:['Полить','Water'], sillInspect:['Осмотреть','Inspect'],
    sillExpensive:['Недостаточно монет для посадки','Not enough coins to plant'], sillAllSeeds:['Все семена','All seeds'],
    sillCollection:['К коллекции','Go to collection'], sillFind:['Найти горшок','Find a pot'],
    startOneSprout:['Начнём с одного ростка. Первый — в подарок.','Begin with a single sprout. The first is free.'],
    beeVisited:['ЖУЖА ЗАГЛЯНУЛА К РАСТЕНИЯМ','ZHUZHA VISITED THE PLANTS'], naturalRhythm:['САД В СВОЁМ РИТМЕ','THE GARDEN IN ITS OWN RHYTHM'],
    takeTime:['Листья растут, а вы можете просто понаблюдать.','The leaves are growing. Take a moment to watch.'],
    waterPlants:['Полить растения','Water plants'], drawWater:['Набрать воду','Draw water'], collect:['Собрать доход','Collect income'],
    stayInGarden:['Побыть в саду','Spend time in the garden'], needsCare:['Нужен уход','Needs care'], mature:['Взрослые','Mature'],
    favouriteShelf:['На любимой полке','On the favourites shelf'], lookAfterToday:['Сегодня нужна забота','Needs care today'],
    plantDetails:['Подробнее о росте','Growth details'], collectionManagement:['Управление коллекцией','Manage collection'],
    plantsGarden:['Растений в саду','Plants in the garden'], speciesCollection:['Коллекция видов','Species collection'],
    firstSeedNote:['В каждом семечке — целый сад','Every seed can grow into a garden'],
    firstSeedHint:['Посадите растение, чтобы здесь появились ваши открытия.','Plant a seed to start recording your discoveries.'],
    currentDiscoveries:['На пути к открытиям','Discoveries in progress'], allDiscoveries:['Все открытия','All discoveries'],
    careMatters:['Забота важнее спешки.','Take your time and care for your plants.'], askBee:['Спросить Жужу','Ask Zhuzha'],
    showPlants:['Показать все растения','Show all plants'], nothingHere:['Здесь пока тихо','Nothing here yet'],
    quietFilter:['Растений с таким состоянием пока нет.','No plants currently match this filter.'],
    gardenStorage:['Сад сохраняется на этом устройстве.','Your garden is saved on this device.'],
    supplies:['Всё для заботы','Garden supplies'], helpfulSupplies:['Маленькие помощники для большого зелёного мира.','Little things to help your garden grow.'],
    well:['Садовый колодец','Garden well'], wellFree:['Одна порция воды бесплатно каждые 30 минут.','One free serving of water every 30 minutes.'],
    water:['Чистая вода','Fresh water'], fertilizer:['Удобрение','Fertiliser'], superFertilizer:['Суперудобрение','Super fertiliser'],
    plantStage:['Так выглядит взрослое растение','What a mature plant looks like'], growTime:['Взросление','Time to mature'], adultIncome:['Доход взрослого','Mature plant income'],
    plantFree:['Посадить бесплатно','Plant for free'], plantAnother:['Посадить ещё одно','Plant another'],
    thirstyNow:['Самое время полить','Ready for watering'], soilWet:['Почва ещё влажная','The soil is still moist'],
    healthy:['Растению хорошо','The plant is doing well'], flowerPhase:['Цветение','In bloom'], foliagePhase:['Рост листьев','Growing leaves'],
    waterPlant:['Полить растение · 1 вода','Water plant · 1 water'], health:['Здоровье','Health'], growth:['Рост','Growth'], moisture:['Влага','Moisture'],
    studyLeaf:['Рассмотреть лист и корни','Explore leaf and roots'], research:['Исследование вида','Species research'],
    photo:['Фото','Photo'], aboutSpecies:['О виде','About this species'], removePlant:['Убрать растение из сада','Remove plant from garden'],
    space:['Освободить место в саду?','Make room in the garden?'],
    daisy:['Ромашка','Chamomile'], lavender:['Лаванда','Lavender'], sunflower:['Подсолнечник','Sunflower'], tulip:['Тюльпан','Tulip'], mint:['Мята','Mint'],
    cactus:['Кактус','Cactus'], rose:['Роза','Rose'], monstera:['Монстера','Monstera'], fern:['Папоротник','Fern'], orchid:['Орхидея','Orchid'], aloe:['Алоэ','Aloe'],
    selectedGarden:['Открытый сад: {name}','Open garden: {name}'], coinCount:['{count} монет. Открыть запасы','{count} coins. Open supplies'],
    waterCount:['Вода: {count}. Открыть запасы','Water: {count}. Open supplies'], moistureAndGrowth:['Влага {moisture}% · Рост {growth}%','Moisture {moisture}% · Growth {growth}%'],
    chooseLanguage:['Сменить язык интерфейса на английский','Switch the interface to Russian'],
    chronicleFrame:['Кадр {number} / {total}','Frame {number} / {total}'],
    chronicleFrameSpoken:['Кадр {number} из {total}, {date}','Frame {number} of {total}, {date}'],
    chronicleGapRange:['Перерыв между {start} и {end}','Gap between {start} and {end}'],
    chronicleMissing:['Промежуток без наблюдений','No observations in this interval'],
    chronicleNoFrames:['Нет кадров','No frames'], chronicleGap:['Пропуск','Gap'],
    chronicleBloom:['Цветение','Flowering'], chronicleBuds:['Новые бутоны','New buds'], chronicleRest:['Отдых после цветения','Resting after flowering'],
    chronicleDailyCare:['Уход в этот день · {count}','Care on this day · {count}'],
    chronicleWatered:['Полив','Watering'], chronicleFed:['Подкормка','Feeding'],
    chronicleEmpty:['Здесь появятся кадры из сохранённых наблюдений. Первый снимок будет доступен после следующей записи состояния растения.','Frames appear here as observations are saved. The first frame will be available after the next observation.'],
    chronicleView:['Просмотр кадра','Frame viewer'], chronicleViewKeys:['Просмотр кадра. Стрелки листают, Home и End переходят к краям ленты.','Frame viewer. Use the arrow keys to browse, or Home and End to reach the ends of the strip.'],
    chronicleEarlier:['← Раньше','← Earlier'], chronicleLater:['Позже →','Later →'],
    chronicleFilm:['Лента наблюдений','Observation filmstrip'], chronicleThumbnails:['Миниатюры ленты','Filmstrip thumbnails'],
    chronicleSingle:['Пока сохранено одно наблюдение.','One observation has been saved.'],
    chronicleSource:['Кадры воссозданы по записям роста и влажности. Съёмочный горшок и свет одинаковы на всей ленте.','Frames are reconstructed from recorded growth and moisture. The studio pot and lighting stay the same throughout.'],
    chronicleSelect:['Выберите растение в своём саду.','Choose a plant in your garden.'],
  };

  const catalogue = Object.freeze(Object.fromEntries(locales.map((locale,index)=>[locale,Object.freeze(Object.fromEntries(Object.entries(phrases).map(([key,forms])=>[key,forms[index]])))])));
  const staticKeys = new Map(Object.entries(phrases).filter(([,forms])=>!forms[0].includes('{')).map(([key,[russian]])=>[russian,key]));
  let active = 'ru';
  try {
    const saved = globalThis.localStorage?.getItem(storageKey);
    if(locales.includes(saved))active = saved;
  } catch { /* A read-only browser profile can still switch for this session. */ }

  function set(locale) {
    if(!locales.includes(locale))return false;
    active = locale;
    try {globalThis.localStorage?.setItem(storageKey,locale);} catch { /* Retain the in-memory preference. */ }
    return true;
  }

  function t(key, values={}, locale=active) {
    const dictionary = Object.hasOwn(catalogue,locale) ? catalogue[locale] : catalogue.ru;
    const value = Object.hasOwn(dictionary,key) ? dictionary[key] : String(key);
    return value.replace(/\{(\w+)\}/g,(match,field)=>Object.hasOwn(values,field)?String(values[field]):match);
  }

  const anchoredPatterns = [
    [/^Открытый сад: (.+)$/,'selectedGarden',['name']],
    [/^([\d\s]+) монет\. Открыть запасы$/,'coinCount',['count']],
    [/^Вода: (\d+)\. Открыть запасы$/,'waterCount',['count']],
    [/^Влага (\d+)% · Рост (\d+)%$/,'moistureAndGrowth',['moisture','growth']],
  ];

  function staticLabel(value) {
    const key = staticKeys.get(value);
    if(key)return t(key);
    for(const [pattern,key,fields] of anchoredPatterns) {
      const parts = pattern.exec(value);
      if(parts)return t(key,Object.fromEntries(fields.map((field,index)=>[field,parts[index+1]])));
    }
    return value;
  }

  // Select only known interface slots. Plant nicknames, tags, profile names,
  // notes, journal entries, form values and user-authored captions are excluded.
  const labelSlots = [
    '.sidebar .brand small','.nav-label','.botanical-nav .nav-item > span:last-of-type','.mobile-nav a > span',
    '.bee-note > h3','.bee-note > p','.bee-note .tiny-label','.bee-note [data-action="help"]','.sidebar-settings > span','.sidebar-foot',
    '.topbar .breadcrumb','.topbar .breadcrumb > strong','.footer > span','.footer [data-action="about"]',
    '#storage-warning > span','#storage-warning > button','.feature-toolbar > button','.garden-upgrade-toolbar > button',
    '.care-queue-label > button','.bottom-note [data-action="quiet"]',
    '.garden-collection .tabs > button','.garden-collection .collection-management > summary','.garden-collection .plant-details > summary',
    '.garden-collection .compact-metrics','.garden-collection .empty-inline > h3','.garden-collection .empty-inline > p','.garden-collection .empty-inline > button',
    '.garden-context .stat span','.garden-context .first-seed-note strong','.garden-context .first-seed-note span','.garden-context .garden-context-tasks h3',
    '.garden-context .garden-context-tasks button','.garden-context .garden-context-note h3','.garden-context .garden-context-note button',
    '.bottom-note > span','.bottom-note > small','.favorite-shelf > h3','.care-queue-label > strong',
    '.catalog-toolbar .tabs > button','.catalog-more-filters > summary','.advanced-filters .field > span','.advanced-filters .check-field',
    '.catalog-grid .plant-content > h3','.catalog-grid .plant-visual > .plant-tag','.catalog-grid .price.free','.catalog-grid .card-care',
    '.catalog-grid .empty-inline > h3','.catalog-grid .empty-inline > p','.catalog-grid .empty-inline > button','.catalog-footnote','.free-badge',
    '.herbarium-grid .specimen > h3','.herbarium-grid .specimen-state',
    '.journal-empty > h2','.journal-empty > p','.journal-empty [data-action="browse"]','.journal-new',
    '[data-kind="settings"] .settings-group > h3','[data-kind="settings"] .settings-group > p','[data-kind="settings"] .setting-row strong',
    '[data-kind="settings"] .setting-row small','[data-kind="settings"] .pot-choices > button','[data-kind="settings"] .backup-actions > button',
    '[data-kind="settings"] .settings-more > h3','[data-kind="settings"] .settings-more button','[data-kind="settings"] [data-action="about"]','[data-kind="settings"] [data-action="install"]',
    '[data-kind="preview"] .preview-art > span','[data-kind="preview"] .preview-stats strong','[data-kind="preview"] [data-action="plant"]',
    '[data-kind="plant"] .care-status','[data-kind="plant"] .care-info [data-action="water"]','[data-kind="plant"] .care-tools > button',
    '[data-kind="supplies"] .well-card h3','[data-kind="supplies"] .well-card p','[data-kind="supplies"] .well-card button',
    '[data-kind="supplies"] .dialog-intro','[data-kind="supplies"] .supply-description h3',
    '[data-kind="specimen"] .research > span','[data-kind="specimen"] .specimen-detail > button',
  ].join(',');

  const attributeSlots = '.sidebar-toggle,.sidebar .brand,.botanical-nav,.botanical-nav .nav-item,.mobile-nav,.topbar .compact-profile,.topbar .resource.coins,.topbar .resource.water,.topbar .sound-button,.sidebar-settings,.topbar .avatar,.garden-upgrade-toolbar,.catalog-toolbar .tabs,#search,.close-dialog,.care-tools [data-action="remove-ask"]';
  const sourceText = new WeakMap();
  const sourceAttributes = new WeakMap();

  function translated(source, previous, original) {
    if(previous === source && original!==undefined)source = original;
    const match = /^(\s*)(.*?)(\s*)$/s.exec(source);
    return {original:source,value:match[1] + staticLabel(match[2]) + match[3]};
  }

  function translateElement(element) {
    for(const child of element.childNodes) {
      if(child.nodeType!==3)continue;
      const old = sourceText.get(child);
      const result = translated(child.nodeValue,old?.value,old?.original);
      if(result.value!==child.nodeValue)child.nodeValue = result.value;
      sourceText.set(child,result);
    }
  }

  function translateAttributes(element) {
    const values = sourceAttributes.get(element) || new Map();
    for(const attribute of ['aria-label','title','placeholder']) {
      const current = element.getAttribute(attribute);
      if(!current)continue;
      const old = values.get(attribute);
      const result = translated(current,old?.value,old?.original);
      if(result.value!==current)element.setAttribute(attribute,result.value);
      values.set(attribute,result);
    }
    sourceAttributes.set(element,values);
  }

  function apply(root) {
    if(!root?.querySelectorAll)return;
    const document = root.ownerDocument || root;
    if(active==='ru' && document.documentElement?.lang==='ru')return;
    for(const element of root.querySelectorAll(labelSlots))translateElement(element);
    for(const element of root.querySelectorAll(attributeSlots))translateAttributes(element);
    const page = document.documentElement?.dataset.page;
    if(page && page!=='garden') {
      for(const element of root.querySelectorAll('.page-heading .eyebrow,.page-heading h1,.page-heading > div > p'))translateElement(element);
    }
    if(['preview','specimen','settings','supplies','remove'].includes(root.dataset?.kind)) {
      const title = root.querySelector('#dialog-title');
      if(title)translateElement(title);
    }
    for(const element of root.querySelectorAll('[data-i18n]')) {
      const key = element.dataset.i18n;
      if(Object.hasOwn(catalogue.ru,key))element.textContent=t(key);
    }
  }

  function decorate(root, rerender) {
    if(!root?.querySelector)return;
    const page = root.ownerDocument;
    apply(root);
    page.documentElement.lang = active;
    let toggle = root.querySelector('[data-locale-switch]');
    if(!toggle) {
      const resources = root.querySelector('.topbar .resources');
      if(!resources)return;
      toggle=page.createElement('button');
      toggle.type='button';
      toggle.className='flora-language';
      toggle.dataset.localeSwitch='';
      resources.append(toggle);
      toggle.addEventListener('click',()=>{
        set(active==='ru'?'en':'ru');
        if(typeof rerender==='function')rerender();
        else decorate(root);
        root.querySelector('[data-locale-switch]')?.focus({preventScroll:true});
      });
    }
    toggle.textContent=active==='ru'?'EN':'RU';
    toggle.lang=active==='ru'?'en':'ru';
    toggle.title=t('chooseLanguage');
    toggle.setAttribute('aria-label',toggle.title);
  }

  return Object.freeze({get:()=>active,set,t,apply,decorate,staticLabel});
})();
