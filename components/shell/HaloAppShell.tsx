'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Layers,
  MapPinned,
  Menu,
  Navigation,
  Plane,
  RadioTower,
  Route,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import ClientMap from '@/components/map/ClientMap';
import RouteAirspaceReviewSync from '@/components/planning/RouteAirspaceReviewSync';
import RouteNotamReviewSync from '@/components/planning/RouteNotamReviewSync';
import RouteStatusBar from '@/components/planning/RouteStatusBar';
import Sidebar from '@/components/sidebar/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HALO_PANEL_META } from '@/components/shell/haloNavigation';
import HaloLogo from '@/components/shell/HaloLogo';
import { assessDataFreshness, FRESHNESS_THRESHOLDS_MINUTES } from '@/lib/planning/freshness';
import { buildFlightAdminReview } from '@/lib/planning/flightAdmin';
import { buildFilingWorkflowReview } from '@/lib/planning/filingReminder';
import { calculateRoute } from '@/lib/planning/navigation';
import { STARTER_WAYPOINTS } from '@/lib/planning/sampleData';
import { calculateWeightBalance } from '@/lib/planning/weightBalance';
import { buildHaloMissionSummary, type HaloPanelId, type HaloStatusTone } from '@/lib/ui/halo';
import { cn } from '@/lib/utils';
import { useMapStore, type MapState } from '@/stores/mapStore';

