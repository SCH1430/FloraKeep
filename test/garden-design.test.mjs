import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

async function designRuntime(options={}) {
  const code=await Promise.all(['visual-journal','garden-design'].map(file=>readFile(new URL('../src/'+file+'.js',import.meta.url),'utf8')));
  return vm.runInNewContext(code.join('\n')+'\ngardenDesign',options);
}

test('the workshop still life uses the actual collection and favours different species',async()=>{
  const design=await designRuntime();
  const plants=[
    {id:'rose-1',speciesId:'rose',growth:.4,moisture:75},
    {id:'daisy-1',speciesId:'daisy',growth:.1,moisture:70},
    {id:'daisy-2',speciesId:'daisy',growth:.5,moisture:74},
    {id:'fern-1',speciesId:'fern',growth:.8,moisture:45},
  ];
  const picked=design.pickStillLife(plants);
  assert.deepEqual(Array.from(picked,plant=>plant.id),['rose-1','daisy-2','fern-1']);
});

test('next-care art selects the earliest watering and chooses the driest among simultaneous plants',async()=>{
  const design=await designRuntime();
  const now=1_800_000_000_000;
  const plants=[{id:'later',moisture:80},{id:'second',moisture:45},{id:'first',moisture:20}];
  const forecasts={later:now+3600000,second:now,first:now};
  const game={forecast:(_state,id)=>({nextWaterAt:forecasts[id]})};
  const result=design.nextCare(game,{plants},now);
  assert.equal(result.plant.id,'first');
  assert.equal(result.label,'Сейчас');
  assert.equal(design.nextCare({forecast:()=>({nextWaterAt:null})},{plants},now).label,'После отпуска');
  assert.equal(design.nextCare(game,{plants:[]},now),null);
});

test('the card chart uses the last 24 hours and includes both single and group watering',async()=>{
  const design=await designRuntime();
  const now=1_800_000_000_000, hour=3600000;
  const rows=[{at:now-25*hour,moisture:10},{at:now-12*hour,moisture:40},{at:now-hour,moisture:88}];
  const journal=[
    {at:now-10*hour,kind:'water',plantId:'this',plantsWatered:1},
    {at:now-2*hour,kind:'water',plantId:null,plantIds:['that','this'],plantsWatered:2},
    {at:now-hour,kind:'water',plantIds:['other'],plantsWatered:1},
    {at:now-hour,kind:'water',plantId:'this',plantsWatered:0,text:'Набрали воду в колодце'},
  ];
  const series=design.moistureSeries(rows,journal,'this',now);
  assert.equal(series.points.length,2);
  assert.equal(series.watered.length,2);
  assert.ok(series.points[0][0]<series.watered[0][0]);
  assert.match(design.moistureChart(rows,journal,'this',now),/отметок полива: 2/);
});

test('compact meters and growth symbols expose text and display actual data',async()=>{
  const design=await designRuntime();
  assert.match(design.compactReadings({moisture:57.7,growth:.23}),/--reading:58%/);
  assert.match(design.growthRibbon(.4),/aria-label="Стадия: Молодое растение"/);
  assert.equal((design.growthSymbols().match(/<symbol/g)||[]).length,4);
  assert.equal(design.filterRatio(2,3),67);
});
