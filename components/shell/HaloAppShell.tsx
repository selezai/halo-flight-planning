'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { shallow } from 'zustand/shallow';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Copy,
  Crosshair,
  FolderOpen,
  History,
  Layers,
  MapPinned,
  Menu,
  Navigation,
  Pause,
  Plane,
  Play,
  PlusCircle,
  RadioTower,
  Route,
  Save,
} from 'lucide-react';
import ClientMap from '@/components/map/ClientMap';
import HaloAuthNav from '@/components/auth/HaloAuthNav';
import OfflineMissionSupport from '@/components/offline/OfflineMissionSupport';
import RouteAirspaceReviewSync from '@/components/planning/RouteAirspaceReviewSync';
import RouteNotamReviewSync from '@/components/planning/RouteNotamReviewSync';
import RouteStatusBar from '@/components/planning/RouteStatusBar';
import Sidebar from '@/components/sidebar/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HALO_PANEL_META } from '@/components/shell/haloNavigation';
import HaloLogo from '@/components/shell/HaloLogo';
import { assessDataFreshness, FRESHNESS_THRESHOLDS_MINUTES } from '@/lib/planning/freshness';
import { buildFlightAdminReview } from '@/lib/planning/flightAdmin';
import { buildFilingWorkflowReview } from '@/lib/planning/filingReminder';
import {
  getArchivedMissionRecords,
  getDraftMissionRecords,
  getFlightHistoryRecords,
  getMissionStatusFromHaloStatus,
  sortMissionRecords,
} from '@/lib/planning/missions';
import { calculateRoute } from '@/lib/planning/navigation';
import { formatLocationTrackingLabel } from '@/lib/planning/routeTracking';
import { calculateWeightBalance } from '@/lib/planning/weightBalance';
import { buildHaloMissionSummary, type HaloPanelId, type HaloStatusTone } from '@/lib/ui/halo';
import { countEnabledMapLayers, getOrderedMapLayerEntries } from '@/lib/ui/mapLayers';
import { cn } from '@/lib/utils';
import { useMapStore, type MapState } from '@/stores/mapStore';
import type {
  ActiveRouteState,
  HaloMissionRecord,
  LocationTrackingState,
} from '@/types/planning';

interface MissionSaveFeedback {
  missionId: string;
  missionName: string;
  savedAt: string;
}

