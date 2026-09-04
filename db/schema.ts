import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  brand: text("brand").notNull().default(""),
  category: text("category").notNull().default("其他"),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  protein: real("protein").notNull().default(0),
  fat: real("fat").notNull().default(0),
  saturatedFat: real("saturated_fat").notNull().default(0),
  carbohydrate: real("carbohydrate").notNull().default(0),
  sugar: real("sugar").notNull().default(0),
  fiber: real("fiber").notNull().default(0),
  sodium: real("sodium").notNull().default(0),
  energy: real("energy").notNull().default(0),
  targetTotalPrice: real("target_total_price"), // ← 从 targetUnitPrice 改为 targetTotalPrice
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const promotionTags = sqliteTable("promotion_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("amber"),
});

export const priceRecords = sqliteTable("price_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  totalPrice: real("total_price").notNull(), // ← 从 price 改为 totalPrice
  priceType: text("price_type").notNull().default("促销价"),
  promotionTag: text("promotion_tag").notNull().default(""),
  platform: text("platform").notNull().default("其他"), // ← 新增
  store: text("store").notNull().default(""),
  recordedAt: text("recorded_at").notNull(),
  note: text("note").notNull().default(""),
});
