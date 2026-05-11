# DevBlog 个人博客 — 技术评审报告

---

| 文档信息 | |
|---------|---|
| 评审对象 | PRD_个人博客网站.md (v1.0) |
| 评审日期 | 2026-05-11 |
| 评审团队 | 前端开发工程师、后端开发工程师、技术架构师 |
| 评审方式 | 三视角独立评审，而后汇总 |

---

## 一、评审总览

### 产品经理决策反馈（2026-05-11）

| 轮次 | 决策项 | 决策结果 |
|------|--------|---------|
| 第一轮 | v1.0 范围调整 | 同意学习路线从 v1.0 移除，延至 v1.1 |
| 第一轮 | 运维方案 | 公司自有服务器 + 域名，Docker Compose 部署 |
| 第一轮 | 设计风格 | Anthropic 极简温柔风，全套配色/排版规范已入 PRD 第 8 章 |
| 第一轮 | 架构转向 | 内容管理改为在线 Markdown 编辑器，all-in-one 模式 |
| 第一轮 | 数据库 | 直接使用 PostgreSQL，跳过 SQLite |
| 第一轮 | 反垃圾策略 | 延至 v1.2 |
| 第二轮 | 评论方案 | **自建评论系统**，不走 Giscus |
| 第二轮 | 图片存储 | **MinIO 自建对象存储**，不走服务器本地文件 |
| 第二轮 | 认证方式 | **仅 GitHub OAuth**，NextAuth.js 实现，不走邮箱密码 |
| 第二轮 | 搜索方案 | **PostgreSQL 全文检索**（tsvector + pg_trgm），不走 Fuse.js/MeiliSearch |

以上全部决策已同步更新至 PRD。

### 剩余待解决问题

三位评审者一致认为 PRD 在产品功能层面质量较高，功能边界清晰、优先级划分合理、非功能需求覆盖较全面。但在以下层面存在**共性问题**需要修正后再进入开发：

| 问题域 | 严重程度 | 涉及角色 |
|--------|---------|---------|
| 内容管理方式存在架构矛盾（本地 Markdown vs 在线编辑器） | **严重** | 全栈 |
| PRD 缺少数据模型设计，后端开发无法启动 | **严重** | 后端 |
| v1.0 MVP 范围过宽（学习路线应延后） | **严重** | 全栈 |
| 评论系统方案存在矛盾（自建 vs 第三方） | **高** | 全栈 |
| 前端异常状态（空/错/加载态）缺失 | **中** | 前端 |
| 安全性描述偏笼统，缺少具体实施方案 | **中** | 全栈 |
| 编辑器技术选型未明确（CodeMirror 还是 TipTap） | **中** | 前端 |

---

## 二、前端评审要点

**评审者：前端开发工程师**

### 2.1 技术可行性总表

| 功能点 | 可行性 | 推荐方案 | 主要风险 |
|--------|--------|---------|---------|
| Markdown 编辑器 + 实时预览 | 高 | CodeMirror 6 / Monaco Editor + remark/rehype | 大文档预览需 debounce |
| GFM Markdown 渲染 | 高 | remark-gfm + rehype-sanitize | — |
| LaTeX 数学公式 | 中 | remark-math + rehype-katex | 与 Mermaid 共存需隔离渲染区域 |
| Mermaid 图表 | 中 | mermaid npm 包 | SSR 场景有坑，需 puppeteer 预渲染或动态导入 |
| 代码高亮 + 行号 + 复制 | 高 | Shiki（推荐，SSR 友好） | 文章较多时 SSG 构建时间显著增加 |
| 文章目录 TOC 滚动高亮 | 高 | IntersectionObserver | 代码量少，无显著风险 |
| 草稿与定时发布 | 高 | 前端状态展示，后端 CRON | 前端需处理草稿预览 token 鉴权 |
| 图片上传（拖拽/粘贴） | 高 | react-dropzone + browser-image-compression | 大图需前端压缩 |
| 学习路线可视化 | 中-高 | 自定义 SVG/CSS 时间轴 | PRD 未明确具体可视化形式 |
| 全站搜索 | 高(小站) / 中(大站) | 文章 < 200 篇用 Fuse.js，大于用 MeiliSearch | 需预留切换边界 |
| 暗色模式 | 高 | next-themes | 必须在 `<head>` 内联 script，否则 FOUC 闪白 |

