# The app review as a public page

https://ua-app-review.knightdx91.workers.dev is the team-facing version of `research/app-review-2026.md`, served by its own
static-assets Worker (`ua-app-review`), no sign-in, `noindex`. The editable copy lives in Claude Docs ("App Review, October 2026").

Update it: edit `src/review.md`, then **from this folder** (never from the repo root: the app's wrangler.jsonc would be deployed
under this name and take the custom domains with it, which happened once on 13 Oct 2026):

```
cd research/app-review-page
node build.mjs src/review.md out
../../node_modules/.bin/wrangler deploy
```

`out/` is generated and ignored.
