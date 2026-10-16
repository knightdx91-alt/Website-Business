-- The client's own domain is used as the site's address (canonical links, sitemap, QR codes) only once Cloudflare reports it
-- working; until then the site keeps its .pages.dev address. Set by the domain check in the minute cron (index.ts checkDomains).
ALTER TABLE leads ADD COLUMN domain_active INTEGER NOT NULL DEFAULT 0;
-- Domains connected before this column existed were already in use as the address.
UPDATE leads SET domain_active = 1 WHERE custom_domain IS NOT NULL AND pages_project IS NOT NULL;
