import * as E from '../engine/index.js';
import { DECADES, hydrate } from '../draft.js';
import { wk, code } from '../play.js';
import { TI } from '../cap.js';
import { archive, search, refid, freeSquad, freeTeam, freeRating, freePlace, freeForm, freeFill, TAGS } from '../archive.js';
import { PROFILE, emptyProfile, validateProfile, record, totals, collection, achievements, completeSbc } from '../profile.js';
import * as Sbc from '../sbc.js';
import { KINDS, day, puzzle, answer, clues, cardAt, streak } from '../minis.js';
import { esc, SRC, SRT, vcard } from './kit.js';
import { xi, breakdown } from './season.js';
import { ambience } from '../ambience.js';

const pages = { home:'Clubhouse', sandbox:'Sandbox', sbc:'Squad challenges', database:'Player database', stats:'Lifetime stats', records:'Personal records', achievements:'Achievements', collection:'Card collection', minis:'Mini-games', weekly:'Weekly archive', settings:'Settings' };
const btn = (label, attrs = '', quiet = true) => `<button type="button" class="btn ${quiet?'q ':''}sm" ${attrs}>${label}</button>`;
const options = (Q, value) => Q.map(([v,n])=>`<option value="${esc(v)}" ${String(value)===String(v)?'selected':''}>${esc(n)}</option>`).join('');
const select = (label, id, Q, value) => `<label class="field"><span class="lbl">${label}</span><select id="${id}">${options(Q,value)}</select></label>`;
const number = n => Number(n).toFixed(1);
const random = () => crypto.getRandomValues(new Uint32Array(1))[0];

