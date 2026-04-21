# Project Architecture

## 1. Overview
Entropy Server 是一个基于 Nuxt 4 (Nitro) 构建的知识管理后端服务。它旨在存储、索引和检索多种类型的内容（如网页链接、笔记、文件），并利用向量数据库（Vector Database）实现语义搜索功能。

## 2. Tech Stack (技术栈)

- **Core Framework**: [Nuxt 4](https://nuxt.com) (Server Side & API Engine via Nitro)
- **Database**: [PostgreSQL](https://www.postgresql.org) (托管于 [Neon.tech](https://neon.tech))
  - **Extensions**: `pgvector` (用于向量存储与搜索)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **Authentication**: [Better Auth](https://better-auth.com)
- **AI Integration**: OpenAI / Gemini (通过自定义策略模式集成)
- **Runtime**: Node.js (兼容 Edge Runtime)

## 3. Core Architecture (核心架构)

### 3.1 Data Model (多态数据模型)
项目采用 "Core Item + Specialized Details"（核心项 + 详情表）的设计模式，以支持多种内容类型：

- **`items` (Core Table)**:
  - 核心注册表，存储所有内容的通用元数据（ID, type, title, created_at, owner_id）。
  - 所有内容必须先在此表中创建记录。
- **Detail Tables (详情表)**:
  - `item_urls`: 存储网页链接特有的数据（url, domain, favicon）。
  - `item_notes`: 存储笔记特有的数据（content, markdown）。
  - `item_files`: 存储文件特有的数据（path, size, mime_type）。
- **`item_embeddings`**:
  - 存储内容的向量表示（Vector），通过 `item_id` 关联。
  - 使用 HNSW 索引加速语义搜索。

### 3.2 Request Lifecycle (请求生命周期)
1.  **Incoming Request**: 请求进入 Nitro 引擎。
2.  **Global Middleware** (`server/middleware/auth.ts`):
    - 执行全局鉴权（Default Deny 策略）。
    - 验证 Session，通过则注入 `user` 上下文，否则拒绝（除非在白名单）。
3.  **API Handler** (`server/api/*`):
    - 解析请求参数。
    - 使用 `BasicError` 进行统一的参数校验。
4.  **Service Layer** (`server/services/*`):
    - 执行核心业务逻辑（如：调用 AI 生成摘要、计算向量）。
    - 编排多个数据库操作（Transaction）。
5.  **Data Access**: Drizzle ORM 生成 SQL 并与数据库交互。

### 3.3 Error Handling (错误处理)
遵循 **HTTP Status Code + Business Error Code** 双层机制：
- **HTTP 状态码**：指示请求层面的结果 (200, 400, 401, 500)。
- **业务错误码**：指示具体的业务异常 (如 `2001 INPUT_REQUIRED`)。
- 详见: [Error Handling Standards](error-handling.md)

## 4. Directory Structure (目录结构)

| 目录 | 职责说明 |
| :--- | :--- |
| `server/api/` | API 路由定义，负责 HTTP 交互与参数解析。 |
| `server/services/` | 业务逻辑层，封装核心功能，供 API 调用。 |
| `server/database/` | 数据库相关：Schema 定义、迁移文件、Drizzle 客户端。 |
| `server/utils/http/` | HTTP 相关的通用工具：错误定义 (`codes.ts`)、响应封装。 |
| `server/middleware/` | Nitro 中间件，处理鉴权、日志等全局逻辑。 |
| `server/plugins/` | Nitro 插件，如全局错误处理器 (`error.handler.ts`)。 |
| `docs/` | 项目文档 (Architecture, Database, API)。 |

## 5. AI Integration Strategy
AI 功能（如摘要生成、向量化）通过 **Strategy Pattern** 实现，以支持动态切换不同的模型提供商（OpenAI vs Gemini）。
- 详见: [AI Integration Architecture](ai-integration.md)