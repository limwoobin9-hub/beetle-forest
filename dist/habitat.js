// Per-insect behaviour, advanced only while its room is visible.
const lives=new Map();
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function seedOf(id){let seed=2166136261;for(const ch of id)seed=Math.imul(seed^ch.charCodeAt(0),16777619);return seed>>>0;}
function random(life){life.seed^=life.seed<<13;life.seed^=life.seed>>>17;life.seed^=life.seed<<5;return (life.seed>>>0)/4294967296;}
export function habitatState(bug){
 if(!bug)return null;
 if(!lives.has(bug.id))lives.set(bug.id,{seed:seedOf(bug.id)||1,x:190,y:206,face:1,mode:'rest',timer:1,goal:null,alpha:1,lastHunger:bug.hunger,lastClean:bug.hygiene,lastTime:null});
 return lives.get(bug.id);
}
function goal(life,kind){life.mode='walk';life.goal={kind,x:kind==='eat'?(life.feedX||235):kind==='hide'?111:155+random(life)*79,y:kind==='hide'?199:kind==='eat'?206:198+random(life)*10};}
export function stepHabitat(bug,time){
 const l=habitatState(bug);if(!l)return null;
 l.feedX=269-(.3+bug.length/90)*31;
 const dt=l.lastTime===null?0:clamp((time-l.lastTime)/1000,0,.12);l.lastTime=time;
 if(bug.hunger>l.lastHunger+10)goal(l,'eat');
 else if(bug.hygiene>l.lastClean+10&&l.mode==='hide'){l.mode='emerge';l.timer=2.5;}
 l.lastHunger=bug.hunger;l.lastClean=bug.hygiene;
 if(l.mode==='walk'){
  const dx=l.goal.x-l.x,dy=l.goal.y-l.y,d=Math.hypot(dx,dy),speed=9+bug.health*.055;
  if(d<1.5){l.mode=l.goal.kind;l.timer=l.mode==='eat'?7+random(l)*5:l.mode==='hide'?12+random(l)*12:4+random(l)*6;l.goal=null;}
  else{l.face=dx>=0?1:-1;const step=Math.min(d,speed*dt);l.x+=dx/d*step;l.y+=dy/d*step;}
 }else{
  l.timer-=dt;
  if(l.mode==='hide')l.alpha=Math.max(0,l.alpha-dt/1.7);
  else if(l.mode==='emerge')l.alpha=Math.min(1,l.alpha+dt/2);
  else l.alpha=1;
  if(l.mode==='eat')l.face=1;
  if(l.timer<=0){
   if(l.mode==='hide'){l.mode='emerge';l.timer=2.5;}
   else if(l.mode==='emerge')goal(l,'rest');
   else{const roll=random(l);goal(l,bug.hunger<45||roll<.26?'eat':bug.health<45||bug.hygiene<40||roll<.62?'hide':'rest');}
  }
 }
 return l;
}
export function habitatLabel(l){return !l?'':({rest:'휴식',eat:'젤리 섭취',hide:'은신',emerge:'나오는 중',walk:l.goal?.kind==='eat'?'젤리로 이동':l.goal?.kind==='hide'?'은신처로 이동':'이동'})[l.mode];}
