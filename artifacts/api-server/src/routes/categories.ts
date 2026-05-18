import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { z } from "zod";

const CreateCategoryBody = z.object({
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
const UpdateCategoryBody = CreateCategoryBody.partial();
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/categories", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const categories = await prisma.categories.findMany({
    where: { user_id: userId },
    include: {
      _count: {
        select: {
          knowledge_item_categories: true
        }
      }
    }
  });

  const result = categories.map((cat) => ({
    ...cat,
    itemCount: cat._count.knowledge_item_categories,
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

  const category = await prisma.categories.create({
    data: {
      ...parsed.data,
      user_id: userId,
    }
  });

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

  const categoryCheck = await prisma.categories.findFirst({
    where: { id, user_id: userId }
  });

  if (!categoryCheck) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  const category = await prisma.categories.update({
    where: { id },
    data: parsed.data
  });

  res.json(category);
});

router.delete("/categories/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const id = parseInt(req.params.id as string);
  
  const category = await prisma.categories.findFirst({
    where: { id, user_id: userId }
  });

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  await prisma.categories.delete({
    where: { id }
  });

  res.sendStatus(204);
});

export default router;
