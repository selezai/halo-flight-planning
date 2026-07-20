import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT, DEFAULT_PERSONAL_MINIMUMS } from '@/lib/planning/aircraft';
import { buildBackupPackText } from '@/lib/planning/backupPack';
import { buildBriefingDigest, buildBriefingText, buildRiskAssessment } from '@/lib/planning/briefing';
import {
  buildFlightAdminReview,
  buildNotamRouteSignature,
  buildRoutePibRequestText,
  DEFAULT_FLIGHT_PLAN_FILING_RECORD,
  DEFAULT_NOTAM_BRIEFING_RECORD,
  formatFlightAdminLines,
  isNotamRecordStaleForRoute,
} from '@/lib/planning/flightAdmin';
import { buildFilingWorkflowReview, DEFAULT_FILING_CHECKLIST } from '@/lib/planning/filingReminder';
import { calculateRoute } from '@/lib/planning/navigation';
import type { RouteNotamReview, Waypoint } from '@/types/planning';

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

const fagc: Waypoint = {
  id: 'fagc',
  type: 'airport',
  ident: 'FAGC',
  name: 'Grand Central',
  coordinates: [28.1401, -25.9863],
};

const notamReview: RouteNotamReview = {
  source: 'south-africa-official',
  status: 'manual-required',
  message: 'Official South Africa NOTAM briefing is required.',
  notams: [],
  locations: ['FAOR', 'FALA'],
  queryCount: 0,
  sourceUrl: 'https://file2fly.atns.co.za/aes/login.jsp',
};

