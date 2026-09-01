import { describe, expect, it } from 'vitest';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import {
  applyProfileEdit,
  approveAircraftPerformanceProfile,
  createDraftPerformanceProfileFromAircraft,
  exportPerformanceTablesCsv,
  parsePerformanceTablesCsv,
  validateAircraftPerformanceProfile,
} from '@/lib/planning/aircraftPerformance';
import type {
  AircraftPerformanceProfile,
  AircraftPerformanceProfileStatus,
  PerformancePhase,
  PerformanceTable,
  PerformanceTableOutput,
} from '@/types/planning';

describe('aircraft performance profiles', () => {
  it('creates untrusted draft profiles from simple aircraft data', () => {
    const profile = createDraftPerformanceProfileFromAircraft(
      DEFAULT_AIRCRAFT,
      new Date('2026-08-31T08:00:00Z')
    );
    const validation = validateAircraftPerformanceProfile(profile);

    expect(profile.status).toBe('draft');
    expect(profile.usableFuel).toEqual({ value: DEFAULT_AIRCRAFT.usableFuelGal, unit: 'usg' });
    expect(validation.canApprove).toBe(false);
    expect(validation.issues).toContain('POH/AFM source title is required.');
    expect(validation.issues).toContain('climb performance table is required.');
  });

  it('approves only complete profiles and returns approved profiles to draft after edits', () => {
    const profile = samplePerformanceProfile('draft');
    const approved = approveAircraftPerformanceProfile(
      profile,
      'Owner checked against POH.',
      new Date('2026-08-31T09:00:00Z')
    );
    const edited = applyProfileEdit(
      approved,
      { displayName: 'ZS-HLO updated' },
      new Date('2026-08-31T10:00:00Z')
    );
    const directApprovalAttempt = applyProfileEdit(
      profile,
      { status: 'approved', approvedAt: '2026-08-31T11:00:00.000Z' },
      new Date('2026-08-31T11:00:00Z')
    );

    expect(approved.status).toBe('approved');
    expect(approved.approvalNotes).toBe('Owner checked against POH.');
    expect(edited.status).toBe('draft');
    expect(edited.approvedAt).toBeUndefined();
    expect(directApprovalAttempt.status).toBe('draft');
    expect(directApprovalAttempt.approvedAt).toBeUndefined();
  });

  it('rejects phase tables that cannot support fuel calculations', () => {
    const profile = samplePerformanceProfile('draft');
    profile.tables = profile.tables.map((table) =>
      table.phase === 'cruise'
        ? {
            ...table,
            rows: table.rows.map((row) => ({
              ...row,
              output: { trueAirspeedKts: row.output.trueAirspeedKts ?? 115 },
            })),
          }
        : table
    );

    const validation = validateAircraftPerformanceProfile(profile);

    expect(validation.canApprove).toBe(false);
    expect(validation.issues.some((issue) => issue.includes('cruise fuelFlowPerHour'))).toBe(true);
  });

  it('imports and exports performance table CSV without losing phase rows', () => {
    const profile = samplePerformanceProfile('draft');
    const csv = exportPerformanceTablesCsv(profile.tables);
    const imported = parsePerformanceTablesCsv(csv, profile.fuelUnit);

    expect(csv).toContain('phase,tableId,title');
    expect(imported.rowCount).toBe(profile.tables.reduce((sum, table) => sum + table.rows.length, 0));
    expect(imported.tables.map((table) => table.phase)).toEqual(['climb', 'cruise', 'descent', 'holding']);
    expect(imported.tables[0].interpolationKeys).toContain('altitudeFt');
  });
});

function samplePerformanceProfile(status: AircraftPerformanceProfileStatus): AircraftPerformanceProfile {
  return {
    id: 'profile-zs-hlo',
    ownerId: 'user_123',
    registration: 'ZS-HLO',
    aircraftType: 'C172S',
    displayName: 'ZS-HLO C172S',
    aircraftClass: 'piston',
    status,
    source: {
      title: 'C172S POH Section 5',
      revision: 'Rev 8',
      page: '5-22',
    },
    fuelUnit: 'usg',
    displayFuelUnit: 'litre',
    fuelDensityLbPerUsg: 6,
    usableFuel: { value: 53, unit: 'usg' },
    defaultTaxiFuel: { value: 1, unit: 'usg' },
    contingencyPercent: 10,
    finalReserveMinutes: 45,
    defaultHoldingMinutes: 0,
    tables: [
      table('climb', 'Climb fuel', [
        [5000, { fuel: { value: 2, unit: 'usg' }, timeMinutes: 18, distanceNm: 24 }],
        [7000, { fuel: { value: 3, unit: 'usg' }, timeMinutes: 24, distanceNm: 31 }],
      ]),
      table('cruise', 'Cruise fuel flow', [
        [5000, { fuelFlowPerHour: { value: 10, unit: 'usg' }, trueAirspeedKts: 110 }],
        [7000, { fuelFlowPerHour: { value: 12, unit: 'usg' }, trueAirspeedKts: 120 }],
      ]),
      table('descent', 'Descent fuel', [
        [5000, { fuel: { value: 1, unit: 'usg' }, timeMinutes: 12, distanceNm: 18 }],
        [7000, { fuel: { value: 1.4, unit: 'usg' }, timeMinutes: 16, distanceNm: 24 }],
      ]),
      table('holding', 'Holding fuel flow', [
        [5000, { fuelFlowPerHour: { value: 8, unit: 'usg' }, trueAirspeedKts: 90 }],
        [7000, { fuelFlowPerHour: { value: 9, unit: 'usg' }, trueAirspeedKts: 92 }],
      ]),
    ],
    createdAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T08:00:00.000Z',
  };
}

function table(
  phase: PerformancePhase,
  title: string,
  rows: Array<[number, PerformanceTableOutput]>
): PerformanceTable {
  return {
    id: `${phase}-table`,
    phase,
    title,
    interpolationKeys: ['altitudeFt'],
    rows: rows.map(([altitudeFt, output]) => ({
      conditions: { altitudeFt },
      output,
    })),
  };
}
