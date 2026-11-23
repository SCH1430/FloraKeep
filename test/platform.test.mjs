import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, webcrypto } from 'node:crypto';
import { mkdtemp, readFile, readdir, rmdir, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import vm from 'node:vm';
import { brotliDecompressSync } from 'node:zlib';
import { channelPort, createFloraServer } from '../scripts/serve.mjs';

const hour = 3_600_000;
const start = Date.UTC(2025, 0, 1);
const run = promisify(execFile);

async function projectFile(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8');
}

async function loadModules() {
  const files = ['game', 'art', 'media', 'backup', 'exchange', 'gift', 'story-studio'];
  const sources = await Promise.all(files.map(name => projectFile(`src/${name}.js`)));
  const scope = { crypto: webcrypto, TextEncoder, TextDecoder, atob, btoa, Blob, URL, Uint8Array, Uint8ClampedArray };
  return vm.runInNewContext(`${sources.join('\n')}\n({ game, art, media, backup, exchange, gift, storyStudio })`, scope);
}

function nearly(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `Expected ${actual} ≈ ${expected}`);
}

function section(content, from, until) {
  const startAt = content.indexOf(from);
  const endAt = content.indexOf(until, startAt);
  assert.ok(startAt >= 0 && endAt > startAt, `Missing app section ${from}`);
  return content.slice(startAt, endAt);
}

async function appStorageHarness({ game, storage, current, locks, legacy = null }) {
  const app = await projectFile('src/app.js');
  class TestDate extends Date {
    static now() { return start; }
  }
  const messages = [];
  const scope = { localStorage: storage, Date: TestDate, structuredClone, game, messages, current, legacy, navigator: { locks } };
  return vm.runInNewContext(`
    const KEY = 'test-garden', BACKUP = 'test-garden-previous';
    let state = current, prefs = {}, journal = [], extras = {}, saveProblem = false;
    let savedSnapshot = null, validatedSnapshot = null, migrationSource = legacy, backgroundDirty = false;
    const updateSaveStatus = () => {};
    const toast = text => messages.push(text);
    const payload = () => ({game:state,prefs,journal,extras});
    const unpack = raw => {
      const saved = JSON.parse(raw);
      return saved ? {...saved,state:saved.game} : null;
    };
    const checkpoint = () => {};
    const recordStateTransition = () => {};
    const log = text => journal.push(text);
    const closeDialog = () => {};
    const music = () => {};
    const navigate = () => {};
    ${section(app, 'function save() {', 'function refreshDialog() {')}
    ${section(app, 'function restoreGarden(incoming) {', 'async function importFile')}
    const mutate = operation => exclusive(() => {
      syncLatest();
      const result = operation(state);
      if (result.success) state = result.state;
      return result.success && save();
    });
    ({ save, restoreGarden, mutate, messages, status: () => ({state, saveProblem}) })
  `, scope);
}

function storageAdapter(entries, writeFailure = () => null) {
  return {
    getItem: key => entries.get(key) ?? null,
    removeItem: key => entries.delete(key),
    setItem: (key, value) => {
      const name = writeFailure(key);
      if (name) throw new DOMException('Simulated test storage failure', name);
      entries.set(key, value);
    },
  };
}

test('a new garden can plant, water, mature and collect income', async () => {
  const { game } = await loadModules();
  const garden = game.initialState(start);
  const planted = game.plant(garden, 'daisy', start);
  assert.equal(planted.success, true);
  assert.equal(planted.state.coins, garden.coins);
  const plantId = planted.state.plants[0].id;

  assert.equal(game.water(planted.state, plantId, start).success, false);
  const watered = game.water(planted.state, plantId, start + 8 * hour);
  assert.equal(watered.success, true);
  assert.equal(watered.state.water, garden.water - 1);
  assert.equal(watered.state.plants[0].research, 1);
  assert.equal(watered.state.plants[0].moisture, 100);
  assert.equal(watered.state.plants[0].growth, 1);

  const collected = game.collect(watered.state, start + 8 * hour + 60_000);
  assert.equal(collected.success, true);
  assert.ok(collected.state.coins > garden.coins);
  assert.ok(collected.state.plants[0].earned < 1);
  assert.equal(garden.plants.length, 0);
});

