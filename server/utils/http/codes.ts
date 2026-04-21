/**
 * 统一管理应用程序的错误定义。
 * 每个错误包含一个唯一的数字代码 (code) 和默认的描述信息 (info)。
 * 使用 'as const' 确保类型安全和属性只读。
 */
export const ERROR_DEFINITIONS = {
  // --- 认证/授权 (1000-1999) ---
  AUTH_LOGIN_FAILED:        { code: 1001, info: '邮箱或密码错误', status: 401 },
  AUTH_INVALID_TOKEN:       { code: 1002, info: '无效的认证令牌', status: 401 },
  AUTH_PERMISSION_DENIED:   { code: 1003, info: '权限不足', status: 403 },
  AUTH_ACCOUNT_INACTIVE:    { code: 1004, info: '账户未激活或已被禁用', status: 403 },
  AUTH_EMAIL_REGISTERED:    { code: 1005, info: '邮箱已被注册', status: 409 },
  AUTH_TOKEN_GENERATION_FAILED: { code: 1006, info: '生成认证信息时出错', status: 500 },
  AUTH_USER_DATA_INCOMPLETE:{ code: 1007, info: '用户数据不完整，无法验证', status: 400 },

  // --- 输入验证 (2000-2999) ---
  INPUT_REQUIRED:           { code: 2001, info: '缺少必要的输入参数', status: 400 },
  INPUT_INVALID_FORMAT:     { code: 2002, info: '输入格式无效', status: 400 },
  INPUT_VALUE_TOO_HIGH:     { code: 2003, info: '输入值过大', status: 400 },
  INPUT_VALUE_TOO_LOW:      { code: 2004, info: '输入值过小', status: 400 },
  INPUT_EMAIL_PASSWORD_REQUIRED: { code: 2005, info: '邮箱和密码不能为空', status: 400 },

  // --- 数据库/资源 (3000-3999) ---
  DB_CONNECTION_ERROR:      { code: 3001, info: '数据库连接错误', status: 500 },
  RESOURCE_NOT_FOUND:       { code: 3002, info: '请求的资源未找到', status: 404 },
  RESOURCE_CREATION_FAILED: { code: 3003, info: '资源创建失败', status: 500 },
  RESOURCE_UPDATE_FAILED:   { code: 3004, info: '资源更新失败', status: 500 },
  RESOURCE_DELETION_FAILED: { code: 3005, info: '资源删除失败', status: 500 },

  // --- 服务器内部错误 (5000-5999) ---
  INTERNAL_SERVER_ERROR:    { code: 5000, info: '服务器内部错误，请稍后重试', status: 500 },

  // --- 业务错误 (6000-6999) ---
  USER_NOT_FOUND:           { code: 6001, info: '用户不存在', status: 404 },
  INVALID_PROMPT:           { code: 6002, info: '无效的 Prompt', status: 400 },
  MODEL_VERSION_ERROR:      { code: 6003, info: '模型版本错误', status: 400 },

  // --- 其他 (9000+) ---
  UNKNOWN_ERROR:            { code: 9999, info: '发生未知错误', status: 500 },
  INVALID_PROMPT_VALUE:     { code: 6004, info: '无效的 Prompt 值', status: 400 },
  PARAMETER_NOT_SUPPORTED_IN_VERSION: { code: 6005, info: '当前版本不支持该参数', status: 400 },
  INVALID_TASK_TYPE:        { code: 6006, info: '无效的任务类型', status: 400 },
  BUSINESS_EXCEPTION:       { code: 6007, info: '业务异常', status: 400 },
  PARAM_INVALID:            { code: 6008, info: '参数无效', status: 400 },

} as const;

// 创建一个类型，表示所有可能的错误名称 (键)
export type ErrorCodeName = keyof typeof ERROR_DEFINITIONS;