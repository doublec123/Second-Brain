// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  try {
    // Diagnosing the exact contents of app.mjs on Vercel
    const appMjsPath = path.resolve(__dirname, "../artifacts/api-server/dist/app.mjs");
    let appMjsDiagnostics = "File not found";
    let fileLength = 0;
    if (fs.existsSync(appMjsPath)) {
      const content = fs.readFileSync(appMjsPath, "utf8");
      fileLength = content.length;
      const lines = content.split("\n");
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("new PrismaClient")) {
          matches.push(`Line ${i + 1}: ${lines[i]}`);
          // Add 5 lines of context
          for (let j = 1; j <= 5; j++) {
            if (lines[i + j]) {
              matches.push(`Line ${i + 1 + j}: ${lines[i + j]}`);
            }
          }
          matches.push("---");
        }
      }
      appMjsDiagnostics = matches.length > 0 ? matches.join("\n") : "No 'new PrismaClient' match found in app.mjs";
    }

    const module = await import("../artifacts/api-server/dist/app.mjs");
    const app = module.default?.default || module.default || module;
    
    if (typeof app !== "function") {
      throw new Error(`Loaded app is not a function! Type: ${typeof app}. Diagnostics:\n${appMjsDiagnostics}`);
    }
    
    return app(req, res);
  } catch (error) {
    console.error("Vercel Proxy Initialization Error:", error);
    
    // Add diagnostics info to the error stack/message
    const appMjsPath = path.resolve(__dirname, "../artifacts/api-server/dist/app.mjs");
    let appMjsDiagnostics = "File not found";
    if (fs.existsSync(appMjsPath)) {
      const content = fs.readFileSync(appMjsPath, "utf8");
      const lines = content.split("\n");
      const matches = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("new PrismaClient")) {
          matches.push(`Line ${i + 1}: ${lines[i]}`);
          for (let j = 1; j <= 5; j++) {
            if (lines[i + j]) {
              matches.push(`Line ${i + 1 + j}: ${lines[i + j]}`);
            }
          }
          matches.push("---");
        }
      }
      appMjsDiagnostics = matches.length > 0 ? matches.join("\n") : "No 'new PrismaClient' match found in app.mjs";
    }

    res.status(500).json({
      error: "FUNCTION_INITIALIZATION_ERROR",
      message: error.message,
      diagnostics: appMjsDiagnostics,
      stack: error.stack,
    });
  }
}

