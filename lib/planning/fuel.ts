import type {
  AircraftPerformanceProfile,
  AircraftProfile,
  FuelBreakdownItem,
  FuelPlanLeg,
  FuelPlanningResult,
  FuelPlanningState,
  FuelQuantity,
  FuelQuantityUnit,
  PerformanceConditions,
  PerformanceInputKey,
  PerformancePhase,
  PerformanceTable,
  PerformanceTableOutput,
  PerformanceTableRow,
  RouteAnalysis,
  RouteLeg,
  RouteWindInput,
} from '@/types/planning';
import { validateAircraftPerformanceProfile } from './aircraftPerformance';
import { normalizeHeading } from './navigation';

const LITRES_PER_USG = 3.785411784;
const MIN_GROUND_SPEED_KTS = 30;
const EPSILON = 0.000001;

export const DEFAULT_FUEL_PLANNING_STATE: FuelPlanningState = {
  flightRules: 'vfr',
  ruleSet: 'sacaa-atns-ga',
  wind: {
    source: 'manual',
    directionDeg: 0,
    speedKts: 0,
    label: 'Manual route wind',
  },
  temperatureC: 15,
  takeoffWeightLb: 0,
  holdingMinutes: 0,
  finalReserveMinutes: 45,
  contingencyPercent: 10,
  additionalFuel: { value: 0, unit: 'usg' },
  discretionaryFuel: { value: 0, unit: 'usg' },
};

export interface BuildFuelPlanningResultParams {
  route: RouteAnalysis;
  aircraft: AircraftProfile;
  profile?: AircraftPerformanceProfile;
  state: FuelPlanningState;
  cruiseAltitudeFt: number;
  now?: Date;
}

interface PerformanceLookup {
  output?: PerformanceTableOutput;
  message?: string;
}

