// In-forms and Evolutions in the club career (EA FC Ultimate Team adaptations).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../../app/engine/index.js';
import * as Dr from '../../app/draft.js';
import * as C from '../../app/career.js';
import { face } from '../../app/ui/kit.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url), 'utf8'));
if (G.params) E.cfg(G.params);
function draft(seed = 17, D = 1990) {
  let s = Dr.choose(G, Dr.start(seed, D, false), 0);
  for (let n = 0; n < 5; n++) {
    s = Dr.spin(G, s);
    for (let j = 0; j < 3; j++) s = Dr.place(G, s, G.cards[s.combo].find(c => Dr.can(G, s, c.p)).p, s.slots.findIndex(c => !c));
  }
  return s;
}
const d = draft(), s0 = C.careerStart(G, d);
const card = (s, p) => { const T = C.careerTeam(G, s); return [...T.xi, ...T.bn].find(c => c.id === p); };

test('in-forms count wins with three goal involvements and every five keeper clean sheets, capped at 3', () => {
  const f = (gf, ga, sc) => ({ gf, ga, sc });
  const S = { me: [
    f(3, 0, [[10, 1, 'a', 'b'], [20, 1, 'a', null], [30, 1, 'c', 'a']]),   // a: 3 involvements in a win
    f(2, 3, [[10, 1, 'a', null], [20, 1, 'a', 'b'], [80, 0, 'x', null]]),  // a loss earns nothing
    f(4, 1, [[1, 1, 'a', null], [2, 1, 'a', null], [3, 1, 'a', null], [4, 0, 'a', null]]),
    ...Array(3).fill(f(3, 0, [[1, 1, 'a', null], [2, 1, 'a', null], [3, 1, 'a', null]])),
  ], sy: [['k', 0, 0, 11, 20, 1], ['z', 0, 0, 9, 20, 0]] };
  assert.deepEqual(C.inForms({ S }), { a: 3, k: 2 });
  assert.deepEqual(C.inForms({ S: null }), {});
});

test('an in-form adds one rating point and marks the card', () => {
  const p = s0.slots[9].p, b = card(s0, p);
  const S = { ...s0.S, me: [{ k: 'L', gf: 3, ga: 0, sc: [[5, 1, p, null], [6, 1, p, null], [7, 1, p, null]] }] };
  const c = card({ ...s0, S }, p);
  assert.ok(Math.abs(c.r - b.r - 1) < 1e-9);
  assert.equal(c.fm, 1);
});

test('an evolution starts only for an eligible player, tracks progress and completes into rating and position', () => {
  const o = C.evoOptions(G, s0);
  assert.ok(o.length > 0);
  assert.ok(o.every(x => Dr.hydrate(G, s0.slots[x.i]).r <= C.EVO_MAX));
  assert.throws(() => C.careerEvo(G, s0, s0.slots[0].p, 'nope'), /eligible/);
  const x = o.find(x => C.EVO[x.id].pos) || o[0], e = C.EVO[x.id];
  let s = C.careerEvo(G, s0, x.p, x.id);
  assert.deepEqual(s.evo, { p: x.p, id: x.id, b: 0 });
  assert.equal(C.evoOptions(G, s).length, 0);
  assert.deepEqual(C.validCareer(G, s, d.manager, d.cap), s);
  s = C.careerPlayHalf(G, { ...s, evo: { ...s.evo, b: -e.n } });       // objective already met
  assert.equal(s.evo, null);
  assert.deepEqual(s.evd, { [x.p]: [x.id] });
  assert.deepEqual(s.log.at(-1), { t: 'evd', p: x.p, id: x.id });
  const a = card({ ...s, evd: {} }, x.p), c = card(s, x.p);
  assert.ok(Math.abs(c.r - a.r - e.r) < 1e-9);
  if (e.pos) assert.ok(c.pos.includes(e.pos) && E.ft(c, e.pos).f === 0);
  assert.ok(!C.evoOptions(G, s).some(y => y.p === x.p && y.id === x.id));
});

