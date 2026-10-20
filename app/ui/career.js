// Club career views. s is the saved career, S its current season, K its competitions; refs carry card
// and person ids. All labels are escaped; selectors use offer indices and squad places, not names.
import * as E from '../engine/index.js';
import * as C from '../career.js';
import * as Rn from '../run.js';
import { TI, fits } from '../cap.js';
import { cname, history, named } from '../club.js';
import { U, esc, num, ord, nm, club, kv, rules, crest, vcard, portrait, tier } from './kit.js';
import { hydrate } from '../draft.js';
import { xi, breakdown, gauntlet, more } from './season.js';
import { marketPreview, upgradePreview } from './transfers.js';
import { worth } from './odds.js';
import { matchCard, split } from './match-centre.js';

const yr = y => `${y}/${String(y + 1).slice(-2)}`;
const name = id => esc(cname(U.G, id));
const compName = (s, k) => k === 'L' ? named('L', s.lg, s.S.s) || U.G.lg[s.lg].nm : s.S.K[k]?.nm || k;
const placeOptions = (s, only) => {
  const T = C.careerTeam(U.G, s);
  return s.slots.map((r, i) => !only || only.includes(i) ? `<option value="${i}">${i < 11 ? T.S[i].s : `Bench ${i - 10}`} · ${esc(nm(r.p))}</option>` : '').join('');
};
const free = s => s.node?.free > 0;
const price = (s, c) => free(s) ? 0 : c;
const affordable = (s, c) => s.pat - price(s, c) >= 1;

// The next league fixture of the current half: {md, home, op}, or null between halves.
function nextOp(s) {
  if (s.ph !== 'half') return null;
  const i = s.S.ord.indexOf(s.q), rounds = E.rr2(s.S.ord.length);
  for (let md = s.S.L.md; md < rounds.length; md++) {
    const pair = rounds[md].find(p => p.includes(i));
    if (pair) return { md, home: pair[0] === i, op: s.S.ord[pair.find(j => j !== i)] };
  }
  return null;
}
function nextFixture(s) {
  const x = nextOp(s);
  return x ? `<div class="next-fixture" data-next-op="${esc(x.op)}"><p class="lbl">Next league fixture · Matchday ${x.md + 1} · ${x.home ? 'Home' : 'Away'}</p><div>${crest(s.q)}<b>${name(s.q)}</b><span>v</span>${crest(x.op)}<b>${name(x.op)}</b></div></div>` : '';
}
// Chemistry in the squad tile: what it adds, and the win chance against the next league opponent with and without it.
function chemLine(s, T, Q) {
  const x = nextOp(s), O = x && C.careerRival(U.G, s, x.op), w = O ? worth(T, s.D, O) : null, P = v => Math.round(100 * v);
  return `<p class="small">${Q.chem.total}/33 chemistry · <b>+${num(E.rate(T, s.D).ovr - E.rate(T, s.D, { chem: false }).ovr)}</b> rating</p>${w ? `<p class="chem-worth">Win chance v ${name(x.op)} <b>${P(w.w)}%</b> <span class="dim">(${P(w.w0)}% without chemistry)</span></p>` : ''}`;
}

function choices(refs, select, full = false) {
  return `<fieldset class="market-choices ${full ? 'targets' : 'departures'}"><legend>${full ? 'Scout targets' : 'Choose who leaves'}</legend>${refs.map((r,i) => {
    const c = hydrate(U.G,r);
    return `<label class="market-option"><input type="radio" name="cards-${select}" data-transfer-choice="${select}" value="${i}" ${i === 0 ? 'checked' : ''}><span>${full ? vcard(c) : `${portrait(c.id,c.nm,true)}<b>${Math.round(c.r)}</b><span>${esc(c.nm)}<small>${esc(c.pos.join(' · '))}</small></span>${tier(TI(c.r))}`}</span></label>`;
  }).join('')}</fieldset>`;
}

