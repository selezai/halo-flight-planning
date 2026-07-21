'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AccountSyncPanel from '@/components/auth/AccountSyncPanel';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  Gauge,
  Layers,
  MapPin,
  Navigation,
  Plane,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import {
  formatCoordinatesDMS,
  formatCoordinatesDecimal,
} from '@/lib/openaip/featureParser';
import { featureSelectionKey } from '@/lib/openaip/featureSelection';
import {
  PRESET_AIRCRAFT,
  DEFAULT_PERSONAL_MINIMUMS,
} from '@/lib/planning/aircraft';
import {
  calculateRoute,
  formatCoordinates,
  formatCourse,
  formatDistance,
  formatDuration,
  formatFuel,
} from '@/lib/planning/navigation';
import { searchStarterWaypoints } from '@/lib/planning/sampleData';
import { buildBackupPackText } from '@/lib/planning/backupPack';
import { buildBriefingDigest, buildBriefingText, buildRiskAssessment } from '@/lib/planning/briefing';
import { mergeWaypointResults } from '@/lib/planning/waypointResults';
import { getCategoryClassName, isBelowPersonalMinimums } from '@/lib/planning/weather';
import {
  calculateWeightBalance,
  createDefaultWeightBalanceConfig,
  getWeightBalanceStatusLabel,
} from '@/lib/planning/weightBalance';
import {
  buildCloseReminderFromDeparture,
  buildFilingWorkflowReview,
} from '@/lib/planning/filingReminder';
import {
  buildFlightAdminReview,
  formatFilingStatus as formatFlightPlanFilingStatus,
  formatNotamRecordStatus,
} from '@/lib/planning/flightAdmin';
import {
  assessDataFreshness,
  FRESHNESS_THRESHOLDS_MINUTES,
  formatFreshnessStatus,
} from '@/lib/planning/freshness';
import { buildAirspaceVerticalProfile } from '@/lib/planning/airspaceProfile';
import { buildEmergencyPlanningReview } from '@/lib/planning/emergencyPlanning';
import { buildTrainingNavLog } from '@/lib/planning/trainingNavlog';
import type { OpenAipWaypointSearchResponse } from '@/lib/openaip/waypointSearch';
import HaloLogo from '@/components/shell/HaloLogo';
import { HALO_PANEL_META } from '@/components/shell/haloNavigation';
import { cn } from '@/lib/utils';
import type { ParsedFeature } from '@/types/openaip';
import type {
  Coordinates,
  AirspaceVerticalProfile,
  EmergencyLandingSite,
  EmergencyLandingSuitability,
  EmergencyPlanningReview,
  FlightAdminReview,
  FlightPlanFilingRecord,
  FlightCategory,
  FilingChecklistState,
  FilingWorkflowReview,
  FlightCloseReminder,
  NotamBriefingRecord,
  RouteAirspaceAlert,
  RouteAirspaceReview,
  BriefingDigest,
  DataFreshness,
  RouteNotam,
  RouteNotamReview,
  TrainingNavLog,
  WeightBalanceConfig,
  WeightBalanceEnvelopePoint,
  WeightBalanceResult,
  WeatherReport,
  Waypoint,
  WaypointType,
} from '@/types/planning';