export function mountClubhouse(U, { notice, weekly }) {
  const G=U.G, A=archive(G), by=new Map(A.map(c=>[refid(c),c]));
  let P=emptyProfile(), loadError='';
  const sound=ambience();
  try { const raw=localStorage.getItem(PROFILE); if(raw)P=validateProfile(G,A,JSON.parse(raw)); }
  catch(x) {loadError=`Saved profile could not be loaded: ${x.message} Your draft save is separate. Export the existing profile before replacing it.`;}
  let sbcId=null, sbcWeek=null; let page='home', query={q:'',D:'',club:'',pos:'',tier:'',tag:''}, offset=0, detail=null, pins=[], mode='', recordEra='', collectionState='all', mini=null, daily=true, chosen=new Set(), feedback='', sandboxResult=null;
  const dialog=document.createElement('dialog'); dialog.id='clubhouse'; dialog.className='dialog clubhouse'; dialog.setAttribute('aria-labelledby','clubhouse-title'); document.body.append(dialog);
  const clubs=Object.entries(G.clubs).sort((a,b)=>a[1].nm.localeCompare(b[1].nm)).map(([q,c])=>[q,c.nm]);
  const save = () => {
    if(loadError){notice('Saved profile needs repair. Export the stored profile in Settings, then import a backup or reset.',true);return;}
    try {localStorage.setItem(PROFILE,JSON.stringify(P));}catch {notice('Profile could not be saved. Export a backup before closing this page.',true);}
  };
  function applySettings() {
    const o=P.settings;
    document.body.dataset.theme=o.theme; document.body.dataset.effects=String(o.effects); document.body.dataset.compact=String(o.compact); document.body.dataset.backdrop=o.backdrop;
    U.sort=o.sort;
  }
  applySettings();
  const sbox = () => P.sandbox || freeSquad(G);
  const cardLabel = c => `${c.nm} · ${G.clubs[c.q].nm} · ${c.D}s`;
  const metric = (n,label) => `<article class="stat-card"><b class="club-metric">${n}</b><p class="lbl">${label}</p></article>`;
  const top = text => `<p class="lede">${text}</p>`;
  const dailyKey = (kind,seed='daily') => `${day()}:${kind}:${seed}`;
  const current = () => mini ? P.sessions[mini] : null;

  function home() {
    const t=totals(P), ach=achievements(P);
    return `${top('Build freely, explore the archive and keep your football history. No account required.')}<div class="club-metrics">${metric(t.drafts,'Drafts')}${metric(t.seasons,'League seasons')}${metric(t.titles,'Trophies')}${metric(ach.filter(a=>a.unlocked).length,'Achievements')}</div>
    <div class="club-grid">${Object.entries(pages).filter(([k])=>k!=='home').map(([k,n])=>`<article class="challenge-card"><h2>${n}</h2><p class="small">${{sandbox:'Choose any fifteen cards and test them across eras.',sbc:'EA-style squad puzzles: meet chemistry, nation and rating targets to unlock reward cards.',database:'Search players, club spells, positions, tiers and tags.',stats:'Your matches, goals, trophies and favourite players.',records:'Compare completed seasons by mode and era.',achievements:'Football milestones with visible progress.',collection:'Win silverware to unlock the exact cards in your squad.',minis:'Four daily puzzles, streaks and unlimited practice.',weekly:'Replay this week or any of the past twelve weeks.',settings:'Appearance, motion, roster sort and profile backups.'}[k]}</p>${btn('Open',`data-club-page="${k}"`)}</article>`).join('')}</div>`;
  }

  function filters() {
    return `<form id="archive-filter" class="club-filters" role="search"><label class="field club-search"><span class="lbl">Player, club or tag</span><input id="archive-query" value="${esc(query.q)}" placeholder="Search the football archive" autocomplete="off"></label>
      ${select('Decade','archive-D',[['','All decades'],...DECADES.map(d=>[d,`${d}s`])],query.D)}${select('Club','archive-club',[['','All clubs'],...clubs],query.club)}
      ${select('Position','archive-pos',[['','All positions'],...E.SL.map(s=>[s,s])],query.pos)}${select('Tier','archive-tier',[['','All tiers'],...['S','A','B','C','D'].map(t=>[t,t])],query.tier)}
      ${select('Tag','archive-tag',[['','All tags'],...Object.entries(TAGS)],query.tag)}${btn('Clear filters','id="archive-clear"')}</form>`;
  }

  function detailView() {
    const c=by.get(detail); if(!c)return '';
    return `<section class="club-detail" aria-label="Card details"><div>${vcard(hydrate(G,c))}</div><div><h2>${esc(cardLabel(c))}</h2><p>${esc(SRT[c.s]||c.s)}</p><p class="small">Recorded club spell: ${c.a}–${c.b}. Decade squads can include players who never shared one season. Overall ratings are game assessments or estimates.</p>
      <p class="small">${Object.entries(c.tg||{}).filter(([,v])=>v).map(([k,v])=>`${esc(TAGS[k]||k)} ${v}`).join(' · ')||'No special tags.'}</p>
      ${c.f6?`<p>Card attributes: ${['Pace','Shooting','Passing','Dribbling','Defending','Physical'].map((n,i)=>`${n} ${c.f6[i]}`).join(' · ')}</p>`:''}
      <div class="row wrap">${btn(pins.includes(detail)?'Unpin comparison':'Compare card',`data-pin="${esc(detail)}"`)}${btn('All cards for this player',`data-person="${esc(c.p)}"`)}</div>
      <details><summary>Rating by position</summary><p>${E.SL.map(s=>`${s} ${number(c.sr?c.sr[E.SL.indexOf(s)]:c.r*(1-E.ft(c,s).f))}`).join(' · ')}</p></details></div></section>`;
  }

  function comparisons() {
    if(!pins.length)return '';
    return `<section class="club-comparison"><h2>Pinned cards</h2><div class="club-grid">${pins.map(id=>{const c=by.get(id);return `<article class="stat-card"><h3>${esc(cardLabel(c))}</h3><p>${number(c.r)} overall · ${c.pos.join('/')} · ${esc(SRC[c.s]||c.s)}</p><p class="small">Era-adjusted base (before position fit and chemistry): ${DECADES.map(d=>`${d}s ${number(c.r*E.em(c.D,d,c.tg?.tl||0))}`).join(' · ')}</p>${btn('Remove',`data-pin="${esc(id)}"`)}</article>`;}).join('')}</div></section>`;
  }

  function cardRows(Q, action='inspect') {
    const unlocked=collection(P);
    return `<div class="tw"><table class="club-table"><caption class="sr-only">Club-era player cards</caption><thead><tr><th>Player</th><th>Club · decade</th><th>Position</th><th>Overall</th><th>Source</th><th>Action</th></tr></thead><tbody>${Q.map(c=>`<tr><td>${esc(c.nm)}${page==='collection'?`<br><small>${unlocked.has(refid(c))?'Unlocked':'Locked'}</small>`:''}</td><td>${esc(G.clubs[c.q].nm)} · ${c.D}s</td><td>${esc(c.pos.join('/'))}</td><td>${number(c.r)} <small>${TI(c.r)}</small></td><td><abbr title="${esc(SRT[c.s]||c.s)}">${esc(SRC[c.s]||c.s)}</abbr></td><td>${btn(action==='pick'?'Place card':action==='guess'?'Guess card':'Inspect',`data-archive-${action}="${esc(refid(c))}"`)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function database(collect=false, sandbox=false) {
    const unlocked=collection(P), Q=search(A,query).filter(c=>!collect||collectionState==='all'||unlocked.has(refid(c))===(collectionState==='unlocked')), visible=Q.slice(offset,offset+24);
    return `${collect?select('Collection','collection-state',[['all','All cards'],['unlocked','Unlocked cards'],['locked','Locked cards']],collectionState):''}${filters()}<p class="small" role="status">${Q.length.toLocaleString()} cards match · ${offset+Number(!!Q.length)}–${Math.min(offset+24,Q.length)} shown.${collect?` ${visible.filter(c=>unlocked.has(refid(c))).length} of the cards on this page are unlocked.`:''}</p>${detailView()}${comparisons()}
      ${Q.length?cardRows(visible,sandbox?'pick':'inspect'):'<p class="empty">No cards match. Clear filters or earn a trophy to unlock more collection cards.</p>'}
      <div class="row wrap">${btn('Previous','id="archive-prev"'+(offset?'':' disabled'))}${btn('Next','id="archive-next"'+(offset+24<Q.length?'':' disabled'))}</div>`;
  }

  // Squad Building Challenges: the permanent set and this ISO week's three; a challenge is built in the sandbox.
  const challenges = () => { const w=wk().id; if(sbcWeek?.w!==w)sbcWeek={w,Q:Sbc.challenges(G,A)}; return sbcWeek.Q; };
  const sbcDone = () => new Set(P.events.filter(e=>e.kind==='sbc').map(e=>e.id.slice(4)));
  function squadChallenges() {
    const done=sbcDone(), Q=challenges();
    return `${top(`${Q.filter(c=>done.has(c.id)).length} / ${Q.length} completed. Build a starting eleven in the sandbox that meets every requirement; each challenge unlocks its reward card once. Chemistry follows the lineup rules: natural positions only.`)}
      <div class="club-grid">${Q.map(c=>{const ref=Sbc.reward(G,A,c), x=by.get(refid(ref));return `<article class="challenge-card ${done.has(c.id)?'club-earned':''}"><p class="lbl">${c.wk?`Weekly · ${esc(c.wk)}`:'Permanent'}${done.has(c.id)?' · Completed':''}</p><h2>${esc(c.nm)}</h2><ul class="sbc-req">${c.req.map(([k,n,v])=>`<li>${esc(Sbc.R[k].tx(n,v,G))}</li>`).join('')}</ul><p class="small">Reward: ${esc(cardLabel(x))} · ${number(x.r)}</p>${done.has(c.id)?'':btn('Build in sandbox',`data-sbc-build="${esc(c.id)}"`,false)}</article>`;}).join('')}</div>`;
  }
  function sbcPanel(s) {
    const c=challenges().find(c=>c.id===sbcId); if(!c)return '';
    const rows=Sbc.check(G,s,c), ok=rows.every(r=>r.ok);
    return `<section class="sbc-panel" aria-label="Challenge requirements"><h2>${esc(c.nm)}</h2><ul class="sbc-req">${rows.map(r=>`<li class="${r.ok?'ok':'no'}"><span>${r.ok?'✓':'✗'} ${esc(r.tx)}</span><b>${r.x}</b></li>`).join('')}</ul>
      <div class="row wrap">${btn('Submit challenge',`id="sbc-submit" ${ok?'':'disabled'}`,false)}${btn('Leave challenge','id="sbc-leave"')}</div></section>`;
  }

  function sandbox() {
    const s=sbox(), T=freeTeam(G,s), Q=freeRating(G,s), places=[...T.S.map(p=>p.s),'B1','B2','B3','B4'];
    return `${top('Choose any fifteen distinct footballers. Compare formations and eras, then simulate a league and European Cup. Sandbox has its own records; only Squad challenges unlock collection cards from here.')}${sbcId?sbcPanel(sbox()):''}
      <div class="club-filters">${select('Simulation era','sandbox-D',DECADES.map(d=>[d,`${d}s`]),s.D)}${select('Formation','sandbox-f',Object.keys(G.formations).map(f=>[f,f]),s.f)}
      ${select('Manager','sandbox-m',G.managers.map(m=>[m.nm,m.nm]),s.m)}<label class="field"><span class="lbl">Replay seed</span><input id="sandbox-seed" inputmode="numeric" value="${s.seed}"></label></div>
      <div class="row wrap">${btn('Fill empty places','id="sandbox-fill"')}${btn('Clear squad','id="sandbox-clear"')}${btn('Simulate season',`id="sandbox-play" ${s.slots.every(Boolean)?'':'disabled'}`,false)}${btn('Export squad','id="sandbox-export"')}${btn('Copy team code',`id="sandbox-code" ${s.slots.every(Boolean)?'':'disabled'}`)}<label class="btn q sm">Import squad<input id="sandbox-import" type="file" accept=".json,application/json" class="sr-only"></label></div>
      <p><b>${number(Q.ovr)} overall</b> · Attack ${number(Q.A)} · Midfield ${number(Q.M)} · Defence ${number(Q.Dk)}</p>
      ${xi(T,Q,s.D,`Sandbox ${s.f}`)}${breakdown(Q)}
      <div class="club-filters">${select('Place selected card at','sandbox-slot',places.map((p,i)=>[i,`${p} · ${s.slots[i]?hydrate(G,s.slots[i]).nm:'Empty'}`]),slot)}${btn('Remove from place','id="sandbox-remove"')}${select('Swap with place','sandbox-other',places.map((p,i)=>[i,`${p} · ${s.slots[i]?hydrate(G,s.slots[i]).nm:'Empty'}`]),other)}${btn('Swap places','id="sandbox-swap"')}</div>
      ${sandboxResult?seasonView(sandboxResult):''}<h2>Find a card for your squad</h2>${database(false,true)}`;
  }
  let slot=0, other=1;
  function seasonView(R) {
    const t=R.L.tab.find(t=>t.me);
    return `<section class="club-result"><h2>Sandbox season · ${t.W}W ${t.D}D ${t.L}L</h2><p>${R.honours.join(' · ')||'Season complete'} · European Cup: ${esc(R.K.champN)}</p><div class="tw"><table><thead><tr><th>#</th><th>Club</th><th>Pts</th><th>W–D–L</th><th>Goals</th></tr></thead><tbody>${R.L.tab.map((t,i)=>`<tr class="${t.me?'your-row':''}"><td>${i+1}</td><td>${esc(t.nm)}</td><td>${t.Pts}</td><td>${t.W}–${t.D}–${t.L}</td><td>${t.GF}–${t.GA}</td></tr>`).join('')}</tbody></table></div><details><summary>Your fixtures</summary>${R.L.res.map(m=>`<p>${m.h?'Home':'Away'} · ${esc(m.op)} · ${m.gf}–${m.ga}</p>`).join('')}</details></section>`;
  }

  function statistics() {
    if(mode==='Mini-games')return `${modeSelect()}<div class="club-grid">${Object.entries(KINDS).map(([k,nm])=>{const Q=Object.values(P.sessions).filter(s=>s.kind===k&&s.done),daily=Q.filter(s=>s.seed==='daily'),st=streak(P.sessions,k);return `<article class="stat-card"><h2>${nm}</h2><p>${daily.length} daily puzzles · ${st.wins} wins</p><p>Streak ${st.current} · best ${st.best}</p><p>${Q.length-daily.length} practice games · best score ${Math.max(0,...Q.map(s=>s.score))}</p></article>`;}).join('')}</div>`;
    const t=totals(P,mode,recordEra), fav=new Map();
    for(const e of P.events.filter(e=>e.kind==='draft'&&(!mode||e.mode===mode)&&(!recordEra||e.D===Number(recordEra)))) for(const c of e.slots)fav.set(c.p,(fav.get(c.p)||0)+1);
    return `${modeSelect()}<div class="club-metrics">${metric(t.drafts,'Distinct drafts')}${metric(t.seasons,'League seasons')}${metric(`${t.w}–${t.d}–${t.l}`,'W–D–L')}${metric(`${t.gf}–${t.ga}`,'Goals for–against')}${metric(t.titles,'Trophies')}${metric(t.w+t.d+t.l?`${Math.round(100*t.w/(t.w+t.d+t.l))}%`:'—','Win rate')}</div>
      <p class="small">Completed league seasons, circuit matches and head-to-head ties are counted once. Gauntlet boss wins count as ties; their goal totals are not included. Identical seeded drafts and replays share one identity.</p>
      <h2>Most drafted players</h2>${[...fav].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([p,n])=>`<p>${esc(G.people[p].nm)} · ${n} drafts</p>`).join('')||'<p class="empty">Kick off your first draft to begin your history.</p>'}`;
  }
  const modeSelect = () => `<div class="club-filters">${select('Mode','profile-mode',[['','All modes'],...['Classic','Salary cap','Weekly','Gauntlet','Circuit','Head to head','Mini-games'].map(m=>[m,m])],mode)}${mode==='Mini-games'?'':select('Simulation decade','profile-era',[['','All decades'],...DECADES.map(d=>[d,`${d}s`])],recordEra)}</div>`;
  function records() {
    if(mode==='Mini-games')return `${modeSelect()}<div class="tw"><table><thead><tr><th>Puzzle</th><th>Date</th><th>Mode</th><th>Result</th><th>Score</th></tr></thead><tbody>${Object.values(P.sessions).filter(s=>s.done).sort((a,b)=>b.date.localeCompare(a.date)||b.score-a.score).slice(0,200).map(s=>`<tr><td>${KINDS[s.kind]}</td><td>${s.date}</td><td>${s.seed==='daily'?'Daily':'Practice'}</td><td>${s.won?'Won':'Complete'}</td><td>${s.score}</td></tr>`).join('')}</tbody></table></div>`;
    const Q=P.events.filter(e=>e.kind!=='draft'&&e.kind!=='sbc'&&(!mode||mode===e.mode)&&(!recordEra||e.D===Number(recordEra))).sort((a,b)=>b.titles-a.titles||a.position-b.position||b.score-a.score);
    return `${top('Your completed results on this browser. Filter by mode to compare like with like.')}${modeSelect()}<div class="tw"><table><thead><tr><th>Mode</th><th>Era / season</th><th>Finish</th><th>W–D–L</th><th>Trophies</th><th>Seed</th></tr></thead><tbody>${Q.slice(0,200).map(e=>`<tr><td>${esc(e.mode)} · ${e.kind}</td><td>${e.year?`${e.year}/${String(e.year+1).slice(-2)}`:`${e.D}s`}${e.week?` · ${esc(e.week)}`:''}</td><td>${e.position||'—'}</td><td>${e.w}–${e.d}–${e.l}</td><td>${e.titles}</td><td>${e.seed}</td></tr>`).join('')}</tbody></table></div>${Q.length?'':'<p class="empty">Your completed games will appear here.</p>'}<h2>Sandbox records</h2><p class="small">Free squad experiments are stored separately below.</p>${(P.sandboxRecords||[]).map(r=>`<p>${r.D}s · ${esc(r.f)} · seed ${r.seed} · ${r.position} / 20 · ${r.w}W ${r.d}D ${r.l}L · ${r.titles} trophies</p>`).join('')||'<p class="small">No sandbox seasons yet.</p>'}`;
  }
  function achievementView() {
    const Q=achievements(P);
    return `${top(`${Q.filter(a=>a.unlocked).length} / ${Q.length} achievements unlocked. Progress comes from your recorded games.`)}<div class="club-grid">${Q.map(a=>`<article class="stat-card ${a.unlocked?'club-earned':''}"><p class="lbl">${a.unlocked?'Unlocked':'In progress'}</p><h2>${a.nm}</h2><p class="small">${a.tx}</p><progress max="${a.target}" value="${Math.min(a.n,a.target)}" aria-label="${esc(a.nm)} progress"></progress><p class="small">${Math.min(a.n,a.target)} / ${a.target}</p></article>`).join('')}</div>`;
  }

  function minis() {
    const s=current();
    if(s)return miniView(s);
    return `${top('Four football puzzles. Daily puzzles reset at midnight on your device; unlimited practice is separate. Answers use this archive, which can omit real club spells.')}<div class="row wrap">${btn('Daily',`data-mini-mode="daily" aria-pressed="${daily}"`)}${btn('Unlimited practice',`data-mini-mode="practice" aria-pressed="${!daily}"`)}</div><div class="club-grid">${Object.entries(KINDS).map(([k,nm])=>{
      const st=streak(P.sessions,k), s=P.sessions[dailyKey(k)];
      return `<article class="challenge-card"><p class="lbl">${daily?'Today’s puzzle':'Unlimited practice'}</p><h2>${nm}</h2><p>${{card:'Find the exact player, club and decade in fifteen guesses. Clues follow each guess.',higher:'Choose the higher overall card rating. Fifteen rounds, one life. Ties count as correct.',roster:'Name five or more players from a historical club squad in two minutes. Lower tiers earn more points.',career:'Five footballers. Select every club represented in their archive cards; win at least three rounds.'}[k]}</p><p class="small">Daily streak ${st.current} · best ${st.best} · ${st.wins} wins</p>${btn(daily&&s?(s.done?'View result':'Resume'):'Play',`data-mini-start="${k}"`,false)}</article>`;
    }).join('')}</div>`;
  }

  function miniView(s) {
    let content='';
    if(s.kind==='card') {
      const target=cardAt(A,s.target);
      content=`<p>${s.guesses.length} / 15 guesses</p>${s.guesses.length?`<div class="tw"><table><thead><tr><th>Guess</th>${['Club','Country','Decade','Position','Tier'].map(n=>`<th>${n}</th>`).join('')}</tr></thead><tbody>${s.guesses.map(id=>{const c=by.get(id);return `<tr><td>${esc(c.nm)}</td>${clues(c,target,G).map(([,text,yes])=>`<td class="${yes?'clue-yes':'clue-no'}">${yes?'✓ ':'○ '}${esc(text)}</td>`).join('')}</tr>`;}).join('')}</tbody></table></div>`:''}`;
      if(!s.done)content+=`<label class="field"><span class="lbl">Find a card to guess</span><input id="mini-query" value="${esc(miniQuery)}" autocomplete="off" placeholder="Type a player or club"></label>${miniQuery.length>=2?cardRows(search(A,{q:miniQuery}).slice(0,12),'guess'):'<p class="small">Enter at least two characters.</p>'}`;
      else content+=`<h3>Answer: ${esc(cardLabel(target))}</h3>`;
    } else if(s.kind==='higher') {
      if(!s.done)content=`<p>Round ${s.guesses.length+1} / 15 · choose the higher base overall rating. Ratings are game assessments; estimated cards are labelled.</p><div class="club-grid">${s.pairs[s.guesses.length].map((id,i)=>{const c=by.get(id);return `<article class="challenge-card"><h3>${esc(c.nm)}</h3><p>${esc(G.clubs[c.q].nm)} · ${c.D}s · ${c.pos.join('/')}</p><p class="small">${esc(SRC[c.s])}</p>${btn('Higher or equal',`data-higher="${i}"`,false)}</article>`;}).join('')}</div>`;
      const prev=s.pairs[s.guesses.length-1];if(prev)content+=`<p>Previous pair: ${prev.map(id=>{const c=by.get(id);return `${esc(c.nm)} ${number(c.r)}`;}).join(' · ')}</p>`;
    } else if(s.kind==='roster') {
      const [q,d]=s.club.split(':');
      content=`<h3>${esc(G.clubs[q].nm)} · ${d}s</h3><p>Full names; accents and punctuation do not matter. This is a decade archive squad, not one season’s roster.</p><p><b id="recall-clock">${Math.max(0,Math.ceil((s.deadline-Date.now())/1000))}</b> seconds · ${s.guesses.length} players · ${s.score} points</p>${!s.done?`<form id="recall-form" class="row wrap"><label class="field"><span class="lbl">Player name</span><input id="recall-name" autocomplete="off" required></label><button class="btn sm" type="submit">Submit name</button>${btn('Finish now','id="recall-finish"')}</form>`:''}<p>${s.guesses.map(p=>esc(G.people[p].nm)).join(' · ')}</p>${s.done?`<details><summary>Archive squad</summary><p>${G.cards[s.club].map(c=>esc(G.people[c.p].nm)).join(' · ')}</p></details>`:''}`;
    } else if(!s.done) {
      const r=s.rounds[s.guesses.length];
      content=`<p>Round ${s.guesses.length+1} / ${s.rounds.length}</p><h3>${esc(G.people[r.p].nm)}</h3><p>Select all clubs represented in this player’s archive cards. This is not a claim about their complete real career.</p><div class="club-grid">${r.choices.map(q=>`<label class="club-choice"><input type="checkbox" data-trail="${q}" ${chosen.has(q)?'checked':''}>${esc(G.clubs[q].nm)}</label>`).join('')}</div>${btn('Submit clubs','id="trail-submit"',false)}`;
    }
    if(s.kind==='career'&&s.guesses.length) {const r=s.rounds[s.guesses.length-1];content+=`<p>Previous answer: ${esc(G.people[r.p].nm)} · ${r.clubs.map(q=>esc(G.clubs[q].nm)).join(' · ')}</p>`;}
    return `<div class="row wrap">${btn('All mini-games','id="minis-back"')}<p class="lbl">${s.seed==='daily'?`Daily · ${s.date}`:'Practice'}</p></div><h2>${KINDS[s.kind]}</h2>${s.done?`<div class="club-result" role="status"><h3>${s.won?'Puzzle won':'Puzzle complete'} · ${s.score} points</h3><p>${s.seed==='daily'?'Your result is saved. A new puzzle arrives tomorrow.':'Practice does not change your daily streak.'}</p>${s.seed!=='daily'?btn('Play again',`data-mini-start="${s.kind}"`):''}</div>`:''}${feedback?`<p class="club-feedback" role="status">${esc(feedback)}</p>`:''}${content}`;
  }
  let miniQuery='';

  function weeklyView() {
    const Q=Array.from({length:13},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-7*i);return wk(d);});
    return `${top('The same seed, decade and Salary cap rules for every player. Earlier weeks remain available for personal replay. Starting one replaces your current draft only after confirmation.')}<div class="club-grid">${Q.map((w,i)=>`<article class="challenge-card"><p class="lbl">${i?'Archive':'This week'}</p><h2>${w.id} · ${w.D}s</h2><p>Seed ${w.seed}</p>${btn('Play challenge',`data-week="${i}"`,false)}</article>`).join('')}</div>`;
  }
  function settings() {
    const o=P.settings;
    return `${top('Preferences and progress are saved on this browser. Export a profile to move them to another device.')}<div class="club-filters">${select('Appearance','setting-theme',[['dark','Night match'],['light','Day match']],o.theme)}${select('Backdrop','setting-backdrop',[['floodlights','Floodlights'],['pitch','Pitch lines'],['plain','Plain / battery saver']],o.backdrop)}${select('Default draft sort','setting-sort',[['fit','Best fit'],['rating','Rating'],['name','Name'],['apps','Appearances']],o.sort)}
      <label class="club-choice"><input id="setting-effects" type="checkbox" ${o.effects?'checked':''}>Era tint and animations</label><label class="club-choice"><input id="setting-compact" type="checkbox" ${o.compact?'checked':''}>Compact squad lists</label></div><p class="small">Your device’s reduced-motion preference is always respected.</p>
      <h2>Stadium ambience</h2><label class="field"><span class="lbl">Volume · ${o.volume}%</span><input id="setting-volume" type="range" min="0" max="100" step="1" value="${o.volume}" aria-label="Stadium ambience volume"></label><div class="row wrap">${btn('Play ambience','id="ambience-play"')}${btn('Mute','id="ambience-mute"')}</div>
      <h2>Profile backup</h2><p class="small">Includes statistics, achievements, card collection progress, daily puzzles, settings and sandbox. The active career keeps its existing Download replay control.</p><div class="row wrap">${btn('Export profile','id="profile-export"')}<label class="btn q sm">Import profile<input id="profile-import" type="file" accept=".json,application/json" class="sr-only"></label>${btn('Export stored profile unchanged','id="profile-raw"')}${btn('Reset profile','id="profile-reset"')}</div><p class="small">Import replaces this browser’s profile after validation. Reset removes this profile; your separate draft and career save remains available.</p>`;
  }

  function paint() {
    const active=document.activeElement, id=dialog.contains(active)?active.id:null, start=active?.selectionStart, scroll=dialog.scrollTop;
    dialog.innerHTML=`<header class="club-heading"><div><p class="eyebrow">Football Era Draft</p><h1 id="clubhouse-title">${pages[page]}</h1></div>${btn('Return to game','id="clubhouse-close"')}</header><nav class="club-nav" aria-label="Clubhouse sections">${Object.entries(pages).map(([k,n])=>btn(n,`data-club-page="${k}" aria-current="${page===k?'page':'false'}"`)).join('')}</nav>${loadError?`<p role="alert" class="warn">${esc(loadError)}</p>`:''}<section class="club-content">${({home,sandbox,database,sbc:squadChallenges,stats:statistics,records,achievements:achievementView,collection:()=>`${top(`${collection(P).size} exact club-era cards unlocked. Win a trophy in a completed career season with a card in your squad, or complete a Squad challenge, to collect it.`)}${database(true)}`,minis,weekly:weeklyView,settings}[page])()}</section>`;
    if(id) {const el=document.getElementById(id);el?.focus({preventScroll:true});if(typeof start==='number'&&el?.setSelectionRange&&el.type!=='number')el.setSelectionRange(start,start);}
    dialog.scrollTop=scroll;
  }
  function open(next='home') { page=Object.hasOwn(pages,next)?next:'home';feedback='';paint();if(!dialog.open)dialog.showModal(); }
  function updateMini(value) {
    const s=current(), next=answer(G,A,s,value);P={...P,sessions:{...P.sessions,[mini]:next}};chosen.clear();feedback='';miniQuery='';save();paint();
  }
  function download(value,name) {
    const url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:'application/json'})), a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function changeSandbox(s) {P={...P,sandbox:s};sandboxResult=null;save();paint();}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-club-open]');if(b&&U.G)open(b.dataset.clubOpen);});
  dialog.addEventListener('submit',e=>{
    e.preventDefault();if(e.target.id==='recall-form')try{updateMini(document.getElementById('recall-name').value);document.getElementById('recall-name')?.focus();}catch(x){feedback=x.message;paint();}
  });
  dialog.addEventListener('input',e=>{
    if(e.target.id==='archive-query'){query.q=e.target.value;offset=0;paint();}
    if(e.target.id==='mini-query'){miniQuery=e.target.value;paint();}
  });
  dialog.addEventListener('change',async e=>{
    const t=e.target;
    try {
      if(t.id.startsWith('archive-')&&t.id!=='archive-query'){query[t.id.slice(8)]=t.value;offset=0;paint();}
      if(t.id==='profile-mode'){mode=t.value;paint();}
      if(t.id==='profile-era'){recordEra=t.value;paint();}
      if(t.id==='collection-state'){collectionState=t.value;offset=0;paint();}
      if(t.id==='sandbox-slot')slot=Number(t.value);
      if(t.id==='sandbox-other')other=Number(t.value);
      if(t.id==='sandbox-D')changeSandbox({...sbox(),D:Number(t.value)});
      if(t.id==='sandbox-m')changeSandbox({...sbox(),m:t.value});
      if(t.id==='sandbox-f')changeSandbox(freeForm(G,sbox(),t.value));
      if(t.id==='sandbox-seed'){const n=Number(t.value);if(!/^\d{1,10}$/.test(t.value)||!Number.isInteger(n)||n<0||n>4294967295)throw new Error('Use a whole seed from 0 to 4294967295.');changeSandbox({...sbox(),seed:n});}
      if(t.dataset.trail){if(t.checked)chosen.add(t.dataset.trail);else chosen.delete(t.dataset.trail);}
      if(t.id.startsWith('setting-')){P={...P,settings:{...P.settings,[t.id.slice(8)]:t.type==='checkbox'?t.checked:t.type==='range'?Number(t.value):t.value}};applySettings();if(t.id==='setting-volume')await sound(P.settings.volume);save();}
      if(t.id==='profile-import'||t.id==='sandbox-import') {
        const f=t.files[0];if(!f)return;if(f.size>16000000)throw new Error('Choose a profile smaller than 16 MB.');const raw=JSON.parse(await f.text());
        if(t.id==='profile-import'){const next=validateProfile(G,A,raw.profile);P=next;loadError='';applySettings();await sound(0);save();paint();notice('Profile imported.');}
        else {const next=validateProfile(G,A,{...emptyProfile(),sandbox:raw.sandbox});changeSandbox(next.sandbox);notice('Sandbox squad imported.');}
      }
    }catch(x){notice(x.message,true);}
  });
  dialog.addEventListener('click',async e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;
    try {
      if(b.id==='clubhouse-close')dialog.close();
      else if(b.dataset.clubPage){page=b.dataset.clubPage;detail=null;feedback='';paint();dialog.scrollTop=0;}
      else if(b.id==='archive-clear'){query={q:'',D:'',club:'',pos:'',tier:'',tag:''};offset=0;paint();}
      else if(b.id==='archive-prev'){offset=Math.max(0,offset-24);paint();}
      else if(b.id==='archive-next'){offset+=24;paint();}
      else if(b.dataset.archiveInspect){detail=b.dataset.archiveInspect;paint();dialog.querySelector('.club-detail')?.scrollIntoView({block:'nearest'});}
      else if(b.dataset.person){query={q:G.people[b.dataset.person].nm};offset=0;detail=null;paint();}
      else if(b.dataset.pin){const id=b.dataset.pin;pins=pins.includes(id)?pins.filter(x=>x!==id):[...pins,id].slice(-3);paint();}
      else if(b.dataset.archivePick){changeSandbox(freePlace(G,sbox(),by.get(b.dataset.archivePick),slot));slot=sbox().slots.findIndex(c=>!c);if(slot<0)slot=0;paint();}
      else if(b.dataset.sbcBuild){sbcId=b.dataset.sbcBuild;page='sandbox';sandboxResult=null;paint();dialog.scrollTop=0;}
      else if(b.id==='sbc-leave'){sbcId=null;paint();}
      else if(b.id==='sbc-submit'){const c=challenges().find(c=>c.id===sbcId);if(!c||!Sbc.met(G,sbox(),c))throw new Error('The squad does not meet every requirement.');const ref=Sbc.reward(G,A,c);P=completeSbc(P,c,sbox(),ref);save();sbcId=null;page='sbc';paint();notice(`${c.nm} complete. ${cardLabel(by.get(refid(ref)))} joins your collection.`);}
      else if(b.id==='sandbox-fill')changeSandbox(freeFill(G,A,sbox(),sbox().seed));
      else if(b.id==='ambience-play'){P={...P,settings:{...P.settings,volume:P.settings.volume||20}};await sound(P.settings.volume);save();paint();}
      else if(b.id==='ambience-mute'){P={...P,settings:{...P.settings,volume:0}};await sound(0);save();paint();}
      else if(b.id==='sandbox-clear')changeSandbox({...sbox(),slots:Array(15).fill(null)});
      else if(b.id==='sandbox-remove'){const s=sbox(),slots=s.slots.slice();slots[slot]=null;changeSandbox({...s,slots});}
      else if(b.id==='sandbox-swap'){const s=sbox(),slots=s.slots.slice();[slots[slot],slots[other]]=[slots[other],slots[slot]];changeSandbox({...s,slots});}
      else if(b.id==='sandbox-play'){
        const s=sbox(),T=freeTeam(G,s),me={id:'sandbox',nm:'Your Sandbox XI',T,x:freeRating(G,s).ovr};
        b.disabled=true;b.textContent='Playing…';await new Promise(r=>setTimeout(r,30));
        sandboxResult=E.run(E.hs(`${s.seed}:sandbox-season`),me,U.F[s.D].slice(0,19),U.F[s.D].slice(0,15),s.D);
        const row=sandboxResult.L.tab.find(t=>t.me),id=JSON.stringify(s),item={id,D:s.D,f:s.f,seed:s.seed,position:sandboxResult.L.tab.indexOf(row)+1,w:row.W,d:row.D,l:row.L,titles:Number(sandboxResult.L.tab[0].me)+Number(sandboxResult.K.champ==='sandbox')};
        P={...P,sandboxRecords:[...(P.sandboxRecords||[]).filter(r=>r.id!==id),item].slice(-100)};save();paint();
      }
      else if(b.id==='sandbox-export')download({game:'Football Era Draft',sandbox:sbox()},'Football Era Draft Sandbox.json');
      else if(b.id==='sandbox-code'){const s=sbox();await navigator.clipboard.writeText(code(G,{phase:'review',cap:false,D:s.D,manager:{nm:s.m},f:s.f,slots:s.slots}));notice('Classic team code copied for head to head.');}
      else if(b.dataset.miniMode){daily=b.dataset.miniMode==='daily';mini=null;paint();}
      else if(b.dataset.miniStart){const kind=b.dataset.miniStart,seed=daily?'daily':String(random()),key=dailyKey(kind,seed);if(!P.sessions[key])P={...P,sessions:{...P.sessions,[key]:puzzle(G,A,kind,day(),seed)}};mini=key;chosen.clear();feedback='';save();paint();}
      else if(b.id==='minis-back'){mini=null;feedback='';paint();}
      else if(b.dataset.archiveGuess)updateMini(b.dataset.archiveGuess);
      else if(b.dataset.higher!==undefined)updateMini(Number(b.dataset.higher));
      else if(b.id==='recall-finish')updateMini(null);
      else if(b.id==='trail-submit')updateMini([...chosen]);
      else if(b.dataset.week!==undefined){const d=new Date();d.setUTCDate(d.getUTCDate()-7*Number(b.dataset.week));if(U.S&&!confirm('Start this weekly challenge and replace your current draft?'))return;weekly(wk(d));dialog.close();}
      else if(b.id==='profile-export')download({game:'Football Era Draft',profile:P},'Football Era Draft Profile.json');
      else if(b.id==='profile-raw')download(localStorage.getItem(PROFILE)||JSON.stringify(P),'Football Era Draft Stored Profile.json');
      else if(b.id==='profile-reset'&&confirm('Reset personal records, collection, puzzles, settings and sandbox? Your active draft and career are kept.')){const ignored=[...P.ignored,...P.events.map(e=>e.id)];P={...emptyProfile(),ignored};mini=null;loadError='';applySettings();await sound(0);save();paint();}
    }catch(x){feedback=x.message;notice(x.message,true);if(page==='minis')paint();}
  });
  setInterval(()=>{
    const s=current();if(!dialog.open||page!=='minis'||s?.kind!=='roster'||s.done)return;
    const clock=document.getElementById('recall-clock');if(clock)clock.textContent=Math.max(0,Math.ceil((s.deadline-Date.now())/1000));
    if(Date.now()>=s.deadline)updateMini(null);
  },1000);
  return {
    open,
    track(){const next=record(P,G,U.S,U.R,U.C,U.H);if(next!==P){P=next;save();}},
  };
}
