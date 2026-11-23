import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/terrarium.js', import.meta.url), 'utf8');
const terrarium = runInNewContext(`${source}\nterrarium`, { TextEncoder, structuredClone });
const potterySource = await readFile(new URL('../src/atelier.js', import.meta.url), 'utf8');
const artSource = await readFile(new URL('../src/art.js', import.meta.url), 'utf8');
const { atelier, art } = runInNewContext(`${artSource}\n${potterySource}\n({ atelier, art })`);
const giftSource = await readFile(new URL('../src/gift.js', import.meta.url), 'utf8');
const gift = runInNewContext(`${giftSource}\ngift`);
const flightSource = await readFile(new URL('../src/flight.js', import.meta.url), 'utf8');
const flight = runInNewContext(`${flightSource}\nflight`);
const playgroundSource = await readFile(new URL('../src/playground.js', import.meta.url), 'utf8');
const playground = runInNewContext(`${playgroundSource}\nplayground`);
const storySource = await readFile(new URL('../src/story-studio.js', import.meta.url), 'utf8');
const mediaSource = await readFile(new URL('../src/media.js', import.meta.url), 'utf8');
const studioModules = `${mediaSource}\n${storySource}\nstoryStudio`;
const storyStudio = runInNewContext(studioModules);

test('terrarium layer changes preserve legacy depth and selected relative order', () => {
  const scene = terrarium.terrariumPreset();
  const selected = ['forest-fern', 'forest-log'];
  const raised = terrarium.reorderTerrariumItems(scene, selected, true);
  assert.equal(raised.items.slice(-2).map(item => item.id).join(','), 'forest-fern,forest-log');
  const restored = terrarium.normalizeTerrariumState({ version: 1, draft: raised });
  assert.equal(restored.draft.items.at(-1).layer, raised.items.length - 1);
  const rendered = terrarium.renderTerrariumSVG(restored.draft);
  assert.ok(rendered.indexOf('data-terra-item="forest-stone"') < rendered.indexOf('data-terra-item="forest-fern"'));
});

test('terrarium group movement clamps the group as a whole and snaps the anchor', () => {
  const scene = terrarium.terrariumPreset();
  const ids = ['forest-log', 'forest-fern'];
  const before = scene.items.filter(item => ids.includes(item.id));
  const moved = terrarium.moveTerrariumItems(scene, ids, 10, -10);
  const after = moved.items.filter(item => ids.includes(item.id));
  assert.equal(Math.max(...after.map(item => item.x)), 1);
  assert.equal(Math.min(...after.map(item => item.y)), 0);
  assert.ok(Math.abs((before[0].x - before[1].x) - (after[0].x - after[1].x)) < 1e-9);
  const snapped = terrarium.moveTerrariumItems(scene, ['forest-fern'], .04, .06, true);
  assert.equal(snapped.items.find(item => item.id === 'forest-fern').x, .4);
  assert.equal(snapped.items.find(item => item.id === 'forest-fern').y, .6);
  assert.deepEqual(scene.items[0], moved.items[0]);
});

test('terrarium item clones preserve dimensions and receive independent identifiers', () => {
  const scene = terrarium.terrariumPreset();
  const original = scene.items.find(item => item.id === 'forest-log');
  const clone = terrarium.cloneTerrariumItem(scene, original.id, 'copy').items.at(-1);
  assert.equal(clone.id, 'copy');
  assert.equal(clone.scale, original.scale);
  assert.equal(clone.rotation, original.rotation);
  assert.equal(clone.kind, original.kind);
  assert.notEqual(clone.x, original.x);
  assert.equal(terrarium.cloneTerrariumItem(scene, original.id, original.id), scene);
});

