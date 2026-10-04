import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,migrateSave,validateSave,advanceDay,care,setTimeOptions,syncRealTime,prepareSpecimen,workSpecimen,storeSpecimen,addSpecimenCase,careAidStatus,claimCareAid} from '../dist/engine.js';
import {syncSupplies} from '../dist/catalog.js';
import {DAY_MS} from '../dist/time.js';
import {PARTS,PIN_POINT} from '../dist/specimens.js';
import {LEGACY_SAVE,LEGACY_UI,initializeWorlds,worldKeys,loadWorld,saveWorld,worldSummary} from '../dist/worlds.js';
const NOW=1800000000000;
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};};
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function dead(s){const b=createBug('king','male',.7,s.day);b.health=30;b.hunger=0;b.hygiene=0;s.bugs.push(b);s.captures++;s.discoveries=['king'];s.records['king-male']=b.length;for(let i=0;i<3;i++)advanceDay(s);return s.memorials.find(m=>m.id===b.id);}
function poseAndDry(s,m){
 prepareSpecimen(s,m.id);valid(s);
 for(const [task,point] of [['water',{x:50,y:76}],['platform',{x:50,y:55}],['body',{x:50,y:45}],['lid',{x:50,y:25}]]){workSpecimen(s,m.id,task,point);valid(s);}
 advanceDay(s);workSpecimen(s,m.id,'pin',PIN_POINT);workSpecimen(s,m.id,'height',null,{height:25});valid(s);
 for(const p of PARTS){workSpecimen(s,m.id,'pose',p.target,{part:p.key});workSpecimen(s,m.id,'support',{x:p.target.x+(p.key[0]==='l'?-3:3),y:p.target.y+2},{part:p.key});valid(s);}
 workSpecimen(s,m.id,'board',{x:50,y:91});valid(s);
}
function finishWork(s,m){poseAndDry(s,m);for(let i=0;i<3;i++)advanceDay(s);for(const p of PARTS){workSpecimen(s,m.id,'remove-support',{x:91,y:91},{part:p.key});valid(s);}workSpecimen(s,m.id,'label',{x:50,y:91},{collector:'사육자',caption:'숲에서 채집한 개체'});valid(s);}

