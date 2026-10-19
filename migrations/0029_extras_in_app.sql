-- Extras added and paid in the app (Oct 2026): tap or card sheet on the team's phone, like a sign-up.
ALTER TABLE purchases ADD COLUMN stripe_payment_intent TEXT;
ALTER TABLE purchases ADD COLUMN paid_via TEXT;
ALTER TABLE purchases ADD COLUMN tap_nonce TEXT;
ALTER TABLE purchases ADD COLUMN added_by TEXT;