describe('flight admin handoff', () => {
  it('treats missing NOTAM and not-filing records as optional advisory data', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const adminReview = buildFlightAdminReview({
      notamRecord: DEFAULT_NOTAM_BRIEFING_RECORD,
      flightPlanRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      routeNotamReview: notamReview,
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
      cruiseAltitudeFt: 6500,
      now: new Date('2026-07-20T06:00:00Z'),
    });
    const risks = buildRiskAssessment(route, [], DEFAULT_PERSONAL_MINIMUMS, [], notamReview, undefined, undefined, undefined, adminReview);
    const digest = buildBriefingDigest({
      routeName: 'FAOR-FALA',
      route,
      risks,
      weather: [],
      routeNotamReview: notamReview,
      flightAdminReview: adminReview,
    });

    expect(adminReview.status).toBe('ready');
    expect(adminReview.notamStatus).toBe('not-recorded');
    expect(risks.some((risk) => risk.id === 'notam-manual-required')).toBe(false);
    expect(digest.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'flight-admin-notam-not-recorded',
          level: 'info',
        }),
        expect.objectContaining({
          id: 'flight-admin-not-filing',
          level: 'info',
        }),
      ])
    );
  });

  it('records official NOTAM briefing source, time, and reference', () => {
    const signature = buildNotamRouteSignature({
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
    });
    const adminReview = buildFlightAdminReview({
      notamRecord: {
        status: 'completed',
        method: 'File2Fly',
        reference: 'PIB-123',
        completedAt: '2026-07-20T06:30',
        routeSignature: signature,
      },
      flightPlanRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      routeNotamReview: notamReview,
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
      now: new Date('2026-07-20T06:45:00Z'),
    });

    expect(adminReview.notamStatus).toBe('completed');
    expect(formatFlightAdminLines(adminReview).join('\n')).toContain('NOTAM reference: PIB-123');
    expect(formatFlightAdminLines(adminReview).join('\n')).toContain('NOTAM completed at: 2026-07-20T06:30');
  });

  it('marks a completed NOTAM briefing stale when route or ETD changes', () => {
    const originalSignature = buildNotamRouteSignature({
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
    });

    expect(isNotamRecordStaleForRoute({
      status: 'completed',
      routeSignature: originalSignature,
    }, {
      waypoints: [faor, fagc],
      departureTime: '2026-07-20T08:00',
    })).toBe(true);

    expect(buildFlightAdminReview({
      notamRecord: {
        status: 'completed',
        routeSignature: originalSignature,
      },
      flightPlanRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      waypoints: [faor, fala],
      departureTime: '2026-07-20T09:00',
      now: new Date('2026-07-20T06:45:00Z'),
    }).notamStatus).toBe('needs-rebrief');
  });

  it('treats not-applicable NOTAM and not-filing as clear optional records', () => {
    const adminReview = buildFlightAdminReview({
      notamRecord: {
        status: 'not-applicable',
        notes: 'Local circuit; pilot elected separate briefing workflow.',
      },
      flightPlanRecord: {
        status: 'not-filing',
        notes: 'Local training flight.',
      },
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
      now: new Date('2026-07-20T06:45:00Z'),
    });

    expect(adminReview.status).toBe('ready');
    expect(adminReview.notamStatus).toBe('not-applicable');
    expect(adminReview.filingStatus).toBe('not-filing');
    expect(formatFlightAdminLines(adminReview).join('\n')).toContain('Local training flight.');
  });

  it('promotes rejected filing to stop and overdue close reminder remains stop', () => {
    const rejected = buildFlightAdminReview({
      notamRecord: DEFAULT_NOTAM_BRIEFING_RECORD,
      flightPlanRecord: {
        status: 'rejected',
        reference: 'FPL-REJ',
      },
      waypoints: [faor, fala],
      now: new Date('2026-07-20T10:00:00Z'),
    });
    const overdueCloseReview = buildFilingWorkflowReview({
      checklist: DEFAULT_FILING_CHECKLIST,
      closeReminder: {
        enabled: true,
        closeByTime: '2026-07-20T09:45:00Z',
      },
      now: new Date('2026-07-20T10:00:00Z'),
    });
    const overdue = buildFlightAdminReview({
      notamRecord: DEFAULT_NOTAM_BRIEFING_RECORD,
      flightPlanRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
      closeReview: overdueCloseReview,
      waypoints: [faor, fala],
      now: new Date('2026-07-20T10:00:00Z'),
    });

    expect(rejected.status).toBe('stop');
    expect(overdue.status).toBe('stop');
  });

  it('builds route PIB request text for File2Fly handoff', () => {
    const text = buildRoutePibRequestText({
      routeName: 'Training route',
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
      cruiseAltitudeFt: 6500,
      routeNotamReview: notamReview,
    });

    expect(text).toContain('Official briefing request for ATNS File2Fly / SACAA AIMU');
    expect(text).toContain('Departure: FAOR');
    expect(text).toContain('Destination: FALA');
    expect(text).toContain('Route/aerodrome locations to brief: FAOR, FALA');
  });

  it('includes Flight Admin in briefing and backup pack with manual-action disclaimer', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const closeReview = buildFilingWorkflowReview({
      checklist: DEFAULT_FILING_CHECKLIST,
      closeReminder: { enabled: false },
      now: new Date('2026-07-20T10:00:00Z'),
    });
    const adminReview = buildFlightAdminReview({
      notamRecord: {
        status: 'completed',
        reference: 'PIB-456',
        completedAt: '2026-07-20T08:20',
        routeSignature: buildNotamRouteSignature({
          waypoints: [faor, fala],
          departureTime: '2026-07-20T08:00',
        }),
      },
      flightPlanRecord: {
        status: 'filed-manually',
        reference: 'FPL-789',
        filedAt: '2026-07-20T08:30',
      },
      routeNotamReview: notamReview,
      waypoints: [faor, fala],
      departureTime: '2026-07-20T08:00',
      closeReview,
      now: new Date('2026-07-20T08:45:00Z'),
    });
    const digest = buildBriefingDigest({
      routeName: 'Admin route',
      route,
      risks: [],
      weather: [],
      routeNotamReview: notamReview,
      flightAdminReview: adminReview,
    });
    const briefing = buildBriefingText({
      routeName: 'Admin route',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [faor, fala],
      weather: [],
      risks: [],
      routeNotamReview: notamReview,
      flightAdminReview: adminReview,
      filingReview: closeReview,
    });
    const backupPack = buildBackupPackText({
      routeName: 'Admin route',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [faor, fala],
      digest,
      weather: [],
      risks: [],
      routeNotamReview: notamReview,
      flightAdminReview: adminReview,
      filingReview: closeReview,
    });

    expect(briefing).toContain('FLIGHT ADMIN');
    expect(briefing).toContain('NOTAM reference: PIB-456');
    expect(briefing).toContain('Flight plan filing: FILED MANUALLY');
    expect(briefing).toContain('Manual action: Halo did not retrieve official NOTAMs');
    expect(briefing).not.toContain('NOTAMs are clear');
    expect(backupPack).toContain('FLIGHT ADMIN WORKSHEET');
    expect(backupPack).toContain('Route PIB request text');
    expect(backupPack).toContain('FPL-789');
    expect(backupPack).toContain('https://file2fly.atns.co.za/aes/login.jsp');
  });
});
