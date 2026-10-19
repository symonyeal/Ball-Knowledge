// Start screen and the choice of manager and club spell.
//
// Legend
//   intro()   decades, rules, seed, the Gauntlet entry, the weekly challenge and three archive cards
//   teams()   five seeded manager-club options; the inspected one sets the starting formation
//   sq(o)     the spell's club-decade squads: decades from the first to the last season start
//   sig(m, o) his signature players split by whether the spell's squads hold a card of theirs

import { DECADES, POOL, opts, hydrate, shape } from '../draft.js';
import { MAPS } from '../run.js';
import { wk } from '../play.js';
import { U, esc, seasons, kv, mini, pitch, vcard, portrait, ERA, nm } from './kit.js';

const ART = [['Q17515', 'Q2641:1980', -9], ['Q1835', 'Q8682:2000', 0], ['Q17163', 'Q7156:1970', 9]];

export function intro() {
  const { G, D, cap } = U, w = wk();
  const cards = ART.filter(([p, k]) => G.cards[k]?.some(c => c.p === p))
    .map(([p, k, a], i) => `<div class="fan" style="--a:${a}deg;--i:${i}">${vcard(hydrate(G, { k, p }))}</div>`).join('');
  return `<section class="land mode-hero"><div class="land-copy"><p class="eyebrow">Football Era Draft · 1950—2020</p><h1>Greatness.<br>Across eras.</h1><p class="lede">Your manager. Your fifteen. A decade to make history.</p><p class="small">Draft football's past into your next great team.</p></div><div class="land-art" aria-hidden="true" inert><div class="land-pitch">${pitch(G.formations['4-3-3'].slots.map(([s,x,y])=>({s,x,y})),[],{mode:'view',sm:true})}</div><div class="fans">${cards}</div></div></section>
  <section class="mode-menu" aria-label="Choose a mode">
    <button class="mode-tile mode-career" id="mode-career" type="button"><span class="eyebrow">01 · The long game</span><strong>Career</strong><span>Choose your era. Build a club. Chase the decade.</span><b aria-hidden="true">↗</b></button>
    <button class="mode-tile mode-gauntlet" id="mode-gauntlet" type="button"><span class="eyebrow">02 · Survive the eras</span><strong>Era Gauntlet</strong><span>Four rounds. One boss. A new decade awaits.</span><b aria-hidden="true">↗</b></button>
    <button class="mode-tile mode-weekly" id="weekly" type="button"><span class="eyebrow">03 · ${esc(w.id)}</span><strong>Weekly</strong><span>${w.D}s · One seed. Your choices.</span><b aria-hidden="true">↗</b></button>
    <button class="mode-tile mode-clubhouse" data-club-open="home" type="button"><span class="eyebrow">04 · Your football home</span><strong>Clubhouse</strong><span>Build freely. Collect cards. Solve daily puzzles.</span><b aria-hidden="true">↗</b></button>
  </section>
  <details class="career-setup" id="career-setup" ${U.setup ? 'open' : ''}><summary>Career &amp; Gauntlet setup <span>Decade · Rules · Seed</span></summary><div class="setup-body"><form id="start-form" class="start" novalidate>
        <fieldset class="eras"><legend class="lbl">Career decade · your league and rivals come from here</legend>
          <div class="era-tools"><button id="random-decade" type="button" class="btn q sm" data-era="random" aria-pressed="${D === 'random'}">Random decade</button><small class="small">${D === 'random' ? 'Your seed chooses the decade.' : 'Choose an era or let the seed decide.'}</small></div>
          <div class="tiles">${DECADES.map(d => `<button type="button" class="tile" data-era="${d}" aria-pressed="${D === d}" style="--era:var(--era-${d})"><b>${d}s</b><small>${ERA[d]}</small></button>`).join('')}</div>
        </fieldset>
        <div class="start-row">
          <fieldset class="rules"><legend class="lbl">Rules</legend>
            <label><input id="draft-cap" type="radio" name="draft-rules" value="cap" ${cap ? 'checked' : ''}><span><b>Salary cap</b><small>2 S · 4 A · 4 B · 3 C · 2 D</small></span></label>
            <label><input id="draft-classic" type="radio" name="draft-rules" value="classic" ${!cap ? 'checked' : ''}><span><b>Classic</b><small>No tier limits</small></span></label>
          </fieldset>
          <div class="seed"><label class="lbl" for="seed">Replay seed</label><div class="seed-row"><input id="seed" name="seed" inputmode="numeric" autocomplete="off" value="${esc(U.seed)}" aria-describedby="seed-help"><button id="seed-reroll" class="btn q sm" type="button" aria-label="Re-roll the replay seed">Re-roll seed</button></div><small id="seed-help">Same seed, rules and choices give the same run.</small></div>
          <button class="btn big" type="submit">Enter the draft →</button>
        </div>
      </form>
  <section class="weekly gauntlet-entry" aria-label="Era Gauntlet"><div><p class="lbl">Era Gauntlet · a roguelike run</p><p class="wk">Draft, then survive decade after decade</p>
    <p class="small">Draft fifteen from the decades near your map's first stop, then play four six-match rounds and a two-legged boss in every decade, with rewards, transfers and board patience between. Uses the rules and seed above.</p></div>
    <div class="row wrap"><label class="field"><span class="lbl">Map</span><select id="gauntlet-map">${Object.entries(MAPS).map(([k, m]) => `<option value="${k}" ${k === 'reverse' ? 'selected' : ''}>${esc(m.nm)} · ${m.D[0]}s first · draft ${Math.max(1950, m.D[0] - POOL)}s–${Math.min(2020, m.D[0] + POOL)}s</option>`).join('')}</select></label>
    <button class="btn" id="gauntlet-start" type="button">Start the Gauntlet draft →</button></div></section>
  </div></details>
  <p class="replay"><label>Have a saved replay? <input id="import-replay" type="file" accept="application/json,.json"></label></p>`;
}

