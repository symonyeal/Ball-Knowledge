// Match presentation from saved records m = {k, rd, h, op, gf, ga, et, pw, sc}; sc rows [minute, mine, scorer, assist].
// It never runs the simulator.
// moments(m): goals in minute order, the standout (3 per goal, 1 per assist, ties by id), in-form earners.
// split(s, S): index of the first run-in match in S.me: the (n1+1)-th league match, n1 = league matches in half 1.
// card(...): one match card; matchCard(s, S, i): a career match, whose deciding leg carries the aggregate and the outcome.
// mountMatchCentre(): reveals the new half's cards one at a time; Show all reveals the rest.
import { U, esc, nm, crest } from './kit.js';
import { cname, named } from '../club.js';

export function moments(m) {
  const P = new Map(), G = new Map();
  for (const [, mine, a, b] of m.sc) if (mine) {
    if (a) { P.set(a, (P.get(a) || 0) + 3); G.set(a, (G.get(a) || 0) + 1); }
    if (b) P.set(b, (P.get(b) || 0) + 1);
  }
  const star = [...P].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0]?.[0] || null;
  const inv = new Map();
  for (const [, mine, a, b] of m.sc) if (mine) for (const p of [a, b]) if (p) inv.set(p, (inv.get(p) || 0) + 1);
  // In-form (career.js inForms): a win with 3 or more goal involvements.
  const form = m.gf > m.ga ? [...inv].filter(([, n]) => n >= 3).map(([p]) => p) : [];
  return { goals: m.sc.slice().sort((x, y) => x[0] - y[0]), star, sg: star ? G.get(star) || 0 : 0, form };
}

export function split(s, S) {
  const n1 = s.log.filter(e => e.t === 'seg' && e.s === S.s && e.half === 1).reduce((n, e) => n + e.w + e.d + e.l, 0);
  if (S.h < 2) return S.me.length;
  let k = 0;
  return Math.max(0, S.me.findIndex(m => m.k === 'L' && k++ === n1));
}

const comp = (s, S, k) => k === 'L' ? named('L', s.lg, S.s) || U.G.lg[s.lg].nm : S.K[k]?.nm || k;
// card(m, head, op, notes, form): one match m = {gf, ga, sc?}; head and op are escaped HTML; notes precede the
// standout; form adds in-form earners (career only). A record without sc predates saved goals.
export function card(m, head, op, notes = [], form = false, comp = '') {
  const x = moments({ sc: [], ...m }), r = m.gf > m.ga ? 'W' : m.gf < m.ga ? 'L' : 'D';
  const N = [...notes, x.star && `Standout: ${esc(nm(x.star))}${x.sg > 1 ? `, ${x.sg} goals` : ''}`, ...(form ? x.form.map(p => `In-form: ${esc(nm(p))} +1`) : [])].filter(Boolean);
  const G = !m.sc ? '<p class="small dim">Goals were not recorded in this older save.</p>' : x.goals.length
    ? `<ol class="moments">${x.goals.map(([t, mine, a, b]) => `<li class="${mine ? 'mine' : 'them'}"><b>${t}′</b> ${a ? esc(nm(a)) : 'Scorer unrecorded'}${b ? ` <small>(${esc(nm(b))})</small>` : ''}${mine ? '' : ' <small>· opponent</small>'}</li>`).join('')}</ol>`
    : '<p class="small dim">No goals.</p>';
  return `<article class="match ${r}"${comp ? ` data-comp="${comp}"` : ''}>
    <header><span class="lbl">${head}</span><b>${r} ${m.gf}–${m.ga}</b></header><p class="match-op">${op}</p>
    ${G}${N.length ? `<p class="small match-notes">${N.join(' · ')}</p>` : ''}</article>`;
}

export function matchCard(s, S, i) {
  const m = S.me[i];
  const legs = S.me.filter(f => f.k === m.k && f.rd === m.rd && f.op === m.op), last = legs.length === 2 && legs[1] === m;
  const t = m.k !== 'L' && (legs.length === 1 || last) ? S.K[m.k]?.R.flat().find(t => t.rd === m.rd && [t.A, t.B].includes(m.op) && [t.A, t.B].includes(s.q)) : null;
  const agg = last ? [legs[0].gf + m.gf, legs[0].ga + m.ga] : null;
  const notes = [m.et && 'After extra time', m.pw && `Penalties ${m.pw.join('–')}`, agg && `Aggregate ${agg.join('–')}`,
    t && (m.rd === 'Final' ? (t.w === s.q ? 'Trophy won' : 'Runners-up') : t.w === s.q ? 'Through' : 'Out')];
  return card(m, `${esc(m.rd)} · ${esc(comp(s, S, m.k))} · ${m.h === 'H' ? 'Home' : m.h === 'A' ? 'Away' : 'Neutral'}`,
    `${crest(m.op)}<span>${m.h === 'A' ? 'at' : 'v'} ${esc(cname(U.G, m.op))}</span>`, notes, true, m.k === 'L' ? 'L' : 'K');
}

export function mountMatchCentre() {
  const d = document.createElement('dialog'); d.className = 'match-centre'; d.id = 'match-centre';
  d.setAttribute('aria-labelledby', 'match-title'); document.body.append(d);
  let C = [], k = 0, timer;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.dataset.effects === 'false';
  const stop = () => { clearInterval(timer); timer = null; };
  const returnFocus = () => (document.getElementById('tab-home') || document.getElementById('game')).focus();
  // Focus moves in the same task: the close event is queued, so a hidden button would otherwise keep focus.
  const close = () => { stop(); d.close(); returnFocus(); };
  const paint = () => {
    const el = id => d.querySelector('#' + id), done = k >= C.length, focused = document.activeElement?.id;
    el('match-count').textContent = `${k} / ${C.length}`;
    el('match-list').insertAdjacentHTML('beforeend', C.slice(el('match-list').children.length, k).join(''));
    el('match-list').lastElementChild?.scrollIntoView({ block: 'nearest' });
    el('match-announcement').textContent = done ? `All ${C.length} results shown.` : el('match-list').lastElementChild?.querySelector('header')?.textContent.trim() || '';
    el('match-all').hidden = done; el('match-close').textContent = done ? 'Back to club →' : 'Close';
    if (done) { stop(); if (focused === 'match-all') el('match-close').focus(); }
  };
  d.addEventListener('click', e => {
    const id = e.target.closest('button')?.id;
    if (id === 'match-close') close();
    else if (id === 'match-all') { k = C.length; paint(); }
  });
  d.addEventListener('cancel', () => stop()); d.addEventListener('close', () => { stop(); returnFocus(); });
  return { show(cards, title) {
    if (!cards.length) return;
    C = cards; k = reduced() ? C.length : 1;
    d.innerHTML = `<header><div><p class="eyebrow">Match centre · <span id="match-count"></span></p><h1 id="match-title">${esc(title)}</h1></div><button class="btn q" type="button" id="match-all">Show all</button></header>
      <p id="match-announcement" class="sr-only" role="status" aria-live="polite"></p><div id="match-list" class="match-list"></div>
      <div class="match-controls"><button class="btn" type="button" id="match-close">Close</button></div><p class="small dim">Saved results. Closing keeps every result.</p>`;
    paint(); d.showModal(); d.querySelector(k < C.length ? '#match-all' : '#match-close').focus();
    if (k < C.length) timer = setInterval(() => { k++; paint(); }, 600);
  } };
}

