// The Gauntlet's own draft (nearby decades, strongest squads, 3 S and 6 A), and act and run honours, on the bundled data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../../app/engine/index.js';
import * as Dr from '../../app/draft.js';
import * as Rn from '../../app/run.js';
import { fields } from '../../app/data.js';
import { ct, RCAP } from '../../app/cap.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url), 'utf8'));
if (G.params) E.cfg(G.params);
const F = fields(G);

// A Gauntlet draft: first manager, then the best-rated legal card into the first open place.
function draft(seed, g, cap = true) {
  let s = Dr.choose(G, Dr.start(seed, null, cap, g), 0);
  for (let n = 0; n < 5; n++) {
    s = Dr.spin(G, s);
    for (let j = 0; j < 3; j++) {
      const c = G.cards[s.combo].filter(c => Dr.can(G, s, c.p)).sort((a, b) => b.r - a.r)[0];
      s = Dr.place(G, s, c.p, s.slots.findIndex(x => !x));
    }
  }
  return s;
}

test('a Gauntlet draft starts in its map’s first decade and draws only from decades within POOL of it', () => {
  for (const g of Object.keys(Rn.MAPS)) for (const cap of [true, false]) for (const seed of [1, 2, 3]) {
    const s = draft(seed, g, cap), D0 = Rn.MAPS[g].D[0];
    assert.equal(s.D, D0); assert.equal(s.g, g); assert.equal(s.phase, 'review');
    for (const k of s.history) assert.ok(Math.abs(Number(k.split(':')[1]) - D0) <= Dr.POOL, `${g} drew ${k}`);
    const v = Dr.valid(G, s);
    assert.equal(v.g, g); assert.deepEqual(v.slots, s.slots); assert.deepEqual(v.history, s.history);
  }
});

test('a saved Gauntlet draft rejects an unknown map, a moved decade and a squad from outside its pool', () => {
  const s = draft(4, 'reverse');
  assert.throws(() => Dr.valid(G, { ...s, g: 'nowhere' }), /Gauntlet draft/);
  assert.throws(() => Dr.valid(G, { ...s, D: 2010 }), /Gauntlet draft|manager/);
  const far = G.combos.find(c => c.D === 1970), h = s.history.slice(); h[0] = `${far.q}:${far.D}`;
  assert.throws(() => Dr.valid(G, { ...s, history: h }));
  assert.throws(() => Dr.start(4, null, true, 'nowhere'), /Gauntlet maps/);
});

test('a Gauntlet draft holds at most 3 S and 6 A, with B, C and D unlimited, and refuses a fourth S', () => {
  assert.deepEqual(RCAP, { S: 3, A: 6 });
  for (const seed of [11, 12, 13]) {
    const s = draft(seed, 'reverse'), n = ct(G, s.slots);
    assert.ok(n.S <= 3 && n.A <= 6);
    assert.ok(n.S + n.A > 6, 'the strong draws fill more than the career cap’s six S and A places');
  }
  let s = Dr.choose(G, Dr.start(14, null, true, 'reverse'), 0);
  const S = G.combos.filter(c => c.D === 2020).flatMap(c => G.cards[`${c.q}:${c.D}`].filter(x => x.r >= 90).map(x => ({ k: `${c.q}:${c.D}`, p: x.p })));
  const four = [...new Map(S.map(x => [x.p, x])).values()].slice(0, 4);
  assert.throws(() => Dr.valid(G, { ...s, phase: 'draft', slots: [...four, ...Array(11).fill(null)] }));
});

test('a Gauntlet draft draws its decades’ strongest squads far more often than a career draft', () => {
  const mean = g => { let x = 0; for (let seed = 0; seed < 15; seed++) x += G.combos.find(c => `${c.q}:${c.D}` === Dr.spin(G, Dr.choose(G, Dr.start(seed, 2020, true, g), 0)).combo).k; return x / 15; };
  assert.ok(mean('reverse') < mean(undefined) / 2);
});

test('a round and a boss tie log our players’ tallies, whose goals are the goals scored; honours read them', () => {
  let s = { ...Rn.runNew(7, draft(7, 'reverse')), pat: 20 };
  s = Rn.runRound(G, F, s);
  const e = s.log.at(-1), T = Object.values(e.pl);
  assert.equal(T.reduce((x, v) => x + v[0], 0), e.gf);
  assert.equal(T.reduce((x, v) => x + v[1], 0) <= e.gf, true);
  const h = Rn.honours(s, 0), top = Math.max(...T.map(v => v[0]));
  if (top > 0) assert.equal(h.scorer.g, top);
  assert.equal(h.win.gf - h.win.ga, Math.max(...e.res.map(m => m.gf - m.ga)));
  s = Rn.runPlayBoss(G, F, { ...s, ph: 'boss', rd: Rn.N_RD });
  const b = s.log.at(-1);
  assert.equal(Object.values(b.pl).reduce((x, v) => x + v[0], 0), b.agg[0]);
  assert.equal(Rn.honours(s).n, 2);
  const bad = { ...s, log: s.log.map((x, i) => (i === 0 ? { ...x, pl: { [Object.keys(x.pl)[0]]: [1, 2] } } : x)) };
  assert.throws(() => Rn.validRun(G, bad, s.m, s.cap), /invalid/);
});

test('kick-off of a Gauntlet draft resumes from a save as a run on its map', () => {
  const d = draft(8, 'odyssey'), r = Rn.runNew(d.seed, d, d.g), s = { ...d, phase: 'results', mode: { run: r } };
  assert.equal(r.map, 'odyssey'); assert.equal(Rn.D_of(r), 1950);
  assert.deepEqual(Dr.valid(G, s).mode.run, r);
});
