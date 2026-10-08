-- Team members with full access (same as the owner, under their own name and password).
ALTER TABLE users ADD COLUMN admin INTEGER NOT NULL DEFAULT 0;
