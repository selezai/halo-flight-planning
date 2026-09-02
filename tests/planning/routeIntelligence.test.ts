import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import {
  buildRouteIntelligenceReview,
  parseRouteIntelligenceTokens,
} from '@/lib/planning/routeIntelligence';
import type { Waypoint } from '@/types/planning';

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo',
  coordinates: [28.246, -26.1337],
};

const fala: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria',
  coordinates: [27.9261, -25.9385],
};

const fawb: Waypoint = {
  id: 'fawb',
  type: 'airport',
  ident: 'FAWB',
  name: 'Wonderboom',
  coordinates: [28.2242, -25.6539],
};

describe('route intelligence', () => {
  it('classifies typed route coordinates, waypoints, airways, procedures, direct tokens, and altitude hints', () => {
    const tokens = parseRouteIntelligenceTokens('FAOR DCT S25.9385 E027.9261 V12 RNAV03 FL065 FALA');

    expect(tokens.map((token) => token.kind)).toEqual([
      'waypoint',
      'direct',
      'coordinate',
      'airway',
      'procedure',
      'altitude',
      'waypoint',
    ]);
    expect(tokens.find((token) => token.kind === 'coordinate')?.coordinates).toEqual([27.9261, -25.9385]);
    expect(tokens.find((token) => token.kind === 'airway')?.requiresProvider).toBe(true);
    expect(tokens.find((token) => token.kind === 'procedure')?.requiresProvider).toBe(true);
    expect(tokens.find((token) => token.kind === 'altitude')?.altitudeFt).toBe(6500);
  });

  it('always returns direct and current route candidates for local route comparison', () => {
    const review = buildRouteIntelligenceReview({
      waypoints: [faor, fawb, fala],
      aircraft: DEFAULT_AIRCRAFT,
      now: new Date('2026-09-01T08:00:00Z'),
    });

    expect(review.status).toBe('ready');
    expect(review.candidates.map((candidate) => candidate.id)).toEqual([
      'direct-route',
      'current-route',
      'provider-route',
    ]);
    expect(review.candidates.find((candidate) => candidate.id === 'direct-route')?.status).toBe('available');
    expect(review.candidates.find((candidate) => candidate.id === 'current-route')?.status).toBe('available');
    expect(review.candidates.find((candidate) => candidate.id === 'provider-route')?.status).toBe('provider-not-configured');
  });

  it('does not expand airway or procedure-looking tokens without a licensed provider', () => {
    const review = buildRouteIntelligenceReview({
      waypoints: [faor, fala],
      aircraft: DEFAULT_AIRCRAFT,
      typedRoute: 'FAOR V12 RNAV03 FALA',
    });

    expect(review.status).toBe('provider-not-configured');
    expect(review.candidates.find((candidate) => candidate.id === 'provider-route')).toMatchObject({
      source: 'licensed-provider',
      status: 'provider-not-configured',
    });
    expect(review.candidates.find((candidate) => candidate.id === 'current-route')?.warnings.join(' ')).toContain('licensed navdata');
  });
});
