import {EVENT_CATALOG,EVENT_FAMILIES} from './event-catalog.js';
import {eventDefinition,eventChoices,eventProgress,eventReward} from './events.js';
import {SPECIES} from './world.js';
import {speciesTraits,traitLabel} from './traits.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clock=ms=>new Date(ms).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
export function eventTimeLeft(until,now=Date.now()){const ms=Math.max(0,until-now),minutes=Math.ceil(ms/60000);return minutes>=60?`${Math.floor(minutes/60)}시간 ${minutes%60}분`:`${minutes}분`;}
const time=(until,label)=>`<span class="event-time">${label} <b class="event-clock" data-event-until="${until}">${eventTimeLeft(until)}</b><small>확인 시각 ${clock(until)} · 한국 시각</small></span>`;
const action=(label,kind,id,extra='',disabled=false)=>`<button class="btn event-action" data-action="${kind}" data-id="${esc(id)}" ${extra} ${disabled?'disabled':''}>${label}</button>`;
const choices=(e,phase,now)=>{const p=eventChoices(e,phase),kind=phase==='trial'?'event-trial':'event-choice';return `<div class="event-clue"><strong>${phase==='first'?'첫 조사 단서':phase==='followup'?'새로 나온 관찰 기록':'보조 시료 검사'}</strong><p>${esc(p.clue)}</p></div><div class="event-options">${p.options.map(o=>action(esc(o.label),kind,e.id,`data-phase="${phase}" data-value="${o.value}"`,e.retryAt>now||phase==='trial'&&e.trialAt>now)).join('')}</div>`;};
function activity(state,e,now){
 if(!e.activity)return '';const progress=eventProgress(state,e),label={care:'젤리·성충 깔개·유충 먹이 교체',capture:'채집 성공',brood:'유충 먹이 교체'}[e.activity];
 return `<div class="event-mission"><strong>관찰 중 활동 · ${progress} / ${e.goal}</strong><p>${label} ${e.goal}회 또는 보조 시료 검사로 기록을 채워주세요.</p>${progress<e.goal?`<button class="btn" data-action="nav" data-view="${e.activity==='capture'?'forest':e.activity==='brood'?'breed':'room'}">${e.activity==='capture'?'채집':e.activity==='brood'?'번식통':'사육실'} 이동</button><details class="event-trial"><summary>보조 검사로 기록 채우기</summary><p>사육 공간이나 용품이 부족해도 제공된 시험 시료로 진행할 수 있어요.</p>${choices(e,'trial',now)}${e.trialAt>now?time(e.trialAt,'다음 시료까지'):''}</details>`:'<small>활동 기록을 모두 채웠어요.</small>'}</div>`;
}
function card(state,e,now){
 const t=eventDefinition(e),stages={new:'새 사건',investigating:'첫 조사',waiting:'1차 관찰 중',ready:'중간 확인 가능',followup:'중간 판정', 'final-wait':'후속 관찰 중',complete:'해결 완료',claimed:'보상 수령',expired:'기한 종료'};
 let body='';
 if(e.stage==='new')body=`<p class="event-route">첫 조사 → ${e.firstHours}시간 관찰 → 중간 판정 → 2~4시간 후속 관찰 → 최종 보상</p>${action('조사 시작 · 24시간 기한','event-start',e.id)}`;
 else if(e.stage==='investigating')body=choices(e,'first',now);
 else if(['waiting','ready'].includes(e.stage))body=`${e.stage==='waiting'?time(e.waitUntil,'첫 결과까지'):'<strong class="event-ready">중간 관찰 기록이 도착했어요.</strong>'}${activity(state,e,now)}${action('중간 결과 확인','event-check',e.id,'',e.stage==='waiting'||e.activity&&eventProgress(state,e)<e.goal||e.retryAt>now)}`;
 else if(e.stage==='followup')body=choices(e,'followup',now);
 else if(e.stage==='final-wait')body=`${time(e.waitUntil,'최종 결과까지')}<p>중간 판정을 바탕으로 후속 관찰을 진행하고 있어요.</p>`;
 else if(e.stage==='complete')body=`<strong class="event-ready">하루의 조사가 끝났어요!</strong>${action(`${eventReward(e)} 잎사귀 받기`,'event-claim',e.id)}`;
 else if(e.stage==='claimed'&&t.guest&&!e.guestTaken){const sex=e.seed%2?'female':'male',traits=speciesTraits(t.species),trait=traits[e.seed%traits.length]?.id;body=`<div class="event-guest"><strong>✦ 특별한 손님이 기다려요</strong><p>${SPECIES[t.species].name} · ${sex==='male'?'수컷':'암컷'} · ${trait?esc(traitLabel(trait,sex)):'특별한 방문객'}</p><small>사육 공간을 마련할 때까지 보관됩니다.</small>${action('손님을 사육실로 맞이하기','event-guest',e.id)}</div>`;}
 else if(e.stage==='claimed')body='<p>보상을 받았어요. 내일 새로운 사건이 찾아와요.</p>';
 else body='<p>조사 기한이 끝났어요. 새 사건에 도전할 수 있어요.</p>';
 return `<article class="event-card ${e.stage==='complete'||e.stage==='ready'?'event-card-ready':''}" data-event-id="${esc(e.id)}"><div class="event-card-head"><span>${EVENT_FAMILIES[t.family]} · ${SPECIES[t.species].name}</span><b>${stages[e.stage]}</b></div><h3>${t.title}</h3><p class="event-scene">${esc(t.scene.replaceAll('{species}',SPECIES[t.species].name))}</p><div class="event-reward">보상 ${eventReward(e)} 잎사귀${t.guest?' · 희귀 특성 손님':''} · 경험치 20</div>${e.startedAt&&!['complete','claimed','expired'].includes(e.stage)?`<small class="event-deadline">해결 기한 ${clock(e.deadlineAt)} · <span class="event-clock" data-event-until="${e.deadlineAt}">${eventTimeLeft(e.deadlineAt,now)}</span> 남음</small>`:''}${e.notice?`<p class="event-notice" role="status">${esc(e.notice)}</p>`:''}${e.retryAt>now?time(e.retryAt,'새 비교 결과까지'):''}<div class="event-card-body">${body}</div></article>`;
}
export function eventsScreen(state,now=Date.now()){
 const cases=state.dailyEvents?.cases||[],active=cases.filter(e=>!['expired','claimed'].includes(e.stage)||e.stage==='claimed'&&eventDefinition(e).guest&&!e.guestTaken),history=cases.filter(e=>!active.includes(e)).slice(-9).reverse();
 return `<section class="event-intro"><div><h2>오늘의 사건</h2><span class="pill">${EVENT_CATALOG.length}가지 사건 · 매일 3개</span></div><p>조사하고, 기다리고, 다시 판단하는 작은 숲의 하루.</p><small>사건당 최소 세 번 방문 · 첫 관찰 2~4시간 + 후속 관찰 2~4시간<br>한국 날짜 기준으로 새 사건이 도착하며, 시작한 사건은 24시간 동안 진행할 수 있어요. 두 세계의 사건과 보상은 따로 저장됩니다.</small><details><summary>사건 진행과 보상 안내</summary><p>응애·곰팡이 등은 제공된 시험통과 시료를 조사하는 사건이에요. 사건이 사육 중인 곤충을 다치게 하거나 용품을 없애지 않아요. 단서에 맞지 않는 선택은 15분 뒤 재시도하며, 보상은 시도에 따라 최대 30% 줄어요. 완료한 보상과 공간을 기다리는 손님은 기한이 지나도 보관됩니다. 상상의 숲에서 다음 날 버튼을 눌러도 사건의 관찰 시간은 실제 시간으로 흐릅니다.</p></details></section><div class="event-grid">${active.map(e=>card(state,e,now)).join('')}</div>${history.length?`<details class="event-history"><summary>최근 사건 기록 ${history.length}개</summary><div class="event-grid">${history.map(e=>card(state,e,now)).join('')}</div></details>`:''}`;
}
export function eventBanner(state){const cases=state.dailyEvents?.cases||[],ready=cases.filter(e=>['ready','complete'].includes(e.stage)).length,active=cases.filter(e=>!['claimed','expired'].includes(e.stage)).length;return `<button class="event-banner" data-action="nav" data-view="events"><span><strong>오늘의 사건</strong><small>${ready?`확인할 결과 ${ready}개`:`진행할 사건 ${active}개`} · 시간에 맞춰 다시 찾아오세요</small></span><b>사건 보기 →</b></button>`;}
export function updateEventClocks(now=Date.now()){for(const el of document.querySelectorAll('.event-clock'))el.textContent=eventTimeLeft(Number(el.dataset.eventUntil),now);}
