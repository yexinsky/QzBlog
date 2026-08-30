import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminBackupManager } from '@/components/console/AdminBackupManager';

export default async function AdminBackupPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/console/login?callbackUrl=/console/backup');

  return <AdminBackupManager />;
}
