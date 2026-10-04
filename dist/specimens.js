export const RELAX_DAYS=1,DRY_DAYS=3,CASE_SLOTS=6;
export const PIN_POINT={x:57,y:55};
export const PARTS=[
 {key:'lf',name:'왼쪽 앞다리',joint:{x:43,y:44},target:{x:24,y:34}},
 {key:'rf',name:'오른쪽 앞다리',joint:{x:57,y:44},target:{x:76,y:34}},
 {key:'lm',name:'왼쪽 가운데다리',joint:{x:43,y:56},target:{x:21,y:57}},
 {key:'rm',name:'오른쪽 가운데다리',joint:{x:57,y:56},target:{x:79,y:57}},
 {key:'lh',name:'왼쪽 뒷다리',joint:{x:44,y:67},target:{x:27,y:80}},
 {key:'rh',name:'오른쪽 뒷다리',joint:{x:56,y:67},target:{x:73,y:80}},
 {key:'la',name:'왼쪽 더듬이',joint:{x:42,y:36},target:{x:30,y:26}},
 {key:'ra',name:'오른쪽 더듬이',joint:{x:58,y:36},target:{x:70,y:26}}
];
export function newSpecimenWork(){return {phase:'chamber',water:false,platform:false,body:false,lid:false,pin:null,parts:PARTS.map(p=>({key:p.key,tip:{x:p.joint.x+(p.key[0]==='l'?3:-3),y:p.joint.y+3},posed:false,fixed:false,removed:false})),label:null};}
const near=(a,b,r=7)=>a&&Number.isFinite(a.x)&&Number.isFinite(a.y)&&Math.hypot(a.x-b.x,a.y-b.y)<=r;
const fail=message=>{throw new Error(message);};
export function moveSpecimen(m,task,point,day,payload={}){
 const w=m.work;if(!w||m.status==='mounted')fail('작업 중인 개체가 아닙니다.');
 if(w.phase==='chamber'){
  if(task==='water'&&near(point,{x:50,y:76},16))w.water=true;
  else if(task==='platform'&&w.water&&near(point,{x:50,y:55},17))w.platform=true;
  else if(task==='body'&&w.platform&&near(point,{x:50,y:45},15))w.body=true;
  else if(task==='lid'&&w.body&&near(point,{x:50,y:25},18)){w.lid=true;w.phase='relaxing';m.status='relaxing';m.preparedDay=day;m.readyDay=day+RELAX_DAYS;}
  else fail('물받침 → 받침망 → 개체 → 뚜껑 순서로 표시한 곳에 옮겨 주세요.');
 }else if(w.phase==='pinning'){
  if(task==='pin'&&near(point,PIN_POINT,5)){w.pin={...point,height:50};}
  else if(task==='height'&&w.pin&&Number.isFinite(payload.height)&&payload.height>=18&&payload.height<=30){w.pin.height=payload.height;w.phase='posing';}
  else fail('오른쪽 딱지날개의 표시 위치에 핀을 놓고, 핀 머리 아래 여유를 전체 길이의 약 1/4로 맞춰 주세요.');
 }else if(w.phase==='posing'){
  const part=w.parts.find(p=>p.key===payload.part),definition=PARTS.find(p=>p.key===payload.part);
  if(task==='pose'&&part&&!part.fixed&&near(point,definition.target,12)){part.tip={...point};part.posed=true;}
  else if(task==='support'&&part&&part.posed&&!part.fixed&&near(point,{x:part.tip.x+(part.key[0]==='l'?-3:3),y:part.tip.y+2},6)){part.fixed=true;}
  else if(task==='board'&&w.parts.every(p=>p.posed&&p.fixed)&&near(point,{x:50,y:91},12)){w.phase='drying';m.status='drying';m.preparedDay=day;m.readyDay=day+DRY_DAYS;}
  else fail('다리·더듬이를 끌어 자세를 잡고, 각 끝의 바깥쪽에 보조핀을 놓아 주세요. 모두 고정한 뒤 건조 선반으로 옮깁니다.');
 }else if(w.phase==='cleanup'){
  const part=w.parts.find(p=>p.key===payload.part);
  if(task!=='remove-support'||!part?.fixed||!near(point,{x:91,y:91},12))fail('보조핀을 집어 오른쪽 아래 도구함으로 옮겨 주세요. 몸통의 주핀은 남깁니다.');
  part.fixed=false;part.removed=true;if(w.parts.every(p=>p.removed))w.phase='labeling';
 }else if(w.phase==='labeling'){
  if(task!=='label'||!near(point,{x:50,y:91},12)||typeof payload.collector!=='string'||!payload.collector.trim()||payload.collector.trim().length>30||typeof payload.caption!=='string'||payload.caption.length>80)fail('사육자 이름을 적은 라벨을 표본 아래로 옮겨 주세요.');
  w.label={collector:payload.collector.trim(),caption:payload.caption.trim()};w.phase='casing';m.status='casing';m.caption=w.label.caption;
 }else fail('대기 중에는 개체를 움직일 수 없습니다.');
 return m;
}
export function tickSpecimen(m,day){
 if(m.status==='relaxing'&&day>=m.readyDay){m.status='working';m.work.phase='pinning';return '연화 완료 · 핀 고정 가능';}
 if(m.status==='drying'&&day>=m.readyDay){m.status='working';m.work.phase='cleanup';return '건조 완료 · 보조핀 제거 가능';}
 return '';
}
export function validSpecimenWork(w){
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100;
 if(!w||!['chamber','relaxing','pinning','posing','drying','cleanup','labeling','casing','done'].includes(w.phase)||['water','platform','body','lid'].some(k=>typeof w[k]!=='boolean')||!Array.isArray(w.parts)||w.parts.length!==PARTS.length)return false;
 if(w.parts.some((p,i)=>p?.key!==PARTS[i].key||!point(p.tip)||['posed','fixed','removed'].some(k=>typeof p[k]!=='boolean')||p.fixed&&!p.posed||p.removed&&p.fixed))return false;
 if(w.pin!==null&&(!point(w.pin)||!near(w.pin,PIN_POINT,5)||!Number.isFinite(w.pin.height)||w.pin.height<18||w.pin.height>50))return false;
 if(w.label!==null&&(!w.label||typeof w.label.collector!=='string'||!w.label.collector.trim()||w.label.collector.length>30||typeof w.label.caption!=='string'||w.label.caption.length>80))return false;
 if(w.platform&&!w.water||w.body&&!w.platform||w.lid&&!w.body)return false;
 if(w.phase!=='chamber'&&!w.lid)return false;
 if(['posing','drying','cleanup','labeling','casing','done'].includes(w.phase)&&(!w.pin||w.pin.height>30))return false;
 if(['drying','cleanup','labeling','casing','done'].includes(w.phase)&&w.parts.some(p=>!p.posed))return false;
 if(w.phase==='drying'&&w.parts.some(p=>!p.fixed))return false;
 if(['labeling','casing','done'].includes(w.phase)&&w.parts.some(p=>!p.removed))return false;
 if(['casing','done'].includes(w.phase)&&!w.label)return false;
 return true;
}
