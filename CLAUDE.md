# QzBlog 项目文档

## 1. 技术架构概述

QzBlog 是一个面向软件开发者的个人品牌站点，采用以下技术栈：

| 类别 | 技术方案 |
|------|---------|
| 框架 | Next.js App Router (SSR + ISR, 全栈 TypeScript) |
| 后端 | Next.js API Routes (BFF 层直连数据库) |
| 样式 | Tailwind CSS |
| 数据库 | MySQL 8.0 + Drizzle ORM |
| 认证 | NextAuth.js + GitHub OAuth |
| 图片存储 | MinIO (S3 兼容对象存储) |
| 语法高亮 | Shiki (SSR 友好) |
| Markdown 渲染 | remark + rehype 生态 |
| 部署 | Docker Compose (自有服务器) |

### MySQL 约定

- 目标版本为 MySQL 8.0，存储引擎使用 InnoDB，字符集使用 `utf8mb4`
- 业务主键使用 `varchar(36)`，由 Node.js `crypto.randomUUID()` 生成
- 时间字段使用 `datetime(3)`，应用连接统一按 UTC 读写
- Drizzle 使用 `mysql-core`、`mysql2` 驱动；MySQL 不支持通用 `RETURNING`，写入后按主键或唯一键重新查询
- 当前文章搜索使用 `LIKE`；启用 `FULLTEXT` 前必须验证 `ngram parser` 的中文检索效果

## 2. 目录结构

```
QzhouBlog/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API 路由
│   │   │   ├── posts/           # 文章 API
│   │   │   ├── moments/         # 动态 API
│   │   │   ├── comments/        # 评论 API
│   │   │   ├── likes/           # 点赞 API
│   │   │   ├── auth/            # 认证 API
│   │   │   ├── tags/            # 标签 API
│   │   │   ├── series/          # 系列 API
│   │   │   ├── projects/        # 项目 API
│   │   │   ├── milestones/      # 时间线 API
│   │   │   ├── learning/        # 学习路线 API
│   │   │   └── upload/          # 文件上传 API
│   │   ├── admin/               # 管理后台页面
│   │   ├── posts/               # 文章详情页
│   │   ├── moments/             # 动态页
│   │   ├── about/               # 关于页
│   │   ├── projects/            # 项目页
│   │   ├── timeline/            # 时间线页
│   │   ├── learning/            # 学习路线页
│   │   ├── search/              # 搜索页
│   │   ├── tags/                # 标签页
│   │   └── series/              # 系列页
│   ├── components/
│   │   ├── ui/                  # 基础 UI 组件
│   │   ├── layout/              # 布局组件
│   │   ├── article/             # 文章相关组件
│   │   ├── comments/            # 评论组件
│   │   └── admin/               # 管理后台组件
│   ├── hooks/                   # React Hooks
│   ├── lib/                     # 工具函数
│   │   ├── db.ts               # 数据库连接
│   │   ├── auth.ts              # NextAuth 配置
│   │   ├── markdown.ts          # Markdown 渲染管线
│   │   ├── rate-limit.ts        # 频率限制
│   │   └── storage.ts          # MinIO 存储
│   └── db/
│       └── schema.ts            # 数据库 Schema
├── drizzle/                     # Drizzle 迁移文件
├── tests/                       # 测试文件
│   ├── unit/                    # 单元测试
│   ├── integration/             # 集成测试
│   └── lib/                    # 测试工具
├── public/                     # 静态资源
└── docs/                       # 项目文档
```

## 3. 数据库模型

核心数据表（详见 PRD 第 9 章）：

- **users** - 博主用户表
- **posts** - 文章表（含 content_md/content_html 双字段）
- **tags** - 标签表
- **post_tags** - 文章标签关联表
- **series** - 系列表
- **series_posts** - 系列文章关联表
- **comments** - 评论表（支持 2 层嵌套）
- **moments** - 动态表
- **post_likes** - 文章点赞表
- **moment_likes** - 动态点赞表
- **projects** - 项目展示表
- **milestones** - 里程碑时间线表
- **page_views** - 访问统计表
- **learning_routes** - 学习路线表
- **learning_nodes** - 学习路线节点表（支持多级结构）
- **skills** - 技能栈表（含分类、熟练度）
- **social_links** - 社交链接表
- **work_experience** - 工作经历表
- **site_settings** - 站点设置表（单行设计）

