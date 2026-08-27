/**
 * scripts/seed-home-test.ts
 *
 * Idempotently seeds a scoped slice of test data that is sufficient to render
 * the public home page (/) against a real database:
 *
 *   - 1 fixed seed user (author)
 *   - 4 published posts, varied cover / tags / dates
 *   - 5 tags and the corresponding post_tags join rows
 *
 * All rows are tagged with the deterministic scope prefix `home-seed-` so
 * the companion cleanup script can remove them safely without touching any
 * pre-existing data. Re-running with --apply is safe (it upserts).
 *
 * Identifier strategy (must fit in varchar(36)):
 *   - posts.id, tags.id, users.id use 36-char UUID-like strings whose first
 *     hex byte encodes the entity type (a=user, b=post, c=tag). This lets
 *     cleanup identify them by ID prefix as well as by slug/username prefix.
 *   - posts.slug, tags.slug, users.username, users.email carry the human-
 *     readable `home-seed-` prefix.
 *
 * Usage:
 *   npm run db:seed:home             # dry-run (default, no DB writes)
 *   npm run db:seed:home:apply       # commit to DB
 *
 * The script never logs DATABASE_URL or any other secret.
 */

import { and, eq, inArray, like } from 'drizzle-orm';
import { db, schema } from '../src/lib/db';
import { renderSimpleMarkdown } from './shared/markdown-to-html';

// ---------------------------------------------------------------------------
// Scope prefix - ALL inserted rows carry this prefix in their human-readable
// slug / username / email so cleanup can find them and never touch anything
// else. The prefix is also encoded in the first hex byte of each ID.
// ---------------------------------------------------------------------------
export const SEED_PREFIX = 'home-seed-';

// First-byte marker for IDs (still valid 36-char UUID-like strings)
const ID_USER = 'a'; // users
const ID_POST = 'b'; // posts
const ID_TAG  = 'c'; // tags

function mkId(marker: string, n: number): string {
  // 36 chars: 8-4-4-4-12. First byte = marker; last 12 bytes = 12-digit zero-
  // padded index. Middle bytes zero-filled.
  const tail = String(n).padStart(12, '0');
  return `${marker}0000000-0000-0000-0000-${tail}`;
}

export const SEED_USER_ID = mkId(ID_USER, 1);
export const SEED_USERNAME = `${SEED_PREFIX}user`;
export const SEED_USER_EMAIL = `${SEED_PREFIX}user@qzblog.local`;

