import {OVERSEAS_REGIONS} from './overseas.js';
import {LAND_WIDTH,LAND_HEIGHT,LAND_ROWS} from './world-land.js';
export const MAP_POINTS={
 nepal:[84,28],laos:[102.5,19.5],papua:[146.7,-7.3],peru:[-74,-9],colombia:[-74,5],costa_rica:[-84,10],guiana:[-53,4],arizona:[-111,34],virginia:[-79,37],bolivia:[-66.5,-16],sumatra_highlands:[103.1,-4],cameroon_interior:[13,6],
 sumatra:[100.4,-.5],sulawesi:[121,-2],malaysia:[102,4],india:[78,24],borneo:[114,1],java:[110,-7.4],
 australia:[145,-19],amazon:[-60,-4],philippines:[118.5,10],taiwan:[121,24],japan:[138,36],
 thailand:[100,18],vietnam:[106,21],mexico:[-98,19],ecuador:[-78,-1],cameroon:[12,5],
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const geoPoint=([lon,lat])=>({x:(lon+180)/360,y:(90-lat)/180});
export function mapView(view={}){
 view=view&&typeof view==='object'?view:{};
 const zoom=clamp(Number.isFinite(view.zoom)?view.zoom:1,1,12),margin=.5/zoom;
 return {zoom,x:clamp(Number.isFinite(view.x)?view.x:.5,margin,1-margin),y:clamp(Number.isFinite(view.y)?view.y:.5,margin,1-margin)};
}
export function zoomMap(view,factor,anchor={x:.5,y:.5}){
 const old=mapView(view),zoom=clamp(old.zoom*factor,1,12);
 return mapView({zoom,x:old.x+(anchor.x-.5)*(1/old.zoom-1/zoom),y:old.y+(anchor.y-.5)*(1/old.zoom-1/zoom)});
}
let landCanvas,dispose;
function landAtlas(){
 if(landCanvas)return landCanvas;
 landCanvas=document.createElement('canvas');landCanvas.width=LAND_WIDTH;landCanvas.height=LAND_HEIGHT;
 const ctx=landCanvas.getContext('2d'),raw=atob(LAND_ROWS);let pos=0;
 const next=()=>{const n=raw.charCodeAt(pos)|raw.charCodeAt(pos+1)<<8;pos+=2;return n;};
 ctx.fillStyle='#99b47a';
 for(let y=0;y<LAND_HEIGHT;y++){const count=next();for(let i=0;i<count;i+=2){const start=next(),end=next();ctx.fillRect(start,y,end-start,1);}}
 return landCanvas;
}
export function pixelWorldMap(ui,trip=null){
 const selected=trip?.region||ui.overseasRegion||'sumatra',r=OVERSEAS_REGIONS[selected];
 const pins=Object.keys(MAP_POINTS).map(id=>`<button class="map-pin ${id===selected?'selected':''}" data-action="foreign-region" data-region="${id}" aria-label="${OVERSEAS_REGIONS[id].name} 선택 · ${OVERSEAS_REGIONS[id].cost} 잎사귀" aria-pressed="${id===selected}" ${trip?'disabled':''}><span class="map-dot" aria-hidden="true"></span><span class="map-pin-label">${OVERSEAS_REGIONS[id].name}</span></button>`).join('');
 return `<section class="panel world-map-panel" aria-label="픽셀 세계지도 원정지 선택"><div class="panel-head"><div><h3>원정 세계지도</h3><small>${r.name} · ${r.cost.toLocaleString('ko-KR')} 잎사귀${trip?' · 진행 중인 원정':''}</small></div><div class="map-controls" role="group" aria-label="지도 조작"><button class="btn quiet" data-map-control="out" aria-label="지도 축소">−</button><output class="map-zoom" aria-live="polite">1×</output><button class="btn quiet" data-map-control="in" aria-label="지도 확대">＋</button><button class="btn quiet" data-map-control="reset">세계 전체</button></div></div><div class="world-map-art" tabindex="0" role="group" aria-label="마우스 휠로 확대·축소, 드래그로 이동하는 세계지도"><canvas class="world-map-canvas" width="480" height="240" role="img" aria-label="실제 해안선을 따라 그린 픽셀 세계지도"></canvas>${pins}<span class="map-compass" aria-hidden="true">N<br>↑</span></div><p class="map-caption">휠로 확대·축소 · 드래그로 이동 · 지역 표시로 원정지 선택<span>터치: 두 손가락으로 확대·축소 · 지도 자료: Natural Earth</span></p></section>`;
}
export function bindWorldMap(ui,onSave){
 dispose?.();dispose=null;
 const el=document.querySelector('.world-map-art');if(!el)return;
 const canvas=el.querySelector('canvas'),panel=el.closest('.world-map-panel'),pins=[...el.querySelectorAll('.map-pin')];
 ui.overseasMapView=mapView(ui.overseasMapView);let saveTimer,moved=false,gesture=null;const pointers=new Map();
 const anchor=e=>{const r=el.getBoundingClientRect();return {x:clamp((e.clientX-r.left)/(r.width||720),0,1),y:clamp((e.clientY-r.top)/(r.height||360),0,1)};};
 function draw(){
  const width=Math.max(160,Math.round((el.clientWidth||720)/2));canvas.width=width;canvas.height=Math.round(width/2);
  const {x,y,zoom}=ui.overseasMapView,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  ctx.imageSmoothingEnabled=false;ctx.fillStyle='#91b6ae';ctx.fillRect(0,0,w,h);
  ctx.drawImage(landAtlas(),(x-.5/zoom)*LAND_WIDTH,(y-.5/zoom)*LAND_HEIGHT,LAND_WIDTH/zoom,LAND_HEIGHT/zoom,0,0,w,h);
  ctx.strokeStyle='#658a7340';ctx.lineWidth=1;ctx.beginPath();
  for(let lon=-180;lon<=180;lon+=30){const px=((lon+180)/360-x)*zoom*w+w/2;ctx.moveTo(px,0);ctx.lineTo(px,h);}
  for(let lat=-90;lat<=90;lat+=30){const py=((90-lat)/180-y)*zoom*h+h/2;ctx.moveTo(0,py);ctx.lineTo(w,py);}
  ctx.stroke();
  el.dataset.zoom=zoom.toFixed(3);el.classList.toggle('map-detail',zoom>=3.8);
  panel.querySelector('.map-zoom').textContent=zoom.toFixed(1)+'×';
  for(const pin of pins){const p=geoPoint(MAP_POINTS[pin.dataset.region]),px=(p.x-x)*zoom+.5,py=(p.y-y)*zoom+.5;pin.style.left=px*100+'%';pin.style.top=py*100+'%';pin.hidden=px<0||px>1||py<0||py>1;}
  panel.querySelector('[data-map-control="out"]').disabled=zoom<=1;
  panel.querySelector('[data-map-control="in"]').disabled=zoom>=12;
 }
 function changed(){draw();clearTimeout(saveTimer);saveTimer=setTimeout(onSave,250);}
 el.addEventListener('wheel',e=>{e.preventDefault();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?360:1);ui.overseasMapView=zoomMap(ui.overseasMapView,Math.exp(-clamp(delta,-600,600)*.0025),anchor(e));changed();},{passive:false});
 panel.querySelectorAll('[data-map-control]').forEach(button=>button.addEventListener('click',()=>{ui.overseasMapView=button.dataset.mapControl==='reset'?mapView():zoomMap(ui.overseasMapView,button.dataset.mapControl==='in'?1.5:1/1.5);changed();}));
 el.addEventListener('keydown',e=>{
  if(e.target!==el)return;let v=ui.overseasMapView;
  if(['+','=','-'].includes(e.key))v=zoomMap(v,e.key==='-'?1/1.5:1.5);
  else if(e.key==='Home')v=mapView();
  else if(e.key.startsWith('Arrow'))v=mapView({...v,x:v.x+(e.key==='ArrowLeft'?-.08:e.key==='ArrowRight'?.08:0)/v.zoom,y:v.y+(e.key==='ArrowUp'?-.08:e.key==='ArrowDown'?.08:0)/v.zoom});
  else return;e.preventDefault();ui.overseasMapView=v;changed();
 });
 const measure=()=>{const ps=[...pointers.values()];return ps.length>1?{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2,d:Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)}:{...ps[0],d:0};};
 el.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});el.setPointerCapture?.(e.pointerId);gesture=measure();moved=false;});
 el.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=measure(),r=el.getBoundingClientRect();
  if(!moved&&pointers.size===1&&Math.hypot(next.x-gesture.x,next.y-gesture.y)<4)return;
  moved=true;let v=ui.overseasMapView;
  if(next.d&&gesture.d)v=zoomMap(v,next.d/gesture.d,anchor({clientX:gesture.x,clientY:gesture.y}));
  ui.overseasMapView=mapView({...v,x:v.x-(next.x-gesture.x)/(r.width||720)/v.zoom,y:v.y-(next.y-gesture.y)/(r.height||360)/v.zoom});gesture=next;changed();
 });
 const end=e=>{pointers.delete(e.pointerId);gesture=pointers.size?measure():null;if(moved)onSave();};
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
 el.addEventListener('click',e=>{if(moved){e.preventDefault();e.stopPropagation();moved=false;}},true);
 const resize=typeof ResizeObserver==='function'?new ResizeObserver(draw):null;resize?.observe(el);window.addEventListener('resize',draw);
 dispose=()=>{resize?.disconnect();window.removeEventListener('resize',draw);clearTimeout(saveTimer);};draw();
}
