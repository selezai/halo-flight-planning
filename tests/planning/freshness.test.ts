import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import { buildBriefingDigest, buildBriefingText } from '@/lib/planning/briefing';
import { assessDataFreshness, worstFreshnessStatus } from '@/lib/planning/freshness';
import { calculateRoute } from '@/lib/planning/navigation';

describe('data freshness', () => {
  const now = new Date('2026-07-20T10:00:00Z');

  it('classifies current, stale, and unknown data by threshold', () => {
    expect(assessDataFreshness({
      source: 'Weather',
      updatedAt: '2026-07-20T09:30:00Z',
      maxAgeMinutes: 60,
      now,
    })).toMatchObject({
      status: 'current',
      ageMinutes: 30,
    });

    expect(assessDataFreshness({
      source: 'NOTAM',
      updatedAt: '2026-07-20T08:00:00Z',
      maxAgeMinutes: 30,
      now,
    })).toMatchObject({
      status: 'stale',
      ageMinutes: 120,
    });

    expect(assessDataFreshness({
      source: 'Airspace',
      maxAgeMinutes: 30,
      now,
    })).toMatchObject({
      status: 'unknown',
      label: 'Airspace: unknown age',
    });
  });

  it('promotes unknown freshness as worst status', () => {
    expect(worstFreshnessStatus([
      assessDataFreshness({ source: 'Route', updatedAt: '2026-07-20T09:59:00Z', maxAgeMinutes: 5, now }),
      assessDataFreshness({ source: 'Weather', updatedAt: '2026-07-20T08:00:00Z', maxAgeMinutes: 60, now }),
    ])).toBe('stale');

    expect(worstFreshnessStatus([
      assessDataFreshness({ source: 'Route', updatedAt: '2026-07-20T09:59:00Z', maxAgeMinutes: 5, now }),
      assessDataFreshness({ source: 'NOTAM', maxAgeMinutes: 30, now }),
    ])).toBe('unknown');
  });

  it('adds stale freshness to digest and exported briefing text', () => {
    const route = calculateRoute([], DEFAULT_AIRCRAFT);
    const staleWeather = assessDataFreshness({
      source: 'Weather',
      updatedAt: '2026-07-20T08:00:00Z',
      maxAgeMinutes: 60,
      now,
    });
    const digest = buildBriefingDigest({
      routeName: 'Freshness test',
      route,
      risks: [],
      weather: [],
      dataFreshness: [staleWeather],
    });
    const text = buildBriefingText({
      routeName: 'Freshness test',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [],
      weather: [],
      risks: [],
      dataFreshness: [staleWeather],
    });

    expect(digest.status).toBe('review');
    expect(digest.items.some((item) => item.source === 'Freshness')).toBe(true);
    expect(text).toContain('DATA FRESHNESS');
    expect(text).toContain('STALE: Weather: stale');
  });
});
