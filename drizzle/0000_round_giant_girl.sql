CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_id" uuid,
	"root_id" uuid,
	"depth" integer DEFAULT 0 NOT NULL,
	"author_name" varchar(100) NOT NULL,
	"author_email" varchar(255) NOT NULL,
	"content_md" text NOT NULL,
	"content_html" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"parent_id" uuid,
	"title" varchar(200) NOT NULL,
	"description" text,
	"status" varchar(20) DEFAULT 'planned' NOT NULL,
	"post_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"cover_image" varchar(500),
	"learning_goal" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_routes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"event_date" date NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"icon" varchar(50),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moment_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moment_id" uuid NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moment_likes_daily_unique" UNIQUE("moment_id","ip_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "moments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" varchar(500) NOT NULL,
	"image_url" varchar(500),
	"like_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_type" varchar(50) NOT NULL,
	"page_id" uuid,
	"visitor_ip" varchar(45),
	"user_agent" varchar(500),
	"referrer" varchar(500),
	"referrer_type" varchar(20),
	"country" varchar(100),
	"visited_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_likes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_daily_unique" UNIQUE("post_id","ip_address")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "post_tags" (
	"post_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content_md" text NOT NULL,
	"content_html" text NOT NULL,
	"summary" varchar(500),
	"cover_image" varchar(500),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"cancel_scheduled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"tech_stack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cover_image" varchar(500),
	"github_url" varchar(500),
	"demo_url" varchar(500),
	"star_count" integer DEFAULT 0,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"cover_image" varchar(500),
	"is_pinned" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_posts_post_id_unique" UNIQUE("post_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"site_name" varchar(100) DEFAULT 'QzBlog' NOT NULL,
	"site_description" varchar(500),
	"site_logo" varchar(500),
	"site_favicon" varchar(500),
	"avatar_url" varchar(500),
	"bio" text,
	"dark_mode_default" boolean DEFAULT false NOT NULL,
	"icp备案号" varchar(100),
	"custom_css" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"icon" varchar(500),
	"color" varchar(7),
	"category" varchar(50),
	"proficiency" integer DEFAULT 0,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "social_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" varchar(50) NOT NULL,
	"url" varchar(500) NOT NULL,
	"icon" varchar(500),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"color" varchar(7),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name"),
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"github_id" varchar(100),
	"avatar_url" varchar(500),
	"role" varchar(20) DEFAULT 'admin' NOT NULL,
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company" varchar(200) NOT NULL,
	"position" varchar(200) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "comments" ADD CONSTRAINT "comments_root_id_comments_id_fk" FOREIGN KEY ("root_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_route_id_learning_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."learning_routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_parent_id_learning_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."learning_nodes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "learning_nodes" ADD CONSTRAINT "learning_nodes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "moment_likes" ADD CONSTRAINT "moment_likes_moment_id_moments_id_fk" FOREIGN KEY ("moment_id") REFERENCES "public"."moments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "post_tags" ADD CONSTRAINT "post_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series_posts" ADD CONSTRAINT "series_posts_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "series_posts" ADD CONSTRAINT "series_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_post_id_idx" ON "comments" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_parent_id_idx" ON "comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_root_id_idx" ON "comments" USING btree ("root_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_status_idx" ON "comments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "comments_created_at_idx" ON "comments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_nodes_route_id_idx" ON "learning_nodes" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_nodes_parent_id_idx" ON "learning_nodes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_nodes_sort_order_idx" ON "learning_nodes" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_routes_slug_idx" ON "learning_routes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "learning_routes_sort_order_idx" ON "learning_routes" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "milestones_event_date_idx" ON "milestones" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "milestones_event_type_idx" ON "milestones" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "milestones_sort_order_idx" ON "milestones" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moment_likes_moment_id_idx" ON "moment_likes" USING btree ("moment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "moments_published_at_idx" ON "moments" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_page_type_idx" ON "page_views" USING btree ("page_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_page_id_idx" ON "page_views" USING btree ("page_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_views_visited_at_idx" ON "page_views" USING btree ("visited_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_likes_post_id_idx" ON "post_likes" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_tags_post_id_idx" ON "post_tags" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_tags_tag_id_idx" ON "post_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_author_id_idx" ON "posts" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_slug_idx" ON "posts" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_status_idx" ON "posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_published_at_idx" ON "posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_is_featured_idx" ON "projects" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_sort_order_idx" ON "projects" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_slug_idx" ON "series" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_is_pinned_idx" ON "series" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_sort_order_idx" ON "series" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_posts_series_id_idx" ON "series_posts" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_posts_post_id_idx" ON "series_posts" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "series_posts_sort_order_idx" ON "series_posts" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skills_category_idx" ON "skills" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "skills_sort_order_idx" ON "skills" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "social_links_sort_order_idx" ON "social_links" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tags_slug_idx" ON "tags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "work_experience_sort_order_idx" ON "work_experience" USING btree ("sort_order");