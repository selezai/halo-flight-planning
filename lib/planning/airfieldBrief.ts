import type { ParsedFeature } from '@/types/openaip';
import type {
  RouteAirfieldBrief,
  RouteAirfieldBriefAirport,
  RouteAirfieldBriefFrequency,
  RouteAirfieldBriefRunway,
  Waypoint,
} from '@/types/planning';

export const OPENAIP_SOURCE_URL = 'https://www.openaip.net/';
export const SACAA_AERONAUTICAL_INFORMATION_URL = 'https://www.caa.co.za/industry-information/aeronautical-information/';

export interface BuildRouteAirfieldBriefParams {
  waypoints: Waypoint[];
  features?: ParsedFeature[];
  now?: Date;
}

export function buildRouteAirfieldBrief({
  waypoints,
  features = [],
  now = new Date(),
}: BuildRouteAirfieldBriefParams): RouteAirfieldBrief {
  const airportWaypoints = getUniqueRouteAirports(waypoints);

  if (airportWaypoints.length === 0) {
    return {
      status: 'needs-route',
      message: 'Add airport waypoints to build a route airfield and frequency digest.',
      airports: [],
      source: 'official-required',
      sourceUrl: SACAA_AERONAUTICAL_INFORMATION_URL,
      updatedAt: now.toISOString(),
    };
  }

  const airports = airportWaypoints.map((waypoint) =>
    buildAirportBrief(waypoint, findFeatureForWaypoint(waypoint, features))
  );
  const airportsWithOpenAipData = airports.filter((airport) =>
    airport.frequencies.length > 0 || airport.runways.length > 0
  ).length;
  const airportsMissingData = airports.filter((airport) =>
    airport.missing.some((missing) => missing !== 'official SACAA/ATNS/AIP confirmation')
  ).length;
  const status = airportsWithOpenAipData === 0
    ? 'missing-official-data'
    : airportsMissingData > 0
      ? 'partial'
      : 'available';

  return {
    status,
    message: buildAirfieldBriefMessage(status, airports.length, airportsWithOpenAipData),
    airports,
    source: airportsWithOpenAipData > 0 ? 'openaip' : 'official-required',
    sourceUrl: airportsWithOpenAipData > 0 ? OPENAIP_SOURCE_URL : SACAA_AERONAUTICAL_INFORMATION_URL,
    updatedAt: now.toISOString(),
  };
}

export function formatRouteAirfieldBriefLines(brief?: RouteAirfieldBrief): string[] {
  if (!brief) {
    return ['Route airfield brief unavailable. Verify official AIP/briefing source before dispatch.'];
  }

  const lines = [
    `Status: ${brief.status.toUpperCase()} - ${brief.message}`,
    `Source: ${brief.source}${brief.sourceUrl ? ` (${brief.sourceUrl})` : ''}`,
  ];

  if (brief.airports.length === 0) {
    return [...lines, 'No route airport waypoints available.'];
  }

  for (const airport of brief.airports) {
    lines.push(`${airport.ident ?? 'UNIDENTIFIED'} ${airport.name}: ${airport.message}`);
    if (airport.frequencies.length > 0) {
      lines.push(`Frequencies: ${airport.frequencies.map(formatFrequency).join('; ')}`);
    }
    if (airport.runways.length > 0) {
      lines.push(`Runways: ${airport.runways.map(formatRunway).join('; ')}`);
    }
    if (airport.missing.length > 0) {
      lines.push(`Verify: ${airport.missing.join(', ')}`);
    }
  }

  return lines;
}

