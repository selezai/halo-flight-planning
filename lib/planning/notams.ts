import type {
  NotamCategory,
  NotamSeverity,
  RouteNotam,
  RouteNotamReview,
  Waypoint,
} from '@/types/planning';

export const FAA_NOTAM_SOURCE = 'FAA NOTAM API';
export const FAA_NOTAM_SOURCE_URL = 'https://notams.aim.faa.gov/notamSearch/';

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
    sourceUrl: FAA_NOTAM_SOURCE_URL,
    updatedAt: new Date().toISOString(),
    ...review,
  };
}

export function normalizeFaaNotamPayload(
  payload: unknown,
  requestedLocation: string
): RouteNotam[] {
  return extractNotamRecords(payload)
    .map((record, index) => normalizeFaaNotamRecord(record, requestedLocation, index))
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

  const directKeys = ['items', 'notams', 'NOTAMs', 'notamList', 'NotamList', 'data', 'results'];
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

function normalizeFaaNotamRecord(
  record: Record<string, unknown>,
  requestedLocation: string,
  index: number
): RouteNotam | null {
  const text = stringValue(
    record.rawText,
    record.raw_text,
    record.rawNotam,
    record.notamText,
    record.text,
    record.message,
    record.description,
    record.body,
    record.all
  );

  if (!text) return null;

  const location = (stringValue(
    record.icaoLocation,
    record.location,
    record.facilityDesignator,
    record.accountId,
    record.aerodrome
  ) ?? requestedLocation).toUpperCase();
  const id = stringValue(
    record.notamNumber,
    record.number,
    record.id,
    record.notamId,
    record.notam_id
  ) ?? `${location}-${index + 1}`;
  const { category, severity } = categorizeNotam(text);

  return {
    id: `${location}-${id}`,
    location,
    type: stringValue(record.type, record.notamType, record.notam_type),
    category,
    severity,
    text,
    effectiveFrom: stringValue(record.effectiveStart, record.effective_start, record.startDate, record.start),
    effectiveTo: stringValue(record.effectiveEnd, record.effective_end, record.endDate, record.end),
    source: FAA_NOTAM_SOURCE,
    sourceUrl: FAA_NOTAM_SOURCE_URL,
    appliesToRoute: location === requestedLocation,
  };
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
