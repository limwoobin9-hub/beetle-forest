import {SPECIES,sizeRange} from './world.js';
import {isLarva} from './catalog.js';
import {stageName} from './time.js';
import {inheritanceChances,stableTraitRandom,traitMarketBonus,traitPremium,traitRarity,traitLabel,traitRateText} from './traits.js';
import {validSpecimenWork} from './specimens.js';
export const MINUTE=60000,MAX_AUCTION_MINUTES=10080,MAX_ACTIVE_AUCTIONS=8;
export const AUCTION_KINDS={adult:'성충',larva:'유충 묶음',specimen:'표본'};
export const BIDDERS=['참나무 브리더','달빛 사육실','고목 수집가','장치 연구소','초록 케이스','큰턱 매니아','작은 숲 친구','희귀혈통 공방','밤숲 곤충원','단치 컬렉터','황금날개 수집실','연화상 작업실','산속 브리더','컬러아이 농장','누대 사육회','박물관 취미실'];
const cap=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const uuid=()=>crypto.randomUUID();
export const auctionReserved=s=>(s.auctions||[]).filter(a=>a.status==='active').reduce((n,a)=>n+(a.kind==='adult'?1:a.kind==='larva'?3:0),0);
export const auctionNurseries=s=>(s.auctions||[]).filter(a=>a.status==='active'&&a.kind==='larva').length;
export const activeAuctionFor=(s,kind,id)=>(s.auctions||[]).find(a=>a.status==='active'&&a.kind===kind&&a.asset.id===id);
export const auctionBug=a=>a.kind==='specimen'?a.asset.bug:a.kind==='adult'?a.asset:null;
export const bidStep=price=>price<100?5:price<500?10:price<1500?25:50;
export function sizeScore(b){const [lo,hi]=sizeRange(b.species,b.sex,true);return cap((b.length-lo)/(hi-lo));}
export function marketValue(kind,asset){
 const b=kind==='specimen'?asset.bug:asset,sp=b.species,base={king:80,flat:65,rhino:50,redleg:100,dauria:150,twospot:190,saw:60,little:45,stag:95}[sp];
 const factors=[],rare=SPECIES[sp].rarity;let score,traitPower,value;
 if(kind==='larva'){
  score=asset.parents.reduce((n,p)=>n+sizeScore(p),0)/2;
  const inherited=inheritanceChances(sp,asset.parents);
  traitPower=inherited.reduce((n,t)=>n+(traitPremium(t.id)-1)*t.chance,0);
  const stage=stageName(asset),stageWeight={'1령':.72,'2령':.86,'3령':1}[stage]||.72;
  value=base*(.10+5.8*Math.pow(score,3.2))*(1+traitPower)*3*.55*stageWeight*(.65+.35*asset.food/100);
  factors.push(`부모 ♂ ${asset.parents[0].length.toFixed(1)} / ♀ ${asset.parents[1].length.toFixed(1)} mm`,`${stage} · 3마리 묶음`);
  for(const t of inherited)factors.push(`${t.name} · ${traitRarity(t.id).name} · 유전 기대 ${traitRateText(t.chance)}`);
 }else{
  score=sizeScore(b);traitPower=traitMarketBonus(b.traits);
  value=base*(.10+6*Math.pow(score,3.4))*(1+traitPower);
  if(kind==='adult')value*=.42+.58*b.health/100;
  if(kind==='specimen')value*=1.08+(asset.work?.label?.collector?.trim() ? .15 : 0);
  factors.push(`${b.sex==='male'?'수컷':'암컷'} ${b.length.toFixed(1)} mm · 동종·동성별 크기 기준`);
  for(const id of b.traits||[])factors.push(`${traitLabel(id,b.sex)} · ${traitRarity(id).name} · 단일 특성 평가 ×${traitPremium(id).toFixed(2)}`);
  if(kind==='adult'&&b.health<60)factors.push('컨디션에 따른 감가');
  if(kind==='specimen')factors.push('제작 완료·라벨 부착 표본');
 }
 if(rare)factors.push('희귀종 수집 수요');
 if(score<.25&&!traitPower)factors.push('소형 기본형 · 낮은 수요·유찰 가능');
 else if(score>.80)factors.push(kind==='larva'?'대형 부모세대':'동종 대형 개체');
 const demand=cap(.025+.78*score*score+Math.min(.45,.12*Math.log2(1+traitPower))+rare*.025,.015,.96);
 value=Math.max(5,Math.round(value));
 return {value,demand,low:Math.max(1,Math.floor(value*.55)),high:Math.ceil(value*1.5),suggested:Math.max(1,Math.floor(value*.4)),factors};
}
export function auctionCandidates(state,kind){
 if(kind==='adult')return state.bugs.filter(b=>state.fight?.bugId!==b.id||state.fight.finished);
 if(kind==='larva')return state.broods.filter(b=>isLarva(stageName(b)));
 if(kind==='specimen')return state.memorials.filter(m=>m.status==='mounted'&&!activeAuctionFor(state,kind,m.id));
 return [];
}
export function auctionPreview(state,kind,id){
 if(!Object.hasOwn(AUCTION_KINDS,kind))throw new Error('출품 종류를 선택해 주세요.');
 const asset=auctionCandidates(state,kind).find(a=>a.id===id);if(!asset)throw new Error('출품 가능한 개체를 선택해 주세요.');
 return {kind,asset,market:marketValue(kind,asset)};
}
function note(s,text){s.log.unshift({day:s.day,text});s.log=s.log.slice(0,40);}
function historyLimit(s){const active=s.auctions.filter(a=>a.status==='active'),closed=s.auctions.filter(a=>a.status!=='active').slice(-80);s.auctions=[...active,...closed].sort((a,b)=>a.started-b.started);}
export function listAuction(state,kind,id,{startPrice,durationMinutes},now=Date.now()){
 if(!Number.isInteger(startPrice)||startPrice<1||startPrice>1000000)throw new Error('시작가는 1~1,000,000 잎사귀로 정해 주세요.');
 if(!Number.isInteger(durationMinutes)||durationMinutes<1||durationMinutes>MAX_AUCTION_MINUTES)throw new Error('경매 기간은 실제 시간 1분~7일로 정해 주세요.');
 if(!Number.isSafeInteger(now)||now<0||now+durationMinutes*MINUTE>8.64e15)throw new Error('현재 시간을 확인해 주세요.');
 if((state.auctions||[]).filter(a=>a.status==='active').length>=MAX_ACTIVE_AUCTIONS)throw new Error('동시에 진행할 수 있는 경매는 8개입니다.');
 const {asset,market}=auctionPreview(state,kind,id);
 if(activeAuctionFor(state,kind,id))throw new Error('이미 경매에 출품한 개체입니다.');
 const lot={id:uuid(),version:1,kind,asset:structuredClone(asset),market,started:now,ends:now+durationMinutes*MINUTE,startPrice,status:'active',cursor:0,offers:[],bids:[],current:0,buyer:null,settledAt:null};
 state.auctions??=[];state.auctions.push(lot);
 if(kind==='adult'){state.bugs=state.bugs.filter(b=>b.id!==id);if(state.fight?.bugId===id)state.fight=null;}
 if(kind==='larva')state.broods=state.broods.filter(b=>b.id!==id);
 historyLimit(state);note(state,`${SPECIES[asset.species||asset.bug.species].name} ${AUCTION_KINDS[kind]} 경매 출품 · 시작 ${startPrice} 잎사귀`);return lot;
}
// Fixed seeded visitors and private bidding limits make polling and offline
// replay identical. Larger/rare stock attracts more bidders, never a guarantee.
export function marketPlan(lot){
 const random=stableTraitRandom(`${lot.id}:auction-v1`),duration=lot.ends-lot.started,minutes=duration/MINUTE;
 const exposure=.55+.45*Math.log1p(minutes)/Math.log1p(MAX_AUCTION_MINUTES),events=[];
 for(let bidder=0;bidder<BIDDERS.length;bidder++){
  const interested=random()<lot.market.demand*exposure,limit=Math.max(1,Math.round(lot.market.value*(.45+random()*1.12)));
  const r=random(),fraction=bidder%4===0?.1+.5*r:.28+.7*Math.pow(r,.38);
  if(interested)events.push({bidder,limit,at:lot.started+Math.max(Math.min(15000,duration*.15),Math.floor(duration*fraction))});
 }
 return events.sort((a,b)=>a.at-b.at||a.bidder-b.bidder);
}
function acceptOffer(lot,event){
 if(event.limit<(lot.offers.length?lot.current+bidStep(lot.current):lot.startPrice))return false;
 lot.offers.push(event);const sorted=lot.offers.slice().sort((a,b)=>b.limit-a.limit||a.at-b.at||a.bidder-b.bidder);
 const winner=sorted[0];lot.current=sorted.length===1?lot.startPrice:Math.min(winner.limit,Math.max(lot.current,sorted[1].limit+bidStep(sorted[1].limit)));
 lot.buyer=winner.bidder;lot.bids.push({at:event.at,bidder:winner.bidder,challenger:event.bidder,amount:lot.current});return true;
}
function markLineSale(state,lot){
 const sold={kind:lot.kind,at:lot.ends,amount:lot.current,buyer:lot.buyer};
 if(lot.kind==='larva'){
  const record=state.lines?.find(l=>l.id===lot.asset.lineage?.lineId)?.records.find(r=>r.id===lot.asset.id);
  if(record)record.sale={...sold,heads:3};
 }else{
  const bug=auctionBug(lot);for(const line of state.lines||[])for(const b of [...line.founders,...line.records.flatMap(r=>r.offspring)])if(b.id===bug.id)b.sale={...sold};
 }
}
function returnAsset(state,lot){
 if(lot.kind==='adult')state.bugs.push(structuredClone(lot.asset));
 if(lot.kind==='larva')state.broods.push(structuredClone(lot.asset));
}
export function syncAuctions(state,now=Date.now()){
 if(!Number.isFinite(now)||now<0)throw new Error('현재 시간을 확인해 주세요.');
 let changed=false;const events=[];
 for(const lot of state.auctions||[]){if(lot.status!=='active')continue;
  const plan=marketPlan(lot),until=Math.min(now,lot.ends);
  while(lot.cursor<plan.length&&plan[lot.cursor].at<=until){acceptOffer(lot,plan[lot.cursor++]);changed=true;}
  if(now<lot.ends)continue;
  lot.status=lot.bids.length?'sold':'unsold';lot.settledAt=lot.ends;
  if(lot.status==='sold'){
   state.coins=Math.min(1000000000,state.coins+lot.current);markLineSale(state,lot);
   if(lot.kind==='specimen')state.memorials=state.memorials.filter(m=>m.id!==lot.asset.id);
  }else returnAsset(state,lot);
  const label=SPECIES[lot.asset.species||lot.asset.bug.species].name;
  const text=lot.status==='sold'?`${label} ${AUCTION_KINDS[lot.kind]} 낙찰 · +${lot.current} 잎사귀`:`${label} ${AUCTION_KINDS[lot.kind]} 유찰 · 개체 반환`;
  note(state,text);events.push(text);changed=true;
 }
 if(changed)historyLimit(state);return {changed,events};
}
export function cancelAuction(state,id,now=Date.now()){
 const lot=(state.auctions||[]).find(a=>a.id===id);if(!Number.isSafeInteger(now)||lot&&now<lot.started)throw new Error('현재 시간을 확인해 주세요.');if(!lot||lot.status!=='active')throw new Error('진행 중인 경매를 선택해 주세요.');
 if(now>=lot.ends||marketPlan(lot).slice(lot.cursor).some(e=>e.at<=now&&e.limit>=(lot.offers.length?lot.current+bidStep(lot.current):lot.startPrice)))throw new Error('입찰 현황을 새로 확인한 뒤 취소해 주세요.');
 if(lot.bids.length)throw new Error('입찰이 들어온 경매는 취소할 수 없습니다.');
 returnAsset(state,lot);lot.status='cancelled';lot.settledAt=now;note(state,'입찰 없는 경매 취소 · 출품 개체 반환');return lot;
}
export function validAuctions(state,{validBug,validBrood}){
 if(state.auctions===undefined)return true;
 if(!Array.isArray(state.auctions)||state.auctions.length>88)return false;
 const ids=new Set(),locked=new Set();let active=0;
 for(const a of state.auctions){
  if(!a||typeof a.id!=='string'||!a.id||a.id.length>128||ids.has(a.id)||a.version!==1||!Object.hasOwn(AUCTION_KINDS,a.kind)||!a.asset||typeof a.asset.id!=='string'||!Number.isSafeInteger(a.started)||a.started<0||!Number.isSafeInteger(a.ends)||a.ends-a.started<MINUTE||a.ends-a.started>MAX_AUCTION_MINUTES*MINUTE||(a.ends-a.started)%MINUTE||!Number.isInteger(a.startPrice)||a.startPrice<1||a.startPrice>1000000||!['active','sold','unsold','cancelled'].includes(a.status)||!Number.isInteger(a.cursor)||a.cursor<0||a.cursor>BIDDERS.length||!Array.isArray(a.offers)||a.offers.length>BIDDERS.length||!Array.isArray(a.bids)||a.bids.length!==a.offers.length||!a.market||!Number.isInteger(a.market.value)||a.market.value<1||a.market.value>100000||!Number.isFinite(a.market.demand)||a.market.demand<0||a.market.demand>1||!['low','high','suggested'].every(k=>Number.isInteger(a.market[k])&&a.market[k]>=1&&a.market[k]<=100000)||!Array.isArray(a.market.factors)||a.market.factors.length>8||a.market.factors.some(f=>typeof f!=='string'||f.length>120))return false;
  ids.add(a.id);
  if(a.kind==='adult'&&!validBug(a.asset)||a.kind==='larva'&&(!validBrood(a.asset,a.status!=='active')||!isLarva(stageName(a.asset)))||a.kind==='specimen'&&(!validBug(a.asset.bug)||a.asset.id!==a.asset.bug.id||a.asset.status!=='mounted'||!validSpecimenWork(a.asset.work)||a.asset.work.phase!=='done'||typeof a.asset.caption!=='string'||a.asset.caption.length>80))return false;
  const plan=marketPlan(a),seen=new Set();let previous=0,lastTime=a.started;
  for(let i=0;i<a.offers.length;i++){
   const o=a.offers[i],b=a.bids[i];if(!o||!b||!Number.isInteger(o.bidder)||o.bidder<0||o.bidder>=BIDDERS.length||seen.has(o.bidder)||!Number.isInteger(o.limit)||o.limit<a.startPrice||o.limit>200000||!plan.slice(0,a.cursor).some(p=>p.bidder===o.bidder&&p.limit===o.limit&&p.at===o.at)||!Number.isInteger(b.amount)||b.amount<a.startPrice||i>0&&b.amount<=previous||b.amount>Math.max(...a.offers.slice(0,i+1).map(x=>x.limit))||b.at!==o.at||b.at<lastTime||b.at>=a.ends||b.challenger!==o.bidder||!a.offers.slice(0,i+1).some(x=>x.bidder===b.bidder))return false;
   seen.add(o.bidder);previous=b.amount;lastTime=b.at;
  }
  if(['sold','unsold'].includes(a.status)&&a.cursor!==plan.length)return false;
  if(a.current!==previous||a.buyer!==(a.bids.at(-1)?.bidder??null)||a.cursor>plan.length)return false;
  if(a.status==='active'){
   if(a.settledAt!==null||locked.has(a.kind+':'+a.asset.id))return false;locked.add(a.kind+':'+a.asset.id);active++;
   if(a.kind==='adult'&&(state.bugs.some(b=>b.id===a.asset.id)||state.memorials?.some(m=>m.id===a.asset.id)))return false;
   if(a.kind==='larva'&&state.broods.some(b=>b?.id===a.asset.id))return false;
   if(a.kind==='specimen'&&!state.memorials?.some(m=>m.id===a.asset.id&&m.status==='mounted'))return false;
  }else if(!Number.isSafeInteger(a.settledAt)||a.settledAt<a.started||a.settledAt>a.ends||a.status==='sold'&&!a.bids.length||a.status!=='sold'&&a.bids.length||a.status!=='cancelled'&&a.settledAt!==a.ends)return false;
 }
 return active<=MAX_ACTIVE_AUCTIONS&&state.bugs.length+state.broods.length*3+auctionReserved(state)<=48&&state.broods.length+auctionNurseries(state)<=3;
}
