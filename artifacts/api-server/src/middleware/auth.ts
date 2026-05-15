import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

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
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as any;
    const supabaseId = payload.sub;
    const email = payload.email;

    // Find or create user in our local DB
    let [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      // Auto-provision user if they exist in Supabase but not in our DB
      const name = payload.user_metadata?.full_name || email.split("@")[0];
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

    next();
  } catch (err) {
    logger.error({ err }, "JWT verification failed");
    next();
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
