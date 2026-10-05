// Keep the original six species and extend the same integer-pixel style.
// Photo references are documented; no source photographs ship with the game.
import {stepHabitat} from './habitat.js';
import {drawDorsal,drawLateral,PIXEL_ANATOMY} from './beetle-pixels.js';
const sprites = new Map();
const urls = new Map();
const backgrounds = new Map();
function pen(c){return (x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};}
function poly(c,points,color){
  // Rasterise the hand-drawn contour without antialiasing.
  const minX=Math.floor(Math.min(...points.map(p=>p[0]))),maxX=Math.ceil(Math.max(...points.map(p=>p[0])));
  const minY=Math.floor(Math.min(...points.map(p=>p[1]))),maxY=Math.ceil(Math.max(...points.map(p=>p[1])));
  c.fillStyle=color;
  for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){
    const px=x+.5,py=y+.5;let inside=false;
    for(let i=0,j=points.length-1;i<points.length;j=i++){
      const a=points[i],b=points[j];if(((a[1]>py)!==(b[1]>py))&&(px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0]))inside=!inside;
    }
    if(inside)c.fillRect(x,y,1,1);
  }
}
function line(c,points,color,width=1){const p=pen(c);for(let i=1;i<points.length;i++){let [x0,y0]=points[i-1].map(Math.round);const [x1,y1]=points[i].map(Math.round);let dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;while(true){p(x0,y0,width,width,color);if(x0===x1&&y0===y1)break;let e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}}}
function oval(c,x,y,w,h,color){const p=pen(c);for(let j=0;j<h;j++){const extent=Math.sqrt(Math.max(0,1-((j+.5-h/2)/(h/2))**2))*w/2;const left=Math.ceil(w/2-extent-.5),right=Math.floor(w/2+extent-.5);if(right>=left)p(x+left,y+j,right-left+1,1,color);}}
export function bugSprite(species='king',sex='male',traits=[]){
  const key=species+sex+'-'+[...traits].sort().join(',');if(sprites.has(key))return sprites.get(key);
  if(!['king','flat','rhino','redleg','dauria','twospot','saw','little','stag'].includes(species)){const cvs=document.createElement('canvas');cvs.width=48;cvs.height=72;drawDorsal(cvs.getContext('2d'),species,sex,traits,{pen,poly,line,oval});sprites.set(key,cvs);return cvs;}
  if(['saw','little','stag'].includes(species)){const cvs=additionalBugSprite(species,sex,traits);sprites.set(key,cvs);return cvs;}
  if(['redleg','dauria','twospot'].includes(species)){const cvs=rareBugSprite(species,sex,traits);paintTraits(cvs,species,sex,traits);sprites.set(key,cvs);return cvs;}
  const cvs=document.createElement('canvas');cvs.width=48;cvs.height=72;const c=cvs.getContext('2d'),p=pen(c);
  const rhino=species==='rhino',flat=species==='flat';
  const outline=rhino?'#251e23':'#172525',base=rhino?'#62433e':flat?'#354342':'#354548',light=rhino?'#a07456':flat?'#718076':'#758b83',shine=rhino?'#c19c6a':'#a8baa0';
  // Six jointed legs and clubbed antennae.
  const legColor=rhino?'#453333':'#2a3938';
  const legs=[[[17,33],[10,30],[5,22],[3,21]],[[17,44],[9,42],[5,45],[2,42]],[[18,55],[10,58],[7,65],[3,66]]];
  for(const l of legs){line(c,l,outline,2);line(c,l.map(([x,y])=>[47-x,y]),outline,2);line(c,l,legColor);line(c,l.map(([x,y])=>[47-x,y]),legColor);}
  line(c,[[16,25],[11,22],[8,22],[7,19]],outline,2);line(c,[[31,25],[36,22],[39,22],[40,19]],outline,2);p(5,18,4,3,light);p(39,18,4,3,light);
  if(rhino){
    oval(c,13,38,23,28,outline);oval(c,15,39,19,24,base);oval(c,16,39,10,19,'#815744');oval(c,18,41,4,13,light);p(19,43,2,8,shine);p(24,39,2,25,outline);p(26,42,2,18,'#755346');
    poly(c,[[12,30],[15,24],[32,24],[36,31],[34,41],[14,41]],outline);poly(c,[[15,30],[18,26],[30,26],[33,31],[31,39],[16,38]],base);p(17,28,4,8,light);p(21,28,7,2,'#8e6250');
    oval(c,16,20,16,12,outline);oval(c,18,21,12,9,base);p(17,25,2,2,shine);p(29,25,2,2,shine);
    if(sex==='male'){
      poly(c,[[21,28],[20,20],[21,14],[20,10],[17,8],[15,5],[15,2],[19,5],[23,8],[25,7],[29,2],[32,1],[31,6],[28,10],[27,15],[27,21],[26,28]],outline);
      poly(c,[[22,26],[22,17],[23,11],[21,8],[19,7],[18,5],[23,10],[26,9],[29,5],[28,9],[25,13],[25,25]],light);p(23,13,1,9,shine);
      poly(c,[[18,33],[17,29],[19,24],[21,23],[21,32]],outline);p(19,27,1,4,light);
    }else{p(19,22,9,2,light);p(21,20,5,1,shine);}
  }else{
    poly(c,[[15,39],[32,39],[36,45],[35,59],[31,65],[23,67],[16,64],[12,57],[12,45]],outline);
    poly(c,[[16,40],[31,40],[33,45],[32,58],[29,62],[24,64],[24,40]],base);
    poly(c,[[16,40],[23,40],[23,64],[18,61],[15,56],[15,45]],'#47595a');
    p(17,43,3,12,light);p(18,44,1,8,shine);p(27,44,2,13,light);p(23,40,1,26,outline);p(16,58,2,3,'#60756a');p(29,58,1,2,'#63796f');
    poly(c,[[12,30],[15,27],[32,27],[36,31],[34,40],[13,40]],outline);poly(c,[[15,31],[18,29],[30,29],[33,32],[31,38],[15,37]],base);p(17,30,10,2,light);p(15,32,3,4,light);p(17,31,3,1,shine);
    const hx=flat?13:14,hw=flat?22:20;
    poly(c,[[hx,22],[hx+3,18],[hx+hw-3,18],[hx+hw,22],[hx+hw-1,31],[hx+1,31]],outline);p(hx+3,21,hw-6,8,base);p(hx+4,20,hw-8,2,light);p(hx+3,23,3,4,light);p(hx+2,26,2,2,shine);p(hx+hw-4,26,2,2,shine);
    if(sex==='male'){
      const mandible=traits.includes('flat_short')?[[13,23],[11,19],[12,13],[15,9],[17,10],[15,14],[19,14],[19,17],[16,18],[18,21]]:traits.includes('flat_toothless')?[[13,23],[10,18],[9,9],[11,4],[15,1],[16,2],[14,7],[14,13],[16,18],[18,21]]:traits.includes('flat_long')?[[13,23],[9,18],[7,9],[9,3],[13,0],[15,0],[12,6],[12,12],[17,11],[18,13],[14,15],[17,21]]:traits.includes('king_curved')?[[16,22],[11,18],[9,11],[10,6],[13,2],[18,0],[19,2],[15,5],[13,9],[14,13],[18,12],[19,14],[16,16],[20,20]]:flat?[[13,23],[10,18],[9,9],[11,4],[15,1],[16,2],[14,7],[15,12],[19,11],[19,14],[16,16],[18,21]]:[[16,22],[11,17],[11,9],[13,3],[16,0],[18,0],[16,5],[15,10],[18,9],[19,11],[16,14],[20,19]];
      poly(c,mandible,outline);poly(c,mandible.map(([x,y])=>[47-x,y]),outline);
      const highlight=traits.includes('flat_short')?[[13,21],[13,16],[15,12],[14,17],[16,20]]:traits.includes('flat_long')?[[12,21],[10,17],[9,9],[11,5],[10,11],[12,17],[15,20]]:traits.includes('king_curved')?[[16,20],[12,17],[11,11],[12,7],[16,3],[13,9],[13,14],[18,19]]:flat?[[13,21],[12,17],[11,10],[12,6],[14,4],[13,10],[14,16],[16,20]]:[[16,20],[13,16],[13,9],[15,5],[14,12],[15,15],[18,19]];
      poly(c,highlight,light);poly(c,highlight.map(([x,y])=>[47-x,y]),light);if(!traits.includes('flat_short')){p(13,11,1,3,shine);p(33,11,1,3,shine);}
    }else{
      poly(c,[[17,21],[17,15],[20,11],[21,12],[20,17],[22,20]],outline);poly(c,[[30,21],[30,15],[27,11],[26,12],[27,17],[25,20]],outline);p(18,16,1,4,light);p(29,16,1,4,light);
    }
  }
  paintTraits(cvs,species,sex,traits);sprites.set(key,cvs);return cvs;
}
// New species share the original silhouettes, jointed legs and broad highlights.
function additionalBugSprite(species,sex,traits=[]){
 const cvs=document.createElement('canvas');cvs.width=48;cvs.height=72;
 const c=cvs.getContext('2d'),p=pen(c),male=sex==='male',little=species==='little',stag=species==='stag';
 const dark=species==='saw'?'#2c2522':little?'#172525':'#30271e';
 const base=species==='saw'?(traits.includes('saw_red')?'#a14732':'#74543b'):little?'#354548':'#72523b';
 const shade=species==='saw'?(traits.includes('saw_red')?'#bd6040':'#8f6840'):little?'#47595a':'#8f6840';
 const light=species==='saw'?(traits.includes('saw_red')?'#e49a65':'#ac8050'):little?'#758b83':'#ac8254';
 const shine=species==='saw'?'#e5b781':little?'#a8baa0':traits.includes('stag_gold')?'#f0d486':'#c7a56d';
 const legs=[[[17,33],[10,30],[5,22],[3,21]],[[17,44],[9,42],[5,45],[2,42]],[[18,55],[10,58],[7,65],[3,66]]];
 for(const l of legs){line(c,l,dark,2);line(c,l.map(([x,y])=>[47-x,y]),dark,2);line(c,l,shade);line(c,l.map(([x,y])=>[47-x,y]),shade);}
 const bx=little?14:12,bw=little?20:24;
 poly(c,[[bx+3,39],[bx+bw-4,39],[bx+bw,45],[bx+bw-1,59],[bx+bw-5,65],[23,67],[bx+4,64],[bx,57],[bx,45]],dark);
 poly(c,[[bx+4,40],[bx+bw-5,40],[bx+bw-3,45],[bx+bw-4,58],[bx+bw-7,62],[24,64],[24,40]],base);
 poly(c,[[bx+4,40],[23,40],[23,64],[bx+6,61],[bx+3,56],[bx+3,45]],shade);
 p(bx+5,43,3,12,light);p(bx+6,44,1,8,shine);p(bx+bw-9,44,2,13,light);p(23,40,1,26,dark);
 poly(c,[[little?14:12,30],[16,27],[31,27],[little?33:35,31],[32,40],[15,40]],dark);
 poly(c,[[16,31],[18,29],[29,29],[32,32],[30,38],[16,37]],base);p(18,30,9,2,light);p(16,32,3,4,light);p(18,31,3,1,shine);
 const hx=male?(stag?10:little?16:14):17,hw=male?(stag?28:little?16:20):14;
 const head=stag&&male?[[10,20],[14,18],[33,18],[37,20],[39,26],[35,31],[31,29],[16,29],[12,31],[8,26]]:[[hx,22],[hx+3,18],[hx+hw-3,18],[hx+hw,22],[hx+hw-1,31],[hx+1,31]];
 poly(c,head,dark);p(hx+3,21,hw-6,8,base);p(hx+4,20,hw-8,2,light);p(hx+3,23,3,4,light);
 if(stag&&male){p(10,25,4,4,shade);p(33,25,4,4,shade);}
 line(c,[[hx+2,25],[11,22],[8,22],[7,19]],dark,2);line(c,[[47-hx-2,25],[36,22],[39,22],[40,19]],dark,2);p(5,18,4,3,light);p(39,18,4,3,light);
 if(male){
  const jaw=species==='saw'?(traits.includes('saw_curved')?[[16,22],[10,19],[6,13],[6,7],[10,2],[15,0],[18,1],[15,4],[11,7],[11,10],[15,9],[16,11],[12,13],[16,13],[17,15],[14,17],[18,19],[20,21]]:[[16,22],[11,18],[8,12],[8,6],[11,2],[15,0],[16,2],[12,6],[12,10],[15,9],[16,11],[13,13],[17,13],[18,15],[15,17],[19,20]]):little?(traits.includes('little_slender')?[[18,22],[14,18],[12,10],[13,3],[16,0],[17,0],[15,6],[15,12],[18,11],[19,13],[16,15],[18,19],[21,22]]:[[18,22],[15,18],[14,10],[16,4],[18,2],[19,3],[17,9],[17,13],[20,12],[21,14],[18,16],[20,21]]):[[13,22],[9,18],[8,10],[10,4],[13,0],[15,1],[12,6],[16,5],[17,7],[12,9],[16,10],[17,12],[13,14],[17,14],[18,16],[15,18],[20,22]];
  if(traits.includes('stag_fork'))jaw.splice(6,0,[18,2],[20,4]);
  poly(c,jaw,dark);poly(c,jaw.map(([x,y])=>[47-x,y]),dark);
  const edge=species==='saw'?[[15,20],[11,16],[10,10],[11,5],[13,3]]:little?[[18,20],[16,16],[16,10],[17,6]]:[[13,20],[11,16],[10,10],[12,5]];
  line(c,edge,light);line(c,edge.map(([x,y])=>[47-x,y]),light);p(edge[2][0],edge[2][1],1,3,shine);p(47-edge[2][0],edge[2][1],1,3,shine);
 }else{poly(c,[[18,21],[18,15],[20,11],[21,12],[20,17],[22,20]],dark);poly(c,[[29,21],[29,15],[27,11],[26,12],[27,17],[25,20]],dark);p(19,16,1,4,light);p(28,16,1,4,light);}
 if(little&&!male)for(const x of [18,20,27,29])for(let y=43;y<61;y+=4)p(x,y,1,2,shade);
 if(stag)for(let i=0;i<22;i++){const x=16+(i*7)%16,y=30+(i*5)%31;if(x!==23&&x!==24)p(x,y,1,1,traits.includes('stag_gold')?shine:light);}
 if(traits.includes('little_white_eye')){p(hx+1,26,2,2,'#f8f5da');p(hx+hw-3,26,2,2,'#f8f5da');}
 return cvs;
}
function rareBugSprite(species,sex,traits=[]){
 const cvs=document.createElement('canvas');cvs.width=48;cvs.height=72;const c=cvs.getContext('2d'),p=pen(c),spot=species==='twospot',dauria=species==='dauria';
 const dark='#2c2522',base=spot?'#bf8242':dauria?'#74543b':'#343733',light=spot?'#e8b564':dauria?'#ac8050':'#768174';
 const legs=[[[16,34],[9,31],[5,24]],[[15,44],[7,44],[3,48]],[[17,56],[10,60],[6,67]]];
 for(const l of legs){line(c,l,dark,2);line(c,l.map(([x,y])=>[47-x,y]),dark,2);if(species==='redleg'){line(c,l.slice(0,2),'#a34a2b',2);line(c,l.slice(0,2).map(([x,y])=>[47-x,y]),'#a34a2b',2);}}
 oval(c,12,37,24,30,dark);oval(c,14,38,20,27,base);p(17,42,3,15,light);p(18,43,1,8,'#ead8a1');p(27,42,2,15,light);p(23,38,2,27,dark);
 poly(c,[[13,30],[16,27],[31,27],[35,31],[33,39],[14,39]],dark);p(16,29,16,8,base);p(18,29,11,2,light);
 if(spot){p(16,33,4,4,dark);p(28,33,4,4,dark);p(23,28,2,11,dark);}
 poly(c,[[15,22],[18,19],[29,19],[33,22],[32,30],[16,30]],dark);p(18,21,11,7,base);p(19,21,9,2,light);
 line(c,[[17,25],[10,22],[7,17]],dark,1);line(c,[[30,25],[37,22],[40,17]],dark,1);p(5,16,3,2,light);p(39,16,3,2,light);
 if(sex==='male'){
  const jaw=traits.includes('dauria_fork')?[[17,23],[12,19],[11,12],[13,7],[17,3],[19,4],[16,8],[20,7],[21,10],[16,13],[20,21]]:spot?[[16,23],[10,19],[8,11],[10,5],[14,1],[16,2],[13,7],[12,12],[16,11],[17,14],[13,17],[19,21]]:dauria?[[17,23],[12,19],[12,12],[15,7],[18,6],[17,10],[20,9],[20,12],[16,14],[20,21]]:[[17,23],[14,20],[14,14],[17,10],[19,11],[17,16],[20,19],[20,22]];
  poly(c,jaw,dark);poly(c,jaw.map(([x,y])=>[47-x,y]),dark);line(c,spot?[[13,20],[10,12],[12,7]]:dauria?[[16,21],[14,15],[16,11]]:[[17,20],[16,16]],light,1);line(c,(spot?[[13,20],[10,12],[12,7]]:dauria?[[16,21],[14,15],[16,11]]:[[17,20],[16,16]]).map(([x,y])=>[47-x,y]),light,1);
 }else{poly(c,[[17,23],[18,15],[21,14],[20,19],[22,21]],dark);poly(c,[[30,23],[29,15],[26,14],[27,19],[25,21]],dark);}
 return cvs;
}