export default function HaloAppShell({
  accountSyncEnabled,
}: {
  accountSyncEnabled: boolean;
}) {
  const {
    waypoints,
    activeAircraft,
    weightBalanceLoading,
    routeAirspaceReview,
    routeNotamReview,
    routeName,
    departureTime,
    cruiseAltitudeFt,
    filingChecklist,
    closeReminder,
    notamBriefingRecord,
    flightPlanFilingRecord,
    visibleLayers,
    planningMode,
    sidebarOpen,
    sidebarPanel,
    selectedFeature,
    setSidebarOpen,
    setSidebarPanel,
    setPlanningMode,
    toggleLayer,
    setViewport,
    clearRoute,
    addRouteWaypoint,
    setRouteName,
  } = useMapStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const now = useNowMinute();
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [activeAircraft, waypoints]);
  const routeFreshnessSignature = useMemo(
    () => `${waypoints.map((waypoint) => `${waypoint.id}:${waypoint.coordinates.join(',')}`).join('|')}@${activeAircraft.id}:${activeAircraft.cruiseSpeedKts}:${activeAircraft.fuelBurnGph}`,
    [activeAircraft.cruiseSpeedKts, activeAircraft.fuelBurnGph, activeAircraft.id, waypoints]
  );
  const routeCalculatedAt = useMemo(
    () => routeFreshnessSignature ? new Date().toISOString() : undefined,
    [routeFreshnessSignature]
  );
  const weightBalanceResult = useMemo(
    () => calculateWeightBalance({
      aircraft: activeAircraft,
      loading: weightBalanceLoading,
      tripFuelGal: route.summary.tripFuelGal,
    }),
    [activeAircraft, route.summary.tripFuelGal, weightBalanceLoading]
  );
  const filingReview = useMemo(
    () => buildFilingWorkflowReview({
      checklist: filingChecklist,
      closeReminder,
      now,
    }),
    [closeReminder, filingChecklist, now]
  );
  const flightAdminReview = useMemo(
    () => buildFlightAdminReview({
      notamRecord: notamBriefingRecord,
      flightPlanRecord: flightPlanFilingRecord,
      routeNotamReview,
      waypoints,
      departureTime,
      cruiseAltitudeFt,
      routeName,
      closeReminder,
      closeReview: filingReview,
      now,
    }),
    [
      closeReminder,
      cruiseAltitudeFt,
      departureTime,
      filingReview,
      flightPlanFilingRecord,
      notamBriefingRecord,
      now,
      routeName,
      routeNotamReview,
      waypoints,
    ]
  );
  const dataFreshness = useMemo(
    () => [
      assessDataFreshness({
        source: 'Route',
        updatedAt: routeCalculatedAt,
        maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.route,
      }),
      assessDataFreshness({
        source: 'Airspace',
        updatedAt: routeAirspaceReview.updatedAt,
        maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.airspace,
      }),
      assessDataFreshness({
        source: 'NOTAM',
        updatedAt: routeNotamReview.updatedAt,
        maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.notam,
      }),
      assessDataFreshness({
        source: 'W&B',
        updatedAt: weightBalanceResult.calculatedAt,
        maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.weightBalance,
      }),
    ],
    [
      routeAirspaceReview.updatedAt,
      routeCalculatedAt,
      routeNotamReview.updatedAt,
      weightBalanceResult.calculatedAt,
    ]
  );
  const mission = useMemo(
    () => buildHaloMissionSummary({
      route,
      waypoints,
      routeName,
      airspaceReview: routeAirspaceReview,
      notamReview: routeNotamReview,
      weightBalanceResult,
      dataFreshness,
      flightAdminReview,
    }),
    [
      dataFreshness,
      flightAdminReview,
      route,
      routeAirspaceReview,
      routeName,
      routeNotamReview,
      waypoints,
      weightBalanceResult,
    ]
  );

  const openPanel = (panel: HaloPanelId) => {
    setSidebarPanel(panel);
    setSidebarOpen(true);
  };

  const useSampleRoute = () => {
    const sampleRoute = ['FAOR', 'FALA', 'FAWB']
      .map((ident) => STARTER_WAYPOINTS.find((waypoint) => waypoint.ident === ident))
      .filter((waypoint): waypoint is (typeof STARTER_WAYPOINTS)[number] => Boolean(waypoint));

    clearRoute();
    setRouteName('Gauteng training triangle');
    sampleRoute.forEach((waypoint) => {
      addRouteWaypoint({
        ...waypoint,
        id: `${waypoint.id}-sample-${Date.now()}`,
      });
    });
    openPanel('route');
    focusWaypointSet(sampleRoute, 42);
  };

  const focusRoute = () => {
    if (waypoints.length === 0) {
      setViewport([28.0, -26.0], 7);
      return;
    }

    focusWaypointSet(waypoints, route.summary.totalDistanceNm);
  };

  const focusWaypointSet = (waypointSet: typeof waypoints, totalDistanceNm = 0) => {
    if (waypointSet.length === 0) {
      setViewport([28.0, -26.0], 7);
      return;
    }

    const [longitudeSum, latitudeSum] = waypointSet.reduce(
      (sum, waypoint) => [
        sum[0] + waypoint.coordinates[0],
        sum[1] + waypoint.coordinates[1],
      ],
      [0, 0]
    );
    const center: [number, number] = [
      longitudeSum / waypointSet.length,
      latitudeSum / waypointSet.length,
    ];
    const zoom = totalDistanceNm > 250 ? 5.5 : totalDistanceNm > 80 ? 7 : 8.5;
    setViewport(center, zoom);
  };

  const deckOpen = sidebarOpen;
  const showDashboard = !deckOpen;
  const showMapControls = !deckOpen;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f9f3e4] text-slate-950">
      <RouteAirspaceReviewSync />
      <RouteNotamReviewSync />

      <div className="absolute inset-0">
        <ClientMap />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(120deg,rgba(255,249,236,0.48),rgba(14,116,144,0.06)_52%,rgba(15,23,42,0.16))]" />

      <div className="pointer-events-none absolute inset-x-3 top-3 z-30 sm:inset-x-5 sm:top-5">
        <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-[1.6rem] border border-white/70 bg-white/90 px-3 py-2 shadow-[0_20px_60px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:px-4">
          <HaloLogo size="md" />
          <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            <Badge className={cn('border px-2.5 py-1 capitalize', getStatusBadgeClass(mission.status))}>
              {mission.status}
            </Badge>
            <p className="truncate text-sm font-semibold text-slate-800">{mission.routeLabel}</p>
            <span className="h-4 w-px bg-slate-200" />
            <p className="truncate text-xs font-medium text-slate-500">{mission.primaryAction}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openPanel('route')}
              className="hidden border-slate-200 bg-white/70 text-slate-800 hover:bg-white sm:inline-flex"
            >
              <Search className="h-3.5 w-3.5" />
              Search airport
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-slate-950 text-white hover:bg-slate-800"
            >
              <Menu className="h-3.5 w-3.5" />
              Deck
            </Button>
          </div>
        </div>
      </div>

      {showDashboard && (
        <MissionDashboard
          mission={mission}
          fuelRemainingPercent={calculateFuelRemainingPercent(route.summary.fuelRemainingGal, route.summary.usableFuelGal)}
          onStartRoute={() => openPanel('route')}
          onOpenBriefing={() => openPanel('briefing')}
          onUseSampleRoute={useSampleRoute}
          onSearchAirport={() => openPanel('route')}
        />
      )}

      {showMapControls && (
        <MapControlDeck
          planningMode={planningMode}
          visibleLayers={visibleLayers}
          onTogglePlanningMode={() => setPlanningMode(!planningMode)}
          onToggleLayer={toggleLayer}
          onFocusRoute={focusRoute}
          onOpenEmergency={() => openPanel('emergency')}
        />
      )}

      <RouteStatusBar />

      {isDesktop && deckOpen && (
        <div className="absolute bottom-5 right-5 top-24 z-30 w-[min(440px,calc(100vw-2.5rem))]">
          <Sidebar accountSyncEnabled={accountSyncEnabled} variant="desktop" />
        </div>
      )}

      {!isDesktop && (
        <>
          {!deckOpen && (
            <MobileNavigation
              activePanel={sidebarPanel}
              selectedFeatureActive={Boolean(selectedFeature)}
              onOpenPanel={openPanel}
            />
          )}
          <Sheet open={deckOpen} onOpenChange={setSidebarOpen}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="h-[100dvh] max-h-[100dvh] touch-pan-y gap-0 overflow-y-auto overscroll-contain rounded-none border-0 bg-white p-0 shadow-[0_-30px_90px_rgba(15,23,42,0.22)] backdrop-blur-xl [-webkit-overflow-scrolling:touch] sm:inset-x-4 sm:bottom-4 sm:h-[min(82dvh,760px)] sm:max-h-[760px] sm:rounded-[2rem] sm:border sm:border-white/70 sm:bg-white/95"
            >
              <div className="sr-only">
                <SheetTitle>Halo mission deck</SheetTitle>
                <SheetDescription>Route, weather, aircraft, briefing, admin, and emergency planning panels.</SheetDescription>
              </div>
              <Sidebar accountSyncEnabled={accountSyncEnabled} variant="sheet" />
            </SheetContent>
          </Sheet>
        </>
      )}

      {isDesktop && !deckOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="absolute right-5 top-24 z-30 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/15 backdrop-blur-xl hover:bg-white"
        >
          <Menu className="h-4 w-4" />
          Open mission deck
        </button>
      )}

      {!deckOpen && (
        <div className="pointer-events-none absolute bottom-24 left-4 z-20 hidden max-w-xs rounded-2xl border border-white/70 bg-white/80 p-3 text-xs text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-xl md:block lg:hidden">
        <p className="font-semibold text-slate-950">Tablet mission mode</p>
        <p className="mt-1">Map-first planning with the command deck available from the top bar.</p>
        </div>
      )}
    </main>
  );
}

