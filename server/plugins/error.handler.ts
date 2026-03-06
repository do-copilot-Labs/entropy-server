import { BasicError } from '../utils/http/error';
import { H3Error } from 'h3'; // 改为导入类

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', async (error, { event }) => {
    // 1. 如果响应已经发送了，就不要再处理了
    if (!event || event.handled) return;

    // 2. 如果是 Better Auth 的路由，直接跳过，保持其原生响应格式
    if (event.path.startsWith('/api/auth')) {
      return;
    }

    // 3. 构造统一的错误响应体
    let statusCode = 500;
    let errorCode = 9999;
    let message = '服务器内部错误';
    let data: any = undefined;

    // 识别错误类型
    if (error instanceof BasicError) {
      statusCode = error.statusCode;
      errorCode = error.errorCode;
      message = error.message;
    } else if (error instanceof H3Error) { // 使用 instanceof H3Error
      statusCode = error.statusCode;
      message = error.message;
      data = error.data;
    } else if (error instanceof Error) {
        message = error.message;
    }

    // 4. 设置 HTTP 状态码
    setResponseStatus(event, statusCode);

    // 5. 发送统一格式的 JSON
    // 注意：这里我们手动发送响应，所以标记为 handled
    await send(event, JSON.stringify({
      success: false,
      errorCode,
      message,
      data
    }), 'application/json');
  });
});