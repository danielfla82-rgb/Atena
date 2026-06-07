ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS tec_link_comment TEXT;
ALTER TABLE notebooks ADD COLUMN IF NOT EXISTS extra_tec_notebooks JSONB DEFAULT '[]'::jsonb;
