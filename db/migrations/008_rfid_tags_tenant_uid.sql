-- Make RFID uniqueness tenant-scoped instead of global.
CREATE TABLE IF NOT EXISTS rfid_tags_v2 (
  uid TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, uid),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT OR REPLACE INTO rfid_tags_v2 (uid, tenant_id, user_id, is_active)
SELECT uid, tenant_id, user_id, is_active
FROM rfid_tags;

DROP TABLE rfid_tags;
ALTER TABLE rfid_tags_v2 RENAME TO rfid_tags;

CREATE INDEX IF NOT EXISTS idx_rfid_tags_tenant_uid ON rfid_tags(tenant_id, uid);
