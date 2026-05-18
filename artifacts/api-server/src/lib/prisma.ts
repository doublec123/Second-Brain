import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const isLocal = connectionString?.includes("localhost") || connectionString?.includes("127.0.0.1");

// Clean connection string by removing sslmode parameters so we can override it programmatically
const cleanConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=[^&]+/g, "")
  : connectionString;

const pool = new pg.Pool({
  connectionString: cleanConnectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: ["error", "warn"],
});
export default prisma;


