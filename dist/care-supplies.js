import {PRODUCTS,isAdultBedding,productName,shopAccess,adultBeddingItems} from './catalog.js';

export const careSupplyKind=kind=>kind==='jelly'?'jelly':kind==='clean'?'mat':null;
export function isCareSupply(product,kind){return kind==='jelly'?product?.kind==='jelly':kind==='clean'&&isAdultBedding(product);}
export function careSupplyItems(state,kind,{includeEmpty=false}={}){
 const entries=kind==='clean'?Object.entries(PRODUCTS).filter(([,p])=>isAdultBedding(p)).sort(([,a],[,b])=>Number(!!a.food)-Number(!!b.food)||a.price/a.qty-b.price/b.qty):Object.entries(PRODUCTS).filter(([,p])=>isCareSupply(p,kind));
 return entries.filter(([id,p])=>(state.inventory[id]||0)>0||includeEmpty&&shopAccess(state,p.area).unlocked);
}
export function defaultCareSupply(state,kind){
 return (kind==='clean'?adultBeddingItems(state):careSupplyItems(state,kind))[0]?.[0]||(kind==='jelly'?'banana':'coconut');
}
export function careSupplyPlan(state,kind,count,itemId=defaultCareSupply(state,kind)){
 if(!careSupplyKind(kind))throw new Error('알 수 없는 돌봄입니다.');
 const product=PRODUCTS[itemId];
 if(!isCareSupply(product,kind))throw new Error(kind==='clean'?'성충 교체에는 참나무 바닥재 또는 코코넛 바닥재가 필요합니다. 유충용 톱밥은 번식통에서 사용하세요.':'사용할 젤리를 선택하세요.');
 if(!Number.isInteger(count)||count<0||count>48)throw new Error('교체할 개체 수를 확인하세요.');
 const owned=state.inventory[itemId]||0,missing=Math.max(0,count-owned),packs=Math.ceil(missing/product.qty),cost=packs*product.price,autoBuy=state.settings.autoBuyCare===true;
 const name=productName(product,kind==='clean'?'adult':'food');
 let error='';
 if(missing&&!autoBuy)error=`${name} 부족 · 필요 ${count}개 / 보유 ${owned}개 / 부족 ${missing}개. 설정에서 용품 부족 시 자동 구매를 켤 수 있어요.`;
 else if(missing&&!shopAccess(state,product.area).unlocked)error=`${name} 자동 구매 불가 · ${shopAccess(state,product.area).missing.join(' · ')} 필요`;
 else if(missing&&state.coins<cost)error=`이파리 부족 · ${name} ${missing}개 부족, ${packs}묶음 구매에 ${cost}이파리 필요 / 보유 ${state.coins}이파리`;
 return {kind,itemId,name,count,owned,missing,packs,bought:packs*product.qty,cost,autoBuy,error};
}
