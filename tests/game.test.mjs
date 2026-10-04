import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SPECIES,newGame,createBug,buy,care,startExpedition,inspectSpot,approachInsect,finishCapture,cancelExpedition,breed,careBrood,broodStage,advanceDay,makeOpponent,advanceFight,combatRating,train,placeTrap,checkTrap,claimResearch,captureDifficulty,validateSave,migrateSave,syncRealTime,setTimeOptions,toggleFavorite} from '../dist/engine.js';
import {PRODUCTS,SHOP_AREAS,LEVEL_XP,keeperLevel,shopAccess} from '../dist/catalog.js';

import {stepHabitat,habitatState} from '../dist/habitat.js';
import {DAY_MS,growthDays,nextDayAt,midnightAt} from '../dist/time.js';
import {collectionView,staminaCapacity} from '../dist/collection.js';
const random=()=>.25;
function rng(seed=17){return ()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};}
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function parents(s,species='king',genetic=.7){const m=createBug(species,'male',genetic,s.day),f=createBug(species,'female',genetic,s.day);s.bugs.push(m,f);return [m,f];}
function encounter(s){startExpedition(s,'oak',random);const i=s.expedition.spots.findIndex(p=>p.rich);inspectSpot(s,i,random);return s.expedition.encounter;}

test('new game has no insects, names, discoveries, or default size records',()=>{
 const s=newGame();assert.deepEqual(s.bugs,[]);assert.deepEqual(s.discoveries,[]);assert.deepEqual(s.records,{});assert.deepEqual(s.log,[]);assert.equal(keeperLevel(s),1);valid(s);
 assert.equal(SHOP_AREAS.length,5);assert.equal(Object.keys(PRODUCTS).length,26);
});
test('shop district locks protect purchases and open at keeper levels',()=>{
 const s=newGame(),before=structuredClone(s);
 assert.throws(()=>buy(s,'protein'),/Lv.2/);assert.deepEqual(s,before);
 for(let level=1;level<=5;level++){
  s.xp=LEVEL_XP[level-1];s.coins=10000;s.day=24;s.captures=24;s.totalBreedings=3;s.totalEmergences=3;
  for(const [id,p] of Object.entries(PRODUCTS).filter(([,p])=>p.area===SHOP_AREAS[level-1].id)){
   const count=s.inventory[id]||0,coins=s.coins;buy(s,id);assert.equal(s.inventory[id],count+p.qty);assert.equal(s.coins,coins-p.price);
  }
  valid(s);
 }
});
test('collecting awards an insect only after search, approach and successful timing',()=>{
 const s=newGame(),coins=s.coins,e=encounter(s);assert.equal(s.energy,4);assert.equal(s.bugs.length,0);assert.equal(s.expedition.phase,'approach');valid(s);
 const alert=e.alert,speed=e.speed;approachInsect(s,'slow');assert.ok(e.alert<alert);assert.ok(e.speed<speed);valid(s);
 assert.equal(finishCapture(s,0).missed,true);assert.equal(s.bugs.length,0);valid(s);
 const result=finishCapture(s,1);assert.equal(result.bug.id,s.bugs[0].id);assert.equal(s.expedition,null);assert.equal(s.coins,coins+10);assert.equal(s.captures,1);assert.equal(s.xp,24);valid(s);
});
test('failed capture, cancellation and advancing time have consistent costs',()=>{
 const s=newGame();encounter(s);approachInsect(s,'fast');
 assert.throws(()=>advanceDay(s),/채집/);
 for(let i=0;i<3&&s.expedition;i++)finishCapture(s,0);
 assert.equal(s.expedition,null);assert.equal(s.bugs.length,0);assert.equal(s.captures,0);assert.equal(s.xp,0);
 startExpedition(s,'deep',random);cancelExpedition(s);assert.equal(s.energy,3);advanceDay(s);assert.equal(s.energy,5);valid(s);
});
test('jelly and bedding use the selected product and grant daily care XP once',()=>{
 const s=newGame(),[b]=parents(s);b.hunger=10;b.health=30;b.hygiene=15;s.inventory.pro_jelly=3;s.inventory.coconut=2;
 care(s,b.id,'jelly','pro_jelly');assert.equal(b.hunger,100);assert.equal(b.health,55);assert.equal(s.xp,5);
 care(s,b.id,'jelly','pro_jelly');assert.equal(s.xp,5);assert.equal(b.health,80);
 care(s,b.id,'clean','coconut');assert.equal(b.hygiene,100);assert.equal(s.xp,10);
 advanceDay(s);assert.equal(b.hunger,90);assert.equal(b.hygiene,90);valid(s);
});
test('all species pass through egg, three instars, pupa and adult',()=>{
 for(const species of Object.keys(SPECIES)){
  const s=newGame(),[m,f]=parents(s,species);s.inventory.basic_mat=40;
  const b=breed(s,m.id,f.id,random);assert.equal(broodStage(b),'알');valid(s);
  const seen=new Set(['알']);
  for(let day=1;day<=15;day++){
   if(['1령','2령','3령'].includes(broodStage(b))&&b.food<100)careBrood(s,b.id,'basic_mat');
   advanceDay(s);if(s.broods.length)seen.add(broodStage(b));valid(s);
  }
  assert.deepEqual([...seen],['알','1령','2령','3령','번데기']);assert.equal(s.broods.length,0);assert.equal(s.bugs.length,3);assert.equal(s.memorials.length,2);
  assert.ok(s.bugs.every(b=>b.name===SPECIES[species].name&&b.parents.length===2));
 }
});
test('larval food checks species, instar and nutritional suitability',()=>{
 const s=newGame(),[m,f]=parents(s,'rhino');s.inventory.hiratake_1400=3;s.inventory.coconut=3;
 const b=breed(s,m.id,f.id,random);advanceDay(s);advanceDay(s);
 const count=s.inventory.hiratake_1400;assert.throws(()=>careBrood(s,b.id,'hiratake_1400'),/맞지/);assert.equal(s.inventory.hiratake_1400,count);
 assert.throws(()=>careBrood(s,b.id,'coconut'),/맞지/);valid(s);
 const t=newGame(),[sm,sf]=parents(t);t.inventory.hiratake_800=3;t.inventory.hiratake_1400=3;
 const sb=breed(t,sm.id,sf.id,random);for(let i=0;i<7;i++)advanceDay(t);
 assert.equal(broodStage(sb),'3령');assert.throws(()=>careBrood(t,sb.id,'hiratake_800'),/1400/);
 careBrood(t,sb.id,'hiratake_1400');assert.equal(sb.medium,'hiratake_1400');valid(t);
});
function raise(genetic,medium){const s=newGame(),[m,f]=parents(s,'king',genetic);s.inventory[medium]=40;const b=breed(s,m.id,f.id,random,medium);for(let i=0;i<15;i++){if(['1령','2령','3령'].includes(broodStage(b))&&b.food<100)careBrood(s,b.id,medium);advanceDay(s);}valid(s);return s.bugs[2].length;}
test('offspring size responds to both inherited size and larval nutrition',()=>{
 assert.ok(raise(.9,'basic_mat')>raise(.2,'basic_mat'));
 assert.ok(raise(.6,'stag_master')>raise(.6,'basic_mat'));
});
test('breeding reserves room for an in-progress capture',()=>{
 const s=newGame(),[m,f]=parents(s);while(s.bugs.length<45)s.bugs.push(createBug('king','male',.5,s.day));startExpedition(s,'oak',random);
 const mat=s.inventory.basic_mat;assert.throws(()=>breed(s,m.id,f.id,random),/공간/);assert.equal(s.inventory.basic_mat,mat);valid(s);
});
test('automatic fight persists contacts and respects daily entry without move inputs',()=>{
 const s=newGame(),[m]=parents(s,'king',.95);const fight=makeOpponent(s,m.id,random);valid(s);
 assert.throws(()=>advanceDay(s),/투곤/);assert.throws(()=>care(s,m.id,'jelly'),/경기/);
 while(!fight.finished){advanceFight(s,random);valid(s);}
 assert.equal(fight.won,true);assert.equal(m.wins,1);assert.equal(s.xp,20);assert.ok(fight.elapsed<=36);
 assert.throws(()=>makeOpponent(s,m.id,random),/오늘/);advanceDay(s);makeOpponent(s,m.id,random);valid(s);
});
test('legacy saves lose default named insects while retaining collected insects and breeding',()=>{
 const starter=createBug('king','male',.48,1,'첫 친구');starter.name='밤톨';const collected=createBug('flat','female',.8,1,'참나무 숲');
 const s={version:1,day:6,coins:280,jelly:16,substrate:8,energy:5,bugs:[starter,collected],broods:[],discoveries:['king','flat','rhino'],captures:1,records:{'king-male':starter.length,'flat-female':collected.length},fight:null,log:[{day:1,text:'여섯 친구와 여름을 시작해요.'}]};
 s.broods.push({id:'legacy-brood',species:'king',started:1,age:5,food:50,qualitySum:2,qualityDays:3,parents:[{...starter},{...createBug('king','female',.5,1,'첫 친구')}],children:[{sex:'male',genetic:.5},{sex:'female',genetic:.5},{sex:'male',genetic:.5}]});
 valid(s);migrateSave(s);assert.equal(s.version,5);assert.deepEqual(s.bugs.map(b=>b.id),[collected.id]);assert.equal(s.records['king-male'],undefined);assert.equal(s.records['flat-female'],collected.length);assert.equal(s.broods[0].age,9);assert.equal(s.log.length,0);assert.equal(s.inventory.banana,16);valid(s);
});
test('malformed encounter and player coordinates are rejected before restoring a save',()=>{
 const s=newGame();encounter(s);s.expedition.encounter.bug.hunger=undefined;assert.equal(validateSave(s),false);
 const t=newGame();startExpedition(t,'oak',random);t.expedition.player={x:Infinity,y:200};assert.equal(validateSave(t),false);
});

