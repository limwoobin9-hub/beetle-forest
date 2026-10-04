import {SPECIES,LOCATIONS,newGame,care,buy,startExpedition,inspectSpot,approachInsect,finishCapture,cancelExpedition,migrateSave,breed,broodStage,careBrood,advanceDay,makeOpponent,advanceFight,retreatFight,combatRating,train,placeTrap,checkTrap,claimResearch,captureDifficulty,validateSave,release,rename,round,syncRealTime,setTimeOptions,toggleFavorite,CRITICAL_HEALTH,CRITICAL_DAYS,SPECIMEN_CASE_COST,careAidStatus,claimCareAid,prepareSpecimen,workSpecimen,storeSpecimen,addSpecimenCase} from './engine.js';
import {icon,spriteURL,productURL,drawRoom,drawForest,drawBattle,drawBrood} from './art.js';

import {PRODUCTS,SHOP_AREAS,LEVEL_XP,keeperLevel,shopAccess,compatibleFood,inventoryCount,isLarva} from './catalog.js';

import {currentResearch,RESEARCH_REQUESTS} from './research.js';
import {habitatState,habitatLabel} from './habitat.js';
import {DAY_MS,growthDays,growthDurations,remainingGrowthDays,nextDayAt} from './time.js';
import {SORT_OPTIONS,collectionView,staminaCapacity} from './collection.js';
import {specimenPhase,specimenImage,specimenBench,specimenCases} from './specimen-ui.js';
import {bindSpecimenControls} from './specimen-controls.js';
import {WORLDS,getWorld,worldKeys,initializeWorlds,loadWorld,saveWorld,worldSummary} from './worlds.js';

