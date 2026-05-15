import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { knowledgeItemsTable } from "./knowledgeItems";

export const personalNotesTable = pgTable("personal_notes", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").references(() => knowledgeItemsTable.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("general"), // general, takeaway, action_item, question, reflection
  format: varchar("format", { length: 20 }).notNull().default("plain"), // plain, markdown, bullet
  target: varchar("target", { length: 50 }).notNull().default("item"), // item, link, image
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertPersonalNoteSchema = createInsertSchema(personalNotesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPersonalNote = typeof personalNotesTable.$inferInsert;
export type PersonalNote = typeof personalNotesTable.$inferSelect;