export function buildFuelPlanningResult({
  route,
  aircraft,
  profile,
  state,
  cruiseAltitudeFt,
  now = new Date(),
}: BuildFuelPlanningResultParams): FuelPlanningResult {
  if (route.summary.legCount === 0) {
    return buildLegacyResult({
      route,
      aircraft,
      state,
      status: 'needs-route',
      message: 'Add at least two waypoints before calculating operational fuel.',
      issue: 'Route is incomplete.',
      now,
    });
  }

  if (!profile) {
    return buildLegacyResult({
      route,
      aircraft,
      state,
      status: 'untrusted-profile',
      message: 'Operational fuel needs an approved POH/AFM performance profile.',
      issue: 'No aircraft performance profile is selected.',
      now,
    });
  }

  if (profile.status !== 'approved') {
    return buildLegacyResult({
      route,
      aircraft,
      state,
      profile,
      status: 'untrusted-profile',
      message: 'Selected performance profile is not approved for trusted fuel planning.',
      issue: `Selected performance profile status is ${profile.status}.`,
      now,
    });
  }

  const profileValidation = validateAircraftPerformanceProfile(profile);
  if (!profileValidation.canApprove) {
    return buildLegacyResult({
      route,
      aircraft,
      state,
      profile,
      status: 'incomplete-profile',
      message: 'Selected performance profile is missing required POH/AFM data.',
      issue: profileValidation.issues.join(' '),
      now,
    });
  }

  const conditions = buildPerformanceConditions(state, cruiseAltitudeFt);
  const issues: string[] = [];
  const taxiFuel = resolveTaxiFuel(profile, conditions);
  const climb = lookupPhaseOutput(profile, 'climb', conditions);
  const descent = lookupPhaseOutput(profile, 'descent', conditions);
  const cruise = lookupPhaseOutput(profile, 'cruise', conditions);
  const holding = lookupPhaseOutput(profile, 'holding', conditions);

  for (const lookup of [taxiFuel, climb, descent, cruise, holding]) {
    if (lookup.message) issues.push(lookup.message);
  }

  if (!taxiFuel.output?.fuel || !climb.output || !descent.output || !cruise.output || !holding.output) {
    return buildLegacyResult({
      route,
      aircraft,
      state,
      profile,
      status: 'incomplete-profile',
      message: 'Operational fuel cannot be trusted because one or more POH table lookups failed.',
      issue: issues.join(' ') || 'POH table lookup failed.',
      now,
    });
  }

  const fuelUnit = profile.fuelUnit;
  const cruiseTasKts = cruise.output.trueAirspeedKts ?? aircraft.cruiseSpeedKts;
  const cruiseFuelFlow = cruise.output.fuelFlowPerHour;
  const holdingFuelFlow = holding.output.fuelFlowPerHour ?? cruiseFuelFlow;

  if (!cruiseFuelFlow || !holdingFuelFlow) {
    return buildLegacyResult({
      route,
      aircraft,
      state,
      profile,
      status: 'incomplete-profile',
      message: 'Operational fuel cannot be trusted because cruise or holding fuel-flow data is missing.',
      issue: 'Cruise and holding tables must return fuel flow per hour.',
      now,
    });
  }

  const climbFuel = climb.output.fuel ?? quantityFromFlow(climb.output.fuelFlowPerHour, climb.output.timeMinutes, fuelUnit);
  const descentFuel = descent.output.fuel ?? quantityFromFlow(descent.output.fuelFlowPerHour, descent.output.timeMinutes, fuelUnit);

  if (!climbFuel || !descentFuel) {
    return buildLegacyResult({
      route,
      aircraft,
      state,
      profile,
      status: 'incomplete-profile',
      message: 'Operational fuel cannot be trusted because climb or descent fuel data is missing.',
      issue: 'Climb and descent tables must return fuel or fuel flow plus time.',
      now,
    });
  }

  const taxi = normalizeFuelQuantity(taxiFuel.output.fuel, fuelUnit, profile.fuelDensityLbPerUsg);
  const climbQuantity = normalizeFuelQuantity(climbFuel, fuelUnit, profile.fuelDensityLbPerUsg);
  const descentQuantity = normalizeFuelQuantity(descentFuel, fuelUnit, profile.fuelDensityLbPerUsg);
  const climbDistanceNm = climb.output.distanceNm ?? 0;
  const descentDistanceNm = descent.output.distanceNm ?? 0;
  const cruiseDistanceNm = Math.max(0, route.summary.totalDistanceNm - climbDistanceNm - descentDistanceNm);
  const cruiseLegs = buildFuelPlanLegs({
    route,
    cruiseDistanceNm,
    cruiseTasKts,
    cruiseFuelFlow: normalizeFuelQuantity(cruiseFuelFlow, fuelUnit, profile.fuelDensityLbPerUsg),
    wind: normalizeWind(state.wind),
    fuelUnit,
  });
  const cruiseFuel = sumQuantities(cruiseLegs.map((leg) => leg.fuel), fuelUnit);
  const tripFuel = sumQuantities([climbQuantity, cruiseFuel, descentQuantity], fuelUnit);
  const contingencyFuel = multiplyQuantity(tripFuel, state.contingencyPercent / 100, fuelUnit);
  const alternateFuel = calculateAlternateFuel({
    state,
    profile,
    cruiseFuelFlow: normalizeFuelQuantity(cruiseFuelFlow, fuelUnit, profile.fuelDensityLbPerUsg),
    cruiseTasKts,
    fuelUnit,
  });
  const holdingFuel = multiplyQuantity(
    normalizeFuelQuantity(holdingFuelFlow, fuelUnit, profile.fuelDensityLbPerUsg),
    state.holdingMinutes / 60,
    fuelUnit
  );
  const reserveFuel = multiplyQuantity(
    normalizeFuelQuantity(holdingFuelFlow, fuelUnit, profile.fuelDensityLbPerUsg),
    state.finalReserveMinutes / 60,
    fuelUnit
  );
  const additionalFuel = normalizeFuelQuantity(state.additionalFuel, fuelUnit, profile.fuelDensityLbPerUsg);
  const discretionaryFuel = normalizeFuelQuantity(state.discretionaryFuel, fuelUnit, profile.fuelDensityLbPerUsg);
  const usableFuel = normalizeFuelQuantity(profile.usableFuel, fuelUnit, profile.fuelDensityLbPerUsg);
  const totalRequiredFuel = sumQuantities([
    taxi,
    tripFuel,
    contingencyFuel,
    alternateFuel,
    holdingFuel,
    reserveFuel,
    additionalFuel,
    discretionaryFuel,
  ], fuelUnit, profile.fuelDensityLbPerUsg);
  const expectedLandingFuel = subtractQuantity(usableFuel, sumQuantities([
    taxi,
    tripFuel,
    contingencyFuel,
    alternateFuel,
    holdingFuel,
    additionalFuel,
    discretionaryFuel,
  ], fuelUnit, profile.fuelDensityLbPerUsg), fuelUnit, profile.fuelDensityLbPerUsg);
  const remainingFuel = subtractQuantity(usableFuel, totalRequiredFuel, fuelUnit, profile.fuelDensityLbPerUsg);
  const reserveMinimum = reserveFuel.value;
  const status = totalRequiredFuel.value > usableFuel.value
    ? 'critical'
    : remainingFuel.value < reserveMinimum * 0.5
      ? 'caution'
      : 'ready';

  return {
    status,
    ruleSet: state.ruleSet,
    profileId: profile.id,
    profileStatus: profile.status,
    trusted: issues.length === 0,
    message: buildFuelResultMessage(status, state.flightRules, issues.length),
    issues,
    breakdown: [
      fuelBreakdown('taxi', 'Taxi/run-up', taxi, true, 'POH taxi fuel or taxi table.'),
      fuelBreakdown('climb', 'Climb', climbQuantity, true, 'POH climb table at planned conditions.'),
      fuelBreakdown('cruise', 'Cruise', cruiseFuel, true, 'Wind-corrected route cruise from POH cruise table.'),
      fuelBreakdown('descent', 'Descent', descentQuantity, true, 'POH descent table at planned conditions.'),
      fuelBreakdown('trip', 'Trip', tripFuel, true, 'Climb plus cruise plus descent.'),
      fuelBreakdown('contingency', 'Contingency', contingencyFuel, true, `${state.contingencyPercent}% of trip fuel.`),
      fuelBreakdown('alternate', 'Alternate', alternateFuel, true, state.alternate?.distanceNm
        ? `${state.alternate.name || 'Alternate'} at ${state.alternate.distanceNm.toFixed(1)} nm.`
        : 'No alternate distance entered.'),
      fuelBreakdown('holding', 'Holding', holdingFuel, true, `${state.holdingMinutes} min holding fuel.`),
      fuelBreakdown('final-reserve', 'Final reserve', reserveFuel, true, `${state.finalReserveMinutes} min at holding fuel flow.`),
      fuelBreakdown('additional', 'Additional', additionalFuel, true, 'Pilot-entered additional fuel.'),
      fuelBreakdown('discretionary', 'Discretionary', discretionaryFuel, true, 'Pilot-entered discretionary fuel.'),
      fuelBreakdown('total-required', 'Total required', totalRequiredFuel, true, 'All required/planned fuel components.'),
      fuelBreakdown('expected-landing', 'Expected landing', expectedLandingFuel, true, 'Usable fuel minus taxi, trip, contingency, alternate, holding, additional, and discretionary fuel.'),
      fuelBreakdown('remaining', 'Remaining after reserve', remainingFuel, true, 'Usable fuel minus total required including final reserve.'),
    ],
    legs: cruiseLegs,
    tripFuel,
    totalRequiredFuel,
    usableFuel,
    remainingFuel,
    expectedLandingFuel,
    calculatedAt: now.toISOString(),
  };
}

