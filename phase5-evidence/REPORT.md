# Phase 5 首页视觉+真实数据 独立交付报告

## 任务范围
- `src/components/article/ArticleCard.tsx` (修复 lucide Tag 错误导入)
- `src/app/page.tsx` (重写为 async server component, 真实 DB)
- `src/lib/queries/home.ts` (新建, DB 查询函数)
- **未修改**: schema / API / database / 其他文件
- **未还原**: 他人已合入的改动

## 实施要点

### 1. ArticleCard.tsx 修复
- 移除 `import { Tag } from 'lucide-react'`
- 改用 `import { Tag as UiTag } from '@/components/ui/Tag'`
- 移除多余的 `getReadingTime` / `TagCloud` 死代码 import
- 卡片结构升级为 `flex flex-col h-full`, 桌面 grid 中所有卡等高
- 封面容器: `<div class="relative w-full aspect-[16/9] overflow-hidden bg-background-hover">` + `<img class="absolute inset-0 w-full h-full object-cover">`, 显式 `loading="lazy"`
- meta 区域重排, 始终 `pt-4 mt-4 border-t border-border` 锁底
- 头像 / 标题行加 `min-w-0 truncate`, 防止长用户名撑爆布局

### 2. lib/queries/home.ts 新建
单一 `getHomePageData()` 函数, `Promise.all` 并发拉取 4 类数据:
- 6 条最新发布文章 (含 author + tags 关联, pinned 优先)
- 20 个标签 (含文章数, 按 createdAt desc)
- 5 条最近发布 (slug + date)
- 首个 admin user (ProfileCard 用)

统一映射 Drizzle 行 → UI 形状, 日期归一为 ISO / YYYY-MM-DD, 阅读时长从 `wordCount` 推导, 永远不会渲染 0 分钟。

### 3. page.tsx 重写
- 顶部 `export const dynamic = 'force-dynamic'`, 避免 Next 14 静态化时丢 mysql2 vendor chunk
- 删除全部 mock 数组 (`mockArticles` / `mockTags` / `mockRecentPosts`)
- 删除无 DB 支持的「分类导航」grid
- 侧栏:
  - `ProfileCard` 用真实 `users` 行 (username / bio / avatarUrl / top 5 tags)
  - `TagCloudSection` 仅在 `tags.length > 0` 时渲染
  - `RecentPostsSection` 仅在 `recentPosts.length > 0` 时渲染
- 主区:
  - 文章列表来自真实 DB, 2 列 grid
  - `articles.length === 0` 走 `EmptyState` (内联 SVG 插画 + 主标题 + 描述 + 两 CTA + seed 提示)
  - `totalPosts > 0` 时右侧显示「查看全部 →」链接
- `metadata` 与原页面一致, 标题 / 描述 / OG 保留

## Build 结果
```
✓ Compiled successfully
✓ Generating static pages (24/24)

Route (app)
┌ ƒ /                                    2.48 kB         106 kB    <- Dynamic
├ ○ /_not-found                          141 B          87.4 kB
├ ○ /about                               2 kB            105 kB
├ ○ /admin                               1.6 kB          105 kB
├ ○ /admin/login                         2.71 kB         109 kB
├ ƒ /api/*  (12 路由)                       0 B                0 B
├ ○ /categories                          2 kB            105 kB
├ ƒ /categories/[slug]                   2 kB            105 kB
├ ○ /learning                            2 kB            105 kB
├ ƒ /learning/[slug]                     2 kB            105 kB
├ ƒ /moments, /moments/[id]              2 kB            105 kB
├ ƒ /posts                               2.48 kB         106 kB
├ ƒ /posts/[slug]                        6.5 kB          110 kB
├ ○ /projects                            2 kB            105 kB
├ ƒ /projects/[id]                       2 kB            105 kB
├ ƒ /robots.txt, /rss.xml, /sitemap.xml  0 B                0 B
├ ○ /tags                                2 kB            105 kB
├ ƒ /tags/[slug]                         2.47 kB         106 kB
├ ○ /timeline                            2 kB            105 kB
+ First Load JS shared by all            87.3 kB
ƒ Middleware                             47.8 kB
```

`/` 从 `○ (Static)` 变 `ƒ (Dynamic)` 是预期行为: 页面消费 DB, 必须 SSR, 不能 build-time 预渲染。

## Production smoke (port 3102)

| 检查 | 期望 | 实际 |
|---|---|---|
| `GET /` 状态码 | 200 | **200** |
| 响应体大小 | 非空 | 69271 bytes |
| `getting-started-nextjs` (旧 mock) | 不存在 | **False** |
| `tailwindcss-best-practices` (旧 mock) | 不存在 | **False** |
| `typescript-advanced-patterns` (旧 mock) | 不存在 | **False** |
| `/categories/frontend` (旧分类导航) | 不存在 | **False** |
| `分类导航` 旧 label | 不存在 | **False** |
| `lucide-tag` 巨型 SVG 类 | 0 次 | **0** |
| Tag chip (`inline-flex items-center font-medium rounded-button`) | > 0 | **34** |
| `aspect-[16/9]` 封面容器 | 存在 | **8** |
| `object-cover` 图片 | 存在 | **13** |
| 真实文章链接 `href="/posts/..."` | 4 卡 × 2 链接 = 8 | **8** |
| ProfileCard (Qzhou + bio + chips) | 渲染 | ✓ |
| 「最新文章」主标题 | 渲染 | ✓ |
| 「查看全部 →」CTA | 渲染 | **2** (1 文本 + 1 链接) |
| 标签云 / 最近文章 sidebar | 渲染 | ✓ |
| 空态 CTA 文字 | 隐藏 (DB 有 4 篇) | **0** ✓ |

DB 实际: `GET /api/posts` → 4 published posts 已写入, 首页正确呈现 4 张卡 + 真实标签 + sidebar。

## 改动文件清单
| 文件 | 类型 | 说明 |
|---|---|---|
| `src/components/article/ArticleCard.tsx` | 修改 | 修复 lucide Tag 错误导入; 卡布局升级 (h-full / 16:9 / object-cover / lazy) |
| `src/lib/queries/home.ts` | 新建 | 集中首页 DB 查询 (articles + tags + recent + profile) |
| `src/app/page.tsx` | 重写 | async server component, 删 mock, 删分类导航, 加美观空态 |
| `phase5-build.log` | 新建 | 完整 next build 输出 |
| `phase5-server-3102.log/.err.log` | 新建 | smoke 服务日志 |
| `phase5-evidence/REPORT.md` | 新建 | 本报告 |
| `phase5-evidence/phase5-smoke.txt` | 新建 | smoke 摘要 |

## 验收
- ✅ build 通过 (`/` Dynamic, 24/24 路由)
- ✅ 真实 DB 数据落地 (4 posts, 真实 tags)
- ✅ 所有 mock 数据 + 分类导航 彻底清除
- ✅ lucide Tag 巨型 SVG bug 修复
- ✅ 卡片视觉统一 (16:9 封面 + object-cover + 桌面等高)
- ✅ 空库分支完整 (SVG 插画 + 两 CTA + seed 提示)
- ✅ schema / API / 其他文件 **未改动**
- ✅ `npm run build` 无新增 warning / error
