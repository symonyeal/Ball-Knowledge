// Daily puzzles use a local calendar date; practice uses a caller-supplied seed.
import { mk, hs, sh } from './engine/rng.js';
import { norm, refid } from './archive.js';
import { TI } from './cap.js';

export const KINDS = { card: 'Daily Card', higher: 'Higher or Lower', roster: 'Squad Recall', career: 'Career Trail' };
export const day = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
export const previous = d => { const t = new Date(`${d}T12:00:00Z`); t.setUTCDate(t.getUTCDate() - 1); return t.toISOString().slice(0, 10); };
export const cardAt = (A, id) => A.find(c => refid(c) === id);
const paths = new WeakMap();

export function puzzle(G, A, kind, date, seed = 'daily', now = Date.now()) {
  if (!Object.hasOwn(KINDS, kind)) throw new Error('Choose one of the four mini-games.');
  const r = mk(hs(`football-minis-v1:${date}:${kind}:${seed}`)), I = new Set();
  if (kind === 'card' || kind === 'higher') while (I.size < (kind === 'card' ? 1 : 30)) I.add(Math.floor(r()*A.length));
  const Q = [...I].map(i=>A[i]);
  const s = { kind, date, seed, guesses: [], score: 0, done: false, won: false, started: now };
  if (kind === 'card') return { ...s, target: refid(Q[0]) };
  if (kind === 'higher') return { ...s, pairs: Array.from({ length: 15 }, (_, i) => [refid(Q[2*i]), refid(Q[2*i+1])]) };
  if (kind === 'roster') {
    const keys = Object.keys(G.cards).filter(k => G.cards[k].length >= 15);
    return { ...s, club: keys[Math.floor(r()*keys.length)], deadline: now + 120000 };
  }
  if (!paths.has(A)) {
    const by = new Map();
    for (const c of A) { if (!by.has(c.p)) by.set(c.p, new Set()); by.get(c.p).add(c.q); }
    paths.set(A, by);
  }
  const by = paths.get(A);
  const ids = sh(r, [...by].filter(([, clubs]) => clubs.size >= 2 && clubs.size <= 8).map(([p]) => p));
  return { ...s, rounds: ids.slice(0, 5).map(p => {
    const clubs = [...by.get(p)], other = sh(r, Object.keys(G.clubs).filter(q => !clubs.includes(q))).slice(0, 4);
    return { p, clubs, choices: sh(r, [...clubs, ...other]) };
  }) };
}

export function answer(G, A, s, value, now = Date.now()) {
  if (s.done) return s;
  const guesses = s.guesses.slice(); let score = s.score, done = false, won = false;
  if (s.kind === 'card') {
    const c = cardAt(A, value); if (!c) throw new Error('Choose a card from the archive results.');
    if (guesses.includes(value)) throw new Error('You have already tried that card.');
    guesses.push(value); won = value === s.target; done = won || guesses.length === 15; score = won ? 16 - guesses.length : 0;
  } else if (s.kind === 'higher') {
    if (![0, 1].includes(value)) throw new Error('Choose the left or right card.');
    const pair = s.pairs[guesses.length].map(id => cardAt(A, id));
    const correct = pair[value].r >= pair[1-value].r;
    guesses.push(value); score += Number(correct); done = !correct || guesses.length === 15; won = score === 15;
  } else if (s.kind === 'roster') {
    if (now >= s.deadline || value === null) { done = true; won = guesses.length >= 5; }
    else {
      const names = G.cards[s.club].filter(c => norm(G.people[c.p].nm) === norm(value));
      const c = names[0];
      if (!c) throw new Error('That name is not in this archive squad. Use the full player name.');
      if (guesses.includes(c.p)) throw new Error('You have already named this player.');
      guesses.push(c.p); score += { S:1, A:2, B:3, C:4, D:5 }[TI(c.r)];
      done = guesses.length === G.cards[s.club].length; won = done;
    }
  } else {
    const round = s.rounds[guesses.length];
    if (!Array.isArray(value) || new Set(value).size !== value.length || value.some(q => !round.choices.includes(q))) throw new Error('Select clubs from the choices.');
    const correct = value.length === round.clubs.length && value.every(q => round.clubs.includes(q));
    guesses.push(value); score += Number(correct); done = guesses.length === s.rounds.length; won = done && score >= 3;
  }
  return { ...s, guesses, score, done, won };
}

export function clues(c, t, G) {
  return [ ['Club',G.clubs[c.q].nm,c.q===t.q], ['Country',G.clubs[c.q].cc,G.clubs[c.q].cc===G.clubs[t.q].cc],
    ['Decade',`${c.D}s${c.D===t.D?'':c.D<t.D?' ↑':' ↓'}`,c.D===t.D], ['Position',c.pos.join('/'),c.pos.some(p=>t.pos.includes(p))], ['Tier',TI(c.r),TI(c.r)===TI(t.r)] ];
}

export function streak(sessions, kind, today = day()) {
  const wins = new Set(Object.values(sessions).filter(s => s.kind === kind && s.seed === 'daily' && s.done && s.won).map(s => s.date));
  let d = wins.has(today) ? today : previous(today), current = 0, best = 0;
  while (wins.has(d)) { current++; d = previous(d); }
  for (const a of wins) { let n = 0, d = a; while (wins.has(d)) { n++; d = previous(d); } best = Math.max(best, n); }
  return { current, best, wins: wins.size };
}

export function validatePuzzle(G, A, s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || typeof s.seed !== 'string' || s.seed.length > 80 ||
    !Number.isSafeInteger(s.started) || s.started < 0 || !Array.isArray(s.guesses) || s.guesses.length > 1000) throw new Error('The mini-game save is invalid.');
  const date = new Date(`${s.date}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==s.date) throw new Error('The mini-game date is invalid.');
  let next = puzzle(G, A, s.kind, s.date, s.seed, s.started);
  for (const v of s.guesses) {
    if (next.done) throw new Error('The mini-game has guesses after it ended.');
    next = answer(G, A, next, s.kind === 'roster' ? G.people[v]?.nm : v, s.started);
  }
  if (s.kind === 'roster' && s.done && !next.done) next = answer(G, A, next, null, s.started);
  return next;
}
