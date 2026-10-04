import {newGame,migrateSave,validateSave,syncRealTime,setTimeOptions} from './engine.js';

export const WORLDS=[
  {id:'real',name:'현실의 숲',realTime:true,clock:'실제 24시간마다 하루 진행',description:'접속하지 않은 동안에도 성장·사육 상태·사망 조건이 진행됩니다.'},
  {id:'virtual',name:'상상의 숲',realTime:false,clock:'다음 날 버튼으로 하루 진행',description:'원하는 때에 시간을 넘기며 사육합니다.'}
];
export const LEGACY_SAVE='little-forest-save-v1',LEGACY_UI='little-forest-ui-v1';
const MIGRATED='little-forest-worlds-migrated-v1';
export function getWorld(id){return WORLDS.find(w=>w.id===id);}
export function worldKeys(id){if(!getWorld(id))throw new Error('알 수 없는 세계입니다.');return {save:`little-forest-world-${id}-save-v1`,ui:`little-forest-world-${id}-ui-v1`};}
function parseSave(raw){const state=JSON.parse(raw);if(!validateSave(state))throw new Error('invalid save');return state;}

export function initializeWorlds(storage,now=Date.now()){
  if(storage.getItem(MIGRATED))return null;
  const raw=storage.getItem(LEGACY_SAVE);
  let destination=null;
  if(raw){
    let state;
    try{state=migrateSave(parseSave(raw),now);}catch{storage.setItem(LEGACY_SAVE+'-recovery',raw);}
    if(state){
      destination=state.settings.realTime?'real':'virtual';
      const keys=worldKeys(destination);
      if(!storage.getItem(keys.save)){
        storage.setItem(keys.save,JSON.stringify(state));
        const oldUI=storage.getItem(LEGACY_UI);
        if(oldUI){try{const ui=JSON.parse(oldUI);if(ui&&typeof ui==='object'&&!Array.isArray(ui))storage.setItem(keys.ui,JSON.stringify(ui));}catch{}}
      }
    }
  }
  storage.setItem(MIGRATED,'1');
  return destination;
}

export function loadWorld(storage,id,now=Date.now()){
  const world=getWorld(id),keys=worldKeys(id),raw=storage.getItem(keys.save);
  let state,notice='';
  if(raw){try{state=migrateSave(parseSave(raw),now);}catch{storage.setItem(keys.save+'-recovery',raw);notice='저장 데이터를 읽지 못했어요. 기존 기록은 복구용으로 보관했어요.';}}
  if(!state){state=newGame(now);state.settings.realTime=world.realTime;}
  if(state.settings.realTime!==world.realTime)setTimeOptions(state,{realTime:world.realTime,realGrowth:world.realTime&&state.settings.realGrowth},now);
  const elapsed=syncRealTime(state,now);
  if(elapsed.days)notice=`지난 ${elapsed.days}일 반영${elapsed.events.length?' · 사육일지 확인 가능':''}`;
  let ui={};
  try{const saved=JSON.parse(storage.getItem(keys.ui));if(saved&&typeof saved==='object'&&!Array.isArray(saved))ui=saved;}catch{}
  return {state,ui,notice};
}

export function saveWorld(storage,id,state,ui){
  const world=getWorld(id),keys=worldKeys(id);
  if(!validateSave(state)||state.settings.realTime!==world.realTime)throw new Error('세계의 시간 방식과 저장 기록이 맞지 않습니다.');
  storage.setItem(keys.save,JSON.stringify(state));
  storage.setItem(keys.ui,JSON.stringify(ui));
}

export function worldSummary(storage,id){
  const raw=storage.getItem(worldKeys(id).save);
  if(!raw)return null;
  try{const state=parseSave(raw);return {day:state.day,insects:state.bugs.length,broods:state.broods.length};}catch{return {damaged:true};}
}
