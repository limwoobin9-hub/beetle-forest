import {EVENT_CATALOG,EVENT_TEMPLATES,EVENT_BY_KEY,eventProtocol,eventFollowup,eventTrial} from './event-catalog.js';
import {SPECIES} from './world.js';
import {keeperLevel} from './catalog.js';
import {calendarDay,stageName} from './time.js';
import {speciesTraits} from './traits.js';
import {auctionReserved} from './auctions.js';

export const EVENT_HOUR=3600000,EVENT_DAY=24*EVENT_HOUR,EVENT_RETRY=15*60000;
const STAGES=['new','investigating','waiting','ready','followup','final-wait','complete','claimed','expired'];
const ACTIVITIES=['care','capture','brood'];
const terminal=e=>e.stage==='expired'||e.stage==='claimed'&&(!EVENT_BY_KEY[e.key].guest||e.guestTaken);
const hash=text=>{let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const random=seed=>()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
const eventNote=(state,text)=>{state.log.unshift({day:state.day,text});state.log=state.log.slice(0,40);};
export function newDailyEvents(){return {version:1,dayKey:-1,activities:{care:0,capture:0,brood:0},cases:[]};}
function dataOf(state){return state.dailyEvents??=newDailyEvents();}
function clock(now){if(!Number.isFinite(now)||now<0)throw new Error('현재 시간을 확인할 수 없습니다.');}
function caseOf(state,id){const e=dataOf(state).cases.find(e=>e.id===id);if(!e)throw new Error('사건을 찾을 수 없어요.');return e;}
function liveCase(state,id,now){syncDailyEvents(state,now);const e=caseOf(state,id);if(e.stage==='expired')throw new Error('해결 시간이 끝난 사건입니다. 새 사건에 도전해 보세요.');if(e.retryAt>now)throw new Error('다른 방법의 결과를 비교하는 중이에요. 표시된 시각에 다시 확인해 주세요.');return e;}
export function eventDefinition(e){return EVENT_BY_KEY[e.key];}
export function eventProgress(state,e){return e.activity?Math.min(e.goal,Math.max(0,dataOf(state).activities[e.activity]-e.activityStart)+e.trials):0;}
export function eventReward(e){return Math.floor(e.reward*Math.max(.7,1-e.mistakes*.1));}
export function eventChoices(e,phase='first'){
 const p=phase==='first'?eventProtocol(eventDefinition(e),e.variant):phase==='followup'?eventFollowup((e.variant+e.seed%4)%4):eventTrial(e.trials+e.seed%7);
 const order=[0,1,2,3],rng=random(hash(`${e.seed}:${phase}:${e.trials}`));
 for(let i=order.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
 return {clue:p.clue,options:order.map(value=>({value,label:p.options[value]})),answer:p.answer};
}
export function syncDailyEvents(state,now=Date.now()){
 clock(now);const data=dataOf(state),day=calendarDay(now);let changed=false;
 for(const e of data.cases){
  if(!['complete','claimed','expired','new'].includes(e.stage)&&e.deadlineAt<=now){e.stage='expired';changed=true;}
  else if(e.stage==='waiting'&&e.waitUntil<=now){e.stage='ready';changed=true;}
  else if(e.stage==='final-wait'&&e.waitUntil<=now){e.stage='complete';changed=true;}
 }
 if(day>data.dayKey){
  for(const e of data.cases)if(e.stage==='new'){e.stage='expired';changed=true;}
  const rng=random(hash(`${state.clock?.anchorAt}:${state.settings?.realTime}:${day}:daily-events-v1`)),species=Object.keys(SPECIES);
  const pools=[EVENT_TEMPLATES.filter(t=>t.family==='window'||t.family==='night'),EVENT_TEMPLATES.filter(t=>['hygiene','supplies','weather','workshop','rescue'].includes(t.family)),EVENT_TEMPLATES.filter(t=>['request','exchange','habitat'].includes(t.family))];
  for(let slot=0;slot<3;slot++){
   const t=pools[slot][Math.floor(rng()*pools[slot].length)],sp=species[Math.floor(rng()*species.length)],seed=Math.floor(rng()*4294967295),variant=Math.floor(rng()*4);
   let activity=t.activity;
   if(activity==='brood'&&!state.broods.some(b=>['1령','2령','3령'].includes(stageName(b))))activity=state.bugs.length?'care':'capture';
   if(activity==='care'&&!state.bugs.length)activity='capture';
   const goal=activity==='care'?Math.max(1,Math.min(t.goal,state.bugs.length)):t.goal;
   data.cases.push({id:`${day}-${slot}-${seed}`,key:`${t.id}:${sp}`,seed,variant,firstHours:2+slot,createdAt:now,startedAt:0,deadlineAt:0,stage:'new',waitUntil:0,retryAt:0,trialAt:0,activity,goal:activity?goal:0,activityStart:0,trials:0,mistakes:0,reward:t.reward+keeperLevel(state)*25+(activity?30:0),guestTaken:false,notice:''});
  }
  data.dayKey=day;changed=true;
 }
 const recentTerminal=data.cases.filter(terminal).slice(-30),keep=new Set(recentTerminal.map(e=>e.id));
 const cases=data.cases.filter(e=>!terminal(e)||keep.has(e.id));if(cases.length!==data.cases.length){data.cases=cases;changed=true;}
 return changed;
}
export function recordEventActivity(state,kind,amount=1){if(!ACTIVITIES.includes(kind)||!Number.isSafeInteger(amount)||amount<1)throw new Error('사건 활동 기록 오류');const d=dataOf(state);d.activities[kind]+=amount;if(kind==='brood')d.activities.care+=amount;}
export function beginDailyEvent(state,id,now=Date.now()){
 const e=liveCase(state,id,now);if(e.stage!=='new')throw new Error('이미 시작한 사건입니다.');
 e.startedAt=now;e.deadlineAt=now+EVENT_DAY;e.activityStart=e.activity?dataOf(state).activities[e.activity]:0;e.stage='investigating';e.notice='먼저 단서를 읽고 준비 방법을 골라주세요.';return e;
}
export function chooseDailyEvent(state,id,phase,value,now=Date.now()){
 const e=liveCase(state,id,now);if(!['first','followup'].includes(phase)||e.stage!==(phase==='first'?'investigating':'followup'))throw new Error('현재 단계의 선택지를 골라주세요.');
 if(!Number.isInteger(value)||value<0||value>3)throw new Error('선택지를 골라주세요.');
 const p=eventChoices(e,phase);
 if(value!==p.answer){e.mistakes++;e.retryAt=now+EVENT_RETRY;e.notice='단서와 한 조건씩 비교하는 원칙을 다시 확인하세요. 15분 뒤 새 시험 결과로 재도전할 수 있어요.';return {correct:false,event:e};}
 e.retryAt=0;
 if(phase==='first'){const hours=e.firstHours;e.waitUntil=now+hours*EVENT_HOUR;e.stage=hours?'waiting':'ready';e.notice=hours?'준비 완료 · 관찰 결과를 기다려 주세요.':'준비 완료 · 결과를 확인할 수 있어요.';}
 else {e.stage='final-wait';e.waitUntil=now+(2+e.seed%3)*EVENT_HOUR;e.notice='중간 판정 완료 · 후속 관찰을 진행해요. 최종 결과가 나오면 보상을 받을 수 있어요.';}
 return {correct:true,event:e};
}
export function checkDailyEvent(state,id,now=Date.now()){
 const e=liveCase(state,id,now);if(e.stage!=='ready')throw new Error('관찰이 끝나는 시각에 결과를 확인해 주세요.');
 if(e.activity&&eventProgress(state,e)<e.goal)throw new Error('실제 활동 또는 보조 시료 검사를 먼저 완료해 주세요.');
 e.stage='followup';e.notice='새로 나온 기록을 읽고 결과를 판정해 주세요.';return e;
}
export function runEventTrial(state,id,value,now=Date.now()){
 const e=liveCase(state,id,now);if(!['waiting','ready'].includes(e.stage)||!e.activity||eventProgress(state,e)>=e.goal)throw new Error('현재 보조 검사가 필요하지 않아요.');
 if(e.trialAt>now)throw new Error('다음 보조 시료가 준비되는 시각에 확인해 주세요.');
 if(!Number.isInteger(value)||value<0||value>3)throw new Error('검사 결과를 골라주세요.');
 if(value!==eventChoices(e,'trial').answer){e.mistakes++;e.retryAt=now+EVENT_RETRY;e.notice='용기의 무게를 빼고 내용물만 기록하세요. 15분 뒤 재검사할 수 있어요.';return {correct:false,event:e};}
 e.trials++;e.trialAt=now+EVENT_RETRY;e.notice='보조 검사 기록 완료 · 실제 활동 대신 이 기록을 사용할 수 있어요.';return {correct:true,event:e};
}
export function claimDailyEvent(state,id,now=Date.now()){
 const e=liveCase(state,id,now);if(e.stage!=='complete')throw new Error('사건을 해결한 뒤 보상을 받을 수 있어요.');
 const coins=eventReward(e);state.coins+=coins;state.xp+=20;e.stage='claimed';eventNote(state,`사건 해결 · ${eventDefinition(e).title} · ${coins} 잎사귀`);return {coins,guest:eventDefinition(e).guest,event:e};
}
export function takeEventGuest(state,id,createBug,now=Date.now()){
 const e=liveCase(state,id,now),t=eventDefinition(e);if(e.stage!=='claimed'||!t.guest||e.guestTaken)throw new Error('받을 수 있는 사건 손님이 없어요.');
 if(state.bugs.length+state.broods.length*3+auctionReserved(state)>=48)throw new Error('사육 공간을 마련하면 손님을 맞이할 수 있어요. 보상은 계속 보관됩니다.');
 const traits=speciesTraits(t.species),trait=traits[e.seed%traits.length]?.id;
 const b=createBug(t.species,e.seed%2?'female':'male',.72+(e.seed%23)/100,state.day,`사건 · ${t.title}`,null,1,null,{traits:trait?[trait]:[]});
 state.bugs.push(b);e.guestTaken=true;const key=b.species+'-'+b.sex;state.records[key]=Math.max(state.records[key]||0,b.length);if(!state.discoveries.includes(b.species))state.discoveries.push(b.species);
 eventNote(state,`특별한 손님 · ${SPECIES[b.species].name} · ${b.length} mm · 사건 보상`);return b;
}
export function validDailyEvents(d){
 const integer=n=>Number.isSafeInteger(n)&&n>=0,time=n=>Number.isFinite(n)&&n>=0;
 if(!d||d.version!==1||!Number.isInteger(d.dayKey)||d.dayKey< -1||!d.activities||ACTIVITIES.some(k=>!integer(d.activities[k]))||!Array.isArray(d.cases)||d.cases.length>20000)return false;
 const ids=new Set();
 for(const e of d.cases){
  if(!e||typeof e.id!=='string'||!e.id||ids.has(e.id)||!EVENT_BY_KEY[e.key]||!STAGES.includes(e.stage)||!integer(e.seed)||e.seed>4294967295||![2,3,4].includes(e.firstHours)||!Number.isInteger(e.variant)||e.variant<0||e.variant>3||![e.createdAt,e.startedAt,e.deadlineAt,e.waitUntil,e.retryAt,e.trialAt].every(time)||!integer(e.mistakes)||!integer(e.trials)||!integer(e.reward)||e.reward<1||typeof e.guestTaken!=='boolean'||typeof e.notice!=='string'||e.notice.length>500||!integer(e.goal)||e.goal>2||!integer(e.activityStart)||e.activity!==null&&!ACTIVITIES.includes(e.activity))return false;
  if(e.activity&&e.activityStart>d.activities[e.activity]||e.guestTaken&&e.stage!=='claimed'||e.activity&&e.goal<1||!e.activity&&e.goal!==0||!['new','expired'].includes(e.stage)&&e.deadlineAt!==e.startedAt+EVENT_DAY)return false;
  ids.add(e.id);
 }
 return true;
}
export {EVENT_CATALOG};
