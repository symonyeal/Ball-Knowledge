// EA's published base thresholds: ea.com/en-au/ea-play/news/pitch-notes-fifa-23-fut-chemistry-update.
// Only natural-position starters count. n_i = min(3, club_i + nation_i + league_i); O(11).
export const THRESHOLDS = { club:[2,4,7], nation:[2,5,8], league:[3,5,8] };
const key = s => typeof s === 'string' ? s.trim().toLocaleLowerCase('en') : '';
export const steps = (n, thresholds) => thresholds.filter(t => n >= t).length;

export function chemistry(T) {
  const groups = { club:new Map(), nation:new Map(), league:new Map() };
  const eligible = T.S.map((s,i) => !!T.xi[i]?.pos?.includes(s.s));
  const keys = c => ({club:c.cq || '',nation:key(c.nat),league:c.lg || ''});
  const add = (k,v) => { if(v)groups[k].set(v,(groups[k].get(v)||0)+1); };
  T.xi.forEach((c,i) => { if(eligible[i])for(const [k,v]of Object.entries(keys(c)))add(k,v); });
  // The manager contributes once to matching nation/league counts, never to club counts.
  if(groups.nation.has(key(T.m?.nat)))add('nation',key(T.m.nat));
  if(groups.league.has(T.m?.lg))add('league',T.m.lg);
  const players = {};
  T.xi.forEach((c,i) => {
    if(!c)return;
    const counts = {}, points = {};
    for(const [k,v] of Object.entries(keys(c))) {
      counts[k] = v ? groups[k].get(v)||0 : 0;
      points[k] = eligible[i] ? steps(counts[k],THRESHOLDS[k]) : 0;
    }
    players[c.id] = {eligible:eligible[i],n:Math.min(3,points.club+points.nation+points.league),counts,points};
  });
  return {players,total:Object.values(players).reduce((s,p)=>s+p.n,0),manager:{nat:T.m?.nat||'',lg:T.m?.lg||''},
    groups:Object.fromEntries(Object.entries(groups).map(([k,M])=>[k,Object.fromEntries(M)]))};
}
