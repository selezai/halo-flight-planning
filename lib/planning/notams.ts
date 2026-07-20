import type {
  NotamCategory,
  NotamSeverity,
  RouteNotam,
  RouteNotamReview,
  Waypoint,
} from '@/types/planning';

export const FAA_NOTAM_SOURCE = 'FAA NOTAM API';
export const FAA_NOTAM_SOURCE_URL = 'https://notams.aim.faa.gov/notamSearch/';
export const SOUTH_AFRICA_NOTAM_MANUAL_SOURCE = 'South Africa official NOTAM briefing';
export const SOUTH_AFRICA_NOTAM_LIVE_SOURCE = 'South Africa official NOTAM feed';
export const SOUTH_AFRICA_ATNS_FILE2FLY_URL = 'https://file2fly.atns.co.za/aes/login.jsp';
export const SOUTH_AFRICA_SACAA_NOTAM_SUMMARY_URL =
  'https://www.caa.co.za/industry-information/aeronautical-information-notam-summaries/';

export type NotamProvider = 'south-africa-manual' | 'south-africa-live' | 'faa';

const NOTAM_LOCATION_RE = /^[A-Z0-9]{2,5}$/;
const DEFAULT_MAX_LOCATIONS = 12;

export function buildRouteNotamLocations(
  waypoints: Pick<Waypoint, 'ident' | 'type'>[],
  maxLocations = DEFAULT_MAX_LOCATIONS
): string[] {
  const locations: string[] = [];
  const seen = new Set<string>();

  for (const waypoint of waypoints) {
    const ident = waypoint.ident?.trim().toUpperCase();
    if (!ident || !NOTAM_LOCATION_RE.test(ident) || seen.has(ident)) continue;
    if (waypoint.type !== 'airport' && waypoint.type !== 'navaid') continue;

    seen.add(ident);
    locations.push(ident);
    if (locations.length >= maxLocations) break;
  }

  return locations;
}

export function createNotamReview(
  review: Pick<RouteNotamReview, 'source' | 'status' | 'message'> & Partial<RouteNotamReview>
): RouteNotamReview {
  return {
    notams: [],
    locations: [],
    queryCount: 0,
    sourceUrl: review.sourceUrl ?? defaultNotamSourceUrl(review.source),
    updatedAt: new Date().toISOString(),
    ...review,
  };
}

export function getConfiguredNotamProvider(value = process.env.NOTAM_PROVIDER): NotamProvider {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'faa') return 'faa';
  if (normalized === 'south-africa-live') return 'south-africa-live';
  return 'south-africa-manual';
}

export function normalizeFaaNotamPayload(
  payload: unknown,
  requestedLocation: string
): RouteNotam[] {
  return extractNotamRecords(payload)
    .map((record, index) => normalizeNotamRecord({
      record,
      requestedLocations: [requestedLocation],
      index,
      source: FAA_NOTAM_SOURCE,
      sourceUrl: FAA_NOTAM_SOURCE_URL,
      fallbackLocation: requestedLocation,
    }))
    .filter((notam): notam is RouteNotam => Boolean(notam));
}

export function normalizeSouthAfricaNotamPayload(
  payload: unknown,
  requestedLocations: string[],
  sourceUrl = SOUTH_AFRICA_ATNS_FILE2FLY_URL
): RouteNotam[] {
  const normalizedLocations = requestedLocations
    .map((location) => location.trim().toUpperCase())
    .filter((location) => NOTAM_LOCATION_RE.test(location));

  return extractNotamRecords(payload)
    .map((record, index) => normalizeNotamRecord({
      record,
      requestedLocations: normalizedLocations,
      index,
      source: SOUTH_AFRICA_NOTAM_LIVE_SOURCE,
      sourceUrl,
      fallbackLocation: normalizedLocations[0],
    }))
    .filter((notam): notam is RouteNotam => Boolean(notam));
}

export function categorizeNotam(text: string): { category: NotamCategory; severity: NotamSeverity } {
  const normalized = text.toUpperCase();

  if (/\bRWY\b|\bRUNWAY\b/.test(normalized)) {
    return {
      category: 'runway',
      severity: /\b(CLSD|CLOSED|U\/S|UNSERVICEABLE)\b/.test(normalized) ? 'critical' : 'caution',
    };
  }

  if (/\b(ILS|RNAV|VOR\/DME|LOC|GLIDE\s*SLOPE|APPROACH|APCH)\b/.test(normalized)) {
    return {
      category: 'approach',
      severity: /\b(U\/S|UNSERVICEABLE|CLSD|CLOSED)\b/.test(normalized) ? 'critical' : 'caution',
    };
  }

  if (/\b(VOR|DME|NDB|TACAN|NAVAID)\b/.test(normalized)) {
    return {
      category: 'navaid',
      severity: /\b(U\/S|UNSERVICEABLE|OUT OF SERVICE)\b/.test(normalized) ? 'critical' : 'caution',
    };
  }

  if (/\b(TFR|RESTRICTED|PROHIBITED|DANGER|AIRSPACE|MILITARY|MOA)\b/.test(normalized)) {
    return { category: 'airspace', severity: 'critical' };
  }

  if (/\bTWY\b|\bTAXIWAY\b/.test(normalized)) {
    return { category: 'taxiway', severity: 'caution' };
  }

  if (/\b(LGT|LIGHT|LIGHTING|PAPI|VASI|ALS)\b/.test(normalized)) {
    return { category: 'lighting', severity: 'caution' };
  }

  if (/\b(OBST|OBSTRUCTION|CRANE|TOWER)\b/.test(normalized)) {
    return { category: 'obstacle', severity: 'caution' };
  }

  if (/\b(FUEL|ARFF|SERVICE|CUSTOMS|ATC|TWR|TOWER)\b/.test(normalized)) {
    return { category: 'services', severity: 'caution' };
  }

  if (/\b(BIRD|WILDLIFE)\b/.test(normalized)) {
    return { category: 'wildlife', severity: 'caution' };
  }

  return { category: 'other', severity: 'info' };
}

