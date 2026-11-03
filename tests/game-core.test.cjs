'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),base=fs.existsSync(path.join(root,'questions.json'))?root:path.join(root,'dist'),core=require(path.join(base,'game-core.js'));
const bank=JSON.parse(fs.readFileSync(path.join(base,'questions.json'))),regions=new Set(JSON.parse(fs.readFileSync(path.join(base,'india.geojson'))).features.map(f=>f.properties.name));
const clone=()=>JSON.parse(JSON.stringify(bank));
test('clue titles and text contain no region names or revealing derivatives',()=>{
 for(const q of bank.questions)for(const clue of q.clues)assert.equal(core.clueNamesRegion(clue,regions),false,q.id+' / '+clue.title);
 for(const name of ['Kashmir stag','Kashmiri stag','Manipuri','Odissi','Pondicherry','Diu Fort','Madhya Pradesh'])assert(core.clueNamesRegion({title:name,text:'A clue'},regions),name);
 assert.equal(core.clueNamesRegion({title:'Stone that seems to sing',text:'Vijayanagara and Kila Raipur'},regions),false);
});
test('bank covers all 36 regions with 108 unique facts and 12 non-repeating days',()=>{assert(core.validateBank(bank,regions));assert.equal(new Set(bank.questions.map(q=>q.answer)).size,36);assert(bank.days.length>=12);assert.equal(bank.questions.length%36,0);assert.equal(new Set(bank.days.flatMap(d=>d.questionIds)).size,bank.days.length*3);});
test('daily selection is stable, has three distinct regions and never cycles after expiry',()=>{for(const day of bank.days){assert.deepEqual(core.dailyQuestions(bank,day.date).map(q=>q.id),day.questionIds);assert.equal(new Set(core.dailyQuestions(bank,day.date).map(q=>q.answer)).size,3);}assert.deepEqual(core.dailyQuestions(bank,'2030-01-01'),[]);});
test('reject duplicate fact IDs even when the question has been reworded',()=>{const b=clone();b.questions[1].clues[0].factKey=b.questions[0].clues[0].factKey;assert.throws(()=>core.validateBank(b,regions),/Duplicate/);});
test('reject duplicate text and daily question reuse',()=>{const b=clone();b.questions[1].clues[0].text=b.questions[0].clues[0].text;assert.throws(()=>core.validateBank(b,regions),/Duplicate/);const c=clone();c.days[1].questionIds[0]=c.days[0].questionIds[0];assert.throws(()=>core.validateBank(c,regions),/reused/);});
test('reject gaps and insecure source links',()=>{const b=clone();b.days.splice(1,1);assert.throws(()=>core.validateBank(b,regions),/gap/);const c=clone();c.questions[0].sources[0].url='http://example.com';assert.throws(()=>core.validateBank(c,regions),/HTTPS/);});
test('scoring is 500, 300, 100 with a maximum of 1500',()=>{assert.deepEqual(core.POINTS,[500,300,100]);assert.equal(core.totalScore([{score:500},{score:500},{score:500}]),1500);assert.equal(core.totalScore([{score:500},{score:300},{score:100}]),900);});
test('clock derives from the fixed deadline, including after a reload',()=>{const q=core.dailyQuestions(bank,bank.days[0].date),p=core.freshProgress(bank.days[0].date,q);p.started=true;p.deadline=121000;p.level=1;const restored=core.restoreProgress(JSON.stringify(p),p.date,q);assert.equal(restored.deadline,121000);assert.equal(core.remainingSeconds(restored.deadline,61000),60);assert.equal(core.remainingSeconds(restored.deadline,122000),0);});
test('new date resets progress, invalid or corrupted scores are discarded',()=>{const day=bank.days[0],q=core.dailyQuestions(bank,day.date),p=core.freshProgress(day.date,q);p.results=[{id:q[0].id,score:999,won:true,timedOut:false,level:0,guesses:[]}];assert.deepEqual(core.restoreProgress(JSON.stringify(p),day.date,q),core.freshProgress(day.date,q));assert.deepEqual(core.restoreProgress('invalid JSON',day.date,q),core.freshProgress(day.date,q));assert.deepEqual(core.restoreProgress(JSON.stringify(p),'2027-01-01',q),core.freshProgress('2027-01-01',q));});

test('the daily date switches exactly at midnight IST, including month and year boundaries',()=>{
 for(const [before,after,oldDay,newDay] of [
  ['2026-11-03T18:29:59.999Z','2026-11-03T18:30:00.000Z','2026-11-03','2026-11-04'],
  ['2026-12-31T18:29:59.999Z','2026-12-31T18:30:00.000Z','2026-12-31','2027-01-01'],
  ['2028-02-29T18:29:59.999Z','2028-02-29T18:30:00.000Z','2028-02-29','2028-03-01']
 ]){assert.equal(core.dateKey(new Date(before)),oldDay);assert.equal(core.dateKey(new Date(after)),newDay);assert.equal(core.millisecondsUntilNextDay(Date.parse(before)),1);assert.equal(core.millisecondsUntilNextDay(Date.parse(after)),86400000);}
});
test('IST day selection is identical in different device timezones',()=>{
 const previousTimezone=process.env.TZ;
 try{for(const tz of ['UTC','Asia/Kolkata','America/Los_Angeles','Pacific/Auckland']){process.env.TZ=tz;assert.equal(core.dateKey(new Date('2026-11-03T18:30:00Z')),'2026-11-04',tz);}}
 finally{if(previousTimezone===undefined)delete process.env.TZ;else process.env.TZ=previousTimezone;}
});
test('the next IST day chooses fresh mysteries and resets saved progress',()=>{
 const before=core.dateKey(new Date('2026-11-03T18:29:59Z')),after=core.dateKey(new Date('2026-11-03T18:30:00Z'));
 const old=core.dailyQuestions(bank,before),next=core.dailyQuestions(bank,after);assert.equal(old.length,3);assert.equal(next.length,3);assert.notDeepEqual(old.map(q=>q.id),next.map(q=>q.id));
 const saved=core.freshProgress(before,old);saved.started=true;saved.deadline=Date.parse('2026-11-03T18:31:00Z');assert.deepEqual(core.restoreProgress(JSON.stringify(saved),after,next),core.freshProgress(after,next));
 const invalid=clone();invalid.scheduleTimezone='player-local';assert.throws(()=>core.validateBank(invalid,regions),/Asia\/Kolkata/);
});
