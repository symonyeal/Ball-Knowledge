// Ultimate Team chemistry: thresholds club 2/4/7, nation 2/5/8, league 3/5/8; n_i ≤ 3; natural-position starters only.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../../app/engine/index.js';
import { readFileSync } from 'node:fs';
import { club } from './fixtures.mjs';
import { NATION, MANAGER_PEOPLE, staff } from '../../app/staff.js';
import { hydrate } from '../../app/draft.js';
import { archive } from '../../app/archive.js';
import * as Club from '../../app/club.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url), 'utf8'));
const card = p => { const k = Object.keys(G.cards).find(k => G.cards[k].some(c => c.p === p)); return hydrate(G, { k, p }); };

// T(f): the fixture eleven with club, nation and league set per index by f(i) = [cq, nat, lg].
const T = f => {
  const X = club('a').T;
  X.xi.forEach((c, i) => { [c.cq, c.nat, c.lg] = f(i); });
  return X;
};

test('steps counts thresholds reached', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 6, 7, 11].map(n => E.steps(n, E.THRESHOLDS.club)), [0, 0, 1, 1, 2, 2, 3, 3]);
});

test('a club of seven gives 3; strangers give 0; the team total is the sum', () => {
  const C = E.chemistry(T(i => (i < 7 ? ['q', '', ''] : [`z${i}`, '', ''])));
  assert.equal(C.players['a-0'].n, 3);
  assert.equal(C.players['a-8'].n, 0);
  assert.equal(C.total, 21);
});

test('club, nation and league add and cap at 3', () => {
  const C = E.chemistry(T(i => (i < 2 ? ['q', 'Spain', 'ESP'] : [`z${i}`, `n${i}`, `l${i}`])));
  assert.deepEqual(C.players['a-0'].points, { club: 1, nation: 1, league: 0 });
  const D = E.chemistry(T(() => ['q', 'Spain', 'ESP']));
  assert.ok(Object.values(D.players).every(p => p.n === 3));
  assert.equal(D.total, 33);
});

test('out-of-position starters earn nothing and are not counted', () => {
  const X = T(i => (i < 4 ? ['q', '', ''] : [`z${i}`, '', '']));
  X.xi[3].pos = ['ST'];                           // slot 3 is a CB
  const C = E.chemistry(X);
  assert.equal(C.players['a-3'].n, 0);
  assert.equal(C.groups.club.q, 3);
  assert.equal(C.players['a-0'].n, 1);
});

test('the manager adds one to his nation and league counts, never to clubs', () => {
  const f = i => (i < 4 ? ['q', 'Italy', 'ITA'] : [`z${i}`, '', '']);
  const X = T(f); X.m = { ...X.m, nat: 'Italy', lg: 'ITA', cq: 'q' };
  const C = E.chemistry(X);
  assert.deepEqual(C.players['a-0'].counts, { club: 4, nation: 5, league: 5 });
  assert.deepEqual(C.players['a-0'].points, { club: 2, nation: 2, league: 2 });
});

test('chemistry adds one rating point per point and the bench earns none', () => {
  const R = E.rate(T(() => ['q', '', '']), 1990);
  assert.ok(R.xi.every(p => p.n === 3 && Math.abs(p.a - 83) < 1e-9));
  assert.ok(R.bn.every(p => p.a === 75));
  assert.equal(R.chem.total, 33);
});

test('a nation label names one football team: West Germany is Germany, the United Kingdom fields none', () => {
  assert.equal(card('Q4457').nat, 'Germany');            // Franz Beckenbauer, P1532 West Germany
  assert.equal(card('Q182685').nat, 'Netherlands');      // Maarten Stekelenburg, P1532 Kingdom of the Netherlands
  assert.equal(card('Q10524').nat, '');                  // Ryan Giggs, P1532 United Kingdom (his Wales label is not bundled)
  assert.ok(archive(G).every(c => !Object.hasOwn(NATION, c.nat)));
});

test('nation groups keep the name of the nation', () => {
  const C = E.chemistry(T(i => [`z${i}`, 'Ivory Coast', '']));
  assert.deepEqual(C.groups.nation, { 'Ivory Coast': 11 });
});

test('a career rival’s manager counts towards his nation and league, as in the Gauntlet fields', () => {
  const m = G.managers.find(m => MANAGER_PEOPLE[m.nm] && m.t.some(([q]) => G.clubs[q])), [q, a] = m.t.find(([q]) => G.clubs[q]);
  const b = Club.boss(G, q, a, '');
  assert.equal(b.lg, G.clubs[q].cc);
  assert.deepEqual(b, staff(G, b, q, Club.dec(a)));
  if (b.nm === m.nm) assert.ok(b.nat);
});
