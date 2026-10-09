-- Review fixes (Oct 2026): who to ask for and when, on each lead.
ALTER TABLE leads ADD COLUMN contact TEXT;
ALTER TABLE leads ADD COLUMN best_time TEXT;
-- When the lead was marked Shown, so follow-ups can run on a cadence (day 2 call, day 5 text, day 10 walk-in, day 21 last text).
ALTER TABLE leads ADD COLUMN shown_at INTEGER;
UPDATE leads SET shown_at = COALESCE((SELECT MAX(n.created_at) FROM lead_notes n WHERE n.lead_id = leads.id AND n.outcome = 'shown'), last_contact, updated_at)
  WHERE sales_status IN ('shown', 'sold', 'live') AND shown_at IS NULL;
-- Monthly extras bought later are their own Stripe subscription; remember it so a cancellation unmarks the right thing.
ALTER TABLE purchases ADD COLUMN stripe_subscription TEXT;
CREATE INDEX IF NOT EXISTS stripe_events_created ON stripe_events (created_at);
