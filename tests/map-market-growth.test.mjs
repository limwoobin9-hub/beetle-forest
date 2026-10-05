import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,breed,broodStage,careBrood,advanceDay,validateSave,migrateSave} from '../dist/engine.js';
import {marketValue,listAuction,syncAuctions,marketPlan,MINUTE} from '../dist/auctions.js';
import {startForeignTrip,surveyForeignTrip,syncForeignTrip,returnForeignTrip,claimForeignReturn,HOUR} from '../dist/overseas.js';
import {mapView,zoomMap,geoPoint,MAP_POINTS} from '../dist/world-map.js';
import {LAND_WIDTH,LAND_HEIGHT,LAND_ROWS} from '../dist/world-land.js';
import {PRODUCTS,productName} from '../dist/catalog.js';
const NOW=1800000000000;
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
test('wheel camera preserves the geographic point under the cursor, clamps pan, and zooms both ways',()=>{
 const start=mapView(),anchor={x:.8,y:.35},world=v=>({x:v.x+(anchor.x-.5)/v.zoom,y:v.y+(anchor.y-.5)/v.zoom});
 const inView=zoomMap(start,4,anchor);assert.equal(inView.zoom,4);assert.deepEqual(world(inView),world(start));
 const out=zoomMap(inView,.25,anchor);assert.deepEqual(out,start);
 assert.deepEqual(mapView({zoom:100,x:-20,y:20}),{zoom:12,x:1/24,y:23/24});
 assert.deepEqual(mapView(null),start);assert.deepEqual(geoPoint([0,0]),{x:.5,y:.5});assert.equal(Object.keys(MAP_POINTS).length,16);
});
test('coastline data includes Korea, Japan, Sulawesi, Java and actual continental shapes',()=>{
 const buf=Buffer.from(LAND_ROWS,'base64'),rows=[];let offset=0;
 for(let y=0;y<LAND_HEIGHT;y++){const count=buf.readUInt16LE(offset);offset+=2;const row=[];for(let i=0;i<count;i++){row.push(buf.readUInt16LE(offset));offset+=2;}rows.push(row);}
 assert.equal(offset,buf.length);
 const land=point=>{const p=geoPoint(point),x=Math.floor(p.x*LAND_WIDTH),r=rows[Math.floor(p.y*LAND_HEIGHT)];return r.some((a,i)=>i%2===0&&x>=a&&x<r[i+1]);};
 for(const point of [[127.5,37],[138,36],[121.5,-2],[110,-7.5],[114,1],[-60,-4],[12,5],[145,-19]])assert.equal(land(point),true,point.join(','));
 for(const point of [[-140,0],[-30,0],[135,15],[90,-20]])assert.equal(land(point),false,point.join(','));
});
test('all overseas travel and surveys are instant, and old saved waits migrate without losing catches',()=>{
 const s=newGame(NOW);s.coins=5000;s.career.qualifications=['overseas_live'];const t=startForeignTrip(s,'japan',NOW);
 assert.equal(t.phase,'field');surveyForeignTrip(s,createBug,NOW);const catches=structuredClone(t.catches);
 for(let i=1;i<3;i++){assert.equal(t.phase,'field');assert.equal(t.waitUntil,NOW);surveyForeignTrip(s,createBug,NOW);}
 assert.equal(t.surveys,3);assert.throws(()=>surveyForeignTrip(s,createBug,NOW),/3회/);returnForeignTrip(s,NOW);assert.equal(t.phase,'arrived');claimForeignReturn(s,NOW);assert.equal(s.bugs.length,3);valid(s);
 const old=newGame(NOW);old.coins=5000;const outbound=startForeignTrip(old,'japan',NOW);outbound.phase='outbound';outbound.waitUntil=NOW+5*HOUR;
 assert.equal(syncForeignTrip(old,NOW),true);assert.equal(outbound.phase,'field');assert.equal(outbound.waitUntil,NOW);valid(old);
 old.career.qualifications=['overseas_live'];outbound.catches=catches;outbound.surveys=1;outbound.phase='surveying';outbound.waitUntil=NOW+5*HOUR;
 assert.equal(syncForeignTrip(old,NOW),true);assert.equal(outbound.phase,'field');assert.equal(outbound.waitUntil,NOW);assert.deepEqual(outbound.catches,catches);valid(old);
 outbound.phase='returning';outbound.waitUntil=NOW+5*HOUR;
 assert.equal(syncForeignTrip(old,NOW),true);assert.equal(outbound.phase,'arrived');assert.deepEqual(outbound.catches,catches);claimForeignReturn(old,NOW);valid(old);
});
test('small protected adults sell at a substantial premium in both sexes, with deterministic competitive bids',()=>{
 for(const sex of ['male','female']){
  const b=createBug('twospot',sex,0,1,'채집',null,1,null,{traits:[]}),profile=marketValue('adult',b);
  assert.ok(profile.value>=2300);assert.ok(profile.suggested>=1600);assert.ok(profile.demand>=.7);
  const s=newGame(NOW);s.career.qualifications=['protected_sale'];s.bugs.push(b);const lot=listAuction(s,'adult',b.id,{startPrice:profile.suggested,durationMinutes:10},NOW);
  lot.id='protected-sale-'+sex;assert.ok(marketPlan(lot).length>=3);syncAuctions(s,lot.ends);assert.equal(lot.status,'sold');assert.ok(lot.current>=1600);valid(s);
 }
});
test('new ordinary valuations raise bidder budgets while old auction snapshots remain unchanged',()=>{
 const b=createBug('king','male',.9,1,'채집',null,1,null,{traits:[]}),s=newGame(NOW);s.bugs.push(b);
 const profile=marketValue('adult',b),score=(b.length-25)/(94.1-25),oldValue=80*(.10+6*score**3.4)*(.42+.58*b.health/100);
 assert.ok(Math.abs(profile.value/oldValue-2.5)<.02);
 const lot=listAuction(s,'adult',b.id,{startPrice:1,durationMinutes:10},NOW);lot.market={...profile,value:Math.round(oldValue)};
 const original=structuredClone(lot.market),plan=marketPlan(lot);migrateSave(s,NOW);assert.deepEqual(lot.market,original);assert.deepEqual(marketPlan(lot),plan);valid(s);
});
test('sustained premium fungus yields rare upper-80mm flat males through actual brood emergence',()=>{
 const sizes=[];
 for(let seed=17;seed<137;seed++){
  let n=seed;const random=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
  const s=newGame(NOW),m=createBug('flat','male',.8,1),f=createBug('flat','female',.4,1);m.length=64;f.length=34;s.bugs.push(m,f);s.inventory.pro_fungus=50;
  const brood=breed(s,m.id,f.id,random,'basic_mat');
  for(let day=0;day<15;day++){if(['1령','2령','3령'].includes(broodStage(brood))&&brood.food<100)careBrood(s,brood.id,'pro_fungus');advanceDay(s);}
  sizes.push(...s.bugs.filter(b=>b.source==='번식'&&b.sex==='male').map(b=>b.length));valid(s);
 }
 assert.ok(sizes.some(v=>v>=88));assert.ok(sizes.filter(v=>v>=87).length/sizes.length<.15);assert.ok(sizes.every(v=>v<=90));
 const parents=[{sex:'male',length:64,genetic:.8},{sex:'female',length:34,genetic:.4}];
 const length=fungus=>createBug('flat','male',.65,1,'번식',parents,1.15,{care:1,nutrition:1.15,fungus}).length;
 assert.ok(length(1)>length(.05)+3);assert.ok(length(.05)-length(0)<.5);
});
test('one shared supply has a contextual adult name and all retail food names use the requested terms',()=>{
 assert.equal(productName(PRODUCTS.basic_mat,'adult'),'참나무 바닥재');assert.equal(productName(PRODUCTS.basic_mat),'참나무 톱밥');
 assert.equal(PRODUCTS.coconut.name,'코코넛 바닥재');assert.ok(PRODUCTS.stag_master.name.includes('발효톱밥'));
 for(const p of Object.values(PRODUCTS))assert.doesNotMatch(p.name,/매트|깔개/);
});
test('king growth exceeds the old 86mm ceiling rarely, and 90mm males require large parents and sustained fungus',()=>{
 const results=[];
 for(let seed=17;seed<137;seed++){
  let n=seed;const random=()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296;};
  const s=newGame(NOW),m=createBug('king','male',.8,1),f=createBug('king','female',.4,1);m.length=80;f.length=45;s.bugs.push(m,f);s.inventory.pro_fungus=50;
  const brood=breed(s,m.id,f.id,random,'basic_mat');
  for(let day=0;day<15;day++){if(['1령','2령','3령'].includes(broodStage(brood))&&brood.food<100)careBrood(s,brood.id,'pro_fungus');advanceDay(s);}
  results.push(...s.bugs.filter(b=>b.source==='번식'&&b.sex==='male').map(b=>b.length));valid(s);
 }
 assert.ok(results.some(v=>v>86));assert.ok(results.some(v=>v>=92));assert.ok(results.filter(v=>v>=90).length/results.length<.15);assert.ok(results.every(v=>v<=94.1));
 const parents=[{sex:'male',length:88.5,genetic:.8},{sex:'female',length:51.5,genetic:.4}];
 const size=fungus=>createBug('king','male',.72,1,'번식',parents,1.15,{care:1,nutrition:1.15,fungus}).length;
 assert.ok(size(1)>=94);assert.ok(size(.05)<87);assert.ok(size(0)<=86);
 const matParents=[{sex:'male',length:76,genetic:.8},{sex:'female',length:44,genetic:.6}];
 assert.ok(createBug('king','male',.7,1,'번식',matParents,1.12,{care:1,nutrition:1.12,fungus:0}).length>70);
 const adult=createBug('king','male',1,1);adult.length=86;const s=newGame(NOW);s.bugs.push(adult);migrateSave(s,NOW);assert.equal(s.bugs[0].length,86);valid(s);
});
