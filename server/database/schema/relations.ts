import { relations } from "drizzle-orm";
import { user, session, account } from "./auth";
import { indexAssets } from "./index-assets";
import { contentUrls, contentNotes } from "./content";

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  indexAssets: many(indexAssets),
  contentUrls: many(contentUrls),
  contentNotes: many(contentNotes),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const indexAssetsRelations = relations(indexAssets, ({ one }) => ({
  user: one(user, {
    fields: [indexAssets.userId],
    references: [user.id],
  }),
}));

export const contentUrlsRelations = relations(contentUrls, ({ one }) => ({
  user: one(user, {
    fields: [contentUrls.userId],
    references: [user.id],
  }),
}));

export const contentNotesRelations = relations(contentNotes, ({ one }) => ({
  user: one(user, {
    fields: [contentNotes.userId],
    references: [user.id],
  }),
}));