function MissionDashboard({
  mission,
  fuelRemainingPercent,
  onStartRoute,
  onOpenBriefing,
  onUseSampleRoute,
  onSearchAirport,
}: {
  mission: ReturnType<typeof buildHaloMissionSummary>;
  fuelRemainingPercent: number;
  onStartRoute: () => void;
  onOpenBriefing: () => void;
  onUseSampleRoute: () => void;
  onSearchAirport: () => void;
}) {
  const StatusIcon = mission.status === 'ready'
    ? CheckCircle2
    : mission.status === 'stop'
      ? ShieldAlert
      : mission.status === 'review'
        ? AlertTriangle
        : Sparkles;

  return (
    <section className="pointer-events-none absolute left-3 right-3 top-24 z-20 sm:left-5 sm:right-auto sm:w-[min(28rem,calc(100vw-2.5rem))] lg:top-28">
      <Card className="pointer-events-auto border-white/70 bg-white/90 p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className={cn('rounded-2xl p-2.5 ring-1', getStatusIconClass(mission.status))}>
              <StatusIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={cn('border px-2 py-1 capitalize', getStatusBadgeClass(mission.status))}>
                  {mission.status}
                </Badge>
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-700">
                  Daylight cockpit
                </span>
              </div>
              <h1 className="mt-2 text-lg font-semibold tracking-[-0.04em] text-slate-950 sm:text-2xl">
                {mission.title}
              </h1>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 sm:line-clamp-none">{mission.detail}</p>
            </div>
          </div>

          <div className="hidden grid-cols-2 gap-2 text-xs sm:grid sm:grid-cols-3">
            <MissionMetric label="Route" value={mission.routeLabel} icon={<Route className="h-3.5 w-3.5" />} />
            <MissionMetric label="Fuel" value={mission.fuelLabel} icon={<Plane className="h-3.5 w-3.5" />} />
            <MissionMetric label="Airspace" value={mission.airspaceLabel} icon={<Layers className="h-3.5 w-3.5" />} />
            <MissionMetric label="W&B" value={mission.weightBalanceLabel} icon={<Navigation className="h-3.5 w-3.5" />} />
            <MissionMetric label="Admin" value={mission.adminLabel} icon={<RadioTower className="h-3.5 w-3.5" />} />
            <MissionMetric label="Data" value={mission.freshnessLabel} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          </div>

          <div className="hidden rounded-2xl border border-slate-200/80 bg-white/70 p-3 sm:block">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Fuel remaining margin</span>
              <span className="font-semibold text-slate-950">{mission.fuelLabel}</span>
            </div>
            <Progress value={fuelRemainingPercent} className="h-2 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-cyan-500" />
            <p className="mt-2 text-xs text-slate-500">{mission.freshnessLabel} · {mission.notamLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button type="button" onClick={onStartRoute} className="bg-slate-950 text-white hover:bg-slate-800">
              <Navigation className="h-3.5 w-3.5" />
              Start route
            </Button>
            <Button type="button" variant="outline" onClick={onSearchAirport} className="border-slate-200 bg-white/70">
              <Search className="h-3.5 w-3.5" />
              Airport
            </Button>
            <Button type="button" variant="outline" onClick={onUseSampleRoute} className="border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100/80">
              <Sparkles className="h-3.5 w-3.5" />
              Sample
            </Button>
            <Button type="button" variant="outline" onClick={onOpenBriefing} className="border-cyan-200 bg-cyan-50/80 text-cyan-900 hover:bg-cyan-100/80">
              <ClipboardIcon />
              Briefing
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MissionMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/70 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4 text-slate-900">{value}</p>
    </div>
  );
}

function MapControlDeck({
  planningMode,
  visibleLayers,
  onTogglePlanningMode,
  onToggleLayer,
  onFocusRoute,
  onOpenEmergency,
}: {
  planningMode: boolean;
  visibleLayers: MapState['visibleLayers'];
  onTogglePlanningMode: () => void;
  onToggleLayer: (layer: keyof MapState['visibleLayers']) => void;
  onFocusRoute: () => void;
  onOpenEmergency: () => void;
}) {
  const controls = [
    {
      label: planningMode ? 'Planning mode' : 'Inspect mode',
      icon: planningMode ? Navigation : MapPinned,
      onClick: onTogglePlanningMode,
      active: planningMode,
    },
    {
      label: 'Airspace layer',
      icon: Layers,
      onClick: () => onToggleLayer('airspaces'),
      active: visibleLayers.airspaces,
    },
    {
      label: 'Emergency tools',
      icon: ShieldAlert,
      onClick: onOpenEmergency,
      active: false,
    },
    {
      label: 'Focus route',
      icon: Crosshair,
      onClick: onFocusRoute,
      active: false,
    },
  ];

  return (
    <div className="absolute right-3 top-24 z-20 hidden flex-col gap-2 sm:right-5 sm:flex lg:left-5 lg:right-auto lg:top-auto lg:bottom-24">
      {controls.map((control) => (
        <Tooltip key={control.label}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={control.onClick}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white',
                control.active && 'border-cyan-200 bg-cyan-50 text-cyan-900'
              )}
              aria-label={control.label}
            >
              <control.icon className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">{control.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function MobileNavigation({
  activePanel,
  selectedFeatureActive,
  onOpenPanel,
}: {
  activePanel: HaloPanelId;
  selectedFeatureActive: boolean;
  onOpenPanel: (panel: HaloPanelId) => void;
}) {
  return (
    <nav className="absolute inset-x-3 bottom-3 z-30 rounded-[1.6rem] border border-white/70 bg-white/95 p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.2)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-6 gap-1">
        {HALO_PANEL_META.map(({ id, shortLabel, icon: Icon }) => {
          const active = !selectedFeatureActive && activePanel === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onOpenPanel(id)}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold text-slate-500 transition',
                active
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-900/20'
                  : 'hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className="h-4 w-4" />
              {shortLabel}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5h6M9 12h6M9 16h4" strokeLinecap="round" />
      <path d="M8 3h8l1 2h2v16H5V5h2l1-2Z" strokeLinejoin="round" />
    </svg>
  );
}

function calculateFuelRemainingPercent(remainingGal: number, usableGal: number): number {
  if (!Number.isFinite(remainingGal) || !Number.isFinite(usableGal) || usableGal <= 0) return 0;
  return Math.max(0, Math.min(100, (remainingGal / usableGal) * 100));
}

function getStatusBadgeClass(status: HaloStatusTone): string {
  const classes: Record<HaloStatusTone, string> = {
    idle: 'border-slate-200 bg-white text-slate-700',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    review: 'border-amber-200 bg-amber-50 text-amber-900',
    stop: 'border-rose-200 bg-rose-50 text-rose-800',
  };

  return classes[status];
}

function getStatusIconClass(status: HaloStatusTone): string {
  const classes: Record<HaloStatusTone, string> = {
    idle: 'bg-cyan-50 text-cyan-900 ring-cyan-100',
    ready: 'bg-emerald-50 text-emerald-800 ring-emerald-100',
    review: 'bg-amber-50 text-amber-900 ring-amber-100',
    stop: 'bg-rose-50 text-rose-800 ring-rose-100',
  };

  return classes[status];
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', onChange);

    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(id);
  }, []);

  return now;
}