export function selectPerformanceOutput(
  table: PerformanceTable,
  requestedConditions: PerformanceConditions
): PerformanceLookup {
  if (table.rows.length === 0) {
    return { message: `${table.title} has no rows.` };
  }

  const rows = filterRowsByStringConditions(table.rows, requestedConditions);
  if (rows.length === 0) {
    return { message: `${table.title} has no row for selected power/mixture setting.` };
  }

  const keys = table.interpolationKeys.filter((key) => requestedConditions[key] !== undefined);
  if (keys.length === 0) {
    return {
      output: rows[0].output,
    };
  }

  const bounds = keys.map((key) => getBounds(rows, key, requestedConditions[key] as number));
  if (bounds.some((bound) => bound === null)) {
    return { message: `${table.title} cannot interpolate within available POH table bounds.` };
  }

  const resolvedBounds = bounds.filter((bound): bound is { key: PerformanceInputKey; lower: number; upper: number; target: number } => Boolean(bound));
  const corners = buildCornerConditions(resolvedBounds);
  const cornerRows = corners.map((corner) => findCornerRow(rows, corner, resolvedBounds.map((bound) => bound.key)));

  if (cornerRows.some((row) => !row)) {
    return { message: `${table.title} is missing rows needed for interpolation.` };
  }

  return {
    output: interpolateOutput(
      cornerRows.filter((row): row is PerformanceTableRow => Boolean(row)),
      corners,
      resolvedBounds
    ),
  };
}

