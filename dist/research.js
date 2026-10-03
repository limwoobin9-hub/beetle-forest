export const RESEARCH_REQUESTS=[
 {id:'common',name:'기초 도감 조사',goal:'넓적사슴벌레·장수풍뎅이 등록',coins:80,xp:20,complete:s=>['flat','rhino'].every(sp=>s.discoveries.includes(sp))},
 {id:'king',name:'고목 서식종 조사',goal:'왕사슴벌레 등록',coins:100,xp:25,complete:s=>s.discoveries.includes('king')},
 {id:'emergence',name:'성장 기록 조사',goal:'번식통 1회 우화',coins:140,xp:35,complete:s=>s.totalEmergences>=1},
 {id:'redleg',name:'붉은 다리 표본 기록',goal:'홍다리사슴벌레 등록',coins:160,xp:40,complete:s=>s.discoveries.includes('redleg')},
 {id:'dauria',name:'고산 서식종 조사',goal:'다우리아사슴벌레 등록',coins:200,xp:45,complete:s=>s.discoveries.includes('dauria')},
 {id:'twospot',name:'상록수림 조사',goal:'두점박이사슴벌레 등록',coins:240,xp:55,complete:s=>s.discoveries.includes('twospot')},
];
export function currentResearch(state){return RESEARCH_REQUESTS.find(r=>!state.researchClaimed.includes(r.id));}
