import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { getSiteSettings } from '@/lib/settings';
import { AdminSettingsManager } from '@/components/console/AdminSettingsManager';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'admin') redirect('/console/login?callbackUrl=/console/settings');

  const settings = await getSiteSettings();
  return (
    <AdminSettingsManager
      initialSettings={{
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        darkModeDefault: settings.darkModeDefault,
        customCss: settings.customCss,
        icpNumber: settings.icpNumber,
        enableComments: settings.enableComments,
        seoKeywords: settings.seoKeywords,
        blockSearchEngine: settings.blockSearchEngine,
        smtpEnabled: settings.smtpEnabled,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpPassSet: Boolean(settings.smtpPass),
        smtpFrom: settings.smtpFrom,
        smtpDisplayName: settings.smtpDisplayName,
        feishuEnabled: settings.feishuEnabled,
        feishuWebhookUrl: settings.feishuWebhookUrl,
        feishuSecretSet: Boolean(settings.feishuSecret),
        feishuEvents: Array.isArray(settings.feishuEvents) ? settings.feishuEvents : [],
      }}
    />
  );
}
