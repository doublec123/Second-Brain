import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import { db, categoriesTable, knowledgeItemCategoriesTable, knowledgeItemsTable } from "@workspace/db";
import { z } from "zod";

const CreateCategoryBody = z.object({
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
const UpdateCategoryBody = CreateCategoryBody.partial();
import { authenticate } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/categories", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId));
  
  // Get item counts for each category (filtered by user)
  const itemCounts = await db
    .select({
      categoryId: knowledgeItemCategoriesTable.categoryId,
      count: sql<number>`count(${knowledgeItemCategoriesTable.itemId})::int`,
    })
    .from(knowledgeItemCategoriesTable)
    .innerJoin(knowledgeItemsTable, eq(knowledgeItemCategoriesTable.itemId, knowledgeItemsTable.id))
    .where(eq(knowledgeItemsTable.userId, userId))
    .groupBy(knowledgeItemCategoriesTable.categoryId);

  const result = categories.map((cat) => ({
    ...cat,
    itemCount: itemCounts.find((c) => c.categoryId === cat.id)?.count || 0,
  }));

  res.json(result);
});

router.post("/categories", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [category] = await db
    .insert(categoriesTable)
    .values({
      ...parsed.data,
      userId,
    })
    .returning();

  res.status(201).json({ ...category, itemCount: 0 });
});

router.patch("/categories/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [category] = await db
    .update(categoriesTable)
    .set(parsed.data)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
    .returning();

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.json(category);
});

router.delete("/categories/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  
  const [category] = await db
    .delete(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, userId)))
    .returning();

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
