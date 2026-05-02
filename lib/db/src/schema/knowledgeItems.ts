import {
  pgTable,
  text,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const knowledgeItemsTable = pgTable("knowledge_items", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  sourceType: varchar("source_type", { length: 20 }).notNull().default("text"),
  rawContent: text("raw_content"),
  summary: text("summary"),
  structuredNotes: text("structured_notes"),
  keyConcepts: text("key_concepts").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertKnowledgeItemSchema = createInsertSchema(
  knowledgeItemsTable
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertKnowledgeItem = z.infer<typeof insertKnowledgeItemSchema>;
export type KnowledgeItem = typeof knowledgeItemsTable.$inferSelect;
