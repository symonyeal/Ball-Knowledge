// Archive queries and free squad construction. A person occupies at most one of fifteen places.
import { hydrate, shape } from './draft.js';
import { mk, hs, sh, rate, move } from './engine/index.js';
import { TI } from './cap.js';
import { staff } from './staff.js';

export const norm = s => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const refid = c => `${c.k}/${c.p}`;
export const TAGS = { tl: 'Timeless', tal: 'Attacking talent', rock: 'Defensive anchor', mae: 'Playmaker', vs: 'Versatile', bg: 'European pedigree', poa: 'Player of the era' };

export function archive(G) {
  return Object.entries(G.cards).flatMap(([k, Q]) => Q.map(c => {
    const [q, d] = k.split(':');
    return { ...c, k, q, D: Number(d), nm: G.people[c.p].nm, nat: G.people[c.p].nat || '', lg: G.clubs[q].cc,
      search: norm(`${G.people[c.p].nm} ${G.clubs[q].nm} ${G.clubs[q].cc} ${d} ${c.pos.join(' ')} ${Object.keys(c.tg || {}).filter(t => c.tg[t]).map(t => TAGS[t] || t).join(' ')}`) };
  })).sort((a, b) => b.r - a.r || a.nm.localeCompare(b.nm) || a.k.localeCompare(b.k));
}

export function search(A, o = {}) {
  const words = norm(o.q || '').split(' ').filter(Boolean);
  return A.filter(c => (!o.D || c.D === Number(o.D)) && (!o.club || c.q === o.club) &&
    (!o.pos || c.pos.includes(o.pos)) && (!o.tier || TI(c.r) === o.tier) &&
    (!o.tag || c.tg?.[o.tag]) && words.every(w => c.search.includes(w)));
}

export const freeSquad = (G, D = 1990) => ({ D, f: '4-3-3', m: G.managers.find(m => m.f.includes('4-3-3'))?.nm || G.managers[0].nm, slots: Array(15).fill(null), seed: 1 });
export const freeTeam = (G, s) => ({ m: staff(G,G.managers.find(m => m.nm === s.m),null,s.D), S: shape(G, s.f), xi: s.slots.slice(0, 11).map(c => hydrate(G, c)), bn: s.slots.slice(11).map(c => hydrate(G, c)) });

export function freePlace(G, s, c, i) {
  hydrate(G, c);
  if (!Number.isInteger(i) || i < 0 || i >= 15) throw new Error('Choose one of the fifteen places.');
  if (s.slots.some((r, j) => j !== i && r?.p === c.p)) throw new Error('This footballer already has a place in your squad.');
  const slots = s.slots.slice(); slots[i] = { k: c.k, p: c.p };
  return { ...s, slots };
}

export function freeForm(G, s, f) {
  const next = shape(G, f), slots = [...Array(11).fill(null), ...s.slots.slice(11)];
  move(s.slots.slice(0, 11).map(c => hydrate(G, c)), shape(G, s.f), next, s.D)
    .forEach((j, i) => { if (j >= 0) slots[j] = s.slots[i]; });
  return { ...s, f, slots };
}

export function freeFill(G, A, s, seed = s.seed) {
  let next = { ...s, seed }, r = mk(hs(`${seed}:sandbox`));
  const Q = sh(r, A), used = new Set(s.slots.filter(Boolean).map(c => c.p));
  for (let i = 0; i < 15; i++) {
    if (next.slots[i]) continue;
    const pos = i < 11 ? shape(G, s.f)[i].s : ['GK', 'CB', 'CM', 'ST'][i - 11];
    const candidates = Q.filter(c => !used.has(c.p) && c.pos.includes(pos));
    const c = candidates[0] || Q.find(c => !used.has(c.p));
    if (!c) throw new Error('This filtered pool has too few different players to complete the squad.');
    next = freePlace(G, next, c, i); used.add(c.p);
  }
  return next;
}

export function validateFree(G, s) {
  if (!s || ![1950,1960,1970,1980,1990,2000,2010,2020].includes(s.D) || !G.managers.some(m => m.nm === s.m) ||
    !Object.hasOwn(G.formations, s.f) || !Number.isInteger(s.seed) || s.seed < 0 || s.seed > 4294967295 || !Array.isArray(s.slots) || s.slots.length !== 15) throw new Error('The sandbox squad is invalid.');
  let next = { ...s, slots: Array(15).fill(null) };
  for (let i = 0; i < 15; i++) if (s.slots[i]) next = freePlace(G, next, s.slots[i], i);
  return next;
}

export const freeRating = (G, s) => rate(freeTeam(G, s), s.D);