interface RouteWeatherState {
  reports: Record<string, WeatherReport | null>;
  tafs: Record<string, string | null>;
  updatedAt?: string;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface OpenAipSearchState {
  waypoints: Waypoint[];
  loading: boolean;
  error: string | null;
  warning: string | null;
}

export default function Sidebar({
  accountSyncEnabled,
  variant = 'desktop',
}: {
  accountSyncEnabled: boolean;
  variant?: 'desktop' | 'sheet';
}) {
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarPanel,
    setSidebarPanel,
    selectedFeature,
    clearSelection,
  } = useMapStore();

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside
      className={cn(
        'flex h-full w-full flex-col overflow-hidden text-slate-950',
        variant === 'desktop'
          ? 'rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_28px_90px_rgba(15,23,42,0.18)] backdrop-blur-xl'
          : 'bg-transparent'
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3">
        <HaloLogo size="sm" />
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <AccountSyncPanel enabled={accountSyncEnabled} />

      {!selectedFeature && (
        <nav className="grid grid-cols-6 gap-1 border-b border-slate-200/70 bg-white/50 p-2">
          {HALO_PANEL_META.map(({ id, shortLabel, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSidebarPanel(id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-semibold transition ${
                sidebarPanel === id
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
              }`}
            >
              <Icon className="h-4 w-4" />
              {shortLabel}
            </button>
          ))}
        </nav>
      )}

      <div className="flex-1 overflow-y-auto">
        {selectedFeature ? (
          <FeatureDisplay feature={selectedFeature} onClose={clearSelection} />
        ) : (
          <div className="p-4">
            {sidebarPanel === 'route' && <RoutePanel />}
            {sidebarPanel === 'weather' && <WeatherPanel />}
            {sidebarPanel === 'aircraft' && <AircraftPanel />}
            {sidebarPanel === 'briefing' && <BriefingPanel />}
            {sidebarPanel === 'admin' && <AdminPanel />}
            {sidebarPanel === 'emergency' && <EmergencyPanel />}
          </div>
        )}
      </div>
    </aside>
  );
}

function FeatureDisplay({
  feature,
  onClose,
}: {
  feature: ParsedFeature;
  onClose: () => void;
}) {
  const {
    addRouteWaypoint,
    selectedFeatureCandidates,
    setSelectedFeature,
  } = useMapStore();
  const waypoint = makeWaypointFromFeature(feature);
  const selectedFeatureKey = featureSelectionKey(feature);
  const clickedFeatures = selectedFeatureCandidates.length > 1
    ? selectedFeatureCandidates
    : [];
  const icon =
    feature.type === 'airport' ? <Plane className="h-5 w-5" /> :
      feature.type === 'navaid' ? <Navigation className="h-5 w-5" /> :
        feature.type === 'airspace' ? <Layers className="h-5 w-5" /> :
          feature.type === 'obstacle' ? <AlertTriangle className="h-5 w-5" /> :
          <MapPin className="h-5 w-5" />;
  const openAipRecordPath = getOpenAipRecordPath(feature);

  return (
    <div className="divide-y divide-slate-200">
      <div className="bg-slate-950 p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-amber-300">{icon}</span>
            <div>
              <h2 className="text-lg font-semibold">
                {feature.icao || feature.identifier || feature.name || 'Selected feature'}
              </h2>
              <p className="text-sm text-slate-300">
                {feature.name || feature.subtype || formatFeatureType(feature.type)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Close feature details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {waypoint && (
          <button
            type="button"
            onClick={() => addRouteWaypoint(waypoint)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded bg-amber-400 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" />
            Add to route
          </button>
        )}
      </div>

      {clickedFeatures.length > 1 && (
        <Section title="Clicked features">
          <div className="space-y-2">
            {clickedFeatures.map((candidate) => {
              const candidateKey = featureSelectionKey(candidate);
              const active = candidateKey === selectedFeatureKey;
              const label = formatFeatureCandidate(candidate);

              return (
                <button
                  key={candidateKey}
                  type="button"
                  onClick={() => setSelectedFeature(candidate, clickedFeatures)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    active
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="block font-semibold">{label.title}</span>
                  <span className={`block text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                    {label.meta}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section>
        {feature.country && <Row label="Country">{feature.country}</Row>}
        {feature.airportType && <Row label="Type">{feature.airportType}</Row>}
        {feature.navaidType && <Row label="Type">{feature.navaidType}</Row>}
        {feature.airspaceType && <Row label="Type">{feature.airspaceType}</Row>}
        {feature.obstacleType && <Row label="Type">{feature.obstacleType}</Row>}
        {feature.subtype && <Row label="Subtype">{feature.subtype}</Row>}
        {feature.airspaceClass && <Row label="Class">{feature.airspaceClass}</Row>}
        {feature.icao && <Row label="ICAO">{feature.icao}</Row>}
        {feature.iata && <Row label="IATA">{feature.iata}</Row>}
        {feature.identifier && <Row label="Identifier">{feature.identifier}</Row>}
        {feature.trafficTypes?.length ? (
          <Row label="Traffic">{feature.trafficTypes.join(', ')}</Row>
        ) : null}
      </Section>

      {feature.coordinates && (
        <Section title="Location">
          <Row label="DMS">{formatCoordinatesDMS(feature.coordinates)}</Row>
          <Row label="Decimals">{formatCoordinatesDecimal(feature.coordinates)}</Row>
        </Section>
      )}

      {feature.elevation !== undefined && (
        <Section>
          <Row label="Elevation">
            {feature.elevation} {feature.elevationUnit || 'm'} {feature.elevationReference || 'MSL'}
          </Row>
        </Section>
      )}

      {(feature.height !== undefined || feature.elevationTop !== undefined || feature.osmId !== undefined) && (
        <Section title="Obstacle Data">
          {feature.height !== undefined && (
            <Row label="Height">
              {feature.height} {feature.heightUnit || 'm'}
            </Row>
          )}
          {feature.elevationTop !== undefined && (
            <Row label="Top">
              {feature.elevationTop} {feature.elevationTopUnit || 'm'} MSL
            </Row>
          )}
          {feature.osmId !== undefined && <Row label="OSM ID">{String(feature.osmId)}</Row>}
        </Section>
      )}

      {(feature.upperLimit || feature.lowerLimit) && (
        <Section title="Vertical Limits">
          {feature.upperLimit && <Row label="Upper">{feature.upperLimit}</Row>}
          {feature.lowerLimit && <Row label="Lower">{feature.lowerLimit}</Row>}
        </Section>
      )}

      {(feature.activationFlags?.length || feature.onRequest !== undefined || feature.onDemand !== undefined || feature.byNotam !== undefined || feature.specialAgreement !== undefined) && (
        <Section title="Activation">
          {feature.activationFlags?.length ? (
            <Row label="Flags">{feature.activationFlags.join(', ')}</Row>
          ) : (
            <Row label="Flags">No special activation flags in tile data</Row>
          )}
          {feature.onRequest !== undefined && <Row label="On request">{feature.onRequest ? 'Yes' : 'No'}</Row>}
          {feature.onDemand !== undefined && <Row label="On demand">{feature.onDemand ? 'Yes' : 'No'}</Row>}
          {feature.byNotam !== undefined && <Row label="By NOTAM">{feature.byNotam ? 'Yes' : 'No'}</Row>}
          {feature.specialAgreement !== undefined && <Row label="Agreement">{feature.specialAgreement ? 'Required' : 'No'}</Row>}
        </Section>
      )}

      {(feature.ppr !== undefined || feature.private !== undefined) && (
        <Section title="Ownership / Restrictions">
          {feature.ppr !== undefined && <Row label="PPR">{feature.ppr ? 'Yes' : 'No'}</Row>}
          {feature.private !== undefined && <Row label="Private">{feature.private ? 'Yes' : 'No'}</Row>}
        </Section>
      )}

      {(feature.runwaySurface || feature.runwayRotation !== undefined || feature.skydiveActivity !== undefined || feature.winchOnly !== undefined) && (
        <Section title="Airport Hints">
          {feature.runwaySurface && <Row label="Runway">{feature.runwaySurface}</Row>}
          {feature.runwayRotation !== undefined && <Row label="Rotation">{feature.runwayRotation}°</Row>}
          {feature.skydiveActivity !== undefined && <Row label="Skydive">{feature.skydiveActivity ? 'Yes' : 'No'}</Row>}
          {feature.winchOnly !== undefined && <Row label="Winch only">{feature.winchOnly ? 'Yes' : 'No'}</Row>}
        </Section>
      )}

      {feature.frequencies?.length ? (
        <Section title="Frequencies">
          {feature.frequencies.map((frequency, index) => (
            <Row key={`${frequency.type}-${index}`} label={frequency.type}>
              {frequency.value}
            </Row>
          ))}
        </Section>
      ) : null}

      {feature.frequency && (
        <Section title="Frequency / Channel">
          <Row label="Frequency">{feature.frequency}</Row>
          {feature.channel && <Row label="Channel">{feature.channel}</Row>}
          {feature.alignedTrueNorth !== undefined && (
            <Row label="True north">{feature.alignedTrueNorth ? 'Aligned' : 'Not aligned'}</Row>
          )}
          {feature.magneticDeclination !== undefined && (
            <Row label="Mag var">{feature.magneticDeclination.toFixed(1)}°</Row>
          )}
        </Section>
      )}

      {feature.runways?.length ? (
        <Section title="Runways">
          {feature.runways.map((runway, index) => (
            <Row key={`${runway.designator}-${index}`} label={runway.designator || `RWY ${index + 1}`}>
              {runway.length} x {runway.width} {runway.unit} {runway.surface}
            </Row>
          ))}
        </Section>
      ) : null}

      {feature.activity && (
        <Section title="Activity">
          <p className="text-sm text-slate-600">{feature.activity}</p>
        </Section>
      )}

      {(feature.reliability || feature.electric !== undefined || feature.combustion !== undefined || feature.turbine !== undefined) && (
        <Section title="Site Details">
          {feature.reliability && <Row label="Reliability">{feature.reliability}</Row>}
          {feature.electric !== undefined && <Row label="Electric">{feature.electric ? 'Yes' : 'No'}</Row>}
          {feature.combustion !== undefined && <Row label="Combustion">{feature.combustion ? 'Yes' : 'No'}</Row>}
          {feature.turbine !== undefined && <Row label="Turbine">{feature.turbine ? 'Yes' : 'No'}</Row>}
        </Section>
      )}

      {(feature.hoursOfOperation || feature.remarks) && (
        <Section>
          {feature.hoursOfOperation && <Row label="Hours">{feature.hoursOfOperation}</Row>}
          {feature.remarks && <Row label="Remarks">{feature.remarks}</Row>}
        </Section>
      )}

      <Section title="OpenAIP Source">
        <Row label="Feature">{formatFeatureType(feature.type)}</Row>
        {feature.sourceLayer && <Row label="Layer">{feature.sourceLayer}</Row>}
        {feature.sourceId && <Row label="Source ID">{feature.sourceId}</Row>}
        <Row label="Record">{feature.enriched ? 'Extended Core API record loaded' : feature.sourceId ? 'Loading extended record...' : 'Tile data only'}</Row>
      </Section>

      {feature.sourceId && openAipRecordPath && (
        <div className="p-4">
          <a
            href={`https://www.openaip.net/${openAipRecordPath}/${feature.sourceId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded border border-slate-300 px-3 py-2 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Open OpenAIP record
          </a>
        </div>
      )}
    </div>
  );
}

function RoutePanel() {
  const {
    routeName,
    setRouteName,
    waypoints,
    addRouteWaypoint,
    addUserWaypoint,
    removeRouteWaypoint,
    moveRouteWaypoint,
    updateRouteWaypoint,
    clearRoute,
    activeAircraft,
    cruiseAltitudeFt,
    routeAirspaceReview,
    planningMode,
    setPlanningMode,
    visibleLayers,
    toggleLayer,
  } = useMapStore();
  const [query, setQuery] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [waypoints, activeAircraft]);
  const starterResults = useMemo(() => searchStarterWaypoints(query), [query]);
  const openAipSearch = useOpenAipWaypointSearch(query);
  const results = useMemo(
    () => mergeWaypointResults(starterResults, openAipSearch.waypoints).slice(0, 12),
    [openAipSearch.waypoints, starterResults]
  );

  const addManualPoint = () => {
    const latitude = Number(manualLat);
    const longitude = Number(manualLng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    addUserWaypoint([longitude, latitude]);
    setManualLat('');
    setManualLng('');
  };

  return (
    <div className="space-y-5">
      <div>
        <Label htmlFor="route-name">Route name</Label>
        <input
          id="route-name"
          value={routeName}
          onChange={(event) => setRouteName(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-950 focus:outline-none"
        />
      </div>

      <SummaryGrid
        items={[
          ['Distance', formatDistance(route.summary.totalDistanceNm)],
          ['ETE', formatDuration(route.summary.estimatedTimeMinutes)],
          ['Fuel', formatFuel(route.summary.totalFuelRequiredGal)],
          ['Remain', formatFuel(route.summary.fuelRemainingGal)],
        ]}
        status={route.summary.fuelStatus}
      />

      <AirspaceReviewPanel
        review={routeAirspaceReview}
        route={route}
        cruiseAltitudeFt={cruiseAltitudeFt}
      />

      <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-slate-900">Map clicks</p>
          <p className="text-xs text-slate-500">{planningMode ? 'Add user waypoints' : 'Inspect aviation features'}</p>
        </div>
        <button
          type="button"
          onClick={() => setPlanningMode(!planningMode)}
          className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium ${
            planningMode ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {planningMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {planningMode ? 'Planning' : 'Inspect'}
        </button>
      </div>

      <PanelBlock title="Airport and navaid search" icon={<Search className="h-4 w-4" />}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="ICAO, navaid, or name"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {query.trim().length >= 2
              ? openAipSearch.loading
                ? 'Searching OpenAIP Core...'
                : 'Starter results plus OpenAIP Core global search'
              : 'Type at least 2 characters for global OpenAIP search'}
          </span>
          {openAipSearch.waypoints.length > 0 && (
            <span>{openAipSearch.waypoints.length} OpenAIP</span>
          )}
        </div>
        {openAipSearch.error && <div className="mt-2"><WarningLine text={openAipSearch.error} /></div>}
        {openAipSearch.warning && <div className="mt-2"><WarningLine text={openAipSearch.warning} /></div>}
        <div className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">
              No airport or navaid matches found.
            </div>
          ) : results.map((waypoint) => (
            <button
              key={waypoint.id}
              type="button"
              onClick={() => addRouteWaypoint(waypoint)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50"
            >
              <span>
                <span className="block text-sm font-medium text-slate-900">{waypoint.ident}</span>
                <span className="block text-xs text-slate-500">{waypoint.name}</span>
                {waypoint.notes?.includes('OpenAIP Core') && (
                  <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                    OpenAIP global
                  </span>
                )}
              </span>
              <Plus className="h-4 w-4 text-slate-500" />
            </button>
          ))}
        </div>
      </PanelBlock>

      <PanelBlock title="Manual coordinate" icon={<MapPin className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={manualLat}
            onChange={(event) => setManualLat(event.target.value)}
            placeholder="Latitude"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
            inputMode="decimal"
          />
          <input
            value={manualLng}
            onChange={(event) => setManualLng(event.target.value)}
            placeholder="Longitude"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
            inputMode="decimal"
          />
        </div>
        <button
          type="button"
          onClick={addManualPoint}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add coordinate
        </button>
      </PanelBlock>

      <PanelBlock title="Navigation log" icon={<Navigation className="h-4 w-4" />}>
        {waypoints.length === 0 ? (
          <EmptyState title="No route yet" detail="Search, select map features, or add a coordinate." />
        ) : (
          <div className="space-y-3">
            {waypoints.map((waypoint, index) => {
              const nextLeg = route.legs[index];
              return (
                <div key={waypoint.id} className="rounded-md border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <input
                        value={waypoint.name}
                        onChange={(event) => updateRouteWaypoint(waypoint.id, { name: event.target.value })}
                        className="w-full rounded border border-transparent text-sm font-semibold text-slate-900 focus:border-slate-300 focus:px-2 focus:py-1 focus:outline-none"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        {waypoint.ident ?? waypoint.type.toUpperCase()} · {formatCoordinates(waypoint.coordinates)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton label="Move up" onClick={() => moveRouteWaypoint(waypoint.id, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Move down" onClick={() => moveRouteWaypoint(waypoint.id, 'down')} disabled={index === waypoints.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Remove waypoint" onClick={() => removeRouteWaypoint(waypoint.id)}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>
                  {nextLeg && (
                    <div className="mt-3 grid grid-cols-4 gap-2 rounded bg-slate-50 p-2 text-xs">
                      <Metric label="Dist" value={formatDistance(nextLeg.distanceNm)} />
                      <Metric label="TC" value={formatCourse(nextLeg.trueCourseDeg)} />
                      <Metric label="ETE" value={formatDuration(nextLeg.estimatedTimeMinutes)} />
                      <Metric label="Fuel" value={formatFuel(nextLeg.fuelRequiredGal)} />
                    </div>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={clearRoute}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" />
              Clear route
            </button>
          </div>
        )}
      </PanelBlock>

      <PanelBlock title="Map layers" icon={<Layers className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(visibleLayers).map(([layer, enabled]) => (
            <button
              key={layer}
              type="button"
              onClick={() => toggleLayer(layer as keyof typeof visibleLayers)}
              className={`rounded-md border px-3 py-2 text-left text-xs font-medium capitalize ${
                enabled
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {formatLayerName(layer)}
            </button>
          ))}
        </div>
      </PanelBlock>
    </div>
  );
}

function AirspaceReviewPanel({
  review,
  route,
  cruiseAltitudeFt,
}: {
  review: RouteAirspaceReview;
  route: ReturnType<typeof calculateRoute>;
  cruiseAltitudeFt: number;
}) {
  const reviewableAlerts = review.alerts.filter((alert) => alert.requiresReview);
  const criticalCount = review.alerts.filter((alert) => alert.level === 'critical').length;
  const visibleAlerts = review.alerts.slice(0, 6);
  const verticalProfile = useMemo(
    () => buildAirspaceVerticalProfile(route, review.alerts, cruiseAltitudeFt),
    [route, review.alerts, cruiseAltitudeFt]
  );
  const StatusIcon =
    criticalCount > 0 || reviewableAlerts.length > 0 || review.status === 'partial' || review.status === 'rate-limited'
      ? AlertTriangle
      : CheckCircle2;
  const isCoreReview = review.source === 'openaip-core';

  return (
    <PanelBlock title="Route airspace review" icon={<Layers className="h-4 w-4" />}>
      <div className={`rounded-md px-3 py-2 text-xs ${getAirspaceReviewTone(review)}`}>
        <div className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-semibold">
              {reviewableAlerts.length > 0
                ? `${reviewableAlerts.length} item${reviewableAlerts.length === 1 ? '' : 's'} need review`
                : isCoreReview ? 'OpenAIP Core corridor scan' : 'Rendered airspace scan'}
            </p>
            <p className="mt-1">{review.message}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded bg-slate-50 p-2 text-xs">
        <Metric label="Cruise" value={`${Math.round(cruiseAltitudeFt)} ft`} />
        {isCoreReview ? (
          <>
            <Metric label="Queries" value={String(review.queryCount ?? 0)} />
            <Metric label="Corridor" value={`${review.corridorNm ?? 0} nm`} />
          </>
        ) : (
          <>
            <Metric label="Samples" value={String(review.sampledPointCount)} />
            <Metric label="Layers" value={String(review.visibleLayerCount)} />
          </>
        )}
      </div>

      {isCoreReview && (
        <div className="mt-2 rounded bg-slate-50 p-2 text-xs">
          <Metric label="Candidates" value={String(review.candidateCount ?? 0)} />
        </div>
      )}

      <AirspaceVerticalProfilePanel profile={verticalProfile} />

      <p className="mt-2 text-xs text-slate-500">
        {isCoreReview
          ? 'Uses server-side OpenAIP Core airspace queries over the full route corridor. Continue with official chart and NOTAM review before flight.'
          : 'Uses OpenAIP airspaces currently rendered in the browser. Pan/zoom over the full route before final review.'}
      </p>

      {visibleAlerts.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={isCoreReview ? 'No Core airspace hits' : 'No rendered airspace hits'}
            detail={review.status === 'needs-route'
              ? 'Add a route first.'
              : isCoreReview
                ? 'No OpenAIP Core airspaces were found in the selected route corridor.'
                : 'No intersections were found in the visible rendered samples.'}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleAlerts.map((alert) => (
            <AirspaceAlertRow key={alert.id} alert={alert} />
          ))}
          {review.alerts.length > visibleAlerts.length && (
            <p className="text-xs font-medium text-slate-500">
              +{review.alerts.length - visibleAlerts.length} more airspace crossing{review.alerts.length - visibleAlerts.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
    </PanelBlock>
  );
}

function AirspaceAlertRow({ alert }: { alert: RouteAirspaceAlert }) {
  return (
    <div className={`rounded-md border p-2 text-xs ${getAirspaceAlertTone(alert.level)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{alert.name}</p>
          <p className="mt-0.5">
            {[alert.airspaceType, alert.airspaceClass].filter(Boolean).join(' · ') || 'Airspace'}
          </p>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase">
          {alert.level}
        </span>
      </div>
      <p className="mt-1 font-mono">{formatAirspaceVertical(alert)}</p>
      <p className="mt-1">{alert.reason}</p>
    </div>
  );
}

function AirspaceVerticalProfilePanel({ profile }: { profile: AirspaceVerticalProfile }) {
  const visibleItems = profile.items.slice(0, 5);

  return (
    <div className="mt-3 rounded-md border border-slate-200 p-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <p className="font-semibold text-slate-900">Vertical profile</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getAirspaceProfileTone(profile.status)}`}>
          {profile.status}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 rounded bg-slate-50 p-2 text-xs">
        <Metric label="Route" value={formatDistance(profile.routeDistanceNm)} />
        <Metric label="Cruise" value={`${Math.round(profile.cruiseAltitudeFt)} ft`} />
      </div>

      {visibleItems.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">
          No profile bands available yet.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {visibleItems.map((item) => {
            const range = getAirspaceProfileRange(item, profile.routeDistanceNm);
            return (
              <div key={item.id} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-slate-800">{item.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-slate-500">
                    {formatProfileRangeLabel(item)}
                  </span>
                </div>
                <div className="relative mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`absolute inset-y-0 rounded-full ${getAirspaceProfileBandTone(item.level)}`}
                    style={{ left: `${range.leftPercent}%`, width: `${range.widthPercent}%` }}
                  />
                </div>
                <p className="mt-1 font-mono text-[10px] text-slate-500">
                  {item.lowerLimit ?? 'lower unknown'} to {item.upperLimit ?? 'upper unknown'}
                </p>
              </div>
            );
          })}
          {profile.items.length > visibleItems.length && (
            <p className="text-xs font-medium text-slate-500">
              +{profile.items.length - visibleItems.length} more profile band{profile.items.length - visibleItems.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function useOpenAipWaypointSearch(query: string): OpenAipSearchState {
  const [state, setState] = useState<OpenAipSearchState>({
    waypoints: [],
    loading: false,
    error: null,
    warning: null,
  });
  const normalizedQuery = query.trim();

  useEffect(() => {
    if (normalizedQuery.length < 2) {
      setState({
        waypoints: [],
        loading: false,
        error: null,
        warning: null,
      });
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
        warning: null,
      }));

      fetch(`/api/openaip/search?q=${encodeURIComponent(normalizedQuery)}&limit=10`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) {
            throw new Error(payload?.error || 'OpenAIP global search failed.');
          }
          return payload as OpenAipWaypointSearchResponse;
        })
        .then((payload) => {
          setState({
            waypoints: payload.waypoints,
            loading: false,
            error: null,
            warning: payload.warning ?? null,
          });
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          setState({
            waypoints: [],
            loading: false,
            error: error instanceof Error ? error.message : 'OpenAIP global search failed.',
            warning: null,
          });
        });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [normalizedQuery]);

  return state;
}

function WeatherPanel() {
  const { waypoints, personalMinimums } = useMapStore();
  const weather = useRouteWeather(true);
  const stations = useMemo(() => getRouteStationIds(waypoints), [waypoints]);

  return (
    <div className="space-y-5">
      <PanelHeader
        title="Route weather"
        action={
          <button
            type="button"
            onClick={() => weather.refresh()}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${weather.loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {stations.length === 0 ? (
        <EmptyState title="No airport weather points" detail="Add an airport waypoint to load METAR and TAF data." />
      ) : (
        <div className="space-y-3">
          {stations.map((station) => {
            const report = weather.reports[station];
            const taf = weather.tafs[station];
            return (
              <div key={station} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-950">{station}</p>
                  <CategoryBadge category={report?.flightCategory ?? 'UNKNOWN'} />
                </div>
                {report ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p className="font-mono text-xs text-slate-600">{report.raw}</p>
                    <div className="grid grid-cols-2 gap-2 rounded bg-slate-50 p-2 text-xs">
                      <Metric label="Wind" value={formatWind(report)} />
                      <Metric label="Vis" value={report.visibilitySm ? `${report.visibilitySm} SM` : 'NIL'} />
                      <Metric label="Ceiling" value={report.ceilingFt ? `${report.ceilingFt} ft` : 'Unlimited'} />
                      <Metric label="QNH" value={report.altimeterHpa ? `${report.altimeterHpa} hPa` : 'NIL'} />
                    </div>
                    {isBelowPersonalMinimums(report, personalMinimums) && (
                      <WarningLine text="Below selected personal minimums" />
                    )}
                    {taf && (
                      <details className="rounded border border-slate-200 p-2">
                        <summary className="cursor-pointer text-xs font-semibold text-slate-700">TAF</summary>
                        <p className="mt-2 font-mono text-xs text-slate-600">{taf}</p>
                      </details>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">
                    {weather.loading ? 'Loading weather...' : 'No current METAR returned.'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {weather.error && <WarningLine text={weather.error} />}
    </div>
  );
}

function AircraftPanel() {
  const {
    activeAircraft,
    setActiveAircraft,
    updateActiveAircraft,
    weightBalanceLoading,
    updateWeightBalanceLoading,
    updateWeightBalanceStationWeight,
    personalMinimums,
    updatePersonalMinimums,
  } = useMapStore();
  const weightBalanceConfig = activeAircraft.weightBalance ?? createDefaultWeightBalanceConfig();
  const weightBalanceResult = useMemo(
    () => calculateWeightBalance({ aircraft: activeAircraft, loading: weightBalanceLoading }),
    [activeAircraft, weightBalanceLoading]
  );
  const updateWeightBalanceConfig = useCallback((updates: Partial<WeightBalanceConfig>) => {
    updateActiveAircraft({
      weightBalance: {
        ...weightBalanceConfig,
        ...updates,
        fuel: {
          ...weightBalanceConfig.fuel,
          ...updates.fuel,
        },
        stations: updates.stations ?? weightBalanceConfig.stations,
        envelope: updates.envelope ?? weightBalanceConfig.envelope,
      },
    });
  }, [updateActiveAircraft, weightBalanceConfig]);

  return (
    <div className="space-y-5">
      <PanelBlock title="Performance profile" icon={<Plane className="h-4 w-4" />}>
        <Label htmlFor="aircraft-preset">Preset aircraft</Label>
        <select
          id="aircraft-preset"
          value={activeAircraft.id}
          onChange={(event) => {
            const preset = PRESET_AIRCRAFT.find((aircraft) => aircraft.id === event.target.value);
            if (preset) setActiveAircraft(preset);
          }}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
        >
          {PRESET_AIRCRAFT.map((aircraft) => (
            <option key={aircraft.id} value={aircraft.id}>
              {aircraft.type} - {aircraft.name}
            </option>
          ))}
        </select>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <NumberField label="Cruise kts" value={activeAircraft.cruiseSpeedKts} onChange={(value) => updateActiveAircraft({ cruiseSpeedKts: value })} />
          <NumberField label="Fuel gph" value={activeAircraft.fuelBurnGph} onChange={(value) => updateActiveAircraft({ fuelBurnGph: value })} step="0.1" />
          <NumberField label="Usable gal" value={activeAircraft.usableFuelGal} onChange={(value) => updateActiveAircraft({ usableFuelGal: value })} step="0.1" />
          <NumberField label="Reserve min" value={activeAircraft.reserveMinutes} onChange={(value) => updateActiveAircraft({ reserveMinutes: value })} />
          <NumberField label="Contingency %" value={activeAircraft.contingencyPercent} onChange={(value) => updateActiveAircraft({ contingencyPercent: value })} />
          <NumberField label="Mag var" value={activeAircraft.magneticVariationDeg} onChange={(value) => updateActiveAircraft({ magneticVariationDeg: value })} />
          <NumberField label="Compass dev" value={activeAircraft.compassDeviationDeg ?? 0} onChange={(value) => updateActiveAircraft({ compassDeviationDeg: value })} />
          <NumberField label="Glide ratio" value={activeAircraft.glideRatio ?? 9} onChange={(value) => updateActiveAircraft({ glideRatio: value })} step="0.1" />
        </div>
      </PanelBlock>

      <PanelBlock title="Weight & balance" icon={<Gauge className="h-4 w-4" />}>
        <div className={`rounded-md px-3 py-2 text-xs ${getWeightBalanceTone(weightBalanceResult)}`}>
          <p className="font-semibold">{getWeightBalanceStatusLabel(weightBalanceResult.status)}</p>
          <p className="mt-1">{weightBalanceResult.message}</p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Enter real POH/AFM values for this registration. Presets are templates only.
          </p>
          <button
            type="button"
            onClick={() => updateWeightBalanceConfig({ setupStatus: 'configured' })}
            className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Mark configured
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <NumberField label="Empty lb" value={weightBalanceConfig.emptyWeightLb ?? 0} onChange={(value) => updateWeightBalanceConfig({ emptyWeightLb: value })} />
          <NumberField label="Empty arm" value={weightBalanceConfig.emptyArmIn ?? 0} onChange={(value) => updateWeightBalanceConfig({ emptyArmIn: value })} step="0.01" />
          <NumberField label="Max ramp lb" value={weightBalanceConfig.maxRampWeightLb ?? 0} onChange={(value) => updateWeightBalanceConfig({ maxRampWeightLb: value })} />
          <NumberField label="Max TO lb" value={weightBalanceConfig.maxTakeoffWeightLb ?? 0} onChange={(value) => updateWeightBalanceConfig({ maxTakeoffWeightLb: value })} />
          <NumberField label="Max land lb" value={weightBalanceConfig.maxLandingWeightLb ?? 0} onChange={(value) => updateWeightBalanceConfig({ maxLandingWeightLb: value })} />
          <NumberField label="Fuel arm" value={weightBalanceConfig.fuel.armIn ?? 0} onChange={(value) => updateWeightBalanceConfig({ fuel: { ...weightBalanceConfig.fuel, armIn: value } })} step="0.01" />
          <NumberField label="Fuel gal" value={weightBalanceLoading.fuelGal} onChange={(value) => updateWeightBalanceLoading({ fuelGal: value })} step="0.1" />
          <NumberField label="Landing gal" value={weightBalanceLoading.landingFuelGal ?? 0} onChange={(value) => updateWeightBalanceLoading({ landingFuelGal: value })} step="0.1" />
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stations</p>
            <button
              type="button"
              onClick={() => updateWeightBalanceConfig({
                stations: [
                  ...weightBalanceConfig.stations,
                  { id: `station-${Date.now()}`, name: 'Custom station' },
                ],
              })}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Add station
            </button>
          </div>
          <div className="space-y-2">
            {weightBalanceConfig.stations.map((station) => (
              <div key={station.id} className="rounded-md border border-slate-200 p-2">
                <div className="grid grid-cols-3 gap-2">
                  <input
                    value={station.name}
                    onChange={(event) => updateWeightBalanceConfig({
                      stations: updateStation(weightBalanceConfig.stations, station.id, { name: event.target.value }),
                    })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                    aria-label={`${station.name} station name`}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={station.armIn ?? 0}
                    onChange={(event) => updateWeightBalanceConfig({
                      stations: updateStation(weightBalanceConfig.stations, station.id, { armIn: Number(event.target.value) }),
                    })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                    aria-label={`${station.name} arm`}
                  />
                  <input
                    type="number"
                    value={weightBalanceLoading.stationWeights[station.id] ?? 0}
                    onChange={(event) => updateWeightBalanceStationWeight(station.id, Number(event.target.value))}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                    aria-label={`${station.name} weight`}
                  />
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">Name · arm in · loaded lb</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CG envelope</p>
            <button
              type="button"
              onClick={() => updateWeightBalanceConfig({
                envelope: [
                  ...weightBalanceConfig.envelope,
                  { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 },
                ],
              })}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Add point
            </button>
          </div>
          <div className="space-y-2">
            {(weightBalanceConfig.envelope.length ? weightBalanceConfig.envelope : [
              { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 },
              { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 },
            ]).map((point, index) => (
              <div key={`${point.weightLb}-${index}`} className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={point.weightLb}
                  onChange={(event) => updateWeightBalanceConfig({
                    envelope: updateEnvelopePoint(weightBalanceConfig.envelope, index, { weightLb: Number(event.target.value) }),
                  })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                  aria-label="Envelope weight"
                />
                <input
                  type="number"
                  step="0.01"
                  value={point.forwardArmIn}
                  onChange={(event) => updateWeightBalanceConfig({
                    envelope: updateEnvelopePoint(weightBalanceConfig.envelope, index, { forwardArmIn: Number(event.target.value) }),
                  })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                  aria-label="Envelope forward arm"
                />
                <input
                  type="number"
                  step="0.01"
                  value={point.aftArmIn}
                  onChange={(event) => updateWeightBalanceConfig({
                    envelope: updateEnvelopePoint(weightBalanceConfig.envelope, index, { aftArmIn: Number(event.target.value) }),
                  })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                  aria-label="Envelope aft arm"
                />
              </div>
            ))}
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Weight lb · forward arm · aft arm</p>
          </div>
        </div>
      </PanelBlock>

      <PanelBlock title="Personal minimums" icon={<Gauge className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Ceiling ft" value={personalMinimums.minimumCeilingFt} onChange={(value) => updatePersonalMinimums({ minimumCeilingFt: value })} />
          <NumberField label="Visibility SM" value={personalMinimums.minimumVisibilitySm} onChange={(value) => updatePersonalMinimums({ minimumVisibilitySm: value })} step="0.1" />
          <NumberField label="Reserve min" value={personalMinimums.minimumFuelReserveMinutes} onChange={(value) => {
            updatePersonalMinimums({ minimumFuelReserveMinutes: value });
            updateActiveAircraft({ reserveMinutes: value });
          }} />
          <NumberField label="Max wind kt" value={personalMinimums.maxSurfaceWindKts} onChange={(value) => updatePersonalMinimums({ maxSurfaceWindKts: value })} />
          <NumberField label="Crosswind kt" value={personalMinimums.maxCrosswindKts} onChange={(value) => updatePersonalMinimums({ maxCrosswindKts: value })} />
          <button
            type="button"
            onClick={() => {
              updatePersonalMinimums(DEFAULT_PERSONAL_MINIMUMS);
              updateActiveAircraft({ reserveMinutes: DEFAULT_PERSONAL_MINIMUMS.minimumFuelReserveMinutes });
            }}
            className="self-end rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </PanelBlock>
    </div>
  );
}

function BriefingPanel() {
  const {
    routeName,
    routeNotes,
    setRouteNotes,
    departureTime,
    setDepartureTime,
    cruiseAltitudeFt,
    setCruiseAltitudeFt,
    waypoints,
    activeAircraft,
    weightBalanceLoading,
    personalMinimums,
    routeAirspaceReview,
    routeNotamReview,
    trainingWind,
    updateTrainingWind,
    filingChecklist,
    notamBriefingRecord,
    flightPlanFilingRecord,
    closeReminder,
    emergencyLandingSites,
  } = useMapStore();
  const weather = useRouteWeather(false);
  const now = useNowMinute();
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [waypoints, activeAircraft]);
  const trainingNavLog = useMemo(
    () => buildTrainingNavLog(route, activeAircraft, trainingWind),
    [route, activeAircraft, trainingWind]
  );
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
  const airspaceVerticalProfile = useMemo(
    () => buildAirspaceVerticalProfile(route, routeAirspaceReview.alerts, cruiseAltitudeFt),
    [route, routeAirspaceReview.alerts, cruiseAltitudeFt]
  );
  const filingReview = useMemo(
    () => buildFilingWorkflowReview({
      checklist: filingChecklist,
      closeReminder,
      now,
    }),
    [filingChecklist, closeReminder, now]
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
    [closeReminder, cruiseAltitudeFt, departureTime, filingReview, flightPlanFilingRecord, notamBriefingRecord, now, routeName, routeNotamReview, waypoints]
  );
  const emergencyReview = useMemo(
    () => buildEmergencyPlanningReview({
      waypoints,
      cruiseAltitudeFt,
      aircraft: activeAircraft,
      userSites: emergencyLandingSites,
      now,
    }),
    [activeAircraft, cruiseAltitudeFt, emergencyLandingSites, now, waypoints]
  );
  const reports = useMemo(
    () => Object.values(weather.reports).filter((report): report is WeatherReport => Boolean(report)),
    [weather.reports]
  );
  const dataFreshness = useMemo(
    () => [
      assessDataFreshness({
        source: 'Route',
        updatedAt: routeCalculatedAt,
        maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.route,
      }),
      assessDataFreshness({
        source: 'Weather',
        updatedAt: weather.updatedAt ?? newestWeatherObservedAt(reports),
        maxAgeMinutes: FRESHNESS_THRESHOLDS_MINUTES.weather,
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
    [reports, routeAirspaceReview.updatedAt, routeCalculatedAt, routeNotamReview.updatedAt, weather.updatedAt, weightBalanceResult.calculatedAt]
  );
  const risks = useMemo(
    () => buildRiskAssessment(route, reports, personalMinimums, routeAirspaceReview.alerts, routeNotamReview, weightBalanceResult, filingReview, emergencyReview, flightAdminReview),
    [route, reports, personalMinimums, routeAirspaceReview.alerts, routeNotamReview, weightBalanceResult, filingReview, emergencyReview, flightAdminReview]
  );
  const digest = useMemo(
    () => buildBriefingDigest({
      routeName,
      route,
      risks,
      weather: reports,
      routeAirspaceAlerts: routeAirspaceReview.alerts,
      routeNotamReview,
      weightBalanceResult,
      dataFreshness,
      filingReview,
      flightAdminReview,
      emergencyReview,
    }),
    [routeName, route, risks, reports, routeAirspaceReview.alerts, routeNotamReview, weightBalanceResult, dataFreshness, filingReview, flightAdminReview, emergencyReview]
  );
  const briefingText = useMemo(
    () => buildBriefingText({
      routeName,
      aircraft: activeAircraft,
      route,
      waypoints,
      weather: reports,
      risks,
      routeAirspaceAlerts: routeAirspaceReview.alerts,
      airspaceVerticalProfile,
      routeNotamReview,
      weightBalanceResult,
      dataFreshness,
      trainingNavLog,
      filingReview,
      flightAdminReview,
      emergencyReview,
      departureTime,
      cruiseAltitudeFt,
      notes: routeNotes,
    }),
    [routeName, activeAircraft, route, waypoints, reports, risks, routeAirspaceReview.alerts, airspaceVerticalProfile, routeNotamReview, weightBalanceResult, dataFreshness, trainingNavLog, filingReview, flightAdminReview, emergencyReview, departureTime, cruiseAltitudeFt, routeNotes]
  );
  const backupPackText = useMemo(
    () => buildBackupPackText({
      routeName,
      aircraft: activeAircraft,
      route,
      waypoints,
      digest,
      weather: reports,
      risks,
      routeAirspaceAlerts: routeAirspaceReview.alerts,
      airspaceVerticalProfile,
      routeNotamReview,
      weightBalanceResult,
      dataFreshness,
      trainingNavLog,
      filingReview,
      flightAdminReview,
      emergencyReview,
      departureTime,
      cruiseAltitudeFt,
      notes: routeNotes,
    }),
    [routeName, activeAircraft, route, waypoints, digest, reports, risks, routeAirspaceReview.alerts, airspaceVerticalProfile, routeNotamReview, weightBalanceResult, dataFreshness, trainingNavLog, filingReview, flightAdminReview, emergencyReview, departureTime, cruiseAltitudeFt, routeNotes]
  );

  return (
    <div className="space-y-5">
      <PanelBlock title="Dispatch details" icon={<ClipboardCheck className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="departure-time">Departure</Label>
            <input
              id="departure-time"
              type="datetime-local"
              value={departureTime}
              onChange={(event) => setDepartureTime(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
            />
          </div>
          <NumberField label="Cruise ft" value={cruiseAltitudeFt} onChange={setCruiseAltitudeFt} />
        </div>
        <div className="mt-3">
          <Label htmlFor="route-notes">Pilot notes</Label>
          <textarea
            id="route-notes"
            value={routeNotes}
            onChange={(event) => setRouteNotes(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
          />
        </div>
      </PanelBlock>

      <AirspaceReviewPanel
        review={routeAirspaceReview}
        route={route}
        cruiseAltitudeFt={cruiseAltitudeFt}
      />

      <BriefingDigestPanel digest={digest} />

      <FreshnessPanel freshness={dataFreshness} />

      <NotamReviewPanel review={routeNotamReview} />

      <WeightBalanceReviewPanel result={weightBalanceResult} />

      <TrainingNavLogPanel
        navLog={trainingNavLog}
        onWindChange={updateTrainingWind}
      />

      <PanelBlock title="Risk review" icon={<AlertTriangle className="h-4 w-4" />}>
        <div className="space-y-2">
          {risks.map((risk) => (
            <RiskRow key={risk.id} risk={risk} />
          ))}
        </div>
      </PanelBlock>

      <PanelBlock title="Briefing package" icon={<Printer className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1 rounded-md bg-slate-950 px-2 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            type="button"
            onClick={() => downloadBriefing(briefingText, routeName)}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Text
          </button>
          <button
            type="button"
            onClick={() => downloadBriefing(backupPackText, `${routeName || 'halo'}-backup-pack`)}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Backup pack
          </button>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(briefingText)}
            className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Copy
          </button>
        </div>
        <pre className="mt-3 max-h-[24rem] overflow-auto rounded-md bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
          {briefingText}
        </pre>
      </PanelBlock>
    </div>
  );
}

function AdminPanel() {
  const {
    routeName,
    departureTime,
    cruiseAltitudeFt,
    waypoints,
    activeAircraft,
    filingChecklist,
    updateFilingChecklist,
    notamBriefingRecord,
    updateNotamBriefingRecord,
    flightPlanFilingRecord,
    updateFlightPlanFilingRecord,
    closeReminder,
    updateCloseReminder,
    routeNotamReview,
  } = useMapStore();
  const now = useNowMinute();
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [waypoints, activeAircraft]);
  const filingReview = useMemo(
    () => buildFilingWorkflowReview({
      checklist: filingChecklist,
      closeReminder,
      now,
    }),
    [filingChecklist, closeReminder, now]
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

  return (
    <div className="space-y-5">
      <PanelHeader
        title="Flight Admin"
        action={
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-900">
            Optional record
          </span>
        }
      />
      <FilingCloseReminderPanel
        checklist={filingChecklist}
        flightAdminReview={flightAdminReview}
        notamRecord={notamBriefingRecord}
        flightPlanRecord={flightPlanFilingRecord}
        closeReminder={closeReminder}
        review={filingReview}
        departureTime={departureTime}
        estimatedTimeMinutes={route.summary.estimatedTimeMinutes}
        onChecklistChange={updateFilingChecklist}
        onNotamRecordChange={updateNotamBriefingRecord}
        onFlightPlanRecordChange={updateFlightPlanFilingRecord}
        onReminderChange={updateCloseReminder}
      />
    </div>
  );
}

function EmergencyPanel() {
  const {
    waypoints,
    cruiseAltitudeFt,
    activeAircraft,
    emergencyLandingSites,
    addEmergencyLandingSite,
    updateEmergencyLandingSite,
    removeEmergencyLandingSite,
  } = useMapStore();
  const now = useNowMinute();
  const emergencyReview = useMemo(
    () => buildEmergencyPlanningReview({
      waypoints,
      cruiseAltitudeFt,
      aircraft: activeAircraft,
      userSites: emergencyLandingSites,
      now,
    }),
    [activeAircraft, cruiseAltitudeFt, emergencyLandingSites, now, waypoints]
  );

  return (
    <div className="space-y-5">
      <PanelHeader title="Emergency planning" />
      <EmergencyPlanningPanel
        review={emergencyReview}
        onAddSite={addEmergencyLandingSite}
        onUpdateSite={updateEmergencyLandingSite}
        onRemoveSite={removeEmergencyLandingSite}
      />
    </div>
  );
}

function BriefingDigestPanel({ digest }: { digest: BriefingDigest }) {
  return (
    <PanelBlock title="Pilot digest" icon={<ClipboardCheck className="h-4 w-4" />}>
      <div className={`rounded-md px-3 py-2 text-xs ${getDigestTone(digest.status)}`}>
        <p className="font-semibold">{digest.title}</p>
        <p className="mt-1">{digest.summary}</p>
      </div>
      <div className="mt-3 space-y-2">
        {digest.items.map((item, index) => (
          <div key={item.id} className={`rounded-md border p-2 text-xs ${getDigestItemTone(item.level)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{index + 1}. {item.title}</p>
                <p className="mt-1">{item.action}</p>
              </div>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase">
                {item.source}
              </span>
            </div>
          </div>
        ))}
      </div>
    </PanelBlock>
  );
}

function FreshnessPanel({ freshness }: { freshness: DataFreshness[] }) {
  return (
    <PanelBlock title="Data freshness" icon={<RefreshCcw className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-2">
        {freshness.map((item) => (
          <FreshnessBadge key={item.source} freshness={item} />
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Stale or unknown data requires official source review before flight.
      </p>
    </PanelBlock>
  );
}

function FreshnessBadge({ freshness }: { freshness: DataFreshness }) {
  return (
    <div className={`rounded-md border px-2 py-1 text-xs ${getFreshnessTone(freshness.status)}`}>
      <p className="font-semibold">{freshness.source}: {formatFreshnessStatus(freshness.status)}</p>
      <p className="mt-0.5">{freshness.ageMinutes !== undefined ? `${freshness.ageMinutes} min old` : 'Age unknown'}</p>
    </div>
  );
}

function WeightBalanceReviewPanel({ result }: { result: WeightBalanceResult }) {
  return (
    <PanelBlock title="Weight & balance review" icon={<Gauge className="h-4 w-4" />}>
      <div className={`rounded-md px-3 py-2 text-xs ${getWeightBalanceTone(result)}`}>
        <p className="font-semibold">{getWeightBalanceStatusLabel(result.status)}</p>
        <p className="mt-1">{result.message}</p>
      </div>

      {result.ramp && result.takeoff && result.landing ? (
        <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-2 text-xs">
          <Metric label="Ramp" value={`${Math.round(result.ramp.weightLb)} lb / ${result.ramp.armIn.toFixed(2)} in`} />
          <Metric label="Takeoff" value={`${Math.round(result.takeoff.weightLb)} lb / ${result.takeoff.armIn.toFixed(2)} in`} />
          <Metric label="Landing" value={`${Math.round(result.landing.weightLb)} lb / ${result.landing.armIn.toFixed(2)} in`} />
        </div>
      ) : (
        <div className="mt-3">
          <EmptyState title="W&B not operational yet" detail="Open Aircraft and enter POH/AFM W&B data for this registration." />
        </div>
      )}

      {result.issues.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-600">
          {result.issues.slice(0, 4).map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </PanelBlock>
  );
}

function TrainingNavLogPanel({
  navLog,
  onWindChange,
}: {
  navLog: TrainingNavLog;
  onWindChange: (updates: Partial<TrainingNavLog['wind']>) => void;
}) {
  return (
    <PanelBlock title="Training / checkride navlog" icon={<Navigation className="h-4 w-4" />}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Wind from deg"
          value={navLog.wind.directionDeg}
          onChange={(value) => onWindChange({ directionDeg: value })}
        />
        <NumberField
          label="Wind kt"
          value={navLog.wind.speedKts}
          onChange={(value) => onWindChange({ speedKts: value })}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Training mode uses a single manually entered route wind to teach WCA, heading, groundspeed, ETE, and fuel calculations.
        Operational route math above remains unchanged.
      </p>

      {navLog.legs.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="No training legs yet"
            detail="Add at least two waypoints to generate checkride navlog calculations."
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 rounded bg-slate-50 p-2 text-xs">
            <Metric label="Training ETE" value={formatDuration(navLog.totalTimeMinutes)} />
            <Metric label="Training fuel" value={formatFuel(navLog.totalFuelGal)} />
          </div>
          <p className="rounded bg-slate-50 p-2 text-xs text-slate-600">
            Formula: {navLog.legs[0].formula}
          </p>
          {navLog.legs.slice(0, 6).map((leg, index) => (
            <div key={leg.id} className="rounded-md border border-slate-200 p-2 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {index + 1}. {leg.from} → {leg.to}
                  </p>
                  <p className="mt-1 text-slate-500">
                    WCA {formatSignedDegrees(leg.windCorrectionAngleDeg)} · GS {Math.round(leg.groundSpeedKts)} kt
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                  {formatDuration(leg.estimatedTimeMinutes)}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 rounded bg-slate-50 p-2">
                <Metric label="TC" value={formatCourse(leg.trueCourseDeg)} />
                <Metric label="MC" value={formatCourse(leg.magneticCourseDeg)} />
                <Metric label="TH" value={formatCourse(leg.trueHeadingDeg)} />
                <Metric label="MH" value={formatCourse(leg.magneticHeadingDeg)} />
                <Metric label="CH" value={formatCourse(leg.compassHeadingDeg)} />
                <Metric label="Fuel" value={formatFuel(leg.fuelRequiredGal)} />
                <Metric label="WCA" value={formatSignedDegrees(leg.windCorrectionAngleDeg)} />
                <Metric label="GS" value={`${Math.round(leg.groundSpeedKts)} kt`} />
              </div>
            </div>
          ))}
          {navLog.legs.length > 6 && (
            <p className="text-xs font-medium text-slate-500">
              +{navLog.legs.length - 6} more training leg{navLog.legs.length - 6 === 1 ? '' : 's'} in the exported briefing.
            </p>
          )}
        </div>
      )}
    </PanelBlock>
  );
}

function FilingCloseReminderPanel({
  checklist,
  flightAdminReview,
  notamRecord,
  flightPlanRecord,
  closeReminder,
  review,
  departureTime,
  estimatedTimeMinutes,
  onChecklistChange,
  onNotamRecordChange,
  onFlightPlanRecordChange,
  onReminderChange,
}: {
  checklist: FilingChecklistState;
  flightAdminReview: FlightAdminReview;
  notamRecord: NotamBriefingRecord;
  flightPlanRecord: FlightPlanFilingRecord;
  closeReminder: FlightCloseReminder;
  review: FilingWorkflowReview;
  departureTime: string;
  estimatedTimeMinutes: number;
  onChecklistChange: (updates: Partial<FilingChecklistState>) => void;
  onNotamRecordChange: (updates: Partial<NotamBriefingRecord>) => void;
  onFlightPlanRecordChange: (updates: Partial<FlightPlanFilingRecord>) => void;
  onReminderChange: (updates: Partial<FlightCloseReminder>) => void;
}) {
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [lastNotifiedStatus, setLastNotifiedStatus] = useState<FilingWorkflowReview['status'] | null>(null);

  useEffect(() => {
    if (!closeReminder.enabled || closeReminder.acknowledgedAt) return;
    if (review.status !== 'due-soon' && review.status !== 'overdue') return;
    if (lastNotifiedStatus === review.status) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    new Notification('Halo close-flight reminder', {
      body: review.message,
      tag: 'halo-close-flight-reminder',
    });
    setLastNotifiedStatus(review.status);
  }, [closeReminder.acknowledgedAt, closeReminder.enabled, lastNotifiedStatus, review.message, review.status]);

  const setRecommendedTimes = () => {
    onReminderChange({
      ...buildCloseReminderFromDeparture({
        departureTime,
        estimatedTimeMinutes,
        closeBufferMinutes: 30,
      }),
      acknowledgedAt: undefined,
    });
  };

  const recordNotamNow = () => {
    onNotamRecordChange({
      status: 'completed',
      method: notamRecord.method || 'File2Fly / ATNS AIMU',
      sourceUrl: notamRecord.sourceUrl || flightAdminReview.officialSourceUrl,
      completedAt: toDateTimeLocal(new Date()),
      routeSignature: flightAdminReview.routeSignature,
      departureTime,
    });
  };

  const markFiledNow = () => {
    onFlightPlanRecordChange({
      status: 'filed-manually',
      method: flightPlanRecord.method || 'File2Fly / ATNS AIMU',
      filedAt: toDateTimeLocal(new Date()),
    });
  };

  const markFlightClosed = () => {
    const closedAt = new Date();
    onFlightPlanRecordChange({
      status: 'closed',
      closedAt: toDateTimeLocal(closedAt),
    });
    onReminderChange({
      enabled: true,
      acknowledgedAt: closedAt.toISOString(),
    });
  };

  const copyPibRequest = async () => {
    await navigator.clipboard?.writeText(flightAdminReview.routePibRequestText);
    setCopyMessage('Route PIB request copied.');
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setNotificationMessage('Browser notifications are not supported here.');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationMessage(
      permission === 'granted'
        ? 'Browser close reminder enabled while this app remains open.'
        : 'Browser notification permission was not granted.'
    );
  };

  return (
    <PanelBlock title="Flight Admin" icon={<ClipboardCheck className="h-4 w-4" />}>
      <div className={`rounded-md px-3 py-2 text-xs ${getFlightAdminReviewTone(flightAdminReview.status)}`}>
        <p className="font-semibold">{formatFlightAdminReviewStatus(flightAdminReview.status)}</p>
        <p className="mt-1">{flightAdminReview.message}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-2 text-xs">
        <Metric label="Admin" value={flightAdminReview.status.toUpperCase()} />
        <Metric label="NOTAM" value={formatNotamRecordStatus(flightAdminReview.notamStatus)} />
        <Metric label="Filing" value={formatFlightPlanFilingStatus(flightAdminReview.filingStatus)} />
        <Metric label="Close state" value={review.status.toUpperCase()} />
      </div>

      <div className="mt-3 rounded-md border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">Official NOTAM record</p>
          <button
            type="button"
            onClick={recordNotamNow}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Record now
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">{flightAdminReview.notamMessage}</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <SelectField
            label="NOTAM status"
            value={notamRecord.status}
            onChange={(value) => {
              if (value === 'completed') {
                onNotamRecordChange({
                  status: value,
                  completedAt: notamRecord.completedAt || toDateTimeLocal(new Date()),
                  routeSignature: flightAdminReview.routeSignature,
                  departureTime,
                });
                return;
              }
              onNotamRecordChange({ status: value });
            }}
            options={[
              ['not-recorded', 'Not recorded in Halo'],
              ['completed', 'Official briefing completed'],
              ['not-applicable', 'Not applicable / pilot waived'],
              ['needs-rebrief', 'Needs rebrief'],
            ]}
          />
          <TextField
            label="NOTAM source/method"
            value={notamRecord.method ?? ''}
            onChange={(value) => onNotamRecordChange({ method: value })}
          />
          <TextField
            label="NOTAM reference"
            value={notamRecord.reference ?? ''}
            onChange={(value) => onNotamRecordChange({ reference: value })}
          />
          <DateTimeField
            label="NOTAM completed at"
            value={notamRecord.completedAt ?? ''}
            onChange={(value) => onNotamRecordChange({
              completedAt: value,
              routeSignature: value ? flightAdminReview.routeSignature : notamRecord.routeSignature,
              departureTime: value ? departureTime : notamRecord.departureTime,
            })}
          />
          <TextareaField
            label="NOTAM notes"
            value={notamRecord.notes ?? ''}
            onChange={(value) => onNotamRecordChange({ notes: value })}
            rows={2}
          />
        </div>
      </div>

      <div className="mt-3 rounded-md border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">Route PIB handoff</p>
          <button
            type="button"
            onClick={copyPibRequest}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Copy PIB request
          </button>
        </div>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-2 text-[11px] leading-relaxed text-slate-100">
          {flightAdminReview.routePibRequestText}
        </pre>
        {copyMessage && <p className="mt-2 text-xs text-slate-500">{copyMessage}</p>}
      </div>

      <div className="mt-3 rounded-md border border-slate-200 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">Flight plan filing record</p>
          <button
            type="button"
            onClick={markFiledNow}
            className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
          >
            Mark filed now
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">{flightAdminReview.filingMessage}</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <SelectField
            label="Filing status"
            value={flightPlanRecord.status}
            onChange={(value) => onFlightPlanRecordChange({ status: value })}
            options={[
              ['not-filing', 'Not filing / not applicable'],
              ['preparing', 'Preparing'],
              ['filed-manually', 'Filed manually'],
              ['accepted', 'Accepted'],
              ['rejected', 'Rejected'],
              ['cancelled', 'Cancelled'],
              ['closed', 'Closed'],
            ]}
          />
          <TextField
            label="Filing source/method"
            value={flightPlanRecord.method ?? ''}
            onChange={(value) => onFlightPlanRecordChange({ method: value })}
          />
          <TextField
            label="Filing reference"
            value={flightPlanRecord.reference ?? ''}
            onChange={(value) => onFlightPlanRecordChange({ reference: value })}
          />
          <DateTimeField
            label="Filed at"
            value={flightPlanRecord.filedAt ?? ''}
            onChange={(value) => onFlightPlanRecordChange({ filedAt: value })}
          />
          <DateTimeField
            label="Accepted at"
            value={flightPlanRecord.acceptedAt ?? ''}
            onChange={(value) => onFlightPlanRecordChange({ acceptedAt: value })}
          />
          <DateTimeField
            label="Closed at"
            value={flightPlanRecord.closedAt ?? ''}
            onChange={(value) => onFlightPlanRecordChange({ closedAt: value })}
          />
          <TextField
            label="Responsible contact"
            value={flightPlanRecord.responsibleContact ?? ''}
            onChange={(value) => onFlightPlanRecordChange({ responsibleContact: value })}
          />
          <TextareaField
            label="Filing notes"
            value={flightPlanRecord.notes ?? ''}
            onChange={(value) => onFlightPlanRecordChange({ notes: value })}
            rows={2}
          />
        </div>
      </div>

      <div className="mt-3 rounded-md border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-950">Close reminder</p>
        <p className="mt-1 text-xs text-slate-500">{review.message}</p>
        <div className="mt-3 grid grid-cols-1 gap-3">
        <DateTimeField
          label="Planned departure"
          value={closeReminder.plannedDepartureTime ?? ''}
          onChange={(value) => onReminderChange({ plannedDepartureTime: value, enabled: true, acknowledgedAt: undefined })}
        />
        <DateTimeField
          label="Planned arrival"
          value={closeReminder.plannedArrivalTime ?? ''}
          onChange={(value) => onReminderChange({ plannedArrivalTime: value, enabled: true, acknowledgedAt: undefined })}
        />
        <DateTimeField
          label="Close by"
          value={closeReminder.closeByTime ?? ''}
          onChange={(value) => onReminderChange({ closeByTime: value, enabled: true, acknowledgedAt: undefined })}
        />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={setRecommendedTimes}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Set from route ETE
        </button>
        <button
          type="button"
          onClick={markFlightClosed}
          className="rounded-md border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
        >
          Mark closed
        </button>
        <button
          type="button"
          onClick={requestNotificationPermission}
          className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Browser notify
        </button>
        <a
          href={review.officialSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Open File2Fly
        </a>
      </div>

      <div className="mt-3 rounded-md border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-950">Optional quick checklist</p>
        <div className="mt-2 space-y-2">
          <ChecklistToggle
            label="Route reviewed"
            checked={checklist.routeReviewed}
            onChange={(checked) => onChecklistChange({ routeReviewed: checked })}
          />
          <ChecklistToggle
            label="Weather reviewed"
            checked={checklist.weatherReviewed}
            onChange={(checked) => onChecklistChange({ weatherReviewed: checked })}
          />
          <ChecklistToggle
            label="Official NOTAM PIB obtained"
            checked={checklist.notamPibObtained}
            onChange={(checked) => onChecklistChange({ notamPibObtained: checked })}
          />
          <ChecklistToggle
            label="Weight & balance reviewed"
            checked={checklist.weightBalanceReviewed}
            onChange={(checked) => onChecklistChange({ weightBalanceReviewed: checked })}
          />
          <ChecklistToggle
            label="Fuel reviewed"
            checked={checklist.fuelReviewed}
            onChange={(checked) => onChecklistChange({ fuelReviewed: checked })}
          />
          <ChecklistToggle
            label="Filed via official source"
            checked={checklist.filedViaOfficialSource}
            onChange={(checked) => onChecklistChange({ filedViaOfficialSource: checked })}
          />
        </div>
      </div>

      {notificationMessage && (
        <p className="mt-2 text-xs text-slate-500">{notificationMessage}</p>
      )}
      <p className="mt-2 text-xs text-slate-500">
        Halo only prepares handoff text, optional records, checklist, and reminders. Obtain NOTAMs, file, cancel, and close through ATNS File2Fly / SACAA official channels.
      </p>
    </PanelBlock>
  );
}

function EmergencyPlanningPanel({
  review,
  onAddSite,
  onUpdateSite,
  onRemoveSite,
}: {
  review: EmergencyPlanningReview;
  onAddSite: (site: Omit<EmergencyLandingSite, 'id'>) => void;
  onUpdateSite: (id: string, updates: Partial<EmergencyLandingSite>) => void;
  onRemoveSite: (id: string) => void;
}) {
  const [siteName, setSiteName] = useState('');
  const [siteLat, setSiteLat] = useState('');
  const [siteLng, setSiteLng] = useState('');
  const [siteSuitability, setSiteSuitability] = useState<EmergencyLandingSuitability>('unknown');
  const [siteNotes, setSiteNotes] = useState('');
  const [siteVerified, setSiteVerified] = useState('');
  const visibleCandidates = review.candidates.slice(0, 5);

  const addSite = () => {
    const latitude = Number(siteLat);
    const longitude = Number(siteLng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return;

    onAddSite({
      name: siteName.trim() || 'Forced-landing site',
      coordinates: [longitude, latitude],
      suitability: siteSuitability,
      notes: siteNotes.trim() || undefined,
      lastVerifiedDate: siteVerified || undefined,
    });
    setSiteName('');
    setSiteLat('');
    setSiteLng('');
    setSiteSuitability('unknown');
    setSiteNotes('');
    setSiteVerified('');
  };

  return (
    <PanelBlock title="Emergency / forced landing" icon={<AlertTriangle className="h-4 w-4" />}>
      <div className={`rounded-md px-3 py-2 text-xs ${getEmergencyReviewTone(review.status)}`}>
        <p className="font-semibold">{formatEmergencyStatus(review.status)}</p>
        <p className="mt-1">{review.message}</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-2 text-xs">
        <Metric label="Glide" value={`${review.glideRadiusNm.toFixed(1)} nm`} />
        <Metric label="Ratio" value={`${review.glideRatio}:1`} />
        <Metric label="Sites" value={String(review.candidates.length)} />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Glide radius is approximate still-air distance from selected cruise altitude. Verify terrain, wind, aircraft configuration, and official aerodrome data.
      </p>

      <div className="mt-3 space-y-2">
        {visibleCandidates.length === 0 ? (
          <EmptyState
            title="No emergency candidates"
            detail="Add a route or mark forced-landing sites."
          />
        ) : visibleCandidates.map((candidate, index) => (
          <div key={candidate.id} className={`rounded-md border p-2 text-xs ${getEmergencySuitabilityTone(candidate.suitability)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {index + 1}. {candidate.ident ? `${candidate.ident} · ` : ''}{candidate.name}
                </p>
                <p className="mt-1">
                  {candidate.distanceFromRouteNm.toFixed(1)} nm from route · {candidate.source}
                </p>
              </div>
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase">
                {candidate.suitability}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-slate-200 p-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mark forced-landing site</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input
            value={siteName}
            onChange={(event) => setSiteName(event.target.value)}
            placeholder="Name"
            className="col-span-2 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
          />
          <input
            value={siteLat}
            onChange={(event) => setSiteLat(event.target.value)}
            placeholder="Latitude"
            inputMode="decimal"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
          />
          <input
            value={siteLng}
            onChange={(event) => setSiteLng(event.target.value)}
            placeholder="Longitude"
            inputMode="decimal"
            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
          />
          <select
            value={siteSuitability}
            onChange={(event) => setSiteSuitability(event.target.value as EmergencyLandingSuitability)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
          >
            <option value="unknown">Unknown</option>
            <option value="good">Good</option>
            <option value="caution">Caution</option>
            <option value="unsuitable">Unsuitable</option>
          </select>
          <input
            type="date"
            value={siteVerified}
            onChange={(event) => setSiteVerified(event.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
          />
          <input
            value={siteNotes}
            onChange={(event) => setSiteNotes(event.target.value)}
            placeholder="Notes"
            className="col-span-2 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={addSite}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add forced-landing site
        </button>
      </div>

      {review.userSites.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User sites</p>
          {review.userSites.map((site) => (
            <div key={site.id} className="rounded-md border border-slate-200 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    value={site.name}
                    onChange={(event) => onUpdateSite(site.id, { name: event.target.value })}
                    className="w-full rounded border border-transparent text-xs font-semibold text-slate-900 focus:border-slate-300 focus:px-2 focus:py-1 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">{formatCoordinates(site.coordinates)}</p>
                </div>
                <IconButton label="Remove emergency site" onClick={() => onRemoveSite(site.id)}>
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={site.suitability}
                  onChange={(event) => onUpdateSite(site.id, { suitability: event.target.value as EmergencyLandingSuitability })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                >
                  <option value="unknown">Unknown</option>
                  <option value="good">Good</option>
                  <option value="caution">Caution</option>
                  <option value="unsuitable">Unsuitable</option>
                </select>
                <input
                  type="date"
                  value={site.lastVerifiedDate ?? ''}
                  onChange={(event) => onUpdateSite(site.id, { lastVerifiedDate: event.target.value || undefined })}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-slate-950 focus:outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelBlock>
  );
}

function NotamReviewPanel({ review }: { review: RouteNotamReview }) {
  const criticalCount = review.notams.filter((notam) => notam.severity === 'critical').length;
  const cautionCount = review.notams.filter((notam) => notam.severity === 'caution').length;
  const visibleNotams = review.notams.slice(0, 6);
  const StatusIcon = criticalCount > 0 || cautionCount > 0 || review.status !== 'complete'
    ? AlertTriangle
    : CheckCircle2;
  const sourceLabel = formatNotamSource(review.source);

  return (
    <PanelBlock title="Route NOTAM review" icon={<AlertTriangle className="h-4 w-4" />}>
      <div className={`rounded-md px-3 py-2 text-xs ${getNotamReviewTone(review)}`}>
        <div className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-semibold">
              {criticalCount > 0
                ? `${criticalCount} critical NOTAM${criticalCount === 1 ? '' : 's'}`
                : cautionCount > 0
                  ? `${cautionCount} NOTAM${cautionCount === 1 ? '' : 's'} need review`
                  : review.status === 'complete'
                    ? `${sourceLabel} route scan`
                    : formatNotamStatusLabel(review.status)}
            </p>
            <p className="mt-1">{review.message}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-2 text-xs">
        <Metric label="Source" value={sourceLabel} />
        <Metric label="Queries" value={String(review.queryCount)} />
        <Metric label="NOTAMs" value={String(review.notams.length)} />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {review.locations.length
          ? `${review.status === 'complete' || review.status === 'partial' ? 'Route locations checked' : 'Route locations prepared'}: ${review.locations.join(', ')}. Source attribution: ${sourceLabel}.`
          : 'Add route airports or navaids with usable identifiers for NOTAM lookup.'}
      </p>

      {visibleNotams.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={review.status === 'complete' ? 'No NOTAMs returned' : 'No live NOTAM data'}
            detail={formatEmptyNotamDetail(review)}
          />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleNotams.map((notam) => (
            <NotamRow key={notam.id} notam={notam} />
          ))}
          {review.notams.length > visibleNotams.length && (
            <p className="text-xs font-medium text-slate-500">
              +{review.notams.length - visibleNotams.length} more NOTAM{review.notams.length - visibleNotams.length === 1 ? '' : 's'}
            </p>
          )}
        </div>
      )}

      <a
        href={review.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 block rounded border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Open official NOTAM source
      </a>
    </PanelBlock>
  );
}

function NotamRow({ notam }: { notam: RouteNotam }) {
  return (
    <div className={`rounded-md border p-2 text-xs ${getNotamTone(notam.severity)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{notam.location} · {notam.category}</p>
          <p className="mt-0.5">{notam.id}</p>
        </div>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase">
          {notam.severity}
        </span>
      </div>
      {(notam.effectiveFrom || notam.effectiveTo) && (
        <p className="mt-1 font-mono">
          {[notam.effectiveFrom, notam.effectiveTo].filter(Boolean).join(' → ')}
        </p>
      )}
      <p className="mt-1">{notam.text}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide">Source: {notam.source}</p>
    </div>
  );
}

function useNowMinute(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(new Date());
    }, 60 * 1000);

    return () => window.clearInterval(id);
  }, []);

  return now;
}

function useRouteWeather(autoRefresh: boolean): RouteWeatherState {
  const { waypoints } = useMapStore();
  const stations = useMemo(() => getRouteStationIds(waypoints), [waypoints]);
  const [reports, setReports] = useState<Record<string, WeatherReport | null>>({});
  const [tafs, setTafs] = useState<Record<string, string | null>>({});
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (stations.length === 0) {
      setReports({});
      setTafs({});
      setUpdatedAt(undefined);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        stations.map(async (station) => {
          const [metarResponse, tafResponse] = await Promise.all([
            fetch(`/api/weather/metar/${station}`),
            fetch(`/api/weather/taf/${station}`),
          ]);

          if (!metarResponse.ok) {
            throw new Error(`METAR lookup failed for ${station}`);
          }

          const metarPayload = await metarResponse.json();
          const tafPayload = tafResponse.ok ? await tafResponse.json() : { taf: null };

          return {
            station,
            report: metarPayload.report as WeatherReport | null,
            taf: tafPayload.taf?.raw as string | null,
          };
        })
      );

      setReports(Object.fromEntries(results.map((result) => [result.station, result.report])));
      setTafs(Object.fromEntries(results.map((result) => [result.station, result.taf])));
      setUpdatedAt(new Date().toISOString());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Weather lookup failed');
    } finally {
      setLoading(false);
    }
  }, [stations]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(refresh, 15 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [autoRefresh, refresh]);

  return { reports, tafs, updatedAt, loading, error, refresh };
}

function getRouteStationIds(waypoints: Waypoint[]): string[] {
  return Array.from(
    new Set(
      waypoints
        .map((waypoint) => waypoint.ident)
        .filter((ident): ident is string => Boolean(ident && /^[A-Z0-9]{4}$/.test(ident)))
    )
  );
}

function newestWeatherObservedAt(reports: WeatherReport[]): string | undefined {
  const timestamps = reports
    .map((report) => report.observedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter(Number.isFinite);

  if (timestamps.length === 0) return undefined;
  return new Date(Math.max(...timestamps)).toISOString();
}

function makeWaypointFromFeature(feature: ParsedFeature): Waypoint | null {
  const raw = feature.raw as Record<string, any> | undefined;
  const coordinates =
    feature.coordinates ??
    (Array.isArray(raw?.geometry?.coordinates) ? raw?.geometry?.coordinates as Coordinates : undefined);

  if (!coordinates) return null;

  const ident = feature.icao ?? feature.identifier ?? raw?.icaoCode ?? raw?.icao_code ?? raw?.altIdentifier;
  const name = feature.name ?? raw?.name ?? ident ?? 'Map feature';
  const waypointType: WaypointType =
    feature.type === 'airport' || feature.type === 'navaid' ? feature.type : 'user';

  return {
    id: String(feature.sourceId ?? ident ?? `${coordinates[0]}-${coordinates[1]}`),
    type: waypointType,
    name: String(name),
    ident: ident ? String(ident) : undefined,
    coordinates,
    sourceId: feature.sourceId,
    elevationFt: feature.elevationUnit === 'ft' ? feature.elevation : undefined,
  };
}

function getOpenAipRecordPath(feature: ParsedFeature): string | null {
  const paths: Partial<Record<ParsedFeature['type'], string>> = {
    airport: 'airportView',
    navaid: 'navaidView',
    airspace: 'airspaceView',
    reportingPoint: 'reportingPointView',
    obstacle: 'obstacleView',
    hotspot: 'hotspotView',
    hangGliding: 'hangGlidingView',
    rcAirfield: 'rcAirfieldView',
  };

  return paths[feature.type] ?? null;
}

function formatFeatureType(type: ParsedFeature['type']): string {
  const labels: Record<ParsedFeature['type'], string> = {
    airport: 'Airport',
    navaid: 'Navaid',
    airspace: 'Airspace',
    reportingPoint: 'Reporting Point',
    obstacle: 'Obstacle',
    hotspot: 'Hotspot',
    hangGliding: 'Hang Gliding',
    rcAirfield: 'RC Airfield',
    unknown: 'Unknown',
  };

  return labels[type];
}

function formatFeatureCandidate(feature: ParsedFeature): { title: string; meta: string } {
  const title =
    feature.icao ??
    feature.identifier ??
    feature.name ??
    feature.subtype ??
    formatFeatureType(feature.type);
  const details = [
    formatFeatureType(feature.type),
    feature.airspaceType,
    feature.airspaceClass,
    feature.lowerLimit && feature.upperLimit ? `${feature.lowerLimit} - ${feature.upperLimit}` : null,
    feature.sourceLayer,
  ].filter(Boolean);

  return {
    title,
    meta: details.join(' · '),
  };
}

function formatLayerName(layer: string): string {
  const labels: Record<string, string> = {
    airports: 'Airports',
    navaids: 'Navaids',
    airspaces: 'Airspaces',
    reportingPoints: 'Reporting points',
    obstacles: 'Obstacles',
    hotspots: 'Hotspots',
    hangGlidings: 'Hang gliding',
    rcAirfields: 'RC airfields',
  };

  return labels[layer] ?? layer.replace(/([A-Z])/g, ' $1');
}

function updateStation(
  stations: WeightBalanceConfig['stations'],
  stationId: string,
  updates: Partial<WeightBalanceConfig['stations'][number]>
): WeightBalanceConfig['stations'] {
  return stations.map((station) =>
    station.id === stationId ? { ...station, ...updates } : station
  );
}

function updateEnvelopePoint(
  envelope: WeightBalanceEnvelopePoint[],
  index: number,
  updates: Partial<WeightBalanceEnvelopePoint>
): WeightBalanceEnvelopePoint[] {
  const next = envelope.length ? [...envelope] : [
    { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 },
    { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 },
  ];
  next[index] = {
    ...(next[index] ?? { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 }),
    ...updates,
  };
  return next;
}

function getAirspaceReviewTone(review: RouteAirspaceReview): string {
  if (review.alerts.some((alert) => alert.level === 'critical')) {
    return 'bg-rose-50 text-rose-800';
  }
  if (
    review.alerts.some((alert) => alert.level === 'caution') ||
    review.status === 'partial' ||
    review.status === 'rate-limited'
  ) {
    return 'bg-amber-50 text-amber-900';
  }
  if (
    review.status === 'airspace-hidden' ||
    review.status === 'map-loading' ||
    review.status === 'needs-route' ||
    review.status === 'checking' ||
    review.status === 'unavailable'
  ) {
    return 'bg-slate-50 text-slate-700';
  }
  return 'bg-emerald-50 text-emerald-800';
}

function getAirspaceAlertTone(level: RouteAirspaceAlert['level']): string {
  if (level === 'critical') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (level === 'caution') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-white text-slate-700';
}

function getAirspaceProfileTone(status: AirspaceVerticalProfile['status']): string {
  if (status === 'critical') return 'bg-rose-100 text-rose-800';
  if (status === 'review') return 'bg-amber-100 text-amber-900';
  return 'bg-emerald-100 text-emerald-800';
}

function getAirspaceProfileBandTone(level: RouteAirspaceAlert['level']): string {
  if (level === 'critical') return 'bg-rose-500';
  if (level === 'caution') return 'bg-amber-500';
  return 'bg-slate-400';
}

function getAirspaceProfileRange(
  item: Pick<AirspaceVerticalProfile['items'][number], 'startDistanceNm' | 'endDistanceNm'>,
  routeDistanceNm: number
): { leftPercent: number; widthPercent: number } {
  if (routeDistanceNm <= 0 || item.startDistanceNm === undefined || item.endDistanceNm === undefined) {
    return { leftPercent: 0, widthPercent: 100 };
  }

  const startPercent = Math.max(0, Math.min(100, (item.startDistanceNm / routeDistanceNm) * 100));
  const endPercent = Math.max(startPercent, Math.min(100, (item.endDistanceNm / routeDistanceNm) * 100));

  return {
    leftPercent: startPercent,
    widthPercent: Math.max(3, endPercent - startPercent),
  };
}

function formatProfileRangeLabel(item: Pick<AirspaceVerticalProfile['items'][number], 'startDistanceNm' | 'endDistanceNm'>): string {
  if (item.startDistanceNm === undefined || item.endDistanceNm === undefined) {
    return 'range unknown';
  }

  if (Math.abs(item.startDistanceNm - item.endDistanceNm) < 0.1) {
    return `near ${formatDistance(item.startDistanceNm)}`;
  }

  return `${formatDistance(item.startDistanceNm)}-${formatDistance(item.endDistanceNm)}`;
}

function formatNotamSource(source: RouteNotamReview['source']): string {
  if (source === 'south-africa-official') return 'SA official';
  if (source === 'faa-notam-api') return 'FAA';
  return 'Offline';
}

function formatNotamStatusLabel(status: RouteNotamReview['status']): string {
  if (status === 'manual-required') return 'Official briefing required';
  if (status === 'checking') return 'NOTAM review checking';
  if (status === 'needs-route') return 'Route required';
  if (status === 'partial') return 'Partial NOTAM review';
  return 'Live NOTAM review unavailable';
}

function formatEmptyNotamDetail(review: RouteNotamReview): string {
  if (review.status === 'complete') {
    return 'No route-location NOTAMs were returned by the configured official provider. Continue official preflight review.';
  }

  if (review.status === 'manual-required') {
    return 'Halo prepared route locations only. Use ATNS File2Fly, SACAA/AIMU briefing office, or another authorized official source for the operational PIB.';
  }

  if (review.status === 'needs-route') {
    return 'Add at least two route waypoints to prepare the NOTAM review.';
  }

  return 'Configure an authorized live NOTAM provider or use the linked official briefing source before flight.';
}

function getWeightBalanceTone(result: WeightBalanceResult): string {
  if (result.status === 'out-of-limits') return 'bg-rose-50 text-rose-800';
  if (result.status === 'caution' || result.status === 'incomplete' || result.status === 'unconfigured') {
    return 'bg-amber-50 text-amber-900';
  }
  return 'bg-emerald-50 text-emerald-800';
}

function getDigestTone(status: BriefingDigest['status']): string {
  if (status === 'stop') return 'bg-rose-50 text-rose-800';
  if (status === 'review') return 'bg-amber-50 text-amber-900';
  return 'bg-emerald-50 text-emerald-800';
}

function getDigestItemTone(level: BriefingDigest['items'][number]['level']): string {
  if (level === 'critical') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (level === 'caution') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-white text-slate-700';
}

function getFreshnessTone(status: DataFreshness['status']): string {
  if (status === 'stale') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (status === 'unknown') return 'border-slate-200 bg-slate-50 text-slate-700';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function getNotamReviewTone(review: RouteNotamReview): string {
  if (review.notams.some((notam) => notam.severity === 'critical')) {
    return 'bg-rose-50 text-rose-800';
  }
  if (
    review.notams.some((notam) => notam.severity === 'caution') ||
    review.status === 'partial' ||
    review.status === 'manual-required'
  ) {
    return 'bg-amber-50 text-amber-900';
  }
  if (review.status === 'complete') {
    return 'bg-emerald-50 text-emerald-800';
  }
  return 'bg-slate-50 text-slate-700';
}

function getNotamTone(severity: RouteNotam['severity']): string {
  if (severity === 'critical') return 'border-rose-200 bg-rose-50 text-rose-800';
  if (severity === 'caution') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-slate-200 bg-white text-slate-700';
}

function getFilingReviewTone(status: FilingWorkflowReview['status']): string {
  if (status === 'overdue') return 'bg-rose-50 text-rose-800';
  if (status === 'due-soon' || status === 'not-planned') return 'bg-amber-50 text-amber-900';
  if (status === 'closed') return 'bg-emerald-50 text-emerald-800';
  return 'bg-slate-50 text-slate-700';
}

function getFlightAdminReviewTone(status: FlightAdminReview['status']): string {
  if (status === 'stop') return 'bg-rose-50 text-rose-800';
  if (status === 'review') return 'bg-amber-50 text-amber-900';
  return 'bg-emerald-50 text-emerald-800';
}

function formatFlightAdminReviewStatus(status: FlightAdminReview['status']): string {
  if (status === 'stop') return 'Flight admin needs action';
  if (status === 'review') return 'Flight admin review';
  return 'Flight admin optional records';
}

function formatFilingStatus(status: FilingWorkflowReview['status']): string {
  const labels: Record<FilingWorkflowReview['status'], string> = {
    'not-planned': 'Close reminder not planned',
    planned: 'Close reminder planned',
    'due-soon': 'Close reminder due soon',
    overdue: 'Close reminder overdue',
    closed: 'Flight close acknowledged',
  };

  return labels[status];
}

function getEmergencyReviewTone(status: EmergencyPlanningReview['status']): string {
  if (status === 'review') return 'bg-amber-50 text-amber-900';
  if (status === 'available') return 'bg-emerald-50 text-emerald-800';
  return 'bg-slate-50 text-slate-700';
}

function formatEmergencyStatus(status: EmergencyPlanningReview['status']): string {
  if (status === 'available') return 'Emergency candidates available';
  if (status === 'review') return 'Emergency planning review required';
  return 'Route required for emergency planning';
}

function getEmergencySuitabilityTone(suitability: EmergencyLandingSuitability): string {
  if (suitability === 'good') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (suitability === 'caution') return 'border-amber-200 bg-amber-50 text-amber-900';
  if (suitability === 'unsuitable') return 'border-rose-200 bg-rose-50 text-rose-800';
  return 'border-slate-200 bg-white text-slate-700';
}

function formatAirspaceVertical(alert: RouteAirspaceAlert): string {
  return `${alert.lowerLimit ?? 'lower unknown'} to ${alert.upperLimit ?? 'upper unknown'}`;
}

function formatSignedDegrees(value: number): string {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded} deg`;
}

function toDateTimeLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    'T',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}

function SummaryGrid({
  items,
  status,
}: {
  items: Array<[string, string]>;
  status: 'ok' | 'caution' | 'critical';
}) {
  const tone =
    status === 'critical'
      ? 'border-rose-200 bg-rose-50'
      : status === 'caution'
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-slate-50';

  return (
    <div className={`grid grid-cols-2 gap-2 rounded-md border p-2 ${tone}`}>
      {items.map(([label, value]) => (
        <Metric key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="p-4">
      {title && <h3 className="mb-2 text-sm font-semibold text-slate-950">{title}</h3>}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="break-words font-medium text-slate-900">{children}</span>
    </div>
  );
}

function PanelBlock({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm shadow-slate-900/5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-slate-950">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
      {action}
    </div>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
      />
    </div>
  );
}

function DateTimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
      />
    </div>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: Array<[TValue, string]>;
  onChange: (value: TValue) => void;
}) {
  const id = label.toLowerCase().replace(/\W+/g, '-');

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as TValue)}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-950 focus:outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

function ChecklistToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />
      <span>{label}</span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-mono text-sm text-slate-950">{value}</p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function WarningLine({ text }: { text: string }) {
  return (
    <div className="inline-flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {text}
    </div>
  );
}

function CategoryBadge({ category }: { category: FlightCategory }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${getCategoryClassName(category)}`}>
      {category}
    </span>
  );
}

function RiskRow({ risk }: { risk: ReturnType<typeof buildRiskAssessment>[number] }) {
  const Icon = risk.level === 'ok' ? CheckCircle2 : AlertTriangle;
  const tone =
    risk.level === 'critical'
      ? 'bg-rose-50 text-rose-800'
      : risk.level === 'caution'
        ? 'bg-amber-50 text-amber-900'
        : 'bg-emerald-50 text-emerald-800';

  return (
    <div className={`flex items-start gap-2 rounded-md p-2 ${tone}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{risk.title}</p>
        <p className="text-xs">{risk.detail}</p>
      </div>
    </div>
  );
}

function formatWind(report: WeatherReport): string {
  if (!report.wind) return 'NIL';
  const direction = report.wind.variable || report.wind.directionDeg === null
    ? 'VRB'
    : String(report.wind.directionDeg).padStart(3, '0');
  const gust = report.wind.gustKts ? `G${report.wind.gustKts}` : '';
  return `${direction}/${report.wind.speedKts}${gust} kt`;
}

function downloadBriefing(text: string, routeName: string) {
  const safeName = (routeName || 'halo-briefing').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeName}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
