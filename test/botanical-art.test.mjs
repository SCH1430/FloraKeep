import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const files=await Promise.all(['art','media'].map(name=>readFile(new URL(`../src/${name}.js`,import.meta.url),'utf8')));
const {art,media}=vm.runInNewContext(files.join('\n')+'\n({art,media})');

function referencesHaveIds(svg) {
 const ids=[...svg.matchAll(/\s+id="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(new Set(ids).size,ids.length,'all SVG IDs are unique');
 const refs=[...svg.matchAll(/(?:url\(#|href="#)([a-zA-Z0-9_.-]+)/g)];
 for(const [,id] of refs)assert.ok(ids.includes(id),`missing local SVG reference ${id}`);
}

test('pot and plant states distinguish moisture, shade, leaf surfaces and specimen identity',()=>{
 const dry=art.plantArt('daisy',{moisture:24,light:'dawn',material:'glaze'});
 const wet=art.plantArt('daisy',{moisture:84,light:'sunset'});
 assert.match(dry,/data-soil="dry"/);
 assert.match(dry,/data-droop="true"/);
 assert.match(dry,/data-light-direction="-1"/);
 assert.match(dry,/pot-window-reflection/);
 assert.match(wet,/data-soil="wet"/);
 assert.match(wet,/data-droop="false"/);
 assert.match(wet,/data-light-direction="1"/);
 assert.match(wet,/data-leaf-age="young"/);
 assert.doesNotMatch(art.plantArt('aloe',{moisture:12}),/data-droop="true"/);
 const leaves=id=>[...art.plantArt('monstera',{id,variant:id}).matchAll(/<ellipse cx="(-?[\d.]+)" cy="(-?[\d.]+)" rx="3" ry="[78]"/g)]
  .map(match=>match.slice(1,3));
 assert.deepEqual(leaves('parent'),leaves('parent'));
 assert.notDeepEqual(leaves('parent'),leaves('child'));
 referencesHaveIds(dry);
 referencesHaveIds(art.plantArt('monstera'));
});

test('five side views and specimen closeups render as distinct safe artwork',()=>{
 for(const species of ['daisy','tulip','rose','sunflower','orchid']){
  assert.ok(art.hasFlowerProfile(species));
  const profile=art.plantArt(species,{view:'profile'});
  assert.match(profile,/data-art-view="profile"/);
  assert.match(profile,/data-notebook-marks="true"/);
  referencesHaveIds(profile);
  assert.doesNotThrow(()=>media.postcardSVG({artwork:profile}));
 }
 assert.equal(art.hasFlowerProfile('cactus'),false);
 const macro=art.plantArt('orchid',{growth:.02,view:'macro'});
 assert.match(macro,/data-art-view="macro"/);
 assert.match(macro,/data-stage="mature"/);
 assert.match(macro,/viewBox="127 18 115 112"/);
 const paper=art.plantArt('daisy',{treatment:'cutout'});
 assert.match(paper,/data-art-treatment="cutout"/);
 assert.doesNotMatch(paper,/leaf-cast-shadow/);
});

test('garden scenes combine bounded exterior layers, light and weather',()=>{
 const window=new RegExp('data-outside="courtyard"');
 const rain=art.gardenArt({weather:'rain',season:'autumn',light:'dawn'});
 assert.match(rain,window);
 assert.match(rain,/data-autumn-plane="far"/);
 assert.match(rain,/data-autumn-plane="near"/);
 assert.match(rain,/scene-glass-rain/);
 assert.match(rain,/data-air="wind"/);
 assert.match(rain,/data-scene-depth="shelf"/);
 referencesHaveIds(rain);
 const balcony=art.gardenArt({scene:'balcony',weather:'snow'});
 assert.match(balcony,/data-outside="roofs"/);
 assert.match(balcony,/data-snow-settled="rail"/);
 assert.match(art.gardenArt({scene:'window',weather:'snow'}),/data-snow-settled="sill"/);
 assert.match(art.gardenArt({scene:'desk',light:'night',outside:'grove'}),/data-lamp-glow="true"/);
 const greenhouse=art.greenhouseArt([{id:'fern-1',speciesId:'fern',growth:.5},{id:'aloe-1',speciesId:'aloe',growth:1}]);
 assert.match(greenhouse,/data-greenhouse-walls="panoramic"/);
 assert.match(greenhouse,/viewBox="0 0 1020/);
 referencesHaveIds(greenhouse);
 assert.doesNotThrow(()=>media.postcardSVG({artwork:greenhouse}));
});

test('ceramic renderers retain a sculpted rim, one glaze color and distinct visual poses',()=>{
 const customPot={profile:[54,53,50,47,41],color:'#ba7864',finish:'glaze'};
 const potted=art.plantArt('daisy',{customPot,light:'dawn'});
 assert.match(potted,/ceramic-throwing-rings/);
 assert.match(potted,/pot-handmade-rim/);
 assert.match(potted,/data-contact-shadow="sculpted"/);
 assert.match(art.potTopView({customPot}),/data-pot-top="sculpted"/);
 const tiles=art.materialSamples(customPot.color);
 assert.equal([...tiles.matchAll(/fill="#ba7864"/g)].length,3);
 assert.match(art.brandMark(),/stroke="currentColor"/);
 assert.match(art.botanicalOrnament(),/class="flora-ornament"/);
 for(const kind of ['journal','herbarium','exhibit'])assert.ok(art.emptyState(kind).includes(`data-art-empty="${kind}"`));
 const poses=['waiting','hint','complete'].map(mood=>art.beeArt('',mood).replace(/fk-bee-\d+/g,'fk-bee').replace(/data-mood="[^"]*"/,''));
 assert.equal(new Set(poses).size,3);
});
