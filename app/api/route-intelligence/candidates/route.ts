import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAccountUserId } from '@/lib/auth/accountAuth';
import { withApiLogging } from '@/lib/observability/api';
import { DEFAULT_AIRCRAFT } from '@/lib/planning/aircraft';
import { buildRouteIntelligenceReview } from '@/lib/planning/routeIntelligence';
import type { AircraftProfile, Waypoint } from '@/types/planning';

export const dynamic = 'force-dynamic';

const coordinateSchema = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

const waypointSchema = z.object({
  id: z.string().min(1).max(120),
  type: z.enum(['airport', 'navaid', 'user', 'reporting-point']),
  name: z.string().min(1).max(200),
  ident: z.string().min(1).max(20).optional(),
  coordinates: coordinateSchema,
  elevationFt: z.number().finite().optional(),
  sourceId: z.string().max(160).optional(),
  notes: z.string().max(1000).optional(),
});

const aircraftSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  registration: z.string().min(1).max(40).optional(),
  type: z.string().min(1).max(80).optional(),
  name: z.string().min(1).max(120).optional(),
  performanceProfileId: z.string().max(120).optional(),
  cruiseSpeedKts: z.number().min(30).max(700).optional(),
  fuelBurnGph: z.number().min(0).max(500).optional(),
  usableFuelGal: z.number().min(0).max(10000).optional(),
  reserveMinutes: z.number().min(0).max(600).optional(),
  contingencyPercent: z.number().min(0).max(100).optional(),
  magneticVariationDeg: z.number().min(-180).max(180).optional(),
  compassDeviationDeg: z.number().min(-45).max(45).optional(),
  glideRatio: z.number().min(1).max(80).optional(),
}).strict();

const routeCandidatesRequestSchema = z.object({
  routeText: z.string().max(2000).optional(),
  selectedCandidateId: z.string().max(120).optional(),
  waypoints: z.array(waypointSchema).max(200),
  aircraft: aircraftSchema.optional(),
}).strict();

export const POST = withApiLogging('/api/route-intelligence/candidates', async (request: NextRequest) => {
  const auth = await requireAccountUserId();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = routeCandidatesRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Route intelligence request is invalid.' }, { status: 400 });
  }

  const aircraft = normalizeAircraft(parsed.data.aircraft);
  const providerConfigured = Boolean(process.env.HALO_NAVDATA_PROVIDER_URL && process.env.HALO_NAVDATA_PROVIDER_KEY);
  const review = buildRouteIntelligenceReview({
    waypoints: parsed.data.waypoints as Waypoint[],
    aircraft,
    typedRoute: parsed.data.routeText,
    selectedCandidateId: parsed.data.selectedCandidateId,
    providerConfigured,
  });

  return NextResponse.json({ review }, {
    headers: {
      'Cache-Control': 'private, no-store',
    },
  });
});

function normalizeAircraft(value: z.infer<typeof aircraftSchema> | undefined): AircraftProfile {
  return {
    ...DEFAULT_AIRCRAFT,
    ...(value ?? {}),
    cruiseSpeedKts: value?.cruiseSpeedKts ?? DEFAULT_AIRCRAFT.cruiseSpeedKts,
    fuelBurnGph: value?.fuelBurnGph ?? DEFAULT_AIRCRAFT.fuelBurnGph,
    usableFuelGal: value?.usableFuelGal ?? DEFAULT_AIRCRAFT.usableFuelGal,
    reserveMinutes: value?.reserveMinutes ?? DEFAULT_AIRCRAFT.reserveMinutes,
    contingencyPercent: value?.contingencyPercent ?? DEFAULT_AIRCRAFT.contingencyPercent,
    magneticVariationDeg: value?.magneticVariationDeg ?? DEFAULT_AIRCRAFT.magneticVariationDeg,
  };
}
