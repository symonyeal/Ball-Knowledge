// node tests/browser/repairs.cjs --playwright <module> --output <folder> [--channel msedge] [--url <url>]
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];};
const {chromium}=require(arg('--playwright')||'playwright');
const out=arg('--output');if(!out)throw Error('Pass --output.');
fs.mkdirSync(path.join(out,'runtime'),{recursive:true});process.env.TEMP=process.env.TMP=path.resolve(out,'runtime');
const base=arg('--url')||'http://127.0.0.1:8765/', KEY='football-era-lab-v2', checks=[];
const ready=async p=>{
 await p.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false'&&!document.querySelector('.loading'));
 if(await p.locator('#career-setup:not([open])').count())await p.click('#career-setup > summary');
 if(await p.locator('.career-hero').count())await p.click('[data-tab="market"]');
 await p.locator('.market-fallback').evaluateAll(Q=>Q.forEach(e=>e.open=true));
};
const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const sound=async(p,label='')=>{
 const bad=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth ? [] : [...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,15).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:innerWidth})));
 if(bad.length)await p.screenshot({path:path.join(out,'overflow.png'),fullPage:true});
 assert.deepEqual(bad,[],`no horizontal overflow ${label}`);
};
(async()=>{
 const b=await chromium.launch({headless:true,channel:arg('--channel')});
 try {
  for(const [kind,width,height] of [['desktop',1440,900],['mobile',390,844]]) {
   const ctx=await b.newContext({viewport:{width,height},reducedMotion:'reduce'}),p=await ctx.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));
   await ctx.route('https://www.wikidata.org/w/api.php?**',r=>r.fulfill({json:{entities:{}}}));
   await p.goto(base);await ready(p);
   if(kind==='desktop') {
    await p.waitForFunction(()=>[...document.querySelectorAll('.fans [data-portrait]')].every(e=>e.dataset.state==='ready'));
    assert.equal(await p.locator('.fans img').evaluateAll(Q=>Q.every(e=>e.naturalWidth>0)),true,'bundled real portraits load');
   }
   for(const D of [1950,1960,1970,1980,1990,2000,2010,2020]) {
    await p.click(`[data-era="${D}"]`);await p.fill('#seed','851');await p.click('#start-form button[type=submit]');await ready(p);
    for(let i=0;i<5;i++) {
     await p.locator(`.manager-name[data-inspect="${i}"]`).click();
     assert.match(await p.locator('#manager-preview .lbl').first().textContent(),new RegExp(`Option ${i+1}`));
     assert.equal(await p.locator('#manager-preview').evaluate(e=>document.activeElement===e),true,'preview receives focus');
     await sound(p,`${kind} ${D} manager ${i}`);
    }
    const header=p.locator('[data-manager-card="1"] .cn');await header.click();
    assert.equal(await p.locator('[data-manager-card="1"]').evaluate(e=>e.classList.contains('on')),true,'whole card previews');
    await p.selectOption('#start-formation','4-4-2');await p.click('[data-choose="1"]');await ready(p);
    assert.equal((await state(p)).f,'4-4-2');assert.equal((await state(p)).phase,'draft');
    await p.click('#reset-open');await p.click('#reset-confirm');await ready(p);
   }
   checks.push(`${kind}: real faces load; all five managers preview and choose in every decade`);
   // Enter a real, replay-valid career window via the game engine rather than inventing offers.
   await p.evaluate(async key=>{
    const D=await import('./app/draft.js'),C=await import('./app/career.js'),R=await import('./app/run.js'),{fields}=await import('./app/data.js'),g=await(await fetch('./data/game.json')).json();
    let d=D.choose(g,D.start(851,2000,false),0);
    for(let j=0;j<5;j++){d=D.spin(g,d);for(let k=0;k<3;k++)d=D.place(g,d,g.cards[d.combo].find(c=>D.can(g,d,c.p)).p,j*3+k);}
    d={...d,phase:'results'};let s={...C.careerStart(g,d),pat:20};s=C.careerPlayHalf(g,C.careerPlayHalf(g,s));
    if(s.ph!=='node')throw Error('Fixture did not reach a reward window');
    const run=R.runRound(g,fields(g),{...R.runNew(d.seed,d,'original'),pat:20});
    d.mode={career:s,run};localStorage.setItem(key,JSON.stringify(d));
   },KEY);
   await p.reload();await ready(p);await p.waitForSelector('[data-career-fa]');
   await p.click('[data-tab="more"]');
   assert.ok(await p.locator('[data-transfer-mode="run"]').count());
   const runPreview=p.locator('[data-transfer-mode="run"][data-transfer-preview]').first();
   const runJ=await runPreview.getAttribute('data-transfer-preview');
   await p.selectOption(`#fa-slot-${runJ}`,'14');
   assert.equal(await runPreview.locator('.transfer-pair').getAttribute('data-outgoing'),(await state(p)).mode.run.slots[14].p,'Gauntlet preview uses the Gauntlet squad alongside a career');
   await p.click('[data-tab="market"]');await ready(p);
   assert.ok(await p.locator('[data-transfer-mode="career"]').count());
   const j=await p.locator('[data-career-fa]').first().getAttribute('data-career-fa');
   const prior=await state(p);
   await p.selectOption(`#career-fa-${j}`,'1');await p.selectOption(`#career-out-${j}`,'12');
   const pair=p.locator(`[data-transfer-preview="${j}"][data-transfer-mode="career"] .transfer-pair`);
   assert.equal(await pair.getAttribute('data-outgoing'),prior.mode.career.slots[12].p);
   assert.match(await pair.textContent(),/Incoming/);assert.match(await pair.textContent(),/Outgoing/);
   assert.deepEqual(await state(p),prior,'preview changes do not commit transfers');
   await sound(p);await p.screenshot({path:path.join(out,`${kind}-transfer.png`),fullPage:true});
   await p.click(`[data-career-take="${j}"]`);await ready(p);
   const after=await state(p);assert.notEqual(after.mode.career.slots[12].p,prior.mode.career.slots[12].p);
   await p.reload();await ready(p);assert.deepEqual(await state(p),after,'the committed deal survives reload');
   checks.push(`${kind}: live signing/release cards follow selections; preview is pure; purchase persists`);
   assert.deepEqual(errors,[]);await ctx.close();
  }
  // Missing metadata, network failure and image failure all retain readable card content.
  const ctx=await b.newContext(),p=await ctx.newPage();
  await ctx.route('**/data/portraits.json',r=>r.fulfill({json:{}}));
  await ctx.route('https://www.wikidata.org/w/api.php?**',r=>r.fulfill({status:503,body:'unavailable'}));
  await p.goto(base);await ready(p);
  await p.waitForFunction(()=>[...document.querySelectorAll('.fans [data-portrait]')].every(e=>e.dataset.state==='missing'));
  assert.equal(await p.locator('.fans .portrait-fallback').first().isVisible(),true);
  await p.click('#start-form button[type=submit]');await ready(p);assert.equal(await p.locator('[data-manager]').count(),5);
  checks.push('offline photo fallback leaves the game playable');await ctx.close();
  const imageCtx=await b.newContext(),imagePage=await imageCtx.newPage();
  await imageCtx.route('**/data/portraits/*.jpg',r=>r.fulfill({status:200,body:'invalid image'}));
  await imageCtx.route('https://www.wikidata.org/w/api.php?**',r=>r.fulfill({json:{entities:{}}}));
  await imagePage.goto(base);await ready(imagePage);
  await imagePage.waitForFunction(()=>[...document.querySelectorAll('.fans [data-portrait]')].every(e=>e.dataset.state==='missing'));
  assert.equal(await imagePage.locator('.fans .portrait-fallback').first().isVisible(),true);
  checks.push('failed image decoding retains the silhouette and card name');await imageCtx.close();
  fs.writeFileSync(path.join(out,'repairs.json'),JSON.stringify({passed:true,checks},null,2));console.log('PASSED',checks);
 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
