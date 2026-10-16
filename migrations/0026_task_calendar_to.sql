-- Task invites go to everyone the task is for (Oct 2026): the addresses that currently hold the invite, comma-joined, so a
-- change re-sends to them, a person taken off gets a cancel, and a person added gets the invite. NULL on older rows = the
-- owner's calendar email (the only one invited before).
ALTER TABLE tasks ADD COLUMN cal_to TEXT;
