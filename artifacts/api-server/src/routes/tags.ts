import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { CreateTagBody } from "@workspace/api-zod";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/tags", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const tags = await prisma.tags.findMany({ where: { user_id: userId } });
  const items = await prisma.knowledge_items.findMany({ where: { user_id: userId } });

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

  const tag = await prisma.tags.upsert({
    where: {
      name_user_id: {
        name: parsed.data.name,
        user_id: userId,
      }
    },
    update: {
      color: parsed.data.color,
    },
    create: {
      name: parsed.data.name,
      color: parsed.data.color,
      user_id: userId,
    }
  });

  const items = await prisma.knowledge_items.findMany({ where: { user_id: userId } });
  const itemCount = items.filter((item) => item.tags.includes(tag.name)).length;

  res.status(201).json({ ...tag, itemCount });
});

export default router;
