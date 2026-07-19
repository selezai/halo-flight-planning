'use client';

import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Fuel, Navigation } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import {
  calculateRoute,
  formatDistance,
  formatDuration,
  formatFuel,
} from '@/lib/planning/navigation';

export default function RouteStatusBar() {
  const { waypoints, activeAircraft } = useMapStore();
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [waypoints, activeAircraft]);
  const statusTone =
    route.summary.fuelStatus === 'critical'
      ? 'text-rose-700'
      : route.summary.fuelStatus === 'caution'
        ? 'text-amber-700'
        : 'text-emerald-700';
  const StatusIcon = route.summary.fuelStatus === 'ok' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex justify-center">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 overflow-x-auto rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-1 font-semibold text-slate-950">
          <Navigation className="h-3.5 w-3.5" />
          {waypoints.length > 0
            ? waypoints.map((waypoint) => waypoint.ident ?? waypoint.name).join(' -> ')
            : 'No route'}
        </span>
        <Divider />
        <span>{formatDistance(route.summary.totalDistanceNm)}</span>
        <span>{formatDuration(route.summary.estimatedTimeMinutes)}</span>
        <span className="inline-flex items-center gap-1">
          <Fuel className="h-3.5 w-3.5" />
          {formatFuel(route.summary.totalFuelRequiredGal)}
        </span>
        <span className={`inline-flex items-center gap-1 font-semibold ${statusTone}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {route.summary.fuelStatus}
        </span>
        <Divider />
        <span>{activeAircraft.registration} {activeAircraft.type}</span>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="h-4 w-px shrink-0 bg-slate-200" />;
}