interface SeedTag {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SeedPost {
  id: string;
  slug: string;
  title: string;
  summary: string;
  contentMd: string;
  coverImage: string;
  publishedAt: string;
  isPinned: boolean;
  wordCount: number;
  tagSlugs: string[];
  viewCount: number;
  likeCount: number;
}

export const SEED_TAGS: SeedTag[] = [
  {
    id: mkId(ID_TAG, 1),
    name: 'Next.js',
    slug: `${SEED_PREFIX}tag-nextjs`,
    color: '#000000',
  },
  {
    id: mkId(ID_TAG, 2),
    name: 'TypeScript',
    slug: `${SEED_PREFIX}tag-typescript`,
    color: '#3178C6',
  },
  {
    id: mkId(ID_TAG, 3),
    name: 'Tailwind',
    slug: `${SEED_PREFIX}tag-tailwind`,
    color: '#38BDF8',
  },
  {
    id: mkId(ID_TAG, 4),
    name: 'Database',
    slug: `${SEED_PREFIX}tag-database`,
    color: '#10B981',
  },
  {
    id: mkId(ID_TAG, 5),
    name: 'DevOps',
    slug: `${SEED_PREFIX}tag-devops`,
    color: '#F59E0B',
  },
];

export const SEED_POSTS: SeedPost[] = [
  {
    id: mkId(ID_POST, 1),
    slug: `${SEED_PREFIX}post-001-nextjs-app-router`,
    title: 'Next.js 14 App Router 完全指南',
    summary: '深入理解 Next.js 14 App Router 的服务端组件、嵌套布局与流式渲染，写出更快的应用。',
    contentMd: `# Next.js 14 App Router 完全指南

这是由 \`home-seed-001\` fixture 注入的种子文章正文，用于在真实数据库上验证首页渲染。

## 服务端组件

服务端组件默认在服务器上渲染，可以直接查询数据库。

\`\`\`tsx
export default async function Page() {
  const data = await db.query.posts.findMany();
  return <List data={data} />;
}
\`\`\`

## 嵌套布局

- 每个目录可以拥有自己的 layout.tsx
- 布局默认支持流式渲染
- loading.tsx 提供 Suspense 边界
`,
    coverImage:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80',
    publishedAt: '2026-01-15T09:00:00.000Z',
    isPinned: true,
    wordCount: 312,
    tagSlugs: [`${SEED_PREFIX}tag-nextjs`, `${SEED_PREFIX}tag-typescript`],
    viewCount: 1234,
    likeCount: 88,
  },
  {
    id: mkId(ID_POST, 2),
    slug: `${SEED_PREFIX}post-002-tailwind-design-system`,
    title: '用 Tailwind CSS 构建设计系统',
    summary: '把 Tailwind 的 utility 类抽象成可维护的设计令牌，跨产品保持视觉一致。',
    contentMd: `# 用 Tailwind CSS 构建设计系统

种子文章 002，覆盖 Tailwind 主题、插件与响应式策略。

## 设计令牌

- 颜色：tailwind.config.ts 中的 theme.extend.colors
- 字体：fontFamily + fontSize 联合定义
- 间距：spacing scale

\`\`\`ts
export default {
  theme: { extend: { colors: { brand: '#FF6B00' } } },
};
\`\`\`
`,
    coverImage:
      'https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=800&q=80',
    publishedAt: '2026-02-02T07:30:00.000Z',
    isPinned: false,
    wordCount: 268,
    tagSlugs: [`${SEED_PREFIX}tag-tailwind`, `${SEED_PREFIX}tag-nextjs`],
    viewCount: 856,
    likeCount: 47,
  },
  {
    id: mkId(ID_POST, 3),
    slug: `${SEED_PREFIX}post-003-typescript-advanced`,
    title: 'TypeScript 高级类型实战',
    summary: '条件类型、映射类型与模板字面量类型，配合 Drizzle Schema 的真实案例。',
    contentMd: `# TypeScript 高级类型实战

种子文章 003，演示条件类型与映射类型在 ORM Schema 中的应用。

## 条件类型

\`\`\`ts
type IsString<T> = T extends string ? true : false;
\`\`\`

## 映射类型

\`\`\`ts
type Nullable<T> = { [K in keyof T]: T[K] | null };
\`\`\`
`,
    coverImage:
      'https://images.unsplash.com/photo-1516116216624-53e69d1ef5e7?w=800&q=80',
    publishedAt: '2026-02-20T03:15:00.000Z',
    isPinned: false,
    wordCount: 412,
    tagSlugs: [`${SEED_PREFIX}tag-typescript`],
    viewCount: 967,
    likeCount: 73,
  },
  {
    id: mkId(ID_POST, 4),
    slug: `${SEED_PREFIX}post-004-mysql-ops`,
    title: 'MySQL 日常运维与索引优化',
    summary: '从慢查询日志到 EXPLAIN，再到生产环境索引设计的几条铁律。',
    contentMd: `# MySQL 日常运维与索引优化

种子文章 004，覆盖慢查询定位与索引覆盖。

## 慢查询定位

- 开启 slow_query_log
- 设置 long_query_time
- 使用 pt-query-digest 聚合

## 索引设计

- 最左前缀原则
- 覆盖索引减少回表
`,
    coverImage:
      'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800&q=80',
    publishedAt: '2026-03-05T11:45:00.000Z',
    isPinned: false,
    wordCount: 356,
    tagSlugs: [`${SEED_PREFIX}tag-database`, `${SEED_PREFIX}tag-devops`],
    viewCount: 540,
    likeCount: 22,
  },
];

// ---------------------------------------------------------------------------
// Argument parsing - no extra dependency, intentionally minimal.
// ---------------------------------------------------------------------------
function parseApplyFlag(argv: string[]): boolean {
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') return true;
    if (a === '--dry-run') return false;
    if (a.startsWith('--apply=')) return a.split('=')[1] !== 'false';
  }
  return false;
}

