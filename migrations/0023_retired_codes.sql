-- Flyer codes of deleted leads are retired for good, so an old flyer can never open a different business's sample.
CREATE TABLE IF NOT EXISTS retired_codes (code TEXT PRIMARY KEY, retired_at INTEGER NOT NULL);
