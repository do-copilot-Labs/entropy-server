import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const extAuthCodes = pgTable(
  "ext_auth_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    extId: text("ext_id").notNull(),
    codeHash: text("code_hash").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    state: text("state").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ext_auth_codes_code_hash_unique_idx").on(table.codeHash),
    index("ext_auth_codes_user_id_idx").on(table.userId),
    index("ext_auth_codes_ext_id_idx").on(table.extId),
    index("ext_auth_codes_expires_at_idx").on(table.expiresAt),
  ],
);

export const extRefreshTokens = pgTable(
  "ext_refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    extId: text("ext_id").notNull(),
    tokenHash: text("token_hash").notNull(),
    familyId: text("family_id").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastUsedAt: timestamp("last_used_at"),
  },
  (table) => [
    uniqueIndex("ext_refresh_tokens_token_hash_unique_idx").on(table.tokenHash),
    index("ext_refresh_tokens_user_id_idx").on(table.userId),
    index("ext_refresh_tokens_ext_id_idx").on(table.extId),
    index("ext_refresh_tokens_family_id_idx").on(table.familyId),
    index("ext_refresh_tokens_expires_at_idx").on(table.expiresAt),
  ],
);

export type ExtAuthCode = typeof extAuthCodes.$inferSelect;
export type NewExtAuthCode = typeof extAuthCodes.$inferInsert;

export type ExtRefreshToken = typeof extRefreshTokens.$inferSelect;
export type NewExtRefreshToken = typeof extRefreshTokens.$inferInsert;