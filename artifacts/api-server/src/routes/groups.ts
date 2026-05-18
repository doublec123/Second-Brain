import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, noteGroupsTable, knowledgeItemsTable } from "@workspace/db";
import { z } from "zod";

const CreateGroupBody = z.object({
  title: z.string(),
  description: z.string().optional(),
});
const UpdateGroupBody = CreateGroupBody.partial();
import { authenticate } from "../middlewares/auth.js";

const router: IRouter = Router();

router.get("/groups", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : null;
  
  let query = db.select().from(noteGroupsTable).where(eq(noteGroupsTable.userId, userId));
  
  if (categoryId) {
    // @ts-ignore
    query = query.where(and(eq(noteGroupsTable.userId, userId), eq(noteGroupsTable.categoryId, categoryId)));
  }

  const groups = await query.orderBy(desc(noteGroupsTable.createdAt));
  res.json(groups);
});

router.post("/groups", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [group] = await db
    .insert(noteGroupsTable)
    .values({
      ...parsed.data,
      userId,
    })
    .returning();

  res.status(201).json(group);
});

router.get("/groups/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  const [group] = await db
    .select()
    .from(noteGroupsTable)
    .where(and(eq(noteGroupsTable.id, id), eq(noteGroupsTable.userId, userId)));
  
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  // Get items in this group (filtered by user)
  const items = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.groupId, id), eq(knowledgeItemsTable.userId, userId)));
  
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

  const [group] = await db
    .update(noteGroupsTable)
    .set(parsed.data)
    .where(and(eq(noteGroupsTable.id, id), eq(noteGroupsTable.userId, userId)))
    .returning();

  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  res.json(group);
});

router.delete("/groups/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  
  // Verify ownership of the group first
  const [group] = await db.select().from(noteGroupsTable).where(and(eq(noteGroupsTable.id, id), eq(noteGroupsTable.userId, userId)));
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  // Update items in this group to have no group
  await db.update(knowledgeItemsTable).set({ groupId: null }).where(and(eq(knowledgeItemsTable.groupId, id), eq(knowledgeItemsTable.userId, userId)));
  
  await db.delete(noteGroupsTable).where(and(eq(noteGroupsTable.id, id), eq(noteGroupsTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
