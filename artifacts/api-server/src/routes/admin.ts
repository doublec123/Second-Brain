import { Router } from "express";
import { db, usersTable, knowledgeItemsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authenticate, isAdmin } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

/**
 * @summary Get all users (Admin only)
 */
router.get("/users", authenticate, isAdmin, async (req, res) => {
  try {
    const users = await db.select().from(usersTable);
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const [itemCount] = await db
          .select({ value: count() })
          .from(knowledgeItemsTable)
          .where(eq(knowledgeItemsTable.userId, user.id));
        
        // Remove password before sending
        const { password, ...safeUser } = user;
        return {
          ...safeUser,
          stats: {
            items: itemCount?.value || 0,
          },
        };
      })
    );
    res.json(usersWithStats);
  } catch (err) {
    logger.error({ err }, "Failed to fetch users for admin");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * @summary Delete user and all their data (Admin only)
 */
router.delete("/users/:id", authenticate, isAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = parseInt(id as string);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    // Delete items first due to FK constraints (or use cascade if configured)
    await db.delete(knowledgeItemsTable).where(eq(knowledgeItemsTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    
    res.json({ success: true, message: `User ${userId} and all associated data deleted.` });
  } catch (err) {
    logger.error({ err, userId }, "Failed to delete user");
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/**
 * @summary Get global system stats (Admin only)
 */
router.get("/stats", authenticate, isAdmin, async (req, res) => {
  try {
    const [userCount] = await db.select({ value: count() }).from(usersTable);
    const [itemCount] = await db.select({ value: count() }).from(knowledgeItemsTable);
    
    res.json({
      totalUsers: userCount?.value || 0,
      totalItems: itemCount?.value || 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system stats" });
  }
});

export default router;
