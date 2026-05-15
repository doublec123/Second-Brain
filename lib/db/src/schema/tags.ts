import { pgTable, text, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
}, (t) => ({
  nameUserIdx: uniqueIndex("tags_name_user_idx").on(t.name, t.userId),
}));

export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true });
export type InsertTag = typeof tagsTable.$inferInsert;
export type Tag = typeof tagsTable.$inferSelect;
