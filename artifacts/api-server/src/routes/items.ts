import { Router, type IRouter } from "express";
import { eq, ilike, sql, desc, or, and } from "drizzle-orm";
import { db, knowledgeItemsTable, tagsTable, knowledgeItemCategoriesTable, categoriesTable } from "@workspace/db";
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
import { logger } from "../lib/logger.js";
import { fetchYouTubeTranscript, isYouTubeUrl } from "../lib/youtube.js";
import { authenticate } from "../middlewares/auth.js";
import fs from "fs";
import path from "path";

const getSystemPrompt = (sourceType: string, categoryNames: string, customInstructions?: string) => {
  let prompt = `You are a professional knowledge extraction and technical synthesis AI. Your goal is to transform the provided content from a ${sourceType} source into high-quality, structured notes.

Core Rules:
1. **Knowledge Extraction**: Identify the main topic, key points, and critical takeaways.
2. **Code & Technical Content**: If the content includes ANY code, commands, terminal instructions, syntax examples, or config snippets, you MUST reproduce them EXACTLY as they appeared. Wrap them in triple backticks with the correct language tag (e.g., \`\`\`python, \`\`\`bash). Do NOT paraphrase or summarize code.
3. **Explanations**: For every code block included, provide a short, clear one-line explanation above it.
4. **Formatting**: Your "structuredNotes" field MUST follow this specific structure:
   - ## Main Topic
   - [Short overview of the content]
   - ## Key Points
   - [Bullet points of main ideas]
   - ## Code Examples (ONLY if code/commands exist)
   - [One-line explanation followed by code block]
   - ## Summary
   - [Concise closing summary]

Principles:
- Extract all meaningful technical examples; do not skip any.
- Simplify complex explanations without losing technical accuracy.
- Ensure the notes are evergreen and easy to reference months later.

Respond ONLY with valid JSON in this exact format:
{
  "summary": "Concise 2-4 sentence summary of the core message",
  "structuredNotes": "## Main Topic\\n... [Follow the structure above] ...",
  "keyPoints": ["point1", "point2"],
  "mainConcepts": ["concept1", "concept2"],
  "stepByStep": ["step1", "step2"],
  "difficultyLevel": "Beginner/Intermediate/Advanced",
  "keyConcepts": ["tag1", "tag2"],
  "suggestedCategories": ["category1", "category2"]
}

Categories available: [${categoryNames}]`;

  if (customInstructions && customInstructions.trim()) {
    prompt += `\n\nTHE USER HAS PROVIDED THE FOLLOWING CUSTOM INSTRUCTIONS - FOLLOW THEM CAREFULLY:\n"${customInstructions}"`;
  }

  return prompt;
};

function extractJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch { /* ignore */ }
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(text.substring(start, end + 1));
      } catch { /* ignore */ }
    }
    throw new Error("Could not parse JSON from AI response");
  }
}

const router: IRouter = Router();

router.get("/items/stats", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const items = await db.select().from(knowledgeItemsTable).where(eq(knowledgeItemsTable.userId, userId));

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

router.get("/items/search", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const parsed = SemanticSearchQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q } = parsed.data;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_SEARCH || "openai/gpt-4o-mini",
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
      .where(eq(knowledgeItemsTable.userId, userId))
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
        and(
          eq(knowledgeItemsTable.userId, userId),
          or(
            ilike(knowledgeItemsTable.title, `%${q}%`),
            ilike(knowledgeItemsTable.summary ?? sql`''`, `%${q}%`)
          )
        )
      )
      .limit(20);
    res.json(fallback);
  }
});

router.get("/items", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const parsed = ListItemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const parsedData = parsed.data as any;
  const { q, type, tag, status, isFavorite, groupId, categoryId } = parsedData;

  const baseQuery = db
    .selectDistinct({
      item: knowledgeItemsTable,
    })
    .from(knowledgeItemsTable);

  const finalQuery = categoryId
    ? baseQuery
        .innerJoin(
          knowledgeItemCategoriesTable,
          eq(knowledgeItemsTable.id, knowledgeItemCategoriesTable.itemId)
        )
        .where(
          and(
            eq(knowledgeItemsTable.userId, userId),
            eq(knowledgeItemCategoriesTable.categoryId, categoryId)
          )
        )
    : baseQuery.where(eq(knowledgeItemsTable.userId, userId));

  const itemsWithMeta = await finalQuery.orderBy(desc(knowledgeItemsTable.createdAt));
  let items = itemsWithMeta.map(r => r.item);

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
  if (isFavorite !== undefined) items = items.filter((item) => item.isFavorite === isFavorite);
  if (groupId) items = items.filter((item) => item.groupId === groupId);

  // Attach categories to items
  const itemIds = items.map(i => i.id);
  if (itemIds.length > 0) {
    const allItemCategories = await db
      .select({
        itemId: knowledgeItemCategoriesTable.itemId,
        categoryName: categoriesTable.name,
      })
      .from(knowledgeItemCategoriesTable)
      .innerJoin(categoriesTable, eq(knowledgeItemCategoriesTable.categoryId, categoriesTable.id))
      .where(sql`${knowledgeItemCategoriesTable.itemId} IN ${itemIds}`);

    items = items.map(item => ({
      ...item,
      categories: allItemCategories
        .filter(c => c.itemId === item.id)
        .map(c => c.categoryName)
    }));
  } else {
    items = items.map(item => ({ ...item, categories: [] }));
  }

  res.json(items);
});

