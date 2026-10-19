"""Football nations for people the export left without one; writes curated/nations.json.

The export reads only Wikidata's country for sport (P1532), which 43% of the bundle's people lack or give as
the United Kingdom, which fields no team. This step asks Wikidata, for those people only, in order of how directly each fact names a football nation:
  sport  country for sport (P1532), re-read in case it was added since the bundle was built
  team   a national team he played for (P54 member of an instance of Q6979593, which Wikidata also gives
         youth, B and Olympic sides: each names his football nation)
  home   for a United Kingdom birthplace, the home nation it lies in (England, Scotland, Wales, Northern Ireland)
  cit    country of citizenship (P27), except the United Kingdom, which fields no team

Legend
  Q      person ids without a nation;  B  batch size;  L  item id -> English label
  HOME   the four UK home nations;  UK  United Kingdom;  NT  national team class;  TEAM  team label -> country
  NAME   historical or formal state label -> football nation label used by the game
  pick(ids)  one label from several: the alphabetically first after NAME, unknown dropped
  team(t, known)  a national side label -> its nation; known = bundle nations, NAME, HOME and citizenship labels
Run: python -m pipeline.nations  (FEL_CACHE may point the SPARQL cache elsewhere)
"""
import hashlib
import json
import re

from .config import CUR, OUT
from .net import sparql

B = 150
NT = "Q6979593"
UK = "Q145"
HOME = {"Q21": "England", "Q22": "Scotland", "Q25": "Wales", "Q26": "Northern Ireland"}
NAME = {"German Reich": "Germany", "Nazi Germany": "Germany", "Weimar Republic": "Germany", "German Empire": "Germany",
        "West Germany": "Germany", "Kingdom of the Netherlands": "Netherlands", "Kingdom of Italy": "Italy",
        "Kingdom of Hungary": "Hungary", "Hungarian People's Republic": "Hungary", "Kingdom of Romania": "Romania",
        "Socialist Republic of Romania": "Romania", "Polish People's Republic": "Poland",
        "Second Polish Republic": "Poland", "Polska Rzeczpospolita Ludowa": "Poland",
        "People's Republic of Bulgaria": "Bulgaria", "Kingdom of Bulgaria": "Bulgaria",
        "Czechoslovak Socialist Republic": "Czechoslovakia", "First Czechoslovak Republic": "Czechoslovakia",
        "Third Czechoslovak Republic": "Czechoslovakia", "Kingdom of Yugoslavia": "Yugoslavia",
        "Socialist Federal Republic of Yugoslavia": "Yugoslavia", "Federal Republic of Yugoslavia": "Yugoslavia",
        "Federal People's Republic of Yugoslavia": "Yugoslavia", "Democratic Federal Yugoslavia": "Yugoslavia",
        "Serbia and Montenegro": "Serbia and Montenegro", "German Democratic Republic": "East Germany",
        "Francoist Spain": "Spain", "Second Spanish Republic": "Spain", "Kingdom of Spain": "Spain",
        "Estado Novo": "Portugal", "Kingdom of Portugal": "Portugal", "First Portuguese Republic": "Portugal",
        "French Third Republic": "France", "French Fourth Republic": "France", "Vichy France": "France",
        "Kingdom of Greece": "Greece", "Kingdom of Belgium": "Belgium", "Kingdom of Denmark": "Denmark",
        "Kingdom of Sweden": "Sweden", "Kingdom of Norway": "Norway", "Irish Free State": "Ireland",
        "Republic of Ireland": "Ireland", "Russian Empire": "Russia", "Russian Soviet Federative Socialist Republic": "Soviet Union",
        "Ukrainian Soviet Socialist Republic": "Soviet Union", "Georgian Soviet Socialist Republic": "Soviet Union",
        "Belarusian Soviet Socialist Republic": "Soviet Union", "Federal State of Austria": "Austria",
        "First Austrian Republic": "Austria", "Austria-Hungary": "Austria", "Brazil (1889-1930)": "Brazil",
        "First Brazilian Republic": "Brazil", "Mandatory Palestine": "Israel",
        "Kingdom of Egypt": "Egypt", "Republic of Turkey": "Turkey", "Ottoman Empire": "Turkey",
        "DR Congo": "Democratic Republic of the Congo", "Côte d'Ivoire": "Ivory Coast", "Aragon": "Spain",
        "United Kingdom of Great Britain and Ireland": "", "United Kingdom": "", "Kingdom of Great Britain": ""}
