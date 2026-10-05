import {SPECIES,sizeRange} from './world.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Parent measurements set the baseline. Food freshness and nutrition are
// separate, so ordinary wood substrate does not count as neglected care.
// The numerical distribution is a game balance, not a biological prediction.
export function rearedLength(species,sex,genetic,parents,quality,rearing=null){
 const range=sizeRange(species,sex,true),referenceMax=sex==='male'&&species==='flat'?82:sex==='male'&&species==='king'?86:range[1],male=parents?.find(p=>p.sex==='male'),female=parents?.find(p=>p.sex==='female');
 if(!male||!female)return range[0]+Math.pow(clamp(genetic*.8+clamp(quality,0,1.15)/1.15*.2,0,1),1.6)*(range[1]-range[0]);
 const own=sex==='male'?male:female,other=sex==='male'?female:male;
 const otherMax=species==='king'&&sex==='male'?49:sizeRange(species,other.sex,true)[1],baseline=own.length*.8+other.length*(referenceMax/otherMax)*.2;
 const nutrition=clamp(rearing?.nutrition??.72,.01,1.15),care=clamp(rearing?.care??quality/nutrition,0,1);
 const parentTrait=p=>Number.isFinite(p.genetic)?p.genetic:clamp((p.length-SPECIES[species][p.sex][0])/(SPECIES[species][p.sex][1]-SPECIES[species][p.sex][0]),0,1);
 const inherited=(parentTrait(male)+parentTrait(female))/2;
 const variation=clamp(genetic-inherited,-.3,.3)*(referenceMax-range[0])*.28;
 const span=referenceMax-range[0];
 const fungus=clamp(rearing?.fungus??0,0,1);
 let benefit=span*(species==='king'?.10+.23*fungus+Math.max(0,nutrition-.72)*.05:.23+Math.max(0,nutrition-.72)*.16)*care;
 if(species==='king'&&sex==='male')benefit=Math.min(benefit,Math.max(0,range[1]-baseline)*(.25+.35*fungus));
 const neglect=span*.65*(1-care);
 let length=baseline+benefit-neglect+variation;
 // The substrate rule belongs to D. titanus (flat), not D. hopei (king).
 if(species==='flat'&&sex==='male'){
  if(male.length>=60&&female.length>=30&&care>=.9&&nutrition>=.7)length=Math.max(70,length);
  // Sustained fungal feeding improves the whole distribution, with upper-80s
  // still requiring favorable inherited variation. A late switch earns little.
  const fungalGain=5.2*fungus*clamp((nutrition-.72)/.43,0,1)*care;
  length+=fungalGain;
  if(male.length>=60&&female.length>=30&&nutrition>=.7&&care>=.9&&genetic-inherited>.105)length+=8-4*fungus;
 }
 if(species==='king'&&sex==='male'){
  if(fungus>=.55&&care>=.9&&male.length>=60&&female.length>=30)length=Math.max(70,length);
  if(fungus>=.75&&nutrition>=1.06&&care>=.9&&genetic-inherited>.09)length+=6;
  // Japanese binodulosus breeder records document 94.1 mm males; extreme
  // sizes require favorable variation and sustained fungal nutrition.
  // The former 70 mm mat ceiling and 86 mm blanket ceiling are removed.
  const exceptional=Math.pow(Math.max(clamp((genetic-inherited+.02)/.14,0,1),clamp((genetic-.78)/.22,0,1)),3);
  const nutritionLevel=clamp((nutrition-.72)/.387,0,1),sustained=clamp(fungus/.9,0,1);
  length=Math.min(86+(range[1]-86)*sustained*nutritionLevel*care*exceptional,length);
 }
 if(care>=.9&&!(species==='king'&&sex==='male'))length=Math.max(own.length,length);
 return clamp(length,range[0],range[1]);
}

