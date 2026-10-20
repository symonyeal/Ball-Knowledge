# What the checks and results establish

The checks answer several different questions: whether the game follows its rules, whether its goal model improves on a simple average, and how difficult it is under one automatic drafting policy. Passing the first set does not prove that the historical ratings are correct. The career release adds real league and European records while retaining the 2026-10-07 cards and match fit. The old fictional-season and Gauntlet measurements below remain labelled as version 3 benchmarks; they do not measure the new career or its decade-restricted manager pool.

## The rules are checked automatically

The phone draft checks in `tests/browser/night-sky.cjs` scroll a long roster
to its end while keeping search and sorting in place. At 320×568, 390×844
and 430×932 they require room for a complete player card and keep the roster
above the fixed lineup action. These checks use the visible draft and do not
alter its saved team or simulation rules.

The account-free Clubhouse expansion adds sandbox invariants, deterministic daily
puzzles, resumable deadlines, calendar streaks, completed-event deduplication,
collection identity and profile validation. `tests/browser/clubhouse.cjs` exercises
these controls at desktop and phone widths; CI runs it after the existing game
acceptance suite. See [CLUBHOUSE.md](CLUBHOUSE.md) for the feature rules, REA
reference investigation and limits of the personal statistics.

`tests/browser/repairs.cjs` checks all five manager previews and selections in every decade on desktop and phone, including clicking the manager name or club card and choosing a different formation. It loads bundled photographs, exercises missing metadata and failed image decoding, and checks that signing/release cards follow the selected players without changing the save until purchase. A career and Gauntlet running together must keep their transfer previews separate. The engine tests also check portrait credits and local files, reuse of pending photo requests, and Gauntlet transfer ratings in the upcoming decade. Transfer-window confirmation stays disabled until the game's actual transfer action accepts the full set of arrivals and departures.

The JavaScript suite checks draft limits, one-person identity, position assignment, rating adjustments, leagues and cups, substitutions and agreement between match events and reported totals. It also covers repeatable results, the circuit, weekly seeds, team codes, Gauntlet maps, four-round acts, rewards, same-person boosts, two-legged boss ties, retries, transfers, development and valid or malformed saves. Formation tests require changes to preserve cards, the bench and future draws; manager tests retain exact club spells and accept legacy saves and team codes. Interface tests check surname particles and text and focus contrast against the declared surfaces.

Career checks cover real league membership, season-specific and nearby squads, labelled stand-ins, two-point seasons, odd-sized fields, competition availability and qualification, partial-season continuation and the expectation-based patience scale. Save validation checks the career independently of its original draft and Gauntlet. The lobby regression renders an unrecorded selected formation and requires that formation's actual pitch, rather than only the manager's recorded miniatures. Version 4 options are checked across every decade and both manager re-spins; version 2 and version 3 choices and both older team-code formats retain their original validation rules.

Chemistry tests check the thresholds, the cap of 3 per starter, natural-position eligibility, the manager's nation and league counts and the bench, and require career rival managers and nation labels to give the counts every other mode gives. Squad challenge tests build a passing eleven for every permanent challenge and for twenty consecutive weekly sets keyed by the UTC ISO week, check that every reward card exists, and require a completed challenge to survive profile export and import without counting as a result. Career tests cover in-forms and their reset each season, evolution progress and completion, rejection of saved evolutions the log does not record, and deterministic resumption of an evolving save.

The salary-cap tests check the exact tier boundaries, that a third S-tier card is refused even on the bench, that every allowed pick leaves the club's three picks completable, and that saves, replays, team codes and Gauntlet signings keep the rule. Drafts on the bundled data finish with exactly 2 S, 4 A, 4 B, 3 C and 2 D players from five different clubs in every decade. Other tests require draws to follow the declared weights, every club to remain drawable, a squad to offer the best tier still needed, a ruled-out club to leave every other draw on the same seed unchanged, and each hard end-of-draft need to have more supplier clubs than a draft can rule out.

