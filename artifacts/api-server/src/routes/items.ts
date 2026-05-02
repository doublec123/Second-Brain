import { Router, type IRouter } from "express";
import { eq, ilike, sql, desc, or } from "drizzle-orm";
import { db, knowledgeItemsTable, tagsTable } from "@workspace/db";
import {
  ListItemsQueryParams,
  CreateItemBody,
  GetItemParams,
  UpdateItemParams,
  UpdateItemBody,
  DeleteItemParams,
  ProcessItemParams,
  GenerateGuideParams,
  GenerateGuideBody,
  GetRelatedItemsParams,
  ExportItemParams,
  SemanticSearchQueryParams,
} from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/items/stats", async (_req, res): Promise<void> => {
  const items = await db.select().from(knowledgeItemsTable);

  const byType = { link: 0, image: 0, text: 0 };
  const byStatus = { pending: 0, processing: 0, ready: 0 };
  let recentCount = 0;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const item of items) {
    const t = item.sourceType as keyof typeof byType;
    if (t in byType) byType[t]++;
    const s = item.status as keyof typeof byStatus;
    if (s in byStatus) byStatus[s]++;
    if (item.createdAt > sevenDaysAgo) recentCount++;
  }

  res.json({ total: items.length, byType, byStatus, recentCount });
});

router.get("/items/search", async (req, res): Promise<void> => {
  const parsed = SemanticSearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q } = parsed.data;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "You are a semantic search assistant. Given a user query, extract 3-5 key search terms and synonyms as a JSON array of strings. Return ONLY the JSON array.",
        },
        { role: "user", content: `Query: "${q}"` },
      ],
    });

    let searchTerms: string[] = [q];
    try {
      const content = response.choices[0]?.message?.content ?? "[]";
      searchTerms = JSON.parse(content);
    } catch {
      searchTerms = [q];
    }

    const allItems = await db
      .select()
      .from(knowledgeItemsTable)
      .orderBy(desc(knowledgeItemsTable.createdAt));

    const scored = allItems
      .map((item) => {
        const text =
          `${item.title} ${item.summary ?? ""} ${item.structuredNotes ?? ""} ${item.keyConcepts.join(" ")} ${item.tags.join(" ")}`.toLowerCase();
        const score = searchTerms.reduce((acc, term) => {
          return acc + (text.includes(term.toLowerCase()) ? 1 : 0);
        }, 0);
        return { item, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.item);

    res.json(scored);
  } catch (err) {
    logger.error({ err }, "Semantic search error");
    const fallback = await db
      .select()
      .from(knowledgeItemsTable)
      .where(
        or(
          ilike(knowledgeItemsTable.title, `%${q}%`),
          ilike(knowledgeItemsTable.summary ?? sql`''`, `%${q}%`)
        )
      )
      .limit(20);
    res.json(fallback);
  }
});

router.get("/items", async (req, res): Promise<void> => {
  const parsed = ListItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, type, tag, status } = parsed.data;

  let items = await db
    .select()
    .from(knowledgeItemsTable)
    .orderBy(desc(knowledgeItemsTable.createdAt));

  if (q) {
    const lower = q.toLowerCase();
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        (item.summary ?? "").toLowerCase().includes(lower) ||
        item.keyConcepts.some((c) => c.toLowerCase().includes(lower)) ||
        item.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  if (type) items = items.filter((item) => item.sourceType === type);
  if (tag) items = items.filter((item) => item.tags.includes(tag));
  if (status) items = items.filter((item) => item.status === status);

  res.json(items);
});

router.post("/items", async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .insert(knowledgeItemsTable)
    .values({
      title: parsed.data.title,
      sourceUrl: parsed.data.sourceUrl ?? null,
      sourceType: parsed.data.sourceType,
      rawContent: parsed.data.rawContent ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      tags: parsed.data.tags ?? [],
      status: "pending",
      keyConcepts: [],
    })
    .returning();

  res.status(201).json(item);
});

router.get("/items/:id", async (req, res): Promise<void> => {
  const params = GetItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(item);
});

router.patch("/items/:id", async (req, res): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.tags !== undefined) updateData.tags = parsed.data.tags;
  if (parsed.data.summary !== undefined) updateData.summary = parsed.data.summary;
  if (parsed.data.structuredNotes !== undefined)
    updateData.structuredNotes = parsed.data.structuredNotes;

  const [item] = await db
    .update(knowledgeItemsTable)
    .set(updateData)
    .where(eq(knowledgeItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(item);
});

