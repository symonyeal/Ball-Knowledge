# Account-free expansion

The owner selected account-free hosting and requested the complete football
adaptation on 18 October 2026. The game remains a static GitHub Pages site.

REA 6.7.0 was invoked through its MCP stdio server to capture Era Ball's public
home, sandbox, statistics, achievements, collection, settings, leaderboard and
mini-games in temporary Edge profiles. Captures and their Evidence IDs are local
in ignored `work/rea-*.json`; `work/rea-findings.md` records the comparison.
The reference is [Era Ball](https://eraball.com/), with its
[player database](https://eraball.com/players) and [mini-games](https://eraball.com/mini).
The captures establish public interface behaviour, not private backend rules.
The first network capture exhausted its event budget, and the shared leaderboard
was still loading. No accounts or shared scores were created.

## Feature mapping

| Reference | Football game |
| --- | --- |
| Unrestricted sandbox | Fifteen distinct footballers, any formation/manager/era, seeded random completion, league and Cup simulation, squad JSON and Classic team codes |
| Player database | All bundled club-era cards, six filters, source explanations, position ratings and three pinned comparisons |
| Lifetime statistics | Distinct completed drafts and league seasons, W–D–L, goals, trophies, favourite players, mode/era filters and mini-game statistics |
| Leaderboards | Personal records only; sandbox and practice results remain separate |
| Achievements | Visible conditions for draft, season, trophy, era, cap, Gauntlet, collection and daily-puzzle milestones |
| Card collection | Exact person–club–decade identity; a trophy in a completed career season unlocks its final squad's cards |
| Daily Card | Fifteen guesses; club, club country, decade direction, position overlap and tier clues |
| Higher or Lower | Fifteen comparisons of base overall ratings, one life; equal ratings count as correct |
| Franchise Roulette | Squad Recall: 120 seconds, five correct names to win, S/A/B/C/D cards worth 1/2/3/4/5 points |
| State Hunt | Career Trail: five people, choose all clubs represented in their archive cards, three correct rounds to win |
| Daily/unlimited variants | Local-date daily seed and saved result, independent practice seeds, current/best daily streaks |
| Weekly rewind | Current week plus twelve previous ISO-week seeds, using existing Salary cap drafts |
| Settings | Day/night appearance, backdrop, motion, compact lists, roster sort, optional procedural stadium ambience and profile backups |

## State and evidence

`app/archive.js` implements archive filters and sandbox invariants. A formation
change reuses the existing assignment algorithm and preserves every card and
bench place. Sandbox season simulations use the existing league/Cup engine and
the same decade fields as the legacy season, not the real-league career. These
experiments do not grant career achievements or collection cards.

`app/minis.js` defines deterministic puzzles. The date is the browser's local
calendar date; streak arithmetic uses calendar dates rather than elapsed hours.
Squad Recall retains its original deadline. Saved guesses are replayed on import
to reconstruct the result; imported target, score and win flags are not trusted.
Card ratings include estimated sources, which remain labelled. Career Trail
tests archive membership, not a complete historical career. Daily Card's country
clue refers to the club, not the player's nationality.

`app/profile.js` records completed event identities and derives progress. The
identity includes draft seed, era, rules, weekly identifier, manager, formation
and all fifteen original cards. Each career season adds its year; circuits add
their event count and Gauntlets their map and log position. Reloads and identical
replays do not increment these records. Personal head-to-head records identify
the seeded result with a 32-bit hash; they are not authenticated online results.
Profiles imported from older completed careers can reconstruct league totals;
they do not invent past squads to grant collection cards. Career league totals
exclude cup matches. Gauntlet boss results count as ties, with no goal totals;
regular Gauntlet segments are not included in these personal match totals.

The versioned profile uses local storage key `football-era-draft-profile-v1`.
The existing draft/career key and replay format are unchanged. Profile import
validates all data before replacing progress, and profile reset remembers cleared
event identities so the active save cannot immediately repopulate its old totals.
Profile JSON and active-career replay JSON are separate backups. Browser storage
limits still apply; a failed write displays a request to export a backup.

No source bundles, artwork, audio tracks or data from Era Ball are shipped.
Stadium ambience is generated locally and plays only after a user gesture.

## Validation

`node --test tests/engine/*.test.mjs` includes certificates for distinct sandbox
people, natural-position completion, formation preservation, deterministic puzzle
reconstruction, deadlines, calendar streaks, event deduplication, exact collection
identity and profile import rejection.

`tests/browser/clubhouse.cjs` checks every section at desktop and phone widths,
archive controls, sandbox simulation and JSON round trips, daily resumption,
all four puzzles, separate practice, settings, backup import, malformed imports
and archived weekly drafts. The existing browser acceptance suite continues to
cover drafting, careers, Gauntlet, circuits, transfers and keyboard interaction.
