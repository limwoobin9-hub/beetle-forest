import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,advanceDay,care,releaseMany,collectDailyGuest,validateSave,migrateSave} from '../dist/engine.js';
import {EVENT_TEMPLATES,EVENT_CATALOG,EVENT_BY_KEY,EVENT_FAMILIES} from '../dist/event-catalog.js';
import {EVENT_HOUR,EVENT_DAY,EVENT_RETRY,syncDailyEvents,beginDailyEvent,chooseDailyEvent,checkDailyEvent,runEventTrial,claimDailyEvent,eventChoices,eventProgress,eventReward,validDailyEvents,recordEventActivity} from '../dist/events.js';
import {validTraits} from '../dist/traits.js';
const now=Date.parse('2026-10-05T10:00:00+09:00');
function setup(){const s=newGame(now);syncDailyEvents(s,now);return s;}
function complete(s,e,start=now){beginDailyEvent(s,e.id,start);chooseDailyEvent(s,e.id,'first',eventChoices(e).answer,start);const middle=e.waitUntil;if(e.activity)recordEventActivity(s,e.activity,e.goal);checkDailyEvent(s,e.id,middle);chooseDailyEvent(s,e.id,'followup',eventChoices(e,'followup').answer,middle);assert.equal(e.stage,'final-wait');const end=e.waitUntil;syncDailyEvents(s,end);assert.equal(e.stage,'complete');return end;}
const possessions=s=>structuredClone({bugs:s.bugs,broods:s.broods,inventory:s.inventory,coins:s.coins,records:s.records,memorials:s.memorials});

test('catalog contains 80 distinct stories and 720 species/story cases across ten families',()=>{
 assert.equal(EVENT_TEMPLATES.length,80);assert.equal(EVENT_CATALOG.length,720);assert.equal(new Set(EVENT_CATALOG.map(e=>e.key)).size,720);assert.equal(Object.keys(EVENT_FAMILIES).length,10);
 for(const family of Object.keys(EVENT_FAMILIES))assert.equal(EVENT_TEMPLATES.filter(t=>t.family===family).length,8);
 assert.equal(new Set(EVENT_TEMPLATES.map(t=>t.title)).size,80);
});

test('every catalog case and clue variant can finish only after two real observation waits',()=>{
 for(const t of EVENT_CATALOG)for(let variant=0;variant<4;variant++){
  const s=setup(),e=s.dailyEvents.cases[0];e.key=t.key;e.variant=variant;e.seed=variant;e.activity=null;e.goal=0;
  const before=possessions(s),end=complete(s,e);assert.ok(end-now>=4*EVENT_HOUR);assert.deepEqual(possessions(s),before);
  const coins=s.coins,result=claimDailyEvent(s,e.id,end);assert.equal(s.coins,coins+result.coins);assert.equal(validateSave(s),true);
  assert.throws(()=>claimDailyEvent(s,e.id,end),/해결/);
 }
});

test('daily cases stagger first checks at 2, 3 and 4 hours and virtual next-day buttons cannot skip waits',()=>{
 const s=setup();assert.deepEqual(s.dailyEvents.cases.map(e=>e.firstHours),[2,3,4]);const e=s.dailyEvents.cases[0];
 beginDailyEvent(s,e.id,now);chooseDailyEvent(s,e.id,'first',eventChoices(e).answer,now);advanceDay(s);
 assert.equal(e.stage,'waiting');assert.throws(()=>checkDailyEvent(s,e.id,now+EVENT_HOUR),/관찰/);assert.throws(()=>claimDailyEvent(s,e.id,now+EVENT_HOUR),/해결/);
 checkDailyEvent(s,e.id,e.waitUntil);chooseDailyEvent(s,e.id,'followup',eventChoices(e,'followup').answer,e.waitUntil);
 assert.equal(e.stage,'final-wait');assert.throws(()=>claimDailyEvent(s,e.id,e.waitUntil-1),/해결/);
});

