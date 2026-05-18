// @ts-nocheck
export default async function handler(req, res) {
  try {
    const module = await import("../artifacts/api-server/dist/app.mjs");
    const app = module.default?.default || module.default || module;
    
    if (typeof app !== "function") {
      throw new Error(`Loaded app is not a function! Type: ${typeof app}`);
    }
    
    return app(req, res);
  } catch (error) {
    console.error("Vercel Proxy Initialization Error:", error);
    res.status(500).json({
      error: "FUNCTION_INITIALIZATION_ERROR",
      message: error.message,
      stack: error.stack,
    });
  }
}
