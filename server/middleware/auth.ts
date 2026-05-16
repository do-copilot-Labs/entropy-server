import { and, eq, gt } from "drizzle-orm";
import { session, user } from "../database/schema";
import { publicRoutes } from "../config/auth.config";
import { db } from "../utils/db";
import { auth } from "../utils/auth";
import type { H3Event } from "h3";

const getBearerToken = (event: H3Event) => {
  const authorization = getHeader(event, "authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token || null;
};

const resolveBearerUser = async (event: H3Event) => {
  const token = getBearerToken(event);
  if (!token) return null;

  const [record] = await db
    .select({
      user,
      session: session,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(and(eq(session.token, token), gt(session.expiresAt, new Date())))
    .limit(1);

  if (!record) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: {
        code: "INVALID_BEARER_TOKEN",
        message: "Bearer token is invalid or expired.",
      },
    });
  }

  return {
    user: record.user,
    sessionLike: record.session,
  };
};

export default defineEventHandler(async (event: H3Event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;

  // 1. 仅拦截 API 请求
  if (!pathname.startsWith("/api/")) {
    return;
  }

  // 2. 检查是否在公共路由白名单中 (前缀匹配)
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublic) {
    console.log(`[Auth] Public access: ${pathname}`); // 可选：记录公共访问
    return;
  }

  try {
    const bearerAuth = await resolveBearerUser(event);
    if (bearerAuth) {
      event.context.user = bearerAuth.user;
      event.context.session = bearerAuth.sessionLike;
      event.context.sessionLike = bearerAuth.sessionLike;
    } else {
      const sessionResult = await auth.api.getSession({
        headers: event.headers,
      });

      if (!sessionResult) {
        throw createError({
          statusCode: 401,
          statusMessage: "Unauthorized",
          data: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to access this resource."
          }
        });
      }

      event.context.user = sessionResult.user;
      event.context.session = sessionResult.session;
      event.context.sessionLike = sessionResult.session;
    }

  } catch (error: any) {
    // 如果是 401 错误，直接抛出
    if (error.statusCode === 401) {
      throw error;
    }
    
    // 其他错误（如数据库连接失败）
    console.error(`[Auth] Error verifying session: ${error.message}`);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
      data: {
        code: "AUTH_ERROR",
        message: "Failed to verify session."
      }
    });
  }
});
