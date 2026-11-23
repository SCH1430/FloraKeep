const cyanotype = (() => {
  function collection(catalog, state, selection = {}) {
    const discovered = new Set(state.discovered);
    const entries = catalog.map((species, index) => ({
      species, number: index + 1, discovered: discovered.has(species.id), specimens: []
    }));
    const bySpecies = new Map(entries.map(entry => [entry.species.id, entry]));
    for (const plant of state.plants) bySpecies.get(plant.speciesId)?.specimens.push(plant);
    const known = entries.filter(entry => entry.discovered);
    const gardenSelection = state.plants.find(plant => plant.id === state.selectedPlantId);
    const active = known.find(entry => entry.species.id === selection.speciesId)
      || known.find(entry => entry.species.id === gardenSelection?.speciesId)
      || known[0];
    const plant = active?.specimens.find(item => item.id === selection.plantId)
      || active?.specimens.find(item => item.id === state.selectedPlantId) || active?.specimens[0];
    return {entries, known, active, plant};
  }

  function imprint(entry, plant, position, draw) {
    return draw(entry.species.id, {
      view: 'cyanotype', id: 'cyan-' + position + '-' + entry.species.id,
      variant: plant?.lineageId || plant?.id || entry.species.id
    });
  }

  function render(model, {draw, portrait, nickname, research}) {
    const {entries, known, active, plant} = model;
    const {t, staticLabel} = floraLocale;
    const name = specimen => nickname(specimen) || staticLabel(active.species.name);
    const plate = entry => t('pagePrint', {number:String(entry.number).padStart(2, '0')});
    const printCount = t('printCount', {count:known.length, total:entries.length});
    const title = pageHeading(t('cyanotype'), t('yourHerbarium'), t('cyanotypeIntro'));

    function spread() {
      if (!active) return `<section class="cyan-empty" aria-labelledby="cyan-empty-heading">
        <div class="cyan-empty-art" aria-hidden="true">${art.emptyState('herbarium')}</div>
        <div><h2 id="cyan-empty-heading">${t('nextImprint')}</h2><p>${t('nextImprintHint')}</p>
        <button type="button" class="cyan-button" data-action="browse">${t('pickFirstSpecies')} ${icon('arrow',16)}</button></div>
      </section>`;

      const {species, specimens} = active;
      const live = plant ? portrait(plant, {id:'cyan-portrait-' + plant.id})
        : draw(species.id, {id:'cyan-reference-' + species.id, variant:species.id, pot:'cream'});
      return `<section class="cyan-spread" id="cyan-spread" aria-labelledby="cyan-name">
        <div class="cyan-header">
          <div><span class="cyan-number">${plate(active)}</span><h2 id="cyan-name" tabindex="-1">${esc(staticLabel(species.name))}</h2>
          <p class="cyan-latin" lang="la">${esc(species.latinName)}</p></div>
          ${known.length > 1 ? `<label class="cyan-field"><span>${t('printSpecies')}</span><select id="cyan-species">
            ${known.map(entry => `<option value="${esc(entry.species.id)}"${entry === active?' selected':''}>${esc(staticLabel(entry.species.name))}</option>`).join('')}</select></label>` : ''}
        </div>
        <div class="cyan-diptych">
          <figure class="cyan-negative"><div class="cyan-image">${imprint(active, plant, 'plate', draw)}</div>
            <figcaption>${t('matureImprint')}</figcaption></figure>
          <figure class="cyan-positive"><div class="cyan-image">${live}</div>
            <figcaption>${plant ? t('livePortrait') : t('referencePortrait')}</figcaption></figure>
        </div>
        <div class="cyan-details">
          <div>${specimens.length > 1 ? `<label class="cyan-field"><span>${t('livePortrait')}</span><select id="cyan-plant" data-species="${esc(species.id)}">
              ${specimens.map((item,index) => `<option value="${esc(item.id)}"${item === plant?' selected':''}>${index + 1} · ${esc(name(item))}</option>`).join('')}
            </select></label>` : plant ? `<strong>${esc(name(plant))}</strong>` : `<p>${t('archiveNote')}</p>`}
          <span class="cyan-research">${t('researchScore',{level:research(species.id)})}</span></div>
          <div class="cyan-actions"><button type="button" class="cyan-button" data-action="specimen" data-id="${esc(species.id)}">${t('viewRecord')} ${icon('arrow',16)}</button>
          ${plant ? `<button type="button" class="cyan-button" data-feature="growth-book" data-id="${esc(plant.id)}">${t('plantChronicle')}</button>
          <button type="button" class="cyan-button" data-action="plant-detail" data-id="${esc(plant.id)}">${t('seeSpecimen')}</button>` : ''}</div>
        </div>
      </section>`;
    }

    const prints = entries.map(entry => {
      const {species, discovered} = entry;
      const selected = entry === active;
      const specimen = selected ? plant : entry.specimens[0];
      return `<button type="button" class="cyan-sample" data-action="${discovered?'cyan-species':'preview'}" data-id="${esc(species.id)}"${discovered?` aria-pressed="${selected}" aria-controls="cyan-spread"`:''}>
        <span class="cyan-sample-figure${discovered?'':' unopened'}">${imprint(entry,specimen,'index',draw)}</span>
        <span class="cyan-sample-name">${esc(staticLabel(species.name))}</span>
        <span class="cyan-sample-state">${discovered?t('researchScore',{level:research(species.id)}):icon('lock',13)+' '+t('unlockPlant')}</span>
      </button>`;
    }).join('');
    return `${title}<div class="cyan-folio" id="cyan-folio">${spread()}
      <section class="cyan-index" aria-labelledby="cyan-index-heading">
        <header><h2 id="cyan-index-heading">${t('printIndex')}</h2><p>${esc(printCount)}</p></header>
        <div class="cyan-index-grid">${prints}</div></section>
    </div>`;
  }

  return Object.freeze({collection, render});
})();
