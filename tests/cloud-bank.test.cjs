'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {horizon,extension}=require('../scripts/cloud-bank.cjs');
const {planRefill}=require('../scripts/plan-bank.cjs');
const old=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../questions.json')));
function fixture(){
 const next=structuredClone(old);next.bankVersion='test';
 const plan=planRefill(old,old.questions.map(q=>q.answer),12,min=>min);
 const added=plan.days.flatMap((day,i)=>day.answers.map((answer,j)=>{
  const q=structuredClone(old.questions.find(q=>q.answer===answer)),slot=i*3+j;
  return {...q,id:q.id+'-test-'+slot,clues:q.clues.map((c,k)=>({...c,factKey:c.factKey+'-test-'+slot,text:'Synthetic fact '+slot+' '+k}))};
 }));next.questions.push(...added);
 plan.days.forEach((day,i)=>next.days.push({date:day.date,questionIds:added.slice(i*3,i*3+3).map(q=>q.id)}));
 const report={semanticReviewPassed:true,clues:added.flatMap(q=>q.clues.map(c=>({questionId:q.id,factKey:c.factKey,source:c.source,evidence:'Test evidence',novelty:'Test novelty'}))),takeaways:added.map(q=>({questionId:q.id,source:q.sources[0].url,evidence:'Test evidence'}))};
 return {next,report,plan};
}
test('horizon uses New York date and triggers at five future days',()=>{
 const b={days:[{date:'2026-11-05'},...Array.from({length:5},(_,i)=>({date:'2026-11-'+String(6+i).padStart(2,'0')}))]};
 assert.deepEqual(horizon(b,new Date('2026-11-06T03:00:00Z')),{today:'2026-11-05',futureDays:5,needed:true,lastDate:'2026-11-10'});
 b.days.push({date:'2026-11-11'});assert.equal(horizon(b,new Date('2026-11-06T03:00:00Z')).needed,false);
});
test('accepts a complete extension with evidence for every clue and takeaway',()=>{const {next,report,plan}=fixture();assert(extension(old,next,report,plan).length>0);});
test('rejects edits to historical objects and retired facts',()=>{
 for(const change of [b=>b.questions[0].takeaway='Changed',b=>b.retiredFacts=[]]){const {next,report,plan}=fixture();change(next);assert.throws(()=>extension(old,next,report,plan));}
});
test('rejects partial batches, schedule gaps, incomplete evidence and failed semantic review',()=>{
 for(const change of [(n,r)=>n.questions.pop(),(n,r)=>n.days.at(-1).date='2030-01-01',(n,r)=>r.clues.pop(),(n,r)=>r.semanticReviewPassed=false,(n,r)=>r.takeaways[0].evidence='']){
  const {next,report,plan}=fixture();change(next,report);assert.throws(()=>extension(old,next,report,plan));
 }
});

test('accepts repeated regions and a single geographic group across the refill',()=>{
 const {next,report,plan}=fixture();const added=next.questions.slice(old.questions.length);assert.equal(new Set(added.map(q=>q.answer)).size,3);assert.equal(new Set(added.map(q=>q.group)).size,1);assert(extension(old,next,report,plan).length);
 const {validateBank}=require('../game-core.js'),regions=new Set(JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../india.geojson'))).features.map(f=>f.properties.name));assert(validateBank(next,regions));
});
test('rejects repeating an answer within the same day, and assignments that deviate from the plan',()=>{
 for(const change of [n=>n.questions.at(-1).answer=n.questions.at(-2).answer,n=>n.days.at(-1).questionIds.reverse()]){const {next,report,plan}=fixture();change(next);assert.throws(()=>extension(old,next,report,plan));}
 const {next,report}=fixture();assert.throws(()=>extension(old,next,report),/random daily selection plan/);
});
