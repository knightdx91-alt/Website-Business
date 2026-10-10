-- Tap to Pay (in-person card payments from the Android app): the PaymentIntent behind a sign-up, how it was paid,
-- and the single-use nonce of the token handed to the native payment screen.
ALTER TABLE signups ADD COLUMN stripe_payment_intent TEXT;
ALTER TABLE signups ADD COLUMN paid_via TEXT;
ALTER TABLE signups ADD COLUMN tap_nonce TEXT;
