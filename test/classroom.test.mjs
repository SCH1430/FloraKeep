import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const start = Date.UTC(2025, 0, 1);
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

async function setup() {
  let time = start;
  class Clock extends Date { static now() { return time; } }
  const storage = new Map();
  const options = {
    crypto: webcrypto, TextEncoder, TextDecoder, atob, btoa, Blob, Date: Clock,
    localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
  };
  const files = ['exchange', 'classroom-upgrades'];
  const source = await Promise.all(files.map(name => readFile(new URL(`../src/${name}.js`, import.meta.url), 'utf8')));
  const modules = vm.runInNewContext(`${source.join('\n')}\n({exchange,classroomUpgrades})`, options);
  return {...modules, advance: () => { time += 3600000; }};
}

const plant = (id, name, growth=.4) => ({id, name, speciesId:'daisy', growth, moisture:73, health:98, plantedAt:start, lastUpdated:start});

test('shared garden records authors and comments while preserving legacy document compatibility', async () => {
  const {exchange}=await setup();
  const original=exchange.createClassroom('Проект класса','Учитель');
  const {history,comments,...legacy}=original;
  assert.equal(exchange.validateClassroom(legacy).history.length,0);
  const planted=exchange.addClassroomPlants(legacy,[plant('daisy-1','Ромашка')],'Лена','Выбрала цвет для композиции');
  const noted=exchange.setContributionNote(planted,'daisy-1','Оставила цвет для светлой композиции','Ира');
  const discussed=exchange.addClassroomComment(noted,'daisy-1','Сравнила с подсолнечником','Лена');
  assert.equal(discussed.plants[0].contributor,'Лена');
  assert.equal(discussed.history[1].author,'Ира');
  assert.equal(discussed.comments[0].text,'Сравнила с подсолнечником');
  const removed=exchange.removeClassroomPlants(discussed,['daisy-1'],'Глеб');
  assert.equal(removed.plants.length,0);
  assert.equal(removed.removed[0].key,'daisy-1');
  assert.equal(removed.history.at(-1).author,'Глеб');
});

test('preview distinguishes additions, modifications and removals and resolves both versions', async () => {
  const {exchange,advance}=await setup();
  const room=exchange.createClassroom('Класс','Учитель');
  const base=exchange.addClassroomPlants(room,[plant('a','Лист'),plant('b','Цветок')],'Аня');
  advance();
  const local=exchange.addClassroomPlants(base,[plant('a','Лист',.44)],'Аня');
  advance();
  let remote=exchange.addClassroomPlants(base,[plant('a','Лист',.65),plant('c','Росток')],'Борис');
  remote=exchange.removeClassroomPlants(remote,['b'],'Борис');
  const {changes}=exchange.classroomDiff(local,remote);
  assert.deepEqual(Array.from(changes,row=>[row.key,row.kind,row.conflict]),[['a','update',true],['b','remove',true],['c','add',false]]);
  const merged=exchange.mergeClassrooms(local,remote,{a:'current',b:'incoming'},'Вера').room;
  assert.equal(merged.plants.find(entry=>entry.key==='a').plant.growth,.44);
  assert.equal(merged.plants.some(entry=>entry.key==='b'),false);
  assert.equal(merged.history.filter(event=>event.kind==='resolve').length,2);
  assert.equal(exchange.mergeClassrooms(merged,remote).room.plants.find(entry=>entry.key==='a').plant.growth,.44);
});

