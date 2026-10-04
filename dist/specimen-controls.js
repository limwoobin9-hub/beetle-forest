import {PARTS} from './specimens.js';

export function bindSpecimenControls({getMemorial,move,put,draft,editDraft,notice,redraw}){
 let drag=null,keyboard=null,skipClick=false;
 const boardPoint=(x,y)=>{const r=document.getElementById('specimen-board')?.getBoundingClientRect();return r&&r.width&&r.height?{x:(x-r.left)/r.width*100,y:(y-r.top)/r.height*100}:null;};
 const finish=(selection,point,target)=>{
  const m=getMemorial();if(!m||m.id!==selection.id)return;
  if(selection.task==='case'){
   const slot=target?.closest('[data-case-slot]');if(!slot||slot.classList.contains('occupied')){notice('완성된 표본을 케이스의 빈 칸으로 옮겨 주세요.');return;}
   put(m.id,slot.dataset.caseId,Number(slot.dataset.caseSlot));return;
  }
  if(!point){notice('작업판 안으로 옮겨 주세요.');return;}
  move(m.id,selection.task,point,{part:selection.part,...draft()});
 };
 const select=el=>{const m=getMemorial();return m&&!el.disabled?{id:m.id,task:el.dataset.specimenTask,part:el.dataset.part}:null;};
 const clearGhost=()=>{document.querySelector('.specimen-drag-ghost')?.remove();document.body.classList.remove('specimen-dragging');};
 document.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-specimen-task]');if(!el||e.button>0)return;
  const selection=select(el);if(!selection)return;
  drag={...selection,startX:e.clientX,startY:e.clientY,pointerId:e.pointerId,moved:false,label:el.textContent||el.getAttribute('aria-label')};keyboard=null;
  el.setPointerCapture?.(e.pointerId);
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||drag.pointerId!==e.pointerId)return;
  if(!drag.moved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6)return;
  drag.moved=true;e.preventDefault();document.body.classList.add('specimen-dragging');
  let ghost=document.querySelector('.specimen-drag-ghost');if(!ghost){ghost=document.createElement('div');ghost.className='specimen-drag-ghost';ghost.setAttribute('aria-hidden','true');ghost.textContent=drag.label;document.body.append(ghost);}ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
  const point=boardPoint(e.clientX,e.clientY);
  if(drag.task==='pose'&&point){const d=PARTS.find(p=>p.key===drag.part),limb=document.querySelector(`[data-limb="${drag.part}"]`),handle=document.querySelector(`[data-specimen-task="pose"][data-part="${drag.part}"]`);if(limb)limb.setAttribute('points',`${d.joint.x},${d.joint.y} ${(d.joint.x+point.x)/2},${(d.joint.y+point.y)/2+3} ${point.x},${point.y}`);if(handle){handle.style.left=point.x+'%';handle.style.top=point.y+'%';}}
  if(drag.task==='case'){if(e.clientY>window.innerHeight-60)window.scrollBy?.(0,12);else if(e.clientY<60)window.scrollBy?.(0,-12);}
 },{passive:false});
 document.addEventListener('pointerup',e=>{
  if(!drag||drag.pointerId!==e.pointerId)return;const selection=drag;drag=null;clearGhost();if(!selection.moved)return;
  const target=document.elementFromPoint?.(e.clientX,e.clientY)||e.target;skipClick=true;setTimeout(()=>skipClick=false,0);
  finish(selection,boardPoint(e.clientX,e.clientY),target);
 });
 document.addEventListener('pointercancel',()=>{if(drag){drag=null;clearGhost();redraw();notice('작업 취소 · 저장된 자세 유지');}});
 document.addEventListener('click',e=>{
  if(skipClick)return;const el=e.target.closest('[data-specimen-task]');if(!el)return;
  keyboard=select(el);if(!keyboard)return;keyboard.point={x:50,y:50};const cursor=document.querySelector('.keyboard-cursor');if(cursor){cursor.hidden=false;cursor.style.left='50%';cursor.style.top='50%';}notice('방향키로 위치를 옮긴 뒤 Enter로 놓으세요. 케이스 보관은 빈 칸으로 Tab 이동 후 Enter를 누르세요.');document.getElementById('specimen-board')?.focus({preventScroll:true});
 });
 document.addEventListener('keydown',e=>{
  if(!keyboard||!getMemorial()||e.target.matches('input,textarea,select'))return;
  if(e.key==='Escape'){keyboard=null;document.querySelector('.keyboard-cursor')?.setAttribute('hidden','');return;}
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(delta){e.preventDefault();const step=e.shiftKey?5:1;keyboard.point={x:Math.max(0,Math.min(100,keyboard.point.x+delta[0]*step)),y:Math.max(0,Math.min(100,keyboard.point.y+delta[1]*step))};const cursor=document.querySelector('.keyboard-cursor');if(cursor){cursor.style.left=keyboard.point.x+'%';cursor.style.top=keyboard.point.y+'%';}}
  if(e.key==='Enter'){e.preventDefault();const selection=keyboard;keyboard=null;document.querySelector('.keyboard-cursor')?.setAttribute('hidden','');finish(selection,selection.point,e.target);}
 });
 document.addEventListener('input',e=>{
  if(!getMemorial())return;
  if(e.target.id==='specimen-collector'||e.target.id==='specimen-caption'){editDraft(e.target.id==='specimen-collector'?'collector':'caption',e.target.value);const preview=document.getElementById('collector-preview');if(preview)preview.textContent=draft().collector||'미기입';}
  if(e.target.id==='pin-height'){const value=Number(e.target.value),label=document.getElementById('pin-height-value'),diagram=document.querySelector('.pin-height-diagram i');if(label)label.textContent=value+'%';if(diagram)diagram.style.top=value+'%';}
 });
 document.addEventListener('change',e=>{if(e.target.id==='pin-height'){const m=getMemorial();if(m)move(m.id,'height',null,{height:Number(e.target.value)});}});
}
