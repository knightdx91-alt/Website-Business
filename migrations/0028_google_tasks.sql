-- Google Tasks copies of a task (Oct 2026): {"<email>": "<Google task id>"} for each person it was put in Google Tasks for.
ALTER TABLE tasks ADD COLUMN gtasks_json TEXT;
