// G archive; x roster references {k,p}; c card; r base rating; n tier counts; lim tier allowances.
// Tiers are fixed before position, era, chemistry or manager adjustments. CAP is the drafted fifteen;
// GCAP is Eraball's Gauntlet cap (at most 2 S and 4 A; B, C and D unlimited), kept by the capped
// career. RCAP loosens it to 3 S and 6 A for the Gauntlet's fifteen: a capped run and a Gauntlet
// draft use it. A tier missing from lim is unlimited.
export const TI = r => (r >= 90 ? 'S' : r >= 85 ? 'A' : r >= 80 ? 'B' : r >= 75 ? 'C' : 'D');
export const CAP = Object.freeze({ S: 2, A: 4, B: 4, C: 3, D: 2 });
export const GCAP = Object.freeze({ S: 2, A: 4 });
export const RCAP = Object.freeze({ S: 3, A: 6 });

export function ct(G, x) {
  const n = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const ref of x.filter(Boolean)) {
    const c = G.cards[ref.k]?.find(c => c.p === ref.p);
    if (!c) throw new Error('A squad card is unavailable.');
    n[TI(c.r)]++;
  }
  return n;
}

export function ck(G, x, lim = CAP) {
  const n = ct(G, x);
  for (const t of Object.keys(lim)) if (n[t] > lim[t]) throw new Error(`${t}-tier cap: at most ${lim[t]} players in the whole squad.`);
  return n;
}

export function left(G, x, lim = CAP) {
  const n = ct(G, x);
  return Object.fromEntries(Object.keys(CAP).map(t => [t, (lim[t] ?? Infinity) - n[t]]));
}

export function fits(G, x, i, ref, lim = CAP) {
  const Q = x.slice(); Q[i] = ref;
  const n = ct(G, Q);
  return Object.keys(lim).every(t => n[t] <= lim[t]);
}
