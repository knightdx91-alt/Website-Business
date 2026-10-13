# The commission & pay plan as a public page

https://ua-commission-plan.knightdx91.workers.dev is a draft plan for the team (commission, team pool, two owner models, split
sales), served by its own static-assets Worker (`ua-commission-plan`), no sign-in, `noindex`.

Update it: edit `src/plan.md`, then **from this folder** (never from the repo root: the app's wrangler.jsonc would be deployed
under this name and take the custom domains with it):

```
cd research/commission-page
node build.mjs src/plan.md out
../../node_modules/.bin/wrangler deploy
```

`out/` is generated and ignored.