router.post("/items", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let title = parsed.data.title;
  let rawContent = parsed.data.rawContent ?? null;
  let sourceType = parsed.data.sourceType;
  let customInstructions = (parsed.data as any).customInstructions ?? null;

  if (
    (sourceType === "link" || (sourceType as any) === "transcript") &&
    parsed.data.sourceUrl &&
    isYouTubeUrl(parsed.data.sourceUrl)
  ) {
    const apiKey = process.env.YOUTUBE_TRANSCRIPT_API_KEY;
    if (!apiKey || apiKey === "your_transcript_api_key_here") {
      logger.error("YOUTUBE_TRANSCRIPT_API_KEY is missing or placeholder");
      res.status(400).json({ error: "YouTube transcript feature requires a valid Transcript API key. Please update YOUTUBE_TRANSCRIPT_API_KEY in your .env file." });
      return;
    }

    try {
      const ytData = await fetchYouTubeTranscript(parsed.data.sourceUrl, apiKey);
      rawContent = ytData.transcript;
      if (!title || title.toLowerCase() === "new link" || title.toLowerCase() === "untitled") {
        title = ytData.title || title;
      }
      sourceType = "transcript" as any;
    } catch (err: any) {
      logger.error({ err, url: parsed.data.sourceUrl }, "YouTube transcript fetch failed");
      res.status(err.message === "This video has no available transcript." ? 404 : 400).json({ error: err.message });
      return;
    }
  }

  const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId));
  const categoryNames = categories.map(c => c.name).join(", ");
  
  let parsedNotes: any = {};
  let finalStatus = "pending";

  if (sourceType === "image" && rawContent) {
    const base64 = rawContent;
    const systemPrompt = getSystemPrompt(sourceType, categoryNames, customInstructions);
    try {
        const response = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL_VISION || "openai/gpt-4o",
          max_completion_tokens: 4096,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text" as const, text: `Title: ${title}\nAnalyze this image thoroughly and extract all visible text, data, concepts, and meaningful information.` },
                { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${base64}`, detail: "high" as const } },
              ],
            },
          ],
        });
        const content = response.choices[0]?.message?.content ?? "{}";
        try {
          parsedNotes = extractJson(content);
          finalStatus = "ready";
        } catch (err) {
          logger.error({ err, content }, "Failed to parse AI response for image");
          res.status(500).json({ error: "AI analysis failed to generate valid structured data. Please try again." });
          return;
        }
    } catch (err) {
        logger.error({ err }, "Image AI processing failed");
        res.status(500).json({ error: "AI processing failed" });
        return;
    }
  }

  const [item] = await db
    .insert(knowledgeItemsTable)
    .values({
      userId,
      title,
      sourceUrl: parsed.data.sourceUrl ?? null,
      sourceType: sourceType as any,
      rawContent: sourceType === "image" ? null : rawContent,
      tags: parsed.data.tags ?? [],
      groupId: (parsed.data as any).groupId ?? null,
      status: finalStatus,
      summary: parsedNotes.summary ?? null,
      structuredNotes: parsedNotes.structuredNotes ?? null,
      keyPoints: parsedNotes.keyPoints ?? [],
      stepByStep: parsedNotes.stepByStep ?? [],
      mainConcepts: parsedNotes.mainConcepts ?? [],
      difficultyLevel: parsedNotes.difficultyLevel ?? null,
      keyConcepts: parsedNotes.keyConcepts ?? [],
      customInstructions: customInstructions,
    })
    .returning();

  if ((parsed.data as any).categoryIds && (parsed.data as any).categoryIds.length > 0) {
    await db.insert(knowledgeItemCategoriesTable).values(
      (parsed.data as any).categoryIds.map((catId: number) => ({
        itemId: item.id,
        categoryId: catId
      }))
    );
  }

  if (parsedNotes.suggestedCategories && parsedNotes.suggestedCategories.length > 0) {
    for (const catName of parsedNotes.suggestedCategories) {
      let cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      if (!cat) {
        [cat] = await db.insert(categoriesTable).values({ name: catName, userId }).returning();
      }
      if (cat) {
        await db.insert(knowledgeItemCategoriesTable)
          .values({ itemId: item.id, categoryId: cat.id })
          .onConflictDoNothing();
      }
    }
  }

  res.status(201).json(item);
});

router.get("/items/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const params = GetItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.id, params.data.id), eq(knowledgeItemsTable.userId, userId)));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(item);
});

router.patch("/items/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
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
  if ((parsed.data as any).isFavorite !== undefined) updateData.isFavorite = (parsed.data as any).isFavorite;
  if ((parsed.data as any).groupId !== undefined) updateData.groupId = (parsed.data as any).groupId;
  if ((parsed.data as any).customInstructions !== undefined) updateData.customInstructions = (parsed.data as any).customInstructions;

  const [item] = await db
    .update(knowledgeItemsTable)
    .set(updateData)
    .where(and(eq(knowledgeItemsTable.id, params.data.id), eq(knowledgeItemsTable.userId, userId)))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json(item);
});

router.delete("/items/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .delete(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.id, params.data.id), eq(knowledgeItemsTable.userId, userId)))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

router.post("/items/:id/process", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const params = ProcessItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.id, params.data.id), eq(knowledgeItemsTable.userId, userId)));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  await db
    .update(knowledgeItemsTable)
    .set({ status: "processing" })
    .where(eq(knowledgeItemsTable.id, item.id));

  const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.userId, userId));
  const categoryNames = categories.map(c => c.name).join(", ");

  if (item.sourceType === "image" && !item.rawContent) {
    res.status(400).json({ error: "Image data was not saved. Please re-capture the image to re-analyze." });
    return;
  }

  const systemPrompt = getSystemPrompt(item.sourceType, categoryNames, item.customInstructions ?? undefined);

  try {
    let response;

    const contentToProcess = item.rawContent ?? item.sourceUrl ?? item.title;
    response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_CHAT || "openai/gpt-4o-mini",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Title: ${item.title}\nSource type: ${item.sourceType}\nContent: ${contentToProcess?.substring(0, 8000) ?? "(no content)"}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = extractJson(content);
    } catch (err) {
      logger.error({ err, content }, "Failed to parse AI response during reprocessing");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    if (parsed.suggestedCategories && parsed.suggestedCategories.length > 0) {
      for (const catName of parsed.suggestedCategories) {
        let cat = categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (!cat) {
          [cat] = await db.insert(categoriesTable).values({ name: catName, userId }).returning();
        }
        if (cat) {
          await db.insert(knowledgeItemCategoriesTable)
            .values({ itemId: item.id, categoryId: cat.id })
            .onConflictDoNothing();
        }
      }
    }

    const [updated] = await db
      .update(knowledgeItemsTable)
      .set({
        summary: parsed.summary ?? null,
        structuredNotes: parsed.structuredNotes ?? null,
        keyPoints: parsed.keyPoints ?? [],
        stepByStep: parsed.stepByStep ?? [],
        mainConcepts: parsed.mainConcepts ?? [],
        difficultyLevel: parsed.difficultyLevel ?? null,
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

router.post("/items/:id/generate-guide", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
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
    .where(and(eq(knowledgeItemsTable.id, params.data.id), eq(knowledgeItemsTable.userId, userId)));

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const guideTypeDescriptions = {
    steps: "a step-by-step actionable guide",
    workflow: "an actionable workflow with phases and tasks",
    roadmap: "a learning roadmap with milestones",
  };

  const guideDesc = guideTypeDescriptions[parsed.data.guideType] ?? "a guide";

  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL_CHAT || "openai/gpt-4o-mini",
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
Custom Instructions: ${item.customInstructions ?? "None"}
Guide Type: ${parsed.data.guideType}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let guideData: any = {};

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

router.get("/items/:id/related", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const params = GetRelatedItemsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.id, params.data.id), eq(knowledgeItemsTable.userId, userId)));

  if (!item) {
    res.json([]);
    return;
  }

  const allItems = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(sql`${knowledgeItemsTable.id} != ${params.data.id}`, eq(knowledgeItemsTable.userId, userId)))
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

router.post("/items/:id/export", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const params = ExportItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.id, params.data.id), eq(knowledgeItemsTable.userId, userId)));

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
;