export function normalizeFuelQuantity(
  quantity: FuelQuantity,
  targetUnit: FuelQuantityUnit,
  fuelDensityLbPerUsg = 6
): FuelQuantity {
  if (quantity.unit === targetUnit) return { value: quantity.value, unit: targetUnit };

  const usg = toUsGallons(quantity, fuelDensityLbPerUsg);
  switch (targetUnit) {
    case 'usg':
      return { value: usg, unit: 'usg' };
    case 'litre':
      return { value: usg * LITRES_PER_USG, unit: 'litre' };
    case 'lb':
      return { value: usg * fuelDensityLbPerUsg, unit: 'lb' };
    case 'kg':
      return { value: (usg * fuelDensityLbPerUsg) / 2.2046226218, unit: 'kg' };
  }
}

export function toUsGallons(quantity: FuelQuantity, fuelDensityLbPerUsg = 6): number {
  switch (quantity.unit) {
    case 'usg':
      return quantity.value;
    case 'litre':
      return quantity.value / LITRES_PER_USG;
    case 'lb':
      return quantity.value / fuelDensityLbPerUsg;
    case 'kg':
      return (quantity.value * 2.2046226218) / fuelDensityLbPerUsg;
  }
}

export function formatFuelQuantity(
  quantity: FuelQuantity,
  displayUnit: FuelQuantityUnit = quantity.unit,
  fuelDensityLbPerUsg = 6
): string {
  const converted = normalizeFuelQuantity(quantity, displayUnit, fuelDensityLbPerUsg);
  const suffix: Record<FuelQuantityUnit, string> = {
    usg: 'USG',
    litre: 'L',
    kg: 'kg',
    lb: 'lb',
  };
  const digits = converted.value >= 100 ? 0 : 1;
  return `${converted.value.toFixed(digits)} ${suffix[converted.unit]}`;
}

function buildLegacyResult({
  route,
  aircraft,
  state,
  profile,
  status,
  message,
  issue,
  now,
}: {
  route: RouteAnalysis;
  aircraft: AircraftProfile;
  state: FuelPlanningState;
  profile?: AircraftPerformanceProfile;
  status: FuelPlanningResult['status'];
  message: string;
  issue: string;
  now: Date;
}): FuelPlanningResult {
  const tripFuel = { value: route.summary.tripFuelGal, unit: 'usg' as const };
  const reserveFuel = { value: route.summary.reserveFuelGal, unit: 'usg' as const };
  const contingencyFuel = { value: route.summary.contingencyFuelGal, unit: 'usg' as const };
  const totalRequiredFuel = { value: route.summary.totalFuelRequiredGal, unit: 'usg' as const };
  const usableFuel = { value: aircraft.usableFuelGal, unit: 'usg' as const };
  const remainingFuel = { value: route.summary.fuelRemainingGal, unit: 'usg' as const };
  const zero = { value: 0, unit: 'usg' as const };

  return {
    status,
    ruleSet: state.ruleSet,
    profileId: profile?.id,
    profileStatus: profile?.status,
    trusted: false,
    message,
    issues: [issue],
    breakdown: [
      fuelBreakdown('trip', 'Legacy trip estimate', tripFuel, false, 'Current route distance times aircraft cruise fuel burn.'),
      fuelBreakdown('contingency', 'Legacy contingency', contingencyFuel, false, `${aircraft.contingencyPercent}% of legacy trip fuel.`),
      fuelBreakdown('final-reserve', 'Legacy reserve', reserveFuel, false, `${aircraft.reserveMinutes} min at cruise burn.`),
      fuelBreakdown('alternate', 'Alternate', zero, false, 'Not included in legacy estimate.'),
      fuelBreakdown('holding', 'Holding', zero, false, 'Not included in legacy estimate.'),
      fuelBreakdown('total-required', 'Legacy required', totalRequiredFuel, false, 'Trip, reserve, and contingency only.'),
      fuelBreakdown('remaining', 'Legacy remaining', remainingFuel, false, 'Usable fuel minus legacy required fuel.'),
    ],
    legs: route.legs.map((leg) => ({
      id: leg.id,
      from: leg.from.ident ?? leg.from.name,
      to: leg.to.ident ?? leg.to.name,
      distanceNm: leg.distanceNm,
      trueCourseDeg: leg.trueCourseDeg,
      windCorrectionAngleDeg: 0,
      groundSpeedKts: aircraft.cruiseSpeedKts,
      estimatedTimeMinutes: leg.estimatedTimeMinutes,
      fuel: { value: leg.fuelRequiredGal, unit: 'usg' },
    })),
    tripFuel,
    totalRequiredFuel,
    usableFuel,
    remainingFuel,
    expectedLandingFuel: remainingFuel,
    calculatedAt: now.toISOString(),
  };
}

