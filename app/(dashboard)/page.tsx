import ClientMap from '@/components/map/ClientMap';
import Sidebar from '@/components/sidebar/Sidebar';
import RouteAirspaceReviewSync from '@/components/planning/RouteAirspaceReviewSync';
import RouteNotamReviewSync from '@/components/planning/RouteNotamReviewSync';
import RouteStatusBar from '@/components/planning/RouteStatusBar';

export default function DashboardPage() {
  const accountSyncEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

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
