// Squad Building Challenges: requirement values, satisfiability on the archive and collection rewards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { archive, freeSquad, refid } from '../../app/archive.js';
import { shape } from '../../app/draft.js';
import * as B from '../../app/sbc.js';
import { emptyProfile, completeSbc, collection, achievements, totals, validateProfile } from '../../app/profile.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url), 'utf8'));
const A = archive(G);

// solve(P, f): fill formation f's eleven from pool P with natural-position cards, best first, distinct people.
function solve(P, f = '4-4-2') {
  const S = shape(G, f), used = new Set(), slots = Array(15).fill(null);
  S.forEach((x, i) => {
    const c = P.find(c => !used.has(c.p) && c.pos.includes(x.s));
    if (c) { used.add(c.p); slots[i] = { k: c.k, p: c.p }; }
  });
  return { ...freeSquad(G), f, slots };
}
const club = q => A.filter(c => c.q === q);
const best = (f, need = 11) => [...new Set(A.filter(f).map(c => c.q))].map(club).find(Q => solve(Q).slots.filter(Boolean).length === need);

test('requirement values follow their definitions', () => {
  const s = solve(best(c => c.lg === 'ESP'));
  const [full, lg, chem] = B.check(G, s, B.CORE[1]);
  assert.ok(full.ok && lg.x === 11 && chem.x === 33 && B.met(G, s, B.CORE[1]));
  assert.equal(B.check(G, { ...s, slots: [null, ...s.slots.slice(1)] }, B.CORE[0])[0].ok, false);
  assert.ok(!B.met(G, { ...s, slots: [null, ...s.slots.slice(1)] }, B.CORE[0]));
});

test('every permanent challenge is satisfiable with archive cards', () => {
  const W = {
    first: solve(club(A[0].q)), liga: solve(best(c => c.lg === 'ESP')), azzurri: solve(A.filter(c => c.nat === 'Italy')),
    spine: solve(club(A[0].q)), perfect: solve(club(A[0].q)),
    world: solve([...new Map(A.filter(c => c.nat).reverse().map(c => [c.nat, c])).values()].sort((a, b) => b.r - a.r).concat(A)),   // each nation's best card first
    total: solve(A.filter(c => c.D === 1970 && c.nat === 'Netherlands')),
    cap: solve(A.filter(c => c.r < 90)),
  };
  for (const ch of B.CORE) assert.ok(B.met(G, W[ch.id], ch), `${ch.id}: ${JSON.stringify(B.check(G, W[ch.id], ch))}`);
});

test('weekly challenges are seeded, distinct and satisfiable', () => {
  for (const w of ['2026-W42', '2026-W43', '2027-W01']) {
    const Q = B.weekly(G, A, w);
    assert.deepEqual(Q, B.weekly(G, A, w));
    assert.equal(new Set(Q.map(c => c.id)).size, 3);
    const [n, l, d] = Q, N = n.pool.nat, L = l.pool.lg, D = d.pool.dec;
    assert.ok(B.met(G, solve(A.filter(c => c.nat === N)), n), w + ' nation');
    assert.ok(B.met(G, solve(A.filter(c => c.lg === L)), l), w + ' league');
    const nat = [...new Set(A.filter(c => c.D === D).map(c => c.nat))].find(x => x && B.met(G, solve(A.filter(c => c.D === D && c.nat === x && c.r < 90)), d));
    assert.ok(nat, w + ' decade');
  }
});

test('a completed challenge unlocks its reward once and counts towards achievements, not results', () => {
  const ch = B.CORE[0], ref = B.reward(A, ch), s = solve(club(A[0].q));
  assert.deepEqual(ref, B.reward(A, ch));
  assert.ok(A.some(c => c.k === ref.k && c.p === ref.p));
  let P = completeSbc(emptyProfile(), ch, s, ref);
  assert.equal(completeSbc(P, ch, s, ref), P);
  assert.ok(collection(P).has(refid(ref)));
  assert.equal(achievements(P).find(a => a.id === 'sbc').unlocked, true);
  assert.equal(totals(P).seasons + totals(P).w, 0);
  assert.deepEqual(validateProfile(G, A, JSON.parse(JSON.stringify(P))).events, P.events);
});
