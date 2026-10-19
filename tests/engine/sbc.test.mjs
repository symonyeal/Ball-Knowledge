// Squad Building Challenges: requirement values, satisfiability on the archive and collection rewards.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { archive, freeSquad, refid } from '../../app/archive.js';
import { shape } from '../../app/draft.js';
import * as B from '../../app/sbc.js';
import { wk } from '../../app/play.js';
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

test('the challenges of a date use its UTC ISO week, and twenty consecutive weeks are satisfiable', () => {
  const t0 = Date.UTC(2026, 9, 19), seen = new Set();
  for (let i = 0; i < 20; i++) {
    const t = new Date(t0 + 7 * i * 864e5), w = wk(t).id, Q = B.challenges(G, A, t);
    assert.deepEqual(Q.slice(0, B.CORE.length), B.CORE);
    assert.deepEqual(Q.slice(B.CORE.length).map(c => c.id), ['nat', 'lg', 'dec'].map(k => `${w}:${k}`));
    Q.slice(B.CORE.length).forEach(c => { assert.ok(!seen.has(c.id)); seen.add(c.id); assert.equal(c.wk, w); });
    const [n, l, d] = Q.slice(B.CORE.length), D = d.pool.dec;
    assert.ok(B.met(G, solve(A.filter(c => c.nat === n.pool.nat)), n), w + ' nation');
    assert.ok(B.met(G, solve(A.filter(c => c.lg === l.pool.lg)), l), w + ' league');
    // one nation, the decade's cards first, in any catalogue formation: eleven compatriots give 33 chemistry
    const nats = [...new Set(A.filter(c => c.D === D && c.nat).map(c => c.nat))];
    assert.ok(Object.keys(G.formations).some(f => nats.some(x => B.met(G, solve(A.filter(c => c.nat === x && c.r < 90).sort((a, b) => (b.D === D) - (a.D === D)), f), d))), w + ' decade');
    for (const c of Q) { const r = B.reward(A, c); assert.deepEqual(r, B.reward(A, c)); assert.ok(A.some(x => x.k === r.k && x.p === r.p), c.id); }
  }
  // Sunday 23:59 and Monday 00:00 UTC fall in consecutive weeks, as for the Weekly Challenge seed.
  const sun = new Date(Date.UTC(2026, 9, 25, 23, 59)), mon = new Date(Date.UTC(2026, 9, 26, 0, 0));
  assert.equal(B.challenges(G, A, sun).at(-1).wk, wk(sun).id);
  assert.notEqual(B.challenges(G, A, sun).at(-1).wk, B.challenges(G, A, mon).at(-1).wk);
});

test('a weekly challenge survives profile export and import; a stored pre-fix week is repaired', () => {
  const t = new Date(Date.UTC(2026, 9, 21)), ch = B.challenges(G, A, t).at(-1), s = solve(club(A[0].q)), ref = B.reward(A, ch);
  const P = completeSbc(emptyProfile(), ch, s, ref);
  assert.deepEqual(validateProfile(G, A, JSON.parse(JSON.stringify(P))).events, P.events);
  assert.equal(totals(P).seasons + totals(P).drafts, 0);
  const old = { ...P, events: [{ ...P.events[0], id: 'sbc:[object Object]:dec', week: '[object Object]' }] };
  const e = validateProfile(G, A, JSON.parse(JSON.stringify(old))).events[0];
  assert.equal(e.week, '2026-W43');
  assert.ok(collection({ events: [e] }).has(refid(ref)));
});