test('terrarium projects and garden snapshots preserve editing options', () => {
  let draft = terrarium.terrariumPreset();
  draft = terrarium.addTerrariumStroke(draft, 'grass', [[.2, .3]], 'test-stroke', { width: 1.5, opacity: .4 });
  draft.view.snap = true;
  draft.view.fog = true;
  draft.view.wipes = [[[240, 250], [245, 255]]];
  const encoded = terrarium.exportTerrariumProject(draft);
  const decoded = terrarium.importTerrariumProject(encoded, [], 'new-scene');
  assert.equal(decoded.id, 'new-scene');
  assert.equal(decoded.view.snap, true);
  assert.equal(decoded.view.wipes[0].length, 2);
  assert.equal(decoded.strokes[0].width, 1.5);
  assert.equal(decoded.strokes[0].opacity, .4);
  assert.match(terrarium.renderTerrariumSVG(decoded, { interactive: true }), /M240\.0 250\.0 L245\.0 255\.0/);
  const normalized = terrarium.normalizeTerrariumState({ version: 1, draft, templates: [decoded] });
  assert.equal(normalized.templates[0].id, 'new-scene');
  assert.throws(() => terrarium.importTerrariumProject('{"format":"Other"}'), /проект флорариума/);
  assert.throws(() => terrarium.importTerrariumProject(' '.repeat(256_001)), /256 КБ/);
});

test('pottery color and pattern stay visible in the studio and attached to the plant', () => {
  const pot = {
    id: 'ceramic', name: 'Новая чаша', profile: [62, 65, 57, 46, 35],
    color: '#7a6855', finish: 'glaze', glazeColor: '#75896a', glazeBorder: 40,
    pattern: 'leaves', patternScale: 1.75, patternAngle: -25
  };
  const state = atelier.normalizeAtelierState({ version: 1, draft: pot, pots: [pot] });
  const studio = atelier.renderPotSVG(state.draft);
  const plant = art.plantArt('daisy', atelier.getAtelierPotOptions(state.pots[0]));
  for (const markup of [studio, plant]) {
    assert.match(markup, /stop-color="#75896a"/);
    assert.match(markup, /offset="44%"/);
    assert.match(markup, /rotate\(-25\) scale\(1\.75\)/);
  }
  const variants = atelier.buildPotSeries(pot, [], 5);
  assert.equal(variants.length, 3);
  assert.equal(new Set(variants.map(variant => variant.color)).size, 3);
  const updated = atelier.buildPotSeries(pot, variants, 5);
  assert.equal(updated.map(variant => variant.id).join(','), variants.map(variant => variant.id).join(','));
});

test('gift exports include the selected bloom note and reply controls, while keeping other drafts local', () => {
  const catalog = [{ id: 'daisy', name: 'Ромашка', latinName: 'Matricaria chamomilla' }];
  const draft = gift.normalizeGiftWorkspace({
    recipient: 'Тест', bloomMessage: 'Лепестки <и> листья', activeDraftId: 'draft-active',
    drafts: [{ id: 'draft-private', recipient: 'Other recipient', bloomMessage: 'private draft text' }]
  }, catalog);
  assert.equal(draft.drafts.length, 1);
  const html = gift.buildGiftHTML(draft, { art, catalog });
  const data = JSON.parse(html.match(/id="gift-config">([\s\S]+?)<\/script>/)[1]);
  assert.equal(data.bloomMessage, 'Лепестки <и> листья');
  assert.equal(data.drafts, undefined);
  assert.equal(html.includes('private draft text'), false);
  assert.match(html, /id="gift-bloom-letter" class="gift-bloom-letter" hidden/);
  assert.match(html, /id="gift-reply-save"/);
  const script = html.match(/<script>([\s\S]+?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script));
});

