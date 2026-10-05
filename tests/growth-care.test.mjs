import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,breed,broodStage,care,careBrood,advanceDay,syncRealTime,setTimeOptions,migrateSave,validateSave} from '../dist/engine.js';
import {GROWTH_PROFILES,LEGACY_NATURAL_DURATIONS,rollGrowthPlan,validGrowthPlan,broodDurations,broodGrowthDays,stageIndex,DAY_MS,midnightAt} from '../dist/time.js';
import {adultBeddingInterval,jellyInterval,larvalFoodInterval,needsCare,careRemainingDays} from '../dist/care-timing.js';
import {SPECIES} from '../dist/world.js';
import {PRODUCTS,compatibleFood} from '../dist/catalog.js';
import {listAuction,cancelAuction} from '../dist/auctions.js';
import {loadWorld,saveWorld,worldKeys} from '../dist/worlds.js';

const NOW=midnightAt(1800000000000);
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function stock(species='king',realTime=false,realGrowth=realTime){
 const s=newGame(NOW),m=createBug(species,'male',.6,1),f=createBug(species,'female',.6,1);
 s.bugs.push(m,f);s.inventory.basic_mat=100;setTimeOptions(s,{realTime,realGrowth},NOW);
 const medium=['tarandus','regius'].includes(species)?'kawara_spawn':'basic_mat';s.inventory[medium]=100;const b=breed(s,m.id,f.id,()=>.25,medium);return {s,m,f,b};
}
function progress(b){const durations=broodDurations(b),i=stageIndex(b.age,durations);return [i,(b.age-durations.slice(0,i).reduce((a,v)=>a+v,0))/durations[i]];}

