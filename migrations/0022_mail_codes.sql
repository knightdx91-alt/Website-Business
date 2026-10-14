-- Flyer codes (Oct 2026): a 5-digit code per lead, handwritten on a mailed or left-behind flyer;
-- undergroundassociates.com/code opens that business's sample site.
ALTER TABLE leads ADD COLUMN mail_code TEXT;
ALTER TABLE leads ADD COLUMN mail_code_at INTEGER;
ALTER TABLE leads ADD COLUMN mail_opened_at INTEGER;
ALTER TABLE leads ADD COLUMN mail_opens INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS leads_mail_code ON leads(mail_code) WHERE mail_code IS NOT NULL;
