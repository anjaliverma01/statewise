'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const root=require('node:path').resolve(__dirname,'..');
const bank=()=>read(root+'/questions.json');
function horizon(b,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const futureDays=b.days.filter(d=>d.date>today).length;
 return {today,futureDays,needed:futureDays<=5,lastDate:b.days.at(-1).date};
}
async function securePage(url){
 for(let redirects=0;redirects<8;redirects++){
  assert.equal(new URL(url).protocol,'https:','HTTPS required at every redirect');
  const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  if([301,302,303,307,308].includes(r.status)){url=new URL(r.headers.get('location'),url).href;await r.body?.cancel();continue;}
  assert(r.ok,`Source failed (${r.status}): ${url}`);await r.body?.cancel();return;
 }throw Error('Too many redirects: '+url);
}
function extension(previous,next,report){
 assert.equal(next.questions.length,previous.questions.length+36);
 assert.equal(next.days.length,previous.days.length+12);
 assert.notEqual(next.bankVersion,previous.bankVersion);
 for(const key of Object.keys(previous))if(!['questions','days','bankVersion'].includes(key))assert.deepEqual(next[key],previous[key],key+' is immutable');
 assert.deepEqual(next.questions.slice(0,previous.questions.length),previous.questions,'Historical questions are immutable');
 assert.deepEqual(next.days.slice(0,previous.days.length),previous.days,'Historical schedule is immutable');
 const added=next.questions.slice(previous.questions.length),byId=new Map(added.map(q=>[q.id,q]));
 const assigned=next.days.slice(previous.days.length).flatMap(d=>d.questionIds);
 assert.deepEqual([...assigned].sort(),[...byId.keys()].sort(),'Schedule each new question once');
 let date=previous.days.at(-1).date;
 const previousAnswers=new Set(previous.days.at(-1).questionIds.map(id=>previous.questions.find(q=>q.id===id).answer));
 for(const [i,day] of next.days.slice(previous.days.length).entries()){
  const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);date=d.toISOString().slice(0,10);assert.equal(day.date,date);
  const qs=day.questionIds.map(id=>byId.get(id));assert.equal(new Set(qs.map(q=>q.group)).size,3,'Mix three geographic groups');
  if(i===0)assert(qs.every(q=>!previousAnswers.has(q.answer)),'Avoid cycle-boundary answer repeats');
 }
 assert.equal(report.semanticReviewPassed,true);assert.equal(report.clues.length,108);assert.equal(report.takeaways.length,36);
 const facts=new Set();for(const c of report.clues){const q=byId.get(c.questionId);assert(q);const clue=q.clues.find(x=>x.factKey===c.factKey);assert(clue);assert.equal(c.source,clue.source);assert(!facts.has(c.factKey));facts.add(c.factKey);assert(c.evidence?.trim()&&c.novelty?.trim());}
 const takeaways=new Set();for(const t of report.takeaways){assert(byId.has(t.questionId));assert(!takeaways.has(t.questionId));takeaways.add(t.questionId);assert(t.evidence?.trim());assert(byId.get(t.questionId).sources.some(s=>s.url===t.source));}
 return [...new Set(added.flatMap(q=>[...q.clues.map(c=>c.source),...q.sources.map(s=>s.url)]))];
}
async function main(){
 const mode=process.argv[2];
 if(mode==='horizon'){const h=horizon(bank());console.log('needed='+h.needed);console.error(JSON.stringify(h));return;}
 if(mode==='candidate'){const next=read(process.argv[3]),report=read(process.argv[4]),urls=extension(bank(),next,report);for(const url of urls)await securePage(url);console.log('Append-only batch, report, geographic mix and '+urls.length+' HTTPS sources verified.');return;}
 if(mode==='live'){
  const expected=bank(),sha=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  for(let attempt=0;attempt<60;attempt++){
   try{const build=JSON.parse(cp.execFileSync('gh',['api','repos/'+process.env.GITHUB_REPOSITORY+'/pages/builds/latest'],{encoding:'utf8'}));
    if(build.commit===sha&&build.status==='errored')throw Error('Pages build failed: '+JSON.stringify(build.error));
    if(build.commit===sha&&build.status==='built'){const r=await fetch('https://anjaliverma01.github.io/statewise/questions.json?revision='+sha,{signal:AbortSignal.timeout(30000)});assert(r.ok);assert.deepEqual(await r.json(),expected);console.log('Pages build and live bank verified: '+sha);return;}
   }catch(e){if(attempt===59||e.message.startsWith('Pages build failed'))throw e;}
   await new Promise(resolve=>setTimeout(resolve,15000));
  }throw Error('Timed out waiting for the committed bank on Pages');
 }
 throw Error('Use horizon, candidate or live');
}
module.exports={horizon,extension,securePage};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
