'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  CloudSun,
  Download,
  Eye,
  EyeOff,
  Gauge,
  Info,
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
import { buildBriefingText, buildRiskAssessment } from '@/lib/planning/briefing';
import { mergeWaypointResults } from '@/lib/planning/waypointResults';
import { COMPETITOR_PAIN_POINTS } from '@/lib/research/competitorPainPoints';
import { getCategoryClassName, isBelowPersonalMinimums } from '@/lib/planning/weather';
import type { OpenAipWaypointSearchResponse } from '@/lib/openaip/waypointSearch';
import type { ParsedFeature } from '@/types/openaip';
import type {
  Coordinates,
  FlightCategory,
  RouteAirspaceAlert,
  RouteAirspaceReview,
  RouteNotam,
  RouteNotamReview,
  WeatherReport,
  Waypoint,
  WaypointType,
} from '@/types/planning';

type Panel = 'route' | 'weather' | 'aircraft' | 'briefing' | 'research';

interface RouteWeatherState {
  reports: Record<string, WeatherReport | null>;
  tafs: Record<string, string | null>;
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

const PANEL_META: Array<{ id: Panel; label: string; icon: typeof Plane }> = [
  { id: 'route', label: 'Route', icon: Navigation },
  { id: 'weather', label: 'Weather', icon: CloudSun },
  { id: 'aircraft', label: 'Aircraft', icon: Plane },
  { id: 'briefing', label: 'Briefing', icon: ClipboardCheck },
  { id: 'research', label: 'Research', icon: Info },
];

export default function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarPanel,
    setSidebarPanel,
    selectedFeature,
    clearSelection,
  } = useMapStore();

  if (!sidebarOpen) {
    return (
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="absolute left-4 top-4 z-10 rounded-md border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50"
        aria-label="Open sidebar"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    );
  }

  return (
    <aside className="z-10 flex h-full w-full max-w-[25rem] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm sm:w-[25rem]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h1 className="text-base font-semibold text-slate-950">Halo</h1>
          <p className="text-xs text-slate-500">Flight planning workspace</p>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded p-1 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {!selectedFeature && (
        <nav className="grid grid-cols-5 border-b border-slate-200">
          {PANEL_META.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSidebarPanel(id)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium ${
                sidebarPanel === id
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
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
            {sidebarPanel === 'research' && <ResearchPanel />}
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

      <AirspaceReviewPanel review={routeAirspaceReview} cruiseAltitudeFt={cruiseAltitudeFt} />

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
  cruiseAltitudeFt,
}: {
  review: RouteAirspaceReview;
  cruiseAltitudeFt: number;
}) {
  const reviewableAlerts = review.alerts.filter((alert) => alert.requiresReview);
  const criticalCount = review.alerts.filter((alert) => alert.level === 'critical').length;
  const visibleAlerts = review.alerts.slice(0, 6);
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

      <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-2 text-xs">
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
    personalMinimums,
    updatePersonalMinimums,
  } = useMapStore();

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
    personalMinimums,
    routeAirspaceReview,
    routeNotamReview,
  } = useMapStore();
  const weather = useRouteWeather(false);
  const route = useMemo(() => calculateRoute(waypoints, activeAircraft), [waypoints, activeAircraft]);
  const reports = useMemo(
    () => Object.values(weather.reports).filter((report): report is WeatherReport => Boolean(report)),
    [weather.reports]
  );
  const risks = useMemo(
    () => buildRiskAssessment(route, reports, personalMinimums, routeAirspaceReview.alerts, routeNotamReview),
    [route, reports, personalMinimums, routeAirspaceReview.alerts, routeNotamReview]
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
      routeNotamReview,
      departureTime,
      cruiseAltitudeFt,
      notes: routeNotes,
    }),
    [routeName, activeAircraft, route, waypoints, reports, risks, routeAirspaceReview.alerts, routeNotamReview, departureTime, cruiseAltitudeFt, routeNotes]
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

      <AirspaceReviewPanel review={routeAirspaceReview} cruiseAltitudeFt={cruiseAltitudeFt} />

      <NotamReviewPanel review={routeNotamReview} />

      <PanelBlock title="Risk review" icon={<AlertTriangle className="h-4 w-4" />}>
        <div className="space-y-2">
          {risks.map((risk) => (
            <RiskRow key={risk.id} risk={risk} />
          ))}
        </div>
      </PanelBlock>

      <PanelBlock title="Briefing package" icon={<Printer className="h-4 w-4" />}>
        <div className="grid grid-cols-3 gap-2">
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

function NotamReviewPanel({ review }: { review: RouteNotamReview }) {
  const criticalCount = review.notams.filter((notam) => notam.severity === 'critical').length;
  const cautionCount = review.notams.filter((notam) => notam.severity === 'caution').length;
  const visibleNotams = review.notams.slice(0, 6);
  const StatusIcon = criticalCount > 0 || cautionCount > 0 || review.status !== 'complete'
    ? AlertTriangle
    : CheckCircle2;

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
                    ? 'FAA NOTAM route scan'
                    : 'Live NOTAM review unavailable'}
            </p>
            <p className="mt-1">{review.message}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-2 text-xs">
        <Metric label="Source" value={review.source === 'faa-notam-api' ? 'FAA' : 'Offline'} />
        <Metric label="Queries" value={String(review.queryCount)} />
        <Metric label="NOTAMs" value={String(review.notams.length)} />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {review.locations.length
          ? `${review.status === 'complete' || review.status === 'partial' ? 'Route locations checked' : 'Route locations prepared'}: ${review.locations.join(', ')}. Source attribution: FAA NOTAM API.`
          : 'Add route airports or navaids with usable identifiers for live NOTAM lookup.'}
      </p>

      {visibleNotams.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title={review.status === 'complete' ? 'No NOTAMs returned' : 'No live NOTAM data'}
            detail={review.status === 'complete'
              ? 'No route-location NOTAMs were returned by the configured FAA provider. Continue official preflight review.'
              : 'Configure FAA NOTAM API credentials to enable live route NOTAM review.'}
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
        Open official NOTAM search
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

function ResearchPanel() {
  return (
    <div className="space-y-4">
      <PanelHeader title="Pain points solved in Halo" />
      {COMPETITOR_PAIN_POINTS.map((item) => (
        <div key={`${item.competitor}-${item.painPoint}`} className="rounded-md border border-slate-200 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">{item.competitor}</p>
              <p className="mt-1 text-sm text-slate-700">{item.painPoint}</p>
            </div>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Source
            </a>
          </div>
          <p className="mt-2 text-xs text-slate-500">{item.evidence}</p>
          <p className="mt-3 rounded bg-emerald-50 p-2 text-xs font-medium text-emerald-800">
            {item.haloResponse}
          </p>
        </div>
      ))}
    </div>
  );
}

function useRouteWeather(autoRefresh: boolean): RouteWeatherState {
  const { waypoints } = useMapStore();
  const stations = useMemo(() => getRouteStationIds(waypoints), [waypoints]);
  const [reports, setReports] = useState<Record<string, WeatherReport | null>>({});
  const [tafs, setTafs] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (stations.length === 0) {
      setReports({});
      setTafs({});
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

  return { reports, tafs, loading, error, refresh };
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

function getNotamReviewTone(review: RouteNotamReview): string {
  if (review.notams.some((notam) => notam.severity === 'critical')) {
    return 'bg-rose-50 text-rose-800';
  }
  if (review.notams.some((notam) => notam.severity === 'caution') || review.status === 'partial') {
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

function formatAirspaceVertical(alert: RouteAirspaceAlert): string {
  return `${alert.lowerLimit ?? 'lower unknown'} to ${alert.upperLimit ?? 'upper unknown'}`;
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
    <section className="rounded-md border border-slate-200 p-3">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-950">
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
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
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
