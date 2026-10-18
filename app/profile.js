// Personal progress is a set of completed event identities. Reloads and identical replays add nothing.
import { validateFree, refid } from './archive.js';
import { validatePuzzle, KINDS, streak } from './minis.js';
import { hydrate } from './draft.js';
import { hs } from './engine/rng.js';

export const PROFILE = 'football-era-draft-profile-v1';
export const defaults = () => ({ theme:'dark', effects:true, compact:false, backdrop:'floodlights', sort:'fit', volume:0 });
export const emptyProfile = () => ({ v:1, events:[], ignored:[], sessions:{}, settings:defaults(), sandbox:null, sandboxRecords:[] });
export const draftId = s => `${s.seed}:${s.D}:${s.cap?'cap':'classic'}:${s.wk || ''}:${s.manager?.nm}:${s.f}:${s.slots.map(c=>c?refid(c):'-').join(',')}`;
const refs = slots => slots.filter(Boolean).map(c => ({k:c.k,p:c.p}));

export function record(P, G, S, R = null, C = null, H = null) {
  if (!S || S.phase !== 'results') return P;
  const id = draftId(S), mode = S.wk ? 'Weekly' : S.cap ? 'Salary cap' : 'Classic';
  const base = { D:S.D, mode, seed:S.seed, week:S.wk || '', slots:refs(S.slots), manager:S.manager.nm };
  const Q = [{ ...base, id:`${id}:draft`, kind:'draft', w:0,d:0,l:0,gf:0,ga:0,titles:0,position:0,score:0 }];
  const career = S.mode?.career;
  if (career) for (const h of career.history) Q.push({ ...base, id:`${id}:season:${h.s}`, kind:'season', year:h.s,
    slots: h.s === career.S.s ? refs(career.slots) : [], position:h.pos, w:h.w,d:h.d,l:h.l,gf:h.gf,ga:h.ga,titles:h.trophies.length,
    score:h.pts, league:h.pos === 1, clean:h.l === 0 });
  else if (R) {
    const t = R.L.tab.find(t=>t.me), position = R.L.tab.indexOf(t)+1;
    Q.push({...base,id:`${id}:legacy`,kind:'season',position,w:t.W,d:t.D,l:t.L,gf:t.GF,ga:t.GA,score:t.Pts,titles:Number(position===1)+Number(R.K.champ==='your-club'),league:position===1,clean:t.L===0});
  }
  const run = S.mode?.run;
  if (run) {
    for (const [i,e] of run.log.entries()) if (e.t === 'boss') Q.push({...base,id:`${id}:gauntlet:${run.map}:${i}`,kind:'boss',mode:'Gauntlet',D:e.D,w:Number(e.won),d:0,l:Number(!e.won),gf:0,ga:0,titles:0,position:0,score:Number(e.won),map:run.map});
    if (run.ph === 'done') Q.push({...base,id:`${id}:map:${run.map}`,kind:'map',mode:'Gauntlet',map:run.map,w:0,d:0,l:0,gf:0,ga:0,titles:0,position:0,score:run.pat});
  }
  if (C) { const t=C.totals; Q.push({...base,id:`${id}:circuit:${C.events.length}`,kind:'circuit',mode:'Circuit',w:t.won,d:t.drawn,l:t.lost,gf:t.gf,ga:t.ga,titles:t.titles,position:0,score:t.titles}); }
  if (H) Q.push({...base,id:`${id}:h2h:${hs(JSON.stringify(H))}`,kind:'tie',mode:'Head to head',w:Number(H.w==='your-club'),d:0,l:Number(H.w!=='your-club'),gf:H.agg[0],ga:H.agg[1],titles:0,position:0,score:Number(H.w==='your-club')});
  const seen = new Set([...P.events.map(e=>e.id),...P.ignored]), added = Q.filter(e=>!seen.has(e.id));
  return added.length ? {...P,events:[...P.events,...added]} : P;
}

