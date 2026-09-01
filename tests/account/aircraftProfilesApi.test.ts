import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import type {
  AircraftPerformanceProfile,
  PerformancePhase,
  PerformanceTable,
  PerformanceTableOutput,
} from '@/types/planning';

describe('aircraft profile API routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('requires an authenticated account before listing profiles', async () => {
    const { GET, listAircraftPerformanceProfiles } = await loadCollectionRouteWithMocks({
      authResult: { ok: false, status: 401, error: 'Sign in to sync Halo planner data.' },
      databaseConfigured: true,
    });

    const response = await GET(new NextRequest('https://halo.test/api/aircraft-profiles'), {});
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: 'Sign in to sync Halo planner data.' });
    expect(listAircraftPerformanceProfiles).not.toHaveBeenCalled();
  });

  it('validates profile JSON before creating account-scoped profiles', async () => {
    const { POST, createAircraftPerformanceProfile } = await loadCollectionRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
    });

    const response = await POST(new NextRequest('https://halo.test/api/aircraft-profiles', {
      method: 'POST',
      body: JSON.stringify({ registration: 'ZS-HLO' }),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: 'Aircraft performance profile is invalid.' });
    expect(createAircraftPerformanceProfile).not.toHaveBeenCalled();
  });

  it('creates valid profiles for the authenticated user only', async () => {
    const profile = sampleProfile();
    const { POST, createAircraftPerformanceProfile } = await loadCollectionRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
      savedProfile: { ...profile, ownerId: 'user_123' },
    });

    const response = await POST(new NextRequest('https://halo.test/api/aircraft-profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    }), {});
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.profile.ownerId).toBe('user_123');
    expect(createAircraftPerformanceProfile).toHaveBeenCalledWith('user_123', profile);
  });

  it('patches a profile through the authenticated repository boundary', async () => {
    const profile = sampleProfile();
    const { PATCH, updateAircraftPerformanceProfile } = await loadItemRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
      updatedProfile: { ...profile, displayName: 'Updated profile' },
    });

    const response = await PATCH(new NextRequest('https://halo.test/api/aircraft-profiles/profile-zs-hlo', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: 'Updated profile', ownerId: 'user_other' }),
    }), { params: Promise.resolve({ id: 'profile-zs-hlo' }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.profile.displayName).toBe('Updated profile');
    expect(updateAircraftPerformanceProfile).toHaveBeenCalledWith('user_123', 'profile-zs-hlo', {
      displayName: 'Updated profile',
      ownerId: 'user_other',
    });
  });

  it('approves profiles only through the approval endpoint', async () => {
    const approved = { ...sampleProfile(), status: 'approved' as const, approvedAt: '2026-08-31T09:00:00.000Z' };
    const { POST, approveStoredAircraftPerformanceProfile } = await loadApproveRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
      approvedProfile: approved,
    });

    const response = await POST(new NextRequest('https://halo.test/api/aircraft-profiles/profile-zs-hlo/approve', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Owner checked POH.' }),
    }), { params: Promise.resolve({ id: 'profile-zs-hlo' }) });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.profile.status).toBe('approved');
    expect(approveStoredAircraftPerformanceProfile).toHaveBeenCalledWith(
      'user_123',
      'profile-zs-hlo',
      'Owner checked POH.'
    );
  });

  it('imports and exports profile performance tables as CSV', async () => {
    const profile = sampleProfile();
    const updatedProfile = {
      ...profile,
      tables: profile.tables.slice(0, 1),
    };
    const { GET, POST, getAircraftPerformanceProfile, replaceStoredPerformanceTables } = await loadCsvRouteWithMocks({
      authResult: { ok: true, userId: 'user_123' },
      databaseConfigured: true,
      storedProfile: profile,
      updatedProfile,
    });

    const getResponse = await GET(new NextRequest('https://halo.test/api/aircraft-profiles/profile-zs-hlo/tables.csv'), {
      params: Promise.resolve({ id: 'profile-zs-hlo' }),
    });
    const csv = await getResponse.text();

    const postResponse = await POST(new NextRequest('https://halo.test/api/aircraft-profiles/profile-zs-hlo/tables.csv', {
      method: 'POST',
      body: [
        'phase,tableId,title,altitudeFt,fuel,fuelFlowPerHour,timeMinutes,distanceNm,trueAirspeedKts',
        'climb,climb-table,Climb fuel,5000,2,10,12,20,',
      ].join('\n'),
    }), { params: Promise.resolve({ id: 'profile-zs-hlo' }) });
    const payload = await postResponse.json();

    expect(getResponse.status).toBe(200);
    expect(csv).toContain('climb-table');
    expect(getAircraftPerformanceProfile).toHaveBeenCalledWith('user_123', 'profile-zs-hlo');
    expect(postResponse.status).toBe(200);
    expect(payload.importedRows).toBe(1);
    expect(replaceStoredPerformanceTables).toHaveBeenCalledWith(
      'user_123',
      'profile-zs-hlo',
      expect.arrayContaining([expect.objectContaining({ id: 'climb-table', phase: 'climb' })])
    );
  });
});

