import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import vm from 'node:vm';

const root=fileURLToPath(new URL('../',import.meta.url));
const source=name=>readFile(join(root,'src',name+'.js'),'utf8');

test('the built portable app mounts its garden shell and registers normal entry points',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'flora-mount-'));
  const file=join(directory,'flora.html');
  try {
    execFileSync(process.execPath,['scripts/build.mjs','--out',file],{cwd:root});
    const html=await readFile(file,'utf8');
    const script=html.match(/<script>([\s\S]+)<\/script>/)?.[1];
    assert.ok(script);
    const handlers=new Set();
    const clicks=[];
    const classList={add(){},remove(){},toggle(){},contains(){return false;}};
    const element={
      addEventListener(type){handlers.add(type);},querySelector(){return null;},querySelectorAll(){return [];},
      contains(){return false;},append(){},insertAdjacentHTML(){},classList,dataset:{},style:{setProperty(){}},
    };
    const app={...element,innerHTML:''};
    const dialog={...element,open:false,scrollTop:0};
    const rootElement={...element,lang:'ru'};
    const document={
      documentElement:rootElement,body:element,activeElement:null,hidden:false,
      querySelector(selector){return new Map([['#app',app],['#dialog',dialog],['#toast',element]]).get(selector)||null;},
      querySelectorAll(){return [];},addEventListener(type,listener){handlers.add(type);if(type==='click')clicks.push(listener);},
    };
    app.ownerDocument=document;
    dialog.ownerDocument=document;
    const storage=new Map();
    const sandbox={
      document,location:{protocol:'file:',hash:''},navigator:{},crypto:globalThis.crypto,structuredClone,
      TextEncoder,TextDecoder,AbortController,Blob,innerHeight:780,innerWidth:1200,
      matchMedia:()=>({matches:false}),addEventListener(type){handlers.add(type);},
      setInterval(){},setTimeout(){},clearTimeout(){},
      localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
    };
    sandbox.window=sandbox;
    vm.runInNewContext(script,sandbox,{timeout:2000});
    assert.match(app.innerHTML,/Мой маленький сад/);
    assert.match(app.innerHTML,/Выбрать первый росток/);
    assert.match(app.innerHTML,/data-save-status/);
    assert.deepEqual(['click','input','change','hashchange','visibilitychange'].filter(name=>!handlers.has(name)),[]);
    const activateSill=(action,id)=>{
      const button={dataset:{action,id,onSill:'true'},closest:selector=>selector==='[data-action]'?button:null,getBoundingClientRect:()=>({})};
      for(const click of clicks)click({target:button});
    };
    assert.match(app.innerHTML,/data-action="plant" data-id="daisy" data-on-sill="true"/);
    activateSill('plant','daisy');
    const readSaved=()=>JSON.parse(storage.get('flora-keep-web-v1'));
    const freshlyPlanted=readSaved().game;
    assert.equal(dialog.open,false);
    assert.equal(freshlyPlanted.plants[0].moisture,55);
    const firstId=freshlyPlanted.plants[0].id;
    assert.ok(app.innerHTML.includes(`data-action="water" data-id="${firstId}" data-on-sill="true"`));
    activateSill('water',firstId);
    const watered=readSaved();
    assert.equal(watered.game.water,freshlyPlanted.water-1);
    assert.equal(watered.game.plants[0].moisture,100);
    assert.equal(watered.extras.layout.sillPlantId,firstId);
    assert.ok(watered.journal.some(event=>event.plantId===firstId&&event.plantsWatered===1));
    assert.match(app.innerHTML,/Почва влажная · 100% влаги/);
    assert.match(app.innerHTML,/data-soil="wet"/);
    assert.equal(dialog.open,false);
    const music=Buffer.from(sandbox.__FLORA_ASSETS__.music.split(',')[1],'base64');
    const original=await readFile(join(root,'src/assets/music.wav'));
    assert.equal(music.readUInt32LE(24)*2,original.readUInt32LE(24));
    assert.equal(music.readUInt32LE(40)*2,original.readUInt32LE(40));
    const game=vm.runInNewContext((await source('game'))+'\ngame',{crypto:globalThis.crypto});
    const now=Date.now();
    const initial={...game.initialState(now),coins:100000};
    const planted=['daisy','rose','monstera'].reduce((state,id)=>game.plant(state,id,now).state,initial);
    const remembered=planted.plants[1].id;
    storage.set('flora-keep-web-v1',JSON.stringify({format:'FloraKeepWeb',version:1,savedAt:now,game:planted,extras:{schema:3,gardenName:'Сад с коллекцией',layout:{sillPlantId:remembered}}}));
    const savedGardenSandbox={...sandbox};
    savedGardenSandbox.window=savedGardenSandbox;
    vm.runInNewContext(script,savedGardenSandbox,{timeout:2000});
    assert.match(app.innerHTML,/id="garden-still-life"/);
    assert.ok(app.innerHTML.includes(`data-action="sill-select" data-id="${remembered}" aria-pressed="true"`));
    assert.match(app.innerHTML,/Следующая забота/);
    assert.match(app.innerHTML,/class="growth-stage"/);
    assert.match(app.innerHTML,/data-water-share/);
    assert.match(app.innerHTML,/flora-monochrome-mark/);
  } finally {
    await rm(file,{force:true});
    await rmdir(directory);
  }
});

test('school watering trial is reproducible and a selected backup reports its actual UTF-8 size',async()=>{
  const parts=await Promise.all(['game','backup','workbench'].map(source));
  const runtime=vm.runInNewContext(parts.join('\n')+'\n({game,backup,floraWorkbench})',{TextEncoder,crypto:globalThis.crypto});
  const {game,backup,floraWorkbench}=runtime;
  const rows=floraWorkbench.simulateExperiment(game,36);
  assert.equal(rows.length,13);
  assert.deepEqual(rows[0].a,rows[0].b);
  assert.ok(rows.some(row=>row.a.moisture>row.b.moisture));
  const payload={format:'FloraKeepWeb',version:1,game:game.initialState(),extras:{gardenName:'Тестовый сад'}};
  const envelope=await backup.encodeBackup(payload);
  assert.equal(backup.estimateBackupBytes(payload),Buffer.byteLength(JSON.stringify(envelope),'utf8'));
});

test('legacy extras migrate one revision at a time while retaining old feature data',async()=>{
  const format=vm.runInNewContext((await source('save-format'))+'\nsaveFormat');
  const original={schema:1,gardenName:'Сад',layout:{favorites:['old-plant']}};
  const migrated=format.migrateExtras(original);
  assert.equal(migrated.extras.schema,3);
  assert.equal(migrated.extras.layout.favorites[0],'old-plant');
  assert.equal(migrated.extras.gardenName,'Сад');
  assert.equal(migrated.migrated,true);
  assert.equal(original.schema,1);
  assert.equal(format.migrateExtras(migrated.extras).migrated,false);
  assert.throws(()=>format.migrateExtras({schema:100}),/не поддерживается/);
});
