# Underground Associates logo

Chosen direction: **03 · Tunnel U + pin** (a heavy U, for Underground, holding a gold map pin, for local).
Navy `#14213d`, gold `#fca311`, white. Wordmark: Bricolage Grotesque 800 ("Underground") over
DM Sans 700 tracked 0.36em ("ASSOCIATES"), all converted to outlines.

- `underground-associates-horizontal-*.svg`: symbol + wordmark, for headers, letterhead, email
- `underground-associates-stacked-*.svg`: symbol over wordmark, for square spaces
- `underground-associates-icon-*.svg`: symbol tile, for app icons and favicons
- `profile-photo.svg`: symbol with extra margin on a full square, for circle-cropped profile photos
- Colorways: `primary` (on white), `reverse` (on navy/dark), `black` and `white` (one-color print)
- `concepts-review-sheet.png`: the five directions that were considered

Regenerate everything (SVG + PNG sizes + ready-to-use files):
`npx tsx scripts/logo.mts package <outDir> 03-tunnel-u` (concept sheet: `npx tsx scripts/logo.mts concepts <outDir>`).
Minimum sizes: symbol 16 px; horizontal lockup 120 px wide on screen, 1 inch in print.
