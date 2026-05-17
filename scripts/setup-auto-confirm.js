import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pure Node.js zero-dependency .env parser
function loadEnv() {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const equalIdx = trimmed.indexOf("=");
    if (equalIdx === -1) return;
    const key = trimmed.substring(0, equalIdx).trim();
    let val = trimmed.substring(equalIdx + 1).trim();
    // Strip quotes if present
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL is not defined in your .env file!");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });

async function main() {
  console.log("Connecting to Supabase Database to setup Auto-Confirm Trigger...");
  
  const client = await pool.connect();
  
  try {
    // 1. Create the auto-confirm function in public schema
    console.log("Creating auto_confirm_user trigger function...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.auto_confirm_user()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.email_confirmed_at = NOW();
          NEW.confirmed_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    
    // 2. Attach trigger to auth.users table
    console.log("Attaching tr_auto_confirm_user trigger to auth.users table...");
    await client.query(`
      DROP TRIGGER IF EXISTS tr_auto_confirm_user ON auth.users;
      CREATE TRIGGER tr_auto_confirm_user
      BEFORE INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_confirm_user();
    `);
    
    console.log("\n🚀 SUCCESS: Auto-confirm trigger created perfectly!");
    console.log("All future signups will now be automatically marked as confirmed at the database level instantly!");
  } catch (err) {
    console.error("Failed to setup trigger:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