function paintTraits(cvs,species,sex,traits,side=false){
 if(!traits.length)return;
 const c=cvs.getContext('2d'),p=pen(c),colors={};
 const set=(pairs)=>Object.assign(colors,Object.fromEntries(pairs.map(([a,b])=>[a.slice(1),b])));
 if(traits.includes('rhino_red'))set([['#62433e','#96362e'],['#815744','#b94934'],['#a07456','#e07b50'],['#c19c6a','#f0b275'],['#755346','#a23d31'],['#8e6250','#bd5140'],['#5c342b','#943429'],['#956345','#cf6343'],['#b18757','#ef9c60'],['#775342','#a34b35']]);
 if(traits.includes('redleg_crimson'))set([['#a34a2b','#df4032'],['#a44e31','#df4032']]);
 if(traits.includes('dauria_amber'))set([['#74543b','#ab7139'],['#72523b','#ab7139'],['#ac8050','#e0b468'],['#ac8254','#e0b468'],['#8f6840','#ba874a']]);
 if(traits.includes('twospot_gold'))set([['#bf8242','#d6a841'],['#be8241','#d6a841'],['#e8b564','#f7db86'],['#e3b66b','#f7db86']]);
 const image=c.getImageData(0,0,cvs.width,cvs.height),d=image.data;
 for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const key=[d[i],d[i+1],d[i+2]].map(n=>n.toString(16).padStart(2,'0')).join('');const target=colors[key];if(target){d[i]=parseInt(target.slice(1,3),16);d[i+1]=parseInt(target.slice(3,5),16);d[i+2]=parseInt(target.slice(5,7),16);}}
 if(Object.keys(colors).length)c.putImageData(image,0,0);
 if(traits.includes('redleg_red_thorax')){if(side){p(42,24,9,5,'#954232');p(43,24,5,1,'#d18054');}else{p(16,30,16,7,'#954232');p(18,30,10,2,'#d18054');}}
 if(traits.includes('twospot_large_spots')){if(side)p(42,25,7,5,'#2c2522');else{p(15,32,6,6,'#2c2522');p(27,32,6,6,'#2c2522');}}
 const eye=traits.some(id=>id.endsWith('_white_eye'))?'#f8f5da':traits.some(id=>id.endsWith('_red_eye'))?'#f04e52':traits.includes('king_pink_eye')?'#ffa7cd':null;
 if(eye){if(side){p(63,25,2,2,'#201e22');p(64,25,1,1,eye);}else{const y=species==='rhino'?25:26;p(16,y,3,3,'#201e22');p(29,y,3,3,'#201e22');p(17,y,2,2,eye);p(29,y,2,2,eye);}}
}

