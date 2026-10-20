// Season results, the Era Gauntlet, the circuit and head to head, and the rules dialog.
//
// Legend
//   me()      your club entry for the engine: {id, nm, T, x, me}
//   season()  the seeded league and Cup for the draft's decade (recomputed from the saved draft)
//   results() scoreboard, form strip and tabs; tab views league, fixtures, cup, stats, lineup, gauntlet, more
//   xi(T, Q)  static pitch of a rated team; runPitch(s) the Gauntlet team in its current decade
//   arena()   a Gauntlet draft's own results page; honoured(h) act or run honours; rerated(s) decade change

import * as E from '../engine/index.js';
import { TI, fits } from '../cap.js';
import { team, POOL } from '../draft.js';
import * as Rn from '../run.js';
import { code } from '../play.js';
import { U, esc, num, ord, nm, club, kv, tier, rules, pitch, links, face, capTiles, teamLine, spell, portrait } from './kit.js';
import { candidate, marketPreview, upgradePreview } from './transfers.js';
import { card } from './match-centre.js';

export const me = () => { const T = team(U.G, U.S); return { id: 'your-club', nm: 'Your Era XI', T, x: E.rate(T, U.S.D).ovr, me: true }; };
export function season() {
  const { F, S } = U;
  if (F[S.D]?.length < 19) throw new Error(`The ${S.D}s archive needs nineteen opposition squads.`);
  return E.run(E.hs(`${S.seed}:season`), me(), F[S.D].slice(0, 19), F[S.D].slice(0, 15), S.D);
}
const clubName = id => (id === 'your-club' ? 'Your Era XI' : U.F[U.S.D].find(c => c.id === id)?.nm || id);

export function xi(T, Q, Ds, label) {
  const S = T.S, cells = Q.xi.map((p, i) => (p.c ? { kind: 'f', id: p.c.id, nm: p.c.nm, a: p.a, t: TI(p.c.r), q: p.c.cq, f: p.f, n: p.n, fc: face(p.c) } : null));
  return `<div class="xi"><div class="xi-pitch">${pitch(S, cells, { mode: 'view', links: links(Q), label })}</div>
    <div class="bn view">${Q.bn.map((p, j) => (p ? `<div class="bs f" style="${kv(p.c.cq)}">${portrait(p.c.id,p.c.nm,true)}<span class="v">${Math.round(p.a)}</span><span class="t"><b>${esc(p.c.nm)}</b><small>${tier(TI(p.c.r), 'sm')} Bench ${j + 1}</small></span></div>` : '')).join('')}</div></div>`;
}

export function breakdown(Q) {
  const row = (lab, p, b) => `<tr><td>${lab}</td><td>${esc(p.c.nm)}</td><td class="k">${num(p.c.r)}</td><td class="k">${b ? '0' : Math.round(p.f * 100)}%</td><td class="k">${Math.round((1 - p.e) * 100)}%</td><td class="k">${b ? '—' : p.n}</td><td class="k">${b ? '—' : `+${p.b}`}</td><td class="k"><b>${num(p.a)}</b></td></tr>`;
  return `<details class="breakdown"><summary>Rating breakdown</summary><div class="tw"><table><thead><tr><th>Place</th><th>Player</th><th class="k">Base</th><th class="k">Fit loss</th><th class="k">Era loss</th><th class="k">Chem</th><th class="k">Partner</th><th class="k">Final</th></tr></thead>
    <tbody>${Q.xi.filter(p => p.c).map(p => row(p.s, p)).join('')}${Q.bn.filter(Boolean).map((p, i) => row(`B${i + 1}`, p, true)).join('')}</tbody></table></div>
    <p class="small">Final = base × (1 − fit loss) × era factor + chemistry + partnership bonus. Fit loss comes from the player's own rating in that slot where a game database rates him, otherwise from the distance to his listed positions. The bench has no fit loss.</p></details>`;
}

function table(Q) {
  return `<div class="tw league"><table><thead><tr><th class="k">#</th><th>Club</th><th class="k">P</th><th class="k">W</th><th class="k">D</th><th class="k">L</th><th class="k">GF</th><th class="k">GA</th><th class="k">GD</th><th class="k">Pts</th></tr></thead>
    <tbody>${Q.map((c, i) => `<tr class="${c.me || c.id === 'your-club' ? 'your-row' : ''}"><td class="k">${i + 1}</td><td>${esc(c.nm)}${c.me ? ' <i class="tg w">You</i>' : ''}</td>${['P', 'W', 'D', 'L', 'GF', 'GA'].map(k => `<td class="k">${c[k]}</td>`).join('')}<td class="k">${c.GF - c.GA > 0 ? '+' : ''}${c.GF - c.GA}</td><td class="k"><b>${c.Pts}</b></td></tr>`).join('')}</tbody></table></div>`;
}
const stRows = st => [...(st instanceof Map ? st.values() : st || [])].map(p => ({ ...p, nm: p.nm || nm(p.id) })).sort((a, b) => b.g - a.g || b.as - a.as || b.cs - a.cs);
export function awards(a = U.R.L.awards || {}, scope = 'League', name = clubName) {
  const L = [[`${scope} top scorer`, a.scorer, 'g', 'goals'], ['Assist leader', a.assists, 'as', 'assists'], ['Clean sheet leader', a.keeper, 'cs', 'clean sheets'], [`Player of the ${scope === 'League' ? 'season' : 'circuit'}`, a.player, 'ap', 'appearances']];
  return `<aside class="awards" aria-label="${scope} awards">${L.filter(([, p]) => p).map(([l, p, k, u]) => `<article class="stat-card"><p class="lbl">${l}</p><p class="aw">${esc(p.nm || nm(p.id))}</p><p class="small">${p[k]} ${u} · ${esc(name(p.cl))}</p></article>`).join('')}</aside>`;
}
const fixtures = () => `<div class="fixtures">${U.R.L.res.map(c => `<article class="fixture"><span class="fr">MD ${c.rd}<br>${c.h ? 'Home' : 'Away'}</span><b class="fsc">${c.gf}–${c.ga}</b><span class="fo">${esc(c.op)}</span><span class="fw ${c.gf > c.ga ? 'win' : c.gf < c.ga ? 'loss' : 'draw'}">${c.gf > c.ga ? 'W' : c.gf < c.ga ? 'L' : 'D'}</span></article>`).join('')}</div>`;
const cupRounds = K => K.rounds.map((Q, i) => `<section class="cup-round"><h3>${E.RD[i] || `Round ${i + 1}`}</h3>${Q.map(t => `<div class="cup-tie ${t.A === 'your-club' || t.B === 'your-club' ? 'cup-tie--yours' : ''}"><div>${esc(t.an)}<br>${esc(t.bn)}<small>${t.legs.length === 2 ? `Two legs: ${t.legs[0].gx}–${t.legs[0].gy} / ${t.legs[1].gx}–${t.legs[1].gy}` : 'Neutral final'}${t.et ? ' · Extra time' : ''}${t.pw ? ' · Penalties' : ''} · Winner: ${esc(t.wn)}</small></div><strong>${t.agg[0]}–${t.agg[1]}</strong></div>`).join('')}</section>`).join('');
const stats = () => `<div class="tw"><table><thead><tr><th>Player</th><th>Club</th><th class="k">Apps</th><th class="k">Goals</th><th class="k">Assists</th><th class="k">CS</th></tr></thead>
    <tbody>${stRows(U.R.L.st).slice(0, 120).map(p => `<tr class="${p.cl === 'your-club' ? 'your-row' : ''}"><td>${esc(p.nm)}</td><td>${esc(clubName(p.cl))}</td><td class="k">${p.ap}</td><td class="k">${p.g}</td><td class="k">${p.as}</td><td class="k">${p.cs}</td></tr>`).join('')}</tbody></table></div>
    <p class="small">Simulated appearances, goals and assists. Who scores follows each player's real scoring rate where his card has one.</p>`;