### 2.2 组件架构建议

**可复用组件清单：** ThemeProvider、CodeBlock、MarkdownRenderer、TocSidebar/TocDrawer、SeriesNav、PaginatedList、TagBadge、TimelineItem、CardGrid、CommentThread、LikeButton。

**架构原则：** 展示组件（纯 props）与容器组件（数据获取）分离；所有 Markdown 相关能力收敛进 MarkdownRenderer 组件。

### 2.3 前端安全问题（严重项）

**评论 Markdown 渲染 XSS：** 无论用何种 Markdown 库，评论内容必须经过 `rehype-sanitize` 过滤。inline HTML 如 `<script>` 需严格禁止。评论级别的 Markdown 建议限定白名单语法集（仅加粗、代码、链接），禁用标题、图片、表格。

**社交链接注入：** 用户填写的 GitHub/Twitter 链接需强制以 `https://` 开头，防止 `javascript:` 协议注入。

### 2.4 前端改进建议（精选 4 条）

1. **编辑器选型必须二选一：** CodeMirror 6（纯 MD 编辑）或 TipTap（块级编辑），两者架构完全不同，需在设计阶段就定下来。
2. **暗色模式 FOUC 必须解决：** 在内联 `<script>` 中读取 localStorage 或 prefers-color-scheme，在 React 水合前注入 `class="dark"`。
3. **补充异常状态 UI：** 空文章列表、搜索无结果、网络错误等状态当前完全缺失，需在设计中补齐。
4. **管理后台响应式需求缺失：** 博主可能在手机端管理评论/动态，需明确后台是否做响应式。

---

## 三、后端评审要点

**评审者：后端开发工程师**

### 3.1 核心数据模型（推断）

共推断约 18 张表，核心表如下：

| 表 | 关键字段 | 关系 |
|----|---------|------|
| users | id, username, email, password_hash, role | — |
| posts | id, author_id, title, slug, content_md, content_html, status, scheduled_at | FK → users |
| tags | id, name, slug | — |
| post_tags | post_id, tag_id | FK → posts, tags |
| series | id, title, slug, description, cover_image | — |
| series_posts | series_id, post_id, order_index | FK → series, posts |
| comments | id, post_id, parent_id, author_name, author_email, content_html, is_pinned | FK → posts, comments(自引用) |
| moments | id, content, image_url, published_at | — |
| learning_paths | id, title, description, cover_image | — |
| path_nodes | id, path_id, parent_id, title, description, status, order_index, post_id | FK → learning_paths, path_nodes(自引用), posts |
| projects | id, name, description, tech_stack, repo_url, demo_url, order_index | — |
| milestones | id, title, description, event_date, event_type, order_index | — |
| page_views | id, post_id, visitor_id, ip, referrer, user_agent, created_at | FK → posts |
| post_likes | id, post_id, ip_address, created_at | FK → posts |

### 3.2 关键设计陷阱

1. **评论嵌套深度控制：** parent_id 自引用即可，但查询时必须在应用层限制展开为 2 层，否则 N+1 查询问题严重。
2. **系列文章序数重排：** 删除系列中某篇文章后，其他文章的 order_index 需要批量更新。
3. **学习路线节点层级：** 如果支持无限层级，建议用物化路径（materialized path）存储，查询性能远优于递归 CTE。
4. **点赞防重复：** PRD 中「同一 IP 每天一次」不可靠（NAT/代理导致 IP 共享）。建议改用浏览器指纹或 cookie-based visitor_id。
5. **收藏功能缺失后端方案：** PRD 中收藏用 localStorage，意味着无后端。如果未来要跨设备同步，需在后端建表。

### 3.3 API 端点设计建议

**公开接口（约 15 个）：** `/api/posts`、`/api/posts/[slug]`、`/api/posts/[slug]/comments`、`/api/posts/[slug]/like`、`/api/series`、`/api/moments`、`/api/projects`、`/api/learning`、`/api/timeline`、`/api/stats`、`/api/search`、`/api/tags`、`/api/about`

