import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const files = ['art', 'terrarium', 'story-studio', 'atelier', 'flight', 'playground', 'media', 'gift', 'classroom-upgrades'];
const sources = await Promise.all(files.map(file => readFile(new URL(`../src/${file}.js`, import.meta.url), 'utf8')));
const { art, terrarium, storyStudio, atelier, flight, playground, media, gift, classroomUpgrades } = runInNewContext(
  `${sources.join('\n')}\n({ art,terrarium,storyStudio,atelier,flight,playground,media,gift,classroomUpgrades })`,
  { TextEncoder, TextDecoder, structuredClone }
);
const catalog = [{ id: 'daisy', name: 'Ромашка', latinName: 'Matricaria chamomilla' }];
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

test('terrarium preserves brush textures and uses local guides only during editing', () => {
  const scene = terrarium.addTerrariumStroke(terrarium.terrariumPreset(), 'moss', [[.23, .3], [.35, .38]], 'dry-moss', { texture: 'dry' });
  scene.view.snap = true;
  const restored = terrarium.importTerrariumProject(terrarium.exportTerrariumProject(scene, catalog), catalog, 'restored');
  assert.equal(restored.strokes[0].texture, 'dry');
  const rendered = terrarium.renderTerrariumSVG(restored, { art, catalog, interactive: true, selectedId: 'forest-fern', snapPoint: { x: .34, y: .54 } });
  assert.match(rendered, /feMorphology/);
  assert.match(rendered, /data-terra-texture="dry"/);
  const guide = rendered.match(/<g class="terra-snap-points"[^>]*>(.*?)<\/g>/)?.[1];
  assert.ok(guide);
  assert.ok((guide.match(/<circle\b/g) ?? []).length <= 9);
  for (const layer of ['earth', 'sand', 'drainage']) assert.ok(rendered.includes(`data-soil-layer="${layer}"`));
  assert.doesNotMatch(terrarium.renderTerrariumSVG(restored, { art, interactive: true }), /terra-snap-points/);
  assert.doesNotMatch(terrarium.renderTerrariumSVG(restored, { art, snapPoint: { x: .34, y: .54 } }), /terra-snap-points|feMorphology/);

  const vessels = ['jar', 'dome', 'bowl', 'drop', 'faceted', 'flask', 'sphere'];
  const reflections = vessels.map(vessel => terrarium.renderTerrariumSVG({ ...scene, vessel }, { art }).match(/class="terra-refraction" d="([^"]+)"/)[1]);
  assert.equal(new Set(reflections).size, vessels.length);
});

test('theater editor shows movement direction and the portable program includes illustrated scenes', () => {
  const scene = storyStudio.defaultStoryStudioState().draft;
  scene.items[0].path = [{ x: .2, y: .8 }, { x: .6, y: .5 }];
  const editable = storyStudio.renderStoryScene(scene, { art, catalog, interactive: true, selectedId: scene.items[0].id });
  assert.match(editable, /class="story-path-guide"/);
  assert.match(editable, /rotate\(-25\.114/);
  assert.match(editable, />Начало<\/text>.*>Конец<\/text>/);
  assert.match(editable, /data-story-paper-apron="true"/);
  const exported = storyStudio.buildStoryProgramHTML({ order: [scene.id] }, [scene], { art, catalog });
  assert.match(exported, /<svg class="story-scene-thumb"/);
  assert.match(exported, /12 с/);
  assert.doesNotMatch(exported, /class="story-path-guide"/);
});

test('the ceramic cross section follows the selected profile ring', () => {
  const { draft } = atelier.defaultAtelierState();
  const upper = atelier.renderPotSVG(draft, { interactive: true, activeRing: 0 });
  const lower = atelier.renderPotSVG(draft, { interactive: true, activeRing: 4 });
  const section = /<g class="atelier-active-section"[^>]+><path d="([^"]+)"/;
  assert.notEqual(upper.match(section)?.[1], lower.match(section)?.[1]);
  assert.doesNotMatch(atelier.renderPotSVG(draft), section);
});

test('flight maps retain distinct landscapes and distinct symbols for discoveries', () => {
  const landmarks = { meadow: 'stump', pond: 'bridge', shade: 'stone' };
  for (const [name, landmark] of Object.entries(landmarks)) {
    const layout = flight.flightMapLayout(name);
    const landscape = flight.renderFlightLandscape(layout);
    assert.ok(landscape.includes(`data-flight-landmark="${landmark}"`));
    assert.match(landscape, /class="flight-natural-border"/);
    const minimap = flight.renderFlightMinimap(layout);
    assert.equal((minimap.match(/data-flight-map-detail=/g) ?? []).length, 6);
    assert.match(minimap, /<g data-flight-map-flower="chamomile"/);
    assert.match(minimap, /<rect data-flight-map-secret=/);
    assert.match(minimap, /<circle class="flight-map-bee"/);
  }
});