Checks on the supplied data require the strongest rated squad to lead each selected opposition field. They also require the coverage report, manifest counts and embedded calibration settings to describe the exact bundle. A stale data hash fails that check.

A local legacy Gauntlet comparison against commit `27d0647` returned identical hashes for four map inputs. All four ended with dismissal in the opening act, so that comparison covers those early-failure paths. It does not prove identical later-act play; the separate regression suite exercises rewards, transfers, retries and saved later stages.

The pipeline tests exercise source selection, age adjustments, CM record layouts, attribute and position rules, allocation of club spells, statistic date boundaries and legend identity. Nearby-source regressions cover EA and CM snapshots inside long club spells, their precedence over snapshots outside the spell, and the two-season cutoff outside the interval. They use small fixtures rather than downloading sources. The calibration tests use independently generated goal counts to check parameter recovery, probability calculations, rejected inputs and the training-only average used for comparison.

Run these commands from the repository root with Node 20 or later and the Python analytics dependencies installed:

```text
node --test tests/engine/*.test.mjs
py -3.14 -m unittest discover -s tests -p test_pipeline.py -v
py -3.14 -m unittest discover -s tests -p test_wikidata.py -v
py -3.14 -m pytest tests/test_calibration.py -q -p no:cacheprovider
```

GitHub's `Game checks` workflow also executes the notebook through Node. Gameplay has no frontend build or npm dependency installation. The refreshed notebook completed seven code cells without error outputs and checked repeatability for its selected settings and loaded data in the fictional single-season experiment. That establishes the same result for those inputs, not a historically valid outcome or equivalence with the browser career. Windows can emit a Jupyter/ZeroMQ selector-thread warning during execution.

The data validator reported zero failures for its structural rules. The export has at least fifteen cards and a goalkeeper in every eligible club-and-decade squad, no person with Wikidata's cached explicit female label, and eight winger spot checks in wide positions. Those checks cannot identify every wrong or missing source record.

## The browser checks cover the career and extra modes

The final 2026-10-08 local acceptance record passed 60 checks in bundled Chromium: desktop at 1440 × 900, mobile at 390 × 844, tablet at 768 × 1024 and reduced motion. An earlier Microsoft Edge run passed 59 checks. Neither report recorded a page or console error, failed HTTP response or horizontal page overflow, and both fingerprints match the current league-enabled bundle.

Desktop and mobile completed manager selection, five squad draws, fifteen placements, a swap and reload under the default salary cap. The finished draft held 2 S, 4 A, 4 B, 3 C and 2 D players from five clubs, with visible reasons for blocked cards. Each played a real club season to winter, took a reward, resumed with the exact saved state, changed the lineup, played the run-in and inspected tables, fixtures, cups and season history. Whole-decade continuation is also exercised by the engine and balance harness.

Three further checks exercised the new controls and summer flow. Random decade and seed re-roll changed the actual draft settings. A career prime upgrade kept the player and original tier charge, and scouting plus a quoted signing applied to the chosen squad place. Two summer transfers, a formation change and a lineup swap then advanced to the next real league season and survived a reload with the same state.

More modes played four Gauntlet rounds, rewards and a two-legged boss, including quoted market signings, prime-card upgrades, four transfers and formation changes between decades. Both screen sizes also completed a ten-event circuit with player awards, a team-code Head to Head tie and a Weekly Challenge draft. Head to Head rejected mismatched cap rules, a Classic replay link started a Classic draft, and the Weekly Challenge used the cap even after Classic was chosen.

Both playthroughs selected an unrecorded starting formation, changed formation mid-batch, applied the preview, undid and redid it, then resumed with the same cards, bench and counters. Separate regressions require resolving a preview before kick-off and allow a phone keyboard to select and place a substitute when all eleven starting places are filled. Tablet checks placed a card through its sheet without covering the pitch or bench. Reduced motion revealed a squad immediately and removed its animation.

The added tablet regression forces fallback fonts, checks the header width and places a player. It addresses the first CI run's header overflow: a 768-pixel viewport produced an 817-pixel page. After the header sizing fix, targeted probes in Chromium and Edge both measured 768 pixels with no overflowing elements. The final Chromium playthrough includes this fallback-font case.

