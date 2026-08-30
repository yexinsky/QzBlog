import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { RecycleBinManager } from '@/components/console/RecycleBinManager';

export default async function RecycleBinPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/console/login?callbackUrl=/console/posts/recycle-bin');

  return <RecycleBinManager />;
}
