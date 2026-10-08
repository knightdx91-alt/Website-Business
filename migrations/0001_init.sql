CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  categories TEXT NOT NULL,
  cap INTEGER NOT NULL,
  queued INTEGER NOT NULL DEFAULT 0,
  searches_total INTEGER NOT NULL DEFAULT 0,
  searches_done INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running'
);

CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL UNIQUE,
  run_id TEXT,
  category TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  rating REAL,
  review_count INTEGER,
  presence TEXT,
  reason TEXT,
  score REAL NOT NULL DEFAULT 0,
  -- pipeline: queued | building | ready | failed | expired
  status TEXT NOT NULL,
  -- sales: new | shown | sold | live
  sales_status TEXT NOT NULL DEFAULT 'new',
  place_json TEXT,
  record_json TEXT,
  copy_json TEXT,
  look TEXT,
  lint_json TEXT,
  error TEXT,
  rewrite INTEGER NOT NULL DEFAULT 0,
  pages_project TEXT,
  live_url TEXT,
  published_at INTEGER,
  fetched_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX leads_run ON leads (run_id);
CREATE INDEX leads_list ON leads (status, score DESC);
CREATE INDEX leads_sales ON leads (sales_status);

CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  data_json TEXT NOT NULL,
  ip TEXT,
  unverified INTEGER NOT NULL DEFAULT 0,
  read INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX submissions_lead ON submissions (lead_id, created_at DESC);

CREATE TABLE usage (
  day TEXT PRIMARY KEY,
  places_requests INTEGER NOT NULL DEFAULT 0,
  photo_requests INTEGER NOT NULL DEFAULT 0,
  ai_input INTEGER NOT NULL DEFAULT 0,
  ai_output INTEGER NOT NULL DEFAULT 0,
  ai_cost_microdollars INTEGER NOT NULL DEFAULT 0
);
