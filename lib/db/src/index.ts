import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:dummy@localhost:5432/postgres";
if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL environment variable is missing!");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