test('legacy real-time save moves to one world without losing its clock or insects',()=>{
 const store=storage(),s=newGame(NOW);s.bugs.push(createBug('flat','female',.6,1));setTimeOptions(s,{realTime:true,realGrowth:true},NOW);s.version=4;delete s.memorials;delete s.specimenCases;delete s.careAidDay;delete s.bugs[0].criticalDays;
 store.setItem(LEGACY_SAVE,JSON.stringify(s));store.setItem(LEGACY_UI,JSON.stringify({sort:'size-asc',view:'book'}));
 assert.equal(initializeWorlds(store,NOW+DAY_MS/2),'real');assert.equal(store.getItem(worldKeys('virtual').save),null);assert.equal(JSON.parse(store.getItem(LEGACY_SAVE)).version,4);
 const real=loadWorld(store,'real',NOW+DAY_MS/2);assert.equal(real.state.bugs[0].id,s.bugs[0].id);assert.equal(real.state.clock.anchorAt,NOW);assert.equal(real.state.settings.realGrowth,true);assert.equal(real.ui.sort,'size-asc');assert.equal(real.state.bugs[0].criticalDays,0);valid(real.state);
 assert.equal(initializeWorlds(store,NOW),null);
});
test('worlds isolate insects, currency, UI and clocks while only real time catches up',()=>{
 const store=storage();initializeWorlds(store,NOW);const real=loadWorld(store,'real',NOW),virtual=loadWorld(store,'virtual',NOW);
 real.state.bugs.push(createBug('king','male',.6,1));virtual.state.bugs.push(createBug('rhino','female',.4,1));virtual.state.coins=12;
 saveWorld(store,'real',real.state,{sort:'size-desc'});saveWorld(store,'virtual',virtual.state,{sort:'size-asc'});
 const loaded=loadWorld(store,'real',NOW+2*DAY_MS);assert.equal(loaded.state.day,3);assert.equal(loaded.state.bugs[0].species,'king');assert.equal(loaded.ui.sort,'size-desc');saveWorld(store,'real',loaded.state,loaded.ui);
 const other=loadWorld(store,'virtual',NOW+40*DAY_MS);assert.equal(other.state.day,1);assert.equal(other.state.coins,12);assert.equal(other.state.bugs[0].species,'rhino');assert.equal(other.ui.sort,'size-asc');assert.equal(loadWorld(store,'real',NOW+2*DAY_MS).state.day,3);
 assert.throws(()=>saveWorld(store,'virtual',loaded.state,{}),/시간 방식/);assert.equal(worldSummary(store,'virtual').insects,1);valid(loaded.state);valid(other.state);
});
test('migration never overwrites an existing world and damaged saves are retained for recovery',()=>{
 const store=storage(),original=newGame(NOW);original.coins=999;saveWorld(store,'virtual',original,{});store.setItem(LEGACY_SAVE,JSON.stringify(newGame(NOW)));initializeWorlds(store,NOW);
 assert.equal(loadWorld(store,'virtual',NOW).state.coins,999);store.setItem(worldKeys('real').save,'broken');assert.equal(worldSummary(store,'real').damaged,true);const fresh=loadWorld(store,'real',NOW);assert.equal(store.getItem(worldKeys('real').save+'-recovery'),'broken');assert.equal(fresh.state.settings.realTime,true);assert.equal(loadWorld(store,'virtual',NOW).state.coins,999);
});
test('death requires three consecutive critical days and preserves individual and collection history',()=>{
 const s=newGame(NOW),b=createBug('flat','female',.5,1);b.health=30;b.hunger=0;b.hygiene=0;b.favorite=true;s.bugs.push(b);s.captures=1;s.discoveries=['flat'];s.records['flat-female']=b.length;
 advanceDay(s);assert.equal(b.criticalDays,1);assert.equal(s.bugs.length,1);advanceDay(s);assert.equal(b.criticalDays,2);assert.equal(s.bugs.length,1);const events=advanceDay(s);assert.equal(s.bugs.length,0);assert.equal(s.memorials.length,1);assert.equal(s.memorials[0].bug.id,b.id);assert.equal(s.memorials[0].bug.favorite,true);assert.equal(s.memorials[0].status,'stored');assert.ok(events.some(e=>e.includes('사망')));assert.equal(s.captures,1);assert.equal(s.records['flat-female'],b.length);valid(s);
});
test('recovering health above the threshold breaks the critical-day streak',()=>{
 const s=newGame(NOW),b=createBug('king','male',.5,1);b.health=20;b.hunger=0;b.hygiene=0;s.bugs.push(b);advanceDay(s);assert.equal(b.criticalDays,1);care(s,b.id,'jelly');care(s,b.id,'clean');assert.ok(b.health>20);assert.equal(b.criticalDays,0);advanceDay(s);assert.equal(b.criticalDays,0);
 b.health=20;b.hunger=0;advanceDay(s);assert.equal(b.criticalDays,1);advanceDay(s);assert.equal(s.bugs.length,1);valid(s);
});
test('care aid covers needy insects once per day without currency or XP rewards',()=>{
 const s=newGame(NOW);for(let i=0;i<2;i++){const b=createBug('king','male',.4,1);b.hunger=0;b.hygiene=0;s.bugs.push(b);}s.coins=0;s.inventory.banana=0;s.inventory.basic_mat=0;syncSupplies(s);
 assert.deepEqual(careAidStatus(s),{eligible:true,jelly:2,mat:2,claimed:false});const aid=claimCareAid(s);assert.equal(aid.jelly,2);assert.equal(s.coins,0);assert.equal(s.xp,0);assert.throws(()=>claimCareAid(s),/이미/);for(const b of s.bugs){care(s,b.id,'jelly');care(s,b.id,'clean');}assert.equal(s.jelly,0);assert.equal(s.substrate,0);assert.equal(careAidStatus(s).eligible,false);valid(s);
});
test('specimen workflow cannot skip pinning, positioning, supports or drying',()=>{
 const s=newGame(NOW),m=dead(s);prepareSpecimen(s,m.id);assert.throws(()=>storeSpecimen(s,m.id,'case-1',0),/먼저/);assert.throws(()=>workSpecimen(s,m.id,'pin',PIN_POINT),/순서/);
 poseAndDry(s,m);assert.equal(m.status,'drying');assert.throws(()=>workSpecimen(s,m.id,'label',{x:50,y:91},{collector:'사육자',caption:''}),/대기/);advanceDay(s);advanceDay(s);assert.equal(m.status,'drying');advanceDay(s);assert.equal(m.work.phase,'cleanup');assert.throws(()=>storeSpecimen(s,m.id,'case-1',0),/먼저/);valid(s);
});
test('manual completed specimens preserve poses and labels in separate case slots',()=>{
 const s=newGame(NOW),a=dead(s),b=dead(s),coins=s.coins,xp=s.xp;finishWork(s,a);assert.equal(a.status,'casing');const pose=structuredClone(a.work.parts);storeSpecimen(s,a.id,'case-1',2);assert.equal(a.status,'mounted');assert.equal(a.caseId,'case-1');assert.equal(a.slot,2);assert.deepEqual(a.work.parts,pose);assert.equal(a.work.label.collector,'사육자');assert.throws(()=>storeSpecimen(s,a.id,'case-1',1),/먼저/);
 finishWork(s,b);assert.throws(()=>storeSpecimen(s,b.id,'case-1',2),/이미/);const c=addSpecimenCase(s);storeSpecimen(s,b.id,c.id,0);assert.equal(s.specimenCases.length,2);valid(s);
 const restored=JSON.parse(JSON.stringify(s));assert.equal(restored.memorials[0].work.parts[0].tip.x,PARTS[0].target.x);assert.equal(restored.memorials[0].caption,'숲에서 채집한 개체');assert.ok(s.coins>=coins-80);assert.ok(s.xp>=xp);const duplicate=structuredClone(s);duplicate.memorials[1].caseId=a.caseId;duplicate.memorials[1].slot=a.slot;assert.equal(validateSave(duplicate),false);
});
test('real-time offline catch-up advances preparation and death once without completing manual work',()=>{
 const s=newGame(NOW),m=dead(s);poseAndDry(s,m);setTimeOptions(s,{realTime:true,realGrowth:false},NOW);const before=s.day;syncRealTime(s,NOW+20*DAY_MS);assert.equal(s.day,before+20);assert.equal(m.work.phase,'cleanup');assert.equal(m.status,'working');assert.equal(m.caseId,null);assert.equal(syncRealTime(s,NOW+20*DAY_MS).days,0);valid(s);
});
test('v4 upgrade resets new mortality counters without changing existing growth or time settings',()=>{
 const s=newGame(NOW);s.bugs.push(createBug('king','male',.5,1));s.bugs[0].health=1;setTimeOptions(s,{realTime:true,realGrowth:true},NOW);s.version=4;delete s.memorials;delete s.specimenCases;delete s.careAidDay;delete s.bugs[0].criticalDays;
 assert.equal(validateSave(s),true);migrateSave(s,NOW+DAY_MS);assert.equal(s.version,5);assert.equal(s.bugs[0].criticalDays,0);assert.equal(s.clock.anchorAt,NOW);assert.deepEqual(s.settings,{realTime:true,realGrowth:true});valid(s);
});
