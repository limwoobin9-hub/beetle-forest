import {SPECIES} from './world.js';
import {PRODUCTS,equipmentEffects} from './catalog.js';
import {stageName} from './time.js';

// A cycle ends at the existing care-warning threshold, leaving a grace period.
// Room temperature and one game's supply portion are assumed; see the source note.
export const needsCare=value=>value<=40+1e-9;
export function adultBeddingInterval(bug,realTime,itemId=bug.matId){
 const coconut=itemId==='coconut';
 return realTime?((bug.species==='rhino'||SPECIES[bug.species]?.family==='rhino')?(coconut?21:14):(coconut?28:21)):((bug.species==='rhino'||SPECIES[bug.species]?.family==='rhino')?(coconut?10:7):(coconut?14:10));
}
export function jellyInterval(bug){return (bug.species==='rhino'||SPECIES[bug.species]?.family==='rhino')?1:bug.length>=50?2:3;}
export function adultDecay(bug,kind,realTime){
 if(kind==='clean')return 60/adultBeddingInterval(bug,realTime);
 return realTime?60/jellyInterval(bug):(bug.dietDays>0?bug.dietDecay:18);
}
export function larvalFoodInterval(brood,realTime,itemId=brood.medium){
 const product=PRODUCTS[itemId],stage=stageName(brood);
 if(realTime){
  if(product?.kind==='fungus')return itemId.endsWith('_800')?60:itemId==='pro_fungus'?90:75;
  return (brood.species==='rhino'||SPECIES[brood.species]?.family==='rhino')?60:stage==='1령'?90:stage==='2령'?75:60;
 }
 if(product?.kind==='fungus'||product?.area==='professional')return 14;
 return stage==='1령'?14:stage==='2령'?10:product?.area==='breeding'?10:7;
}
export function careRemainingDays(value,interval){return Math.max(0,Math.ceil((value-40)*interval/60-1e-9));}
export function adultCareText(bug,realTime,state=null){
 const mat=Math.round(adultBeddingInterval(bug,realTime)/equipmentEffects(state,bug.species).beddingDecay),remaining=careRemainingDays(bug.hygiene,mat);
 return `${realTime?`젤리 ${(bug.species==='rhino'||SPECIES[bug.species]?.family==='rhino')?'매일':`${jellyInterval(bug)}일마다`} · ${needsCare(bug.hunger)?'지금 교체 권장':`교체까지 약 ${careRemainingDays(bug.hunger,jellyInterval(bug))}일`}<br>`:''}성충 바닥재 ${mat}일 주기 · ${remaining?`교체까지 약 ${remaining}일`:'지금 교체 권장'}`;
}
export function larvalCareText(brood,realTime,state=null){
 const interval=Math.round(larvalFoodInterval(brood,realTime)*equipmentEffects(state,brood.species).foodInterval),remaining=careRemainingDays(brood.food,interval);
 return `먹이 교체 ${interval}일 주기 · ${remaining?`교체까지 약 ${remaining}일`:'지금 교체 권장'}`;
}
export function productCareText(product,realTime){
 if(product.kind==='jelly')return realTime?'장수풍뎅이 매일 · 사슴벌레 2~3일마다 교체':'';
 if(product.adultBedding)return realTime?'성충 바닥재 교체 약 2~4주':'성충 바닥재 교체 7~14일';
 if(product.food)return realTime?'유충 먹이 교체 약 60~90일':'유충 먹이 교체 7~14일';
 return '';
}
export function productEffect(product,realTime){return realTime&&product.kind==='jelly'?`포만감 100 · 건강 +${product.health}`:product.effect;}
