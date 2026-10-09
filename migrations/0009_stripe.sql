-- Stripe webhook: links a sign-up to its Stripe customer/subscription, and remembers handled events (Stripe retries).
ALTER TABLE signups ADD COLUMN stripe_customer TEXT;
ALTER TABLE signups ADD COLUMN stripe_subscription TEXT;
CREATE INDEX signups_by_customer ON signups (stripe_customer);
CREATE TABLE stripe_events (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
