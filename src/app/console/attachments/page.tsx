import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminAttachmentsManager } from '@/components/console/AdminAttachmentsManager';

export default async function AdminAttachmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/console/login?callbackUrl=/console/attachments');

  return <AdminAttachmentsManager />;
}