router.delete("/items/:id", async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/items/:id/process", async (req, res): Promise<void> => {
  const params = ProcessItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await db
    .update(knowledgeItemsTable)
    .set({ status: "processing" })
    .where(eq(knowledgeItemsTable.id, item.id));

  const contentToProcess =
    item.rawContent ??
    item.sourceUrl ??
    item.title;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content: `You are a knowledge extraction AI. Given content from a ${item.sourceType} source, you must:
1. Write a concise summary (2-4 sentences)
2. Create structured notes in Markdown format with clear headings, bullet points, and bold key terms
3. Extract 5-10 key concepts as short phrases

Respond ONLY with valid JSON in this exact format:
{
  "summary": "...",
  "structuredNotes": "# Title\\n\\n## Key Points\\n- ...",
  "keyConcepts": ["concept1", "concept2"]
}`,
        },
        {
          role: "user",
          content: `Title: ${item.title}\nSource type: ${item.sourceType}\nContent: ${contentToProcess?.substring(0, 8000) ?? "(no content)"}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let parsed: {
      summary?: string;
      structuredNotes?: string;
      keyConcepts?: string[];
    } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      logger.warn({ content }, "Failed to parse AI response");
    }

    const [updated] = await db
      .update(knowledgeItemsTable)
      .set({
        summary: parsed.summary ?? null,
        structuredNotes: parsed.structuredNotes ?? null,
        keyConcepts: parsed.keyConcepts ?? [],
        status: "ready",
      })
      .where(eq(knowledgeItemsTable.id, item.id))
      .returning();

    res.json(updated);
  } catch (err) {
    logger.error({ err }, "AI processing failed");
    await db
      .update(knowledgeItemsTable)
      .set({ status: "pending" })
      .where(eq(knowledgeItemsTable.id, item.id));
    res.status(500).json({ error: "AI processing failed" });
  }
});

router.post("/items/:id/generate-guide", async (req, res): Promise<void> => {
  const params = GenerateGuideParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = GenerateGuideBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const guideTypeDescriptions = {
    steps: "a step-by-step actionable guide",
    workflow: "an actionable workflow with phases and tasks",
    roadmap: "a learning roadmap with milestones",
  };

  const guideDesc =
    guideTypeDescriptions[parsed.data.guideType] ?? "a guide";

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "system",
        content: `You are a knowledge guide generator. Transform the given knowledge into ${guideDesc}.
        
Respond ONLY with valid JSON in this exact format:
{
  "title": "Guide title",
  "content": "Full markdown content of the guide",
  "steps": [
    { "stepNumber": 1, "title": "Step title", "description": "Detailed description" }
  ]
}`,
      },
      {
        role: "user",
        content: `Title: ${item.title}
Summary: ${item.summary ?? ""}
Structured Notes: ${item.structuredNotes ?? ""}
Key Concepts: ${item.keyConcepts.join(", ")}
Guide Type: ${parsed.data.guideType}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let guideData: {
    title?: string;
    content?: string;
    steps?: Array<{ stepNumber: number; title: string; description: string }>;
  } = {};

  try {
    guideData = JSON.parse(content);
  } catch {
    guideData = {
      title: `${parsed.data.guideType} guide for ${item.title}`,
      content: content,
      steps: [],
    };
  }

  res.json({
    title: guideData.title ?? item.title,
    guideType: parsed.data.guideType,
    content: guideData.content ?? "",
    steps: guideData.steps ?? [],
  });
});

router.get("/items/:id/related", async (req, res): Promise<void> => {
  const params = GetRelatedItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.id, params.data.id));

  if (!item) {
    res.json([]);
    return;
  }

  const allItems = await db
    .select()
    .from(knowledgeItemsTable)
    .where(sql`${knowledgeItemsTable.id} != ${params.data.id}`)
    .orderBy(desc(knowledgeItemsTable.createdAt));

  const related = allItems
    .map((other) => {
      const sharedTags = item.tags.filter((t) => other.tags.includes(t)).length;
      const sharedConcepts = item.keyConcepts.filter((c) =>
        other.keyConcepts.includes(c)
      ).length;
      return { item: other, score: sharedTags * 2 + sharedConcepts };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((r) => r.item);

  res.json(related);
});

router.post("/items/:id/export", async (req, res): Promise<void> => {
  const params = ExportItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(eq(knowledgeItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const content = `# ${item.title}

**Source Type:** ${item.sourceType}
${item.sourceUrl ? `**Source URL:** ${item.sourceUrl}` : ""}
**Captured:** ${item.createdAt.toLocaleDateString()}

---

## Summary

${item.summary ?? "_Not yet processed_"}

---

## Structured Notes

${item.structuredNotes ?? "_Not yet processed_"}

---

## Key Concepts

${item.keyConcepts.map((c) => `- ${c}`).join("\n") || "_None identified yet_"}

---

## Tags

${item.tags.join(", ") || "_No tags_"}
`;

  const filename = `${item.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_notes.md`;

  res.json({
    filename,
    content,
    itemTitle: item.title,
  });
});

export default router;
