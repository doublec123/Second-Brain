import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

const CreateGroupBody = z.object({
  title: z.string(),
  description: z.string().optional(),
});
const UpdateGroupBody = CreateGroupBody.partial();
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/groups", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
  
  const whereClause: any = { user_id: userId };
  if (categoryId) {
    whereClause.category_id = categoryId;
  }

  const groups = await prisma.note_groups.findMany({
    where: whereClause,
    orderBy: { created_at: "desc" },
  });
  res.json(groups);
});

router.post("/groups", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const group = await prisma.note_groups.create({
    data: {
      ...parsed.data,
      user_id: userId,
    }
  });

  res.status(201).json(group);
});

router.get("/groups/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  
  const group = await prisma.note_groups.findFirst({
    where: { id, user_id: userId }
  });
  
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  // Get items in this group (filtered by user)
  const items = await prisma.knowledge_items.findMany({
    where: { group_id: id, user_id: userId }
  });
  
  res.json({ ...group, items });
});

router.patch("/groups/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  const parsed = UpdateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const groupCheck = await prisma.note_groups.findFirst({
    where: { id, user_id: userId }
  });
  if (!groupCheck) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const group = await prisma.note_groups.update({
    where: { id },
    data: parsed.data,
  });

  res.json(group);
});

router.delete("/groups/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  
  // Verify ownership of the group first
  const group = await prisma.note_groups.findFirst({
    where: { id, user_id: userId }
  });
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  // Update items in this group to have no group
  await prisma.knowledge_items.updateMany({
    where: { group_id: id, user_id: userId },
    data: { group_id: null }
  });
  
  await prisma.note_groups.delete({
    where: { id }
  });
  res.sendStatus(204);
});

export default router;
