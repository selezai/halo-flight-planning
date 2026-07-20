import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import { buildBriefingDigest, buildBriefingText } from '@/lib/planning/briefing';
import {
  buildFilingWorkflowReview,
  DEFAULT_FILING_CHECKLIST,
  formatFilingWorkflowLines,
} from '@/lib/planning/filingReminder';
import { calculateRoute } from '@/lib/planning/navigation';
import type { FilingChecklistState, RouteNotamReview, Waypoint } from '@/types/planning';

const completeChecklist: FilingChecklistState = {
  routeReviewed: true,
  weatherReviewed: true,
  notamPibObtained: true,
  weightBalanceReviewed: true,
  fuelReviewed: true,
  filedViaOfficialSource: true,
};

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

const notamReview: RouteNotamReview = {
  source: 'south-africa-official',
  status: 'manual-required',
  message: 'Official South Africa NOTAM briefing is required.',
  notams: [],
  locations: ['FAOR', 'FALA'],
  queryCount: 0,
  sourceUrl: 'https://file2fly.atns.co.za/aes/login.jsp',
};

describe('filing and close reminder workflow', () => {
  it('classifies missing close-by time as not planned', () => {
    const review = buildFilingWorkflowReview({
      checklist: DEFAULT_FILING_CHECKLIST,
      closeReminder: { enabled: false },
      now: new Date('2026-07-20T10:00:00Z'),
    });

    expect(review.status).toBe('not-planned');
    expect(review.checklistItemsComplete).toBe(0);
    expect(review.message).toContain('will not file');
  });

  it('classifies planned, due-soon, and overdue close states', () => {
    expect(buildFilingWorkflowReview({
      checklist: completeChecklist,
      closeReminder: { enabled: true, closeByTime: '2026-07-20T11:00:00Z' },
      now: new Date('2026-07-20T10:00:00Z'),
    }).status).toBe('planned');

    expect(buildFilingWorkflowReview({
      checklist: completeChecklist,
      closeReminder: { enabled: true, closeByTime: '2026-07-20T10:20:00Z' },
      now: new Date('2026-07-20T10:00:00Z'),
    }).status).toBe('due-soon');

    expect(buildFilingWorkflowReview({
      checklist: completeChecklist,
      closeReminder: { enabled: true, closeByTime: '2026-07-20T09:50:00Z' },
      now: new Date('2026-07-20T10:00:00Z'),
    }).status).toBe('overdue');
  });

  it('treats acknowledged close reminder as closed', () => {
    const review = buildFilingWorkflowReview({
      checklist: completeChecklist,
      closeReminder: {
        enabled: true,
        closeByTime: '2026-07-20T10:20:00Z',
        acknowledgedAt: '2026-07-20T10:05:00Z',
      },
      now: new Date('2026-07-20T10:10:00Z'),
    });

    expect(review.status).toBe('closed');
    expect(formatFilingWorkflowLines(review)[0]).toContain('CLOSED');
  });

  it('adds overdue filing state to digest and exported briefing text', () => {
    const route = calculateRoute([faor, fala], DEFAULT_AIRCRAFT);
    const filingReview = buildFilingWorkflowReview({
      checklist: completeChecklist,
      closeReminder: { enabled: true, closeByTime: '2026-07-20T09:50:00Z' },
      now: new Date('2026-07-20T10:00:00Z'),
    });
    const digest = buildBriefingDigest({
      routeName: 'Filing route',
      route,
      risks: [],
      weather: [],
      routeNotamReview: notamReview,
      filingReview,
    });
    const text = buildBriefingText({
      routeName: 'Filing route',
      aircraft: DEFAULT_AIRCRAFT,
      route,
      waypoints: [faor, fala],
      weather: [],
      risks: [],
      routeNotamReview: notamReview,
      filingReview,
    });

    expect(digest.status).toBe('stop');
    expect(digest.items[0]).toMatchObject({
      id: 'filing-overdue',
      level: 'critical',
    });
    expect(text).toContain('FILING & CLOSE REMINDER');
    expect(text).toContain('Official source: https://file2fly.atns.co.za/aes/login.jsp');
  });
});
