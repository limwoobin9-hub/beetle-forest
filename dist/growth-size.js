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
 const benefit=span*(.23+Math.max(0,nutrition-.72)*(species==='king'?.04:.16))*care;
 const neglect=span*.65*(1-care);
 let length=baseline+benefit-neglect+variation;
 // A well-fed 60mm+ × 30mm+ king pair produces 70mm-class males.
 // 80mm-class offspring need premium food and a favourable inherited roll.
 if(species==='king'&&sex==='male'){
  if(male.length>=60&&female.length>=30&&care>=.9&&nutrition>=.7)length=Math.max(70,length);
  if(nutrition>=1.06&&care>=.9&&genetic-inherited>.09)length+=6+clamp((genetic-inherited-.09)/.03,0,1)*2;
  if(nutrition<1.02)length=Math.min(79.8,length);
 }
 if(care>=.9)length=Math.max(own.length,length);
 return clamp(length,range[0],range[1]);
}
