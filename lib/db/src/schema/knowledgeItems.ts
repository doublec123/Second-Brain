import {
  pgTable,
  text,
  integer,
  boolean,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const knowledgeItemsTable = pgTable("knowledge_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  sourceType: varchar("source_type", { length: 20 }).notNull().default("text"),
  rawContent: text("raw_content"),
  summary: text("summary"),
  structuredNotes: text("structured_notes"),
  keyConcepts: text("key_concepts").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  keyPoints: text("key_points").array().notNull().default([]),
  stepByStep: text("step_by_step").array().notNull().default([]),
  mainConcepts: text("main_concepts").array().notNull().default([]),
  difficultyLevel: varchar("difficulty_level", { length: 20 }),
  isFavorite: boolean("is_favorite").notNull().default(false),
  groupId: integer("group_id"),
  usageCount: integer("usage_count").notNull().default(0),
  customInstructions: text("custom_instructions"),
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
export type InsertKnowledgeItem = typeof knowledgeItemsTable.$inferInsert;
export type KnowledgeItem = typeof knowledgeItemsTable.$inferSelect;
