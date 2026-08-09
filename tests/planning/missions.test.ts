import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT, DEFAULT_PERSONAL_MINIMUMS } from '@/lib/planning/aircraft';
import { DEFAULT_CLOSE_REMINDER, DEFAULT_FILING_CHECKLIST } from '@/lib/planning/filingReminder';
import {
  DEFAULT_FLIGHT_PLAN_FILING_RECORD,
  DEFAULT_NOTAM_BRIEFING_RECORD,
} from '@/lib/planning/flightAdmin';
import {
  archiveMissionRecord,
  buildMissionDisplayName,
  buildMissionRouteLabel,
  createMissionRecord,
  getArchivedMissionRecords,
  getDraftMissionRecords,
  getFlightHistoryRecords,
  getMissionStatusFromHaloStatus,
  markMissionRecordFlown,
  upsertMissionRecord,
} from '@/lib/planning/missions';
import { DEFAULT_TRAINING_WIND } from '@/lib/planning/trainingNavlog';
import { DEFAULT_WEIGHT_BALANCE_LOADING } from '@/lib/planning/weightBalance';
import type { HaloMissionPlannerState, Waypoint } from '@/types/planning';

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo International',
  coordinates: [28.246, -26.1337],
};

const fawb: Waypoint = {
  id: 'fawb',
  type: 'airport',
  ident: 'FAWB',
  name: 'Wonderboom',
  coordinates: [28.2242, -25.6539],
};

function missionState(overrides: Partial<HaloMissionPlannerState> = {}): HaloMissionPlannerState {
  return {
    center: [28, -26],
    zoom: 8,
    routeName: '',
    routeNotes: '',
    departureTime: '',
    cruiseAltitudeFt: 6500,
    waypoints: [],
    activeAircraft: DEFAULT_AIRCRAFT,
    weightBalanceLoading: DEFAULT_WEIGHT_BALANCE_LOADING,
    trainingWind: DEFAULT_TRAINING_WIND,
    filingChecklist: DEFAULT_FILING_CHECKLIST,
    notamBriefingRecord: DEFAULT_NOTAM_BRIEFING_RECORD,
    flightPlanFilingRecord: DEFAULT_FLIGHT_PLAN_FILING_RECORD,
    closeReminder: DEFAULT_CLOSE_REMINDER,
    emergencyLandingSites: [],
    personalMinimums: DEFAULT_PERSONAL_MINIMUMS,
    ...overrides,
  };
}

