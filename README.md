# WahlKompass Moosburg 🗳️

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

A single self-contained `index.html` file. React via CDN, Babel in the browser. No build step, no dependencies to install — just open the file or deploy it to GitHub Pages as-is.

## Participating parties

CSU, Freie Wähler, Grüne, SPD, FRESH, Die Linke. The AfD was invited but did not submit answers in time.

## Disclaimer

This tool is **not a voting recommendation**. The answers and reasoning for each party were submitted by the parties themselves — we just built the wrapper. Please use this as one input among many when making up your mind.

## Contributors

Built voluntarily by Benedict Aria Gruber, Philipp Fincke, Kilian Linz and Stefan John. Reach out if you have questions or spot something that needs fixing.
