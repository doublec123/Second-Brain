import OpenAI from "openai";

const providedKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy-key-pending-provisioning";
const defaultBase = providedKey.startsWith("sk-or-") 
  ? "https://openrouter.ai/api/v1" 
  : "https://api.openai.com/v1";

export const openai = new OpenAI({
  apiKey: providedKey,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || defaultBase,
});

