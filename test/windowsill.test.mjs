import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=['game','art','windowsill','localization'].map(name=>readFileSync(new URL('../src/'+name+'.js',import.meta.url),'utf8')).join('\n');
const {game,art,windowsill,floraLocale}=vm.runInNewContext(source+'\n({game,art,windowsill,floraLocale})');
const plants=Array.from({length:100},(_,i)=>({id:'pot-'+i,speciesId:i%2?'monstera':'daisy',moisture:i===43?14:92,growth:.78}));
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function makeView(list,preferred=null,lang='ru'){
  const model=windowsill.shelfModel(list,[],preferred,null,game.needsWater);
  const name=plant=>plant.id==='pot-43'?'<Мой цветок>':plant.id;
  const t=(key,fields)=>floraLocale.t(key,fields,lang);
  const view={model,seed:'daisy',cost:0,canPlant:true,name,thirsty:game.needsWater,options:list.map(plant=>[plant.id,name(plant)]),
    title:'Любимые <горшки>',description:'',water:2,esc,t,icon:()=>'',artKey:plant=>art.plantVisualStage(plant.growth),
    species:id=>game.CATALOG.find(plant=>plant.id===id),environment:()=>'',
    image:plant=>`<svg data-pot="${plant.id}"></svg>`,seedImage:()=>'<svg></svg>',
    atmosphere:{light:'day',season:'summer',weather:'clear',scene:'window',outside:'auto',platform:'wood',shelf:'medium',decor:[]}};
  view.key=windowsill.key(view);
  return view;
}

test('ordered shelves keep the individual pot, fall back to the driest and draw only the visible specimens',()=>{
  const view=makeView(plants);
  assert.equal(view.model.selected.id,'pot-43');
  assert.equal(view.model.page,14);
  assert.equal(view.model.pages,34);
  assert.deepEqual(Array.from(view.model.visible,p=>p.id),['pot-42','pot-43','pot-44']);
  const order=['pot-99','pot-97'];
  assert.deepEqual(Array.from(windowsill.shelfModel(plants,order,'pot-97',null,game.needsWater).visible,p=>p.id),['pot-99','pot-97','pot-0']);
  assert.equal(windowsill.shelfModel(plants,[],'removed',null,game.needsWater).selected.id,'pot-43');
  const html=windowsill.markup(view);
  assert.equal((html.match(/<svg data-pot=/g)||[]).length,3);
  assert.equal((html.match(/<option value=/g)||[]).length,100);
  assert.match(html,/data-action="water" data-id="pot-43" data-on-sill="true"/);
  assert.match(html,/data-action="sill-page" data-id="pot-45"/);
});

test('the windowsill distinguishes seed selection, dry soil without water, a wet specimen, and the English controls',()=>{
  const empty=makeView([]);
  assert.equal((windowsill.markup(empty).match(/class="sill-pot sill-seed"/g)||[]).length,3);
  assert.match(windowsill.markup(empty),/Посадить бесплатно/);
  empty.cost=600;
  empty.canPlant=false;
  assert.match(windowsill.markup(empty),/data-action="plant"[^>]+disabled/);
  const view=makeView(plants,null,'en');
  view.water=0;
  const html=windowsill.markup(view);
  assert.match(html,/Draw water/);
  assert.match(html,/14% moisture/);
  assert.match(html,/&lt;Мой цветок&gt;/);
  assert.doesNotMatch(html,/<Мой цветок>/);
  assert.match(windowsill.markup(makeView(plants,'pot-99','en')),/Soil is moist · 92% moisture/);
  assert.match(windowsill.markup(makeView(plants,'pot-99')),/data-action="sill-page" disabled aria-label="Следующая полка"/);
});

test('live scene invalidation includes water thresholds, stage and atmosphere; workshop scenery keeps its placements',()=>{
  const view=makeView(plants,'pot-43');
  const initial=windowsill.key(view);
  view.atmosphere.weather='rain';
  assert.notEqual(windowsill.key(view),initial);
  view.atmosphere.weather='clear';
  assert.equal(art.windowsillEnvironment(view.atmosphere),'');
  const changed=makeView(plants.map(p=>p.id==='pot-43'?{...p,growth:.1,moisture:98}:p),'pot-43');
  assert.notEqual(initial,windowsill.key(changed));
  const backdrop=art.windowsillEnvironment({...view.atmosphere,scene:'balcony',outside:'roofs',shelf:'high',weather:'snow'});
  assert.match(backdrop,/data-skyline="roofs"/);
  assert.match(backdrop,/data-snow-settled="rail"/);
  assert.match(backdrop,/class="sill-setting"/);
});
