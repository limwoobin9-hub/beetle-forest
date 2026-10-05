import {SPECIES} from '../dist/world.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,breed,advanceDay,releaseMany,collectDailyGuest,finishDailyMission,validateSave,migrateSave} from '../dist/engine.js';
import {EVENT_TEMPLATES,EVENT_CATALOG,EVENT_BY_KEY,EVENT_FAMILIES} from '../dist/event-catalog.js';
import {EVENT_HOUR,EVENT_DAY,syncDailyEvents,beginDailyEvent,continueDailyEvent,claimDailyEvent,eventStep,validDailyEvents} from '../dist/events.js';
import {validTraits} from '../dist/traits.js';
import {syncSupplies} from '../dist/catalog.js';
const now=Date.parse('2026-10-05T10:00:00+09:00');
function setup(key){const s=newGame(now);syncDailyEvents(s,now);if(key){const e=s.dailyEvents.cases[0],t=EVENT_BY_KEY[key];Object.assign(e,{key,guest:t.guest,rareGuest:t.rareGuest});}return s;}
function complete(s,e,start=now){beginDailyEvent(s,e.id,start);while(e.stage==='working'){assert.throws(()=>claimDailyEvent(s,e.id,e.waitUntil-1),/작업/);const end=e.waitUntil;syncDailyEvents(s,end);if(e.stage==='ready')return end;assert.equal(e.stage,'step-ready');continueDailyEvent(s,e.id,end);}throw new Error('Unexpected stage');}
const possessions=s=>structuredClone({bugs:s.bugs,broods:s.broods,inventory:s.inventory,coins:s.coins,records:s.records,memorials:s.memorials});

test('200 concrete stories include equal good/problem counts, 1800 species combinations and one to three waits',()=>{
 assert.equal(EVENT_TEMPLATES.length,200);assert.equal(EVENT_CATALOG.length,EVENT_TEMPLATES.length*Object.keys(SPECIES).length);assert.equal(new Set(EVENT_CATALOG.map(t=>t.key)).size,EVENT_TEMPLATES.length*Object.keys(SPECIES).length);assert.equal(new Set(EVENT_TEMPLATES.map(t=>t.title)).size,200);
 for(const family of Object.keys(EVENT_FAMILIES))assert.equal(EVENT_TEMPLATES.filter(t=>t.family===family).length,20);
 assert.equal(EVENT_TEMPLATES.filter(t=>t.tone==='good').length,100);assert.equal(EVENT_TEMPLATES.filter(t=>t.tone==='bad').length,100);
 assert.deepEqual([...new Set(EVENT_TEMPLATES.map(t=>t.steps.length))].sort(),[1,2,3]);
 for(const t of EVENT_TEMPLATES){assert.ok(t.hours>=2&&t.hours<=6);assert.equal(t.hours,t.steps.reduce((n,p)=>n+p.hours,0));for(const p of t.steps){assert.ok(p.start&&p.working&&p.hours>=1);assert.equal(p.choices,undefined);}assert.ok(t.finish&&t.result);}
});

test('all 1800 cases finish only after every real wait and pay currency/items exactly once',()=>{
 for(const t of EVENT_CATALOG){
  const s=setup(t.key),e=s.dailyEvents.cases[0],before=possessions(s),end=complete(s,e);
  assert.equal(end-now,t.hours*EVENT_HOUR);assert.deepEqual(possessions(s),before);assert.equal(validateSave(s),true);
  const coins=s.coins,qty=s.inventory[t.item]||0,result=claimDailyEvent(s,e.id,end);
  assert.equal(s.coins,coins+result.coins);if(t.item)assert.equal(s.inventory[t.item],qty+t.qty);assert.equal(validateSave(s),true);
  assert.throws(()=>claimDailyEvent(s,e.id,end),/작업/);
 }
});

