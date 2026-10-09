-- Online checkout: what was picked with a sign-up (extras, total), website orders (lead_id 'web'), and extras bought later.
ALTER TABLE signups ADD COLUMN extras_json TEXT;
ALTER TABLE signups ADD COLUMN due_cents INTEGER;
ALTER TABLE signups ADD COLUMN source TEXT;
ALTER TABLE signups ADD COLUMN business TEXT;
ALTER TABLE signups ADD COLUMN phone TEXT;
ALTER TABLE signups ADD COLUMN stripe_session TEXT;
CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  items_json TEXT NOT NULL,
  due_cents INTEGER NOT NULL,
  paid INTEGER NOT NULL DEFAULT 0,
  stripe_session TEXT,
  stripe_customer TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX purchases_by_lead ON purchases (lead_id, created_at);
