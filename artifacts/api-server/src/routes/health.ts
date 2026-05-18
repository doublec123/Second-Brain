import { Router } from "express";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasSupabaseJwtSecret: !!process.env.SUPABASE_JWT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
  });
});

export default router;
