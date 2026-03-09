import migration001 from "../../../../db/migrations/001_initial_schema.sql";
import migration002 from "../../../../db/migrations/002_indexes.sql";
import seedSql from "../../../../db/seed.sql";
import { D1Database } from "../types.js";

let initialized = false;

export const initDb = async (db: D1Database) => {
  if (initialized) {
    return;
  }
  initialized = true;
  await db.exec(migration001);
  await db.exec(migration002);
  await db.exec(seedSql);
};
