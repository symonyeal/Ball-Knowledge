"""Finishing pass over the exported archive: football nations for people the export left without one.

The export reads only Wikidata's country for sport (P1532). curated/nations.json (written by
pipeline.nations) holds a nation and its basis for most of the rest; a person who already has a nation keeps
it, and running the pass again changes nothing. meta.nations counts the filled people by basis, so the
manifest and validation describe the same bundle.

Legend
  G  exported game;  N  person id -> [nation, basis];  basis  sport | team | home | cit (see pipeline.nations)
  apply(G)  fill G in place and return the counts;  main()  rewrite data/game.json and the manifest meta, then
            run python -m pipeline.validate to refresh the coverage fingerprint
"""
import json

from .config import CUR, OUT
from .nations import NAME


def apply(G):
    p = CUR / "nations.json"
    N = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    by = {}
    for q, x in G["people"].items():
        if q not in N:
            continue
        if not NAME.get(x.get("nat") or "", x.get("nat")):   # missing, or a label such as the United Kingdom
            x["nat"] = N[q][0]
        if x["nat"] == N[q][0]:
            by[N[q][1]] = by.get(N[q][1], 0) + 1
    G["meta"]["nations"] = dict(sorted(by.items()), missing=sum(1 for x in G["people"].values() if not NAME.get(x.get("nat") or "", x.get("nat"))))
    return G["meta"]["nations"]


def main():
    G = json.loads((OUT / "game.json").read_text(encoding="utf-8"))
    n = apply(G)
    (OUT / "game.json").write_text(json.dumps(G, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    mp = OUT / "manifest.json"
    M = json.loads(mp.read_text(encoding="utf-8"))
    M["meta"] = G["meta"]
    mp.write_text(json.dumps(M, ensure_ascii=False, indent=1), encoding="utf-8")
    print("nations", n)


if __name__ == "__main__":
    main()