**管理接口（约 15 个）：** `/api/admin/posts`、`/api/admin/moments`、`/api/admin/comments`、`/api/admin/series`、`/api/admin/learning`、`/api/admin/projects`、`/api/admin/timeline`、`/api/admin/profile`、`/api/admin/settings`、`/api/admin/upload`、`/api/admin/stats`

### 3.4 定时发布方案

推荐**方案一（MVP 阶段）**：数据库 `status = 'scheduled'` + `scheduled_at` 字段，Vercel Cron Jobs 每分钟轮询一次 `SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at <= NOW()`，将匹配文章状态切换为 `published` 并触发 ISR revalidate。

### 3.5 后端安全评审

| 风险 | 方案 |
|------|------|
| 认证 | JWT access_token（15min）+ refresh_token（7d），管理后台用 NextAuth.js |
| 限流 | 评论/点赞 API 限流 10 次/min/IP；登录 API 限流 5 次/min/IP |
| XSS | 所有用户输入（评论、昵称）存储前用 rehype-sanitize 净化 Markdown 渲染后的 HTML |
| 图片上传 | 后端校验 MIME type（magic number），禁止 SVG；文件名消毒（UUID 重命名） |
| SQL 注入 | 使用 ORM（Drizzle/Prisma）的参数化查询，避免拼接 Raw SQL |
| CSRF | JWT 存 localStorage 天然免疫；若存 Cookie 则需 SameSite=Strict |

### 3.6 后端改进建议（精选 4 条）

1. **明确收藏方案：** PRD 中收藏用 localStorage 与前端需求一致，但后端需要预留收藏表（`favorites: user_id, post_id, created_at`），为跨设备同步留接口。
2. **补充反垃圾策略：** 评论系统需审核机制（默认全部需博主审核后才能公开）+ 验证码（Turnstile/hCaptcha）+ 敏感词过滤。
3. **Markdown 存储与渲染分离：** 文章存储时同时保存原始 Markdown（`content_md`）和渲染后的 HTML（`content_html`），避免每次请求都重新渲染 Markdown。
4. **数据库迁移策略：** 使用 Drizzle/Prisma 的 migration 系统，所有 DDL 变更纳入版本管理。

---

## 四、架构师评审要点

**评审者：技术架构师**

### 4.1 推荐架构

**以内容为中心的单体架构（适合个人博客）：**

```
CDN (Vercel Edge Network)
  │
  ├── Next.js App (SSG + ISR)
  │     ├── 前台页面 (SSG/ISR, 纯静态优先)
  │     ├── 管理后台 (SSR, 需认证)
  │     └── API Routes (BFF 层)
  │
  ├── 内容源：本地 Markdown 文件 + Git + content-collections
  │
  └── 数据层
        ├── PostgreSQL (评论、点赞、统计、配置)
        ├── Fuse.js (v1.0 搜索) / MeiliSearch (v1.1)
        └── Redis (v1.2, 会话缓存 + 频率限制)

CI/CD: GitHub → GitHub Actions → Vercel Deploy
```

### 4.2 技术选型逐项裁决

| 类别 | PRD 推荐 | 架构师裁决 | 理由 |
|------|---------|-----------|------|
| 框架 | Next.js | **保持** | ISR + API Routes 对博客场景最均衡 |
| 样式 | Tailwind CSS | **保持** | 暗色模式支持便利 |
| 内容管理 | 本地 MD + Git | **保持，但需用 content-collections** | Contentlayer 已归档 |
| 评论系统 | 自建 / Giscus | **v1.0 用 Giscus** | 零运维、GitHub 账号防垃圾、快速上线 |
| 搜索 | Fuse.js / MeiliSearch | **v1.0 Fuse.js，v1.1 MeiliSearch** | 百篇文章内客户端搜索足够 |
| 统计 | 自建 / Umami | **Umami（自部署）** | 比自建省大量开发时间 |
| 数据库 | SQLite / PostgreSQL | **v1.0 SQLite，v1.1 迁移 PostgreSQL** | MVP 无并发写入压力 |
| 语法高亮 | Shiki / Prism | **Shiki** | SSR 友好、VS Code 同款准确性 |
| 部署 | Vercel / Netlify | **Vercel（优选）** | ISR/Edge/Image Optimization 支持最完整 |

