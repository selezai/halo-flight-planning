'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  Copy,
  Crosshair,
  FolderOpen,
  Layers,
  MapPinned,
  Menu,
  Navigation,
  Plane,
  PlusCircle,
  RadioTower,
  Route,
  Save,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HALO_PANEL_META } from '@/components/shell/haloNavigation';
import HaloLogo from '@/components/shell/HaloLogo';
import { assessDataFreshness, FRESHNESS_THRESHOLDS_MINUTES } from '@/lib/planning/freshness';
import { buildFlightAdminReview } from '@/lib/planning/flightAdmin';
import { buildFilingWorkflowReview } from '@/lib/planning/filingReminder';
import { getMissionStatusFromHaloStatus, sortMissionRecords } from '@/lib/planning/missions';
import { calculateRoute } from '@/lib/planning/navigation';
import { STARTER_WAYPOINTS } from '@/lib/planning/sampleData';
import { calculateWeightBalance } from '@/lib/planning/weightBalance';
import { buildHaloMissionSummary, type HaloPanelId, type HaloStatusTone } from '@/lib/ui/halo';
import { cn } from '@/lib/utils';
import { useMapStore, type MapState } from '@/stores/mapStore';
import type { HaloMissionRecord } from '@/types/planning';

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
    activeMissionId,
    missionLibrary,
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
    saveActiveMission,
    createBlankMission,
    duplicateActiveMission,
    loadMission,
    archiveMission,
  } = useMapStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [missionLibraryOpen, setMissionLibraryOpen] = useState(false);
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
  const sortedMissionLibrary = useMemo(
    () => sortMissionRecords(missionLibrary),
    [missionLibrary]
  );
  const activeSavedMissionCount = useMemo(
    () => sortedMissionLibrary.filter((savedMission) => savedMission.status !== 'archived').length,
    [sortedMissionLibrary]
  );

  const openPanel = (panel: HaloPanelId) => {
    setSidebarPanel(panel);
    setSidebarOpen(true);
  };

  const runPrimaryMissionAction = () => {
    if (mission.primaryAction === 'Fix W&B') {
      openPanel('aircraft');
      return;
    }

    if (mission.primaryAction === 'Resolve admin') {
      openPanel('admin');
      return;
    }

    if (mission.primaryAction === 'Open briefing' || mission.primaryAction === 'Export backup pack') {
      openPanel('briefing');
      return;
    }

    openPanel('route');
  };

  const saveMissionFromCurrentStatus = () => {
    saveActiveMission(getMissionStatusFromHaloStatus(mission.status));
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

  const plannerOpen = sidebarOpen;
  const showMissionStatusCard = !plannerOpen && !isDesktop;
  const showMapControls = !plannerOpen;

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
          <button
            type="button"
            onClick={() => setMissionLibraryOpen(true)}
            className="hidden min-w-0 flex-1 items-center gap-2 rounded-2xl px-2 py-1 text-left transition hover:bg-white/70 lg:flex"
          >
            <Badge className={cn('border px-2.5 py-1 capitalize', getStatusBadgeClass(mission.status))}>
              {mission.status}
            </Badge>
            <p className="truncate text-sm font-semibold text-slate-800">{mission.routeLabel}</p>
            <span className="h-4 w-px bg-slate-200" />
            <p className="truncate text-xs font-medium text-slate-500">{mission.primaryAction}</p>
          </button>
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
              onClick={() => setSidebarOpen(!plannerOpen)}
              className="hidden bg-slate-950 text-white hover:bg-slate-800 sm:inline-flex"
            >
              <Menu className="h-3.5 w-3.5" />
              Planner
            </Button>
          </div>
        </div>
      </div>

      {showMissionStatusCard && (
        <MissionStatusCard
          mission={mission}
          activeMissionCount={activeSavedMissionCount}
          onPrimaryAction={runPrimaryMissionAction}
          onUseSampleRoute={useSampleRoute}
          onOpenMissionLibrary={() => setMissionLibraryOpen(true)}
        />
      )}

      {showMapControls && (
        <MapToolsRail
          planningMode={planningMode}
          visibleLayers={visibleLayers}
          onTogglePlanningMode={() => setPlanningMode(!planningMode)}
          onToggleLayer={toggleLayer}
          onFocusRoute={focusRoute}
          onOpenEmergency={() => openPanel('emergency')}
        />
      )}

      <RouteStatusBar />

      {isDesktop && plannerOpen && (
        <div className="absolute bottom-5 right-5 top-24 z-30 w-[min(440px,calc(100vw-2.5rem))]">
          <Sidebar
            accountSyncEnabled={accountSyncEnabled}
            plannerHeader={(
              <PlannerSummaryHeader
                mission={mission}
                fuelRemainingPercent={calculateFuelRemainingPercent(route.summary.fuelRemainingGal, route.summary.usableFuelGal)}
                savedMissionCount={activeSavedMissionCount}
                onOpenMissionLibrary={() => setMissionLibraryOpen(true)}
                onSaveMission={saveMissionFromCurrentStatus}
              />
            )}
            variant="desktop"
          />
        </div>
      )}

      {!isDesktop && (
        <>
          {!plannerOpen && (
            <MobileNavigation
              activePanel={sidebarPanel}
              selectedFeatureActive={Boolean(selectedFeature)}
              onOpenPanel={openPanel}
            />
          )}
          <Sheet open={plannerOpen} onOpenChange={setSidebarOpen}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="h-[100dvh] max-h-[100dvh] touch-pan-y gap-0 overflow-y-auto overscroll-contain rounded-none border-0 bg-white p-0 shadow-[0_-30px_90px_rgba(15,23,42,0.22)] backdrop-blur-xl [-webkit-overflow-scrolling:touch] sm:inset-x-4 sm:bottom-4 sm:h-[min(82dvh,760px)] sm:max-h-[760px] sm:rounded-[2rem] sm:border sm:border-white/70 sm:bg-white/95"
            >
              <div className="sr-only">
                <SheetTitle>Halo planner</SheetTitle>
                <SheetDescription>Route, weather, aircraft, briefing, admin, and emergency planning panels.</SheetDescription>
              </div>
              <Sidebar
                accountSyncEnabled={accountSyncEnabled}
                plannerHeader={(
                  <PlannerSummaryHeader
                    mission={mission}
                    fuelRemainingPercent={calculateFuelRemainingPercent(route.summary.fuelRemainingGal, route.summary.usableFuelGal)}
                    savedMissionCount={activeSavedMissionCount}
                    onOpenMissionLibrary={() => setMissionLibraryOpen(true)}
                    onSaveMission={saveMissionFromCurrentStatus}
                  />
                )}
                variant="sheet"
              />
            </SheetContent>
          </Sheet>
        </>
      )}

      {!plannerOpen && (
        <div className="pointer-events-none absolute bottom-24 left-4 z-20 hidden max-w-xs rounded-2xl border border-white/70 bg-white/80 p-3 text-xs text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur-xl md:block lg:hidden">
          <p className="font-semibold text-slate-950">Tablet mission mode</p>
          <p className="mt-1">Map-first planning with Planner available from the top bar.</p>
        </div>
      )}

      <MissionLibraryDialog
        activeMissionId={activeMissionId}
        mission={mission}
        missionLibrary={sortedMissionLibrary}
        open={missionLibraryOpen}
        onOpenChange={setMissionLibraryOpen}
        onSaveActive={saveMissionFromCurrentStatus}
        onCreateBlank={() => {
          createBlankMission();
          setMissionLibraryOpen(false);
        }}
        onDuplicateActive={() => {
          duplicateActiveMission();
          setMissionLibraryOpen(false);
        }}
        onLoadMission={(id) => {
          loadMission(id);
          setMissionLibraryOpen(false);
        }}
        onArchiveMission={archiveMission}
      />
    </main>
  );
}

