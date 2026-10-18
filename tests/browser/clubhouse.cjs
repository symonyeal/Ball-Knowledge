// node tests/browser/clubhouse.cjs --playwright <module> --output <folder> [--channel msedge]
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];};
const {chromium}=require(arg('--playwright')||'playwright');
const out=arg('--output');if(!out)throw Error('Pass --output for screenshots and results.');fs.mkdirSync(out,{recursive:true});
const KEY='football-era-draft-profile-v1', checks=[],errors=[];
const ok=n=>{checks.push(n);console.log('ok',n);};
const ready=p=>p.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false');
const profile=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const section=async(p,name)=>{await p.click(`#clubhouse [data-club-page="${name}"]`);};
const sound=async p=>{
  const x=await p.evaluate(()=>{const d=document.querySelector('#clubhouse'),r=d.getBoundingClientRect();return {w:innerWidth,right:r.right,left:r.left,overflow:document.documentElement.scrollWidth>innerWidth,ids:[...document.querySelectorAll('[id]')].map(e=>e.id)};});
  assert.ok(x.left>=0&&x.right<=x.w+1);assert.equal(x.overflow,false);assert.equal(new Set(x.ids).size,x.ids.length);
};
(async()=>{
  const b=await chromium.launch({headless:true,channel:arg('--channel')});
  try{
    for(const [kind,width,height] of [['desktop',1440,900],['mobile',390,844]]){
      const ctx=await b.newContext({viewport:{width,height},acceptDownloads:true,timezoneId:'America/Vancouver'}),p=await ctx.newPage();
      p.on('pageerror',e=>errors.push(e.message));
      await p.goto(arg('--url')||'http://127.0.0.1:8765/');await ready(p);
      await p.click('.bar [data-club-open]');await p.locator('#clubhouse').waitFor({state:'visible'});
      for(const name of ['home','database','stats','records','achievements','collection','minis','weekly','settings','sbc','sandbox']){await section(p,name);await sound(p);assert.ok(await p.locator('#clubhouse-title').textContent());}
      ok(`${kind}: every section opens without overflow or duplicate IDs`);
      await section(p,'database');await p.fill('#archive-query','messi');assert.ok(await p.locator('.club-table tbody tr').count());
      await p.locator('[data-archive-inspect]').first().click();assert.match(await p.locator('.club-detail').textContent(),/Messi/);
      await p.locator('[data-pin]').first().click();assert.ok(await p.locator('.club-comparison').count());
      await p.selectOption('#archive-D','2010');assert.ok((await p.locator('.club-table tbody tr').allTextContents()).every(s=>s.includes('2010s')));
      await p.click('#archive-clear');await p.click('#archive-next');assert.ok(await p.locator('#archive-prev').isEnabled());ok(`${kind}: archive search, filters, card details, comparison and pagination`);
      await section(p,'sandbox');await p.click('#sandbox-fill');assert.ok(await p.locator('#sandbox-play').isEnabled());
      const s=(await profile(p)).sandbox;assert.equal(new Set(s.slots.map(c=>c.p)).size,15);
      await p.selectOption('#sandbox-f','4-4-2');assert.deepEqual((await profile(p)).sandbox.slots.map(c=>c.p).sort(),s.slots.map(c=>c.p).sort());
      await p.selectOption('#sandbox-D','1980');await p.click('#sandbox-play');await p.locator('.club-result').waitFor();assert.equal(await p.locator('.club-result tbody tr').count(),20);
      assert.equal((await profile(p)).events.length,0);assert.equal((await profile(p)).sandboxRecords.length,1);
      await p.screenshot({path:path.join(out,`${kind}-sandbox.png`)});
      const d=await Promise.all([p.waitForEvent('download'),p.click('#sandbox-export')]);const file=await d[0].path();assert.equal(JSON.parse(fs.readFileSync(file)).sandbox.slots.length,15);
      await p.click('#sandbox-clear');await p.setInputFiles('#sandbox-import',file);await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).sandbox.slots.every(Boolean),KEY);ok(`${kind}: sandbox formation, simulation, separate records and squad round trip`);
      await section(p,'sbc');assert.equal(await p.locator('.challenge-card').count(),11);await sound(p);
      await p.locator('[data-sbc-build="first"]').click();await p.locator('.sbc-panel').waitFor();assert.equal(await p.locator('.sbc-panel li').count(),2);
      assert.equal(await p.locator('#sbc-submit').isEnabled(),await p.locator('.sbc-panel li.no').count()===0);
      await p.click('#sbc-leave');assert.equal(await p.locator('.sbc-panel').count(),0);assert.equal((await profile(p)).events.length,0);ok(`${kind}: squad challenges list, requirement panel and submission state`);
      await section(p,'minis');await p.click('[data-mini-start="card"]');let P=await profile(p), key=Object.keys(P.sessions).find(k=>k.endsWith(':card:daily')), target=P.sessions[key].target;
      const label=await p.evaluate(async id=>{const g=await(await fetch('./data/game.json')).json();return g.people[id.split('/')[1]].nm;},target);
      await p.fill('#mini-query',label);const guess=p.locator(`[data-archive-guess="${target}"]`);
      // Search results are rating ordered; narrow by the target's club when a player has many cards.
      if(!await guess.count()){const club=await p.evaluate(async id=>{const g=await(await fetch('./data/game.json')).json();return g.clubs[id.split(':')[0]].nm;},target);await p.fill('#mini-query',`${label} ${club}`);}
      if(!await guess.count())throw Error('Exact target should be reachable in the card guess search.');
      await guess.click();assert.match(await p.locator('.club-result').textContent(),/Puzzle won/);
      await p.reload();await ready(p);await p.click('.bar [data-club-open]');await section(p,'minis');await p.click('[data-mini-start="card"]');assert.match(await p.locator('.club-result').textContent(),/Puzzle won/);ok(`${kind}: daily result survives reload and cannot be played again`);
      await p.click('#minis-back');await p.click('[data-mini-start="higher"]');
      P=await profile(p);key=Object.keys(P.sessions).find(k=>k.endsWith(':higher:daily'));
      const correct=await p.evaluate(async x=>{const g=await(await fetch('./data/game.json')).json();const r=id=>{const[k,p]=id.split('/');return g.cards[k].find(c=>c.p===p).r;};return r(x[0])>=r(x[1])?0:1;},P.sessions[key].pairs[0]);
      await p.click(`[data-higher="${correct}"]`);assert.match(await p.locator('.club-content').textContent(),/Round 2/);ok(`${kind}: higher/lower advances using the actual card ratings`);
      await p.click('#minis-back');await p.click('[data-mini-start="career"]');assert.equal(await p.locator('[data-trail]').count()>0,true);await p.locator('[data-trail]').first().check();await p.click('#trail-submit');assert.match(await p.locator('.club-content').textContent(),/Round 2/);ok(`${kind}: career trail accepts a round and shows its answer`);
      await p.click('#minis-back');await p.click('[data-mini-start="roster"]');P=await profile(p);key=Object.keys(P.sessions).find(k=>k.endsWith(':roster:daily'));
      const names=await p.evaluate(async k=>{const g=await(await fetch('./data/game.json')).json();return g.cards[k].slice(0,5).map(c=>g.people[c.p].nm);},P.sessions[key].club);
      for(const name of names){await p.fill('#recall-name',name);await p.locator('#recall-form button[type=submit]').click();}
      await p.click('#recall-finish');assert.match(await p.locator('.club-result').textContent(),/Puzzle won/);ok(`${kind}: timed squad recall scores five distinct names`);
      await p.click('#minis-back');await p.click('[data-mini-mode="practice"]');await p.click('[data-mini-start="card"]');assert.match(await p.locator('.club-content').textContent(),/Practice/);ok(`${kind}: unlimited practice has its own session`);
      await section(p,'settings');await p.selectOption('#setting-theme','light');await p.uncheck('#setting-effects');await p.check('#setting-compact');await p.selectOption('#setting-sort','name');await p.selectOption('#setting-backdrop','plain');
      await p.click('#ambience-play');assert.equal((await profile(p)).settings.volume,20);await p.click('#ambience-mute');assert.equal((await profile(p)).settings.volume,0);
      await sound(p);await p.screenshot({path:path.join(out,`${kind}-settings.png`)});
      const exported=await Promise.all([p.waitForEvent('download'),p.click('#profile-export')]);const backup=await exported[0].path();
      await p.selectOption('#setting-theme','dark');await p.setInputFiles('#profile-import',backup);await p.waitForFunction(()=>document.body.dataset.theme==='light');assert.equal((await profile(p)).settings.sort,'name');
      await p.setInputFiles('#profile-import',{name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"profile":{"v":9}}')});assert.equal((await profile(p)).v,1);
      ok(`${kind}: settings persist, backup imports and malformed import preserves progress`);
      await section(p,'weekly');await p.locator('[data-week="1"]').click();await ready(p);assert.equal(await p.locator('#clubhouse').isVisible(),false);assert.ok(await p.locator('[data-manager]').count());
      const draft=await p.evaluate(()=>JSON.parse(localStorage.getItem('football-era-lab-v2')));assert.ok(draft.wk);assert.equal(draft.cap,true);ok(`${kind}: archived weekly challenge starts the existing draft`);
      await p.screenshot({path:path.join(out,`${kind}-weekly.png`)});
      await p.evaluate(k=>localStorage.setItem(k,'corrupted-profile'),KEY);await p.reload();await ready(p);await p.click('.bar [data-club-open]');await section(p,'settings');await p.selectOption('#setting-theme','light');
      assert.equal(await p.evaluate(k=>localStorage.getItem(k),KEY),'corrupted-profile');
      ok(`${kind}: an unreadable stored profile is preserved for recovery`);
      await ctx.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'clubhouse.json'),JSON.stringify({checks,errors},null,2));console.log(`${checks.length} browser checks passed`);
  }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
