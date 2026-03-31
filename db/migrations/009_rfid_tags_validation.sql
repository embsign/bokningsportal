-- Enforce tenant-scoped RFID keys and strict UID validation.
CREATE TABLE IF NOT EXISTS rfid_tags_v3 (
  uid TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id, uid),
  CHECK (uid = UPPER(uid)),
  CHECK (uid NOT GLOB '*[^0-9A-F]*'),
  CHECK (LENGTH(uid) >= 4),
  CHECK (LENGTH(REPLACE(uid, '0', '')) >= 1),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT OR REPLACE INTO rfid_tags_v3 (uid, tenant_id, user_id, is_active)
SELECT
  UPPER(LTRIM(uid, '0')) AS uid,
  tenant_id,
  user_id,
  is_active
FROM rfid_tags
WHERE uid IS NOT NULL
  AND TRIM(uid) <> ''
  AND UPPER(TRIM(uid)) NOT GLOB '*[^0-9A-F]*'
  AND LENGTH(UPPER(LTRIM(TRIM(uid), '0'))) >= 4
  AND LENGTH(REPLACE(UPPER(LTRIM(TRIM(uid), '0')), '0', '')) >= 1;

DROP TABLE rfid_tags;
ALTER TABLE rfid_tags_v3 RENAME TO rfid_tags;

CREATE INDEX IF NOT EXISTS idx_rfid_tags_tenant_uid ON rfid_tags(tenant_id, uid);