function cupPath(K) {
  const T = K.rounds.map((R, i) => [E.RD[i], R.find(t => t.A === 'your-club' || t.B === 'your-club')]).filter(([, t]) => t);
  const last = T.at(-1);
  if (!last) return '';
  const [k, t] = last, mine = t.A === 'your-club', op = mine ? t.bn : t.an, f = mine ? t.agg[0] : t.agg[1], a = mine ? t.agg[1] : t.agg[0];
  return t.w === 'your-club' ? `European Cup winners: ${f}–${a} against ${esc(op)} in the final.` : `European Cup: out in the ${k.toLowerCase()} to ${esc(op)}, ${f}–${a}${t.legs.length === 2 ? ' on aggregate' : ''}${t.et ? ' after extra time' : ''}${t.pw ? ' and penalties' : ''}. Winners: ${esc(K.champN)}.`;
}

export function results() {
  const { R, S } = U, i = R.L.tab.findIndex(c => c.me), t = R.L.tab[i], cup = R.K.champ === 'your-club', hon = R.honours || [];
  const T = [['league', 'League table'], ['fixtures', 'Your matches'], ['cup', 'European Cup'], ['stats', 'Player stats'], ['lineup', 'Your XI'], ['gauntlet', 'Era Gauntlet'], ['more', 'More modes']];
  const Tm = team(U.G, S), Q = E.rate(Tm, S.D);
  const body = { league: () => `<div class="res-grid"><div><h2 class="st">The ${S.D}s Era League</h2>${table(R.L.tab)}<p class="small">Double round robin · 3 points for a win · ranked by points, goal difference, then goals scored.</p></div>${awards()}</div>`,
    fixtures: () => `<h2 class="st">Your 38 league matches</h2>${fixtures()}`, cup: () => `<h2 class="st">The European Cup</h2>${cupRounds(R.K)}<p class="small">Two legs through the semi-finals, a neutral final, extra time and penalties; no away-goals rule.</p>`,
    stats: () => `<h2 class="st">League player statistics</h2>${stats()}`,
    lineup: () => `<h2 class="st">Your XI · ${esc(S.f)}</h2>${xi(Tm, Q, S.D, `Your ${S.f}`)}${breakdown(Q)}`, gauntlet, more }[U.tab] || (() => '');
  const head = i === 0 && cup ? 'A team for the ages' : i === 0 ? 'Champions' : cup ? 'Kings of Europe' : i < 4 ? 'Top four' : 'Season complete';
  return `<section class="result-hero" style="${kv(spell(S)?.q)}">
      <div class="rh-pos"><p class="lbl">${S.D}s season · full time</p><p class="big">${i + 1}<sup>${ord(i + 1).slice(-2)}</sup></p><p class="small">${head}</p></div>
      <div class="rh-stats"><div><b>${t.Pts}</b><span>Points</span></div><div><b>${t.W}–${t.D}–${t.L}</b><span>W–D–L</span></div><div><b>${t.GF}:${t.GA}</b><span>Goals</span></div><div><b>${R.L.unbeaten}</b><span>Best unbeaten run</span></div></div>
      <div class="rh-team"><p class="lbl">Your Era XI · ${rules(S)}</p><p class="rh-line">${esc(teamLine(S))}</p><p class="small">${cupPath(R.K)}</p>${hon.length ? `<div class="honours">${hon.map(h => `<span class="honour">${esc(h)}</span>`).join('')}</div>` : ''}</div>
    </section>
    <div class="form" role="img" aria-label="League form: ${R.L.res.map(c => (c.gf > c.ga ? 'W' : c.gf < c.ga ? 'L' : 'D')).join(' ')}">${R.L.res.map(c => { const r = c.gf > c.ga ? 'W' : c.gf < c.ga ? 'L' : 'D'; return `<i class="${r}" title="${esc(`MD ${c.rd} ${c.h ? 'v' : 'at'} ${c.op} ${c.gf}–${c.ga}`)}">${r}</i>`; }).join('')}</div>
    <div class="results-tabs" role="tablist" aria-label="Season results">${T.map(([v, l]) => `<button type="button" role="tab" data-tab="${v}" aria-selected="${U.tab === v}" aria-controls="result-panel" id="tab-${v}" tabindex="${U.tab === v ? 0 : -1}">${l}</button>`).join('')}</div>
    <section id="result-panel" role="tabpanel" aria-labelledby="tab-${U.tab}">${body()}</section>
    <div class="share-strip"><p class="small">${S.wk ? `Weekly challenge ${esc(S.wk)} · ` : ''}${rules(S)} · Seed ${S.seed} · ${S.D}s · saved in this browser.</p><div class="row wrap">
      <button class="btn sm" type="button" id="share">Copy result</button><button class="btn q sm" type="button" id="result-card">Result card ↓</button>
      <button class="btn q sm" type="button" id="download">Download replay ↓</button><button class="btn q sm" type="button" id="replay">Replay this seed ↻</button></div></div>`;
}

