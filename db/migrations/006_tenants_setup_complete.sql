ALTER TABLE tenants ADD COLUMN is_setup_complete INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tenants_setup_complete ON tenants(is_setup_complete);
