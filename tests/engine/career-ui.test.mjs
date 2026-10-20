import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../../app/engine/index.js';
import * as D from '../../app/draft.js';
import * as C from '../../app/career.js';
import { U } from '../../app/ui/kit.js';
import { hub, careerShareText, matchCards } from '../../app/ui/career.js';
import { restore } from '../../app/save.js';
import { named } from '../../app/club.js';
import * as Rn from '../../app/run.js';
import { fields } from '../../app/data.js';
import { runCards } from '../../app/ui/season.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url)));
E.cfg(G.params);
function draft() {
  let s = D.choose(G, D.start(851, 2000, true), 0);
  for (let j = 0; j < 5; j++) {
    s = D.spin(G, s);
    for (let k = 0; k < 3; k++) {
      const c = G.cards[s.combo].find(c => D.can(G, s, c.p));
      s = D.place(G, s, c.p, j * 3 + k);
    }
  }
  return { ...s, phase: 'results' };
}
test('the career opens with the actual league size, season objective and winter action', () => {
  U.G = G; U.S = draft(); U.S.mode = { career: C.careerStart(G, U.S) }; U.tab = 'home';
  const s = U.S.mode.career, html = hub();
  assert.match(html, /Play to winter/);
  assert.match(html, /Board objective/);
  assert.match(html, new RegExp(`${s.years[0]}/${String(s.years[0] + 1).slice(-2)}`));
  U.tab = 'league';
  assert.equal((hub().match(/data-club=/g) || []).length, s.S.L.rows.length);
  assert.match(html, /More modes/);
  assert.ok(html.includes(named('L', s.lg, s.S.s)), 'the league is named for its historical era');
  assert.doesNotMatch(html, /undefined|NaN/);
});
test('your matches list every match once, split at the winter break, with goals and a league filter', () => {
  U.G = G; U.S = draft(); const s0 = { ...C.careerStart(G, U.S), pat: 20 }, a = C.careerPlayHalf(G, s0), s = C.careerPlayHalf(G, a);
  U.S.mode = { career: s }; U.tab = 'fixtures'; U.feed = 'all';
  const html = hub(), M = s.S.me, n = M.filter(m => m.k === 'L').length;
  assert.equal((html.match(/<article class="match /g) || []).length, M.length);
  assert.match(html, /Opening half[\s\S]*Run-in/);
  assert.equal(html.indexOf('Run-in') < html.lastIndexOf('<article'), true);
  const goals = M.reduce((x, m) => x + m.sc.length, 0);
  assert.equal((html.match(/<li class="(mine|them)">/g) || []).length, goals);
  assert.doesNotMatch(html, /undefined|NaN/);
  U.feed = 'L';
  assert.equal((hub().match(/<article class="match /g) || []).length, n);
  assert.equal(matchCards(s, a.S.me.length).length, M.length - a.S.me.length);
  U.feed = 'all';
});
test('a Gauntlet round and boss tie list each match with its goals; older records show scores only', () => {
  U.G = G; U.F = fields(G); U.S = draft();
  const s = Rn.runRound(G, U.F, { ...Rn.runNew(7, U.S, 'reverse'), pat: 20 }), e = s.log.at(-1), C6 = runCards(e).join('');
  assert.equal((C6.match(/<article class="match /g) || []).length, 6);
  assert.equal((C6.match(/<li class="(mine|them)">/g) || []).length, e.res.reduce((n, m) => n + m.gf + m.ga, 0));
  assert.doesNotMatch(C6, /undefined|NaN/);
  assert.match(runCards({ ...e, res: e.res.map(({ sc, ...m }) => m) })[0], /not recorded/);
  const b = Rn.runPlayBoss(G, U.F, { ...s, ph: 'boss', rd: 4 }).log.at(-1), B = runCards(b);
  assert.equal(B.length, 2);
  assert.match(B[1], new RegExp(`Aggregate ${b.agg[0]}–${b.agg[1]}`));
  assert.match(B[1], b.won ? /Boss beaten/ : /Boss tie lost/);
});
test('career share text reports the current club season and full league denominator', () => {
  U.G = G; U.S = draft(); U.S.mode = { career: C.careerStart(G, U.S) };
  const s = U.S.mode.career, tx = careerShareText();
  assert.ok(tx.includes(G.clubs[s.q].nm));
  assert.ok(tx.includes(`Season 1 / ${s.years.length}`));
  assert.ok(tx.includes(` / ${s.S.L.rows.length}`));
  assert.ok(tx.includes(`Seed ${s.seed}`));
  assert.match(tx, /Pre-season/);
});

test('the hub previews the next league opponent from the actual seeded schedule', () => {
  U.G = G; U.S = draft(); U.S.mode = { career: C.careerStart(G, U.S) }; U.tab = 'home';
  const next = C.careerPlayHalf(G, U.S.mode.career).S.me.find(m => m.k === 'L');
  assert.ok(hub().includes(`data-next-op="${next.op}"`));
});
test('browser restoration keeps an advanced career and rejects another draft’s career', () => {
  const raw = draft(); raw.mode = { career: C.careerPlayHalf(G, C.careerStart(G, raw)) };
  const restored = restore(G, JSON.parse(JSON.stringify(raw)));
  assert.deepEqual(restored.mode.career, raw.mode.career);
  assert.deepEqual(restored.slots, raw.slots);
  const altered = structuredClone(raw); altered.mode.career.seed++;
  assert.throws(() => restore(G, altered), /does not belong/);
  const broken = structuredClone(raw); broken.mode.career.S.me[0].gf = -1;
  assert.throws(() => restore(G, broken), /invalid/);
});