export function careerSigning(s, o, pick = 0, slot = 0) {
  const f = o.list[pick], cost = price(s, o.kind === 'desp' ? f.cost : C.careerPrice(U.G, s, f, slot));
  const cap = !s.cap || fits(U.G, C.careerBill(U.G, s), slot, f, Rn.GCAP);
  return { cost, ok: cap && s.pat - cost >= 1, tx: !cap ? 'This replacement exceeds the S or A cap.' : `Costs ${cost} patience; leaves ${s.pat - cost}.` };
}
function offer(o, j, s) {
  const btn = (label, cost) => `<button class="btn" type="button" data-career-take="${j}" ${affordable(s, cost) ? '' : 'disabled'}>${label}</button>`;
  if (o.kind === 'dev' && o.id === 'upg') return `<article class="reward reward--boost"><p class="lbl">Prime-card boost</p><h3>Upgrade the same player</h3>
    <label class="field"><span class="lbl">Player</span><select id="career-up-${j}" data-career-up="${j}">${o.list.map((u, i) => `<option value="${i}">${esc(nm(u.from.p))} · ${Math.round(u.from.r)} → ${Math.round(u.to.r)} · ${esc(club(u.to.k))} · ${price(s, u.cost)} patience</option>`).join('')}</select></label>
    <div data-upgrade-preview="${j}" data-transfer-mode="career">${upgradePreview(s,o.list[0])}</div><p class="small">His original tier charge stays. Player development survives the upgrade.</p>${btn('Upgrade him', o.list[0].cost)}</article>`;
  if (o.kind === 'dev') {
    const d = C.CAREER_DEV[o.id];
    return `<article class="reward"><p class="lbl">Development · ${price(s, o.cost)} patience</p><h3>${esc(d.nm)}</h3><p class="small">${esc(d.tx)}</p>
      ${o.team ? '' : `<label class="field"><span class="lbl">Player</span><select id="career-dev-${j}">${placeOptions(s, o.who)}</select></label>`}${btn('Develop', o.cost)}</article>`;
  }
  if (['market', 'desp'].includes(o.kind)) {
    const x = careerSigning(s, o), u = Math.floor(s.y / 2), min = p => (p ? 5 : 1) + u + (free(s) ? 0 : (p ? 2 : 1) + u) + 1;
    return `<article class="reward market-reward"><p class="lbl">${o.kind === 'desp' ? 'Desperation offer' : 'Work the phones'}</p><h3>Sign one, release one</h3>
      ${choices(o.list, `career-fa-${j}`, true)}${choices(s.slots, `career-out-${j}`)}<details class="market-fallback"><summary>Choose from lists</summary>
      <label class="field"><span class="lbl">Sign</span><select id="career-fa-${j}" data-career-fa="${j}">${o.list.map((f, i) => `<option value="${i}">${esc(nm(f.p))} · ${esc(club(f.k))} · ${Math.round(f.r)} · ${TI(f.r)} tier</option>`).join('')}</select></label>
      <label class="field"><span class="lbl">Release</span><select id="career-out-${j}" data-career-fa="${j}">${placeOptions(s)}</select></label>
      </details><div data-transfer-preview="${j}" data-transfer-mode="career">${marketPreview(s,j)}</div><p class="small" id="career-price-${j}" role="status">${esc(x.tx)}</p><button class="btn" type="button" data-career-take="${j}" ${x.ok ? '' : 'disabled'}>Confirm signing and release</button>
      <p class="small dim">${o.kind === 'desp' ? 'This bargain reduces squad partnership bonuses by 25% until he leaves or receives Player Buy-In.' : 'An S signing loses 3 rating points on the bench; a C signing gains 3 when starting.'}</p>
      ${o.re ? `<div class="row wrap"><button class="btn q sm" type="button" data-career-respin="scout" ${s.pat < min(false) ? 'disabled' : ''}>Scout re-spin · ${1 + u}</button><button class="btn q sm" type="button" data-career-respin="premium" ${s.pat < min(true) ? 'disabled' : ''}>A/S re-spin · ${5 + u}</button></div>` : ''}</article>`;
  }
  return `<article class="reward"><p class="lbl">Rest</p><h3>Keep the squad</h3><p class="small">${o.gain ? `+${o.gain} patience.` : 'No change and no patience gain.'}</p><button class="btn q" type="button" data-career-take="${j}" data-career-rest>Rest</button></article>`;
}
// Formation and two-place swaps, open between matches.
function lineup(s) {
  return `<h3>Set the lineup</h3><p class="small">Change the formation or swap two squad places. Boosts and development remain with the player.</p>
    <div class="career-controls"><label class="field"><span class="lbl">Formation</span><select id="career-form">${Object.keys(U.G.formations).map(f => `<option value="${esc(f)}" ${f === s.f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select></label><button class="btn q" id="career-form-apply" type="button">Apply formation</button>
    <label class="field"><span class="lbl">First place</span><select id="career-swap-a">${placeOptions(s)}</select></label><label class="field"><span class="lbl">Second place</span><select id="career-swap-b">${placeOptions(s)}</select></label><button class="btn q" id="career-swap" type="button">Swap players</button></div>`;
}
function action(s) {
  if (s.ph === 'half') return `<p class="small">${s.half === 0 ? 'Play the opening half of the league and cup season.' : 'The run-in decides the league, cups and the board objective. The summer window follows.'}</p><button class="btn" id="career-half" type="button">${s.half === 0 ? 'Play to winter' : 'Play the run-in'}</button>`;
  if (s.ph === 'node') return `<h3>${s.node.window === 'winter' ? 'Winter window' : 'Summer window'}</h3><p class="small">One change before next season: a signing, a development or an upgrade, or rest.${free(s) ? ' A trophy this season makes it free.' : ' Keep at least 1 patience after a purchase.'} ${s.pat === 20 ? 'Full patience offers two development cards.' : ''}</p><div class="rewards">${C.careerOffers(U.G, s).map((o, j) => offer(o, j, s)).join('')}</div>`;
  if (['hop', 'repo'].includes(s.ph)) return `<p class="small">This save stopped at a transfer or lineup stage that no longer exists.</p><button class="btn" id="career-next" type="button">Continue</button>`;
  const sc = C.careerScore(s);
  return `<h3>${s.ph === 'done' ? 'Decade complete' : 'The board has ended your career'}</h3><p class="small">${s.history.length} seasons completed · ${s.trophies.length} trophies · score ${num(sc.score ?? sc)}.</p>`;
}
function evolutions(s) {
  const e = s.evo && C.EVO[s.evo.id], O = C.evoOptions(U.G, s), F = C.inForms(s), k = C.evoProgress(s);
  const reward = x => `+${x.r} rating${x.pos ? `, natural ${x.pos}` : ''}`;
  const done = Object.entries(s.evd || {}).flatMap(([p, Q]) => Q.map(id => `${esc(nm(p))} · ${esc(C.EVO[id].nm)}`));
  const form = Object.entries(F).filter(([p]) => s.slots.some(c => c.p === p)).map(([p, n]) => `${esc(nm(p))} +${n}`);
  return `<section class="career-evo" aria-label="Evolutions and in-forms"><h2 class="st">Evolutions</h2>
    ${e ? `<p><b>${esc(nm(s.evo.p))} · ${esc(e.nm)}</b>. ${esc(e.tx)} Reward: ${reward(e)}.</p><progress max="${e.n}" value="${k}" aria-label="Evolution progress"></progress><p class="small">${k} / ${e.n}</p>`
    : O.length ? `<div class="career-controls"><label class="field"><span class="lbl">Evolution</span><select id="career-evo">${O.map((o, j) => `<option value="${j}">${esc(nm(o.p))} · ${esc(C.EVO[o.id].nm)}: ${esc(C.EVO[o.id].tx)} ${reward(C.EVO[o.id])}</option>`).join('')}</select></label><button class="btn q" id="career-evo-start" type="button">Start evolution</button></div>`
    : `<p class="small">${['fired', 'done'].includes(s.ph) ? 'The career is over.' : 'No eligible player for a new evolution.'}</p>`}
    <p class="small dim">One evolution at a time, free, for players with a base rating of ${C.EVO_MAX} or below. Completed: ${done.join(' · ') || 'none yet'}.</p>
    <h2 class="st">In-forms this season</h2><p class="small">${form.join(' · ') || 'None yet.'} A win with 3 goal involvements, or every 5 clean sheets for a keeper, earns +1 from the next half, at most +${C.IF_MAX}; the season's end resets them.</p></section>`;
}
function table(s, src = []) {
  const sources = new Map(src.map(c => [c.id, c]));
  return `<div class="tw league"><table><caption class="sr-only">${esc(compName(s, 'L'))} · ${yr(s.S.s)}</caption><thead><tr><th>#</th><th>Club</th>${['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map(k => `<th class="k">${k}</th>`).join('')}</tr></thead><tbody>
    ${s.S.L.rows.map((r, i) => `<tr data-club="${esc(r[0])}" class="${r[0] === s.q ? 'your-row' : ''}"><td>${i + 1}</td><td>${name(r[0])}${r[0] === s.q ? ' · Yours' : sources.get(r[0])?.si ? ' <small>Stand-in squad</small>' : sources.get(r[0])?.src === 'nearby' ? ' <small>Nearby-season fill</small>' : ''}</td>${[...r.slice(1, 7), r[5] - r[6], r[7]].map(x => `<td class="k">${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function rivals(s, sources) {
  return `<details class="breakdown"><summary>Inspect this season's rival squads and sources</summary>${sources.filter(c => c.id !== s.q).map(c => `<details class="career-bracket"><summary>${esc(c.nm)} · ${c.si ? 'Stand-in squad' : `${c.n} players recorded this season`}</summary><p class="small">${esc(c.source)}</p><div class="tw"><table><thead><tr><th>Player</th><th>Positions</th><th>Rating</th><th>Source</th></tr></thead><tbody>${c.roster.map(p => `<tr><td>${esc(p.nm)}</td><td>${esc(p.pos.join(', '))}</td><td>${num(p.r)}</td><td>${esc(p.src)}</td></tr>`).join('')}</tbody></table></div></details>`).join('')}</details>`;
}
// Match by match: the opening half, then the run-in; U.feed filters all, league (L) or cups (K).
function fixtures(s) {
  const S = s.S, M = S.me, k = split(s, S), f = U.feed || 'all';
  const part = (lab, a, b) => a < b ? `<h3 class="st">${lab}</h3>${M.slice(a, b).map((m, i) => f === 'all' || f === (m.k === 'L' ? 'L' : 'K') ? matchCard(s, S, a + i) : '').join('')}` : '';
  return M.length ? `<div class="row wrap feed-filter" role="group" aria-label="Filter matches">${[['all', 'All'], ['L', 'League'], ['K', 'Cups']].map(([v, l]) => `<button class="chip" type="button" data-feed="${v}" data-key="feed:${v}" aria-pressed="${f === v}">${l}</button>`).join('')}</div>
    <div class="match-list">${part('Opening half', 0, k)}${part('Run-in', k, M.length)}</div>` : '<p class="empty">Your matches appear after you play the opening half.</p>';
}
// The cards of matches i ≥ from, for the match centre.
export const matchCards = (s, from) => s.S.me.slice(from).map((_, i) => matchCard(s, s.S, from + i));
function competitions(s) {
  return Object.values(s.S.K).map(K => `<details class="career-bracket"><summary>${esc(K.nm)} · ${K.ch ? `${name(K.ch)} won` : `${K.al.length} clubs remain`}</summary>
    ${K.gt ? `<div class="challenge-grid">${K.gt.map((g, i) => `<div><h3>Group ${String.fromCharCode(65 + i)}</h3><div class="tw"><table><thead><tr><th>Club</th><th>P</th><th>GD</th><th>Pts</th></tr></thead><tbody>${g.map(r => `<tr><td>${name(r[0])}</td><td>${r[1]}</td><td>${r[5] - r[6]}</td><td>${r[7]}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}</div>` : ''}
    ${K.R.map(R => `<h3 class="st">${esc(R[0]?.rd || 'Round')}</h3>${R.map(t => `<div class="cup-tie ${t.A === s.q || t.B === s.q ? 'cup-tie--yours' : ''}"><div>${name(t.A)} v ${name(t.B)}<small>Winner: ${name(t.w)}${t.pw ? ' · penalties' : t.et ? ' · extra time' : ''}</small></div><strong>${t.agg.join('–')}</strong></div>`).join('')}`).join('') || '<p class="small">The draw and results appear as the season advances.</p>'}</details>`).join('');
}
function stats(s) {
  return `<h2 class="st">Your players · all competitions</h2><div class="tw"><table><thead><tr><th>Player</th><th>Goals</th><th>Assists</th><th>Clean sheets</th><th>Apps</th></tr></thead><tbody>${s.S.sy.slice().sort((a, b) => b[1] - a[1] || b[2] - a[2]).map(r => `<tr><td>${esc(nm(r[0]))}</td>${r.slice(1, 5).map(n => `<td class="k">${n}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <h2 class="st">League leaders</h2><div class="mode-log">${s.S.st.slice().sort((a, b) => b[2] - a[2] || b[3] - a[3]).slice(0, 20).map(r => `<div class="mode-event"><div>${esc(U.G.people[r[1]]?.nm || 'Stand-in player')}<small>${name(r[0])}</small></div><b>${r[2]} goals · ${r[3]} assists</b></div>`).join('')}</div>`;
}
function seasonHistory(s) {
  return `<h2 class="st">Trophy cabinet</h2><div class="honours">${s.trophies.map(t => `<span class="honour">${yr(t.s)} · ${esc(t.nm || compName(s, t.k))}</span>`).join('') || '<p class="small">Your first trophy is still ahead.</p>'}</div><h2 class="st">Season history</h2>${s.history.map(h => `<details class="career-bracket"><summary>${yr(h.s)} · ${ord(h.pos)} · ${h.pts} points</summary><p class="small">${h.won ? 'Board objective met' : 'Board objective missed'} · ${h.dp > 0 ? '+' : ''}${h.dp} patience.${h.real.pos ? ` Real club record: ${ord(h.real.pos)}, ${h.real.pts} points.` : ' Club outside the real top flight.'}</p>${table({ ...s, S: h.S })}${competitions({ ...s, S: h.S })}<h3>Your matches · ${h.S.me.length} results</h3><div class="match-list">${h.S.me.map((_, i) => matchCard(s, h.S, i)).join('')}</div></details>`).join('') || '<p class="empty">Your completed seasons will appear here.</p>'}`;
}
export function hub() {
  const s = U.S.mode.career, S = s.S, r = S.L.rows.find(r => r[0] === s.q), pos = S.L.rows.indexOf(r) + 1;
  const T = C.careerTeam(U.G, s), Q = E.rate(T, s.D), real = history(U.G, s.lg, S.s, s.q);
  const tabs = [['home', 'Club hub'], ['market', 'Transfer market'], ['league', 'League table'], ['fixtures', 'Your matches'], ['cup', 'Competitions'], ['stats', 'Player stats'], ['lineup', 'Your squad'], ['history', 'Career history'], ['more', 'More modes']];
  const tab = tabs.some(t => t[0] === U.tab) ? U.tab : 'home';
  const body = { home: () => `<div class="hub-grid"><article class="hub-tile hub-next"><p class="eyebrow">${s.ph === 'half' ? 'Match day' : 'Club schedule'}</p><div class="hub-club">${crest(s.q,'lg')}<div><h2>${name(s.q)}</h2><p class="small">${esc(compName(s,'L'))} · ${yr(S.s)}</p></div></div>${nextFixture(s)}${s.ph === 'half' ? `<p class="hub-callout">${s.half === 0 ? 'The season starts here.' : 'Everything to play for.'}</p>${action(s)}<p class="small dim">Results appear match by match · Show all any time</p>` : `<h2>${s.ph === 'node' ? 'The summer window is open' : ['hop', 'repo'].includes(s.ph) ? 'Ready the squad' : 'Career complete'}</h2><p class="small">${s.ph === 'node' ? 'One change before next season' : 'Review your next step.'}</p><button class="btn" data-hub-tab="market" type="button">${s.ph === 'node' ? 'Enter transfer market' : 'Continue'} →</button>`}</article>
    <article class="hub-tile hub-league"><p class="eyebrow">League snapshot</p><h2>${S.h ? ord(pos) : 'Pre-season'} <small>of ${S.L.rows.length}</small></h2><ol>${S.L.rows.map((x,i)=>[x,i]).filter(([x,i])=>i<7||x[0]===s.q).map(([x,i])=>`<li class="${x[0]===s.q?'is-yours':''}"><span>${i+1} · ${name(x[0])}</span><b>${x[7]}</b></li>`).join('')}</ol><button class="link" data-hub-tab="league" type="button">Full standings →</button></article>
    <article class="hub-tile hub-squad"><p class="eyebrow">Squad management</p><h2>${esc(s.f)}</h2><p class="hub-number">${num(Q.ovr)} <small>rating</small></p>${chemLine(s, T, Q)}<button class="btn q" data-hub-tab="lineup" type="button">View squad →</button></article>
    <article class="hub-tile hub-mail"><p class="eyebrow">Board inbox</p><h2>A message from the board</h2><p class="career-owner" role="status">${esc(s.owner)}</p><label class="small">Patience · ${s.pat}/20<progress max="20" value="${s.pat}"></progress></label><p class="small">${s.pat <= 5 ? 'Results need to improve. Keep at least one patience when spending.' : 'Earn trust on the pitch. Spend it on your squad.'}</p></article>
    <article class="hub-tile hub-objective"><p class="eyebrow">Season objectives</p><h2>Finish ${S.obj.t===1?'first':`in the top ${S.obj.t}`}</h2><p class="small">${S.h ? `Currently ${ord(pos)} · ${r[7]} points` : 'Your league campaign awaits.'}</p><progress aria-label="Season halves completed" max="2" value="${S.h}"></progress><p class="small">${s.trophies.length} career trophies · Season ${s.y+1}/${s.years.length}</p><button class="link" data-hub-tab="cup" type="button">Cup races →</button></article>
    <article class="hub-tile hub-market"><p class="eyebrow">Scouting department</p><h2>Build your next XI.</h2><p class="small">${s.ph === 'node'?'Targets are available. Compare cards before confirming a departure.':'The summer window opens after the run-in.'}</p><button class="btn q" data-hub-tab="market" type="button">Transfer market →</button></article></div>`, market: () => `<section class="career-board" aria-label="Board and transfer window"><p class="career-owner">${esc(s.owner)}</p>${s.ph === 'half' ? '<h2>Scouting in progress</h2><p class="small">Play the next half-season to open the transfer window.</p><button class="btn q" data-hub-tab="home" type="button">Back to match day →</button>' : action(s)}</section>`, league: () => {
    const sources = C.careerSource(U.G, s);
    return `${table(s, sources)}<p class="small">${S.L.rows.length} clubs · home and away · ${S.w} points for a win. Ranked by points, goal difference, goals scored.</p>${real.pos ? `<p class="small dim">Real ${yr(S.s)} record: ${ord(real.pos)} of ${real.n}, ${real.pts} points. Your career results are simulated.</p>` : '<p class="small dim">Your club takes the lowest-placed top-flight club’s place this season.</p>'}${rivals(s, sources)}`;
  },
    fixtures: () => fixtures(s), cup: () => competitions(s), stats: () => stats(s), lineup: () => `${xi(T, Q, s.D, `Your ${s.f}`)}${['half', 'node', 'hop', 'repo'].includes(s.ph) ? lineup(s) : ''}${evolutions(s)}${breakdown(Q)}<p class="small">${s.cap ? 'At most 2 S-tier and 4 A-tier charges; earned upgrades retain the original charge.' : 'Classic: no tier limits.'}</p>`, history: () => seasonHistory(s), more: () => `${gauntlet()}${more()}` };
  return `<section class="result-hero career-hero" style="${kv(s.q)}"><div class="rh-pos"><p class="lbl">${yr(S.s)} · ${S.h === 0 ? 'Pre-season' : S.h === 1 ? 'Winter' : 'Full time'}</p>${S.h ? `<p class="big">${pos}<sup>${ord(pos).slice(-2)}</sup></p>` : crest(s.q, 'lg')}<p class="small">${name(s.q)}</p></div>
    <div class="rh-stats"><div><b>${r[7]}</b><span>Points</span></div><div><b>${r[2]}–${r[3]}–${r[4]}</b><span>W–D–L</span></div><div><b>${s.pat} / 20</b><span>Board patience</span></div><div><b>${s.trophies.length}</b><span>Trophies</span></div></div>
    <div class="rh-team"><p class="lbl">${esc(compName(s, 'L'))} · Season ${s.y + 1} / ${s.years.length}</p><h1>${name(s.q)}</h1><p class="small">${esc(s.m.nm)} · ${esc(s.f)} · ${rules(s)}</p><p class="small"><b>Board objective:</b> finish ${S.obj.t === 1 ? 'first' : `in the top ${S.obj.t}`}.</p></div></section>
    <div class="results-tabs" role="tablist" aria-label="Club career">${tabs.map(([v, l]) => `<button type="button" role="tab" data-tab="${v}" aria-selected="${tab === v}" aria-controls="result-panel" id="tab-${v}" tabindex="${tab === v ? 0 : -1}">${l}</button>`).join('')}</div><section id="result-panel" role="tabpanel" aria-labelledby="tab-${tab}">${body[tab]()}</section>
    <div class="share-strip"><p class="small">${rules(s)} · Seed ${s.seed} · career saved in this browser.</p><div class="row wrap"><button class="btn sm" id="share" type="button">Copy career</button><button class="btn q sm" id="result-card" type="button">Result card ↓</button><button class="btn q sm" id="download" type="button">Download replay ↓</button><button class="btn q sm" id="replay" type="button">Replay this seed ↻</button></div></div>`;
}
export function careerShareText() {
  const s = U.S.mode.career, r = s.S.L.rows.find(r => r[0] === s.q), pos = s.S.L.rows.indexOf(r) + 1;
  return `Ball Knowledge · ${cname(U.G, s.q)} · ${yr(s.S.s)}\nSeason ${s.y + 1} / ${s.years.length} · ${rules(s)}\n${s.S.h ? ord(pos) : 'Pre-season'} / ${s.S.L.rows.length} · ${r[7]} points · ${r[2]}W ${r[3]}D ${r[4]}L\n${s.trophies.length} trophies · ${s.pat} board patience\n${s.m.nm} · ${s.f}\nSeed ${s.seed}${typeof location === 'undefined' ? '' : `\n${location.href.split('?')[0]}?seed=${s.seed}&era=${s.D}&cap=${s.cap ? 1 : 0}`}`;
}
export async function careerCardImage() {
  const s = U.S.mode.career, Q = E.rate(C.careerTeam(U.G, s), s.D), c = document.createElement('canvas'); c.width = 1200; c.height = 900;
  try { await document.fonts.load('800 48px "Barlow Condensed"'); } catch { /* system font fallback */ }
  const g = c.getContext('2d'); g.fillStyle = '#070B14'; g.fillRect(0, 0, 1200, 900);
  g.fillStyle = U.G.clubs[s.q]?.k?.[0] || '#C9D2E3'; g.fillRect(0, 0, 1200, 12);
  const tx = (text, x, y, size = 26, col = '#F2F5FB') => { g.fillStyle = col; g.font = `800 ${size}px "Barlow Condensed", sans-serif`; g.fillText(text, x, y, 1080); };
  tx('BALL KNOWLEDGE', 56, 80, 48); tx(`${cname(U.G, s.q)} · ${yr(s.S.s)}`, 56, 155, 56);
  careerShareText().split('\n').slice(1).forEach((line, i) => tx(line, 56, 205 + i * 38, 27, '#B7C2D9'));
  tx('YOUR FIFTEEN', 56, 450, 30);
  [...Q.xi, ...Q.bn.filter(Boolean).map((p, i) => ({ ...p, s: `B${i + 1}` }))].forEach((p, i) => tx(`${p.s}   ${p.c.nm}   ${Math.round(p.a)}`, i < 8 ? 56 : 650, 495 + (i % 8) * 37, 25));
  tx('Simulated career results · ratings retain their source labels', 56, 852, 22, '#B7C2D9');
  const b = await new Promise(r => c.toBlob(r, 'image/png')); if (!b) throw new Error('The browser could not create the result card.'); return b;
}