describe('mission library helpers', () => {
  it('uses the route name first, then route identifiers, then an untitled fallback', () => {
    expect(buildMissionDisplayName('  Gauteng triangle  ', [faor, fawb])).toBe('Gauteng triangle');
    expect(buildMissionDisplayName('', [faor, fawb])).toBe('FAOR → FAWB');
    expect(buildMissionDisplayName('', [faor])).toBe('FAOR mission');
    expect(buildMissionDisplayName('', [])).toBe('Untitled mission');
  });

  it('builds compact route labels for saved mission rows', () => {
    expect(buildMissionRouteLabel([])).toBe('No route yet');
    expect(buildMissionRouteLabel([faor])).toBe('FAOR · 1 waypoint');
    expect(buildMissionRouteLabel([faor, fawb])).toBe('FAOR → FAWB · 2 waypoints');
  });

  it('creates saved mission records from planner state', () => {
    const record = createMissionRecord({
      id: 'mission-1',
      state: missionState({
        routeName: 'Training nav',
        waypoints: [faor, fawb],
      }),
      status: 'needs-review',
      now: new Date('2026-07-21T08:00:00Z'),
    });

    expect(record).toMatchObject({
      id: 'mission-1',
      name: 'Training nav',
      status: 'needs-review',
      routeLabel: 'FAOR → FAWB · 2 waypoints',
      waypointCount: 2,
      createdAt: '2026-07-21T08:00:00.000Z',
      updatedAt: '2026-07-21T08:00:00.000Z',
    });
    expect(record.state.routeName).toBe('Training nav');
    expect(record.state.waypoints).toEqual([faor, fawb]);
  });

  it('upserts an active mission instead of duplicating it', () => {
    const older = createMissionRecord({
      id: 'mission-1',
      state: missionState({ routeName: 'Old name' }),
      now: new Date('2026-07-21T08:00:00Z'),
    });
    const newer = createMissionRecord({
      id: 'mission-1',
      state: missionState({ routeName: 'Updated name', waypoints: [faor] }),
      existing: older,
      now: new Date('2026-07-21T09:00:00Z'),
    });

    const records = upsertMissionRecord([older], newer);

    expect(records).toHaveLength(1);
    expect(records[0].name).toBe('Updated name');
    expect(records[0].createdAt).toBe('2026-07-21T08:00:00.000Z');
    expect(records[0].updatedAt).toBe('2026-07-21T09:00:00.000Z');
  });

  it('sorts active drafts ahead of archived missions', () => {
    const archived = archiveMissionRecord(
      createMissionRecord({
        id: 'archived',
        state: missionState({ routeName: 'Archived' }),
        now: new Date('2026-07-21T10:00:00Z'),
      }),
      new Date('2026-07-21T12:00:00Z')
    );
    const active = createMissionRecord({
      id: 'active',
      state: missionState({ routeName: 'Active' }),
      now: new Date('2026-07-21T09:00:00Z'),
    });

    expect(upsertMissionRecord([archived], active).map((record) => record.id)).toEqual([
      'active',
      'archived',
    ]);
  });

  it('maps live Halo status to saved mission status', () => {
    expect(getMissionStatusFromHaloStatus('idle')).toBe('draft');
    expect(getMissionStatusFromHaloStatus('ready')).toBe('ready');
    expect(getMissionStatusFromHaloStatus('review')).toBe('needs-review');
    expect(getMissionStatusFromHaloStatus('stop')).toBe('needs-review');
  });

  it('marks a saved mission as flown with a flown timestamp', () => {
    const record = createMissionRecord({
      id: 'mission-1',
      state: missionState({ routeName: 'Training nav', waypoints: [faor, fawb] }),
      now: new Date('2026-07-21T08:00:00Z'),
    });

    const flown = markMissionRecordFlown(record, new Date('2026-07-21T10:30:00Z'));

    expect(flown).toMatchObject({
      id: 'mission-1',
      name: 'Training nav',
      status: 'flown',
      flownAt: '2026-07-21T10:30:00.000Z',
      updatedAt: '2026-07-21T10:30:00.000Z',
      archivedAt: undefined,
    });
    expect(flown.state.waypoints).toEqual([faor, fawb]);
  });

  it('groups mission records for drafts, history, and archived UI tabs', () => {
    const draft = createMissionRecord({
      id: 'draft',
      state: missionState({ routeName: 'Draft' }),
      now: new Date('2026-07-21T08:00:00Z'),
    });
    const flown = markMissionRecordFlown(
      createMissionRecord({
        id: 'flown',
        state: missionState({ routeName: 'Flown' }),
        now: new Date('2026-07-21T09:00:00Z'),
      }),
      new Date('2026-07-21T11:00:00Z')
    );
    const archived = archiveMissionRecord(
      createMissionRecord({
        id: 'archived',
        state: missionState({ routeName: 'Archived' }),
        now: new Date('2026-07-21T10:00:00Z'),
      }),
      new Date('2026-07-21T12:00:00Z')
    );
    const records = [draft, flown, archived];

    expect(getDraftMissionRecords(records).map((record) => record.id)).toEqual(['draft']);
    expect(getFlightHistoryRecords(records).map((record) => record.id)).toEqual(['flown']);
    expect(getArchivedMissionRecords(records).map((record) => record.id)).toEqual(['archived']);
  });
});