Both playthroughs rejected corrupt saves and invalid replay files. They rejected a malformed Gauntlet import without replacing browser storage, downloaded the replay and result PNG, and restored the downloaded replay with exactly the same placements. The reports record the data hash. These local runs cover bundled Chromium and Microsoft Edge at three screen sizes, plus the targeted Edge header check after the fix. They do not cover every browser or every possible sequence of choices.

To reproduce them, serve the repository root, install Playwright and Chromium, and run:

```text
node tests/browser/acceptance.cjs --output /path/to/persistent/results --url http://127.0.0.1:8765/
```

If Playwright is installed elsewhere, add `--playwright /path/to/playwright`. To use installed Microsoft Edge, add `--channel msedge`. The chosen output folder receives `acceptance.json`, screenshots, replays and result images. GitHub's workflow runs the same checks in Chromium and preserves those outputs as the `browser-checks` artifact. The harness can test the public site by changing `--url` to `https://symonyeal.github.io/Ball-Knowledge/`.

Choose an output folder outside the tracked source tree, or inside the ignored `work/` folder.

## The goal model beats a home-and-away average

The goal model was fitted on 6,716 matched real fixtures from seasons starting in 2014 through 2019. It was checked on 4,354 different fixtures from 2020 through 2023, comprising 8,708 team goal counts. These later fixtures were held out: they did not determine the fitted coefficients.

Each club was represented by its actual FIFA edition roster, its best eleven in a 4-3-3, EA position ratings, a neutral manager and no curated tags. This asks whether the model can relate ordinary club strengths to goals. It does not test the mixed-era draft rules.

The comparison predicts every home side using the training period's average of 1.58815 goals and every away side using 1.22186. Both the model and that simple baseline are evaluated on the same later fixtures.

| Held-out measure | Model | Home/away average baseline |
| --- | ---: | ---: |
| Mean Poisson negative log likelihood | 1.47598 | 1.54001 |
| Root mean squared error in goals | 1.18792 | 1.26474 |

Both measures are better when lower. Poisson negative log likelihood, also called log loss here, penalizes the model when it assigns a low probability to the score that actually occurred. Root mean squared error measures the size of the difference between expected and observed goals, giving larger mistakes more weight. They assess goal predictions in different ways; neither is a percentage of correctly predicted winners.

