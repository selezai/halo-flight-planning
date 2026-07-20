import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import { buildBriefingDigest, buildBriefingText } from '@/lib/planning/briefing';
import {
  buildEmergencyPlanningReview,
  calculateGlideRadiusNm,
  scoreEmergencyCandidate,
} from '@/lib/planning/emergencyPlanning';
import { calculateRoute } from '@/lib/planning/navigation';
import type { EmergencyLandingSite, Waypoint } from '@/types/planning';

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

const userSite: EmergencyLandingSite = {
  id: 'site-1',
  name: 'Farm strip',
  coordinates: [28.05, -26.05],
  suitability: 'good',
  notes: 'Long open field',
  lastVerifiedDate: '2026-07-19',
};

describe('emergency planning', () => {
  it('calculates approximate still-air glide radius', () => {
    expect(calculateGlideRadiusNm(6000, 9)).toBeCloseTo(8.9, 1);
    expect(calculateGlideRadiusNm(0, 9)).toBe(0);
  });

  it('scores better and closer candidates higher', () => {
    const nearGood = scoreEmergencyCandidate({ distanceFromRouteNm: 2, suitability: 'good' });
    const farUnknown = scoreEmergencyCandidate({ distanceFromRouteNm: 20, suitability: 'unknown' });
    const nearUnsuitable = scoreEmergencyCandidate({ distanceFromRouteNm: 2, suitability: 'unsuitable' });

    expect(nearGood).toBeGreaterThan(farUnknown);
    expect(nearUnsuitable).toBeLessThan(nearGood);
  });

  it('builds candidate list from route airports, starter aerodromes, and user sites', () => {
    const review = buildEmergencyPlanningReview({
      waypoints: [faor, fala],
      cruiseAltitudeFt: 6500,
      aircraft: DEFAULT_AIRCRAFT,
      userSites: [userSite],
      now: new Date('2026-07-20T10:00:00Z'),
    });

    expect(review.status).toBe('available');
    expect(review.glideRadiusNm).toBeGreaterThan(9);
    expect(review.candidates.some((candidate) => candidate.ident === 'FAOR')).toBe(true);
    expect(review.candidates.some((candidate) => candidate.name === 'Farm strip')).toBe(true);
  });

  it('adds emergency state to digest and exported briefing text', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const emergencyReview = buildEmergencyPlanningReview({
      waypoints: [faor, fala],
      cruiseAltitudeFt: 6500,
      aircraft: DEFAULT_AIRCRAFT,
      userSites: [userSite],
      now: new Date('2026-07-20T10:00:00Z'),
    });
    const digest = buildBriefingDigest({
      routeName: 'Emergency route',
      route,
      risks: [],
      weather: [],
      emergencyReview,
    });
    const text = buildBriefingText({
      routeName: 'Emergency route',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [faor, fala],
      weather: [],
      risks: [],
      emergencyReview,
    });

    expect(digest.items.some((item) => item.source === 'Emergency')).toBe(true);
    expect(text).toContain('EMERGENCY / FORCED-LANDING');
    expect(text).toContain('Farm strip');
    expect(text).toContain('still-air radius');
  });
});
