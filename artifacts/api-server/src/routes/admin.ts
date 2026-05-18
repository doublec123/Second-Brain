import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

/**
 * @summary Get all users (Admin only)
 */
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      include: {
        _count: {
          select: { knowledge_items: true }
        }
      }
    });
    const usersWithStats = users.map((user) => {
      // Remove password before sending
      const { password, ...safeUser } = user;
      return {
        ...safeUser,
        stats: {
          items: user._count.knowledge_items,
        },
      };
    });
    res.json(usersWithStats);
  } catch (err) {
    logger.error({ err }, "Failed to fetch users for admin");
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * @summary Delete user and all their data (Admin only)
 */
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const { id } = req.params;
  const userId = parseInt(id as string);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  try {
    // Delete items first due to FK constraints (or use cascade if configured)
    await prisma.knowledge_items.deleteMany({ where: { user_id: userId } });
    await prisma.users.delete({ where: { id: userId } });
    
    res.json({ success: true, message: `User ${userId} and all associated data deleted.` });
  } catch (err) {
    logger.error({ err, userId }, "Failed to delete user");
    res.status(500).json({ error: "Failed to delete user" });
  }
});

/**
 * @summary Get global system stats (Admin only)
 */
router.get("/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userCount = await prisma.users.count();
    const itemCount = await prisma.knowledge_items.count();
    
    res.json({
      totalUsers: userCount,
      totalItems: itemCount,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch system stats" });
  }
});

export default router;
