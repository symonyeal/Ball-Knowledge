import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../../app/engine/index.js';
import * as D from '../../app/draft.js';
import * as C from '../../app/career.js';
import * as Rn from '../../app/run.js';
import { fields } from '../../app/data.js';
import { h2h } from '../../app/play.js';
import { U } from '../../app/ui/kit.js';
import { hub } from '../../app/ui/career.js';
import * as V from '../../app/ui/season.js';
import { engineCard } from '../../app/ui/match-centre.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url)));
E.cfg(G.params);
const F = fields(G);
function setup() {
  let s = D.choose(G, D.start(851, 2000, false), 0);
  for (let j = 0; j < 5; j++) {
    s = D.spin(G, s);
    for (let k = 0; k < 3; k++) s = D.place(G, s, G.cards[s.combo].find(c => D.can(G, s, c.p)).p, j * 3 + k);
  }
  U.G = G; U.F = F; U.S = { ...s, phase: 'results' }; U.C = null; U.H = null; U.feed = 'all';
}
const count = html => (html.match(/<article class="match /g) || []).length;
const goals = html => (html.match(/<li class="(?:mine|them)">/g) || []).length;

test('every circuit event exposes each of your matches and goals, including group and knockout stages', () => {
  setup(); U.C = E.circuit(851, V.me(), F, { events: 10, Ds: 2000 });
  const M = U.C.events.flatMap(e => e.matches).filter(f => f.A === 'your-club' || f.B === 'your-club');
  const before = structuredClone(U.C), html = V.more();
  assert.equal(count(html), M.length, 'event summaries must not hide the individual results');
  assert.equal(goals(html), M.reduce((n, f) => n + f.M.ev.length, 0));
  assert.deepEqual(U.C, before, 'rendering must preserve the simulated circuit');
});

test('head to head exposes both legs with correctly oriented goals and the deciding outcome', () => {
  setup(); const T = V.me().T;
  U.H = h2h(851, { id: 'your-club', nm: 'Your Era XI', T, D: 2000 }, { id: 'friend', nm: "Friend's XI", T, D: 1990 });
  const html = V.more();
  assert.equal(count(html), 2);
  assert.equal(goals(html), U.H.legs.reduce((n, l) => n + l.M.ev.length, 0));
  assert.match(html, /Aggregate/);
  assert.match(html, /Tie won|Tie lost/);
});

test('a completed career season retains all match cards in history after the next season starts', () => {
  setup(); let s = { ...C.careerStart(G, U.S), pat: 20 };
  s = C.careerPlayHalf(G, C.careerPlayHalf(G, s));
  U.S.mode = { career: s }; U.tab = 'history';
  assert.equal(count(hub()), s.S.me.length, 'completed seasons retain goals and individual scores');
  const o = C.careerOffers(G, s).findIndex(o => o.kind === 'rest');
  s = C.careerNext(G, C.careerTake(G, s, o));
  assert.equal(s.y, 1);
  assert.equal(s.S.me.length, 0);
  U.S.mode.career = s;
  assert.equal(count(hub()), s.history[0].S.me.length);
});

test('Gauntlet history retains full matches from every earlier round without a twenty-entry cutoff', () => {
  setup(); const s = Rn.runRound(G, F, { ...Rn.runNew(7, U.S, 'reverse'), pat: 20 });
  const e = s.log.at(-1);
  U.S.mode = { run: { ...s, act: 1, log: Array.from({ length: 25 }, (_, i) => ({ ...e, seg: i })) } };
  assert.equal(count(V.gauntlet()), 150, 'earlier decades must retain every saved result');
});

test('legacy season match list includes league and Cup legs with goals', () => {
  setup(); U.R = V.season(); U.tab = 'fixtures';
  const ties = U.R.K.rounds.flat().filter(t => t.A === 'your-club' || t.B === 'your-club');
  const M = [...U.R.L.res.map(f => f.M), ...ties.flatMap(t => t.legs)];
  const html = V.results();
  assert.equal(count(html), M.length);
  assert.equal(goals(html), M.reduce((n, m) => n + m.ev.length, 0));
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('away goals and shootouts are presented from your side and neutral finals are labelled neutral', () => {
  setup();
  const f = { A: 'rival', B: 'your-club', an: 'Rival <XI>', bn: 'Your Era XI', neutral: true,
    M: { gx: 1, gy: 1, et: true, pw: { x: 3, y: 4, w: 1 }, ev: [{ m: 10, t: 0, sc: 'opponent' }, { m: 80, t: 1, sc: 'yours' }] } };
  const html = engineCard(f, 'your-club', 'Final');
  assert.match(html, /Neutral/);
  assert.doesNotMatch(html, /Away|Home/);
  assert.match(html, /Penalties 4–3/);
  assert.match(html, /class="them"><b>10/);
  assert.match(html, /class="mine"><b>80/);
  assert.match(html, /Rival &lt;XI&gt;/);
});

test('each of the eight Gauntlet decades displays all six round matches and both boss legs', () => {
  setup();
  const base = Rn.runNew(7, U.S, 'reverse');
  for (let act = 0; act < 8; act++) {
    const s = Rn.runRound(G, F, { ...base, act, pat: 20 });
    const b = Rn.runPlayBoss(G, F, { ...s, ph: 'boss', rd: 4 });
    U.S.mode = { run: b };
    const html = V.gauntlet(), entries = b.log.filter(e => ['seg', 'boss'].includes(e.t));
    assert.equal(count(html), 8, `${Rn.MAPS.reverse.D[act]}s lost a round match or boss leg`);
    const n = entries.reduce((n, e) => n + (e.t === 'seg' ? e.res.reduce((n, m) => n + m.sc.length, 0) : e.sc.flat().length), 0);
    assert.equal(goals(html), n);
    assert.doesNotMatch(html, /undefined|NaN/);
  }
});
