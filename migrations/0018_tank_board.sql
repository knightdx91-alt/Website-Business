-- Tank board (tankboard.ts): the client's own live price-list editor. client_key signs their link (null until first sent;
-- a new key revokes old links); prices_dirty asks the minute cron to republish a live site after the client edits.
ALTER TABLE leads ADD COLUMN client_key TEXT;
ALTER TABLE leads ADD COLUMN prices_dirty INTEGER NOT NULL DEFAULT 0;
