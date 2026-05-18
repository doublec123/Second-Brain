import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const router = Router();

router.post("/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    // Hardcoded Admin check — auto-creates account if missing
    if (email === "2pack25rap@gmail.com" && password === "123vive$$") {
      let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (!user) {
        [user] = await db
          .insert(usersTable)
          .values({ email, password, name: "Admin", role: "admin" })
          .returning();
      } else if (user.role !== "admin") {
        // Ensure the role is correct even if account was created as user
        [user] = await db
          .update(usersTable)
          .set({ role: "admin" })
          .where(eq(usersTable.id, user.id))
          .returning();
      }

      (req as any).session.userId = user.id;
      (req as any).session.userRole = user.role;
      const token = jwt.sign({ userId: user.id, userRole: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _pwd, ...safeUser } = user;
      res.json({ ...safeUser, token });
      return;
    }

    // Normal user login
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || user.password !== password) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    (req as any).session.userId = user.id;
    (req as any).session.userRole = user.role;
    const token = jwt.sign({ userId: user.id, userRole: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _pwd, ...safeUser } = user;
    res.json({ ...safeUser, token });
  } catch (err) {
    logger.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/signup", async (req, res): Promise<void> => {
  const { email, password, name } = req.body ?? {};

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  try {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) {
      res.status(400).json({ error: "An account with that email already exists" });
      return;
    }

    const [user] = await db
      .insert(usersTable)
      .values({
        email,
        password,
        name: name || email.split("@")[0],
        role: "user",
      })
      .returning();

    (req as any).session.userId = user.id;
    (req as any).session.userRole = user.role;
    const token = jwt.sign({ userId: user.id, userRole: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _pwd, ...safeUser } = user;
    res.status(201).json({ ...safeUser, token });
  } catch (err) {
    logger.error({ err }, "Signup error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logout", (req, res): void => {
  (req as any).session?.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Could not log out" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

router.get("/me", async (req, res): Promise<void> => {
  try {
    const user = (req as any).user;
    const authError = (req as any).authError;

    if (authError) {
      console.error("Auth middleware reported error:", authError);
      res.status(500).json({ error: `Database or authentication error: ${authError}` });
      return;
    }

    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Safe type-mapping to prevent any UUID vs integer id mismatches
    const parsedId = typeof user.id === "string" ? parseInt(user.id, 10) : user.id;
    const emailStr = user.email || "";
    const nameStr = user.name || emailStr.split("@")[0] || "Unknown User";

    res.json({
      id: isNaN(parsedId) ? user.id : parsedId,
      email: emailStr,
      name: nameStr,
      role: user.role || "user",
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      supabaseId: user.supabaseId
    });
  } catch (err: any) {
    console.error("CRITICAL ERROR in /me endpoint:", err);
    res.status(500).json({ error: "Internal Server Error in /me endpoint", details: err.message });
  }
});

export default router;