test('watering threshold and maturity forecast agree with the simulation', async () => {
  const { game } = await loadModules();
  const planted = game.plant(game.initialState(start), 'daisy', start).state;
  const plantId = planted.plants[0].id;
  const { nextWaterAt, matureAt } = game.forecast(planted, plantId, start);
  assert.equal(nextWaterAt, start + 7.5 * hour);
  assert.equal(matureAt, start + 6 * hour);
  assert.ok(game.advance(planted, matureAt - 1).plants[0].growth < 1);
  assert.equal(game.advance(planted, matureAt).plants[0].growth, 1);
  assert.equal(game.water(planted, plantId, nextWaterAt - 1).success, false);
  assert.equal(game.advance(planted, nextWaterAt).plants[0].moisture, 70);
  assert.equal(game.water(planted, plantId, nextWaterAt).success, true);
});

test('offline cap, clock rollback and equivalent offset timestamps preserve garden state', async () => {
  const { game } = await loadModules();
  const planted = game.plant(game.initialState(start), 'daisy', start).state;
  const day = game.advance(planted, start + 24 * hour).plants[0];
  const week = game.advance(planted, start + 7 * 24 * hour).plants[0];
  for (const key of ['health', 'moisture', 'growth', 'earned']) nearly(day[key], week[key]);
  assert.equal(week.lastUpdated, start + 7 * 24 * hour);
  assert.equal(game.advance(planted, start - hour).plants[0].lastUpdated, start);

  const utc = Date.parse('2025-01-01T08:00:00Z');
  const shifted = Date.parse('2025-01-01T11:00:00+03:00');
  assert.deepEqual(game.advance(planted, utc), game.advance(planted, shifted));
  const vacation = game.setVacation(planted, 12, start);
  assert.equal(vacation.success, true);
  const duringVacation = game.advance(vacation.state, start + 10 * hour).plants[0];
  assert.equal(duringVacation.growth, 0);
  assert.equal(duringVacation.moisture, 100);
});

test('reference web and Android backups import with their different metadata', async () => {
  const { game, backup } = await loadModules();
  for (const [name, type, checked] of [['web-v1', 'web', false], ['web-v2', 'web', true], ['android-v1', 'android', true]]) {
    const text = await projectFile(`test/fixtures/${name}.json`);
    const result = await backup.decodeBackup(text, { validateGame: game.validateState });
    assert.equal(result.source, type);
    assert.equal(result.metadata.checksum, checked);
    assert.equal(result.payload.game.plants[0].id, 'daisy-legacy');
    assert.equal(result.payload.game.plants[0].lineageId, 'daisy-legacy');
    assert.equal(result.payload.prefs.calm, true);
    if (type === 'android') {
      assert.equal(result.payload.extras.history['daisy-legacy'][0].moisture, 66);
    } else {
      assert.equal(result.payload.extras.appearance['daisy-legacy'].name, 'Тёплый лист');
    }
  }
});

test('backup round trip preserves text and detects unintentional changes', async () => {
  const { game, backup } = await loadModules();
  const source = JSON.parse(await projectFile('test/fixtures/web-v1.json'));
  const encoded = await backup.encodeBackup(source);
  assert.equal(encoded.sha256, createHash('sha256').update(encoded.payload).digest('hex'));
  const decoded = await backup.decodeBackup(JSON.stringify(encoded), { validateGame: game.validateState });
  assert.equal(decoded.payload.journal[0].text, 'Первое наблюдение за ромашкой');
  encoded.payload = encoded.payload.replace('ромашкой', 'ромашечкой');
  await assert.rejects(backup.decodeBackup(JSON.stringify(encoded), { validateGame: game.validateState }), /контрольная сумма/);
});

test('importing and subsequently deleting a plant does not make it eligible for reimport', async () => {
  const { game, backup } = await loadModules();
  const source = JSON.parse(await projectFile('test/fixtures/web-v1.json')).game;
  const target = game.initialState(start);
  const options = { validateGame: game.validateState, now: start };
  const merged = backup.mergePlants(target, source, ['daisy-legacy'], options);
  assert.equal(merged.added.length, 1);
  assert.equal(merged.state.coins, target.coins);
  assert.equal(merged.state.plants[0].earned, 0);
  const removed = game.remove(merged.state, 'daisy-legacy');
  const repeated = backup.mergePlants(removed.state, source, ['daisy-legacy'], options);
  assert.equal(repeated.added.length, 0);
  assert.equal(repeated.skipped[0].reason, 'already-imported');
});

