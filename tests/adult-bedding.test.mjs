import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,createBug,care,breed,careBrood,careAidStatus,claimCareAid,validateSave} from '../dist/engine.js';
import {PRODUCTS,isAdultBedding,adultBeddingItems,adultBeddingCount,syncSupplies} from '../dist/catalog.js';

function setup(inventory){
 const s=newGame();s.inventory=inventory;syncSupplies(s);
 const b=createBug('king','male',.7,s.day);b.hygiene=15;s.bugs.push(b);return [s,b];
}

test('all larval-only mats are rejected for adult care without spending or changing the save',()=>{
 for(const [id,p] of Object.entries(PRODUCTS).filter(([,p])=>p.kind==='mat'&&!isAdultBedding(p))){
  const [s,b]=setup({[id]:4,basic_mat:2}),before=structuredClone(s);
  assert.throws(()=>care(s,b.id,'clean',id),/유충용 매트/);
  assert.deepEqual(s,before,id);
 }
});

test('automatic adult care preserves premium stock and prefers dedicated bedding',()=>{
 const [s,b]=setup({stag_master:4,rhino_master:4,basic_mat:2,coconut:1});
 assert.deepEqual(adultBeddingItems(s).map(([id])=>id),['coconut','basic_mat']);
 assert.equal(adultBeddingCount(s),3);
 care(s,b.id,'clean');assert.equal(b.matId,'coconut');assert.equal(s.inventory.coconut,0);
 b.hygiene=20;care(s,b.id,'clean');assert.equal(b.matId,'basic_mat');
 assert.equal(s.inventory.basic_mat,1);assert.equal(s.inventory.stag_master,4);assert.equal(s.inventory.rhino_master,4);
 assert.equal(validateSave(s),true);
});

test('adult care with only larval mats fails without consuming them',()=>{
 const [s,b]=setup({stag_master:4,oak_flake:2}),before=structuredClone(s);
 assert.equal(adultBeddingCount(s),0);assert.equal(s.substrate,6);
 assert.throws(()=>care(s,b.id,'clean'),/성충 교체/);assert.deepEqual(s,before);
});

test('selected basic and coconut bedding keep their care effects',()=>{
 for(const id of ['basic_mat','coconut']){
  const [s,b]=setup({[id]:2});care(s,b.id,'clean',id);
  assert.equal(b.hygiene,100);assert.equal(b.matId,id);assert.equal(s.inventory[id],1);
  assert.equal(b.beddingDays,PRODUCTS[id].duration);assert.equal(b.beddingDecay,PRODUCTS[id].hygiene);
 }
});

test('premium 290-leaf mats remain usable for breeding and larval feeding',()=>{
 for(const [species,id] of [['king','stag_master'],['rhino','rhino_master']]){
  const s=newGame();s.inventory[id]=4;
  const m=createBug(species,'male',.7,s.day),f=createBug(species,'female',.7,s.day);s.bugs.push(m,f);
  const brood=breed(s,m.id,f.id,()=>.25,id);assert.equal(brood.medium,id);assert.equal(s.inventory[id],2);
  brood.age=4;brood.food=10;careBrood(s,brood.id,id);
  assert.equal(brood.food,100);assert.equal(brood.medium,id);assert.equal(s.inventory[id],1);
  assert.equal(validateSave(s),true);
 }
});

test('free care support sees an adult bedding shortage despite premium mat stock',()=>{
 const [s,b]=setup({stag_master:4});s.coins=0;
 assert.deepEqual(careAidStatus(s),{eligible:true,jelly:0,mat:1,claimed:false});
 claimCareAid(s);care(s,b.id,'clean');assert.equal(s.inventory.stag_master,4);assert.equal(s.inventory.basic_mat,0);
 assert.equal(careAidStatus(s).eligible,false);
});

test('support does not count shared basic mat twice for adults and larvae',()=>{
 const [s,m]=setup({basic_mat:3});const f=createBug('king','female',.7,s.day);f.hygiene=15;s.bugs.push(f);
 const brood=breed(s,m.id,f.id,()=>.25);brood.age=4;brood.food=10;s.coins=0;
 assert.equal(s.inventory.basic_mat,1);assert.equal(careAidStatus(s).mat,2);
 s.inventory.coconut=2;syncSupplies(s);assert.equal(careAidStatus(s).mat,0);
 s.inventory.basic_mat=0;syncSupplies(s);assert.equal(careAidStatus(s).mat,1);
});
