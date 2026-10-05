import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,breed,advanceDay,dailySupport,releaseMany,makeOpponent,validateSave,setTimeOptions,syncRealTime} from '../dist/engine.js';
import {DAY_MS} from '../dist/time.js';
import {createLine,lineStats} from '../dist/lines.js';
import {listAuction} from '../dist/auctions.js';

function adults(n=2){const s=newGame();for(let i=0;i<n;i++){const b=createBug('king',i%2?'female':'male',.7,s.day);b.name=`개체 ${i+1}`;s.bugs.push(b);s.records['king-'+b.sex]=Math.max(s.records['king-'+b.sex]||0,b.length);}return s;}

test('daily support grows with adult population without the former 65-leaf cap',()=>{
 for(const [count,expected] of [[0,35],[1,45],[10,135],[20,235],[48,515]]){
  const s=adults(count),before=s.coins;advanceDay(s);
  assert.equal(s.coins-before,expected);assert.match(s.log[0].text,new RegExp(`지원금 ${expected} 잎사귀`));
  assert.equal(validateSave(s),true);
 }
});

test('population support still pays for living adults in poor condition while healthy care earns extra',()=>{
 const s=adults(2);s.bugs[1].health=50;s.bugs[1].hunger=20;
 assert.deepEqual(dailySupport(s),{base:35,adults:2,offspring:0,healthy:1,adultSupport:12,offspringSupport:0,careBonus:4,total:51});
 const coins=s.coins;advanceDay(s);assert.equal(s.coins-coins,51);
});

test('brood offspring receive support once on emergence day and adult support on the following day',()=>{
 const s=adults(),brood=breed(s,s.bugs[0].id,s.bugs[1].id,()=>.25);
 for(const b of s.bugs){b.hunger=100;b.health=100;}
 brood.age=14;assert.equal(dailySupport(s).offspring,3);const before=s.coins;advanceDay(s);
 assert.equal(s.coins-before,64);assert.equal(s.bugs.length,5);assert.equal(s.broods.length,0);
 for(const b of s.bugs){b.hunger=100;b.health=100;}
 const next=s.coins;advanceDay(s);assert.equal(s.coins-next,85);assert.equal(validateSave(s),true);
});

test('dead adults, memorials and auction custody do not inflate daily support',()=>{
 const s=adults(3);s.bugs[0].health=5;s.bugs[0].hunger=0;s.bugs[0].criticalDays=2;
 listAuction(s,'adult',s.bugs[2].id,{startPrice:100,durationMinutes:10},Date.now());
 const before=s.coins;advanceDay(s);assert.equal(s.coins-before,45);assert.equal(s.bugs.length,1);assert.equal(s.memorials.length,1);
 assert.equal(dailySupport(s).adults,1);assert.equal(validateSave(s),true);
});

test('daily support matches offline catch-up and reload without paying twice',()=>{
 const now=Date.parse('2026-10-04T12:00:00+09:00'),a=adults(20);
 setTimeOptions(a,{realTime:true,realGrowth:false},now);const b=structuredClone(a);
 syncRealTime(a,now+4*DAY_MS);
 for(let i=1;i<=4;i++)syncRealTime(b,now+i*DAY_MS);
 assert.deepEqual(a,b);const reloaded=JSON.parse(JSON.stringify(a)),coins=a.coins;
 assert.equal(syncRealTime(reloaded,now+4*DAY_MS).days,0);assert.equal(reloaded.coins,coins);
 const c=structuredClone(a);syncRealTime(a,now+300*DAY_MS);
 for(let i=5;i<=300;i++)syncRealTime(c,now+i*DAY_MS);
 assert.deepEqual(a,c);assert.equal(validateSave(a),true);
});

test('bulk release removes only chosen IDs once and preserves all unrelated supplies and records',()=>{
 const s=adults(5),[a,b,c,d,e]=s.bugs,records=structuredClone(s.records),inventory=structuredClone(s.inventory),coins=s.coins;
 const released=releaseMany(s,[d.id,b.id,d.id]);assert.deepEqual(released.map(b=>b.id),[d.id,b.id]);
 assert.deepEqual(s.bugs.map(b=>b.id),[a.id,c.id,e.id]);assert.deepEqual(s.records,records);assert.deepEqual(s.inventory,inventory);assert.equal(s.coins,coins);
 assert.match(s.log[0].text,/2마리/);assert.equal(validateSave(s),true);
});

test('invalid bulk selection or any fighting member leaves the whole save unchanged',()=>{
 const s=adults(3),[a,b]=s.bugs;
 for(const ids of [[],null,[a.id,'missing'],[a.id,null]]){const before=structuredClone(s);assert.throws(()=>releaseMany(s,ids));assert.deepEqual(s,before);}
 makeOpponent(s,a.id,()=>.25);const before=structuredClone(s);
 assert.throws(()=>releaseMany(s,[b.id,a.id]),/투곤/);assert.deepEqual(s,before);
});

test('bulk release retains founders and descendant parent snapshots in the line history',()=>{
 const s=adults(),[m,f]=s.bugs,line=createLine(s,m.id,f.id,'보존 혈통'),brood=breed(s,m.id,f.id,()=>.25,'basic_mat',line.id);
 const parents=structuredClone(brood.parents),children=structuredClone(brood.children),records=structuredClone(s.records);
 releaseMany(s,[m.id,f.id]);assert.equal(s.bugs.length,0);assert.deepEqual(brood.parents,parents);assert.deepEqual(brood.children,children);assert.deepEqual(s.records,records);
 assert.ok(lineStats(s,line).members.filter(b=>[m.id,f.id].includes(b.id)).every(b=>b.status==='방생'));
 assert.equal(dailySupport(s).total,44);assert.equal(validateSave(s),true);
});
