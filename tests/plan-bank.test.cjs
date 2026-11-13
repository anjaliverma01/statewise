'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {POLICY,planRefill}=require('../scripts/plan-bank.cjs');
const bank=JSON.parse(fs.readFileSync(path.join(__dirname,'../questions.json')));
const names=JSON.parse(fs.readFileSync(path.join(__dirname,'../india.geojson'))).features.map(f=>f.properties.name);
test('plans twelve consecutive days with three distinct valid answers per day',()=>{
 const before=JSON.stringify(bank),plan=planRefill(bank,names);assert.equal(plan.selectionPolicy,POLICY);assert.equal(plan.days.length,12);
 let previous=bank.days.at(-1).date;
 for(const day of plan.days){assert.equal(day.date,new Date(Date.parse(previous+'T12:00:00Z')+86400000).toISOString().slice(0,10));assert.equal(day.answers.length,3);assert.equal(new Set(day.answers).size,3);assert(day.answers.every(name=>names.includes(name)));previous=day.date;}
 assert.equal(JSON.stringify(bank),before);
});
test('each day starts with all regions even if yesterday selected the same three',()=>{
 const calls=[],plan=planRefill(bank,names,12,(min,max)=>{calls.push([min,max]);return min;});
 assert(plan.days.every(day=>JSON.stringify(day.answers)===JSON.stringify(names.slice(0,3))));
 assert.deepEqual(calls,Array.from({length:12},()=>[[0,36],[1,36],[2,36]]).flat());
});
test('every map region is eligible, including all of the last published day’s answers',()=>{
 for(let first=0;first<names.length;first++){const plan=planRefill(bank,names,1,min=>min===0?first:min);assert.equal(plan.days[0].answers[0],names[first]);}
 const previous=bank.days.at(-1).questionIds.map(id=>bank.questions.find(q=>q.id===id).answer);
 const ordered=[...previous,...names.filter(name=>!previous.includes(name))];
 assert.deepEqual(planRefill(bank,ordered,1,min=>min).days[0].answers,previous);
});
