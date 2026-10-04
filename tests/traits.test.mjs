import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,newGame,createBug,breed,advanceDay,validateSave,migrateSave} from '../dist/engine.js';
import {TRAITS,TRAIT_RATES,speciesTraits,rollTraits,inheritTraits,inheritanceChances,validTraits,traitLabel,stableTraitRandom} from '../dist/traits.js';
const values=(...list)=>()=>list.shift()??.99;
const bug=(sp,sex,traits=[])=>createBug(sp,sex,.7,1,'테스트',null,1,null,{traits});
const pair=(m,f)=>[{traits:m},{traits:f}];
test('every species has its own rare traits; king has curved jaws and no extreme thickness',()=>{
 for(const sp of Object.keys(SPECIES)){
  const pool=speciesTraits(sp);assert.ok(pool.length>=2);
  for(const sex of ['male','female'])for(const t of pool){const b=bug(sp,sex,[t.id]);assert.equal(validTraits(sp,b.traits),true);assert.ok(traitLabel(t.id,sex));}
 }
 assert.ok(TRAITS.king_curved);assert.equal(TRAITS.king_fat,undefined);
 assert.equal(traitLabel('flat_long','female'),'장치 혈통');
 assert.equal(traitLabel('rhino_red','female'),'레드기어');
});
test('natural traits appear at 3%, with no cross-species values',()=>{
 for(const sp of Object.keys(SPECIES)){
  assert.equal(rollTraits(sp,values(.029,0)).length,1);
  assert.deepEqual(rollTraits(sp,values(.03)),[]);
  const random=stableTraitRandom(sp),n=20000;let count=0;
  for(let i=0;i<n;i++){const traits=rollTraits(sp,random);assert.equal(validTraits(sp,traits),true);count+=traits.length;}
  assert.ok(count/n>.026&&count/n<.034,`${sp}: ${count/n}`);
 }
});
test('single-parent and matched-parent inheritance match the displayed exact odds',()=>{
 const single=pair(['flat_long'],[]),matched=pair(['flat_long'],['flat_long']);
 assert.deepEqual(inheritTraits('flat',single,values(.149)),['flat_long']);
 assert.deepEqual(inheritTraits('flat',single,values(.15)),[]);
 assert.deepEqual(inheritTraits('flat',matched,values(.749)),['flat_long']);
 assert.deepEqual(inheritTraits('flat',matched,values(.75)),[]);
 assert.equal(inheritanceChances('flat',single)[0].chance,TRAIT_RATES.single);
 assert.equal(inheritanceChances('flat',matched)[0].chance,TRAIT_RATES.matched);
 for(const [parents,target] of [[single,.15],[matched,.75]]){
  const random=stableTraitRandom(String(target)),n=30000;let count=0;
  for(let i=0;i<n;i++)count+=inheritTraits('flat',parents,random).includes('flat_long');
  assert.ok(Math.abs(count/n-target)<.01,`${count/n} vs ${target}`);
 }
});
test('conflicting jaw and eye traits cannot occur together; different parents each contribute 15%',()=>{
 const parents=pair(['flat_long'],['flat_short']);
 assert.deepEqual(inheritTraits('flat',parents,values(.1)),['flat_long']);
 assert.deepEqual(inheritTraits('flat',parents,values(.2)),['flat_short']);
 assert.deepEqual(inheritTraits('flat',parents,values(.3)),[]);
 for(let i=0;i<1000;i++){const child=inheritTraits('flat',parents,stableTraitRandom(String(i)));assert.ok(child.length<=1);}
 assert.equal(validTraits('king',['king_red_eye','king_white_eye']),false);
 assert.equal(validTraits('flat',['flat_long','flat_short']),false);
});
test('two independent trait groups can be inherited on males and females',()=>{
 const traits=['rhino_red','rhino_white_eye'],parents=pair(traits,traits);
 for(const sex of ['male','female']){
  const inherited=inheritTraits('rhino',parents,values(.1,.1));assert.deepEqual(inherited,traits);
  assert.deepEqual(bug('rhino',sex,inherited).traits,traits);
 }
});
test('brood traits are fixed at laying, copied from parents, and survive saving and emergence',()=>{
 const state=newGame(),m=bug('flat','male',['flat_long']),f=bug('flat','female',['flat_long']);state.bugs.push(m,f);
 const brood=breed(state,m.id,f.id,values(.1,.5,.9,.5,.1,.5,.1,.1,.1));
 assert.deepEqual(brood.children.map(c=>c.sex),['male','female','male']);
 assert.ok(brood.children.every(c=>c.traits[0]==='flat_long'));
 m.traits.length=0;assert.deepEqual(brood.parents[0].traits,['flat_long']);
 const restored=JSON.parse(JSON.stringify(state));assert.equal(validateSave(restored),true);
 migrateSave(restored);const planned=structuredClone(restored.broods[0].children);
 for(let i=0;i<15;i++)advanceDay(restored);
 assert.deepEqual(restored.bugs.filter(b=>b.source==='번식').map(b=>({sex:b.sex,traits:b.traits})),planned.map(c=>({sex:c.sex,traits:c.traits})));
 assert.equal(validateSave(restored),true);
});
test('legacy trait assignment is stable across reloads, and pending broods migrate once',()=>{
 const state=newGame(),m=bug('king','male'),f=bug('king','female');state.bugs.push(m,f);breed(state,m.id,f.id,()=>.5);
 delete m.traits;delete f.traits;state.broods[0].parents.forEach(p=>delete p.traits);state.broods[0].children.forEach(c=>delete c.traits);
 const a=JSON.parse(JSON.stringify(state)),b=JSON.parse(JSON.stringify(state));assert.equal(validateSave(a),true);
 migrateSave(a);migrateSave(b);assert.deepEqual(a,b);
 const assigned=JSON.stringify(a);migrateSave(a);assert.equal(JSON.stringify(a),assigned);
 assert.equal(validateSave(a),true);
});
test('malformed, cross-species and conflicting saved traits are rejected everywhere',()=>{
 const original=newGame(),m=bug('flat','male',['flat_long']),f=bug('flat','female',[]);original.bugs.push(m,f);breed(original,m.id,f.id,()=>.5);
 for(const path of [s=>s.bugs[0],s=>s.broods[0].parents[0],s=>s.broods[0].children[0]])for(const traits of [['unknown'],['rhino_red'],['flat_long','flat_long'],['flat_long','flat_short'],null,{}]){
  const state=structuredClone(original);path(state).traits=traits;assert.equal(validateSave(state),false);
 }
 assert.throws(()=>bug('flat','female',['rhino_red']),/맞지 않는/);
});
test('traits remain on archived individuals after death',()=>{
 const s=newGame(),b=bug('rhino','female',['rhino_red']);b.health=0;b.hunger=0;b.hygiene=0;s.bugs.push(b);
 for(let i=0;i<3;i++)advanceDay(s);
 assert.deepEqual(s.memorials[0].bug.traits,['rhino_red']);assert.equal(validateSave(s),true);
});
