import { pgTable, text, timestamp, uuid, jsonb, pgEnum, vector, index } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const aiStatusEnum = pgEnum("ai_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const bookmarks = pgTable(
  "bookmarks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title").notNull(),
    iconUrl: text("icon_url"),
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
    index("bookmarks_user_id_idx").on(table.userId),
    index("bookmarks_ai_status_idx").on(table.aiStatus),
    index("bookmarks_embedding_hnsw_idx").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);