export default function HaloAppShell() {
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
    aircraftTrackingEnabled,
    activeRoute,
    locationTracking,
    sidebarOpen,
    selectedFeature,
    setSidebarOpen,
    setSidebarPanel,
    clearSelection,
    setPlanningMode,
    startActiveRoute,
    stopActiveRoute,
    setAircraftTrackingEnabled,
    setLocationTrackingEnabled,
    setLocationFollowMode,
    toggleLayer,
    saveActiveMission,
    createBlankMission,
    duplicateActiveMission,
    loadMission,
    archiveMission,
    markMissionFlown,
    duplicateMissionFromHistory,
  } = useMapStore((state) => ({
    waypoints: state.waypoints,
    activeAircraft: state.activeAircraft,
    weightBalanceLoading: state.weightBalanceLoading,
    routeAirspaceReview: state.routeAirspaceReview,
    routeNotamReview: state.routeNotamReview,
    routeName: state.routeName,
    departureTime: state.departureTime,
    cruiseAltitudeFt: state.cruiseAltitudeFt,
    activeMissionId: state.activeMissionId,
    missionLibrary: state.missionLibrary,
    filingChecklist: state.filingChecklist,
    closeReminder: state.closeReminder,
    notamBriefingRecord: state.notamBriefingRecord,
    flightPlanFilingRecord: state.flightPlanFilingRecord,
    visibleLayers: state.visibleLayers,
    planningMode: state.planningMode,
    aircraftTrackingEnabled: state.aircraftTrackingEnabled,
    activeRoute: state.activeRoute,
    locationTracking: state.locationTracking,
    sidebarOpen: state.sidebarOpen,
    selectedFeature: state.selectedFeature,
    setSidebarOpen: state.setSidebarOpen,
    setSidebarPanel: state.setSidebarPanel,
    clearSelection: state.clearSelection,
    setPlanningMode: state.setPlanningMode,
    startActiveRoute: state.startActiveRoute,
    stopActiveRoute: state.stopActiveRoute,
    setAircraftTrackingEnabled: state.setAircraftTrackingEnabled,
    setLocationTrackingEnabled: state.setLocationTrackingEnabled,
    setLocationFollowMode: state.setLocationFollowMode,
    toggleLayer: state.toggleLayer,
    saveActiveMission: state.saveActiveMission,
    createBlankMission: state.createBlankMission,
    duplicateActiveMission: state.duplicateActiveMission,
    loadMission: state.loadMission,
    archiveMission: state.archiveMission,
    markMissionFlown: state.markMissionFlown,
    duplicateMissionFromHistory: state.duplicateMissionFromHistory,
  }), shallow);
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [missionLibraryOpen, setMissionLibraryOpen] = useState(false);
  const [missionSaveFeedback, setMissionSaveFeedback] = useState<MissionSaveFeedback | null>(null);
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
    () => getDraftMissionRecords(sortedMissionLibrary).length,
    [sortedMissionLibrary]
  );

  useEffect(() => {
    if (!missionSaveFeedback) return undefined;

    const timeoutId = window.setTimeout(() => {
      setMissionSaveFeedback(null);
    }, 2_800);

    return () => window.clearTimeout(timeoutId);
  }, [missionSaveFeedback]);

  useEffect(() => {
    setMissionSaveFeedback(null);
  }, [activeMissionId]);

  const openPanel = (panel: HaloPanelId) => {
    clearSelection();
    setSidebarPanel(panel);
    setSidebarOpen(true);
  };

  const closePlanner = () => {
    if (selectedFeature) {
      clearSelection();
    }
    setSidebarOpen(false);
  };

  const setPlannerOpen = (open: boolean) => {
    if (open) {
      setSidebarOpen(true);
      return;
    }

    closePlanner();
  };

  const saveMissionFromCurrentStatus = () => {
    saveActiveMission(getMissionStatusFromHaloStatus(mission.status));
    const nextState = useMapStore.getState();
    const savedMission = nextState.missionLibrary.find((item) => item.id === nextState.activeMissionId);
    const fallbackMissionName = nextState.routeName.trim() || mission.title;

    setMissionSaveFeedback({
      missionId: nextState.activeMissionId,
      missionName: savedMission?.name ?? fallbackMissionName,
      savedAt: savedMission?.updatedAt ?? new Date().toISOString(),
    });
  };

  const startRouteNavigation = () => {
    if (waypoints.length < 2) return;

    startActiveRoute();
    setLocationTrackingEnabled(true);
    setLocationFollowMode(true);
  };

  const toggleLocationTracking = () => {
    if (aircraftTrackingEnabled) {
      setAircraftTrackingEnabled(false, { keepLocationTrackingActive: activeRoute.status === 'active' });
      return;
    }

    setAircraftTrackingEnabled(true);
  };

  const stopRouteNavigation = () => {
    stopActiveRoute();
    if (!aircraftTrackingEnabled) {
      setLocationTrackingEnabled(false);
    }
  };

  useEffect(() => {
    if (!aircraftTrackingEnabled) return;
    if (locationTracking.enabled || locationTracking.status !== 'idle') return;

    setLocationTrackingEnabled(true);
    setLocationFollowMode(true);
  }, [
    aircraftTrackingEnabled,
    locationTracking.enabled,
    locationTracking.status,
    setLocationFollowMode,
    setLocationTrackingEnabled,
  ]);

  const plannerOpen = sidebarOpen;
  const showMapModeControl = !plannerOpen && activeRoute.status !== 'active';
  const showMapTools = !plannerOpen || isDesktop;

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f9f3e4] text-slate-950">
      <RouteAirspaceReviewSync />
      <RouteNotamReviewSync />

      <div className="absolute inset-0">
        <ClientMap />
      </div>
      <div className="halo-map-atmosphere pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(120deg,rgba(255,249,236,0.48),rgba(14,116,144,0.06)_52%,rgba(15,23,42,0.16))]" />

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
              <Route className="h-3.5 w-3.5" />
              Route worksheet
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => (plannerOpen ? closePlanner() : setSidebarOpen(true))}
              className="hidden bg-slate-950 text-white hover:bg-slate-800 sm:inline-flex"
            >
              <Menu className="h-3.5 w-3.5" />
              Planner
            </Button>
            <HaloAuthNav className="shrink-0" />
          </div>
        </div>
      </div>

      {showMapModeControl && (
        <MapModeControl
          planningMode={planningMode}
          onChange={setPlanningMode}
        />
      )}

      {showMapTools && (
        <MapToolsRail
          visibleLayers={visibleLayers}
          routeWaypointCount={waypoints.length}
          aircraftTrackingEnabled={aircraftTrackingEnabled}
          activeRoute={activeRoute}
          locationTracking={locationTracking}
          onToggleLayer={toggleLayer}
          onStartRoute={startRouteNavigation}
          onStopRoute={stopRouteNavigation}
          onToggleLocationTracking={toggleLocationTracking}
        />
      )}

      <RouteStatusBar />
      <OfflineMissionSupport />

      {isDesktop && plannerOpen && (
        <div className="absolute bottom-5 right-5 top-24 z-30 w-[min(440px,calc(100vw-2.5rem))]">
          <Sidebar
            plannerHeader={(
              <PlannerSummaryHeader
                compact
                mission={mission}
                fuelRemainingPercent={calculateFuelRemainingPercent(route.summary.fuelRemainingGal, route.summary.usableFuelGal)}
                savedMissionCount={activeSavedMissionCount}
                saveFeedback={missionSaveFeedback}
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
              onOpenPanel={openPanel}
            />
          )}
          <Sheet open={plannerOpen} onOpenChange={setPlannerOpen}>
            <SheetContent
              side="bottom"
              showCloseButton={false}
              className="h-[100dvh] max-h-[100dvh] touch-pan-y gap-0 overflow-hidden overscroll-contain rounded-none border-0 bg-white p-0 shadow-[0_-30px_90px_rgba(15,23,42,0.22)] backdrop-blur-xl sm:inset-x-4 sm:bottom-4 sm:h-[min(82dvh,760px)] sm:max-h-[760px] sm:rounded-[2rem] sm:border sm:border-white/70 sm:bg-white/95"
            >
              <div className="sr-only">
                <SheetTitle>Halo planner</SheetTitle>
                <SheetDescription>Route, weather, aircraft, briefing, admin, and emergency planning panels.</SheetDescription>
              </div>
              <Sidebar
                plannerHeader={(
                  <PlannerSummaryHeader
                    mission={mission}
                    fuelRemainingPercent={calculateFuelRemainingPercent(route.summary.fuelRemainingGal, route.summary.usableFuelGal)}
                    savedMissionCount={activeSavedMissionCount}
                    saveFeedback={missionSaveFeedback}
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

      <MissionLibraryDialog
        activeMissionId={activeMissionId}
        mission={mission}
        missionLibrary={sortedMissionLibrary}
        saveFeedback={missionSaveFeedback}
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
        onMarkMissionFlown={markMissionFlown}
        onDuplicateHistoryMission={(id) => {
          duplicateMissionFromHistory(id);
          setMissionLibraryOpen(false);
        }}
      />
    </main>
  );
}

function PlannerSummaryHeader({
  compact = false,
  mission,
  fuelRemainingPercent,
  savedMissionCount,
  saveFeedback,
  onOpenMissionLibrary,
  onSaveMission,
}: {
  compact?: boolean;
  mission: ReturnType<typeof buildHaloMissionSummary>;
  fuelRemainingPercent: number;
  savedMissionCount: number;
  saveFeedback: MissionSaveFeedback | null;
  onOpenMissionLibrary: () => void;
  onSaveMission: () => void;
}) {
  const saved = Boolean(saveFeedback);
  const SaveIcon = saved ? CheckCircle2 : Save;

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

      {!compact && (
        <div className="grid grid-cols-1 gap-1.5 text-xs min-[430px]:grid-cols-2">
          <MissionMetric label="Route" value={mission.routeLabel} icon={<Route className="h-3.5 w-3.5" />} />
          <MissionMetric label="Fuel" value={mission.fuelLabel} icon={<Plane className="h-3.5 w-3.5" />} />
          <MissionMetric label="W&B" value={mission.weightBalanceLabel} icon={<Navigation className="h-3.5 w-3.5" />} />
          <MissionMetric label="Admin" value={mission.adminLabel} icon={<RadioTower className="h-3.5 w-3.5" />} />
        </div>
      )}

      {!compact && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px]">
            <span className="font-semibold text-slate-700">Fuel margin</span>
            <span className="min-w-0 break-words text-right font-semibold text-slate-950">{mission.fuelLabel}</span>
          </div>
          <Progress value={fuelRemainingPercent} className="h-1.5 bg-slate-100 [&_[data-slot=progress-indicator]]:bg-cyan-500" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onOpenMissionLibrary} className="border-slate-200 bg-white/70">
          <FolderOpen className="h-3.5 w-3.5" />
          Missions ({savedMissionCount})
        </Button>
        <Button
          type="button"
          onClick={onSaveMission}
          className={cn(
            'bg-slate-950 text-white hover:bg-slate-800',
            saved && 'bg-emerald-600 hover:bg-emerald-600'
          )}
          aria-live="polite"
        >
          <SaveIcon className="h-3.5 w-3.5" />
          {saved ? 'Saved' : 'Save active'}
        </Button>
      </div>

      {saveFeedback && (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800" aria-live="polite">
          Saved to Missions · {saveFeedback.missionName} · {formatDateTimeShort(saveFeedback.savedAt)}
        </p>
      )}
    </section>
  );
}