test('mites sterilize for three hours, cool for one, and neither virtual days nor early clicks skip either',()=>{
 const s=setup('hygiene-0:king'),e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);assert.match(eventStep(e).start,/톱밥 전부/);assert.equal(e.waitUntil,now+3*EVENT_HOUR);
 advanceDay(s);syncDailyEvents(s,now+EVENT_HOUR);assert.equal(e.stage,'working');assert.throws(()=>continueDailyEvent(s,e.id,now+EVENT_HOUR),/현재 작업/);
 syncDailyEvents(s,e.waitUntil);assert.equal(e.stage,'step-ready');continueDailyEvent(s,e.id,e.waitUntil);assert.match(eventStep(e).start,/식히기/);assert.equal(e.waitUntil,now+4*EVENT_HOUR);
 const restored=migrateSave(JSON.parse(JSON.stringify(s)),now+3.5*EVENT_HOUR);assert.equal(validateSave(restored),true);assert.equal(restored.dailyEvents.cases[0].stage,'working');syncDailyEvents(restored,e.waitUntil);assert.equal(restored.dailyEvents.cases[0].stage,'ready');
});

test('one mission per Korean date, stable on reload/backward clocks, with no offline backlog',()=>{
 const late=Date.parse('2026-10-05T23:55:00+09:00'),s=newGame(late);syncDailyEvents(s,late);const e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,late);assert.equal(e.deadlineAt,late+EVENT_DAY);
 const midnight=late+6*60000;syncDailyEvents(s,midnight);assert.equal(s.dailyEvents.cases.length,2);assert.equal(s.dailyEvents.cases.filter(e=>e.stage==='new').length,1);assert.equal(e.stage,'working');
 const reload=structuredClone(s);syncDailyEvents(reload,midnight);assert.deepEqual(reload,s);syncDailyEvents(s,late);syncDailyEvents(s,midnight);assert.equal(s.dailyEvents.cases.length,2);
 syncDailyEvents(s,midnight+10*EVENT_DAY);assert.equal(s.dailyEvents.cases.length,3);assert.equal(s.dailyEvents.cases.filter(e=>e.stage==='new').length,1);assert.equal(validateSave(s),true);
});

test('three-step rain work fits four hours, expires unfinished, and blocks continuations that overrun 24 hours',()=>{
 const s=setup('weather-0:king'),e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);syncDailyEvents(s,e.waitUntil);continueDailyEvent(s,e.id,e.waitUntil);syncDailyEvents(s,e.waitUntil);assert.equal(e.step,1);assert.equal(e.stage,'step-ready');
 assert.throws(()=>continueDailyEvent(s,e.id,now+23.5*EVENT_HOUR),/시간이 부족/);const before=possessions(s);syncDailyEvents(s,e.deadlineAt);assert.equal(e.stage,'expired');assert.deepEqual(possessions(s),before);
 const good=setup('weather-0:king'),job=good.dailyEvents.cases[0],end=complete(good,job);assert.equal(end-now,4*EVENT_HOUR);assert.equal(job.step,2);
});

test('finishing the last wait earns a durable reward even if the next visit is days later',()=>{
 const s=setup('hygiene-0:king'),e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);syncDailyEvents(s,e.waitUntil);continueDailyEvent(s,e.id,e.waitUntil);
 syncDailyEvents(s,now+8*EVENT_DAY);assert.equal(e.stage,'ready');const coins=s.coins;claimDailyEvent(s,e.id,now+8*EVENT_DAY);assert.equal(s.coins,coins+e.reward);
});