test('playground illustrations express the actual controls and puzzle state', () => {
  const state = playground.defaultPlaygroundState();
  const view = (mode, options = {}) => playground.renderPlaygroundIllustration(state, { mode, ...options });
  assert.match(view('wind', { windVector: [0, -1] }), /class="pg-wind-streaks"[^>]+rotate\(-90\)/);
  assert.match(view('mirrors'), /class="pg-mirror-contact"/);
  state.channels = Array(12).fill(0);
  assert.match(view('channels'), /class="pg-water-flow pg-current"/);
  state.notes[1] = 1;
  const music = view('music', { playing: true, playIndex: 1 });
  assert.equal((music.match(/data-pg-note=/g) ?? []).length, 8);
  assert.equal((music.match(/class="pg-note-open"/g) ?? []).length, 1);
  assert.doesNotMatch(view('music'), /class="pg-note-open"/);
  state.stars = [0];
  const constellation = view('stars');
  assert.match(constellation, /stroke-dasharray="3 7"/);
  assert.match(constellation, /data-pg-star="1"[^>]+><circle class="pg-next-star"/);
});

test('photo sheets validate frame counts and adjust composition without exporting guides', () => {
  const artwork = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" preserveAspectRatio="none" overflow="visible"><path d="M0 10H40"/></svg>';
  const photo = { artwork, layout: 'full', mat: 8, guides: 'thirds' };
  assert.match(media.postcardSVG({ ...photo, preview: true }), /data-photo-guides="thirds"/);
  const rendered = media.postcardSVG(photo);
  assert.match(rendered, /data-photo-layout="full"/);
  assert.match(rendered, /fill="#faf6e9"/);
  assert.match(rendered, /preserveAspectRatio="xMidYMid slice"/);
  assert.doesNotMatch(rendered, /data-photo-guides=|preserveAspectRatio="none"/);
  assert.match(media.frameArtwork(artwork, { fixedFrame: true }), /data-photo-frame-lock="true".*translate\(400 530\)/);

  const entries = [1, 2, 3, 4].map(index => ({ artwork, label: `День <${index}>` }));
  const strip = media.photoSheetSVG(entries, { kind: 'strip' });
  assert.match(strip, /data-photo-sheet="strip"/);
  assert.match(strip, /День &lt;4&gt;/);
  assert.equal((strip.match(/data-photo-frame=/g) ?? []).length, 4);
  assert.throws(() => media.photoSheetSVG(entries.slice(0, 3), { kind: 'strip' }), /четыре/);
  assert.match(media.photoSheetSVG(entries), /data-photo-sheet="contact"/);
  const history = [{ at: 5 }, { at: 3 }, { at: 1 }, { at: 4 }, { at: 2 }, { at: 2 }];
  assert.equal(media.photoGrowthSamples(history, [4, 4]).map(sample => sample.at).join(','), '4,2,1,5');
});

test('gift reply and classroom exhibition exports include portable illustrations and labels', () => {
  const greeting = gift.buildGiftHTML({ recipient: 'Лена', speciesId: 'daisy' }, { art, catalog });
  assert.match(greeting, /<div class="gift-reply-diptych"[^>]+><figure><svg id="gift-reply-seed"/);
  assert.match(greeting, /<div id="gift-reply-bloom"/);
  assert.match(greeting, /class="gift-seal-sign"[^>]*><svg/);

  const rooms = [{ name: 'Класс', entries: [
    { key: 'one', plant: { speciesId: 'daisy', name: 'Первый' }, contributor: 'Ира' },
    { key: 'two', plant: { speciesId: 'daisy', name: 'Второй <цветок>', growth: .75 }, contributor: 'Тайный автор' },
  ] }];
  const render = (mode, extra = {}) => classroomUpgrades.exhibitHTML(rooms, { mode, esc: escape, plantArt: art.plantArt, ...extra });
  assert.match(render('catalog'), /href="#exhibit-0-1"><svg.*Второй &lt;цветок&gt;.*id="exhibit-0-1"/s);
  const poster = render('poster', { heroKey: 'two', withAuthors: false });
  assert.match(poster, /<article class="exhibit-poster"><svg.*<h2>Второй &lt;цветок&gt;<\/h2><p/s);
  assert.doesNotMatch(poster, /Тайный автор/);
  assert.match(render('labels'), /class="exhibit-label-number" aria-label="Экспонат 2">02/);
});
