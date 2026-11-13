'use strict';
const assert=require('node:assert/strict'),{randomInt}=require('node:crypto');
const POLICY='independent-uniform-daily-v1';
function nextDate(date){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function planRefill(bank,regionNames,dayCount=12,draw=randomInt){
 const regions=[...new Set(regionNames)];assert(regions.length>=3,'Need at least three regions');
 assert(Number.isInteger(dayCount)&&dayCount>0,'Need a positive number of days');
 let date=bank.days.map(d=>d.date).sort().at(-1);assert(date,'Need an existing schedule');
 const days=[];
 for(let day=0;day<dayCount;day++){
  // Partial Fisher-Yates: uniform ordered sampling without replacement for this day.
  // Start with all regions again tomorrow; history, groups and coverage never filter it.
  const pool=[...regions];
  for(let i=0;i<3;i++){const j=draw(i,pool.length);assert(Number.isInteger(j)&&j>=i&&j<pool.length,'Invalid random draw');[pool[i],pool[j]]=[pool[j],pool[i]];}
  date=nextDate(date);days.push({date,answers:pool.slice(0,3)});
 }
 return {selectionPolicy:POLICY,days};
}
module.exports={POLICY,planRefill,nextDate};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
 const bank=JSON.parse(fs.readFileSync(process.argv[2]||path.join(root,'questions.json'),'utf8'));
 const names=JSON.parse(fs.readFileSync(path.join(root,'india.geojson'),'utf8')).features.map(f=>f.properties.name);
 console.log(JSON.stringify(planRefill(bank,names),null,2));
}