test('nine species have variable saved natural schedules with bounded totals and positive stages',()=>{
 for(const [sp,p] of Object.entries(GROWTH_PROFILES)){
  const totals=new Set();
  for(let i=0;i<=100;i++){const plan=rollGrowthPlan(sp,()=>i/100);assert.equal(validGrowthPlan(sp,plan),true);totals.add(plan.natural.reduce((a,v)=>a+v,0));}
  assert.ok(totals.size>60);assert.equal(Math.min(...totals),p.min);assert.equal(Math.max(...totals),p.max);
  const {s,b}=stock(sp,true);const original=structuredClone(b.growthPlan);const restored=JSON.parse(JSON.stringify(s));
  migrateSave(restored,NOW);syncRealTime(restored,NOW);assert.deepEqual(restored.broods[0].growthPlan,original);valid(restored);
 }
});
test('every legacy species and instar migrates once, preserving stage progress, care, parents and offspring',()=>{
 for(const sp of Object.keys(GROWTH_PROFILES))for(let i=0;i<5;i++){
  const {s,b}=stock(sp,true);delete b.growthPlan;const old=LEGACY_NATURAL_DURATIONS[sp];
  b.age=old.slice(0,i).reduce((a,v)=>a+v,0)+old[i]*.43;b.food=37;b.qualitySum=2;b.qualityDays=3;
  const before=structuredClone(s),a=structuredClone(s),c=structuredClone(s);valid(a);migrateSave(a,NOW);migrateSave(c,NOW);
  assert.equal(broodStage(a.broods[0]),broodStage(b));assert.ok(Math.abs(progress(a.broods[0])[1]-.43)<1e-9);
  assert.deepEqual(a.broods[0],c.broods[0]);
  const stable=structuredClone(a.broods[0]);migrateSave(a,NOW);assert.deepEqual(a.broods[0],stable);
  for(const key of ['food','qualitySum','qualityDays','parents','children','medium'])assert.deepEqual(a.broods[0][key],before.broods[0][key]);
  for(const key of ['bugs','coins','inventory','records','day'])assert.deepEqual(a[key],before[key]);valid(a);
 }
});
test('mode switches keep the same natural plan and fraction in all five development stages',()=>{
 for(let i=0;i<5;i++){
  const {s,b}=stock('stag'),durations=broodDurations(b);b.age=durations.slice(0,i).reduce((a,v)=>a+v,0)+durations[i]*.7;
  const plan=structuredClone(b.growthPlan),age=b.age;
  for(let n=0;n<3;n++){setTimeOptions(s,{realTime:true,realGrowth:true},NOW);assert.deepEqual(b.growthPlan,plan);assert.ok(Math.abs(progress(b)[1]-.7)<1e-9);setTimeOptions(s,{realTime:false,realGrowth:false},NOW);assert.ok(Math.abs(b.age-age)<1e-9);}
  valid(s);
 }
});
test('legacy larval auction custody migrates without changing historical lots, prices or future bids',()=>{
 const {s,b}=stock('flat',true);delete b.growthPlan;b.age=25+25+20;
 const lot=listAuction(s,'larva',b.id,{startPrice:1000000,durationMinutes:10},NOW),market=structuredClone(lot.market);
 const before=progress(lot.asset);migrateSave(s,NOW);assert.deepEqual(lot.market,market);assert.ok(Math.abs(progress(lot.asset)[1]-before[1])<1e-9);valid(s);
 cancelAuction(s,lot.id,NOW);const history=structuredClone(lot);delete lot.asset.growthPlan;const oldHistory=structuredClone(lot);
 migrateSave(s,NOW);assert.deepEqual(lot,oldHistory);assert.equal(lot.market.value,history.market.value);valid(s);
});
test('existing growing insects survive world restore and offline growth happens once on the new plan',()=>{
 const {s,b}=stock('little',true);delete b.growthPlan;b.age=25+25+40+185*.5;
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 storage.setItem(worldKeys('real').save,JSON.stringify(s));const loaded=loadWorld(storage,'real',NOW),p=structuredClone(loaded.state.broods[0].growthPlan),age=loaded.state.broods[0].age;
 saveWorld(storage,'real',loaded.state,{});const after=loadWorld(storage,'real',NOW+2*DAY_MS).state;
 assert.deepEqual(after.broods[0].growthPlan,p);assert.ok(Math.abs(after.broods[0].age-age-2)<1e-9);saveWorld(storage,'real',after,{});
 assert.equal(loadWorld(storage,'real',NOW+2*DAY_MS).state.broods[0].age,after.broods[0].age);valid(after);
});
test('corrupted randomized schedules are rejected without mutating valid or legacy saves',()=>{
 const {s,b}=stock('king',true),original=structuredClone(s);valid(s);assert.deepEqual(s,original);
 for(const plan of [null,{version:2,natural:[16,24,30,131,29]},{version:1,natural:[16,24,0,131,29]},{version:1,natural:[16,24,30,Infinity,29]},{version:1,natural:[16,24,30,131]},{version:1,natural:[1,1,1,1,1]}]){const copy=structuredClone(s);copy.broods[0].growthPlan=plan;assert.equal(validateSave(copy),false);}
 b.age=broodGrowthDays(b);assert.equal(validateSave(s),false);
});
test('real rhino jelly reaches replacement in one day, while small and large stags take three and two',()=>{
 for(const species of Object.keys(GROWTH_PROFILES))for(const sex of ['male','female']){
  const s=newGame(NOW),b=createBug(species,sex,.6,1);s.bugs.push(b);setTimeOptions(s,{realTime:true,realGrowth:false},NOW);care(s,b.id,'jelly','banana');const period=jellyInterval(b);
  assert.equal(period,(species==='rhino'||SPECIES[species].family==='rhino')?1:b.length>=50?2:3);
  for(let day=1;day<=period;day++){syncRealTime(s,NOW+day*DAY_MS);assert.equal(needsCare(b.hunger),day===period);assert.equal(careRemainingDays(b.hunger,period),period-day);}
  assert.ok(b.health>20);assert.equal(s.memorials.length,0);valid(s);
 }
});
test('premium jelly in real time cannot postpone hygienic replacement for rhinos or stags',()=>{
 for(const species of ['rhino','king'])for(const id of Object.keys(PRODUCTS).filter(id=>PRODUCTS[id].kind==='jelly')){
  const s=newGame(NOW),b=createBug(species,'male',.8,1);s.bugs.push(b);s.inventory[id]=2;setTimeOptions(s,{realTime:true,realGrowth:false},NOW);care(s,b.id,'jelly',id);
  syncRealTime(s,NOW+jellyInterval(b)*DAY_MS);assert.equal(needsCare(b.hunger),true);assert.equal(s.inventory[id],1);valid(s);
 }
});
test('fresh adult bedding lasts seven to fourteen virtual days and fourteen to twenty-eight real days',()=>{
 for(const realTime of [false,true])for(const species of Object.keys(GROWTH_PROFILES))for(const item of ['basic_mat','coconut']){
  const s=newGame(NOW),b=createBug(species,'male',.6,1);s.bugs.push(b);s.inventory[item]=100;s.inventory.banana=100;setTimeOptions(s,{realTime,realGrowth:false},NOW);care(s,b.id,'clean',item);const period=adultBeddingInterval(b,realTime);
  assert.ok(period>=(realTime?14:7)&&period<=(realTime?28:14));
  for(let d=1;d<=period;d++){if(needsCare(b.hunger))care(s,b.id,'jelly','banana');if(realTime)syncRealTime(s,NOW+d*DAY_MS);else advanceDay(s);assert.equal(needsCare(b.hygiene),d===period);}
  assert.ok(b.health>20);valid(s);
 }
});
test('real larval mats and fungus reach replacement after sixty to ninety feeding days independently of growth speed',()=>{
 for(const species of Object.keys(GROWTH_PROFILES))for(const item of Object.keys(PRODUCTS).filter(id=>compatibleFood(PRODUCTS[id],species))){
  const {s,b}=stock(species,true);b.age=broodDurations(b).slice(0,3).reduce((a,v)=>a+v,0);s.inventory[item]=2;
  if(item.endsWith('_800'))b.age=broodDurations(b)[0];
  b.food=99;careBrood(s,b.id,item);const period=larvalFoodInterval(b,true);assert.ok(period>=60&&period<=90);
  for(let d=1;d<=period;d++){syncRealTime(s,NOW+d*DAY_MS);assert.equal(needsCare(b.food),d===period);}
  assert.equal(s.inventory[item],1);assert.ok(b.qualityDays<=15);valid(s);
 }
 const {s,b}=stock('king',true,false);b.age=2;const before=b.food;syncRealTime(s,NOW+DAY_MS);assert.ok(Math.abs(before-b.food-60/90)<1e-9);valid(s);
});
test('virtual larval mat never needs replacement before seven feeding days and eggs/pupae do not consume it',()=>{
 for(const species of Object.keys(GROWTH_PROFILES)){
  const {s,b}=stock(species);advanceDay(s);advanceDay(s);assert.equal(b.food,100);
  for(let day=1;day<=6;day++){advanceDay(s);assert.equal(needsCare(b.food),false);}
  const remaining=larvalFoodInterval(b,false);assert.ok(remaining>=7&&remaining<=14);
  b.age=12;const food=b.food;advanceDay(s);assert.equal(b.food,food);valid(s);
 }
});
test('existing adult condition and current larval food are preserved, then decay under the new intervals',()=>{
 const {s,m,b}=stock('rhino',true);m.hunger=60;m.hygiene=35;m.dietDays=3;m.dietDecay=10;m.beddingDays=2;m.beddingDecay=12;b.food=45;b.age=broodDurations(b)[0];
 const before=structuredClone(s);migrateSave(s,NOW);assert.deepEqual(s.bugs,before.bugs);assert.equal(b.food,45);
 syncRealTime(s,NOW+DAY_MS);assert.equal(m.hunger,0);assert.ok(Math.abs(m.hygiene-(35-60/14))<1e-9);assert.equal(b.food,44);valid(s);
});
