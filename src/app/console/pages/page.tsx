import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { asc } from 'drizzle-orm';
import { authOptions } from '@/lib/auth';
import { db, schema } from '@/lib/db';
import { AdminPagesManager } from '@/components/console/AdminPagesManager';

export default async function AdminPagesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/console/login?callbackUrl=/console/pages');

  const pages = await db.query.singlePages.findMany({
    columns: { id: true, title: true, slug: true, contentMd: true, visible: true, createdAt: true, updatedAt: true },
    orderBy: [asc(schema.singlePages.createdAt)],
  });

  return <AdminPagesManager initialPages={pages.map((page) => ({ ...page, createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString() }))} />;
}
