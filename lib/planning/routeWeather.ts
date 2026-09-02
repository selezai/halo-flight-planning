import type {
  RouteWeatherReview,
  RouteWindInput,
  Waypoint,
  WeatherReport,
} from '@/types/planning';

export const AVIATION_WEATHER_SOURCE_URL = 'https://aviationweather.gov/';

export interface BuildRouteWeatherReviewParams {
  waypoints: Waypoint[];
  reports?: Record<string, WeatherReport | null> | WeatherReport[];
  tafs?: Record<string, string | null>;
  wind?: RouteWindInput;
  windsAloftProviderConfigured?: boolean;
  windsAloftUpdatedAt?: string;
  now?: Date;
}

export function buildRouteWeatherReview({
  waypoints,
  reports = {},
  tafs = {},
  wind,
  windsAloftProviderConfigured = false,
  windsAloftUpdatedAt,
  now = new Date(),
}: BuildRouteWeatherReviewParams): RouteWeatherReview {
  const stations = getRouteWeatherStationIds(waypoints);
  const reportMap = Array.isArray(reports)
    ? Object.fromEntries(reports.map((report) => [report.icao.toUpperCase(), report]))
    : reports;

  if (stations.length === 0) {
    return {
      status: 'needs-route',
      message: 'Add airport waypoints to auto-collect route METAR/TAF data.',
      stations: [],
      metarCount: 0,
      tafCount: 0,
      windStatus: wind?.source === 'provider' ? 'configured' : 'manual',
      windsAloftStatus: windsAloftProviderConfigured ? 'configured' : 'provider-not-configured',
      wind,
      sourceUrl: AVIATION_WEATHER_SOURCE_URL,
      updatedAt: now.toISOString(),
    };
  }

  const stationReviews = stations.map((icao) => {
    const report = reportMap[icao] ?? null;
    const taf = tafs[icao] ?? null;
    const missing = [
      report ? undefined : 'METAR',
      taf ? undefined : 'TAF',
    ].filter(Boolean);

    return {
      icao,
      hasMetar: Boolean(report),
      hasTaf: Boolean(taf),
      message: missing.length
        ? `${missing.join(' and ')} not loaded; verify official weather before dispatch.`
        : 'METAR and TAF loaded in Halo.',
      updatedAt: report?.observedAt,
    };
  });
  const metarCount = stationReviews.filter((station) => station.hasMetar).length;
  const tafCount = stationReviews.filter((station) => station.hasTaf).length;
  const allComplete = metarCount === stations.length && tafCount === stations.length;
  const anyWeather = metarCount > 0 || tafCount > 0;
  const manualWind = !wind || wind.source === 'manual';
  const status = allComplete
    ? manualWind ? 'manual-wind' : 'current'
    : anyWeather
      ? 'partial'
      : 'unavailable';

  return {
    status,
    message: buildWeatherMessage(status, stations.length, metarCount, tafCount, windsAloftProviderConfigured),
    stations: stationReviews,
    metarCount,
    tafCount,
    windStatus: wind?.source === 'provider' ? 'configured' : 'manual',
    windsAloftStatus: windsAloftProviderConfigured ? 'configured' : 'provider-not-configured',
    wind: wind ?? {
      source: 'manual',
      directionDeg: 0,
      speedKts: 0,
      label: 'Manual route wind',
    },
    sourceUrl: AVIATION_WEATHER_SOURCE_URL,
    updatedAt: windsAloftUpdatedAt ?? now.toISOString(),
  };
}

export function getRouteWeatherStationIds(waypoints: Waypoint[]): string[] {
  return Array.from(new Set(
    waypoints
      .filter((waypoint) => waypoint.type === 'airport')
      .map((waypoint) => waypoint.ident?.trim().toUpperCase())
      .filter((ident): ident is string => Boolean(ident && /^[A-Z0-9]{4}$/.test(ident)))
  ));
}

export function formatRouteWeatherReviewLines(review?: RouteWeatherReview): string[] {
  if (!review) {
    return ['Route weather review unavailable. Load route METAR/TAF data and verify official weather before dispatch.'];
  }

  return [
    `Status: ${review.status.toUpperCase()} - ${review.message}`,
    `Weather stations: ${review.stations.length ? review.stations.map((station) => station.icao).join(', ') : 'none'}`,
    `METAR loaded: ${review.metarCount}, TAF loaded: ${review.tafCount}`,
    `Route wind: ${review.wind?.source === 'provider' ? 'provider' : 'manual'} ${Math.round(review.wind?.directionDeg ?? 0).toString().padStart(3, '0')} deg/${Math.round(review.wind?.speedKts ?? 0)} kt`,
    `Winds aloft: ${review.windsAloftStatus === 'configured' ? 'configured provider boundary' : 'provider not configured'}`,
    ...review.stations.map((station) => `${station.icao}: ${station.message}`),
  ];
}

function buildWeatherMessage(
  status: RouteWeatherReview['status'],
  stationCount: number,
  metarCount: number,
  tafCount: number,
  windsAloftProviderConfigured: boolean
): string {
  const winds = windsAloftProviderConfigured
    ? ' Winds aloft provider boundary is configured.'
    : ' Winds aloft provider is not configured; manual route wind remains the operational fallback.';

  if (status === 'current') return `METAR/TAF loaded for ${stationCount} route airport${stationCount === 1 ? '' : 's'}.${winds}`;
  if (status === 'manual-wind') return `METAR/TAF loaded for ${stationCount} route airport${stationCount === 1 ? '' : 's'} with manual route wind.${winds}`;
  if (status === 'partial') return `Partial route weather loaded: ${metarCount} METAR and ${tafCount} TAF for ${stationCount} station${stationCount === 1 ? '' : 's'}.${winds}`;
  return `No METAR/TAF data is loaded for ${stationCount} route station${stationCount === 1 ? '' : 's'}; verify official weather before dispatch.${winds}`;
}
