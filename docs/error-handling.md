# 错误处理规范 (Error Handling)

本项目采用了 **HTTP 状态码 + 业务错误码** 的双层错误处理机制。这种设计旨在兼容 HTTP 协议语义（便于监控和网关识别）与业务逻辑细节（便于前端展示）。

## 1. 核心原则

错误响应由两部分组成：
1.  **HTTP Status Code (协议层)**：表示请求在 HTTP 协议层面的结果（如：请求无效、未授权、服务器错误）。
2.  **Business Error Code (业务层)**：表示具体的业务错误原因（如：余额不足、用户名已存在）。

### 为什么不使用 "全 200 OK"？
-   **监控友好**：Sentry、Datadog 等监控系统依赖 HTTP 状态码进行告警。
-   **网关友好**：Nginx、CDN 可以根据状态码进行缓存或熔断策略。
-   **开发工具友好**：浏览器控制台能直观标红错误请求。

## 2. 错误响应结构

所有 API 错误响应统一遵循以下 JSON 格式：

```json
{
  "success": false,
  "errorCode": 2001,
  "message": "URL is required",
  "data": null
}
```

-   `success`: 固定为 `false`。
-   `errorCode`: 业务错误码（数字），定义在 `server/utils/http/codes.ts`。
-   `message`: 人类可读的错误信息（默认使用定义中的 info，也可覆盖）。
-   `data`: 可选的附加数据。

## 3. 状态码规范

### HTTP Status Code
| 状态码 | 含义 | 场景示例 |
| :--- | :--- | :--- |
| **200** | OK | 请求成功，业务逻辑执行完成。 |
| **400** | Bad Request | 客户端请求参数错误（必填项缺失、格式不对）。 |
| **401** | Unauthorized | 未登录或 Token 无效/过期。 |
| **402** | Payment Required | 需付费/余额不足（业务强相关）。 |
| **403** | Forbidden | 已登录但无权访问（角色权限不足、被封禁）。 |
| **404** | Not Found | 请求的资源不存在。 |
| **409** | Conflict | 资源冲突（如：重复创建、状态流转冲突）。 |
| **429** | Too Many Requests | 请求过于频繁（限流）。 |
| **500** | Internal Server Error | 服务器内部错误（未捕获异常、数据库连接失败）。 |

### Business Error Code
业务错误码分为几个区间，详细定义见 `server/utils/http/codes.ts`：

-   `1000-1999`: 通用/系统错误 (System Error)
-   `2000-2999`: 客户端输入错误 (Client Error)
-   `3000-3999`: 认证/权限错误 (Auth Error)
-   `4000-4999`: 业务逻辑错误 (Business Logic Error)

## 4. 开发指南

### 4.1 定义新错误
在 `server/utils/http/codes.ts` 的 `ERROR_DEFINITIONS` 中添加：

```typescript
export const ERROR_DEFINITIONS = {
  // ...
  // 格式: { code: 错误码, info: '默认提示信息', status: 默认HTTP状态码 }
  vip_ONLY: { code: 4003, info: '仅限 VIP 用户使用', status: 403 },
};
```

### 4.2 抛出错误
在 API Handler 或 Service 中，直接抛出 `BasicError`。**不需要手动指定 HTTP 状态码，系统会自动使用定义中的默认值。**

```typescript
import { BasicError } from "../../utils/http/error";

// 场景 1: 使用默认信息和状态码
if (!user.isVip) {
  throw new BasicError("VIP_ONLY"); 
  // -> HTTP 403, Body: { errorCode: 4003, message: "仅限 VIP 用户使用" }
}

// 场景 2: 覆盖错误信息 (Status Code 仍为默认的 400)
if (!body.url) {
  throw new BasicError("INPUT_REQUIRED", { message: "请填写目标 URL" });
  // -> HTTP 400, Body: { errorCode: 2001, message: "请填写目标 URL" }
}

// 场景 3: 强制修改状态码 (极少使用)
throw new BasicError("VIP_ONLY", { statusCode: 402 });
```

### 4.3 全局异常处理
`server/plugins/error.handler.ts` 负责捕获所有 `BasicError` 和其他未捕获异常，将其格式化为统一的 JSON 响应。**无需在每个 API 中手动 try-catch。**

## 5. 前端对接建议 (Nuxt/Vue)

使用 `useFetch` 时，建议同时处理 `error` 对象：

```typescript
const { data, error } = await useFetch('/api/urls', {
  method: 'POST',
  body: { url: '...' }
});

if (error.value) {
  // error.value.statusCode 是 HTTP 状态码 (如 400)
  // error.value.data 是后端返回的 JSON (包含 errorCode, message)
  
  const bizError = error.value.data;
  
  if (error.value.statusCode === 401) {
    navigateTo('/login');
  } else if (bizError?.errorCode === 4002) {
    showRechargeModal(); // 余额不足
  } else {
    showToast(bizError?.message || '请求失败');
  }
}
```