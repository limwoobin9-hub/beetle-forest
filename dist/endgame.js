export const EXPEDITION_PLANS=Object.freeze({
 standard:{name:'일반 원정',surcharge:0,surveys:3,geneticBase:.40,geneticSpread:.56,traitBoost:1,description:'현지 탐사 3회 · 일반 크기·특성'},
 large:{name:'대형 개체 원정',surcharge:12000,surveys:4,geneticBase:.64,geneticSpread:.32,traitBoost:1,description:'현지 탐사 4회 · 큰 야생 개체 위주'},
 traits:{name:'특성 집중 원정',surcharge:35000,surveys:5,geneticBase:.48,geneticSpread:.48,traitBoost:3,description:'현지 탐사 5회 · 특성 등장률 3배 (해외종 18%)'},
 elite:{name:'최상급 원정',surcharge:90000,surveys:6,geneticBase:.72,geneticSpread:.26,traitBoost:3,guaranteedTrait:true,description:'현지 탐사 6회 · 대형 개체 위주 · 전부 탐사하면 특성 개체 최소 1마리'},
});
export const ENDGAME_EQUIPMENT={
 overseas_hq:{name:'해외 채집 본부',price:50000,color:'#bbab70',effect:'모든 해외 원정에서 현지 출현 종 1종을 지정해 집중 채집'},
 breeding_lab:{name:'정밀 육성 연구실',price:80000,color:'#85a8a3',effect:'새 번식의 자손 성장 잠재력 +0.035 · 모든 종'},
 climate_lab:{name:'항온항습 연구동',price:120000,color:'#94b89a',effect:'모든 종 유충 먹이 유지 기간 +50% · 성충 바닥재 소모 −25%'},
 genetics_lab:{name:'유전 연구소',price:200000,color:'#b49db7',effect:'새 번식의 자연 특성 발현 2배 · 부모 특성 유전 30% / 75% 유지'},
};
export const expeditionPlan=trip=>EXPEDITION_PLANS[trip?.mode||'standard'];
export const expeditionCost=(region,mode='standard')=>region.cost+EXPEDITION_PLANS[mode].surcharge;
export const breedingTraitBoost=state=>state?.inventory?.genetics_lab?2:1;
