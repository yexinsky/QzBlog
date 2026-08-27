import { randomUUID } from 'crypto';
import { relations, sql } from 'drizzle-orm';
import {
  mysqlTable,
  varchar,
  text,
  datetime,
  boolean,
  json,
  date,
  int,
  index,
  uniqueIndex,
  mysqlEnum,
  check,
} from 'drizzle-orm/mysql-core';

// ============================================================================
// Users Table - 博主用户表
// ============================================================================
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  githubId: varchar('github_id', { length: 100 }).unique(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  role: mysqlEnum('role', ['admin', 'author'] as const).notNull().default('admin'),
  bio: text('bio'),
  createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
});

// ============================================================================
// Posts Table - 文章表
// ============================================================================
export const posts = mysqlTable(
  'posts',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    authorId: varchar('author_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    contentMd: text('content_md').notNull(),
    contentHtml: text('content_html').notNull(),
    summary: varchar('summary', { length: 500 }),
    coverImage: varchar('cover_image', { length: 500 }),
    status: mysqlEnum('status', ['draft', 'published', 'scheduled'] as const)
      .notNull()
      .default('draft'),
    isPinned: boolean('is_pinned').notNull().default(false),
    wordCount: int('word_count').notNull().default(0),
    likeCount: int('like_count').notNull().default(0),
    viewCount: int('view_count').notNull().default(0),
    scheduledAt: datetime('scheduled_at', { mode: 'date', fsp: 3 }),
    publishedAt: datetime('published_at', { mode: 'date', fsp: 3 }),
    cancelScheduled: boolean('cancel_scheduled').notNull().default(false),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    authorIdIdx: index('posts_author_id_idx').on(table.authorId),
    slugIdx: index('posts_slug_idx').on(table.slug),
    statusIdx: index('posts_status_idx').on(table.status),
    publishedAtIdx: index('posts_published_at_idx').on(table.publishedAt),
    statusCheck: check('posts_status_check', sql`${table.status} IN ('draft', 'published', 'scheduled')`),
  })
);

// ============================================================================
// Tags Table - 标签表
// ============================================================================
export const tags = mysqlTable(
  'tags',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    color: varchar('color', { length: 7 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({ slugIdx: index('tags_slug_idx').on(table.slug) })
);

// ============================================================================
// Post Tags Table - 文章与标签关联表
// ============================================================================
export const postTags = mysqlTable(
  'post_tags',
  {
    postId: varchar('post_id', { length: 36 })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: varchar('tag_id', { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    postIdIdx: index('post_tags_post_id_idx').on(table.postId),
    tagIdIdx: index('post_tags_tag_id_idx').on(table.tagId),
  })
);

// ============================================================================
// Series Table - 系列表
// ============================================================================
export const series = mysqlTable(
  'series',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    coverImage: varchar('cover_image', { length: 500 }),
    isPinned: boolean('is_pinned').notNull().default(false),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    slugIdx: index('series_slug_idx').on(table.slug),
    isPinnedIdx: index('series_is_pinned_idx').on(table.isPinned),
    sortOrderIdx: index('series_sort_order_idx').on(table.sortOrder),
  })
);

// ============================================================================
// Series Posts Table - 系列文章关联表
// ============================================================================
export const seriesPosts = mysqlTable(
  'series_posts',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    seriesId: varchar('series_id', { length: 36 })
      .notNull()
      .references(() => series.id, { onDelete: 'cascade' }),
    postId: varchar('post_id', { length: 36 })
      .notNull()
      .unique()
      .references(() => posts.id, { onDelete: 'cascade' }),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    seriesIdIdx: index('series_posts_series_id_idx').on(table.seriesId),
    postIdIdx: index('series_posts_post_id_idx').on(table.postId),
    sortOrderIdx: index('series_posts_sort_order_idx').on(table.sortOrder),
  })
);

