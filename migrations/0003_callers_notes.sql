-- Caller accounts (limited access for whoever makes the sales calls).
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  disabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- Call log and notes per lead.
CREATE TABLE lead_notes (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  author TEXT NOT NULL,
  outcome TEXT,
  body TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX lead_notes_by_lead ON lead_notes (lead_id, created_at);

-- Follow-up date (YYYY-MM-DD, Cullman time) and when the business was last called.
ALTER TABLE leads ADD COLUMN follow_up TEXT;
ALTER TABLE leads ADD COLUMN last_contact INTEGER;
CREATE INDEX leads_by_follow_up ON leads (follow_up);
