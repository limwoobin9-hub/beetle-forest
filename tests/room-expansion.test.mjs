import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,buy,breed,careAll,startExpedition,inspectSpot,approachInsect,finishCapture,cancelExpedition,collectDailyGuest,finishDailyMission,migrateSave,validateSave} from '../dist/engine.js';
import {ROOM_EXPANSIONS,roomCapacity,roomLevel} from '../dist/room-capacity.js';
import {syncSupplies} from '../dist/catalog.js';
import {listAuction,cancelAuction,auctionReserved} from '../dist/auctions.js';
import {syncDailyEvents,beginDailyEvent,continueDailyEvent} from '../dist/events.js';
import {EVENT_BY_KEY} from '../dist/event-catalog.js';
import {startForeignTrip,surveyForeignTrip,returnForeignTrip,claimForeignReturn} from '../dist/overseas.js';
import {loadWorld,saveWorld} from '../dist/worlds.js';
import {exchangeInsects} from '../dist/world-exchange.js';
const NOW=Date.parse('2026-10-05T10:00:00+09:00');
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function insects(s,n){while(s.bugs.length<n)s.bugs.push(createBug('king',s.bugs.length%2?'female':'male',.6,1));return s;}
function upgraded(stage=1,count=0){const s=newGame(NOW);s.coins=100000;for(const step of ROOM_EXPANSIONS.slice(0,stage))buy(s,step.id);return insects(s,count);}
function unchanged(s,fn,pattern){const before=structuredClone(s);assert.throws(fn,pattern);assert.deepEqual(s,before);}

test('four permanent sequential expansions have exact prices and increase capacity to 120',()=>{
 const s=newGame(NOW);s.coins=44000;assert.equal(roomCapacity(s),48);assert.equal(roomLevel(s),0);
 for(const step of ROOM_EXPANSIONS){const before=s.coins;buy(s,step.id);assert.equal(s.coins,before-step.price);assert.equal(s.inventory[step.id],1);assert.equal(roomCapacity(s),step.capacity);assert.equal(roomLevel(s),step.stage);valid(s);}
 assert.equal(s.coins,0);assert.equal(roomCapacity(s),120);
});

test('out-of-order, unaffordable and duplicate expansions never change the save',()=>{
 const s=newGame(NOW);s.coins=100000;unchanged(s,()=>buy(s,'room_expansion_3'),/이전 단계/);
 s.coins=1999;unchanged(s,()=>buy(s,'room_expansion_1'),/부족/);s.coins=100000;buy(s,'room_expansion_1');unchanged(s,()=>buy(s,'room_expansion_1'),/이미 보유/);valid(s);
});

test('legacy capacity is preserved; expansion saves reject gaps, extra copies and excess insects',()=>{
 const legacy=newGame(NOW);insects(legacy,48);valid(legacy);migrateSave(legacy,NOW);assert.equal(roomCapacity(legacy),48);
 legacy.bugs.push(createBug('king','male',.5,1));assert.equal(validateSave(legacy),false);
 const s=upgraded(4,120);valid(s);s.bugs.push(createBug('king','male',.5,1));assert.equal(validateSave(s),false);s.bugs.pop();
 const gap=structuredClone(s);delete gap.inventory.room_expansion_2;assert.equal(validateSave(gap),false);
 const extra=structuredClone(s);extra.inventory.room_expansion_1=2;assert.equal(validateSave(extra),false);
});

test('capture fills expanded room, stops at its new limit, and resumes after the next purchase',()=>{
 const s=upgraded(1,59);startExpedition(s,'oak',()=>.25);inspectSpot(s,s.expedition.spots.findIndex(p=>p.rich),()=>.25);approachInsect(s,'fast');finishCapture(s,1);assert.equal(s.bugs.length,60);valid(s);
 unchanged(s,()=>startExpedition(s,'oak'),/60마리/);buy(s,'room_expansion_2');startExpedition(s,'oak');assert.ok(s.expedition);cancelExpedition(s);valid(s);
});

