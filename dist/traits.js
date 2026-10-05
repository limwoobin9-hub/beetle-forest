import {FOREIGN_SPECIES} from './foreign-species.js';
const foreignTraits=Object.fromEntries(Object.keys(FOREIGN_SPECIES).flatMap(sp=>[
 [`${sp}_bronze`,{species:sp,group:'body',name:sp==='rainbow'?'블루 계열':'청동빛형',description:sp==='rainbow'?'푸른 금속광택이 두드러지는 게임 체색 변이':'밝은 청동빛이 두드러지는 게임 체색 변이',inspired:true,spawnRate:.006}],
 [`${sp}_white_eye`,{species:sp,group:'eye',name:'화이트아이',description:'흰색 눈의 게임 변이',inspired:true,spawnRate:.0007}],
]));
// Appearance rates are game balance settings, not measured wild odds.
// The original rarity reference still determines labels and market premiums.
export const TRAIT_RATES=Object.freeze({single:.30,matched:.75});
export const TRAIT_APPEARANCE_BOOST=Object.freeze({multiplier:5,minimumSpeciesRate:.06});
const BASE_TRAITS={
 king_curved:{species:'king',group:'jaw',name:'곡치',description:'두께 변화 없이 안쪽으로 휘어진 큰턱 혈통',maleOnly:true,spawnRate:.01},
 king_white_eye:{species:'king',group:'eye',name:'화이트아이',description:'흰색 눈',spawnRate:.001},
 king_red_eye:{species:'king',group:'eye',name:'레드아이',description:'붉은색 눈',spawnRate:.0006},
 king_pink_eye:{species:'king',group:'eye',name:'핑크아이',description:'연분홍색 눈',spawnRate:.0002},
 flat_long:{species:'flat',group:'jaw',name:'장치',description:'길게 뻗은 큰턱 혈통',maleOnly:true,spawnRate:.014},
 flat_short:{species:'flat',group:'jaw',name:'단치',description:'짧고 굵은 큰턱 혈통',maleOnly:true,spawnRate:.012},
 flat_toothless:{species:'flat',group:'jaw',name:'무내치',description:'큰턱 안쪽의 큰 돌기가 없는 혈통',maleOnly:true,spawnRate:.002},
 rhino_red:{species:'rhino',group:'body',name:'레드기어',description:'붉은 체색 · 레드바디',spawnRate:.018},
 rhino_white_eye:{species:'rhino',group:'eye',name:'화이트아이',description:'흰색 눈',spawnRate:.001},
 rhino_red_eye:{species:'rhino',group:'eye',name:'레드아이',description:'붉은색 눈',spawnRate:.0005},
 redleg_crimson:{species:'redleg',group:'legs',name:'진홍다리',description:'다리의 붉은색이 짙은 외형 변이',inspired:true,spawnRate:.008},
 redleg_red_thorax:{species:'redleg',group:'thorax',name:'적흉',description:'앞가슴에 붉은빛이 도는 외형 변이',inspired:true,spawnRate:.0025},
 dauria_amber:{species:'dauria',group:'body',name:'호박빛',description:'밤색 몸에 밝은 호박빛이 도는 외형 변이',inspired:true,spawnRate:.008},
 dauria_fork:{species:'dauria',group:'jaw',name:'쌍첨턱',description:'두 갈래 턱 끝이 두드러지는 혈통',inspired:true,maleOnly:true,spawnRate:.003},
 twospot_large_spots:{species:'twospot',group:'pattern',name:'대점형',description:'앞가슴 양쪽의 검은 점이 큰 외형 변이',inspired:true,spawnRate:.009},
 twospot_gold:{species:'twospot',group:'body',name:'황금날개',description:'딱지날개의 황갈색이 밝은 외형 변이',inspired:true,spawnRate:.002},
 saw_red:{species:'saw',group:'body',name:'적갈색형',description:'짙은 적갈색이 두드러지는 체색',spawnRate:.009},
 saw_curved:{species:'saw',group:'jaw',name:'대곡치',description:'큰턱의 안쪽 휨이 두드러지는 혈통',inspired:true,maleOnly:true,spawnRate:.006},
 little_white_eye:{species:'little',group:'eye',name:'화이트아이',description:'흰색 눈',spawnRate:.001},
 little_slender:{species:'little',group:'jaw',name:'세장치',description:'가늘고 길게 뻗은 큰턱 혈통',inspired:true,maleOnly:true,spawnRate:.008},
 stag_gold:{species:'stag',group:'body',name:'금모형',description:'몸의 짧은 털에 금빛이 두드러지는 외형 변이',inspired:true,spawnRate:.006},
 stag_fork:{species:'stag',group:'jaw',name:'쌍첨치',description:'큰턱 끝의 두 갈래가 두드러지는 혈통',inspired:true,maleOnly:true,spawnRate:.0025},
 ...foreignTraits,
};
const baseSpeciesRates=Object.values(BASE_TRAITS).reduce((rates,t)=>{rates[t.species]=(rates[t.species]||0)+t.spawnRate;return rates;},{});
export const TRAITS=Object.freeze(Object.fromEntries(Object.entries(BASE_TRAITS).map(([id,t])=>{
 const boost=Math.max(TRAIT_APPEARANCE_BOOST.multiplier,TRAIT_APPEARANCE_BOOST.minimumSpeciesRate/baseSpeciesRates[t.species]);
 return [id,Object.freeze({...t,rarityRate:t.spawnRate,spawnRate:t.spawnRate*boost})];
})));
const traitPools=new Map();
for(const [id,t] of Object.entries(TRAITS)){if(!traitPools.has(t.species))traitPools.set(t.species,[]);traitPools.get(t.species).push(Object.freeze({id,...t}));}
for(const [sp,pool] of traitPools)traitPools.set(sp,Object.freeze(pool));
export const speciesTraits=species=>traitPools.get(species)||[];
export const naturalTraitRate=species=>speciesTraits(species).reduce((sum,t)=>sum+t.spawnRate,0);
export const traitRateText=rate=>`${Number((rate*100).toFixed(3))}%`;
export function traitRarity(id){
 const rate=TRAITS[id]?.rarityRate;
 return !rate?{id:'normal',name:'기본형'}:rate<=.0005?{id:'exceptional',name:'극희귀'}:rate<=.001?{id:'very_rare',name:'매우 희귀'}:rate<=.005?{id:'rare',name:'희귀'}:{id:'uncommon',name:'희소'};
}
// Logarithmic premiums keep ultra-rare stock valuable without a 1/rate windfall.
export const traitPremium=id=>TRAITS[id]?Math.round((1.5+.9*Math.log2(.02/TRAITS[id].rarityRate))*100)/100:1;
export const traitMarketBonus=traits=>[...new Set(traits||[])].reduce((sum,id)=>sum+traitPremium(id)-1,0);
export function validTraits(species,traits){
 if(traits===undefined)return true; // Existing saves remain readable.
 if(!Array.isArray(traits)||traits.length>2)return false;
 const groups=new Set();
 for(const id of traits){const t=TRAITS[id];if(typeof id!=='string'||!t||t.species!==species||groups.has(t.group))return false;groups.add(t.group);}
 return true;
}
function rollFromPool(pool,random,boost=1){
 let ticket=random();
 for(const t of pool){ticket-=t.spawnRate*boost;if(ticket<0)return [t.id];}
 return [];
}
export function rollTraits(species,random=Math.random,boost=1){
 return rollFromPool(speciesTraits(species),random,boost);
}
export function rollGuaranteedTrait(species,random=Math.random){const pool=speciesTraits(species),total=pool.reduce((sum,t)=>sum+t.spawnRate,0);if(!total)return [];const result=rollFromPool(pool,()=>random()*total);return result.length?result:[pool.at(-1).id];}
export function inheritanceChances(species,parents=[]){
 const ids=[...new Set(parents.flatMap(p=>p.traits||[]))];
 return ids.filter(id=>TRAITS[id]?.species===species).map(id=>({id,...TRAITS[id],chance:parents.filter(p=>p.traits?.includes(id)).length===2?TRAIT_RATES.matched:TRAIT_RATES.single}));
}
export function inheritTraits(species,parents,random=Math.random,mutationBoost=1){
 const chances=inheritanceChances(species,parents),groups=[...new Set(chances.map(t=>t.group))],result=[];
 for(const group of groups){
  let ticket=random();
  for(const t of chances.filter(t=>t.group===group)){ticket-=t.chance;if(ticket<0){result.push(t.id);break;}}
 }
 // Mutations use only a group neither parent holds; a failed inheritance
 // cannot be rerolled, so the displayed 30% and 75% remain exact.
 const pool=speciesTraits(species).filter(t=>!groups.includes(t.group));
 if(result.length<2&&pool.length)result.push(...rollFromPool(pool,random,mutationBoost));
 return result;
}
export function traitLabel(id,sex){const t=TRAITS[id];return t?`${t.name}${t.maleOnly&&sex==='female'?' 혈통':''}`:'';}
export function traitSummary(b){return (b.traits||[]).map(id=>traitLabel(id,b.sex)).filter(Boolean).join(' · ')||'기본형';}
export function stableTraitRandom(key){
 let seed=2166136261;for(const c of key){seed^=c.charCodeAt(0);seed=Math.imul(seed,16777619);}
 return ()=>{seed+=0x6D2B79F5;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};
}
export function migrateTraits(state){
 const assign=b=>{if(b&&b.traits===undefined)b.traits=rollTraits(b.species,stableTraitRandom(`${b.species}:${b.id}`));};
 state.bugs.forEach(assign);state.memorials?.forEach(m=>assign(m.bug));assign(state.expedition?.encounter?.bug);assign(state.fight?.rival);
 for(const brood of state.broods){brood.parents.forEach(assign);brood.children.forEach((child,i)=>{if(child.traits===undefined)child.traits=inheritTraits(brood.species,brood.parents,stableTraitRandom(`${brood.id}:${i}`));});}
}
