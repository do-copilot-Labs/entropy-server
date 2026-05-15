import { H3Event, createError } from "h3";

/**
 * 从请求上下文中获取当前用户 (useUser)
 * 
 * 前提：全局中间件 (server/middleware/auth.ts) 必须已经运行并通过鉴权。
 * 如果 Context 中没有用户，说明中间件配置有误或被绕过，抛出 401/500。
 */
export const useUser = (event: H3Event) => {
  const user = event.context.user;
  const session = event.context.sessionLike ?? event.context.session;
  
  if (!user || !session) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      message: "User context is missing. Ensure this route is protected."
    });
  }
  
  return { user, session };
};