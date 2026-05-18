import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, personalNotesTable, knowledgeItemsTable } from "@workspace/db";
import { authenticate } from "../middlewares/auth.js";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger.js";

const router = Router();

// List notes for an item
router.get("/items/:id/notes", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const itemId = parseInt(req.params.id as string);

  // Verify item belongs to user
  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.id, itemId), eq(knowledgeItemsTable.userId, userId)));

  if (!item) {
    return void res.status(404).json({ error: "Item not found" });
  }

  const notes = await db
    .select()
    .from(personalNotesTable)
    .where(eq(personalNotesTable.itemId, itemId))
    .orderBy(personalNotesTable.createdAt);

  return void res.json(notes);
});

// Create a note
router.post("/items/:id/notes", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const itemId = parseInt(req.params.id as string);
  const { type, format, target, content } = req.body;

  // Verify item belongs to user
  const [item] = await db
    .select()
    .from(knowledgeItemsTable)
    .where(and(eq(knowledgeItemsTable.id, itemId), eq(knowledgeItemsTable.userId, userId)));

  if (!item) {
    return void res.status(404).json({ error: "Item not found" });
  }

  const [note] = await db
    .insert(personalNotesTable)
    .values({
      itemId,
      type,
      format,
      target,
      content,
    })
    .returning();

  return void res.status(201).json(note);
});

// Update a note
router.patch("/notes/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const noteId = parseInt(req.params.id as string);
  const { type, format, target, content } = req.body;

  // Verify note belongs to user's item
  const [noteWithUser] = await db
    .select({
      note: personalNotesTable,
      item: knowledgeItemsTable,
    })
    .from(personalNotesTable)
    .innerJoin(knowledgeItemsTable, eq(personalNotesTable.itemId, knowledgeItemsTable.id))
    .where(and(eq(personalNotesTable.id, noteId), eq(knowledgeItemsTable.userId, userId)));

  if (!noteWithUser) {
    return void res.status(404).json({ error: "Note not found" });
  }

  const [updatedNote] = await db
    .update(personalNotesTable)
    .set({ type, format, target, content })
    .where(eq(personalNotesTable.id, noteId))
    .returning();

  return void res.json(updatedNote);
});

// Delete a note
router.delete("/notes/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const noteId = parseInt(req.params.id as string);

  // Verify note belongs to user's item
  const [noteWithUser] = await db
    .select({
      note: personalNotesTable,
      item: knowledgeItemsTable,
    })
    .from(personalNotesTable)
    .innerJoin(knowledgeItemsTable, eq(personalNotesTable.itemId, knowledgeItemsTable.id))
    .where(and(eq(personalNotesTable.id, noteId), eq(knowledgeItemsTable.userId, userId)));

  if (!noteWithUser) {
    return void res.status(404).json({ error: "Note not found" });
  }

  await db.delete(personalNotesTable).where(eq(personalNotesTable.id, noteId));
  return void res.sendStatus(204);
});

// AI Enhance a note
router.post("/notes/:id/enhance", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const noteId = parseInt(req.params.id as string);

  const [noteWithUser] = await db
    .select({
      note: personalNotesTable,
      item: knowledgeItemsTable,
    })
    .from(personalNotesTable)
    .innerJoin(knowledgeItemsTable, eq(personalNotesTable.itemId, knowledgeItemsTable.id))
    .where(and(eq(personalNotesTable.id, noteId), eq(knowledgeItemsTable.userId, userId)));

  if (!noteWithUser) {
    return void res.status(404).json({ error: "Note not found" });
  }

  const { content, type } = noteWithUser.note;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_CHAT || "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI writing assistant for a personal knowledge base. Your goal is to enhance a user's personal note (type: ${type}).
          1. Fix any grammar or spelling mistakes.
          2. Expand on the ideas if they are too brief, while maintaining the user's intent.
          3. If it's a "takeaway" or "reflection", make it more insightful.
          4. If it's an "action item", make it more concrete and actionable.
          5. Connect it to related concepts if appropriate.
          Maintain the original tone and format of the note. Return ONLY the enhanced note text.`
        },
        { role: "user", content }
      ]
    });

    const enhancedContent = response.choices[0]?.message?.content ?? content;

    const [updatedNote] = await db
      .update(personalNotesTable)
      .set({ content: enhancedContent })
      .where(eq(personalNotesTable.id, noteId))
      .returning();

    res.json(updatedNote);
  } catch (err) {
    logger.error({ err }, "AI note enhancement failed");
    res.status(500).json({ error: "AI enhancement failed" });
  }
});

export default router;
