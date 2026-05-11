import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  boolean,
  integer,
  jsonb,
  date,
  serial,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// Users Table - 博主用户表
// ============================================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  githubId: varchar('github_id', { length: 100 }).unique(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  role: varchar('role', { length: 20 }).notNull().default('admin'),
  bio: text('bio'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ============================================================================
// Posts Table - 文章表
// ============================================================================
export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    contentMd: text('content_md').notNull(),
    contentHtml: text('content_html').notNull(),
    summary: varchar('summary', { length: 500 }),
    coverImage: varchar('cover_image', { length: 500 }),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    isPinned: boolean('is_pinned').notNull().default(false),
    wordCount: integer('word_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    cancelScheduled: boolean('cancel_scheduled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('posts_author_id_idx').on(table.authorId),
    index('posts_slug_idx').on(table.slug),
    index('posts_status_idx').on(table.status),
    index('posts_published_at_idx').on(table.publishedAt),
    check('posts_status_check', `"status" IN ('draft', 'published', 'scheduled')`),
  ]
);

// ============================================================================
// Tags Table - 标签表
// ============================================================================
export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    color: varchar('color', { length: 7 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('tags_slug_idx').on(table.slug)]
);

// ============================================================================
// Post Tags Table - 文章与标签关联表
// ============================================================================
export const postTags = pgTable(
  'post_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [index('post_tags_post_id_idx').on(table.postId), index('post_tags_tag_id_idx').on(table.tagId)]
);

// ============================================================================
// Series Table - 系列表
// ============================================================================
export const series = pgTable(
  'series',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    coverImage: varchar('cover_image', { length: 500 }),
    isPinned: boolean('is_pinned').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('series_slug_idx').on(table.slug),
    index('series_is_pinned_idx').on(table.isPinned),
    index('series_sort_order_idx').on(table.sortOrder),
  ]
);

// ============================================================================
// Series Posts Table - 系列文章关联表
// ============================================================================
export const seriesPosts = pgTable(
  'series_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    seriesId: uuid('series_id')
      .notNull()
      .references(() => series.id, { onDelete: 'cascade' }),
    postId: uuid('post_id')
      .notNull()
      .unique()
      .references(() => posts.id, { onDelete: 'cascade' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('series_posts_series_id_idx').on(table.seriesId),
    index('series_posts_post_id_idx').on(table.postId),
    index('series_posts_sort_order_idx').on(table.sortOrder),
  ]
);

// ============================================================================
// Comments Table - 评论表
// ============================================================================
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): any => comments.id, { onDelete: 'cascade' }),
    rootId: uuid('root_id').references((): any => comments.id, { onDelete: 'cascade' }),
    depth: integer('depth').notNull().default(0),
    authorName: varchar('author_name', { length: 100 }).notNull(),
    authorEmail: varchar('author_email', { length: 255 }).notNull(),
    contentMd: text('content_md').notNull(),
    contentHtml: text('content_html').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    isPinned: boolean('is_pinned').notNull().default(false),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('comments_post_id_idx').on(table.postId),
    index('comments_parent_id_idx').on(table.parentId),
    index('comments_root_id_idx').on(table.rootId),
    index('comments_status_idx').on(table.status),
    index('comments_created_at_idx').on(table.createdAt),
    check('comments_depth_check', '"depth" BETWEEN 0 AND 1'),
    check('comments_status_check', `"status" IN ('pending', 'approved', 'rejected')`),
  ]
);

// ============================================================================
// Moments Table - 动态表
// ============================================================================
export const moments = pgTable(
  'moments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: varchar('content', { length: 500 }).notNull(),
    imageUrl: varchar('image_url', { length: 500 }),
    likeCount: integer('like_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('moments_published_at_idx').on(table.publishedAt)]
);

// ============================================================================
// Moment Likes Table - 动态点赞表
// ============================================================================
export const momentLikes = pgTable(
  'moment_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    momentId: uuid('moment_id')
      .notNull()
      .references(() => moments.id, { onDelete: 'cascade' }),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('moment_likes_moment_id_idx').on(table.momentId),
    unique('moment_likes_daily_unique').on(table.momentId, table.ipAddress),
  ]
);

// ============================================================================
// Post Likes Table - 文章点赞表
// ============================================================================
export const postLikes = pgTable(
  'post_likes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    ipAddress: varchar('ip_address', { length: 45 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('post_likes_post_id_idx').on(table.postId),
    unique('post_likes_daily_unique').on(table.postId, table.ipAddress),
  ]
);

// ============================================================================
// Projects Table - 项目展示表
// ============================================================================
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 200 }).notNull(),
    description: text('description'),
    techStack: jsonb('tech_stack').notNull().default([]),
    coverImage: varchar('cover_image', { length: 500 }),
    githubUrl: varchar('github_url', { length: 500 }),
    demoUrl: varchar('demo_url', { length: 500 }),
    starCount: integer('star_count').default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('projects_is_featured_idx').on(table.isFeatured),
    index('projects_sort_order_idx').on(table.sortOrder),
  ]
);

// ============================================================================
// Milestones Table - 里程碑时间线表
// ============================================================================
export const milestones = pgTable(
  'milestones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    eventDate: date('event_date').notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    icon: varchar('icon', { length: 50 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isPublic: boolean('is_public').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('milestones_event_date_idx').on(table.eventDate),
    index('milestones_event_type_idx').on(table.eventType),
    index('milestones_sort_order_idx').on(table.sortOrder),
    check(
      'milestones_event_type_check',
      `"event_type" IN ('work', 'study', 'open_source', 'speech', 'other')`
    ),
  ]
);

// ============================================================================
// Page Views Table - 访问统计原始数据表
// ============================================================================
export const pageViews = pgTable(
  'page_views',
  {
    id: serial('id').primaryKey(),
    pageType: varchar('page_type', { length: 50 }).notNull(),
    pageId: uuid('page_id'),
    visitorIp: varchar('visitor_ip', { length: 45 }),
    userAgent: varchar('user_agent', { length: 500 }),
    referrer: varchar('referrer', { length: 500 }),
    referrerType: varchar('referrer_type', { length: 20 }),
    country: varchar('country', { length: 100 }),
    visitedAt: timestamp('visited_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('page_views_page_type_idx').on(table.pageType),
    index('page_views_page_id_idx').on(table.pageId),
    index('page_views_visited_at_idx').on(table.visitedAt),
  ]
);

// ============================================================================
// Learning Paths Table - 学习路线表
// ============================================================================
export const learningPaths = pgTable(
  'learning_paths',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    coverImage: varchar('cover_image', { length: 500 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('learning_paths_slug_idx').on(table.slug)]
);

// ============================================================================
// Learning Nodes Table - 学习路线节点表
// ============================================================================
export const learningNodes = pgTable(
  'learning_nodes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pathId: uuid('path_id')
      .notNull()
      .references(() => learningPaths.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 20 }).notNull().default('planned'),
    postId: uuid('post_id').references(() => posts.id, { onDelete: 'set null' }),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('learning_nodes_path_id_idx').on(table.pathId),
    index('learning_nodes_sort_order_idx').on(table.sortOrder),
    check('learning_nodes_status_check', `"status" IN ('planned', 'learning', 'completed')`),
  ]
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