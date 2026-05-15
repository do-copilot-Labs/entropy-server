import { createHash, randomBytes, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { extAuthCodes, extRefreshTokens, session as authSessions } from "../database/schema";
import { db } from "../utils/db";
import { BasicError } from "../utils/http/error";

/**
 * =========================================================
 * Shared Types
 * =========================================================
 */

type IssueAuthCodeInput = {
  userId: string;
  extId: string;
  state: string;
  codeChallenge: string;
};

type ExchangeAuthCodeInput = {
  code: string;
  codeVerifier: string;
  extId: string;
};

type RefreshTokensInput = {
  refreshToken: string;
  extId: string;
};

type CreateAuthStartInput = {
  extId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
};

type RevokeTokenInput = {
  token: string;
  extId: string;
};

/**
 * =========================================================
 * Auth Constants
 * =========================================================
 */

const AUTH_CODE_TTL_MS = 60 * 1000;
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * =========================================================
 * Shared Helpers
 * =========================================================
 */

const assertRequired = (value: string | null | undefined, fieldName: string) => {
  if (!value?.trim()) {
    throw new BasicError("INPUT_REQUIRED", {
      message: `${fieldName} is required`,
    });
  }
};

const sha256Base64Url = (value: string) =>
  createHash("sha256").update(value).digest("base64url");

const generateOpaqueToken = (size = 32) =>
  randomBytes(size).toString("base64url");

export const createAuthStart = (input: CreateAuthStartInput) => {
  assertRequired(input.extId, "extId");
  assertRequired(input.state, "state");
  assertRequired(input.codeChallenge, "codeChallenge");

  const baseUrl = process.env.NUXT_PUBLIC_BASE_URL || "http://localhost:3000";
  
  const url = new URL("/login", baseUrl);
  url.searchParams.set("source", "extension");
  url.searchParams.set("client_id", input.extId);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  if (input.redirectUri) {
    url.searchParams.set("redirect_uri", input.redirectUri);
  }

  return { authUrl: url.toString() };
};

/**
 * =========================================================
 * Extension OAuth Helpers
 * =========================================================
 */

/**
 * 签发一次性授权码：
 * - 明文 code 返回给调用方
 * - 数据库仅保存 code_hash
 * - 默认 60 秒过期
 */
export const issueAuthCode = async (input: IssueAuthCodeInput) => {
  assertRequired(input.userId, "userId");
  assertRequired(input.extId, "extId");
  assertRequired(input.state, "state");
  assertRequired(input.codeChallenge, "codeChallenge");

  const code = generateOpaqueToken();
  const codeHash = sha256Base64Url(code);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + AUTH_CODE_TTL_MS);

  const [created] = await db
    .insert(extAuthCodes)
    .values({
      userId: input.userId,
      extId: input.extId,
      state: input.state,
      codeChallenge: input.codeChallenge,
      codeHash,
      expiresAt,
      createdAt: now,
    })
    .returning({
      id: extAuthCodes.id,
      expiresAt: extAuthCodes.expiresAt,
    });

  if (!created) {
    throw new BasicError("RESOURCE_CREATION_FAILED", {
      message: "Failed to issue auth code",
    });
  }

  return {
    code,
    expiresIn: Math.floor(AUTH_CODE_TTL_MS / 1000),
    expiresAt: created.expiresAt,
  };
};

/**
 * 授权码换取 token：
 * - 校验 code / extId / 是否过期 / 是否已使用
 * - 校验 PKCE: sha256(codeVerifier) === codeChallenge
 * - accessToken 先复用 Better Auth session.token
 * - refreshToken 写入 ext_refresh_tokens
 */
