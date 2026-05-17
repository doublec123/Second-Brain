import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || "fallback-secret";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    supabaseId: string;
  };
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

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET) as any;

    if (!decoded || !decoded.sub) {
      logger.error({ tokenPreview: token.substring(0, 20) }, "Invalid Supabase token payload");
      return next();
    }

    const supabaseId = decoded.sub;
    const email = decoded.email || "";

    // Find or create user in our local DB
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      // Auto-provision user if they exist in Supabase but not in our DB
      const name = decoded.user_metadata?.full_name || email.split("@")[0];
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