test('cleanup preserves expensive supplies and larvae, improves only adults present when the job started',()=>{
 const s=setup('hygiene-0:king');s.inventory.stag_master=4;syncSupplies(s);const a=createBug('king','male',.8,1),b=createBug('king','female',.8,1);s.bugs.push(a,b);breed(s,a.id,b.id,()=>.25);
 a.hygiene=15;b.hygiene=30;const broods=structuredClone(s.broods),stock=structuredClone(s.inventory),e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);
 const newcomer=createBug('flat','male',.7,1);newcomer.hygiene=40;s.bugs.push(newcomer);releaseMany(s,[b.id]);
 syncDailyEvents(s,e.waitUntil);continueDailyEvent(s,e.id,e.waitUntil);syncDailyEvents(s,e.waitUntil);finishDailyMission(s,e.id,e.waitUntil);
 assert.equal(a.hygiene,100);assert.equal(newcomer.hygiene,40);assert.deepEqual(s.broods,broods);assert.deepEqual(s.inventory,stock);assert.equal(validateSave(s),true);
});

test('guests arrive automatically with fixed traits, while full rooms keep guests after paying money',()=>{
 const s=setup('window-0:saw'),e=s.dailyEvents.cases[0],end=complete(s,e),result=finishDailyMission(s,e.id,end);
 assert.ok(result.bug);assert.equal(s.bugs.length,1);assert.equal(e.guestTaken,true);assert.equal(validTraits('saw',result.bug.traits),true);assert.equal(s.captures,0);assert.throws(()=>finishDailyMission(s,e.id,end),/작업/);
 const full=setup('window-0:stag'),guest=full.dailyEvents.cases[0],done=complete(full,guest);for(let i=0;i<48;i++)full.bugs.push(createBug('flat',i%2?'female':'male',.5,1));
 const paid=finishDailyMission(full,guest.id,done);assert.equal(paid.pendingGuest,true);assert.equal(paid.bug,null);assert.equal(full.coins,350+guest.reward);assert.throws(()=>collectDailyGuest(full,guest.id,done),/공간/);
 const reload=migrateSave(JSON.parse(JSON.stringify(full)),done+4*EVENT_DAY);syncDailyEvents(reload,done+4*EVENT_DAY);releaseMany(reload,[reload.bugs[0].id]);releaseMany(full,[full.bugs[0].id]);
 const a=collectDailyGuest(reload,guest.id,done+4*EVENT_DAY),b=collectDailyGuest(full,guest.id,done+4*EVENT_DAY);for(const k of ['species','sex','genetic','length','traits'])assert.deepEqual(a[k],b[k]);assert.ok(a.traits.length);assert.equal(reload.bugs.length,48);assert.equal(validateSave(reload),true);
 assert.throws(()=>collectDailyGuest(reload,guest.id,done+4*EVENT_DAY),/손님/);
});

test('live night/rain/heat influence relevant jobs without rerolling the daily mission or the good/problem split',()=>{
 const counts={dayNight:0,nightNight:0,rainRain:0,clearRain:0,good:0,bad:0,hotHeat:0,coldHeat:0};
 for(let i=0;i<600;i++)for(const [kind,env] of Object.entries({day:{period:'day',weather:'clear',temperature:20},night:{period:'night',weather:'clear',temperature:20},rain:{period:'day',weather:'rain',temperature:20,region:'서울'},hot:{period:'day',weather:'clear',temperature:32}})){
  const s=newGame(now+i*EVENT_DAY);s.bugs.push(createBug('king','male',.8,1));syncDailyEvents(s,now+i*EVENT_DAY,env);const e=s.dailyEvents.cases[0],t=EVENT_BY_KEY[e.key];assert.deepEqual(e.context,{region:'',...env});
  if(kind==='day'){counts[t.tone]++;if(t.family==='night')counts.dayNight++;if(t.job==='rain')counts.clearRain++;if(t.job==='heat')counts.coldHeat++;}
  if(kind==='night'&&t.family==='night')counts.nightNight++;if(kind==='rain'&&t.job==='rain')counts.rainRain++;if(kind==='hot'&&t.job==='heat')counts.hotHeat++;
  const key=e.key;syncDailyEvents(s,now+i*EVENT_DAY,{period:'night',weather:'storm',temperature:35});assert.equal(e.key,key);assert.deepEqual(e.context,{region:'',...env});
 }
 assert.equal(counts.dayNight,0);assert.equal(counts.clearRain,0);assert.equal(counts.coldHeat,0);assert.ok(counts.nightNight>50);assert.ok(counts.rainRain>20);assert.ok(counts.hotHeat>20);assert.ok(counts.good>240&&counts.good<360);assert.equal(counts.good+counts.bad,600);
});