const ICONS={
 leaf:['....gg.....','...ggGg....','..ggGgg....','.ggGGgg....','.ggGgg.....','..gg.......','...b.......','..b........'],
 home:['.....gg....','....gggg...','...ggGGgg..','..ggGGGGgg.','.gggggggggg','..bYYYYYb..','..bYYbbYb..','..bYYbbYb..','..bbbbbbb..'],
 forest:['....g......','...ggg.....','..ggGgg....','.gggGGgg...','..ggGgg....','.gggGGgg...','ggggGGggg..','...bbb.....','...bbb.....'],
 breed:['....www....','...wYYww...','..wYYYwww..','..wYYYwww..','..wYYwwww..','...wwwww...','....www....','...........','..gg..gg...','...gggg....'],
 battle:['.Y......Y..','..Y....Y...','...Y..Y....','....YY.....','....YY.....','...YbbY....','..Y....Y...','.b......b..'],
 book:['.bbbbbbbbb.','.bYYbYYYYb.','.bYYbYbbYb.','.bYYbYYYYb.','.bYYbYbbYb.','.bYYbYYYYb.','.bbbbbbbbb.','....b......'],
 jelly:['...rrrrr...','..rrrrrrr..','..rRRRRRr..','..rRRRRRr..','.bbbbbbbbb.','.bwwwwwYYb.','.bYYYYYYYb.','..bbbbbbb..'],
 mat:['...bbbbb...','..bYYYYYb..','.bYYbbYYYb.','.bYYYYYYYb.','.bYgggYYYb.','.bYYgYYYYb.','.bYYYYYYYb.','..bbbbbbb..'],
 sun:['.....Y.....','..Y..Y..Y..','...YYYYY...','.YYYYYYYYY.','...YYYYY...','..Y..Y..Y..','.....Y.....'],
 moon:['.....BB....','...BBB.....','..BBBB.....','..BBBB.....','..BBBBB..B.','...BBBBBB..','.....BBB...'],
 help:['..gggggg...','.gYYYYYYg..','.gYYYggYg..','....ggg....','....g......','...........','....g......'],
 next:['..BBBBBB...','.BwwwwwwB..','.BwBBwwwB..','.BwBwwwwB..','.BwwBBBBB..','.BwwwwwwB..','..BBBBBB...'],
 trophy:['..YYYYYYY..','.bYYYYYYYb.','.bYYYYYYYb.','..bYYYYYb..','...YYYYY...','....YYY....','.....Y.....','...bbbbb...'],
 shop:['.rrrrrrrrr.','.rRrRrRrRr.','.rrrrrrrrr.','..bYYYYYb..','..bYbYYbb..','..bYbYYbb..','..bbbbbbb..'],
 sound:['.....b.....','...bbb.....','.bbbbbb..b.','.bbbbbb.Bb.','.bbbbbb..b.','...bbb.....','.....b.....'],
 bug:['..b....b...','..bb..bb...','...bbbb....','..bGbbGb...','..bbbbbb...','.bggggggb..','b.bggggb.b.','.bggggggb..','..bggggb...','...bbbb....'],
};
const PAL={g:'#547a47',G:'#8eae63',b:'#3f513a',Y:'#e9c57d',w:'#fff9dd',r:'#99554a',R:'#ce8060',B:'#789bac'};
export function icon(name){const rows=ICONS[name]||ICONS.bug,cvs=document.createElement('canvas');cvs.width=12;cvs.height=12;const c=cvs.getContext('2d');rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(PAL[v]){c.fillStyle=PAL[v];c.fillRect(x,y,1,1);}}));return cvs.toDataURL();}
export function spriteURL(species,sex,traits=[]){const key=species+sex+'-'+[...traits].sort().join(',');if(!urls.has(key))urls.set(key,bugSprite(species,sex,traits).toDataURL());return urls.get(key);}
export function specimenBodyURL(species,sex,traits=[]){
 const key='specimen-body-'+species+sex+'-'+[...traits].sort().join(',');if(urls.has(key))return urls.get(key);
 const canvas=document.createElement('canvas');canvas.width=48;canvas.height=72;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(bugSprite(species,sex,traits),0,0);
 const a=PIXEL_ANATOMY[species],hy=sex==='male'?(a.maleHeadY||(species==='rhino'||a.horn?22:['little','redleg','dauria'].includes(species)?20:18)):17;
 for(let y=0;y<72;y++){
  const width=y<hy+10?(sex==='male'?Math.max(a.head,species==='stag'?32:0):a.femaleHead):y<hy+20?a.thorax:sex==='female'&&species==='saw'?26:a.body;
  const left=y<hy?5:Math.floor(24-width/2),right=y<hy?43:Math.ceil(24+width/2);
  c.clearRect(0,y,left,1);c.clearRect(right,y,48-right,1);if(y>=69)c.clearRect(0,y,48,1);
 }
 const url=canvas.toDataURL();urls.set(key,url);return url;
}
function cloud(c,x,y,color){const p=pen(c);p(x,y+4,40,5,color);p(x+6,y,21,9,color);p(x+26,y+2,9,7,color);}
function leafCluster(c,x,y,w,h,light='#648a47',shade='#43673b'){
  poly(c,[[x+w*.2,y],[x+w*.7,y],[x+w*.7,y+3],[x+w*.9,y+3],[x+w*.9,y+8],[x+w,y+8],[x+w,y+h*.7],[x+w*.85,y+h*.7],[x+w*.85,y+h],[x+w*.15,y+h],[x+w*.15,y+h*.8],[x,y+h*.8],[x,y+h*.3],[x+w*.2,y+h*.3]],shade);
  poly(c,[[x+w*.24,y+3],[x+w*.6,y+2],[x+w*.6,y+5],[x+w*.85,y+5],[x+w*.9,y+h*.5],[x+w*.7,y+h*.6],[x+w*.7,y+h*.82],[x+w*.15,y+h*.72],[x+w*.13,y+h*.4],[x+w*.24,y+h*.4]],light);
  const p=pen(c);for(let i=0;i<12;i++){const xx=x+7+(i*17)%Math.max(8,w-16),yy=y+5+(i*7)%Math.max(4,h-12);p(xx,yy,3,1,'#ffffff16');}
}
function forestBackdrop(c,w,h,deep=false,grove=false){
  const p=pen(c),sky=deep?'#547487':grove?'#e5bb78':'#a9cfac';p(0,0,w,h,sky);
  if(deep){oval(c,368,27,22,22,'#e4e5b9');oval(c,374,22,20,21,sky);for(let i=0;i<20;i++)p((i*67+20)%w,(i*23+9)%95,1,1,'#dbe5ce');}else{oval(c,374,28,28,28,'#f6da8c');cloud(c,31,20,'#e2e8c0');cloud(c,252,32,'#e2e8c0');}
  const bg=deep?'#456b61':grove?'#9d9e58':'#7fa365';
  for(let i=0;i<11;i++){const x=i*49-20;poly(c,[[x,142],[x+5,75+(i*13)%39],[x+15,62+(i*13)%39],[x+35,73+(i*13)%39],[x+49,143]],bg);p(x+24,115,4,40,bg);}
  p(0,140,w,h-140,deep?'#3d5e48':grove?'#9da663':'#a4b978');p(0,162,w,4,deep?'#476c49':'#b7c58a');
  poly(c,[[208,153],[259,153],[370,h],[69,h]],deep?'#738273':grove?'#dbc48a':'#d4ca94');
  for(let i=0;i<80;i++){const x=(i*47+11)%w,y=168+(i*31)%(h-176);if(x<100||x>370||y<205)p(x,y,2,2,i%4===0?'#d0cf8d':deep?'#577749':'#799957');}
}
function trunk(c,x,y,width,height,deep=false){const p=pen(c);const b=deep?'#3b4440':'#705c40';poly(c,[[x+5,y],[x+width-5,y],[x+width-7,y+height-11],[x+width+11,y+height],[x-7,y+height],[x+7,y+height-12]],b);p(x+9,y,Math.max(2,width*.27),height-9,deep?'#52594b':'#92724c');p(x+width-9,y+4,3,height-12,deep?'#303d35':'#594b37');for(let i=0;i<6;i++)p(x+12+(i*5)%(width-15),y+17+i*18,2,7,'#b093592e');}
function jelly(c,x,y){const p=pen(c);p(x,y+5,20,6,'#d1d2aa');p(x+2,y+10,16,4,'#869d7b');p(x+3,y+2,14,7,'#a95d47');p(x+5,y,10,2,'#c9895b');p(x+5,y+3,5,2,'#e7b779');p(x,y+8,20,2,'#efe8c6');}
function log(c,x,y,w,h){const p=pen(c);p(x+3,y,w-6,h,'#785b3e');p(x,y+3,w,h-6,'#8c6e46');p(x+5,y+2,w-10,3,'#b68c50');for(let i=0;i<3;i++)p(x+8,y+7+i*5,w-16,1,'#584c37');oval(c,x+w-12,y+2,12,h-4,'#d7b97b');oval(c,x+w-10,y+5,7,h-10,'#aa854b');p(x+w-8,y+7,2,h-14,'#e8c987');}
function plant(c,x,y){const p=pen(c);p(x+9,y,2,27,'#537e47');poly(c,[[x+9,y+11],[x,y+6],[x+1,y+1],[x+8,y+4],[x+11,y+12]],'#759c53');poly(c,[[x+10,y+18],[x+21,y+10],[x+25,y+11],[x+20,y+19],[x+11,y+23]],'#92b565');p(x+5,y+25,14,4,'#b68258');p(x+7,y+29,10,11,'#966548');p(x+8,y+29,3,9,'#c79665');}
function roomWindow(c,environment){
 const p=pen(c),period=environment.period||'day',weather=environment.weather;
 const night=period==='night',evening=period==='evening';
 const sky=night?'#263950':evening?'#c99378':period==='morning'?'#c5d8cb':'#b8d5c1';
 const gloomy=['rain','storm','fog'].includes(weather);
 p(18,12,143,127,'#809877');p(21,15,137,121,'#e9e1b2');p(25,19,129,113,night?'#435450':evening?'#b7b081':'#b8d5b0');
 p(25,19,129,60,gloomy?(night?'#273342':'#92a6a4'):sky);
 if(night){
  if(!gloomy&&weather!=='cloud'&&weather!=='snow'){for(const [x,y] of [[34,27],[70,42],[100,25],[145,40],[53,57]])p(x,y,1,1,'#d7dfd4');oval(c,124,30,13,13,'#d7dcc5');oval(c,120,27,12,12,sky);}
 }else if(!gloomy&&weather!=='snow'){oval(c,period==='morning'?43:evening?126:118,period==='morning'?54:evening?60:30,16,16,evening?'#e3ac71':'#f2d787');}
 if(weather==='cloud'||gloomy||weather==='snow'){cloud(c,39,35,night?'#455660':gloomy?'#b0beb8':'#e8ead0');cloud(c,97,45,night?'#394a58':'#c0ccc3');}
 else if(!night)cloud(c,68,35,'#e8ead0');
 for(let i=0;i<5;i++){trunk(c,31+i*27,75,7,53);leafCluster(c,23+i*27,65+(i%2)*6,36,37,night?'#536b56':evening?'#8b985e':'#83a367',night?'#354e44':'#638951');}
 p(25,119,129,13,night?'#4b6552':'#9bb879');
 if(weather==='snow'){for(let i=0;i<5;i++)p(31+i*27,67+(i%2)*6,20,2,'#e7eadd');p(25,126,129,5,'#d8e1d6');}
 if(weather==='fog'){p(25,67,129,4,'#dbe2cc68');p(25,99,129,5,'#dbe2cc88');}
 p(86,19,4,113,'#e9e1b2');p(25,76,129,4,'#e9e1b2');p(13,136,153,6,'#8d7954');p(17,136,145,2,'#baa373');
}
function roomBackground(c,environment={period:'day',weather:null}){
  c.imageSmoothingEnabled=false;const p=pen(c);
  p(0,0,480,276,'#dfd9b5');for(let x=0;x<480;x+=32){p(x,0,1,207,'#cccaa5');p(x+2,0,1,207,'#eae6c6');}
  p(0,205,480,71,'#b8a777');p(0,205,480,4,'#978a62');for(let y=217;y<276;y+=22){p(0,y,480,1,'#a2936c');for(let x=(y%2)*30;x<480;x+=80)p(x,y,1,21,'#a2936c');}
  roomWindow(c,environment);
  // Books, spare jelly and a hanging botanical print.
  p(310,25,125,6,'#765c42');p(318,31,4,7,'#997b52');p(425,31,4,7,'#997b52');
  ['#81935f','#af8662','#748c86','#c6aa70'].forEach((color,i)=>{p(318+i*13,3+i%2*3,11,22-i%2*3,color);p(321+i*13,7+i%2*3,2,14,'#e0d6a5');});jelly(c,384,11);jelly(c,409,11);
  p(350,54,61,62,'#8b7853');p(353,57,55,56,'#f2e8c6');line(c,[[379,103],[380,70]],'#729059',2);poly(c,[[379,86],[367,77],[367,72],[377,76],[381,87]],'#93ad70');poly(c,[[380,93],[395,82],[396,77],[385,81],[379,94]],'#72985d');p(365,106,31,1,'#c6c599');
  // Solid wooden bench and carefully pixelled terrarium.
  p(51,226,381,13,'#826744');p(47,224,389,7,'#bb9660');p(59,239,12,37,'#6d5a3f');p(412,239,12,37,'#6d5a3f');p(63,239,4,37,'#a38353');p(416,239,4,37,'#a38353');
  p(64,91,266,9,'#3c5b44');p(68,85,258,7,'#65835a');p(71,86,252,2,'#90a36f');for(let x=76;x<324;x+=10)p(x,91,4,4,'#82966b');
  p(64,100,266,123,'#74916f');p(69,103,256,114,'#cedbb4');p(72,106,250,95,'#b9cf9e');p(72,106,250,40,'#c9dab1');
  // Substrate visible through the glass.
  poly(c,[[72,191],[116,187],[163,192],[212,185],[269,188],[322,184],[322,217],[72,217]],'#765c3e');
  for(let i=0;i<100;i++)p(74+(i*41)%244,194+(i*13)%20,2+(i%2),1,i%3===0?'#aa8b56':i%3===1?'#c2a267':'#594f35');
  log(c,89,164,65,26);plant(c,287,141);jelly(c,259,191);p(263,200,11,1,'#a9b09a');
  // Glazing, edges, shadows. Kept restrained to preserve the insect outline.
  p(69,104,3,113,'#e0e8c6');p(322,104,3,113,'#96b18b');p(75,110,2,48,'#e0e8c6');p(80,110,1,17,'#e0e8c6');p(64,219,266,5,'#47664b');p(70,219,254,2,'#7f9b6c');
  p(357,203,38,21,'#9a7952');p(359,201,34,5,'#c3a16e');p(365,209,22,2,'#d8be88');p(367,214,18,2,'#bc9f71');plant(c,399,175);
  const tint=({morning:'#e6c99112',evening:'#954d3428',night:'#12243c65'})[environment.period];if(tint)p(0,0,480,276,tint);
  if(environment.period==='night'){
   // A small desk lamp leaves the terrarium readable at night.
   p(450,157,3,65,'#796c50');p(438,220,25,4,'#9c8860');poly(c,[[438,156],[462,156],[458,143],[442,143]],'#dab77a');p(443,157,14,2,'#f6dd9d');
  }
}
function forestBackground(c,location='oak'){
  c.imageSmoothingEnabled=false;const deep=['deep','valley','island','saplane','hollow'].includes(location),grove=['grove','orchard'].includes(location),p=pen(c);forestBackdrop(c,480,276,deep,grove);
  if(['mountain','ridge'].includes(location)){poly(c,[[0,145],[65,46],[132,127],[227,39],[320,125],[404,63],[480,145]],'#698f8a');p(0,145,480,27,'#799765');if(location==='ridge'){cloud(c,120,68,'#d1ded1');cloud(c,332,83,'#c2d4ca');}}
  const colors=deep?['#3f6857','#2d5148']:grove?['#8b994b','#677d3f']:['#658e4a','#3e6f3c'];
  [[66,45,45,153],[237,18,47,150],[386,46,42,151]].forEach(([x,y,w,h],i)=>{
    trunk(c,x,y,w,h,deep);line(c,[[x+13,y+36],[x-10,y+16],[x-33,y+17]],deep?'#485045':'#795f40',8);line(c,[[x+w-12,y+31],[x+w+15,y+7],[x+w+40,y+11]],deep?'#485045':'#795f40',7);
    leafCluster(c,x-54,y-26,145,64,colors[0],colors[1]);leafCluster(c,x-24,y-43,87,61,colors[0],colors[1]);
    oval(c,x+15,y+93,10,15,'#3b3d2e');p(x+17,y+95,3,7,deep?'#74835c':'#c9a361');p(x+16,y+107,3,3,'#d3b671');

  });
  leafCluster(c,-15,222,85,40,colors[0],colors[1]);leafCluster(c,411,227,82,45,colors[0],colors[1]);
  log(c,328,227,56,22);p(324,222,12,8,'#c77947');p(327,230,5,7,'#e6d7a5');p(438,216,9,8,'#b88454');p(441,224,3,8,'#e6d7a5');
  if(location==='valley'){poly(c,[[40,214],[76,206],[146,219],[186,276],[81,276]],'#779ca0');for(let i=0;i<8;i++)p(55+i*11,230+i*5,18,2,'#b0c8bd');log(c,162,199,74,25);}
  if(location==='island'){leafCluster(c,2,7,115,95,'#497950','#315b49');leafCluster(c,356,3,127,100,'#497950','#315b49');p(0,253,480,23,'#b6ac72');for(let i=0;i<12;i++)p(12+i*41,260+i%4*3,8,1,'#d1c68a');}
  if(location==='riverside'){
   poly(c,[[0,179],[95,183],[128,210],[111,276],[0,276]],'#668e9a');for(let i=0;i<15;i++)p(5+(i*17)%80,191+(i*11)%80,21,2,'#bdd7ce');
   for(let i=0;i<10;i++)line(c,[[43+i*9,51],[39+i*9,98],[31+i*9,124]],i%2?'#7e9e57':'#547e47',2);p(111,229,24,5,'#a9a078');
  }
  if(location==='coppice'){for(const x of [30,160,320,448]){trunk(c,x,99,14,110);leafCluster(c,x-20,75,56,47,'#7f9b54','#526f42');}log(c,164,211,57,17);log(c,248,225,41,15);}
  if(location==='hollow'){trunk(c,214,38,70,169,true);oval(c,231,113,35,50,'#1c322a');oval(c,238,117,21,43,'#122820');line(c,[[232,117],[228,132],[230,155]],'#a28658',2);log(c,153,216,84,22);}
  if(location==='saplane'){for(const [x,y] of [[91,145],[259,126],[402,147]]){oval(c,x,y,10,20,'#b38645');p(x+3,y+3,3,12,'#e3bd6e');p(x+4,y+20,2,8,'#bb8846');}for(let i=0;i<8;i++)p(193+i*14,242+i%3*5,5,2,'#b2bf6b');}
  if(location==='orchard'){for(const [x,y] of [[48,84],[100,74],[248,53],[281,67],[394,91],[427,78]]){oval(c,x,y,7,7,'#c47a4c');p(x+2,y,2,2,'#f2b369');}p(127,221,26,17,'#9c7746');p(129,225,22,2,'#d1a361');p(136,217,8,6,'#b9a04b');log(c,288,217,53,16);}
}
export function drawBrood(c,stage,species='king'){
  c.imageSmoothingEnabled=false;const p=pen(c);p(0,0,90,90,'#dce6bd');p(15,15,59,8,'#63815c');p(19,12,51,4,'#91a77b');p(18,23,53,52,'#bfd0a4');p(18,61,53,14,'#8c6d47');for(let i=0;i<20;i++)p(20+(i*13)%49,62+(i*7)%12,2,1,'#c2a06a');p(15,75,59,4,'#65835b');p(18,23,2,51,'#eef1d1');p(69,23,2,51,'#9cb78d');
  if(stage==='알'){[[32,48],[49,52],[39,60]].forEach(([x,y])=>{oval(c,x,y,7,9,'#f4e8ba');p(x+2,y+2,2,2,'#fff5dd');});}
  else if(['1령','2령','3령'].includes(stage)){c.drawImage(larvaSprite(species,Number(stage[0])),13,16);
  }else{
    oval(c,32,28,25,38,'#af8a4c');oval(c,35,29,18,35,'#d5af64');p(43,33,2,28,'#a98449');p(36,40,15,2,'#b69351');line(c,[[36,38],[30,33],[31,27]],'#a98246',2);line(c,[[51,38],[58,32],[56,26]],'#a98246',2);p(38,55,4,7,'#ecd18a');
  }
}
function battleBackground(c){
  c.imageSmoothingEnabled=false;const p=pen(c);forestBackdrop(c,480,276,false,false);
  leafCluster(c,-35,4,152,80,'#5b824a','#44643d');leafCluster(c,380,4,139,82,'#5b824a','#44643d');
  oval(c,63,217,354,35,'#5f714757');
  poly(c,[[59,184],[84,159],[401,159],[426,185],[424,225],[63,225]],'#73593c');p(67,181,350,43,'#92734a');p(70,183,342,3,'#ad8b53');for(let i=0;i<4;i++)p(73,190+i*8,337,1,'#7c623e');
  oval(c,65,145,350,63,'#d2ba7b');oval(c,73,149,334,51,'#b29960');oval(c,91,151,299,44,'#dfc891');oval(c,98,153,285,39,'#d2ba7b');oval(c,117,157,247,28,'#b79b60');oval(c,123,159,235,24,'#d6bd7d');oval(c,213,163,56,16,'#b6985b');
  for(let i=0;i<9;i++)p(85+(i*29)%311,167+(i*7)%22,1,2,'#baa16b');
  // Little flags and an officiating forest friend.
  p(38,197,2,32,'#705e41');p(40,197,20,13,'#a75f4c');p(440,197,2,32,'#705e41');p(421,197,19,13,'#708fa0');
  p(233,111,13,20,'#797b4c');p(230,106,20,8,'#dabf7c');p(236,111,7,8,'#e7cb90');p(236,123,8,5,'#eadfbd');p(228,120,5,2,'#e7cb90');p(247,120,5,2,'#e7cb90');
}

