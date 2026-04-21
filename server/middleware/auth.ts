import { auth } from "../utils/auth";
import { publicRoutes } from "../config/auth.config";

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;

  // 1. 仅拦截 API 请求
  if (!pathname.startsWith("/api/")) {
    return;
  }

  // 2. 检查是否在公共路由白名单中 (前缀匹配)
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublic) {
    // console.log(`[Auth] Public access: ${pathname}`); // 可选：记录公共访问
    return;
  }

  try {
    // 3. 对非白名单路由进行鉴权
    const session = await auth.api.getSession({
      headers: event.headers,
    });

    if (!session) {
      // console.warn(`[Auth] Unauthorized access attempt: ${pathname}`);
      throw createError({
        statusCode: 401,
        statusMessage: "Unauthorized",
        data: {
          code: "UNAUTHORIZED",
          message: "You must be logged in to access this resource."
        }
      });
    }

    // 4. 将用户信息注入上下文
    event.context.user = session.user;
    event.context.session = session.session;

    // console.log(`[Auth] User ${session.user.email} accessed ${pathname}`);

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
