import test from 'node:test';
import assert from 'node:assert/strict';
import { frame } from '../../app/ui/match-centre.js';

const match = { gf: 2, ga: 1, et: false, pw: null, sc: [[8, 1, 'a', null], [45, 0, 'b', null], [89, 1, 'c', 'a']] };
test('playback reveals only goals reached by the clock and never edits the saved result', () => {
  const before = structuredClone(match);
  assert.deepEqual(frame(match, 0).score, [0, 0]);
  assert.deepEqual(frame(match, 44).score, [1, 0]);
  assert.deepEqual(frame(match, 45).score, [1, 1]);
  assert.deepEqual(frame(match, 90).score, [2, 1]);
  assert.equal(frame(match, 44).events.length, 1);
  assert.deepEqual(match, before);
});
test('extra time and penalties are revealed at the end, including events after minute 120', () => {
  const m = { ...match, gf: 3, et: true, pw: [5, 4], sc: [...match.sc, [121, 1, 'd', null]] };
  assert.equal(frame(m, 90).done, false);
  assert.equal(frame(m, 120).done, false);
  assert.deepEqual(frame(m, 120).score, [2, 1]);
  assert.equal(frame(m, 121).done, true);
  assert.deepEqual(frame(m, 121).score, [3, 1]);
  assert.deepEqual(frame(m, 121).penalties, [5, 4]);
  assert.equal(frame(m, 90).penalties, null);
});