// ============================================================================
// Comments Table - 评论表
// ============================================================================
export const comments = mysqlTable(
  'comments',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    postId: varchar('post_id', { length: 36 })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parentId: varchar('parent_id', { length: 36 }).references((): any => comments.id, { onDelete: 'cascade' }),
    rootId: varchar('root_id', { length: 36 }).references((): any => comments.id, { onDelete: 'cascade' }),
    depth: int('depth').notNull().default(0),
    authorName: varchar('author_name', { length: 100 }).notNull(),
    authorEmail: varchar('author_email', { length: 255 }).notNull(),
    contentMd: text('content_md').notNull(),
    contentHtml: text('content_html').notNull(),
    status: mysqlEnum('status', ['pending', 'approved', 'rejected'] as const)
      .notNull()
      .default('pending'),
    isPinned: boolean('is_pinned').notNull().default(false),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    postIdIdx: index('comments_post_id_idx').on(table.postId),
    parentIdIdx: index('comments_parent_id_idx').on(table.parentId),
    rootIdIdx: index('comments_root_id_idx').on(table.rootId),
    statusIdx: index('comments_status_idx').on(table.status),
    createdAtIdx: index('comments_created_at_idx').on(table.createdAt),
    depthCheck: check('comments_depth_check', sql`${table.depth} BETWEEN 0 AND 1`),
    statusCheck: check('comments_status_check', sql`${table.status} IN ('pending', 'approved', 'rejected')`),
  })
);

// ============================================================================
// Moments Table - 动态表
// ============================================================================
export const moments = mysqlTable(
  'moments',
  {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    content: varchar('content', { length: 500 }).notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    likeCount: int('like_count').notNull().default(0),
    publishedAt: datetime('published_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({ publishedAtIdx: index('moments_published_at_idx').on(table.publishedAt) })
);

// ============================================================================
// Moment Likes Table - 动态点赞表
// ============================================================================
export const momentLikes = mysqlTable(
  'moment_likes',
  {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    momentId: varchar('moment_id', { length: 36 })
      .notNull()
      .references(() => moments.id, { onDelete: 'cascade' }),
    ipAddress: varchar('ip_address', { length: 64 }).notNull(),
    likeDate: date('like_date', { mode: 'string' }).notNull().default(sql`(CURRENT_DATE)`),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    momentIdIdx: index('moment_likes_moment_id_idx').on(table.momentId),
    dailyUnique: uniqueIndex('moment_likes_daily_unique').on(table.momentId, table.ipAddress, table.likeDate),
  })
);

// ============================================================================
// Post Likes Table - 文章点赞表
// ============================================================================
export const postLikes = mysqlTable(
  'post_likes',
  {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    postId: varchar('post_id', { length: 36 })
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    ipAddress: varchar('ip_address', { length: 64 }).notNull(),
    likeDate: date('like_date', { mode: 'string' }).notNull().default(sql`(CURRENT_DATE)`),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    postIdIdx: index('post_likes_post_id_idx').on(table.postId),
    dailyUnique: uniqueIndex('post_likes_daily_unique').on(table.postId, table.ipAddress, table.likeDate),
  })
);

// ============================================================================
// Projects Table - 项目展示表
// ============================================================================
export const projects = mysqlTable(
  'projects',
  {
  id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    techStack: json('tech_stack').notNull(),
    coverImage: varchar('cover_image', { length: 500 }),
    githubUrl: varchar('github_url', { length: 500 }),
    demoUrl: varchar('demo_url', { length: 500 }),
    starCount: int('star_count').default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    isFeaturedIdx: index('projects_is_featured_idx').on(table.isFeatured),
    sortOrderIdx: index('projects_sort_order_idx').on(table.sortOrder),
  })
);

// ============================================================================
// Milestones Table - 里程碑时间线表
// ============================================================================
export const milestones = mysqlTable(
  'milestones',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    eventDate: date('event_date').notNull(),
    eventType: mysqlEnum('event_type', ['work', 'study', 'open_source', 'speech', 'other'] as const)
      .notNull(),
    icon: varchar('icon', { length: 50 }),
    sortOrder: int('sort_order').notNull().default(0),
    isPublic: boolean('is_public').notNull().default(true),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    eventDateIdx: index('milestones_event_date_idx').on(table.eventDate),
    eventTypeIdx: index('milestones_event_type_idx').on(table.eventType),
    sortOrderIdx: index('milestones_sort_order_idx').on(table.sortOrder),
  })
);

