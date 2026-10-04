import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,breed,careBrood,broodStage,advanceDay,validateSave,migrateSave,syncRealTime,setTimeOptions} from '../dist/engine.js';
import {DAY_MS,nextDayAt} from '../dist/time.js';
import {koreanClock,roomEnvironment,weatherKind,weatherURL,fetchWeather,parseWeather,WEATHER_MAX_AGE_MS} from '../dist/environment.js';
const now=Date.parse('2026-10-04T11:29:23+09:00');
const forecast={current:{time:'2026-10-04T11:15',temperature_2m:19.2,weather_code:61},daily:{sunrise:['2026-10-04T06:30'],sunset:['2026-10-04T18:15']}};
function rng(seed){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
function raised(seed,food='basic_mat',neglect=false,species='flat'){
 const random=rng(seed),s=newGame(now),m=createBug(species,'male',.8,1),f=createBug(species,'female',.4,1);m.length=64;f.length=34;s.bugs.push(m,f);s.inventory[food]=50;
 const b=breed(s,m.id,f.id,random,'basic_mat');
 for(let i=0;i<15;i++){if(!neglect&&['1령','2령','3령'].includes(broodStage(b))&&b.food<100)careBrood(s,b.id,food);advanceDay(s);}
 assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);return s.bugs.filter(b=>b.source==='번식');
}
test('Korean clock shows the current civil date and second across UTC midnight',()=>{
 assert.deepEqual(koreanClock(now),{date:'2026.10.04',time:'11:29:23',hour:11+29/60});
 assert.equal(koreanClock(Date.parse('2026-10-04T15:00:00Z')).date,'2026.10.05');
});
test('room tracks morning, day, evening and night in Korean time',()=>{
 for(const [hour,period] of [[7,'morning'],[12,'day'],[18,'evening'],[23,'night'],[3,'night']])assert.equal(roomEnvironment(Date.parse(`2026-10-04T${String(hour).padStart(2,'0')}:00:00+09:00`)).period,period);
});
test('weather parsing retains region, solar times and a current condition without inventing stale weather',async()=>{
 const w=await fetchWeather('seoul',{now,fetcher:async url=>{assert.equal(new URL(url).searchParams.get('timezone'),'Asia/Seoul');return {ok:true,json:async()=>forecast};}});
 assert.equal(w.temperature,19.2);assert.equal(roomEnvironment(now,w).weather,'rain');assert.equal(roomEnvironment(now,w).period,'day');
 assert.equal(roomEnvironment(now+WEATHER_MAX_AGE_MS+1,w).weather,null);
 assert.equal(roomEnvironment(w.fetchedAt-1,w).weather,null);assert.throws(()=>parseWeather({...forecast,current:{...forecast.current,time:'2020-01-01T00:00'}},'seoul',now));
 assert.equal(new URL(weatherURL('busan')).searchParams.get('latitude'),'35.1796');
});
test('bad responses, unknown codes and a failed request are reported',async()=>{
 assert.equal(weatherKind(95),'storm');assert.equal(weatherKind(73),'snow');assert.equal(weatherKind(45),'fog');assert.equal(weatherKind(999),null);
 assert.throws(()=>parseWeather({current:{temperature_2m:'20'}},'seoul',now));
 await assert.rejects(fetchWeather('seoul',{now,fetcher:async()=>({ok:false})}),/실패/);
});
test('legacy 24-hour clock settles once then adopts calendar time without an extra partial-day award',()=>{
 const s=newGame(now);s.settings.realTime=true;s.clock.anchorAt=now-2.5*DAY_MS;
 migrateSave(s,now);assert.equal(s.day,3);assert.equal(s.clock.calendar,true);assert.equal(nextDayAt(s),Date.parse('2026-10-05T00:00:00+09:00'));
 assert.equal(syncRealTime(s,now).days,0);migrateSave(s,now+1000);assert.equal(s.day,3);
 assert.equal(syncRealTime(s,nextDayAt(s)).days,1);assert.equal(syncRealTime(s,nextDayAt(s)-1).days,0);
});
test('new midnight clock grants one day at a month boundary and does not duplicate it after reload',()=>{
 const t=Date.parse('2026-10-31T23:59:59+09:00'),s=newGame(t);setTimeOptions(s,{realTime:true,realGrowth:false},t);
 const boundary=nextDayAt(s);assert.equal(syncRealTime(s,boundary-1).days,0);assert.equal(syncRealTime(s,boundary).days,1);
 assert.equal(syncRealTime(JSON.parse(JSON.stringify(s)),boundary).days,0);
});
test('well-maintained substrate produces mostly 70mm-class flat males and rare 80mm males',()=>{
 const bugs=Array.from({length:120},(_,i)=>raised(i+17)).flat(),males=bugs.filter(b=>b.sex==='male'),females=bugs.filter(b=>b.sex==='female');
 assert.ok(males.length>100);assert.ok(males.every(b=>b.length>=70&&b.length<=82));assert.ok(males.some(b=>b.length>=80));assert.ok(males.filter(b=>b.length>=80).length/males.length<.15);assert.ok(females.every(b=>b.length>=34));
});
test('premium substrate occasionally produces 80mm males while food neglect reduces growth',()=>{
 const premium=Array.from({length:120},(_,i)=>raised(i+17,'stag_master')).flat().filter(b=>b.sex==='male');
 assert.ok(premium.some(b=>b.length>=80));assert.ok(premium.some(b=>b.length<80));assert.ok(premium.every(b=>b.length<=82));
 const ordinary=raised(17),neglected=raised(17,'basic_mat',true);assert.ok(ordinary.every((b,i)=>b.length>neglected[i].length));
});
test('actual parental measurements affect offspring even for identical genetic values',()=>{
 const parents=(m,f)=>[{sex:'male',length:m,genetic:.6},{sex:'female',length:f,genetic:.6}];
 const rearing={care:1,nutrition:.72};
 assert.ok(createBug('king','male',.6,1,'번식',parents(65,35),.72,rearing).length>createBug('king','male',.6,1,'번식',parents(40,25),.72,rearing).length);
});

test('king males require actual fungal feeding for large growth, including when premium mat has equal nutrition',()=>{
 const mat=Array.from({length:120},(_,i)=>raised(i+17,'stag_master',false,'king')).flat().filter(b=>b.sex==='male');
 const fungus=Array.from({length:120},(_,i)=>raised(i+17,'oohira_1400',false,'king')).flat().filter(b=>b.sex==='male');
 assert.ok(mat.every(b=>b.length<70));assert.ok(fungus.some(b=>b.length>=80));assert.ok(fungus.every(b=>b.length>=70&&b.length<=86));
});
test('a last-minute fungus switch cannot receive the full fungal growth bonus',()=>{
 const parents=[{sex:'male',length:64,genetic:.8},{sex:'female',length:34,genetic:.4}];
 const size=fungus=>createBug('king','male',.71,1,'번식',parents,1.12,{care:1,nutrition:1.12,fungus}).length;
 assert.ok(size(.05)<size(1));assert.ok(size(0)<70);assert.ok(size(1)>=80);
});
