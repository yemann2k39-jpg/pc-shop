import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";
import { DEFAULT_DB_PATH } from "./paths";

const dbPath = process.env.DATABASE_PATH ?? path.resolve(DEFAULT_DB_PATH);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Cache the connection on globalThis so dev-server HMR does not open a new
// SQLite connection (and a new WAL) on every module reload.
const globalForDb = globalThis as unknown as { __pcShopSqlite?: Database.Database };

const sqlite = globalForDb.__pcShopSqlite ?? new Database(dbPath);
globalForDb.__pcShopSqlite = sqlite;

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export { schema };
