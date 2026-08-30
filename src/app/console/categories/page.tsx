import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { asc, sql } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { AdminCategoriesManager } from '@/components/console/AdminCategoriesManager';

export default async function AdminCategoriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/console/login?callbackUrl=/console/categories');

  const rows = await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      slug: schema.categories.slug,
      description: schema.categories.description,
      sortOrder: schema.categories.sortOrder,
      postCount: sql<number>`(
        SELECT count(*) FROM ${schema.posts}
        WHERE ${schema.posts.categoryId} = ${schema.categories.id}
          AND ${schema.posts.status} = 'published'
      )`,
    })
    .from(schema.categories)
    .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.createdAt));

  return <AdminCategoriesManager initialCategories={rows.map((row) => ({ ...row, postCount: Number(row.postCount ?? 0) }))} />;
}
