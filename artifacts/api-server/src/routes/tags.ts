import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tagsTable, knowledgeItemsTable } from "@workspace/db";
import { CreateTagBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tags", async (_req, res): Promise<void> => {
  const tags = await db.select().from(tagsTable);
  const items = await db.select().from(knowledgeItemsTable);

  const result = tags.map((tag) => ({
    ...tag,
    itemCount: items.filter((item) => item.tags.includes(tag.name)).length,
  }));

  res.json(result);
});

router.post("/tags", async (req, res): Promise<void> => {
  const parsed = CreateTagBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [tag] = await db
    .insert(tagsTable)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: tagsTable.name,
      set: { color: parsed.data.color },
    })
    .returning();

  const items = await db.select().from(knowledgeItemsTable);
  const itemCount = items.filter((item) => item.tags.includes(tag.name)).length;

  res.status(201).json({ ...tag, itemCount });
});

export default router;
