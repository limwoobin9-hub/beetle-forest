import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CloudSaves,accountStorage} from '../dist/cloud-saves.js';
import {newGame} from '../dist/engine.js';
import {saveWorld,worldKeys} from '../dist/worlds.js';
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k),map};};
function server(){
 const rows=new Map();let fail=false,gate;
 const client={from:()=>({select:()=>({eq:async()=>({data:[...rows.values()],error:fail?{message:'offline'}:null})})}),rpc:async(_name,p)=>{
  if(gate)await gate;if(fail)return {error:{message:'offline'}};
  const row=rows.get(p.p_world);if((row?.revision||0)!==p.p_revision)return {error:{message:'FOREST_CONFLICT'}};
  const revision=p.p_revision+1;rows.set(p.p_world,{world:p.p_world,state:structuredClone(p.p_state),ui:p.p_ui,revision});return {data:revision};
 }};
 return {rows,client,offline:v=>fail=v,gate:v=>gate=v};
}
test('local account namespaces isolate guests and two user identities',()=>{
 const raw=storage(),a=accountStorage(raw,'a'),b=accountStorage(raw,'b'),key=worldKeys('virtual').save;
 raw.setItem(key,'guest');a.setItem(key,'alice');b.setItem(key,'bob');assert.equal(raw.getItem(key),'guest');assert.equal(a.getItem(key),'alice');assert.equal(b.getItem(key),'bob');assert.notEqual(a.key(key),b.key(key));
});
test('cloud restores both independent worlds and persists their revisions',async()=>{
 const s=server(),raw=storage(),cloud=new CloudSaves(s.client,raw,'a');await cloud.load();
 const virtual=newGame(),real=newGame();real.settings.realTime=true;real.day=3;virtual.day=7;
 cloud.queue('real',real,{view:'room'});cloud.queue('virtual',virtual,{view:'book'});assert.equal(await cloud.flush(),true);
 const other=storage(),restored=new CloudSaves(s.client,other,'a');await restored.load();
 assert.equal(JSON.parse(other.getItem(worldKeys('real').save)).day,3);assert.equal(JSON.parse(other.getItem(worldKeys('virtual').save)).day,7);assert.equal(restored.status,'saved');
});
test('a save changed during transmission sends the latest state in order',async()=>{
 const s=server(),raw=storage(),cloud=new CloudSaves(s.client,raw,'a');await cloud.load();let release;
 s.gate(new Promise(resolve=>release=resolve));const state=newGame();cloud.queue('virtual',state,{});const sent=cloud.flush();
 state.day=4;cloud.queue('virtual',state,{});release();assert.equal(await sent,true);assert.equal(s.rows.get('virtual').state.day,4);assert.equal(s.rows.get('virtual').revision,2);cloud.stop();
});
test('offline saves remain pending across reload and retry successfully',async()=>{
 const s=server(),raw=storage(),cloud=new CloudSaves(s.client,raw,'a');await cloud.load();const state=newGame();state.day=9;saveWorld(raw,'virtual',state,{});
 s.offline(true);cloud.queue('virtual',state,{});assert.equal(await cloud.flush(),false);assert.equal(cloud.status,'error');
 s.offline(false);const resumed=new CloudSaves(s.client,raw,'a');await resumed.load();assert.equal(await resumed.flush(),true);assert.equal(s.rows.get('virtual').state.day,9);
});
test('stale device revisions cannot overwrite cloud and recovery preserves the pending record',async()=>{
 const s=server(),raw=storage(),old=new CloudSaves(s.client,raw,'a'),newer=new CloudSaves(s.client,storage(),'a');await old.load();await newer.load();
 const latest=newGame();latest.day=12;newer.queue('virtual',latest,{});await newer.flush();
 const stale=newGame();stale.day=2;saveWorld(raw,'virtual',stale,{});old.queue('virtual',stale,{});assert.equal(await old.flush(),false);assert.equal(old.status,'conflict');assert.equal(s.rows.get('virtual').state.day,12);
 await old.load({discardPending:true});assert.equal(JSON.parse(raw.getItem(worldKeys('virtual').save)).day,12);assert.ok([...raw.map.keys()].some(k=>k.startsWith('recovery-virtual-')));
});
