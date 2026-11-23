import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';

const source = name => readFileSync(new URL(`../src/${name}.js`, import.meta.url), 'utf8');
const started = performance.now();
const { game, art } = vm.runInNewContext(`${source('game')}\n${source('art')}\n({game,art})`, {crypto:globalThis.crypto});
const load = performance.now() - started;
const now = 1_800_000_000_000;
let state = {...game.initialState(now),coins:1_000_000};
for (let index=0; index<100; index++) {
  const id = game.CATALOG[index%game.CATALOG.length].id;
  state = game.plant(state,id,now).state;
}
const simulate = performance.now();
const processed = game.advance(state, now+24*3600000);
const simulation = performance.now()-simulate;
const paint = performance.now();
const artwork = processed.plants.map(plant=>art.plantArt(plant.speciesId,{id:plant.id,growth:plant.growth,moisture:plant.moisture}));
console.log(JSON.stringify({
  plants:processed.plants.length,
  loadModulesMs:Number(load.toFixed(2)),
  simulateDayMs:Number(simulation.toFixed(2)),
  generateSvgMs:Number((performance.now()-paint).toFixed(2)),
  artworkBytes:artwork.reduce((sum,svg)=>sum+Buffer.byteLength(svg),0),
},null,2));
