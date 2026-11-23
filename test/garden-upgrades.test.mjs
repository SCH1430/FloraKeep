import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const HOUR = 3600000;
const START = Date.UTC(2026, 10, 15, 12);
const modules = ['game','knowledge','garden-upgrades'].map(name => readFileSync(new URL(`../src/${name}.js`, import.meta.url),'utf8'));

function loadModules(globals = {}) {
  const sandbox = vm.createContext({...globals});
  return vm.runInContext(`${modules.join('\n')}\n({game,gardenUpgrades})`,sandbox);
}

test('the care queue spends limited water on the specimen that dries first', () => {
  const {game} = loadModules();
  const first = game.plant(game.initialState(), 'daisy', START).state;
  const second = game.plant(first, 'aloe', START).state;
  second.plants[0].moisture = 60;
  second.plants[1].moisture = 10;
  second.water = 1;
  const result = game.waterAll(second,START);
  assert.equal(result.success,true);
  assert.equal(result.state.plants[0].moisture,60);
  assert.equal(result.state.plants[1].moisture,70);
  assert.equal(result.state.water,0);
});

test('advanced placement and substrate change forecasts and survive a save round-trip', () => {
  const {game} = loadModules();
  const start = game.plant(game.initialState(), 'daisy', START).state;
  const id = start.plants[0].id;
  assert.equal(game.setEnvironment(start,id,'window','porous',START).success,false);
  const enabled = game.setCareProfile(start,'studio',START).state;
  const changed = game.setEnvironment(enabled,id,'window','porous',START).state;
  assert.equal(game.setEnvironment(enabled,id,'constructor','porous',START).success,false);
  const oldEstimate = game.forecast(enabled,id,START);
  const changedEstimate = game.forecast(changed,id,START);
  assert.ok(changedEstimate.nextWaterAt<oldEstimate.nextWaterAt);
  assert.ok(changedEstimate.withCareMatureAt<oldEstimate.withCareMatureAt);
  const saved = game.validateState(JSON.parse(JSON.stringify(changed)));
  assert.equal(saved.plants[0].site,'window');
  assert.equal(saved.plants[0].substrate,'porous');
  assert.equal(saved.careProfile,'studio');
  assert.ok(game.advance(saved,START+HOUR).plants[0].growth>game.advance(enabled,START+HOUR).plants[0].growth);
});

test('mulch spends one supply, slows drying for eight active hours and pauses in vacation', () => {
  const {game} = loadModules();
  const start = game.plant(game.initialState(), 'daisy', START).state;
  const id = start.plants[0].id;
  const treatment = game.spreadMulch(start,id,START);
  assert.equal(treatment.state.fertilizer,start.fertilizer-1);
  assert.equal(game.spreadMulch(treatment.state,id,START).success,false);
  const forecast = game.forecast(treatment.state,id,START);
  const atThreshold = game.advance(treatment.state,Math.ceil(forecast.nextWaterAt));
  assert.equal(game.needsWater(atThreshold.plants[0]),true);
  const vacation = game.setVacation(treatment.state,2,START).state;
  const afterPause = game.advance(vacation,START+2*HOUR);
  assert.equal(afterPause.plants[0].moisture,100);
  assert.equal(afterPause.plants[0].mulchUntil,START+10*HOUR);
  const afterExpiry = game.advance(afterPause,START+11*HOUR);
  assert.equal(afterExpiry.plants[0].mulchUntil,0);
  assert.ok(Math.abs(afterExpiry.plants[0].moisture-73.6)<1e-8);
});