test('early shop stays locked despite surplus XP until day and captures are earned',()=>{
 const s=newGame();s.xp=5000;s.coins=10000;
 assert.equal(shopAccess(s,'nutrition').unlocked,false);assert.throws(()=>buy(s,'protein'),/5일째/);
 s.day=5;assert.throws(()=>buy(s,'protein'),/채집 5마리/);s.captures=5;buy(s,'protein');assert.equal(shopAccess(s,'nutrition').unlocked,true);valid(s);
});
test('established habitats retain rare encounters and their higher capture difficulty',()=>{
 const counts={},r=rng(352);const locations=['oak','deep','grove','valley','mountain','island'];
 for(const location of locations){for(let i=0;i<220;i++){
  const s=newGame();startExpedition(s,location,r);const e=inspectSpot(s,s.expedition.spots.findIndex(p=>p.rich),r);counts[e.bug.species]=(counts[e.bug.species]||0)+1;
  if(SPECIES[e.bug.species].rarity){assert.ok(captureDifficulty(e).threshold>captureDifficulty({...e,bug:{species:'flat'}}).threshold);assert.ok(e.speed>1);}
  valid(s);
 }}
 assert.ok(counts.redleg>0&&counts.dauria>0&&counts.twospot>0);assert.ok(counts.flat>counts.dauria*3);assert.ok(counts.flat>counts.twospot*3);
});
test('wild king stag stays below 70 mm and large breeding requires strong inherited potential',()=>{
 for(let i=0;i<=100;i++)assert.ok(createBug('king','male',i/100,1).length<=69);
 assert.ok(createBug('king','male',.5,1).length<55);
 assert.ok(createBug('king','male',.5,1,'번식',[],1.15).length<65);
 assert.ok(createBug('king','male',1,1,'번식',[],1.15).length>70);
});
test('body size dominates random contact outcomes even against maximum training',()=>{
 let wins=0;
 for(let i=1;i<=80;i++){
  const s=newGame(),[m]=parents(s,'flat',.8);m.length=65;const f=makeOpponent(s,m.id,rng(i));f.rival.species='flat';f.rival.traits=[];f.rival.length=35;f.rival.trainingGrip=12;f.rival.trainingStamina=12;f.opponentStamina=118;
  while(!f.finished)advanceFight(s,rng(i+100+f.elapsed));if(f.won)wins++;valid(s);
 }
 assert.ok(wins>=78);
});
test('training consumes daily effort and stays a small modifier',()=>{
 const s=newGame(),[m]=parents(s);s.inventory.rope_set=1;const before=combatRating(m);
 train(s,m.id,'grip');assert.equal(m.trainingGrip,2);assert.equal(s.inventory.rope_set,1);assert.throws(()=>train(s,m.id,'grip'),/하루/);
 m.hunger=76;assert.ok(combatRating(m)/before<1.02);valid(s);
});
test('exhaustion ends a fight even while the exhausted insect leads at centre',()=>{
 const s=newGame(),[m]=parents(s,'flat',.7),f=makeOpponent(s,m.id,()=>.5);
 f.rival.species=m.species;f.rival.length=m.length;f.rival.health=m.health;f.rival.hunger=m.hunger;
 f.position=30;f.playerStamina=1;advanceFight(s,()=>.5);
 assert.equal(f.playerStamina,0);assert.ok(f.position>0);assert.equal(f.finished,true);assert.equal(f.won,false);valid(s);
});
test('traps persist overnight, then create an encounter requiring direct capture',()=>{
 const s=newGame();buy(s,'sap_trap');const t=placeTrap(s,'oak','sap_trap');assert.throws(()=>checkTrap(s,t.id,()=>.5),/다음 날/);valid(s);
 advanceDay(s);const energy=s.energy,e=checkTrap(s,t.id,()=>.5);assert.ok(e);assert.equal(s.bugs.length,0);assert.equal(s.traps.length,0);assert.equal(s.energy,energy);valid(s);
 approachInsect(s,'slow');finishCapture(s,1);assert.ok(s.bugs[0].source.includes('덫'));valid(s);
});
test('research requests reward a fulfilled objective once and in order',()=>{
 const s=newGame();assert.throws(()=>claimResearch(s,'common'),/조건/);s.discoveries=['flat','rhino'];const coins=s.coins;claimResearch(s,'common');assert.equal(s.coins,coins+80);assert.throws(()=>claimResearch(s,'common'),/조건/);valid(s);
});
test('room behaviour includes eating, hiding and emergence without oscillation',()=>{
 const b=createBug('king','male',.5,1);b.hunger=20;const modes=new Set();
 for(let ms=0;ms<=180000;ms+=50){const l=stepHabitat(b,ms);modes.add(l.mode);assert.ok(Number.isFinite(l.x)&&Number.isFinite(l.y));assert.ok(l.alpha>=0&&l.alpha<=1);}
 assert.ok(modes.has('eat'));
 b.hunger=90;b.health=20;
 for(let ms=180050;ms<=420000;ms+=50)modes.add(stepHabitat(b,ms).mode);
 assert.ok(modes.has('hide'));assert.ok(modes.has('emerge'));
 const l=habitatState(b);l.mode='hide';l.alpha=0;l.timer=15;b.hygiene=15;stepHabitat(b,420050);b.hygiene=100;stepHabitat(b,420100);assert.equal(l.mode,'emerge');
});
test('v2 migration corrects impossible captured size and preserves brood ancestry and supplies',()=>{
 const s=newGame(),[m,f]=parents(s);s.version=2;m.length=81;f.length=50;s.records={'king-male':81,'king-female':50};const brood=breed(s,m.id,f.id,random);brood.parents.forEach(p=>delete p.genetic);
 delete s.traps;delete s.researchClaimed;delete s.totalBreedings;delete s.totalEmergences;
 valid(s);migrateSave(s);assert.ok(m.length<=69);assert.ok(f.length<=44);assert.ok(s.records['king-male']<=69);assert.equal(s.broods.length,1);assert.equal(s.inventory.banana,6);valid(s);
});
test('real time follows Korean midnight, catches up after reload, and never repeats dates',()=>{
 const now=Date.parse('2026-10-04T23:59:00+09:00'),s=newGame(now),boundary=Date.parse('2026-10-05T00:00:00+09:00');
 assert.equal(syncRealTime(s,now+8*DAY_MS).days,0);
 setTimeOptions(s,{realTime:true,realGrowth:false},now);assert.throws(()=>advanceDay(s),/자정/);
 assert.equal(nextDayAt(s),boundary);assert.equal(syncRealTime(s,boundary-1).days,0);
 assert.equal(syncRealTime(s,boundary).days,1);assert.equal(s.day,2);assert.equal(syncRealTime(s,boundary).days,0);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(syncRealTime(restored,boundary+3.75*DAY_MS).days,3);assert.equal(restored.day,5);assert.equal(nextDayAt(restored),boundary+4*DAY_MS);
 assert.equal(syncRealTime(restored,now+2*DAY_MS).days,0);assert.equal(restored.day,5);valid(restored);
});
test('natural schedules take months and every species persists until its emergence day',()=>{
 const now=1800000000000;
 for(const species of Object.keys(SPECIES)){
  const s=newGame(now),[m,f]=parents(s,species);setTimeOptions(s,{realTime:true,realGrowth:true},now);const brood=breed(s,m.id,f.id,random),days=growthDays(species,'natural');
  assert.ok(days>=180&&days<=480);assert.equal(syncRealTime(s,now+8*DAY_MS).days,8);assert.equal(s.broods.length,1);assert.equal(s.totalEmergences,0);valid(s);
  syncRealTime(s,now+(days-1)*DAY_MS);assert.equal(s.broods.length,1);assert.equal(broodStage(brood),'번데기');valid(s);
  syncRealTime(s,now+days*DAY_MS);assert.equal(s.broods.length,0);assert.equal(s.totalEmergences,1);assert.equal(s.bugs.length,3);assert.equal(s.memorials.length,2);valid(s);
 }
});
test('switching growth modes preserves the current instar and progress, and disabling real time resumes buttons',()=>{
 const now=midnightAt(1800000000000),s=newGame(now),[m,f]=parents(s),brood=breed(s,m.id,f.id,random);
 assert.throws(()=>setTimeOptions(s,{realTime:false,realGrowth:true},now),/함께/);
 for(let i=0;i<6;i++)advanceDay(s);assert.equal(broodStage(brood),'2령');const age=brood.age;
 setTimeOptions(s,{realTime:true,realGrowth:true},now);assert.equal(broodStage(brood),'2령');assert.ok(brood.age>age);valid(s);
 setTimeOptions(s,{realTime:false,realGrowth:false},now+DAY_MS/2);assert.equal(broodStage(brood),'2령');assert.ok(Math.abs(brood.age-age)<1e-9);assert.equal(s.day,7);
 advanceDay(s);assert.equal(s.day,8);valid(s);
});
test('long offline catch-up is bounded and matches daily simulation for rewards, care, growth and records',()=>{
 const now=1800000000000,a=newGame(now),[m,f]=parents(a,'rhino'),b=newGame(now);breed(a,m.id,f.id,random);
 setTimeOptions(a,{realTime:true,realGrowth:true},now);Object.assign(b,structuredClone(a));
 syncRealTime(a,now+3000*DAY_MS);
 for(let i=1;i<=3000;i++)syncRealTime(b,now+i*DAY_MS);
 for(const key of ['day','coins','xp','energy','totalEmergences','records','log'])assert.deepEqual(a[key],b[key]);
 assert.deepEqual(a.bugs.map(x=>[x.hunger,x.health,x.hygiene,x.length]),b.bugs.map(x=>[x.hunger,x.health,x.hygiene,x.length]));valid(a);valid(b);
});
test('a real day boundary preserves collection encounters and settles matches before daily decay',()=>{
 const now=1800000000000,s=newGame(now),[m]=parents(s);setTimeOptions(s,{realTime:true,realGrowth:false},now);
 encounter(s);const e=s.expedition;makeOpponent(s,m.id,random);syncRealTime(s,now+DAY_MS);
 assert.equal(s.expedition,e);assert.equal(s.fight,null);assert.equal(m.wins+m.losses,1);assert.equal(m.fightDay,1);assert.equal(s.energy,5);valid(s);
});
test('v3 saves retain insects, an active fight, traps and research while opting out of new time modes',()=>{
 const s=newGame(),[m]=parents(s);makeOpponent(s,m.id,random);buy(s,'sap_trap');placeTrap(s,'oak','sap_trap');s.researchClaimed=['common'];s.version=3;delete s.settings;delete s.clock;
 valid(s);migrateSave(s,1800000000000);assert.deepEqual(s.settings,{realTime:false,realGrowth:false});assert.equal(s.clock.anchorAt,1800000000000);assert.equal(s.traps.length,1);assert.ok(s.fight);assert.equal(s.researchClaimed.length,1);valid(s);
});
test('favorites survive saving and care acts on the intended card insect only',()=>{
 const s=newGame(),[m,f]=parents(s);m.hunger=10;f.hunger=10;m.hygiene=20;
 toggleFavorite(s,m.id);assert.equal(m.favorite,true);const saved=JSON.parse(JSON.stringify(s));assert.equal(saved.bugs[0].favorite,true);
 care(s,m.id,'jelly');care(s,m.id,'clean');assert.equal(m.hunger,100);assert.equal(m.hygiene,100);assert.equal(f.hunger,10);assert.equal(s.inventory.banana,5);assert.equal(s.inventory.basic_mat,3);toggleFavorite(s,m.id);assert.equal(m.favorite,false);valid(s);
});
test('collection combines species, sex and favorite filters',()=>{
 const bugs=[createBug('king','male',.5,1),createBug('king','female',.5,1),createBug('flat','female',.5,1)];bugs[1].favorite=true;bugs[2].favorite=true;
 assert.deepEqual(collectionView(bugs,{species:'king',sex:'female',favoritesOnly:true}),[bugs[1]]);
 assert.deepEqual(collectionView(bugs,{sex:'male',favoritesOnly:true}),[]);
 assert.equal(collectionView(bugs,{favoritesOnly:true}).length,2);
});
test('collection sorting uses numeric size and stamina in both directions without mutating inventory',()=>{
 const bugs=[createBug('king','male',.9,1),createBug('flat','male',.2,1),createBug('rhino','female',.4,1)];bugs[0].favorite=true;bugs[0].trainingStamina=2;bugs[1].trainingStamina=12;const order=bugs.map(b=>b.id);
 for(const metric of ['size','stamina','grip','health','hunger'])for(const direction of ['asc','desc']){
  const view=collectionView(bugs,{sort:metric+'-'+direction}),value=b=>metric==='size'?b.length:metric==='stamina'?staminaCapacity(b):metric==='grip'?b.trainingGrip||0:b[metric];
  for(let i=1;i<view.length;i++)assert.ok(direction==='asc'?value(view[i])>=value(view[i-1]):value(view[i])<=value(view[i-1]));
 }
 assert.deepEqual(bugs.map(b=>b.id),order);assert.equal(collectionView(bugs,{sort:'stamina-asc'})[0],bugs[2]);assert.equal(collectionView(bugs,{sort:'stamina-desc'})[0],bugs[1]);
});