// A completed Squad Building Challenge: identity sbc:<id>, its reward card the only slot.
export function completeSbc(P, ch, s, ref) {
  const id = `sbc:${ch.id}`;
  if (P.events.some(e => e.id === id)) return P;
  return { ...P, events: [...P.events, { id, kind:'sbc', mode:'SBC', D:s.D, seed:0, week:ch.wk || '', slots:[ref], manager:s.m, w:0,d:0,l:0,gf:0,ga:0,titles:0,position:0,score:0 }] };
}

export function totals(P, mode = '', D = '') {
  const include=e=>(!mode||e.mode===mode)&&(!D||e.D===Number(D));
  const Q = P.events.filter(e=>!['draft','map','sbc'].includes(e.kind) && include(e));
  const t = { seasons:Q.filter(e=>e.kind==='season').length, drafts:P.events.filter(e=>e.kind==='draft'&&include(e)).length,w:0,d:0,l:0,gf:0,ga:0,titles:0 };
  for (const e of Q) for (const k of ['w','d','l','gf','ga','titles']) t[k]+=e[k];
  return t;
}

export function collection(P) {
  return new Set(P.events.filter(e=>(e.kind==='season'&&e.titles>0)||e.kind==='sbc').flatMap(e=>e.slots.map(refid)));
}

export function achievements(P) {
  const t=totals(P), Q=P.events.filter(e=>e.kind==='season'), maps=new Set(P.events.filter(e=>e.kind==='map').map(e=>e.map));
  const rows = [ ['first','First whistle','Complete a draft and kick off.',t.drafts,1], ['ten','In the dugout','Complete ten distinct drafts.',t.drafts,10],
    ['season','Full time','Complete a league season.',t.seasons,1],['trophy','Silverware','Win a trophy.',t.titles,1],['cabinet','Trophy cabinet','Win ten trophies.',t.titles,10],
    ['century','Century','Score 100 goals in recorded matches.',t.gf,100],['invincible','Invincibles','Finish a league season without losing.',Q.filter(e=>e.clean).length,1],
    ['double','Double winners','Win at least two trophies in one season.',Q.filter(e=>e.titles>=2).length,1],
    ['caps','Cap champions','Win a league under Salary cap.',Q.filter(e=>e.mode==='Salary cap'&&e.league).length,1],
    ['weekly','Weekly winner','Win a trophy in a weekly challenge.',Q.filter(e=>e.mode==='Weekly'&&e.titles).length,1],
    ['eras','Across the eras','Win a league in all eight simulation decades.',new Set(Q.filter(e=>e.league).map(e=>e.D)).size,8],
    ['gauntlet','Boss breaker','Win a Gauntlet boss tie.',P.events.filter(e=>e.kind==='boss'&&e.w).length,1],
    ['maps','The long road','Complete all four Gauntlet maps.',maps.size,4],
    ['collector','Collector','Unlock ten exact club-era cards.',collection(P).size,10],
    ['sbc','Squad builder','Complete a Squad Building Challenge.',P.events.filter(e=>e.kind==='sbc').length,1],
    ['sbc-core','Master builder','Complete all eight permanent Squad Building Challenges.',P.events.filter(e=>e.kind==='sbc'&&!e.week).length,8] ];
  for (const [k,nm] of Object.entries(KINDS)) {
    const st=streak(P.sessions,k);
    rows.push([`mini-${k}`,nm,`Win ${nm} in daily mode.`,st.wins,1],[`streak-${k}`,`${nm}: five days`,'Win on five consecutive local calendar days.',st.best,5]);
  }
  const dates = new Map();
  for(const s of Object.values(P.sessions)) if(s.done&&s.won&&s.seed==='daily') {if(!dates.has(s.date))dates.set(s.date,new Set());dates.get(s.date).add(s.kind);}
  rows.push(['all-minis','A complete player','Win all four daily mini-games on the same date.',Math.max(0,...[...dates.values()].map(x=>x.size)),4]);
  return rows.map(([id,nm,tx,n,target])=>({id,nm,tx,n,target,unlocked:n>=target}));
}

