// Taxon names and anatomy follow the references in docs/overseas-ko.md.
// Size, encounter weights and market values are game balance settings.
const stag=(name,latin,color,male,female,extra={})=>({name,latin,color,male,female,bredMale:[male[0],male[1]+8],bredFemale:[female[0],female[1]+4],power:1.08,grip:1.1,rarity:1,preferred:['sap','bark'],foreign:true,family:'stag',marketBase:260,...extra});
const rhino=(name,latin,color,male,female,extra={})=>({...stag(name,latin,color,male,female),family:'rhino',power:1.16,grip:1.03,preferred:['sap','leaf'],marketBase:340,...extra});
export const FOREIGN_SPECIES={
 grantii:rhino('그란티장수풍뎅이','Dynastes grantii','#c5cdc1',[35,85],[30,50],{bredMale:[35,90],rarity:2,marketBase:950,note:'회백색 딱지날개와 검은 점, 길게 맞물리는 두 뿔. 원정지: 미국 애리조나.'}),
 tityus:rhino('티티우스장수풍뎅이','Dynastes tityus','#a8b17f',[30,65],[25,45],{bredMale:[30,70],marketBase:750,note:'올리브색 딱지날개와 검은 점, 짧은 위아래 뿔. 원정지: 미국 버지니아.'}),
 satanas:rhino('사탄장수풍뎅이','Dynastes satanas','#6d766c',[50,105],[35,55],{bredMale:[50,115],rarity:3,marketBase:1800,note:'검은 몸과 앞가슴 뿔 아래의 갈색 털. 원정지: 볼리비아 융가스.'}),
 elaphus:stag('엘라푸스가위사슴벌레','Cyclommatus elaphus','#b99466',[35,100],[23,35],{bredMale:[35,110],rarity:3,marketBase:1400,note:'청동빛 몸과 매우 길고 가느다란 큰턱. 원정지: 수마트라 고산림.'}),
 adolphinae:stag('아돌피나금색사슴벌레','Lamprima adolphinae','#91b76c',[20,55],[18,30],{bredMale:[20,60],marketBase:1000,note:'녹색·금색 금속광택과 길게 들린 큰턱. 원정지: 파푸아뉴기니.'}),
 mellyi:stag('멜리사슴벌레','Homoderus mellyi','#c29b58',[30,65],[25,40],{rarity:3,marketBase:1300,note:'황갈색 몸의 검은 무늬와 수컷 앞가슴의 큰 돌출부. 원정지: 카메룬 내륙.'}),
 sumatra_flat:stag('수마트라넓적사슴벌레','Dorcus titanus yasuokai','#9fa897',[40,100],[32,48],{power:1.14,grip:1.16,note:'수마트라의 넓고 굵은 큰턱. 원정지: 수마트라.'}),
 metallifer:stag('메탈리퍼가위사슴벌레','Cyclommatus metallifer','#cdaf6e',[35,90],[20,30],{note:'금속빛 몸과 몸보다 길게 뻗은 큰턱. 원정지: 술라웨시.'}),
 atlas:rhino('아틀라스장수풍뎅이','Chalcosoma atlas','#9f9b60',[50,105],[35,60],{note:'머리 뿔과 앞가슴의 두 뿔, 청동빛 몸. 원정지: 수마트라·술라웨시.'}),
 caucasus:rhino('코카서스장수풍뎅이','Chalcosoma chiron','#859768',[60,120],[40,65],{rarity:2,marketBase:450,note:'세 개의 긴 뿔과 머리 뿔 아래의 돌기. 원정지: 수마트라·말레이시아·자바.'}),
 giraffe:stag('기라파톱사슴벌레','Prosopocoilus giraffa','#abb29a',[40,105],[30,48],{rarity:2,marketBase:380,note:'길게 뻗은 큰턱 안쪽에 많은 톱니. 원정지: 말레이시아·자바.'}),
 antaeus:stag('안테우스왕사슴벌레','Dorcus antaeus','#929e91',[35,82],[30,45],{marketBase:320,note:'굵고 둥근 큰턱, 검은 몸. 서늘한 환경을 좋아합니다. 원정지: 인도.'}),
 grandis:stag('그란디스왕사슴벌레','Dorcus grandis','#b2b5a4',[40,85],[30,46],{rarity:2,marketBase:400,note:'넓은 머리와 큰턱 안쪽의 돌기. 원정지: 인도.'}),
 borneo_flat:stag('보르네오넓적사슴벌레','Dorcus titanus borneensis','#869989',[40,88],[30,43],{note:'납작하고 길쭉한 몸. 원정지: 보르네오.'}),
 moellenkampi:rhino('모엘렌캄피장수풍뎅이','Chalcosoma moellenkampi','#a38b58',[50,110],[35,60],{rarity:2,marketBase:430,note:'앞으로 뻗은 세 뿔과 갈색 청동빛 몸. 원정지: 보르네오.'}),
 rainbow:stag('뮤엘러리무지개사슴벌레','Phalacrognathus muelleri','#83b297',[25,65],[23,40],{marketBase:350,note:'초록·붉은색 금속광택과 위로 들린 큰턱. 원정지: 호주.'}),
 golden:stag('오라타금색사슴벌레','Lamprima aurata','#d7bc57',[15,32],[15,27],{marketBase:230,power:.96,note:'작은 몸에 금색·초록색 광택. 원정지: 호주.'}),
 hercules:rhino('헤라클레스장수풍뎅이','Dynastes hercules','#d8c170',[60,155],[45,75],{bredMale:[60,175],rarity:3,marketBase:800,note:'위아래로 맞물리는 두 개의 긴 뿔과 황갈색 딱지날개. 원정지: 아마존.'}),
 actaeon:rhino('악테온코끼리장수풍뎅이','Megasoma actaeon','#8d8373',[60,125],[45,85],{rarity:2,marketBase:620,note:'큰 몸통과 두 갈래로 갈라지는 머리 뿔. 원정지: 아마존.'}),
 palawan:stag('팔라완넓적사슴벌레','Dorcus titanus palawanicus','#9fb4a2',[45,105],[32,50],{marketBase:420,power:1.16,grip:1.18,note:'길게 뻗은 큰턱과 넓은 머리. 원정지: 필리핀.'}),
 formosan:stag('대만사슴벌레','Lucanus formosanus','#c2a476',[35,80],[25,40],{note:'머리 뒤쪽의 귀 모양 돌기와 황갈색 털. 원정지: 대만.'}),
 sika:stag('시카사슴벌레','Rhaetulus crenatus sika','#aa825e',[30,68],[22,35],{note:'안쪽으로 크게 휘어진 큰턱. 원정지: 대만.'}),
 japan_stag:stag('일본사슴벌레','Lucanus maculifemoratus','#baa073',[35,75],[25,40],{note:'머리 뒤의 돌기와 갈색 털. 원정지: 일본.'}),
 japan_saw:stag('일본톱사슴벌레','Prosopocoilus inclinatus','#b78161',[25,72],[23,36],{marketBase:220,note:'안쪽으로 굽은 톱니 큰턱과 적갈색 몸. 원정지: 일본.'}),
 elephas:rhino('엘레파스코끼리장수풍뎅이','Megasoma elephas','#c2aa67',[60,125],[45,80],{marketBase:650,note:'황금빛 짧은 털과 두 갈래 머리 뿔. 원정지: 멕시코.'}),
 neptune:rhino('넵튠장수풍뎅이','Dynastes neptunus','#8d9896',[65,145],[45,75],{marketBase:750,rarity:3,note:'검은 몸과 긴 위아래 뿔, 앞가슴의 작은 측면 뿔. 원정지: 에콰도르.'}),
 tarandus:stag('타란두스광사슴벌레','Mesotopus tarandus','#7c9590',[35,82],[30,50],{marketBase:430,note:'광택이 강한 검은 몸과 굵은 큰턱. 카와라 산란목·균사를 사용합니다. 원정지: 카메룬.'}),
 regius:stag('레기우스광사슴벌레','Mesotopus regius','#879d91',[35,85],[30,50],{marketBase:480,rarity:2,note:'곧게 뻗는 큰턱과 검은 광택. 카와라 산란목·균사를 사용합니다. 원정지: 카메룬.'}),
};
