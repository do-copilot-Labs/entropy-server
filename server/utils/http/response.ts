/**
 * 成功响应格式
 */
export function useApiResponse<T>(data: T, message: string = 'success') {
  return {
    success: true,
    errorCode: 0,
    data: data,
    message
  }
}

/**
 * 错误响应，自动抛出 H3 错误
 */
export function useApiError(info: string, errorCode = 9999, errorData?: any) {
  console.log(`Generating error response: ${errorCode} - ${info}`); // 添加日志
  return {
    success: false,
    message: info,
    errorCode: errorCode, // 在响应体中包含状态码，方便前端处理
    ...(errorData && { errorData }) // 可选地包含 H3Error 中的 data 字段
  };
}