const sq = o => { const D = []; for (let d = Math.floor(o.a / 10) * 10; d <= Math.floor(o.b / 10) * 10; d += 10) if (U.G.cards[`${o.q}:${d}`]) D.push(d); return D; };
function sig(m, o) {
  const H = new Set(sq(o).flatMap(d => U.G.cards[`${o.q}:${d}`].map(c => c.p)));
  return { here: m.sig.filter(p => H.has(p)).map(nm), away: m.sig.filter(p => !H.has(p)).map(nm) };
}
const spells = (m, o) => { const T = m.t.filter(([q]) => q === o.q).sort((x, y) => x[1] - y[1]); return [T.findIndex(t => t[1] === o.a) + 1, T.length]; };
const career = o => o.ys?.length ? `${U.G.lg[o.lg].nm} top flight · ${seasons(o.ys[0], o.ys.at(-1))}` : 'Legacy draft · original team options';

export function teams() {
  const { G, S } = U, O = opts(G, S), j = Math.min(U.insp, O.length - 1);
  const card = (o, i) => {
    const m = G.managers.find(m => m.nm === o.nm), c = G.clubs[o.q], [n, of] = spells(m, o), s = sig(m, o), D = sq(o);
    return `<article class="tc ${i === j ? 'on' : ''}" data-manager-card="${i}" style="${kv(o.q)}" aria-label="${esc(`${m.nm}, ${c.nm} ${seasons(o.a, o.b)}`)}">
      <div class="th"><p class="lbl">Option ${i + 1} · ${esc(c.cc)}</p><p class="cn">${esc(c.nm)}</p><p class="yr">${seasons(o.a, o.b)}</p><p class="small career-context">${esc(career(o))}</p></div>
      <div class="bd">${portrait('manager:' + m.nm, m.nm)}<div class="row top"><button class="mg manager-name" type="button" data-inspect="${i}" aria-controls="manager-preview" aria-pressed="${i === j}">${esc(m.nm)}</button>${of > 1 ? `<span class="tg o">Spell ${n} of ${of}</span>` : ''}</div>
        <div class="gr"><span>Att <b>${m.ga}</b></span><span>Def <b>${m.gd}</b></span></div>
        <div><p class="lbl">Recorded formations</p><p class="fs">${m.f.map(esc).join(' · ')}</p></div>
        <div><p class="lbl">Signature players</p><p class="small"><b>${s.here.length} in this team's squads</b>${s.away.length ? ` · ${s.away.length} elsewhere` : ''}${s.here.length ? `<br>${s.here.slice(0, 3).map(esc).join(' · ')}` : ''}</p></div>
        <p class="small sq">${D.length ? `Archive squads: ${D.map(d => `${d}s (${G.cards[`${o.q}:${d}`].length})`).join(' · ')}` : `No archive squad for ${esc(c.nm)} in the ${Math.floor(o.a / 10) * 10}s`}</p>
        <div class="row"><button class="btn q sm" type="button" data-inspect="${i}" aria-pressed="${i === j}">Inspect</button><button class="btn sm" type="button" data-manager="${i}">Choose</button></div></div></article>`;
  };
  const o = O[j], m = G.managers.find(m => m.nm === o.nm), c = G.clubs[o.q], s = sig(m, o);
  const rec = m.f.filter(f => G.formations[f]), rest = Object.keys(G.formations).filter(f => !rec.includes(f));
  const f0 = U.f0 && G.formations[U.f0] ? U.f0 : rec[0];
  const D = sq(o);
  return `<section class="teams">
    <div class="head"><div><p class="eyebrow">Step 1 · your managerial context</p><h1>Choose a manager and his club</h1>
      <p class="lede">Five managers, one club spell each${S.v === 4 ? ` in the ${S.D}s` : ''}. The team sets grades and signature players; the formation stays your choice until kick-off.</p></div>
      <button class="btn q" type="button" id="manager-reroll" ${S.managerRoll >= 2 ? 'disabled' : ''}>Re-spin teams <span>${2 - S.managerRoll} left</span></button></div>
    <div class="tcs">${O.map(card).join('')}</div>
    <section class="insp-team" id="manager-preview" tabindex="-1" aria-label="${esc(`${m.nm} at ${c.nm}`)}" style="${kv(o.q)}">
      <header class="manager-identity">${portrait('manager:' + m.nm,m.nm)}<p class="lbl">Manager preview · Option ${j + 1}</p><h2>${esc(m.nm)}</h2><p>${esc(c.nm)} · ${seasons(o.a, o.b)}</p></header>
      <div><p class="lbl">Start in · change any time before kick-off</p>
        <div class="shape-preview"><div class="start-shape" id="start-shape" data-formation="${esc(f0)}" aria-label="${esc(f0)} formation preview">${pitch(shape(G, f0), [], { mode: 'view', sm: true })}</div><p class="shape-caption"><b>${esc(f0)}</b><span class="small">${rec.includes(f0) ? 'Recorded formation' : 'Your formation'}</span></p></div>
        <div class="row wrap">${rec.map(f => `<button type="button" class="fm ${f === f0 ? 'on' : ''}" data-start-form="${esc(f)}" data-key="sf:${esc(f)}" aria-pressed="${f === f0}">${mini(G, f)}<span><b>${esc(f)}</b><small>Recorded</small></span></button>`).join('')}</div>
        <label class="sel full"><span class="sr-only">Starting formation</span><select id="start-formation">${rec.map(f => `<option value="${esc(f)}" ${f === f0 ? 'selected' : ''}>${esc(f)} · recorded</option>`).join('')}<optgroup label="Other formations">${rest.map(f => `<option value="${esc(f)}" ${f === f0 ? 'selected' : ''}>${esc(f)}</option>`).join('')}</optgroup></select></label>
        <p class="small">Recorded formations come from his whole career, not only this spell. Any of the ${Object.keys(G.formations).length} catalogue formations can be played.</p></div>
      <div><p class="lbl">Grades</p><div class="gr"><span>Attack <b>${m.ga}</b></span><span>Defence <b>${m.gd}</b></span></div>
        <p class="small">From ${m.ec} European Cup${m.ec === 1 ? '' : 's'}, ${m.lt} league title${m.lt === 1 ? '' : 's'} and ${m.ct} other European troph${m.ct === 1 ? 'y' : 'ies'} over his career. A signature player anywhere in your fifteen raises both grades one step.</p></div>
      <div><p class="lbl">Signature players${D.length ? ` · ${s.here.length} in ${esc(c.nm)}'s ${D.map(d => `${d}s`).join(' and ')} squads` : ''}</p>
        <p class="small cols">${s.here.map(esc).join('<br>') || 'None in this team\'s archive squads.'}</p>
        <p class="small">${s.away.length ? `Elsewhere in his career: ${s.away.map(esc).join(', ')}.` : 'Elsewhere in his career: none.'}</p></div>
      <div class="cta"><button class="btn big" type="button" data-choose="${j}">Choose ${esc(m.nm)} · ${esc(c.nm)}</button><span class="small">${esc(career(o))}</span><span class="small">Manager's spell: ${seasons(o.a, o.b)}</span></div>
    </section>
  </section>`;
}
