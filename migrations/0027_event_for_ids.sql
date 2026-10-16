-- People an alert is specifically for (comma-joined user ids, "owner" for the owner): they always see it and get the phone
-- notification, whatever their alert mode. Used for tasks assigned to someone (Oct 2026).
ALTER TABLE events ADD COLUMN for_ids TEXT;
