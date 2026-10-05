import {SPECIES} from './world.js';
export const SHOP_AREAS = [
 {id:'basic',name:'기본 사육용품',level:1,color:'#c4ad73'},
 {id:'nutrition',name:'영양 젤리',level:2,color:'#c89360'},
 {id:'breeding',name:'발효매트·산란',level:3,color:'#918860'},
 {id:'fungus',name:'균사 사육',level:4,color:'#b1c29f'},
 {id:'professional',name:'대형 개체 육성',level:5,color:'#7c9a98'},
 {id:'overseas',name:'해외종 전용 먹이',level:1,color:'#a99f77'},
 {id:'equipment',name:'사육·원정 설비',level:1,color:'#819d96'},
];
export const PRODUCTS = {
 banana:{name:'바나나 젤리',kind:'jelly',area:'basic',price:40,qty:6,color:'#e6bb53',health:8,decay:18,duration:1,effect:'포만감 100 · 건강 +8'},
 brown_sugar:{name:'흑당 젤리',kind:'jelly',area:'basic',price:50,qty:6,color:'#815240',health:10,decay:16,duration:2,effect:'건강 +10 · 2일간 포만감 감소 16'},
 fruit_mix:{name:'과일 믹스 젤리',kind:'jelly',area:'basic',price:55,qty:6,color:'#d57858',health:12,decay:18,duration:1,effect:'포만감 100 · 건강 +12'},
 basic_mat:{name:'참나무 사육매트',kind:'mat',adultBedding:true,area:'basic',price:55,qty:4,color:'#95724b',food:0.72,hygiene:12,duration:2,effect:'성충 청소 · 전 종 애벌레 먹이'},
 coconut:{name:'코코넛 깔개매트',kind:'mat',adultBedding:true,area:'basic',price:45,qty:5,color:'#b89667',food:0,hygiene:10,duration:3,effect:'성충 청결 100 · 오래 유지되는 깔개'},
 honey:{name:'허니 젤리',kind:'jelly',area:'nutrition',price:90,qty:6,color:'#d89f32',health:14,decay:14,duration:2,effect:'건강 +14 · 2일간 포만감 감소 14'},
 protein:{name:'고단백 화이트 젤리',kind:'jelly',area:'nutrition',price:110,qty:6,color:'#eee5c0',health:20,decay:16,duration:2,effect:'포만감 100 · 건강 +20'},
 probiotic:{name:'유산균 젤리',kind:'jelly',area:'nutrition',price:100,qty:6,color:'#dab1b8',health:18,decay:15,duration:2,effect:'건강 +18 · 2일간 포만감 감소 15'},
 wide_cup:{name:'와이드컵 젤리',kind:'jelly',area:'nutrition',price:120,qty:8,color:'#d49b66',health:12,decay:13,duration:3,effect:'건강 +12 · 3일간 포만감 감소 13'},
 oak_flake:{name:'참나무 2차 발효매트',kind:'mat',area:'breeding',price:140,qty:4,color:'#a58755',food:0.94,hygiene:10,duration:3,effect:'전 종 애벌레 성장 영양 94%'},
 rhino_humus:{name:'장수풍뎅이 부엽매트',kind:'mat',area:'breeding',price:130,qty:4,color:'#6b6c40',food:1.02,species:['rhino'],hygiene:10,duration:3,effect:'장수풍뎅이 애벌레 성장 영양 102%'},
 stag_mat:{name:'사슴벌레 미립자매트',kind:'mat',area:'breeding',price:150,qty:4,color:'#8d6542',food:1.0,species:['king','flat','redleg','dauria','twospot','saw','little','stag'],hygiene:9,duration:3,effect:'사슴벌레 애벌레 성장 영양 100%'},
 spawn_mat:{name:'산란용 완숙매트',kind:'mat',area:'breeding',price:160,qty:4,color:'#816842',food:0.98,hygiene:9,duration:3,effect:'산란·전 종 애벌레 성장 영양 98%'},
 hiratake_800:{name:'히라타케 균사 800 mL',kind:'fungus',area:'fungus',price:190,qty:2,color:'#eef0cf',food:1.06,species:['king','flat','redleg','little'],effect:'사슴벌레 1~2령 · 성장 영양 106%'},
 hiratake_1400:{name:'히라타케 균사 1400 mL',kind:'fungus',area:'fungus',price:280,qty:2,color:'#dde3c0',food:1.10,species:['king','flat','redleg','little'],effect:'사슴벌레 전 령 · 성장 영양 110%'},
 oohira_800:{name:'오오히라타케 균사 800 mL',kind:'fungus',area:'fungus',price:210,qty:2,color:'#e7e2ba',food:1.08,species:['king','flat','redleg','little'],effect:'사슴벌레 1~2령 · 성장 영양 108%'},
 oohira_1400:{name:'오오히라타케 균사 1400 mL',kind:'fungus',area:'fungus',price:300,qty:2,color:'#d6dfb5',food:1.12,species:['king','flat','redleg','little'],effect:'사슴벌레 전 령 · 성장 영양 112%'},
 pro_jelly:{name:'브리더 프로 젤리',kind:'jelly',area:'professional',price:240,qty:10,color:'#bd8161',health:25,decay:10,duration:3,effect:'건강 +25 · 3일간 포만감 감소 10'},
 stag_master:{name:'사슴벌레 대형육성매트',kind:'mat',area:'professional',price:290,qty:4,color:'#77543c',food:1.12,species:['king','flat','redleg','dauria','twospot','saw','little','stag'],hygiene:8,duration:4,effect:'사슴벌레 성장 영양 112%'},
 rhino_master:{name:'장수풍뎅이 대형육성매트',kind:'mat',area:'professional',price:290,qty:4,color:'#686442',food:1.12,species:['rhino'],hygiene:8,duration:4,effect:'장수풍뎅이 성장 영양 112%'},
 pro_fungus:{name:'대형 균사병 2300 mL',kind:'fungus',area:'professional',price:390,qty:2,color:'#c9d5a9',food:1.15,species:['king','flat','redleg','little'],effect:'사슴벌레 전 령 · 성장 영양 115%'},
 sap_trap:{name:'수액 미끼 덫',kind:'trap',area:'basic',price:65,qty:2,color:'#b79253',effect:'설치 후 다음 날 확인 · 수액 선호 종'},
 fruit_trap:{name:'발효 과일 덫',kind:'trap',area:'nutrition',price:100,qty:2,color:'#ce9956',effect:'설치 후 다음 날 확인 · 장수풍뎅이 유인'},
 light_trap:{name:'곤충 유인등',kind:'trap',area:'breeding',price:190,qty:2,color:'#b7c8a6',effect:'설치 후 다음 날 확인 · 희귀종 가중치 증가'},
 rope_set:{name:'줄다리기 훈련대',kind:'gear',area:'nutrition',price:140,qty:1,color:'#9a7850',effect:'영구 장비 · 발힘 훈련 · 하루 1회'},
 race_track:{name:'장애물 훈련장',kind:'gear',area:'breeding',price:180,qty:1,color:'#81945c',effect:'영구 장비 · 지구력 훈련 · 하루 1회'},
 tropical_mat:{name:'열대 사슴벌레 발효매트',kind:'mat',area:'overseas',price:420,qty:4,color:'#8f6749',food:1.04,species:['sumatra_flat','metallifer','giraffe','borneo_flat','rainbow','golden','palawan','sika','japan_saw'],effect:'열대 사슴벌레 유충·산란 · 영양 104%'},
 giant_humus:{name:'대형 장수풍뎅이 부엽매트',kind:'mat',area:'overseas',price:550,qty:3,color:'#686c47',food:1.15,species:['atlas','caucasus','moellenkampi','hercules','actaeon','elephas','neptune'],effect:'해외 장수풍뎅이 유충·산란 · 영양 115%'},
 cool_wood:{name:'산지종 저발효 우드매트',kind:'mat',area:'overseas',price:430,qty:4,color:'#a18961',food:1.1,species:['antaeus','grandis','stag','formosan','japan_stag'],effect:'서늘한 산지종 유충·산란 · 영양 110%'},
 rainbow_mat:{name:'무지개종 미립자 발효매트',kind:'mat',area:'overseas',price:460,qty:4,color:'#987753',food:1.12,species:['rainbow','golden','metallifer'],effect:'금속광택 사슴벌레 유충·산란 · 영양 112%'},
 kawara_spawn:{name:'카와라 산란목 세트',kind:'mat',area:'overseas',price:380,qty:4,color:'#b1ae83',food:1.02,kawara:true,species:['tarandus','regius'],effect:'타란두스·레기우스 산란용 · 초기 유충 먹이'},
 kawara_1400:{name:'카와라 균사 1400 mL',kind:'fungus',area:'overseas',price:340,qty:2,color:'#e4e2c5',food:1.15,kawara:true,species:['tarandus','regius'],effect:'타란두스·레기우스 유충 전용 · 영양 115%'},
 field_lens:{name:'야간 관찰 렌즈',kind:'gear',area:'equipment',price:900,qty:1,color:'#82aaa4',effect:'영구 설비 · 국내·해외 채집 대형 개체 발견 확률 증가'},
 temperature_cabinet:{name:'산지종 온도 관리장',kind:'gear',area:'equipment',price:3200,qty:1,color:'#87a3ad',species:['antaeus','grandis','stag','formosan','japan_stag'],effect:'산지종 유충 먹이 유지 기간 +20% · 성충 청결 감소 −15%'},
 humidifier:{name:'열대종 습도 관리장',kind:'gear',area:'equipment',price:2400,qty:1,color:'#92b6a1',species:['rainbow','golden','metallifer','tarandus','regius'],effect:'열대종 유충 먹이 유지 기간 +20% · 성충 청결 감소 −15%'},
 deep_bedding:{name:'장수풍뎅이 깊은 사육통',kind:'gear',area:'equipment',price:1600,qty:1,color:'#b09b73',family:'rhino',effect:'장수풍뎅이류 성충 청결 감소 −20%'},
 giant_tub:{name:'대형 유충 10 L 사육통',kind:'gear',area:'equipment',price:2800,qty:1,color:'#8d9f84',family:'rhino',effect:'장수풍뎅이류 유충 먹이 유지 기간 +25%'},
 wide_holder:{name:'대형종 젤리 고정대',kind:'gear',area:'equipment',price:800,qty:1,color:'#bda372',family:'rhino',effect:'장수풍뎅이류 젤리 교체 시 건강 +4 추가'},
 spawn_logs:{name:'사슴벌레 산란목 관리대',kind:'gear',area:'equipment',price:1800,qty:1,color:'#9f835a',family:'stag',effect:'사슴벌레류 자손 성장 잠재력 소폭 증가'},
 specimen_table:{name:'표본 검사·촬영대',kind:'gear',area:'equipment',price:2200,qty:1,color:'#a8b2a0',effect:'표본 경매 감정가 +15% · 완성 표본 전시용'},
};
for(const id of ['stag_mat','stag_master'])PRODUCTS[id].species.push(...Object.keys(SPECIES).filter(sp=>SPECIES[sp].foreign&&SPECIES[sp].family==='stag'&&!['tarandus','regius'].includes(sp)));
for(const id of ['rhino_humus','rhino_master'])PRODUCTS[id].species.push(...Object.keys(SPECIES).filter(sp=>SPECIES[sp].family==='rhino'));
for(const id of ['hiratake_800','hiratake_1400','oohira_800','oohira_1400','pro_fungus'])PRODUCTS[id].species.push('sumatra_flat','borneo_flat','antaeus','grandis','palawan');
export function equipmentEffects(state,species){
 const owned=id=>!!state?.inventory?.[id],family=species==='rhino'?'rhino':SPECIES[species]?.family||'stag';
 const climate=['temperature_cabinet','humidifier'].some(id=>owned(id)&&PRODUCTS[id].species.includes(species));
 return {beddingDecay:(climate?.85:1)*(family==='rhino'&&owned('deep_bedding')?.8:1),foodInterval:(climate?1.2:1)*(family==='rhino'&&owned('giant_tub')?1.25:1),jellyHealth:family==='rhino'&&owned('wide_holder')?4:0,genetic:family==='stag'&&owned('spawn_logs')?.025:0};
}
export const LEVEL_XP=[0,180,520,1050,1900];
export function keeperLevel(state){let level=1;for(let i=1;i<LEVEL_XP.length;i++)if(state.xp>=LEVEL_XP[i])level=i+1;return level;}
export function itemLevel(id){return SHOP_AREAS.find(a=>a.id===PRODUCTS[id]?.area)?.level??99;}
export function compatibleFood(item,species){return !!item?.food&&(!['tarandus','regius'].includes(species)||item.kawara===true)&&(!item.species||item.species.includes(species));}
export function isAdultBedding(item){return item?.kind==='mat'&&item.adultBedding===true;}
export function adultBeddingItems(state){return Object.entries(PRODUCTS).filter(([id,p])=>isAdultBedding(p)&&state.inventory[id]>0).sort(([,a],[,b])=>Number(!!a.food)-Number(!!b.food)||a.price/a.qty-b.price/b.qty);}
export function adultBeddingCount(state){return adultBeddingItems(state).reduce((sum,[id])=>sum+state.inventory[id],0);}
export function inventoryCount(state,kind){return Object.entries(state.inventory).reduce((sum,[id,n])=>sum+(PRODUCTS[id]?.kind===kind?n:0),0);}
export function syncSupplies(state){state.jelly=inventoryCount(state,'jelly');state.substrate=inventoryCount(state,'mat');}
export const GROWTH_DAYS=15;
export function growthStage(age){return age<2?'알':age<4?'1령':age<7?'2령':age<12?'3령':age<15?'번데기':'성충';}
export function isLarva(stage){return ['1령','2령','3령'].includes(stage);}

export function shopAccess(state,areaId){
 const index=SHOP_AREAS.findIndex(a=>a.id===areaId);if(index<0)return {unlocked:false,missing:['상점 구역 오류'],requirements:[]};
 if(['overseas','equipment'].includes(areaId))return {unlocked:true,missing:[],requirements:[]};
 const level=index+1,days=[1,5,9,15,24][index],captures=[0,5,10,16,24][index],emergences=[0,0,0,1,3][index];
 const requirements=[{label:`Lv.${level}`,done:keeperLevel(state)>=level},{label:`${days}일째`,done:state.day>=days},{label:`채집 ${captures}마리`,done:state.captures>=captures}];
 if(index===2)requirements.push({label:'번식 1회',done:(state.totalBreedings||0)>=1});
 if(emergences)requirements.push({label:`우화 ${emergences}회`,done:(state.totalEmergences||0)>=emergences});
 return {unlocked:requirements.every(r=>r.done),missing:requirements.filter(r=>!r.done).map(r=>r.label),requirements};
}
