import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,newGame,createBug,breed,advanceDay,validateSave,migrateSave,syncRealTime,setTimeOptions,prepareSpecimen,workSpecimen,storeSpecimen,startExpedition} from '../dist/engine.js';
import {marketValue,listAuction,syncAuctions,cancelAuction,marketPlan,auctionReserved,auctionNurseries,auctionCandidates,MINUTE} from '../dist/auctions.js';
import {createLine,lineStats} from '../dist/lines.js';
import {PARTS,PIN_POINT} from '../dist/specimens.js';
import {worldKeys,loadWorld,saveWorld} from '../dist/worlds.js';
const NOW=1800000000000;
const bug=(species='flat',sex='male',traits=[])=>createBug(species,sex,.7,1,'채집',null,1,null,{traits});
function stock(){const s=newGame(NOW),m=bug(),f=bug('flat','female');s.bugs.push(m,f);s.inventory.basic_mat=100;s.substrate=100;return {s,m,f};}
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function guaranteed(lot){for(let i=0;i<100;i++){lot.id=`known-good-${i}`;if(marketPlan(lot).length>=2)return lot;}throw new Error('No deterministic bidder fixture');}
function larvae(s,m,f){breed(s,m.id,f.id,()=>.5);for(let i=0;i<2;i++){for(const b of s.bugs){b.hunger=100;b.hygiene=100;}advanceDay(s);}return s.broods[0];}
function specimen(s,b){b.health=20;b.hunger=0;b.hygiene=0;for(let i=0;i<3;i++)advanceDay(s);const m=s.memorials.find(m=>m.id===b.id);prepareSpecimen(s,m.id);for(const [task,p] of [['water',{x:50,y:76}],['platform',{x:50,y:55}],['body',{x:50,y:45}],['lid',{x:50,y:25}]])workSpecimen(s,m.id,task,p);advanceDay(s);workSpecimen(s,m.id,'pin',PIN_POINT);workSpecimen(s,m.id,'height',null,{height:25});for(const p of PARTS){workSpecimen(s,m.id,'pose',p.target,{part:p.key});workSpecimen(s,m.id,'support',{x:p.target.x+(p.key[0]==='l'?-3:3),y:p.target.y+2},{part:p.key});}workSpecimen(s,m.id,'board',{x:50,y:91});for(let i=0;i<3;i++)advanceDay(s);for(const p of PARTS)workSpecimen(s,m.id,'remove-support',{x:91,y:91},{part:p.key});workSpecimen(s,m.id,'label',{x:50,y:91},{collector:'숲지기',caption:'옥션용 표본'});storeSpecimen(s,m.id,'case-1',2);return m;}
test('all species and both sexes value large and rare individuals above small basic stock',()=>{
 const traits={king:'king_white_eye',flat:'flat_long',rhino:'rhino_red',redleg:'redleg_crimson',dauria:'dauria_amber',twospot:'twospot_gold'};
 for(const species of Object.keys(SPECIES))for(const sex of ['male','female']){
  const small=bug(species,sex),large=bug(species,sex),rare=bug(species,sex,[traits[species]]);const range=sex==='male'?SPECIES[species].bredMale:SPECIES[species].bredFemale;small.length=range[0];large.length=range[1];rare.length=large.length;
  const a=marketValue('adult',small),b=marketValue('adult',large),c=marketValue('adult',rare);assert.ok(a.value<b.value&&b.value<c.value);assert.ok(a.demand<b.demand&&b.demand<=c.demand);assert.ok(a.value<40);
 }
});
test('large parental measurements and matching rare parents increase larval bundle value',()=>{
 const {s,m,f}=stock(),brood=larvae(s,m,f);const base=marketValue('larva',brood),large=structuredClone(brood);large.parents[0].length=82;large.parents[1].length=46;const premium=marketValue('larva',large);large.parents.forEach(p=>p.traits=['flat_long']);const rare=marketValue('larva',large);assert.ok(base.value<premium.value&&premium.value<rare.value);assert.ok(base.demand<premium.demand);assert.ok(rare.factors.some(f=>f.includes('유전')));
});
test('price and duration errors, unavailable assets and occupied fights leave ownership unchanged',()=>{
 const {s,m}=stock();for(const options of [{startPrice:0,durationMinutes:10},{startPrice:1.5,durationMinutes:10},{startPrice:1,durationMinutes:0},{startPrice:1,durationMinutes:10081},{startPrice:1,durationMinutes:1.2}]){const before=JSON.stringify(s);assert.throws(()=>listAuction(s,'adult',m.id,options,NOW));assert.equal(JSON.stringify(s),before);}
 const before=JSON.stringify(s);assert.throws(()=>listAuction(s,'adult','unknown',{startPrice:1,durationMinutes:10},NOW));assert.equal(JSON.stringify(s),before);s.fight={bugId:m.id,finished:false};assert.throws(()=>listAuction(s,'adult',m.id,{startPrice:1,durationMinutes:10},NOW));
});
test('listing adult moves it into custody; cancellation restores original traits, lineage and state',()=>{
 const {s,m,f}=stock(),line=createLine(s,m.id,f.id,'출품 라인'),before=structuredClone(m),a=listAuction(s,'adult',m.id,{startPrice:10,durationMinutes:10},NOW);
 assert.equal(s.bugs.length,1);assert.equal(auctionReserved(s),1);assert.equal(lineStats(s,line).members.find(b=>b.id===m.id).status,'경매 출품 중');assert.throws(()=>listAuction(s,'adult',m.id,{startPrice:10,durationMinutes:10},NOW));valid(s);cancelAuction(s,a.id,NOW);assert.deepEqual(s.bugs.find(b=>b.id===m.id),before);assert.equal(a.status,'cancelled');assert.equal(auctionReserved(s),0);valid(s);
});
test('polling and offline catch-up produce exactly the same bids, buyer and one payment',()=>{
 const {s,m}=stock();m.length=82;const lot=guaranteed(listAuction(s,'adult',m.id,{startPrice:1,durationMinutes:10},NOW)),offline=structuredClone(s),before=s.coins;
 for(let t=NOW;t<=lot.ends;t+=1000)syncAuctions(s,t);syncAuctions(offline,lot.ends+10*MINUTE);assert.deepEqual(s.auctions,offline.auctions);assert.equal(s.coins,offline.coins);assert.equal(lot.status,'sold');assert.ok(lot.bids.length>=2);assert.equal(s.coins,before+lot.current);const after=JSON.stringify(s);syncAuctions(s,lot.ends+1000000000);assert.equal(JSON.stringify(s),after);assert.ok(lot.bids.every((b,i)=>i===0||b.amount>lot.bids[i-1].amount));valid(s);
});
test('single bidder pays the starting price and bids never fall below the seller minimum',()=>{
 const {s,m}=stock();m.length=82;const lot=listAuction(s,'adult',m.id,{startPrice:100,durationMinutes:10},NOW);lot.id='first-price';const plan=marketPlan(lot),first=plan.find(e=>e.limit>=100);assert.ok(first);syncAuctions(s,first.at);assert.equal(lot.current,100);assert.equal(lot.bids.length,1);syncAuctions(s,lot.ends);assert.ok(lot.bids.every(b=>b.amount>=100));valid(s);
});
test('unaffordable starting prices yield no bids and return the exact adult automatically',()=>{
 const {s,m}=stock(),original=structuredClone(m),coins=s.coins,a=listAuction(s,'adult',m.id,{startPrice:1000000,durationMinutes:1},NOW);syncAuctions(s,a.ends);assert.equal(a.status,'unsold');assert.equal(s.coins,coins);assert.deepEqual(s.bugs.find(b=>b.id===m.id),original);valid(s);
});
test('small basic specimens often attract no interest and sell cheaply when they do',()=>{
 const small=bug();small.length=30;const large=bug('flat','male',['flat_long']);large.length=82;let empty=0,sums=0,premiumVisitors=0;
 for(let i=0;i<200;i++){const common={id:`small-${i}`,started:NOW,ends:NOW+10*MINUTE,market:marketValue('adult',small)},premium={...common,id:`premium-${i}`,market:marketValue('adult',large)};const p=marketPlan(common);empty+=p.length===0;sums+=p.length;premiumVisitors+=marketPlan(premium).length;assert.ok(p.every(e=>e.limit<20));}
 assert.ok(empty>100);assert.ok(premiumVisitors>sums*8);
});
test('bids cannot be rerolled by reload or cancellation after a live bid',()=>{
 const {s,m}=stock();m.length=82;const a=guaranteed(listAuction(s,'adult',m.id,{startPrice:1,durationMinutes:1},NOW)),plan=marketPlan(a);syncAuctions(s,plan[0].at);const before=JSON.stringify(s);assert.throws(()=>cancelAuction(s,a.id,plan[0].at),/입찰/);assert.equal(JSON.stringify(s),before);const saved=JSON.parse(before);assert.deepEqual(marketPlan(saved.auctions[0]),plan);valid(saved);
});
test('larvae must be in a larval instar; custody freezes their growth and reserves a nursery',()=>{
 const {s,m,f}=stock();breed(s,m.id,f.id,()=>.5);assert.equal(auctionCandidates(s,'larva').length,0);assert.throws(()=>listAuction(s,'larva',s.broods[0].id,{startPrice:1,durationMinutes:1},NOW));for(let i=0;i<2;i++)advanceDay(s);const original=structuredClone(s.broods[0]),lot=listAuction(s,'larva',original.id,{startPrice:1000000,durationMinutes:10},NOW);
 for(let i=0;i<3;i++)advanceDay(s);assert.equal(lot.asset.age,original.age);assert.equal(auctionNurseries(s),1);assert.equal(s.broods.length,0);valid(s);syncAuctions(s,lot.ends);assert.deepEqual(s.broods[0],original);assert.equal(auctionNurseries(s),0);valid(s);
});
test('sold larvae remain in the line pedigree and no longer emerge in the seller nursery',()=>{
 const {s,m,f}=stock(),line=createLine(s,m.id,f.id,'유충 판매');m.length=82;f.length=46;const b=larvae(s,m,f),a=guaranteed(listAuction(s,'larva',b.id,{startPrice:1,durationMinutes:1},NOW));syncAuctions(s,a.ends);assert.equal(a.status,'sold');assert.equal(s.broods.length,0);assert.equal(line.records[0].sale.heads,3);assert.equal(lineStats(s,line).offspring,3);assert.equal(lineStats(s,line).maxGeneration,1);for(let i=0;i<15;i++)advanceDay(s);assert.equal(s.bugs.filter(b=>b.source==='번식').length,0);valid(s);
});
test('custody cannot free adult or nursery capacity needed for guaranteed returns',()=>{
 const {s,m,f}=stock();while(s.bugs.length<48)s.bugs.push(bug());listAuction(s,'adult',m.id,{startPrice:100,durationMinutes:1},NOW);assert.throws(()=>startExpedition(s,'oak'),/수용량/);assert.throws(()=>breed(s,s.bugs.find(b=>b.sex==='male').id,f.id),/공간/);valid(s);
 const second=stock(),brood=larvae(second.s,second.m,second.f);listAuction(second.s,'larva',brood.id,{startPrice:1,durationMinutes:10},NOW);for(let i=0;i<2;i++){const m2=bug(),f2=bug('flat','female');second.s.bugs.push(m2,f2);breed(second.s,m2.id,f2.id,()=>.5);}const m3=bug(),f3=bug('flat','female');second.s.bugs.push(m3,f3);assert.throws(()=>breed(second.s,m3.id,f3.id),/번식통/);valid(second.s);
});
test('completed specimens retain the case and original sprite data until sold, without duplicate listing',()=>{
 const {s,m}=stock(),m2=specimen(s,m),a=listAuction(s,'specimen',m2.id,{startPrice:1000000,durationMinutes:1},NOW);assert.equal(s.memorials[0].slot,2);assert.throws(()=>listAuction(s,'specimen',m2.id,{startPrice:1,durationMinutes:1},NOW));syncAuctions(s,a.ends);assert.equal(a.status,'unsold');assert.equal(s.memorials[0].slot,2);const sale=listAuction(s,'specimen',m2.id,{startPrice:1,durationMinutes:1},a.ends);sale.asset.bug.length=82;sale.market=marketValue('specimen',sale.asset);guaranteed(sale);syncAuctions(s,sale.ends);assert.equal(sale.status,'sold');assert.equal(s.memorials.length,0);assert.equal(sale.asset.work.label.collector,'숲지기');valid(s);
});
test('auctions tick in virtual worlds without advancing days and restore across actual world load',()=>{
 const {s,m}=stock();m.length=82;const lot=guaranteed(listAuction(s,'adult',m.id,{startPrice:1,durationMinutes:1},NOW)),data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveWorld(store,'virtual',s,{view:'auction'});const loaded=loadWorld(store,'virtual',lot.ends+1);assert.equal(loaded.state.day,1);assert.equal(loaded.state.auctions[0].status,'sold');assert.equal(loaded.ui.view,'auction');assert.equal(loadWorld(store,'real',lot.ends).state.auctions.length,0);assert.ok(data.get(worldKeys('virtual').save));valid(loaded.state);
});
test('real-growth switches preserve active larval progress and accept historical auction snapshots',()=>{
 const {s,m,f}=stock(),b=larvae(s,m,f),lot=listAuction(s,'larva',b.id,{startPrice:1000000,durationMinutes:1},NOW);setTimeOptions(s,{realTime:true,realGrowth:true},NOW);assert.equal(lot.asset.growthMode,'natural');valid(s);syncRealTime(s,lot.ends);assert.equal(lot.status,'unsold');setTimeOptions(s,{realTime:true,realGrowth:false},lot.ends);assert.equal(s.broods[0].growthMode,'fast');assert.equal(lot.asset.growthMode,'natural');valid(s);
});
test('malformed auction snapshots, times, amounts, buyers and reserved duplicate ownership are rejected',()=>{
 const {s,m}=stock();m.length=82;const lot=guaranteed(listAuction(s,'adult',m.id,{startPrice:1,durationMinutes:1},NOW));syncAuctions(s,marketPlan(lot)[0].at);valid(s);
 const edits=[x=>x.auctions=null,x=>x.auctions[0].asset=null,x=>x.auctions[0].market=null,x=>x.auctions[0].kind='evil',x=>x.auctions[0].ends=x.auctions[0].started,x=>x.auctions[0].current=-1,x=>x.auctions[0].buyer=99,x=>x.auctions[0].bids[0].amount=100000000,x=>x.auctions[0].offers[0].limit=100000000,x=>x.bugs.push(x.auctions[0].asset),x=>x.auctions.push(structuredClone(x.auctions[0]))];
 for(const edit of edits){const broken=structuredClone(s);edit(broken);assert.equal(validateSave(broken),false);}
 const legacy=newGame(NOW);delete legacy.auctions;valid(legacy);migrateSave(legacy);assert.deepEqual(legacy.auctions,[]);
});
