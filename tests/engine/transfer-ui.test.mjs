import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as E from '../../app/engine/index.js';
import * as D from '../../app/draft.js';
import * as C from '../../app/career.js';
import { U, vcard } from '../../app/ui/kit.js';
import { teams } from '../../app/ui/lobby.js';
import { hub } from '../../app/ui/career.js';
import * as R from '../../app/run.js';
import { windowPreview } from '../../app/ui/transfers.js';

const G = JSON.parse(readFileSync(new URL('../../data/game.json', import.meta.url)));
E.cfg(G.params); U.G = G;
function draft() {
 let s = D.choose(G, D.start(851, 2000, false), 0);
 for (let j=0;j<5;j++) {
  s=D.spin(G,s);
  for(let k=0;k<3;k++) s=D.place(G,s,G.cards[s.combo].find(c=>D.can(G,s,c.p)).p,j*3+k);
 }
 return {...s,phase:'results'};
}
test('collectible cards have a portrait target and an offline fallback',()=>{
 const c=D.hydrate(G,{k:'Q2641:1980',p:'Q17515'}), html=vcard(c);
 assert.match(html,/data-portrait="Q17515"/);
 assert.match(html,/portrait-fallback/);
 assert.match(html,/Photo source/);
});
test('the manager name is an actionable preview control and the preview identifies him visibly',()=>{
 U.S=D.start(851,1980); U.insp=3; U.f0=null;
 const html=teams(), o=D.opts(G,U.S)[3];
 assert.match(html,/<button[^>]*data-inspect="3"[^>]*>Arsène Wenger/);
 assert.match(html,/<h2[^>]*>Arsène Wenger/);
 assert.match(html,/id="manager-preview"/);
 assert.ok(html.includes(o.nm));
});
test('a career signing shows incoming and outgoing cards before commitment',()=>{
 U.S=draft(); const base=C.careerStart(G,U.S);
 let s;
 for(let seed=1;seed<50;seed++) {
  s={...base,seed,pat:19,ph:'node',half:1,node:{window:'winter',left:1,free:0}};
  if(C.careerOffers(G,s).some(o=>o.kind==='market')) break;
 }
 assert.ok(C.careerOffers(G,s).some(o=>o.kind==='market'));
 U.S.mode={career:s}; U.tab='market';
 const before=JSON.stringify(s), html=hub();
 assert.match(html,/Incoming/); assert.match(html,/Outgoing/);
 assert.match(html,/Rating in place/); assert.match(html,/Chemistry/);
 assert.match(html,/data-transfer-preview/);
 assert.equal(JSON.stringify(s),before,'preview must not mutate the saved career');
});
test('Gauntlet summer previews rate arrivals for the upcoming decade',()=>{
 const s={...R.runNew(851,draft(),'odyssey'),ph:'hop'}, sel={old:[0],neu:[0],out:[13,14]};
 const next=R.hop(G,s,sel), expected=E.rate(R.runTeam(G,next),1960).ovr.toFixed(1);
 const x=windowPreview(s,sel);
 assert.equal(x.ok,true);
 assert.ok(x.html.includes(`→ ${expected} (`),'squad overall must match the upcoming preparation screen');
 assert.match(x.html,/1960s/);
 assert.equal(windowPreview(s,{...sel,out:[14,14]}).ok,false,'duplicate departures are blocked');
});
