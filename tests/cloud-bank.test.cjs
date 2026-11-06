'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {horizon,extension}=require('../scripts/cloud-bank.cjs');
const old=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,'../questions.json')));
function fixture(){
 const next=structuredClone(old);next.bankVersion='test';
 const added=old.questions.map(q=>({...structuredClone(q),id:q.id+'-test',clues:q.clues.map(c=>({...c,factKey:c.factKey+'-test'}))}));next.questions.push(...added);
 const groups=new Map();for(const q of added){if(!groups.has(q.group))groups.set(q.group,[]);groups.get(q.group).push(q);}
 const previous=new Set(old.days.at(-1).questionIds.map(id=>old.questions.find(q=>q.id===id).answer));
 let date=old.days.at(-1).date;
 for(let i=0;i<12;i++){
  const pools=[...groups.values()].filter(p=>p.length).sort((a,b)=>b.length-a.length).slice(0,3);
  const qs=pools.map(pool=>pool.splice(i===0?pool.findIndex(q=>!previous.has(q.answer)):0,1)[0]);
  const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);date=d.toISOString().slice(0,10);next.days.push({date,questionIds:qs.map(q=>q.id)});
 }
 const report={semanticReviewPassed:true,clues:added.flatMap(q=>q.clues.map(c=>({questionId:q.id,factKey:c.factKey,source:c.source,evidence:'Test evidence',novelty:'Test novelty'}))),takeaways:added.map(q=>({questionId:q.id,source:q.sources[0].url,evidence:'Test evidence'}))};
 return {next,report};
}
test('horizon uses New York date and triggers at five future days',()=>{
 const b={days:[{date:'2026-11-05'},...Array.from({length:5},(_,i)=>({date:'2026-11-'+String(6+i).padStart(2,'0')}))]};
 assert.deepEqual(horizon(b,new Date('2026-11-06T03:00:00Z')),{today:'2026-11-05',futureDays:5,needed:true,lastDate:'2026-11-10'});
 b.days.push({date:'2026-11-11'});assert.equal(horizon(b,new Date('2026-11-06T03:00:00Z')).needed,false);
});
test('accepts a complete extension with evidence for every clue and takeaway',()=>{const {next,report}=fixture();assert(extension(old,next,report).length>0);});
test('rejects edits to historical objects and retired facts',()=>{
 for(const change of [b=>b.questions[0].takeaway='Changed',b=>b.retiredFacts=[]]){const {next,report}=fixture();change(next);assert.throws(()=>extension(old,next,report));}
});
test('rejects partial batches, schedule gaps, incomplete evidence and failed semantic review',()=>{
 for(const change of [(n,r)=>n.questions.pop(),(n,r)=>n.days.at(-1).date='2030-01-01',(n,r)=>r.clues.pop(),(n,r)=>r.semanticReviewPassed=false,(n,r)=>r.takeaways[0].evidence='']){
  const {next,report}=fixture();change(next,report);assert.throws(()=>extension(old,next,report));
 }
});
