// Squad Building Challenges (EA FC Ultimate Team): build a starting eleven in the sandbox that meets every
// requirement; a completed challenge unlocks its reward card in the collection.
//
// Legend
//   R        requirement kinds, on the eleven starters xi (bench ignored; all eleven places must be filled):
//            chem team chemistry ≥ n; ovr squad rating, the mean base rating of xi, ≥ n; nat ≥ n of nation v;
//            lg ≥ n from league v; club ≥ n from one club; dec ≥ n cards of decade v; nats ≥ n nations;
//            s ≤ n S-tier cards
//   CORE     permanent challenges [id, name, requirements, reward pool]
//   weekly(G, A, w)  three challenges for ISO week w, drawn from the archive so each pool is large
//   reward(A, ch)    the reward card: a seeded draw from the A-tier cards of the challenge's pool
//   check(G, s, ch)  each requirement with its value and whether it holds

import { rate, mk, hs, sh } from './engine/index.js';
import { freeTeam } from './archive.js';
import { TI } from './cap.js';

const count = (xi, f) => xi.filter(f).length;
const tally = (Q, f) => { const m = new Map(); for (const c of Q) { const v = f(c); if (v) m.set(v, (m.get(v) || 0) + 1); } return m; };
const most = (xi, f) => Math.max(0, ...tally(xi, f).values());

export const R = {
  chem: { tx: n => `Team chemistry at least ${n}`, v: (xi, T, D) => rate(T, D).chem.total },
  ovr: { tx: n => `Squad rating at least ${n}`, v: xi => Math.round(10 * xi.reduce((x, c) => x + c.r, 0) / 11) / 10 },
  nat: { tx: (n, v) => `At least ${n} from ${v}`, v: (xi, T, D, v) => count(xi, c => c.nat === v) },
  lg: { tx: (n, v, G) => `At least ${n} from the ${G.lg?.[v]?.nm || v} top flight`, v: (xi, T, D, v) => count(xi, c => c.lg === v) },
  club: { tx: n => `At least ${n} from one club`, v: xi => most(xi, c => c.cq) },
  dec: { tx: (n, v) => `At least ${n} cards from the ${v}s`, v: (xi, T, D, v) => count(xi, c => c.D === v) },
  nats: { tx: n => `At least ${n} different nations`, v: xi => new Set(xi.map(c => c.nat).filter(Boolean)).size },
  s: { tx: n => `At most ${n} S-tier players`, v: xi => count(xi, c => TI(c.r) === 'S'), max: true },
};

export const CORE = [
  ['first', 'First XI', [['chem', 15]], {}],
  ['liga', 'La Liga XI', [['lg', 7, 'ESP'], ['chem', 20]], { lg: 'ESP' }],
  ['azzurri', 'Azzurri', [['nat', 6, 'Italy'], ['ovr', 80]], { nat: 'Italy' }],
  ['spine', 'One-club spine', [['club', 7], ['chem', 24]], {}],
  ['world', 'World XI', [['nats', 8], ['ovr', 82]], {}],
  ['total', 'Total Football', [['dec', 6, 1970], ['nat', 4, 'Netherlands'], ['chem', 18]], { nat: 'Netherlands', dec: 1970 }],
  ['cap', 'Cap discipline', [['ovr', 85], ['s', 1]], {}],
  ['perfect', 'Perfect chemistry', [['chem', 33]], {}],
].map(([id, nm, req, pool]) => ({ id, nm, req, pool }));

const pool = (A, o) => A.filter(c => (!o.nat || c.nat === o.nat) && (!o.lg || c.lg === o.lg) && (!o.dec || c.D === o.dec));

export function weekly(G, A, w) {
  const r = mk(hs(`${w}:sbc`)), top = (f, n) => [...tally(A, f)].filter(([, k]) => k >= n).map(([v]) => v).sort();
  const N = sh(r, top(c => c.nat, 600))[0], L = sh(r, top(c => c.lg, 2000))[0], D = Number(sh(r, top(c => String(c.D), 1))[0]);
  return [
    { id: `${w}:nat`, wk: w, nm: `${N} week`, req: [['nat', 5, N], ['chem', 20]], pool: { nat: N } },
    { id: `${w}:lg`, wk: w, nm: `${G.lg?.[L]?.nm || L} top flight`, req: [['lg', 8, L], ['ovr', 80]], pool: { lg: L } },
    { id: `${w}:dec`, wk: w, nm: `The ${D}s`, req: [['dec', 7, D], ['chem', 18], ['s', 2]], pool: { dec: D } },
  ];
}

export function reward(A, ch) {
  const P = pool(A, ch.pool), Q = P.filter(c => TI(c.r) === 'A');
  const c = sh(mk(hs(`${ch.id}:reward`)), Q.length ? Q : P)[0];
  return { k: c.k, p: c.p };
}

export function check(G, s, ch) {
  const T = freeTeam(G, s), xi = T.xi.filter(Boolean), full = xi.length === 11;
  const rows = ch.req.map(([k, n, v]) => {
    const x = full ? R[k].v(xi, T, s.D, v) : 0;
    return { tx: R[k].tx(n, v, G), x, ok: full && (R[k].max ? x <= n : x >= n) };
  });
  return [{ tx: 'Eleven starters', x: xi.length, ok: full }, ...rows];
}
export const met = (G, s, ch) => check(G, s, ch).every(r => r.ok);
