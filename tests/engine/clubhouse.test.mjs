import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { archive, search, norm, refid, freeSquad, freeFill, freePlace, freeForm, validateFree, freeTeam } from '../../app/archive.js';
import { puzzle, answer, validatePuzzle, streak, day, previous, clues, cardAt } from '../../app/minis.js';
import { emptyProfile, record, totals, collection, achievements, validateProfile } from '../../app/profile.js';

const G=JSON.parse(readFileSync(new URL('../../data/game.json',import.meta.url))), A=archive(G);
const date='2026-10-18', time=1000000;

test('archive filters preserve exact club-era identity and expose every source card',()=>{
  assert.equal(A.length,Object.values(G.cards).reduce((n,Q)=>n+Q.length,0));
  const c=A.find(c=>c.nm.includes('Messi'));
  assert.ok(c);
  const Q=search(A,{q:'messi',D:c.D,club:c.q,pos:c.pos[0]});
  assert.ok(Q.some(x=>refid(x)===refid(c)));
  assert.ok(Q.every(x=>x.D===c.D&&x.q===c.q&&x.pos.includes(c.pos[0])));
  assert.equal(norm('Ángel Di-María'),'angel di maria');
});

test('sandbox fills natural positions with distinct people and preserves cards through formation changes',()=>{
  const s=freeFill(G,A,freeSquad(G),42), T=freeTeam(G,s);
  assert.equal(new Set(s.slots.map(c=>c.p)).size,15);
  T.xi.forEach((c,i)=>assert.ok(c.pos.includes(T.S[i].s)));
  assert.deepEqual(freeFill(G,A,freeSquad(G),42),s);
  const next=freeForm(G,s,'4-4-2');
  assert.deepEqual(next.slots.map(refid).sort(),s.slots.map(refid).sort());
  assert.deepEqual(next.slots.slice(11),s.slots.slice(11));
  assert.throws(()=>freePlace(G,s,s.slots[0],1),/already/);
  assert.throws(()=>validateFree(G,{...s,slots:s.slots.slice(1)}),/invalid/);
  assert.deepEqual(validateFree(G,next),next);
});

test('daily card puzzles resume from guesses and ignore forged outcome fields',()=>{
  const s=puzzle(G,A,'card',date,'daily',time), c=cardAt(A,s.target);
  assert.deepEqual(puzzle(G,A,'card',date,'daily',time),s);
  const won=answer(G,A,s,s.target,time);
  assert.ok(won.done&&won.won); assert.equal(won.score,15);
  assert.deepEqual(validatePuzzle(G,A,{...won,won:false,score:9999,target:'forged'}),won);
  assert.deepEqual(answer(G,A,won,A[0]),won);
  assert.ok(clues(c,c,G).every(([, ,yes])=>yes));
  const wrong=refid(A.find(x=>refid(x)!==s.target));
  assert.throws(()=>answer(G,A,answer(G,A,s,wrong,time),wrong,time),/already/);
  assert.throws(()=>validatePuzzle(G,A,{...won,guesses:[s.target,wrong]}),/after it ended/);
});

test('higher/lower accepts ties, ends on a mistake and wins after fifteen correct rounds',()=>{
  let s=puzzle(G,A,'higher',date,'daily',time);
  const [a,b]=s.pairs[0].map(id=>cardAt(A,id)), low=a.r<b.r?0:1;
  if(a.r!==b.r)assert.equal(answer(G,A,s,low,time).done,true);
  for(let i=0;i<15;i++){const Q=s.pairs[i].map(id=>cardAt(A,id));s=answer(G,A,s,Q[0].r>=Q[1].r?0:1,time);}
  assert.ok(s.done&&s.won);assert.equal(s.score,15);assert.deepEqual(validatePuzzle(G,A,s),s);
});

