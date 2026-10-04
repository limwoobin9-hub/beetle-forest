// Original integer-pixel drawings from anatomical observations, not photo traces.
// Reference plates and the differences retained for each sex: docs/species-art-ko.md.
export const PIXEL_ANATOMY={
 king:{dark:'#181a19',base:'#30332e',shade:'#41473d',light:'#737b65',shine:'#a9ad83',head:24,thorax:24,body:24,jaw:'king',femaleHead:18},
 flat:{dark:'#171a19',base:'#2e3530',shade:'#424c41',light:'#718069',shine:'#a3ad85',head:28,thorax:26,body:24,jaw:'flat',femaleHead:20},
 rhino:{dark:'#201917',base:'#49342d',shade:'#644b3d',light:'#9b7854',shine:'#c2a376',head:16,thorax:28,body:28,jaw:'horn',femaleHead:17},
 redleg:{dark:'#1c201c',base:'#33372d',shade:'#485040',light:'#78856a',shine:'#adb18a',head:22,thorax:23,body:22,jaw:'redleg',femaleHead:18,leg:'#a3492c'},
 dauria:{dark:'#211c1a',base:'#574335',shade:'#745743',light:'#a3825a',shine:'#c5a271',head:25,thorax:24,body:23,jaw:'dauria',femaleHead:18},
 twospot:{dark:'#342319',base:'#bd783b',shade:'#d79245',light:'#efb960',shine:'#ffe0a2',head:22,thorax:22,body:23,jaw:'twospot',femaleHead:17,leg:'#97562e'},
 saw:{dark:'#281b18',base:'#6e382b',shade:'#8c4a32',light:'#ba7751',shine:'#d5a574',head:22,thorax:22,body:23,jaw:'saw',femaleHead:17,leg:'#714531'},
 little:{dark:'#181b1a',base:'#2b302a',shade:'#3b4339',light:'#65705c',shine:'#929c7b',head:21,thorax:21,body:20,jaw:'little',femaleHead:16},
 stag:{dark:'#211d17',base:'#4c3c2d',shade:'#6d5239',light:'#9d8057',shine:'#c5a66c',head:29,thorax:23,body:24,jaw:'stag',femaleHead:19,leg:'#705637'},
};
const mirror=points=>points.map(([x,y])=>[47-x,y]);
function palette(species,sex,traits){
 const a={...(PIXEL_ANATOMY[species]||PIXEL_ANATOMY.king)};
 if(species==='dauria'&&sex==='female')Object.assign(a,{base:'#30392e',shade:'#485242',light:'#7c896d',shine:'#adb58e'});
 if(traits.includes('rhino_red'))Object.assign(a,{base:'#8f342a',shade:'#b24c32',light:'#db8156',shine:'#f3b978'});
 if(traits.includes('saw_red'))Object.assign(a,{base:'#943d2c',shade:'#b85737',light:'#e3945c',shine:'#ffc885'});
 if(traits.includes('redleg_crimson'))a.leg='#d84833';
 if(traits.includes('dauria_amber'))Object.assign(a,{base:'#986131',shade:'#b27f43',light:'#deb66d',shine:'#f3d999'});
 if(traits.includes('twospot_gold'))Object.assign(a,{base:'#c39435',shade:'#dfb754',light:'#f7d987',shine:'#fff1be'});
 if(traits.includes('stag_gold'))Object.assign(a,{shade:'#867043',light:'#b79c57',shine:'#e9cd7d'});
 return a;
}
const JAWS={
 king:[[15,26],[11,22],[10,15],[11,8],[14,3],[18,0],[19,2],[16,6],[14,11],[18,10],[19,12],[15,15],[17,20],[20,23]],
 flat:[[12,26],[9,21],[8,12],[9,5],[13,0],[14,1],[11,8],[11,13],[16,12],[17,14],[13,16],[17,19],[17,21],[15,22],[18,24]],
 redleg:[[16,28],[13,22],[13,13],[15,7],[18,3],[19,4],[17,10],[18,12],[17,14],[16,14],[18,20],[20,25]],
 dauria:[[16,28],[12,23],[11,15],[13,8],[16,4],[18,4],[16,9],[19,8],[20,10],[16,13],[19,16],[20,18],[16,19],[20,25]],
 twospot:[[15,27],[10,21],[8,13],[9,5],[13,0],[15,0],[14,3],[11,8],[12,10],[16,9],[17,11],[13,13],[16,14],[16,16],[13,17],[18,22],[20,25]],
 saw:[[16,27],[11,22],[7,14],[7,7],[10,2],[15,0],[16,2],[12,6],[11,11],[14,10],[15,12],[12,13],[16,14],[16,16],[13,17],[17,19],[18,21],[16,22],[20,25]],
 little:[[16,29],[13,22],[13,13],[15,6],[18,2],[19,3],[17,8],[16,14],[20,14],[20,16],[16,18],[18,23],[21,27]],
 stag:[[14,28],[9,22],[8,14],[9,6],[12,1],[14,0],[15,2],[12,6],[16,5],[17,7],[12,9],[16,10],[17,12],[12,13],[16,14],[17,16],[13,17],[18,19],[19,21],[15,22],[20,26]],
};
function jawShape(species,traits){
 if(traits.includes('king_curved'))return [[15,26],[10,22],[8,14],[9,7],[13,2],[18,0],[20,2],[15,6],[12,10],[13,14],[17,13],[19,15],[15,18],[20,24]];
 if(traits.includes('flat_short'))return [[12,27],[9,23],[10,17],[14,12],[17,11],[18,13],[15,17],[19,16],[20,19],[16,21],[20,25]];
 if(traits.includes('flat_toothless'))return [[12,27],[9,21],[8,12],[9,5],[13,0],[14,1],[11,8],[12,15],[15,21],[19,25]];
 if(traits.includes('flat_long'))return [[12,27],[8,21],[6,12],[7,5],[11,0],[13,0],[10,7],[10,12],[16,11],[17,13],[12,16],[16,21],[19,25]];
 if(traits.includes('saw_curved'))return [[16,27],[10,23],[5,15],[5,8],[8,3],[13,0],[17,0],[18,2],[12,6],[10,10],[13,9],[15,11],[11,13],[15,14],[16,16],[12,17],[17,19],[18,22],[20,25]];
 if(traits.includes('little_slender'))return [[16,29],[13,22],[12,13],[13,5],[16,0],[17,0],[15,7],[15,13],[18,13],[19,15],[15,17],[17,23],[20,27]];
 if(traits.includes('dauria_fork'))return [[16,28],[12,23],[11,15],[13,8],[16,4],[18,3],[19,5],[16,9],[20,7],[21,10],[16,13],[19,16],[20,18],[16,19],[20,25]];
 if(traits.includes('stag_fork'))return [[14,28],[9,22],[8,14],[9,6],[12,1],[15,0],[16,2],[12,6],[17,3],[19,5],[13,9],[16,10],[17,12],[12,13],[16,14],[17,16],[13,17],[18,19],[19,21],[15,22],[20,26]];
 return JAWS[species]||JAWS.king;
}
function eyeColor(traits){return traits.some(t=>t.endsWith('_white_eye'))?'#fff5d7':traits.some(t=>t.endsWith('_red_eye'))?'#f25a56':traits.includes('king_pink_eye')?'#ffa8d2':'#111914';}
export function drawDorsal(c,species,sex,traits,{pen,poly,line,oval}){
 const a=palette(species,sex,traits),p=pen(c),male=sex==='male',rhino=species==='rhino';
 const hy=male?(rhino?22:['little','redleg','dauria'].includes(species)?20:18):17;
 const hw=male?a.head:a.femaleHead,ty=hy+10,tw=male?a.thorax:rhino?27:species==='saw'?23:a.thorax;
 const by=ty+10,bw=male?a.body:species==='saw'?26:species==='little'?21:rhino?28:a.body,bh=69-by;
 // Thick femora, jointed tibiae, serrated forelegs, and tiny terminal claws.
 const legs=[[[24-tw/2+2,ty+5],[8,ty+1],[5,hy-2],[2,hy-5]],[[24-bw/2+2,by+7],[7,by+7],[5,by+12],[2,by+13]],[[24-bw/2+3,by+18],[10,by+24],[7,68],[3,70]]];
 for(const leg of legs)for(const points of [leg,mirror(leg)]){
  line(c,points,a.dark,2);line(c,points.slice(0,2),a.leg||a.shade,2);line(c,points.slice(1),a.leg||a.light,1);
  const [x,y]=points.at(-1);p(x,y-1,1,3,a.dark);
 }
 for(const [x,y] of [[4,hy-2],[5,hy+1],[42,hy-2],[41,hy+1]])p(x,y,2,1,a.dark);
 // Elytra: elongated in Dorcus, egg-shaped in the female saw stag, broad in rhino.
 oval(c,24-bw/2,by,bw,bh,a.dark);oval(c,25-bw/2,by+1,bw-2,bh-3,a.base);
 oval(c,26-bw/2,by+2,Math.max(4,bw*.38),bh-6,a.shade);
 line(c,[[24-bw/2+4,by+3],[24-bw/2+3,by+11],[24-bw/2+5,by+bh-7]],a.light,1);
 line(c,[[24+bw/2-4,by+4],[24+bw/2-3,by+12],[24+bw/2-5,by+bh-7]],a.shade,1);
 p(23,by,2,bh-2,a.dark);p(23,by+2,1,bh-6,a.shade);p(24-bw/2+5,by+4,1,5,a.shine);
 if(['king','little','redleg'].includes(species)&&!male)for(const x of [17,20,27,30])for(let y=by+5;y<65;y+=4)p(x,y,1,2,a.shade);
 // Pronotum and the narrow seam between thorax and elytra.
 poly(c,[[24-tw/2+3,ty],[24+tw/2-3,ty],[24+tw/2,ty+4],[24+tw/2-2,ty+10],[24-tw/2+1,ty+10],[24-tw/2,ty+4]],a.dark);
 poly(c,[[24-tw/2+3,ty+2],[24+tw/2-3,ty+2],[24+tw/2-2,ty+7],[24+tw/2-4,ty+8],[24-tw/2+3,ty+8],[24-tw/2+2,ty+5]],a.base);
 line(c,[[24-tw/2+4,ty+2],[24,ty+1],[24+tw/2-4,ty+2]],a.light,1);p(24-tw/2+3,ty+3,2,3,a.shade);
 if(species==='twospot'){
  // Paired dark pronotal marks, retained in both sexes.
  const n=traits.includes('twospot_large_spots')?5:3;p(16,ty+4,n,4,a.dark);p(32-n,ty+4,n,4,a.dark);p(23,ty+2,2,7,a.shade);
 }
 if(traits.includes('redleg_red_thorax')){p(16,ty+2,16,6,'#994838');p(18,ty+2,11,1,'#d3865c');}
 // Lucanus males have conspicuous posterior head lobes; females do not.
 const head=species==='stag'&&male?[[10,hy],[14,hy-1],[33,hy-1],[38,hy],[39,hy+5],[35,hy+10],[31,hy+8],[16,hy+8],[12,hy+10],[8,hy+5]]:[[24-hw/2+2,hy],[24+hw/2-2,hy],[24+hw/2,hy+3],[24+hw/2-1,hy+9],[24-hw/2+1,hy+9],[24-hw/2,hy+3]];
 poly(c,head,a.dark);p(24-hw/2+3,hy+2,hw-6,6,a.base);line(c,[[24-hw/2+3,hy+2],[24,hy+1],[24+hw/2-3,hy+2]],a.light);p(24-hw/2+3,hy+3,2,3,a.shade);
 if(species==='stag'&&male){p(10,hy+4,4,3,a.shade);p(33,hy+4,4,3,a.shade);}
 // Antennae emerge from the head. The open club is separate from the foreleg.
 const antenna=[[24-hw/2+1,hy+4],[24-hw/2-4,hy+1],[24-hw/2-5,hy-5]];
 for(const pts of [antenna,mirror(antenna)]){line(c,pts,a.dark);const [x,y]=pts.at(-1);p(x-1,y-2,2,4,a.light);p(x-2,y-2,1,1,a.dark);p(x-2,y,1,1,a.dark);}
 const eye=eyeColor(traits),ex=24-hw/2+1;
 p(ex,hy+5,2,2,a.dark);p(46-ex,hy+5,2,2,a.dark);p(ex,hy+5,1,1,eye);p(47-ex,hy+5,1,1,eye);
 if(rhino&&male){
  // A broad, four-point fork at the end of the long cephalic horn.
  poly(c,[[21,28],[21,18],[20,11],[16,8],[13,3],[14,1],[18,4],[19,1],[22,6],[25,6],[28,1],[29,4],[33,1],[34,3],[31,8],[27,12],[26,19],[26,28]],a.dark);
  poly(c,[[23,26],[23,16],[22,10],[18,7],[16,4],[21,7],[23,9],[26,8],[31,4],[29,8],[25,12],[25,25]],a.light);p(24,14,1,10,a.shine);
  poly(c,[[19,ty+7],[18,ty+3],[20,ty-3],[23,ty-5],[26,ty-3],[28,ty+3],[26,ty+7]],a.dark);p(21,ty-2,2,5,a.shade);p(24,ty-2,2,5,a.light);
 }else if(male){
  const shape=jawShape(species,traits),end=Math.max(...shape.map(([,y])=>y));
  const jaw=shape.map(([x,y])=>[x,Math.round(y*(hy+3)/end)]);poly(c,jaw,a.dark);poly(c,mirror(jaw),a.dark);
  // A restrained edge highlight follows the outer contour rather than filling the teeth.
  const edge=jaw.slice(0,Math.min(6,jaw.length)).map(([x,y])=>[x+1,y+1]);line(c,edge,a.shade);line(c,mirror(edge),a.shade);
  p(jaw[2][0]+1,jaw[2][1]+2,1,3,a.light);p(46-jaw[2][0],jaw[2][1]+2,1,3,a.light);
 }else{
  const jaw=[[18,hy+1],[17,hy-3],[19,hy-6],[21,hy-5],[20,hy-2],[22,hy]];poly(c,jaw,a.dark);poly(c,mirror(jaw),a.dark);p(18,hy-3,1,2,a.shade);p(29,hy-3,1,2,a.shade);
 }
 // Fine texture is taxon-specific: rough female rhino; short hairs on Lucanus.
 if(rhino&&!male)for(let i=0;i<22;i++)p(15+(i*7)%18,ty+2+(i*11)%30,1,1,i%3?a.shade:a.light);
 if(species==='stag')for(let i=0;i<29;i++){const x=15+(i*7)%18,y=ty+2+(i*5)%(67-ty);if(x!==23&&x!==24)p(x,y,1,1,i%3?a.light:a.shine);}
}
export function drawLateral(c,species,sex,frame,traits,{pen,poly,line,oval}){
 const a=palette(species,sex,traits),p=pen(c),male=sex==='male',rhino=species==='rhino',step=frame%2?2:-2;
 for(const pts of [[[18,31],[13,37],[8-step,42]],[[34,31],[32,38],[38+step,43]],[[51,29],[55,35],[60-step,42]]])line(c,pts,a.shade);
 const tall=rhino?4:species==='saw'&&!male?2:0,slender=species==='little'?2:0;
 poly(c,[[8+slender,29],[12+slender,23-tall],[21,21-tall],[33,21-tall],[40,25],[41,31],[35,35],[18,35],[10,32]],a.dark);
 poly(c,[[12+slender,28],[16,24-tall],[25,23-tall],[34,24-tall],[38,27],[37,31],[30,33],[18,33]],a.base);
 line(c,[[15,25-tall],[24,23-tall],[33,24-tall]],a.light,2);p(18,24-tall,7,1,a.shine);line(c,[[16,29],[34,29]],a.shade);
 poly(c,[[38,25],[42,21-tall],[50,21-tall],[55,25],[53,31],[40,32]],a.dark);p(42,24-tall,9,6+tall,a.base);p(44,22-tall,6,1,a.light);
 if(species==='twospot')p(43,25,traits.includes('twospot_large_spots')?7:4,4,a.dark);
 if(traits.includes('redleg_red_thorax')){p(42,24,9,5,'#994838');p(44,24,5,1,'#d3865c');}
 // The Lucanus head lobe rises behind the eye in profile.
 poly(c,species==='stag'&&male?[[52,26],[52,20],[57,18],[61,22],[65,23],[67,27],[64,31],[54,30]]:[[52,25],[56,22],[62,22],[66,25],[66,29],[61,31],[53,30]],a.dark);p(55,24,8,4,a.base);p(57,23,4,1,a.light);p(64,25,1,1,eyeColor(traits));
 line(c,[[59,24],[60,19],[65,17]],a.dark);p(64,16,2,3,a.light);
 if(rhino&&male){
  poly(c,[[62,28],[64,21],[68,15],[72,9],[73,3],[74,1],[77,4],[80,1],[82,2],[80,8],[77,13],[74,20],[69,28]],a.dark);
  line(c,[[66,26],[69,19],[74,12],[76,7],[75,3]],a.light,2);line(c,[[76,7],[80,3]],a.light);
  poly(c,[[47,23],[47,18],[50,13],[54,11],[55,13],[52,19],[52,23]],a.dark);line(c,[[50,21],[51,16],[53,13]],a.light);
 }else if(male){
  let jaw;
  if(species==='saw')jaw=traits.includes('saw_curved')?[[63,25],[67,20],[74,15],[82,14],[87,17],[86,20],[82,22],[80,19],[76,20],[74,24],[70,28],[64,29]]:[[63,25],[69,22],[76,18],[82,16],[86,17],[85,21],[81,24],[78,23],[74,27],[67,29],[63,28]];
  else if(species==='little')jaw=[[63,25],[68,23],[77,20],[84,18],[86,19],[82,22],[77,24],[74,23],[71,27],[64,28]];
  else if(species==='dauria')jaw=[[63,25],[68,20],[74,14],[78,12],[79,14],[75,18],[79,17],[80,19],[75,22],[70,26],[64,28]];
  else if(species==='redleg')jaw=[[63,25],[69,23],[78,19],[84,16],[85,18],[81,22],[75,25],[69,28],[64,28]];
  else if(species==='stag')jaw=[[63,25],[68,22],[75,17],[82,14],[86,15],[85,18],[81,19],[82,21],[77,22],[78,24],[72,26],[68,29],[63,28]];
  else if(traits.includes('flat_short'))jaw=[[63,25],[68,23],[75,22],[77,24],[72,27],[65,29]];
  else if(traits.includes('flat_long')||traits.includes('little_slender'))jaw=[[63,25],[69,21],[79,16],[86,13],[87,15],[83,21],[78,24],[71,28],[64,29]];
  else if(traits.includes('king_curved'))jaw=[[63,25],[68,20],[75,15],[82,13],[86,15],[84,19],[78,20],[76,24],[70,28],[64,29]];
  else jaw=[[63,25],[69,22],[76,19],[83,16],[86,17],[83,22],[78,24],[74,26],[68,29],[64,29]];
  if(traits.includes('little_slender'))jaw=[[63,25],[69,21],[79,16],[86,13],[87,15],[83,21],[78,24],[71,28],[64,29]];
  if(traits.includes('dauria_fork')||traits.includes('stag_fork'))jaw.splice(4,0,[83,12],[84,14]);
  poly(c,jaw,a.dark);line(c,jaw.slice(0,4).map(([x,y])=>[x,y+1]),a.light);
  if(!traits.includes('flat_toothless'))p(species==='stag'?79:76,23,2,2,a.dark);
  line(c,[[64,28],[73,29],[80,26],[84,22]],a.shade);
 }else{poly(c,[[63,25],[69,24],[73,25],[71,28],[65,30]],a.dark);p(67,26,3,1,a.shade);}
 for(const pts of [[[18,31],[18+step,37],[11+step,43],[7+step,44]],[[35,31],[37-step,37],[31-step,43],[27-step,44]],[[51,29],[57+step,35],[61+step,43],[66+step,44]]]){line(c,pts,a.dark,2);line(c,pts,a.leg||a.shade);if(species==='redleg')line(c,pts.slice(0,2),a.leg,2);}
 if(species==='stag')for(let i=0;i<15;i++)p(15+(i*7)%38,24+(i*3)%7,1,1,i%3?a.light:a.shine);
 if(rhino&&!male)for(let i=0;i<15;i++)p(14+(i*7)%36,23+(i*3)%9,1,1,a.shade);
 // Keep the eye above the mandibular overlay, including inherited colour eyes.
 p(62,25,2,2,a.dark);p(62,25,1,1,eyeColor(traits));
}
