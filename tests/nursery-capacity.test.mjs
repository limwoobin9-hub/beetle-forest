import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,buy,breed,migrateSave,validateSave} from '../dist/engine.js';
import {nurseryCapacity,NURSERY_PRODUCT_ID} from '../dist/nursery-capacity.js';
import {syncSupplies} from '../dist/catalog.js';
import {listAuction,cancelAuction,auctionNurseries} from '../dist/auctions.js';
import {loadWorld,saveWorld} from '../dist/worlds.js';
const NOW=Date.parse('2026-10-06T03:00:00+09:00');
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function stock(){const s=newGame(NOW);s.coins=10000;s.inventory.basic_mat=100;syncSupplies(s);return s;}
function brood(s){const pair=['male','female'].map(sex=>createBug('flat',sex,.6,s.day));s.bugs.push(...pair);return breed(s,...pair.map(b=>b.id),()=>.5);}
function unchanged(s,fn,re){const before=structuredClone(s);assert.throws(fn,re);assert.deepEqual(s,before);}

test('repeat purchases cost exactly 1000 and permanently add one nursery apiece',()=>{
 const s=stock();assert.equal(nurseryCapacity(s),3);
 for(let i=1;i<=5;i++){assert.match(buy(s,NURSERY_PRODUCT_ID),new RegExp(`동시 번식통 ${3+i}개`));assert.equal(s.coins,10000-i*1000);assert.equal(s.inventory[NURSERY_PRODUCT_ID],i);assert.equal(nurseryCapacity(s),3+i);valid(s);}
 s.coins=999;unchanged(s,()=>buy(s,NURSERY_PRODUCT_ID),/부족/);
 buy(Object.assign(stock(),{coins:2000}),'field_lens');const gear=stock();buy(gear,'field_lens');unchanged(gear,()=>buy(gear,'field_lens'),/이미 보유/);
});

test('eight purchased slots permit eight simultaneous broods and save without rerolling existing ones',()=>{
 const s=stock();for(let i=0;i<3;i++)brood(s);const existing=structuredClone(s.broods);const pair=['male','female'].map(sex=>createBug('flat',sex,.5,1));s.bugs.push(...pair);
 unchanged(s,()=>breed(s,...pair.map(b=>b.id),()=>.5),/번식통 3개/);
 for(let i=0;i<5;i++)buy(s,NURSERY_PRODUCT_ID);breed(s,...pair.map(b=>b.id),()=>.5);for(let i=0;i<4;i++)brood(s);assert.equal(s.broods.length,8);assert.deepEqual(s.broods.slice(0,3),existing);valid(s);
 const restored=JSON.parse(JSON.stringify(s));migrateSave(restored,NOW);assert.equal(nurseryCapacity(restored),8);assert.deepEqual(restored.broods,s.broods);valid(restored);
 const invalid=structuredClone(s);delete invalid.inventory[NURSERY_PRODUCT_ID];assert.equal(validateSave(invalid),false);
});

test('auction custody reserves expanded nurseries through cancellation and rejects overflow',()=>{
 const s=stock();buy(s,NURSERY_PRODUCT_ID);const first=brood(s);first.age=2;const lot=listAuction(s,'larva',first.id,{startPrice:1000000,durationMinutes:10},NOW);
 for(let i=0;i<3;i++)brood(s);assert.equal(auctionNurseries(s),1);assert.equal(s.broods.length,3);valid(s);
 const pair=['male','female'].map(sex=>createBug('flat',sex,.5,1));s.bugs.push(...pair);unchanged(s,()=>breed(s,...pair.map(b=>b.id),()=>.5),/번식통 4개/);
 cancelAuction(s,lot.id,NOW);assert.equal(s.broods.length,4);valid(s);buy(s,NURSERY_PRODUCT_ID);breed(s,...pair.map(b=>b.id),()=>.5);assert.equal(s.broods.length,5);valid(s);
});

test('more nurseries still require offspring space in the adult room',()=>{
 const s=stock();buy(s,NURSERY_PRODUCT_ID);while(s.bugs.length<47)s.bugs.push(createBug('flat',s.bugs.length%2?'female':'male',.5,1));unchanged(s,()=>breed(s,s.bugs[0].id,s.bugs[1].id,()=>.5),/공간/);valid(s);
});

test('legacy default and purchased nursery count remain independent between forests',()=>{
 const v=stock(),r=newGame(NOW);r.settings.realTime=true;buy(v,NURSERY_PRODUCT_ID);buy(v,NURSERY_PRODUCT_ID);const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};saveWorld(store,'virtual',v,{});saveWorld(store,'real',r,{});
 const restored=loadWorld(store,'virtual',NOW).state,real=loadWorld(store,'real',NOW).state;assert.equal(nurseryCapacity(restored),5);assert.equal(nurseryCapacity(real),3);valid(restored);valid(real);
});
