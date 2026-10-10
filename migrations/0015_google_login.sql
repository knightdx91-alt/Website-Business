-- Google sign-in: team members are matched by their company Google address.
ALTER TABLE users ADD COLUMN email TEXT;
CREATE INDEX IF NOT EXISTS users_by_email ON users (email);
