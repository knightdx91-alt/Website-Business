-- Time clock (Oct 2026): hourly pay per team member and clock-in / clock-out entries.
ALTER TABLE users ADD COLUMN hourly_cents INTEGER;

CREATE TABLE time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,          -- users.id ('owner' if the owner ever clocks in)
  user_name TEXT,
  clock_in INTEGER NOT NULL,      -- epoch ms
  clock_out INTEGER,              -- NULL while on the clock
  note TEXT,
  rate_cents INTEGER,             -- hourly pay when this entry started, so later raises don't rewrite old weeks
  edited_by TEXT,                 -- name of whoever changed the times by hand
  edited_at INTEGER,
  reminded INTEGER NOT NULL DEFAULT 0, -- the "still clocked in?" alert went out
  created_at INTEGER NOT NULL
);
CREATE INDEX time_entries_user ON time_entries (user_id, clock_in);
CREATE INDEX time_entries_in ON time_entries (clock_in);
-- One open entry per person.
CREATE UNIQUE INDEX time_entries_open ON time_entries (user_id) WHERE clock_out IS NULL;