async function loadCollectionRouteWithMocks({
  authResult,
  databaseConfigured,
  profiles = [],
  savedProfile = null,
}: {
  authResult: { ok: true; userId: string } | { ok: false; status: 401 | 503; error: string };
  databaseConfigured: boolean;
  profiles?: AircraftPerformanceProfile[];
  savedProfile?: AircraftPerformanceProfile | null;
}) {
  vi.resetModules();
  muteApiLogs();

  const requireAccountUserId = vi.fn().mockResolvedValue(authResult);
  const listAircraftPerformanceProfiles = vi.fn().mockResolvedValue(profiles);
  const createAircraftPerformanceProfile = vi.fn().mockResolvedValue(savedProfile);
  const isAircraftProfileDatabaseConfigured = vi.fn().mockReturnValue(databaseConfigured);

  vi.doMock('@/lib/auth/accountAuth', () => ({ requireAccountUserId }));
  vi.doMock('@/lib/account/aircraftProfileRepository', () => ({
    createAircraftPerformanceProfile,
    isAircraftProfileDatabaseConfigured,
    listAircraftPerformanceProfiles,
  }));

  const route = await import('@/app/api/aircraft-profiles/route');
  return { ...route, listAircraftPerformanceProfiles, createAircraftPerformanceProfile };
}

async function loadItemRouteWithMocks({
  authResult,
  databaseConfigured,
  storedProfile = sampleProfile(),
  updatedProfile = storedProfile,
}: {
  authResult: { ok: true; userId: string } | { ok: false; status: 401 | 503; error: string };
  databaseConfigured: boolean;
  storedProfile?: AircraftPerformanceProfile | null;
  updatedProfile?: AircraftPerformanceProfile | null;
}) {
  vi.resetModules();
  muteApiLogs();

  const requireAccountUserId = vi.fn().mockResolvedValue(authResult);
  const getAircraftPerformanceProfile = vi.fn().mockResolvedValue(storedProfile);
  const updateAircraftPerformanceProfile = vi.fn().mockResolvedValue(updatedProfile);
  const isAircraftProfileDatabaseConfigured = vi.fn().mockReturnValue(databaseConfigured);

  vi.doMock('@/lib/auth/accountAuth', () => ({ requireAccountUserId }));
  vi.doMock('@/lib/account/aircraftProfileRepository', () => ({
    getAircraftPerformanceProfile,
    isAircraftProfileDatabaseConfigured,
    updateAircraftPerformanceProfile,
  }));

  const route = await import('@/app/api/aircraft-profiles/[id]/route');
  return { ...route, getAircraftPerformanceProfile, updateAircraftPerformanceProfile };
}

async function loadApproveRouteWithMocks({
  authResult,
  databaseConfigured,
  approvedProfile = sampleProfile(),
}: {
  authResult: { ok: true; userId: string } | { ok: false; status: 401 | 503; error: string };
  databaseConfigured: boolean;
  approvedProfile?: AircraftPerformanceProfile | null;
}) {
  vi.resetModules();
  muteApiLogs();

  const requireAccountUserId = vi.fn().mockResolvedValue(authResult);
  const approveStoredAircraftPerformanceProfile = vi.fn().mockResolvedValue(approvedProfile);
  const isAircraftProfileDatabaseConfigured = vi.fn().mockReturnValue(databaseConfigured);

  vi.doMock('@/lib/auth/accountAuth', () => ({ requireAccountUserId }));
  vi.doMock('@/lib/account/aircraftProfileRepository', () => ({
    approveStoredAircraftPerformanceProfile,
    isAircraftProfileDatabaseConfigured,
  }));

  const route = await import('@/app/api/aircraft-profiles/[id]/approve/route');
  return { ...route, approveStoredAircraftPerformanceProfile };
}

async function loadCsvRouteWithMocks({
  authResult,
  databaseConfigured,
  storedProfile = sampleProfile(),
  updatedProfile = storedProfile,
}: {
  authResult: { ok: true; userId: string } | { ok: false; status: 401 | 503; error: string };
  databaseConfigured: boolean;
  storedProfile?: AircraftPerformanceProfile | null;
  updatedProfile?: AircraftPerformanceProfile | null;
}) {
  vi.resetModules();
  muteApiLogs();

  const requireAccountUserId = vi.fn().mockResolvedValue(authResult);
  const getAircraftPerformanceProfile = vi.fn().mockResolvedValue(storedProfile);
  const replaceStoredPerformanceTables = vi.fn().mockResolvedValue(updatedProfile);
  const isAircraftProfileDatabaseConfigured = vi.fn().mockReturnValue(databaseConfigured);

  vi.doMock('@/lib/auth/accountAuth', () => ({ requireAccountUserId }));
  vi.doMock('@/lib/account/aircraftProfileRepository', () => ({
    getAircraftPerformanceProfile,
    isAircraftProfileDatabaseConfigured,
    replaceStoredPerformanceTables,
  }));

  const route = await import('@/app/api/aircraft-profiles/[id]/tables.csv/route');
  return { ...route, getAircraftPerformanceProfile, replaceStoredPerformanceTables };
}

function muteApiLogs() {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
}

function sampleProfile(): AircraftPerformanceProfile {
  return {
    id: 'profile-zs-hlo',
    ownerId: 'user_123',
    registration: 'ZS-HLO',
    aircraftType: 'C172S',
    displayName: 'ZS-HLO C172S',
    aircraftClass: 'piston',
    status: 'draft',
    source: { title: 'C172S POH Section 5' },
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
