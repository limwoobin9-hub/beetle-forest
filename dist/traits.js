// A collectible game model, not Mendelian odds or claims of named wild morphs.
export const TRAIT_RATES=Object.freeze({wild:.03,single:.15,matched:.75});
export const TRAITS=Object.freeze({
 king_curved:{species:'king',group:'jaw',name:'곡치',description:'두께 변화 없이 안쪽으로 휘어진 큰턱 혈통',maleOnly:true,weight:4},
 king_white_eye:{species:'king',group:'eye',name:'화이트아이',description:'흰색 눈',weight:2},
 king_red_eye:{species:'king',group:'eye',name:'레드아이',description:'붉은색 눈',weight:2},
 king_pink_eye:{species:'king',group:'eye',name:'핑크아이',description:'연분홍색 눈',weight:1},
 flat_long:{species:'flat',group:'jaw',name:'장치',description:'길게 뻗은 큰턱 혈통',maleOnly:true,weight:4},
 flat_short:{species:'flat',group:'jaw',name:'단치',description:'짧고 굵은 큰턱 혈통',maleOnly:true,weight:4},
 flat_toothless:{species:'flat',group:'jaw',name:'무내치',description:'큰턱 안쪽의 큰 돌기가 없는 혈통',maleOnly:true,weight:2},
 rhino_red:{species:'rhino',group:'body',name:'레드기어',description:'붉은 체색 · 레드바디',weight:5},
 rhino_white_eye:{species:'rhino',group:'eye',name:'화이트아이',description:'흰색 눈',weight:2},
 rhino_red_eye:{species:'rhino',group:'eye',name:'레드아이',description:'붉은색 눈',weight:1},
 redleg_crimson:{species:'redleg',group:'legs',name:'진홍다리',description:'다리의 붉은색이 짙은 외형 변이',inspired:true,weight:4},
 redleg_red_thorax:{species:'redleg',group:'thorax',name:'적흉',description:'앞가슴에 붉은빛이 도는 외형 변이',inspired:true,weight:2},
 dauria_amber:{species:'dauria',group:'body',name:'호박빛',description:'밤색 몸에 밝은 호박빛이 도는 외형 변이',inspired:true,weight:4},
 dauria_fork:{species:'dauria',group:'jaw',name:'쌍첨턱',description:'두 갈래 턱 끝이 두드러지는 혈통',inspired:true,maleOnly:true,weight:2},
 twospot_large_spots:{species:'twospot',group:'pattern',name:'대점형',description:'앞가슴 양쪽의 검은 점이 큰 외형 변이',inspired:true,weight:4},
 twospot_gold:{species:'twospot',group:'body',name:'황금날개',description:'딱지날개의 황갈색이 밝은 외형 변이',inspired:true,weight:2},
});
export const speciesTraits=species=>Object.entries(TRAITS).filter(([,t])=>t.species===species).map(([id,t])=>({id,...t}));
export function validTraits(species,traits){
 if(traits===undefined)return true; // Existing saves remain readable.
 if(!Array.isArray(traits)||traits.length>2)return false;
 const groups=new Set();
 for(const id of traits){const t=TRAITS[id];if(typeof id!=='string'||!t||t.species!==species||groups.has(t.group))return false;groups.add(t.group);}
 return true;
}
function pick(pool,random){
 let ticket=random()*pool.reduce((sum,t)=>sum+t.weight,0);
 for(const t of pool){ticket-=t.weight;if(ticket<0)return t.id;}
 return pool.at(-1)?.id;
}
export function rollTraits(species,random=Math.random){
 if(random()>=TRAIT_RATES.wild)return [];
 const id=pick(speciesTraits(species),random);return id?[id]:[];
}
export function inheritanceChances(species,parents=[]){
 const ids=[...new Set(parents.flatMap(p=>p.traits||[]))];
 return ids.filter(id=>TRAITS[id]?.species===species).map(id=>({id,...TRAITS[id],chance:parents.filter(p=>p.traits?.includes(id)).length===2?TRAIT_RATES.matched:TRAIT_RATES.single}));
}
export function inheritTraits(species,parents,random=Math.random){
 const chances=inheritanceChances(species,parents),groups=[...new Set(chances.map(t=>t.group))],result=[];
 for(const group of groups){
  let ticket=random();
  for(const t of chances.filter(t=>t.group===group)){ticket-=t.chance;if(ticket<0){result.push(t.id);break;}}
 }
 // Mutations use only a group neither parent holds; a failed inheritance
 // cannot be rerolled, so the displayed 15% and 75% remain exact.
 const pool=speciesTraits(species).filter(t=>!groups.includes(t.group));
 if(result.length<2&&pool.length&&random()<TRAIT_RATES.wild)result.push(pick(pool,random));
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
