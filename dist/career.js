import {SPECIES,sizeRange} from './world.js';
export const QUALIFICATIONS={
 overseas_live:{name:'해외 생체 취급 자격',fee:6000,xp:1500,reared:12,description:'해외 원정에서 생체 반입 · 해외종 성충·유충 판매'},
 protected_sale:{name:'보호종 판매 자격',fee:9000,xp:3000,reared:24,description:'두점박이사슴벌레 성충·유충 판매'},
};
export const LEAGUE_CLASSES={light:{name:'소형급',min:0,max:40},middle:{name:'중형급',min:40,max:65},heavy:{name:'대형급',min:65,max:95},giant:{name:'초대형급',min:95,max:200}};
export const LEAGUE_REWARDS=[{points:6,coins:120,xp:30},{points:15,coins:320,xp:70},{points:30,coins:750,xp:150}];
const note=(s,text)=>{s.log.unshift({day:s.day,text});s.log=s.log.slice(0,40);};
const week=s=>Math.floor((s.day-1)/7);
export const careerWeek=week;
export function newCareer(){return {version:1,qualifications:[],reared:0,careRecords:[],regions:{},albumClaimed:[],ordersClaimed:[],league:{week:0,classes:{},history:[]}};}
export function migrateCareer(s){
 if(s.career)return s.career;
 s.career=newCareer();s.career.league.week=week(s);
 // Keep credit for insects already raised before this update, including archives.
 const known=new Map([...s.bugs,...(s.memorials||[]).map(m=>m.bug),...(s.auctions||[]).filter(a=>a.kind==='adult').map(a=>a.asset)].map(b=>[b.id,b]));
 for(const b of known.values())if(s.day-b.born>=3){s.career.careRecords.push({id:b.id,days:3,lastDay:s.day});s.career.reared++;}
 return s.career;
}
export function recordCare(s,b){
 const c=migrateCareer(s);let r=c.careRecords.find(r=>r.id===b.id);
 if(!r){if(c.careRecords.length>=4096)return;c.careRecords.push(r={id:b.id,days:0,lastDay:0});}
 if(r.lastDay===s.day||r.days>=3)return;
 r.days++;r.lastDay=s.day;if(r.days===3){c.reared++;note(s,`${b.name} · 3일 돌봄 기록 완료 · 누적 사육 ${c.reared}마리`);}
}
export function qualificationStatus(s,id){
 const q=QUALIFICATIONS[id];if(!q)throw new Error('자격을 선택하세요.');
 const owned=s.career?.qualifications.includes(id)||false;
 const requirements=[{label:`3일 돌봄 완료 ${q.reared}마리`,current:s.career?.reared||0,target:q.reared,done:(s.career?.reared||0)>=q.reared},{label:`EXP ${q.xp}`,current:s.xp,target:q.xp,done:s.xp>=q.xp},{label:`${q.fee.toLocaleString()} 잎사귀`,current:s.coins,target:q.fee,done:s.coins>=q.fee}];
 return {...q,owned,requirements,eligible:!owned&&requirements.every(r=>r.done)};
}
export function earnQualification(s,id){migrateCareer(s);const q=qualificationStatus(s,id);if(q.owned)throw new Error('이미 취득한 자격입니다.');if(!q.eligible)throw new Error('사육 실적·경험치·취득 비용을 모두 충족해야 합니다.');s.coins-=q.fee;s.career.qualifications.push(id);note(s,`${q.name} 취득 · ${q.fee} 잎사귀`);return q;}
export function liveSaleQualification(species){return SPECIES[species]?.foreign?'overseas_live':species==='twospot'?'protected_sale':null;}
export function canSellLive(s,species){const q=liveSaleQualification(species);return !q||!!s.career?.qualifications.includes(q);}
export const canImportLive=s=>!!s.career?.qualifications.includes('overseas_live');
export function requireLiveSale(s,species){const q=liveSaleQualification(species);if(q&&!canSellLive(s,species))throw new Error(`${QUALIFICATIONS[q].name}이 있어야 생체를 판매할 수 있습니다. 표본은 자격 없이 판매할 수 있습니다.`);}
export function leagueClass(b){return Object.keys(LEAGUE_CLASSES).find(id=>b.length>=LEAGUE_CLASSES[id].min&&b.length<LEAGUE_CLASSES[id].max)||'giant';}
export function syncLeague(s){
 const l=migrateCareer(s).league,w=week(s);if(l.week===w)return false;
 if(Object.keys(l.classes).length)l.history.unshift({week:l.week,classes:structuredClone(l.classes)});
 l.history=l.history.slice(0,20);l.week=w;l.classes={};s.career.ordersClaimed=s.career.ordersClaimed.filter(id=>Number(id.split(':')[0])>=w-20);return true;
}
export function recordLeagueFight(s,b,won,retreated=false){
 syncLeague(s);if(retreated)return;const id=leagueClass(b),l=s.career.league.classes;
 l[id]??={points:0,wins:0,played:0,claimed:[]};l[id].points+=won?3:1;l[id].wins+=won?1:0;l[id].played++;
 note(s,`${LEAGUE_CLASSES[id].name} 리그 · ${won?'+3':'+1'}점 · 이번 주 ${l[id].points}점`);
}
export function claimLeagueReward(s,id,points){
 syncLeague(s);const l=s.career.league.classes[id],r=LEAGUE_REWARDS.find(r=>r.points===points);
 if(!l||!r||l.points<points||l.claimed.includes(points))throw new Error('아직 받을 수 없는 리그 보상입니다.');
 l.claimed.push(points);s.coins=Math.min(1e9,s.coins+r.coins);s.xp=Math.min(1e9,s.xp+r.xp);note(s,`${LEAGUE_CLASSES[id].name} ${points}점 보상 · +${r.coins} 잎사귀`);return r;
}
export function albumGoals(s){
 const domestic=Object.keys(SPECIES).filter(sp=>!SPECIES[sp].foreign),foreign=Object.keys(SPECIES).filter(sp=>SPECIES[sp].foreign);
 return [{id:'domestic',name:`국내 ${domestic.length}종 도감`,species:domestic,coins:1500,xp:300},{id:'foreign',name:`해외 ${foreign.length}종 도감`,species:foreign,coins:6000,xp:1000}].map(g=>({...g,count:g.species.filter(sp=>s.discoveries.includes(sp)).length,claimed:!!s.career?.albumClaimed.includes(g.id)}));
}
export function claimAlbum(s,id){migrateCareer(s);const g=albumGoals(s).find(g=>g.id===id);if(!g||g.claimed||g.count!==g.species.length)throw new Error('도감 수집 목표를 먼저 완료하세요.');s.career.albumClaimed.push(id);s.coins=Math.min(1e9,s.coins+g.coins);s.xp=Math.min(1e9,s.xp+g.xp);note(s,`${g.name} 완성 · +${g.coins} 잎사귀`);return g;}
export function collectorOrders(s){
 const w=week(s),domestic=Object.keys(SPECIES).filter(sp=>!SPECIES[sp].foreign&&sp!=='twospot'),target=domestic[w%domestic.length];
 return [
  {slot:0,name:'작은 수컷 관찰 의뢰',kind:'adult',coins:110,xp:25,hint:'40 mm 이하 수컷 1마리',accept:b=>b.sex==='male'&&b.length<=40},
  {slot:1,name:`${SPECIES[target].name} 암컷 의뢰`,kind:'adult',coins:180,xp:40,hint:`${SPECIES[target].name} 암컷 1마리`,accept:b=>b.species===target&&b.sex==='female'},
  {slot:2,name:'해외 표본 전시 의뢰',kind:'specimen',coins:750,xp:100,hint:'해외종 완성 표본 1점',accept:m=>SPECIES[m.bug.species].foreign&&m.status==='mounted'},
  {slot:3,name:'대형 개체 사육 의뢰',kind:'adult',coins:350,xp:80,hint:'동종·동성별 야생 최대 크기의 85% 이상 1마리',accept:b=>b.length>=sizeRange(b.species,b.sex)[1]*.85},
 ].map(o=>({...o,id:`${w}:${o.slot}`,claimed:!!s.career?.ordersClaimed.includes(`${w}:${o.slot}`)}));
}
export function orderCandidates(s,order){
 if(order.claimed)return [];
 return (order.kind==='specimen'?s.memorials:s.bugs).filter(a=>order.accept(a)&&(order.kind!=='adult'||canSellLive(s,a.species))&&!(s.fight?.bugId===a.id&&!s.fight.finished)&&!(s.auctions||[]).some(l=>l.status==='active'&&l.asset.id===a.id));
}
export function deliverOrder(s,id,assetId){
 migrateCareer(s);syncLeague(s);const o=collectorOrders(s).find(o=>o.id===id),a=o&&orderCandidates(s,o).find(a=>a.id===assetId);if(!a)throw new Error('의뢰 조건에 맞는 개체를 선택하세요.');
 if(o.kind==='specimen')s.memorials=s.memorials.filter(m=>m.id!==a.id);else s.bugs=s.bugs.filter(b=>b.id!==a.id);
 if(s.fight?.bugId===a.id)s.fight=null;
 s.career.ordersClaimed.push(id);s.coins=Math.min(1e9,s.coins+o.coins);s.xp=Math.min(1e9,s.xp+o.xp);
 const bug=o.kind==='specimen'?a.bug:a;for(const l of s.lines||[])for(const b of [...l.founders,...l.records.flatMap(r=>r.offspring)])if(b.id===bug.id)b.sale={kind:o.kind,at:Date.now(),amount:o.coins,buyer:'의뢰 수집가'};
 note(s,`${o.name} 납품 · +${o.coins} 잎사귀`);return o;
}
export function validCareer(s){
 const c=s.career;if(c===undefined)return true;
 const integer=(n,max=1e9)=>Number.isInteger(n)&&n>=0&&n<=max,strings=(a,max)=>Array.isArray(a)&&a.length<=max&&a.every(x=>typeof x==='string'&&x.length<=128)&&new Set(a).size===a.length;
 if(!c||c.version!==1||!strings(c.qualifications,2)||c.qualifications.some(id=>!QUALIFICATIONS[id])||!integer(c.reared,4096)||!Array.isArray(c.careRecords)||c.careRecords.length>4096||c.careRecords.some(r=>!r||typeof r.id!=='string'||r.id.length>128||!integer(r.days,3)||!integer(r.lastDay,s.day))||new Set(c.careRecords.map(r=>r.id)).size!==c.careRecords.length||c.reared!==c.careRecords.filter(r=>r.days===3).length||!c.regions||typeof c.regions!=='object'||Array.isArray(c.regions)||!strings(c.albumClaimed,2)||c.albumClaimed.some(id=>!['domestic','foreign'].includes(id))||!strings(c.ordersClaimed,84)||c.ordersClaimed.some(id=>!/^\d+:[0-3]$/.test(id)))return false;
 const score=v=>v&&integer(v.points,100000)&&integer(v.wins,100000)&&integer(v.played,100000)&&v.wins<=v.played&&v.points===v.wins*3+v.played-v.wins&&Array.isArray(v.claimed)&&new Set(v.claimed).size===v.claimed.length&&v.claimed.every(n=>LEAGUE_REWARDS.some(r=>r.points===n)&&n<=v.points);
 const classes=v=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([id,l])=>LEAGUE_CLASSES[id]&&score(l));
 return c.league&&integer(c.league.week,week(s))&&classes(c.league.classes)&&Array.isArray(c.league.history)&&c.league.history.length<=20&&c.league.history.every(h=>integer(h.week,week(s))&&classes(h.classes));
}
