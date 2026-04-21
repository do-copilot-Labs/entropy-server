import { and, eq } from "drizzle-orm";
import { contentUrls } from "../database/schema";
import { db } from "../utils/db";
import type { UrlCapturePayload } from "../types/url";
import { BasicError } from "../utils/http/error";
import { buildUrlMetadata, generateShortId, normalizeUrl } from "../utils/url";

const generateUniqueShortId = async () => {
  for (let i = 0; i < 5; i++) {
    const candidate = generateShortId();
    const [exists] = await db
      .select({ id: contentUrls.id })
      .from(contentUrls)
      .where(eq(contentUrls.shortId, candidate))
      .limit(1);
    if (!exists) return candidate;
  }
  throw new BasicError("RESOURCE_CREATION_FAILED", { message: "Failed to generate unique short id" });
};

/**  
 * ===========================================================================
 * 1.创建/更新 一个书签（幂等：userId + canonicalUrl）
 * 2.删除（逻辑删）
 * 3.更新
 * 4.查询列表
 * ===========================================================================
 * */

/**  
 * ===========================================================================
 * 创建/更新 一个书签（幂等：userId + canonicalUrl）
 * ===========================================================================
 * */
export const createOrUpdateContentUrl = async (userId: string, payload: UrlCapturePayload) => {
  const normalized = normalizeUrl(payload.url);
  const metadata = buildUrlMetadata(payload, normalized);

  const [existing] = await db
    .select()
    .from(contentUrls)
    .where(and(eq(contentUrls.userId, userId), eq(contentUrls.canonicalUrl, normalized.canonicalUrl)))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(contentUrls)
      .set({
        url: normalized.originalUrl,
        canonicalUrl: normalized.canonicalUrl,
        title: payload.title ?? existing.title,
        siteName: payload.siteName ?? existing.siteName,
        markdown: payload.markdown ?? existing.markdown,
        domain: normalized.domain,
        metadata,
      })
      .where(eq(contentUrls.id, existing.id))
      .returning();

    if (!updated) {
      throw new BasicError("RESOURCE_UPDATE_FAILED", { message: "Failed to update duplicated content url" });
    }

    return { id: updated.id, shortId: updated.shortId, action: "updated" as const };
  }

  const shortId = await generateUniqueShortId();

  const [created] = await db
    .insert(contentUrls)
    .values({
      userId,
      url: normalized.originalUrl,
      canonicalUrl: normalized.canonicalUrl,
      shortId,
      title: payload.title ?? null,
      siteName: payload.siteName ?? null,
      markdown: payload.markdown ?? null,
      domain: normalized.domain,
      metadata,
    })
    .returning();

  if (!created) {
    throw new BasicError("RESOURCE_CREATION_FAILED", { message: "Failed to create content url" });
  }

  return { id: created.id, shortId: created.shortId, action: "created" as const };
};

