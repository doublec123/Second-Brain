import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { categoriesTable } from "./categories";
import { usersTable } from "./users";

export const noteGroupsTable = pgTable("note_groups", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertNoteGroupSchema = createInsertSchema(noteGroupsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNoteGroup = typeof noteGroupsTable.$inferInsert;
export type NoteGroup = typeof noteGroupsTable.$inferSelect;
