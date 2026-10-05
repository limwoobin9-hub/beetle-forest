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
const foreignDesigns={
 sumatra_flat:{jaw:'flat',head:30,thorax:28,body:26},borneo_flat:{jaw:'flat',head:28,thorax:25,body:24},palawan:{jaw:'flat',head:29,thorax:26,body:24,maleHeadY:23},
 antaeus:{jaw:'king',head:27,thorax:27,body:26},grandis:{jaw:'king',head:28,thorax:26,body:25},tarandus:{jaw:'king',head:25,thorax:28,body:29},regius:{jaw:'flat',head:25,thorax:27,body:28},
 metallifer:{jaw:'metallifer',head:20,thorax:20,body:20,maleHeadY:26,base:'#977141',shade:'#bc9354',light:'#e6bd75',shine:'#ffe3a0'},
 giraffe:{jaw:'giraffe',head:22,thorax:22,body:22,maleHeadY:24},sika:{jaw:'saw',head:22,thorax:22,body:23,base:'#684432',shade:'#956140',light:'#bd8c5a'},
 formosan:{jaw:'stag',head:29,thorax:23,body:24,base:'#60472e',shade:'#927047',light:'#c4a166'},japan_stag:{jaw:'stag',head:29,thorax:23,body:24,base:'#4d3d2e',shade:'#836342',light:'#b49a67'},japan_saw:{jaw:'saw',head:22,thorax:22,body:23,base:'#733e2d',shade:'#a05f3f',light:'#ca9668'},
 rainbow:{jaw:'dauria',head:24,thorax:25,body:25,base:'#2a694d',shade:'#638441',light:'#b0b953',shine:'#e2cb74',metallic:true},golden:{jaw:'dauria',head:20,thorax:22,body:22,base:'#6b7c36',shade:'#a99b3f',light:'#dfc967',shine:'#ffeb98',metallic:true},
 atlas:{horn:'three',head:18,thorax:30,body:29,base:'#3f4835',shade:'#68734b',light:'#a9ab6c'},caucasus:{horn:'three',head:18,thorax:30,body:29,base:'#384333',shade:'#657852',light:'#97a47b'},moellenkampi:{horn:'three',head:19,thorax:30,body:29,base:'#57472c',shade:'#877244',light:'#b19a65'},
 hercules:{horn:'pincer',head:17,thorax:28,body:28,base:'#a89646',shade:'#c8b359',light:'#e3d185',shine:'#f5e2ac'},neptune:{horn:'pincer',head:17,thorax:28,body:28,base:'#242e2d',shade:'#3c4c46',light:'#738578'},
 actaeon:{horn:'elephant',head:20,thorax:32,body:31,base:'#352d25',shade:'#5b5040',light:'#8d8062'},elephas:{horn:'elephant',head:20,thorax:32,body:31,base:'#796235',shade:'#ab8b4d',light:'#d3b974',shine:'#ebd294',hairy:true},
};
for(const [sp,d] of Object.entries(foreignDesigns))PIXEL_ANATOMY[sp]={foreign:true,dark:'#172525',base:'#354342',shade:'#47595a',light:'#718076',shine:'#a8baa0',head:24,thorax:24,body:24,femaleHead:18,...d};
const mirror=points=>points.map(([x,y])=>[47-x,y]);
function palette(species,sex,traits){
 const a={...(PIXEL_ANATOMY[species]||PIXEL_ANATOMY.king)};
 if(traits.includes(`${species}_bronze`))Object.assign(a,species==='rainbow'?{base:'#284b73',shade:'#497d9a',light:'#8bc3bc',shine:'#c2dfcf'}:{base:'#7e643b',shade:'#ae8a50',light:'#d8b875',shine:'#f2d49a'});
 if(species==='hercules'&&sex==='female'&&!traits.includes('hercules_bronze'))Object.assign(a,{base:'#3d372c',shade:'#685a43',light:'#968365'});
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
 metallifer:[[17,31],[10,26],[7,18],[7,7],[10,0],[12,0],[11,8],[12,18],[17,17],[18,19],[14,21],[20,28]],
 giraffe:[[16,30],[12,25],[10,18],[9,8],[11,0],[13,0],[12,7],[16,6],[17,8],[13,10],[17,11],[18,13],[13,15],[17,16],[18,18],[14,20],[18,23],[21,28]],
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
 return JAWS[species]||JAWS[PIXEL_ANATOMY[species]?.jaw]||JAWS.king;
}
function eyeColor(traits){return traits.some(t=>t.endsWith('_white_eye'))?'#fff5d7':traits.some(t=>t.endsWith('_red_eye'))?'#f25a56':traits.includes('king_pink_eye')?'#ffa8d2':'#111914';}
export function drawDorsal(c,species,sex,traits,{pen,poly,line,oval}){
 const a=palette(species,sex,traits),p=pen(c),male=sex==='male',rhino=species==='rhino'||!!a.horn;
 const hy=male?(a.maleHeadY||(rhino?22:['little','redleg','dauria'].includes(species)?20:18)):17;
 const hw=male?a.head:a.femaleHead,ty=Math.max(27,hy+6),tw=male?a.thorax:rhino?27:a.thorax;
 const by=ty+12,bw=male?a.body:rhino?27:a.body,bh=68-by,bx=24-bw/2;
 // The same six leg joints, faceted wing covers and broad light bands as
 // the domestic sprites. Species-specific jaws and horns remain below.
 const legs=[[[17,33],[10,30],[5,22],[3,21]],[[17,44],[9,42],[5,45],[2,42]],[[18,55],[10,58],[7,65],[3,66]]];
 for(const leg of legs)for(const points of [leg,mirror(leg)]){line(c,points,a.dark,2);line(c,points,a.leg||a.shade);}
 if(rhino){
  oval(c,bx,by,bw,bh,a.dark);oval(c,bx+2,by+1,bw-4,bh-4,a.base);
  oval(c,bx+3,by+1,Math.max(7,bw*.4),bh-7,a.shade);
 }else{
  poly(c,[[bx+3,by],[bx+bw-4,by],[bx+bw,by+6],[bx+bw-1,by+bh-8],[bx+bw-5,by+bh-2],[24,by+bh],[bx+4,by+bh-3],[bx,by+bh-10],[bx,by+6]],a.dark);
  poly(c,[[bx+4,by+1],[bx+bw-5,by+1],[bx+bw-3,by+6],[bx+bw-4,by+bh-9],[bx+bw-7,by+bh-5],[24,by+bh-3],[24,by+1]],a.base);
  poly(c,[[bx+4,by+1],[23,by+1],[23,by+bh-3],[bx+6,by+bh-6],[bx+3,by+bh-11],[bx+3,by+6]],a.shade);
 }
 p(bx+5,by+4,3,Math.max(6,bh-15),a.light);p(bx+6,by+5,1,Math.max(4,bh-19),a.shine);
 p(bx+bw-9,by+5,2,Math.max(7,bh-14),a.light);p(23,by+1,1,bh-2,a.dark);
 const chest=species==='hercules'&&male?'#354342':a.base,chestLight=species==='hercules'&&male?'#758b83':a.light;
 poly(c,[[24-tw/2,ty+3],[24-tw/2+3,ty],[24+tw/2-3,ty],[24+tw/2,ty+4],[24+tw/2-2,ty+12],[24-tw/2+1,ty+12]],a.dark);
 poly(c,[[24-tw/2+3,ty+4],[24-tw/2+6,ty+2],[24+tw/2-6,ty+2],[24+tw/2-3,ty+5],[24+tw/2-5,ty+10],[24-tw/2+3,ty+9]],chest);
 p(24-tw/2+5,ty+3,Math.max(6,tw-12),2,chestLight);p(24-tw/2+3,ty+5,3,4,chestLight);p(24-tw/2+5,ty+4,3,1,a.shine);
 if(species==='twospot'){
  // Paired dark pronotal marks, retained in both sexes.
  const n=traits.includes('twospot_large_spots')?5:3;p(16,ty+4,n,4,a.dark);p(32-n,ty+4,n,4,a.dark);p(23,ty+2,2,7,a.shade);
 }
 if(traits.includes('redleg_red_thorax')){p(16,ty+2,16,6,'#994838');p(18,ty+2,11,1,'#d3865c');}
 // Lucanus males have conspicuous posterior head lobes; females do not.
 const head=(species==='stag'||a.jaw==='stag')&&male?[[10,hy],[14,hy-1],[33,hy-1],[38,hy],[39,hy+5],[35,hy+10],[31,hy+8],[16,hy+8],[12,hy+10],[8,hy+5]]:[[24-hw/2+2,hy],[24+hw/2-2,hy],[24+hw/2,hy+3],[24+hw/2-1,hy+9],[24-hw/2+1,hy+9],[24-hw/2,hy+3]];
 poly(c,head,a.dark);p(24-hw/2+3,hy+2,hw-6,6,chest);p(24-hw/2+4,hy+1,hw-8,2,chestLight);p(24-hw/2+3,hy+3,3,4,chestLight);
 if((species==='stag'||a.jaw==='stag')&&male){p(10,hy+4,4,3,a.shade);p(33,hy+4,4,3,a.shade);}
 // Antennae emerge from the head. The open club is separate from the foreleg.
 const antenna=[[24-hw/2+1,hy+4],[24-hw/2-4,hy+1],[24-hw/2-5,hy-5]];
 for(const pts of [antenna,mirror(antenna)]){line(c,pts,a.dark);const [x,y]=pts.at(-1);p(x-1,y-2,2,4,a.light);p(x-2,y-2,1,1,a.dark);p(x-2,y,1,1,a.dark);}
 const eye=eyeColor(traits),ex=24-hw/2+1;
 p(ex,hy+5,2,2,a.dark);p(46-ex,hy+5,2,2,a.dark);p(ex,hy+5,1,1,eye);p(47-ex,hy+5,1,1,eye);
 if(a.horn&&male){
  if(a.horn==='three'){
   poly(c,[[21,hy+5],[20,hy-4],[18,10],[21,2],[23,0],[25,2],[26,10],[25,hy+5]],a.dark);line(c,[[23,hy+2],[22,10],[23,3]],a.light,2);
   for(const pts of [[[14,ty+6],[9,ty],[5,13],[6,5],[9,2],[11,5],[10,13],[17,ty+3]],[[33,ty+6],[38,ty],[42,13],[41,5],[38,2],[36,5],[37,13],[30,ty+3]]]){poly(c,pts,a.dark);line(c,pts.slice(0,4),a.shade);}
   if(species==='caucasus')p(20,11,7,2,a.shade);
  }else if(a.horn==='pincer'){
   poly(c,[[20,ty+6],[19,21],[20,10],[22,1],[25,0],[28,3],[27,12],[26,ty+6]],a.dark);line(c,[[23,ty+4],[23,15],[24,3]],a.light,2);p(21,9,5,3,a.shade);
   if(species==='neptune'){line(c,[[13,ty+4],[10,15],[12,6]],a.dark,3);line(c,[[34,ty+4],[37,15],[35,6]],a.dark,3);}
  }else{
   poly(c,[[21,hy+7],[20,hy-4],[15,7],[15,2],[18,1],[22,7],[25,7],[29,1],[32,2],[32,7],[27,hy-4],[26,hy+7]],a.dark);line(c,[[24,hy+4],[24,12],[18,4]],a.light,2);line(c,[[24,12],[29,4]],a.light,2);
   line(c,[[11,ty+5],[8,ty-1],[9,ty-9]],a.dark,3);line(c,[[36,ty+5],[39,ty-1],[38,ty-9]],a.dark,3);
  }
 }else if(rhino&&male){
  // A broad, four-point fork at the end of the long cephalic horn.
  poly(c,[[21,28],[21,18],[20,11],[16,8],[13,3],[14,1],[18,4],[19,1],[22,6],[25,6],[28,1],[29,4],[33,1],[34,3],[31,8],[27,12],[26,19],[26,28]],a.dark);
  poly(c,[[23,26],[23,16],[22,10],[18,7],[16,4],[21,7],[23,9],[26,8],[31,4],[29,8],[25,12],[25,25]],a.light);p(24,14,1,10,a.shine);
  poly(c,[[19,ty+7],[18,ty+3],[20,ty-3],[23,ty-5],[26,ty-3],[28,ty+3],[26,ty+7]],a.dark);p(21,ty-2,2,5,a.shade);p(24,ty-2,2,5,a.light);
 }else if(male){
  const shape=jawShape(species,traits),end=Math.max(...shape.map(([,y])=>y));
  const jaw=shape.map(([x,y])=>[x,Math.round(y*(hy+3)/end)]);poly(c,jaw,a.dark);poly(c,mirror(jaw),a.dark);
  // A restrained edge highlight follows the outer contour rather than filling the teeth.
  const edge=jaw.slice(0,Math.min(6,jaw.length)).map(([x,y])=>[x+1,y+1]);line(c,edge,a.light);line(c,mirror(edge),a.light);
  p(jaw[2][0]+1,jaw[2][1]+2,1,3,a.light);p(46-jaw[2][0],jaw[2][1]+2,1,3,a.light);
 }else{
  const jaw=[[18,hy+1],[17,hy-3],[19,hy-6],[21,hy-5],[20,hy-2],[22,hy]];poly(c,jaw,a.dark);poly(c,mirror(jaw),a.dark);p(18,hy-3,1,2,a.shade);p(29,hy-3,1,2,a.shade);
 }
 // Fine texture is taxon-specific: rough female rhino; short hairs on Lucanus.
 if(rhino&&!male)for(let i=0;i<22;i++)p(15+(i*7)%18,ty+2+(i*11)%30,1,1,i%3?a.shade:a.light);
 if(species==='stag'||['formosan','japan_stag'].includes(species)||a.hairy)for(let i=0;i<22;i++){const x=15+(i*7)%18,y=ty+2+(i*5)%(67-ty);if(x!==23&&x!==24)p(x,y,1,1,i%3?a.light:a.shine);}
 if(a.metallic){p(24-bw/2+3,by+4,2,bh-12,'#ba774b');p(24+bw/2-6,by+4,2,bh-10,'#688f98');p(14,ty+3,3,5,'#b86d53');}
 if(species==='hercules'&&male)for(let i=0;i<12;i++)p(14+(i*7)%20,by+4+(i*11)%Math.max(1,bh-7),2,1,a.dark);
}
export function drawLateral(c,species,sex,frame,traits,{pen,poly,line,oval}){
 const a=palette(species,sex,traits),p=pen(c),male=sex==='male',rhino=species==='rhino'||!!a.horn,step=frame%2?2:-2;
 for(const pts of [[[18,31],[13,37],[8-step,42]],[[34,31],[32,38],[38+step,43]],[[51,29],[55,35],[60-step,42]]])line(c,pts,a.shade);
 const tall=rhino?4:species==='saw'&&!male?2:0,slender=species==='little'?2:0;
 poly(c,[[8+slender,29],[12+slender,23-tall],[21,21-tall],[33,21-tall],[40,25],[41,31],[35,35],[18,35],[10,32]],a.dark);
 poly(c,[[12+slender,28],[16,24-tall],[25,23-tall],[34,24-tall],[38,27],[37,31],[30,33],[18,33]],a.base);
 line(c,[[15,25-tall],[24,23-tall],[33,24-tall]],a.light,2);p(18,24-tall,7,1,a.shine);line(c,[[16,29],[34,29]],a.shade);
 poly(c,[[38,25],[42,21-tall],[50,21-tall],[55,25],[53,31],[40,32]],a.dark);p(42,24-tall,9,6+tall,a.base);p(44,22-tall,6,1,a.light);
 if(species==='twospot')p(43,25,traits.includes('twospot_large_spots')?7:4,4,a.dark);
 if(traits.includes('redleg_red_thorax')){p(42,24,9,5,'#994838');p(44,24,5,1,'#d3865c');}
 // The Lucanus head lobe rises behind the eye in profile.
 poly(c,(species==='stag'||a.jaw==='stag')&&male?[[52,26],[52,20],[57,18],[61,22],[65,23],[67,27],[64,31],[54,30]]:[[52,25],[56,22],[62,22],[66,25],[66,29],[61,31],[53,30]],a.dark);p(55,24,8,4,a.base);p(57,23,4,1,a.light);p(64,25,1,1,eyeColor(traits));
 line(c,[[59,24],[60,19],[65,17]],a.dark);p(64,16,2,3,a.light);
 if(a.horn&&male){
  if(a.horn==='pincer'){
   poly(c,[[44,24],[45,15],[50,7],[63,2],[78,1],[84,5],[82,10],[76,9],[67,10],[57,14],[51,23]],a.dark);line(c,[[48,21],[51,12],[65,6],[80,5]],a.light,2);
   poly(c,[[62,29],[69,24],[76,17],[80,10],[83,9],[84,12],[80,22],[71,30],[64,31]],a.dark);line(c,[[67,27],[76,19],[81,12]],a.shade,2);
  }else if(a.horn==='three'){
   poly(c,[[46,25],[44,16],[49,7],[58,3],[69,5],[78,11],[79,15],[75,16],[68,10],[58,9],[52,16],[53,24]],a.dark);line(c,[[48,22],[49,13],[58,6],[70,9],[76,13]],a.light,2);
   poly(c,[[62,28],[68,23],[74,15],[77,7],[80,5],[83,8],[82,15],[76,25],[68,31]],a.dark);line(c,[[67,27],[76,16],[79,9]],a.light,2);
  }else{poly(c,[[62,29],[66,21],[70,12],[76,7],[83,7],[84,10],[78,13],[74,21],[69,29]],a.dark);line(c,[[66,27],[71,17],[78,10]],a.light,2);line(c,[[47,24],[50,14],[56,11]],a.dark,3);}
 }else if(rhino&&male){
  poly(c,[[62,28],[64,21],[68,15],[72,9],[73,3],[74,1],[77,4],[80,1],[82,2],[80,8],[77,13],[74,20],[69,28]],a.dark);
  line(c,[[66,26],[69,19],[74,12],[76,7],[75,3]],a.light,2);line(c,[[76,7],[80,3]],a.light);
  poly(c,[[47,23],[47,18],[50,13],[54,11],[55,13],[52,19],[52,23]],a.dark);line(c,[[50,21],[51,16],[53,13]],a.light);
 }else if(male){
  let jaw;
  if(species==='metallifer')jaw=[[63,25],[66,21],[73,13],[83,5],[87,5],[86,8],[79,14],[77,17],[79,18],[74,21],[67,29],[63,28]];
  else if(species==='giraffe')jaw=[[63,25],[69,21],[75,14],[81,8],[86,6],[87,8],[81,13],[83,14],[78,18],[80,20],[75,23],[67,29],[63,28]];
  else if(species==='saw'||species==='japan_saw'||species==='sika')jaw=traits.includes('saw_curved')?[[63,25],[67,20],[74,15],[82,14],[87,17],[86,20],[82,22],[80,19],[76,20],[74,24],[70,28],[64,29]]:[[63,25],[69,22],[76,18],[82,16],[86,17],[85,21],[81,24],[78,23],[74,27],[67,29],[63,28]];
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
 if(species==='stag'||['formosan','japan_stag'].includes(species)||a.hairy)for(let i=0;i<15;i++)p(15+(i*7)%38,24+(i*3)%7,1,1,i%3?a.light:a.shine);
 if(rhino&&!male)for(let i=0;i<15;i++)p(14+(i*7)%36,23+(i*3)%9,1,1,a.shade);
 // Keep the eye above the mandibular overlay, including inherited colour eyes.
 p(62,25,2,2,a.dark);p(62,25,1,1,eyeColor(traits));
}