// ============================================================================
// Page Views Table - 访问统计原始数据表
// ============================================================================
export const pageViews = mysqlTable(
  'page_views',
  {
    id: int('id').primaryKey().autoincrement(),
    pageType: varchar('page_type', { length: 50 }).notNull(),
    pageId: varchar('page_id', { length: 36 }),
    visitorIp: varchar('visitor_ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    referrer: varchar('referrer', { length: 500 }),
    referrerType: varchar('referrer_type', { length: 20 }),
    country: varchar('country', { length: 100 }),
    visitedAt: datetime('visited_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    pageTypeIdx: index('page_views_page_type_idx').on(table.pageType),
    pageIdIdx: index('page_views_page_id_idx').on(table.pageId),
    visitedAtIdx: index('page_views_visited_at_idx').on(table.visitedAt),
  })
);

// ============================================================================
// Learning Paths Table - 学习路线表
// ============================================================================
export const learningPaths = mysqlTable(
  'learning_paths',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    coverImage: varchar('cover_image', { length: 500 }),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({ slugIdx: index('learning_paths_slug_idx').on(table.slug) })
);

// ============================================================================
// Learning Nodes Table - 学习路线节点表
// ============================================================================
export const learningNodes = mysqlTable(
  'learning_nodes',
  {
    id: varchar('id', { length: 36 }).primaryKey().$defaultFn(() => randomUUID()),
    pathId: varchar('path_id', { length: 36 })
      .notNull()
      .references(() => learningPaths.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    status: mysqlEnum('status', ['planned', 'learning', 'completed'] as const)
      .notNull()
      .default('planned'),
    postId: varchar('post_id', { length: 36 }).references(() => posts.id, { onDelete: 'set null' }),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull().default(sql`(CURRENT_TIMESTAMP(3))`),
  },
  (table) => ({
    pathIdIdx: index('learning_nodes_path_id_idx').on(table.pathId),
    sortOrderIdx: index('learning_nodes_sort_order_idx').on(table.sortOrder),
    statusCheck: check('learning_nodes_status_check', sql`${table.status} IN ('planned', 'learning', 'completed')`),
  })
);

// ============================================================================
// Relations
// ============================================================================
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  tags: many(postTags),
  comments: many(comments),
  likes: many(postLikes),
  seriesPost: many(seriesPosts),
  learningNodes: many(learningNodes),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  posts: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));

export const seriesRelations = relations(series, ({ many }) => ({
  posts: many(seriesPosts),
}));

export const seriesPostsRelations = relations(seriesPosts, ({ one }) => ({
  series: one(series, {
    fields: [seriesPosts.seriesId],
    references: [series.id],
  }),
  post: one(posts, {
    fields: [seriesPosts.postId],
    references: [posts.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: 'parentChild',
  }),
  root: one(comments, {
    fields: [comments.rootId],
    references: [comments.id],
    relationName: 'rootChild',
  }),
  replies: many(comments, { relationName: 'parentChild' }),
}));

export const momentsRelations = relations(moments, ({ many }) => ({
  likes: many(momentLikes),
}));

export const momentLikesRelations = relations(momentLikes, ({ one }) => ({
  moment: one(moments, {
    fields: [momentLikes.momentId],
    references: [moments.id],
  }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
}));

export const projectsRelations = relations(projects, ({}) => ({}));

export const milestonesRelations = relations(milestones, ({}) => ({}));

export const pageViewsRelations = relations(pageViews, ({}) => ({}));

export const learningPathsRelations = relations(learningPaths, ({ many }) => ({
  nodes: many(learningNodes),
}));

export const learningNodesRelations = relations(learningNodes, ({ one }) => ({
  path: one(learningPaths, {
    fields: [learningNodes.pathId],
    references: [learningPaths.id],
  }),
  post: one(posts, {
    fields: [learningNodes.postId],
    references: [posts.id],
  }),
}));

// ============================================================================
// Type Exports
// ============================================================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type PostTag = typeof postTags.$inferSelect;
export type Series = typeof series.$inferSelect;
export type NewSeries = typeof series.$inferInsert;
export type SeriesPost = typeof seriesPosts.$inferSelect;
export type NewSeriesPost = typeof seriesPosts.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Moment = typeof moments.$inferSelect;
export type NewMoment = typeof moments.$inferInsert;
export type MomentLike = typeof momentLikes.$inferSelect;
export type NewMomentLike = typeof momentLikes.$inferInsert;
export type PostLike = typeof postLikes.$inferSelect;
export type NewPostLike = typeof postLikes.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
export type PageView = typeof pageViews.$inferSelect;
export type NewPageView = typeof pageViews.$inferInsert;
export type LearningPath = typeof learningPaths.$inferSelect;
export type NewLearningPath = typeof learningPaths.$inferInsert;
export type LearningNode = typeof learningNodes.$inferSelect;
export type NewLearningNode = typeof learningNodes.$inferInsert;


