// Transfer previews run the same pure actions used to commit a purchase. No state is saved here.
// s is a career or Gauntlet; ref is an incoming card; i is its destination squad place.
import * as E from '../engine/index.js';
import * as C from '../career.js';
import * as R from '../run.js';
import { hydrate } from '../draft.js';
import { TI } from '../cap.js';
import { U, esc, num, vcard, SRC } from './kit.js';

const team = (s, career) => career ? C.careerTeam(U.G, s) : R.runTeam(U.G, s);
const decade = (s, career) => career ? s.D : ['hop','repo'].includes(s.ph) ? R.MAPS[s.map].D[s.act+1] ?? R.D_of(s) : R.D_of(s);
const signed = n => `${n >= 0 ? '+' : ''}${num(n)}`;
export function candidate(ref) {
  const c = hydrate(U.G, ref);
  const labels = c.pos.includes('GK') ? ['Diving','Handling','Kicking','Reflexes','Speed','Positioning'] : ['Pace','Shooting','Passing','Dribbling','Defending','Physical'];
  return `<div class="transfer-card">${vcard(c)}<div><p class="small"><b>Natural positions:</b> ${esc(c.pos.join(' · '))}</p><p class="small"><b>Rating source:</b> ${SRC[c.src] || SRC.e}</p>${c.f6 ? `<dl class="transfer-attributes">${c.f6.map((x,i) => `<div><dt>${labels[i]}</dt><dd>${x == null ? '—' : num(x)}</dd></div>`).join('')}</dl>` : '<p class="small dim">Six-attribute data unavailable for this card.</p>'}</div></div>`;
}
export function transferPair(s, ref, i, career = true, next = null) {
  if (!Number.isInteger(i) || i < 0 || i >= s.slots.length) return candidate(ref);
  const T = team(s, career), D = decade(s, career), Q = E.rate(T, D), out = [...T.xi, ...T.bn][i];
  const incoming = hydrate(U.G, ref), nextQ = next ? E.rate(team(next, career), D) : null;
  const old = i < 11 ? Q.xi[i] : Q.bn[i-11], cur = i < 11 ? nextQ?.xi[i] : nextQ?.bn[i-11];
  const charge = (career ? C.careerBill(U.G,s) : R.bill(U.G,s))[i];
  const charged = TI(hydrate(U.G,charge).r), slot = i < 11 ? T.S[i].s : `Bench ${i-10}`;
  const lost = [s.tags?.[out.id] && 'added traits', s.skills?.[out.id] && 'development', s.mv?.[out.id] && 'MVP adjustments', s.evd?.[out.id]?.length && 'completed evolutions', s.evo?.p === out.id && 'the active evolution'].filter(Boolean);
  return `<div class="transfer-pair" data-incoming="${esc(ref.p)}" data-outgoing="${esc(out.id)}"><section><h4>Outgoing · ${esc(slot)}</h4>${candidate(s.slots[i])}<p class="small">Current rating ${num(out.r)} · ${charged} cap charge.</p>${lost.length ? `<p class="warn small">Releasing him removes ${lost.join(', ')}. These do not transfer to the arrival.</p>` : ''}</section><section><h4>Incoming · ${esc(slot)}</h4>${candidate(ref)}<p class="small">Base rating ${num(incoming.r)} · ${TI(incoming.r)} cap charge.</p></section></div>
    <p class="small"><b>Preview for the ${D}s.</b></p><dl class="transfer-impact"><div><dt>Rating in place</dt><dd>${num(old.a)} → ${cur ? num(cur.a) : 'unavailable'}</dd></div><div><dt>Chemistry</dt><dd>${old.n ?? 0} → ${cur ? cur.n ?? 0 : '—'} <small>· team ${Q.chem.total} → ${nextQ ? nextQ.chem.total : '—'}/33</small></dd></div><div><dt>Squad overall</dt><dd>${num(Q.ovr)}${nextQ ? ` → ${num(nextQ.ovr)} (${signed(nextQ.ovr-Q.ovr)})` : ''}</dd></div></dl><p class="small dim">Rating in place includes position fit, era and teammate bonuses. Base card ratings are shown above. Releasing a starter fills his place; you can rearrange after the window.</p>`;
}
export function marketPreview(s, j, pick = 0, i = 0, career = true) {
  const offers = career ? C.careerOffers(U.G,s) : R.offers(U.G,U.F,s), o = offers[j];
  if (!o?.list?.[pick]) return '';
  let next;
  try { next = career ? C.careerTake(U.G,s,j,{pick,slot:i}) : R.take(U.G,U.F,s,j,{pick,slot:i}); } catch { /* Illegal purchases still show the two cards, without a simulated result. */ }
  return transferPair(s,o.list[pick],i,career,next);
}
export function upgradePreview(s, u, career = true) {
  const T = team(s,career), out = [...T.xi,...T.bn][u.i];
  return `<div class="transfer-pair"><section><h4>Current card</h4>${candidate(u.from)}<p class="small">Developed rating ${num(out.r)}.</p></section><section><h4>Prime card</h4>${candidate(u.to)}<p class="small">Base improvement ${signed(u.to.r-u.from.r)}. Development stays with the player.</p></section></div>`;
}
// Gauntlet transfer window; the career has a single summer change instead.
export function windowPreview(s, selection) {
  try {
    const next = R.hop(U.G,s,selection), H = R.hopPools(U.G,s);
    const refs = [...selection.old.map(i=>H.old[i]), ...selection.neu.map(i=>H.neu[i])];
    const html = refs.map((ref,j)=>transferPair(s,ref,selection.out[j],false,next)).join('');
    return {ok:true,tx:`Ready: ${refs.length} arrivals, ${refs.length} different departures. No patience cost.`,html};
  } catch(e) { return {ok:false,tx:e.message,html:''}; }
}
export function refreshTransfers(root) {
 root.querySelectorAll('[data-transfer-choice]').forEach(input => { input.checked = root.querySelector(`#${input.dataset.transferChoice}`)?.value === input.value; });
 for (const career of [true,false]) {
  const mode=career ? 'career' : 'run', s=U.S?.mode?.[mode];
  if (!s) continue;
  root.querySelectorAll(`[data-transfer-preview][data-transfer-mode="${mode}"]`).forEach(el => {
    const j=Number(el.dataset.transferPreview), p=career ? `career-fa-${j}` : `fa-pick-${j}`, out=career ? `career-out-${j}` : `fa-slot-${j}`;
    el.innerHTML=marketPreview(s,j,Number(root.querySelector(`#${p}`).value),Number(root.querySelector(`#${out}`).value),career);
  });
  root.querySelectorAll(`[data-upgrade-preview][data-transfer-mode="${mode}"]`).forEach(el => {
    const j=Number(el.dataset.upgradePreview), id=career ? `career-up-${j}` : `up-pick-${j}`, pick=Number(root.querySelector(`#${id}`).value);
    const O=career ? C.careerOffers(U.G,s) : R.offers(U.G,U.F,s);
    el.innerHTML=upgradePreview(s,O[j].list[pick],career);
  });
  const confirm=!career && root.querySelector('#run-hop');
  if (!confirm) continue;
  const H=R.hopPools(U.G,s), selection={old:[],neu:[],out:[]};
  for (const k of ['old','neu']) {
    const inputs=root.querySelectorAll(`[data-hop-pick="${k}"]`);
    inputs.forEach(input => {
      const i=Number(input.value), wrap=input.closest('.transfer-pick'), out=wrap.querySelector('select'), el=wrap.querySelector('[data-arrival-preview]');
      const slot=out.value === '' ? null : Number(out.value);
      // Only show the departure once this candidate is selected; other rows retain their incoming card.
      el.innerHTML=input.checked && slot !== null ? transferPair(s,H[k][i],slot,false) : candidate(H[k][i]);
      wrap.classList.toggle('selected',input.checked);
      if (input.checked) { selection[k].push(i); selection.out.push(slot); }
    });
  }
  const x=windowPreview(s,selection);
  confirm.disabled=!x.ok;
  root.querySelector('#run-transfer-window-status').textContent=x.tx;
  root.querySelector('#run-transfer-window-preview').innerHTML=x.html;
 }
}
