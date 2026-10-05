import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,care,careAll,careAllPlan,makeOpponent,migrateSave,validateSave,setTimeOptions} from '../dist/engine.js';
import {syncSupplies,PRODUCTS} from '../dist/catalog.js';
import {careSupplyItems} from '../dist/care-supplies.js';
import {loadWorld,saveWorld} from '../dist/worlds.js';

const NOW=1800000000000;
function adults(count=3){const s=newGame(NOW);for(let i=0;i<count;i++){const b=createBug(i%2?'rhino':'king',i%2?'female':'male',.5,1);Object.assign(b,{health:100,hunger:100,hygiene:100});s.bugs.push(b);}return s;}
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function unchanged(s,fn,pattern){const before=structuredClone(s);assert.throws(fn,pattern);assert.deepEqual(s,before);}

test('bulk care replaces every adult even when all are fresh, and leaves identity and larval supplies intact',()=>{
 const s=adults(),ids=s.bugs.map(b=>b.id);s.inventory.coconut=5;s.inventory.stag_master=4;syncSupplies(s);
 const jelly=careAll(s,'jelly','banana'),bedding=careAll(s,'clean','coconut');
 assert.equal(jelly.count,3);assert.equal(bedding.count,3);assert.equal(s.inventory.banana,3);assert.equal(s.inventory.coconut,2);assert.equal(s.inventory.stag_master,4);assert.equal(s.coins,350);
 assert.deepEqual(s.bugs.map(b=>b.id),ids);assert.ok(s.bugs.every(b=>b.hunger===100&&b.hygiene===100&&b.jellyId==='banana'&&b.matId==='coconut'));assert.equal(s.xp,30);valid(s);
 // A second replacement consumes fresh supplies, without repeating daily care XP.
 careAll(s,'jelly','banana');assert.equal(s.inventory.banana,0);assert.equal(s.xp,30);valid(s);
});

test('insufficient selected stock reports exact quantities and never partly replaces adults',()=>{
 const s=adults(8);s.inventory.banana=2;s.inventory.brown_sugar=20;syncSupplies(s);
 assert.match(careAllPlan(s,'jelly','banana').error,/필요 8개.*보유 2개.*부족 6개/);
 unchanged(s,()=>careAll(s,'jelly','banana'),/부족 6개/);
 s.inventory.basic_mat=2;syncSupplies(s);unchanged(s,()=>careAll(s,'clean','basic_mat'),/참나무 바닥재 부족/);
});

test('automatic purchase uses whole shop packs, accepts exact currency, and retains leftovers',()=>{
 const s=adults(8);s.settings.autoBuyCare=true;s.coins=80;s.inventory.banana=1;syncSupplies(s);
 const plan=careAll(s,'jelly','banana');assert.equal(plan.missing,7);assert.equal(plan.packs,2);assert.equal(plan.bought,12);assert.equal(plan.cost,80);assert.equal(s.coins,0);assert.equal(s.inventory.banana,5);assert.equal(s.jelly,5);valid(s);
 const t=adults(6);t.settings.autoBuyCare=true;t.coins=90;t.inventory.coconut=0;syncSupplies(t);
 const bedding=careAll(t,'clean','coconut');assert.equal(bedding.packs,2);assert.equal(t.coins,0);assert.equal(t.inventory.coconut,4);assert.equal(t.inventory.basic_mat,4);valid(t);
});

test('one leaf short of the full refill cost causes no purchase, care, or XP changes',()=>{
 const s=adults(8);s.settings.autoBuyCare=true;s.coins=79;s.inventory.banana=1;s.bugs[0].hunger=10;syncSupplies(s);
 unchanged(s,()=>careAll(s,'jelly','banana'),/80이파리 필요.*79이파리/);
});

test('owned locked products can be used, but automatic refills respect shop access',()=>{
 const s=adults();s.settings.autoBuyCare=true;s.inventory.pro_jelly=3;syncSupplies(s);
 careAll(s,'jelly','pro_jelly');assert.equal(s.inventory.pro_jelly,0);assert.equal(s.coins,350);valid(s);
 unchanged(s,()=>careAll(s,'jelly','pro_jelly'),/자동 구매 불가/);
 const choices=careSupplyItems(s,'jelly',{includeEmpty:true}).map(([id])=>id);assert.ok(choices.includes('banana'));assert.ok(!choices.includes('pro_jelly'));
});

test('single care automatically refills selected products but does not buy for already full adults',()=>{
 const s=adults(1);s.settings.autoBuyCare=true;s.inventory.banana=0;s.inventory.coconut=0;syncSupplies(s);
 unchanged(s,()=>care(s,s.bugs[0].id,'jelly','banana'),/이미 100/);
 unchanged(s,()=>care(s,s.bugs[0].id,'clean','coconut'),/이미 100/);
 s.bugs[0].hunger=20;care(s,s.bugs[0].id,'jelly','banana');assert.equal(s.coins,310);assert.equal(s.inventory.banana,5);
 s.bugs[0].hygiene=20;care(s,s.bugs[0].id,'clean','coconut');assert.equal(s.coins,265);assert.equal(s.inventory.coconut,4);valid(s);
});

test('bulk and single adult care reject larval-only premium mats even when automatic purchase is enabled',()=>{
 const s=adults();s.settings.autoBuyCare=true;s.inventory.stag_master=4;syncSupplies(s);
 unchanged(s,()=>careAll(s,'clean','stag_master'),/유충용 톱밥/);
 unchanged(s,()=>care(s,s.bugs[0].id,'clean','stag_master'),/유충용 톱밥/);
 assert.ok(careSupplyItems(s,'clean',{includeEmpty:true}).every(([id])=>PRODUCTS[id].adultBedding));
});

test('an active fight blocks the entire batch before any refill, and empty rooms cannot purchase',()=>{
 const s=adults();s.settings.autoBuyCare=true;s.inventory.banana=0;syncSupplies(s);makeOpponent(s,s.bugs[0].id,()=>.25);
 unchanged(s,()=>careAll(s,'jelly','banana'),/투곤/);unchanged(s,()=>care(s,s.bugs[0].id,'jelly','banana'),/경기/);valid(s);
 const t=newGame(NOW);t.settings.autoBuyCare=true;t.inventory.banana=0;syncSupplies(t);unchanged(t,()=>careAll(t,'jelly','banana'),/성충이 없습니다/);
});

test('automatic purchase defaults off in older saves, validates its type, and survives time settings',()=>{
 const s=adults();delete s.settings.autoBuyCare;valid(s);migrateSave(s,NOW);assert.equal(s.settings.autoBuyCare,false);valid(s);
 s.settings.autoBuyCare='yes';assert.equal(validateSave(s),false);s.settings.autoBuyCare=true;
 setTimeOptions(s,{realTime:true,realGrowth:true},NOW);assert.equal(s.settings.autoBuyCare,true);valid(s);
 setTimeOptions(s,{realTime:true,realGrowth:false},NOW);assert.equal(s.settings.autoBuyCare,true);valid(s);
});

test('automatic purchase preference persists separately in each forest',()=>{
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
 const virtual=loadWorld(store,'virtual',NOW),real=loadWorld(store,'real',NOW);virtual.state.settings.autoBuyCare=true;
 saveWorld(store,'virtual',virtual.state,virtual.ui);saveWorld(store,'real',real.state,real.ui);
 assert.equal(loadWorld(store,'virtual',NOW).state.settings.autoBuyCare,true);assert.equal(loadWorld(store,'real',NOW).state.settings.autoBuyCare,false);
});
