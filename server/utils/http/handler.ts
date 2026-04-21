import { defineEventHandler, H3Event, H3Error, setResponseStatus, createRouter as _createRouter } from 'h3'
import { useApiError } from './response'
import { BasicError } from './error'

// 定义我们期望的 API 处理器函数类型
type ApiHandlerLogic = (event: H3Event) => Promise<any>;

/**
 * 封装的 createRouter
 * 自动为所有未匹配的路由附加一个 404 处理，确保不会返回诡异的 204
 */
export function createApiRouter() {
  const router = _createRouter();
  
  // 增加一个兜底的 hook 或 handler
  // 覆盖 handler 方法，当内部 router 找不到匹配时抛出 404
  const originalHandler = router.handler;
  router.handler = defineEventHandler(async (event) => {
    const result = await originalHandler(event);
    
    // h3 router 默认如果没有匹配项，会返回 undefined。
    // 如果返回了 undefined 且响应没结束，说明没找到路由
    if (result === undefined && !event.handled) {
       throw new BasicError('RESOURCE_NOT_FOUND', { 
         message: `API endpoint [${event.method}] ${event.path} not found`,
         statusCode: 404 
       });
    }
    return result;
  });

  return router;
}

/**
 * 创建一个包裹了统一错误处理的 H3 事件处理器。
 * @param handler 实际的 API 处理逻辑函数

 * @returns 一个新的 H3 事件处理器
 */
export function defineApiHandler(handler: ApiHandlerLogic) {
  return defineEventHandler(async (event: H3Event) => {
    try {
      // 执行传入的 API 处理逻辑
      const result = await handler(event);
      return result;
    } catch (error: any) {

      let statusCode = 500; // 默认状态码为 200 (服务器内部错误)
      let errorCode = 9999; 
      let message = '服务器内部错误，请稍后重试';
      let errorData = undefined;

      if (error instanceof H3Error) {
        // 如果是 H3Error，使用其状态码和消息
        statusCode = error.statusCode;
        message = error.statusMessage || error.message || message;
        errorData = error.data;
        console.log(`Caught H3Error: ${statusCode} - ${message}`);
      } else if (error instanceof BasicError) {
        // 如果是 BasicError，使用其状态码和消息
        statusCode = error.statusCode;
        errorCode = error.errorCode;
        message = error.message || error.errorInfo;
        console.log(`Caught BasicError: ${statusCode} - ${message}`);
      } else if (error && typeof error === 'object' && 'statusCode' in error) {
        // 兼容其他带有 statusCode 的错误对象 (确保 error 不是 null 或 undefined)
        statusCode = error.statusCode;
        message = error.message || message;
        console.log(`Caught error with statusCode: ${statusCode} - ${message}`);
      } else if (error instanceof Error) {
         // 处理标准的 JavaScript Error，假定为系统异常
         statusCode = 500;
         message = error.message;
         console.log(`Caught standard Error (treated as business logic error): ${statusCode} - ${message}`);
      } else {
        // 处理其他未知错误类型
        console.log(`Caught unknown error type:`, error);
        // 保持 statusCode 为 500
      }

      // 设置响应的 HTTP 状态码
      setResponseStatus(event, statusCode);

      // 返回统一格式的错误响应体
      // 注意：即使 statusCode 是 200，响应体也表示一个“业务逻辑上的错误”
      return useApiError(message, errorCode, errorData);
    }
  });
}