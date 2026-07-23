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
import { assessDataFreshness, FRESHNESS_THRESHOLDS_MINUTES, formatFreshnessStatus } from '@/lib/planning/freshness';
import type { DataFreshness } from '@/types/planning';

export default function RouteStatusBar() {
  const waypoints = useMapStore((state) => state.waypoints);
  const activeAircraft = useMapStore((state) => state.activeAircraft);
  const cruiseAltitudeFt = useMapStore((state) => state.cruiseAltitudeFt);
  const routeAirspaceReview = useMapStore((state) => state.routeAirspaceReview);
  const routeNotamReview = useMapStore((state) => state.routeNotamReview);
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [waypoints, activeAircraft]);
  const airspaceSummary = useMemo(
    () => summarizeAirspaceReview(routeAirspaceReview.alerts, routeAirspaceReview.status),
    [routeAirspaceReview.alerts, routeAirspaceReview.status]
  );
  const airspaceFreshness = useMemo(() => assessDataFreshness({
    source: 'Airspace',
    updatedAt: routeAirspaceReview.updatedAt,
    maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.airspace,
  }), [routeAirspaceReview.updatedAt]);
  const notamFreshness = useMemo(() => assessDataFreshness({
    source: 'NOTAM',
    updatedAt: routeNotamReview.updatedAt,
    maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.notam,
  }), [routeNotamReview.updatedAt]);
  const statusTone =
    route.summary.fuelStatus === 'critical'
      ? 'text-rose-700'
      : route.summary.fuelStatus === 'caution'
        ? 'text-amber-700'
        : 'text-emerald-700';
  const StatusIcon = route.summary.fuelStatus === 'ok' ? CheckCircle2 : AlertTriangle;

  return (
    <div className="pointer-events-none absolute inset-x-5 bottom-5 z-20 hidden justify-center md:flex">
      <div className="pointer-events-auto flex max-w-full items-center gap-3 overflow-x-auto rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs shadow-lg shadow-slate-900/10 backdrop-blur-xl">
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
        {waypoints.length > 1 && (
          <>
            <Divider />
            <span className={`inline-flex items-center gap-1 font-semibold ${airspaceSummary.tone}`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {airspaceSummary.label} @ {Math.round(cruiseAltitudeFt)} ft
            </span>
            <FreshnessChip freshness={airspaceFreshness} />
            <FreshnessChip freshness={notamFreshness} />
          </>
        )}
        <Divider />
        <span>{activeAircraft.registration} {activeAircraft.type}</span>
      </div>
    </div>
  );
}

function FreshnessChip({ freshness }: { freshness: DataFreshness }) {
  const tone =
    freshness.status === 'current'
      ? 'text-emerald-700'
      : freshness.status === 'stale'
        ? 'text-amber-700'
        : 'text-slate-600';

  return (
    <span className={`font-semibold ${tone}`}>
      {freshness.source} {formatFreshnessStatus(freshness.status).toLowerCase()}
    </span>
  );
}

function Divider() {
  return <span className="h-4 w-px shrink-0 bg-slate-200" />;
}

function summarizeAirspaceReview(
  alerts: Array<{ level: 'info' | 'caution' | 'critical'; requiresReview: boolean }>,
  status: string
): { label: string; tone: string } {
  const criticalCount = alerts.filter((alert) => alert.level === 'critical').length;
  const reviewCount = alerts.filter((alert) => alert.requiresReview).length;

  if (criticalCount > 0) {
    return { label: `${criticalCount} airspace critical`, tone: 'text-rose-700' };
  }

  if (reviewCount > 0) {
    return { label: `${reviewCount} airspace review`, tone: 'text-amber-700' };
  }

  if (status === 'checking') {
    return { label: 'Airspace checking', tone: 'text-slate-600' };
  }

  if (status === 'partial' || status === 'rate-limited') {
    return { label: 'Airspace partial', tone: 'text-amber-700' };
  }

  if (status === 'unavailable') {
    return { label: 'Airspace unavailable', tone: 'text-slate-600' };
  }

  if (alerts.length > 0) {
    return { label: `${alerts.length} airspace clear`, tone: 'text-emerald-700' };
  }

  return { label: 'Airspace scan', tone: 'text-slate-600' };
}