test('mistakes affect only the case retry time and limited reward, with no harm to owned insects or supplies',()=>{
 const s=setup();s.bugs.push(createBug('king','male',.8,1));const e=s.dailyEvents.cases[1];beginDailyEvent(s,e.id,now);
 const before=possessions(s),answer=eventChoices(e).answer;
 chooseDailyEvent(s,e.id,'first',(answer+1)%4,now);assert.deepEqual(possessions(s),before);assert.equal(e.retryAt,now+EVENT_RETRY);assert.equal(eventReward(e),Math.floor(e.reward*.9));
 assert.throws(()=>chooseDailyEvent(s,e.id,'first',answer,now+1),/결과/);
 chooseDailyEvent(s,e.id,'first',answer,now+EVENT_RETRY);assert.equal(e.stage,'waiting');assert.deepEqual(possessions(s),before);
 e.mistakes=100;assert.equal(eventReward(e),Math.floor(e.reward*.7));assert.equal(validateSave(s),true);
});

test('late-night starts retain a full 24-hour deadline while three new cases arrive next Korean date',()=>{
 const late=Date.parse('2026-10-05T23:55:00+09:00'),s=newGame(late);syncDailyEvents(s,late);const e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,late);
 assert.equal(e.deadlineAt,late+EVENT_DAY);const midnight=Date.parse('2026-10-06T00:01:00+09:00');syncDailyEvents(s,midnight);
 assert.equal(e.stage,'investigating');assert.equal(s.dailyEvents.cases.filter(e=>e.stage==='new').length,3);
 const count=s.dailyEvents.cases.length;syncDailyEvents(s,late);syncDailyEvents(s,midnight);assert.equal(s.dailyEvents.cases.length,count);assert.equal(validateSave(s),true);
});

test('retry and sample preparation timers trigger an automatic refresh exactly when their interval ends',()=>{
 const s=setup(),e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);
 chooseDailyEvent(s,e.id,'first',(eventChoices(e).answer+1)%4,now);
 assert.equal(syncDailyEvents(s,now+EVENT_RETRY-1),false);
 assert.equal(syncDailyEvents(s,now+EVENT_RETRY),true);assert.equal(e.retryAt,0);
 assert.equal(syncDailyEvents(s,now+EVENT_RETRY+1),false);
 chooseDailyEvent(s,e.id,'first',eventChoices(e).answer,now+EVENT_RETRY);
 const trialState=setup(),trial=trialState.dailyEvents.cases[2];trial.goal=2;
 beginDailyEvent(trialState,trial.id,now);chooseDailyEvent(trialState,trial.id,'first',eventChoices(trial).answer,now);
 runEventTrial(trialState,trial.id,eventChoices(trial,'trial').answer,now);
 assert.equal(syncDailyEvents(trialState,now+EVENT_RETRY-1),false);
 assert.equal(syncDailyEvents(trialState,now+EVENT_RETRY),true);assert.equal(trial.trialAt,0);
 runEventTrial(trialState,trial.id,eventChoices(trial,'trial').answer,now+EVENT_RETRY);
 assert.equal(eventProgress(trialState,trial),2);assert.equal(validateSave(trialState),true);
});

test('expiry changes only event status while completed unclaimed rewards remain available',()=>{
 const s=setup(),[a,b]=s.dailyEvents.cases;const end=complete(s,a);beginDailyEvent(s,b.id,end);const before=possessions(s);
 syncDailyEvents(s,end+EVENT_DAY);assert.equal(b.stage,'expired');assert.equal(a.stage,'complete');assert.deepEqual(possessions(s),before);
 assert.throws(()=>chooseDailyEvent(s,b.id,'first',0,end+EVENT_DAY),/기한|시간/);const coins=s.coins;claimDailyEvent(s,a.id,end+EVENT_DAY);assert.ok(s.coins>coins);
});