test('blocked save and a failed restore leave the previous active garden intact', async () => {
  const { game } = await loadModules();
  const current = game.initialState(start);
  const entries = new Map();
  let blocker;
  const storage = storageAdapter(entries, () => blocker);
  const app = await appStorageHarness({ game, current, storage });
  assert.equal(app.save(), true);
  const previous = entries.get('test-garden');
  blocker = 'SecurityError';
  assert.equal(app.save(), false);
  assert.equal(app.status().saveProblem, true);
  for (const name of ['SecurityError', 'QuotaExceededError']) {
    blocker = name;
    const replacement = { state: { ...current, coins: 30 }, prefs: {}, journal: [], extras: {} };
    assert.equal(app.restoreGarden(replacement), false);
    assert.equal(app.status().state.coins, current.coins);
    assert.equal(entries.get('test-garden'), previous);
    assert.match(app.messages.at(-1), /Восстановление не записалось/);
  }
  blocker = undefined;
  assert.equal(app.restoreGarden({ state: { ...current, coins: 30 }, prefs: {}, journal: [], extras: {} }), true);
  assert.equal(JSON.parse(entries.get('test-garden')).game.coins, 30);
  assert.equal(app.status().saveProblem, false);
});

test('the previous revision is retained before a migrated revision is written', async () => {
  const { game } = await loadModules();
  const current = game.initialState(start);
  const legacy = JSON.stringify({ game:current, prefs:{}, journal:[], extras:{schema:2} });
  const entries = new Map([['test-garden',legacy]]);
  const storage = storageAdapter(entries, key => key==='test-garden' ? 'SecurityError' : null);
  const app = await appStorageHarness({ game, current, storage, legacy });
  assert.equal(app.save(),false);
  assert.equal(entries.get('test-garden-previous'),legacy);
  assert.equal(entries.get('test-garden'),legacy);
});

test('background ticks batch ordinary saves and immediately persist new observations',async()=>{
  const source=await projectFile('src/app.js');
  const sandbox=vm.runInNewContext(`
    let now=3000000,writes=0,backgroundDirty=false,saveProblem=false,observation=false;
    let state={plants:[{id:'sample'}]},journal=[],page='garden';
    const extras={lastSavedAt:now};
    const autoSaveInterval=300000,Date={now:()=>now};
    const game={advance:state=>state},document={hidden:false,documentElement:{dataset:{}}};
    const dialog={open:false},features={applyAtmosphere(){}};
    const exclusive=action=>action(),syncLatest=()=>false,recordStateTransition=()=>{};
    const refreshDialog=()=>{},refreshLiveGarden=()=>{},render=()=>{};
    const featureModule={recordHistory:()=>observation};
    function save(){writes++;extras.lastSavedAt=now;backgroundDirty=false;return true;}
    ${section(source,'function tick() {',"document.addEventListener('visibilitychange'")}
    ({advance:(ms,changed=false)=>{now+=ms;observation=changed;tick();return writes;}})
  `);
  for(let i=0;i<9;i++)assert.equal(sandbox.advance(30000),0);
  assert.equal(sandbox.advance(30000),1);
  assert.equal(sandbox.advance(30000,true),2);
  assert.equal(sandbox.advance(30000),2);
});

test('mutations in two contexts preserve both watering and purchase using a shared lock', async () => {
  const { game } = await loadModules();
  const planted = game.plant(game.initialState(start), 'daisy', start - 8 * hour).state;
  const current = game.advance(planted, start);
  const entries = new Map();
  const storage = storageAdapter(entries);
  let last = Promise.resolve();
  const locks = { request: (key, action) => {
    assert.equal(key, 'test-garden');
    const queued = last.then(action);
    last = queued.catch(() => {});
    return queued;
  } };
  const [first, second] = await Promise.all([
    appStorageHarness({ game, current, storage, locks }),
    appStorageHarness({ game, current, storage, locks }),
  ]);
  const plantId = current.plants[0].id;
  assert.deepEqual(await Promise.all([
    first.mutate(state => game.water(state, plantId, start)),
    second.mutate(state => game.buy(state, 'water')),
  ]), [true, true]);
  const written = JSON.parse(entries.get('test-garden')).game;
  assert.equal(written.plants[0].moisture, 100);
  assert.equal(written.water, current.water);
  assert.equal(written.coins, current.coins - game.WATER_PRICE);
});

