import {newDailyEvents,migrateDailyEvents,validDailyEvents,takeEventGuest,claimDailyEvent} from './events.js';
import {PRODUCTS,LEVEL_XP,keeperLevel,compatibleFood,syncSupplies,shopAccess,isLarva,isAdultBedding,adultBeddingItems,adultBeddingCount} from './catalog.js';
import {SPECIES,LOCATIONS,sizeRange,captureDifficulty} from './world.js';
export {SPECIES,LOCATIONS,captureDifficulty};
import {RESEARCH_REQUESTS,currentResearch} from './research.js';
import {DAY_MS,calendarDay,midnightAt,FAST_DURATIONS,broodDurations,broodGrowthDays,rollGrowthPlan,migrateGrowthPlans,validGrowthPlan,stageIndex,stageName,convertGrowthAge} from './time.js';
import {adultDecay,larvalFoodInterval,needsCare} from './care-timing.js';
import {RELAX_DAYS,DRY_DAYS,CASE_SLOTS,newSpecimenWork,moveSpecimen,tickSpecimen,validSpecimenWork} from './specimens.js';
import {rearedLength} from './growth-size.js';
import {rollTraits,inheritTraits,validTraits,migrateTraits} from './traits.js';
import {auctionReserved,auctionNurseries,syncAuctions,validAuctions} from './auctions.js';
import {snapshotBug,offspringLineage,checkLineCapacity,recordLineBrood,recordLineEmergence,validLines,validLineage} from './lines.js';
export const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
export const round = v => Math.round(v * 10) / 10;
export const CRITICAL_HEALTH=20,CRITICAL_DAYS=7,SPECIMEN_CASE_COST=80;
export const DAILY_SUPPORT_RULES=Object.freeze({base:15,adult:2,offspring:1,healthy:1,cap:80});
const uuid = () => typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
export function createBug(species, sex, genetic, day, source = '채집', parents = null, quality = 1, rearing = null, {random=Math.random,traits} = {}) {
  const range = sizeRange(species,sex,!!parents);
  const trait = clamp(genetic, 0, 1);
  const expression = Math.pow(trait,1.6);
  const length = round(parents?rearedLength(species,sex,trait,parents,quality,rearing):range[0]+expression*(range[1]-range[0]));
  const features=traits===undefined?rollTraits(species,random):traits;
  if(!validTraits(species,features))throw new Error('이 종에 맞지 않는 특성입니다.');
  return { id: uuid(), species, sex, traits:[...features], genetic: trait, length, name: SPECIES[species].name, hunger: 76, health: 95, hygiene: 90, born: day, source, parents, wins: 0, losses: 0, bredDay: -99, fightDay: -99, favorite:false,criticalDays:0 };
}
export function newGame(now=Date.now()) {
  return {version:5,dailyEvents:newDailyEvents(),lines:[],auctions:[],settings:{realTime:false,realGrowth:false},clock:{anchorAt:now},totalBreedings:0,totalEmergences:0,traps:[],researchClaimed:[],memorials:[],specimenCases:[{id:'case-1',name:'표본 케이스 1'}],careAidDay:0,day:1,coins:350,xp:0,inventory:{banana:6,basic_mat:4},jelly:6,substrate:4,energy:5,bugs:[],broods:[],discoveries:[],captures:0,records:{},fight:null,expedition:null,log:[]};
}
export function migrateSave(state,now=Date.now()){
  if(state.version===5){migrateDailyEvents(state,now);state.lines??=[];state.auctions??=[];migrateTraits(state);migrateGrowthPlans(state);migrateClock(state,now);return state;}
  if(![1,2,3,4].includes(state.version))return state;
  if(state.version===1){
  const defaults=state.bugs.filter(b=>b.source==='첫 친구');
  state.bugs=state.bugs.filter(b=>b.source!=='첫 친구');
  for(const b of defaults){const k=b.species+'-'+b.sex;if(state.records[k]===b.length)delete state.records[k];}
  for(const b of state.bugs){const k=b.species+'-'+b.sex;state.records[k]=Math.max(state.records[k]||0,b.length);}
  state.discoveries=[...new Set([...state.bugs,...state.broods].map(b=>b.species))];
  state.inventory={banana:state.jelly,basic_mat:state.substrate};
  state.xp=state.captures*24+state.bugs.reduce((n,b)=>n+b.wins*20+b.losses*8,0);
  state.fight=state.fight&&state.bugs.some(b=>b.id===state.fight.bugId)?state.fight:null;
  for(const b of state.broods){b.age=b.age<2?b.age:b.age<6?2+Math.floor((b.age-2)*2.5):12+(b.age-6)*2;b.medium='basic_mat';}
  state.log=state.log.filter(l=>!l.text.includes('여섯 친구')&&!l.text.includes('첫 친구'));
  state.expedition=null;state.version=2;
  }
  if(state.version<3){
  state.totalBreedings=state.broods.length+Math.floor(state.bugs.filter(b=>b.source==='번식').length/3);state.totalEmergences=Math.floor(state.bugs.filter(b=>b.source==='번식').length/3);
  const resize=b=>{if(b.species==='king'){const cap=sizeRange('king',b.sex,!!b.parents)[1];if(b.length>cap)b.length=round(sizeRange('king',b.sex,!!b.parents)[0]+(cap-sizeRange('king',b.sex,!!b.parents)[0])*Math.pow(Number.isFinite(b.genetic)?b.genetic:1,1.6));}};
  state.bugs.forEach(resize);if(state.expedition?.encounter)resize(state.expedition.encounter.bug);
  for(const b of state.broods)b.parents.forEach(resize);
  for(const sex of ['male','female']){const key='king-'+sex;if(state.records[key]>sizeRange('king',sex,false)[1])state.records[key]=Math.max(0,...state.bugs.filter(b=>b.species==='king'&&b.sex===sex).map(b=>b.length));}
  state.traps=[];state.researchClaimed=[];state.fight=null;
  }
  if(state.version<4){state.settings={realTime:false,realGrowth:false};state.clock={anchorAt:now};state.broods.forEach(b=>b.growthMode='fast');state.bugs.forEach(b=>b.favorite=!!b.favorite);}
  state.memorials=[];state.specimenCases=[{id:'case-1',name:'표본 케이스 1'}];state.careAidDay=0;state.bugs.forEach(b=>b.criticalDays=0);
  if(state.expedition?.encounter)state.expedition.encounter.bug.criticalDays=0;
  state.version=5;migrateDailyEvents(state,now);state.lines??=[];state.auctions??=[];migrateTraits(state);migrateGrowthPlans(state);migrateClock(state,now);return state;
}
function migrateClock(state,now){
 if(state.clock.calendar)return;
 // Settle the old complete-24h clock once, then start calendar time without
 // granting an extra day for the partial day already in progress.
 if(state.settings.realTime)syncRealTime(state,now);
 state.clock.anchorAt=now;state.clock.calendar=true;
}
export function gainXP(state,n){const old=keeperLevel(state);state.xp+=n;const level=keeperLevel(state);if(level>old)note(state,`사육 레벨 ${level} 도달 · 상점 개방 조건 확인`);}
function spend(state,id,n=1){if(!PRODUCTS[id]||(state.inventory[id]||0)<n)throw new Error('해당 상품의 재고가 부족합니다.');state.inventory[id]-=n;syncSupplies(state);}
function available(state,kind){return Object.keys(state.inventory).find(id=>state.inventory[id]>0&&PRODUCTS[id]?.kind===kind);}
function note(state, text, day=state.day) { state.log.unshift({day,text}); state.log = state.log.slice(0, 40); }
function bugOf(state,id) { const b=state.bugs.find(b=>b.id===id); if(!b) throw new Error('개체를 먼저 선택해 주세요.'); return b; }
export function care(state,id,kind,itemId){
  const b=bugOf(state,id);
  if(state.fight?.bugId===id&&!state.fight.finished)throw new Error('경기 종료 후 돌볼 수 있습니다.');
  if(!['jelly','clean'].includes(kind))throw new Error('알 수 없는 돌봄입니다.');
  const item=itemId||(kind==='clean'?adultBeddingItems(state)[0]?.[0]:available(state,'jelly'));const product=PRODUCTS[item];
  if(kind==='clean'&&!isAdultBedding(product))throw new Error('성충 교체에는 참나무 사육매트 또는 코코넛 깔개매트가 필요합니다. 유충용 매트는 번식통에서 사용하세요.');
  if(kind==='jelly'&&product?.kind!=='jelly')throw new Error('사용할 젤리를 선택하세요.');
  if(kind==='jelly'){
    if(b.hunger>=100&&b.health>=100)throw new Error('포만감과 건강이 이미 100입니다.');
    spend(state,item);b.hunger=100;b.health=clamp(b.health+product.health);b.dietDays=product.duration;b.dietDecay=product.decay;b.jellyId=item;
  }else if(kind==='clean'){
    if(b.hygiene>=100)throw new Error('청결이 이미 100입니다.');
    spend(state,item);b.hygiene=100;b.health=clamp(b.health+8);b.beddingDays=product.duration;b.beddingDecay=product.hygiene;b.matId=item;
  }else throw new Error('알 수 없는 돌봄입니다.');
  if(b.health>CRITICAL_HEALTH)b.criticalDays=0;
  if(b['xp_'+kind]!==state.day){gainXP(state,5);b['xp_'+kind]=state.day;}
  note(state,`${b.name} · ${product.name} 사용`);return b;
}
export function buy(state,id){
  const item=PRODUCTS[id];if(!item)throw new Error('상품을 선택하세요.');
  const access=shopAccess(state,item.area);if(!access.unlocked)throw new Error(access.missing.join(' · ')+' 필요');
  if(state.coins<item.price)throw new Error('잎사귀가 부족합니다.');
  state.coins-=item.price;state.inventory[id]=(state.inventory[id]||0)+item.qty;syncSupplies(state);
  note(state,`${item.name} ${item.qty}개 구매`);return `${item.name} ${item.qty}개 구매`;
}
export function startExpedition(state,location,random=Math.random){
  if(state.expedition)throw new Error('진행 중인 채집을 먼저 마치세요.');
  if(!Object.hasOwn(LOCATIONS,location))throw new Error('채집 장소를 선택하세요.');
  if(state.energy<LOCATIONS[location].cost)throw new Error('오늘 탐험 횟수를 모두 사용했습니다.');
  if(state.bugs.length+state.broods.length*3+auctionReserved(state)>=48)throw new Error('사육실 수용량은 48마리입니다.');
  state.energy-=LOCATIONS[location].cost;
  const spots=Array.from({length:7},(_,i)=>({x:46+i*60+Math.floor(random()*12),y:90+Math.floor(random()*105),kind:['sap','bark','leaf'][Math.floor(random()*3)],searched:false,rich:random()<0.55}));
  const guaranteed=Math.floor(random()*spots.length);spots[guaranteed].rich=true;
  state.expedition={id:uuid(),location,spots,noise:0,phase:'search',encounter:null,attempts:0};
  return state.expedition;
}
export function inspectSpot(state,index,random=Math.random){
  const e=state.expedition;if(!e||e.phase!=='search')throw new Error('수색 중에만 조사할 수 있습니다.');
  const spot=e.spots[index];if(!spot||spot.searched)throw new Error('다른 흔적을 조사하세요.');
  spot.searched=true;e.noise=clamp(e.noise+7,0,100);
  if(!spot.rich&&random()<.72){if(e.spots.every(s=>s.searched)){state.expedition=null;note(state,'채집 종료 · 발견 없음');}return null;}
  let roll=random();const entries=Object.entries(LOCATIONS[e.location].chances);let species=entries.at(-1)[0];
  const weights=entries.map(([sp,v])=>v*(SPECIES[sp].preferred.includes(spot.kind)?1.35:1)*(SPECIES[sp].rarity&&!spot.rich?.35:1));const total=weights.reduce((a,b)=>a+b,0);roll*=total;
  for(let i=0;i<entries.length;i++){roll-=weights[i];if(roll<=0){species=entries[i][0];break;}}
  const sex=random()<.52?'male':'female',genetic=clamp((random()+random()+random())/3+(random()<.006?.16:0),0,1);
  const bug=createBug(species,sex,genetic,state.day,LOCATIONS[e.location].name,null,.5+random()*.4,null,{random});
  e.encounter={bug,x:spot.x,y:spot.y,alert:clamp(e.noise+SPECIES[species].rarity*8+LOCATIONS[e.location].difficulty*3),speed:(0.75+genetic*.55)*(1+SPECIES[species].rarity*.32),start:random()*Math.PI*2};e.phase='approach';
  return e.encounter;
}
export function approachInsect(state,mode){
  const e=state.expedition;if(!e||e.phase!=='approach')throw new Error('발견한 곤충이 없습니다.');
  if(!['slow','fast'].includes(mode))throw new Error('접근 방법을 선택하세요.');
  e.encounter.alert=clamp(e.encounter.alert+(mode==='slow'?-8:20));e.encounter.speed*=mode==='slow'?.85:1.25;e.phase='catch';return e.encounter;
}
export function finishCapture(state,accuracy){
  const e=state.expedition;if(!e||e.phase!=='catch'||!Number.isFinite(accuracy)||accuracy<0||accuracy>1)throw new Error('포획할 곤충이 없습니다.');
  if(state.bugs.length+state.broods.length*3+auctionReserved(state)>=48)throw new Error('사육실 공간이 부족합니다.');
  e.attempts++;const {threshold,maxAttempts}=captureDifficulty(e.encounter);
  if(accuracy<threshold){e.encounter.alert=clamp(e.encounter.alert+23);e.encounter.speed*=1.16;if(e.attempts>=maxAttempts||e.encounter.alert>=90){state.expedition=null;note(state,'채집 종료 · 포획 실패');return {escaped:true};}return {missed:true};}
  const bug=e.encounter.bug;state.bugs.push(bug);state.captures++;state.coins+=10;gainXP(state,24+SPECIES[bug.species].rarity*12);
  if(!state.discoveries.includes(bug.species))state.discoveries.push(bug.species);
  const key=bug.species+'-'+bug.sex,record=bug.length>(state.records[key]||0);state.records[key]=Math.max(state.records[key]||0,bug.length);
  state.expedition=null;note(state,`${bug.name} ${sexName(bug.sex)} ${bug.length} mm 채집`);return {bug,record};
}
function sexName(sex){return sex==='male'?'수컷':'암컷';}
export function cancelExpedition(state){if(!state.expedition)throw new Error('진행 중인 채집이 없습니다.');state.expedition=null;note(state,'채집 중단');}
export function breed(state, maleId, femaleId, random=Math.random, mediumId='basic_mat', chosenLineId) {
  const m=bugOf(state,maleId),f=bugOf(state,femaleId);
  if(m.sex!=='male'||f.sex!=='female')throw new Error('수컷 한 마리와 암컷 한 마리를 골라 주세요.');
  if(m.species!==f.species)throw new Error('같은 종끼리만 번식할 수 있어요.');
  if([m,f].some(b=>b.health<55||b.hunger<45))throw new Error('부모가 건강하고 충분히 먹어야 해요. 먼저 돌봐 주세요.');
  if([m,f].some(b=>state.day-b.bredDay<4))throw new Error('번식 후 4일 동안 쉬어야 해요.');
  if(state.broods.length+auctionNurseries(state)>=3)throw new Error('번식통 세 개가 모두 사용 중이에요. 우화를 기다려 주세요.');
  if(state.bugs.length+auctionReserved(state)+(state.broods.length+1)*3+(state.expedition?1:0)>48)throw new Error('후손과 채집 개체를 위한 사육실 공간이 부족합니다.');
  if(PRODUCTS[mediumId]?.kind!=='mat'||!compatibleFood(PRODUCTS[mediumId],m.species))throw new Error('이 종에 맞는 산란매트를 선택하세요.');
  if((state.inventory[mediumId]||0)<2)throw new Error('선택한 산란매트 2개가 필요합니다.');
  const lineage=offspringLineage(state,m,f,chosenLineId);checkLineCapacity(state,lineage);
  spend(state,mediumId,2);gainXP(state,30);m.bredDay=state.day;f.bredDay=state.day;m.hunger=clamp(m.hunger-12);f.hunger=clamp(f.hunger-18);
  const parents=[m,f].map(snapshotBug);
  const children=Array.from({length:3},()=>({sex:random()<.5?'male':'female',genetic:clamp((m.genetic+f.genetic)/2+(random()-.5)*.24,0,1)}));
  children.forEach(child=>child.traits=inheritTraits(m.species,parents,random));
  const brood={id:uuid(),species:m.species,lineage,parents,children,started:state.day,age:0,growthMode:state.settings?.realGrowth?'natural':'fast',growthPlan:rollGrowthPlan(m.species,random),food:100,qualitySum:0,qualityDays:0,foodSum:0,nutritionSum:0,fungusSum:0,medium:mediumId};
  state.broods.push(brood);recordLineBrood(state,brood);state.totalBreedings++;note(state,`${SPECIES[m.species].name} 산란 · 알 3개`);
  return brood;
}
export function broodStage(brood){return stageName(brood);}
export function careBrood(state,id,itemId){
  const b=state.broods.find(b=>b.id===id);if(!b)throw new Error('번식통을 찾을 수 없습니다.');
  if(!isLarva(broodStage(b)))throw new Error('애벌레 시기에만 먹이를 교체할 수 있습니다.');
  const item=itemId||Object.keys(state.inventory).find(id=>state.inventory[id]>0&&compatibleFood(PRODUCTS[id],b.species));
  if(!compatibleFood(PRODUCTS[item],b.species))throw new Error('이 종에 맞지 않는 애벌레 먹이입니다.');
  if(item.endsWith('_800')&&broodStage(b)==='3령')throw new Error('3령은 1400 mL 이상 균사병을 사용하세요.');
  if(b.food>=100&&b.medium===item)throw new Error('먹이가 이미 신선합니다.');
  spend(state,item);b.food=100;b.medium=item;if(b.careXP!==state.day){gainXP(state,8);b.careXP=state.day;}
  note(state,`${SPECIES[b.species].name} ${broodStage(b)} · ${PRODUCTS[item].name} 교체`);return b;
}
export function advanceDay(state){
  if(state.settings?.realTime)throw new Error('현실 시간 연동 중에는 한국 시각 자정에 자동으로 진행됩니다.');
  if(state.fight&&!state.fight.finished)throw new Error('진행 중인 투곤을 먼저 마쳐 주세요.');
  if(state.expedition)throw new Error('진행 중인 채집을 먼저 마치거나 중단하세요.');
  return applyDay(state);
}
export function dailySupport(state){
 const adults=state.bugs.length,offspring=state.broods.reduce((n,b)=>n+b.children.length,0);
 const healthy=state.bugs.filter(b=>b.health>=75&&b.hunger>=40).length;
 const {base,adult,offspring:young,healthy:bonus,cap}=DAILY_SUPPORT_RULES;
 const adultSupport=adults*adult,offspringSupport=offspring*young,careBonus=healthy*bonus;
 return {base,adults,offspring,healthy,adultSupport,offspringSupport,careBonus,total:Math.min(cap,base+adultSupport+offspringSupport+careBonus)};
}
function applyDay(state){
  state.fight=null;
  state.day++;state.energy=5;const events=[];
  const dead=[];
  for(const b of state.bugs){b.hunger=clamp(b.hunger-adultDecay(b,'jelly',state.settings.realTime));b.hygiene=clamp(b.hygiene-adultDecay(b,'clean',state.settings.realTime));b.dietDays=Math.max(0,(b.dietDays||0)-1);b.beddingDays=Math.max(0,(b.beddingDays||0)-1);b.health=clamp(b.health+(b.hunger<25?-10:b.hygiene<25?-7:3));b.criticalDays=b.health<=CRITICAL_HEALTH?(b.criticalDays||0)+1:0;if(b.criticalDays>=CRITICAL_DAYS){dead.push(b.id);state.memorials.push({id:b.id,bug:structuredClone(b),diedDay:state.day,status:'stored',preparedDay:null,readyDay:null,mountedDay:null,caseId:null,slot:null,work:null,caption:''});events.push(`${b.name} 사망 · 건강 ${CRITICAL_HEALTH} 이하 ${CRITICAL_DAYS}일 연속 · 보관함으로 이동`);}}
  state.bugs=state.bugs.filter(b=>!dead.includes(b.id));
  for(const m of state.memorials){const progress=tickSpecimen(m,state.day);if(progress)events.push(`${m.bug.name} · ${progress}`);}
  const support=dailySupport(state);state.coins+=support.total;
  const ready=[];
  for(const b of state.broods){
    const durations=broodDurations(b),oldStage=broodStage(b),i=stageIndex(b.age,durations);
    if(isLarva(oldStage)){
      const weight=FAST_DURATIONS[i]/durations[i],nutrition=PRODUCTS[b.medium]?.food||.72;
      b.foodSum??=Math.min(b.qualityDays,b.qualitySum/nutrition);b.nutritionSum??=b.qualityDays*nutrition;
      b.foodSum+=b.food/100*weight;b.nutritionSum+=nutrition*weight;
      b.fungusSum??=0;if(PRODUCTS[b.medium]?.kind==='fungus')b.fungusSum+=weight;
      b.qualitySum+=b.food/100*nutrition*weight;b.qualityDays+=weight;b.food=clamp(b.food-60/larvalFoodInterval(b,state.settings.realTime));
    }
    b.age++;
    const stage=broodStage(b),label=SPECIES[b.species].name;
    if(stage!==oldStage&&stage!=='성충')events.push(`${label} · ${stage==='1령'?'부화':stage==='번데기'?'용화':'탈피'} · ${stage}`);
    if(b.age>=broodGrowthDays(b)-1e-9){
      const quality=b.qualityDays?b.qualitySum/b.qualityDays:.5;
      const rearing=b.qualityDays&&Number.isFinite(b.foodSum)&&Number.isFinite(b.nutritionSum)?{care:b.foodSum/b.qualityDays,nutrition:b.nutritionSum/b.qualityDays,fungus:(b.fungusSum||0)/b.qualityDays}:null;
      const offspring=b.children.map(child=>({...createBug(b.species,child.sex,child.genetic,state.day,'번식',b.parents,quality,rearing,{traits:child.traits||[]}),name:SPECIES[b.species].name,lineage:b.lineage?structuredClone(b.lineage):null}));
      state.bugs.push(...offspring);recordLineEmergence(state,b,offspring,state.day);state.totalEmergences++;ready.push(b.id);gainXP(state,36);
      for(const o of offspring){const key=`${o.species}-${o.sex}`;state.records[key]=Math.max(state.records[key]||0,o.length);}
      events.push(`${SPECIES[b.species].name} 3마리 우화 · ${offspring.map(o=>o.length+' mm').join(' / ')}`);
    }
  }
  state.broods=state.broods.filter(b=>!ready.includes(b.id));
  gainXP(state,4);note(state,`${state.day}일째 · 지원금 ${support.total} 잎사귀${support.adults||support.offspring?` · 성충 ${support.adults}마리 · 번식통 후손 ${support.offspring}마리 · 관리 보너스 ${support.careBonus}`:''}`);
  events.forEach(e=>note(state,e));
  return events;
}
export function syncRealTime(state,now=Date.now()){
 migrateGrowthPlans(state);
 const auctionResult=syncAuctions(state,now),auctionMeta=auctionResult.changed?{auctionChanges:true,auctionEvents:auctionResult.events}:{};
 if(!state.settings?.realTime)return {days:0,events:[],...auctionMeta};
 if(!Number.isFinite(now)||now<0)throw new Error('현재 시간을 확인할 수 없습니다.');
 const days=Math.min(Math.max(0,state.clock.calendar?calendarDay(now)-calendarDay(state.clock.anchorAt):Math.floor((now-state.clock.anchorAt)/DAY_MS)),1000000-state.day);
 if(!days)return {days:0,events:[],...auctionMeta};
 // A saved match finishes before its insect's daily condition changes.
 while(state.fight&&!state.fight.finished)advanceFight(state);
 const events=[],detailedDays=Math.min(days,Math.max(40,...state.broods.map(b=>Math.ceil(broodGrowthDays(b)-b.age)+40)));
 for(let i=0;i<detailedDays;i++)events.push(...applyDay(state));
 const rest=days-detailedDays;
 // After every brood emerged and conditions settled, empty days need no long loop.
 if(rest){
  const before=state.day,beforeXP=state.xp,oldLevel=keeperLevel(state),first=Math.max(1,rest-39),levels=new Map();
  state.day+=rest;state.coins+=DAILY_SUPPORT_RULES.base*rest;state.xp+=4*rest;state.energy=5;
  for(let level=oldLevel+1;level<=keeperLevel(state);level++){const offset=Math.ceil((LEVEL_XP[level-1]-beforeXP)/4);if(offset>=first)levels.set(offset,level);}
  for(let i=first;i<=rest;i++){if(levels.has(i))note(state,`사육 레벨 ${levels.get(i)} 도달 · 상점 개방 조건 확인`,before+i);note(state,`${before+i}일째 · 지원금 ${DAILY_SUPPORT_RULES.base} 잎사귀`,before+i);}
 }
 state.clock.anchorAt=state.clock.calendar?midnightAt(now):state.clock.anchorAt+days*DAY_MS;
 return {days,events,...auctionMeta};
}
export function setTimeOptions(state,{realTime,realGrowth},now=Date.now()){
 if(typeof realTime!=='boolean'||typeof realGrowth!=='boolean'||realGrowth&&!realTime)throw new Error('실제 성장 기간은 현실 시간 연동과 함께 사용합니다.');
 syncRealTime(state,now);
 const mode=realGrowth?'natural':'fast';
 for(const b of [...state.broods,...(state.auctions||[]).filter(a=>a.status==='active'&&a.kind==='larva').map(a=>a.asset)]){const previous=b.growthMode||'fast';if(previous!==mode){b.age=convertGrowthAge(b.age,broodDurations(b,previous),broodDurations(b,mode));b.growthMode=mode;}}
 if(state.settings.realTime!==realTime){state.clock.anchorAt=now;state.clock.calendar=true;}
 state.settings={realTime,realGrowth};note(state,`시간 설정 · ${realTime?'현실 시간':'버튼 진행'} · ${realGrowth?'실제 성장 기간':'빠른 성장'}`);return state.settings;
}
export function toggleFavorite(state,id){const b=bugOf(state,id);b.favorite=!b.favorite;return b;}
export function careAidStatus(state){
 const jelly=state.coins<PRODUCTS.banana.price?Math.max(0,state.bugs.filter(b=>needsCare(b.hunger)).length-state.jelly):0;
 const adultNeed=state.bugs.filter(b=>needsCare(b.hygiene)).length,adultUsed=Math.min(adultNeed,adultBeddingCount(state));
 const beddingOnly=adultBeddingItems(state).filter(([,p])=>!p.food).reduce((n,[id])=>n+state.inventory[id],0);
 const larvalNeed=state.broods.filter(b=>isLarva(broodStage(b))&&needsCare(b.food)).length;
 const larvalSupply=Object.entries(state.inventory).reduce((n,[id,count])=>n+(PRODUCTS[id]?.kind==='mat'&&PRODUCTS[id].food?count:0),0)-Math.max(0,adultUsed-beddingOnly);
 const mat=state.coins<PRODUCTS.basic_mat.price?adultNeed-adultUsed+Math.max(0,larvalNeed-larvalSupply):0;
 return {eligible:state.careAidDay!==state.day&&(jelly>0||mat>0),jelly,mat,claimed:state.careAidDay===state.day};
}
export function claimCareAid(state){
 const aid=careAidStatus(state);if(!aid.eligible)throw new Error(aid.claimed?'오늘의 기초 사육 지원을 이미 받았습니다.':'잎사귀와 용품이 부족한 돌봄 대상이 있을 때 받을 수 있습니다.');
 state.inventory.banana=(state.inventory.banana||0)+aid.jelly;state.inventory.basic_mat=(state.inventory.basic_mat||0)+aid.mat;syncSupplies(state);state.careAidDay=state.day;
 note(state,`기초 사육 지원 · 젤리 ${aid.jelly}개 · 매트 ${aid.mat}개`);return aid;
}
function memorialOf(state,id){const m=state.memorials.find(m=>m.id===id);if(!m)throw new Error('보관 중인 개체를 선택해 주세요.');return m;}
export function prepareSpecimen(state,id){
 const m=memorialOf(state,id);if(m.status==='stored'){m.status='working';m.work=newSpecimenWork();note(state,`${m.bug.name} · 표본 작업대에 놓음`);}if(m.status==='mounted')throw new Error('이미 케이스에 보관된 표본입니다.');return m;
}
export function workSpecimen(state,id,task,point,payload={}){
 const m=memorialOf(state,id),previous=m.work?.phase;moveSpecimen(m,task,point,state.day,payload);
 if(m.work.phase!==previous)note(state,`${m.bug.name} · 표본 작업 ${m.work.phase==='relaxing'?'연화 대기':m.work.phase==='drying'?'건조 대기':m.work.phase==='casing'?'라벨 부착 완료':'단계 진행'}`);return m;
}
export function storeSpecimen(state,id,caseId,slot){
 const m=memorialOf(state,id);if(m.status!=='casing'||m.work?.phase!=='casing')throw new Error('연화·핀 고정·정리·건조·라벨 작업을 먼저 마쳐 주세요.');
 if(!state.specimenCases.some(c=>c.id===caseId)||!Number.isInteger(slot)||slot<0||slot>=CASE_SLOTS)throw new Error('표본 케이스의 빈 칸을 선택해 주세요.');
 if(state.memorials.some(m=>m.caseId===caseId&&m.slot===slot))throw new Error('이미 표본이 보관된 칸입니다.');
 m.caseId=caseId;m.slot=slot;m.status='mounted';m.work.phase='done';m.mountedDay=state.day;note(state,`${m.bug.name} · 표본 케이스 보관 · 생전 기록 보존`);return m;
}
export function addSpecimenCase(state){
 if(state.coins<SPECIMEN_CASE_COST)throw new Error(`케이스 추가에 ${SPECIMEN_CASE_COST} 잎사귀가 필요합니다.`);
 state.coins-=SPECIMEN_CASE_COST;const c={id:uuid(),name:`표본 케이스 ${state.specimenCases.length+1}`};state.specimenCases.push(c);note(state,c.name+' 추가');return c;
}
export function combatRating(b){
 const condition=(.65+b.health/100*.35)*(.85+b.hunger/100*.15);
 return Math.pow(b.length/45,2.2)*SPECIES[b.species].power*SPECIES[b.species].grip*condition*(1+(b.trainingGrip||0)*.005);
}
export function makeOpponent(state,id,random=Math.random){
 if(state.fight&&!state.fight.finished)throw new Error('진행 중인 투곤을 먼저 마치세요.');
 const b=bugOf(state,id);if(b.sex!=='male')throw new Error('성충 수컷만 참가할 수 있습니다.');
 if(b.health<60||b.hunger<40)throw new Error('건강 60·포만감 40 이상이 필요합니다.');
 if(b.fightDay===state.day)throw new Error('오늘 이미 참가한 개체입니다.');
 const pool=['king','flat','rhino','saw','little','stag','king','flat','rhino','saw','little','redleg','dauria','twospot'];
 const sp=pool[Math.floor(random()*pool.length)],trait=clamp(.22+(random()+random())*.34,0,1);
 const rival=createBug(sp,'male',trait,state.day,'투곤 상대',null,1,null,{random});
 state.fight={model:3,bugId:id,rival,elapsed:0,position:0,playerStamina:100+(b.trainingStamina||0)*1.5,opponentStamina:100,events:[],finished:false};
 return state.fight;
}
function finishFight(state,fight,won,retreated=false){
 const b=bugOf(state,fight.bugId);fight.finished=true;fight.won=won;fight.retreated=retreated;b.fightDay=state.day;
 b.hunger=clamp(b.hunger-12);b.health=clamp(b.health-(retreated?2:5));
 if(won){b.wins++;state.coins+=65;gainXP(state,20);}else{b.losses++;if(!retreated){state.coins+=20;gainXP(state,8);}}
 note(state,`${b.name} 투곤 ${retreated?'기권':won?'승리 · +65 잎사귀':'패배 · +20 잎사귀'}`);
}
export function advanceFight(state,random=Math.random){
 const f=state.fight;if(!f||f.finished)throw new Error('진행 중인 경기가 없습니다.');
 const b=bugOf(state,f.bugId),p=combatRating(b)*(.72+f.playerStamina/100*.28)*(.94+random()*.12),o=combatRating(f.rival)*(.72+f.opponentStamina/100*.28)*(.94+random()*.12);
 const pressure=(p-o)/(p+o);f.elapsed++;
 f.position=clamp(f.position+pressure*28+(random()-.5)*1.6,-100,100);
 f.playerStamina=clamp(f.playerStamina-(2.1+Math.max(0,-pressure)*3),0,120);f.opponentStamina=clamp(f.opponentStamina-(2.1+Math.max(0,pressure)*3),0,120);
 const playerActs=random()<p/(p+o),actor=playerActs?b:f.rival;
 const motion=actor.species==='rhino'?'뿔로 들어올림':random()<.65?'큰턱으로 밀어붙임':'앞다리로 지지';
 f.events.unshift({step:f.elapsed,playerActs,text:`${SPECIES[actor.species].name} · ${motion}`});f.events=f.events.slice(0,10);
 if(Math.abs(f.position)>=100||f.playerStamina<=0||f.opponentStamina<=0||f.elapsed>=36){
  const won=Math.abs(f.position)>=100?f.position>0:f.playerStamina<=0&&f.opponentStamina>0?false:f.opponentStamina<=0&&f.playerStamina>0?true:f.position===0?combatRating(b)>=combatRating(f.rival):f.position>0;
  finishFight(state,f,won);
 }
 return f;
}
export function retreatFight(state){if(!state.fight||state.fight.finished)throw new Error('진행 중인 경기가 없습니다.');finishFight(state,state.fight,false,true);}
export function train(state,id,kind){
 const b=bugOf(state,id),gear=kind==='grip'?'rope_set':kind==='stamina'?'race_track':null;
 if(!gear||!state.inventory[gear])throw new Error('해당 훈련 장비가 필요합니다.');
 if(state.fight?.bugId===id&&!state.fight.finished)throw new Error('경기 종료 후 훈련할 수 있습니다.');
 if(b.trainDay===state.day)throw new Error('하루에 한 번만 훈련할 수 있습니다.');
 if(b.health<60||b.hunger<45)throw new Error('건강 60·포만감 45 이상이 필요합니다.');
 const key=kind==='grip'?'trainingGrip':'trainingStamina';if((b[key]||0)>=12)throw new Error('해당 훈련을 모두 마쳤습니다.');
 if(state.coins<20)throw new Error('훈련비 20 잎사귀가 필요합니다.');
 state.coins-=20;b[key]=Math.min(12,(b[key]||0)+2);b.trainDay=state.day;b.hunger=clamp(b.hunger-8);gainXP(state,6);note(state,`${b.name} · ${kind==='grip'?'발힘':'지구력'} 훈련`);return b;
}
export function placeTrap(state,location,itemId){
 if(!LOCATIONS[location]||PRODUCTS[itemId]?.kind!=='trap')throw new Error('채집지와 미끼 덫을 선택하세요.');
 if(state.traps.length>=2)throw new Error('설치 가능한 덫은 2개입니다.');
 if(state.traps.some(t=>t.location===location))throw new Error('이 채집지에 이미 덫이 있습니다.');
 spend(state,itemId);const t={id:uuid(),location,itemId,placed:state.day,ready:state.day+1};state.traps.push(t);note(state,`${LOCATIONS[location].name} · ${PRODUCTS[itemId].name} 설치`);return t;
}
export function checkTrap(state,id,random=Math.random){
 const t=state.traps.find(t=>t.id===id);if(!t)throw new Error('덫을 찾을 수 없습니다.');
 if(state.day<t.ready)throw new Error('다음 날 확인할 수 있습니다.');
 if(state.expedition)throw new Error('진행 중인 채집을 먼저 마치세요.');
 if(state.bugs.length+state.broods.length*3+auctionReserved(state)>=48)throw new Error('사육 공간이 부족합니다.');
 state.traps=state.traps.filter(t=>t.id!==id);
 if(random()<.28){note(state,`${LOCATIONS[t.location].name} · 덫 확인 · 발견 없음`);return null;}
 const kind=t.itemId==='fruit_trap'?'leaf':t.itemId==='sap_trap'?'sap':'bark';
 const spots=Array.from({length:7},(_,i)=>({x:240,y:170,kind,searched:i!==0,rich:true}));
 state.expedition={id:uuid(),location:t.location,spots,noise:0,phase:'search',encounter:null,attempts:0};
 const e=inspectSpot(state,0,random);
 if(t.itemId==='light_trap'&&random()<.3){const rare=Object.keys(LOCATIONS[t.location].chances).filter(sp=>SPECIES[sp].rarity);if(rare.length){const sp=rare[Math.floor(random()*rare.length)];e.bug=createBug(sp,random()<.52?'male':'female',(random()+random()+random())/3,state.day,LOCATIONS[t.location].name+' · 덫',null,1,null,{random});e.alert=SPECIES[sp].rarity*8;e.speed=(.75+e.bug.genetic*.55)*(1+SPECIES[sp].rarity*.32);}}
 e.bug.source=LOCATIONS[t.location].name+' · 덫';note(state,`${LOCATIONS[t.location].name} · 덫에 곤충 발견`);return e;
}
export function claimResearch(state,id){const r=currentResearch(state);if(!r||r.id!==id||!r.complete(state))throw new Error('현재 의뢰의 조건을 먼저 충족하세요.');state.researchClaimed.push(id);state.coins+=r.coins;gainXP(state,r.xp);note(state,`연구소 의뢰 완료 · ${r.name} · +${r.coins} 잎사귀`);return r;}
export function validateSave(s){
  const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
  if(!s||![1,2,3,4,5].includes(s.version)||!finite(s.day,1,1000000)||!Number.isInteger(s.day)||!finite(s.coins,0,1e9)||!finite(s.jelly,0,1e6)||!finite(s.substrate,0,1e6)||!finite(s.energy,0,5))return false;
  if(!Array.isArray(s.bugs)||s.bugs.length>48||!Array.isArray(s.broods)||s.broods.length>3||s.bugs.length+s.broods.length*3>48||!Array.isArray(s.log)||!Array.isArray(s.discoveries)||!s.records||!finite(s.captures,0,1e9))return false;
  if(s.version>=4&&(!s.settings||typeof s.settings.realTime!=='boolean'||typeof s.settings.realGrowth!=='boolean'||s.settings.realGrowth&&!s.settings.realTime||!s.clock||!finite(s.clock.anchorAt,0,8.64e15)||(s.clock.calendar!==undefined&&typeof s.clock.calendar!=='boolean')))return false;
  if(!validLines(s)||s.dailyEvents!==undefined&&!validDailyEvents(s.dailyEvents))return false;
  if(s.worldExchange!==undefined&&(!s.worldExchange||!Number.isSafeInteger(s.worldExchange.lastAt)||!finite(s.worldExchange.lastAt,1,8.64e15)))return false;
  const validBug=b=>b&&typeof b.id==='string'&&Object.hasOwn(SPECIES,b.species)&&validTraits(b.species,b.traits)&&validLineage(s,b.lineage,b.species)&&['male','female'].includes(b.sex)&&typeof b.name==='string'&&b.name.length<=60&&finite(b.length,1,100)&&finite(b.genetic,0,1)&&['hunger','health','hygiene'].every(k=>finite(b[k],0,100))&&finite(b.born,1,s.day)&&finite(b.bredDay,-99,s.day)&&finite(b.fightDay,-99,s.day)&&finite(b.wins,0,1e6)&&finite(b.losses,0,1e6)&&['dietDays','beddingDays'].every(k=>b[k]===undefined||finite(b[k],0,4))&&['dietDecay','beddingDecay'].every(k=>b[k]===undefined||finite(b[k],0,100))&&['trainingGrip','trainingStamina'].every(k=>b[k]===undefined||finite(b[k],0,12))&&(b.favorite===undefined||typeof b.favorite==='boolean');
  if(s.version>=2){
    if(!finite(s.xp,0,1e9)||!s.inventory||typeof s.inventory!=='object'||Array.isArray(s.inventory)||Object.entries(s.inventory).some(([id,n])=>!Object.hasOwn(PRODUCTS,id)||!finite(n,0,1e6)||!Number.isInteger(n)))return false;
    if(s.expedition){const e=s.expedition;if(!Object.hasOwn(LOCATIONS,e.location)||!['search','approach','catch'].includes(e.phase)||!Array.isArray(e.spots)||e.spots.length!==7||!finite(e.noise,0,100)||!finite(e.attempts,0,3)||e.spots.some(p=>!finite(p.x,0,480)||!finite(p.y,0,276)||typeof p.searched!=='boolean'||typeof p.rich!=='boolean'||!['sap','bark','leaf'].includes(p.kind)))return false;if(e.player&&(!finite(e.player.x,20,460)||!finite(e.player.y,85,260)))return false;if(e.phase!=='search'&&(!e.encounter||!finite(e.encounter.alert,0,100)||!finite(e.encounter.speed,.1,10)||!finite(e.encounter.start,0,7)||!finite(e.encounter.x,0,480)||!finite(e.encounter.y,0,276)||!validBug(e.encounter.bug)))return false;}
  }
  if(s.version>=3&&(!finite(s.totalBreedings,0,1e9)||!finite(s.totalEmergences,0,1e9)))return false;
  if(s.version>=3&&(!Array.isArray(s.traps)||s.traps.length>2||s.traps.some(t=>typeof t.id!=='string'||!LOCATIONS[t.location]||PRODUCTS[t.itemId]?.kind!=='trap'||!finite(t.placed,1,s.day)||t.ready!==t.placed+1)||!Array.isArray(s.researchClaimed)||new Set(s.researchClaimed).size!==s.researchClaimed.length||s.researchClaimed.some(id=>!RESEARCH_REQUESTS.some(r=>r.id===id))))return false;
  const ids=new Set();
  for(const b of s.bugs){if(!validBug(b)||ids.has(b.id)||s.version>=5&&(!Number.isInteger(b.criticalDays)||!finite(b.criticalDays,0,CRITICAL_DAYS-1)))return false;ids.add(b.id);}
  if(s.version>=5){
   if(!Array.isArray(s.memorials)||!Number.isInteger(s.careAidDay)||!finite(s.careAidDay,0,s.day)||!Array.isArray(s.specimenCases)||!s.specimenCases.length||s.specimenCases.some(c=>!c||typeof c.id!=='string'||typeof c.name!=='string'||!c.name||c.name.length>40)||new Set(s.specimenCases.map(c=>c.id)).size!==s.specimenCases.length)return false;
   const archivedIds=new Set(),occupied=new Set();
   for(const m of s.memorials){
    // Preserve specimens that died under the former three-day rule.
    if(!m||typeof m.id!=='string'||m.id!==m.bug?.id||ids.has(m.id)||archivedIds.has(m.id)||!validBug(m.bug)||![3,CRITICAL_DAYS].includes(m.bug.criticalDays)||m.bug.health>CRITICAL_HEALTH||!Number.isInteger(m.diedDay)||!finite(m.diedDay,m.bug.born,s.day)||!['stored','working','relaxing','drying','casing','mounted'].includes(m.status)||typeof m.caption!=='string'||m.caption.length>80)return false;
    archivedIds.add(m.id);
    if(m.status==='stored'){if(m.work!==null||m.preparedDay!==null||m.readyDay!==null)return false;}
    else {
     if(!validSpecimenWork(m.work))return false;const phase=m.work.phase;
     if(m.status==='working'&&!['chamber','pinning','posing','cleanup','labeling'].includes(phase)||m.status==='relaxing'&&phase!=='relaxing'||m.status==='drying'&&phase!=='drying'||m.status==='casing'&&phase!=='casing'||m.status==='mounted'&&phase!=='done')return false;
     if(phase==='chamber'){if(m.preparedDay!==null||m.readyDay!==null)return false;}
     else {if(!Number.isInteger(m.preparedDay)||!finite(m.preparedDay,m.diedDay,s.day)||!Number.isInteger(m.readyDay)||m.readyDay!==m.preparedDay+(['relaxing','pinning','posing'].includes(phase)?RELAX_DAYS:DRY_DAYS))return false;if(['relaxing','drying'].includes(phase)?s.day>=m.readyDay:s.day<m.readyDay)return false;}
    }
    if(m.status==='mounted'){const key=m.caseId+':'+m.slot;if(!s.specimenCases.some(c=>c.id===m.caseId)||!Number.isInteger(m.slot)||!finite(m.slot,0,CASE_SLOTS-1)||occupied.has(key)||!Number.isInteger(m.mountedDay)||!finite(m.mountedDay,m.readyDay,s.day))return false;occupied.add(key);}
    else if(m.caseId!==null||m.slot!==null||m.mountedDay!==null)return false;
   }
  }
  if(!s.discoveries.every(sp=>Object.hasOwn(SPECIES,sp))||s.log.some(l=>!l||!finite(l.day,1,s.day)||typeof l.text!=='string'||l.text.length>500)||s.log.length>40)return false;
  if(Object.entries(s.records).some(([k,v])=>!Object.keys(SPECIES).flatMap(sp=>[sp+'-male',sp+'-female']).includes(k)||!finite(v,0,100)))return false;
  if(s.fight){const f=s.fight;if(s.version>=3){
   if(f.model!==3||!ids.has(f.bugId)||!validBug(f.rival)||!finite(f.elapsed,0,36)||!Number.isInteger(f.elapsed)||!finite(f.position,-100,100)||!finite(f.playerStamina,0,120)||!finite(f.opponentStamina,0,120)||typeof f.finished!=='boolean'||!Array.isArray(f.events)||f.events.length>10||f.events.some(e=>!finite(e.step,1,36)||typeof e.playerActs!=='boolean'||typeof e.text!=='string'))return false;
  }else{const moves=['push','lift','guard'];if(!ids.has(f.bugId)||!f.rival||!Object.hasOwn(SPECIES,f.rival.species)||!finite(f.rival.length,1,100)||!finite(f.rival.health,0,100)||!finite(f.rival.hunger,0,100)||typeof f.rival.name!=='string'||!finite(f.player,0,2)||!finite(f.opponent,0,2)||!Array.isArray(f.rounds)||f.rounds.length>3||f.rounds.some(r=>!moves.includes(r.move)||!moves.includes(r.rivalMove)||typeof r.won!=='boolean')||typeof f.finished!=='boolean'||f.player+f.opponent!==f.rounds.length||f.finished!==(f.player===2||f.opponent===2))return false;}}
  const validBrood=(b,historical=false)=>{ if(!b||b.growthPlan!==undefined&&!validGrowthPlan(b.species,b.growthPlan)||s.version>=2&&!compatibleFood(PRODUCTS[b.medium],b.species)||typeof b.id!=='string'||!Object.hasOwn(SPECIES,b.species)||!validLineage(s,b.lineage,b.species)||!finite(b.started,1,s.day)||!finite(b.age,0,s.version===1?7:s.version<4?14:broodGrowthDays(b)-1e-9)||s.version<4&&!Number.isInteger(b.age)||s.version>=4&&(!['fast','natural'].includes(b.growthMode)||!historical&&b.growthMode!==(s.settings.realGrowth?'natural':'fast'))||!finite(b.food,0,100)||['foodSum','nutritionSum','fungusSum'].some(k=>b[k]!==undefined&&!finite(b[k],0,18))||!finite(b.qualitySum,0,s.version===1?4:s.version<4?12:18)||!finite(b.qualityDays,0,s.version===1?4:s.version<4?10:15)||s.version<4&&!Number.isInteger(b.qualityDays)||!Array.isArray(b.parents)||b.parents.length!==2||!b.parents.every(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.length<=60&&finite(p.length,1,100)&&p.species===b.species&&validTraits(p.species,p.traits)&&validLineage(s,p.lineage,p.species)&&['male','female'].includes(p.sex))||!Array.isArray(b.children)||b.children.length!==3||!b.children.every(c=>['male','female'].includes(c.sex)&&finite(c.genetic,0,1)&&validTraits(b.species,c.traits)))return false;return true;};
  const broodIds=new Set();
  if(!s.broods.every(b=>validBrood(b)&&!broodIds.has(b.id)&&(broodIds.add(b.id),true)))return false;
  return validAuctions(s,{validBug,validBrood});
}
export function release(state,id){
  const b=bugOf(state,id);if(state.fight?.bugId===id)throw new Error('투곤에 참가 중인 개체는 놓아줄 수 없어요.');
  state.bugs=state.bugs.filter(b=>b.id!==id);note(state,`${b.name}를 숲에 놓아주었어요.`);return b;
}
export function releaseMany(state,ids){
 if(!Array.isArray(ids)||!ids.length)throw new Error('놓아줄 개체를 선택해 주세요.');
 const bugs=[...new Set(ids)].map(id=>bugOf(state,id));
 if(bugs.some(b=>state.fight?.bugId===b.id))throw new Error('투곤에 참가 중인 개체는 놓아줄 수 없어요.');
 const selected=new Set(bugs.map(b=>b.id));state.bugs=state.bugs.filter(b=>!selected.has(b.id));
 note(state,`${bugs.length}마리를 숲에 놓아주었어요. · ${bugs.map(b=>b.name).join(' · ')}`);return bugs;
}
export function rename(state,id,name){
  const b=bugOf(state,id);const next=typeof name==='string'?name.trim():'';if(!next||next.length>16)throw new Error('이름은 1~16자로 적어 주세요.');b.name=next;return b;
}

export function collectDailyGuest(state,id,now=Date.now()){return takeEventGuest(state,id,createBug,now);}

export function finishDailyMission(state,id,now=Date.now()){const result=claimDailyEvent(state,id,now);let bug=null;if(result.guest&&state.bugs.length+state.broods.length*3+auctionReserved(state)<48)bug=takeEventGuest(state,id,createBug,now);return {...result,bug,pendingGuest:result.guest&&!bug};}
