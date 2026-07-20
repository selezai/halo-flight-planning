import ClientMap from '@/components/map/ClientMap';
import Sidebar from '@/components/sidebar/Sidebar';
import RouteAirspaceReviewSync from '@/components/planning/RouteAirspaceReviewSync';
import RouteNotamReviewSync from '@/components/planning/RouteNotamReviewSync';
import RouteStatusBar from '@/components/planning/RouteStatusBar';

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <RouteAirspaceReviewSync />
      <RouteNotamReviewSync />
      <Sidebar />
      <div className="flex-1 relative">
        <ClientMap />
        <RouteStatusBar />
      </div>
    </div>
  );
}