The full fitted coefficients are `be=0.411503` for the attack/defence gap, `ka=0.556609` for midfield weight, and `h=0.262093` for home advantage on the logarithmic scale. [MODEL.md](MODEL.md#drawing-the-match-score) shows how they enter the calculation. The report records agreement between Python's fitted expectations and JavaScript's deployed `lam` within 1e-10.

The 2010s and 2020s scoring level is the training neutral intercept, 1.231344 goals per team. The later test period's scoring average does not tune that deployed value. Earlier levels use measured historical scoring ratios.

Club-name matches restrict fixture coverage. Unmatched fixtures are excluded from both comparisons; [calibration.json](../data/calibration.json) records coverage, unmapped clubs and league-seasons with missing results. The fit excludes random absences, fatigue and substitutions. It does not validate historical squads, mixed-era teams, formations, links, tags or manager grades. Predicting game ratings, transferring those ratings across generations and predicting modern club goals are separate questions.

## The measured career policy found the league easy

The first career measurement played four seeds per decade, 1000 through 1003, under both Salary cap and Classic: thirty-two careers per rule set. It chose the best manager grades, drafted the best legal fit- and era-adjusted value plus the team chemistry its placement added, and kept the initial formation. Rewards preferred a prime-card upgrade only when at least five patience remained, otherwise rest and then development. Summer transfers minimized lost starter strength before improving the bench within the cap, with the lower-rated offer breaking ties. After summer the policy reassigned the eleven within the current formation. It did not use market signings, scouting re-spins or deliberate formation searches.

```text
node tests/career-balance.mjs 4 both 5 --output "/path/to/persistent/results/career balance.json"
```

| Rules | Careers completed / attempted | Dismissed | Seasons played | Board objectives met | League titles |
| --- | ---: | ---: | ---: | ---: | ---: |
| Salary cap | 32 / 32 | 0 | 300 | 291 / 300 | 273 / 300 |
| Classic | 32 / 32 | 0 | 300 | 290 / 300 | 281 / 300 |

All sixty-four careers reached their available final season. League results were much easier for this policy than the older fictional-season benchmark. Thirteen capped halves and ten Classic halves lost patience, out of six hundred halves per rule set. The 2020s remained the least forgiving decade: fifteen of twenty capped objectives and seven league titles, and twelve objectives and eleven titles under Classic.

This small sample uses the strongest offered manager grades and covers six leagues, with no Portuguese club drawn. Four seeds per decade do not establish results for every club, league, formation, reward strategy or human player. The experiment measured continuation and difficulty; the spin retune [below](#the-spin-settings-trade-variety-against-strength) targets the season benchmark, and these high completion and title rates do not establish a balanced challenge. The report records every career, settings, season finishes and the current bundle's SHA-256 fingerprint.

## One summer change per season (2026-10-20)

The career dropped its winter window and summer transfer stage: one change per summer, free after a trophy, with next season's league rivals in the market. To keep the patience a resting player had, the career starts at 10 and a summer rest pays 3. The same command and seeds compared the previous rules (b571e94) with the new ones, with the summer-transfer step removed from the policy:

| Rules | Version | Completed / attempted | Dismissed | Seasons | Objectives met | League titles |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Salary cap | before | 32 / 32 | 0 | 300 | 283 | 275 |
| Salary cap | after | 32 / 32 | 0 | 300 | 270 | 248 |
| Classic | before | 32 / 32 | 0 | 300 | 291 | 289 |
| Classic | after | 31 / 32 | 1 | 298 | 287 | 280 |

The career stays easy for this policy; fewer prime upgrades (317 before, 47 after) account for most of the lower title count. Without the patience compensation, four of the sixty-four careers were dismissed.

## Gauntlet: two rewards and two transfers per decade (2026-10-20)

Rewards now follow rounds 2 and 4 only, and the transfer window signs one player from each decade instead of two. Forty capped runs of Odyssey in Reverse (`node tests/balance.mjs gauntlet 40 5 cap reverse`, seeds 500-539) before (49da2ce) and after:

| Version | Decades cleared: runs | Median | Full clears |
| --- | --- | ---: | ---: |
| before | 0: 4, 1: 22, 2: 7, 3: 4, 8: 3 | 1 | 3 |
| after | 0: 6, 1: 17, 2: 6, 3: 4, 4: 1, 8: 6 | 1 | 6 |

The median is unchanged, so no compensation was added. The policy signs the lowest-rated arrivals, so fewer forced arrivals helps it; this does not measure human play.

## Current career and Gauntlet evidence, repeated on 2026-10-20

The career and capped reverse Gauntlet commands above were run again at
`6a52c67`, including chemistry v2, the position rules, the single summer
change and the two-reward Gauntlet. They reproduced the current tables:
Salary cap completed 32 of 32 careers, with 270 objectives and 248 league
titles in 300 seasons; Classic completed 31 of 32, with one dismissal,
287 objectives and 280 league titles in 298 seasons. The 40 Gauntlet seeds
again cleared 0, 1, 2, 3, 4 and 8 decades in 6, 17, 6, 4, 1 and 6 runs,
respectively. Six runs cleared the whole map; the median remained one decade.

[The machine-readable evidence](validation-2026-10-20.json) records the
bundle fingerprint, relevant source fingerprints, settings, decade groups
and aggregate counts. Career seeds were 1000–1003 in each decade and rule
set; Gauntlet seeds were 500–539 with five patience retained after paid
upgrades. These current-policy results supersede the earlier career and
Gauntlet measurements above for current gameplay. They do not replace the
separately labelled fictional-season benchmark or establish human difficulty.
No match-engine parameters changed for this measurement. Rebuilding the
source archive or refitting the EA-based goal model still requires inputs
that are not bundled with a fresh checkout.

## Draft difficulty varies by decade

This is the retained version 3 fictional twenty-club Era League benchmark, measured before the club career. It keeps the original all-era manager options and cannot be read as a career title rate. Add `legacy` to reproduce that manager pool with the current harness.

One automatic drafting policy played one hundred seeds per decade, 1000 through 1099, under each set of rules, with `tau=60` and `rho=2`. It kept the best-graded manager among the five offered and his first recorded formation. At each pick it selected, among the cards the rules allowed, the highest position- and era-adjusted value in an open place, adding the team chemistry that placement would add; bench candidates received a 0.92 weight.

This is a declared computer policy, not a measurement of human players. It does not plan ahead for the cap, optimize manager re-spins, squad re-spins or duo partnerships. Reproduce it with:

```text
node tests/balance.mjs season 100 cap legacy
node tests/balance.mjs season 100 classic legacy
```

Under the salary cap:

| Decade | Median finish | Titles / 100 | Top four / 100 | Median points | Unbeaten / 100 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1950s | 2 | 30 | 89 | 89 | 0 |
| 1960s | 3 | 12 | 58 | 76 | 0 |
| 1970s | 5 | 12 | 44 | 70 | 0 |
| 1980s | 8 | 0 | 11 | 63 | 0 |
| 1990s | 8 | 0 | 9 | 62 | 0 |
| 2000s | 13 | 0 | 3 | 46 | 0 |
| 2010s | 11 | 0 | 0 | 51 | 0 |
| 2020s | 10 | 0 | 0 | 55 | 0 |

Under Classic:

| Decade | Median finish | Titles / 100 | Top four / 100 | Median points | Unbeaten / 100 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1950s | 1 | 50 | 94 | 92 | 1 |
| 1960s | 2 | 20 | 79 | 81 | 0 |
| 1970s | 3 | 24 | 61 | 74 | 0 |
| 1980s | 6 | 3 | 35 | 69 | 0 |
| 1990s | 7 | 1 | 24 | 69 | 0 |
| 2000s | 10 | 2 | 16 | 56 | 0 |
| 2010s | 9 | 0 | 11 | 57 | 0 |
| 2020s | 8 | 0 | 11 | 60 | 0 |

The policy won 54 of 800 capped seasons, or 6.8%, and 100 of 800 Classic seasons, or 12.5%. Before the 2026-10-19 chemistry and position changes (commit `0d751f9`) the same seeds gave 59, or 7.4%, and 91, or 11.4%. Both aggregates are within the chosen 5% to 15% title target. Classic produced one unbeaten season, in the 1950s; the capped policy produced none. With an even sample size, the harness reports the lower of the two middle observations in the sorted list as its median.

Every capped title came in the 1950s to 1970s. The capped squad's median rating stayed between 85.6 and 87.0 in every decade, while the median of the nineteen opponents rose from 79.4 in the 1950s to 86.0 to 90.2 from the 1980s onwards. Classic squads reached 87.0 to 89.2. Zero titles in one hundred drafts of a decade does not establish that the decade cannot be won. Better selections, deliberate partnerships or use of re-spins remain outside what this policy measures.

Repeating the same seeds with `free` chooses the highest-overall formation after drafting. Every candidate is applied through the game's formation function, which keeps all fifteen cards and the bench. It does not optimize picks for a future formation or choose by season outcome.

```text
node tests/balance.mjs season 100 cap free legacy
node tests/balance.mjs season 100 classic free legacy
```

| Rules | Initial formation, titles / 800 | Free formation, titles / 800 |
| --- | ---: | ---: |
| Salary cap | 59 (7.4%) | 60 (7.5%) |
| Classic | 91 (11.4%) | 94 (11.8%) |

Free formation raised median squad overall by 0.0 to 0.2 points across the decades. Both title rates stayed within the chosen target. This comparison measures this policy on these seeds, not the best possible play.

## The spin settings trade variety against strength

Lower `tau` sends more spins to the strongest squads, which makes a team stronger and the draws more repetitive. The tier guarantee keeps stars within reach when the weighting is flatter. The following earlier experiment used the manager-and-formation draw before club spells became the manager choices. Each row below is the same policy over 160 drafts, twenty seeds per decade:

| Draw rule | Capped titles | Classic titles | Clubs seen, capped | Most frequent club, capped |
| --- | ---: | ---: | ---: | --- |
| Previous release: `tau=3`, decade then club, no tier guarantee | 7 | 22 | 40 | Real Madrid, 14.1% of spins |
| `tau=20`, decade then club, no tier guarantee | 3 | 3 | 90 | Real Madrid, 9.5% |
| `tau=20`, one combined draw, tier guarantee (adopted) | 11 | 20 | 71 | Barcelona, 8.3% |
| `tau=40`, one combined draw, tier guarantee | 6 | 17 | 83 | Barcelona, 7.5% |

`tau=20` was then the flattest tested setting that kept both rule sets inside the title target. Over the full 320 drafts at that setting, 94 different clubs appeared under the cap and 91 under Classic, Barcelona was the most frequent at 8.6% of spins, and 57% of capped spins came from a club ranked in its decade's top ten, against 95% under the previous weighting. Barcelona and Real Madrid remain the most frequent because they hold 22 of the archive's 82 S-tier cards, and every capped squad needs two.

Chemistry later pushed Classic above the target ([below](#chemistry-made-every-measured-policy-stronger)), so the two settings were searched again with the season benchmark on two seed sets, 1000–1099 and 2000–2099: 1,600 drafts per rule set and setting. A setting's score is the smaller distance of its capped and Classic title rates from the nearer edge of the 5% to 15% band. Raising the rating a chemistry point adds, to 1.5 or 2, scored worse than spreading the draw, so chemistry stays at one rating point per point.

| `tau`, `rho` | Capped titles | Classic titles | Score |
| --- | ---: | ---: | ---: |
| 20, 1.5 (previous) | 9.6% | 16.6% | −1.6 |
| 60, 1.5 | 7.8% | 14.3% | 0.8 |
| 60, 2 (adopted) | 7.3% | 12.1% | 2.3 |
| 60, 3 | 6.1% | 10.8% | 1.1 |
| 100, 1.5 | 7.4% | 13.0% | 2.0 |
| 100, 2 | 6.8% | 11.6% | 1.8 |

The standard error of one rate over 800 drafts is about 1.2 percentage points, and the two seed sets differed by up to 2 points, so neighbouring settings are not distinguishable. `tau=60, rho=2` stayed inside the band on each seed set separately: 7.4% and 11.4%, then 7.1% and 12.9%. The flatter draw also spreads the spins. A club ranked in its decade's top ten now supplies 18% to 21% of unrestricted draws, against 40% to 44% at `tau=20`, and 30% to 34% of draws stay in the season's own decade, against 35% to 47%.

## Capped drafts always finished

Four pick policies each completed 320 capped drafts, one per seed and decade (seeds 1000 to 1039): the highest-rated legal card, the lowest-rated, the lowest tier first, which saves the S places for last, and a random legal card. None of the 1,280 drafts got stuck, and in all 6,400 spins the squad offered a player from the best tier still needed. On the same seed, each of the other three policies met the same club as the highest-rated policy on every first draw, 71% of second draws, 13% of third draws and 4% of fifth draws. The [salary cap rules](MODEL.md#the-salary-cap-limits-stars-across-the-whole-squad) give the supplier-club margin behind this result.

## Gauntlet survival depends on reward choices

This retained version 3 measurement uses the original all-era manager pool; the Gauntlet's rules remain available under More modes. The same drafting policy played forty Gauntlets under each set of rules, using seeds 500 through 539 and cycling the draft decades. Every run used Original Gauntlet, the shortest map: the 1960s, 1990s and 2010s. It took a prime-card boost only when at least five patience would remain after payment; otherwise it rested, or took an affordable development at full patience. After a won boss tie, it chose the two lowest-rated transfer offers from each decade. It released players as needed to free cap charges, then the lowest-rated remaining players, and never rearranged the lineup. It did not use free-agent rewards or market re-spins.

```text
node tests/balance.mjs gauntlet 40 5 cap original legacy
node tests/balance.mjs gauntlet 40 5 classic original legacy
```

The final argument selects the map; `back`, `odyssey` and `reverse` are also supported. The measurements below concern only `original`.

| Decades cleared | 0 | 1 | 2 | 3 |
| --- | ---: | ---: | ---: | ---: |
| Salary cap runs | 12 | 26 | 2 | 0 |
| Classic runs | 5 | 31 | 4 | 0 |

Both rule sets cleared a median of one decade and played a median of three boss ties. Median points per six-match round were ten under both rule sets. No run cleared all three decades.

Odyssey in Reverse became the browser default on 2026-10-18. With the career draft, this policy cleared no decade of it in 36 of 40 capped runs (median 7 points per round), against 8 of 40 on Original. The 2020s bosses are complete squads rated 91.6 to 92.8, while a career draft's fifteen had a median of 85.3 in the 2020s. Neither the nearby-decade pool alone nor a looser cap closed that gap: with no tier limit at all the median was 86.4, because five draws of three picks set the ceiling. The Gauntlet draft therefore also draws mostly the strongest squads (rank weight τ = 4) and allows 3 S and 6 A, which raised the median fifteen to 87.9. `node tests/balance.mjs gauntlet 40 5 cap <map>` drafts as the Gauntlet entry does and gives:

| Map, Salary cap | Decades cleared: runs | Median | Full clears |
| --- | --- | ---: | ---: |
| Odyssey in Reverse | 0: 4 · 1: 16 · 2: 10 · 3: 5 · 4: 1 · 8: 4 | 1 | 4 |
| Original Gauntlet | 1: 39 · 2: 1 | 1 | 0 |
| The Full Odyssey | 1: 17 · 2: 12 · 3: 6 · 4: 2 · 5: 1 · 6: 1 · 7: 1 | 2 | 0 |
| Back in Time | 0: 6 · 1: 20 · 2: 2 · 3: 12 | 1 | 12 |

Classic on Odyssey in Reverse cleared none in 1 run, one decade in 26 and all eight in 2. Original's second act, the 1990s, stops almost every run: a squad drafted for the 1960s loses rating across three decades. The policy never uses the market, rearranges the lineup or keeps its goalkeeper through transfers, so these rates describe it, not a human player.

Capped runs earn 1.5 times the score, as in Eraball. The opening capped draft carries three C-tier and two D-tier players; later signings can change those counts within the S- and A-tier limits. Fatigue and absences bring substitutes into matches. These results describe one reward and transfer policy on the shortest three-decade map under the current patience and opposition rules. They do not establish human success rates, the difficulty of the other maps, or the results of planning transfers, rearranging the lineup or choosing different rewards.

## Chemistry made every measured policy stronger

Commit `92cdd97` replaced proximity links with Ultimate Team chemistry. A link gave a starter one point for each teammate from the same club and decade within a pitch distance of 34, at most two. Chemistry gives a natural-position starter up to three points from club, nation and league. The single-club squads the drafted team plays earn chemistry too. To isolate the engine change, both columns below use the earlier drafting policy, which added the proximity points to a pick's value. The first column is commit `08bbf67`, which reproduces the earlier tables in this document exactly; the second is commit `b844ee4`, the last before this audit.

| Measurement, same seeds and policy | Proximity links | Chemistry |
| --- | ---: | ---: |
| Capped season titles / 800 | 54 | 70 |
| Classic season titles / 800 | 105 | 134 |
| Capped Gauntlets clearing 0 / 1 / 2 / 3 decades | 16 / 22 / 1 / 1 | 14 / 23 / 2 / 1 |
| Classic Gauntlets clearing 0 / 1 / 2 / 3 decades | 6 / 32 / 1 / 1 | 4 / 34 / 1 / 1 |
| Capped career objectives / league titles, of 300 seasons | 279 / 269 | 291 / 279 |
| Classic career objectives / league titles, of 300 seasons | 292 / 291 | 298 / 298 |

Chemistry favoured the drafted fifteen in every measurement. With the current policy, which values the chemistry a placement adds, and with career rivals' managers also counting towards chemistry, capped season titles reached 82 and Classic titles 131 of 800, above the 5% to 15% target. The spin settings were retuned to `tau=60` and `rho=2` to restore it; the tables above are measured under them.

## Career chemistry and listed positions changed the rival squads more than yours

On 2026-10-19 chemistry began counting former teammates, shared clubs and the manager who coached a player, the bundle gained a football nation for 10,870 more people, an unlisted position stopped rating as natural, and rival squads gained a line quota ([MODEL.md](MODEL.md#teammates-formation-and-the-manager)). The season tables above are re-measured with those rules; the formation-search, Gauntlet and career measurements in this document predate them and were not repeated.

| Measurement | Before (`0d751f9`) | After |
| --- | ---: | ---: |
| Capped season titles / 800 | 59 | 54 |
| Classic season titles / 800 | 91 | 100 |
| Rival chemistry, mean over decades' sides, 1980s to 2020s | 18.9 to 26.4 | 28.9 to 30.3 |
| Rival sides with a starter two or more positions out of place, 1980s to 2020s | 2 | 12 |
| Rival sides with such a starter, 1950s to 1970s | 55 | 40 |

The rival chemistry rows compare every archive club-decade side the career can field. Real squads were teammates by construction, so most now sit near the maximum of 33, against means of 12 to 15 for twelve drafts per decade picked by best placement and 13 to 19 for drafts that chased bonds. The chemistry thresholds stay EA's: lowering them raised the bond-seeking drafts by only one to one and a half points, because five draws of three picks limit how many teammates a draft can hold. The out-of-place count from the 1980s rose although the quota added defenders: before the position floor, flat and converted position ratings let forwards and midfielders play at the back at full strength, so the measure did not count them.

## Identifying the evidence and its limits

The match presentation regressions in `tests/engine/results-ui.test.mjs` reconcile displayed matches and goals with their saved records for the circuit, head to head, completed career seasons, Gauntlet history and older season replays. They also check every Gauntlet decade, home and away goal ownership, neutral venues and shootout score orientation. Completed-season history is checked after the next season starts.

`tests/browser/results.cjs` drives the actual play controls on desktop and phone. It checks both career halves, completed-season match history, circuit results after reload, both head-to-head legs, sandbox league and Cup results, and kickoff from an older replay. It also checks for horizontal page overflow. This suite runs in the browser workflow alongside the existing gameplay, Clubhouse, portrait and match-reveal checks. These are presentation and save-continuity checks; they do not measure historical accuracy or game balance.

[validation.json](../data/validation.json) names the exact bundle by its SHA-256 file fingerprint. [manifest.json](../data/manifest.json) records attribution and unresolved links, and [calibration.json](../data/calibration.json) records the goal fit and fixture coverage. The notebook calculates its counts and hash from the file it loads.

The browser workflow preserves fresh records in its `browser-checks` artifact. The portable commands above generate local records in the output folder you choose; machine-specific development artifacts are not part of the repository.

Early-era estimates extend a model fitted to engine-rated cards from 1989 to 2025. Their errors measure resemblance to those games' ratings, not real historical ability. Missing squad members, incorrect club-name joins, decade-wide membership and estimated positions can affect results. The shipped bundle retains the nearby-source boundary rule described in [DATA.md](DATA.md#the-source-label-explains-what-rated-a-card); the pipeline now measures distance from the full spell interval for future rebuilds. The regressions establish that selection rule, not a change to the bundled cards. Additional unmeasured effects are listed in [MODEL.md](MODEL.md#what-the-model-leaves-out).

The tests and reports under the [v1 tag](https://github.com/symonyeal/Ball-Knowledge/tree/v1) concern that earlier implementation. They do not establish the behavior of this engine.
