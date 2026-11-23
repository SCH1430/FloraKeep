import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const modules=['game','art','visual-journal','chronicle','features','delights','localization'];
const scripts=modules.map(name=>readFileSync(new URL(`../src/${name}.js`,import.meta.url),'utf8')).join('\n');
const load=(globals={})=>vm.runInNewContext(scripts+'\n({game,art,featureModule,growthChronicle,delights,floraLocale})',{AbortController,...globals});
const specimen={id:'p1',lineageId:'same-pattern',speciesId:'daisy'};
const start=new Date(2026,10,10,9).getTime(), hour=3600000;
const sample=(hours,growth,moisture)=>({at:start+hours*hour,growth,moisture,health:null});

test('the photo timeline includes saved measurements and an explicit empty frame for a three-hour gap',()=>{
  const {growthChronicle,art}=load();
  const rows=[sample(0,.12,58),sample(1,.44,45),sample(4,.68,36)];
  const events=[
    {at:start,kind:'water',plantId:'p1',plantsWatered:1},
    {at:start+hour,kind:'water',plantId:'p2',plantsWatered:1},
    {at:start+hour,kind:'water',plantId:'p1',plantsWatered:0,text:'Вода из колодца'},
    {at:start+hour,kind:'spark',plantIds:['p1','p3'],text:'Подкормка'},
  ];
  const model=growthChronicle.prepare(specimen,rows,events);
  assert.deepEqual(Array.from(model.frames,frame=>frame.kind),['sample','sample','gap','sample']);
  assert.equal(model.frames[2].from,rows[1].at);
  assert.equal(model.frames[2].to,rows[2].at);
  const html=growthChronicle.markup(model,'Ромашка',art.plantArt);
  assert.match(html,/min="0" max="3"/);
  assert.match(html,/Кадр 3 \/ 3/);
  assert.match(html,/Уход в этот день · 2/);
  assert.doesNotMatch(html,/Здоровье|2027/);
  const photoIds=Array.from(html.matchAll(/\sid="([^"]+)"/g),match=>match[1]);
  assert.equal(new Set(photoIds).size,photoIds.length);
  const variants=new Set(Array.from(html.matchAll(/data-variant="([^"]+)"/g),match=>match[1]));
  assert.equal(variants.size,1);
  assert.match(html,/chronicle-mini is-gap/);
});

test('empty archives and a single imported observation open without inventing a current frame',()=>{
  const {growthChronicle,art,delights,game}=load({document:{querySelector:()=>null}});
  const history={p1:[]};
  const calls=[];
  const feature=delights.createDelightsFeature({game,art,state:{plants:[specimen]},extras:{history,appearance:{p1:{name:'<росток>'}}},
    showDialog:(title,html,route)=>calls.push({title,html,route}),toast:()=>{}});
  feature.open('book','p1');
  assert.equal(calls[0].route,'growth-book');
  assert.equal(calls[0].title,'Фотохроника роста');
  assert.match(calls[0].html,/chronicle-empty/);
  assert.doesNotMatch(calls[0].html,/data-chronicle-range/);
  history.p1.push(sample(0,1,21));
  feature.open('book','p1');
  const {html}=calls.at(-1);
  assert.match(html,/&lt;росток&gt;/);
  assert.match(html,/Кадр 1 \/ 1/);
  assert.match(html,/data-chronicle-range disabled/);
  assert.doesNotMatch(html,/Новые бутоны|Цветение|Отдых после цветения/);
  assert.doesNotThrow(()=>growthChronicle.connect(null,growthChronicle.prepare(specimen,[]),art.plantArt,null));
});

test('new mature plant observations store the observed flowering phase and hold a fixed specimen and pot in each image',()=>{
  const {featureModule,growthChronicle,art}=load();
  const plant={...specimen,growth:1,moisture:75,health:94,matureHours:2};
  const extras={history:{}};
  for(const [offset,matureHours] of [[0,2],[1,19],[2,35]]){
    plant.matureHours=matureHours;
    featureModule.recordHistory(extras,{plants:[plant]},start+offset*hour,true);
  }
  const rows=extras.history.p1;
  assert.deepEqual(Array.from(rows,row=>row.bloomPhase),['bloom','rest','bud']);
  assert.deepEqual(Array.from(rows,row=>featureModule.artworkGrowth(row,row.bloomPhase)),[1,.65,.85]);
  const calls=[];
  growthChronicle.markup(growthChronicle.prepare(plant,rows),'Ромашка',(species,options)=>{
    calls.push(options);
    return art.plantArt(species,options);
  });
  assert.equal(calls.length,4);
  assert.deepEqual(calls.map(options=>options.variant),Array(4).fill(plant.lineageId));
  assert.ok(calls.every(options=>options.shape==='classic'&&options.pot==='cream'&&options.light==='day'));
});

test('the English photo route translates headings, dates and accessible values and preserves nicknames',()=>{
  const {floraLocale,delights,game,art}=load({document:{querySelector:()=>null}});
  floraLocale.set('en');
  let result;
  const extras={history:{p1:[sample(0,.4,37)]},appearance:{p1:{name:'Родная ромашка'}}};
  const api={game,art,state:{plants:[specimen]},extras,showDialog(title,html){result={title,html};}};
  const feature=delights.createDelightsFeature(api);
  feature.open('book','p1');
  assert.equal(result.title,'Growth chronicle');
  assert.match(result.html,/Родная ромашка/);
  assert.match(result.html,/aria-valuetext="Frame 1 of 1, November/);
  assert.match(result.html,/Filmstrip thumbnails/);
  assert.doesNotMatch(result.html,/Просмотр кадра|Влага|Позже/);
  delete extras.appearance.p1;
  feature.open('book','p1');
  assert.match(result.html,/class="chronicle-name">Chamomile</);
});

test('film gestures, range, thumbnail, keyboard and paging select the same archival frames',()=>{
  const {growthChronicle,art}=load();
  const rows=[sample(0,.1,80),sample(1,.2,70),sample(4,.3,60),sample(5,.4,50),sample(6,.5,40)];
  const model=growthChronicle.prepare(specimen,rows);
  const doc={activeElement:null};
  class Node {
    constructor(){this.innerHTML='';this.events={};this.dataset={};this.attrs={};this.classList={toggle:()=>{}};}
    addEventListener(type,fn){this.events[type]=fn;}
    setAttribute(key,value){this.attrs[key]=value;}
    removeAttribute(key){delete this.attrs[key];}
    hasAttribute(attr){return attr==='data-chronicle-step'&&'chronicleStep' in this.dataset;}
    querySelector(){return null;}
    contains(){return false;}
    closest(){return this;}
    focus(){doc.activeElement=this;}
  }
  const root=new Node();
  root.ownerDocument=doc;
  const nodes=Object.fromEntries(['photo','range','image','strip','caption','status'].map(name=>[name,new Node()]));
  root.querySelector=selector=>nodes[selector.match(/chronicle-([\w-]+)/)[1]];
  const buttons=[new Node(),new Node()];
  buttons[0].dataset.chronicleStep='-1';buttons[1].dataset.chronicleStep='1';
  root.querySelectorAll=()=>buttons;
  growthChronicle.connect(root,model,art.plantArt,()=>null,new AbortController().signal);
  const key=key=>nodes.photo.events.keydown({key,preventDefault(){}});
  key('Home');
  assert.match(nodes.caption.innerHTML,/Кадр 1 \/ 5/);
  assert.equal(buttons[0].disabled,true);
  root.events.click({target:buttons[1]});
  assert.match(nodes.caption.innerHTML,/Кадр 2 \/ 5/);
  key('ArrowRight');
  assert.match(nodes.caption.innerHTML,/Нет кадров/);
  assert.doesNotMatch(nodes.image.innerHTML,/data-species/);
  const touch={isPrimary:true,button:0,pointerId:1,clientX:200,clientY:10};
  nodes.photo.events.pointerdown(touch);
  nodes.photo.events.pointerup({...touch,clientX:120,clientY:15});
  assert.match(nodes.caption.innerHTML,/Кадр 3 \/ 5/);
  nodes.range.value='5';nodes.range.events.input();
  assert.match(nodes.caption.innerHTML,/Кадр 5 \/ 5/);
  const thumb=new Node();thumb.dataset.chronicleIndex='4';root.events.click({target:thumb});
  assert.match(nodes.caption.innerHTML,/Кадр 4 \/ 5/);
  key('End');
  assert.equal(buttons[1].disabled,true);
});