const app=document.querySelector('#app'),modal=document.querySelector('#modal'),modalContent=document.querySelector('#modal-content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mm=v=>Number(v).toFixed(1),sexName=s=>s==='male'?'수컷':'암컷',sexMark=s=>s==='male'?'♂':'♀';
const iconCache=new Map();
const ico=name=>{if(!iconCache.has(name))iconCache.set(name,icon(name));return `<img class="icon" src="${iconCache.get(name)}" alt="" aria-hidden="true">`;};
const art=b=>`<img class="bug-art" src="${spriteURL(b.species,b.sex)}" alt="${SPECIES[b.species].name} ${sexName(b.sex)} 픽셀 그림">`;
const btn=(label,action,cls='',attrs='')=>`<button class="btn ${cls}" data-action="${action}" ${attrs}>${label}</button>`;
let state=newGame(),activeWorld=null,loadNotice='',saveOK=true;
try{const migrated=initializeWorlds(localStorage);if(migrated)loadNotice=`기존 사육 기록을 ${getWorld(migrated).name}에 이어 두었어요.`;}catch{saveOK=false;loadNotice='저장 공간을 사용할 수 없어요. 브라우저의 저장 공간 설정을 확인해 주세요.';}
function restoredUI(saved={}){
 const value={view:'room',selected:state.bugs[0]?.id||'',location:'oak',species:'king',filter:'all',maleId:'',femaleId:'',fighterId:'',sound:false,shopArea:'basic',jellyId:'banana',matId:'basic_mat',spawnMat:'basic_mat',broodFood:'basic_mat',trapId:'sap_trap',...saved};
 if(!['room','forest','breed','battle','book','shop','archive'].includes(value.view))value.view='room';
 if(!Object.hasOwn(LOCATIONS,value.location))value.location='oak';if(!Object.hasOwn(SPECIES,value.species))value.species='king';
 if(!['all','favorites'].includes(value.filter)&&!Object.hasOwn(SPECIES,value.filter))value.filter='all';
 if(value.filter==='favorites'){value.filter='all';value.favoritesOnly=true;}
 value.favoritesOnly=value.favoritesOnly===true;
 if(!['all','male','female'].includes(value.sexFilter))value.sexFilter='all';
 if(!SORT_OPTIONS.some(([id])=>id===value.sort))value.sort='favorites';
 if(state.fight&&!state.fight.finished)value.fighterId=state.fight.bugId;
 return value;
}
let ui=restoredUI();
const chosen=()=>state.bugs.find(b=>b.id===ui.selected)||state.bugs[0];
let toastTimer,audio,lastFightTick=0,lastPaint=0,huntPlayer={x:240,y:244},huntTarget=null,huntSpot=-1,approachUntil=0;
const heldKeys=new Set();
if(state.expedition?.player)huntPlayer={...state.expedition.player};
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500);}
function chime(type='click'){
  if(!ui.sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const t=audio.currentTime;const notes=type==='success'?[523,659,784]:type==='error'?[196,146]:[392];notes.forEach((n,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='square';o.frequency.value=n;g.gain.setValueAtTime(.017,t+i*.1);g.gain.exponentialRampToValueAtTime(.001,t+i*.1+.09);o.connect(g);g.connect(audio.destination);o.start(t+i*.1);o.stop(t+i*.1+.1);});}catch{}
}
function save(){
  if(!activeWorld)return true;
  try{saveWorld(localStorage,activeWorld,state,ui);saveOK=true;return true;}catch{saveOK=false;return false;}
}
function worldURL(id){const url=new URL(window.location.href);if(id)url.searchParams.set('world',id);else url.searchParams.delete('world');window.history.replaceState(null,'',url);}
function enterWorld(id){
 if(!getWorld(id)||activeWorld&&!save())return false;
 let loaded;try{loaded=loadWorld(localStorage,id);}catch{toast('세계의 저장 기록을 열지 못했어요. 브라우저 저장 공간을 확인해 주세요.');return false;}
 activeWorld=id;state=loaded.state;ui=restoredUI(loaded.ui);huntPlayer={...(state.expedition?.player||{x:240,y:244})};huntTarget=null;huntSpot=-1;approachUntil=0;lastFightTick=performance.now();heldKeys.clear();closeModal();worldURL(id);save();render();
 if(loaded.notice)toast(loaded.notice);else if(!saveOK)toast('저장할 수 없어요. 브라우저 저장 공간을 확인해 주세요.');
 return true;
}
function leaveWorld(){if(!save()){toast('세계 이동 전에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');return;}activeWorld=null;state=newGame();ui=restoredUI();heldKeys.clear();huntTarget=null;closeModal();worldURL(null);render();document.querySelector('#world-heading')?.focus();}
function worldEntrance(){
 return `<div class="shell entrance-shell"><header class="topbar"><div class="brand"><div class="brand-mark">${ico('bug')}</div><div><h1>작은 숲</h1><p>곤충 사육</p></div></div>${btn('↻ 새로고침','refresh','entrance-refresh')}</header><main class="world-entrance"><h2 id="world-heading" tabindex="-1">세계 선택</h2><p class="world-intro">두 세계의 곤충, 용품과 진행 기록은 각각 저장됩니다.</p><div class="world-grid">${WORLDS.map(w=>{let summary;try{summary=worldSummary(localStorage,w.id);}catch{}return `<article class="world-card ${w.id}"><div class="world-picture"><canvas class="world-scene" width="480" height="276" data-world="${w.id}" role="img" aria-label="${w.name}의 빈 사육장"></canvas><span>${w.realTime?'24시간':'버튼 진행'}</span></div><div class="world-card-body"><h3>${w.name}</h3><strong class="world-clock">${w.clock}</strong><p>${w.description}</p><p class="world-growth">${w.realTime?'실제 성장 기간 옵션 · 약 6~12개월':'빠른 성장 · 게임 내 15일'}</p><div class="world-progress">${summary?.damaged?'저장 기록 확인 필요':summary?`${summary.day}일째 · 성충 ${summary.insects}마리 · 번식통 ${summary.broods}개`:'아직 사육 기록 없음'}</div>${btn(summary&&!summary.damaged?'이어 들어가기':'들어가기','world-enter',`full ${w.realTime?'primary':'gold'}`,`data-world="${w.id}" aria-label="${w.name} 들어가기"`)}</div></article>`;}).join('')}</div>${!saveOK?'<p class="world-storage-warning" role="alert">저장 공간을 사용할 수 없어요. 브라우저 설정을 확인해 주세요.</p>':''}</main></div>`;
}
function act(fn,message){const before=structuredClone(state);try{const result=fn();save();render();if(message)toast(typeof message==='function'?message(result):message);chime('success');return result;}catch(e){state=before;render();toast(e.message);chime('error');return undefined;}}
function showModal(title,body){modalContent.innerHTML=`<div class="modal-head"><h3>${esc(title)}</h3><button class="close-btn" data-action="close" aria-label="창 닫기">×</button></div><div class="modal-body">${body}</div>`;if(!modal.open)modal.showModal();}
function closeModal(){modal.close();}
function timeLeft(){const ms=Math.max(0,(nextDayAt(state)||Date.now())-Date.now()),sec=Math.ceil(ms/1000);return `${String(Math.floor(sec/3600)).padStart(2,'0')}:${String(Math.floor(sec%3600/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function settleClock(){if(!activeWorld)return {days:0,events:[]};const result=syncRealTime(state);if(result.days){save();render();if(document.getElementById('setting-real-time'))showSettings();toast(`${result.days}일 경과 반영${result.events.length?' · 사육일지 확인 가능':''}`);}return result;}
function showSettings(){
 const {realTime,realGrowth}=state.settings;
 showModal('설정',`<div class="setting-status"><strong>${getWorld(activeWorld).name}</strong><br>${getWorld(activeWorld).clock}${realTime?`<br>다음 날: ${new Date(nextDayAt(state)).toLocaleString('ko-KR')}`:''}</div><div class="settings-options"><label class="setting-row"><div><strong>현실 시간 연동</strong><p>현실의 숲은 24시간마다 자동 진행하고, 상상의 숲은 다음 날 버튼으로 진행합니다. 시간 방식은 세계별로 정해집니다.</p></div><input id="setting-real-time" type="checkbox" role="switch" ${realTime?'checked':''} disabled aria-label="현재 세계의 현실 시간 연동"></label><label class="setting-row setting-child ${realTime?'':'unavailable'}"><div><strong>실제 성장 기간</strong><p>알부터 성충까지 종에 따라 약 6~12개월 기다립니다. 현실의 숲에서 사용할 수 있습니다.</p></div><input id="setting-real-growth" type="checkbox" role="switch" ${realGrowth?'checked':''} ${realTime?'':'disabled'} aria-label="실제 성장 기간"></label></div><p class="settings-note">성장 기간을 바꿀 때 번식통의 현재 단계와 단계 안의 진행률을 유지합니다. 다른 세계로 이동해도 각 세계의 곤충과 사육 기록은 따로 남습니다.</p><details class="growth-reference"><summary>실제 성장 기간의 기준</summary><table><thead><tr><th>종</th><th>알 → 성충</th></tr></thead><tbody>${Object.entries(SPECIES).map(([sp,v])=>`<tr><td>${v.name}</td><td>약 ${growthDays(sp,'natural')}일${['redleg','dauria','twospot'].includes(sp)?' · 추정':''}</td></tr>`).join('')}</tbody></table><p>사육 온도·먹이에 따라 실제 기간은 달라집니다. 대표적인 사육 주기를 적용하며, 희귀종은 사슴벌레의 연간 주기를 바탕으로 추정했습니다.</p></details><p class="settings-saved" role="status">변경 즉시 자동 저장</p><div class="modal-buttons">${btn('세계 선택','world-select')}${btn('새로고침','refresh')}${btn('닫기','close','primary')}</div>`);
}
const stat=(label,value,color='',max=100)=>`<div class="stat"><div class="stat-label"><span>${label}</span><span class="num">${value}<span class="muted"> / ${max}</span></span></div><div class="meter ${value<max*.3?'low':color}" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${value}"><span style="width:${value/max*100}%"></span></div></div>`;
const heading=(title,sub='',right='')=>`<div class="screen-heading"><div><h2>${title}</h2>${sub?`<p>${sub}</p>`:''}</div>${right}</div>`;
function ownedItems(kind,selected,field){const items=Object.entries(PRODUCTS).filter(([id,p])=>p.kind===kind&&state.inventory[id]>0);if(!items.some(([id])=>id===selected))selected=items[0]?.[0]||'';ui[field]=selected;return `<select id="${field}" class="field care-select" aria-label="사용할 ${({jelly:'젤리',mat:'매트',trap:'미끼 덫',gear:'훈련 장비'})[kind]}">${items.length?items.map(([id,p])=>`<option value="${id}" ${id===selected?'selected':''}>${p.name} · ${state.inventory[id]}개</option>`).join(''):'<option value="">재고 없음</option>'}</select>`;}
function room(){
 const b=chosen();if(b)ui.selected=b.id;
 return `<div class="room-layout"><section class="panel"><div class="panel-head"><h2>사육실</h2><span class="pill">성충 ${state.bugs.length} / 48</span></div><div class="scene-body"><div class="scene-wrap"><canvas id="scene" class="scene" width="480" height="276" role="img" aria-label="옆에서 본 사육장과 곤충"></canvas><span class="scene-tag">${ico('sun')} ${state.day}일째${b?'<span id="habitat-state"></span>':''}</span></div><div class="scene-caption"><div><strong>${esc(b?.name||'빈 사육장')}</strong>${b?`<p class="muted">${SPECIES[b.species].name} · ${sexName(b.sex)}</p>`:''}</div>${b?`<span class="length num">${mm(b.length)} <small>mm</small></span>`:''}</div></div></section>${b?`<aside class="panel details"><div class="topline"><span>개체 정보</span><button class="rename" data-action="rename">이름 변경</button></div><div class="portrait">${art(b)}</div><h3>${esc(b.name)}</h3><div class="identity"><span class="sex ${b.sex}">${sexMark(b.sex)} ${sexName(b.sex)}</span><span class="length num">${mm(b.length)} <small>mm</small></span></div>${b.health<=CRITICAL_HEALTH?`<p class="critical-warning" role="status">건강 위급 · ${b.criticalDays||0}/${CRITICAL_DAYS}일<br>건강 ${CRITICAL_HEALTH} 이하가 ${CRITICAL_DAYS}일 이어지면 사망합니다.</p>`:''}${stat('건강',b.health)}${stat('포만감',b.hunger,'orange')}${stat('청결',b.hygiene,'blue')}<div class="care-actions"><div>${ownedItems('jelly',ui.jellyId,'jellyId')}${btn('젤리 교체','jelly','primary full',state.jelly<1?'disabled':'')}</div><div>${ownedItems('mat',ui.matId,'matId')}${btn('매트 교체','clean','full',state.substrate<1?'disabled':'')}</div></div><div class="origin">${esc(b.source)} · ${b.born}일째 획득${b.parents?`<br>부모 ${b.parents.map(p=>esc(p.name)+' '+mm(p.length)+' mm').join(' / ')}`:''}<br>투곤 ${b.wins}승 ${b.losses}패 <button class="rename" data-action="release" style="float:right">방생</button></div>${trainingPanel(b)}</aside>`:`<aside class="panel guide"><h3>보유 개체 없음</h3><p>채집에서 곤충을 포획하면 사육실에 추가됩니다.</p>${btn(ico('forest')+'채집 이동','go-forest','primary full')}</aside>`}</div>${careSupport()}${collection()}`;
}
function trainingPanel(b){return `<section class="training-panel"><h3>훈련</h3><p>발힘 ${b.trainingGrip||0} / 12 · 지구력 ${b.trainingStamina||0} / 12</p><div class="training-buttons">${btn('줄다리기','train-grip','full',`data-id="${b.id}" ${!state.inventory.rope_set||b.trainDay===state.day?'disabled':''}`)}${btn('장애물 걷기','train-stamina','full',`data-id="${b.id}" ${!state.inventory.race_track||b.trainDay===state.day?'disabled':''}`)}</div><p class="small muted">장비 필요 · 하루 1회 · 훈련비 20 · 포만감 -8<br>발힘 효과 최대 +6% · 지구력 최대 +18</p></section>`;}
function careSupport(){const aid=careAidStatus(state);if(!aid.eligible&&!aid.claimed)return '';return `<section class="care-support"><div><h3>기초 사육 지원</h3><p>${aid.claimed?'오늘의 지원을 받았습니다. 받은 용품으로 개체를 돌봐 주세요.':`용품과 잎사귀가 부족한 돌봄 대상이 있어요. 젤리 ${aid.jelly}개 · 매트 ${aid.mat}개를 무료로 받을 수 있습니다.`}</p><small>하루 1회 · 잎사귀로 바꿀 수 없는 기본 용품 지원</small></div>${btn(aid.claimed?'오늘 수령 완료':'지원 받기','care-aid','primary',aid.eligible?'':'disabled')}</section>`;}
function memorialIdentity(m){const b=m.bug;return `<strong>${esc(b.name)}</strong><span>${SPECIES[b.species].name} · ${sexName(b.sex)} · ${mm(b.length)} mm</span><small>${b.born}일째 획득 → ${m.diedDay}일째 사망 · ${Math.max(0,m.diedDay-b.born)}일 사육<br>${esc(b.source)} · 투곤 ${b.wins}승 ${b.losses}패${b.parents?`<br>부모 ${b.parents.map(p=>esc(p.name)+' '+mm(p.length)+' mm').join(' / ')}`:''}</small>`;}
function archive(){
 const stored=state.memorials.filter(m=>m.status!=='mounted'),selected=stored.find(m=>m.id===ui.memorialId&&m.work),draft=ui.specimenDrafts?.[selected?.id]||{};
 return `${heading('보관함')}<div class="archive-rule">건강 ${CRITICAL_HEALTH} 이하가 ${CRITICAL_DAYS}일 연속 이어지면 사망합니다. 죽은 개체의 크기와 사육 기록은 이곳에 보존됩니다. 보관 중에는 추가로 부패하지 않습니다.</div>${selected?`${specimenBench(selected,draft)}<div class="bench-close">${btn('작업대 접기','bench-close','quiet')}</div>`:''}<section class="archive-section"><div class="case-heading"><h3>표본 보관 케이스</h3>${btn(`케이스 추가 · ${SPECIMEN_CASE_COST} 잎사귀`,'case-add','',state.coins<SPECIMEN_CASE_COST?'disabled':'')}</div>${specimenCases(state,selected?.work.phase==='casing')}</section><section class="panel archive-section"><div class="panel-head"><h3>개체 보관·작업 중</h3><span class="pill">${stored.length}마리</span></div><div class="archive-grid">${stored.map(m=>`<article class="memorial-card"><div class="memorial-portrait">${art(m.bug)}<span class="memorial-status">${specimenPhase(m)}</span></div><div class="memorial-identity">${memorialIdentity(m)}</div><div class="memorial-action"><p>${m.status==='relaxing'||m.status==='drying'?`${m.readyDay-state.day}일 후 다음 작업 가능 · ${state.settings.realTime?'현실 시간':'게임 내 시간'}`:'핀과 핀셋을 직접 움직여 표본을 제작합니다.'}</p>${btn(m.work?'작업 이어가기':'작업대 열기','specimen-open','full',`data-id="${esc(m.id)}"`)}</div></article>`).join('')||'<p class="archive-empty">보관 중인 개체 없음</p>'}</div></section><p class="archive-note">첫 6칸 케이스와 제작 도구는 기본 제공됩니다. 표본 판매나 경험치 보상은 없습니다. 연화 1일·건조 3일은 게임용 대표 기간이며 실제 작업에서는 개체 상태에 따라 달라집니다.</p>`;
}
function trapPanel(){return `<section class="trap-panel"><h3>미끼 덫</h3><label class="field-label" for="trapId">${LOCATIONS[ui.location].name}에 설치</label>${ownedItems('trap',ui.trapId,'trapId')}${btn('덫 설치 · 1개','trap-place','full',!ui.trapId||state.traps.length>=2?'disabled':'')}<p class="small muted">최대 2개 · 다음 날 확인 · 발견 후 직접 포획</p>${state.traps.map(t=>`<article class="trap-row"><strong>${LOCATIONS[t.location].name}</strong><small>${PRODUCTS[t.itemId].name}</small>${btn(state.day>=t.ready?'덫 확인':`${t.ready}일째 확인`,'trap-check','full',`data-id="${t.id}" ${state.day<t.ready||state.expedition?'disabled':''}`)}</article>`).join('')}</section>`;}
function careBadges(b){return `<span class="care-badges">${b.health<=CRITICAL_HEALTH?`<span class="care-badge critical-needed" title="건강 위급 · ${b.criticalDays||0}/${CRITICAL_DAYS}일" aria-label="건강 위급 ${b.criticalDays||0}일">!</span>`:''}${b.hunger<40?`<span class="care-badge jelly-needed" title="젤리 교체 필요 · 포만감 ${b.hunger}" aria-label="젤리 교체 필요">${ico('jelly')}</span>`:''}${b.hygiene<40?`<span class="care-badge mat-needed" title="매트 교체 필요 · 청결 ${b.hygiene}" aria-label="매트 교체 필요">${ico('mat')}</span>`:''}</span>`;}
function collection(){
 const bugs=collectionView(state.bugs,{species:ui.filter,sex:ui.sexFilter,favoritesOnly:ui.favoritesOnly,sort:ui.sort});
 return `<section class="inventory"><div class="inventory-head"><h3>보유 개체</h3><span>${bugs.length} / ${state.bugs.length}마리 표시</span></div><div class="collection-controls"><label><span>종</span><select id="collection-filter" class="collection-filter" aria-label="사육 개체 종 필터"><option value="all" ${ui.filter==='all'?'selected':''}>전체</option>${Object.entries(SPECIES).map(([key,sp])=>`<option value="${key}" ${ui.filter===key?'selected':''}>${sp.name}</option>`).join('')}</select></label><label><span>성별</span><select id="sex-filter" class="collection-filter" aria-label="곤충 성별 필터">${[['all','전체'],['male','수컷'],['female','암컷']].map(([id,label])=>`<option value="${id}" ${ui.sexFilter===id?'selected':''}>${label}</option>`).join('')}</select></label><label><span>정렬</span><select id="collection-sort" class="collection-filter" aria-label="곤충 정렬 조건">${SORT_OPTIONS.map(([id,label])=>`<option value="${id}" ${ui.sort===id?'selected':''}>${label}</option>`).join('')}</select></label><button class="favorites-only ${ui.favoritesOnly?'active':''}" data-action="favorites-only" aria-pressed="${ui.favoritesOnly}">★ 즐겨찾기만</button></div><div class="bug-grid">${bugs.map(b=>`<article class="bug-card ${b.id===ui.selected?'selected':''}"><button class="favorite-toggle ${b.favorite?'active':''}" data-action="favorite" data-id="${esc(b.id)}" aria-pressed="${!!b.favorite}" aria-label="${esc(b.name)} 즐겨찾기 ${b.favorite?'해제':'등록'}" title="즐겨찾기 ${b.favorite?'해제':'등록'}">${b.favorite?'★':'☆'}</button><button class="card-select" data-action="select" data-id="${esc(b.id)}" aria-pressed="${b.id===ui.selected}" aria-label="${esc(b.name)}, ${SPECIES[b.species].name} ${sexName(b.sex)}, ${mm(b.length)} 밀리미터${b.hunger<40?', 젤리 교체 필요':''}${b.hygiene<40?', 매트 교체 필요':''}">${careBadges(b)}${b.born===state.day&&b.source==='번식'?'<span class="new-label">우화!</span>':''}<div class="thumb">${art(b)}</div><span class="bug-name">${b.hunger<30||b.health<40?'<i class="condition-dot" aria-label="돌봄 필요"></i>':''}${esc(b.name)}</span><span class="bug-species">${SPECIES[b.species].name}</span><span class="bug-info"><span class="sex ${b.sex}">${sexMark(b.sex)}</span><span class="num">${mm(b.length)} mm</span></span><span class="card-stamina">지구력 ${staminaCapacity(b)} · 발힘 ${b.trainingGrip||0}</span></button><div class="card-care">${btn('젤리 교체','card-jelly','quick-care',`data-id="${esc(b.id)}" title="사육실에서 선택한 젤리 또는 보유 젤리 1개 사용" ${state.jelly<1||state.fight?.bugId===b.id&&!state.fight.finished?'disabled':''}`)}${btn('매트 교체','card-clean','quick-care',`data-id="${esc(b.id)}" title="사육실에서 선택한 매트 또는 보유 매트 1개 사용" ${state.substrate<1||state.fight?.bugId===b.id&&!state.fight.finished?'disabled':''}`)}</div></article>`).join('')||`<p class="history">현재 조건에 맞는 개체 없음</p>`}</div></section>`;
}
function forest(){
 const e=state.expedition,l=LOCATIONS[e?.location||ui.location],enc=e?.encounter;
 return `<div class="screen-grid"><section class="panel"><div class="panel-head"><h2>채집 · ${l.name}</h2><span class="pill">탐험 ${state.energy} / 5</span></div><div class="scene-body"><div class="scene-wrap hunt-scene"><canvas id="scene" class="scene" width="480" height="276" aria-label="이동하며 흔적을 조사하는 채집 숲"></canvas>${e?.phase==='search'?e.spots.map((s,i)=>!s.searched?`<button class="hunt-spot ${huntSpot===i?'target':''}" style="left:${s.x/4.8}%;top:${s.y/2.76}%" data-action="hunt-target" data-spot="${i}">${{sap:'수액',bark:'나무껍질',leaf:'낙엽'}[s.kind]}${s.rich?' · 흔적':''}</button>`:'').join(''):''}${!e?'<span class="scene-tag">탐험 시작 후 이동 가능</span>':''}</div>${e?.phase==='search'?`<div class="hunt-status"><span id="hunt-message">지도 클릭·터치로 이동 · 방향키 / WASD</span>${btn('조사','hunt-inspect','primary','id="inspect-btn" disabled')}</div><p class="click-note">흔적을 선택하고 가까이 이동한 뒤 조사하세요.</p>`:enc?`<div class="encounter-strip"><strong>${SPECIES[enc.bug.species].name} 발견</strong><span>경계도 ${Math.round(enc.alert)}%${SPECIES[enc.bug.species].rarity?' · 희귀':''}</span></div>${e.phase==='approach'?`<div class="approach-buttons">${btn('천천히 접근 · 낮은 경계도','hunt-slow','primary')}${btn('바로 접근 · 높은 경계도','hunt-fast')}</div>`:`<div class="capture-widget"><div class="capture-instruction" id="capture-instruction">초록 구간에서 포획 · Space / Enter</div><div class="capture-gauge"><span class="capture-zone" style="left:${(catchCenter()-captureHalfWidth())*100}%;width:${captureHalfWidth()*200}%"></span><span id="capture-pointer"></span></div>${btn('포획','hunt-catch','primary full','id="capture-button"')}<p class="wait-note">실패 ${e.attempts} / ${captureDifficulty(enc).maxAttempts} · 경계도와 이동 속도 증가</p></div>`}`:`<div class="forest-controls">${Object.entries(LOCATIONS).map(([id,v])=>`<button class="location-btn ${ui.location===id?'active':''}" data-action="location" data-location="${id}" aria-pressed="${ui.location===id}"><strong>${v.name}</strong><small>${v.hint}</small></button>`).join('')}</div><div class="spacer"></div>${btn(`탐험 시작 · 탐험 ${l.cost}회`,'hunt-start','primary full',state.energy<l.cost?'disabled':'')}`}</div></section><aside class="panel guide"><h3>채집 조작</h3><p>1. 지도 클릭·터치 또는 방향키로 이동<br>2. 수액·나무껍질·낙엽의 흔적 조사<br>3. 발견한 곤충에 접근<br>4. 움직이는 표시가 초록 구간에 들어올 때 포획</p><div class="tip">천천히 접근: 경계도와 이동 속도 감소, 2초 소요<br>바로 접근: 즉시 포획, 경계도와 이동 속도 증가</div><p>한 탐험에서 여러 흔적을 수색할 수 있습니다. 포획 성공·시도 횟수 소진·전체 수색으로 탐험이 끝납니다.</p><div class="record-row"><span>채집 누적</span><strong>${state.captures}마리</strong></div><div class="record-row"><span>빈 사육 공간</span><strong>${48-state.bugs.length-state.broods.length*3}마리</strong></div>${trapPanel()}${e?`<div class="spacer"></div>${btn('탐험 중단','hunt-cancel','quiet full')}`:''}</aside></div>`;
}
function catchCenter(){return .35+(state.expedition?.encounter?.start||0)/(Math.PI*2)*.3;}
function captureHalfWidth(){return state.expedition?.encounter?.bug?Math.max(.035,.42*(1-captureDifficulty(state.expedition.encounter).threshold)):.15;}
function catchPosition(time){const e=state.expedition?.encounter;return e?(Math.sin(time*.0022*e.speed+e.start)+1)/2:.5;}
function matchParents(){
  const males=state.bugs.filter(b=>b.species===ui.species&&b.sex==='male'),females=state.bugs.filter(b=>b.species===ui.species&&b.sex==='female');
  if(!males.some(b=>b.id===ui.maleId))ui.maleId=males[0]?.id||'';
  if(!females.some(b=>b.id===ui.femaleId))ui.femaleId=females[0]?.id||'';
  return {males,females,m:males.find(b=>b.id===ui.maleId),f:females.find(b=>b.id===ui.femaleId)};
}
function parentView(b){return b?`<div class="parent">${art(b)}<strong>${esc(b.name)}</strong><small class="sex ${b.sex}">${sexMark(b.sex)} ${sexName(b.sex)}</small><small class="num">${mm(b.length)} mm</small></div>`:'<div class="parent"><p>해당 성별 개체 없음</p></div>';}
function foodOptions(species,selected,field,{spawn=false,stage=''}={}){
 const items=Object.entries(PRODUCTS).filter(([id,p])=>state.inventory[id]>0&&compatibleFood(p,species)&&(!spawn||p.kind==='mat')&&!(stage==='3령'&&id.endsWith('_800')));
 if(!items.some(([id])=>id===selected))selected=items[0]?.[0]||'';if(field)ui[field]=selected;
 return `<select class="field" ${field?`id="${field}"`:`data-brood-food="${species}"`} aria-label="성장 먹이">${items.map(([id,p])=>`<option value="${id}" ${id===selected?'selected':''}>${p.name} · ${state.inventory[id]}개</option>`).join('')||'<option value="">호환 먹이 재고 없음</option>'}</select>`;
}
function breedScreen(){
 const {males,females,m,f}=matchParents(),mode=state.settings.realGrowth?'natural':'fast',total=growthDays(ui.species,mode),durations=growthDurations(ui.species,mode);const ready=m&&f&&[m,f].every(b=>b.health>=55&&b.hunger>=45&&state.day-b.bredDay>=4)&&state.broods.length<3;
 const select=(list,id,selected)=>`<label class="field-label" for="${id}">${id==='male-choice'?'수컷':'암컷'}</label><select class="field" id="${id}">${list.map(b=>`<option value="${esc(b.id)}" ${b.id===selected?'selected':''}>${esc(b.name)} · ${mm(b.length)} mm</option>`).join('')||'<option value="">개체 없음</option>'}</select>`;
 return `${heading('번식')}<div class="breed-layout"><section class="panel"><div class="panel-head"><h3>부모 선택</h3><span class="pill">동종 암수 한 쌍</span></div><div class="breed-selects"><label class="field-label" for="breed-species">종</label><select class="field" id="breed-species">${Object.entries(SPECIES).map(([id,p])=>`<option value="${id}" ${id===ui.species?'selected':''}>${p.name}</option>`).join('')}</select><div class="pair">${parentView(m)}<span class="pair-symbol">×</span>${parentView(f)}</div><div class="pair"><div>${select(males,'male-choice',ui.maleId)}</div><div></div><div>${select(females,'female-choice',ui.femaleId)}</div></div><div class="spacer"></div><label class="field-label" for="spawnMat">산란매트</label>${foodOptions(ui.species,ui.spawnMat,'spawnMat',{spawn:true})}<div class="genetic-info">부모 크기의 유전 잠재력과 애벌레 먹이 품질이 성충 크기에 반영됩니다.<br>조건: 건강 55 이상 · 포만감 45 이상 · 번식 후 4일 휴식</div>${btn('번식 시작 · 선택 매트 2개','breed','primary full',ready?'':'disabled')}<p class="wait-note">${state.settings.realTime?'현실 시간':'게임 내'} 우화까지 약 ${total}일</p></div></section><section class="panel"><div class="panel-head"><h3>성장 관리</h3><span class="pill">번식통 ${state.broods.length} / 3</span></div><div class="brood-list">${state.broods.map(b=>{const stage=broodStage(b),total=growthDays(b.species,b.growthMode),remaining=remainingGrowthDays(b),durations=growthDurations(b.species,b.growthMode);return `<article class="brood"><div class="brood-top"><canvas class="brood-canvas" data-stage="${stage}" data-species="${b.species}" width="90" height="90" aria-label="${SPECIES[b.species].name} ${stage}"></canvas><div><h3>${SPECIES[b.species].name} · ${stage}</h3><p>3마리 · ${Math.floor(b.age)} / ${total}일 · 우화까지 약 ${remaining}일<br>현재 먹이 ${PRODUCTS[b.medium]?.name||'참나무 매트'}</p></div></div><div class="stages">${['알','1령','2령','3령','번데기','성충'].map((s,i)=>`<span class="stage ${s===stage?'current':i<['알','1령','2령','3령','번데기','성충'].indexOf(stage)?'done':''}">${s}</span>`).join('')}</div>${isLarva(stage)?`${stat('먹이 잔량',Math.round(b.food),'orange')}<div class="brood-food" data-brood="${b.id}">${foodOptions(b.species,b.medium,null,{stage})}</div>${btn('먹이 교체 · 1개','brood','full',`data-id="${b.id}"`)}`:`<p>${stage==='알'?`${durations[0]}일째 부화`:`${total}일째 우화 · 먹이 교체 불가`}</p>`}<p class="parentage">부모 ${b.parents.map(p=>mm(p.length)+' mm').join(' / ')}</p></article>`;}).join('')||'<div class="empty">번식통 없음</div>'}<div class="tip">${mode==='natural'?'실제 성장 기간':'게임 내 성장'}: ${['알','1령','2령','3령','번데기'].map((stage,i)=>stage+' '+durations[i]+'일').join(' → ')}<br>균사는 사슴벌레에만 사용 가능. 3령은 1400 mL 이상 균사병이 필요합니다.</div></div></section></div>`;
}
function battle(){
 const f=state.fight,males=state.bugs.filter(b=>b.sex==='male');
 if(f)ui.fighterId=f.bugId;else if(!males.some(b=>b.id===ui.fighterId))ui.fighterId=males[0]?.id||'';
 const b=males.find(b=>b.id===ui.fighterId),ready=b&&b.health>=60&&b.hunger>=40&&b.fightDay!==state.day;
 const strength=b?combatRating(b):0,rivalStrength=f?combatRating(f.rival):0;
 return `<div class="screen-grid"><section class="panel"><div class="panel-head"><h2>투곤 · 자동 경기</h2><span class="pill">장외 밀어내기 · 지구력</span></div><div class="scene-body"><div class="scene-wrap"><canvas id="scene" class="scene" width="480" height="276" role="img" aria-label="크기가 반영된 곤충의 자동 투곤"></canvas><span class="scene-tag">${f?(f.finished?'경기 종료':'경기 진행 중'):'참가 개체 선택'}</span></div><div class="battle-info"><div><strong>${esc(b?.name||'개체 없음')}</strong><p>${b?mm(b.length)+' mm':''}</p></div><span>VS</span><div><strong>${esc(f?.rival.name||'상대 대기')}</strong><p>${f?mm(f.rival.length)+' mm':''}</p></div></div>${f?`<div class="tug-meter"><span style="left:${50+f.position/2}%"></span><i>중앙</i></div><div class="battle-stamina"><div>${stat('내 개체 지구력',Math.round(f.playerStamina),'',staminaCapacity(b))}</div><div>${stat('상대 지구력',Math.round(f.opponentStamina),'orange',staminaCapacity(f.rival))}</div></div><p class="battle-log">${f.events[0]?.text||'상대 곤충에 접근'}</p><div class="combat-summary"><span>경기력 ${strength.toFixed(2)} : ${rivalStrength.toFixed(2)}</span><span>경과 ${f.elapsed}회 접촉</span></div>${f.finished?`<div class="battle-result"><h3>${f.retreated?'기권':f.won?'승리':'패배'}</h3><p>${f.retreated?'보상 없음':(f.won?65:20)+' 잎사귀 획득'}</p>${btn('다른 개체 선택','battle-clear','primary')}</div>`:btn('기권','battle-retreat','quiet full')}`:'<p class="battle-log">경기를 시작하면 곤충끼리 자동으로 겨룹니다.</p>'}</div></section><aside class="panel guide"><h3>참가 개체</h3><label class="field-label" for="fighter">성충 수컷</label><select id="fighter" class="field" ${f?'disabled':''}>${males.length?males.map(m=>`<option value="${m.id}" ${m.id===ui.fighterId?'selected':''}>${esc(m.name)} · ${mm(m.length)} mm</option>`).join(''):'<option>수컷 개체 없음</option>'}</select>${b?`<div class="parent">${art(b)}<strong>${esc(b.name)}</strong><small>${b.wins}승 ${b.losses}패</small></div>${b.health<=CRITICAL_HEALTH?`<p class="critical-warning" role="status">건강 위급 · ${b.criticalDays||0}/${CRITICAL_DAYS}일<br>건강 ${CRITICAL_HEALTH} 이하가 ${CRITICAL_DAYS}일 이어지면 사망합니다.</p>`:''}${stat('건강',b.health)}${stat('포만감',b.hunger,'orange')}<p>발힘 ${b.trainingGrip||0} / 12 · 지구력 훈련 ${b.trainingStamina||0} / 12</p>`:''}<div class="spacer"></div>${!f?btn('경기 시작 · 자동 진행','battle-start','primary full',ready?'':'disabled'):''}<div class="tip">몸길이가 기본 힘에 가장 크게 반영됩니다. 종별 발힘·건강·포만감과 경기 중 피로도 함께 계산됩니다.</div><p>한 개체당 하루 1경기. 훈련 효과는 작게 제한됩니다. 경기는 자동으로 진행됩니다. 참가 전에 컨디션을 관리하세요.</p>${f?`<details class="fight-history"><summary>경기 기록</summary>${f.events.map(e=>`<p>${e.step}. ${esc(e.text)}</p>`).join('')}</details>`:''}</aside></div>`;
}
function book(){return `${heading('도감','',`<span class="pill">${state.discoveries.length} / ${Object.keys(SPECIES).length}종</span>`)}${researchPanel()}<div class="species-grid">${Object.entries(SPECIES).map(([key,sp])=>{const owned=state.bugs.filter(b=>b.species===key);return `<article class="panel species-panel"><div class="species-picture">${art({species:key,sex:'male'})}${art({species:key,sex:'female'})}</div><div class="species-content"><h2>${sp.name}</h2><p class="latin">${sp.latin}</p><p>${sp.note}</p><div class="record-row"><span>보유 개체</span><strong>${owned.length}마리</strong></div><div class="record-row"><span class="sex male">♂ 가장 큰 수컷</span><strong class="num">${state.records[key+'-male']?mm(state.records[key+'-male'])+' mm':'기록 없음'}</strong></div><div class="record-row"><span class="sex female">♀ 가장 큰 암컷</span><strong class="num">${state.records[key+'-female']?mm(state.records[key+'-female'])+' mm':'기록 없음'}</strong></div><div class="spacer"></div><p class="small muted">몸길이는 큰턱·뿔을 포함해 재요.<br>게임 내 야생 크기 범위<br>수컷 ${sp.male.join('~')} mm · 암컷 ${sp.female.join('~')} mm<br>번식 최대: 수컷 ${sp.bredMale[1]} mm · 암컷 ${sp.bredFemale[1]} mm</p></div></article>`;}).join('')}</div>`;}
function researchPanel(){const r=currentResearch(state);return `<section class="panel research-panel"><div class="panel-head"><h3>연구소 도감 의뢰</h3><span class="pill">${state.researchClaimed.length} / ${RESEARCH_REQUESTS.length}</span></div><div class="research-body">${r?`<div><strong>${r.name}</strong><p>${r.goal}</p><small>보상 ${r.coins} 잎사귀 · ${r.xp} EXP</small></div>${btn(r.complete(state)?'의뢰 완료 · 보상 수령':'조사 진행 중','research-claim','primary',`data-id="${r.id}" ${r.complete(state)?'':'disabled'}`)}`:'<p>모든 조사 의뢰 완료</p>'}</div></section>`;}
function shop(){
 const level=keeperLevel(state);if(!SHOP_AREAS.some(a=>a.id===ui.shopArea)||!shopAccess(state,ui.shopArea).unlocked)ui.shopArea='basic';const area=SHOP_AREAS.find(a=>a.id===ui.shopArea),next=LEVEL_XP[level]||state.xp;
 return `${heading('곤충 사육용품점','',`<span class="pill">사육 Lv.${level} · ${state.coins} 잎사귀</span>`)}<div class="shop-level"><span>사육 경험치 ${state.xp}${level<5?` / ${next}`:' · 최고 레벨'}</span><div class="meter"><span style="width:${level===5?100:Math.min(100,(state.xp-LEVEL_XP[level-1])/(next-LEVEL_XP[level-1])*100)}%"></span></div><small>경험치와 채집·번식·우화 실적을 모두 충족해야 새 구역이 개방됩니다.</small></div><div class="shop-districts">${SHOP_AREAS.map(a=>{const access=shopAccess(state,a.id);return `<button class="shop-district ${a.id===area.id?'active':''} ${access.unlocked?'':'locked'}" data-action="shop-area" data-area="${a.id}" ${access.unlocked?'':'disabled'}><strong>${a.name}</strong><span>${access.unlocked?'개방':'잠금'} · Lv.${a.level}</span><small>${access.missing.join(' · ')}</small></button>`;}).join('')}</div><section class="panel storefront"><div class="shop-sign"><span>${area.name}</span><small>OPEN</small></div><div class="product-shelves">${Object.entries(PRODUCTS).filter(([id,p])=>p.area===area.id).map(([id,p])=>`<article class="product-card"><div class="product-image"><img src="${productURL(id,p)}" alt="${p.name} 픽셀 상품"><span class="stock-label">보유 ${state.inventory[id]||0}</span></div><h3>${p.name}</h3><p>${p.effect}</p><div class="product-price"><strong>${p.price}</strong><span>잎사귀 / ${p.qty}개</span></div>${btn('구매','buy-product','primary full',`data-product="${id}" ${state.coins<p.price?'disabled':''}`)}</article>`).join('')}</div><div class="shop-base">젤리 ${inventoryCount(state,'jelly')}개 · 매트 ${inventoryCount(state,'mat')}개 · 균사 ${inventoryCount(state,'fungus')}개 · 덫 ${inventoryCount(state,'trap')}개</div></section>`;
}
function journal(){return `<details class="journal"><summary>사육일지 · 최근 기록 보기</summary><ol>${state.log.slice(0,12).map(l=>`<li><time>${l.day}일째</time><span>${esc(l.text)}</span></li>`).join('')}</ol></details>`;}
function render(){
  if(!activeWorld){app.innerHTML=worldEntrance();document.querySelectorAll('.world-scene').forEach(el=>drawRoom(el.getContext('2d'),null,0));return;}
  const previous=document.activeElement;const focusAction=previous?.dataset?.action,focusId=previous?.dataset?.id,focusMove=previous?.dataset?.move;
  const screens={room,forest,breed:breedScreen,battle,book,shop,archive};
  app.innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><div class="brand-mark">${ico('bug')}</div><div><h1>작은 숲</h1><p>곤충 사육</p></div></div><div class="hud"><span class="day-chip">여름 <strong>${state.day}</strong>일째</span><div class="hud-item">${ico('leaf')}<strong class="num">${state.coins.toLocaleString()}</strong></div><button class="hud-action" data-action="sound" aria-label="효과음 ${ui.sound?'끄기':'켜기'}" title="효과음 ${ui.sound?'켜짐':'꺼짐'}">${ico('sound')}</button><button class="settings-entry" data-action="settings">설정</button><button class="hud-action" data-action="help" aria-label="게임 도움말">${ico('help')}</button></div></header><div class="world-toolbar"><span class="current-world">${esc(getWorld(activeWorld).name)} · ${state.settings.realTime?'24시간 진행':'버튼 진행'}</span><div>${btn('세계 선택','world-select')}${btn('↻ 새로고침','refresh')}</div></div><nav class="nav" aria-label="게임 장소">${[['room','home','사육실'],['forest','forest','채집'],['breed','breed','번식'],['battle','battle','투곤'],['book','book','도감'],['shop','shop','상점'],['archive','book','보관함']].map(([view,ic,label])=>`<button class="nav-btn ${ui.view===view?'active':''}" data-action="nav" data-view="${view}" ${ui.view===view?'aria-current="page"':''}>${ico(ic)}<span>${label}</span></button>`).join('')}</nav><main id="main">${screens[ui.view]()}</main><div class="support-row"><div class="supplies"><span>${ico('jelly')} 젤리 <strong class="num">${state.jelly}</strong></span><span>${ico('mat')} 매트 <strong class="num">${state.substrate}</strong></span></div><span class="save-state">${saveOK?'자동 저장됨 · 이 브라우저':'저장할 수 없어요 · 브라우저 저장 공간 확인'}</span>${state.settings.realTime?`<div class="real-time-status"><span>다음 날까지</span><strong id="real-time-countdown">${timeLeft()}</strong></div>`:btn(ico('next')+'다음 날로','next','gold day-btn',(state.fight&&!state.fight.finished)||state.expedition?'disabled':'')}</div>${journal()}<footer class="footer"><span>Lv.${keeperLevel(state)} · EXP ${state.xp}</span><span><button data-action="sound">효과음 ${ui.sound?'켜짐':'꺼짐'}</button> · <button data-action="help">게임 방법</button></span></footer></div>`;
  document.querySelectorAll('.brood-canvas').forEach(el=>drawBrood(el.getContext('2d'),el.dataset.stage,el.dataset.species));
  paint(performance.now());
  if(focusAction){const match=[...app.querySelectorAll('[data-action]')].find(el=>el.dataset.action===focusAction&&el.dataset.id===focusId&&el.dataset.move===focusMove&&!el.disabled);match?.focus({preventScroll:true});}
}
function paint(time){
  const cvs=document.querySelector('#scene');if(!cvs)return;const c=cvs.getContext('2d');
  if(ui.view==='room')drawRoom(c,chosen(),time);
  else if(ui.view==='forest')drawForest(c,state.expedition?.location||ui.location,time,state.expedition,huntPlayer);
  else if(ui.view==='battle')drawBattle(c,state.bugs.find(b=>b.id===ui.fighterId),state.fight?.rival,time,state.fight);
  if(ui.view==='room'){const label=document.getElementById('habitat-state'),value=habitatLabel(habitatState(chosen()));if(label&&label.textContent!==value)label.textContent=value;}
}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function refreshBattle(){
 const f=state.fight;
 document.querySelector('.tug-meter > span').style.left=(50+f.position/2)+'%';
 const meters=document.querySelectorAll('.battle-stamina .stat');
 [f.playerStamina,f.opponentStamina].forEach((value,i)=>{
  const meter=meters[i].querySelector('.meter'),max=Number(meter.getAttribute('aria-valuemax'));
  meters[i].querySelector('.stat-label .num').firstChild.textContent=String(Math.round(value));
  meter.setAttribute('aria-valuenow',String(Math.round(value)));meter.classList.toggle('low',value<max*.3);
  meter.querySelector('span').style.width=(value/max*100)+'%';
 });
 document.querySelector('.battle-log').textContent=f.events[0]?.text||'상대 곤충에 접근';
 document.querySelector('.combat-summary > span:last-child').textContent=`경과 ${f.elapsed}회 접촉`;
 const history=document.querySelector('.fight-history');
 history.querySelectorAll('p').forEach(p=>p.remove());
 const entries=document.createDocumentFragment();
 for(const e of f.events){const p=document.createElement('p');p.textContent=`${e.step}. ${e.text}`;entries.append(p);}
 history.append(entries);
}
function animate(time){
 const dt=Math.min(50,time-lastPaint)/1000;
 if(activeWorld&&!document.hidden&&time-lastPaint>1000/24){
  if(state.fight&&!state.fight.finished&&time-lastFightTick>600&&!modal.open){lastFightTick=time;advanceFight(state);save();if(state.fight.finished)render();else if(ui.view==='battle')refreshBattle();}
  const e=state.expedition;
  if(ui.view==='forest'&&e?.phase==='search'){
   let dx=(heldKeys.has('ArrowRight')||heldKeys.has('d')?1:0)-(heldKeys.has('ArrowLeft')||heldKeys.has('a')?1:0),dy=(heldKeys.has('ArrowDown')||heldKeys.has('s')?1:0)-(heldKeys.has('ArrowUp')||heldKeys.has('w')?1:0);
   if(dx||dy){huntTarget=null;}else if(huntTarget){dx=huntTarget.x-huntPlayer.x;dy=huntTarget.y-huntPlayer.y;if(Math.hypot(dx,dy)<3){huntTarget=null;dx=dy=0;}}
   const norm=Math.hypot(dx,dy);if(norm){huntPlayer.x=Math.max(20,Math.min(460,huntPlayer.x+dx/norm*100*dt));huntPlayer.y=Math.max(85,Math.min(260,huntPlayer.y+dy/norm*100*dt));}
   e.player={...huntPlayer};const nearest=e.spots.findIndex(s=>!s.searched&&Math.hypot(s.x-huntPlayer.x,s.y+20-huntPlayer.y)<36);if(nearest>=0)huntSpot=nearest;
   const spot=e.spots[huntSpot];const near=spot&&!spot.searched&&Math.hypot(spot.x-huntPlayer.x,spot.y+20-huntPlayer.y)<36;
   const inspect=document.getElementById('inspect-btn');if(inspect)inspect.disabled=!near;
   const message=document.getElementById('hunt-message');if(message)message.textContent=near?'조사 가능':huntTarget?'이동 중':'흔적을 선택하세요';
  }
  if(ui.view==='forest'&&e?.phase==='catch'){
   const pointer=document.getElementById('capture-pointer');
   if(pointer)pointer.style.left=catchPosition(time)*100+'%';if(pointer)pointer.style.transform='translateX(-50%)';
   const button=document.getElementById('capture-button');if(button)button.disabled=time<approachUntil;
   const message=document.getElementById('capture-instruction');if(message)message.textContent=time<approachUntil?'접근 중…':'초록 구간에서 포획 · Space / Enter';
  }
  if(!reduced||ui.view==='forest'&&e||ui.view==='battle'&&state.fight&&!state.fight.finished)paint(time);lastPaint=time;
 }
 requestAnimationFrame(animate);
}
function help(){showModal('조작 방법',`<div class="help-step">${ico('forest')}<div><strong>채집</strong><p>탐험 시작 → 지도 클릭·터치 / 방향키로 이동 → 흔적 조사 → 접근 → 초록 구간에서 포획. Space / Enter로도 포획할 수 있습니다.</p></div></div><div class="help-step">${ico('jelly')}<div><strong>사육·상점</strong><p>보유 개체를 선택한 뒤 사용할 상품을 골라 젤리·매트를 교체합니다. 경험치·채집 실적·번식·우화 조건을 충족하면 상점 구역이 개방됩니다.</p></div></div><div class="help-step">${ico('breed')}<div><strong>번식</strong><p>같은 종의 암수와 산란매트 2개가 필요합니다. 알 → 1령 → 2령 → 3령 → 번데기 → 성충으로 성장합니다. 기본 15일, 실제 성장 기간을 켜면 약 6~12개월입니다. 부모 크기와 애벌레 먹이 품질이 성충 크기에 반영됩니다.</p></div></div><div class="help-step">${ico('battle')}<div><strong>투곤</strong><p>수컷·건강 60·포만감 40 이상. 개체당 하루 1회 참가하며 자동 경기에서 상대를 장외로 밀어내거나 먼저 지치게 하면 승리합니다.</p></div></div><div class="help-step">${ico('shop')}<div><strong>덫·훈련·연구 의뢰</strong><p>채집에서 미끼 덫을 설치하고 다음 날 확인합니다. 사육실의 줄다리기·장애물 훈련은 장비가 필요하며 하루 한 번 가능합니다. 도감에서 연구소 의뢰를 완료하고 보상을 받습니다.</p></div></div><p class="note">같은 브라우저에 자동 저장됩니다. 세계 선택에서 현실의 숲과 상상의 숲에 따로 들어갑니다. 현실의 숲은 창을 닫아도 시간이 흐르고, 상상의 숲은 다음 날 버튼으로 진행합니다. 건강 20 이하가 3일 이어지면 사망하며 보관함에서 건조·표본 제작을 할 수 있습니다. 용품과 잎사귀가 부족할 때 사육실의 기초 사육 지원을 이용하세요. 사이트 데이터를 삭제하면 저장 내용도 삭제됩니다. 상품 효과와 성장 기간은 게임용 수치입니다.</p>${btn('닫기','close','primary full')}`);}
function nextDay(){const hungry=state.bugs.filter(b=>b.hunger<40).length,dirty=state.bugs.filter(b=>b.hygiene<40).length;showModal('다음 날로 진행',`<p>포만감·청결 감소, 애벌레 성장, 탐험 5회 회복, 지원금 35~65 잎사귀.</p>${hungry||dirty?`<div class="tip attention">포만감 40 미만 ${hungry}마리 · 청결 40 미만 ${dirty}마리</div>`:''}<div class="modal-buttons">${btn('취소','close','quiet')}${btn('다음 날','next-confirm','gold')}</div>`);}
function caught(result){if(!result)return;if(result.missed){toast('포획 실패 · 다시 시도 가능');return;}if(result.escaped){toast('포획 실패 · 탐험 종료');return;}const {bug,record}=result;showModal('채집 결과',`<div class="catch-picture">${art(bug)}${record?'<span class="record-badge">크기 기록 갱신</span>':''}</div><div class="catch-length num">${mm(bug.length)} <small>mm</small></div><div class="catch-species">${SPECIES[bug.species].name} <span class="sex ${bug.sex}">${sexMark(bug.sex)} ${sexName(bug.sex)}</span></div><p style="text-align:center">채집지 ${esc(bug.source)}<br>+10 잎사귀 · +${24+SPECIES[bug.species].rarity*12} EXP</p><div class="modal-buttons catch-actions">${btn('채집 계속','close')}${btn('방생','caught-release','danger',`data-id="${esc(bug.id)}"`)}${btn('사육실','caught-room','primary',`data-id="${esc(bug.id)}"`)}</div>`);}
function handleAction(el){
  const action=el.dataset.action;if(el.disabled)return;settleClock();
  if(action==='close'){closeModal();return;}
  if(action==='world-enter'){enterWorld(el.dataset.world);return;}
  if(action==='world-select'){leaveWorld();return;}
  if(action==='refresh'){if(save())window.location.reload();else toast('새로고침 전에 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.');return;}
  if(!activeWorld)return;
  if(action==='nav'){ui.view=el.dataset.view;save();render();chime();return;}
  if(action==='go-forest'){ui.view='forest';save();render();return;}
  if(action==='help'){help();return;}
  if(action==='settings'){showSettings();return;}
  if(action==='care-aid'){act(()=>claimCareAid(state),'기초 용품 수령 · 젤리와 매트를 교체해 주세요.');return;}
  if(action==='specimen-open'){const m=act(()=>prepareSpecimen(state,el.dataset.id));if(m){ui.memorialId=m.id;save();render();document.querySelector('.specimen-workbench')?.scrollIntoView?.({block:'start',behavior:'smooth'});}return;}
  if(action==='bench-close'){ui.memorialId='';save();render();return;}
  if(action==='case-add'){act(()=>addSpecimenCase(state),'6칸 표본 케이스 추가');return;}
  if(action==='favorites-only'){ui.favoritesOnly=!ui.favoritesOnly;save();render();return;}
  if(action==='favorite'){act(()=>toggleFavorite(state,el.dataset.id),b=>b.favorite?'즐겨찾기 등록':'즐겨찾기 해제');return;}
  if(action==='card-jelly'||action==='card-clean'){const kind=action==='card-jelly'?'jelly':'clean',item=kind==='jelly'?ui.jellyId:ui.matId;act(()=>care(state,el.dataset.id,kind,state.inventory[item]>0&&PRODUCTS[item]?.kind===(kind==='jelly'?'jelly':'mat')?item:undefined),kind==='jelly'?'젤리 교체 완료':'매트 교체 완료');return;}
  if(action==='sound'){ui.sound=!ui.sound;save();render();if(ui.sound)chime('success');toast(`효과음이 ${ui.sound?'켜졌어요.':'꺼졌어요.'}`);return;}
  if(action==='select'){ui.selected=el.dataset.id;save();render();return;}
  if(action==='location'){ui.location=el.dataset.location;save();render();chime();return;}
  if(action==='jelly'||action==='clean'){if(chosen())act(()=>care(state,chosen().id,action,action==='jelly'?ui.jellyId:ui.matId),action==='jelly'?'젤리 교체 완료':'매트 교체 완료');return;}
  if(action==='shop-area'){if(!shopAccess(state,el.dataset.area).unlocked){toast('아직 개방되지 않은 구역입니다.');return;}ui.shopArea=el.dataset.area;save();render();return;}
  if(action==='train-grip'||action==='train-stamina'){act(()=>train(state,el.dataset.id,action==='train-grip'?'grip':'stamina'),'훈련 완료');return;}
  if(action==='trap-place'){act(()=>placeTrap(state,ui.location,ui.trapId),'덫 설치 · 다음 날 확인');return;}
  if(action==='trap-check'){const result=act(()=>checkTrap(state,el.dataset.id));if(result){ui.view='forest';huntPlayer={x:240,y:230};render();}else if(result===null)toast('덫 확인 · 발견 없음');return;}
  if(action==='research-claim'){act(()=>claimResearch(state,el.dataset.id),'연구소 의뢰 보상 수령');return;}
  if(action==='buy-product'){act(()=>buy(state,el.dataset.product),v=>v);return;}
  if(action==='hunt-start'){const e=act(()=>startExpedition(state,ui.location));if(e){huntPlayer={x:240,y:244};huntSpot=-1;huntTarget=null;render();}return;}
  if(action==='hunt-target'){huntSpot=Number(el.dataset.spot);const spot=state.expedition?.spots[huntSpot];if(spot){huntTarget={x:spot.x,y:spot.y+20};render();}return;}
  if(action==='hunt-inspect'){const e=state.expedition,spot=e?.spots[huntSpot];if(!spot||Math.hypot(spot.x-huntPlayer.x,spot.y+20-huntPlayer.y)>=36){toast('흔적에 가까이 이동하세요.');return;}const encounter=act(()=>inspectSpot(state,huntSpot));if(encounter===null)toast(state.expedition?'발견 없음 · 다른 흔적 조사 가능':'전체 수색 완료 · 탐험 종료');huntSpot=-1;huntTarget=null;return;}
  if(action==='hunt-slow'||action==='hunt-fast'){approachUntil=action==='hunt-slow'?performance.now()+2200:0;act(()=>approachInsect(state,action==='hunt-slow'?'slow':'fast'));return;}
  if(action==='hunt-catch'){if(performance.now()<approachUntil)return;const accuracy=Math.max(0,1-Math.abs(catchPosition(performance.now())-catchCenter())/.42);caught(act(()=>finishCapture(state,accuracy)));return;}
  if(action==='hunt-cancel'){act(()=>cancelExpedition(state),'탐험 중단');huntTarget=null;return;}
  if(action==='caught-release'){const bug=act(()=>release(state,el.dataset.id));if(bug){closeModal();toast(`${bug.name} 방생 · 채집·도감 기록 유지`);}return;}
  if(action==='caught-room'){ui.selected=el.dataset.id;ui.view='room';ui.filter='all';closeModal();save();render();return;}
  if(action==='breed'){const brood=act(()=>breed(state,ui.maleId,ui.femaleId,Math.random,ui.spawnMat));if(brood)toast(`산란 완료 · 알 3개 · 우화까지 ${growthDays(brood.species,brood.growthMode)}일`);return;}
  if(action==='brood'){const id=el.dataset.id,selected=document.querySelector(`[data-brood="${id}"] select`)?.value;act(()=>careBrood(state,id,selected),'애벌레 먹이 교체 완료');return;}
  if(action==='next'){if(state.settings.realTime){toast('현실 시간 연동 중 · 24시간마다 자동 진행');return;}if((state.fight&&!state.fight.finished)||state.expedition){toast('투곤·채집을 먼저 마치거나 중단하세요.');return;}nextDay();return;}
  if(action==='next-confirm'){closeModal();const events=act(()=>advanceDay(state));if(events?.length)showModal('하루 진행 기록',`<div class="next-events">${events.map(e=>`<p>${esc(e)}</p>`).join('')}</div>${btn('닫기','close','primary full')}`);else if(events)toast(`${state.day}일째`);return;}
  if(action==='battle-start'){lastFightTick=performance.now();act(()=>makeOpponent(state,ui.fighterId));return;}
  if(action==='battle-retreat'){act(()=>retreatFight(state));return;}
  if(action==='battle-clear'){if(state.fight?.finished){state.fight=null;ui.fighterId='';save();render();}return;}
  if(action==='rename'){const b=chosen();if(b)showModal('개체의 이름 바꾸기',`<label class="field-label" for="new-name">${SPECIES[b.species].name} · ${mm(b.length)} mm</label><input class="field" id="new-name" maxlength="16" value="${esc(b.name)}" autocomplete="off"><div class="modal-buttons">${btn('취소','close','quiet')}${btn('이름 저장','rename-confirm','primary',`data-id="${esc(b.id)}"`)}</div>`);return;}
  if(action==='rename-confirm'){const name=document.querySelector('#new-name')?.value;const b=act(()=>rename(state,el.dataset.id,name));if(b){closeModal();toast('이름 저장 완료');}return;}
  if(action==='release'){const b=chosen();if(b)showModal('숲에 놓아줄까요?',`<p>${esc(b.name)}를 숲으로 돌려보내면 사육실에서 다시 만날 수 없어요. 도감의 크기 기록과 후손의 부모 기록은 남아요.</p><div class="modal-buttons">${btn('취소','close','quiet')}${btn('숲에 놓아주기','release-confirm','danger',`data-id="${esc(b.id)}"`)}</div>`);return;}
  if(action==='release-confirm'){const b=act(()=>release(state,el.dataset.id));if(b){closeModal();toast(`${b.name}를 숲에 놓아주었어요.`);}return;}
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el)handleAction(el);});
document.addEventListener('change',e=>{
  const el=e.target;
  if(!activeWorld)return;
  if(el.id==='setting-real-time'){showSettings();return;}
  if(el.id==='setting-real-growth'){if(!state.settings.realTime){showSettings();return;}act(()=>setTimeOptions(state,{realTime:true,realGrowth:el.checked}),'성장 기간 설정 저장');showSettings();return;}
  if(el.closest('.brood-food'))return;if(el.id==='collection-filter'){ui.filter=el.value;}
  else if(el.id==='sex-filter'){ui.sexFilter=el.value;}
  else if(el.id==='collection-sort'){ui.sort=el.value;}
  else if(el.id==='breed-species'){ui.species=el.value;ui.maleId='';ui.femaleId='';}
  else if(el.id==='male-choice'){ui.maleId=el.value;}
  else if(el.id==='female-choice'){ui.femaleId=el.value;}
  else if(el.id==='fighter'){ui.fighterId=el.value;}
  else if(['jellyId','matId','spawnMat','trapId'].includes(el.id)){ui[el.id]=el.value;}
  else return;save();render();document.getElementById(el.id)?.focus({preventScroll:true});
});
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
document.addEventListener('keydown',e=>{
 if(e.target.id==='new-name'&&e.key==='Enter'){document.querySelector('[data-action="rename-confirm"]')?.click();return;}
 if(!activeWorld||modal.open||e.target.matches('input,select,textarea'))return;
 if(ui.view==='forest'&&state.expedition){
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)){e.preventDefault();heldKeys.add(e.key);}
  if([' ','Enter'].includes(e.key)&&!e.repeat){
   if(state.expedition.phase==='catch'){e.preventDefault();document.querySelector('[data-action="hunt-catch"]')?.click();}
   else if(state.expedition.phase==='search'&&!document.getElementById('inspect-btn')?.disabled){e.preventDefault();document.getElementById('inspect-btn')?.click();}
  }
 }
});
document.addEventListener('keyup',e=>heldKeys.delete(e.key));window.addEventListener('blur',()=>heldKeys.clear());
document.addEventListener('pointerdown',e=>{if(e.target.id==='scene'&&ui.view==='forest'&&state.expedition?.phase==='search'){const r=e.target.getBoundingClientRect();huntTarget={x:Math.max(20,Math.min(460,(e.clientX-r.left)/r.width*480)),y:Math.max(85,Math.min(260,(e.clientY-r.top)/r.height*276))};huntSpot=state.expedition.spots.reduce((best,s,i)=>!s.searched&&Math.hypot(s.x-huntTarget.x,s.y+20-huntTarget.y)<45?i:best,huntSpot);}});
window.addEventListener('storage',e=>{if(!activeWorld){if(WORLDS.some(w=>e.key===worldKeys(w.id).save))render();return;}if(e.key===worldKeys(activeWorld).save&&e.newValue){try{const next=JSON.parse(e.newValue);if(validateSave(next)&&next.settings?.realTime===getWorld(activeWorld).realTime){state=migrateSave(next);const elapsed=syncRealTime(state);if(elapsed.days)save();huntPlayer=state.expedition?.player||{x:240,y:244};huntTarget=null;huntSpot=-1;closeModal();render();toast('다른 탭의 같은 세계 기록 적용');}}catch{}}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){settleClock();paint(performance.now());}});
window.addEventListener('pageshow',()=>settleClock());
setInterval(()=>{if(!document.hidden){settleClock();const label=document.getElementById('real-time-countdown');if(label)label.textContent=timeLeft();}},1000);
function registerTools(){
  const context=document.modelContext;if(!context?.registerTool)return;
  const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  const tools=[{
    name:'read_insect_game',description:'Read the current day, supplies, insects and broods in this local insect-raising game.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},
    execute(){if(!activeWorld)return {world:null,availableWorlds:WORLDS.map(w=>({id:w.id,name:w.name}))};return {world:activeWorld,day:state.day,coins:state.coins,jelly:state.jelly,substrate:state.substrate,energy:state.energy,insects:state.bugs.map(b=>({id:b.id,name:b.name,species:SPECIES[b.species].name,sex:b.sex,lengthMm:b.length,health:b.health,hunger:b.hunger,hygiene:b.hygiene})),broods:state.broods.map(b=>({id:b.id,species:SPECIES[b.species].name,stage:broodStage(b),age:b.age,food:b.food}))};}
  },{
    name:'care_for_insect',description:'Replace jelly or substrate for an existing insect. Consumes one supply item and updates the visible room.',inputSchema:{type:'object',properties:{id:{type:'string'},care:{type:'string',enum:['jelly','clean']}},required:['id','care'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute(input){if(!activeWorld)throw new Error('먼저 세계를 선택해 주세요.');settleClock();if(!input||typeof input.id!=='string'||!['jelly','clean'].includes(input.care)||Object.keys(input).some(k=>!['id','care'].includes(k)))throw new Error('Expected an insect id and jelly or clean care.');const b=care(state,input.id,input.care);ui.selected=b.id;ui.view='room';save();render();return {id:b.id,health:b.health,hunger:b.hunger,hygiene:b.hygiene,jelly:state.jelly,substrate:state.substrate};}
  }];
  for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
}
const requestedWorld=new URL(window.location.href).searchParams.get('world');
if(!getWorld(requestedWorld)||!enterWorld(requestedWorld))render();
bindSpecimenControls({
 getMemorial:()=>activeWorld&&ui.view==='archive'?state.memorials.find(m=>m.id===ui.memorialId):null,
 move:(id,task,point,payload)=>{settleClock();return act(()=>workSpecimen(state,id,task,point,payload));},
 put:(id,caseId,slot)=>{settleClock();const m=act(()=>storeSpecimen(state,id,caseId,slot));if(m){ui.memorialId='';save();render();toast('표본 케이스에 보관했습니다.');}return m;},
 draft:()=>ui.specimenDrafts?.[ui.memorialId]||{},
 editDraft:(name,value)=>{ui.specimenDrafts??={};ui.specimenDrafts[ui.memorialId]={...ui.specimenDrafts[ui.memorialId],[name]:value};save();},
 notice:toast,redraw:render
});
registerTools();requestAnimationFrame(animate);
if(loadNotice)setTimeout(()=>toast(loadNotice),100);