// Era Gauntlet
// runCards(e): the match cards of a round or boss entry of the run log; legs are stored from each home side.
export function runCards(e) {
  if (e.t === 'seg') return e.res.map((m, i) => card(m, `${e.D}s · Round ${e.seg + 1} · Match ${i + 1} · ${m.h ? 'Home' : 'Away'}`, `<span>${m.h ? 'v' : 'at'} ${esc(m.op)}</span>`));
  if (!e.legs) return [];
  const L = [[e.legs[0][0], e.legs[0][1]], [e.legs[1][1], e.legs[1][0]]], pw = e.pw && [e.pw.y, e.pw.x];
  return L.map(([gf, ga], i) => card({ gf, ga, ...(e.sc ? { sc: e.sc[i] } : {}) }, `${e.D}s · Boss · Leg ${i + 1} · ${i ? 'Away' : 'Home'}`, `<span>${i ? 'at' : 'v'} ${esc(e.op)}</span>`,
    i ? [e.et && 'After extra time', pw && `Penalties ${pw.join('–')}`, `Aggregate ${e.agg.join('–')}`, e.won ? 'Boss beaten' : 'Boss tie lost',
      e.mvp && `MVP: ${esc(nm(e.mvp))} +1 rating`, e.lvp && `LVP: ${esc(nm(e.lvp))} −1 rating`] : []));
}
// Formation and two-place swaps between matches, rated for the decade about to be played.
const runLineup = s => `<details class="breakdown"><summary>Change the lineup</summary><div class="repo-ctl">
  <label class="field"><span class="lbl">Formation</span><select id="run-form">${Object.keys(U.G.formations).map(f => `<option value="${esc(f)}" ${f === s.f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label>
  <button class="btn q" type="button" id="run-form-apply">Change formation</button>
  <label class="field"><span class="lbl">First place</span><select id="run-swap-a">${squadOptions(s)}</select></label><label class="field"><span class="lbl">Second place</span><select id="run-swap-b">${squadOptions(s)}</select></label>
  <button class="btn q" type="button" id="run-swap">Swap players</button></div></details>`;
const pips = p => `<span class="pips" role="img" aria-label="Patience ${p} of ${Rn.PAT_MAX}">${Array.from({ length: Rn.PAT_MAX }, (_, i) => `<i class="${i < p ? 'on' : ''}"></i>`).join('')}</span>`;
const charged = (s, p) => { const r = Rn.bill(U.G, s).find(r => r.p === p); return TI(U.G.cards[r.k].find(c => c.p === p).r); };
function runSquad(s) {
  const { G } = U, T = Rn.runTeam(G, s), Q = E.rate(T, Rn.D_of(s)), bill = Rn.bill(G, s), n = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const r of bill) n[TI(G.cards[r.k].find(c => c.p === r.p).r)]++;
  const cap = s.cap ? `<section class="capb" aria-label="Gauntlet cap"><div class="row"><p class="lbl">Gauntlet cap</p><span class="small sp">At most ${Rn.RCAP.S} S and ${Rn.RCAP.A} A among the fifteen</span></div>${capTiles(n, Rn.RCAP)}<p class="small dim">A boosted player keeps the tier he was drafted or signed at.</p></section>`
    : '<section class="capb classic"><p class="lbl">Classic run</p><p class="small">Any tier can fill an open place.</p></section>';
  return `${cap}<details class="breakdown"><summary>Your squad in the ${Rn.D_of(s)}s · overall ${num(Q.ovr)} · ${esc(s.f)}</summary><div class="tw"><table><thead><tr><th>Place</th><th>Player</th><th>Card</th><th class="k">Rating here</th></tr></thead>
    <tbody>${[...Q.xi, ...Q.bn.filter(Boolean).map((p, i) => ({ ...p, s: `B${i + 1}` }))].map(p => {
      const r = bill.find(r => r.p === p.c.id), c = G.cards[r.k].find(c => c.p === r.p);
      return `<tr><td>${p.s}</td><td>${esc(p.c.nm)} ${tier(TI(p.c.r), 'sm')}${s.up[p.c.id] ? ` <span class="honour">Boosted${s.cap ? ` · ${TI(c.r)} charge` : ''}</span>` : ''}</td><td>${esc(club(`${p.c.cq}:${p.c.D}`))} · ${Math.round(p.c.r)}</td><td class="k">${num(p.a)}</td></tr>`;
    }).join('')}</tbody></table></div></details>`;
}
const left = (s, c) => { const n = s.pat - c; return n < 1 ? '<p class="warn small">Not enough patience: the board keeps at least 1.</p>' : `<p class="small">Leaves ${n} patience${n <= Rn.B_LOSS(s.lost) ? ': one boss loss would end the run' : ''}.</p>`; };
const mapChoice = () => `<label class="field"><span class="lbl">Gauntlet map</span><select id="run-map">${Object.entries(Rn.MAPS).map(([k, m]) => `<option value="${k}" ${k === 'reverse' ? 'selected' : ''}>${esc(m.nm)} · ${m.D.map(d => `${d}s`).join(' → ')}</option>`).join('')}</select></label>`;
function squadOptions(s, only) {
  const T = Rn.runTeam(U.G, s);
  return s.slots.map((r, i) => (only && !only.includes(i) ? '' : `<option value="${i}">${i < 11 ? T.S[i].s : `Bench ${i - 10}`} · ${esc(nm(r.p))} · ${charged(s, r.p)} charge</option>`)).join('');
}
export function signing(s, o, pick = 0, i = 0) {
  const f = o.list[pick], cost = o.kind === 'desp' ? f.cost : Rn.price(U.G, s, f, i);
  const ok = !s.cap || fits(U.G, Rn.bill(U.G, s), i, f, Rn.RCAP);
  const tx = !ok ? 'This replacement exceeds the S or A cap.' : `Costs ${cost} patience; leaves ${s.pat - cost}.${o.kind === 'market' && TI(f.r) === 'S' ? ' S signings play 3 points below their rating on the bench.' : o.kind === 'market' && TI(f.r) === 'C' ? ' C signings play 3 points above their rating when starting.' : ''}`;
  return { cost, ok: ok && s.pat - cost >= 1, tx };
}
function offerCard(o, j, s) {
  if (o.kind === 'dev') {
    if (o.id === 'upg') return `<article class="reward reward--boost"><p class="lbl">Prime-card boost</p><h3>Upgrade the same player</h3>
      <label class="field"><span class="lbl">Player</span><select id="up-pick-${j}" data-up-pick="${j}">${o.list.map((u, i) => `<option value="${i}">${esc(nm(u.from.p))} · ${Math.round(u.from.r)} → ${Math.round(u.to.r)} · ${esc(club(u.to.k))} · ${u.cost} patience</option>`).join('')}</select></label>
      <div data-upgrade-preview="${j}" data-transfer-mode="run">${upgradePreview(s,o.list[0],false)}</div><p class="small">${s.cap ? 'An earned upgrade keeps the player’s original tier charge.' : 'He becomes his highest-rated card in the archive.'}</p><div id="up-price-${j}">${left(s, o.list[0].cost)}</div><button class="btn" type="button" data-take="${j}" ${s.pat - o.list[0].cost < 1 ? 'disabled' : ''}>Upgrade him</button></article>`;
    const d = Rn.DEV[o.id];
    return `<article class="reward"><p class="lbl">Development · ${o.cost} patience</p><h3>${esc(d.nm)}</h3><p class="small">${esc(d.tx)}</p>
      ${o.team ? '' : `<label class="field"><span class="lbl">Player</span><select id="dev-player-${j}">${squadOptions(s, o.who)}</select></label>`}${left(s, o.cost)}
      <button class="btn" type="button" data-take="${j}" ${s.pat - o.cost < 1 ? 'disabled' : ''}>Develop</button></article>`;
  }
  if (o.kind === 'market' || o.kind === 'desp') {
    const x = signing(s, o), u = Rn.sur(s);
    return `<article class="reward"><p class="lbl">${o.kind === 'desp' ? 'Desperation offer' : 'Transfer market'}</p><h3>Sign one, release one</h3>
      <label class="field"><span class="lbl">Sign</span><select id="fa-pick-${j}" data-fa="${j}">${o.list.map((f, i) => `<option value="${i}">${esc(nm(f.p))} · ${esc(club(f.k))} · ${Math.round(f.r)} · ${TI(f.r)} tier</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">Release</span><select id="fa-slot-${j}" data-fa="${j}">${squadOptions(s)}</select></label>
      <div data-transfer-preview="${j}" data-transfer-mode="run">${marketPreview(s,j,0,0,false)}</div><p class="small" id="fa-price-${j}" role="status">${esc(x.tx)}</p>${s.cap ? `<p class="small dim">Keep at most ${Rn.RCAP.S} S-tier and ${Rn.RCAP.A} A-tier charges among the fifteen.</p>` : ''}<button class="btn" type="button" data-take="${j}" ${x.ok ? '' : 'disabled'}>Confirm signing and release</button>
      ${o.re ? `<div class="row wrap"><button class="btn q sm" type="button" data-respin="scout" ${s.pat < 3 + 2 * u ? 'disabled' : ''}>Scout re-spin · ${1 + u}</button><button class="btn q sm" type="button" data-respin="premium" ${s.pat < 8 + 2 * u ? 'disabled' : ''}>A/S re-spin · ${5 + u}</button></div>` : ''}</article>`;
  }
  return `<article class="reward"><p class="lbl">Rest</p><h3>Recover</h3><p class="small">${o.gain ? `+${o.gain} patience.` : 'Resting again is worth nothing; choose another reward to reset it.'}</p><button class="btn q" type="button" data-take="${j}" data-rest>Rest</button></article>`;
}
function transfer(s) {
  const H = Rn.hopPools(U.G, s);
  return `<h3>Transfer window</h3><p class="small">Sign one player from the ${H.from}s and one from the ${H.to}s. Each replaces a different squad player at no patience cost. Keep your S and A charges within their limits.</p>
    <div class="rewards transfer-pools">${[['old', H.old, H.from], ['neu', H.neu, H.to]].map(([k, Q, D]) => `<fieldset class="reward"><legend class="lbl">${D}s arrivals</legend>${Q.map((f, i) => `<div class="transfer-pick"><label><input type="radio" name="run-hop-${k}" data-hop-pick="${k}" value="${i}"> ${esc(nm(f.p))} · ${esc(f.l)} · ${Math.round(f.r)} · ${TI(f.r)} tier</label><div data-arrival-preview>${candidate(f)}</div><label class="field"><span class="lbl">Release</span><select id="hop-out-${k}-${i}"><option value="">Choose a squad player</option>${squadOptions(s)}</select></label></div>`).join('')}</fieldset>`).join('')}</div>
    <p class="small" id="run-transfer-window-status" role="status">Choose the arrivals and different players to release.</p><div id="run-transfer-window-preview"></div><button class="btn" type="button" id="run-hop" disabled>Confirm transfers and enter the ${H.to}s</button>`;
}
const sgn = x => `${x >= 0 ? '+' : '−'}${num(Math.abs(x))}`;
export function honoured(h, title) {
  const I = [['Player', h.player, p => `${p.g} goals · ${p.as} assists`], ['Top scorer', h.scorer, p => `${p.g} goals`], ['Assists', h.assists, p => `${p.as} assists`],
    ['Clean sheets', h.keeper, p => `${p.cs} clean sheets`]].filter(([, p]) => p);
  const w = h.win && h.win.gf > h.win.ga ? `<article class="stat-card"><p class="lbl">Biggest win</p><p class="aw">${h.win.gf}–${h.win.ga}</p><p class="small">${h.win.h ? 'v' : 'at'} ${esc(h.win.op)}</p></article>` : '';
  return I.length || w ? `<h3>${esc(title)}</h3><aside class="awards" aria-label="${esc(title)}">${I.map(([l, p, t]) => `<article class="stat-card"><p class="lbl">${l}</p><p class="aw">${esc(nm(p.id))}</p><p class="small">${t(p)}</p></article>`).join('')}${w}</aside>` : '';
}
// A transfer can leave an outfielder in goal: name him and his rating there.
function keeper(s, D) {
  const p = E.rate(Rn.runTeam(U.G, s), D).xi.find(p => p.s === 'GK');
  return p?.c && !p.c.pos?.includes('GK') ? `<p class="warn small">${esc(p.c.nm)} is in goal at ${num(p.a)}. Swap a goalkeeper into the GK place before entering the ${D}s.</p>` : '';
}
// Each squad place's rating in the decade being left and the one about to be played.
function rerated(s) {
  const T = Rn.runTeam(U.G, s), D0 = Rn.D_of(s), D1 = Rn.MAPS[s.map].D[s.act + 1], A = E.rate(T, D0), B = E.rate(T, D1);
  const Q = [...A.xi.map((p, i) => [p, B.xi[i], p.s]), ...A.bn.map((p, i) => [p, B.bn[i], `B${i + 1}`])].filter(([p]) => p?.c);
  return `<details class="breakdown" open><summary>Re-rated for the ${D1}s · overall ${num(A.ovr)} → ${num(B.ovr)}</summary><div class="tw"><table><thead><tr><th>Place</th><th>Player</th><th class="k">${D0}s</th><th class="k">${D1}s</th><th class="k">Change</th></tr></thead>
    <tbody>${Q.map(([p, q, l]) => `<tr><td>${l}</td><td>${esc(p.c.nm)}</td><td class="k">${num(p.a)}</td><td class="k">${num(q.a)}</td><td class="k">${sgn(q.a - p.a)}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function runPitch(s, D) {
  const T = Rn.runTeam(U.G, s), Q = E.rate(T, D);
  return xi(T, Q, D, `Your ${s.f} in the ${D}s`);
}
export function gauntlet() {
  const { G, S, F } = U, s = S.mode?.run;
  if (!s) {
    return `<div class="challenge-card"><p class="lbl">One squad. Four maps.</p><h2>Era Gauntlet</h2>
      <p class="small">Choose a three-decade route or all eight decades, forwards or backwards. Each decade has four six-match rounds against rising opposition, a reward after the second and fourth, then a two-legged boss tie. A win opens a transfer window of two signings that leads into the next decade; a loss costs board patience and restarts the decade against a different boss.${S.cap ? ` Hold at most ${Rn.RCAP.S} S-tier and ${Rn.RCAP.A} A-tier charges; earned boosts keep the player’s original charge.` : ''}</p>
      ${mapChoice()}<button class="btn" type="button" id="run-start">Start the Gauntlet</button></div>`;
  }
  const Dc = Rn.D_of(s), b = Rn.runBoss(F, s), last = s.log.at(-1), sc = Rn.score(s);
  let main = '';
  const wait = ['rd', 'node'].includes(s.ph) && s.rd === Rn.N_RD - 1 ? `<p class="run-boss small">Waiting after this round: <b>${esc(b.nm)}</b> · strength ${num(b.x)} against your ${num(E.rate(Rn.runTeam(G, s), Dc).ovr)}.</p>` : '';
  if (s.ph === 'rd') main = `<p class="small">Round ${s.rd + 1} of ${Rn.N_RD}: six matches against rising ${Dc}s opposition. Earn 13+ points for +2 patience, 18 for +3; fewer than 9 costs patience. ${Rn.NODE(s.rd) ? 'A reward follows this round.' : 'The next round follows directly.'}</p>${wait}<button class="btn" type="button" id="run-round">Play the round</button>`;
  else if (s.ph === 'node') main = `${wait}<p class="small">Choose one reward. Prices rise by ${Rn.sur(s)} patience in this act.</p><div class="rewards">${Rn.offers(G, F, s).map((o, j) => offerCard(o, j, s)).join('')}</div>`;
  else if (s.ph === 'boss') main = `<p class="small">The ${Dc}s boss: <b>${esc(b.nm)}</b> (strength ${num(b.x)}). Your squad here: ${num(E.rate(Rn.runTeam(G, s), Dc).ovr)}. Home and away, with extra time and penalties if aggregate goals are level.</p><button class="btn" type="button" id="run-boss">Face the boss</button>`;
  else if (s.ph === 'hop') main = `${honoured(Rn.honours(s, s.act), `The ${Dc}s honours`)}${keeper(s, Rn.D_next(s))}${rerated(s)}${transfer(s)}`;
  else if (s.ph === 'repo') {
    const D1 = Rn.MAPS[s.map].D[s.act + 1], rec = G.managers.find(m => m.nm === s.m.nm)?.f || [];
    main = `<h3>Prepare for the ${D1}s</h3><p class="small">Swap any two squad places or change formation before entering the next decade. A formation change keeps every card, the bench and your cap charges.</p>
      ${keeper(s, D1)}${rerated(s)}<div class="repo">${runPitch(s, D1)}<div class="repo-ctl">
        <label class="field"><span class="lbl">Formation</span><select id="run-form">${Object.keys(G.formations).map(f => `<option value="${esc(f)}" ${f === s.f ? 'selected' : ''}>${esc(f)}${rec.includes(f) ? ' · recorded' : ''}</option>`).join('')}</select></label>
        <button class="btn q" type="button" id="run-form-apply">Change formation</button>
        <label class="field"><span class="lbl">First place</span><select id="run-swap-a">${squadOptions(s)}</select></label><label class="field"><span class="lbl">Second place</span><select id="run-swap-b">${squadOptions(s)}</select></label>
        <div class="row wrap"><button class="btn q" type="button" id="run-swap">Swap players</button><button class="btn" type="button" id="run-next">Enter the ${D1}s</button></div></div></div>`;
  } else if (s.ph === 'done') main = `<h3>Map conquered</h3><p class="small">Score ${num(sc.score)} · ${sc.attempts} boss ties · ${sc.w}-${sc.d}-${sc.l} in rounds · ${s.pat} patience left.</p>${honoured(Rn.honours(s), 'Run honours')}`;
  else main = `<h3>The board has lost patience</h3><p class="small">Your run ended in the ${Dc}s after ${sc.acts} boss wins · score ${num(sc.score)} · ${sc.w}-${sc.d}-${sc.l} in rounds.</p>${honoured(Rn.honours(s), 'Run honours')}`;
  const msg = !last ? '' : last.t === 'seg' ? `Last round: ${last.w}-${last.d}-${last.l}, ${last.pts} points, patience ${last.dp >= 0 ? '+' : ''}${last.dp}.`
    : last.t === 'boss' ? `Boss: ${(last.agg || [last.gx, last.gy]).join('–')}${last.pw ? ' (penalties)' : last.et ? ' (extra time)' : ''}: ${last.won ? 'won' : 'lost'}, patience ${last.dp >= 0 ? '+' : ''}${last.dp}.${last.mvp ? ` MVP: ${nm(last.mvp)} (+1 rating).` : last.lvp ? ` LVP: ${nm(last.lvp)} (−1 rating).` : ''}`
      : last.t === 'boost' ? `Boost card played: ${nm(last.p)} is now ${club(last.to)}.` : last.t === 'sign' ? `Signed ${nm(last.p)}, released ${nm(last.out)}.`
        : last.t === 'dev' ? `${Rn.DEV[last.id]?.nm || 'Development'}${last.p ? `: ${nm(last.p)}` : ''}.` : last.t === 'hop' ? 'Transfers complete.'
          : last.t === 'form' ? `Formation changed to ${last.f}.` : last.t === 'respin' ? 'New transfer offers scouted.' : last.t === 'act' ? `Entered the ${Dc}s.` : 'Rested.';
  return `<section class="run"><div class="run-head"><div><p class="lbl">${esc(Rn.MAPS[s.map].nm)} · ${rules(s)} · decade ${s.act + 1} of ${Rn.MAPS[s.map].D.length}</p><h2>The ${Dc}s</h2></div>
      <div class="run-pat"><span class="lbl">Board patience ${s.pat} / ${Rn.PAT_MAX}</span>${pips(s.pat)}</div></div>
    ${msg ? `<p class="run-msg" role="status">${esc(msg)}</p>` : ''}${main}
    ${['done', 'fired'].includes(s.ph) ? `${mapChoice()}<button class="btn q sm" type="button" id="run-start">Start a new run ↻</button>` : ''}
    ${runSquad(s)}${['rd', 'node', 'boss', 'hop'].includes(s.ph) ? runLineup(s) : ''}
    <h3 class="st">Matches in the ${Dc}s</h3><div class="match-list">${s.log.filter(e => e.act === s.act && ['seg', 'boss'].includes(e.t)).map((e, i, Q) => `<details class="breakdown" ${i === Q.length - 1 ? 'open' : ''}><summary>${e.t === 'seg' ? `Round ${e.seg + 1} · ${e.w}-${e.d}-${e.l} · ${e.gf}–${e.ga}` : `Boss tie · attempt ${e.n} · ${(e.agg || [e.gx, e.gy]).join('–')} ${e.won ? 'won' : 'lost'}`}</summary><div class="match-list">${runCards(e).join('')}</div></details>`).join('') || '<p class="empty">Your matches appear after the first round.</p>'}</div>
    <div class="mode-log">${s.log.slice().reverse().filter(e => (e.t === 'seg' || e.t === 'boss') && e.act !== s.act).slice(0, 20).map(e => `<div class="mode-event"><div>${e.D}s · ${e.t === 'seg' ? `Round ${e.seg + 1}` : `Boss · ${esc(e.op)}`}<small>${e.t === 'seg' ? `${e.w}-${e.d}-${e.l} · ${e.gf}–${e.ga}` : `Attempt ${e.n}${e.pw ? ' · penalties' : e.et ? ' · extra time' : ''}`}</small></div><b>${e.t === 'seg' ? `${e.pts} pts` : `${(e.agg || [e.gx, e.gy]).join('–')} ${e.won ? 'win' : 'loss'}`}</b></div>`).join('')}</div></section>`;
}

// A Gauntlet draft's results page: the run itself, then the replay controls.
export function arena() {
  const S = U.S;
  return `<div class="arena"><p class="eyebrow">Era Gauntlet · ${esc(Rn.MAPS[S.g].nm)}</p>${gauntlet()}</div>
    <div class="share-strip"><p class="small">${rules(S)} · Seed ${S.seed} · drafted from the ${Math.max(1950, S.D - POOL)}s to the ${Math.min(2020, S.D + POOL)}s · saved in this browser.</p><div class="row wrap">
      <button class="btn sm" type="button" id="share">Copy result</button><button class="btn q sm" type="button" id="download">Download replay ↓</button></div></div>`;
}
export function runShareText() {
  const S = U.S, s = S.mode.run, sc = Rn.score(s);
  return `Ball Knowledge · Era Gauntlet · ${Rn.MAPS[s.map].nm} · ${rules(S)}
${sc.acts} of ${Rn.MAPS[s.map].D.length} decades cleared · ${sc.w}W ${sc.d}D ${sc.l}L · score ${num(sc.score)}
${teamLine(S)}
Seed ${S.seed} · ${location.href.split('?')[0]}`;
}

export function more() {
  const { C, H, S, F } = U;
  let cc = '';
  if (C) cc = `<div class="circuit"><p class="lbl">Tournament circuit · complete</p><h2>${C.totals.titles} titles · ${C.events.length} events</h2><p class="small">${C.totals.played} matches · ${C.totals.won} wins · ${C.totals.gf} scored · ${C.totals.ga} conceded</p>
    <div class="honours">${C.honours.map(h => `<span class="honour">${esc(h)}</span>`).join('')}</div>
    ${awards(C.awards, 'Circuit', id => (id === 'your-club' ? 'Your Era XI' : Object.values(F).flat().find(c => c.id === id)?.nm || id))}
    <div class="mode-log">${C.events.map(c => `<div class="mode-event"><div>Event ${c.i} · ${c.Ds}s · ${esc(c.label)}<small>${c.matches.filter(f => f.A === 'your-club' || f.B === 'your-club').length} of your matches${c.position ? ` · ${ord(c.position)} place` : ''}</small></div><b>${c.won ? 'Champion' : c.position ? ord(c.position) : 'Out'}</b></div>`).join('')}</div></div>`;
  let hh = '';
  if (H) hh = `<div class="cup-tie cup-tie--yours"><div>${H.legs.map(l => `${esc(l.h)} ${l.M.gx}–${l.M.gy} ${esc(l.a)} <small>${l.D}s</small>`).join('<br>')}<small>${H.et ? 'Extra time · ' : ''}${H.pw ? 'Penalties · ' : ''}Winner: ${esc(H.wn)}</small></div><strong>${H.agg[0]}–${H.agg[1]}</strong></div>`;
  return `<div class="challenge-grid"><article class="challenge-card"><p class="lbl">The long road</p><h2>Tournament circuit</h2>
      <p class="small">Ten to twenty events across all decades, rotating league, knockout and group formats. Era adjustments are recalculated at every event.</p>
      <label class="field"><span class="lbl">Events</span><select id="circuit-events">${Array.from({ length: 11 }, (_, i) => `<option value="${i + 10}" ${U.ev === i + 10 ? 'selected' : ''}>${i + 10} events</option>`).join('')}</select></label>
      <button class="btn sm" type="button" id="circuit-start">Play the circuit</button></article>
    <article class="challenge-card"><p class="lbl">You against a friend</p><h2>Head to head</h2>
      <p class="small">Send your team code. Paste a friend's code to play two legs, each team at home in its own decade. Both teams must use ${rules(S)} rules.</p>
      <label class="field"><span class="lbl">Your team code</span><textarea id="my-code" readonly rows="3">${esc(code(U.G, S))}</textarea></label><button class="btn q sm" type="button" id="copy-code">Copy code</button>
      <label class="field"><span class="lbl">Friend's code</span><textarea id="their-code" rows="3" placeholder="Paste a team code"></textarea></label><button class="btn sm" type="button" id="h2h-play">Play the tie</button>${hh}</article></div>${cc}`;
}

export function about() {
  const { G } = U, n = G.meta.src || {}, pc = k => Math.round(100 * (n[k] || 0) / Math.max(1, G.meta.counts.cards));
  return `<p class="eyebrow">How it works</p><h2>Make your era XI</h2>
  <p>Choose your club career's decade. Draft from any decade; the further a player travels in time, the more rating he loses.</p>
  <h3>A manager at one of his clubs</h3><p>Choose one of five managers, each offered at one club spell (two re-spins). The team sets his attack and defence grades, which come from his whole career, and his signature players: drafting one raises both grades a step. His recorded formations are suggestions; you can play any of the ${Object.keys(G.formations).length} catalogue formations and change formation at any point before kick-off.</p>
  <h3>Five different clubs</h3><p>Any of the archive's clubs can be drawn; squads nearer your season and stronger squads are more likely. No club repeats across your five squads, and each squad includes a player from the best tier your fifteen have not yet filled (2 S, 4 A, 4 B, 3 C, 2 D), when any remaining club has one. Take three players from each and place them anywhere. One squad re-spin per draft, before your first pick from a squad.</p>
  <h3>A budget for all fifteen</h3><p>Salary cap is the default: 2 S-tier, 4 A-tier, 4 B-tier, 3 C-tier and 2 D-tier players, bench included. Tiers use base rating: S 90+, A 85–89.9, B 80–84.9, C 75–79.9, D below 75. Cards are blocked when their tier is full or taking them would prevent you finishing a squad's three picks; blocked cards stay listed with the reason. Classic removes these limits.</p>
  <h3>Positions and formations</h3><p>A player's rating in every slot comes from his game card where one exists: EA's per-position ratings, or Championship Manager attributes on EA's scale. Otherwise the loss grows with distance from his listed positions: one step 10%, two steps 22%, further 35%, and 75% for a keeper outfield or an outfielder in goal. The bench has no position loss. A formation change keeps every card, the bench and your cap charges; starters keep their role where the new shape has it, then take the places that cost the least rating, then move the least distance. Preview a formation before applying it, and undo lineup changes until your next pick.</p>
  <h3>Shape, chemistry and managers</h3><p>Formation shape moves strength between attack, midfield and defence. Chemistry uses EA FC Ultimate Team's scale: each starter in a listed position earns 0–3 points. Former teammates (the same club in the same seasons, anywhere in their careers) count fully towards the club total and players who shared a club in other seasons count half (2/4/7); the same football nation (2/5/8) and league (3/5/8) count as in EA FC, with the manager counting once towards his nation and league; a manager who coached the player adds a point. Each point adds one rating point; the team maximum is 33. The pitch draws teammates solid, a shared club dashed and a shared nation dotted, and the draft screen shows the win chance chemistry adds. Famous duos who both start add a separate partnership bonus.</p>
  <h3>Keyboard</h3><p>Arrow keys move through the squad list and around the pitch; Enter selects or places; Escape cancels; / jumps to search; Ctrl+Z undoes a lineup change and Ctrl+Shift+Z redoes it.</p>
  <h3>A decade at your club</h3><p>Your fifteen take the chosen club's place in its real league for every available season of the decade. Rival squads use players recorded at that club in that season, nearby-season players when needed, or labelled stand-ins. Play to winter, then the run-in; each half's results appear match by match. Results against expectations change board patience; meeting the season objective earns a bonus. Each summer allows one change: sign a player, develop one, upgrade one to his best card, or rest. A trophy makes it free. Continue until the decade ends or the board sacks you. A win in which a player has three goal involvements, or every five clean sheets for a keeper, earns an in-form: +1 rating from the next half, up to +3, until the season ends. One Evolution at a time sets a player rated 86 or below a target, such as 10 goals; completing it adds 2 rating points and, for most, a new natural position. Domestic cups and European places follow the country and era, with simplified formats.</p>
  <h3>Era Gauntlet</h3><p>The start screen's Gauntlet entry drafts from the decades near a map's first stop, then plays it: four six-match rounds and a two-legged boss in every decade, with rewards, transfers and board patience. The draft mostly draws each decade's strongest squads and allows up to 3 S-tier and 6 A-tier players; that limit holds for the whole run. Odyssey in Reverse, from the 2020s to the 1950s, is the default map.</p>
  <h3>More modes</h3><p>Four Era Gauntlet maps, a 10 to 20 event circuit and head to head with a friend's team code stay available under More modes. The weekly challenge starts a shared-seed Salary cap draft. The Clubhouse holds the sandbox and its Squad challenges: build an eleven that meets chemistry, rating, nation, league or decade targets to unlock a reward card; eight are permanent and three change each week. Older version 2 and 3 saves retain their fictional league and European Cup; start a new draft to play the club career.</p>
  <div class="note"><p><b>Where the numbers come from.</b> ${pc('fifa') + pc('fifa-near')}% of cards are rated by EA FIFA/FC data (FIFA 07 to FC 26), ${pc('cm') + pc('cm-near')}% by Championship Manager 01/02 databases, ${pc('icon')}% by EA Icon/Hero cards, and ${pc('estimated')}% are estimated by a model fitted on those ratings, mostly players of the 1950s to 1970s. Squads come from dated Wikidata club records, so a decade squad can combine players who never shared a season. Club colours come from Wikidata and a curated table. Goals and results are simulated with a model fitted on real 2014-19 club results and checked on 2020-23; era losses, chemistry, partnerships and tags are game rules, not measurements.</p></div>`;
}

// Text and image for sharing a season.
export function shareText() {
  const { R, S } = U, i = R.L.tab.findIndex(c => c.me), t = R.L.tab[i];
  return `Ball Knowledge · ${S.wk ? `Weekly ${S.wk} · ` : ''}${rules(S)} · ${S.D}s\n${ord(i + 1)} / 20 · ${t.Pts} points · ${t.W}W ${t.D}D ${t.L}L\nEuropean Cup: ${R.K.champ === 'your-club' ? 'WINNERS' : R.K.champN}\n${teamLine(S)}\nSeed ${S.seed} · ${location.href.split('?')[0]}?seed=${S.seed}&era=${S.D}&cap=${S.cap ? 1 : 0}`;
}

const METAL = { S: '#C9B6FF', A: '#E7B54A', B: '#C5CFDB', C: '#CD8D5C', D: '#8A94A6' };
export async function cardImage() {
  const { G, R, S } = U, c = document.createElement('canvas'); c.width = 1200; c.height = 900;
  try { await Promise.all(['800 60px "Barlow Condensed"', '700 30px "Barlow Condensed"', '400 20px Barlow', '600 20px Barlow'].map(f => document.fonts.load(f))); } catch { /* system fallback */ }
  const g = c.getContext('2d'), Q = E.rate(team(G, S), S.D), i = R.L.tab.findIndex(x => x.me), t = R.L.tab[i], [k1, k2] = G.clubs[spell(S)?.q]?.k || ['#C9D2E3', '#55627D'];
  const tx = (s, x, y, z = 24, col = '#F2F5FB', f = 'Barlow', w = 400, mx = 1050) => {
    g.fillStyle = col; g.font = `${w} ${z}px "${f}", sans-serif`;
    while (g.measureText(String(s)).width > mx && z > 12) { z--; g.font = `${w} ${z}px "${f}", sans-serif`; }
    g.fillText(String(s), x, y);
  };
  const bg = g.createRadialGradient(600, -80, 60, 600, 200, 900); bg.addColorStop(0, '#2A3352'); bg.addColorStop(1, '#070B14');
  g.fillStyle = bg; g.fillRect(0, 0, 1200, 900);
  g.fillStyle = k1; g.fillRect(0, 0, 840, 10); g.fillStyle = k2; g.fillRect(840, 0, 360, 10);
  tx('BALL KNOWLEDGE', 56, 76, 46, '#F2F5FB', 'Barlow Condensed', 800);
  tx(`${S.wk ? `WEEKLY ${S.wk} · ` : ''}${rules(S).toUpperCase()} · ${S.D}s SEASON`, 58, 112, 20, '#B7C2D9', 'Barlow', 600);
  tx(`${i + 1}`, 52, 270, 170, '#FFFFFF', 'Barlow Condensed', 800, 300); tx(ord(i + 1).slice(-2).toUpperCase(), 52 + g.measureText(`${i + 1}`).width + 8, 170, 46, '#FFFFFF', 'Barlow Condensed', 800);
  tx('LEAGUE FINISH', 58, 300, 18, '#8E9BB8', 'Barlow', 600);
  tx(`${t.Pts} POINTS`, 430, 200, 56, '#FFFFFF', 'Barlow Condensed', 800); tx(`${t.W} WINS · ${t.D} DRAWS · ${t.L} LOSSES · ${t.GF}:${t.GA}`, 432, 240, 24, '#B7C2D9', 'Barlow', 600);
  tx(R.K.champ === 'your-club' ? 'EUROPEAN CUP WINNERS' : `EUROPEAN CUP: ${R.K.champN}`, 432, 284, 26, '#FFFFFF', 'Barlow Condensed', 700, 720);
  tx(teamLine(S), 58, 360, 28, '#F2F5FB', 'Barlow Condensed', 700, 1090);
  tx('STARTING ELEVEN', 58, 412, 17, '#8E9BB8', 'Barlow', 600); tx('THE BENCH', 720, 412, 17, '#8E9BB8', 'Barlow', 600);
  Q.xi.forEach((p, j) => { const tt = TI(p.c.r); tx(p.s, 58, 449 + j * 31, 18, '#8E9BB8', 'Barlow', 600); tx(p.c.nm, 120, 449 + j * 31, 23, '#F2F5FB', 'Barlow', 600, 430); tx(Math.round(p.a), 580, 449 + j * 31, 26, METAL[tt], 'Barlow Condensed', 800); tx(tt, 626, 449 + j * 31, 18, METAL[tt], 'Barlow', 600); });
  Q.bn.forEach((p, j) => { const tt = TI(p.c.r); tx(`B${j + 1}`, 720, 449 + j * 38, 18, '#8E9BB8', 'Barlow', 600); tx(p.c.nm, 768, 449 + j * 38, 23, '#F2F5FB', 'Barlow', 600, 300); tx(Math.round(p.a), 1090, 449 + j * 38, 26, METAL[tt], 'Barlow Condensed', 800); tx(tt, 1134, 449 + j * 38, 18, METAL[tt], 'Barlow', 600); });
  tx(`OVERALL ${num(Q.ovr)}`, 720, 668, 48, '#FFFFFF', 'Barlow Condensed', 800);
  g.fillStyle = '#0D1426'; g.fillRect(0, 806, 1200, 94);
  tx(`REPLAY SEED ${S.seed} · ${S.D}s`, 58, 848, 24, '#FFFFFF', 'Barlow Condensed', 700); tx('Simulated results. Ratings come from EA and Championship Manager data where it exists.', 58, 878, 17, '#B7C2D9');
  const b = await new Promise(r => c.toBlob(r, 'image/png'));
  if (!b) throw new Error('Your browser could not create the result card. Copy the result text instead.');
  return b;
}