function MissionStatusCard({
  mission,
  activeMissionCount,
  onPrimaryAction,
  onUseSampleRoute,
  onOpenMissionLibrary,
}: {
  mission: ReturnType<typeof buildHaloMissionSummary>;
  activeMissionCount: number;
  onPrimaryAction: () => void;
  onUseSampleRoute: () => void;
  onOpenMissionLibrary: () => void;
}) {
  const StatusIcon = mission.status === 'ready'
    ? CheckCircle2
    : mission.status === 'stop'
      ? ShieldAlert
      : mission.status === 'review'
        ? AlertTriangle
        : Sparkles;

  return (
    <section className="pointer-events-none absolute left-3 right-3 top-24 z-20 sm:left-5 sm:right-auto sm:w-[min(23rem,calc(100vw-2.5rem))] lg:top-28">
      <Card className="pointer-events-auto border-white/70 bg-white/90 p-0 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <CardContent className="space-y-3 p-3 sm:p-4">
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
                  Active mission
                </span>
              </div>
              <h1 className="mt-2 text-lg font-semibold tracking-[-0.035em] text-slate-950">
                {mission.title}
              </h1>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{mission.detail}</p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 text-xs">
            <span className="font-semibold text-slate-700">Mission library</span>
            <span className="font-semibold text-slate-950">
              {activeMissionCount} saved draft{activeMissionCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" onClick={onPrimaryAction} className="bg-slate-950 text-white hover:bg-slate-800">
              <Navigation className="h-3.5 w-3.5" />
              {mission.primaryAction}
            </Button>
            <Button type="button" variant="outline" onClick={onOpenMissionLibrary} className="border-slate-200 bg-white/70">
              <FolderOpen className="h-3.5 w-3.5" />
              Missions
            </Button>
            <Button type="button" variant="outline" onClick={onUseSampleRoute} className="col-span-2 border-amber-200 bg-amber-50/80 text-amber-900 hover:bg-amber-100/80">
              <Sparkles className="h-3.5 w-3.5" />
              Use sample route
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function PlannerSummaryHeader({
  mission,
  fuelRemainingPercent,
  savedMissionCount,
  onOpenMissionLibrary,
  onSaveMission,
}: {
  mission: ReturnType<typeof buildHaloMissionSummary>;
  fuelRemainingPercent: number;
  savedMissionCount: number;
  onOpenMissionLibrary: () => void;
  onSaveMission: () => void;
}) {
  return (
    <section className="space-y-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('border px-2 py-1 capitalize', getStatusBadgeClass(mission.status))}>
              {mission.status}
            </Badge>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">
              Planner
            </span>
          </div>
          <h2 className="mt-1 truncate text-base font-semibold tracking-[-0.03em] text-slate-950">
            {mission.title}
          </h2>
          <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-slate-600">{mission.detail}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 text-xs">
        <MissionMetric label="Route" value={mission.routeLabel} icon={<Route className="h-3.5 w-3.5" />} />
        <MissionMetric label="Fuel" value={mission.fuelLabel} icon={<Plane className="h-3.5 w-3.5" />} />
        <MissionMetric label="W&B" value={mission.weightBalanceLabel} icon={<Navigation className="h-3.5 w-3.5" />} />
        <MissionMetric label="Admin" value={mission.adminLabel} icon={<RadioTower className="h-3.5 w-3.5" />} />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2">
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="font-semibold text-slate-700">Fuel margin</span>
          <span className="truncate pl-2 font-semibold text-slate-950">{mission.fuelLabel}</span>
        </div>
        <Progress value={fuelRemainingPercent} className="h-1.5 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-cyan-500" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onOpenMissionLibrary} className="border-slate-200 bg-white/70">
          <FolderOpen className="h-3.5 w-3.5" />
          Missions ({savedMissionCount})
        </Button>
        <Button type="button" onClick={onSaveMission} className="bg-slate-950 text-white hover:bg-slate-800">
          <Save className="h-3.5 w-3.5" />
          Save active
        </Button>
      </div>
    </section>
  );
}

function MissionLibraryDialog({
  activeMissionId,
  mission,
  missionLibrary,
  open,
  onOpenChange,
  onSaveActive,
  onCreateBlank,
  onDuplicateActive,
  onLoadMission,
  onArchiveMission,
}: {
  activeMissionId: string;
  mission: ReturnType<typeof buildHaloMissionSummary>;
  missionLibrary: HaloMissionRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveActive: () => void;
  onCreateBlank: () => void;
  onDuplicateActive: () => void;
  onLoadMission: (id: string) => void;
  onArchiveMission: (id: string) => void;
}) {
  const activeMissions = missionLibrary.filter((savedMission) => savedMission.status !== 'archived');
  const archivedMissions = missionLibrary.filter((savedMission) => savedMission.status === 'archived');
  const savedActiveMission = missionLibrary.find((savedMission) => savedMission.id === activeMissionId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(92dvh,760px)] overflow-y-auto rounded-[1.75rem] border-white/70 bg-white/95 p-0 shadow-[0_30px_100px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader className="border-b border-slate-200/70 px-5 py-4 pr-12">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-800 ring-1 ring-cyan-100">
              <BookOpen className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-lg tracking-[-0.03em] text-slate-950">Mission Library</DialogTitle>
              <DialogDescription>
                One active mission stays on the map. Save, switch, duplicate, or archive drafts here.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 p-5">
          <section className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white to-cyan-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border px-2 py-1 capitalize', getStatusBadgeClass(mission.status))}>
                    {mission.status}
                  </Badge>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Active on map
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-1 text-base font-semibold text-slate-950">
                  {savedActiveMission?.name ?? mission.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{mission.detail}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button type="button" onClick={onSaveActive} className="bg-slate-950 text-white hover:bg-slate-800">
                <Save className="h-3.5 w-3.5" />
                Save active
              </Button>
              <Button type="button" variant="outline" onClick={onDuplicateActive} className="border-slate-200 bg-white/80">
                <Copy className="h-3.5 w-3.5" />
                Duplicate
              </Button>
              <Button type="button" variant="outline" onClick={onCreateBlank} className="border-cyan-200 bg-cyan-50/70 text-cyan-950">
                <PlusCircle className="h-3.5 w-3.5" />
                New mission
              </Button>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950">Saved drafts</h3>
              <span className="text-xs font-medium text-slate-500">{activeMissions.length} active</span>
            </div>

            {activeMissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
                Save this mission to keep it in your library. Halo still keeps the current active mission locally.
              </div>
            ) : (
              <div className="space-y-2">
                {activeMissions.map((savedMission) => (
                  <MissionLibraryRow
                    key={savedMission.id}
                    mission={savedMission}
                    active={savedMission.id === activeMissionId}
                    onLoad={() => onLoadMission(savedMission.id)}
                    onArchive={() => onArchiveMission(savedMission.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {archivedMissions.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-950">Archived</h3>
              <div className="space-y-2">
                {archivedMissions.map((savedMission) => (
                  <MissionLibraryRow
                    key={savedMission.id}
                    mission={savedMission}
                    active={false}
                    archived
                    onLoad={() => undefined}
                    onArchive={() => undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MissionLibraryRow({
  mission,
  active,
  archived = false,
  onLoad,
  onArchive,
}: {
  mission: HaloMissionRecord;
  active: boolean;
  archived?: boolean;
  onLoad: () => void;
  onArchive: () => void;
}) {
  return (
    <article className={cn(
      'rounded-2xl border bg-white/80 p-3 shadow-sm shadow-slate-900/5',
      active ? 'border-cyan-200 ring-1 ring-cyan-100' : 'border-slate-200/80',
      archived && 'bg-slate-50/80 opacity-75'
    )}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn('border px-2 py-1 text-[10px] capitalize', getSavedMissionStatusClass(mission.status))}>
              {mission.status.replace(/-/g, ' ')}
            </Badge>
            {active && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                Active
              </span>
            )}
          </div>
          <h4 className="mt-2 line-clamp-1 text-sm font-semibold text-slate-950">{mission.name}</h4>
          <p className="mt-1 text-xs text-slate-600">{mission.routeLabel}</p>
          <p className="mt-1 text-xs text-slate-500">
            {mission.aircraftLabel} · Updated {formatDateTimeShort(mission.updatedAt)}
          </p>
        </div>
        {!archived && (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLoad}
              disabled={active}
              className="border-slate-200 bg-white/80"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Load
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onArchive}
              className="border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100/80"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
          </div>
        )}
      </div>
    </article>
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
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white/70 p-2">
      <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 line-clamp-1 text-xs font-semibold leading-4 text-slate-900">{value}</p>
    </div>
  );
}

function MapToolsRail({
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

function getSavedMissionStatusClass(status: HaloMissionRecord['status']): string {
  const classes: Record<HaloMissionRecord['status'], string> = {
    draft: 'border-slate-200 bg-white text-slate-700',
    'needs-review': 'border-amber-200 bg-amber-50 text-amber-900',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    flown: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    archived: 'border-slate-200 bg-slate-100 text-slate-500',
  };

  return classes[status];
}

function formatDateTimeShort(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';

  return new Intl.DateTimeFormat('en-ZA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
