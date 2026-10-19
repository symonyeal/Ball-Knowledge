// Chemistry: EA FC Ultimate Team's 0-3 points per starter, earned from the bonds of real careers.
// Only starters in a listed position count (eligible); bench players and out-of-position starters earn nothing
// and add nothing. For an eligible starter i:
//   nation   eligible starters sharing his football nation, himself included, + 1 for a manager of that nation
//   league   eligible starters whose card club shares his card club's league, + 1 for a manager from that league
//   club     1 + the sum over other eligible starters j of w_ij: TM when i and j were teammates (the same club
//            in overlapping years, at any club of their careers), CL when they played for one club at different
//            times; the strongest bond between the two counts once
//   coached  1 point when the manager coached him: a manager stint overlapping his spell at that club
// Points per count reach the THRESHOLDS steps; n_i = min(3, club + nation + league + coached). The team total
// is the sum over the eleven, at most 33.
// Legend
//   h        a card's career: [[club, first season, last season]], from hydrate(); a card without one has only
//            its own spell [cq, a, b], its card decade when undated
//   T.m.t    the manager's stints [[club, a, b]]; nat and lg as staff() gives them
//   links    eligible pairs {i, j, k: 'tm' | 'cl' | 'nat', q, y} for the pitch; tm and cl name the club and years
export const THRESHOLDS = { club:[2,4,7], nation:[2,5,8], league:[3,5,8] };
export const TM = 1, CL = 0.5;
export const steps = (n, thresholds) => thresholds.filter(t => n >= t).length;

// Without dates a card's spell is its card decade; without a decade, all time.
const spells = c => c.h?.length ? c.h : c.cq ? [[c.cq, c.a ?? (c.D ?? -1e4), c.b ?? (c.D != null ? c.D + 9 : 1e4)]] : [];
// The strongest club bond between two careers: teammates beat a shared club; earliest club breaks ties.
export function bond(x, y) {
  let best = null;
  for (const [q, a, b] of spells(x)) for (const [r, c, d] of spells(y)) {
    if (q !== r) continue;
    const k = a <= d && c <= b ? 'tm' : 'cl', y0 = k === 'tm' ? [Math.max(a, c), Math.min(b, d)] : [Math.min(a, c), Math.max(b, d)];
    if (!best || (k === 'tm' && best.k === 'cl') || (k === best.k && y0[0] < best.y[0])) best = { k, q, y: y0 };
  }
  return best;
}
export const coached = (m, c) => (m?.t || []).some(([q, a, b]) => spells(c).some(([r, x, y]) => q === r && a <= y && x <= b));

export function chemistry(T) {
  const xi = T.xi, eligible = T.S.map((s, i) => !!xi[i]?.pos?.includes(s.s));
  const groups = { nation:new Map(), league:new Map() };
  const add = (k, v) => { if (v) groups[k].set(v, (groups[k].get(v) || 0) + 1); };
  xi.forEach((c, i) => { if (eligible[i]) { add('nation', c.nat); add('league', c.lg); } });
  // The manager adds one to a matching nation or league count, never to a club count.
  if (groups.nation.has(T.m?.nat)) add('nation', T.m.nat);
  if (groups.league.has(T.m?.lg)) add('league', T.m.lg);
  const links = [], club = xi.map((c, i) => (c && eligible[i] ? 1 : 0)), B = xi.map(() => []);
  for (let i = 0; i < xi.length; i++) for (let j = i + 1; j < xi.length; j++) {
    if (!eligible[i] || !eligible[j]) continue;
    const b = bond(xi[i], xi[j]), nat = xi[i].nat && xi[i].nat === xi[j].nat ? xi[i].nat : '';
    if (b) { const w = b.k === 'tm' ? TM : CL; club[i] += w; club[j] += w; links.push({ i, j, ...b }); B[i].push({ id: xi[j].id, ...b }); B[j].push({ id: xi[i].id, ...b }); }
    else if (nat) links.push({ i, j, k: 'nat', q: nat });
    if (nat) { B[i].push({ id: xi[j].id, k: 'nat', q: nat }); B[j].push({ id: xi[i].id, k: 'nat', q: nat }); }
  }
  const players = {};
  xi.forEach((c, i) => {
    if (!c) return;
    const counts = { club: club[i], nation: c.nat ? groups.nation.get(c.nat) || 0 : 0, league: c.lg ? groups.league.get(c.lg) || 0 : 0 };
    const points = { club: 0, nation: 0, league: 0, coached: 0 };
    if (eligible[i]) {
      for (const k of ['club', 'nation', 'league']) points[k] = steps(counts[k], THRESHOLDS[k]);
      points.coached = coached(T.m, c) ? 1 : 0;
    }
    players[c.id] = { eligible:eligible[i], n:Math.min(3, points.club + points.nation + points.league + points.coached), counts, points, bonds:B[i] };
  });
  return { players, links, total:Object.values(players).reduce((s, p) => s + p.n, 0), manager:{ nat:T.m?.nat || '', lg:T.m?.lg || '' },
    groups:Object.fromEntries(Object.entries(groups).map(([k, M]) => [k, Object.fromEntries(M)])) };
}