### 4.3 架构层面核心矛盾

PRD 中存在一个**关键矛盾**：既期望「本地 Markdown + Git」的开发者友好工作流，又设计了完整的「在线 Markdown 编辑器」后台。在单用户场景下两者的目标用户是同一个人，同时实现会投入翻倍而使用率极低。

**建议：** 将管理后台的在线编辑器降级为「文章元数据编辑」（标题、标签、系列归属、定时发布时间），正文编辑由本地 VS Code + `git push` 承担。

### 4.4 安全架构建议

- 身份认证：使用 **NextAuth.js**（GitHub OAuth 一键登录），不要自建
- 权限中间件：`/admin/*` 和 `/api/admin/*` 需严格认证 + 管理员角色
- 安全响应头：CSP、X-Frame-Options、X-Content-Type-Options
- 依赖安全：Dependabot 自动更新 + `npm audit` on CI
- 密钥管理：Vercel Environment Variables，禁止硬编码

### 4.5 成本估算（已更新）

公司提供自有服务器与域名，运维成本为零。全部服务通过 Docker Compose 部署至自有服务器：

| 项目 | 方案 | 成本 |
|------|------|------|
| 域名 | 公司提供 | $0 |
| 服务器 | 公司提供 | $0 |
| 数据库 | PostgreSQL Docker 容器 | $0 |
| 图片存储 | 服务器本地 / MinIO | $0 |
| 搜索 | Fuse.js（v1.0）/ MeiliSearch Docker（v1.1） | $0 |
| CI/CD | GitHub Actions（自托管 Runner 连公司服务器） | $0 |

### 4.6 v1.0 范围调整建议

**当前 v1.0（PRD）**：文章 + 动态 + 个人介绍 + 学习路线 + 暗色模式

**建议 v1.0**：文章 + 动态 + 个人介绍 + 暗色模式，学习路线延至 v1.1

**状态：已被产品经理采纳。** PRD 已更新为 v1.0 MVP = 文章系统 + 动态 + 个人介绍 + 暗色模式，学习路线移至 v1.1。

### 4.7 架构师改进建议（精选 3 条）

1. **补充数据模型设计章节：** PRD 完全没有数据表定义。至少需要覆盖 `posts`、`comments`、`tags`、`series`、`learning_nodes` 5 个核心实体的字段和关系。
2. **引入 ORM 而非裸写 SQL：** 推荐 Drizzle ORM（比 Prisma 更轻量），支持 SQLite → PostgreSQL 平滑迁移。
3. **建立可扩展性的「低成本预留」：** 数据模型预留 `user_id`、API 从 v1.0 开始版本化（`/api/v1/`）、Markdown 渲染管线预留 hook（beforeRender/afterRender）。

---

## 五、综合建议汇总（按优先级）

### P0 — 开发前必须解决

| # | 问题 | 行动 | 状态 |
|---|------|------|------|
| 1 | 内容管理方式矛盾 | 决策：all-in-one 在线编辑器 | ✅ |
| 2 | 缺少数据模型设计 | 补充 5-8 个核心表的 ER 图 + 字段定义 | ⚠️ |
| 3 | v1.0 范围过宽 | 学习路线从 v1.0 移除，延至 v1.1 | ✅ |
| 4 | 评论方案待选型 | 决策：自建评论系统 | ✅ |
| 5 | 认证方案 | 决策：GitHub OAuth + NextAuth.js | ✅ |
| 6 | 搜索方案 | 决策：PostgreSQL 全文检索 | ✅ |
| 7 | 图片存储方案 | 决策：MinIO 自建对象存储 | ✅ |
| 8 | 编辑器边界状态缺失 | 骨架屏、保存失败、断网恢复、定时发布取消窗口 | ⚠️ |

### P1 — 开发中须关注