test('catalog summary focus can be restored and an income refresh retains the existing button', async () => {
  const app = await projectFile('src/app.js');
  const document = { activeElement: null };
  const element = (tagName, dataset = {}, textContent = '') => ({
    tagName, dataset, textContent, id: '', isConnected: true,
    matches: selector => selector === tagName.toLowerCase(),
    getAttribute: () => null,
    closest: () => null,
    getClientRects: () => [{}],
    focus: () => {},
  });
  const oldSummary = element('SUMMARY', {}, 'Цена, время и избранное');
  const newSummary = element('SUMMARY', {}, 'Цена, время и избранное');
  newSummary.focus = () => { document.activeElement = newSummary; };
  const incomeButton = element('BUTTON', { action: 'collect' });
  const amount = { textContent: '72' };
  const income = {
    querySelector: selector => selector === 'button' ? incomeButton : amount,
    set innerHTML(value) { assert.fail(`Replaced focused income markup: ${value}`); },
  };
  const hero={dataset:{welcomeKey:'collect-0'},set outerHTML(value){assert.fail(`Replaced unchanged hero: ${value}`);}};
  let controls = [oldSummary];
  const scope = {
    document,
    app: { contains: target => controls.includes(target), querySelectorAll: () => controls },
    state:{plants:[]},game:{needsWater:()=>false},incomeReady:()=>73,
    careQueueView:()=>({rows:[],key:'[]'}),welcomeView:()=>({key:'collect-0'}),dailyCareState:()=>({key:'today'}),
    refreshGardenCollection: () => false, incomeInfo: () => ({ ready: 73, amount: '73' }),
    floraLocale: { apply: () => {} },
    $: selector => selector === '[data-income-stat]' ? income : selector==='.garden-welcome'?hero:null,
  };
  const focusCode = section(app, 'const focusSelector = ', 'function saveStatusLabel() {');
  const liveCode = section(app, 'function refreshLiveGarden() {', 'features=featureModule.createFeatures');
  const runtime = vm.runInNewContext(`${focusCode}\n${liveCode}\n({captureFocus,restoreFocus,refreshLiveGarden})`, scope);

  document.activeElement = oldSummary;
  const snapshot = runtime.captureFocus(scope.app);
  controls = [newSummary];
  document.activeElement = null;
  assert.equal(runtime.restoreFocus(scope.app, snapshot), true);
  assert.equal(document.activeElement, newSummary);

  controls = [incomeButton];
  document.activeElement = incomeButton;
  runtime.refreshLiveGarden();
  assert.equal(document.activeElement, incomeButton);
  assert.equal(amount.textContent, '73');
});

function readGifFrames(bytes) {
  const gif = Buffer.from(bytes);
  assert.equal(gif.toString('ascii', 0, 6), 'GIF89a');
  const globalTableSize = gif[10] & 0x80 ? 3 * (1 << ((gif[10] & 7) + 1)) : 0;
  let offset = 13 + globalTableSize;
  const frames = [];
  const skipBlocks = () => {
    while (offset < gif.length && gif[offset] > 0) offset += gif[offset] + 1;
    assert.equal(gif[offset], 0, 'GIF data block terminator');
    offset++;
  };

  while (offset < gif.length) {
    const marker = gif[offset++];
    if (marker === 0x3b) {
      assert.equal(offset, gif.length);
      return { width: gif.readUInt16LE(6), height: gif.readUInt16LE(8), frames };
    }
    if (marker === 0x21) {
      offset++;
      skipBlocks();
      continue;
    }
    assert.equal(marker, 0x2c, 'GIF image descriptor');
    frames.push([gif.readUInt16LE(offset + 4), gif.readUInt16LE(offset + 6)]);
    if (gif[offset + 8] & 0x80) offset += 3 * (1 << ((gif[offset + 8] & 7) + 1));
    offset += 10;
    skipBlocks();
  }
  throw new Error('GIF trailer missing');
}