export const exchangeAuthCode = async (input: ExchangeAuthCodeInput) => {
  assertRequired(input.code, "code");
  assertRequired(input.codeVerifier, "codeVerifier");
  assertRequired(input.extId, "extId");

  const now = new Date();
  const codeHash = sha256Base64Url(input.code);

  const [record] = await db
    .select()
    .from(extAuthCodes)
    .where(eq(extAuthCodes.codeHash, codeHash))
    .limit(1);

  if (!record) {
    throw new BasicError("AUTH_CODE_INVALID", {
      message: "Auth code is invalid",
    });
  }

  if (record.extId !== input.extId) {
    throw new BasicError("EXT_ID_MISMATCH", {
      message: "Extension id does not match auth code",
    });
  }

  if (record.usedAt) {
    throw new BasicError("AUTH_CODE_INVALID", {
      message: "Auth code has already been used",
    });
  }

  if (record.expiresAt <= now) {
    throw new BasicError("AUTH_CODE_EXPIRED", {
      message: "Auth code has expired",
    });
  }

  const expectedCodeChallenge = sha256Base64Url(input.codeVerifier);
  if (expectedCodeChallenge !== record.codeChallenge) {
    throw new BasicError("PKCE_VERIFY_FAILED", {
      message: "PKCE verification failed",
    });
  }

  const accessToken = generateOpaqueToken();
  const refreshToken = generateOpaqueToken();
  const refreshTokenHash = sha256Base64Url(refreshToken);
  const familyId = randomUUID();

  const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(extAuthCodes)
      .set({
        usedAt: now,
      })
      .where(eq(extAuthCodes.id, record.id));

    await tx.insert(authSessions).values({
      id: randomUUID(),
      token: accessToken,
      userId: record.userId,
      expiresAt: accessExpiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: `extension:${input.extId}`,
    });

    await tx.insert(extRefreshTokens).values({
      userId: record.userId,
      extId: input.extId,
      tokenHash: refreshTokenHash,
      familyId,
      expiresAt: refreshExpiresAt,
      createdAt: now,
      lastUsedAt: now,
    });
  });

  return {
    accessToken,
    refreshToken,
    tokenType: "Bearer" as const,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
  };
};

export const refreshTokens = async (input: RefreshTokensInput) => {
  assertRequired(input.refreshToken, "refreshToken");
  assertRequired(input.extId, "extId");

  const now = new Date();
  const refreshTokenHash = sha256Base64Url(input.refreshToken);

  const [record] = await db
    .select()
    .from(extRefreshTokens)
    .where(eq(extRefreshTokens.tokenHash, refreshTokenHash))
    .limit(1);

  if (!record) {
    throw new BasicError("AUTH_CODE_INVALID", {
      message: "Refresh token is invalid",
    });
  }

  if (record.extId !== input.extId) {
    throw new BasicError("EXT_ID_MISMATCH", {
      message: "Extension id does not match refresh token",
    });
  }

  if (record.revokedAt) {
    throw new BasicError("TOKEN_REVOKED", {
      message: "Refresh token has been revoked",
    });
  }

  if (record.expiresAt <= now) {
    throw new BasicError("AUTH_CODE_EXPIRED", {
      message: "Refresh token has expired",
    });
  }

  const accessToken = generateOpaqueToken();
  const nextRefreshToken = generateOpaqueToken();
  const nextRefreshTokenHash = sha256Base64Url(nextRefreshToken);
  const accessExpiresAt = new Date(now.getTime() + ACCESS_TOKEN_TTL_MS);
  const refreshExpiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(extRefreshTokens)
      .set({
        revokedAt: now,
        lastUsedAt: now,
      })
      .where(eq(extRefreshTokens.id, record.id));

    await tx.insert(authSessions).values({
      id: randomUUID(),
      token: accessToken,
      userId: record.userId,
      expiresAt: accessExpiresAt,
      createdAt: now,
      updatedAt: now,
      ipAddress: null,
      userAgent: `extension:${input.extId}`,
    });

    await tx.insert(extRefreshTokens).values({
      userId: record.userId,
      extId: record.extId,
      tokenHash: nextRefreshTokenHash,
      familyId: record.familyId,
      expiresAt: refreshExpiresAt,
      createdAt: now,
      lastUsedAt: now,
    });
  });

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    tokenType: "Bearer" as const,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
  };
};

export const revokeToken = async (input: RevokeTokenInput) => {
  assertRequired(input.token, "token");
  assertRequired(input.extId, "extId");

  const now = new Date();
  const tokenHash = sha256Base64Url(input.token);

  // You can also revoke the entire family by familyId if desired.
  // Here we just revoke the specific token.
  await db
    .update(extRefreshTokens)
    .set({ revokedAt: now })
    .where(eq(extRefreshTokens.tokenHash, tokenHash));
};