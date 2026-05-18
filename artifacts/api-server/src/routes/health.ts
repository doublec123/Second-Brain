import { Router } from "express";

const router = Router();

router.get("/healthz", (_req, res) => {
  res.json({
    status: "ok",
    hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
    hasSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    hasSupabaseJwtSecret: !!process.env.SUPABASE_JWT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasOpenAiKey: !!process.env.OPENAI_API_KEY,
    hasAiIntegrationsKey: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    hasAiIntegrationsBaseUrl: !!process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    hasYoutubeApiKey: !!process.env.YOUTUBE_TRANSCRIPT_API_KEY
  });
});

export default router;
