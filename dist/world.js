import {FOREIGN_SPECIES} from './foreign-species.js';
// Size bounds and encounter rates below are game settings, not record claims.
export const SPECIES={
 king:{name:'왕사슴벌레',latin:'Dorcus hopei binodulosus',color:'#b3bfaa',male:[25,76.1],female:[25,44],bredMale:[25,94.1],bredFemale:[25,56.7],power:1.06,grip:1.08,rarity:0,preferred:['bark'],note:'검은 몸과 큰턱 안쪽 돌기. 주 채집지: 깊은 숲.'},
 flat:{name:'넓적사슴벌레',latin:'Dorcus titanus castanicolor',color:'#dda369',male:[30,74],female:[25,42],bredMale:[30,90],bredFemale:[25,46],power:1.08,grip:1.12,rarity:0,preferred:['sap'],note:'납작한 몸과 긴 큰턱. 주 채집지: 참나무 숲.'},
 rhino:{name:'장수풍뎅이',latin:'Trypoxylus dichotomus',color:'#aaba85',male:[40,78],female:[35,52],bredMale:[40,85],bredFemale:[35,56],power:1.12,grip:.98,rarity:0,preferred:['leaf','sap'],note:'수컷은 머리와 앞가슴에 뿔이 있습니다. 주 채집지: 마을 뒷산.'},
 redleg:{name:'홍다리사슴벌레',latin:'Dorcus rubrofemoratus',color:'#b97752',male:[18,38],female:[16,25],bredMale:[18,42],bredFemale:[16,28],power:.96,grip:1.04,rarity:1,preferred:['bark'],note:'붉은 다리와 짧은 큰턱. 게임 내 희귀종 · 주 채집지: 계곡 고목지대.'},
 dauria:{name:'다우리아사슴벌레',latin:'Prismognathus dauricus',color:'#ad8766',male:[16,31],female:[16,24],bredMale:[16,35],bredFemale:[16,26],power:.94,grip:.99,rarity:2,preferred:['bark','leaf'],note:'갈색 몸과 위로 들린 큰턱. 게임 내 희귀종 · 주 채집지: 고산 활엽수림.'},
 twospot:{name:'두점박이사슴벌레',latin:'Prosopocoilus astacoides blanchardi',color:'#dda356',male:[25,65],female:[24,32],bredMale:[25,68],bredFemale:[24,34],power:1.01,grip:1.02,rarity:3,preferred:['sap'],note:'황갈색 몸, 앞가슴의 검은 무늬와 긴 큰턱. 게임 내 희귀종 · 주 채집지: 남쪽 섬 상록수림.'},
 saw:{name:'톱사슴벌레',latin:'Prosopocoilus inclinatus inclinatus',color:'#bf7954',male:[25,68],female:[23,34],bredMale:[25,74],bredFemale:[23,38],power:1.03,grip:1.02,rarity:0,preferred:['sap'],note:'안쪽으로 휘어진 톱니 모양 큰턱과 적갈색 몸. 암컷은 짧은 턱과 둥근 몸을 가집니다. 주 채집지: 수액 나무길·버드나무 둔치.'},
 little:{name:'애사슴벌레',latin:'Dorcus rectus rectus',color:'#929185',male:[20,50],female:[20,30],bredMale:[20,55],bredFemale:[20,33],power:.92,grip:1.06,rarity:0,preferred:['bark'],note:'작고 길쭉한 검은 몸. 수컷의 가느다란 큰턱 안쪽에는 돌기가 있습니다. 주 채집지: 잡목 숲·참나무 공동.'},
 stag:{name:'사슴벌레',latin:'Lucanus maculifemoratus dybowskyi',color:'#b69a6b',male:[35,68],female:[23,39],bredMale:[35,74],bredFemale:[23,43],power:1.05,grip:1.01,rarity:1,preferred:['sap','leaf'],note:'수컷의 머리 뒤쪽이 귀처럼 돌출되고 큰턱에 여러 톱니가 있습니다. 몸에는 짧은 털이 납니다. 주 채집지: 서늘한 산 능선·고산 활엽수림.'},
 ...FOREIGN_SPECIES,
};
export const LOCATION_REGIONS={all:'전체',lowland:'평지·수액',woodland:'고목·잡목',highland:'서늘한 산지',south:'남쪽 섬'};
export const LOCATIONS={
 oak:{name:'참나무 숲',time:'저녁',hint:'참나무 수액 · 넓적사슴벌레',region:'lowland',theme:'oak',cost:1,difficulty:0,chances:{flat:.4,saw:.28,rhino:.25,little:.07}},
 deep:{name:'깊은 숲',time:'밤',hint:'깊은 고목 틈 · 왕사슴벌레',region:'woodland',theme:'deep',cost:1,difficulty:1,chances:{king:.44,little:.4,flat:.16}},
 grove:{name:'마을 뒷산',time:'오후',hint:'두꺼운 낙엽층 · 장수풍뎅이',region:'lowland',theme:'grove',cost:1,difficulty:0,chances:{rhino:.7,saw:.18,little:.12}},
 valley:{name:'계곡 고목지대',time:'밤',hint:'시원한 고목 · 홍다리사슴벌레',region:'highland',theme:'valley',cost:2,difficulty:2,chances:{redleg:.22,little:.38,king:.25,stag:.15}},
 mountain:{name:'고산 활엽수림',time:'해 질 무렵',hint:'산지의 썩은 나무 · 다우리아사슴벌레',region:'highland',theme:'mountain',cost:2,difficulty:2,chances:{stag:.52,redleg:.23,little:.17,dauria:.08}},
 island:{name:'남쪽 섬 상록수림',time:'밤',hint:'섬의 따뜻한 수액 · 두점박이사슴벌레',region:'south',theme:'island',cost:2,difficulty:3,chances:{flat:.46,saw:.24,rhino:.22,twospot:.08}},
 riverside:{name:'버드나무 둔치',time:'해 질 무렵',hint:'강가의 나무 수액 · 톱사슴벌레',region:'lowland',theme:'riverside',cost:1,difficulty:1,chances:{saw:.55,flat:.3,rhino:.15}},
 coppice:{name:'잡목 숲',time:'저녁',hint:'작은 썩은 나무 · 애사슴벌레',region:'woodland',theme:'coppice',cost:1,difficulty:0,chances:{little:.62,saw:.28,flat:.1}},
 ridge:{name:'서늘한 산 능선',time:'해 질 무렵',hint:'산바람과 참나무 · 사슴벌레',region:'highland',theme:'ridge',cost:2,difficulty:2,chances:{stag:.65,redleg:.2,little:.13,dauria:.02}},
 saplane:{name:'수액 나무길',time:'밤',hint:'이어진 수액 나무 · 톱·넓적사슴벌레',region:'lowland',theme:'saplane',cost:1,difficulty:1,chances:{saw:.45,flat:.4,rhino:.15}},
 hollow:{name:'참나무 공동',time:'밤',hint:'속이 빈 오래된 참나무 · 왕·애사슴벌레',region:'woodland',theme:'hollow',cost:1,difficulty:1,chances:{king:.6,little:.4}},
 orchard:{name:'과수원 가장자리',time:'오후',hint:'과일 향과 부엽토 · 장수풍뎅이',region:'lowland',theme:'orchard',cost:1,difficulty:0,chances:{rhino:.72,saw:.18,little:.1}},
};
export const speciesLocations=species=>Object.entries(LOCATIONS).filter(([,l])=>Object.hasOwn(l.chances,species)).sort((a,b)=>b[1].chances[species]-a[1].chances[species]);
export function sizeRange(species,sex,bred=false){const s=SPECIES[species];return bred?(sex==='male'?s.bredMale:s.bredFemale):s[sex];}
export function captureDifficulty(encounter){const rarity=SPECIES[encounter.bug.species].rarity;return {threshold:.48+encounter.alert*.002+rarity*.055,maxAttempts:rarity>=2?2:3,rarity};}
