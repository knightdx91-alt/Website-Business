-- Referral program: which client sent a lead, and the credits a referrer earns (2 months free per qualifying referral,
-- capped per year, the rest banked). Founding-customer picks live in signups.extras_json ("founder").
ALTER TABLE leads ADD COLUMN referred_by TEXT;
CREATE TABLE IF NOT EXISTS referral_credits (
  id TEXT PRIMARY KEY,
  referrer_lead_id TEXT NOT NULL,
  referred_lead_id TEXT NOT NULL,
  signup_id TEXT,
  months INTEGER NOT NULL,
  -- banked (waiting for a year with room, or for the referrer to be a paying client) · applied (Stripe account credit) ·
  -- by_hand (no Stripe customer: the owner applies it on the next invoice, then marks it applied)
  status TEXT NOT NULL DEFAULT 'banked',
  applied_year INTEGER,
  applied_at INTEGER,
  stripe_ref TEXT,
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS referral_credits_referrer ON referral_credits (referrer_lead_id, status);
CREATE INDEX IF NOT EXISTS referral_credits_referred ON referral_credits (referred_lead_id);
