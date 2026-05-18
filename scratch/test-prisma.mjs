import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
console.log("Connection string:", connectionString ? "Found" : "Missing");

const cleanConnectionString = connectionString
  ? connectionString.replace(/[?&]sslmode=[^&]+/g, "")
  : connectionString;

const pool = new pg.Pool({
  connectionString: cleanConnectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ["query", "error", "warn"],
});

async function main() {
  try {
    console.log("Connecting and running raw query...");
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Query raw result:", result);
    
    console.log("Fetching users count...");
    const usersCount = await prisma.users.count();
    console.log("Users count:", usersCount);
  } catch (error) {
    console.error("Test execution failed:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
