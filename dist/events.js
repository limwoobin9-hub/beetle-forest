import {EVENT_CATALOG,EVENT_TEMPLATES,EVENT_BY_KEY} from './event-catalog.js';
import {SPECIES} from './world.js';
import {PRODUCTS,keeperLevel,syncSupplies} from './catalog.js';
import {calendarDay} from './time.js';
import {roomEnvironment} from './environment.js';
import {speciesTraits} from './traits.js';
import {auctionReserved} from './auctions.js';

export const EVENT_HOUR=3600000,EVENT_DAY=24*EVENT_HOUR;
const STAGES=['new','working','step-ready','ready','claimed','expired'];
const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const random=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const eventNote=(s,text)=>{s.log.unshift({day:s.day,text});s.log=s.log.slice(0,40);};
const terminal=e=>e.stage==='expired'||e.stage==='claimed'&&(!e.guest||e.guestTaken);
export function newDailyEvents(){return {version:2,dayKey:-1,cases:[]};}
export function eventDefinition(e){return EVENT_BY_KEY[e.key];}
export function eventReward(e){return e.reward;}
export function eventStep(e){return eventDefinition(e).steps[e.step];}
export function eventRemainingWork(e){return eventDefinition(e).steps.slice(e.step+1).reduce((n,p)=>n+p.hours*EVENT_HOUR,0);}
function legacyGuest(e){const [family,index]=e.key.split(':')[0].split('-');return family==='window'||family==='night'||family==='rescue'&&Number(index)%2===0;}
export function migrateDailyEvents(state,now=Date.now()){
 if(!state.dailyEvents){state.dailyEvents=newDailyEvents();return true;}
 const old=state.dailyEvents;if(old.version===2)return false;
 if(old.version!==1)throw new Error('사건 저장을 읽을 수 없어요.');
 const data=newDailyEvents();
 for(const e of old.cases){
  if(e.stage==='new'||e.stage==='expired')continue;
  const t=eventDefinition(e),startedAt=e.startedAt||e.createdAt,waitUntil=e.waitUntil||startedAt+t.hours*EVENT_HOUR;
  const stage=e.stage==='claimed'?'claimed':e.stage==='complete'||waitUntil<=now?'ready':'working';
  data.cases.push({id:'previous-'+e.id,key:e.key,dayKey:calendarDay(e.createdAt),seed:e.seed,createdAt:e.createdAt,startedAt,deadlineAt:e.deadlineAt||startedAt+EVENT_DAY,step:t.steps.length-1,stepStartedAt:startedAt,waitUntil,stage,reward:Math.floor(e.reward*Math.max(.7,1-e.mistakes*.1)),guest:legacyGuest(e),rareGuest:legacyGuest(e),guestTaken:e.guestTaken,targetIds:[],context:{period:'day',weather:null,region:'',temperature:null},legacy:true});
 }
 state.dailyEvents=data;return true;
}
function dataOf(s,now){migrateDailyEvents(s,now);return s.dailyEvents;}
function clock(now){if(!integer(now))throw new Error('현재 시간을 확인할 수 없어요.');}
function caseOf(s,id){const e=s.dailyEvents.cases.find(e=>e.id===id);if(!e)throw new Error('미션을 찾을 수 없어요.');return e;}
function liveCase(s,id,now){syncDailyEvents(s,now);const e=caseOf(s,id);if(e.stage==='expired')throw new Error('미션 기한이 끝났어요.');return e;}
function eligible(s,t,env){
 if(t.requires==='insects'&&!s.bugs.length&&!s.broods.length)return false;
 if(t.requires==='brood'&&!s.broods.some(b=>PRODUCTS[b.medium]?.kind==='fungus'))return false;
 if(t.requires==='stock'&&!Object.entries(s.inventory).some(([id,n])=>n>0&&PRODUCTS[id]?.kind==='mat'))return false;
 if(t.family==='night'&&env.period!=='night')return false;
 if(t.job==='rain'&&!['rain','storm'].includes(env.weather))return false;
 if(t.job==='heat'&&!(env.temperature>=28&&env.period!=='night'))return false;
 return true;
}
function weight(t,env){
 let n=1;
 if(env.period==='night'&&t.family==='night')n*=7;
 if(['rain','storm'].includes(env.weather)&&['rain','coldGuest','wetMat'].includes(t.job))n*=6;
 if(env.weather==='storm'&&t.job==='wind')n*=6;
 if(env.temperature>=28&&t.job==='heat')n*=6;
 if(env.weather==='snow'&&t.job==='coldGuest')n*=6;
 return n;
}
function pick(pool,rng,env){
 const total=pool.reduce((n,t)=>n+weight(t,env),0);let roll=rng()*total;
 for(const t of pool){roll-=weight(t,env);if(roll<=0)return t;}return pool.at(-1);
}
export function syncDailyEvents(state,now=Date.now(),environment={}){
 clock(now);let changed=migrateDailyEvents(state,now);const data=state.dailyEvents,day=calendarDay(now);
 for(const e of data.cases){
  if(e.stage==='working'&&e.waitUntil<=now&&e.waitUntil<=e.deadlineAt){e.stage=e.step===eventDefinition(e).steps.length-1?'ready':now>=e.deadlineAt?'expired':'step-ready';changed=true;}
  else if(['working','step-ready'].includes(e.stage)&&now>=e.deadlineAt){e.stage='expired';changed=true;}
 }
 if(day>data.dayKey&&!environment.pending){
  for(const e of data.cases)if(e.stage==='new'){e.stage='expired';changed=true;}
  const actual=roomEnvironment(now),env={period:environment.period||actual.period,weather:environment.weather||null,temperature:Number.isFinite(environment.temperature)?environment.temperature:null,region:typeof environment.region==='string'?environment.region:''};
  const rng=random(hash(String(state.clock?.anchorAt)+':'+state.settings?.realTime+':'+day+':missions-v2'));
  const tone=rng()<.5?'good':'bad',recent=new Set(data.cases.filter(e=>!e.legacy).slice(-7).map(e=>eventDefinition(e).id));
  let pool=EVENT_TEMPLATES.filter(t=>t.tone===tone&&eligible(state,t,env)&&!recent.has(t.id));
  if(!pool.length)pool=EVENT_TEMPLATES.filter(t=>t.tone===tone&&eligible(state,t,env));
  const t=pick(pool,rng,env);
  const owned=[...state.bugs,...state.broods].map(b=>b.species),species=t.tone==='bad'&&t.requires==='insects'&&owned.length?owned:t.requires==='brood'&&state.broods.length?state.broods.map(b=>b.species):Object.keys(SPECIES).filter(sp=>!SPECIES[sp].foreign);
  const sp=species[Math.floor(rng()*species.length)],seed=Math.floor(rng()*4294967295);
  data.cases.push({id:day+'-mission-'+seed,key:t.id+':'+sp,dayKey:day,seed,createdAt:now,startedAt:0,deadlineAt:0,step:0,stepStartedAt:0,waitUntil:0,stage:'new',reward:t.reward+keeperLevel(state)*25,guest:t.guest,rareGuest:t.rareGuest,guestTaken:false,targetIds:[],context:env,legacy:false});
  data.dayKey=day;changed=true;
 }
 const keep=new Set(data.cases.filter(terminal).slice(-30).map(e=>e.id)),cases=data.cases.filter(e=>!terminal(e)||keep.has(e.id));
 if(cases.length!==data.cases.length){data.cases=cases;changed=true;}return changed;
}
export function beginDailyEvent(state,id,now=Date.now()){
 const e=liveCase(state,id,now);if(e.stage!=='new')throw new Error('이미 시작한 미션이에요.');
 e.startedAt=now;e.deadlineAt=now+EVENT_DAY;e.stepStartedAt=now;e.waitUntil=now+eventStep(e).hours*EVENT_HOUR;e.stage='working';
 e.targetIds=state.bugs.map(b=>b.id);eventNote(state,'미션 시작 · '+eventDefinition(e).title);return e;
}
export function continueDailyEvent(state,id,now=Date.now()){
 const e=liveCase(state,id,now);if(e.stage!=='step-ready')throw new Error('현재 작업을 마친 뒤 진행할 수 있어요.');
 if(now+eventRemainingWork(e)>e.deadlineAt)throw new Error('남은 작업을 마치기에는 시간이 부족해요. 미션 기한은 시작 후 24시간이에요.');
 e.step++;e.stepStartedAt=now;e.waitUntil=now+eventStep(e).hours*EVENT_HOUR;e.stage='working';return e;
}
export function claimDailyEvent(state,id,now=Date.now()){
 const e=liveCase(state,id,now);if(e.stage!=='ready')throw new Error('작업을 모두 마친 뒤 보상을 받을 수 있어요.');
 const t=eventDefinition(e),coins=e.reward;state.coins+=coins;state.xp+=20;e.stage='claimed';
 // Old completed missions already promised money/guests, not new item bonuses.
 const item=!e.legacy&&t.item?t.item:null,qty=item?t.qty:0;
 if(item){state.inventory[item]=(state.inventory[item]||0)+qty;syncSupplies(state);}
 if(!e.legacy&&t.clean)for(const b of state.bugs)if(e.targetIds.includes(b.id))b.hygiene=100;
 eventNote(state,'미션 완료 · '+t.title+' · '+coins+' 잎사귀');
 return {coins,item,qty,guest:e.guest,event:e};
}
export function takeEventGuest(state,id,createBug,now=Date.now()){
 const e=liveCase(state,id,now),t=eventDefinition(e);if(e.stage!=='claimed'||!e.guest||e.guestTaken)throw new Error('받을 손님이 없어요.');
 if(state.bugs.length+state.broods.length*3+auctionReserved(state)>=48)throw new Error('사육 공간을 마련하면 손님을 데려올 수 있어요. 손님은 계속 기다립니다.');
 const traits=speciesTraits(t.species),trait=e.rareGuest?traits[e.seed%traits.length]?.id:null;
 const b=createBug(t.species,e.seed%2?'female':'male',.72+(e.seed%23)/100,state.day,'사건 · '+t.title,null,1,null,{traits:trait?[trait]:[]});
 state.bugs.push(b);e.guestTaken=true;const key=b.species+'-'+b.sex;state.records[key]=Math.max(state.records[key]||0,b.length);if(!state.discoveries.includes(b.species))state.discoveries.push(b.species);
 eventNote(state,'새 손님 · '+SPECIES[b.species].name+' · '+b.length+' mm');return b;
}
function validLegacy(d){
 const times=n=>Number.isFinite(n)&&n>=0,stages=['new','investigating','waiting','ready','followup','final-wait','complete','claimed','expired'],activities=['care','capture','brood'];
 if(!d||d.version!==1||!Number.isInteger(d.dayKey)||d.dayKey< -1||!d.activities||activities.some(k=>!integer(d.activities[k]))||!Array.isArray(d.cases)||d.cases.length>20000)return false;
 const ids=new Set();for(const e of d.cases){
  if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||!EVENT_BY_KEY[e.key]||!stages.includes(e.stage)||!integer(e.seed)||e.seed>4294967295||![2,3,4].includes(e.firstHours)||!Number.isInteger(e.variant)||e.variant<0||e.variant>3||![e.createdAt,e.startedAt,e.deadlineAt,e.waitUntil,e.retryAt,e.trialAt].every(times)||!integer(e.mistakes)||!integer(e.trials)||!integer(e.reward)||e.reward<1||typeof e.guestTaken!=='boolean'||typeof e.notice!=='string'||e.notice.length>500||!integer(e.goal)||e.goal>2||!integer(e.activityStart)||e.activity!==null&&!activities.includes(e.activity))return false;
  if(e.activity&&e.activityStart>d.activities[e.activity]||e.guestTaken&&e.stage!=='claimed'||e.activity&&e.goal<1||!e.activity&&e.goal!==0||!['new','expired'].includes(e.stage)&&e.deadlineAt!==e.startedAt+EVENT_DAY)return false;ids.add(e.id);
 }return true;
}
export function validDailyEvents(d){
 if(d?.version===1)return validLegacy(d);
 if(!d||d.version!==2||!Number.isInteger(d.dayKey)||d.dayKey< -1||!Array.isArray(d.cases)||d.cases.length>20000)return false;
 const ids=new Set(),days=new Set();
 for(const e of d.cases){
  const t=EVENT_BY_KEY[e?.key];
  if(!t||typeof e.id!=='string'||!e.id||ids.has(e.id)||!integer(e.dayKey)||!integer(e.seed)||e.seed>4294967295||!STAGES.includes(e.stage)||![e.createdAt,e.startedAt,e.deadlineAt,e.stepStartedAt,e.waitUntil].every(integer)||!integer(e.reward)||e.reward<1||!integer(e.step)||e.step>=t.steps.length||typeof e.guest!=='boolean'||typeof e.rareGuest!=='boolean'||typeof e.guestTaken!=='boolean'||typeof e.legacy!=='boolean'||!Array.isArray(e.targetIds)||e.targetIds.length>48||new Set(e.targetIds).size!==e.targetIds.length||e.targetIds.some(id=>typeof id!=='string'||!id||id.length>120))return false;
  if(!e.context||!['morning','day','evening','night'].includes(e.context.period)||![null,'clear','cloud','fog','rain','snow','storm'].includes(e.context.weather)||typeof e.context.region!=='string'||e.context.region.length>40||e.context.temperature!==null&&!Number.isFinite(e.context.temperature))return false;
  if(e.rareGuest&&!e.guest||e.guestTaken&&(!e.guest||e.stage!=='claimed'))return false;
  if(['ready','claimed'].includes(e.stage)&&e.step!==t.steps.length-1||e.stage==='step-ready'&&e.step===t.steps.length-1)return false;
  if(!e.legacy){if(days.has(e.dayKey)||e.guest!==t.guest||e.rareGuest!==t.rareGuest)return false;days.add(e.dayKey);}
  if(e.stage==='new'&&(e.startedAt!==0||e.deadlineAt!==0||e.stepStartedAt!==0||e.waitUntil!==0||e.step!==0))return false;
  if(!['new','expired'].includes(e.stage)&&(e.deadlineAt!==e.startedAt+EVENT_DAY||e.waitUntil<e.stepStartedAt||e.stepStartedAt<e.startedAt||!e.legacy&&e.waitUntil!==e.stepStartedAt+t.steps[e.step].hours*EVENT_HOUR))return false;
  if(!e.legacy&&e.startedAt&&e.waitUntil>e.deadlineAt)return false;
  ids.add(e.id);
 }return true;
}
export {EVENT_CATALOG};
