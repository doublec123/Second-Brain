import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tagsTable, knowledgeItemsTable } from "@workspace/db";
import { CreateTagBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/tags", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const tags = await db.select().from(tagsTable).where(eq(tagsTable.userId, userId));
  const items = await db.select().from(knowledgeItemsTable).where(eq(knowledgeItemsTable.userId, userId));

  const result = tags.map((tag) => ({
    ...tag,
    itemCount: items.filter((item) => item.tags.includes(tag.name)).length,
  }));

  res.json(result);
});

router.post("/tags", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const parsed = CreateTagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [tag] = await db
    .insert(tagsTable)
    .values({
      ...parsed.data,
      userId,
    })
    .onConflictDoUpdate({
      target: [tagsTable.name, tagsTable.userId],
      set: { color: parsed.data.color },
    })
    .returning();

  const items = await db.select().from(knowledgeItemsTable).where(eq(knowledgeItemsTable.userId, userId));
  const itemCount = items.filter((item) => item.tags.includes(tag.name)).length;

  res.status(201).json({ ...tag, itemCount });
});

export default router;
