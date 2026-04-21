# Content Deduplication & Idempotency Design

## 1. Purpose

本文档定义内容保存（save/create）阶段的去重与幂等策略，目标是：

- 避免重复写入（尤其是 URL 仅 query 参数不同但内容相同的情况）
- 在准确性与用户体验之间平衡（自动拦截 + 提示确认）
- 为后续 `url / text / video` 等内容类型提供统一可扩展方案

---

## 2. Problem Statement

同一内容可能有不同 URL 形式，例如：

- `www.xiaohongshu.com/explore/xxx?xsec_token=...`
- `www.xiaohongshu.com/explore/xxx?xsec_token=...&xsec_source=pc_user`

实际指向同一资源，但如果按原始 URL 去重会产生重复数据。

同时，不能简单删除全部 query 参数，因为有些站点关键参数决定内容唯一性（如 `id`, `v`）。

---

## 3. Core Strategy (Two-Layer)

### 3.1 Hard Idempotency (Strong Dedup, Auto-block)

用于自动拦截重复写入：

- 幂等键建议：`userId + canonicalUrl`
- 命中后不重复创建，直接返回已有记录（idempotent response）

### 3.2 Soft Dedup (Possible Duplicate Hint)

用于不确定场景提示用户：

- 条件示例：`domain + path` 相同但 query 不同
- 返回 `possibleDuplicate` 提示，让用户决定是否继续保存

---

## 4. URL Field Model

建议在 URL 详情层保存以下字段：

- `originalUrl`: 用户输入原始 URL
- `normalizedUrl`: 标准化 URL（协议、host、小写、path 规范化、query 排序）
- `canonicalUrl`: 去重判断使用 URL（按规则清洗 tracking 参数后）

推荐关系：

- 展示与回溯：`originalUrl`
- 一般读取：`normalizedUrl`
- 幂等与唯一性：`canonicalUrl`

---

## 5. Canonicalization Rules

## 5.1 Base Rules

- host 小写
- 去默认端口
- 清理 path 尾部冗余 `/`（保留根路径）
- query 参数按 key 排序
- 删除空值 query（可配置）

## 5.2 Query Rules

### Ignore List (默认删除，常见 tracking)

- `utm_*`
- `fbclid`
- `gclid`
- `xsec_source`
- `spm`
- `_source`

### Keep List (默认保留，常见业务主键)

- `id`
- `v`
- `p`
- `vid`
- `story_fbid`

### Domain Override (按域名覆盖规则)

针对 `xiaohongshu.com / youtube.com / bilibili.com` 等可单独配置 ignore/keep 策略。

---

## 6. Save Flow (URL)

1. 接收 `originalUrl`
2. 生成 `normalizedUrl`
3. 生成 `canonicalUrl`
4. 查重（`userId + canonicalUrl`）
   - 命中：返回已有记录（幂等成功）
   - 未命中：进入事务创建
5. 事务内写入：
   - `items`（core）
   - `item_urls`（detail）
6. 异步 enrich（可选）：
   - 拉取网页
   - 读取 `<link rel="canonical">` / `og:url`
   - 触发二次重复判断（仅提示或后台合并策略）

---

## 7. DB & Constraint Suggestion

建议给 URL 详情表增加字段：

- `original_url`
- `normalized_url`
- `canonical_url`

并建立唯一约束（按用户维度）：

- 方案 A：在 URL 详情表冗余 `user_id`，建立 `(user_id, canonical_url)` unique index
- 方案 B：不冗余 `user_id`，应用层先查重再写入（事务保障）

建议优先 A（数据库层硬约束更稳），B 作为过渡。

---

## 8. API Behavior Contract

## 8.1 Hard Duplicate (Idempotent Hit)

返回成功态，不新增记录：

```json
{
  "success": true,
  "message": "Already saved",
  "data": {
    "itemId": "existing-id",
    "isDuplicate": true
  }
}
```

## 8.2 Possible Duplicate (Soft Hint)

返回可提示信息（由前端决定是否二次确认）：

```json
{
  "success": true,
  "message": "Possible duplicate detected",
  "data": {
    "possibleDuplicate": true,
    "candidates": [
      { "itemId": "xxx", "title": "..." }
    ]
  }
}
```

---

## 9. Product Decision

不建议“完全不判断，全部交给用户”。

推荐策略：

- 默认启用硬幂等（明显重复自动拦截）
- 对不确定重复提供温和提示（不强拦截）
- 用户可选择继续保存

这样兼顾体验、准确性和系统一致性。

---

## 10. Rollout Plan

### Phase 1 (MVP)

- 实现 URL canonicalization（基础规则）
- `createUrlItem` 前置查重（`userId + canonicalUrl`）
- 命中返回已有记录（幂等）

### Phase 2

- 增加 domain-specific 规则
- 前端接入 `possibleDuplicate` UI 提示

### Phase 3

- 抓取后 canonical/og:url 二次校验
- 支持自动合并策略（可配置）

---

## 11. Extension to Other Types

该策略可扩展到其他内容类型：

- Text: `content hash` + 标题相似度
- Video: `platform + video_id`（优先）+ URL canonicalization
- Tweet/Post: `platform + post_id`

统一原则：每类内容都定义一个稳定的“业务唯一键”。

---

## 12. Open Questions

- 哪些 query 参数应全局忽略？哪些按域名保留？
- duplicate 命中后是否更新时间戳（最近收藏时间）？
- “可能重复”候选返回数量上限与排序规则如何定义？

后续实施时可在本文档持续补充决策记录。