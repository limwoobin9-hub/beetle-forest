import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,breed,startExpedition,inspectSpot,approachInsect,finishCapture,validateSave,migrateSave} from '../dist/engine.js';
import {TRAITS,TRAIT_RATES,naturalTraitRate,speciesTraits,stableTraitRandom,traitPremium,traitRarity} from '../dist/traits.js';
import {startForeignTrip,surveyForeignTrip} from '../dist/overseas.js';
import {listAuction} from '../dist/auctions.js';
const NOW=1800000000000;
function closeToExpected(observed,expected,variance){assert.ok(Math.abs(observed-expected)<5.5*Math.sqrt(variance)+2,`${observed} vs expected ${expected}`);}

test('appearance increases by at least five times while every original rarity and premium remains intact',()=>{
 for(const [id,t] of Object.entries(TRAITS)){
  assert.ok(t.spawnRate>=t.rarityRate*5-1e-12);
  const oldPremium=Math.round((1.5+.9*Math.log2(.02/t.rarityRate))*100)/100;assert.equal(traitPremium(id),oldPremium);
  const oldLabel=t.rarityRate<=.0005?'극희귀':t.rarityRate<=.001?'매우 희귀':t.rarityRate<=.005?'희귀':'희소';assert.equal(traitRarity(id).name,oldLabel);
 }
 for(const sp of new Set(Object.values(TRAITS).map(t=>t.species))){const pool=speciesTraits(sp),factor=pool[0].spawnRate/pool[0].rarityRate;assert.ok(pool.every(t=>Math.abs(t.spawnRate/t.rarityRate-factor)<1e-12));assert.ok(naturalTraitRate(sp)>=.06-1e-12);}
 assert.deepEqual(TRAIT_RATES,{single:.30,matched:.75});
});

test('actual domestic capture and overseas survey routes use the increased rates',()=>{
 const random=stableTraitRandom('appearance-domestic'),n=2000;let domestic=0,expected=0,variance=0;
 for(let i=0;i<n;i++){
  const s=newGame(NOW);startExpedition(s,'oak',random);const encounter=inspectSpot(s,s.expedition.spots.findIndex(p=>p.rich),random);const p=naturalTraitRate(encounter.bug.species);expected+=p;variance+=p*(1-p);
  const traits=[...encounter.bug.traits];approachInsect(s,'fast');const result=finishCapture(s,1);assert.deepEqual(result.bug.traits,traits);domestic+=traits.length>0;
 }
 closeToExpected(domestic,expected,variance);assert.ok(domestic>n*.05);
 let overseas=0;
 for(let i=0;i<n;i++){
  const s=newGame(NOW);s.coins=2000;const trip=startForeignTrip(s,'sumatra',NOW);trip.id=`appearance-overseas-${i}`;
  for(let j=0;j<3;j++)overseas+=surveyForeignTrip(s,createBug,NOW).traits.length>0;
 }
 closeToExpected(overseas,n*3*.06,n*3*.06*.94);
});

test('new broods from basic parents mutate at the higher rates without changing saved insects, broods or auctions',()=>{
 const random=stableTraitRandom('appearance-basic-parents'),n=1500;let observed=0;
 for(let i=0;i<n;i++){
  const s=newGame(NOW),m=createBug('flat','male',.6,1,'채집',null,1,null,{traits:[]}),f=createBug('flat','female',.6,1,'채집',null,1,null,{traits:[]});s.bugs.push(m,f);
  const brood=breed(s,m.id,f.id,random);observed+=brood.children.filter(c=>c.traits.length).length;
 }
 closeToExpected(observed,n*3*.14,n*3*.14*.86);
 const s=newGame(NOW),m=createBug('flat','male',.6,1,'채집',null,1,null,{traits:['flat_toothless']}),f=createBug('flat','female',.6,1,'채집',null,1,null,{traits:[]});s.bugs.push(m,f);breed(s,m.id,f.id,()=>.9);const lot=listAuction(s,'adult',m.id,{startPrice:100,durationMinutes:60},NOW);
 const bugs=structuredClone(s.bugs),broods=structuredClone(s.broods),auction=structuredClone(lot);migrateSave(s,NOW);assert.deepEqual(s.bugs,bugs);assert.deepEqual(s.broods,broods);assert.deepEqual(s.auctions[0],auction);assert.equal(validateSave(s),true);
});