function buildPerformanceConditions(
  state: FuelPlanningState,
  cruiseAltitudeFt: number
): PerformanceConditions {
  return {
    weightLb: state.takeoffWeightLb > 0 ? state.takeoffWeightLb : undefined,
    altitudeFt: cruiseAltitudeFt,
    temperatureC: state.temperatureC,
    powerSetting: state.cruisePowerSetting,
    mixtureSetting: state.mixtureSetting,
  };
}

function lookupPhaseOutput(
  profile: AircraftPerformanceProfile,
  phase: PerformancePhase,
  conditions: PerformanceConditions
): PerformanceLookup {
  const table = profile.tables.find((item) => item.phase === phase && item.rows.length > 0);
  if (!table) return { message: `${phase} performance table is missing.` };
  return selectPerformanceOutput(table, conditions);
}

function resolveTaxiFuel(
  profile: AircraftPerformanceProfile,
  conditions: PerformanceConditions
): PerformanceLookup {
  const table = profile.tables.find((item) => item.phase === 'taxi' && item.rows.length > 0);
  if (table) return selectPerformanceOutput(table, conditions);
  if (profile.defaultTaxiFuel) return { output: { fuel: profile.defaultTaxiFuel } };
  return { message: 'Taxi fuel is missing.' };
}

function quantityFromFlow(
  flow: FuelQuantity | undefined,
  timeMinutes: number | undefined,
  unit: FuelQuantityUnit
): FuelQuantity | undefined {
  if (!flow || timeMinutes === undefined) return undefined;
  return { value: flow.value * (timeMinutes / 60), unit };
}

function buildFuelPlanLegs({
  route,
  cruiseDistanceNm,
  cruiseTasKts,
  cruiseFuelFlow,
  wind,
  fuelUnit,
}: {
  route: RouteAnalysis;
  cruiseDistanceNm: number;
  cruiseTasKts: number;
  cruiseFuelFlow: FuelQuantity;
  wind: RouteWindInput;
  fuelUnit: FuelQuantityUnit;
}): FuelPlanLeg[] {
  const routeDistance = Math.max(route.summary.totalDistanceNm, EPSILON);

  return route.legs.map((leg) => {
    const legCruiseDistance = cruiseDistanceNm * (leg.distanceNm / routeDistance);
    const windCorrected = calculateWindCorrectedLeg(leg, cruiseTasKts, wind);
    const estimatedTimeMinutes = (legCruiseDistance / windCorrected.groundSpeedKts) * 60;

    return {
      id: leg.id,
      from: leg.from.ident ?? leg.from.name,
      to: leg.to.ident ?? leg.to.name,
      distanceNm: leg.distanceNm,
      trueCourseDeg: leg.trueCourseDeg,
      windCorrectionAngleDeg: windCorrected.windCorrectionAngleDeg,
      groundSpeedKts: windCorrected.groundSpeedKts,
      estimatedTimeMinutes,
      fuel: {
        value: cruiseFuelFlow.value * (estimatedTimeMinutes / 60),
        unit: fuelUnit,
      },
    };
  });
}

