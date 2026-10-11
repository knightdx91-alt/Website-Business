-- Training course progress (🎓 Training): which lessons each person has marked done. user_id is 'owner' or users.id.
CREATE TABLE training_done (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  done_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);
