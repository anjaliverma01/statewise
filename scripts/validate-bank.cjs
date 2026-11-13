'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const base=fs.existsSync(path.join(root,'questions.json'))?root:path.join(root,'dist');
const core=require(path.join(base,'game-core.js')),bank=JSON.parse(fs.readFileSync(process.argv[2]||path.join(base,'questions.json'),'utf8')),map=JSON.parse(fs.readFileSync(path.join(base,'india.geojson'),'utf8'));
const regions=new Set(map.features.map(f=>f.properties.name));core.validateBank(bank,regions);
for(const q of bank.questions)for(const clue of q.clues)assert(!core.clueNamesRegion(clue,regions),'Clue gives away a region name: '+q.id+' / '+clue.title);
assert.equal(bank.questions.length%36,0,'Publish complete batches of 36 question sets');
if(process.argv[3]){const previous=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));for(const old of previous.questions){const next=bank.questions.find(q=>q.id===old.id);assert(next,'Never remove an existing question');assert.equal(next.answer,old.answer,'Never change an existing answer');assert.deepEqual(next.clues.map(c=>[c.title,c.text,c.factKey]),old.clues.map(c=>[c.title,c.text,c.factKey]),'Previously published clue facts and wording are immutable');}for(const old of previous.days)assert.deepEqual(bank.days.find(d=>d.date===old.date),old,'Do not change existing daily assignments');}
console.log(`Valid: ${bank.questions.length} question sets, ${bank.questions.length*3} unique clue facts, ${bank.days.length} scheduled days; three distinct answers per day.`);
