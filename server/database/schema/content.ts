import { pgTable, text, uuid, jsonb, index, uniqueIndex, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const contentUrls = pgTable(
  "content_urls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    shortId: text("short_id"),
    title: text("title"),
    siteName: text("site_name"),
    markdown: text("markdown"),
    iconUrl: text("icon_url"),
    htmlContent: text("html_content"),
    domain: text("domain"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("content_urls_user_canonical_unique_idx").on(table.userId, table.canonicalUrl),
    uniqueIndex("content_urls_short_id_unique_idx").on(table.shortId),
    index("content_urls_domain_idx").on(table.domain),
  ],
);

export const contentNotes = pgTable("content_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  format: text("format").default("markdown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
