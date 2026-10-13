# Tap the Tank to Pay, as a public page

https://ua-tank-pay.knightdx91.workers.dev is the plan (not built) for King Fish customers paying at the tank, served by its own
static-assets Worker (`ua-tank-pay`), no sign-in, `noindex`. Update: edit `src/plan.md`, then from this folder (never the repo root):

```
cd research/tank-pay-page
node build.mjs src/plan.md out
../../node_modules/.bin/wrangler deploy
```