test('reward alternatives are exclusive and a plate survives validation', () => {
  const {game} = loadModules();
  const start = game.plant(game.initialState(), 'daisy', START).state;
  const plant = start.plants[0];
  const watered = game.water(start,plant.id,START+8*HOUR).state;
  const spent = game.exchangeSupplies({...watered,water:6});
  assert.equal(spent.success,true);
  assert.equal(spent.state.water,1);
  assert.equal(spent.state.fertilizer,watered.fertilizer+1);
  const decor = game.claimTask(watered,'first-care',START+8*HOUR,'decor');
  assert.equal(decor.success,true);
  assert.equal(decor.state.coins,watered.coins);
  assert.equal(game.validateState(JSON.parse(JSON.stringify(decor.state))).decorRewards[0],'first-care');
  assert.equal(game.claimTask(decor.state,'first-care',START+8*HOUR,'supplies').success,false);
  const supplies = game.claimTask(watered,'first-care',START+8*HOUR,'supplies');
  assert.equal(supplies.state.water,watered.water+2);
});

test('a three-generation lineage is reachable through normal propagation', () => {
  const {game} = loadModules();
  const start = game.plant(game.initialState(), 'daisy', START).state;
  const child = game.propagate(start,start.plants[0].id,START+6*HOUR);
  assert.equal(child.success,true);
  const grandchild = game.propagate(child.state,child.state.plants[1].id,START+12*HOUR);
  assert.equal(grandchild.success,true);
  assert.equal(game.tasks(grandchild.state).find(task=>task.id==='three-generations').complete,true);
});

test('first flowering and collected income are visible in the persisted garden notebook', () => {
  const {game,gardenUpgrades} = loadModules();
  const base = game.initialState();
  const planting = game.plant(base, 'daisy', START).state;
  const extras = {gardenUpgrades:gardenUpgrades.normalize(null)};
  gardenUpgrades.record(extras,base,planting,START,'Ромашка посажена');
  const at = START+8*HOUR;
  const income = game.collect(planting,at);
  gardenUpgrades.record(extras,planting,income.state,at,income.message);
  const stored = gardenUpgrades.normalize(JSON.parse(JSON.stringify(extras.gardenUpgrades)));
  assert.equal(stored.milestones[planting.plants[0].id].flowerAt,START+6*HOUR);
  assert.equal(stored.ledger[0].delta,160);
  assert.ok(Math.abs(stored.ledger[0].earned.daisy-160)<1e-8);
});

test('catalog accepts Cyrillic aliases, Latin synonyms and family terms', () => {
  const {game,gardenUpgrades} = loadModules();
  const [chamomile] = game.CATALOG;
  assert.equal(gardenUpgrades.matchesSpecies(chamomile,'ромашка аптечная'),true);
  assert.equal(gardenUpgrades.matchesSpecies(chamomile,'Matricaria recutita'),true);
  assert.equal(gardenUpgrades.matchesSpecies(chamomile,'Астровые'),true);
  assert.equal(gardenUpgrades.matchesSpecies(chamomile,'Орхидные'),false);
});

test('onboarding and lab open from their real delegated click hooks', () => {
  const handlers = new Map();
  const {game,gardenUpgrades} = loadModules({document:{addEventListener:(name,fn)=>handlers.set(name,fn)}});
  const dialogs = [];
  const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;');
  const garden = gardenUpgrades.create({
    state:game.initialState(),extras:{gardenUpgrades:gardenUpgrades.normalize(null)},
    art:{plantArt:()=>'<svg></svg>'},esc,showDialog:(title,content)=>dialogs.push({title,content}),
    toast:error=>assert.fail(error),
  });
  assert.equal(typeof garden.afterRender,'function');
  const click = action=>handlers.get('click')({preventDefault(){},target:{closest:selector=>selector==='[data-garden-upgrade]'?{dataset:{gardenUpgrade:action}}:null}});
  click('onboarding');
  assert.equal(dialogs.at(-1).title,'С чего начнём?');
  assert.match(dialogs.at(-1).content,/Вырастить росток.*Изучить растения.*Украсить мир/);
  click('demo-start');
  for (let index=0;index<4;index++) click('demo-step');
  assert.match(dialogs.at(-1).content,/Учебный цикл завершён/);
  assert.match(dialogs.at(-1).content,/1660/);
  click('botany');
  assert.equal(dialogs.at(-1).title,'Ботаническая лаборатория');
  assert.match(dialogs.at(-1).content,/Разрез цветка/);
});
