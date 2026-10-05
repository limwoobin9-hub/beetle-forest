import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,buy,breed,migrateSave,validateSave,advanceDay} from '../dist/engine.js';
import {OVERSEAS_REGIONS,startForeignTrip,surveyForeignTrip,returnForeignTrip,claimForeignReturn,processForeignCatch} from '../dist/overseas.js';
import {EXPEDITION_PLANS,ENDGAME_EQUIPMENT,expeditionCost} from '../dist/endgame.js';
import {SPECIES} from '../dist/world.js';
import {PIXEL_ANATOMY} from '../dist/beetle-pixels.js';
import {MAP_POINTS} from '../dist/world-map.js';
import {GROWTH_PROFILES} from '../dist/time.js';
import {PRODUCTS,syncSupplies,equipmentEffects} from '../dist/catalog.js';
import {stableTraitRandom,inheritTraits,rollGuaranteedTrait} from '../dist/traits.js';
import {loadWorld,saveWorld} from '../dist/worlds.js';
const NOW=Date.parse('2026-10-06T04:00:00+09:00');
const valid=s=>assert.equal(validateSave(JSON.parse(JSON.stringify(s))),true);
const rich=()=>Object.assign(newGame(NOW),{coins:1000000});
function unchanged(s,fn,re){const before=structuredClone(s);assert.throws(fn,re);assert.deepEqual(s,before);}
function pair(s,sp='flat'){const p=['male','female'].map(sex=>createBug(sp,sex,.65,s.day,'채집',null,1,null,{traits:[]}));s.bugs.push(...p);return p;}

test('all 28 regions have actual map coordinates and six new taxa have full breeding/art/market support',()=>{
 assert.equal(Object.keys(OVERSEAS_REGIONS).length,28);assert.deepEqual(Object.keys(MAP_POINTS).sort(),Object.keys(OVERSEAS_REGIONS).sort());
 for(const sp of ['grantii','tityus','satanas','elaphus','adolphinae','mellyi']){assert.ok(SPECIES[sp].foreign);assert.ok(PIXEL_ANATOMY[sp].foreign);assert.ok(GROWTH_PROFILES[sp].min>0);const s=rich(),p=pair(s,sp);s.inventory.basic_mat=20;syncSupplies(s);const b=breed(s,...p.map(b=>b.id),()=>.5);assert.ok(b.growthPlan.natural.every(n=>n>0));valid(s);}
});

test('each plan charges full travel plus surcharge and performs exactly 3/4/5/6 instant surveys',()=>{
 for(const [mode,p] of Object.entries(EXPEDITION_PLANS)){const s=rich(),cost=expeditionCost(OVERSEAS_REGIONS.bolivia,mode);s.coins=cost;s.energy=0;const t=startForeignTrip(s,'bolivia',NOW,{mode});assert.equal(s.coins,0);assert.equal(s.xp,0);assert.equal(t.phase,'field');
  for(let i=0;i<p.surveys;i++){surveyForeignTrip(s,createBug,NOW);assert.equal(t.waitUntil,NOW);assert.equal(t.phase,'field');valid(s);}
  unchanged(s,()=>surveyForeignTrip(s,createBug,NOW),new RegExp(`${p.surveys}회`));if(p.guaranteedTrait)assert.ok(t.catches.some(c=>c.bug.traits.length));
  unchanged(s,()=>returnForeignTrip(s,NOW),/자격/);for(const c of t.catches)processForeignCatch(s,c.bug.id);returnForeignTrip(s,NOW);const result=claimForeignReturn(s,NOW);assert.equal(result.specimens,p.surveys);assert.equal(s.memorials.length,p.surveys);valid(s);
 }
 const s=rich();s.coins=117999;unchanged(s,()=>startForeignTrip(s,'bolivia',NOW,{mode:'elite'}),/118000/);unchanged(s,()=>startForeignTrip(s,'bolivia',NOW,{mode:'unknown'}),/방식/);
});

test('expensive fieldwork has measured larger stock, 18% trait discovery, and guaranteed elite final catches',()=>{
 const totals={};for(const mode of Object.keys(EXPEDITION_PLANS)){let count=0,traits=0,genetics=0;
  for(let seed=0;seed<500;seed++){const s=rich(),t=startForeignTrip(s,'papua',NOW,{mode});t.id=`endgame-${seed}`;const p=EXPEDITION_PLANS[mode];for(let i=0;i<p.surveys;i++){const b=surveyForeignTrip(s,createBug,NOW);count++;traits+=!!b.traits.length;genetics+=b.genetic;}if(p.guaranteedTrait)assert.ok(t.catches.some(c=>c.bug.traits.length));}
  totals[mode]={traits:traits/count,genetic:genetics/count};
 }
 assert.ok(Math.abs(totals.standard.traits-.06)<.02);assert.ok(Math.abs(totals.traits.traits-.18)<.025);assert.ok(totals.large.genetic>totals.standard.genetic+.1);assert.ok(totals.elite.genetic>totals.standard.genetic+.15);
 const s=rich(),t=startForeignTrip(s,'papua',NOW,{mode:'elite'});t.id='forced-guarantee';for(let i=0;i<5;i++)surveyForeignTrip(s,createBug,NOW);t.catches.forEach(c=>c.bug.traits=[]);assert.ok(surveyForeignTrip(s,createBug,NOW).traits.length);assert.ok(rollGuaranteedTrait('elaphus',()=>1).length);
});