test('expanded breeding space reserves all offspring and auction custody still reserves return space',()=>{
 const s=upgraded(1,57);breed(s,s.bugs[0].id,s.bugs[1].id,()=>.25);assert.equal(s.bugs.length+s.broods.length*3,60);valid(s);unchanged(s,()=>startExpedition(s,'oak'),/수용량/);
 buy(s,'room_expansion_2');startExpedition(s,'oak');cancelExpedition(s);valid(s);
 const t=upgraded(1,60),b=t.bugs[0];const lot=listAuction(t,'adult',b.id,{startPrice:100,durationMinutes:1},NOW);assert.equal(auctionReserved(t),1);assert.equal(t.bugs.length,59);valid(t);
 unchanged(t,()=>startExpedition(t,'oak'),/수용량/);buy(t,'room_expansion_2');cancelAuction(t,lot.id,NOW);assert.equal(t.bugs.length,60);valid(t);
});

test('bulk care and mission target snapshots support all 120 adults',()=>{
 const s=upgraded(4,120);s.inventory.banana=120;s.inventory.coconut=120;syncSupplies(s);careAll(s,'jelly','banana');careAll(s,'clean','coconut');assert.equal(s.inventory.banana,0);assert.equal(s.inventory.coconut,0);assert.ok(s.bugs.every(b=>b.hunger===100&&b.hygiene===100));valid(s);
 syncDailyEvents(s,NOW);beginDailyEvent(s,s.dailyEvents.cases[0].id,NOW);assert.equal(s.dailyEvents.cases[0].targetIds.length,120);valid(s);
});

test('a mission guest waiting for space can enter immediately after expansion',()=>{
 const s=insects(newGame(NOW),48);s.coins=10000;syncDailyEvents(s,NOW);const e=s.dailyEvents.cases[0],key='window-0:stag',t=EVENT_BY_KEY[key];Object.assign(e,{key,guest:t.guest,rareGuest:t.rareGuest});beginDailyEvent(s,e.id,NOW);
 let end;while(e.stage==='working'){end=e.waitUntil;syncDailyEvents(s,end);if(e.stage==='step-ready')continueDailyEvent(s,e.id,end);}
 const result=finishDailyMission(s,e.id,end);assert.equal(result.pendingGuest,true);assert.equal(result.bug,null);buy(s,'room_expansion_1');collectDailyGuest(s,e.id,end);assert.equal(s.bugs.length,49);valid(s);
});

test('foreign live returns use expanded capacity instead of the former 48 limit',()=>{
 const s=upgraded(1,48);s.career.qualifications.push('overseas_live');startForeignTrip(s,'sumatra',NOW);
 for(let i=0;i<3;i++)surveyForeignTrip(s,createBug,NOW);returnForeignTrip(s,NOW);const result=claimForeignReturn(s,NOW);assert.equal(result.live,3);assert.equal(s.bugs.length,51);valid(s);
});

test('expansions persist independently by forest and swapping insects preserves each capacity',()=>{
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
 const virtual=upgraded(2,60),real=insects(newGame(NOW),1);real.settings.realTime=true;saveWorld(store,'virtual',virtual,{});saveWorld(store,'real',real,{});
 const states={virtual:loadWorld(store,'virtual',NOW).state,real:loadWorld(store,'real',NOW).state};assert.equal(roomCapacity(states.virtual),72);assert.equal(roomCapacity(states.real),48);
 const next=exchangeInsects(states,states.real.bugs[0].id,states.virtual.bugs[0].id,NOW);assert.equal(next.virtual.bugs.length,60);assert.equal(next.real.bugs.length,1);assert.equal(roomCapacity(next.virtual),72);assert.equal(roomCapacity(next.real),48);valid(next.virtual);valid(next.real);
});
