# Statewise

A daily map quiz about India's 28 states and 8 union territories. Play at https://anjaliverma01.github.io/statewise/ — no sign-in needed.

Each day has three different places, each with three progressively easier clues. Correct answers earn 500, 300, or 100 points; daily maximum 1,500. Each question has its own two-minute timer. Revealed clues remain open in amber, blue and purple; map answer popups last about a second, and the final answer remains dark green.

The initial editorial cycle contains 36 question sets / 108 clues over 12 days, covering every state and union territory once. `questions.json` assigns explicit daily sets; it never cycles old questions when the schedule ends. Daily sets use the player's local calendar date, and progress is stored only in their browser. There are no shared accounts or leaderboards.

See [QUESTION_BANK.md](QUESTION_BANK.md) for the append-only history, fact deduplication and replenishment rules. A scheduled Codex check adds new researched batches before the calendar runs out; it requires the owner's computer and desktop app to be available. Already scheduled questions are served by GitHub Pages independently of that computer.

## Development

No dependency installation or build is required. Serve this directory with `python3 -m http.server 4173`. In the desktop working copy, serve `dist/` instead.

Run `node scripts/validate-bank.cjs`, `node --test tests/game-core.test.cjs`, and `node scripts/check-bank.cjs` to validate the bank, test the game rules, and inspect the publication horizon. The first two checks also run on GitHub Actions. Future updates must compare against a saved previous questions.json to verify that historical clues and daily assignments were not overwritten.

## Sources and map credits

Every answer reveal includes HTTPS source links. Map data: [udit-001/india-maps-data](https://github.com/udit-001/india-maps-data), merged from district geometries and simplified for this educational game. The map is for general reference, not surveying. Fonts: DM Sans and Libre Caslon Display via Google Fonts.