test('weather pending defers a new mission but keeps existing real-time jobs moving; errors fall back',()=>{
 const s=newGame(now);assert.equal(syncDailyEvents(s,now,{pending:true}),false);assert.equal(s.dailyEvents.cases.length,0);syncDailyEvents(s,now,{period:'day',weather:'rain',temperature:18,region:'서울'});assert.equal(s.dailyEvents.cases.length,1);
 const e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);syncDailyEvents(s,e.waitUntil,{pending:true});assert.notEqual(e.stage,'working');
 const fallback=newGame(now);syncDailyEvents(fallback,now,{pending:false});assert.equal(fallback.dailyEvents.cases.length,1);assert.equal(fallback.dailyEvents.cases[0].context.weather,null);
});

function legacyCase(id,stage,key='window-0:king'){return {id,key,seed:2,createdAt:now,startedAt:stage==='new'?0:now,deadlineAt:stage==='new'?0:now+EVENT_DAY,waitUntil:stage==='new'?0:now+4*EVENT_HOUR,retryAt:0,trialAt:0,firstHours:2,variant:0,mistakes:1,trials:0,reward:300,guestTaken:false,notice:'',goal:0,activityStart:0,activity:null,stage};}
test('legacy migration preserves already-started clocks, earned money, paid guests and possessions, discarding unstarted choices',()=>{
 const s=newGame(now);s.bugs.push(createBug('king','male',.8,1));s.dailyEvents={version:1,dayKey:100,activities:{care:0,capture:0,brood:0},cases:[legacyCase('unused','new'),legacyCase('running','waiting','hygiene-0:king'),legacyCase('earned','complete'),legacyCase('paid','claimed')]};
 assert.equal(validateSave(s),true);const before=possessions(s);migrateSave(s,now+EVENT_HOUR);assert.deepEqual(possessions(s),before);assert.equal(s.dailyEvents.version,2);assert.equal(s.dailyEvents.cases.length,3);assert.equal(s.dailyEvents.cases[0].stage,'working');assert.equal(s.dailyEvents.cases[0].waitUntil,now+4*EVENT_HOUR);assert.equal(validateSave(s),true);
 syncDailyEvents(s,now+EVENT_HOUR);assert.equal(s.dailyEvents.cases.filter(e=>!e.legacy).length,1);const earned=s.dailyEvents.cases.find(e=>e.id==='previous-earned');assert.equal(earned.stage,'ready');assert.equal(earned.reward,270);claimDailyEvent(s,earned.id,now+EVENT_HOUR);collectDailyGuest(s,'previous-paid',now+EVENT_HOUR);assert.equal(validateSave(s),true);
});

test('missing ledgers migrate safely and corrupted stages/clocks/guest flags/duplicate dates fail save validation',()=>{
 const old=newGame(now);delete old.dailyEvents;assert.equal(validateSave(old),true);migrateSave(old,now);assert.equal(validDailyEvents(old.dailyEvents),true);
 const s=setup('hygiene-0:king'),e=s.dailyEvents.cases[0];beginDailyEvent(s,e.id,now);
 for(const mutate of [d=>d.cases[0].key='missing',d=>d.cases[0].stage='paid-twice',d=>d.cases[0].step=10,d=>d.cases[0].deadlineAt++,d=>d.cases[0].waitUntil++,d=>d.cases[0].reward=-1,d=>d.cases[0].targetIds=['same','same'],d=>d.cases[0].guest=true,d=>d.cases[0].stage='ready',d=>d.cases.push({...d.cases[0],id:'duplicate-day'})]){const bad=structuredClone(s);mutate(bad.dailyEvents);assert.equal(validateSave(bad),false);}
});
