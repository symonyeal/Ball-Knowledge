import test from 'node:test';
import assert from 'node:assert/strict';
import { moments, split } from '../../app/ui/match-centre.js';

const match = { k: 'L', gf: 2, ga: 1, et: false, pw: null, sc: [[89, 1, 'c', 'a'], [8, 1, 'a', null], [45, 0, 'b', null]] };
test('key moments list goals by minute and name the standout without editing the saved result', () => {
  const before = structuredClone(match), x = moments(match);
  assert.deepEqual(x.goals.map(e => e[0]), [8, 45, 89]);
  assert.equal(x.star, 'a');                      // a: 3 + 1 = 4 points, c: 3
  assert.equal(x.sg, 1);
  assert.deepEqual(x.form, []);
  assert.deepEqual(match, before);
});
test('a win with three goal involvements earns an in-form; a draw does not', () => {
  const m = { ...match, gf: 3, ga: 1, sc: [[10, 1, 'a', null], [20, 1, 'a', null], [30, 1, 'b', 'a'], [40, 0, 'z', null]] };
  assert.deepEqual(moments(m).form, ['a']);
  assert.equal(moments(m).sg, 2);
  assert.deepEqual(moments({ ...m, gf: 1, ga: 1 }).form, []);
});
test('the run-in starts at the first league match after the opening half', () => {
  const me = [{ k: 'SC' }, { k: 'L' }, { k: 'EC' }, { k: 'L' }, { k: 'L' }, { k: 'EC' }, { k: 'L' }];
  const s = { log: [{ t: 'seg', s: 1990, half: 1, w: 1, d: 1, l: 0 }, { t: 'seg', s: 1990, half: 2, w: 2, d: 0, l: 0 }] };
  assert.equal(split(s, { s: 1990, h: 2, me }), 4);
  assert.equal(split(s, { s: 1990, h: 1, me: me.slice(0, 4) }), 4);
});
