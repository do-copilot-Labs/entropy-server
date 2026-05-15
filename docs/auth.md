# Auth Blueprint（Web + Extension）

## 1. 目标与约束

- Web 端继续使用 Better Auth 作为主身份系统（Google / Email 登录、Session Cookie）。
- Extension（sidepanel）不直接依赖站点 Cookie 作为长期凭证，改用 Bearer Token。
- 支持两种登录闭环：
- 从 sidepanel 发起登录（Sign in -> Web 登录 -> 回扩展）。
- 用户先在主站登录，再打开 sidepanel 自动同步登录态（静默同步）。
- 后端统一 `useUser(event)` 使用方式；中间件同时支持 Cookie Session 与 Bearer。

## 2. 核心流程（正式版）

1. Sidepanel 生成 `state + codeVerifier + codeChallenge`，请求 `GET /api/oauth2/authorize` 获取登录地址。
2. 打开 Web 登录页（Better Auth 完成登录）。
3. 登录完成进入桥接页 `/ext-auth/complete`，桥接页调用 `POST /api/oauth2/authorize/complete` 获取一次性 `authCode`。
4. 桥接页将 `authCode + state` 回传扩展（callback URL / postMessage）。
5. 扩展调用 `POST /api/oauth2/token`，用 `authCode + codeVerifier` 换取 `accessToken + refreshToken`。
6. 扩展后续调用业务 API 统一带 `Authorization: Bearer <accessToken>`，例如 `GET /api/users/@me`。
7. `accessToken` 过期后调用 `POST /api/oauth2/token`（`grant_type=refresh_token`）刷新；登出走 `POST /api/oauth2/token/revoke`。

## 3. 静默同步流程（主站已登录 -> sidepanel 自动登录）

1. Sidepanel 启动时若本地无 token，尝试打开静默桥接页（`prompt=none`）。
2. 桥接页检测到 Better Auth Session 有效，则直接 `issue-code` 并回传扩展。
3. 扩展执行 `exchange`，拿到 token 后进入已登录状态。
4. 若静默失败（无 session/过期），sidepanel 展示 Sign in 按钮。

## 4. 接口清单（后端）

- `GET /api/oauth2/authorize`
- 用途：由 sidepanel 发起授权开始（Discord 风格）
- 入参：`client_id(extId)`, `redirect_uri`, `response_type=code`, `state`, `code_challenge`, `code_challenge_method=S256`
- 出参：`authUrl`
- `POST /api/oauth2/authorize/complete`（需 Web 登录态）
- 用途：登录完成后签发一次性授权码
- 入参：`state`, `code_challenge`, `client_id(extId)`
- 出参：`code`, `expires_in`
- `POST /api/oauth2/token`
- 用途：授权码换 token（`grant_type=authorization_code`）或刷新（`grant_type=refresh_token`）
- 入参（授权码）：`client_id`, `code`, `code_verifier`, `redirect_uri`, `grant_type`
- 入参（刷新）：`client_id`, `refresh_token`, `grant_type`
- 出参：`access_token`, `refresh_token`, `expires_in`, `token_type`
- `POST /api/oauth2/token/revoke`
- 入参：`client_id`, `token`（refresh token 或 token family id）
- 出参：`success`
- `GET /api/users/@me`
- Header：`Authorization: Bearer <access_token>`
- 出参：`id`, `email`, `name`

## 5. 数据模型（建议）

- 新表：`ext_auth_codes`
- 字段：`id`, `user_id`, `ext_id`, `code_hash`, `code_challenge`, `state`, `expires_at`, `used_at`, `created_at`
- 新表：`ext_refresh_tokens`
- 字段：`id`, `user_id`, `ext_id`, `token_hash`, `family_id`, `expires_at`, `revoked_at`, `created_at`, `last_used_at`
- 可选表：`ext_access_tokens`（如采用可撤销 opaque token；若 JWT 可不建）
- 字段：`id`, `user_id`, `ext_id`, `token_hash/jti`, `expires_at`, `revoked_at`

