// Photo metadata is cached by person, independently of any card's club or decade.
// M contains bundled metadata; C holds this visit's lookups, including missing photos.
const C = new Map();
const FILE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
export const photoURL = file => FILE + encodeURIComponent(file.replaceAll(' ', '_')) + '?width=320';
export function entityPhoto(entity) {
  const claim = entity?.claims?.P18?.find(c => c.rank !== 'deprecated' && typeof c.mainsnak?.datavalue?.value === 'string');
  const file = claim?.mainsnak.datavalue.value;
  return file ? { url: photoURL(file), source: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file), file } : null;
}
async function json(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), credentials: 'omit' });
  if (!r.ok) throw new Error('Photo service unavailable');
  return r.json();
}
export function mountPortraits(root = document) {
  const seen = new WeakSet(), waiting = new Map();
  const manifest = json(new URL('../data/portraits.json', import.meta.url)).catch(() => ({}));
  let timer;
  const paint = (el, p) => {
    if (!el.isConnected) return;
    if (!p) { el.dataset.state = 'missing'; return; }
    const img = el.querySelector('img'), link = el.querySelector('a');
    link.href = p.source;
    const credit = [p.credit?.replace(/<[^>]*>/g,''), p.licence].filter(Boolean).join(' · ');
    link.title = credit || 'Photo and licence on Wikimedia Commons';
    link.textContent = credit || 'Photo source';
    link.setAttribute?.('aria-label', 'Photo source: ' + (credit || p.file || 'Wikimedia Commons'));
    img.onload = () => { el.dataset.state = 'ready'; };
    img.onerror = () => { el.dataset.state = 'missing'; img.removeAttribute('src'); };
    img.src = p.local ? new URL('../' + p.local, import.meta.url).href : p.url;
  };
  const flush = async () => {
    const entries = [...waiting]; waiting.clear();
    const M = await manifest;
    entries.filter(([k]) => M[k] || C.has(k) || !/^Q\d+$/.test(k)).forEach(([k,els]) => {
      Promise.resolve(M[k] || C.get(k)).then(p => els.forEach(el=>paint(el,p)));
    });
    const ids = entries.map(([k]) => k).filter(k => /^Q\d+$/.test(k) && !M[k] && !C.has(k));
    for (let i = 0; i < ids.length; i += 40) {
      const batch = ids.slice(i, i + 40);
      const request = json('https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action:'wbgetentities', ids:batch.join('|'), props:'claims', format:'json', origin:'*' })).catch(() => null);
      batch.forEach(k => C.set(k, request.then(j => entityPhoto(j?.entities?.[k]))));
    }
    for (const [k, els] of entries) {
      // Managers are resolved only by curated metadata, never by a fuzzy name match.
      const p = M[k] || await C.get(k);
      els.forEach(el => paint(el, p));
    }
  };
  const io = new IntersectionObserver(entries => {
    entries.filter(e => e.isIntersecting).forEach(({target:el}) => {
      io.unobserve(el);
      const k = el.dataset.portrait;
      if (!waiting.has(k)) waiting.set(k, []);
      waiting.get(k).push(el);
    });
    clearTimeout(timer); timer = setTimeout(flush, 50);
  }, { rootMargin:'150px' });
  const scan = () => root.querySelectorAll('[data-portrait]').forEach(el => {
    if (!seen.has(el)) { seen.add(el); io.observe(el); }
  });
  const observer = new MutationObserver(scan);
  observer.observe(root, { childList:true, subtree:true }); scan();
  return () => { observer.disconnect(); io.disconnect(); clearTimeout(timer); };
}