// Separate lateral anatomy: low elytra, pronotum, head, mandibles/horn,
// three near and three far jointed legs. These are not rotated dorsal sprites.
export function sideSprite(species='king',sex='male',frame=0,traits=[]){
 const key=`side-${species}-${sex}-${frame%2}-${[...traits].sort().join(',')}`;if(sprites.has(key))return sprites.get(key);
 if(PIXEL_ANATOMY[species]?.foreign||['saw','little','stag'].includes(species)){const cvs=document.createElement('canvas');cvs.width=88;cvs.height=48;drawLateral(cvs.getContext('2d'),species,sex,frame,traits,{pen,poly,line,oval});sprites.set(key,cvs);return cvs;}
 const cvs=document.createElement('canvas');cvs.width=88;cvs.height=48;const c=cvs.getContext('2d'),p=pen(c);
 const rhino=species==='rhino',flat=species==='flat',rare=['redleg','dauria','twospot'].includes(species),dark=rhino?'#271b1c':'#172021',base=rhino?'#5c342b':species==='twospot'?'#be8241':species==='dauria'?'#72523b':'#303d3c',lit=rhino?'#956345':species==='twospot'?'#e3b66b':species==='dauria'?'#ac8254':'#64766e';
 const step=frame%2?2:-2;
 // Far legs, visible beneath the body.
 for(const path of [[[18,31],[14,36],[9-step,42]],[[32,31],[30,38],[35+step,43]],[[47,29],[52,35],[57-step,42]]])line(c,path,'#58604d',1);
 if(rhino){
  poly(c,[[9,29],[11,21],[17,17],[30,16],[39,19],[44,25],[42,32],[33,36],[18,35]],dark);
  poly(c,[[11,27],[14,21],[22,18],[31,19],[39,23],[40,30],[31,33],[17,32]],base);
  poly(c,[[15,22],[22,19],[31,20],[37,23],[30,23],[21,22],[15,25]],lit);p(20,20,8,1,'#b18757');
  poly(c,[[39,22],[44,17],[52,18],[59,24],[56,32],[42,32]],dark);poly(c,[[43,22],[46,19],[51,20],[56,25],[53,29],[43,29]],base);p(46,20,6,2,lit);
  poly(c,[[55,24],[60,22],[67,24],[69,28],[65,32],[56,31]],dark);p(58,24,6,4,base);p(63,26,2,1,'#b29468');
  if(sex==='male'){
   poly(c,[[62,27],[64,22],[67,17],[71,11],[72,6],[70,3],[71,1],[75,5],[77,4],[79,1],[81,1],[80,6],[77,10],[75,17],[71,22],[69,28]],dark);
   line(c,[[66,25],[69,18],[73,12],[75,8],[74,4]],lit,2);line(c,[[75,8],[79,4]],lit,1);
   poly(c,[[48,21],[48,17],[51,12],[54,11],[54,14],[52,19],[52,23]],dark);p(51,15,1,5,lit);
  }
  line(c,[[67,29],[71,30],[72,32]],dark,1);
 }else if(rare){
  poly(c,[[9,29],[13,23],[23,21],[35,23],[41,27],[39,33],[18,35],[11,32]],dark);poly(c,[[12,28],[16,24],[25,23],[34,25],[37,28],[34,31],[18,32]],base);line(c,[[16,25],[24,24],[33,26]],lit,2);
  poly(c,[[37,25],[41,22],[51,22],[55,26],[52,31],[39,32]],dark);p(41,24,10,5,base);p(43,23,6,1,lit);if(species==='twospot')p(43,26,4,3,dark);
  poly(c,[[52,25],[57,22],[64,24],[66,28],[62,31],[53,29]],dark);p(55,25,7,3,base);p(57,24,4,1,lit);
  line(c,[[60,24],[62,19],[67,18]],dark);p(66,17,2,2,lit);
  if(sex==='male'){
   const jaw=traits.includes('dauria_fork')?[[63,25],[67,21],[72,13],[76,10],[78,12],[75,16],[80,14],[80,17],[74,22],[68,27],[63,28]]:species==='twospot'?[[63,25],[69,23],[78,18],[83,13],[86,14],[84,19],[78,25],[70,29],[63,28]]:species==='dauria'?[[63,25],[67,21],[72,15],[76,13],[78,15],[74,18],[78,18],[77,21],[70,26],[63,28]]:[[63,25],[68,23],[73,20],[75,21],[72,25],[67,28],[63,28]];
   poly(c,jaw,dark);line(c,[[65,25],[70,23],[species==='twospot'?81:73,species==='twospot'?17:20]],lit);
  }else{poly(c,[[63,25],[69,24],[72,26],[67,29],[63,28]],dark);}
 }else{
  // Elongated, relatively flat abdomen for Dorcus.
  poly(c,[[8,29],[12,23],[20,21],[34,21],[40,24],[41,31],[36,34],[17,35],[10,32]],dark);
  poly(c,[[11,28],[15,24],[24,23],[34,23],[38,25],[38,30],[32,32],[18,33]],base);
  line(c,[[14,25],[24,23],[34,24]],lit,2);p(17,25,10,1,'#83988b');line(c,[[14,29],[34,29]],'#43534e');
  poly(c,[[38,25],[41,21],[50,21],[55,24],[54,31],[40,32]],dark);poly(c,[[41,25],[44,23],[49,23],[52,25],[51,29],[41,29]],base);p(43,23,7,1,lit);
  // Flat species head only slightly taller than its pronotum.
  poly(c,[[52,24],[55,flat?20:22],[62,flat?20:22],[66,24],[65,30],[53,30]],dark);p(55,24,8,4,base);p(57,22,5,2,lit);p(63,25,1,1,'#abb7a0');
  line(c,[[60,23],[62,18],[66,17],[68,18]],dark,1);p(67,17,2,2,lit);
  if(sex==='male'){
   const jaws=traits.includes('flat_short')?[[64,24],[69,22],[75,21],[77,23],[74,26],[68,28],[65,28]]:traits.includes('flat_long')?[[64,24],[69,21],[79,15],[85,13],[87,15],[85,20],[79,24],[71,28],[65,28]]:traits.includes('king_curved')?[[64,24],[69,20],[75,15],[80,13],[84,14],[85,17],[81,20],[77,20],[76,24],[71,27],[65,28]]:flat?[[64,24],[69,22],[76,18],[82,17],[85,19],[82,23],[77,25],[73,28],[65,28]]:[[64,24],[68,22],[75,20],[81,16],[84,16],[83,20],[78,25],[73,28],[65,28]];
   poly(c,jaws,dark);line(c,traits.includes('flat_short')?[[66,24],[71,23],[75,23]]:traits.includes('flat_long')?[[66,24],[72,21],[80,16],[85,15]]:traits.includes('king_curved')?[[66,24],[70,20],[77,16],[81,16]]:[[67,24],[73,22],[79,20],[82,18]],lit,1);if(!traits.includes('flat_toothless')&&!traits.includes('flat_short'))p(76,24,2,2,dark);
   line(c,traits.includes('flat_short')?[[64,28],[70,29],[76,26]]:[[64,28],[74,29],[80,26],[84,22]],'#263330',2);
  }else{poly(c,[[64,26],[69,24],[73,25],[71,28],[66,30]],dark);p(67,26,3,1,lit);}
 }
 // Near legs remain on the substrate, with two alternating gait frames.
 for(const path of [[[18,31],[18+step,37],[11+step,43],[7+step,44]],[[35,31],[37-step,37],[31-step,43],[27-step,44]],[[51,29],[57+step,35],[61+step,43],[66+step,44]]]){line(c,path,dark,2);line(c,path,rhino?'#775342':species==='dauria'?'#8f6840':'#52615a',1);if(species==='redleg')line(c,path.slice(0,2),'#a44e31',2);}
 paintTraits(cvs,species,sex,traits,true);sprites.set(key,cvs);return cvs;
}
export function larvaSprite(species='king',instar=3){
 const key=`larva-${species}-${instar}`;if(sprites.has(key))return sprites.get(key);
 const cvs=document.createElement('canvas');cvs.width=64;cvs.height=64;const c=cvs.getContext('2d'),p=pen(c),rhino=species==='rhino';
 const size=instar===1?.48:instar===2?.73:1;
 const points=[[20,25],[24,18],[33,14],[43,18],[49,26],[50,36],[46,45],[38,51],[29,50],[25,43]];
 const pt=([x,y])=>[Math.round(32+(x-32)*size),Math.round(33+(y-33)*size)];
 const thick=(rhino?12:10)*size;
 // Join the white body into one continuous silhouette. Folds sit on the
 // surface instead of outlining each segment as a separate round bead.
 const body=(border)=>{
  for(let i=0;i<points.length-1;i++)for(let j=0;j<=12;j++){
   const t=j/12,[ax,ay]=points[i],[bx,by]=points[i+1],progress=i+t;
   const [x,y]=pt([ax+(bx-ax)*t,ay+(by-ay)*t]);
   const r=Math.max(3,Math.round(thick*(progress<2?.75:progress>6?1.18:1.03)));
   oval(c,x-r/2-border,y-r/2-border,r+border*2,r+border*2,border?'#aaa58e':progress>6.7?'#c9c7b0':'#f0ebd7');
  }
 };
 body(1);body(0);
 for(let i=1;i<9;i++){
  const [x,y]=pt(points[i]),[ax,ay]=points[Math.max(0,i-1)],[bx,by]=points[Math.min(9,i+1)];
  const length=Math.hypot(bx-ax,by-ay),nx=(by-ay)/length,ny=-(bx-ax)/length;
  const outer=[Math.round(x+nx*thick*.45),Math.round(y+ny*thick*.45)];
  const fold=[Math.round(x+nx*thick*.18),Math.round(y+ny*thick*.18)];
  line(c,[outer,fold],'#b9b39a');
  p(outer[0]-2,outer[1]-2,Math.max(1,Math.round(size*3)),1,'#fff9e7');
  p(x-Math.round(nx*thick*.32),y-Math.round(ny*thick*.32),1,1,rhino?'#9c814d':'#bd975b');
 }
 if(instar>=2){const [x,y]=pt([30,47]);oval(c,x-3*size,y-2*size,8*size,7*size,rhino?'#929984':'#b2b69d');p(x-1,y-1,Math.round(3*size),Math.round(2*size),'#d4d0b8');}
 const [hx,hy]=pt([17,30]),hr=Math.max(4,Math.round((rhino?11:10)*size));
 oval(c,hx-hr/2,hy-hr/2,hr+1,hr+1,rhino?'#572524':'#8d491c');oval(c,hx-hr/2+1,hy-hr/2+1,hr-1,hr-1,rhino?'#8d3930':species==='flat'?'#ba742f':'#d38232');
 p(hx-2,hy-hr/2+2,Math.max(2,Math.round(hr*.45)),1,rhino?'#b66543':'#f0b168');
 // Two dark mandibles, short antennae, and three thoracic leg pairs.
 line(c,[[hx-hr*.27,hy+hr*.12],[hx-hr*.32,hy+hr*.5],[hx-1,hy+hr*.6]],'#251a18',Math.max(1,Math.round(size*2)));line(c,[[hx+hr*.24,hy+hr*.12],[hx+hr*.3,hy+hr*.5],[hx+1,hy+hr*.6]],'#251a18',Math.max(1,Math.round(size*2)));
 for(let i=0;i<3;i++){const [x,y]=pt([22+i*4,25-i*3]);line(c,[[x,y],[x+2,y+4],[x+5,y+5]],rhino?'#b86d37':'#a76f35',1);}
 if(instar===3)for(let i=0;i<7;i++){const [x,y]=pt(points[i+2]);p(x+Math.round(thick/2)+1,y-2,1,2,'#b2a684');}
 sprites.set(key,cvs);return cvs;
}
function cachedBackground(key,draw){if(!backgrounds.has(key)){const cvs=document.createElement('canvas');cvs.width=480;cvs.height=276;draw(cvs.getContext('2d'));backgrounds.set(key,cvs);}return backgrounds.get(key);}
function drawSide(c,b,x,ground,time,face=1,scale=null){
 if(!b)return;const sz=scale??(.3+b.length/90),frame=Math.floor(time/170)%2;const s=sideSprite(b.species,b.sex,frame,b.traits);
 c.save();c.translate(Math.round(x),Math.round(ground));c.scale(face*sz,sz);c.drawImage(s,-44,-44);c.restore();
}
export function drawRoom(c,b,time=0,environment={period:'day',weather:null}){
 c.imageSmoothingEnabled=false;c.drawImage(cachedBackground(`room-${environment.period}-${environment.weather||'unknown'}`,ctx=>roomBackground(ctx,environment)),0,0);
 if(['rain','snow','storm'].includes(environment.weather)){
  c.save();c.beginPath();c.moveTo(25,19);c.lineTo(154,19);c.lineTo(154,84);c.lineTo(64,84);c.lineTo(64,132);c.lineTo(25,132);c.closePath();c.clip();
  const snow=environment.weather==='snow',p=pen(c);
  for(let i=0;i<(snow?18:28);i++){
   const x=25+(i*37+Math.floor(time/(snow?170:45)))%129,y=19+(i*29+Math.floor(time/(snow?75:13)))%113;
   if(snow)p(x,y,i%3===0?2:1,2,'#e4ecdd');else line(c,[[x,y],[x-2,y+5]],environment.period==='night'?'#728f9a':'#6b919c',1);
  }
  c.restore();
 }
 const life=stepHabitat(b,time);if(!life)return;
 c.save();c.beginPath();c.rect(72,106,250,111);c.clip();c.globalAlpha=life.alpha;
 const eating=life.mode==='eat',bob=eating?Math.floor(time/380)%2:0;
 drawSide(c,b,life.x,life.y+bob,life.mode==='walk'?time:0,life.face);c.restore();
 if(life.x<157){log(c,89,164,65,26);}
 if(eating){const p=pen(c);p(262,194+bob,2,1,'#e7bd75');}
 jelly(c,259,191);
}
export function drawBattle(c,player,rival,time=0,fight=null){
 c.imageSmoothingEnabled=false;c.drawImage(cachedBackground('battle',battleBackground),0,0);
 const ps=.25+(player?.length||0)/80,rs=.25+(rival?.length||0)/80,progress=Math.min(1,(fight?.elapsed||0)/3),drift=(fight?.position||0)*.63;
 const px=163+(238-ps*30-163)*progress+drift,rx=318+(245+rs*29-318)*progress+drift;
 const bump=fight&&!fight.finished?Math.sin(time/100)*3:0;
 drawSide(c,player,px+bump,187+(fight?.finished&&!fight.won?20:0),fight&&!fight.finished?time:0,1,ps);drawSide(c,rival,rx-bump,187+(fight?.finished&&fight.won?20:0),fight&&!fight.finished?time:0,-1,rs);
}
export function drawForest(c,location='oak',time=0,expedition=null,player={x:240,y:244}){
 c.imageSmoothingEnabled=false;c.drawImage(cachedBackground('forest-'+location,x=>forestBackground(x,location)),0,0);const p=pen(c);
 if(expedition){for(const s of expedition.spots){if(!s.searched){p(s.x-3,s.y-3,7,7,s.rich?'#dfc478':'#bec899');p(s.x-1,s.y-1,3,3,'#665737');}}}
 const x=Math.round(player.x)-14,y=Math.round(player.y)-42;
 p(x+7,y+29,6,12,'#49627a');p(x+17,y+29,6,12,'#49627a');p(x+5,y+41,10,3,'#344b4b');p(x+17,y+41,10,3,'#344b4b');p(x+4,y+15,21,17,'#efd091');p(x+3,y+17,6,13,'#b87752');p(x+20,y+17,6,13,'#b87752');p(x+8,y+9,14,10,'#e2b778');p(x+7,y+3,17,8,'#6f6144');p(x+3,y+8,24,4,'#ddba72');p(x+8,y+3,13,5,'#e8cc89');p(x+13,y+20,6,8,'#adc17a');
 if(expedition?.encounter){const e=expedition.encounter;drawSide(c,e.bug,e.x,e.y+15,time,1,.54);}
}
export function productURL(id,product){
 const key='product-'+id;if(urls.has(key))return urls.get(key);
 const cvs=document.createElement('canvas');cvs.width=64;cvs.height=64;const c=cvs.getContext('2d'),p=pen(c),color=product.color;
 if(product.kind==='jelly'){
  p(9,41,45,12,'#705c41');p(11,36,41,8,'#d7c492');p(15,27,33,12,color);p(19,23,25,5,color);p(21,25,9,2,'#ffffff70');p(8,38,47,3,'#ece3bc');p(17,45,29,5,'#ede9cf');p(22,46,18,2,color);
  p(10,12,22,18,color);p(12,14,18,13,'#f0e6c1');p(16,16,10,4,color);p(14,23,14,1,'#9b8f6b');
 }else if(product.kind==='fungus'){
  p(18,7,29,7,'#52714e');p(15,14,35,39,'#9ba888');p(17,17,31,33,color);p(18,19,3,28,'#f9f8e4');p(17,52,31,3,'#879e75');p(22,30,21,14,'#eee9d1');p(25,33,15,3,'#769366');p(25,39,12,1,'#97a481');for(let i=0;i<17;i++)p(23+(i*7)%21,18+(i*11)%31,2,1,'#b4bf9a');
 }else if(product.kind==='trap'){
  p(14,34,36,19,'#775a3c');p(17,37,30,13,'#d4b374');p(18,25,27,4,'#7a7751');p(19,16,3,23,'#819363');p(41,16,3,23,'#819363');p(19,13,25,5,color);oval(c,24,25,14,12,color);p(25,27,5,2,'#fff0af');
 }else if(product.kind==='gear'){
  if(product.roomStage){
   p(9,7,4,51,'#526c56');p(51,7,4,51,'#526c56');p(9,7,46,4,color);p(7,56,50,3,'#6b6346');
   for(let shelf=0;shelf<product.roomStage+1;shelf++){const y=15+shelf*9;p(13,y+6,38,3,color);for(let box=0;box<3;box++){const x=15+box*12;p(x,y,10,6,'#d3d5b1');p(x+1,y+1,8,2,'#f0eacb');p(x+2,y+4,6,2,'#937855');}}
  }else if(id==='field_lens'){
   line(c,[[31,37],[47,53]],'#40584e',9);line(c,[[33,39],[45,51]],'#9b9772',4);oval(c,8,8,35,35,'#465e53');oval(c,12,12,27,27,color);oval(c,16,16,19,19,'#c7e1cc');p(18,19,4,10,'#edf1cf');p(24,27,8,3,'#98bcad');
  }else if(id==='temperature_cabinet'){
   p(12,7,40,49,'#4f6667');p(15,10,34,42,color);p(18,17,24,29,'#b8c9b3');p(20,19,20,25,'#718b7a');p(20,29,20,2,'#d7d6b5');p(23,22,7,6,'#c5b27f');p(31,33,7,7,'#d6c293');p(44,25,2,13,'#eee3bd');p(17,12,15,3,'#d8e7cf');p(36,11,8,5,'#4b6c64');p(15,56,6,3,'#514e39');p(43,56,6,3,'#514e39');
  }else if(id==='humidifier'){
   p(15,31,34,25,'#526d62');p(18,34,28,18,color);p(22,23,20,10,'#bccdbb');p(27,19,10,6,'#729986');p(25,39,15,5,'#d8e7cc');p(31,42,3,7,'#698e83');p(18,53,28,3,'#b7c4a3');line(c,[[30,18],[28,13],[32,8]],'#b4cbb8',3);line(c,[[39,22],[42,16],[40,12]],'#d5dfc6',2);
  }else if(id==='deep_bedding'||id==='giant_tub'){
   p(10,13,44,5,'#5e7262');p(12,18,40,37,color);p(15,24,34,28,'#c3c7a5');p(16,36,32,15,'#776143');p(16,36,32,3,'#a38956');p(16,25,3,22,'#eef1d1');p(21,20,22,2,'#dfe1bd');for(let i=0;i<16;i++)p(19+(i*7)%27,40+(i*5)%10,2,1,'#b39a66');if(id==='giant_tub'){p(24,27,17,7,'#ece9cc');p(27,29,11,2,'#729078');}
  }else if(id==='wide_holder'){
   p(9,41,46,11,'#695537');p(12,34,40,8,color);p(17,27,30,9,'#dfc28c');oval(c,21,25,22,15,'#eee0b5');oval(c,24,27,16,10,'#d3a455');p(27,28,8,2,'#fff0c2');p(14,44,4,4,'#b29963');p(46,44,4,4,'#b29963');
  }else if(id==='spawn_logs'){
   p(9,47,46,7,'#6b563c');p(13,20,13,29,'#8c6d47');p(29,13,15,36,color);p(44,25,7,24,'#b18e5b');p(15,20,9,5,'#d9bd86');p(31,13,11,6,'#dbc38e');p(46,25,4,4,'#e4c997');line(c,[[18,27],[21,33],[18,42]],'#5e5136',2);line(c,[[36,24],[33,35],[38,43]],'#6a5739',2);p(12,50,39,2,'#b79e6b');
  }else if(id==='specimen_table'){
   p(8,37,48,7,'#64766c');p(11,39,42,2,color);p(13,44,5,13,'#8b7854');p(46,44,5,13,'#8b7854');p(15,29,21,8,'#e9deba');p(18,31,15,3,'#96a183');p(43,12,4,26,'#61766c');p(36,11,14,7,color);p(39,17,8,5,'#e2d2a0');line(c,[[44,10],[38,5],[31,5]],'#6f7966',3);p(25,4,12,5,'#9dada0');p(24,9,9,3,'#ecd698');
  }else{
   p(8,46,48,9,'#785d40');p(12,42,40,5,color);p(16,24,8,20,'#9f7a49');p(38,19,7,25,'#9f7a49');line(c,[[20,25],[27,33],[34,28],[41,20]],'#e4c888',2);p(14,47,36,2,'#c09c5a');
  }
 }else{
  poly(c,[[14,11],[50,11],[53,17],[50,56],[15,56],[11,18]],'#554e35');poly(c,[[16,13],[48,13],[50,18],[47,53],[17,53],[14,19]],color);p(14,16,36,3,'#b3b983');p(20,25,24,18,'#efe5bd');p(24,29,16,3,'#66724c');p(24,35,13,2,'#9a9b6b');p(25,40,11,1,'#b6ad76');p(17,47,30,2,'#ffffff22');
 }
 const url=cvs.toDataURL();urls.set(key,url);return url;
}
