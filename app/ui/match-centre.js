// Match presentation. The clock reads saved events; it never runs the simulator.
// frame(m, minute): visible events and score at the playback clock, end at the last event or 90/120.
// mountMatchCentre(): one modal with a cancellable clock; show(matches, club) accepts the new half only.
import { U, esc, nm, crest } from './kit.js';
import { cname } from '../club.js';

export function frame(m, minute) {
  const end = Math.max(m.et ? 120 : 90, ...m.sc.map(e => e[0]));
  const events = m.sc.filter(e => e[0] <= minute), done = minute >= end;
  return { score: done ? [m.gf, m.ga] : [events.filter(e => e[1]).length, events.filter(e => !e[1]).length], events, done, end, penalties: done ? m.pw : null };
}

export function mountMatchCentre() {
  const d = document.createElement('dialog'); d.className = 'match-centre'; d.id = 'match-centre';
  d.setAttribute('aria-labelledby', 'match-title'); document.body.append(d);
  let matches = [], q, at = 0, minute = 0, timer, paused = false;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.dataset.effects === 'false';
  const stop = () => { clearInterval(timer); timer = null; };
  const returnFocus = () => (document.getElementById('tab-home') || document.getElementById('game')).focus();
  const close = () => { stop(); d.close(); };
  const paint = () => {
    const m = matches[at], f = frame(m, minute), n = id => esc(cname(U.G, id)), focused = document.activeElement?.id;
    const comp = m.k === 'L' ? 'League' : U.S.mode.career.S.K[m.k]?.nm || m.k;
    const points = new Map();
    for (const e of f.events.filter(e => e[1])) { if (e[2]) points.set(e[2], (points.get(e[2]) || 0) + 3); if (e[3]) points.set(e[3], (points.get(e[3]) || 0) + 1); }
    const star = [...points].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0];
    if (!d.querySelector('#match-title')) d.innerHTML = `<header><div><p class="eyebrow">Match centre · <span id="match-count"></span></p><h1 id="match-title">${esc(comp)}</h1></div><button class="btn q" type="button" id="match-skip">Skip playback</button></header><p class="small" id="match-round"></p><div class="match-scoreboard"><div id="match-us"></div><div><p id="match-clock"></p><strong id="match-score"></strong><p class="small" id="match-pens"></p></div><div id="match-them"></div></div><progress id="match-progress" aria-label="Match clock"></progress><p id="match-announcement" class="sr-only" role="status" aria-live="polite"></p><div id="match-events" class="match-events"></div><p id="match-star" class="small"></p><div class="match-controls"><button class="btn q" type="button" id="match-pause">Pause</button><button class="btn q" type="button" id="match-finish">Full time</button><button class="btn" type="button" id="match-next">Next match →</button></div><p class="small dim">Playback of saved results. Skipping keeps every result.</p>`;
    const el = id => d.querySelector('#' + id);
    el('match-title').textContent = comp; el('match-count').textContent = `${at + 1} / ${matches.length}`;
    el('match-round').textContent = `${m.rd} · ${m.h === 'H' ? 'Home' : m.h === 'A' ? 'Away' : 'Neutral'}`;
    el('match-us').innerHTML = `${crest(q, 'lg')}<b>${n(q)}</b><small>Your club</small>`;
    el('match-them').innerHTML = `${crest(m.op, 'lg')}<b>${n(m.op)}</b><small>Opponent</small>`;
    el('match-clock').textContent = f.done ? 'Full time' : `${minute}′${paused ? ' · Paused' : ''}`;
    el('match-score').textContent = f.score.join(' – ');
    el('match-pens').textContent = f.penalties ? `Penalties ${f.penalties.join(' – ')}` : m.et && minute > 90 ? 'Extra time' : '';
    el('match-progress').max = f.end; el('match-progress').value = minute;
    const eventText = f.events.map(e => `${e[0]}′ ${e[1] ? 'Your goal' : 'Opponent goal'} · ${e[2] ? nm(e[2]) : 'Scorer unrecorded'}${e[3] ? ` · assist ${nm(e[3])}` : ''}`);
    const log = eventText.join('|');
    if (el('match-events').dataset.log !== log) {
      el('match-events').dataset.log = log;
      el('match-events').innerHTML = eventText.map((t,i) => `<p class="${i === eventText.length - 1 ? 'goal-new' : ''}">${esc(t)}</p>`).join('') || '<p class="small">Waiting for the opening goal.</p>';
      el('match-events').scrollTop = el('match-events').scrollHeight;
    }
    const announcement = f.done ? `Full time. ${cname(U.G,q)} ${f.score[0]}, ${cname(U.G,m.op)} ${f.score[1]}.${f.penalties ? ` Penalties ${f.penalties[0]} to ${f.penalties[1]}.` : ''}` : eventText.at(-1) || 'Kick-off.';
    if (el('match-announcement').textContent !== announcement) el('match-announcement').textContent = announcement;
    el('match-star').textContent = f.done && star ? `Your standout: ${nm(star)} · based on recorded goals and assists` : '';
    el('match-next').hidden = !f.done; el('match-next').textContent = at === matches.length - 1 ? 'Return to club →' : 'Next match →';
    el('match-finish').hidden = f.done; el('match-pause').hidden = f.done || reduced(); el('match-pause').textContent = paused ? 'Resume' : 'Pause';
    if (f.done) { stop(); if (['match-pause','match-finish'].includes(focused)) el('match-next').focus(); }
  };
  const begin = () => { stop(); minute = reduced() ? frame(matches[at], 0).end : 0; paused = false; paint(); if (!reduced()) timer = setInterval(() => { if (!paused) { minute = Math.min(minute + 3, frame(matches[at], 0).end); paint(); } }, 100); };
  d.addEventListener('click', e => {
    const id = e.target.closest('button')?.id;
    if (id === 'match-skip') close();
    else if (id === 'match-pause') { paused = !paused; paint(); }
    else if (id === 'match-finish') { minute = frame(matches[at], 0).end; paint(); d.querySelector('#match-next').focus(); }
    else if (id === 'match-next') { if (++at === matches.length) close(); else { begin(); d.querySelector(reduced() ? '#match-next' : '#match-pause').focus(); } }
  });
  d.addEventListener('cancel', () => stop()); d.addEventListener('close', () => { stop(); returnFocus(); });
  return { show(M, club) { if (!M.length) return; matches = M; q = club; at = 0; d.innerHTML = ''; begin(); d.showModal(); d.querySelector('#match-skip').focus(); } };
}
