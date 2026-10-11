-- Usage meter: one row per day and metric (places.search, anthropic.<model>.in, email.sent …), summed by the Costs screen.
CREATE TABLE IF NOT EXISTS usage_daily (
  day TEXT NOT NULL,
  metric TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric)
);
