import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CRITICAL_DAYS,SPECIES,newGame,createBug,breed,advanceDay,validateSave,migrateSave,release} from '../dist/engine.js';
import {createLine,renameLine,archiveLine,lineStats,lineageText,offspringLineage,snapshotBug} from '../dist/lines.js';
import {worldKeys,saveWorld,loadWorld} from '../dist/worlds.js';
const bug=(s,sex,parents=null,day=1)=>createBug(s,sex,.7,day,parents?'번식':'채집',parents,1,null,{traits:[]});
function setup(species='flat'){const s=newGame(),m=bug(species,'male'),f=bug(species,'female');s.bugs.push(m,f);s.inventory.basic_mat=100;s.substrate=100;return {s,m,f};}
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
function grow(s){for(let i=0;i<15;i++){for(const b of s.bugs){b.hunger=100;b.hygiene=100;b.health=95;}advanceDay(s);}valid(s);}
test('every species supports named male/female founders with independent immutable snapshots',()=>{
 for(const species of Object.keys(SPECIES)){const {s,m,f}=setup(species),line=createLine(s,m.id,f.id,'  첫 라인  ');assert.equal(line.name,'첫 라인');assert.equal(line.founders.length,2);assert.equal(m.lineage.generation,0);assert.equal(f.lineage.kind,'founder');assert.equal(lineageText(s,m),'첫 라인 · P');m.name='새 이름';assert.notEqual(line.founders[0].name,m.name);assert.equal(lineStats(s,line).living,2);valid(s);}
});
test('invalid founder selections and duplicate/invalid names leave state untouched',()=>{
 const {s,m,f}=setup();const other=bug('rhino','female');s.bugs.push(other);
 for(const [mi,fi,name] of [[f.id,m.id,'A'],[m.id,other.id,'A'],[m.id,'missing','A'],[m.id,f.id,' '],[m.id,f.id,'x'.repeat(25)],[m.id,f.id,'a\nb']]){const before=JSON.stringify(s);assert.throws(()=>createLine(s,mi,fi,name));assert.equal(JSON.stringify(s),before);}
 createLine(s,m.id,f.id,'ABC');const before=JSON.stringify(s);assert.throws(()=>createLine(s,m.id,f.id,'ａｂｃ'),/이미/);assert.equal(JSON.stringify(s),before);valid(s);
});
test('P pairs produce both sexes as F1 and F1 pairs continue to F2 with saved breeding history',()=>{
 const {s,m,f}=setup(),line=createLine(s,m.id,f.id,'이어지는 숲');let values=[.1,.5,.9,.5,.1,.5];const brood=breed(s,m.id,f.id,()=>values.shift()??.9);
 assert.deepEqual(brood.lineage,{lineId:line.id,generation:1,kind:'linebred'});assert.equal(line.records[0].emerged,null);valid(s);grow(s);
 const children=s.bugs.filter(b=>b.source==='번식');assert.equal(children.length,3);assert.ok(children.every(b=>b.lineage.generation===1));assert.ok(children.some(b=>b.sex==='female'));assert.equal(line.records[0].offspring.length,3);
 const cm=children.find(b=>b.sex==='male'),cf=children.find(b=>b.sex==='female');breed(s,cm.id,cf.id,()=>.5);grow(s);
 assert.equal(lineStats(s,line).maxGeneration,2);assert.equal(lineStats(s,line).offspring,6);assert.equal(line.records[1].lineage.generation,2);valid(s);
 const restored=JSON.parse(JSON.stringify(s));migrateSave(restored);assert.deepEqual(restored.lines,s.lines);assert.deepEqual(restored.bugs.map(b=>b.lineage),s.bugs.map(b=>b.lineage));valid(restored);
});
test('external parents retain outcross history and two different lines require an explicit choice before spending',()=>{
 const {s,m,f}=setup(),a=createLine(s,m.id,f.id,'A'),m2=bug('flat','male'),f2=bug('flat','female');s.bugs.push(m2,f2);
 assert.equal(offspringLineage(s,m,f2).kind,'outcross');const b=createLine(s,m2.id,f2.id,'B'),before=JSON.stringify(s);
 assert.throws(()=>breed(s,m.id,f2.id,()=>.5),/골라/);assert.equal(JSON.stringify(s),before);
 assert.throws(()=>breed(s,m.id,f2.id,()=>.5,'basic_mat','missing'),/부모/);assert.equal(JSON.stringify(s),before);
 const brood=breed(s,m.id,f2.id,()=>.5,'basic_mat',b.id);assert.equal(brood.lineage.kind,'cross');assert.equal(brood.lineage.lineId,b.id);assert.deepEqual(b.records[0].parents.map(p=>p.lineage.lineId),[a.id,b.id]);valid(s);
});
test('assigning founders connects existing known descendants and pending broods without stealing other lines',()=>{
 const {s,m,f}=setup();let values=[.1,.5,.9,.5,.1,.5];breed(s,m.id,f.id,()=>values.shift()??.9);grow(s);const children=s.bugs.filter(b=>b.source==='번식');
 const cLine=createLine(s,children.find(b=>b.sex==='male').id,children.find(b=>b.sex==='female').id,'독립');
 breed(s,m.id,f.id,()=>.5);const pLine=createLine(s,m.id,f.id,'원종');assert.equal(s.broods[0].lineage.lineId,pLine.id);assert.equal(children[0].lineage.lineId,cLine.id);assert.equal(children[1].lineage.lineId,cLine.id);assert.equal(children[2].lineage.lineId,pLine.id);assert.equal(pLine.records.length,2);valid(s);
});
test('known unassigned F1 and F2 descendants are linked recursively',()=>{
 const {s,m,f}=setup();s.day=4;const parents=[m,f].map(snapshotBug),c1=bug('flat','male',parents,2),c2=bug('flat','female',parents,2),g=bug('flat','female',[c1,c2].map(snapshotBug),3);s.bugs.push(c1,c2,g);
 const line=createLine(s,m.id,f.id,'소급');assert.equal(g.lineage.generation,2);assert.equal(line.records.length,2);assert.equal(lineStats(s,line).offspring,3);valid(s);
});
test('reassigning founders preserves previous pending broods, origins and historical generations',()=>{
 const {s,m,f}=setup(),a=createLine(s,m.id,f.id,'첫 라인'),brood=breed(s,m.id,f.id,()=>.5),b=createLine(s,m.id,f.id,'두 번째');
 assert.equal(b.founders[0].originLineage.lineId,a.id);assert.equal(brood.lineage.lineId,a.id);grow(s);assert.equal(a.records[0].offspring.length,3);assert.equal(lineStats(s,a).living,3);assert.equal(lineStats(s,b).living,2);valid(s);
});
test('renaming and archiving preserve line IDs; release and death retain family records',()=>{
 const {s,m,f}=setup(),line=createLine(s,m.id,f.id,'원래');breed(s,m.id,f.id,()=>.5);grow(s);renameLine(s,line.id,'이름 변경');archiveLine(s,line.id);assert.equal(lineageText(s,m),'이름 변경 · P');release(s,m.id);assert.equal(lineStats(s,line).members.find(b=>b.id===m.id).status,'방생');
 f.health=20;f.hunger=0;f.hygiene=0;for(let i=0;i<CRITICAL_DAYS;i++)advanceDay(s);assert.ok(s.memorials.find(m=>m.id===f.id));assert.ok(lineStats(s,line).members.find(b=>b.id===f.id).status.includes('보관'));archiveLine(s,line.id);assert.equal(line.archived,false);valid(s);
});
test('malformed and cross-species lineage records fail validation without throwing',()=>{
 const {s,m,f}=setup();createLine(s,m.id,f.id,'A');breed(s,m.id,f.id,()=>.5);
 const edits=[x=>x.lines=null,x=>x.lines[0].founders[0]=null,x=>x.lines[0].records[0].parents[0]=null,x=>x.lines[0].records[0].lineage=null,x=>x.bugs[0].lineage.lineId='unknown',x=>x.bugs[0].lineage.generation=-1,x=>x.bugs[0].lineage.kind='cross',x=>x.broods[0].lineage.generation=2,x=>x.lines[0].founders[0].species='king',x=>x.lines[0].records[0].offspring=[null],x=>x.lines.push(structuredClone(x.lines[0]))];
 for(const edit of edits){const broken=structuredClone(s);edit(broken);assert.equal(validateSave(broken),false);}
});
test('legacy saves remain valid and line registries stay isolated between worlds',()=>{
 const {s,m,f}=setup();delete s.lines;valid(s);migrateSave(s);assert.deepEqual(s.lines,[]);createLine(s,m.id,f.id,'상상 전용');
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};saveWorld(store,'virtual',s,{});assert.equal(loadWorld(store,'virtual').state.lines.length,1);assert.equal(loadWorld(store,'real').state.lines.length,0);assert.ok(store.getItem(worldKeys('virtual').save));
});

