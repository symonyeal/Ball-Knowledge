import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { mountPortraits, entityPhoto } from '../../app/portraits.js';
test('portrait metadata skips removed images and safely encodes Commons filenames',()=>{
 const claim=(file,rank)=>({rank,mainsnak:{datavalue:{value:file}}});
 const p=entityPhoto({claims:{P18:[claim('Wrong.jpg','deprecated'),claim('Diego & Pelé.jpg','normal')]}});
 assert.ok(p.url.includes('Diego_%26_Pel%C3%A9.jpg'));
 assert.equal(entityPhoto({claims:{}}),null);
});
test('bundled portraits carry author, licence and source metadata and all files exist',()=>{
 const M=JSON.parse(readFileSync(new URL('../../data/portraits.json',import.meta.url)));
 assert.ok(M.Q17515 && M.Q1835 && M.Q17163,'all landing portraits are bundled');
 for(const p of Object.values(M)) {
  assert.ok(p.credit && p.licence && p.source.startsWith('https://commons.wikimedia.org/wiki/File:'));
  assert.ok(existsSync(new URL('../../'+p.local,import.meta.url)));
 }
});
test('bundled portraits load immediately while an unrelated remote photo is pending',async t=>{
 const originals={fetch:globalThis.fetch,IntersectionObserver:globalThis.IntersectionObserver,MutationObserver:globalThis.MutationObserver};
 t.after(()=>Object.assign(globalThis,originals));
 let intersect,remote,requests=0;
 globalThis.IntersectionObserver=class{constructor(fn){intersect=fn;}observe(){}unobserve(){}disconnect(){}};
 globalThis.MutationObserver=class{observe(){}disconnect(){}};
 globalThis.fetch=async url=>String(url).includes('portraits.json') ? {ok:true,json:async()=>({Q1835:{local:'data/portraits/test.jpg',source:'https://commons.wikimedia.org/wiki/File:Test.jpg'}})} : new Promise(r=>{requests++;remote=()=>r({ok:true,json:async()=>({entities:{}})});});
 const el=k=>{const img={},link={};return{dataset:{portrait:k},isConnected:true,querySelector:s=>s==='img'?img:link,img};};
 const local=el('Q1835'),missing=el('Q99999999'),stop=mountPortraits({querySelectorAll:()=>[local,missing]});
 t.after(stop);intersect([{isIntersecting:true,target:local},{isIntersecting:true,target:missing}]);
 await new Promise(r=>setTimeout(r,90));
 try {
  assert.ok(local.img.src,'a remote outage must not hold up a local image');
  intersect([{isIntersecting:true,target:el('Q99999999')}]);
  await new Promise(r=>setTimeout(r,90));
  assert.equal(requests,1,'re-rendering a pending portrait must reuse its request');
 }finally{remote?.();}
});
