-- E-signatures: the drawn signature with every sign-up, and the agreement + signature for extras bought later.
ALTER TABLE signups ADD COLUMN signature TEXT;
ALTER TABLE purchases ADD COLUMN terms TEXT;
ALTER TABLE purchases ADD COLUMN signer_name TEXT;
ALTER TABLE purchases ADD COLUMN signer_email TEXT;
ALTER TABLE purchases ADD COLUMN signature TEXT;
ALTER TABLE purchases ADD COLUMN ip TEXT;
ALTER TABLE purchases ADD COLUMN user_agent TEXT;
