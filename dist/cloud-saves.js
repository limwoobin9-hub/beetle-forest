import {WORLDS,worldKeys,saveWorldsTogether} from './worlds.js';
import {validateSave} from './engine.js';
export function accountStorage(storage,userId){
 const prefix=`little-forest-account-${userId}:`;
 return {key:key=>prefix+key,getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key)};
}
export class CloudSaves{
 constructor(client,storage,userId,notify=()=>{}){this.client=client;this.storage=storage;this.userId=userId;this.notify=notify;this.pending=new Map();this.revisions=new Map();this.status='loading';this.running=null;this.timer=null;}
 meta(world){return `cloud-${world}-v1`;}
 setStatus(status){this.status=status;this.notify(status);}
 async load({discardPending=false}={}){
  const {data,error}=await this.client.from('beetle_world_saves').select('world,state,ui,revision').eq('user_id',this.userId);
  if(error)throw new Error('계정 기록을 불러오지 못했어요. 연결을 확인하고 다시 로그인해 주세요.');
  const rows=new Map((data||[]).map(row=>[row.world,row]));
  for(const row of rows.values())if(!WORLDS.some(w=>w.id===row.world&&w.realTime===row.state?.settings?.realTime)||!validateSave(row.state))throw new Error('계정의 저장 기록을 확인하지 못했어요.');
  let conflict=false;this.pending.clear();
  for(const world of WORLDS){
   const keys=worldKeys(world.id),row=rows.get(world.id);let meta;
   try{meta=JSON.parse(this.storage.getItem(this.meta(world.id)));}catch{}
   if(meta?.pending&&!discardPending){
    const raw=this.storage.getItem(keys.save),saved=JSON.parse(raw||'null'),ui=JSON.parse(this.storage.getItem(keys.ui)||'{}');
    if(!validateSave(saved))throw new Error('이 기기에 남아 있는 저장 기록을 확인해 주세요.');
    this.revisions.set(world.id,meta.revision||0);this.pending.set(world.id,{state:saved,ui});
    if((row?.revision||0)!==(meta.revision||0))conflict=true;
   }else{
    if(discardPending&&meta?.pending)this.storage.setItem(`recovery-${world.id}-${Date.now()}`,this.storage.getItem(keys.save));
    if(row){this.storage.setItem(keys.save,JSON.stringify(row.state));this.storage.setItem(keys.ui,JSON.stringify(row.ui));}
    else{this.storage.removeItem(keys.save);this.storage.removeItem(keys.ui);}
    this.revisions.set(world.id,row?.revision||0);this.writeMeta(world.id,false);
   }
  }
  this.setStatus(conflict?'conflict':this.pending.size?'pending':'saved');
  if(!conflict&&this.pending.size)this.schedule();
 }
 writeMeta(world,pending){this.storage.setItem(this.meta(world),JSON.stringify({revision:this.revisions.get(world)||0,pending}));}
 queue(world,state,ui){
  this.pending.set(world,{state:structuredClone(state),ui:structuredClone(ui)});this.writeMeta(world,true);
  if(this.status!=='conflict'){this.setStatus('pending');this.schedule();}
 }
 schedule(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),650);}
 async flush(){
  clearTimeout(this.timer);if(this.status==='conflict')return false;
  if(this.running)return this.running;
  this.running=this.send();try{return await this.running;}catch{this.setStatus('error');return false;}finally{this.running=null;}
 }
 async send(){
  while(this.pending.size){
   const [world,payload]=this.pending.entries().next().value;this.setStatus('saving');
   const {data,error}=await this.client.rpc('beetle_save_world',{p_world:world,p_state:payload.state,p_ui:payload.ui,p_revision:this.revisions.get(world)||0});
   if(error){this.setStatus(error.message?.includes('FOREST_CONFLICT')?'conflict':'error');return false;}
   this.revisions.set(world,Number(data));
   if(this.pending.get(world)===payload)this.pending.delete(world);
   this.writeMeta(world,this.pending.has(world));
  }
  this.setStatus('saved');return true;
 }
 async exchange(worlds){
  if(!await this.flush())throw new Error('계정 저장을 마친 뒤 교환할 수 있어요. 저장 상태를 확인해 주세요.');
  this.setStatus('saving');
  let result;
  try{result=await this.client.rpc('beetle_exchange_worlds',{p_real:worlds.real.state,p_real_ui:worlds.real.ui,p_real_revision:this.revisions.get('real')||0,p_virtual:worlds.virtual.state,p_virtual_ui:worlds.virtual.ui,p_virtual_revision:this.revisions.get('virtual')||0});}
  catch{this.setStatus('conflict');throw new Error('교환 결과를 확인하지 못했어요. 계정 기록을 다시 불러와 주세요.');}
  const {data,error}=result;
  if(error){this.setStatus('conflict');throw new Error(error.message?.includes('FOREST_COOLDOWN')?'다음 교환까지 현실 시간 7일을 기다려야 해요. 계정 기록을 다시 불러와 주세요.':error.message?.includes('FOREST_CONFLICT')?'다른 기기의 기록이 바뀌었어요. 계정 기록을 다시 불러와 주세요.':'교환 결과를 확인하지 못했어요. 계정 기록을 다시 불러와 주세요.');}
  for(const w of WORLDS){worlds[w.id].state.worldExchange={lastAt:Number(data.lastAt)};this.revisions.set(w.id,Number(data[w.id]));}
  try{saveWorldsTogether(this.storage,worlds);for(const w of WORLDS)this.writeMeta(w.id,false);}
  catch{try{await this.load({discardPending:true});}catch{this.setStatus('conflict');throw new Error('서버에서 교환했어요. 계정 기록을 다시 불러와 교환 결과를 확인해 주세요.');}}
  this.setStatus('saved');return worlds;
 }
 stop(){clearTimeout(this.timer);}
}