function MissionLibraryDialog({
  activeMissionId,
  mission,
  missionLibrary,
  saveFeedback,
  open,
  onOpenChange,
  onSaveActive,
  onCreateBlank,
  onDuplicateActive,
  onLoadMission,
  onArchiveMission,
  onMarkMissionFlown,
  onDuplicateHistoryMission,
}: {
  activeMissionId: string;
  mission: ReturnType<typeof buildHaloMissionSummary>;
  missionLibrary: HaloMissionRecord[];
  saveFeedback: MissionSaveFeedback | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveActive: () => void;
  onCreateBlank: () => void;
  onDuplicateActive: () => void;
  onLoadMission: (id: string) => void;
  onArchiveMission: (id: string) => void;
  onMarkMissionFlown: (id: string) => void;
  onDuplicateHistoryMission: (id: string) => void;
}) {
  const [missionLibraryTab, setMissionLibraryTab] = useState('drafts');
  const draftMissions = getDraftMissionRecords(missionLibrary);
  const historyMissions = getFlightHistoryRecords(missionLibrary);
  const archivedMissions = getArchivedMissionRecords(missionLibrary);
  const savedActiveMission = missionLibrary.find((savedMission) => savedMission.id === activeMissionId);
  const saved = Boolean(saveFeedback);
  const SaveIcon = saved ? CheckCircle2 : Save;
  const markMissionFlown = (id: string) => {
    onMarkMissionFlown(id);
    setMissionLibraryTab('history');
  };

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

        <Tabs value={missionLibraryTab} onValueChange={setMissionLibraryTab} className="p-5">
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <TabsTrigger value="drafts" className="rounded-xl">
              <BookOpen className="h-3.5 w-3.5" />
              Drafts
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl">
              <History className="h-3.5 w-3.5" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drafts" className="mt-4 space-y-4">
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

              <div className="mt-4 grid grid-cols-1 gap-2 min-[460px]:grid-cols-2">
                <Button
                  type="button"
                  onClick={onSaveActive}
                  className={cn(
                    'bg-slate-950 text-white hover:bg-slate-800',
                    saved && 'bg-emerald-600 hover:bg-emerald-600'
                  )}
                  aria-live="polite"
                >
                  <SaveIcon className="h-3.5 w-3.5" />
                  {saved ? 'Saved' : 'Save active'}
                </Button>
                <Button type="button" variant="outline" onClick={() => markMissionFlown(activeMissionId)} className="border-cyan-200 bg-cyan-50/70 text-cyan-950 hover:bg-cyan-100/80">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark flown
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

              {saveFeedback && (
                <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800" aria-live="polite">
                  Saved to Missions · {saveFeedback.missionName} · {formatDateTimeShort(saveFeedback.savedAt)}
                </p>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-950">Saved drafts</h3>
                <span className="text-xs font-medium text-slate-500">{draftMissions.length} active</span>
              </div>

              {draftMissions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
                  Save this mission to keep it in your library. Halo still keeps the current active mission locally.
                </div>
              ) : (
                <div className="space-y-2">
                  {draftMissions.map((savedMission) => (
                    <MissionLibraryRow
                      key={savedMission.id}
                      mission={savedMission}
                      active={savedMission.id === activeMissionId}
                      onLoad={() => onLoadMission(savedMission.id)}
                      onArchive={() => onArchiveMission(savedMission.id)}
                      onMarkFlown={() => markMissionFlown(savedMission.id)}
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
                    />
                  ))}
                </div>
              </section>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-950">Mission history</h3>
              <span className="text-xs font-medium text-slate-500">{historyMissions.length} flown</span>
            </div>

            {historyMissions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4 text-sm text-slate-600">
                Mark a saved mission as flown to add it to history.
              </div>
            ) : (
              <div className="space-y-2">
                {historyMissions.map((savedMission) => (
                  <MissionLibraryRow
                    key={savedMission.id}
                    mission={savedMission}
                    active={false}
                    history
                    onDuplicateFromHistory={() => onDuplicateHistoryMission(savedMission.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function MissionLibraryRow({
  mission,
  active,
  archived = false,
  history = false,
  onLoad,
  onArchive,
  onMarkFlown,
  onDuplicateFromHistory,
}: {
  mission: HaloMissionRecord;
  active: boolean;
  archived?: boolean;
  history?: boolean;
  onLoad?: () => void;
  onArchive?: () => void;
  onMarkFlown?: () => void;
  onDuplicateFromHistory?: () => void;
}) {
  const waypointText = `${mission.waypointCount} waypoint${mission.waypointCount === 1 ? '' : 's'}`;
  const activityText = history
    ? `Flown ${formatDateTimeShort(mission.flownAt ?? mission.updatedAt)}`
    : `Updated ${formatDateTimeShort(mission.updatedAt)}`;

  return (
    <article className={cn(
      'rounded-2xl border bg-white/80 p-3 shadow-sm shadow-slate-900/5',
      active ? 'border-cyan-200 ring-1 ring-cyan-100' : 'border-slate-200/80',
      (archived || history) && 'bg-slate-50/80',
      archived && 'opacity-75'
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
            {mission.aircraftLabel} · {waypointText} · {activityText}
          </p>
        </div>
        {history ? (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDuplicateFromHistory}
              className="border-cyan-200 bg-cyan-50/70 text-cyan-950 hover:bg-cyan-100/80"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate to plan
            </Button>
          </div>
        ) : !archived && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
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
              onClick={onMarkFlown}
              className="border-cyan-200 bg-cyan-50/70 text-cyan-950 hover:bg-cyan-100/80"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark flown
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
      <p className="mt-0.5 line-clamp-2 break-words text-xs font-semibold leading-4 text-slate-900">{value}</p>
    </div>
  );
}

function MapModeControl({
  planningMode,
  onChange,
}: {
  planningMode: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const modes = [
    {
      label: 'Plan route',
      active: planningMode,
      onClick: () => onChange(true),
      icon: Navigation,
      detail: 'Tap map to place waypoints',
    },
    {
      label: 'Inspect map',
      active: !planningMode,
      onClick: () => onChange(false),
      icon: MapPinned,
      detail: 'Tap aviation data for info',
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-x-3 top-[5.35rem] z-20 flex justify-center sm:inset-x-auto sm:left-5 sm:top-24 sm:justify-start">
      <div className="pointer-events-auto grid w-full max-w-md grid-cols-2 gap-1 rounded-[1.35rem] border border-white/70 bg-white/90 p-1.5 shadow-[0_18px_55px_rgba(15,23,42,0.16)] backdrop-blur-xl sm:w-[25rem]">
        {modes.map(({ label, active, onClick, icon: Icon, detail }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={cn(
              'flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-left transition',
              active
                ? 'bg-slate-950 text-white shadow-md shadow-slate-900/20'
                : 'text-slate-600 hover:bg-white hover:text-slate-950'
            )}
            aria-pressed={active}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-4">{label}</span>
              <span className={cn('hidden truncate text-[10px] leading-3 sm:block', active ? 'text-slate-300' : 'text-slate-500')}>
                {detail}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MapToolsRail({
  visibleLayers,
  routeWaypointCount,
  aircraftTrackingEnabled,
  activeRoute,
  locationTracking,
  onToggleLayer,
  onStartRoute,
  onStopRoute,
  onToggleLocationTracking,
}: {
  visibleLayers: MapState['visibleLayers'];
  routeWaypointCount: number;
  aircraftTrackingEnabled: boolean;
  activeRoute: ActiveRouteState;
  locationTracking: LocationTrackingState;
  onToggleLayer: (layer: keyof MapState['visibleLayers']) => void;
  onStartRoute: () => void;
  onStopRoute: () => void;
  onToggleLocationTracking: () => void;
}) {
  const [layersOpen, setLayersOpen] = useState(false);
  const layerEntries = getOrderedMapLayerEntries(visibleLayers);
  const enabledLayerCount = countEnabledMapLayers(visibleLayers);
  const routeActive = activeRoute.status === 'active';
  const routeReady = routeWaypointCount >= 2;
  const locationActive =
    aircraftTrackingEnabled ||
    locationTracking.enabled ||
    locationTracking.status === 'tracking' ||
    locationTracking.status === 'requesting';
  const locationProblem =
    locationTracking.status === 'denied' ||
    locationTracking.status === 'unavailable' ||
    locationTracking.status === 'error';
  const routeDrivenLocationActive =
    routeActive &&
    !aircraftTrackingEnabled &&
    (locationTracking.enabled || locationTracking.status === 'tracking' || locationTracking.status === 'requesting');

  return (
    <div className="pointer-events-none absolute left-3 top-[9.5rem] z-20 flex flex-col items-start gap-2 sm:left-5 sm:top-[13rem] lg:bottom-24 lg:top-auto">
      <div className="pointer-events-auto flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={routeActive ? onStopRoute : onStartRoute}
              disabled={!routeActive && !routeReady}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 text-xs font-semibold text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0',
                routeActive && 'border-rose-200 bg-rose-50 text-rose-800',
                !routeActive && routeReady && 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800'
              )}
              aria-label={routeActive ? 'Pause route tracking' : 'Start route guidance'}
            >
              {routeActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span className="hidden sm:inline">{routeActive ? 'Pause route' : 'Start route'}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {routeReady ? (routeActive ? 'Pause active route tracking' : 'Start route guidance + GPS') : 'Add at least two waypoints first'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onToggleLocationTracking}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/90 px-3 text-xs font-semibold text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white',
                locationActive && 'border-cyan-200 bg-cyan-50 text-cyan-900',
                locationProblem && 'border-rose-200 bg-rose-50 text-rose-800'
              )}
              aria-pressed={aircraftTrackingEnabled}
              aria-label={aircraftTrackingEnabled ? 'Disable persistent aircraft position tracking' : 'Track aircraft position'}
            >
              <Crosshair className="h-5 w-5" />
              <span className="hidden sm:inline">
                {locationActive ? formatLocationTrackingLabel(locationTracking) : 'Track aircraft'}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {locationTracking.error ?? (
              routeDrivenLocationActive
                ? 'GPS is active for route guidance. Tap to keep aircraft tracking on after ending the route.'
                : aircraftTrackingEnabled
                  ? 'Aircraft position tracking is remembered in this browser until you switch it off.'
                  : locationActive
                    ? 'Aircraft position tracking is active for this session.'
                    : 'Show your aircraft position on the map.'
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      {locationTracking.error && locationTracking.status !== 'tracking' && (
        <div className="pointer-events-auto max-w-[17rem] rounded-2xl border border-rose-200 bg-white/95 p-3 text-xs text-rose-900 shadow-lg shadow-slate-900/10 backdrop-blur-xl">
          <p className="font-semibold">{formatLocationTrackingLabel(locationTracking)}</p>
          <p className="mt-1 leading-5">{locationTracking.error}</p>
        </div>
      )}

      <div className="pointer-events-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setLayersOpen((open) => !open)}
              className={cn(
                'inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/90 text-slate-800 shadow-lg shadow-slate-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white',
                layersOpen && 'border-cyan-200 bg-cyan-50 text-cyan-950'
              )}
              aria-expanded={layersOpen}
              aria-label="Map aviation layers"
            >
              <Layers className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Map aviation layers</TooltipContent>
        </Tooltip>
      </div>

      {layersOpen && (
        <div className="pointer-events-auto absolute left-14 top-0 z-30 max-h-[min(24rem,calc(100dvh-18rem))] w-[min(20rem,calc(100vw-5rem))] overflow-y-auto rounded-[1.35rem] border border-white/75 bg-white/95 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:max-h-[min(24rem,calc(100dvh-20rem))] lg:static lg:mt-2 lg:max-h-[min(30rem,calc(100dvh-10rem))] lg:w-[min(20rem,calc(100vw-1.5rem))]">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-800">Map layers</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Toggle OpenAIP aviation overlays on the map.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
              {enabledLayerCount}/{layerEntries.length} on
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {layerEntries.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => onToggleLayer(layer.id as keyof MapState['visibleLayers'])}
                className={cn(
                  'flex min-h-10 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition',
                  layer.enabled
                    ? 'border-slate-950 bg-slate-950 text-white shadow-sm shadow-slate-900/15'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                )}
                aria-pressed={layer.enabled}
              >
                <span className="truncate">{layer.label}</span>
                <span
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-full',
                    layer.enabled ? 'bg-cyan-300' : 'bg-slate-300'
                  )}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileNavigation({
  onOpenPanel,
}: {
  onOpenPanel: (panel: HaloPanelId) => void;
}) {
  return (
    <nav className="absolute inset-x-3 bottom-3 z-30 rounded-[1.6rem] border border-white/70 bg-white/95 p-1.5 shadow-[0_24px_70px_rgba(15,23,42,0.2)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-6 gap-1">
        {HALO_PANEL_META.map(({ id, shortLabel, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onOpenPanel(id)}
            className="grid h-12 min-h-[3rem] max-h-12 box-border grid-rows-[1rem_0.75rem] place-items-center content-center gap-1 overflow-hidden rounded-2xl px-1 text-[10px] font-semibold leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center leading-none">
              <Icon className="block h-4 w-4 shrink-0" aria-hidden="true" />
            </span>
            <span className="block h-3 overflow-hidden leading-3">{shortLabel}</span>
          </button>
        ))}
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