test('saves reject forged evolutions and accept saves made before evolutions', () => {
  const x = C.evoOptions(G, s0)[0];
  const s = C.careerEvo(G, s0, x.p, x.id);
  assert.throws(() => C.validCareer(G, { ...s, evo: { ...s.evo, id: 'x' } }, d.manager, d.cap), /invalid/);
  assert.throws(() => C.validCareer(G, { ...s, evo: { ...s.evo, b: 999 } }, d.manager, d.cap), /invalid/);
  assert.throws(() => C.validCareer(G, { ...s, evd: { [x.p]: ['goal', 'goal'] } }, d.manager, d.cap), /invalid/);
  const old = { ...s0 }; delete old.evo; delete old.evd;
  assert.deepEqual(C.validCareer(G, old, d.manager, d.cap), old);
});

test('saves reject evolutions that the log does not record', () => {
  const x = C.evoOptions(G, s0)[0];
  assert.throws(() => C.validCareer(G, { ...s0, evd: { [x.p]: [x.id] } }, d.manager, d.cap), /invalid/);
  assert.throws(() => C.validCareer(G, { ...s0, evo: { p: x.p, id: x.id, b: 0 } }, d.manager, d.cap), /invalid/);
  const s = C.careerEvo(G, s0, x.p, x.id);
  assert.throws(() => C.validCareer(G, { ...s, evo: null, evd: { [x.p]: [x.id] } }, d.manager, d.cap), /invalid/);
});

test('an evolving career resumes from its save to the same half', () => {
  const x = C.evoOptions(G, s0)[0], s = C.careerEvo(G, s0, x.p, x.id);
  const t = C.validCareer(G, JSON.parse(JSON.stringify(s)), d.manager, d.cap);
  assert.deepEqual(C.careerPlayHalf(G, t), C.careerPlayHalf(G, s));
});

test('a new season starts without the last season’s in-forms', () => {
  let s = s0;
  while (s.y === 0) {
    if (s.ph === 'half') s = C.careerPlayHalf(G, s);
    else if (s.ph === 'node') s = C.careerTake(G, s, C.careerOffers(G, s).findIndex(o => ['rest', 'dev'].includes(o.kind)));
    else if (s.ph === 'hop') { const H = C.careerHopPools(G, s), n = Math.min(1, H.old.length) + Math.min(1, H.neu.length);
      s = C.careerHop(G, s, { old: H.old.length ? [0] : [], neu: H.neu.length ? [0] : [], out: [12, 13].slice(0, n) }); }
    else {
      if (s.half === 2) { const p = s.slots[9].p; s = { ...s, S: { ...s.S, me: [...s.S.me, { k: 'L', gf: 3, ga: 0, sc: [[1, 1, p, null], [2, 1, p, null], [3, 1, p, null]] }] } }; assert.ok(C.inForms(s)[p] > 0); }
      s = C.careerNext(G, s);
    }
    assert.notEqual(s.ph, 'fired');
  }
  assert.deepEqual(C.inForms(s), {});
  assert.ok([...C.careerTeam(G, s).xi, ...C.careerTeam(G, s).bn].every(c => !c.fm));
});

test('a season MVP point shows its own face; an in-form takes precedence while it lasts', () => {
  const p = s0.slots[9].p, s = { ...s0, mv: { [p]: 1 } }, c = card(s, p);
  assert.equal(c.mvp, 1);
  assert.equal(c.fm, undefined);
  assert.equal(face(c), 'mvp');
  const S = { ...s.S, me: [{ k: 'L', gf: 3, ga: 0, sc: [[5, 1, p, null], [6, 1, p, null], [7, 1, p, null]] }] };
  assert.equal(face(card({ ...s, S }, p)), 'if');
  assert.equal(card({ ...s0, mv: { [p]: -1 } }, p).mvp, undefined);
});