function verifyInlineScripts(html) {
  let scriptCount = 0;
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    if (match[0].startsWith('<script type="application/json"')) JSON.parse(match[1]);
    else {
      new vm.Script(match[1]);
      scriptCount++;
    }
  }
  return scriptCount;
}

test('GIF frame metadata, SVG print dimensions and portable HTML remain readable', async () => {
  const { game, art, media, gift, storyStudio } = await loadModules();
  const width = 32;
  const height = 48;
  const first = new Uint8ClampedArray(width * height * 4).fill(255);
  const second = new Uint8ClampedArray(first);
  second[0] = 0;
  const gif = readGifFrames(media.encodeGIF([first, second], width, height));
  assert.equal(gif.width, width);
  assert.equal(gif.height, height);
  assert.deepEqual(gif.frames, [[width, height], [width, height]]);

  const svg = media.postcardSVG({ artwork: art.plantArt('daisy'), title: 'Утренний сад', width: 600, height: 900 });
  assert.match(svg, /width="600" height="900"/);
  assert.match(svg, /Утренний сад/);

  const gardenGift = gift.buildGiftHTML({ ...gift.defaultGiftDraft(), id: 'test-gift-id' }, { art, catalog: game.CATALOG });
  const play = storyStudio.defaultStoryStudioState();
  const story = storyStudio.buildStoryHTML({ ...play.draft, name: 'Утренний сад' }, { art, catalog: game.CATALOG });
  assert.match(gardenGift, /<html lang="ru">/);
  assert.match(story, /Утренний сад/);
  assert.ok(verifyInlineScripts(gardenGift) > 0);
  assert.ok(verifyInlineScripts(story) > 0);
});

