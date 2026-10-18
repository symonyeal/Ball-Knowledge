// Public Node protocol: JSON input/output, same engine and independently hand-placed lineups.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { club } from './fixtures.mjs';

test('the reusable Node rating bridge uses the engine and returns finite named lines', () => {
  const T = club('a').T;
  const r = spawnSync(process.execPath, ['app/cli.mjs'], {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8',
    input: JSON.stringify({ op: 'rate', teams: [{ id: 'a', Ds: 1990, T }] }),
  });
  assert.equal(r.status, 0, r.stderr);
  const a = JSON.parse(r.stdout);
  assert.equal(a[0].id, 'a');
  // 80 base + 3 chemistry: eleven natural-position starters share one club (7 ≥ 7).
  assert.ok(Math.abs(a[0].M - 83) < 1e-10);
  assert.ok(Math.abs(a[0].K - 83) < 1e-10);
  assert.ok(Math.abs(a[0].A - 83) < 1e-10 && Number.isFinite(a[0].Dk));
});

test('the Gauntlet balance command completes current rounds, rewards and transfers', () => {
  const r = spawnSync(process.execPath, ['tests/balance.mjs', 'gauntlet', '1', '5', 'cap'], {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8', timeout: 30000,
  });
  assert.equal(r.status, 0, r.stderr);
  const a = JSON.parse(r.stdout);
  assert.equal(a.runs, 1);
  assert.equal(Object.values(a.decadesCleared).reduce((x, n) => x + n, 0), 1);
  assert.ok(Number.isFinite(a.segmentPointsMedian) && Number.isFinite(a.bossMatchesMedian));
});
