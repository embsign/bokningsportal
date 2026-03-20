import migration001 from "../../../../db/migrations/001_initial_schema.sql";
import migration002 from "../../../../db/migrations/002_indexes.sql";
import migration003 from "../../../../db/migrations/003_full_day_times.sql";
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

    const fullDayStartColumn = await db
      .prepare("SELECT name FROM pragma_table_info('booking_objects') WHERE name = ?")
      .bind("full_day_start_time")
      .first();
    if (!fullDayStartColumn) {
      await db.exec(migration003);
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
