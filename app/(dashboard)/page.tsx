import ClientMap from '@/components/map/ClientMap';
import Sidebar from '@/components/sidebar/Sidebar';
import RouteAirspaceReviewSync from '@/components/planning/RouteAirspaceReviewSync';
import RouteNotamReviewSync from '@/components/planning/RouteNotamReviewSync';
import RouteStatusBar from '@/components/planning/RouteStatusBar';
import { isPublicClerkConfigured } from '@/lib/auth/accountAuth';

export default function DashboardPage() {
  const accountSyncEnabled = isPublicClerkConfigured();

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <RouteAirspaceReviewSync />
      <RouteNotamReviewSync />
      <Sidebar accountSyncEnabled={accountSyncEnabled} />
      <div className="flex-1 relative">
        <ClientMap />
        <RouteStatusBar />
      </div>
    </div>
  );
}
