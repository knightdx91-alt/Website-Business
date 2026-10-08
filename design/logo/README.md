# Underground Associates logo

Chosen direction: **05 · Seal**. "UNDERGROUND ASSOCIATES" over the top, "CULLMAN, ALABAMA" along the bottom,
UA with a gold bar and EST. 2021 in the middle. Navy `#14213d`, gold `#fca311`, white. Lettering is
Bricolage Grotesque 800 (UA, "Underground") and DM Sans 700 (ring text, "ASSOCIATES"), all converted to
outlines, so the SVG and PDF files scale to any size (business cards, signs, shirts) without blurring.

- `underground-associates-icon-*.svg`: the seal on its own (the main logo); `icon-primary.pdf` is vector for print
- `underground-associates-horizontal-*.svg`: seal + "Underground / ASSOCIATES", for wide spaces
- `underground-associates-stacked-*.svg`: seal over the wordmark
- `profile-photo.svg`: seal on a full navy square with margin, for circle-cropped profile photos
- `business-card-front.svg`: 3.5 x 2 in card front with 0.125 in bleed (file is 3.75 x 2.25 in)
- Colorways: `primary` (navy seal), `reverse` (for navy/dark backgrounds), `outline` (no fill: navy lines and
  gold ring, for light paper, engraving, embroidery), `black` and `white` (one-color print)
- `concepts-review-sheet.png`: the five directions that were considered

Regenerate (SVG + vector PDF + PNG up to 4096 px + ready-to-use files):
`npx tsx scripts/logo.mts package <outDir> 05-seal`. Business card, back side with contact details:
`npx tsx scripts/logo.mts card <outDir> '{"name":"…","title":"…","phone":"…","email":"…"}'`.
Minimum size: 0.75 in / 64 px wide (the ring text needs it). Smaller than that (browser tabs), use the
seal's center only or the 03 Tunnel U mark.
