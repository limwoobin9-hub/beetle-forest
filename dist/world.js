// Size bounds and encounter rates below are game settings, not record claims.
export const SPECIES={
 king:{name:'왕사슴벌레',latin:'Dorcus hopei binodulosus',color:'#b3bfaa',male:[25,69],female:[25,44],bredMale:[25,86],bredFemale:[25,49],power:1.06,grip:1.08,rarity:0,preferred:['bark'],note:'검은 몸과 큰턱 안쪽 돌기. 주 채집지: 깊은 숲.'},
 flat:{name:'넓적사슴벌레',latin:'Dorcus titanus castanicolor',color:'#dda369',male:[30,74],female:[25,42],bredMale:[30,82],bredFemale:[25,46],power:1.08,grip:1.12,rarity:0,preferred:['sap'],note:'납작한 몸과 긴 큰턱. 주 채집지: 참나무 숲.'},
 rhino:{name:'장수풍뎅이',latin:'Trypoxylus dichotomus',color:'#aaba85',male:[40,78],female:[35,52],bredMale:[40,85],bredFemale:[35,56],power:1.12,grip:.98,rarity:0,preferred:['leaf','sap'],note:'수컷은 머리와 앞가슴에 뿔이 있습니다. 주 채집지: 마을 뒷산.'},
 redleg:{name:'홍다리사슴벌레',latin:'Dorcus rubrofemoratus',color:'#b97752',male:[18,38],female:[16,25],bredMale:[18,42],bredFemale:[16,28],power:.96,grip:1.04,rarity:1,preferred:['bark'],note:'붉은 다리와 짧은 큰턱. 게임 내 희귀종 · 주 채집지: 계곡 고목지대.'},
 dauria:{name:'다우리아사슴벌레',latin:'Prismognathus dauricus',color:'#ad8766',male:[16,31],female:[16,24],bredMale:[16,35],bredFemale:[16,26],power:.94,grip:.99,rarity:2,preferred:['bark','leaf'],note:'갈색 몸과 위로 들린 큰턱. 게임 내 희귀종 · 주 채집지: 고산 활엽수림.'},
 twospot:{name:'두점박이사슴벌레',latin:'Prosopocoilus astacoides blanchardi',color:'#dda356',male:[25,65],female:[24,32],bredMale:[25,68],bredFemale:[24,34],power:1.01,grip:1.02,rarity:3,preferred:['sap'],note:'황갈색 몸, 앞가슴의 검은 무늬와 긴 큰턱. 게임 내 희귀종 · 주 채집지: 남쪽 섬 상록수림.'},
};
export const LOCATIONS={
 oak:{name:'참나무 숲',time:'저녁',hint:'넓적사슴벌레 · 장수풍뎅이',theme:'oak',cost:1,difficulty:0,chances:{king:.04,flat:.52,rhino:.42,redleg:.02}},
 deep:{name:'깊은 숲',time:'밤',hint:'고목 틈 · 왕사슴벌레',theme:'deep',cost:1,difficulty:1,chances:{king:.26,flat:.59,rhino:.13,redleg:.02}},
 grove:{name:'마을 뒷산',time:'오후',hint:'낙엽층 · 장수풍뎅이',theme:'grove',cost:1,difficulty:0,chances:{king:.01,flat:.22,rhino:.76,redleg:.01}},
 valley:{name:'계곡 고목지대',time:'밤',hint:'붉은 다리 흔적 · 홍다리사슴벌레',theme:'valley',cost:2,difficulty:2,chances:{king:.15,flat:.71,rhino:.04,redleg:.09,dauria:.01}},
 mountain:{name:'고산 활엽수림',time:'해 질 무렵',hint:'썩은 나무 · 다우리아사슴벌레',theme:'mountain',cost:2,difficulty:2,chances:{king:.13,flat:.75,rhino:.04,redleg:.03,dauria:.05}},
 island:{name:'남쪽 섬 상록수림',time:'밤',hint:'상록수 수액 · 두점박이사슴벌레',theme:'island',cost:2,difficulty:3,chances:{king:.015,flat:.58,rhino:.34,twospot:.065}},
};
export function sizeRange(species,sex,bred=false){const s=SPECIES[species];return bred?(sex==='male'?s.bredMale:s.bredFemale):s[sex];}
export function captureDifficulty(encounter){const rarity=SPECIES[encounter.bug.species].rarity;return {threshold:.48+encounter.alert*.002+rarity*.055,maxAttempts:rarity>=2?2:3,rarity};}
