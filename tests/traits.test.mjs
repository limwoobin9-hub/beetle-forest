import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,newGame,createBug,breed,advanceDay,validateSave,migrateSave} from '../dist/engine.js';
import {TRAITS,TRAIT_RATES,speciesTraits,rollTraits,inheritTraits,inheritanceChances,validTraits,traitLabel,stableTraitRandom,naturalTraitRate,traitRateText,traitRarity,traitPremium} from '../dist/traits.js';
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
test('each natural trait has its own absolute probability, including the basic remainder',()=>{
 for(const sp of Object.keys(SPECIES)){
  const pool=speciesTraits(sp);let lower=0;
  for(const t of pool){assert.ok(t.spawnRate>0&&t.spawnRate<=.02);assert.deepEqual(rollTraits(sp,values(lower+t.spawnRate/2)),[t.id]);lower+=t.spawnRate;}
  assert.ok(naturalTraitRate(sp)<.03);assert.deepEqual(rollTraits(sp,values(lower+1e-12)),[]);
 }
 assert.equal(traitRateText(TRAITS.king_pink_eye.spawnRate),'0.02%');
 assert.equal(traitRateText(naturalTraitRate('flat')),'2.8%');
 assert.deepEqual(rollTraits('unknown',values(0)),[]);
});
test('seeded populations match each per-trait rate without species leakage',()=>{
 for(const sp of Object.keys(SPECIES)){
  const pool=speciesTraits(sp),counts=Object.fromEntries(pool.map(t=>[t.id,0])),random=stableTraitRandom(`rarity:${sp}`),n=250000;
  for(let i=0;i<n;i++){const traits=rollTraits(sp,random);assert.ok(traits.length<=1);if(traits.length){assert.ok(Object.hasOwn(counts,traits[0]));counts[traits[0]]++;}}
  for(const t of pool){const expected=n*t.spawnRate,tolerance=5.5*Math.sqrt(n*t.spawnRate*(1-t.spawnRate))+2;assert.ok(Math.abs(counts[t.id]-expected)<tolerance,`${t.id}: ${counts[t.id]} vs ${expected}`);assert.ok(counts[t.id]>0);}
 }
});
test('rarer traits carry stronger premiums and the same natural rates apply to males and females',()=>{
 const ordered=Object.keys(TRAITS).sort((a,b)=>TRAITS[b].spawnRate-TRAITS[a].spawnRate);
 for(let i=1;i<ordered.length;i++)assert.ok(traitPremium(ordered[i])>=traitPremium(ordered[i-1]));
 assert.equal(traitRarity('flat_long').name,'희소');assert.equal(traitRarity('king_white_eye').name,'매우 희귀');assert.equal(traitRarity('king_pink_eye').name,'극희귀');
 for(const sp of Object.keys(SPECIES)){let offset=0;for(const t of speciesTraits(sp)){for(const sex of ['male','female'])assert.deepEqual(createBug(sp,sex,.7,1,'채집',null,1,null,{random:values(offset+t.spawnRate/2)}).traits,[t.id]);offset+=t.spawnRate;}}
});
test('new mutations use absolute trait rates without renormalizing the unoccupied groups',()=>{
 const parents=pair(['rhino_red'],[]);
 assert.deepEqual(inheritTraits('rhino',parents,values(.99,.0005)),['rhino_white_eye']);
 assert.deepEqual(inheritTraits('rhino',parents,values(.99,.00125)),['rhino_red_eye']);
 assert.deepEqual(inheritTraits('rhino',parents,values(.99,.0015+1e-12)),[]);
 assert.deepEqual(inheritTraits('rhino',parents,values(.1,.0005)),['rhino_red','rhino_white_eye']);
 const random=stableTraitRandom('filtered-mutations'),n=250000;let white=0,red=0,body=0;
 for(let i=0;i<n;i++){const traits=inheritTraits('rhino',parents,random);white+=traits.includes('rhino_white_eye');red+=traits.includes('rhino_red_eye');body+=traits.includes('rhino_red');assert.ok(validTraits('rhino',traits));}
 assert.ok(Math.abs(white/n-.001)<.0004);assert.ok(Math.abs(red/n-.0005)<.0003);assert.ok(Math.abs(body/n-.15)<.01);
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
 const now=state.clock.anchorAt;migrateSave(a,now);migrateSave(b,now);assert.deepEqual(a,b);
 const assigned=JSON.stringify(a);migrateSave(a,now);assert.equal(JSON.stringify(a),assigned);
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
