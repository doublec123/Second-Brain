import { pgTable, text, serial, varchar, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { usersTable } from "./users";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  name: text("name").notNull(),
  icon: varchar("icon", { length: 50 }),
  description: text("description"),
  color: varchar("color", { length: 20 }).notNull().default("#6366f1"),
}, (t) => ({
  nameUserIdx: uniqueIndex("categories_name_user_idx").on(t.name, t.userId),
}));

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = typeof categoriesTable.$inferInsert;
export type Category = typeof categoriesTable.$inferSelect;
