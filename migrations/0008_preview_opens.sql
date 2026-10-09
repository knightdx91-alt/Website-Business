-- When a prospect opens their shared preview (counted at most once per 30 minutes; team members don't count).
ALTER TABLE leads ADD COLUMN preview_opens INTEGER NOT NULL DEFAULT 0;
ALTER TABLE leads ADD COLUMN preview_opened_at INTEGER;