test('flight areas retain separate discoveries and map-specific routes', () => {
  let meadow = flight.defaultFlightState();
  const daisy = flight.flightMapLayout('meadow').flowers[0];
  meadow = flight.stepFlight({ ...meadow, x: daisy.x, y: daisy.y }, {}, .01).state;
  const pond = flight.selectFlightMap(meadow, 'pond');
  assert.equal(pond.pollen.length, 0);
  assert.ok(flight.flightMapLayout('pond').flowers.some(item => item.speciesId === 'mint'));
  const name = 'Береговой маршрут';
  const next = flight.normalizeFlightState({ ...pond, namedRoutes: [{ id: 'route-one', map: 'pond', name, points: [{ x: 1, y: 2 }, { x: 48, y: 20 }] }] });
  const returned = flight.selectFlightMap(next, 'meadow');
  assert.equal(returned.pollen[0], 'chamomile');
  assert.equal(returned.namedRoutes[0].name, name);
  assert.equal(returned.namedRoutes[0].points[0].x, 4);
  assert.match(flight.nextFlightHint(pond, 1).text, /ближайший тайник|совсем рядом/i);
  assert.match(flight.nextFlightHint(pond, 3).text, /находится в точке/);
});

test('flight minimap trail accumulates at normal frame speed', () => {
  let current = flight.defaultFlightState();
  for (let frame = 0; frame < 15; frame++) current = flight.stepFlight(current, { dx: 1 }, .016).state;
  assert.ok(current.path.length > 2);
  assert.ok(current.path.at(-1).x > current.path[0].x);
  assert.equal(current.path[0].y, current.path.at(-1).y);
});

test('wind hints solve each of the three layouts using legal moves', () => {
  const deltas = { вверх: [0, -1], вниз: [0, 1], вправо: [1, 0], влево: [-1, 0] };
  for (const level of [0, 1, 2]) {
    let state = { ...playground.defaultPlaygroundState(), wind: { x: 0, y: 3, level } };
    for (let steps = 0; steps < 35 && !playground.playgroundSolved(state, 'wind'); steps++) {
      const direction = playground.windHint(state);
      assert.ok(deltas[direction], `Level ${level} must have a route`);
      const result = playground.moveWindPetal(state, ...deltas[direction]);
      assert.equal(result.moved, true);
      state = result.state;
    }
    assert.equal(playground.playgroundSolved(state, 'wind'), true);
  }
});

test('channel editor checks rotatable parts and mirror alternative goals admit distinct paths', () => {
  const base = playground.defaultPlaygroundState();
  const design = Array(12).fill(1);
  const solution = playground.solveChannelDesign(design);
  assert.ok(solution);
  assert.equal(playground.channelFlow({ ...base, channels: solution, channelDesign: design, channelCustom: true }).complete, true);
  assert.equal(playground.solveChannelDesign(Array(12).fill(3)), null);
  const up = playground.traceMirrors({ ...base, mirrors: [0, 0, 0], multiMirror: true });
  const left = playground.traceMirrors({ ...base, mirrors: [0, 1, 0], multiMirror: true });
  assert.equal(up.target.y, 0);
  assert.equal(left.target.x, 0);
  assert.equal(playground.traceMirrors({ ...base, mirrors: [0, 0, 0] }).complete, false);
});

test('playground round-trips custom sketches and validates saved music settings', () => {
  const state = playground.normalizePlaygroundState({ ...playground.defaultPlaygroundState(),
    sketch: { task: 1, custom: true, design: [2, 1, 3], picks: [2, 1, 3] },
    music: { tempo: 154, voice: 'triangle', library: [{ name: 'Вальс', notes: [1, 5], tempo: 999, voice: 'unknown' }] }
  });
  assert.equal(playground.playgroundSolved(state, 'sketch'), true);
  assert.equal(state.music.tempo, 154);
  assert.equal(state.music.library[0].tempo, 160);
  assert.equal(state.music.library[0].voice, 'sine');
});

