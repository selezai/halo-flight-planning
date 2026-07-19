import type { Coordinates, Waypoint } from '@/types/planning';
import { mergeWaypointResults } from '@/lib/planning/waypointResults';

export interface OpenAipWaypointSearchResponse {
  source: 'openaip-core';
  query: string;
  waypoints: Waypoint[];
  warning?: string;
}

export function normalizeOpenAipWaypointSearchResults(params: {
  airports: Record<string, unknown>[];
  navaids: Record<string, unknown>[];
  limit: number;
}): Waypoint[] {
  const results = [
    ...params.airports.map(normalizeAirportWaypoint),
    ...params.navaids.map(normalizeNavaidWaypoint),
  ].filter((waypoint): waypoint is Waypoint => Boolean(waypoint));

  return mergeWaypointResults(results).slice(0, params.limit);
}

function normalizeAirportWaypoint(record: Record<string, unknown>): Waypoint | null {
  const coordinates = coordinatesFromGeometry(record.geometry);
  const sourceId = stringValue(record._id);
  const ident = stringValue(record.icaoCode, record.icao_code, record.altIdentifier, record.alt_identifier);
  const name = stringValue(record.name) ?? ident;

  if (!coordinates || !name) return null;

  return {
    id: `openaip-airport-${sourceId ?? ident ?? coordinates.join(',')}`,
    type: 'airport',
    ident,
    name,
    coordinates,
    elevationFt: elevationFeet(record.elevation),
    sourceId,
    notes: 'OpenAIP Core airport search result',
  };
}

function normalizeNavaidWaypoint(record: Record<string, unknown>): Waypoint | null {
  const coordinates = coordinatesFromGeometry(record.geometry);
  const sourceId = stringValue(record._id);
  const ident = stringValue(record.identifier);
  const name = stringValue(record.name) ?? ident;

  if (!coordinates || !name) return null;

  return {
    id: `openaip-navaid-${sourceId ?? ident ?? coordinates.join(',')}`,
    type: 'navaid',
    ident,
    name,
    coordinates,
    elevationFt: elevationFeet(record.elevation),
    sourceId,
    notes: 'OpenAIP Core navaid search result',
  };
}

function coordinatesFromGeometry(raw: unknown): Coordinates | null {
  if (!raw || typeof raw !== 'object') return null;
  const coordinates = (raw as Record<string, unknown>).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;

  return [longitude, latitude];
}

function elevationFeet(raw: unknown): number | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  const value = numberValue(record.value);
  if (value === undefined) return undefined;

  const unit = numberValue(record.unit);
  if (unit === 1 || unit === 6) return Math.round(value);
  if (unit === 0) return Math.round(value * 3.28084);

  return undefined;
}

function stringValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
