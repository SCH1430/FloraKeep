const windowsill = (() => {
  const seeds = ['daisy','lavender','monstera'];
  const shelfSize = 3;

  function shelfModel(plants, order, preferred, previous, needsWater) {
    const ranks = new Map(order.map((id,index) => [id,index]));
    const ordered = plants.slice().sort((a,b) => (ranks.get(a.id) ?? order.length) - (ranks.get(b.id) ?? order.length));
    const driest = ordered.reduce((found,plant) => needsWater(plant) && (!found || found.moisture > plant.moisture) ? plant : found,null);
    const selected = ordered.find(plant => plant.id === preferred) || driest || ordered.find(plant => plant.id === previous) || ordered[0];
    const index = selected ? ordered.indexOf(selected) : -1;
    const page = Math.max(0,Math.floor(index / shelfSize));
    const start = page * shelfSize;
    return {ordered,selected,index,page,pages:Math.ceil(ordered.length / shelfSize),visible:ordered.slice(start,start + shelfSize)};
  }

  function key(view) {
    const {model,atmosphere,seed,water,title,description,options,cost,canPlant,artKey} = view;
    const visible = model.visible.map(plant => [plant.id,artKey(plant),view.name(plant),Math.round(plant.moisture),view.thirsty(plant)]);
    return JSON.stringify([model.selected?.id,visible,options,seed,cost,canPlant,water,title,description,view.language,
      atmosphere.light,atmosphere.season,atmosphere.weather,atmosphere.scene,atmosphere.outside,atmosphere.platform,atmosphere.shelf,atmosphere.decor]);
  }

  function markup(view) {
    const {model,atmosphere,icon,esc,species,t,seed,name,image,cost} = view;
    const empty = !model.selected;
    const ids = empty ? seeds : model.ordered.map(plant => plant.id);
    const selected = empty ? seed : model.selected.id;
    const index = ids.indexOf(selected);
    const currentName = empty ? t(seed) : name(model.selected);
    const soilLabel = plant => t(view.thirsty(plant) ? 'sillThirsty' : 'sillMoist');
    const step = (target,action,label,symbol) => {
      const id = ids[target];
      return `<button type="button" class="sill-step" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ' disabled'} aria-label="${label}">${symbol}</button>`;
    };
    const arrow = direction => `<span class="sill-arrow${direction < 0 ? ' is-back' : ''}">${icon('chevron',19)}</span>`;
    const specimen = plant => {
      const thirsty = view.thirsty(plant);
      const tag = `${name(plant)} · ${soilLabel(plant)}`;
      return `<button type="button" class="sill-pot" data-action="sill-select" data-id="${esc(plant.id)}" aria-pressed="${plant.id === selected}" aria-label="${esc(tag)}"><span class="sill-portrait">${image(plant)}</span><span class="sill-tag">${thirsty ? icon('water',16) : ''}<span>${esc(name(plant))}</span></span></button>`;
    };
    const packet = id => `<button type="button" class="sill-pot sill-seed" data-action="sill-seed" data-id="${id}" aria-pressed="${id === seed}" aria-label="${esc(t('sillSeedName',{name:t(id)}))}"><span class="sill-paper"><span>${esc(species(id).latinName)}</span>${view.seedImage(id)}</span><span class="sill-tag">${esc(t(id))}</span></button>`;
    const shelfLabel = t(empty ? 'chooseFirstSprout' : 'sillPlants');
    const position = t(empty?'sillSeedPosition':'sillPlantPosition',{current:index+1,total:ids.length});
    const mobileNav = ids.length > 1 ? `<div class="sill-mobile-nav" role="group" aria-label="${position}">${step(index-1,empty?'sill-seed':'sill-select',t('sillPrevious'),arrow(-1))}<span aria-hidden="true">${index+1} / ${ids.length}</span>${step(index+1,empty?'sill-seed':'sill-select',t('sillNext'),arrow(1))}</div>` : '';
    const pageNav = model.pages > 1 ? `<div class="sill-page-nav">${step((model.page-1)*shelfSize,'sill-page',t('sillPreviousShelf'),arrow(-1))}<span>${t('sillShelf',{current:model.page+1,total:model.pages})}</span>${step((model.page+1)*shelfSize,'sill-page',t('sillNextShelf'),arrow(1))}</div>` : '';
    const primary = (action,label,symbol,disabled=false) => `<button type="button" class="sill-primary" data-action="${action}" data-id="${esc(selected)}" data-on-sill="true"${disabled?' disabled':''}>${icon(symbol,18)} ${label}</button>`;
    const care = empty ? primary('plant',cost ? t('sillPaidSeed',{cost}) : t('plantFree'),'seed',!view.canPlant)
      : view.thirsty(model.selected) ? view.water ? primary('water',t('sillWater'),'wateringcan') : primary('supplies',t('drawWater'),'water')
      : primary('plant-detail',t('sillInspect'),'leaf');
    const subtitle = empty ? (view.canPlant ? species(seed).latinName : t('sillExpensive'))
      : t('sillMoisture',{status:soilLabel(model.selected),value:Math.round(model.selected.moisture)});
    const secondary = empty ? `<button type="button" class="sill-link" data-action="browse">${t('sillAllSeeds')}</button>`
      : `<button type="button" class="sill-link" data-action="sill-collection">${t('sillCollection')} ${icon('arrow',15)}</button>`;
    const quickPick = model.pages > 1 ? `<label class="sill-quick-pick">${t('sillFind')}<select id="sill-quick-pick">${view.options.map(([id,label]) => `<option value="${esc(id)}"${id===selected?' selected':''}>${esc(label)}</option>`).join('')}</select></label>` : '';
    return `<section class="garden-welcome windowsill page-heading" data-welcome-key="${esc(view.key)}" aria-label="${t('sillTitle')}">
      <div id="garden-still-life" class="sill-room" data-sill-light="${esc(atmosphere.light)}" data-sill-season="${esc(atmosphere.season)}" data-sill-weather="${esc(atmosphere.weather)}" data-sill-shelf="${esc(atmosphere.shelf)}">
        <div class="sill-backdrop" aria-hidden="true">${view.environment()}</div>
        <header class="sill-title"><h1>${esc(view.title)}</h1><p${view.description ? '' : ' hidden'}>${esc(view.description)}</p></header>
        <div class="sill-pots" role="group" aria-label="${shelfLabel}">${empty ? seeds.map(packet).join('') : model.visible.map(specimen).join('')}</div>
        ${mobileNav}
      </div>
      <div class="sill-care"><div class="sill-identity"><strong>${esc(currentName)}</strong><span>${esc(subtitle)}</span></div>${care}
        ${!empty && view.thirsty(model.selected) ? `<button type="button" class="sill-link" data-action="plant-detail" data-id="${esc(selected)}">${t('sillInspect')}</button>` : ''}
        ${pageNav}${secondary}</div>${quickPick}
    </section>`;
  }
  return Object.freeze({seeds:Object.freeze(seeds),shelfModel,key,markup});
})();