test('story programs preserve scene order and export a self-contained playback control', () => {
  const first = { ...storyStudio.defaultStoryStudioState().draft, id: 'first-scene', name: 'Первая сцена' };
  const second = { ...first, id: 'second-scene', name: 'Вторая <сцена>', duration: 22 };
  const catalog = [{ id: 'daisy', name: 'Ромашка' }];
  const source = { saved: [first, second], program: { title: 'Мой спектакль', order: [second.id, second.id, 'missing', first.id] } };
  const state = storyStudio.normalizeStoryStudioState(source, catalog);
  assert.equal(state.program.order.join(','), 'second-scene,first-scene');
  const html = storyStudio.buildStoryProgramHTML(state.program, state.saved, { art, catalog });
  assert.match(html, /Оглавление/);
  assert.match(html, /data-name="Вторая &lt;сцена&gt;" data-duration="22"/);
  assert.ok(html.indexOf('Вторая &lt;сцена&gt;') < html.indexOf('Первая сцена'));
  assert.match(html, /Следующая сцена/);
  const script = html.match(/<script>([\s\S]+?)<\/script>/)[1];
  assert.doesNotThrow(() => new Function(script));
});

test('story timing, drawn paths, narration and camera cuts survive scene normalization', () => {
  const catalog = [{ id: 'daisy', name: 'Ромашка' }];
  const actor = { id: 'hero', type: 'bee', x: .4, y: .5, enter: 2, leave: 10, path: [{ x: .2, y: .3 }, { x: .8, y: .7 }] };
  const draft = {
    duration: 12, items: [actor],
    camera: { start: { zoom: 1, x: .5, y: .5 }, end: { zoom: 2, x: .8, y: .2 } },
    dialogue: [{ speaker: 'Жужа', text: 'Привет', duration: 2 }, { speaker: 'Сад', text: 'Доброе утро', duration: 6 }]
  };
  const scene = storyStudio.normalizeStoryStudioState({ draft }, catalog).draft;
  assert.equal(storyStudio.storyFrameAt(scene, 1).actors[0].shown, false);
  const mid = storyStudio.storyFrameAt(scene, 6);
  assert.equal(mid.actors[0].shown, true);
  assert.equal(mid.actors[0].x, .5);
  assert.equal(mid.dialogue.speaker, 'Сад');
  assert.equal(storyStudio.storyFrameAt(scene, 11).actors[0].shown, false);
  assert.equal(storyStudio.storyFrameAt(scene, 6, false).actors[0].x, actor.x);
  assert.equal(storyStudio.storyFrameAt(scene, 12).viewBox, '320.000 50.000 400.000 250.000');
  const exported = storyStudio.buildStoryHTML(scene, { art, catalog });
  assert.match(exported, /storyFrameAt/);
  assert.match(exported, /Доброе утро/);
});

test('story soundtracks are copied on export and schedule audio after activation', () => {
  const catalog = [{ id: 'daisy', name: 'Ромашка' }];
  const tune = { name: 'Цветочная мелодия', notes: [1, 0, 5, 0, 2, 3, 0, 1], tempo: 90, voice: 'triangle' };
  const draft = { ...storyStudio.defaultStoryStudioState().draft, soundtrack: tune };
  const html = storyStudio.buildStoryHTML(draft, { art, catalog });
  assert.match(html, /data-soundtrack="\{&quot;name&quot;:&quot;Цветочная мелодия/);
  assert.match(html, /synthesizeGardenNote/);
  let constructed = 0;
  let timer;
  const heard = [];
  class FakeAudio {
    constructor() { constructed++; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  }
  const playback = runInNewContext(studioModules, {
    AudioContext: FakeAudio,
    performance: { now: () => 0 },
    setTimeout: fn => { timer = fn; return 1; },
    clearTimeout: () => { timer = undefined; }
  }).createStorySoundtrack((audio, note, voice) => heard.push([note, voice]));
  playback.play(tune);
  assert.equal(constructed, 0);
  assert.equal(timer, undefined);
  playback.activate();
  playback.play(tune);
  timer();
  assert.equal(constructed, 1);
  assert.deepEqual(heard, [[1, 'triangle']]);
  playback.close();
  assert.equal(timer, undefined);
});
