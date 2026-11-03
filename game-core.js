(function(root){
'use strict';
const POINTS=[500,300,100],SCHEMA_VERSION=1,DAILY_TIME_ZONE='Asia/Kolkata',IST_OFFSET_MS=330*60*1000;
// Modern IST is UTC+05:30 throughout the year, independent of the device timezone.
function dateKey(date=new Date()){return new Date(date.getTime()+IST_OFFSET_MS).toISOString().slice(0,10);}
function millisecondsUntilNextDay(now=Date.now()){const [year,month,day]=dateKey(new Date(now)).split('-').map(Number);return Date.UTC(year,month-1,day+1)-IST_OFFSET_MS-now;}
function normalize(text){return text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function clueNamesRegion(clue,regionNames){
 const aliases=[...regionNames,'Kashmir','Kashmiri','Jammu','Dadra','Nagar Haveli','Daman','Diu','Pondicherry','Orissa','Odissi','Manipuri','Tamil','Bengal','Bengali','Naga','Assamese','Punjabi','Gujarati','Rajasthani','Bihari','Goan','Keralite','Sikkimese'];
 const text=' '+normalize(clue.title+' '+clue.text)+' ';
 return aliases.some(name=>text.includes(' '+normalize(name)+' '));
}
function validateBank(bank,regionNames){
 if(bank.scheduleTimezone!==DAILY_TIME_ZONE)throw Error('Daily schedule must use Asia/Kolkata');
 if(bank.schemaVersion!==SCHEMA_VERSION||!Array.isArray(bank.questions)||!Array.isArray(bank.days))throw Error('Unsupported question bank');
 const ids=new Set(),facts=new Set((bank.retiredFacts||[]).map(c=>c.factKey)),texts=new Set((bank.retiredFacts||[]).map(c=>normalize(c.text))),used=new Set(),dates=new Set();
 for(const q of bank.questions){
  if(!q.id||ids.has(q.id)||!regionNames.has(q.answer)||q.clues?.length!==3||!q.takeaway||!q.sources?.length)throw Error('Invalid or duplicate question: '+q.id);
  ids.add(q.id);
  for(const c of q.clues){const t=normalize(c.text);if(!c.title||!c.factKey||facts.has(c.factKey)||texts.has(t)||!c.source?.startsWith('https://'))throw Error('Duplicate or invalid clue: '+q.id);facts.add(c.factKey);texts.add(t);}
  if(q.sources.some(s=>!s.label||!s.url.startsWith('https://')))throw Error('Source must use HTTPS');
 }
 const sorted=[...bank.days].sort((a,b)=>a.date.localeCompare(b.date));
 for(let i=0;i<sorted.length;i++){
  const day=sorted[i];if(!/^\d{4}-\d{2}-\d{2}$/.test(day.date)||dates.has(day.date)||day.questionIds?.length!==3)throw Error('Invalid daily set');dates.add(day.date);
  const answers=new Set();for(const id of day.questionIds){if(!ids.has(id)||used.has(id))throw Error('Daily question reused: '+id);used.add(id);answers.add(bank.questions.find(q=>q.id===id).answer);}if(answers.size!==3)throw Error('Daily places must be different');
  if(i>0){const prev=new Date(sorted[i-1].date+'T12:00:00Z');prev.setUTCDate(prev.getUTCDate()+1);if(prev.toISOString().slice(0,10)!==day.date)throw Error('Schedule has a date gap');}
 }
 return true;
}
function dailyQuestions(bank,key){const day=bank.days.find(d=>d.date===key);return day?day.questionIds.map(id=>bank.questions.find(q=>q.id===id)):[];}
function freshProgress(key,questions){return {version:1,date:key,ids:questions.map(q=>q.id),index:0,level:0,started:false,deadline:0,selected:'',attempts:[],results:[]};}
function restoreProgress(raw,key,questions){
 const fresh=freshProgress(key,questions);if(!raw)return fresh;
 try{const p=JSON.parse(raw);if(p.version!==1||p.date!==key||JSON.stringify(p.ids)!==JSON.stringify(fresh.ids)||!Number.isInteger(p.index)||p.index<0||p.index>2||!Number.isInteger(p.level)||p.level<0||p.level>2||typeof p.started!=='boolean'||!Number.isFinite(p.deadline)||p.deadline<0||(p.started&&p.deadline===0)||typeof p.selected!=='string'||!Array.isArray(p.attempts)||p.attempts.length>3||p.attempts.some(a=>typeof a!=='string')||!Array.isArray(p.results)||p.results.length<p.index||p.results.length>p.index+1)return fresh;
 for(let i=0;i<p.results.length;i++){const r=p.results[i];if(r.id!==fresh.ids[i]||!Number.isInteger(r.level)||r.level<0||r.level>2||typeof r.won!=='boolean'||typeof r.timedOut!=='boolean'||r.score!==(r.won?POINTS[r.level]:0)||!Array.isArray(r.guesses))return fresh;}
 return p;}catch{return fresh;}
}
function remainingSeconds(deadline,now=Date.now()){return Math.max(0,Math.ceil((deadline-now)/1000));}
function totalScore(results){return results.reduce((n,r)=>n+r.score,0);}
const api={POINTS,DAILY_TIME_ZONE,dateKey,millisecondsUntilNextDay,normalize,clueNamesRegion,validateBank,dailyQuestions,freshProgress,restoreProgress,remainingSeconds,totalScore};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StatewiseCore=api;
})(typeof window!=='undefined'?window:globalThis);
