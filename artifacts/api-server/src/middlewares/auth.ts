import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || "fallback-secret";
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    supabaseId: string;
  };
}

async function verifyToken(token: string): Promise<{ sub: string; email: string; user_metadata?: any } | null> {
  // 1. Try Supabase direct HTTP API first (handles ES256 and HS256 automatically, zero SDK bundling issues)
  if (supabaseUrl && supabaseAnonKey) {
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": supabaseAnonKey
        }
      });
      if (response.ok) {
        const user = await response.json() as any;
        if (user && user.id) {
          return {
            sub: user.id,
            email: user.email || "",
            user_metadata: user.user_metadata
          };
        }
      } else {
        const errText = await response.text();
        logger.error({ status: response.status, response: errText }, "Supabase direct API returned non-OK");
      }
    } catch (e: any) {
      logger.error({ err: e.message }, "Supabase direct API fetch failed, falling back to local JWT");
    }
  }

  // 2. Fallback to local jwt.verify (useful for unit tests or fallback environments)
  if (SUPABASE_JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as any;
      if (decoded && decoded.sub) {
        return {
          sub: decoded.sub,
          email: decoded.email || "",
          user_metadata: decoded.user_metadata
        };
      }
    } catch (e: any) {
      logger.error({ err: e.message }, "Local JWT verification fallback failed");
    }
  }

  return null;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    // Check if session has userId (legacy support or if we still want sessions)
    const userId = (req.session as any)?.userId;
    if (userId) {
      try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            supabaseId: "",
          };
        }
      } catch (err) {
        logger.error({ err }, "Failed to restore user from session");
      }
    }
    return next();
  }

  const token = authHeader.split(" ")[1];

  console.log('=== AUTH DEBUG ===');
  console.log('Authorization header present:', !!req.headers.authorization);
  console.log('Token prefix:', req.headers.authorization?.substring(0, 30));
  console.log('=== ENV DEBUG ===');
  console.log('SUPABASE_JWT_SECRET exists:', !!SUPABASE_JWT_SECRET);
  console.log('VITE_SUPABASE_URL exists:', !!supabaseUrl);
  console.log('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
    console.log('Token decoded successfully:', !!decoded);
  } catch (err: any) {
    console.log('Token verification failed:', err.message);
  }

  try {
    const verified = await verifyToken(token);

    if (!verified || !verified.sub) {
      logger.error({ tokenPreview: token.substring(0, 20) }, "Invalid Supabase token payload");
      return next();
    }

    const supabaseId = verified.sub;
    const email = verified.email || "";

    // Find or create user in our local DB
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      // Auto-provision user if they exist in Supabase but not in our DB
      const name = verified.user_metadata?.full_name || email.split("@")[0];
      [user] = await db
        .insert(usersTable)
        .values({
          email,
          name,
          role: email === "2pack25rap@gmail.com" ? "admin" : "user",
          password: "", // No local password for Supabase users
        })
        .returning();
      
      logger.info({ userId: user.id, email }, "Auto-provisioned user from Supabase token");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      supabaseId,
    };
    (req.session as any).userId = user.id;
    (req.session as any).userRole = user.role;

    next();
  } catch (err: any) {
    logger.error({ err: err.message, name: err.name, tokenPreview: token.substring(0, 20) }, "Auth verification exception");
    (req as any).authError = err.message || String(err);
    next();
  }
}

/** Legacy alias for authenticate */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  if (!(req as any).user) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }
  return next();
};

/** Require admin access */
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden. Admin access required." });
  }
  return next();
};
