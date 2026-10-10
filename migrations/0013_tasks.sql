-- Team tasks (Tasks screen), optionally tied to a lead and mirrored to the owner's calendar as invites.
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  due TEXT,                 -- YYYY-MM-DD in Cullman time, optional
  due_time TEXT,            -- HH:MM (24 h), optional; needs due
  assignee TEXT,            -- 'owner', a users.id, or NULL = anyone
  lead_id TEXT,
  created_by TEXT NOT NULL, -- 'owner' or users.id
  created_by_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  done_at INTEGER,
  done_by_name TEXT,
  cal_uid TEXT,             -- iCalendar UID once an invite went to the owner's calendar
  cal_seq INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX tasks_open ON tasks (done_at, due);
CREATE INDEX tasks_by_lead ON tasks (lead_id);