## 6. 后端待办清单（按文件到函数级别）

### `server/utils/auth.ts`

- [x] 配置 Better Auth 社交登录 provider（如 Google）。
- [x] 配置 `trustedOrigins`（包含主站域名、开发域名）。
- [x] 校验回调地址与生产域名配置。

### `server/middleware/auth.ts`

- [x] 新增 `resolveBearerUser(event)`：解析并验证 `Authorization: Bearer`。
- [x] 中间件策略改为：先 Bearer，后 Better Auth Session。
- [x] 成功后统一注入 `event.context.user` 与 `event.context.sessionLike`。

### `server/utils/session.ts`

- [x] 保持 `useUser(event)` 不变。
- [x] 兼容 Bearer 注入的数据结构（避免上层业务改动）。

### `server/database/schema/ext-auth.ts`（新文件）

- [x] 定义 `ext_auth_codes` 表结构与索引。
- [x] 定义 `ext_refresh_tokens` 表结构与索引。
- [x] 导出类型与关系。

### `server/database/schema/index.ts`

- [x] 导出 `ext-auth.ts` 中的表定义。

### `server/database/schema/relations.ts`

- [x] 增加 user 与 `ext_auth_codes` / `ext_refresh_tokens` 的关系。

### `server/service/auth.service.ts`（新文件）

- [x] `createAuthStart(params)`：生成登录跳转参数。
- [x] `issueAuthCode(userId, params)`：签发一次性 `authCode`（写库）。
- [x] `exchangeAuthCode(params)`：校验 `state + PKCE + 过期 + 一次性`，签发 token。
- [x] `refreshTokens(params)`：刷新并轮换 refresh token。
- [x] `logoutExtSession(params)`：撤销 token family。
- [x] `getMeFromAccessToken(token)`：解析当前用户信息（由中间件处理）。

### `server/api/oauth2/authorize.get.ts`（新文件）

- [x] 参数校验：`client_id/redirect_uri/state/code_challenge`。
- [x] 调 `auth.service.createAuthStart`，返回 `authUrl`。

### `server/api/oauth2/authorize/complete.post.ts`（新文件）

- [x] 必须要求 Web 登录态（Better Auth Session）。
- [x] 调 `auth.service.issueAuthCode`，返回一次性 `authCode`。

### `server/api/oauth2/token.post.ts`（新文件）

- [x] 根据 `grant_type` 分流：
- [x] `authorization_code` -> 调 `exchangeAuthCode`。
- [x] `refresh_token` -> 调 `refreshTokens`。
- [x] 返回 `accessToken/refreshToken/expiresIn`。

### `server/api/oauth2/token/revoke.post.ts`（新文件）

- [x] 调 `logoutExtSession`，返回成功状态。

### `server/api/users/@me.get.ts`（新文件）

- [x] 依赖 Bearer 中间件，返回当前用户信息。

### `server/utils/http/error.ts` / `codes.ts`

- [x] 增加扩展认证专用错误码：
- `AUTH_CODE_INVALID`
- `AUTH_CODE_EXPIRED`
- `PKCE_VERIFY_FAILED`
- `TOKEN_REVOKED`
- `EXT_ID_MISMATCH`

## 7. 安全清单（必须项）

- `state` 必校验，防 CSRF。
- PKCE 必须启用（`codeChallenge/codeVerifier`）。
- `authCode` 一次性、短时有效（建议 60 秒）。
- refresh token 只存哈希，且轮换（rotation）。
- token 绑定 `extId`，跨扩展 ID 拒绝。
- 所有 auth 接口加限流与审计日志。
- 桥接页只允许受信来源，严格校验 `redirectUri` 白名单。

## 8. MVP 实施顺序

1. 先打通：`issue-code + exchange + me`。
2. 再补：`refresh + logout + token rotation`。
3. 最后加：静默同步、风控日志、异常告警。