function buildAirportBrief(waypoint: Waypoint, feature?: ParsedFeature): RouteAirfieldBriefAirport {
  const frequencies = normalizeFrequencies(feature?.frequencies);
  const runways = normalizeRunways(feature?.runways);
  const missing = [
    frequencies.length === 0 ? 'frequency data' : undefined,
    runways.length === 0 ? 'runway data' : undefined,
    'official SACAA/ATNS/AIP confirmation',
  ].filter((item): item is string => Boolean(item));

  return {
    ident: waypoint.ident,
    name: waypoint.name,
    sourceId: waypoint.sourceId,
    coordinates: waypoint.coordinates,
    elevationFt: waypoint.elevationFt,
    frequencies,
    runways,
    missing,
    message: frequencies.length || runways.length
      ? 'OpenAIP-style data available; verify against the official AIP/briefing source.'
      : 'No frequency/runway data is available in Halo; verify official AIP/briefing source.',
  };
}

function normalizeFrequencies(raw: ParsedFeature['frequencies']): RouteAirfieldBriefFrequency[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((frequency): RouteAirfieldBriefFrequency | null => {
      if (!frequency.value?.trim()) return null;
      return {
        type: frequency.type?.trim() || 'Frequency',
        value: frequency.value.trim(),
        source: 'openaip',
      };
    })
    .filter((frequency): frequency is RouteAirfieldBriefFrequency => Boolean(frequency));
}

function normalizeRunways(raw: ParsedFeature['runways']): RouteAirfieldBriefRunway[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((runway): RouteAirfieldBriefRunway | null => {
      if (!runway.designator?.trim()) return null;
      return {
        designator: runway.designator.trim(),
        length: finiteNumber(runway.length),
        width: finiteNumber(runway.width),
        surface: runway.surface?.trim() || undefined,
        unit: runway.unit?.trim() || undefined,
      };
    })
    .filter((runway): runway is RouteAirfieldBriefRunway => Boolean(runway));
}

function findFeatureForWaypoint(waypoint: Waypoint, features: ParsedFeature[]): ParsedFeature | undefined {
  return features.find((feature) => {
    if (feature.type !== 'airport') return false;
    if (waypoint.sourceId && feature.sourceId === waypoint.sourceId) return true;
    const featureIdent = feature.icao ?? feature.identifier;
    return Boolean(waypoint.ident && featureIdent && featureIdent.toUpperCase() === waypoint.ident.toUpperCase());
  });
}

function getUniqueRouteAirports(waypoints: Waypoint[]): Waypoint[] {
  const seen = new Set<string>();
  const airports: Waypoint[] = [];

  for (const waypoint of waypoints) {
    if (waypoint.type !== 'airport') continue;
    const key = `${waypoint.sourceId ?? ''}:${waypoint.ident ?? waypoint.name}`.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    airports.push(waypoint);
  }

  return airports;
}

function buildAirfieldBriefMessage(
  status: RouteAirfieldBrief['status'],
  airportCount: number,
  airportsWithOpenAipData: number
): string {
  if (status === 'available') {
    return `OpenAIP-style airfield data is present for ${airportCount} route airport${airportCount === 1 ? '' : 's'}; still verify the official AIP/briefing source.`;
  }
  if (status === 'partial') {
    return `OpenAIP-style airfield data is present for ${airportsWithOpenAipData} of ${airportCount} route airport${airportCount === 1 ? '' : 's'}; verify missing details through official sources.`;
  }
  return `No OpenAIP-style frequency/runway data is available for ${airportCount} route airport${airportCount === 1 ? '' : 's'}; verify official AIP/briefing source.`;
}

function formatFrequency(frequency: RouteAirfieldBriefFrequency): string {
  const label = [frequency.type, frequency.name].filter(Boolean).join(' ');
  return `${label || 'Frequency'} ${frequency.value}`;
}

function formatRunway(runway: RouteAirfieldBriefRunway): string {
  const dimensions = runway.length
    ? `${Math.round(runway.length)}${runway.unit ?? ''}${runway.width ? ` x ${Math.round(runway.width)}${runway.unit ?? ''}` : ''}`
    : undefined;
  return [runway.designator, dimensions, runway.surface].filter(Boolean).join(' ');
}

function finiteNumber(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