test('squad recall deadline cannot be extended by reload and repeated names score once',()=>{
  let s=puzzle(G,A,'roster',date,'daily',time);
  for(const c of G.cards[s.club].slice(0,5))s=answer(G,A,s,G.people[c.p].nm,time);
  assert.throws(()=>answer(G,A,s,G.people[s.guesses[0]].nm,time),/already/);
  const expired=answer(G,A,s,'anything',time+120001);
  assert.ok(expired.done&&expired.won);
  assert.equal(validatePuzzle(G,A,expired).deadline,time+120000);
  assert.deepEqual(validatePuzzle(G,A,expired),expired);
});

test('career trail requires all and only archive clubs and reconstructs the score on import',()=>{
  let s=puzzle(G,A,'career',date,'daily',time);
  assert.equal(s.rounds.length,5);
  const first=s.rounds[0];
  const wrong=answer(G,A,s,first.clubs.slice(1),time);assert.equal(wrong.score,0);
  assert.throws(()=>answer(G,A,s,[first.choices[0],first.choices[0]],time),/Select clubs/);
  while(!s.done)s=answer(G,A,s,s.rounds[s.guesses.length].clubs,time);
  assert.equal(s.score,5);assert.ok(s.won);assert.deepEqual(validatePuzzle(G,A,s),s);
});

test('calendar streaks cross month/year boundaries and practice never changes them',()=>{
  assert.equal(day(new Date(2026,9,18,23,59)),'2026-10-18');
  assert.equal(previous('2026-01-01'),'2025-12-31');
  const sessions={a:{kind:'card',date:'2025-12-31',seed:'daily',done:true,won:true},b:{kind:'card',date:'2026-01-01',seed:'daily',done:true,won:true},c:{kind:'card',date:'2026-01-02',seed:'practice',done:true,won:true}};
  assert.deepEqual(streak(sessions,'card','2026-01-02'),{current:2,best:2,wins:2});
  assert.equal(streak(sessions,'card','2026-01-03').current,0);
});

test('completed seasons count once; collection unlocks exact trophy-winning cards',()=>{
  const f=freeFill(G,A,freeSquad(G),7), S={...f,phase:'results',manager:{nm:f.m},cap:true};
  const h={s:1990,pos:1,w:25,d:10,l:3,gf:70,ga:30,pts:85,trophies:['L']};
  S.mode={career:{history:[h],S:{s:1990},slots:f.slots}};
  const P=record(emptyProfile(),G,S);
  assert.equal(record(P,G,S),P);
  const reset={...emptyProfile(),ignored:P.events.map(e=>e.id)};
  assert.equal(record(reset,G,S),reset);
  assert.equal(totals(P).drafts,1);assert.equal(totals(P).seasons,1);assert.equal(totals(P).titles,1);
  assert.deepEqual(collection(P),new Set(f.slots.map(refid)));
  assert.ok(achievements(P).find(a=>a.id==='caps').unlocked);
  assert.deepEqual(validateProfile(G,A,JSON.parse(JSON.stringify(P))),P);
  const bad=structuredClone(P);bad.events[0].year='<img onerror=alert(1)>';
  assert.throws(()=>validateProfile(G,A,bad),/invalid result/);
  const dup=structuredClone(P);dup.events.push(dup.events[0]);assert.throws(()=>validateProfile(G,A,dup),/repeats/);
});

test('profile round trips sandbox and daily progress without competitive rewards',()=>{
  const P=emptyProfile();P.sandbox=freeFill(G,A,freeSquad(G));
  let s=puzzle(G,A,'card',date,'daily',time);s=answer(G,A,s,s.target,time);
  P.sessions[`${date}:card:daily`]=s;
  assert.deepEqual(validateProfile(G,A,JSON.parse(JSON.stringify(P))),P);
  assert.equal(collection(P).size,0);assert.equal(totals(P).drafts,0);
  const malformed=structuredClone(P);malformed.sandbox.slots[1]=malformed.sandbox.slots[0];assert.throws(()=>validateProfile(G,A,malformed),/already/);
  assert.throws(()=>validateProfile(G,A,{...P,settings:{...P.settings,theme:'<script>'}}),/settings/);
});
