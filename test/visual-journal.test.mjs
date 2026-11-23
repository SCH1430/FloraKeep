import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const modules=['game','art','knowledge','delights','visual-journal','garden-upgrades'];
const source=modules.map(name=>readFileSync(new URL(`../src/${name}.js`,import.meta.url),'utf8')).join('\n');
const load=(globals={})=>vm.runInNewContext(`${source}\n({game,art,delights,knowledge,visualJournal,gardenUpgrades})`,{AbortController,...globals});
const start=new Date(2026,10,15,12).getTime();
const hour=3600000;
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');

test('growth chart places typed care events on their specimen and marks a real observation gap',()=>{
  const {visualJournal}=load();
  const rows=[{at:start,growth:.2},{at:start+hour,growth:.23},{at:start+5*hour,growth:.34},{at:start+6*hour,growth:.44}];
  const events=[
    {at:start+hour,plantId:'p1',kind:'water',text:'Растение полито.',plantsWatered:1},
    {at:start+2*hour,plantId:'p1',kind:'spark',text:'Рост ускорен в 1.5 раза'},
    {at:start+2*hour,plantId:'p1',kind:'spark',text:'Новый лист'},
    {at:start+3*hour,plantId:'p2',kind:'water',text:'Растение полито.'},
    {at:start+3*hour,plantIds:['p1','p3'],kind:'water',text:'Полито растений: 2.',plantsWatered:2},
    {at:start+4*hour,plantId:'p1',kind:'water',text:'Вода из колодца'},
  ];
  const chart=visualJournal.growthChart(rows,events,'p1');
  assert.equal([...chart.matchAll(/data-visual-event="water"/g)].length,2);
  assert.equal([...chart.matchAll(/data-visual-event="fertilizer"/g)].length,1);
  assert.equal([...chart.matchAll(/data-visual-gap/g)].length,1);
  assert.equal([...chart.matchAll(/class="visual-chart-series"/g)].length,2);
  assert.match(chart,/Пауза от 3 ч/);
  assert.doesNotMatch(chart,/NaN|undefined/);
});

test('the weekly grid uses local calendar days and separates measurements from watering and planting',()=>{
  const {visualJournal}=load();
  const yesterday=start-24*hour;
  const events=[{at:yesterday,kind:'water',plantsWatered:3},{at:start,kind:'garden',plantsAdded:2},
    {at:start,kind:'water',plantsWatered:0,text:'Вода из колодца'},{at:start-7*24*hour,kind:'water',plantsWatered:2}];
  const history={p1:[{at:yesterday},{at:start}],p2:[{at:start}]};
  const days=visualJournal.weekData(events,history,start);
  assert.equal(days.length,7);
  assert.equal(days.at(-2).water,3);
  assert.equal(days.at(-2).observe,1);
  assert.equal(days.at(-1).water,0);
  assert.equal(days.at(-1).plant,2);
  assert.equal(days.at(-1).observe,2);
  const grid=visualJournal.weekGrid(events,history,start);
  assert.match(grid,/aria-current="date"/);
  assert.match(grid,/Полив/);
  assert.match(grid,/Посадка/);
  assert.match(grid,/Наблюдения/);
});

test('experiment graph uses direct endpoint labels and separates labels when results coincide',()=>{
  const {visualJournal}=load();
  const chart=visualJournal.experimentChart([{at:0,a:{moisture:80},b:{moisture:80}},{at:4,a:{moisture:50},b:{moisture:50}}]);
  assert.match(chart,/stroke-dasharray="6 4"/);
  const y=[...chart.matchAll(/<text x="\d+" y="([\d.]+)" class="visual-direct-label">Группа [АБ]<\/text>/g)].map(match=>Number(match[1]));
  assert.equal(y.length,2);
  assert.ok(Math.abs(y[1]-y[0])>=18);
});

