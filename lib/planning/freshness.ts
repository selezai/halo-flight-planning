import type { DataFreshness, DataFreshnessStatus } from '@/types/planning';

export const FRESHNESS_THRESHOLDS_MINUTES = {
  weather: 60,
  notam: 30,
  airspace: 30,
  route: 5,
  weightBalance: 60,
  map: 60,
} as const;

export function assessDataFreshness(params: {
  source: string;
  updatedAt?: string;
  maxAgeMinutes: number;
  now?: Date;
}): DataFreshness {
  const now = params.now ?? new Date();
  if (!params.updatedAt) {
    return {
      source: params.source,
      status: 'unknown',
      label: `${params.source}: unknown age`,
    };
  }

  const updatedAtMs = Date.parse(params.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return {
      source: params.source,
      status: 'unknown',
      label: `${params.source}: invalid timestamp`,
      updatedAt: params.updatedAt,
    };
  }

  const ageMinutes = Math.max(0, Math.round((now.getTime() - updatedAtMs) / 60000));
  const status: DataFreshnessStatus = ageMinutes <= params.maxAgeMinutes ? 'current' : 'stale';

  return {
    source: params.source,
    status,
    label: `${params.source}: ${status === 'current' ? 'current' : 'stale'} (${formatAge(ageMinutes)})`,
    updatedAt: params.updatedAt,
    ageMinutes,
  };
}

export function worstFreshnessStatus(freshness: DataFreshness[]): DataFreshnessStatus {
  if (freshness.some((item) => item.status === 'unknown')) return 'unknown';
  if (freshness.some((item) => item.status === 'stale')) return 'stale';
  return 'current';
}

export function formatFreshnessStatus(status: DataFreshnessStatus): string {
  if (status === 'current') return 'Current';
  if (status === 'stale') return 'Stale';
  return 'Unknown';
}

function formatAge(ageMinutes: number): string {
  if (ageMinutes < 60) return `${ageMinutes}m`;
  const hours = Math.floor(ageMinutes / 60);
  const minutes = ageMinutes % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}