| # | 问题 | 行动 |
|---|------|------|
| 5 | 前端异常状态 UI 缺失 | 设计空状态、错误状态、加载骨架屏 |
| 6 | 评论 Markdown 安全边界 | 定义评论级 MD 白名单语法（仅加粗/代码/链接） |
| 7 | 暗色模式 FOUC | 内联 script 方案，React 水合前完成主题注入 |
| 8 | 编辑器选型 | CodeMirror 6 还是 TipTap，设计阶段二选一 |
| 9 | 反垃圾评论策略 | 审核机制 + 验证码 + 敏感词过滤 |
| 10 | Markdown 存储渲染分离 | 存储时同时保存 raw MD 和 rendered HTML |

### P2 — 建议改进

| # | 问题 | 行动 |
|---|------|------|
| 11 | 前端国际化预留 | v1.0 引入 i18n 框架但仅维护中文 |
| 12 | 后台响应式需求 | 明确管理后台是否需要移动端适配 |
| 13 | 快捷键体系统一定义 | / ? n p t 等快捷键纳入 useKeyboardShortcuts |
| 14 | ORM 选型 | Drizzle ORM，支持 SQLite → PG 迁移 |

---

## 六、评审结论

**PRD 评审结果：主要决策已落地，剩余 2 项待补。**

经两轮产品经理决策，P0 问题从 8 项收敛至 2 项。已解决：架构转向（all-in-one 在线编辑器）、v1.0 范围确认、评论/认证/搜索/图片存储方案选型。待补充：数据模型设计（核心表 ER 图）、编辑器边界状态（骨架屏/保存失败/断网恢复/定时发布窗口）。建议在正式启动开发前完成这两项补齐。

---

## 附录 A：架构二次评审（架构转向专项）

产品经理作出三项架构决策后，技术架构师进行了专项二次评审：
1. 内容管理方式改为 on-line Markdown 编辑器（all-in-one）
2. 数据库直接使用 PostgreSQL，跳过 SQLite
3. 部署至公司自有服务器 + Docker Compose

### A.1 转向结论

**方向正确，但执行风险被低估值约 30%。** all-in-one 方案消除了原方案「既要本地 MD 又要在线编辑器」的矛盾，产品一致性大幅提升。代价集中在三个领域：

| 风险领域 | 被低估程度 | 核心问题 |
|---------|-----------|---------|
| 编辑器子系统 | 严重低估 | CodeMirror 6 与 React SSR 集成、大文档渲染、30s 自动保存竞态、移动端不可用 |
| 自有服务器运维 | 严重低估 | 替代 Vercel 后 ISR 策略需重构、Nginx/Caddy/SSL/日志/监控全部需自建 |
| 数据安全基线 | 中度低估 | 从 Git 天然保障降为纯工程保障，必须有 pg_dump 全量备份策略兜底 |

### A.2 上线前必做三项准备

1. **补充数据模型设计（含 content_md + content_html 双字段）** — 架构转向后所有内容存储在 PostgreSQL，数据表结构直接影响系统可靠性
2. **编辑器边界状态设计** — 骨架屏、自动保存失败提示、断网本地缓存恢复、定时发布取消窗口
3. **数据备份方案落地** — pg_dump 每日全量 + 远程归档至 MinIO + 恢复手册文档化

### A.3 新增高优先级风险

- **在线编辑器预览区 XSS**：用户编辑 Markdown 时预览区若未 sanitize，可在发布前就触发 XSS。需统一发布/预览两端的 sanitize 管线
- **API 未认证访问后台**：`/api/admin/*` 直接操作数据库，认证绕过等于全站泄漏。需 Next.js Middleware 统一拦截
- **PostgreSQL 端口暴露**：5432 端口如暴露至公网会直接被扫描，需 Docker 内部网络隔离

### A.4 运维三件套清单

Nginx/Caddy 反向代理 + SSL 自动续期 + Docker Compose 容器编排。ISR 策略从 Vercel 的全自动降为手动 `revalidate: 300` + 发布时触发 `revalidatePath`。CI/CD 通过 GitHub Actions 自托管 Runner 连公司服务器完成构建部署。

---

**评审团队签名：**

- 前端开发工程师
- 后端开发工程师
- 技术架构师（含二次评审）

**日期：** 2026-05-11