// ---------------------------------------------------------------------------
// Counters for the final summary report.
// ---------------------------------------------------------------------------
interface SeedReport {
  mode: 'apply' | 'dry-run';
  usersInserted: number;
  usersUpdated: number;
  tagsInserted: number;
  tagsUpdated: number;
  postsInserted: number;
  postsUpdated: number;
  postTagRelations: number;
}

async function seed(apply: boolean): Promise<SeedReport> {
  const report: SeedReport = {
    mode: apply ? 'apply' : 'dry-run',
    usersInserted: 0,
    usersUpdated: 0,
    tagsInserted: 0,
    tagsUpdated: 0,
    postsInserted: 0,
    postsUpdated: 0,
    postTagRelations: 0,
  };

  console.log(`[seed] mode=${report.mode} prefix=${SEED_PREFIX}`);

  // -- User -----------------------------------------------------------------
  const existingUserRows = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.id, SEED_USER_ID))
    .limit(1);

  const userRow = {
    id: SEED_USER_ID,
    username: SEED_USERNAME,
    email: SEED_USER_EMAIL,
    role: 'admin' as const,
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
    bio: '由 scripts/seed-home-test.ts 注入的种子用户，仅用于首页联调测试。',
  };

  if (existingUserRows.length === 0) {
    if (apply) {
      await db.insert(schema.users).values(userRow);
    }
    report.usersInserted += 1;
    console.log(`[seed] user -> INSERT ${SEED_USER_ID}`);
  } else {
    if (apply) {
      await db
        .update(schema.users)
        .set({
          username: userRow.username,
          email: userRow.email,
          role: userRow.role,
          avatarUrl: userRow.avatarUrl,
          bio: userRow.bio,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, SEED_USER_ID));
    }
    report.usersUpdated += 1;
    console.log(`[seed] user -> UPDATE ${SEED_USER_ID}`);
  }

  // -- Tags -----------------------------------------------------------------
  const tagIds = SEED_TAGS.map((t) => t.id);
  const existingTagIds = new Set(
    (
      await db
        .select({ id: schema.tags.id })
        .from(schema.tags)
        .where(inArray(schema.tags.id, tagIds))
    ).map((r) => r.id)
  );

  for (const t of SEED_TAGS) {
    if (!existingTagIds.has(t.id)) {
      if (apply) {
        await db.insert(schema.tags).values(t);
      }
      report.tagsInserted += 1;
      console.log(`[seed] tag  -> INSERT ${t.slug}`);
    } else {
      if (apply) {
        await db
          .update(schema.tags)
          .set({ name: t.name, slug: t.slug, color: t.color })
          .where(eq(schema.tags.id, t.id));
      }
      report.tagsUpdated += 1;
      console.log(`[seed] tag  -> UPDATE ${t.slug}`);
    }
  }

  // -- Posts ----------------------------------------------------------------
  const postIds = SEED_POSTS.map((p) => p.id);
  const existingPostIds = new Set(
    (
      await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(inArray(schema.posts.id, postIds))
    ).map((r) => r.id)
  );

  for (const p of SEED_POSTS) {
    const contentHtml = renderSimpleMarkdown(p.contentMd);
    const publishedAtDate = new Date(p.publishedAt);
    const row = {
      id: p.id,
      authorId: SEED_USER_ID,
      title: p.title,
      slug: p.slug,
      contentMd: p.contentMd,
      contentHtml,
      summary: p.summary,
      coverImage: p.coverImage,
      status: 'published' as const,
      isPinned: p.isPinned,
      wordCount: p.wordCount,
      viewCount: p.viewCount,
      likeCount: p.likeCount,
      scheduledAt: null,
      publishedAt: publishedAtDate,
      cancelScheduled: false,
    };

    if (!existingPostIds.has(p.id)) {
      if (apply) {
        await db.insert(schema.posts).values(row);
      }
      report.postsInserted += 1;
      console.log(`[seed] post -> INSERT ${p.slug}`);
    } else {
      if (apply) {
        await db
          .update(schema.posts)
          .set({
            authorId: row.authorId,
            title: row.title,
            slug: row.slug,
            contentMd: row.contentMd,
            contentHtml: row.contentHtml,
            summary: row.summary,
            coverImage: row.coverImage,
            status: row.status,
            isPinned: row.isPinned,
            wordCount: row.wordCount,
            viewCount: row.viewCount,
            likeCount: row.likeCount,
            publishedAt: row.publishedAt,
            updatedAt: new Date(),
          })
          .where(eq(schema.posts.id, p.id));
      }
      report.postsUpdated += 1;
      console.log(`[seed] post -> UPDATE ${p.slug}`);
    }
  }

  // -- post_tags relations --------------------------------------------------
  // Remove existing relations for these seed posts, then re-insert based on
  // the current tagSlugs. This makes re-runs converge even if the tag list
  // for a post changes between versions of the seed.
  const existingRelations = await db
    .select({ postId: schema.postTags.postId })
    .from(schema.postTags)
    .where(inArray(schema.postTags.postId, postIds));

  if (existingRelations.length > 0) {
    if (apply) {
      await db
        .delete(schema.postTags)
        .where(inArray(schema.postTags.postId, postIds));
    }
    console.log(
      `[seed] post_tags -> DELETE ${existingRelations.length} stale rows`
    );
  }

  const tagSlugToId = new Map(SEED_TAGS.map((t) => [t.slug, t.id]));
  const newRelations: { postId: string; tagId: string }[] = [];
  for (const p of SEED_POSTS) {
    for (const slug of p.tagSlugs) {
      const tagId = tagSlugToId.get(slug);
      if (!tagId) {
        throw new Error(`Unknown tag slug "${slug}" for post ${p.slug}`);
      }
      newRelations.push({ postId: p.id, tagId });
    }
  }

  if (newRelations.length > 0) {
    if (apply) {
      await db.insert(schema.postTags).values(newRelations);
    }
    report.postTagRelations = newRelations.length;
    console.log(
      `[seed] post_tags -> INSERT ${newRelations.length} rows`
    );
  }

  // -- Verification (always runs - cheap) ----------------------------------
  const verify = await db
    .select({
      postId: schema.postTags.postId,
      tagId: schema.postTags.tagId,
    })
    .from(schema.postTags)
    .where(inArray(schema.postTags.postId, postIds));
  const verifyPosts = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      status: schema.posts.status,
    })
    .from(schema.posts)
    .where(
      and(
        inArray(schema.posts.id, postIds),
        eq(schema.posts.status, 'published')
      )
    );
  console.log(
    `[seed] verify -> ${verifyPosts.length}/${SEED_POSTS.length} published posts, ${verify.length} post_tags rows`
  );

  return report;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = parseApplyFlag(argv);
  const t0 = Date.now();
  const report = await seed(apply);
  const elapsed = Date.now() - t0;

  // Tabular summary (no secrets).
  console.log('[seed] ----- summary -----');
  console.log(JSON.stringify(report, null, 2));
  console.log(`[seed] elapsed_ms=${elapsed}`);
  if (!apply) {
    console.log('[seed] DRY-RUN: no rows were modified. Re-run with --apply.');
  }
}

// Only run main() when this script is the entry point. This prevents
// the seed module from executing its main() when imported by
// scripts/cleanup-home-test.ts.
// Detect "this script is the entry point" by comparing process.argv[1]
// to our own filename. Under `jiti scripts/seed-home-test.ts` jiti is the
// require.main, so `require.main === module` would be false - we must use
// argv-based detection to avoid both running main() on import and skipping
// it when invoked directly.
const entryFile = process.argv[1] ? process.argv[1].replace(/\\/g, "/") : "";
const thisFile = (__filename || "").replace(/\\/g, "/");
const isMain = entryFile && thisFile && (
  entryFile === thisFile ||
  entryFile.endsWith(thisFile.split("/").slice(-1)[0])
);
if (isMain) {
  main().then(() => process.exit(0)).catch((err) => {
    console.error("[seed] FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