## 4. API 路由设计

### 公开 API
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/posts | 获取文章列表 |
| GET | /api/posts/[slug] | 获取单篇文章 |
| GET | /api/moments | 获取动态列表 |
| GET | /api/comments?postId= | 获取评论列表 |
| POST | /api/likes | 点赞/取消点赞 |
| GET | /api/tags | 获取标签列表 |
| GET | /api/series | 获取系列列表 |
| GET | /api/projects | 获取项目列表 |
| GET | /api/milestones | 获取时间线 |
| GET | /api/learning | 获取学习路线列表 |
| GET | /api/learning/[slug] | 获取学习路线详情 |
| GET | /api/skills | 获取技能栈列表 |
| GET | /api/social-links | 获取社交链接列表 |

### 管理 API (需认证)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/posts | 创建文章 |
| PUT | /api/posts/[slug] | 更新文章 |
| DELETE | /api/posts/[slug] | 删除文章 |
| POST | /api/posts/[id]/draft | 保存草稿 |
| POST | /api/moments | 发布动态 |
| PUT | /api/moments/[id] | 更新动态 |
| DELETE | /api/moments/[id] | 删除动态 |
| PUT | /api/comments/[id] | 审核评论 |
| POST | /api/upload | 上传图片 |
| POST | /api/learning | 创建学习路线 |
| PUT | /api/learning/[id] | 更新学习路线 |
| DELETE | /api/learning/[id] | 删除学习路线 |
| POST | /api/learning/[id]/nodes | 添加学习节点 |
| PUT | /api/learning/nodes/[id] | 更新学习节点 |
| DELETE | /api/learning/nodes/[id] | 删除学习节点 |
| POST | /api/skills | 添加技能 |
| PUT | /api/skills/[id] | 更新技能 |
| DELETE | /api/skills/[id] | 删除技能 |
| POST | /api/social-links | 添加社交链接 |
| PUT | /api/social-links/[id] | 更新社交链接 |
| DELETE | /api/social-links/[id] | 删除社交链接 |
| POST | /api/work-experience | 添加工作经历 |
| PUT | /api/work-experience/[id] | 更新工作经历 |
| DELETE | /api/work-experience/[id] | 删除工作经历 |
| PUT | /api/settings | 更新站点设置 |

## 5. 安全策略

1. **认证**: NextAuth.js + GitHub OAuth，JWT 双 Token 机制
2. **授权**: Middleware 拦截 /admin/* 和 /api/admin/* 路由
3. **XSS 防护**: rehype-sanitize 过滤，白名单语法
4. **SQL 注入**: Drizzle ORM 参数化查询
5. **频率限制**: 评论/点赞 10次/min，登录 5次/min
6. **文件上传**: 白名单校验 + magic number + 5MB 限制 + UUID 重命名
7. **安全响应头**: CSP、X-Frame-Options、X-Content-Type-Options

## 6. 性能优化

- Next.js SSR + ISR 混合策略
- 图片懒加载
- 代码块按需语法高亮
- 全站搜索 MySQL LIKE / FULLTEXT（≤500ms）
- 首页 FCP ≤ 1.5s，文章页加载 ≤ 2s

## 7. 代码规范

### TypeScript
- 使用严格模式
- 组件使用 Function Component + Hooks
- 类型定义优先于 any

### 样式
- Tailwind CSS 工具类
- 遵循 PRD 设计规范（颜色、间距、圆角）
- 支持暗色模式

### API
- Zod 输入验证
- 统一错误响应格式
- 分页支持

## 8. 快捷键体系

| 快捷键 | 作用域 | 功能 |
|--------|--------|------|
| / | 全站 | 聚焦搜索框 |
| ? | 全站 | 显示快捷键帮助 |
| t | 全站 | 切换主题 |
| Ctrl+S | 编辑器 | 保存草稿 |
| Ctrl+Shift+P | 编辑器 | 发布文章 |
| Ctrl+B/I/K | 编辑器 | 加粗/斜体/链接 |

## 9. 环境变量

参考 .env.example:
- DATABASE_URL - MySQL 连接串
- NEXTAUTH_URL - 认证回调地址
- GITHUB_ID / GITHUB_SECRET - GitHub OAuth
- MINIO_ENDPOINT / MINIO_ACCESS_KEY / MINIO_SECRET_KEY - 对象存储



