import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger.js";

const router = Router();

// List notes for an item
router.get("/items/:id/notes", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const itemId = parseInt(req.params.id as string);

  // Verify item belongs to user
  const item = await prisma.knowledge_items.findFirst({
    where: { id: itemId, user_id: userId }
  });

  if (!item) {
    return void res.status(404).json({ error: "Item not found" });
  }

  const notes = await prisma.personal_notes.findMany({
    where: { item_id: itemId },
    orderBy: { created_at: "asc" }
  });

  return void res.json(notes);
});

// Create a note
router.post("/items/:id/notes", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const itemId = parseInt(req.params.id as string);
  const { type, format, target, content } = req.body;

  // Verify item belongs to user
  const item = await prisma.knowledge_items.findFirst({
    where: { id: itemId, user_id: userId }
  });

  if (!item) {
    return void res.status(404).json({ error: "Item not found" });
  }

  const note = await prisma.personal_notes.create({
    data: {
      item_id: itemId,
      type,
      format,
      target,
      content,
    }
  });

  return void res.status(201).json(note);
});

// Update a note
router.patch("/notes/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const noteId = parseInt(req.params.id as string);
  const { type, format, target, content } = req.body;

  // Verify note belongs to user's item
  const note = await prisma.personal_notes.findFirst({
    where: {
      id: noteId,
      knowledge_items: {
        user_id: userId
      }
    },
    include: {
      knowledge_items: true
    }
  });

  const noteWithUser = note ? { note, item: note.knowledge_items } : null;

  if (!noteWithUser) {
    return void res.status(404).json({ error: "Note not found" });
  }

  const updatedNote = await prisma.personal_notes.update({
    where: { id: noteId },
    data: { type, format, target, content }
  });

  return void res.json(updatedNote);
});

// Delete a note
router.delete("/notes/:id", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const noteId = parseInt(req.params.id as string);

  // Verify note belongs to user's item
  const note = await prisma.personal_notes.findFirst({
    where: {
      id: noteId,
      knowledge_items: {
        user_id: userId
      }
    },
    include: {
      knowledge_items: true
    }
  });

  const noteWithUser = note ? { note, item: note.knowledge_items } : null;

  if (!noteWithUser) {
    return void res.status(404).json({ error: "Note not found" });
  }

  await prisma.personal_notes.delete({ where: { id: noteId } });
  return void res.sendStatus(204);
});

// AI Enhance a note
router.post("/notes/:id/enhance", authenticate, async (req, res): Promise<void> => {
  const userId = (req as any).user?.id;
  const noteId = parseInt(req.params.id as string);

  const note = await prisma.personal_notes.findFirst({
    where: {
      id: noteId,
      knowledge_items: {
        user_id: userId
      }
    },
    include: {
      knowledge_items: true
    }
  });

  const noteWithUser = note ? { note, item: note.knowledge_items } : null;

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

    const updatedNote = await prisma.personal_notes.update({
      where: { id: noteId },
      data: { content: enhancedContent }
    });

    res.json(updatedNote);
  } catch (err) {
    logger.error({ err }, "AI note enhancement failed");
    res.status(500).json({ error: "AI enhancement failed" });
  }
});

export default router;
