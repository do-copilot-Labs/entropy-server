import { useApiResponse } from '../utils/http/response';

// 直接使用 defineEventHandler，不需要再包一层了
export default defineEventHandler(async (event) => {
    // 即使这里抛出错误，也会被 server/plugins/error.handler.ts 捕获
    // throw new Error('Test Error'); 

    return useApiResponse({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});