test('incremental encrypted exchange filters content since a full copy and retains discussion', async () => {
  const {exchange,advance}=await setup();
  const room=exchange.createClassroom('Выставка','Ведущий');
  const baseline=exchange.addClassroomPlants(room,[plant('a','Архив'),plant('b','Росток')],'Лена');
  advance();
  let updated=exchange.addClassroomPlants(baseline,[plant('c','Новинка')],'Глеб');
  updated=exchange.addClassroomComment(updated,'b','Интересное строение','Лена');
  updated=exchange.removeClassroomPlants(updated,['a'],'Глеб');
  const delta=exchange.classroomDelta(updated,baseline.updatedAt);
  assert.deepEqual(Array.from(delta.plants,entry=>entry.key),['c']);
  assert.deepEqual(Array.from(delta.removed,entry=>entry.key),['a']);
  assert.equal(delta.comments.length,1);
  const password='a classroom test password';
  const encoded=await exchange.encodeClassroom(delta,password);
  assert.equal(encoded.version,2);
  const decoded=await exchange.decodeClassroom(JSON.stringify(encoded),password);
  assert.equal(decoded.deltaSince,baseline.updatedAt);
  assert.throws(()=>exchange.mergeClassrooms(room,decoded),/полный общий файл/);
  const merged=exchange.mergeClassrooms(baseline,decoded).room;
  assert.deepEqual(Array.from(merged.plants,entry=>entry.key),['b','c']);
  assert.equal(merged.comments[0].text,'Интересное строение');
});

test('exhibit previews the selected plants and omits unchecked author and notes in HTML', async () => {
  const {exchange,classroomUpgrades}=await setup();
  const initial=exchange.createClassroom('Выставка','Ведущий');
  const room=exchange.addClassroomPlants(initial,[plant('a','Ромашка <яркая>'),plant('b','Скрытое растение')],'Скрытый автор','Скрытая заметка');
  const dialogs=[],files=[];
  const controller=classroomUpgrades.create({
    api:{esc:escape,exchange,storageKey:'garden',game:{CATALOG:[{id:'daisy',name:'Ромашка'}]},download:(blob,name)=>files.push({blob,name})},
    open:(title,html)=>dialogs.push({title,html}),getRoom:()=>room,saveRoom:()=>{},showRoom:()=>{},
  });
  controller.handle('room-plus-poster');
  assert.match(dialogs.at(-1).html,/Скрытое растение/);
  const form=new FormData();
  form.append('entry','a');
  form.append('mode','poster');
  form.append('title','Листья класса');
  await controller.submit('room-plus-prepare-exhibit',form);
  assert.match(dialogs.at(-1).html,/Ромашка &lt;яркая&gt;/);
  assert.doesNotMatch(dialogs.at(-1).html,/Скрытый|Скрытая|Скрытое/);
  controller.handle('room-plus-exhibit-download');
  assert.equal(files[0].name,'flora-classroom-poster.html');
  const html=await files[0].blob.text();
  assert.match(html,/Листья класса/);
  assert.match(html,/@media print/);
  assert.match(html,/Ромашка &lt;яркая&gt;/);
  assert.doesNotMatch(html,/<script|Скрытый|Скрытая|Скрытое/);
});

test('organizer catalog exports plants under both team names with individual authors', async () => {
  const {exchange,classroomUpgrades}=await setup();
  const first=exchange.addClassroomPlants(exchange.createClassroom('Команда утро','Нина'),[plant('a','Капля')],'Иван');
  const second=exchange.addClassroomPlants(exchange.createClassroom('Команда вечер','Анна'),[plant('b','Сумерки')],'Мария');
  const password='classroom catalog password';
  const payload=await exchange.encodeClassroom(second,password);
  assert.equal(payload.version,1);
  const form=new FormData();
  form.append('file',new Blob([JSON.stringify(payload)],{type:'application/json'}),'team.json');
  form.append('password',password);
  const files=[];
  const controller=classroomUpgrades.create({
    api:{esc:escape,exchange,game:{CATALOG:[]},download:(blob,name)=>files.push({blob,name})},
    open:()=>{},getRoom:()=>first,saveRoom:()=>{},showRoom:()=>{},
  });
  await controller.submit('room-plus-team-add',form);
  controller.handle('room-plus-team-export');
  const result=await files[0].blob.text();
  assert.match(result,/Команда утро[\s\S]*Капля[\s\S]*Иван/);
  assert.match(result,/Команда вечер[\s\S]*Сумерки[\s\S]*Мария/);
});
