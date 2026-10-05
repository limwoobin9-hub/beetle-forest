import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,validateSave,advanceDay,breed} from '../dist/engine.js';
import {createLine,lineMembers} from '../dist/lines.js';
import {saveWorld,worldKeys,loadWorld,saveWorldsTogether} from '../dist/worlds.js';
import {exchangeInsects,exchangeRemaining,EXCHANGE_COOLDOWN,prepareExchange,completeExchange} from '../dist/world-exchange.js';
const now=Date.parse('2026-10-05T14:00:00+09:00');
function fixture(){
 const real=newGame(now),virtual=newGame(now);real.settings.realTime=true;real.clock.calendar=true;virtual.clock.calendar=true;
 real.day=200;virtual.day=3;
 const a=createBug('king','male',.8,150,'채집',null,1,null,{traits:['king_red_eye']}),b=createBug('flat','female',.6,1,'채집',null,1,null,{traits:['flat_long']});
 a.name='붉은 눈';a.bredDay=199;a.trainDay=200;a.fightDay=200;a.xp_clean=200;a.dietDays=2;a.dietDecay=30;a.favorite=true;a.trainingGrip=8;
 real.bugs.push(a);virtual.bugs.push(b);return {real,virtual};
}
const memory=()=>{const map=new Map();return {map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('exactly one adult each way preserves identity, traits, condition and day-relative restrictions',()=>{
 const s=fixture(),before=structuredClone(s),a=s.real.bugs[0],b=s.virtual.bugs[0],next=exchangeInsects(s,a.id,b.id,now);
 assert.deepEqual(s,before);assert.equal(next.real.bugs[0].id,b.id);assert.equal(next.virtual.bugs[0].id,a.id);
 for(const key of ['name','length','traits','genetic','health','hunger','hygiene','dietDays','dietDecay','trainingGrip','favorite'])assert.deepEqual(next.virtual.bugs[0][key],a[key]);
 assert.equal(next.virtual.bugs[0].bredDay,2);assert.equal(next.virtual.bugs[0].trainDay,3);assert.equal(next.virtual.bugs[0].fightDay,3);assert.equal(next.virtual.bugs[0].xp_clean,3);
 assert.equal(next.virtual.bugs[0].born,3);assert.equal(next.virtual.bugs[0].worldOrigin.born,150);
 assert.equal(next.real.coins,s.real.coins);assert.deepEqual(next.real.inventory,s.real.inventory);assert.equal(next.real.captures,s.real.captures);
 assert.ok(validateSave(next.real)&&validateSave(next.virtual));assert.ok(next.real.discoveries.includes(b.species));
});
test('shared real-time cooldown survives world visits and advancing imaginary time, and expires at seven days',()=>{
 const s=fixture(),n=exchangeInsects(s,s.real.bugs[0].id,s.virtual.bugs[0].id,now);
 advanceDay(n.virtual);assert.equal(exchangeRemaining(n,now),EXCHANGE_COOLDOWN);
 assert.throws(()=>exchangeInsects(n,n.real.bugs[0].id,n.virtual.bugs[0].id,now+EXCHANGE_COOLDOWN-1),/7일/);
 const back=exchangeInsects(n,n.real.bugs[0].id,n.virtual.bugs[0].id,now+EXCHANGE_COOLDOWN);assert.equal(back.real.bugs[0].id,s.real.bugs[0].id);
});
test('one cooldown ledger suffices; bad ledgers fail save validation',()=>{
 const s=fixture();s.real.worldExchange={lastAt:now};assert.equal(exchangeRemaining(s,now),EXCHANGE_COOLDOWN);
 for(const value of [null,{lastAt:-1},{lastAt:NaN},{lastAt:'42'}]){s.real.worldExchange=value;assert.equal(validateSave(s.real),false);}
});
test('line and parent histories stay in origin forest; exchanged founders are labelled',()=>{
 const s=fixture(),f=createBug('king','female',.6,150,'채집',null,1,null,{traits:[]});s.real.bugs.push(f);
 const line=createLine(s.real,s.real.bugs[0].id,f.id,'붉은 눈 라인');
 s.real.bugs[0].bredDay=-99;breed(s.real,s.real.bugs[0].id,f.id,()=>.5);const n=exchangeInsects(s,s.real.bugs[0].id,s.virtual.bugs[0].id,now);
 assert.equal(n.real.broods.length,1);assert.equal(n.real.lines[0].records.length,1);assert.equal(n.virtual.bugs[0].lineage,null);assert.equal(n.virtual.bugs[0].worldOrigin.lineName,line.name);
 assert.match(lineMembers(n.real,n.real.lines[0]).find(b=>b.id===s.real.bugs[0].id).status,/교환/);assert.ok(validateSave(n.real)&&validateSave(n.virtual));
});
test('missing choices, duplicate identities and live fighting cannot exchange; a completed fight clears',()=>{
 const s=fixture(),a=s.real.bugs[0],b=s.virtual.bugs[0];assert.throws(()=>exchangeInsects(s,'',b.id,now));
 s.real.fight={bugId:a.id,finished:false};assert.throws(()=>exchangeInsects(s,a.id,b.id,now));s.real.fight=null;
 s.virtual.bugs[0].id=a.id;assert.throws(()=>exchangeInsects(s,a.id,a.id,now),/同|같은/);
});
test('commit checks both save revisions, persists both worlds and refuses corrupt saves without resetting them',()=>{
 const storage=memory(),s=fixture();for(const w of ['real','virtual'])saveWorld(storage,w,s[w],{selected:s[w].bugs[0].id});
 const draft=prepareExchange(storage,now);s.virtual.coins++;saveWorld(storage,'virtual',s.virtual,{});
 assert.throws(()=>completeExchange(storage,draft,s.real.bugs[0].id,s.virtual.bugs[0].id,now),/바뀌/);
 const fresh=prepareExchange(storage,now),n=completeExchange(storage,fresh,s.real.bugs[0].id,s.virtual.bugs[0].id,now);
 assert.equal(loadWorld(storage,'virtual',now).state.bugs[0].id,s.real.bugs[0].id);assert.equal(n.virtual.ui.selected,undefined);
 storage.setItem(worldKeys('virtual').save,'{"invalid":true}');assert.throws(()=>prepareExchange(storage,now));assert.equal(storage.getItem(worldKeys('virtual').save),'{"invalid":true}');
});
test('failure writing the second world rolls both saves back; interrupted transactions recover before loading',()=>{
 const storage=memory(),s=fixture();for(const w of ['real','virtual'])saveWorld(storage,w,s[w],{});
 const before=new Map(storage.map),n=exchangeInsects(s,s.real.bugs[0].id,s.virtual.bugs[0].id,now),set=storage.setItem;let fail=true;
 storage.setItem=(k,v)=>{if(fail&&k===worldKeys('virtual').save){fail=false;throw new Error('quota');}set(k,v);};
 assert.throws(()=>saveWorldsTogether(storage,{real:{state:n.real,ui:{}},virtual:{state:n.virtual,ui:{}}}),/quota/);assert.deepEqual(storage.map,before);
 const key='little-forest-world-exchange-transaction-v1';set(key,JSON.stringify([...before]));set(worldKeys('real').save,JSON.stringify(n.real));
 assert.equal(loadWorld(storage,'real',now).state.bugs[0].id,s.real.bugs[0].id);assert.deepEqual(storage.map,before);
});
