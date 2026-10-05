import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,LOCATIONS,speciesLocations} from '../dist/world.js';
import {newGame,createBug,startExpedition,inspectSpot,approachInsect,finishCapture,placeTrap,checkTrap,breed,advanceDay,careBrood,broodStage,migrateSave,validateSave} from '../dist/engine.js';
import {PRODUCTS,compatibleFood} from '../dist/catalog.js';
import {stableTraitRandom,speciesTraits} from '../dist/traits.js';
import {createLine} from '../dist/lines.js';
import {listAuction,syncAuctions,marketValue,MINUTE} from '../dist/auctions.js';
const NOW=1800000000000;
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
test('all nine species are reachable, and collection and every trap respect the selected habitat',()=>{
 assert.equal(Object.values(SPECIES).filter(sp=>!sp.foreign).length,9);assert.equal(Object.keys(LOCATIONS).length,12);
 const seen=new Set(),random=stableTraitRandom('habitat-restrictions');
 for(const [id,l] of Object.entries(LOCATIONS)){
  assert.ok(Math.abs(Object.values(l.chances).reduce((a,b)=>a+b,0)-1)<1e-10);
  const local=new Set();
  for(let i=0;i<260;i++){
   const s=newGame(NOW);startExpedition(s,id,random);const e=inspectSpot(s,s.expedition.spots.findIndex(p=>p.rich),random);
   assert.ok(Object.hasOwn(l.chances,e.bug.species),`${id}: ${e.bug.species}`);local.add(e.bug.species);seen.add(e.bug.species);
   approachInsect(s,'slow');assert.equal(finishCapture(s,1).bug.id,e.bug.id);assert.equal(s.bugs[0].source,l.name);assert.ok(s.discoveries.includes(s.bugs[0].species));valid(s);
  }
  assert.deepEqual([...local].sort(),Object.keys(l.chances).sort());
  for(const item of ['sap_trap','fruit_trap','light_trap'])for(let i=0;i<45;i++){
   const s=newGame(NOW);s.inventory[item]=1;const trap=placeTrap(s,id,item);advanceDay(s);const e=checkTrap(s,trap.id,random);if(e)assert.ok(Object.hasOwn(l.chances,e.bug.species));valid(s);
  }
 }
 assert.deepEqual([...seen].sort(),Object.keys(SPECIES).filter(sp=>!SPECIES[sp].foreign).sort());
 assert.deepEqual(speciesLocations('twospot').map(([id])=>id),['island']);
 assert.ok(speciesLocations('dauria').every(([,l])=>l.region==='highland'));
});
test('new grounds give saw, little, and stag their own productive collection routes',()=>{
 const random=stableTraitRandom('targeted-habitats');
 for(const [id,sp] of [['riverside','saw'],['coppice','little'],['ridge','stag']]){
  let target=0;
  for(let i=0;i<700;i++){const s=newGame(NOW);startExpedition(s,id,random);const e=inspectSpot(s,s.expedition.spots.findIndex(p=>p.rich),random);target+=e.bug.species===sp;}
  assert.ok(target>350,`${sp}: ${target}/700`);
 }
});
test('new species breed inherited traits in a named line, and larval auction returns preserve fixed offspring',()=>{
 for(const sp of ['saw','little','stag']){
  const s=newGame(NOW),trait=speciesTraits(sp)[0].id;
  const parents=['male','female'].map(sex=>createBug(sp,sex,.8,1,'채집',null,1,null,{traits:[trait]}));s.bugs.push(...parents);s.inventory.stag_mat=40;
  const line=createLine(s,parents[0].id,parents[1].id,`${SPECIES[sp].name} 라인`),b=breed(s,parents[0].id,parents[1].id,()=>.1,'stag_mat');
  const planned=structuredClone(b.children);assert.ok(planned.every(c=>c.traits.includes(trait)));
  for(let i=0;i<2;i++)advanceDay(s);assert.equal(broodStage(b),'1령');
  const p=marketValue('larva',b);assert.ok(Number.isFinite(p.value)&&p.value>0);assert.ok(p.factors.some(x=>x.includes('75%')));
  const lot=listAuction(s,'larva',b.id,{startPrice:1000000,durationMinutes:1},NOW);const saved=JSON.parse(JSON.stringify(s));migrateSave(saved,NOW);syncAuctions(saved,NOW+MINUTE);
  assert.equal(saved.auctions[0].status,'unsold');assert.deepEqual(saved.broods[0].children,planned);assert.equal(saved.broods[0].lineage.lineId,line.id);
  for(let i=2;i<15;i++){
   for(const p of saved.bugs){p.hunger=100;p.hygiene=100;}
   if(['1령','2령','3령'].includes(broodStage(saved.broods[0]))&&saved.broods[0].food<100)careBrood(saved,b.id,'stag_mat');advanceDay(saved);
  }
  const children=saved.bugs.filter(p=>p.parents);assert.equal(children.length,3);assert.deepEqual(children.map(c=>c.traits),planned.map(c=>c.traits));assert.ok(children.every(c=>c.lineage.lineId===line.id&&c.lineage.generation===1));
  for(const c of children)assert.ok(Number.isFinite(marketValue('adult',c).value));valid(saved);
 }
});
test('new species use appropriate substrate and existing saves retain every owned insect and auction',()=>{
 for(const sp of ['saw','little','stag'])assert.equal(compatibleFood(PRODUCTS.stag_mat,sp),true);
 assert.equal(compatibleFood(PRODUCTS.hiratake_1400,'little'),true);assert.equal(compatibleFood(PRODUCTS.hiratake_1400,'saw'),false);assert.equal(compatibleFood(PRODUCTS.hiratake_1400,'stag'),false);
 const s=newGame(NOW),b=createBug('flat','female',.6,1,'참나무 숲',null,1,null,{traits:['flat_short']});s.bugs.push(b);s.discoveries=['flat'];s.records['flat-female']=b.length;
 const lot=listAuction(s,'adult',b.id,{startPrice:12,durationMinutes:60},NOW);startExpedition(s,'deep',()=>.6);const before=structuredClone(s);migrateSave(s,NOW);
 assert.deepEqual(s.auctions[0],before.auctions[0]);assert.deepEqual(s.expedition,before.expedition);assert.deepEqual(s.records,before.records);assert.equal(s.auctions[0].asset.id,b.id);valid(s);
});

