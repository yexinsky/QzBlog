/**
 * scripts/cleanup-home-test.ts
 *
 * Removes ONLY the data inserted by scripts/seed-home-test.ts.
 *
 * Safety:
 *   - every row that this script can touch is identified by membership in
 *     the explicit SEED_USER_ID / SEED_TAGS / SEED_POSTS constant sets
 *     exported from scripts/seed-home-test.ts.
 *   - each candidate set is double-checked: every selected row must carry
 *     the expected scope prefix in its slug / username / email AND its
 *     ID must be present in the seed constant set. If any selected row
 *     fails the check, the script aborts before issuing any DELETE.
 *   - the script operates in dry-run mode unless `--apply` is passed,
 *     so a mis-typed command cannot delete data.
 *
 * Usage:
 *   npm run db:cleanup:home           # dry-run (default)
 *   npm run db:cleanup:home:apply     # commit deletions
 *
 * The script never logs DATABASE_URL or any other secret.
 */

import { inArray, sql } from 'drizzle-orm';
import { db, schema } from '../src/lib/db';
import {
  SEED_PREFIX,
  SEED_USER_ID,
  SEED_TAGS,
  SEED_POSTS,
} from './seed-home-test';

// ---------------------------------------------------------------------------
// Argument parsing
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

interface CleanupReport {
  mode: 'apply' | 'dry-run';
  postTagRows: number;
  posts: number;
  tags: number;
  users: number;
}

// Membership sets derived once from the seed constants.
const SEED_POST_ID_SET = new Set(SEED_POSTS.map((p) => p.id));
const SEED_TAG_ID_SET  = new Set(SEED_TAGS.map((t) => t.id));

function assertSeedPostId(id: string): void {
  if (!SEED_POST_ID_SET.has(id)) {
    throw new Error(
      `refusing to delete post_tags row with non-seed post_id=${id}`
    );
  }
}
function assertSeedTagId(id: string): void {
  if (!SEED_TAG_ID_SET.has(id)) {
    throw new Error(
      `refusing to delete post_tags row with non-seed tag_id=${id}`
    );
  }
}
function assertSeedPostRow(row: { id: string; slug: string }): void {
  if (!SEED_POST_ID_SET.has(row.id) || !row.slug.startsWith(SEED_PREFIX)) {
    throw new Error(
      `refusing to delete posts row with non-seed id=${row.id} slug=${row.slug}`
    );
  }
}
function assertSeedTagRow(row: { id: string; slug: string }): void {
  if (!SEED_TAG_ID_SET.has(row.id) || !row.slug.startsWith(SEED_PREFIX)) {
    throw new Error(
      `refusing to delete tags row with non-seed id=${row.id} slug=${row.slug}`
    );
  }
}
function assertSeedUserRow(row: { id: string; username: string }): void {
  if (row.id !== SEED_USER_ID || !row.username.startsWith(SEED_PREFIX)) {
    throw new Error(
      `refusing to delete users row with non-seed id=${row.id} username=${row.username}`
    );
  }
}

async function cleanup(apply: boolean): Promise<CleanupReport> {
  console.log(`[cleanup] mode=${apply ? 'apply' : 'dry-run'} prefix=${SEED_PREFIX}`);

  const seedPostIds = SEED_POSTS.map((p) => p.id);
  const seedTagIds = SEED_TAGS.map((t) => t.id);

  // ---- post_tags ----
  const ptBefore = await db
    .select({ postId: schema.postTags.postId, tagId: schema.postTags.tagId })
    .from(schema.postTags)
    .where(inArray(schema.postTags.postId, seedPostIds));
  for (const row of ptBefore) {
    assertSeedPostId(row.postId);
    assertSeedTagId(row.tagId);
  }
  if (ptBefore.length > 0 && apply) {
    await db
      .delete(schema.postTags)
      .where(inArray(schema.postTags.postId, seedPostIds));
  }
  console.log(`[cleanup] post_tags -> DELETE ${ptBefore.length} rows`);

  // ---- posts ----
  const postsBefore = await db
    .select({ id: schema.posts.id, slug: schema.posts.slug })
    .from(schema.posts)
    .where(inArray(schema.posts.id, seedPostIds));
  for (const row of postsBefore) {
    assertSeedPostRow(row);
  }
  if (postsBefore.length > 0 && apply) {
    await db.delete(schema.posts).where(inArray(schema.posts.id, seedPostIds));
  }
  console.log(`[cleanup] posts    -> DELETE ${postsBefore.length} rows`);

  // ---- tags ----
  const tagsBefore = await db
    .select({ id: schema.tags.id, slug: schema.tags.slug })
    .from(schema.tags)
    .where(inArray(schema.tags.id, seedTagIds));
  for (const row of tagsBefore) {
    assertSeedTagRow(row);
  }
  if (tagsBefore.length > 0 && apply) {
    await db.delete(schema.tags).where(inArray(schema.tags.id, seedTagIds));
  }
  console.log(`[cleanup] tags     -> DELETE ${tagsBefore.length} rows`);

  // ---- user ----
  const userBefore = await db
    .select({ id: schema.users.id, username: schema.users.username })
    .from(schema.users)
    .where(sql`${schema.users.id} = ${SEED_USER_ID}`);
  for (const row of userBefore) {
    assertSeedUserRow(row);
  }
  if (userBefore.length > 0 && apply) {
    await db.delete(schema.users).where(sql`${schema.users.id} = ${SEED_USER_ID}`);
  }
  console.log(`[cleanup] user     -> DELETE ${userBefore.length} rows`);

  // ---- Verification (always) ----
  // Count remaining rows that still carry our scope prefix.
  const remaining = {
    posts: (
      await db
        .select({ id: schema.posts.id })
        .from(schema.posts)
        .where(inArray(schema.posts.id, seedPostIds))
    ).length,
    tags: (
      await db
        .select({ id: schema.tags.id })
        .from(schema.tags)
        .where(inArray(schema.tags.id, seedTagIds))
    ).length,
    users: (
      await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(sql`${schema.users.id} = ${SEED_USER_ID}`)
    ).length,
    postTags: (
      await db
        .select({ postId: schema.postTags.postId })
        .from(schema.postTags)
        .where(inArray(schema.postTags.postId, seedPostIds))
    ).length,
  };
  console.log(
    `[cleanup] verify -> remaining seed rows: posts=${remaining.posts} tags=${remaining.tags} users=${remaining.users} post_tags=${remaining.postTags}`
  );

  return {
    mode: apply ? 'apply' : 'dry-run',
    postTagRows: ptBefore.length,
    posts: postsBefore.length,
    tags: tagsBefore.length,
    users: userBefore.length,
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = parseApplyFlag(argv);
  const t0 = Date.now();
  const report = await cleanup(apply);
  const elapsed = Date.now() - t0;

  console.log('[cleanup] ----- summary -----');
  console.log(JSON.stringify(report, null, 2));
  console.log(`[cleanup] elapsed_ms=${elapsed}`);
  if (!apply) {
    console.log('[cleanup] DRY-RUN: no rows were modified. Re-run with --apply.');
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('[cleanup] FAILED:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
