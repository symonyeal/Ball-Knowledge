// Positions: listed positions are where a player plays; slot ratings only lower that. Rival squads keep a
// line quota. c(pos, sr) builds a card rated 84; Q a synthetic club-decade.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../../app/engine/index.js';
import * as Cl from '../../app/club.js';

const sr = o => E.SL.map(s => o[s] ?? 60);
const c = (pos, x) => ({ r: 84, pos, ...(x ? { sr: x } : {}) });

test('a flat slot rating is no rating: an outfielder keeps the full penalty in goal', () => {
  const k = c(['CB'], E.SL.map(() => 84));
  assert.equal(E.ft(k, 'CB').f, 0);
  assert.equal(E.ft(k, 'GK').f, E.F_gk);
  assert.equal(E.ft(k, 'ST').f, E.F[3]);
});

test('an unlisted slot never rates as natural, however high its converted rating', () => {
  const k = c(['LB', 'LWB'], sr({ LB: 80, LWB: 82, RW: 88, LW: 88, LM: 87 }));
  assert.ok(E.ft(k, 'LB').f > 0.04, 'a listed slot keeps its own slot-rating loss');
  assert.equal(E.ft(k, 'LM').f, E.F[1], 'one step from LWB');
  assert.equal(E.ft(k, 'RW').f, E.F[3]);
  for (const s of E.SL) if (!k.pos.includes(s)) assert.ok(E.ft(k, s).f >= 0.1, `${s} is not natural`);
});

test('a slot rating lower than the graph penalty still applies', () => {
  const k = c(['ST'], sr({ ST: 84, CF: 60 }));
  assert.ok(Math.abs(E.ft(k, 'CF').f - (1 - 60 / 84)) < 1e-9);
});

test('rival squads reach for nearby defenders before fielding forwards at the back', () => {
  const F = JSON.parse(readFileSync(new URL('../../pipeline/curated/formations.json', import.meta.url)));
  const G = { clubs: { q: { nm: 'Q', cc: 'ENG' } }, cards: {}, people: {}, managers: [], formations: F, combos: [], lg: {}, ec: {}, xn: {} };
  const now = ['GK', ...Array(8).fill('ST'), ...Array(6).fill('CM')], near = ['CB', 'CB', 'LB', 'RB', 'CB'];
  G.cards['q:1980'] = [...now.map((p, i) => ({ p: `n${i}`, pos: [p], r: 75, s: 'f', a: 1985, b: 1985, n: 40, tg: {} })),
    ...near.map((p, i) => ({ p: `d${i}`, pos: [p], r: 70, s: 'f', a: 1983, b: 1983, n: 20, tg: {} }))];
  for (const x of G.cards['q:1980']) G.people[x.p] = { nm: x.p };
  const Q = Cl.squad(G, 'q', 1985).Q;
  assert.equal(Q.filter(x => E.LN[x.pos[0]] === 'D').length, 4);
  assert.equal(Q.filter(x => x.sg === 0).length, 15);
});