export function sortRouteNotams(notams: RouteNotam[]): RouteNotam[] {
  const severityRank: Record<NotamSeverity, number> = {
    critical: 0,
    caution: 1,
    info: 2,
  };
  const categoryRank: Record<NotamCategory, number> = {
    runway: 0,
    approach: 1,
    airspace: 2,
    navaid: 3,
    taxiway: 4,
    lighting: 5,
    obstacle: 6,
    services: 7,
    wildlife: 8,
    other: 9,
  };

  return [...notams].sort((a, b) => {
    return (
      severityRank[a.severity] - severityRank[b.severity] ||
      categoryRank[a.category] - categoryRank[b.category] ||
      a.location.localeCompare(b.location) ||
      a.id.localeCompare(b.id)
    );
  });
}

function extractNotamRecords(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) return [];

  const directKeys = [
    'items',
    'notams',
    'NOTAMs',
    'notamList',
    'NotamList',
    'records',
    'data',
    'results',
    'briefing',
    'pib',
  ];
  for (const key of directKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  const nestedKeys = ['response', 'notamResponse'];
  for (const key of nestedKeys) {
    const value = payload[key];
    const nested = extractNotamRecords(value);
    if (nested.length > 0) return nested;
  }

  return [];
}

function normalizeNotamRecord(params: {
  record: Record<string, unknown>;
  requestedLocations: string[];
  index: number;
  source: string;
  sourceUrl: string;
  fallbackLocation?: string;
}): RouteNotam | null {
  const { record, requestedLocations, index, source, sourceUrl, fallbackLocation } = params;
  const text = stringValue(
    record.rawText,
    record.raw_text,
    record.rawNotam,
    record.notamText,
    record.notam_text,
    record.text,
    record.message,
    record.description,
    record.body,
    record.subject,
    record.all
  );

  if (!text) return null;

  const requestedSet = new Set(requestedLocations);
  const location = (stringValue(
    record.icaoLocation,
    record.icao_location,
    record.location,
    record.facilityDesignator,
    record.facility_designator,
    record.accountId,
    record.account_id,
    record.aerodrome,
    record.ad,
    record.fir
  ) ?? inferLocationFromText(text, requestedSet) ?? fallbackLocation ?? 'ZZZZ').toUpperCase();
  const id = stringValue(
    record.notamNumber,
    record.notam_number,
    record.seriesNumber,
    record.series_number,
    record.number,
    record.id,
    record.notamId,
    record.notam_id
  ) ?? `${location}-${index + 1}`;
  const { category, severity } = categorizeNotam(text);
  const appliesToRoute = requestedSet.size === 0
    ? true
    : requestedSet.has(location) || Array.from(requestedSet).some((requestedLocation) =>
        text.toUpperCase().includes(requestedLocation)
      );

  return {
    id: `${location}-${id}`,
    location,
    type: stringValue(record.type, record.notamType, record.notam_type),
    category,
    severity,
    text,
    effectiveFrom: stringValue(
      record.effectiveStart,
      record.effective_start,
      record.validFrom,
      record.valid_from,
      record.startDate,
      record.start
    ),
    effectiveTo: stringValue(
      record.effectiveEnd,
      record.effective_end,
      record.validTo,
      record.valid_to,
      record.endDate,
      record.end
    ),
    source,
    sourceUrl,
    appliesToRoute,
  };
}

function defaultNotamSourceUrl(source: RouteNotamReview['source']): string {
  if (source === 'south-africa-official') return SOUTH_AFRICA_ATNS_FILE2FLY_URL;
  if (source === 'faa-notam-api') return FAA_NOTAM_SOURCE_URL;
  return SOUTH_AFRICA_ATNS_FILE2FLY_URL;
}

function inferLocationFromText(text: string, requestedLocations: Set<string>): string | undefined {
  const normalized = text.toUpperCase();
  return Array.from(requestedLocations).find((location) => normalized.includes(location));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return undefined;
}
