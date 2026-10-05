import {SPECIES} from './world.js';
import {validTraits} from './traits.js';
const MAX_LINES=128,MAX_RECORDS=4096;
const id=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const copy=value=>value?structuredClone(value):null;
const cleanName=value=>typeof value==='string'?value.trim():'';
const nameKey=value=>value.normalize('NFKC').toLocaleLowerCase();
export const generationLabel=n=>n===0?'P':`F${n}`;
export const breedingKind=kind=>({founder:'종충',linebred:'라인 내 교배',outcross:'외부 개체 교배',cross:'다른 라인 교배'})[kind]||'';
export const lineById=(state,lineId)=>(state.lines||[]).find(line=>line.id===lineId);
export function lineageText(state,bug){const line=lineById(state,bug.lineage?.lineId);return line?`${line.name} · ${generationLabel(bug.lineage.generation)}`:'라인 미지정';}
export function snapshotBug(bug){
 return {id:bug.id,name:bug.name,species:bug.species,sex:bug.sex,length:bug.length,genetic:bug.genetic,born:bug.born,source:bug.source,traits:[...(bug.traits||[])],lineage:copy(bug.lineage),parentIds:bug.parents?.map(p=>p.id)||[]};
}
function checkName(state,value,except=''){
 const name=cleanName(value);
 if(!name||name.length>24||/[\u0000-\u001f\u007f]/.test(name))throw new Error('라인 이름은 1~24자로 입력해 주세요.');
 if((state.lines||[]).some(line=>line.id!==except&&nameKey(line.name)===nameKey(name)))throw new Error('이미 같은 이름의 라인이 있어요.');
 return name;
}
export function offspringLineage(state,male,female,chosenLineId){
 const parentIds=[...new Set([male.lineage?.lineId,female.lineage?.lineId].filter(Boolean))];
 if(!parentIds.length)return null;
 if(parentIds.length===2&&!chosenLineId)throw new Error('두 라인을 교배할 때는 후손을 기록할 라인을 골라 주세요.');
 const lineId=chosenLineId||parentIds[0],line=lineById(state,lineId);
 if(!parentIds.includes(lineId)||!line||line.species!==male.species)throw new Error('부모가 속한 라인 중에서 선택해 주세요.');
 const generations=[male,female].filter(p=>p.lineage?.lineId===lineId).map(p=>p.lineage.generation);
 return {lineId,generation:Math.max(...generations)+1,kind:parentIds.length===2?'cross':male.lineage?.lineId&&female.lineage?.lineId?'linebred':'outcross'};
}
export function checkLineCapacity(state,lineage){
 if(lineage&&lineById(state,lineage.lineId).records.length>=MAX_RECORDS)throw new Error('이 라인의 산란 기록이 가득 찼어요. 새 종충 라인을 만들어 주세요.');
}
export function recordLineBrood(state,brood){
 if(!brood.lineage)return;
 const line=lineById(state,brood.lineage.lineId);checkLineCapacity(state,brood.lineage);
 line.records.push({id:brood.id,started:brood.started,emerged:null,lineage:copy(brood.lineage),parents:structuredClone(brood.parents),offspring:[]});
}
export function recordLineEmergence(state,brood,offspring,day){
 if(!brood.lineage)return;
 const line=lineById(state,brood.lineage.lineId),record=line?.records.find(record=>record.id===brood.id);
 if(record){record.offspring=offspring.map(snapshotBug);record.emerged=day;}
}
export function createLine(state,maleId,femaleId,value){
 const name=checkName(state,value),male=state.bugs.find(b=>b.id===maleId),female=state.bugs.find(b=>b.id===femaleId);
 if(!male||!female||male.sex!=='male'||female.sex!=='female')throw new Error('보유한 종충 수컷과 암컷을 한 마리씩 골라 주세요.');
 if(male.species!==female.species)throw new Error('같은 종의 종충을 골라 주세요.');
 if((state.lines||[]).length>=MAX_LINES)throw new Error('이 세계의 라인 목록이 가득 찼어요.');
 const line={id:id(),name,species:male.species,created:state.day,archived:false,founders:[],records:[]};
 state.lines??=[];state.lines.push(line);
 for(const bug of [male,female]){const originLineage=copy(bug.lineage);bug.lineage={lineId:line.id,generation:0,kind:'founder'};line.founders.push({...snapshotBug(bug),originLineage});}
 // Attach only known, unassigned descendants; other named lines and broods
 // retain the designation they already had when their parents were paired.
 const known=new Map(line.founders.map(b=>[b.id,b]));
 const candidates=[...state.bugs,...(state.memorials||[]).map(m=>m.bug)].filter(b=>!b.lineage&&b.parents?.length===2);
 let changed=true;
 while(changed){changed=false;for(const bug of candidates){
  if(bug.lineage||!bug.parents.every(p=>known.has(p.id)))continue;
  const parents=bug.parents.map(p=>known.get(p.id));bug.lineage={lineId:line.id,generation:Math.max(...parents.map(p=>p.lineage.generation))+1,kind:'linebred'};
  const key=`known-${bug.born}-${parents.map(p=>p.id).join('-')}`;
  let record=line.records.find(r=>r.id===key);
  if(!record){record={id:key,started:null,emerged:bug.born,lineage:copy(bug.lineage),parents:parents.map(copy),offspring:[]};line.records.push(record);}
  record.offspring.push(snapshotBug(bug));known.set(bug.id,snapshotBug(bug));changed=true;
 }}
 for(const brood of state.broods){if(brood.lineage||!brood.parents.every(p=>known.has(p.id)))continue;
  const parents=brood.parents.map(p=>known.get(p.id));brood.lineage={lineId:line.id,generation:Math.max(...parents.map(p=>p.lineage.generation))+1,kind:'linebred'};
  brood.parents=brood.parents.map((p,i)=>({...p,lineage:copy(parents[i].lineage)}));recordLineBrood(state,brood);
 }
 state.log.unshift({day:state.day,text:`${name} 라인 생성 · ${SPECIES[line.species].name} 종충 한 쌍`});state.log=state.log.slice(0,40);
 return line;
}
export function renameLine(state,lineId,value){const line=lineById(state,lineId);if(!line)throw new Error('라인을 선택해 주세요.');line.name=checkName(state,value,lineId);return line;}
export function archiveLine(state,lineId){const line=lineById(state,lineId);if(!line)throw new Error('라인을 선택해 주세요.');line.archived=!line.archived;return line;}
export function lineMembers(state,line){
 const members=new Map(line.founders.map(b=>[b.id,b]));
 for(const record of line.records)for(const bug of record.offspring)members.set(bug.id,bug);
 for(const bug of state.bugs)if(bug.lineage?.lineId===line.id)members.set(bug.id,snapshotBug(bug));
 for(const m of state.memorials||[])if(m.bug.lineage?.lineId===line.id)members.set(m.id,snapshotBug(m.bug));
 return [...members.values()].map(b=>{
  const living=state.bugs.find(bug=>bug.id===b.id),memorial=state.memorials?.find(m=>m.id===b.id);
  const listing=(state.auctions||[]).find(a=>a.status==='active'&&(a.kind==='adult'?a.asset.id:a.kind==='specimen'?a.asset.bug.id:null)===b.id);
  const current=living||memorial?.bug||(listing?.kind==='adult'?listing.asset:null);
  return {...b,name:current?.name||b.name,status:current&&current.lineage?.lineId!==line.id?'다른 라인으로 이동':listing?'경매 출품 중':living?'사육 중':memorial?.status==='mounted'?'표본 보관':memorial?'보관·작업 중':b.sale?'경매 낙찰':b.worldTransfer?`${b.worldTransfer.to==='real'?'현실':'상상의'} 숲으로 교환`:'방생',alive:!!living&&current.lineage?.lineId===line.id};
 });
}
export function lineStats(state,line){
 const members=lineMembers(state,line),broods=state.broods.filter(b=>b.lineage?.lineId===line.id);
 return {members,living:members.filter(b=>b.alive).length,males:members.filter(b=>b.alive&&b.sex==='male').length,females:members.filter(b=>b.alive&&b.sex==='female').length,offspring:line.records.reduce((n,r)=>n+r.offspring.length+(r.sale?.heads||0),0),broods:broods.length+(state.auctions||[]).filter(a=>a.status==='active'&&a.kind==='larva'&&a.asset.lineage?.lineId===line.id).length,maxGeneration:Math.max(0,...members.map(b=>b.lineage.generation),...line.records.map(r=>r.lineage.generation))};
}
export function validLineage(state,value,species){
 if(value===undefined||value===null)return true;
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&typeof value.lineId==='string'&&lineById(state,value.lineId)?.species===species&&Number.isInteger(value.generation)&&value.generation>=0&&value.generation<=state.day+state.lines.length&&['founder','linebred','outcross','cross'].includes(value.kind)&&(value.generation===0?value.kind==='founder':value.kind!=='founder');
}
const validSale=s=>s===undefined||!!s&&typeof s==='object'&&['adult','larva','specimen'].includes(s.kind)&&Number.isSafeInteger(s.at)&&s.at>=0&&Number.isInteger(s.amount)&&s.amount>=1&&s.amount<=200000&&(Number.isInteger(s.buyer)&&s.buyer>=0&&s.buyer<16||s.buyer==='의뢰 수집가')&&(s.kind!=='larva'||s.heads===3);
export function validLines(state){
 if(state.lines===undefined)return true;
 if(!Array.isArray(state.lines)||state.lines.length>MAX_LINES)return false;
 const ids=new Set(),names=new Set(),recordIds=new Set();
 if(state.lines.some(line=>!line||typeof line.id!=='string'||!line.id||!Object.hasOwn(SPECIES,line.species)))return false;
 const snapshot=(b,species)=>b&&typeof b.id==='string'&&typeof b.name==='string'&&b.name.length<=60&&b.species===species&&['male','female'].includes(b.sex)&&Number.isFinite(b.length)&&b.length>=1&&b.length<=200&&validTraits(species,b.traits)&&validLineage(state,b.lineage,species)&&validSale(b.sale);
 for(const line of state.lines){
  if(ids.has(line.id)||typeof line.name!=='string'||checkSavedName(line.name)===false||names.has(nameKey(line.name))||!Number.isInteger(line.created)||line.created<1||line.created>state.day||typeof line.archived!=='boolean'||!Array.isArray(line.founders)||line.founders.length!==2||!line.founders.every(b=>snapshot(b,line.species)&&b.lineage?.lineId===line.id&&b.lineage.generation===0&&validLineage(state,b.originLineage,line.species))||line.founders[0].sex!=='male'||line.founders[1].sex!=='female'||line.founders[0].id===line.founders[1].id||!Array.isArray(line.records)||line.records.length>MAX_RECORDS)return false;
  ids.add(line.id);names.add(nameKey(line.name));
  for(const r of line.records){
   if(!r||!validSale(r.sale)||r.sale&&(r.sale.kind!=='larva'||r.emerged!==null||r.offspring?.length)||typeof r.id!=='string'||recordIds.has(r.id)||!validLineage(state,r.lineage,line.species)||r.lineage?.lineId!==line.id||r.lineage.generation<1||r.started!==null&&(!Number.isInteger(r.started)||r.started<1||r.started>state.day)||r.emerged!==null&&(!Number.isInteger(r.emerged)||r.emerged<(r.started||1)||r.emerged>state.day)||!Array.isArray(r.parents)||r.parents.length!==2||!r.parents.every(p=>snapshot(p,line.species))||r.parents[0].sex!=='male'||r.parents[1].sex!=='female'||r.parents[0].id===r.parents[1].id||!Array.isArray(r.offspring)||r.offspring.length>3||!r.offspring.every(b=>snapshot(b,line.species)&&b.lineage?.lineId===line.id&&b.lineage.generation===r.lineage.generation)||r.emerged===null&&r.offspring.length||r.started===null&&r.emerged===null)return false;
   recordIds.add(r.id);
  }
 }
 const pending=state.broods.filter(b=>b.lineage);
 return pending.every(b=>lineById(state,b.lineage.lineId)?.records.some(r=>r.id===b.id&&r.emerged===null&&r.lineage.generation===b.lineage.generation));
}
function checkSavedName(name){return name===name.trim()&&name.length>=1&&name.length<=24&&!/[\u0000-\u001f\u007f]/.test(name);}
