import {SPECIES} from './world.js';
import {canImportLive,migrateCareer} from './career.js';
import {stableTraitRandom,validTraits} from './traits.js';
export const HOUR=3600000;
export const OVERSEAS_REGIONS={
 sumatra:{name:'수마트라',cost:1400,hours:2,theme:'deep',habitat:'저지대 수액 나무',chances:{sumatra_flat:.55,atlas:.30,caucasus:.15}},
 sulawesi:{name:'술라웨시',cost:1800,hours:3,theme:'grove',habitat:'열대 고목과 수액',chances:{metallifer:.65,atlas:.35}},
 malaysia:{name:'말레이시아',cost:1600,hours:2,theme:'valley',habitat:'산기슭 활엽수림',chances:{giraffe:.65,caucasus:.35}},
 india:{name:'인도',cost:2200,hours:3,theme:'mountain',habitat:'서늘한 산지 고목',chances:{antaeus:.65,grandis:.35}},
 borneo:{name:'보르네오',cost:2400,hours:3,theme:'deep',habitat:'울창한 열대우림',chances:{borneo_flat:.60,moellenkampi:.40}},
 java:{name:'자바',cost:1800,hours:2,theme:'oak',habitat:'산지 수액길',chances:{giraffe:.55,caucasus:.45}},
 australia:{name:'호주',cost:3000,hours:4,theme:'grove',habitat:'습한 고목과 유칼립투스 숲',chances:{rainbow:.60,golden:.40}},
 amazon:{name:'아마존',cost:4800,hours:5,theme:'island',habitat:'우림 가장자리와 유인등',chances:{hercules:.35,actaeon:.65}},
 philippines:{name:'필리핀',cost:2000,hours:2,theme:'island',habitat:'팔라완 고목 숲',chances:{palawan:.60,giraffe:.40}},
 taiwan:{name:'대만',cost:1200,hours:1,theme:'ridge',habitat:'산지 활엽수림',chances:{formosan:.60,sika:.40}},
 japan:{name:'일본',cost:1000,hours:1,theme:'oak',habitat:'참나무 수액길',chances:{japan_stag:.45,japan_saw:.55}},
 thailand:{name:'태국',cost:1500,hours:2,theme:'valley',habitat:'산기슭의 고목',chances:{antaeus:.40,giraffe:.40,caucasus:.20}},
 vietnam:{name:'베트남',cost:1400,hours:2,theme:'mountain',habitat:'북부 산림 수액',chances:{grandis:.40,antaeus:.35,giraffe:.25}},
 mexico:{name:'멕시코',cost:4200,hours:4,theme:'grove',habitat:'열대림 가장자리',chances:{elephas:.70,hercules:.30}},
 ecuador:{name:'에콰도르',cost:4600,hours:5,theme:'ridge',habitat:'안데스 운무림',chances:{neptune:.45,hercules:.55}},
 cameroon:{name:'카메룬',cost:4000,hours:4,theme:'deep',habitat:'열대 고목의 균사층',chances:{tarandus:.65,regius:.35}},
};
const note=(s,text)=>{s.log.unshift({day:s.day,text});s.log=s.log.slice(0,40);};
const validTime=now=>{if(!Number.isSafeInteger(now)||now<1||now>8.64e15-20*HOUR)throw new Error('현재 시간을 확인하세요.');};
export function startForeignTrip(s,region,now=Date.now()){
 validTime(now);const r=OVERSEAS_REGIONS[region];if(!r)throw new Error('원정지를 선택하세요.');if(s.foreignTrip)throw new Error('진행 중인 해외 원정을 먼저 마치세요.');
 if(s.coins<r.cost)throw new Error(`여행비 ${r.cost} 잎사귀가 필요합니다.`);
 migrateCareer(s);s.coins-=r.cost;s.foreignTrip={version:1,id:crypto.randomUUID(),region,phase:'outbound',started:now,waitUntil:now+r.hours*HOUR,surveys:0,catches:[]};note(s,`${r.name} 해외 원정 출발 · 여행비 ${r.cost} 잎사귀`);return s.foreignTrip;
}
export function syncForeignTrip(s,now=Date.now()){
 const t=s.foreignTrip;if(!t||now<t.waitUntil||!['outbound','surveying','returning'].includes(t.phase))return false;
 t.phase=t.phase==='returning'?'arrived':'field';return true;
}
export function surveyForeignTrip(s,createBug,now=Date.now()){
 validTime(now);syncForeignTrip(s,now);const t=s.foreignTrip;
 if(!t||t.phase!=='field'||t.surveys>=3)throw new Error('현지 도착 후 탐사할 수 있습니다. 한 원정에서 3회 탐사합니다.');
 const r=OVERSEAS_REGIONS[t.region],random=stableTraitRandom(`${t.id}:${t.surveys}:overseas-v1`);let ticket=random(),sp=Object.keys(r.chances).at(-1);
 for(const [id,weight] of Object.entries(r.chances)){ticket-=weight;if(ticket<=0){sp=id;break;}}
 const sex=random()<.55?'male':'female',genetic=Math.min(1,.40+(random()+random())*.28+(s.inventory.field_lens? .04:0));
 const bug=createBug(sp,sex,genetic,s.day,`${r.name} 해외 원정`,null,1,null,{random});t.catches.push({bug,handling:'live'});t.surveys++;
 t.phase=t.surveys===3?'field':'surveying';t.waitUntil=now+(t.surveys===3?0:HOUR);note(s,`${r.name} 현지 탐사 ${t.surveys}/3 · ${bug.name} ${bug.length} mm 발견`);return bug;
}
export function processForeignCatch(s,id){const t=s.foreignTrip,c=t?.catches.find(c=>c.bug.id===id);if(!c||c.handling!=='live'||['returning','arrived'].includes(t.phase))throw new Error('현지의 생체 개체를 선택하세요.');c.handling='specimen';note(s,`${c.bug.name} · 현지에서 표본용 처리`);return c;}
const reserved=s=>(s.auctions||[]).filter(a=>a.status==='active').reduce((n,a)=>n+(a.kind==='adult'?1:a.kind==='larva'?3:0),0);
export function returnForeignTrip(s,now=Date.now()){
 validTime(now);syncForeignTrip(s,now);const t=s.foreignTrip;if(!t||t.phase!=='field'||!t.surveys)throw new Error('현지 도착 후 최소 1회 탐사하고 귀국하세요.');
 const live=t.catches.filter(c=>c.handling==='live').length;
 if(live&&!canImportLive(s))throw new Error('해외 생체 취급 자격이 없습니다. 생체를 모두 현지에서 표본용으로 처리해야 귀국할 수 있습니다.');
 if(s.bugs.length+s.broods.length*3+reserved(s)+live>48)throw new Error('사육실 공간이 부족합니다. 공간을 비우거나 현지 개체를 표본용으로 처리하세요.');
 t.phase='returning';t.waitUntil=now+OVERSEAS_REGIONS[t.region].hours*HOUR;note(s,`${OVERSEAS_REGIONS[t.region].name}에서 귀국 출발 · 생체 ${live}마리 · 표본 재료 ${t.catches.length-live}점`);return t;
}
export function foreignMemorial(bug,day,region=null){const b=structuredClone(bug);b.health=0;b.criticalDays=7;return {id:b.id,bug:b,diedDay:day,status:'stored',preparedDay:null,readyDay:null,mountedDay:null,caseId:null,slot:null,work:null,caption:'',origin:'foreign',region};}
export function claimForeignReturn(s,now=Date.now()){
 validTime(now);syncForeignTrip(s,now);const t=s.foreignTrip;if(!t||t.phase!=='arrived')throw new Error('귀국 항공편 도착을 기다리세요.');
 const live=t.catches.filter(c=>c.handling==='live');if(live.length&&!canImportLive(s))throw new Error('생체 반입 자격이 필요합니다.');
 if(s.bugs.length+s.broods.length*3+reserved(s)+live.length>48)throw new Error('도착한 생체를 위한 사육실 공간을 먼저 비워 주세요.');
 const c=migrateCareer(s),r=OVERSEAS_REGIONS[t.region];c.regions[t.region]??={visits:0,species:[],claimed:false};const record=c.regions[t.region];record.visits++;
 for(const item of t.catches){const b=item.bug;b.born=s.day;
  if(item.handling==='live'){b.criticalDays=0;s.bugs.push(b);}else s.memorials.push(foreignMemorial(b,s.day,t.region));
  if(!s.discoveries.includes(b.species))s.discoveries.push(b.species);if(!record.species.includes(b.species))record.species.push(b.species);
  const key=b.species+'-'+b.sex;s.records[key]=Math.max(s.records[key]||0,b.length);
 }
 s.captures+=t.catches.length;s.xp=Math.min(1e9,s.xp+t.catches.length*45);s.foreignTrip=null;note(s,`${r.name} 원정 귀국 완료 · 생체 ${live.length}마리 · 표본 재료 ${t.catches.length-live.length}점`);return {region:t.region,live:live.length,specimens:t.catches.length-live.length};
}
export function processOwnedForeign(s,id){const b=s.bugs.find(b=>b.id===id);if(!b||!SPECIES[b.species].foreign)throw new Error('사육 중인 해외종을 선택하세요.');if(s.fight?.bugId===id&&!s.fight.finished)throw new Error('투곤을 마친 뒤 처리하세요.');s.bugs=s.bugs.filter(b=>b.id!==id);if(s.fight?.bugId===id)s.fight=null;const m=foreignMemorial(b,s.day);s.memorials.push(m);note(s,`${b.name} · 표본용 처리 · 보관함으로 이동`);return m;}
export function regionGoals(s){return Object.entries(OVERSEAS_REGIONS).map(([id,r])=>{const record=s.career?.regions[id];return {id,...r,visits:record?.visits||0,count:record?.species.length||0,total:Object.keys(r.chances).length,claimed:record?.claimed||false};});}
export function claimRegion(s,id){const g=regionGoals(s).find(g=>g.id===id);if(!g||g.claimed||g.count!==g.total)throw new Error('이 원정지의 모든 종을 기록하세요.');s.career.regions[id].claimed=true;s.coins=Math.min(1e9,s.coins+Math.round(g.cost*.6));s.xp=Math.min(1e9,s.xp+150);note(s,`${g.name} 원정 도감 완성 · +${Math.round(g.cost*.6)} 잎사귀`);return g;}
export function validOverseas(s,validBug){
 for(const [id,r] of Object.entries(s.career?.regions||{})){if(!OVERSEAS_REGIONS[id]||!r||!Number.isInteger(r.visits)||r.visits<1||r.visits>1e6||!Array.isArray(r.species)||!r.species.length||new Set(r.species).size!==r.species.length||r.species.some(sp=>!OVERSEAS_REGIONS[id].chances[sp])||typeof r.claimed!=='boolean'||r.claimed&&r.species.length!==Object.keys(OVERSEAS_REGIONS[id].chances).length)return false;}
 const t=s.foreignTrip;if(t===undefined||t===null)return true;
 if(!t||t.version!==1||typeof t.id!=='string'||!t.id||t.id.length>128||!OVERSEAS_REGIONS[t.region]||!['outbound','field','surveying','returning','arrived'].includes(t.phase)||!Number.isSafeInteger(t.started)||t.started<1||!Number.isSafeInteger(t.waitUntil)||t.waitUntil<t.started||!Number.isInteger(t.surveys)||t.surveys<0||t.surveys>3||!Array.isArray(t.catches)||t.catches.length!==t.surveys)return false;
 const ids=new Set([...s.bugs.map(b=>b.id),...s.memorials.map(m=>m.id),...(s.auctions||[]).filter(a=>a.status==='active').map(a=>a.asset.id)]);
 if(t.catches.some(c=>!c||!['live','specimen'].includes(c.handling)||!validBug(c.bug)||!validTraits(c.bug.species,c.bug.traits)||!OVERSEAS_REGIONS[t.region].chances[c.bug.species]||ids.has(c.bug.id)||(ids.add(c.bug.id),false)))return false;
 if(t.phase==='outbound'&&t.surveys!==0||t.phase==='surveying'&&(t.surveys<1||t.surveys>=3)||['returning','arrived'].includes(t.phase)&&(!t.surveys||t.catches.some(c=>c.handling==='live')&&!canImportLive(s)))return false;
 return true;
}
