// Run with the same --url, --playwright, --channel and --output arguments as acceptance.cjs.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const arg = k => { const i = process.argv.indexOf(k); return i < 0 ? undefined : process.argv[i + 1]; };
const { chromium } = require(arg('--playwright') || 'playwright');
const out = arg('--output');
if (!out) throw new Error('Pass --output for evidence and browser runtime files.');
fs.mkdirSync(path.join(out, 'runtime'), { recursive: true });
process.env.TEMP = process.env.TMP = path.resolve(out, 'runtime');
const KEY = 'football-era-lab-v2', checks = [], errors = [];
const ready = p => p.waitForFunction(() => document.body.getAttribute('aria-busy') !== 'true' && !document.querySelector('.loading'));
const state = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);

(async () => {
  const b = await chromium.launch({ headless: true, channel: arg('--channel') });
  try {
    for (const [kind, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
      if (arg('--kind') && arg('--kind') !== kind) continue;
      const ctx = await b.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
      await ctx.route('https://www.wikidata.org/w/api.php?**', r => r.fulfill({ json: { entities: {} } }));
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(`${kind}: ${e.message}`));
      await p.goto(arg('--url') || 'http://127.0.0.1:8765/'); await ready(p);
      await p.evaluate(async key => {
        const D = await import('./app/draft.js'), C = await import('./app/career.js');
        const g = await (await fetch('./data/game.json')).json();
        let s = D.choose(g, D.start(851, 2000, false), 0);
        for (let j = 0; j < 5; j++) {
          s = D.spin(g, s);
          for (let k = 0; k < 3; k++) s = D.place(g, s, g.cards[s.combo].find(c => D.can(g, s, c.p)).p, j * 3 + k);
        }
        s = { ...s, phase: 'results', mode: { career: C.careerStart(g, s) } };
        localStorage.setItem(key, JSON.stringify(s));
      }, KEY);
      await p.reload(); await ready(p);
      // Both halves: saved records, modal cards and the persistent list reconcile exactly.
      for (let half = 0; half < 2; half++) {
        const before = (await state(p)).mode.career.S.me.length;
        await p.click('#career-half'); await p.waitForSelector('#match-centre[open]');
        const s = (await state(p)).mode.career;
        assert.equal(await p.locator('#match-centre .match').count(), s.S.me.length - before);
        assert.equal(await p.locator('#match-centre .moments li').count(), s.S.me.slice(before).reduce((n, m) => n + m.sc.length, 0));
        await p.click('#match-close');
        await p.click('[data-tab="fixtures"]'); await ready(p);
        assert.equal(await p.locator('#result-panel .match').count(), s.S.me.length);
        await p.click('[data-tab="home"]'); await ready(p);
      }
      const completed = (await state(p)).mode.career;
      await p.click('[data-tab="history"]');
      await p.locator('.career-bracket').first().locator('summary').first().click();
      assert.equal(await p.locator('#result-panel .match').count(), completed.S.me.length);
      await p.screenshot({ path: path.join(out, `${kind}-career-history.png`) });
      // Circuit: click the real control, then compare every event and every goal with the engine records.
      await p.click('[data-tab="more"]'); await ready(p);
      await p.selectOption('#circuit-events', '10'); await p.click('#circuit-start');
      await p.waitForSelector('#match-centre[open]');
      const expected = await p.evaluate(async () => {
        const { U } = await import('./app/ui/kit.js');
        const q = U.C.events.flatMap(e => e.matches).filter(f => f.A === 'your-club' || f.B === 'your-club');
        return { count: q.length, goals: q.reduce((n, f) => n + f.M.ev.length, 0) };
      });
      assert.equal(await p.locator('#match-centre .match').count(), expected.count);
      assert.equal(await p.locator('#match-centre .moments li').count(), expected.goals);
      await p.click('#match-close');
      assert.equal(await p.locator('.circuit .match').count(), expected.count);
      await p.locator('.circuit').scrollIntoViewIfNeeded();
      await p.screenshot({ path: path.join(out, `${kind}-circuit.png`) });
      // Head to head: the away leg reverses scores and scorer ownership, including the shootout.
      const code = await p.locator('#my-code').inputValue();
      await p.fill('#their-code', code); await p.click('#h2h-play');
      await p.waitForSelector('#match-centre[open]');
      const H = await p.evaluate(async () => (await import('./app/ui/kit.js')).U.H);
      assert.equal(await p.locator('#match-centre .match').count(), 2);
      for (let i = 0; i < 2; i++) {
        const l = H.legs[i].M, card = p.locator('#match-centre .match').nth(i);
        assert.match(await card.locator('header b').textContent(), new RegExp(`${i ? l.gy : l.gx}–${i ? l.gx : l.gy}$`));
        assert.equal(await card.locator('.moments .mine').count(), l.ev.filter(e => e.t === (i ? 1 : 0)).length);
      }
      assert.match(await p.locator('#match-centre .match').last().textContent(), /Aggregate.*Tie (won|lost)/);
      await p.screenshot({ path: path.join(out, `${kind}-head-to-head.png`) });
      await p.click('#match-close');
      // Reload reconstructs circuit fixtures and retains the exact career history.
      await p.reload(); await ready(p); await p.click('[data-tab="more"]');
      assert.equal(await p.locator('.circuit .match').count(), expected.count);
      assert.deepEqual((await state(p)).mode.career, completed);
      const layout = await p.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        nodes: [...document.querySelectorAll('.circuit, .circuit *')].flatMap(e => {
          const r = e.getBoundingClientRect();
          return r.right > innerWidth + 1 ? [{ tag: e.tagName, cls: e.className, width: r.width, right: r.right }] : [];
        }).slice(0, 20) }));
      assert.ok(layout.scroll <= layout.width, `no horizontal page overflow: ${JSON.stringify(layout)}`);
      await p.click('.bar [data-club-open="home"]');
      await p.click('#clubhouse [data-club-page="sandbox"]');
      await p.click('#sandbox-fill'); await p.click('#sandbox-play');
      await p.waitForSelector('.club-result .match');
      const sandbox = await p.evaluate(async () => {
        const { U } = await import('./app/ui/kit.js'), E = await import('./app/engine/index.js'), A = await import('./app/archive.js');
        const s = JSON.parse(localStorage.getItem('football-era-draft-profile-v1')).sandbox;
        const R = E.run(E.hs(`${s.seed}:sandbox-season`), { id: 'sandbox', nm: 'Your Sandbox XI', T: A.freeTeam(U.G, s), x: A.freeRating(U.G, s).ovr }, U.F[s.D].slice(0, 19), U.F[s.D].slice(0, 15), s.D);
        const M = [...R.L.res.map(f => f.M), ...R.K.rounds.flat().filter(t => t.A === 'sandbox' || t.B === 'sandbox').flatMap(t => t.legs)];
        return { count: M.length, goals: M.reduce((n, m) => n + m.ev.length, 0) };
      });
      assert.equal(await p.locator('.club-result .match').count(), sandbox.count);
      assert.equal(await p.locator('.club-result .moments li').count(), sandbox.goals);
      await p.click('#clubhouse-close');
      // An older replay must still reveal all its league and Cup matches on kickoff.
      await p.evaluate(async key => {
        const D = await import('./app/draft.js'), { U } = await import('./app/ui/kit.js'), g = U.G;
        let s = D.choose(g, { ...D.start(851, 2000, false), v: 3 }, 0);
        for (let j = 0; j < 5; j++) {
          s = D.spin(g, s);
          for (let k = 0; k < 3; k++) s = D.place(g, s, g.cards[s.combo].find(c => D.can(g, s, c.p)).p, j * 3 + k);
        }
        localStorage.setItem(key, JSON.stringify(s));
      }, KEY);
      await p.reload(); await ready(p); await p.click('#simulate');
      await p.waitForSelector('#match-centre[open]');
      const legacy = await p.evaluate(async () => {
        const { U } = await import('./app/ui/kit.js'), R = U.R;
        return R.L.res.length + R.K.rounds.flat().filter(t => t.A === 'your-club' || t.B === 'your-club').reduce((n, t) => n + t.legs.length, 0);
      });
      assert.equal(await p.locator('#match-centre .match').count(), legacy);
      await p.click('#match-close'); await p.click('[data-tab="fixtures"]');
      assert.equal(await p.locator('#result-panel .match').count(), legacy);
      checks.push(`${kind}: career halves/history, circuit/reload, head-to-head, sandbox league/Cup, legacy kickoff`);
      console.log('ok', checks.at(-1));
      await ctx.close();
    }
    assert.deepEqual(errors, []);
  } finally { await b.close(); }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: true, checks, errors }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
