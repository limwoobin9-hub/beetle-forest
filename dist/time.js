import {FOREIGN_SPECIES} from './foreign-species.js';
const overseasBounds={grantii:[450,810],tityus:[360,720],satanas:[570,960],elaphus:[240,450],adolphinae:[180,360],mellyi:[240,450],sumatra_flat:[240,450],metallifer:[180,300],atlas:[300,510],caucasus:[390,660],giraffe:[270,480],antaeus:[300,570],grandis:[300,600],borneo_flat:[240,450],moellenkampi:[330,570],rainbow:[240,450],golden:[180,330],hercules:[570,810],actaeon:[720,1095],palawan:[270,480],formosan:[390,720],sika:[240,450],japan_stag:[390,780],japan_saw:[260,450],elephas:[480,810],neptune:[600,960],tarandus:[240,420],regius:[240,450]};
// Indoor game estimates except the referenced measured cycles; see overseas-ko.md.
const overseasProfiles=Object.fromEntries(Object.keys(FOREIGN_SPECIES).map(sp=>{const [min,max]=overseasBounds[sp],total=Math.round((min+max)/2);return [sp,{min,max,stages:[21,28,42,total-126,35]}];}));
export const DAY_MS=24*60*60*1000;
export const KST_OFFSET=9*60*60*1000;
export function calendarDay(now){return Math.floor((now+KST_OFFSET)/DAY_MS);}
export function midnightAt(now){return calendarDay(now)*DAY_MS-KST_OFFSET;}
export const STAGES=['알','1령','2령','3령','번데기','성충'];
export const FAST_DURATIONS=[2,2,3,5,3];
// Kept for interpreting saves made before randomized schedules were introduced.
export const LEGACY_NATURAL_DURATIONS={
 king:[25,30,50,235,25],
 flat:[25,25,40,185,25],
 rhino:[14,14,28,104,20],
 redleg:[25,30,50,235,25],
 dauria:[25,30,50,235,25],
 twospot:[25,30,50,235,25],
 saw:[25,25,40,210,25],
 little:[25,25,40,185,25],
 stag:[25,30,60,335,30],
 ...Object.fromEntries(Object.entries(overseasProfiles).map(([sp,p])=>[sp,p.stages])),
};
// Sources and the distinction between observations and game estimates are in
// docs/growth-timing-ko.md. Bounds are game ranges, not biological guarantees.
export const GROWTH_PROFILES={
 king:{stages:[16,24,30,131,29],min:180,max:330},
 flat:{stages:[20,26,29,165,30],min:190,max:350},
 rhino:{stages:[14,20,25,145,21],min:180,max:330},
 redleg:{stages:[25,30,45,245,30],min:300,max:510},
 dauria:{stages:[25,25,40,215,25],min:240,max:450},
 twospot:{stages:[20,25,40,180,30],min:270,max:390},
 saw:{stages:[25,30,45,195,45],min:260,max:450},
 little:{stages:[20,25,40,175,30],min:210,max:390},
 stag:{stages:[30,40,65,405,30],min:390,max:780},
 ...overseasProfiles,
};
export const NATURAL_DURATIONS=Object.fromEntries(Object.entries(GROWTH_PROFILES).map(([sp,p])=>[sp,p.stages]));
const sum=values=>values.reduce((a,b)=>a+b,0);
export function rollGrowthPlan(species,random=Math.random){
 const {stages,min,max}=GROWTH_PROFILES[species],center=sum(stages),u=Math.max(0,Math.min(1,random()));
 // A triangular distribution favours the representative indoor schedule.
 const pivot=(center-min)/(max-min),total=Math.round(u<pivot?min+Math.sqrt(u*(max-min)*(center-min)):max-Math.sqrt((1-u)*(max-min)*(max-center)));
 const natural=stages.map((days,i)=>i===3?0:Math.max(1,Math.round(days*(.85+.3*Math.max(0,Math.min(1,random()))))));
 natural[3]=total-sum(natural);
 return {version:1,natural};
}
export function validGrowthPlan(species,plan){
 const profile=GROWTH_PROFILES[species];
 return !!profile&&plan?.version===1&&Array.isArray(plan.natural)&&plan.natural.length===5&&plan.natural.every(n=>Number.isInteger(n)&&n>0&&n<=profile.max)&&sum(plan.natural)>=profile.min&&sum(plan.natural)<=profile.max;
}
export function broodDurations(brood,mode=brood.growthMode){return mode==='natural'?(brood.growthPlan?.natural||LEGACY_NATURAL_DURATIONS[brood.species]):FAST_DURATIONS;}
export function broodGrowthDays(brood,mode=brood.growthMode){return sum(broodDurations(brood,mode));}
export function migrateGrowthPlan(brood){
 if(brood.growthPlan)return false;
 const previous=broodDurations(brood);
 // Deterministic for old saves, including the same save restored on two devices.
 let seed=2166136261;for(const c of `${brood.id}:${brood.species}:${brood.started}`)seed=Math.imul(seed^c.charCodeAt(0),16777619);
 const random=()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
 brood.growthPlan=rollGrowthPlan(brood.species,random);
 if(brood.growthMode==='natural')brood.age=convertGrowthAge(brood.age,previous,broodDurations(brood));
 return true;
}
export function migrateGrowthPlans(state){
 for(const b of [...state.broods,...(state.auctions||[]).filter(a=>a.status==='active'&&a.kind==='larva').map(a=>a.asset)])migrateGrowthPlan(b);
}
export function growthDurations(species,mode='fast'){return mode==='natural'?NATURAL_DURATIONS[species]:FAST_DURATIONS;}
export function growthDays(species,mode='fast'){return growthDurations(species,mode).reduce((a,b)=>a+b,0);}
export function stageIndex(age,durations){let end=0;for(let i=0;i<durations.length;i++){end+=durations[i];if(age<end-1e-9)return i;}return 5;}
export function stageName(brood){return STAGES[stageIndex(brood.age,broodDurations(brood))];}
export function convertGrowthAge(age,from,to){const i=stageIndex(age,from);if(i===5)return to.reduce((a,b)=>a+b,0);const before=from.slice(0,i).reduce((a,b)=>a+b,0),after=to.slice(0,i).reduce((a,b)=>a+b,0);return after+(age-before)/from[i]*to[i];}
export function nextDayAt(state){return state.settings?.realTime?(state.clock.calendar?midnightAt(state.clock.anchorAt):state.clock.anchorAt)+DAY_MS:null;}
export function remainingGrowthDays(brood){return Math.max(0,Math.ceil(broodGrowthDays(brood)-brood.age));}