test('50k headquarters targets only native pool species, persists, and does not change rolled catches',()=>{
 const s=rich();unchanged(s,()=>startForeignTrip(s,'bolivia',NOW,{target:'satanas'}),/본부/);buy(s,'overseas_hq');unchanged(s,()=>startForeignTrip(s,'bolivia',NOW,{target:'mellyi'}),/현지/);const t=startForeignTrip(s,'bolivia',NOW,{mode:'elite',target:'satanas'});for(let i=0;i<6;i++)assert.equal(surveyForeignTrip(s,createBug,NOW).species,'satanas');valid(s);
 const catches=structuredClone(t.catches),copy=JSON.parse(JSON.stringify(s));migrateSave(copy,NOW);assert.deepEqual(copy.foreignTrip.catches,catches);assert.equal(copy.foreignTrip.target,'satanas');valid(copy);
 const bad=structuredClone(copy);bad.foreignTrip.target='mellyi';assert.equal(validateSave(bad),false);bad.foreignTrip.target='';bad.foreignTrip.mode='wrong';assert.equal(validateSave(bad),false);
});

test('elite live catches still reserve six adult spaces and require existing import qualification',()=>{
 const s=rich();s.career.qualifications=['overseas_live'];const t=startForeignTrip(s,'arizona',NOW,{mode:'elite'});for(let i=0;i<6;i++)surveyForeignTrip(s,createBug,NOW);while(s.bugs.length<43)s.bugs.push(createBug('flat','male',.5,1));unchanged(s,()=>returnForeignTrip(s,NOW),/공간/);s.bugs.pop();returnForeignTrip(s,NOW);claimForeignReturn(s,NOW);assert.equal(s.bugs.length,48);valid(s);
});

test('80k breeding and 120k environment labs change actual new brood potential and daily consumption',()=>{
 const s=rich(),p=pair(s);s.inventory.basic_mat=100;syncSupplies(s);const b=breed(s,...p.map(b=>b.id),()=>.5),old=structuredClone(b);buy(s,'breeding_lab');buy(s,'climate_lab');assert.deepEqual(b,old);assert.equal(equipmentEffects(s,'flat').genetic,.035);assert.equal(equipmentEffects(s,'flat').foodInterval,1.5);assert.equal(equipmentEffects(s,'rhino').beddingDecay,.75);
 const p2=pair(s),b2=breed(s,...p2.map(b=>b.id),()=>.5);assert.ok(b2.children.every((child,i)=>Math.abs(child.genetic-old.children[i].genetic-.035)<1e-12));b.age=2;const before=b.food;advanceDay(s);assert.ok(Math.abs(before-b.food-60/(14*1.5))<1e-9);valid(s);
});

test('200k genetics lab doubles new mutations while exact 30/75 inherited rolls and old offspring remain',()=>{
 const s=rich(),p=pair(s);s.inventory.basic_mat=100;syncSupplies(s);const old=breed(s,...p.map(b=>b.id),()=>.5),snapshot=structuredClone(old.children);buy(s,'genetics_lab');assert.deepEqual(old.children,snapshot);const p2=pair(s),newBrood=breed(s,...p2.map(b=>b.id),()=>.2);assert.ok(newBrood.children.every(c=>c.traits.includes('flat_short')));
 let basic=0,boosted=0;const a=stableTraitRandom('mutation-lab'),b=stableTraitRandom('mutation-lab');for(let i=0;i<20000;i++){basic+=!!inheritTraits('flat',[{traits:[]},{traits:[]}],a).length;boosted+=!!inheritTraits('flat',[{traits:[]},{traits:[]}],b,2).length;}assert.ok(boosted/basic>1.9&&boosted/basic<2.1);
 for(const [parents,chance] of [[[{traits:['flat_long']},{traits:[]}],.30],[[{traits:['flat_long']},{traits:['flat_long']}],.75]]){assert.deepEqual(inheritTraits('flat',parents,()=>chance-1e-6,2),['flat_long']);assert.deepEqual(inheritTraits('flat',parents,()=>chance+1e-6,2),[]);}
 valid(s);
});

test('all four research facilities pay exact permanent prices, reject duplicates, and stay world-specific',()=>{
 const s=rich();for(const [id,p] of Object.entries(ENDGAME_EQUIPMENT)){const before=s.coins;buy(s,id);assert.equal(before-s.coins,p.price);assert.equal(PRODUCTS[id].endgame,true);unchanged(s,()=>buy(s,id),/이미 보유/);valid(s);}
 const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};saveWorld(store,'virtual',s,{});assert.equal(loadWorld(store,'virtual',NOW).state.inventory.genetics_lab,1);assert.equal(loadWorld(store,'real',NOW).state.inventory.genetics_lab,undefined);
});

test('legacy standard trips and claimed regional/foreign albums remain readable after adding taxa',()=>{
 const s=rich(),t=startForeignTrip(s,'japan',NOW);delete t.mode;delete t.target;s.career.regions.japan={visits:1,species:['japan_stag','japan_saw'],claimed:true};s.career.albumClaimed=['foreign'];surveyForeignTrip(s,createBug,NOW);const catchBefore=structuredClone(t.catches);migrateSave(s,NOW);assert.deepEqual(t.catches,catchBefore);assert.equal(s.career.regions.japan.claimed,true);assert.deepEqual(s.career.albumClaimed,['foreign']);valid(s);
});
