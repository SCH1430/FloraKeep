import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const script = readFileSync(new URL('../src/localization.js',import.meta.url),'utf8');

function load(saved=null) {
  const storage = new Map(saved?[['flora-keep-language',saved]]:[]);
  const sandbox = vm.createContext({localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}});
  return {locale:vm.runInContext(`${script}\nfloraLocale`,sandbox),storage};
}

test('language preference persists and message keys interpolate values without modifying them',()=>{
  const {locale,storage}=load('en');
  assert.equal(locale.get(),'en');
  assert.equal(locale.t('garden'),'My garden');
  assert.equal(locale.t('selectedGarden',{name:'Мой сад'}),'Open garden: Мой сад');
  assert.equal(locale.t('toString'),'toString');
  assert.equal(locale.set('es'),false);
  assert.equal(locale.set('ru'),true);
  assert.equal(locale.t('garden'),'Мой сад');
  assert.equal(storage.get('flora-keep-language'),'ru');
});

test('controlled interface labels translate in place and restore Russian without altering user text',()=>{
  const {locale}=load('en');
  const symbol = {nodeType:1};
  const shellText = {nodeType:3,nodeValue:' Настройки сада '};
  const userText = {nodeType:3,nodeValue:'Мой сад'};
  const filter={childNodes:[symbol,shellText]};
  const values = new Map([['aria-label','Открытый сад: Мой сад']]);
  const control={getAttribute:key=>values.get(key),setAttribute:(key,value)=>values.set(key,value)};
  const page={documentElement:{lang:'ru',dataset:{page:'garden'}}};
  const root={ownerDocument:page,querySelectorAll:selector=>selector.includes('.sidebar .brand small')?[filter]:selector.includes('.sidebar-toggle')?[control]:[]};
  locale.apply(root);
  assert.equal(shellText.nodeValue,' Garden settings ');
  assert.equal(values.get('aria-label'),'Open garden: Мой сад');
  assert.equal(userText.nodeValue,'Мой сад');
  assert.equal(filter.childNodes[0],symbol);
  page.documentElement.lang='en';
  locale.set('ru');
  locale.apply(root);
  assert.equal(shellText.nodeValue,' Настройки сада ');
  assert.equal(values.get('aria-label'),'Открытый сад: Мой сад');
});
