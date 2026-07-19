import dynamic from 'next/dynamic';
import Sidebar from '@/components/sidebar/Sidebar';
import RouteAirspaceReviewSync from '@/components/planning/RouteAirspaceReviewSync';
import RouteNotamReviewSync from '@/components/planning/RouteNotamReviewSync';
import RouteStatusBar from '@/components/planning/RouteStatusBar';

// Dynamic import for Map to avoid SSR issues with MapLibre
const Map = dynamic(() => import('@/components/map/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading map...</p>
      </div>
    </div>
  ),
});

export default function DashboardPage() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <RouteAirspaceReviewSync />
      <RouteNotamReviewSync />
      <Sidebar />
      <div className="flex-1 relative">
        <Map />
        <RouteStatusBar />
      </div>
    </div>
  );
}
