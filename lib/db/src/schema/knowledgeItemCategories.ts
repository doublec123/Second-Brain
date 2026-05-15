import { pgTable, integer, primaryKey } from "drizzle-orm/pg-core";
import { knowledgeItemsTable } from "./knowledgeItems";
import { categoriesTable } from "./categories";

export const knowledgeItemCategoriesTable = pgTable("knowledge_item_categories", {
  itemId: integer("item_id").notNull().references(() => knowledgeItemsTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: primaryKey({ columns: [t.itemId, t.categoryId] }),
}));
