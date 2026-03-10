DELETE FROM access_tokens
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM access_tokens
  GROUP BY user_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_access_tokens_user_unique ON access_tokens(user_id);
