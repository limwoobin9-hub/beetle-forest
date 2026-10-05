import {validateSave} from './engine.js';
import {SPECIES} from './world.js';
import {canImportLive} from './career.js';
import {WORLDS,worldKeys,loadWorld,saveWorldsTogether} from './worlds.js';

export const EXCHANGE_COOLDOWN=7*24*60*60*1000;
export function exchangeReadyAt(states){return Math.max(0,...WORLDS.map(w=>states[w.id]?.worldExchange?.lastAt||0))+EXCHANGE_COOLDOWN;}
export function exchangeRemaining(states,now=Date.now()){
 const last=Math.max(0,...WORLDS.map(w=>states[w.id]?.worldExchange?.lastAt||0));
 return last?Math.max(0,last+EXCHANGE_COOLDOWN-now):0;
}
export function exchangeCandidates(state){return state.bugs.filter(b=>!(state.fight?.bugId===b.id&&!state.fight.finished));}
export function prepareExchange(storage,now=Date.now()){
 const worlds={},raw={};
 for(const w of WORLDS){
  const key=worldKeys(w.id).save;raw[w.id]=storage.getItem(key);
  if(raw[w.id]){const saved=JSON.parse(raw[w.id]);if(!validateSave(saved)||saved.settings.realTime!==w.realTime)throw new Error(`${w.name}의 저장 기록을 확인해 주세요.`);}
  worlds[w.id]=loadWorld(storage,w.id,now);
 }
 return {worlds,raw};
}
export function exchangeInsects(states,realId,virtualId,now=Date.now()){
 if(!Number.isSafeInteger(now)||now<=0||WORLDS.some(w=>!validateSave(states[w.id])||states[w.id].settings.realTime!==w.realTime))throw new Error('두 숲의 저장 기록을 확인해 주세요.');
 if(exchangeRemaining(states,now))throw new Error('다음 교환까지 현실 시간 7일을 기다려야 해요.');
 const ids={real:realId,virtual:virtualId};
 for(const w of WORLDS){
  if(!exchangeCandidates(states[w.id]).some(b=>b.id===ids[w.id]))throw new Error(`${w.name}에서 교환할 성충 한 마리를 골라 주세요. 투곤 중인 개체는 종료 후 교환할 수 있어요.`);
  const other=states[w.id==='real'?'virtual':'real'],id=ids[w.id];
  const outgoing=states[w.id].bugs.find(b=>b.id===id);
  if(SPECIES[outgoing.species].foreign&&!canImportLive(other))throw new Error('해외종을 받는 숲에서 해외 생체 취급 자격을 먼저 취득하세요.');
  if(other.bugs.some(b=>b.id===id)||(other.memorials||[]).some(m=>m.id===id)||(other.auctions||[]).some(a=>a.status==='active'&&a.asset?.id===id))throw new Error('두 숲에 같은 개체 기록이 있어 교환할 수 없어요.');
 }
 const next=structuredClone(states),original={real:states.real.bugs.find(b=>b.id===realId),virtual:states.virtual.bugs.find(b=>b.id===virtualId)};
 for(const w of WORLDS){
  const from=w.id==='real'?'virtual':'real',source=states[from],dest=next[w.id],bug=structuredClone(original[from]),line=source.lines?.find(l=>l.id===bug.lineage?.lineId);
  bug.worldOrigin={world:from,day:source.day,born:bug.born,at:now,lineName:line?.name||''};
  bug.lineage=null;bug.born=dest.day;
  // Keep remaining breeding restrictions and same-day care/training limits.
  for(const key of ['bredDay','fightDay','trainDay','xp_jelly','xp_clean'])if(Number.isFinite(bug[key]))bug[key]=Math.max(-99,dest.day-(source.day-bug[key]));
  if(bug.parents)bug.parents=bug.parents.map(p=>({...p,lineage:null}));
  dest.bugs=dest.bugs.map(b=>b.id===ids[w.id]?bug:b);
  if(dest.fight?.bugId===ids[w.id])dest.fight=null;
  for(const l of dest.lines||[])for(const b of [...l.founders,...l.records.flatMap(r=>r.offspring||[])])if(b.id===ids[w.id])b.worldTransfer={to:from,at:now};
  if(!dest.discoveries.includes(bug.species))dest.discoveries.push(bug.species);
  const record=bug.species+'-'+bug.sex;dest.records[record]=Math.max(dest.records[record]||0,bug.length);
  dest.worldExchange={lastAt:now};
  dest.log.unshift({day:dest.day,text:`숲 사이 교환 · ${original[w.id].name} 보내고 ${bug.name} 맞이함`});dest.log=dest.log.slice(0,40);
  if(!validateSave(dest))throw new Error('교환 후 저장 기록을 확인하지 못했어요.');
 }
 return next;
}
export function completeExchange(storage,draft,realId,virtualId,now=Date.now()){
 for(const w of WORLDS)if(storage.getItem(worldKeys(w.id).save)!==draft.raw[w.id])throw new Error('두 숲의 기록이 바뀌었어요. 교환 창을 다시 열어 주세요.');
 const fresh=prepareExchange(storage,now),states=Object.fromEntries(WORLDS.map(w=>[w.id,fresh.worlds[w.id].state]));
 const next=exchangeInsects(states,realId,virtualId,now);
 const worlds=Object.fromEntries(WORLDS.map(w=>[w.id,{state:next[w.id],ui:exchangeUI(fresh.worlds[w.id].ui,idsFor(w.id,realId,virtualId))}]));
 saveWorldsTogether(storage,worlds);return worlds;
}
function idsFor(world,real,virtual){return world==='real'?real:virtual;}
export function exchangeUI(ui,outgoing){const next={...ui};for(const key of ['selected','fighterId','maleId','femaleId'])if(next[key]===outgoing)next[key]='';return next;}
