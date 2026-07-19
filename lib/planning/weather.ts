import type { FlightCategory, PersonalMinimums, WeatherReport } from '@/types/planning';

const CEILING_COVERS = new Set(['BKN', 'OVC', 'VV']);

export function categorizeFlightConditions(
  ceilingFt?: number,
  visibilitySm?: number
): FlightCategory {
  if (ceilingFt === undefined && visibilitySm === undefined) return 'UNKNOWN';

  if ((ceilingFt !== undefined && ceilingFt < 500) || (visibilitySm !== undefined && visibilitySm < 1)) {
    return 'LIFR';
  }

  if ((ceilingFt !== undefined && ceilingFt < 1000) || (visibilitySm !== undefined && visibilitySm < 3)) {
    return 'IFR';
  }

  if ((ceilingFt !== undefined && ceilingFt <= 3000) || (visibilitySm !== undefined && visibilitySm <= 5)) {
    return 'MVFR';
  }

  return 'VFR';
}

export function isBelowPersonalMinimums(
  report: WeatherReport,
  minimums: PersonalMinimums
): boolean {
  if (report.flightCategory === 'IFR' || report.flightCategory === 'LIFR') return true;
  if (report.ceilingFt !== undefined && report.ceilingFt < minimums.minimumCeilingFt) return true;
  if (report.visibilitySm !== undefined && report.visibilitySm < minimums.minimumVisibilitySm) return true;
  if (report.wind?.speedKts !== undefined && report.wind.speedKts > minimums.maxSurfaceWindKts) return true;
  return false;
}

export function normalizeMetarPayload(payload: unknown, requestedIcao: string): WeatherReport | null {
  const rows = Array.isArray(payload) ? payload : [];
  const first = rows[0] as Record<string, unknown> | undefined;
  if (!first) return null;

  const raw = pickString(first, ['rawOb', 'raw_text', 'raw_text']) ?? '';
  const icao = pickString(first, ['icaoId', 'station_id', 'id']) ?? requestedIcao.toUpperCase();
  const clouds = normalizeClouds(first.clouds);
  const ceilingFt = getCeilingFt(clouds) ?? pickNumber(first, ['ceil']);
  const visibilitySm = normalizeVisibility(pickString(first, ['visib', 'visibility']) ?? first.visib);
  const parsed = parseRawMetar(raw);
  const mergedWind = parsed.wind ?? normalizeWind(first);
  const flightCategory =
    pickString(first, ['fltCat', 'flight_category']) as FlightCategory | undefined;

  return {
    icao: icao.toUpperCase(),
    raw,
    observedAt: pickString(first, ['obsTime', 'observation_time']),
    wind: mergedWind,
    visibilitySm: visibilitySm ?? parsed.visibilitySm,
    ceilingFt: ceilingFt ?? parsed.ceilingFt,
    clouds: clouds.length ? clouds : parsed.clouds,
    temperatureC: pickNumber(first, ['temp']) ?? parsed.temperatureC,
    dewpointC: pickNumber(first, ['dewp']) ?? parsed.dewpointC,
    altimeterHpa: normalizeAltimeter(first.altim) ?? parsed.altimeterHpa,
    flightCategory:
      flightCategory && isFlightCategory(flightCategory)
        ? flightCategory
        : categorizeFlightConditions(ceilingFt ?? parsed.ceilingFt, visibilitySm ?? parsed.visibilitySm),
  };
}

