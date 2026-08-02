'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { shallow } from 'zustand/shallow';
import {
  buildOfflineMissionSnapshot,
  formatOfflineMissionSummary,
  HALO_OFFLINE_MISSION_SNAPSHOT_KEY,
} from '@/lib/planning/offlineMission';
import { calculateRoute } from '@/lib/planning/navigation';
import { cn } from '@/lib/utils';
import { useMapStore } from '@/stores/mapStore';

const HALO_SW_CONTROLLER_RELOAD_KEY = 'halo-sw-controller-reload-v1';

export default function OfflineMissionSupport() {
  const lastSnapshotWrite = useRef<{ signature: string; writtenAtMs: number } | null>(null);
  const {
    activeRoute,
    locationTracking,
    routeName,
    departureTime,
    cruiseAltitudeFt,
    activeAircraft,
    waypoints,
  } = useMapStore((state) => ({
    activeRoute: state.activeRoute,
    locationTracking: state.locationTracking,
    routeName: state.routeName,
    departureTime: state.departureTime,
    cruiseAltitudeFt: state.cruiseAltitudeFt,
    activeAircraft: state.activeAircraft,
    waypoints: state.waypoints,
  }), shallow);
  const [online, setOnline] = useState(true);
  const [snapshotSummary, setSnapshotSummary] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [activeAircraft, waypoints]);
  const canSnapshotActiveMission = activeRoute.status === 'active' && waypoints.length >= 2;
  const snapshotSignature = useMemo(
    () => [
      routeName,
      departureTime,
      cruiseAltitudeFt,
      activeAircraft.id,
      activeAircraft.registration,
      activeAircraft.cruiseSpeedKts,
      activeAircraft.fuelBurnGph,
      activeAircraft.usableFuelGal,
      activeRoute.status,
      activeRoute.startedAt,
      waypoints
        .map((waypoint) => `${waypoint.id}:${waypoint.type}:${waypoint.ident ?? ''}:${waypoint.name}:${waypoint.coordinates.join(',')}:${waypoint.notes ?? ''}`)
        .join('|'),
    ].join('::'),
    [
      activeAircraft.cruiseSpeedKts,
      activeAircraft.fuelBurnGph,
      activeAircraft.id,
      activeAircraft.registration,
      activeAircraft.usableFuelGal,
      activeRoute.startedAt,
      activeRoute.status,
      cruiseAltitudeFt,
      departureTime,
      routeName,
      waypoints,
    ]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setOnline(window.navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isSecureContext =
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';

    if (!isSecureContext) return;

    let disposed = false;

    const handleControllerChange = () => {
      if (disposed) return;

      try {
        if (window.sessionStorage.getItem(HALO_SW_CONTROLLER_RELOAD_KEY) === '1') return;
        window.sessionStorage.setItem(HALO_SW_CONTROLLER_RELOAD_KEY, '1');
      } catch {
        // If sessionStorage is unavailable, still prefer one safe reload on controller change.
      }

      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((registration) => {
      const activateWaitingWorker = () => {
        registration.waiting?.postMessage({ type: 'HALO_SKIP_WAITING' });
      };

      activateWaitingWorker();

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            installingWorker.postMessage({ type: 'HALO_SKIP_WAITING' });
          }
        });
      });

      registration.update().catch((error: unknown) => {
        console.warn(JSON.stringify({
          level: 'warn',
          message: 'offline_service_worker_update_failed',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }));
      });
    }).catch((error: unknown) => {
      console.warn(JSON.stringify({
        level: 'warn',
        message: 'offline_service_worker_registration_failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }));
    });

    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !canSnapshotActiveMission) return;

    try {
      const nowMs = Date.now();
      const lastWrite = lastSnapshotWrite.current;
      const gpsOnlyUpdate =
        lastWrite?.signature === snapshotSignature &&
        nowMs - lastWrite.writtenAtMs < 15_000;

      if (gpsOnlyUpdate) return;

      const snapshot = buildOfflineMissionSnapshot({
        routeName,
        departureTime,
        cruiseAltitudeFt,
        activeAircraft,
        waypoints,
        route,
        activeRoute,
        locationTracking,
      });

      window.localStorage.setItem(HALO_OFFLINE_MISSION_SNAPSHOT_KEY, JSON.stringify(snapshot));
      lastSnapshotWrite.current = {
        signature: snapshotSignature,
        writtenAtMs: nowMs,
      };
      setSnapshotSummary(formatOfflineMissionSummary(snapshot));
      setSnapshotError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setSnapshotError(message);
      console.warn(JSON.stringify({
        level: 'warn',
        message: 'offline_mission_snapshot_failed',
        error: message,
        timestamp: new Date().toISOString(),
      }));
    }
  }, [
    activeAircraft,
    activeRoute,
    canSnapshotActiveMission,
    cruiseAltitudeFt,
    departureTime,
    locationTracking,
    route,
    routeName,
    snapshotSignature,
    waypoints,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || snapshotSummary || canSnapshotActiveMission) return;

    const stored = window.localStorage.getItem(HALO_OFFLINE_MISSION_SNAPSHOT_KEY);
    if (!stored) return;

    try {
      setSnapshotSummary(formatOfflineMissionSummary(JSON.parse(stored)));
    } catch {
      window.localStorage.removeItem(HALO_OFFLINE_MISSION_SNAPSHOT_KEY);
    }
  }, [canSnapshotActiveMission, snapshotSummary]);

  if (online && !canSnapshotActiveMission && !snapshotError) return null;

  return (
    <div className="pointer-events-none absolute bottom-[5.5rem] right-3 z-20 max-w-[min(19rem,calc(100vw-1.5rem))] sm:right-5 md:bottom-[4.75rem]">
      <div
        className={cn(
          'rounded-2xl border px-3 py-2 text-[11px] font-semibold shadow-lg shadow-slate-900/10 backdrop-blur-xl',
          online
            ? 'border-emerald-200 bg-emerald-50/90 text-emerald-900'
            : 'border-amber-200 bg-amber-50/95 text-amber-900',
          snapshotError && 'border-amber-300 bg-amber-50/95 text-amber-950'
        )}
      >
        <div className="flex items-center gap-2">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>{online ? 'Offline snapshot saved' : 'Offline mode'}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 font-medium leading-4 opacity-80">
          {snapshotError
            ? `Snapshot issue: ${snapshotError}`
            : snapshotSummary
              ? `${snapshotSummary} · verify live data when back online.`
              : online
                ? 'Active mission snapshot saved for basic offline reference.'
                : 'Cached app shell only. Live aviation, weather, and NOTAM data is unavailable offline.'}
        </p>
      </div>
    </div>
  );
}
