import HaloAppShell from '@/components/shell/HaloAppShell';
import { isPublicClerkConfigured } from '@/lib/auth/accountAuth';

export default function DashboardPage() {
  const accountSyncEnabled = isPublicClerkConfigured();

  return <HaloAppShell accountSyncEnabled={accountSyncEnabled} />;
}