export function parseRawMetar(raw: string): WeatherReport {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const icao = /^[A-Z]{4}$/.test(tokens[0]) ? tokens[0] : 'UNKNOWN';
  const windToken = tokens.find((token) => /^(VRB|\d{3})\d{2,3}(G\d{2,3})?KT$/.test(token));
  const visibilityToken = tokens.find((token) => /^P?\d+SM$|^\d{4}$/.test(token));
  const cloudTokens = tokens.filter((token) => /^(SKC|CLR|FEW|SCT|BKN|OVC|VV)\d{0,3}/.test(token));
  const clouds = cloudTokens.map((token) => ({
    cover: token.slice(0, 3),
    baseFt: /^\D{3}\d{3}/.test(token) ? Number(token.slice(3, 6)) * 100 : undefined,
  }));
  const temperatureToken = tokens.find((token) => /^M?\d{2}\/M?\d{2}$/.test(token));
  const [temperatureC, dewpointC] = temperatureToken
    ? temperatureToken.split('/').map(parseSignedTemperature)
    : [undefined, undefined];
  const qnhToken = tokens.find((token) => /^Q\d{4}$/.test(token));
  const ceilingFt = getCeilingFt(clouds);
  const visibilitySm = normalizeVisibility(visibilityToken);

  return {
    icao,
    raw,
    wind: windToken ? parseWind(windToken) : undefined,
    visibilitySm,
    ceilingFt,
    clouds,
    temperatureC,
    dewpointC,
    altimeterHpa: qnhToken ? Number(qnhToken.slice(1)) : undefined,
    flightCategory: categorizeFlightConditions(ceilingFt, visibilitySm),
  };
}

export function getCategoryClassName(category: FlightCategory): string {
  const classes: Record<FlightCategory, string> = {
    VFR: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    MVFR: 'bg-sky-50 text-sky-700 ring-sky-200',
    IFR: 'bg-rose-50 text-rose-700 ring-rose-200',
    LIFR: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    UNKNOWN: 'bg-slate-50 text-slate-600 ring-slate-200',
  };

  return classes[category];
}

function normalizeClouds(value: unknown): WeatherReport['clouds'] {
  if (!Array.isArray(value)) return [];

  return value.map((cloud) => {
    const row = cloud as Record<string, unknown>;
    return {
      cover: String(row.cover ?? row.type ?? 'UNK'),
      baseFt: pickNumber(row, ['base', 'baseFt']),
    };
  });
}

function getCeilingFt(clouds: WeatherReport['clouds']): number | undefined {
  const ceilings = clouds
    .filter((cloud) => CEILING_COVERS.has(cloud.cover))
    .map((cloud) => cloud.baseFt)
    .filter((base): base is number => Number.isFinite(base));

  return ceilings.length ? Math.min(...ceilings) : undefined;
}

function normalizeWind(row: Record<string, unknown>) {
  const speedKts = pickNumber(row, ['wspd', 'wind_speed_kt']);
  if (speedKts === undefined) return undefined;

  const direction = pickNumber(row, ['wdir', 'wind_dir_degrees']);

  return {
    directionDeg: direction ?? null,
    speedKts,
    gustKts: pickNumber(row, ['wgst', 'wind_gust_kt']),
    variable: direction === undefined,
  };
}

function parseWind(token: string) {
  const match = token.match(/^(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT$/);
  if (!match) return undefined;

  return {
    directionDeg: match[1] === 'VRB' ? null : Number(match[1]),
    speedKts: Number(match[2]),
    gustKts: match[3] ? Number(match[3]) : undefined,
    variable: match[1] === 'VRB',
  };
}

function normalizeVisibility(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim().toUpperCase();
  if (!text) return undefined;
  if (text === '9999') return 6.2;
  if (text.endsWith('SM')) {
    const clean = text.replace(/^P/, '').replace('SM', '');
    return Number(clean);
  }
  const numeric = Number(text);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric > 100 ? Number((numeric / 1609.344).toFixed(1)) : numeric;
}

function normalizeAltimeter(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return numeric > 100 ? numeric : Number((numeric * 33.8639).toFixed(0));
}

function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value;
  }

  return undefined;
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value;
  }

  return undefined;
}

function parseSignedTemperature(value: string): number {
  return value.startsWith('M') ? -Number(value.slice(1)) : Number(value);
}

function isFlightCategory(category: string): category is FlightCategory {
  return ['VFR', 'MVFR', 'IFR', 'LIFR', 'UNKNOWN'].includes(category);
}
