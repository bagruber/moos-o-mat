# Moos-O-Mat

> **Archived.** The 2026 local election is over and the answers are frozen.
> The tool stays online at
> [bagruber.github.io/moos-o-mat](https://bagruber.github.io/moos-o-mat/).


A small voting advice tool for the 2026 local elections in Moosburg a.d. Isar, Bavaria. Think Wahl-O-Mat, but local.

## What is this?

This is a volunteer side project put together by a few people from across the political spectrum who thought Moosburg deserved its own election compass. It's not affiliated with any party or the city itself — just a handful of locals who wanted to make it a little easier to figure out which parties align with your views before heading to the polls.

We reached out to all parties running in Moosburg, gave them a set of 36 questions on local issues (traffic, housing, digitisation, culture, climate, etc.), and built this tool around their answers.

## How it works

- 36 questions, randomised order
- Answer Ja / Neutral / Nein, or skip anything you don't care about
- Optionally double-weight the topics that matter most to you
- Get a match percentage for each participating party, with full breakdowns and the parties' own explanations

Everything runs locally in your browser. No data is collected, no backend, no cookies.

## Tech

```bash
pnpm install
pnpm dev
pnpm build     # writes dist/index.html
```

The build still produces **one self-contained file** — that part hasn't changed, only how it gets there. `vite-plugin-singlefile` inlines the JS, the CSS and the three woff2 subsets as `data:` URIs, so the archived page makes no external requests at all. Nothing to go missing from someone else's CDN in a few years. `base: "./"` keeps the paths relative, so the same build serves from `/moos-o-mat/` on GitHub Pages and `/archiv/moos-o-mat/` on moosburg.eu.

| File | Role |
|---|---|
| `src/daten.js` | Questions, party answers, explanations. Frozen. |
| `src/app.jsx` | UI and scoring. |
| `src/index.css` | Design tokens, fonts, animations. |
| `src/fonts/` | Latin subsets of Playfair Display and Inter. |

Colours, fonts and radii come from [`moosburg-design`](https://github.com/bagruber/moosburg-design) as a dependency. Two deliberate deviations, both commented in the code: no Tailwind (the UI uses React style objects, so `css/tokens.css` is imported instead of the Tailwind theme), and fonts vendored locally rather than via `@fontsource` (Inter's variable package has no latin-only entry point, so `wght.css` would have dragged Cyrillic, Greek and Vietnamese into the single file). The nine topic colours are darkened against the rainbow stripe — `rb-3`, `rb-4` and `rb-6` are area colours and don't reach 4.5:1 as a small kicker. Every pair in use is checked against WCAG 2.1 AA.

Deployment runs through GitHub Actions on push to `main`, with *Settings → Pages* set to **GitHub Actions**. Note that this repository is archived, and archived repositories don't run workflows — so the workflow sits idle by design. Rebuilding means unarchiving, pushing, waiting for the deploy to finish, and archiving again.

## Participating parties

CSU, Freie Wähler, Grüne, SPD, FRESH, Die Linke. The AfD was invited but did not submit answers in time.

## Disclaimer

This tool is **not a voting recommendation**. The answers and reasoning for each party were submitted by the parties themselves — we just built the wrapper. Please use this as one input among many when making up your mind.

## Contributors

Built voluntarily by Benedict Aria Gruber, Philipp Fincke, Kilian Linz and Stefan John. Reach out if you have questions or spot something that needs fixing.
