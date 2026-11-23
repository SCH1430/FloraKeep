import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const sources = await Promise.all(['game','art','localization','cyanotype'].map(name =>
  readFile(new URL('../src/' + name + '.js', import.meta.url), 'utf8')));
const runtime = vm.runInNewContext(sources.join('\n')+'\n({game,art,floraLocale,cyanotype})', {
  crypto:globalThis.crypto, icon:()=>'', pageHeading:(over,title)=>`<h1>${over} ${title}</h1>`,
  esc:value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
});
const {game,art,cyanotype} = runtime;
const specimen = (id,speciesId) => ({id,speciesId,lineageId:'parent-'+id,growth:.02});
const daisy = specimen('first','daisy');
const other = specimen('second','daisy');
const saved = {discovered:['daisy','rose'],plants:[daisy,other],selectedPlantId:'second'};
const render = (state, selection) => cyanotype.render(cyanotype.collection(game.CATALOG,state,selection), {
  draw:art.plantArt, portrait:(plant,options)=>art.plantArt(plant.speciesId,{...plant,...options,variant:plant.lineageId}),
  nickname:p=>p.id==='second'?'Роса <&>':'Ромашка', research:()=>2
});

test('cyanotype sheets use all eleven native silhouettes and preserve translucency and mask holes',()=>{
  for(const species of game.CATALOG) {
    const svg = art.plantArt(species.id,{view:'cyanotype',variant:'test'});
    assert.match(svg,/data-art-view="cyanotype"/);
    assert.match(svg,/feColorMatrix/);
    assert.doesNotMatch(svg,/data-pot-shape|watering-arc|leaf-cast-shadow/);
    const ids = new Set([...svg.matchAll(/ id="([^"]+)"/g)].map(match=>match[1]));
    for(const [,id] of svg.matchAll(/url\(#([^\)]+)\)/g))assert.ok(ids.has(id),id);
  }
  const print = art.plantArt('monstera',{view:'cyanotype',variant:'specimen'});
  const portrait = art.plantArt('monstera',{variant:'specimen',growth:1});
  const cuts = image => [...image.matchAll(/<ellipse cx="([^"]+)" cy="([^"]+)" rx="3" ry="[78]"/g)].map(match=>match.slice(1));
  assert.ok(cuts(print).length>0);
  assert.deepEqual(cuts(print),cuts(portrait));
});

test('choosing a species or specimen is bounded to the current garden and keeps archived discoveries',()=>{
  const choose = selection => cyanotype.collection(game.CATALOG,saved,selection);
  assert.equal(choose({}).plant.id,other.id);
  assert.equal(choose({speciesId:'daisy',plantId:daisy.id}).plant.id,daisy.id);
  const archive = choose({speciesId:'rose',plantId:daisy.id});
  assert.equal(archive.active.species.id,'rose');
  assert.equal(archive.plant,undefined);
  assert.equal(choose({speciesId:'mint',plantId:'deleted'}).plant.id,other.id);
  assert.equal(cyanotype.collection(game.CATALOG,{discovered:[],plants:[]}).active,undefined);
});

test('the active print, living portrait, actions and closed catalogue stay distinct',()=>{
  const html = render(saved,{speciesId:'daisy',plantId:'second'});
  assert.match(html,/id="cyan-plant"/);
  assert.match(html,/value="second" selected>2 · Роса &lt;&amp;&gt;/);
  assert.match(html,/data-action="cyan-species" data-id="daisy" aria-pressed="true"/);
  assert.match(html,/data-action="plant-detail" data-id="second"/);
  assert.match(html,/data-feature="growth-book" data-id="second"/);
  assert.match(html,/data-action="specimen" data-id="daisy"/);
  assert.match(html,/data-action="preview" data-id="mint"/);
  assert.match(html,/data-stage="sprout"/);
  assert.match(html,/Отпечаток взрослого растения/);
  const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length);
  const archive = render(saved,{speciesId:'rose'});
  assert.match(archive,/Справочный рисунок/);
  assert.doesNotMatch(archive,/data-action="plant-detail"/);
  const empty = render({discovered:[],plants:[]});
  assert.match(empty,/data-action="browse"/);
  assert.match(empty,/data-art-empty="herbarium"/);
  assert.equal((empty.match(/data-action="preview"/g)||[]).length,game.CATALOG.length);
});
