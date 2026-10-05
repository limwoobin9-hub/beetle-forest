import {OVERSEAS_REGIONS} from './overseas.js';

export const MAP_POINTS={
 sumatra:[100,-1],sulawesi:[121,-2],malaysia:[102,4],india:[78,24],borneo:[114,1],java:[110,-7],
 australia:[145,-19],amazon:[-60,-4],philippines:[119,11],taiwan:[121,24],japan:[138,36],
 thailand:[100,18],vietnam:[108,21],mexico:[-98,19],ecuador:[-78,-1],cameroon:[12,5],
};
// A coarse original pixel atlas. Coastlines are decorative; pins use lon/lat.
const LAND=[
 [[-168,70],[-145,70],[-130,60],[-115,70],[-95,73],[-60,54],[-55,48],[-74,45],[-82,25],[-98,17],[-106,23],[-118,33],[-127,50],[-155,58]],
 [[-98,23],[-90,19],[-84,10],[-77,8],[-81,6],[-88,15]],
 [[-81,11],[-68,10],[-61,6],[-50,0],[-35,-7],[-40,-22],[-52,-33],[-65,-55],[-72,-50],[-74,-25],[-81,-6]],
 [[-52,60],[-42,60],[-20,75],[-30,83],[-50,82],[-62,73]],
 [[-11,36],[-9,44],[-2,50],[9,54],[6,61],[18,71],[32,70],[29,60],[43,68],[80,75],[130,72],[179,66],[170,55],[145,50],[142,42],[131,42],[125,33],[121,22],[112,20],[108,11],[104,1],[98,8],[96,20],[88,22],[79,7],[73,20],[64,25],[53,26],[47,15],[41,14],[35,28],[27,34],[20,40],[15,36],[11,44],[5,43]],
 [[-17,15],[-17,28],[-6,36],[12,37],[31,31],[35,23],[43,12],[50,11],[43,-1],[39,-12],[33,-26],[19,-35],[12,-27],[10,-7],[2,4],[-8,5]],
 [[113,-22],[116,-15],[130,-12],[137,-16],[143,-11],[153,-25],[151,-38],[137,-39],[128,-33],[115,-35]],
 [[94,5],[99,3],[106,-6],[103,-6],[98,-1]],[[106,-6],[114,-7],[115,-9],[106,-8]],
 [[109,6],[117,7],[120,0],[115,-4],[110,-2]],[[120,2],[125,2],[122,-1],[125,-3],[123,-5],[120,-3],[119,0]],
 [[120,18],[123,15],[126,8],[124,6],[122,10]],[[121,25],[122,25],[121,22],[120,22]],
 [[130,31],[136,35],[141,40],[145,44],[143,45],[138,39],[134,34]],
 [[141,-2],[153,-4],[151,-10],[141,-8]],[[47,-13],[50,-16],[48,-25],[45,-24]],
 [[-8,50],[-6,58],[-2,59],[1,52]],[[166,-35],[179,-40],[174,-47],[166,-46]],
];
const SCOPES={world:{name:'세계 전체',bounds:[-180,180,-65,85]},asia:{name:'아시아 확대',bounds:[65,151,-20,51]}};
const W=720,H=432,CELL=8,baseCache=new Map();
function inside(x,y,polygon){let found=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)found=!found;}return found;}
function project(scope,[lon,lat]){const [west,east,south,north]=SCOPES[scope].bounds;return {x:(lon-west)/(east-west)*W,y:(north-lat)/(north-south)*H};}
function atlas(scope){
 if(baseCache.has(scope))return baseCache.get(scope);
 const [west,east,south,north]=SCOPES[scope].bounds,tiles=[];
 for(let y=0;y<H;y+=CELL)for(let x=0;x<W;x+=CELL){const lon=west+(x+CELL/2)/W*(east-west),lat=north-(y+CELL/2)/H*(north-south);if(LAND.some(p=>inside(lon,lat,p))){const edge=!LAND.some(p=>inside(lon+(east-west)*CELL/W,lat,p))||!LAND.some(p=>inside(lon,lat-(north-south)*CELL/H,p));tiles.push(`<rect x="${x}" y="${y}" width="8" height="8" fill="${edge?'#77966e':((x*3+y*7)/8)%11<2?'#b5c88e':'#99b47a'}"/>`);}}
 const svg=`<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><defs><pattern id="map-water" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 0H40V40" fill="none" stroke="#a4c5be" stroke-width="1"/><path d="M8 24h8M24 8h8" fill="none" stroke="#a8c7bc" stroke-width="2"/></pattern></defs><rect width="720" height="432" fill="#91b6ae"/><rect width="720" height="432" fill="url(#map-water)"/>${tiles.join('')}</svg>`;
 baseCache.set(scope,svg);return svg;
}
const LABELS={sumatra:'below',sulawesi:'below',malaysia:'above',india:'above',borneo:'above',java:'below',australia:'below',amazon:'below',philippines:'below',taiwan:'above',japan:'above',thailand:'below',vietnam:'above',mexico:'above',ecuador:'above',cameroon:'below'};
export function pixelWorldMap(ui,trip=null){
 const scope=Object.hasOwn(SCOPES,ui.overseasMapScope)?ui.overseasMapScope:'world',selected=trip?.region||ui.overseasRegion||'sumatra';
 const visible=Object.keys(MAP_POINTS).filter(id=>scope==='asia'?MAP_POINTS[id][0]>=65&&id!=='australia':MAP_POINTS[id][0]<65||id==='australia');
 const pins=visible.map(id=>{const r=OVERSEAS_REGIONS[id],p=project(scope,MAP_POINTS[id]);return `<button class="map-pin ${id===selected?'selected':''} label-${LABELS[id]}" style="left:${p.x/W*100}%;top:${p.y/H*100}%" data-action="foreign-region" data-region="${id}" aria-label="${r.name} 선택 · ${r.cost} 잎사귀" aria-pressed="${id===selected}" ${trip?'disabled':''}><span class="map-dot" aria-hidden="true"></span><span class="map-pin-label">${r.name}</span></button>`;}).join('');
 const asia=project('world',[108,14]);
 return `<section class="panel world-map-panel" aria-label="픽셀 세계지도 원정지 선택"><div class="panel-head"><div><h3>원정 세계지도</h3><small>${trip?'진행 중인 원정지':`${OVERSEAS_REGIONS[selected].name} · ${OVERSEAS_REGIONS[selected].cost.toLocaleString('ko-KR')} 잎사귀 · 편도 ${OVERSEAS_REGIONS[selected].hours}시간`} · 지역 표시를 누르세요</small></div><div class="map-scopes" role="group" aria-label="지도 범위">${Object.entries(SCOPES).map(([id,s])=>`<button class="btn quiet ${id===scope?'active':''}" data-action="foreign-map-scope" data-scope="${id}" aria-pressed="${id===scope}">${s.name}</button>`).join('')}</div></div><div class="world-map-scroll"><div class="world-map-art">${atlas(scope)}${pins}${scope==='world'?`<button class="map-cluster ${MAP_POINTS[selected][0]>=65&&selected!=='australia'?'selected':''}" style="left:${asia.x/W*100}%;top:${asia.y/H*100}%" data-action="foreign-map-scope" data-scope="asia"><span aria-hidden="true">＋</span><strong>아시아 11곳</strong><small>확대해서 선택</small></button><span class="map-ocean pacific">태평양</span><span class="map-ocean atlantic">대서양</span>`:'<span class="map-ocean indian">인도양</span>'}<span class="map-compass" aria-hidden="true">N<br>↑</span></div></div><p class="map-caption">${scope==='world'?'아시아 표시를 누르면 11개 원정지를 확대해서 볼 수 있어요.':'표시를 눌러 원정지를 선택하세요. 세계 전체로 돌아가면 다른 대륙도 볼 수 있어요.'}<span>작은 화면에서는 지도를 좌우로 밀 수 있어요.</span></p></section>`;
}
