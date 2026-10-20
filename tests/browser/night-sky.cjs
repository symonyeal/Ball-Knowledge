// Exercise the new menus, position-first selection, and saved-result playback on desktop and phone.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const arg=k=>{const i=process.argv.indexOf(k);return i<0?undefined:process.argv[i+1];};
const {chromium}=require(arg('--playwright')||'playwright'),out=arg('--output'),base=arg('--url');
fs.mkdirSync(path.join(out,'runtime'),{recursive:true});process.env.TEMP=process.env.TMP=path.resolve(out,'runtime');
const KEY='football-era-lab-v2',checks=[];
const ready=p=>p.waitForFunction(()=>document.body.getAttribute('aria-busy')==='false'&&!document.querySelector('.loading'));
const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
const sound=async p=>{const bad=await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth?[]:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:String(e.className),right:e.getBoundingClientRect().right})).slice(0,15));assert.deepEqual(bad,[],'no horizontal page scroll');};
(async()=>{
 const b=await chromium.launch({headless:true,channel:arg('--channel')});
 try {
 for(const [kind,width,height] of [['desktop',1440,900],['mobile',390,844]]) {
  const ctx=await b.newContext({viewport:{width,height}}),p=await ctx.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await ctx.route('https://www.wikidata.org/w/api.php?**',r=>r.fulfill({json:{entities:{}}}));
  const shot=async name=>{await sound(p);await p.screenshot({path:path.join(out,`${kind}-${name}.png`),fullPage:true});};
  await p.goto(base);await ready(p);await p.evaluate(()=>localStorage.clear());await p.reload();await ready(p);
  assert.equal(await p.locator('.mode-menu .mode-tile').count(),4);
  assert.equal(await p.locator('#career-setup').getAttribute('open'),null);
  await p.waitForTimeout(500);await shot('01-modes');
  await p.click('#mode-career');await p.fill('#seed','851');await p.click('[data-era="2000"]');
  assert.equal(await p.locator('#career-setup').getAttribute('open'),'');
  await p.click('#start-form button[type=submit]');await ready(p);await shot('02-managers');
  await p.click('[data-manager="0"]');await ready(p);await p.click('#squad-spin');await ready(p);
  await p.waitForTimeout(2800);
  if(kind==='mobile')await p.click('[data-view="lineup"]');
  const before=await state(p);await p.click('#pitch [data-slot="0"]');await ready(p);
  assert.ok(await p.locator('.position-filter').count());
  const ids=await p.locator('#roster-list [data-player]').evaluateAll(Q=>Q.map(x=>x.dataset.player));
  assert.ok(ids.length);
  assert.equal(await p.evaluate(async ids=>{const D=await import('./app/draft.js'),E=await import('./app/engine/index.js'),g=await(await fetch('./data/game.json')).json(),s=JSON.parse(localStorage.getItem('football-era-lab-v2'));return ids.every(p=>D.hydrate(g,{k:s.combo,p}).pos.includes('GK')&&E.ft(D.hydrate(g,{k:s.combo,p}),'GK').f<.25);},ids),true,'the GK shortlist lists keepers only');
  assert.deepEqual(await state(p),before,'shortlisting does not edit the draft');
  await p.keyboard.press('Escape');assert.equal(await p.locator('.position-filter').count(),0);
  await shot('03-draft');
  // Construct a replay-valid career with the real draft engine. The test does not invent match records.
  await p.evaluate(async key=>{
   const D=await import('./app/draft.js'),C=await import('./app/career.js'),g=await(await fetch('./data/game.json')).json();
   let d=D.choose(g,D.start(851,2000,false),0);
   for(let j=0;j<5;j++){d=D.spin(g,d);for(let k=0;k<3;k++)d=D.place(g,d,g.cards[d.combo].find(c=>D.can(g,d,c.p)).p,j*3+k);}
   d={...d,phase:'results',mode:{career:C.careerStart(g,d)}};localStorage.setItem(key,JSON.stringify(d));
  },KEY);
  await p.reload();await ready(p);assert.equal(await p.locator('.hub-tile').count(),6);await shot('04-club-hub');
  const expected=await p.evaluate(async key=>{const C=await import('./app/career.js'),g=await(await fetch('./data/game.json')).json();return C.careerPlayHalf(g,JSON.parse(localStorage.getItem(key)).mode.career);},KEY);
  await p.click('#career-half');await p.waitForSelector('#match-centre[open]');
  assert.ok(await p.locator('#match-centre .match').count()<=2,'results appear one at a time');
  await p.waitForFunction(()=>document.querySelectorAll('#match-centre .match').length>=3);
  const m=expected.S.me[0];assert.match(await p.locator('#match-centre .match header b').first().textContent(),new RegExp(`${m.gf}–${m.ga}$`));
  await shot('05-match-centre');await p.click('#match-all');
  assert.equal(await p.locator('#match-centre .match').count(),expected.S.me.length);
  assert.equal(await p.evaluate(()=>document.activeElement.id),'match-close','Show all moves keyboard focus to the close action');
  assert.match(await p.locator('#match-announcement').textContent(),/^All \d+ results shown/,'completion is announced');
  await p.click('#match-close');assert.equal(await p.evaluate(()=>document.activeElement.id),'tab-home');assert.deepEqual((await state(p)).mode.career,expected,'playback and closing preserve the independently computed half');
  await p.click('[data-tab="market"]');await ready(p);await shot('06-market');
  const choice=p.locator('.market-choices.targets input').nth(1);
  if(await choice.count()){
   const id=await choice.getAttribute('data-transfer-choice'),value=await choice.getAttribute('value'),prior=await state(p);
   await choice.check();assert.equal(await p.locator('#'+id).inputValue(),value);assert.deepEqual(await state(p),prior,'card preview does not buy the player');
   const outgoing=p.locator('.market-choices.departures input').nth(12);await outgoing.check();
   assert.equal(await p.locator('.transfer-pair').first().getAttribute('data-outgoing'),prior.mode.career.slots[12].p);
   await shot('07-card-comparison');
  }
  await p.click('.bar [data-club-open="home"]');await p.waitForSelector('#clubhouse[open]');
  assert.equal(await p.locator('#clubhouse').evaluate(e=>Math.round(e.getBoundingClientRect().width)),width);
  await shot('08-clubhouse');await p.click('#clubhouse [data-club-page="sbc"]');await shot('09-challenges');
  assert.equal(await p.locator('.sbc-reward .vc').count(),11);await p.click('#clubhouse-close');
  await p.reload();await ready(p);assert.equal(await p.locator('#match-centre[open]').count(),0);assert.deepEqual((await state(p)).mode.career,expected,'reload resumes the saved half without replaying');
  // Reduced motion shows every result at once.
  await p.emulateMedia({reducedMotion:'reduce'});
  await p.evaluate(async()=>{document.getElementById('match-centre').remove();const {mountMatchCentre}=await import('./app/ui/match-centre.js'),{matchCards}=await import('./app/ui/career.js'),{U}=await import('./app/ui/kit.js');mountMatchCentre().show(matchCards(U.S.mode.career,0).slice(0,2),'Opening half');});
  assert.equal(await p.locator('#match-centre[open] .match').count(),2);assert.equal(await p.locator('#match-centre[open] #match-all').isHidden(),true);await p.locator('#match-centre[open] #match-close').click();
  assert.deepEqual(errors,[]);checks.push(`${kind}: modes, position shortlist, hub, card market, match-by-match and reduced-motion playback, Show all and exact reload`);console.log('ok',checks.at(-1));await ctx.close();
 }
 }finally{await b.close();}
 fs.writeFileSync(path.join(out,'night-sky.json'),JSON.stringify({passed:true,checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