test('lineage keeps sibling branches and terminates on corrupt cycles',()=>{
  const {visualJournal}=load();
  const all=[
    {id:'root',lineageId:'r'},
    {id:'left',lineageId:'l',parentLineageId:'r'},
    {id:'right',lineageId:'p',parentLineageId:'r'},
    {id:'child',lineageId:'c',parentLineageId:'l'},
  ];
  const {rows,missing}=visualJournal.lineageRows(all,'child');
  assert.equal(JSON.stringify(rows.map(row=>row.map(plant=>plant.id))),JSON.stringify([['root'],['left','right'],['child']]));
  assert.equal(missing,false);
  assert.equal(visualJournal.lineageRows([{id:'solo',parentLineageId:'absent'}],'solo').missing,true);
  const cycle=visualJournal.lineageRows([{id:'a',parentLineageId:'b'},{id:'b',parentLineageId:'a'}],'a');
  assert.equal(cycle.rows.flat().length,2);
});

test('the atlas opens a scientific folio and keeps the selected art view keyboard-operable',()=>{
  let listener,html,focused=false;
  const dialog={addEventListener(type,fn){assert.equal(type,'click');listener=fn;},
    querySelector(selector){return selector.includes('aria-pressed')?{focus(){focused=true;}}:null;}};
  const {game,art,knowledge,delights}=load({document:{querySelector:()=>dialog}});
  const atlas=delights.createDelightsFeature({
    game,art,knowledge,state:game.initialState(),
    extras:{delights:delights.defaultDelightsState(),appearance:{}},
    esc:escape,icon:()=>'',showDialog(title,markup){assert.equal(title,'Ботанический атлас');html=markup;},
  });
  atlas.open('atlas','daisy');
  assert.match(html,/atlas-folio/);
  assert.match(html,/aria-label="Научная этикетка"/);
  assert.match(html,/Matricaria chamomilla/);
  assert.match(html,/Asteraceae/);
  listener({target:{closest:()=>({dataset:{delightView:'macro'}})}});
  assert.match(html,/data-delight-view="macro" aria-pressed="true"/);
  assert.equal(focused,true);
});

test('botanical study uses external labels, and comparison use has a shared centre line',()=>{
  const {art,visualJournal}=load();
  const plate=art.studyArt('monstera');
  assert.match(plate,/class="study-callout"/);
  assert.match(plate,/Средняя жилка/);
  assert.match(plate,/aria-describedby=/);
  const leaf=art.studyArt('monstera','leaf',{comparison:true,labels:false});
  const fern=art.studyArt('fern','leaf',{comparison:true,labels:false});
  for(const artwork of [leaf,fern]){
    assert.match(artwork,/viewBox="0 0 520 340"/);
    assert.match(artwork,/study-comparison-axis" d="M260 49v254"/);
    assert.doesNotMatch(artwork,/study-callout/);
  }
  assert.match(visualJournal.plate(leaf,'Условная шкала листа'),/visual-scale-bar/);
});

test('botany controls open the redesigned labels, map, comparison and lineage from the real garden routes',()=>{
  const handlers=new Map(),dialogs=[];
  const {game,art,gardenUpgrades}=load({document:{addEventListener(type,fn){handlers.set(type,fn);}}});
  const first=game.plant(game.initialState(),'daisy',start).state;
  const root=first.plants[0];
  const propagated=game.propagate(first,root.id,start+6*hour).state;
  const child=propagated.plants[1];
  gardenUpgrades.create({
    state:propagated,
    extras:{gardenUpgrades:gardenUpgrades.normalize(null),appearance:{[root.id]:{name:'Первый росток'}}},
    art,esc:escape,showDialog(title,html){dialogs.push({title,html});},
    toast:error=>assert.fail(error),
  });
  const click=(action,id)=>handlers.get('click')({
    preventDefault(){},
    target:{closest:selector=>selector==='[data-garden-upgrade]'?{dataset:{gardenUpgrade:action,id}}:null},
  });
  click('flower');
  assert.match(dialogs.at(-1).html,/Условная шкала цветка/);
  click('flower-part','stamen');
  assert.match(dialogs.at(-1).html,/font-weight="700">Тычинки/);
  click('leaves');
  assert.equal([...dialogs.at(-1).html.matchAll(/study-comparison-axis/g)].length,2);
  click('range','cactus');
  assert.match(dialogs.at(-1).html,/Природный ареал/);
  click('lineage',child.id);
  assert.match(dialogs.at(-1).html,/Поколение 2/);
  assert.match(dialogs.at(-1).html,/Черенок от Первый росток/);
  assert.match(dialogs.at(-1).html,/<symbol id="lineage-portrait-0"/);
});
