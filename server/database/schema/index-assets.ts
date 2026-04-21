import { pgTable, text, timestamp, uuid, jsonb, pgEnum, vector, index, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const itemTypeEnum = pgEnum("item_type", ["url", "note", "file", "tweet"]);

export const aiStatusEnum = pgEnum("ai_status", ["pending", "processing", "completed", "failed"]);

export const indexAssets = pgTable(
  "index_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceType: itemTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    embedding: vector("embedding", { dimensions: 768 }),
    aiStatus: aiStatusEnum("ai_status").default("pending").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("index_assets_user_id_idx").on(table.userId),
    index("index_assets_source_type_idx").on(table.sourceType),
    index("index_assets_ai_status_idx").on(table.aiStatus),
    uniqueIndex("index_assets_user_source_unique_idx").on(table.userId, table.sourceType, table.sourceId),
    index("index_assets_embedding_hnsw_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const items = indexAssets;