import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.get("/api/graph/data", authenticate, async (req, res) => {
  const userId = (req as any).user?.id;

  const items = await prisma.knowledge_items.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  const nodes = items.map((item) => ({
    id: item.id.toString(),
    title: item.title,
    type: item.source_type,
    val: 5, // size
  }));

  const links: { source: string; target: string }[] = [];

  // Connect items that share at least one common tag or key concept
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i];
      const itemB = items[j];

      const sharedTags = itemA.tags.filter((t) => itemB.tags.includes(t));
      const sharedConcepts = itemA.key_concepts.filter((c) => itemB.key_concepts.includes(c));

      if (sharedTags.length > 0 || sharedConcepts.length > 0) {
        links.push({
          source: itemA.id.toString(),
          target: itemB.id.toString(),
        });
      }
    }
  }

  res.json({ nodes, links });
});

export default router;