test('web manifest icons have their stated PNG dimensions', async () => {
  const manifest = JSON.parse(await projectFile('web/manifest.webmanifest'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  const icons = manifest.icons.filter(icon => icon.type === 'image/png');
  assert.deepEqual(icons.map(icon => icon.sizes), ['192x192', '512x512']);
  for (const icon of icons) {
    const png = await readFile(new URL(`../web/${icon.src}`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.toString('ascii', 12, 16), 'IHDR');
    assert.equal(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, icon.sizes);
  }
});

test('built portable and web artifacts retain script syntax, version and binary assets', async () => {
  const project = fileURLToPath(new URL('../', import.meta.url));
  const folder = await mkdtemp(join(tmpdir(), 'flora-artifact-test-'));
  const portable = join(folder, 'portable.html');
  const index = join(folder, 'index.html');
  const command = ['scripts/build.mjs', '--out'];
  try {
    await run(process.execPath, [...command, portable], { cwd: project });
    await run(process.execPath, [...command, index, '--web'], { cwd: project });
    const [offline, web, worker, download] = await Promise.all([
      readFile(portable, 'utf8'), readFile(index, 'utf8'), readFile(join(folder, 'sw.js'), 'utf8'), readFile(join(folder, 'download.html'), 'utf8'),
    ]);
    assert.match(offline, /__FLORA_STANDALONE__ = true/);
    assert.equal(verifyInlineScripts(offline), 1);
    assert.doesNotMatch(web,/__FLORA_STANDALONE__|data:audio/);
    const appAsset=web.match(/<script defer src="\.\/(flora-app-[a-f0-9]{12}\.js)"/)?.[1];
    const styleAsset=web.match(/<link rel="stylesheet" href="\.\/(flora-style-[a-f0-9]{12}\.css)"/)?.[1];
    assert.ok(appAsset&&styleAsset);
    const runtime=await readFile(join(folder,appAsset),'utf8');
    assert.match(runtime,/__FLORA_STANDALONE__ = false/);
    assert.doesNotThrow(()=>new vm.Script(runtime));
    assert.ok(web.length<2000);
    const buildInfo = html => JSON.parse(html.match(/__FLORA_BUILD_INFO__ = (.*);/)[1]);
    assert.deepEqual(buildInfo(offline), buildInfo(runtime));
    assert.match(buildInfo(runtime).id, /^[a-f\d]{16}$/);
    assert.ok(worker.includes(appAsset));
    assert.ok(worker.includes(styleAsset));
    const distributedAudio=JSON.parse(runtime.match(/__FLORA_ASSETS__ = (.*);/)[1]);
    const music=await readFile(join(folder,distributedAudio.music));
    assert.equal(music.subarray(0,4).toString(),'RIFF');
    assert.ok(worker.includes(distributedAudio.music.slice(2)));
    assert.match(download, /href="\.\/portable\.html" download="index\.html"/);
    const stylesheet = await readFile(join(folder,styleAsset),'utf8');
    for (const role of ['sill-scene', 'sill-scene-mobile']) {
      const name = stylesheet.match(new RegExp(`--${role}: url\\("\\./(flora-${role}-[a-f0-9]{12}\\.webp)"\\)`))?.[1];
      assert.ok(name && worker.includes(name), role);
      const asset = await readFile(join(folder,name));
      assert.equal(asset.toString('ascii',8,12), 'WEBP');
      assert.ok(offline.includes(`--${role}: url("data:image/webp;base64,${asset.toString('base64')}")`));
    }
    assert.doesNotMatch(worker, /__FLORA_BUILD_ID__/);
    for (const name of ['icon-192.png', 'icon-512.png']) {
      const original = await readFile(join(project, 'web', name));
      const built = await readFile(join(folder, name));
      assert.deepEqual(built, original);
    }
  } finally {
    await Promise.all((await readdir(folder)).map(name => unlink(join(folder, name))));
    await rmdir(folder);
  }
});

test('service worker stages a new shell, waits for consent and starts offline when active', async () => {
  const scope = 'https://flora.example.test/garden/';
  const oldKey = `flora-keep:${scope}:previous`;
  const unrelated = 'unrelated-project';
  const currentKey = `flora-keep:${scope}:new-build`;
  const stored = new Map([[oldKey, new Map()], [unrelated, new Map()]]);
  const listeners = new Map();
  let claimed = false;
  let skipped = false;

  const worker = {
    self: {
      registration: { scope },
      clients: { claim: async () => { claimed = true; } },
      skipWaiting: async () => { skipped = true; },
      addEventListener: (name, callback) => listeners.set(name, callback),
    },
    caches: {
      open: async key => {
        if (!stored.has(key)) stored.set(key, new Map());
        const entries = stored.get(key);
        return {
          addAll: async requests => {
            for (const request of requests) {
              assert.equal(request.cache, 'reload');
              entries.set(request.url, new Response(`Cached entry: ${request.url}`));
            }
          },
          match: async url => entries.get(url)?.clone(),
        };
      },
      keys: async () => [...stored.keys()],
      delete: async key => stored.delete(key),
    },
    URL, Request,
    fetch: async () => { throw new Error('Offline test'); },
  };
  const source = await projectFile('web/sw.js');
  const appFile='flora-app-000000000000.js';
  vm.runInNewContext(source.replaceAll('__FLORA_BUILD_ID__', 'new-build')
    .replace('/* generated-shell-assets */',JSON.stringify(appFile)), worker);
  const emit = async (name, fields = {}) => {
    let pending;
    const wait = promise => { pending = promise; };
    listeners.get(name)({ waitUntil: wait, respondWith: wait, ...fields });
    return pending;
  };
  await emit('install');
  assert.equal(stored.has(oldKey), true);
  assert.equal(stored.has(currentKey), true);
  assert.equal(skipped, false);
  await emit('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(skipped, true);
  await emit('activate');
  assert.equal(claimed, true);
  assert.equal(stored.has(oldKey), false);
  assert.equal(stored.has(unrelated), true);

  const page = await emit('fetch', { request: { url: `${scope}?test=1`, method: 'GET', mode: 'navigate' } });
  assert.equal(await page.text(), `Cached entry: ${scope}index.html`);
  const asset=await emit('fetch',{request:{url:scope+appFile,method:'GET',mode:'no-cors'}});
  assert.equal(await asset.text(),`Cached entry: ${scope}${appFile}`);
  const foreign = await emit('fetch', { request: { url: 'https://outside.example.test/', method: 'GET', mode: 'navigate' } });
  assert.equal(foreign, undefined);
});

test('web update waits for the open workbench to finish saving before reloading', async () => {
  const app = await projectFile('src/app.js');
  const events = [];
  const controllerListeners = new Map();
  let flush;
  let saved = true;
  const browser = {
    isFileMode: false, isStandalone: false, isSecureContext: true, updateRequested: false,
    document: { createElement: () => ({}), head: { append() {} } },
    navigator: { serviceWorker: {
      controller: {},
      register: async () => ({ addEventListener() {} }),
      addEventListener: (name, callback) => controllerListeners.set(name, callback),
    } },
    location: { protocol: 'https:', reload: () => events.push('reload') },
    features: { flushExperiences: () => new Promise(resolve => { flush = resolve; }) },
    save: () => { events.push('save'); return saved; },
    toast: () => events.push('warning'),
  };
  const controllerCode = app.slice(app.indexOf("if (!isFileMode && !isStandalone && ['http:', 'https:']"));
  assert.ok(controllerCode.startsWith('if (!isFileMode'));
  vm.runInNewContext(controllerCode, browser);
  const onChange = controllerListeners.get('controllerchange');
  saved = false;
  const pending = onChange();
  assert.deepEqual(events, []);
  flush();
  await pending;
  assert.deepEqual(events, ['save', 'warning']);
  saved = true;
  const retry = onChange();
  assert.deepEqual(events, ['save', 'warning']);
  flush();
  await retry;
  assert.deepEqual(events, ['save', 'warning', 'save', 'reload']);
});

test('local server routes the web manifest and gives preview a separate port', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'flora-web-test-'));
  const manifest = '{"name":"Flora Keep"}';
  const index = join(folder, 'index.html');
  const manifestFile = join(folder, 'manifest.webmanifest');
  const asset='flora-app-111111111111.js';
  const assetFile=join(folder,asset);
  const code=Buffer.from('console.log("Flora Keep");\n'.repeat(90));
  try {
    await writeFile(index, '<!doctype html><title>Flora Keep</title>');
    await writeFile(manifestFile, manifest);
    await writeFile(assetFile,code);
    const server = await createFloraServer(folder, { preview: true });
    const dispatch = server.listeners('request')[0];
    const send = async (url, method = 'GET', requestHeaders={}) => {
      const response = new PassThrough();
      const headers = new Map();
      const chunks = [];
      response.setHeader = (name, value) => headers.set(name.toLowerCase(), value);
      response.writeHead = (status, extra = {}) => {
        response.statusCode = status;
        for (const [name, value] of Object.entries(extra)) response.setHeader(name, value);
        return response;
      };
      response.on('data', chunk => chunks.push(chunk));
      await dispatch({ url, method, headers:requestHeaders }, response);
      const bytes=Buffer.concat(chunks);
      return { status: response.statusCode, headers, body: bytes.toString(), bytes };
    };
    const response = await send('/manifest.webmanifest');
    assert.equal(response.headers.get('content-type'), 'application/manifest+json; charset=utf-8');
    assert.equal(response.headers.get('x-flora-channel'), 'preview');
    assert.equal(response.body, manifest);
    assert.equal((await send('/missing')).status, 404);
    assert.equal((await send('/', 'HEAD')).body, '');
    const packed=await send('/'+asset,'GET',{'accept-encoding':'gzip, br; q=0.8'});
    assert.equal(packed.headers.get('content-encoding'),'br');
    assert.equal(packed.headers.get('vary'),'Accept-Encoding');
    assert.match(packed.headers.get('cache-control'),/immutable/);
    assert.deepEqual(brotliDecompressSync(packed.bytes),code);
    const plain=await send('/'+asset,'GET',{'accept-encoding':'br;q=0, *'});
    assert.equal(plain.headers.has('content-encoding'),false);
    assert.deepEqual(plain.bytes,code);
    assert.notEqual(channelPort({ preview: true }), channelPort());
  } finally {
    await Promise.allSettled([unlink(index), unlink(manifestFile),unlink(assetFile)]);
    await rmdir(folder);
  }
});