TEAM = re.compile(r"(\s+(men's\s+)?(national|olympic)\b.*|\s+B)$", re.I)   # senior, youth, B and Olympic sides


def team(t, known):
    """A national side's label -> its nation: suffixes stripped, else the longest known nation it starts with."""
    while (u := TEAM.sub("", t)) != t:
        t = u
    t = NAME.get(t, t)
    return t if t in known else max((k for k in known if t.startswith(k + " ")), key=len, default="")


def _bk(Q):
    return hashlib.sha256(" ".join(Q).encode()).hexdigest()[:16]   # cache key: the batch's own ids


def _id(u):
    return u["value"].rsplit("/", 1)[1]


def _rows(Q, body, k):
    out = []
    for i in range(0, len(Q), B):
        v = " ".join(f"wd:{p}" for p in Q[i:i + B])
        out += sparql(f"SELECT ?p ?x WHERE {{ VALUES ?p {{ {v} }} {body} }}", f"nat-{k}-{_bk(Q[i:i + B])}") or []
    return out


def labels(ids):
    ids, L = sorted(ids), {}
    for i in range(0, len(ids), B):
        v = " ".join(f"wd:{x}" for x in ids[i:i + B])
        for r in sparql(f'SELECT ?x ?l WHERE {{ VALUES ?x {{ {v} }} ?x rdfs:label ?l FILTER(lang(?l)="en") }}', f"nat-lab-{_bk(ids[i:i + B])}") or []:
            L[_id(r["x"])] = r["l"]["value"]
    return L


def pick(names):
    N = sorted({str(NAME[n] if n in NAME else n) for n in names if n} - {""})
    return N[0] if N else ""


def run():
    G = json.loads((OUT / "game.json").read_text(encoding="utf-8"))
    old = json.loads((CUR / "nations.json").read_text(encoding="utf-8")) if (CUR / "nations.json").exists() else {}
    # Without a usable nation now, or filled by an earlier pass. Hash-keyed batches stay correct whatever the
    # order; people with a label such as the United Kingdom come last so earlier batches keep their keys.
    none = lambda x: not NAME.get(x.get("nat") or "", x.get("nat"))
    Q = sorted(p for p, x in G["people"].items() if (none(x) and not x.get("nat")) or p in old)
    Q += sorted(p for p, x in G["people"].items() if none(x) and x.get("nat") and p not in old)
    F = {k: {} for k in ("sport", "team", "home", "cit")}
    q = {"sport": "?p wdt:P1532 ?x .",
         "team": f"?p wdt:P54 ?x . ?x wdt:P31 wd:{NT} .",
         "home": f"?p wdt:P19/wdt:P131* ?x . VALUES ?x {{ {' '.join('wd:' + h for h in HOME)} }}",
         "cit": "?p wdt:P27 ?x ."}
    for k, body in q.items():
        for r in _rows(Q, body, k):
            F[k].setdefault(_id(r["p"]), set()).add(_id(r["x"]))
    L = labels({x for k in ("sport", "team", "cit") for S in F[k].values() for x in S})
    known = ({x["nat"] for p, x in G["people"].items() if x.get("nat") and p not in old} | set(NAME.values()) | set(HOME.values()) |
             {NAME.get(L.get(x, ""), L.get(x, "")) for S in F["cit"].values() for x in S}) - {""}
    out = {}
    for p in Q:
        sport = pick(L.get(x, "") for x in F["sport"].get(p, ()))
        side = pick(team(L.get(x, ""), known) for x in F["team"].get(p, ()))
        home = pick(HOME[x] for x in F["home"].get(p, ()))
        cit = pick(L.get(x, "") for x in F["cit"].get(p, ()) if x != UK)
        for basis, n in (("sport", sport), ("team", side), ("home", home), ("cit", cit)):
            if n:
                out[p] = [n, basis]
                break
    (CUR / "nations.json").write_text(json.dumps(dict(sorted(out.items())), ensure_ascii=False, indent=0), encoding="utf-8")
    by = {}
    for n, b in out.values():
        by[b] = by.get(b, 0) + 1
    print(f"{len(Q)} without a nation; filled {len(out)}: {by}")


if __name__ == "__main__":
    run()
