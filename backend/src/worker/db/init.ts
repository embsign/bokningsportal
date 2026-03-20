import migration001 from "../../../../db/migrations/001_initial_schema.sql";
import migration002 from "../../../../db/migrations/002_indexes.sql";
import seedSql from "../../../../db/seed.sql";
import { D1Database } from "../types.js";

let initialized = false;
let initializationPromise: Promise<void> | null = null;

export const initDb = async (db: D1Database) => {
  if (initialized) {
    return;
  }
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  initializationPromise = (async () => {
    const schemaExists = await db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'tenants'")
      .bind()
      .first();

    if (!schemaExists) {
      await db.exec(migration001);
      await db.exec(migration002);
    }

    const demoTenantExists = await db.prepare("SELECT id FROM tenants WHERE id = ?").bind("demo-brf").first();
    if (!demoTenantExists) {
      await db.exec(seedSql);
    }

    initialized = true;
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
};
