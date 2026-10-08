-- What team members (and customers, through sign-ups and site forms) do, for the Notifications tab and phone pushes.
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  actor_id TEXT,
  actor_name TEXT,
  kind TEXT NOT NULL,
  lead_id TEXT,
  text TEXT NOT NULL
);
CREATE INDEX events_created ON events (created_at);
-- When each person last opened Notifications ("owner" for the owner).
CREATE TABLE notif_seen (user_id TEXT PRIMARY KEY, seen_at INTEGER NOT NULL);
-- Phones that asked for push notifications. Pushes carry no data; the phone fetches what's new.
CREATE TABLE push_subs (endpoint TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at INTEGER NOT NULL);
