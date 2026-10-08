-- Run options (wider area, outdated-website leads).
ALTER TABLE runs ADD COLUMN options_json TEXT;

-- Where the business is (from Google; cleared when the lead expires), for walk-in routes.
ALTER TABLE leads ADD COLUMN lat REAL;
ALTER TABLE leads ADD COLUMN lng REAL;
-- The client's own domain once attached to their Pages project.
ALTER TABLE leads ADD COLUMN custom_domain TEXT;
UPDATE leads SET lat = json_extract(place_json, '$.location.latitude'), lng = json_extract(place_json, '$.location.longitude') WHERE place_json IS NOT NULL;

-- Client sign-ups: what they agreed to, when, and who sent the link.
CREATE TABLE signups (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  terms TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_title TEXT,
  signer_email TEXT,
  sent_by TEXT,
  ip TEXT,
  user_agent TEXT,
  paid INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX signups_by_lead ON signups (lead_id, created_at);

-- Daily visit counts for live client sites (no cookies, no personal data).
CREATE TABLE site_stats (
  lead_id TEXT NOT NULL,
  day TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  calls INTEGER NOT NULL DEFAULT 0,
  directions INTEGER NOT NULL DEFAULT 0,
  texts INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (lead_id, day)
);
