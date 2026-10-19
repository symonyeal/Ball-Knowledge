// What chemistry is worth, in the match model's own terms.
//
// Legend
//   pmf(l)          Poisson goal probabilities 0..12 for a mean of l
//   odds(RA, RB, Ds)  win, draw and loss chances of rated team RA against RB: the engine's expected goals, home
//                   and away averaged, with no absences, fatigue or substitutions (as club.js xp() projects)
//   worth(T, Ds, O) chemistry's effect on team T against the opponent entry O {T}: rating gained (ovr), and the
//                   win chance with and without chemistry; null without an opponent
import * as E from '../engine/index.js';

const pmf = (l, n = 12) => { const p = [Math.exp(-l)]; for (let k = 1; k <= n; k++) p.push(p[k - 1] * l / k); return p; };

export function odds(RA, RB, Ds) {
  let w = 0, d = 0, l = 0;
  for (const h of [E.P.h, 0]) {
    const a = pmf(E.lam(E.ln(RA), E.ln(RB), Ds, h)), b = pmf(E.lam(E.ln(RB), E.ln(RA), Ds, E.P.h - h));
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) { const p = a[i] * b[j] / 2; if (i > j) w += p; else if (i === j) d += p; else l += p; }
  }
  const t = w + d + l;
  return { w: w / t, d: d / t, l: l / t };
}

export function worth(T, Ds, O) {
  if (!O?.T) return null;
  const R = E.rate(T, Ds), R0 = E.rate(T, Ds, { chem: false }), Ro = E.rate(O.T, Ds);
  return { gain: R.ovr - R0.ovr, w: odds(R, Ro, Ds).w, w0: odds(R0, Ro, Ds).w };
}
