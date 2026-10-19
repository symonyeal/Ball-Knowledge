// Chemistry: EA thresholds club 2/4/7, nation 2/5/8, league 3/5/8 on career bonds; n_i ≤ 3; listed-position starters
// only. The club count is 1 + TM per former teammate + CL per player who shared a club in other years.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../app/engine/index.js';
import { readFileSync } from 'node:fs';
import { club } from './fixtures.mjs';
import { NATION, MANAGER_PEOPLE, staff } from '../../app/staff.js';
import { hydrate, career } from '../../app/draft.js';
import { archive } from '../../app/archive.js';
import * as Club from '../../app/club.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url), 'utf8'));
const card = (p, k = Object.keys(G.cards).find(k => G.cards[k].some(c => c.p === p))) => hydrate(G, { k, p });

// T(f): the fixture eleven with club, nation, league and career set per index by f(i) = [cq, nat, lg, h].
const T = f => {
  const X = club('a').T;
  X.xi.forEach((c, i) => { [c.cq, c.nat, c.lg, c.h] = f(i); });
  return X;
};
const h = (q, a, b = a) => [[q, a, b]];

test('steps counts thresholds reached', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 6, 7, 11].map(n => E.steps(n, E.THRESHOLDS.club)), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('seven teammates give 3 each; strangers give 0; the team total is the sum', () => {
  const C = E.chemistry(T(i => (i < 7 ? ['q', '', '', h('q', 1995)] : [`z${i}`, '', '', h(`z${i}`, 1995)])));
  assert.equal(C.players['a-0'].n, 3);
  assert.equal(C.players['a-8'].n, 0);
  assert.equal(C.total, 21);
});

test('former teammates at another club bond like clubmates; a shared club in other years counts half', () => {
  // a-0 and a-1 drafted from different clubs but were teammates at x in 1990; a-2 played for x in 1980 only.
  const H = [[['x', 1988, 1991], ['q0', 1995, 1996]], [['x', 1990, 1992]], h('x', 1980)];
  const C = E.chemistry(T(i => [`q${i}`, '', '', H[i] || h(`q${i}`, 1995)]));
  assert.deepEqual(E.bond({ h: H[0] }, { h: H[1] }), { k: 'tm', q: 'x', y: [1990, 1991] });
  assert.equal(C.players['a-0'].counts.club, 1 + E.TM + E.CL);
  assert.equal(C.players['a-1'].counts.club, 1 + E.TM + E.CL);
  assert.equal(C.players['a-2'].counts.club, 1 + 2 * E.CL);
  assert.equal(C.players['a-0'].points.club, 1);
  assert.equal(C.players['a-2'].points.club, 1);
  assert.deepEqual(C.links.filter(l => l.k !== 'nat').map(l => [l.i, l.j, l.k]), [[0, 1, 'tm'], [0, 2, 'cl'], [1, 2, 'cl']]);
});

test('club, nation and league add and cap at 3', () => {
  const C = E.chemistry(T(i => (i < 2 ? ['q', 'Spain', 'ESP', h('q', 1995)] : [`z${i}`, `n${i}`, `l${i}`, h(`z${i}`, 1995)])));
  assert.deepEqual(C.players['a-0'].points, { club: 1, nation: 1, league: 0, coached: 0 });
  const D = E.chemistry(T(() => ['q', 'Spain', 'ESP', h('q', 1995)]));
  assert.ok(Object.values(D.players).every(p => p.n === 3));
  assert.equal(D.total, 33);
});

test('out-of-position starters earn nothing and are not counted', () => {
  const X = T(i => (i < 4 ? ['q', '', '', h('q', 1995)] : [`z${i}`, '', '', h(`z${i}`, 1995)]));
  X.xi[3].pos = ['ST'];                           // slot 3 is a CB
  const C = E.chemistry(X);
  assert.equal(C.players['a-3'].n, 0);
  assert.equal(C.players['a-0'].counts.club, 3);
  assert.equal(C.players['a-0'].n, 1);
});

test('the manager adds one to his nation and league counts, and a point to a player he coached', () => {
  const X = T(i => (i < 4 ? ['q', 'Italy', 'ITA', h('q', 1995)] : [`z${i}`, '', '', h(`z${i}`, 1995)]));
  X.m = { ...X.m, nat: 'Italy', lg: 'ITA', cq: 'q', t: [['z9', 1994, 1996]] };
  const C = E.chemistry(X);
  assert.deepEqual(C.players['a-0'].counts, { club: 4, nation: 5, league: 5 });
  assert.deepEqual(C.players['a-0'].points, { club: 2, nation: 2, league: 2, coached: 0 });
  assert.equal(C.players['a-9'].points.coached, 1);
  assert.equal(C.players['a-8'].points.coached, 0);
});

test('chemistry adds one rating point per point, the bench earns none, and the team can be rated without it', () => {
  const X = T(() => ['q', '', '', h('q', 1995)]), R = E.rate(X, 1990), R0 = E.rate(X, 1990, { chem: false });
  assert.ok(R.xi.every(p => p.n === 3 && Math.abs(p.a - 83) < 1e-9));
  assert.ok(R.bn.every(p => p.a === 75));
  assert.equal(R.chem.total, 33);
  assert.ok(R0.xi.every(p => p.n === 0 && Math.abs(p.a - 80) < 1e-9));
});

test('a real career: Zidane and Del Piero were Juventus teammates, whatever squads they are drafted from', () => {
  const z = card('Q1835', 'Q8682:2000'), d = card('Q624');
  assert.ok(career(G, 'Q1835').some(([q]) => q === 'Q1422'), 'Zidane played for Juventus');
  const b = E.bond(z, d);
  assert.equal(b.k, 'tm'); assert.equal(b.q, 'Q1422');
  assert.ok(b.y[0] >= 1996 && b.y[1] <= 2001);
});

test('a nation label names one football team: West Germany is Germany; a United Kingdom label is replaced by a home nation', () => {
  assert.equal(card('Q4457').nat, 'Germany');            // Franz Beckenbauer, P1532 West Germany
  assert.equal(card('Q182685').nat, 'Netherlands');      // Maarten Stekelenburg, P1532 Kingdom of the Netherlands
  assert.equal(card('Q10524').nat, 'Wales');             // Ryan Giggs, P1532 United Kingdom; Wales caps (pipeline.nations)
  assert.ok(archive(G).every(c => !Object.hasOwn(NATION, c.nat)));
  assert.ok(G.meta.nations.missing < 100, 'nearly every person has a football nation');
});

test('nation groups keep the name of the nation', () => {
  const C = E.chemistry(T(i => [`z${i}`, 'Ivory Coast', '', h(`z${i}`, 1995)]));
  assert.deepEqual(C.groups.nation, { 'Ivory Coast': 11 });
});

test('a career rival’s manager counts towards his nation and league, as in the Gauntlet fields', () => {
  const m = G.managers.find(m => MANAGER_PEOPLE[m.nm] && m.t.some(([q]) => G.clubs[q])), [q, a] = m.t.find(([q]) => G.clubs[q]);
  const b = Club.boss(G, q, a, '');
  assert.equal(b.lg, G.clubs[q].cc);
  assert.deepEqual(b, staff(G, b, q, Club.dec(a)));
  if (b.nm === m.nm) assert.ok(b.nat);
});