export function validateProfile(G, A, raw) {
  if (!raw || raw.v!==1 || !Array.isArray(raw.events) || raw.events.length>20000 || !raw.sessions || typeof raw.sessions!=='object' || Array.isArray(raw.sessions) || Object.keys(raw.sessions).length>5000) throw new Error('Choose a valid Football Era Draft profile.');
  const events=raw.events.map(e=>{
    if(!e || typeof e.id!=='string' || e.id.length>50000 || !['draft','season','boss','map','circuit','tie','sbc'].includes(e.kind) ||
      !['Classic','Salary cap','Weekly','Gauntlet','Circuit','Head to head','SBC'].includes(e.mode) || ![1950,1960,1970,1980,1990,2000,2010,2020].includes(e.D) ||
      !['w','d','l','gf','ga','titles','position','score','seed'].every(k=>Number.isSafeInteger(e[k])&&e[k]>=0&&e[k]<=4294967295) ||
      !Array.isArray(e.slots)||e.slots.length>15 || new Set(e.slots.map(c=>c.p)).size!==e.slots.length ||
      typeof e.manager!=='string' || (e.year!==undefined&&(!Number.isInteger(e.year)||e.year<1950||e.year>2029)) ||
      (e.league!==undefined&&typeof e.league!=='boolean') || (e.clean!==undefined&&typeof e.clean!=='boolean') ||
      (e.week && !/^\d{4}-W\d{2}$/.test(e.week)) || (e.map && !['original','back','odyssey','reverse'].includes(e.map))) throw new Error('The profile has an invalid result.');
    e.slots.forEach(c=>hydrate(G,c));
    return {...e,slots:refs(e.slots)};
  });
  if(new Set(events.map(e=>e.id)).size!==events.length)throw new Error('The profile repeats a completed result.');
  const ignored=raw.ignored||[];
  if(!Array.isArray(ignored)||ignored.length>20000||ignored.some(id=>typeof id!=='string'||id.length>50000))throw new Error('The profile reset history is invalid.');
  const sessions={};
  for(const [k,s] of Object.entries(raw.sessions)) {
    const x=validatePuzzle(G,A,s);
    if(k!==`${x.date}:${x.kind}:${x.seed}`)throw new Error('The puzzle identity is invalid.');
    sessions[k]=x;
  }
  const d=defaults(), o=raw.settings || {};
  if(!['dark','light'].includes(o.theme)||!['floodlights','pitch','plain'].includes(o.backdrop)||!['fit','rating','name','apps'].includes(o.sort)||typeof o.effects!=='boolean'||typeof o.compact!=='boolean')throw new Error('The profile settings are invalid.');
  const volume=o.volume??0;
  if(!Number.isInteger(volume)||volume<0||volume>100)throw new Error('The ambience volume is invalid.');
  const sandboxRecords=(raw.sandboxRecords||[]).map(r=>{
    if(typeof r.id!=='string'||r.id.length>10000||!Object.hasOwn(G.formations,r.f)||![1950,1960,1970,1980,1990,2000,2010,2020].includes(r.D)||!['seed','position','w','d','l','titles'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0&&r[k]<=4294967295))throw new Error('A sandbox record is invalid.');
    return {id:r.id,f:r.f,D:r.D,seed:r.seed,position:r.position,w:r.w,d:r.d,l:r.l,titles:r.titles};
  }).slice(-100);
  return {v:1,events,ignored,sessions,settings:{...d,theme:o.theme,backdrop:o.backdrop,sort:o.sort,effects:o.effects,compact:o.compact,volume},sandbox:raw.sandbox?validateFree(G,raw.sandbox):null,sandboxRecords};
}
