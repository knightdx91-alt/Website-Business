-- "Report this" from either app: what screen, what step, what the app said, and the phone. The owner reads them in
-- Settings → Problems (GET /api/problems) and marks them handled.
CREATE TABLE IF NOT EXISTS problem_reports (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  user_id TEXT,
  user_name TEXT,
  -- web · android
  app TEXT NOT NULL,
  screen TEXT,
  step TEXT,
  message TEXT NOT NULL,
  detail TEXT,
  device TEXT,
  lead_id TEXT,
  -- open · done
  status TEXT NOT NULL DEFAULT 'open',
  done_at INTEGER
);
CREATE INDEX IF NOT EXISTS problem_reports_open ON problem_reports (status, created_at);
