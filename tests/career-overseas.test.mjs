import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,care,buy,breed,advanceDay,validateSave,migrateSave,prepareSpecimen,workSpecimen,storeSpecimen,makeOpponent,advanceFight,startExpedition,inspectSpot} from '../dist/engine.js';
import {SPECIES,sizeRange} from '../dist/world.js';
import {PRODUCTS,equipmentEffects,compatibleFood,syncSupplies} from '../dist/catalog.js';
import {QUALIFICATIONS,qualificationStatus,earnQualification,recordCare,canSellLive,leagueClass,recordLeagueFight,claimLeagueReward,syncLeague,collectorOrders,orderCandidates,deliverOrder,claimAlbum} from '../dist/career.js';
import {OVERSEAS_REGIONS,HOUR,startForeignTrip,syncForeignTrip,surveyForeignTrip,processForeignCatch,returnForeignTrip,claimForeignReturn,processOwnedForeign,claimRegion} from '../dist/overseas.js';
import {auctionCandidates,listAuction,marketValue,syncAuctions,MINUTE} from '../dist/auctions.js';
import {PARTS,PIN_POINT} from '../dist/specimens.js';
import {createLine} from '../dist/lines.js';
import {stableTraitRandom,speciesTraits} from '../dist/traits.js';
import {worldKeys,loadWorld,saveWorld} from '../dist/worlds.js';
import {exchangeInsects} from '../dist/world-exchange.js';
const NOW=1800000000000;
const bug=(sp='flat',sex='male',genetic=.6)=>createBug(sp,sex,genetic,1,'기존 채집',null,1,null,{traits:[]});
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function travel(region='sumatra',qualified=false){const s=newGame(NOW);s.coins=10000;if(qualified)s.career.qualifications.push('overseas_live');const t=startForeignTrip(s,region,NOW);syncForeignTrip(s,t.waitUntil);surveyForeignTrip(s,createBug,t.waitUntil);return {s,t};}
function mount(s,m){prepareSpecimen(s,m.id);for(const [task,p] of [['water',{x:50,y:76}],['platform',{x:50,y:55}],['body',{x:50,y:45}],['lid',{x:50,y:25}]])workSpecimen(s,m.id,task,p);advanceDay(s);workSpecimen(s,m.id,'pin',PIN_POINT);workSpecimen(s,m.id,'height',null,{height:25});for(const p of PARTS){workSpecimen(s,m.id,'pose',p.target,{part:p.key});workSpecimen(s,m.id,'support',{x:p.target.x+(p.key[0]==='l'?-3:3),y:p.target.y+2},{part:p.key});}workSpecimen(s,m.id,'board',{x:50,y:91});for(let i=0;i<3;i++)advanceDay(s);for(const p of PARTS)workSpecimen(s,m.id,'remove-support',{x:91,y:91},{part:p.key});workSpecimen(s,m.id,'label',{x:50,y:91},{collector:'원정 숲지기',caption:'해외 탐사 표본'});storeSpecimen(s,m.id,'case-1',0);}
test('all twenty-eight destinations need only money, including zero EXP and a completely full room',()=>{
 assert.equal(Object.keys(OVERSEAS_REGIONS).length,28);assert.equal(Object.keys(SPECIES).length,37);
 const reachable=new Set();
 for(const [id,r] of Object.entries(OVERSEAS_REGIONS)){
  assert.equal(Object.values(r.chances).reduce((a,b)=>a+b,0),1);Object.keys(r.chances).forEach(sp=>{assert.ok(SPECIES[sp].foreign);reachable.add(sp);});
  const s=newGame(NOW);s.energy=0;s.coins=r.cost;s.bugs=Array.from({length:48},()=>bug());const t=startForeignTrip(s,id,NOW);assert.equal(s.coins,0);assert.equal(s.xp,0);assert.equal(s.energy,0);assert.equal(t.phase,'field');assert.equal(t.waitUntil,NOW);assert.equal(s.career.qualifications.length,0);valid(s);
  const poor=newGame(NOW);poor.coins=r.cost-1;const before=structuredClone(poor);assert.throws(()=>startForeignTrip(poor,id,NOW),/여행비/);assert.deepEqual(poor,before);
 }
 assert.deepEqual([...reachable].sort(),Object.keys(SPECIES).filter(sp=>SPECIES[sp].foreign).sort());
});
test('a trip survives reload, proceeds immediately, cannot reroll findings, and never consumes domestic energy',()=>{
 const {s,t}=travel(),stored=JSON.parse(JSON.stringify(s)),snapshot=structuredClone(t.catches);assert.equal(s.energy,5);assert.throws(()=>surveyForeignTrip(s,createBug,t.waitUntil-1),/시각/);assert.deepEqual(t.catches,snapshot);valid(s);
 syncForeignTrip(stored,t.waitUntil);const next=surveyForeignTrip(stored,createBug,t.waitUntil);syncForeignTrip(s,t.waitUntil);const same=surveyForeignTrip(s,createBug,t.waitUntil);assert.deepEqual([next.species,next.sex,next.length,next.traits],[same.species,same.sex,same.length,same.traits]);valid(stored);
 assert.throws(()=>startForeignTrip(s,'japan',NOW),/진행 중/);
});
test('unqualified visitors must process every live catch before bringing back specimen material',()=>{
 const {s,t}=travel();const id=t.catches[0].bug.id;
 assert.throws(()=>returnForeignTrip(s,t.waitUntil),/생체 취급 자격/);assert.equal(t.phase,'field');processForeignCatch(s,id);assert.equal(t.catches[0].handling,'specimen');assert.throws(()=>processForeignCatch(s,id),/생체/);
 returnForeignTrip(s,t.waitUntil);assert.throws(()=>claimForeignReturn(s,t.waitUntil-1),/도착/);const r=claimForeignReturn(s,t.waitUntil);assert.deepEqual(r,{region:'sumatra',live:0,specimens:1});assert.equal(s.bugs.length,0);assert.equal(s.memorials[0].id,id);assert.equal(s.memorials[0].origin,'foreign');assert.equal(s.memorials[0].status,'stored');assert.ok(s.discoveries.includes(s.memorials[0].bug.species));valid(s);assert.throws(()=>claimForeignReturn(s,t.waitUntil),/도착/);
 mount(s,s.memorials[0]);assert.equal(auctionCandidates(s,'specimen').length,1);const lot=listAuction(s,'specimen',id,{startPrice:1000000,durationMinutes:1},NOW+HOUR*10);valid(s);syncAuctions(s,lot.ends);assert.equal(s.memorials.length,1);valid(s);
});
test('qualified visitors may bring back a mixture, with capacity rechecked at departure and arrival',()=>{
 const {s,t}=travel('amazon',true);syncForeignTrip(s,t.waitUntil);surveyForeignTrip(s,createBug,t.waitUntil);syncForeignTrip(s,t.waitUntil);surveyForeignTrip(s,createBug,t.waitUntil);assert.equal(t.surveys,3);processForeignCatch(s,t.catches[0].bug.id);
 s.bugs=Array.from({length:47},()=>bug());assert.throws(()=>returnForeignTrip(s,t.waitUntil),/공간/);s.bugs.pop();returnForeignTrip(s,t.waitUntil);valid(s);
 s.bugs.push(bug());assert.throws(()=>claimForeignReturn(s,t.waitUntil),/공간/);s.bugs.pop();const r=claimForeignReturn(s,t.waitUntil);assert.equal(r.live,2);assert.equal(r.specimens,1);assert.equal(s.bugs.length,48);assert.ok(s.bugs.slice(-2).every(b=>b.born===s.day&&b.criticalDays===0));valid(s);
});
test('previous wealth, raised insects, specimens and existing auctions retain their records on migration',()=>{
 const s=newGame(NOW);delete s.career;delete s.foreignTrip;s.day=10;s.coins=10000;s.bugs=Array.from({length:12},()=>bug());const ids=s.bugs.map(b=>b.id);migrateSave(s,NOW);assert.equal(s.career.reared,12);assert.deepEqual(s.bugs.map(b=>b.id),ids);assert.equal(s.coins,10000);migrateSave(s,NOW);assert.equal(s.career.reared,12);valid(s);
});
test('qualification requires three separate days of care, sufficient EXP and the full fee',()=>{
 const s=newGame(NOW);s.coins=10000;s.xp=1500;s.inventory.banana=100;s.bugs=Array.from({length:12},()=>bug());
 for(let d=1;d<=3;d++){s.day=d;for(const b of s.bugs){b.hunger=0;care(s,b.id,'jelly','banana');recordCare(s,b);recordCare(s,b);}assert.equal(s.career.reared,d===3?12:0);}
 assert.ok(qualificationStatus(s,'overseas_live').eligible);earnQualification(s,'overseas_live');assert.equal(s.coins,4000);assert.ok(canSellLive(s,'hercules'));assert.equal(canSellLive(s,'twospot'),false);assert.throws(()=>earnQualification(s,'overseas_live'),/이미/);valid(s);
 const t=newGame(NOW);t.coins=1e6;assert.throws(()=>earnQualification(t,'protected_sale'),/사육 실적/);t.xp=1e6;assert.throws(()=>earnQualification(t,'protected_sale'),/사육 실적/);valid(t);
});
test('ordinary live insects remain sellable while foreign and protected adult and larval lots need their own qualifications',()=>{
 for(const sp of ['flat','twospot','hercules']){
  const s=newGame(NOW),m=bug(sp),f=bug(sp,'female');s.bugs.push(m,f);s.inventory.basic_mat=10;const b=breed(s,m.id,f.id,()=>.6);advanceDay(s);advanceDay(s);
  const restricted=sp!=='flat';if(restricted){assert.equal(auctionCandidates(s,'adult').length,0);assert.equal(auctionCandidates(s,'larva').length,0);assert.throws(()=>listAuction(s,'adult',m.id,{startPrice:10,durationMinutes:1},NOW),/자격/);assert.throws(()=>listAuction(s,'larva',b.id,{startPrice:10,durationMinutes:1},NOW),/자격/);s.career.qualifications.push(sp==='twospot'?'protected_sale':'overseas_live');}
  assert.equal(auctionCandidates(s,'adult').length,2);assert.equal(auctionCandidates(s,'larva').length,1);listAuction(s,'larva',b.id,{startPrice:10,durationMinutes:1},NOW);valid(s);
 }
});
test('every foreign species can be reared and appraised, and Mesotopus uses its distinct food',()=>{
 for(const sp of Object.keys(SPECIES).filter(sp=>SPECIES[sp].foreign)){
  const s=newGame(NOW),m=bug(sp),f=bug(sp,'female');s.bugs.push(m,f);const medium=['tarandus','regius'].includes(sp)?'kawara_spawn':'basic_mat';s.inventory[medium]=100;const b=breed(s,m.id,f.id,()=>.6,medium);assert.ok(b.growthPlan.natural.every(n=>n>0));assert.ok(Number.isFinite(marketValue('adult',m).value));assert.equal(speciesTraits(sp).length,2);valid(s);
 }
 for(const sp of ['tarandus','regius']){assert.equal(compatibleFood(PRODUCTS.basic_mat,sp),false);assert.equal(compatibleFood(PRODUCTS.kawara_spawn,sp),true);assert.equal(compatibleFood(PRODUCTS.kawara_1400,sp),true);}
});
test('permanent species equipment changes its advertised care behaviour and cannot be bought twice',()=>{
 const s=newGame(NOW);s.coins=10000;const b=bug('rhino');s.bugs.push(b);buy(s,'deep_bedding');const before=s.coins;assert.throws(()=>buy(s,'deep_bedding'),/이미/);assert.equal(s.coins,before);assert.equal(equipmentEffects(s,'rhino').beddingDecay,.8);assert.equal(equipmentEffects(s,'flat').beddingDecay,1);const hygiene=b.hygiene;advanceDay(s);assert.ok(Math.abs(hygiene-b.hygiene-60/7*.8)<1e-9);
 buy(s,'temperature_cabinet');assert.equal(equipmentEffects(s,'antaeus').foodInterval,1.2);assert.equal(equipmentEffects(s,'rainbow').foodInterval,1);valid(s);
});
test('weight-class opponents stay in the selected class, including small males and giant overseas adults',()=>{
 for(const [sp,g] of [['golden',.5],['flat',.6],['sumatra_flat',.6],['hercules',.85]]){
  const s=newGame(NOW),b=bug(sp,'male',g);s.bugs.push(b);const f=makeOpponent(s,b.id,stableTraitRandom(sp));assert.equal(leagueClass(f.rival),leagueClass(b));while(!f.finished)advanceFight(s,()=>.5);const score=s.career.league.classes[leagueClass(b)];assert.equal(score.played,1);assert.equal(score.points,f.won?3:1);valid(s);
 }
});
test('league rewards are once per milestone, reset after seven game days, and preserve past results',()=>{
 const s=newGame(NOW),b=bug('little');s.bugs.push(b);for(let i=0;i<5;i++)recordLeagueFight(s,b,true);const start=s.coins;claimLeagueReward(s,'light',6);claimLeagueReward(s,'light',15);assert.equal(s.coins,start+440);assert.throws(()=>claimLeagueReward(s,'light',15),/아직/);s.day=8;syncLeague(s);assert.deepEqual(s.career.league.classes,{});assert.equal(s.career.league.history[0].classes.light.points,15);valid(s);
});
test('small-insect orders pay once, preserve lineage and discoveries, and replace targets next week',()=>{
 const s=newGame(NOW),m=bug('little','male',.2),f=bug('little','female');s.bugs.push(m,f);s.discoveries=['little'];const line=createLine(s,m.id,f.id,'작은 숲'),o=collectorOrders(s)[0];assert.ok(orderCandidates(s,o).some(b=>b.id===m.id));const before=s.coins;deliverOrder(s,o.id,m.id);assert.equal(s.coins,before+110);assert.equal(s.bugs.length,1);assert.deepEqual(s.discoveries,['little']);assert.equal(line.founders[0].sale.amount,110);assert.throws(()=>deliverOrder(s,o.id,m.id),/조건/);valid(s);s.day=8;syncLeague(s);assert.notEqual(collectorOrders(s)[0].id,o.id);valid(s);
});
test('owned foreign adults can be intentionally converted to specimens without changing other insects',()=>{
 const s=newGame(NOW),foreign=bug('rainbow'),domestic=bug();s.bugs.push(foreign,domestic);assert.throws(()=>processOwnedForeign(s,domestic.id),/해외종/);const m=processOwnedForeign(s,foreign.id);assert.equal(m.id,foreign.id);assert.deepEqual(s.bugs,[domestic]);valid(s);
});
test('cross-world exchange requires live-import qualification in the forest receiving a foreign insect',()=>{
 const states={real:newGame(NOW),virtual:newGame(NOW)};states.real.settings.realTime=true;
 const foreign=bug('rainbow'),native=bug();states.real.bugs.push(foreign);states.virtual.bugs.push(native);
 const before=structuredClone(states);assert.throws(()=>exchangeInsects(states,foreign.id,native.id,NOW),/받는 숲/);assert.deepEqual(states,before);
 states.virtual.career.qualifications.push('overseas_live');const next=exchangeInsects(states,foreign.id,native.id,NOW);assert.equal(next.virtual.bugs[0].id,foreign.id);valid(next.real);valid(next.virtual);
});
test('collection and regional completion rewards require the full collection and cannot be claimed twice',()=>{
 const s=newGame(NOW);assert.throws(()=>claimAlbum(s,'foreign'),/먼저/);s.discoveries=Object.keys(SPECIES).filter(sp=>SPECIES[sp].foreign);claimAlbum(s,'foreign');assert.equal(s.coins,6350);assert.throws(()=>claimAlbum(s,'foreign'),/먼저/);s.career.regions.japan={visits:1,species:['japan_stag','japan_saw'],claimed:false};claimRegion(s,'japan');assert.equal(s.coins,6950);assert.throws(()=>claimRegion(s,'japan'),/모든/);valid(s);
});
test('large-object searching raises the distribution without changing habitat species or taking fees on failed starts',()=>{
 const totals={standard:0,large:0};for(const focus of Object.keys(totals)){const random=stableTraitRandom('same-wild-size');for(let i=0;i<500;i++){const s=newGame(NOW);startExpedition(s,'oak',random,{focus});const e=inspectSpot(s,s.expedition.spots.findIndex(p=>p.rich),random);totals[focus]+=e.bug.genetic;assert.ok(['flat','saw','rhino','little'].includes(e.bug.species));assert.equal(s.coins,focus==='large'?310:350);}}
 assert.ok(totals.large>totals.standard+50);const s=newGame(NOW);s.energy=1;const before=structuredClone(s);assert.throws(()=>startExpedition(s,'oak',()=>.5,{focus:'large'}),/탐험/);assert.deepEqual(s,before);
});
test('invalid progression and foreign saves are rejected instead of silently erasing owned records',()=>{
 const {s}=travel();for(const change of [x=>x.career.reared++,x=>x.career.qualifications.push('made_up'),x=>x.foreignTrip.catches[0].bug.species='flat',x=>x.foreignTrip.catches[0].handling='mounted',x=>x.foreignTrip.surveys=9,x=>x.foreignTrip.catches.push(structuredClone(x.foreignTrip.catches[0]))]){const t=structuredClone(s);change(t);assert.equal(validateSave(t),false);}
 valid(s);
});
