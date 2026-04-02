-- Säkerställ setup-salt via deploy-migration (ingen runtime-init krävs).
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO app_config (key, value)
VALUES ('setup_link_salt', lower(hex(randomblob(16))));
