import {SPECIES,sizeRange} from './world.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Parent measurements set the baseline. Food freshness and nutrition are
// separate, so ordinary wood substrate does not count as neglected care.
// The numerical distribution is a game balance, not a biological prediction.
export function rearedLength(species,sex,genetic,parents,quality,rearing=null){
 const range=sizeRange(species,sex,true),male=parents?.find(p=>p.sex==='male'),female=parents?.find(p=>p.sex==='female');
 if(!male||!female)return range[0]+Math.pow(clamp(genetic*.8+clamp(quality,0,1.15)/1.15*.2,0,1),1.6)*(range[1]-range[0]);
 const own=sex==='male'?male:female,other=sex==='male'?female:male;
 const otherMax=sizeRange(species,other.sex,true)[1],baseline=own.length*.8+other.length*(range[1]/otherMax)*.2;
 const nutrition=clamp(rearing?.nutrition??.72,.01,1.15),care=clamp(rearing?.care??quality/nutrition,0,1);
 const parentTrait=p=>Number.isFinite(p.genetic)?p.genetic:clamp((p.length-SPECIES[species][p.sex][0])/(SPECIES[species][p.sex][1]-SPECIES[species][p.sex][0]),0,1);
 const inherited=(parentTrait(male)+parentTrait(female))/2;
 const variation=clamp(genetic-inherited,-.3,.3)*(range[1]-range[0])*.28;
 const span=range[1]-range[0];
 const fungus=clamp(rearing?.fungus??0,0,1);
 const benefit=span*(species==='king'?.10+.23*fungus+Math.max(0,nutrition-.72)*.05:.23+Math.max(0,nutrition-.72)*.16)*care;
 const neglect=span*.65*(1-care);
 let length=baseline+benefit-neglect+variation;
 // The substrate rule belongs to D. titanus (flat), not D. hopei (king).
 if(species==='flat'&&sex==='male'){
  if(male.length>=60&&female.length>=30&&care>=.9&&nutrition>=.7)length=Math.max(70,length);
  if(male.length>=60&&female.length>=30&&nutrition>=.7&&care>=.9&&genetic-inherited>.105)length+=8;
 }
 if(species==='king'&&sex==='male'){
  if(fungus>=.55&&care>=.9&&male.length>=60&&female.length>=30)length=Math.max(70,length);
  if(fungus>=.75&&nutrition>=1.06&&care>=.9&&genetic-inherited>.09)length+=6;
  // Track actual fungal feeding time; premium mat alone cannot earn this bonus.
  length=Math.min(69.8+16.2*fungus,length);
 }
 if(care>=.9&&!(species==='king'&&sex==='male'))length=Math.max(own.length,length);
 return clamp(length,range[0],range[1]);
}
