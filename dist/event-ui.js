import {eventDefinition,eventStep,eventReward} from './events.js';
import {SPECIES} from './world.js';
import {PRODUCTS} from './catalog.js';
import {speciesTraits,traitLabel} from './traits.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=ms=>new Date(ms).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
export function eventTimeLeft(until,now=Date.now()){const minutes=Math.ceil(Math.max(0,until-now)/60000);return minutes>=60?Math.floor(minutes/60)+'시간 '+minutes%60+'분':minutes+'분';}
const button=(label,action,id,disabled=false)=>'<button class="btn event-action" data-action="'+action+'" data-id="'+esc(id)+'" '+(disabled?'disabled':'')+'>'+esc(label)+'</button>';
const fill=(text,t)=>text.replaceAll('{species}',SPECIES[t.species].name);
function guest(e,t){
 const traits=speciesTraits(t.species),trait=e.rareGuest?traits[e.seed%traits.length]?.id:null;
 return SPECIES[t.species].name+(trait?' · '+traitLabel(trait,e.seed%2?'female':'male'):'');
}
function card(e,now){
 const t=eventDefinition(e),step=eventStep(e),status={new:'시작 전',working:'작업 중','step-ready':'다음 작업 가능',ready:'작업 완료',claimed:'보상 받음',expired:'기한 종료'};
 let body='';
 if(e.stage==='new')body='<p class="event-duration">총 작업 '+t.hours+'시간'+(t.steps.length>1?' · '+t.steps.length+'단계':'')+'</p>'+button(step.start,'event-start',e.id);
 else if(e.stage==='working'){
  const percent=Math.max(0,Math.min(100,(now-e.stepStartedAt)/(e.waitUntil-e.stepStartedAt)*100));
  body='<p class="event-work">'+esc(step.working)+'</p><div class="event-time">남은 시간 <b class="event-clock" data-event-until="'+e.waitUntil+'">'+eventTimeLeft(e.waitUntil,now)+'</b><small>'+clock(e.waitUntil)+'에 '+esc(e.step===t.steps.length-1?t.finish:t.steps[e.step+1].start)+' 가능</small></div><div class="event-progress" role="progressbar" aria-label="작업 진행" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.floor(percent)+'" data-start="'+e.stepStartedAt+'" data-end="'+e.waitUntil+'"><span style="width:'+percent+'%"></span></div>';
 }else if(e.stage==='step-ready')body='<p class="event-work">'+esc(step.done||'현재 작업을 마쳤어요.')+'</p><p class="event-duration">다음 작업 '+t.steps[e.step+1].hours+'시간</p>'+button(t.steps[e.step+1].start,'event-continue',e.id);
 else if(e.stage==='ready')body='<p class="event-ready">마지막 작업을 마쳤어요.</p>'+button(t.finish,'event-claim',e.id);
 else if(e.stage==='claimed')body='<p class="event-result">'+esc(t.result)+'</p><p class="event-ready">'+eventReward(e)+' 잎사귀를 받았어요.</p>'+(!e.legacy&&t.item?'<p>'+esc(PRODUCTS[t.item].name)+' '+t.qty+'개를 받았어요.</p>':'')+(e.guest?(e.guestTaken?'<p>'+esc(guest(e,t))+'가 사육실에 들어왔어요.</p>':'<div class="event-guest"><strong>'+esc(guest(e,t))+'</strong><p>사육 공간이 생기면 데려올 수 있어요.</p>'+button('손님 사육실에 데려오기','event-guest',e.id)+'</div>'):'');
 else body='<p>기한이 끝났어요.</p>';
 const bonus=e.guest?' · '+guest(e,t):!e.legacy&&t.item?' · '+PRODUCTS[t.item].name+' '+t.qty+'개':'';
 const ctx=e.context,weather=({rain:'비',storm:'뇌우',snow:'눈',clear:'맑음',cloud:'구름',fog:'안개'})[ctx.weather],context=ctx.period==='night'&&t.family==='night'?'밤에 찾아온 손님':weather&&(t.family==='weather'||t.job==='coldGuest')?(ctx.region?ctx.region+' · ':'')+weather:'';
 return '<article class="event-card mission-card '+(t.tone==='bad'?'mission-problem':'mission-good')+'" data-event-id="'+esc(e.id)+'"><div class="event-card-head"><span class="mission-tone">'+(t.tone==='bad'?'문제 발생':'좋은 소식')+'</span><b>'+status[e.stage]+(e.startedAt&&t.steps.length>1?' · '+(e.step+1)+'/'+t.steps.length:'')+'</b></div><h3>'+esc(t.title)+'</h3><p class="event-scene">'+esc(fill(t.scene,t))+'</p>'+(context?'<small class="mission-context">'+esc(context)+'</small>':'')+'<div class="event-reward">보상 '+eventReward(e)+' 잎사귀'+esc(bonus)+'</div>'+(e.startedAt&&['working','step-ready'].includes(e.stage)?'<small class="event-deadline">미션 기한 '+clock(e.deadlineAt)+' · <span class="event-clock" data-event-until="'+e.deadlineAt+'">'+eventTimeLeft(e.deadlineAt,now)+'</span> 남음</small>':'')+'<div class="event-card-body">'+body+'</div></article>';
}
export function eventsScreen(state,now=Date.now()){
 const d=state.dailyEvents,current=d?.cases.find(e=>!e.legacy&&e.dayKey===d.dayKey),past=(d?.cases||[]).filter(e=>e!==current&&(e.stage!=='expired'||e.startedAt)).slice().reverse();
 const pending=past.filter(e=>['working','step-ready','ready'].includes(e.stage)||e.stage==='claimed'&&e.guest&&!e.guestTaken),history=past.filter(e=>!pending.includes(e)).slice(0,9);
 return '<section class="event-intro mission-heading"><div><h2>오늘의 사건</h2><span class="pill">하루 1개</span></div></section><div class="mission-current">'+(current?card(current,now):'<p class="mission-loading">날씨 확인 중…</p>')+'</div>'+(pending.length?'<details class="event-history mission-pending"><summary>이전 작업·받을 보상 '+pending.length+'개</summary><div class="mission-past">'+pending.map(e=>card(e,now)).join('')+'</div></details>':'')+(history.length?'<details class="event-history"><summary>지난 사건</summary><div class="mission-past">'+history.map(e=>card(e,now)).join('')+'</div></details>':'');
}
export function eventBanner(state){
 const d=state.dailyEvents,e=d?.cases.find(e=>!e.legacy&&e.dayKey===d.dayKey);
 const text=e?e.stage==='working'?eventStep(e).start+' · 작업 중':e.stage==='step-ready'?'다음 작업을 시작할 수 있어요':e.stage==='ready'?'작업 완료 · 보상 받기':eventDefinition(e).title:'날씨 확인 중…';
 return '<button class="event-banner" data-action="nav" data-view="events"><span><strong>오늘의 사건</strong><small>'+esc(text)+'</small></span><b>사건 보기 →</b></button>';
}
export function updateEventClocks(now=Date.now()){
 for(const el of document.querySelectorAll('.event-clock'))el.textContent=eventTimeLeft(Number(el.dataset.eventUntil),now);
 for(const el of document.querySelectorAll('.event-progress')){const progress=Math.max(0,Math.min(100,(now-Number(el.dataset.start))/(Number(el.dataset.end)-Number(el.dataset.start))*100));el.setAttribute('aria-valuenow',String(Math.floor(progress)));el.querySelector('span').style.width=progress+'%';}
}