function calculateAlternateFuel({
  state,
  profile,
  cruiseFuelFlow,
  cruiseTasKts,
  fuelUnit,
}: {
  state: FuelPlanningState;
  profile: AircraftPerformanceProfile;
  cruiseFuelFlow: FuelQuantity;
  cruiseTasKts: number;
  fuelUnit: FuelQuantityUnit;
}): FuelQuantity {
  if (!state.alternate || state.alternate.distanceNm <= 0) {
    return { value: 0, unit: fuelUnit };
  }

  const wind = normalizeWind(state.alternate.wind ?? state.wind);
  const groundSpeedKts = Math.max(MIN_GROUND_SPEED_KTS, cruiseTasKts - headwindComponentKts(wind, 0));
  const timeHours = state.alternate.distanceNm / groundSpeedKts;
  return normalizeFuelQuantity({
    value: cruiseFuelFlow.value * timeHours,
    unit: cruiseFuelFlow.unit,
  }, fuelUnit, profile.fuelDensityLbPerUsg);
}

function calculateWindCorrectedLeg(leg: RouteLeg, trueAirspeedKts: number, wind: RouteWindInput): {
  windCorrectionAngleDeg: number;
  groundSpeedKts: number;
} {
  const windAngleDeg = normalizeWindAngle(wind.directionDeg - leg.trueCourseDeg);
  const crosswindKts = wind.speedKts * Math.sin(toRadians(windAngleDeg));
  const headwindKts = wind.speedKts * Math.cos(toRadians(windAngleDeg));
  const ratio = clamp(crosswindKts / trueAirspeedKts, -0.95, 0.95);
  const windCorrectionAngleDeg = toDegrees(Math.asin(ratio));
  const groundSpeedKts = Math.max(
    MIN_GROUND_SPEED_KTS,
    trueAirspeedKts * Math.cos(toRadians(windCorrectionAngleDeg)) - headwindKts
  );

  return {
    windCorrectionAngleDeg,
    groundSpeedKts,
  };
}

function normalizeWind(wind: RouteWindInput): RouteWindInput {
  return {
    ...wind,
    directionDeg: normalizeHeading(Number.isFinite(wind.directionDeg) ? wind.directionDeg : 0),
    speedKts: clamp(Number.isFinite(wind.speedKts) ? wind.speedKts : 0, 0, 250),
  };
}

function headwindComponentKts(wind: RouteWindInput, courseDeg: number): number {
  const windAngleDeg = normalizeWindAngle(wind.directionDeg - courseDeg);
  return wind.speedKts * Math.cos(toRadians(windAngleDeg));
}

function fuelBreakdown(
  kind: FuelBreakdownItem['kind'],
  label: string,
  quantity: FuelQuantity,
  trusted: boolean,
  detail: string
): FuelBreakdownItem {
  return {
    kind,
    label,
    quantity,
    trusted,
    detail,
  };
}

function buildFuelResultMessage(
  status: FuelPlanningResult['status'],
  flightRules: FuelPlanningState['flightRules'],
  issueCount: number
): string {
  if (status === 'critical') return 'Required fuel exceeds usable fuel.';
  if (status === 'caution') return 'Fuel margin is tight after required reserves.';
  const prefix = flightRules === 'ifr' ? 'IFR' : 'VFR';
  return issueCount > 0
    ? `${prefix} fuel calculated with review notes.`
    : `${prefix} fuel calculated from approved POH/AFM performance tables.`;
}

function sumQuantities(quantities: FuelQuantity[], unit: FuelQuantityUnit, fuelDensityLbPerUsg = 6): FuelQuantity {
  return {
    value: quantities.reduce((sum, quantity) => sum + normalizeFuelQuantity(quantity, unit, fuelDensityLbPerUsg).value, 0),
    unit,
  };
}

function subtractQuantity(left: FuelQuantity, right: FuelQuantity, unit: FuelQuantityUnit, fuelDensityLbPerUsg = 6): FuelQuantity {
  return {
    value: normalizeFuelQuantity(left, unit, fuelDensityLbPerUsg).value - normalizeFuelQuantity(right, unit, fuelDensityLbPerUsg).value,
    unit,
  };
}

function multiplyQuantity(quantity: FuelQuantity, multiplier: number, unit: FuelQuantityUnit): FuelQuantity {
  return {
    value: normalizeFuelQuantity(quantity, unit).value * multiplier,
    unit,
  };
}

function filterRowsByStringConditions(
  rows: PerformanceTableRow[],
  requestedConditions: PerformanceConditions
): PerformanceTableRow[] {
  return rows.filter((row) => {
    if (
      requestedConditions.powerSetting &&
      row.conditions.powerSetting &&
      row.conditions.powerSetting !== requestedConditions.powerSetting
    ) {
      return false;
    }
    if (
      requestedConditions.mixtureSetting &&
      row.conditions.mixtureSetting &&
      row.conditions.mixtureSetting !== requestedConditions.mixtureSetting
    ) {
      return false;
    }
    return true;
  });
}

