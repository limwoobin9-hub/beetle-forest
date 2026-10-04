export const DAY_MS=24*60*60*1000;
export const KST_OFFSET=9*60*60*1000;
export function calendarDay(now){return Math.floor((now+KST_OFFSET)/DAY_MS);}
export function midnightAt(now){return calendarDay(now)*DAY_MS-KST_OFFSET;}
export const STAGES=['알','1령','2령','3령','번데기','성충'];
export const FAST_DURATIONS=[2,2,3,5,3];
// Representative rearing schedules, rather than a promise of a biological deadline.
// Detailed rare-species durations are estimates based on the annual stag-beetle cycle.
export const NATURAL_DURATIONS={
 king:[25,30,50,235,25],
 flat:[25,25,40,185,25],
 rhino:[14,14,28,104,20],
 redleg:[25,30,50,235,25],
 dauria:[25,30,50,235,25],
 twospot:[25,30,50,235,25],
};
export function growthDurations(species,mode='fast'){return mode==='natural'?NATURAL_DURATIONS[species]:FAST_DURATIONS;}
export function growthDays(species,mode='fast'){return growthDurations(species,mode).reduce((a,b)=>a+b,0);}
export function stageIndex(age,durations){let end=0;for(let i=0;i<durations.length;i++){end+=durations[i];if(age<end-1e-9)return i;}return 5;}
export function stageName(brood){return STAGES[stageIndex(brood.age,growthDurations(brood.species,brood.growthMode))];}
export function convertGrowthAge(age,from,to){const i=stageIndex(age,from);if(i===5)return to.reduce((a,b)=>a+b,0);const before=from.slice(0,i).reduce((a,b)=>a+b,0),after=to.slice(0,i).reduce((a,b)=>a+b,0);return after+(age-before)/from[i]*to[i];}
export function nextDayAt(state){return state.settings?.realTime?(state.clock.calendar?midnightAt(state.clock.anchorAt):state.clock.anchorAt)+DAY_MS:null;}
export function remainingGrowthDays(brood){return Math.max(0,Math.ceil(growthDays(brood.species,brood.growthMode)-brood.age));}
