import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  accountSnapshotRequestSchema,
  accountSnapshotSchema,
  type HaloAccountSnapshot,
} from '@/lib/supabase/accountSnapshot';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withApiLogging } from '@/lib/observability/apiLogger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return withApiLogging(request, '/api/account/snapshot', getAccountSnapshot);
}

async function getAccountSnapshot() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase account sync is not configured.' },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase account sync persistence is not configured. Add the server-only SUPABASE_SERVICE_ROLE_KEY after applying and verifying the RLS migration.' },
      { status: 503 }
    );
  }

  const userId = user.id;
  const [routeResult, aircraftResult, preferencesResult] = await Promise.all([
    admin
      .from('saved_routes')
      .select('route_id,name,notes,departure_time,cruise_altitude_ft,waypoints,updated_at')
      .eq('user_id', userId)
      .eq('route_id', 'primary')
      .maybeSingle(),
    admin
      .from('aircraft_profiles')
      .select('profile,updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('user_preferences')
      .select('personal_minimums,visible_layers,updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const databaseError = routeResult.error ?? aircraftResult.error ?? preferencesResult.error;
  if (databaseError) {
    return databaseErrorResponse(databaseError);
  }

  if (!routeResult.data || !aircraftResult.data || !preferencesResult.data) {
    return NextResponse.json({
      snapshot: null,
      message: 'No cloud planner snapshot is saved for this account yet.',
    });
  }

  const parsed = accountSnapshotSchema.safeParse({
    route: {
      routeId: routeResult.data.route_id,
      name: routeResult.data.name,
      notes: routeResult.data.notes,
      departureTime: routeResult.data.departure_time,
      cruiseAltitudeFt: routeResult.data.cruise_altitude_ft,
      waypoints: routeResult.data.waypoints,
    },
    aircraft: aircraftResult.data.profile,
    personalMinimums: preferencesResult.data.personal_minimums,
    visibleLayers: preferencesResult.data.visible_layers,
    updatedAt: latestTimestamp([
      routeResult.data.updated_at,
      aircraftResult.data.updated_at,
      preferencesResult.data.updated_at,
    ]),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Saved planner data is invalid and cannot be loaded safely.' },
      { status: 500 }
    );
  }

  return NextResponse.json({ snapshot: parsed.data });
}

export async function POST(request: Request) {
  return withApiLogging(request, '/api/account/snapshot', () => saveAccountSnapshot(request));
}

async function saveAccountSnapshot(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { error: 'Supabase account sync is not configured.' },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase account sync persistence is not configured. Add the server-only SUPABASE_SERVICE_ROLE_KEY after applying and verifying the RLS migration.' },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = accountSnapshotRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Planner snapshot is invalid.', details: z.treeifyError(parsed.error) },
      { status: 400 }
    );
  }

  const userId = user.id;
  const snapshot = parsed.data.snapshot;
  const now = new Date().toISOString();

  const saveResult = await admin.rpc('save_account_snapshot', {
    p_user_id: userId,
    p_route_id: 'primary',
    p_name: snapshot.route.name,
    p_notes: snapshot.route.notes,
    p_departure_time: snapshot.route.departureTime,
    p_cruise_altitude_ft: snapshot.route.cruiseAltitudeFt,
    p_waypoints: snapshot.route.waypoints,
    p_aircraft_id: snapshot.aircraft.id,
    p_aircraft_profile: snapshot.aircraft,
    p_personal_minimums: snapshot.personalMinimums,
    p_visible_layers: snapshot.visibleLayers,
  });

  if (saveResult.error) return databaseErrorResponse(saveResult.error);

  const savedSnapshot: HaloAccountSnapshot = {
    ...snapshot,
    updatedAt: now,
  };

  return NextResponse.json({ snapshot: savedSnapshot });
}

function databaseErrorResponse(error: { code?: string; message?: string }) {
  const message = error.message ?? 'Account sync database operation failed.';
  const schemaMissing = error.code === '42P01' || /does not exist/i.test(message);
  console.error('Account sync database error', {
    code: error.code,
    schemaMissing,
  });

  return NextResponse.json(
    {
      error: schemaMissing
        ? 'Supabase account sync tables are not available. Apply and verify the launch_readiness_account_sync migration before enabling production sync.'
        : 'Account sync database operation failed.',
    },
    { status: schemaMissing ? 503 : 500 }
  );
}

function latestTimestamp(values: Array<string | null | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}