test('full room can claim money and keep the rare guest safely until space is available',()=>{
 const s=setup(),e=s.dailyEvents.cases[0];assert.equal(EVENT_BY_KEY[e.key].guest,true);const end=complete(s,e);
 for(let i=0;i<48;i++)s.bugs.push(createBug('flat',i%2?'female':'male',.5,1));
 const coins=s.coins;claimDailyEvent(s,e.id,end);assert.ok(s.coins>coins);const before=possessions(s);
 assert.throws(()=>collectDailyGuest(s,e.id,end),/보관/);assert.deepEqual(possessions(s),before);assert.equal(e.guestTaken,false);
 syncDailyEvents(s,end+3*EVENT_DAY);assert.ok(s.dailyEvents.cases.some(x=>x.id===e.id));releaseMany(s,[s.bugs[0].id]);
 const b=collectDailyGuest(s,e.id,end+3*EVENT_DAY);assert.ok(b.traits.length);assert.equal(validTraits(b.species,b.traits),true);assert.equal(s.captures,0);assert.equal(s.bugs.length,48);assert.equal(e.guestTaken,true);
 assert.throws(()=>collectDailyGuest(s,e.id,end+3*EVENT_DAY),/손님/);assert.equal(validateSave(s),true);
});

test('mission records begin at activation and real care or provided trial samples can satisfy them',()=>{
 const s=setup(),b=createBug('king','male',.7,1);s.bugs.push(b);const e=s.dailyEvents.cases[2];e.activity='care';e.goal=2;
 care(s,b.id,'clean','basic_mat');beginDailyEvent(s,e.id,now);chooseDailyEvent(s,e.id,'first',eventChoices(e).answer,now);assert.equal(eventProgress(s,e),0);
 care(s,b.id,'jelly','banana');assert.equal(eventProgress(s,e),1);runEventTrial(s,e.id,eventChoices(e,'trial').answer,now);assert.equal(eventProgress(s,e),2);
 checkDailyEvent(s,e.id,e.waitUntil);assert.equal(e.stage,'followup');assert.equal(validateSave(s),true);
});

test('trial samples offer an alternative without consuming currency or inventory and preserve the preparation interval',()=>{
 const s=setup(),e=s.dailyEvents.cases[2];e.goal=2;beginDailyEvent(s,e.id,now);chooseDailyEvent(s,e.id,'first',eventChoices(e).answer,now);const before=possessions(s);
 runEventTrial(s,e.id,eventChoices(e,'trial').answer,now);assert.throws(()=>runEventTrial(s,e.id,eventChoices(e,'trial').answer,now+1),/시료/);
 runEventTrial(s,e.id,eventChoices(e,'trial').answer,now+EVENT_RETRY);assert.equal(eventProgress(s,e),2);assert.deepEqual(possessions(s),before);
});

test('case stages and rewards survive reload and old saves acquire the optional event ledger',()=>{
 const s=setup(),e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);chooseDailyEvent(s,e.id,'first',eventChoices(e).answer,now);
 const restored=migrateSave(JSON.parse(JSON.stringify(s)),now);assert.equal(validateSave(restored),true);assert.equal(syncDailyEvents(restored,now+EVENT_HOUR),false);assert.equal(restored.dailyEvents.cases[0].stage,'waiting');
 const old=newGame(now);delete old.dailyEvents;assert.equal(validateSave(old),true);migrateSave(old,now);assert.equal(validDailyEvents(old.dailyEvents),true);
 for(const mutate of [d=>d.cases[0].key='missing',d=>d.cases[0].stage='paid-twice',d=>d.cases[0].variant=7,d=>d.cases[0].firstHours=0,d=>d.cases[0].deadlineAt++,d=>d.activities.care=-1,d=>d.cases.push(d.cases[0])]){
  const bad=structuredClone(s);mutate(bad.dailyEvents);assert.equal(validateSave(bad),false);
 }
});