function getBounds(
  rows: PerformanceTableRow[],
  key: PerformanceInputKey,
  target: number
): { key: PerformanceInputKey; lower: number; upper: number; target: number } | null {
  const values = Array.from(new Set(
    rows
      .map((row) => row.conditions[key])
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  )).sort((a, b) => a - b);

  if (values.length === 0) return null;
  const lower = [...values].reverse().find((value) => value <= target + EPSILON);
  const upper = values.find((value) => value >= target - EPSILON);
  if (lower === undefined || upper === undefined) return null;

  return { key, lower, upper, target };
}

function buildCornerConditions(bounds: Array<{ key: PerformanceInputKey; lower: number; upper: number }>): Array<Record<string, number>> {
  return bounds.reduce<Array<Record<string, number>>>((corners, bound) => {
    const values = Math.abs(bound.lower - bound.upper) < EPSILON
      ? [bound.lower]
      : [bound.lower, bound.upper];
    return corners.flatMap((corner) => values.map((value) => ({
      ...corner,
      [bound.key]: value,
    })));
  }, [{}]);
}

function findCornerRow(
  rows: PerformanceTableRow[],
  corner: Record<string, number>,
  keys: PerformanceInputKey[]
): PerformanceTableRow | undefined {
  return rows.find((row) =>
    keys.every((key) => Math.abs((row.conditions[key] ?? NaN) - corner[key]) < EPSILON)
  );
}

function interpolateOutput(
  rows: PerformanceTableRow[],
  corners: Array<Record<string, number>>,
  bounds: Array<{ key: PerformanceInputKey; lower: number; upper: number; target: number }>
): PerformanceTableOutput {
  return {
    fuel: interpolateFuel(rows, corners, bounds, 'fuel'),
    fuelFlowPerHour: interpolateFuel(rows, corners, bounds, 'fuelFlowPerHour'),
    timeMinutes: interpolateNumberOutput(rows, corners, bounds, 'timeMinutes'),
    distanceNm: interpolateNumberOutput(rows, corners, bounds, 'distanceNm'),
    trueAirspeedKts: interpolateNumberOutput(rows, corners, bounds, 'trueAirspeedKts'),
  };
}

function interpolateFuel(
  rows: PerformanceTableRow[],
  corners: Array<Record<string, number>>,
  bounds: Array<{ key: PerformanceInputKey; lower: number; upper: number; target: number }>,
  key: 'fuel' | 'fuelFlowPerHour'
): FuelQuantity | undefined {
  const unit = rows[0].output[key]?.unit;
  if (!unit || rows.some((row) => !row.output[key])) return undefined;
  return {
    value: interpolateScalar(rows.map((row) => row.output[key]?.value ?? 0), corners, bounds),
    unit,
  };
}

function interpolateNumberOutput(
  rows: PerformanceTableRow[],
  corners: Array<Record<string, number>>,
  bounds: Array<{ key: PerformanceInputKey; lower: number; upper: number; target: number }>,
  key: 'timeMinutes' | 'distanceNm' | 'trueAirspeedKts'
): number | undefined {
  if (rows.some((row) => row.output[key] === undefined)) return undefined;
  return interpolateScalar(rows.map((row) => row.output[key] ?? 0), corners, bounds);
}

function interpolateScalar(
  values: number[],
  corners: Array<Record<string, number>>,
  bounds: Array<{ key: PerformanceInputKey; lower: number; upper: number; target: number }>
): number {
  return values.reduce((sum, value, index) => {
    const corner = corners[index];
    const weight = bounds.reduce((product, bound) => {
      if (Math.abs(bound.lower - bound.upper) < EPSILON) return product;
      const fraction = (bound.target - bound.lower) / (bound.upper - bound.lower);
      return product * (Math.abs(corner[bound.key] - bound.lower) < EPSILON ? 1 - fraction : fraction);
    }, 1);
    return sum + value * weight;
  }, 0);
}

function normalizeWindAngle(angleDeg: number): number {
  const normalized = normalizeHeading(angleDeg);
  return normalized > 180 ? normalized - 360 : normalized;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
