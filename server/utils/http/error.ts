import { ERROR_DEFINITIONS } from './codes';
import type { ErrorCodeName } from './codes';

/**
 * 自定义基础错误类，用于表示业务逻辑或可预期的错误。
 * 基于预定义的错误代码和信息创建。
 */
export class BasicError extends Error {
  public readonly statusCode: number; // HTTP 状态码或业务状态码
  public readonly errorCode: number;  // 内部数字错误代码
  public readonly errorInfo: string;  // 错误的默认描述信息

  /**
   * 创建 BasicError 实例。
   * @param errorCodeName - 错误的名称 (从 ERROR_DEFINITIONS 的键中选择)。
   * @param override - 可选对象，用于覆盖默认的 message 或 statusCode。
   *                   - message: 自定义的用户可读错误信息，如果未提供，则使用 errorInfo。
   *                   - statusCode: 自定义的 HTTP 状态码或业务状态码，如果未提供，默认为 200。
   */
  constructor(errorCodeName: ErrorCodeName, override?: { message?: string, statusCode?: number }) {
    const definition = ERROR_DEFINITIONS[errorCodeName];
    if (!definition) {
      // 处理未找到错误定义的情况，虽然类型系统应该能防止这种情况
      console.error(`Error definition not found for key: ${errorCodeName}`);
      const fallbackDefinition = ERROR_DEFINITIONS.UNKNOWN_ERROR;
      super(fallbackDefinition.info);
      this.name = 'BasicError';
      this.statusCode = fallbackDefinition.status; // 使用 fallback 的 status
      this.errorCode = fallbackDefinition.code;
      this.errorInfo = fallbackDefinition.info;
    } else {
      const message = override?.message || definition.info;
      // 优先使用 override 的 statusCode，否则使用 definition 的 status，最后默认 500
      const statusCode = override?.statusCode ?? definition.status ?? 500;

      super(message); // 设置 Error 的 message
      this.name = 'BasicError'; // 错误名称
      this.statusCode = statusCode; // 存储状态码
      this.errorCode = definition.code; // 存储数字错误代码
      this.errorInfo = definition.info; // 存储默认描述信息
    }


    // 确保 instanceof 操作符能正确识别此类的实例
    Object.setPrototypeOf(this, BasicError.prototype);
  }
}