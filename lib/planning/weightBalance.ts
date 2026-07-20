import type {
  AircraftProfile,
  WeightBalanceConfig,
  WeightBalanceEnvelopePoint,
  WeightBalanceLoading,
  WeightBalanceResult,
  WeightBalanceStateResult,
  WeightBalanceStatus,
} from '@/types/planning';

const DEFAULT_FUEL_WEIGHT_PER_GAL_LB = 6;
const DEFAULT_TAXI_FUEL_GAL = 1;
const CAUTION_ARM_MARGIN_IN = 0.5;
const CAUTION_WEIGHT_MARGIN_LB = 50;

export const DEFAULT_WEIGHT_BALANCE_LOADING: WeightBalanceLoading = {
  fuelGal: 0,
  stationWeights: {},
};

export function createDefaultWeightBalanceConfig(): WeightBalanceConfig {
  return {
    units: 'imperial',
    setupStatus: 'needs-poh',
    fuel: {
      weightPerGalLb: DEFAULT_FUEL_WEIGHT_PER_GAL_LB,
      taxiFuelGal: DEFAULT_TAXI_FUEL_GAL,
    },
    stations: [
      { id: 'front-seats', name: 'Front seats' },
      { id: 'rear-seats', name: 'Rear seats' },
      { id: 'baggage', name: 'Baggage' },
    ],
    envelope: [],
  };
}

export function calculateWeightBalance(params: {
  aircraft: AircraftProfile;
  loading: WeightBalanceLoading;
  tripFuelGal?: number;
}): WeightBalanceResult {
  const config = params.aircraft.weightBalance;
  if (!config || config.setupStatus !== 'configured' || config.envelope.length < 2) {
    return {
      status: 'unconfigured',
      message: 'W&B needs aircraft-specific POH/AFM setup before Halo can verify CG limits.',
      issues: ['Enter empty weight, empty arm, fuel arm, max weights, station arms, and CG envelope points from the aircraft POH/AFM.'],
    };
  }

  const configIssues = validateConfig(config);
  const loadingIssues = validateLoading(config, params.loading, params.aircraft.usableFuelGal);
  if (configIssues.length > 0 || loadingIssues.length > 0) {
    return {
      status: 'incomplete',
      message: 'W&B setup or loading is incomplete.',
      issues: [...configIssues, ...loadingIssues],
    };
  }

  const rampFuelGal = clampNonNegative(params.loading.fuelGal);
  const taxiFuelGal = Math.min(rampFuelGal, clampNonNegative(config.fuel.taxiFuelGal ?? DEFAULT_TAXI_FUEL_GAL));
  const takeoffFuelGal = Math.max(0, rampFuelGal - taxiFuelGal);
  const plannedTripFuelGal = clampNonNegative(params.tripFuelGal ?? 0);
  const landingFuelGal = Math.max(
    0,
    Math.min(
      takeoffFuelGal,
      params.loading.landingFuelGal ?? Math.max(0, takeoffFuelGal - plannedTripFuelGal)
    )
  );

  const ramp = calculateState('ramp', config, params.loading, rampFuelGal, config.maxRampWeightLb);
  const takeoff = calculateState('takeoff', config, params.loading, takeoffFuelGal, config.maxTakeoffWeightLb);
  const landing = calculateState('landing', config, params.loading, landingFuelGal, config.maxLandingWeightLb);
  const fuelIssues = plannedTripFuelGal > takeoffFuelGal
    ? [`Planned trip fuel (${plannedTripFuelGal.toFixed(1)} gal) exceeds loaded takeoff fuel after taxi (${takeoffFuelGal.toFixed(1)} gal).`]
    : [];
  const stateIssues = [
    ...[ramp, takeoff, landing].flatMap((state) => stateIssuesFor(state)),
    ...fuelIssues,
  ];
  const caution = [ramp, takeoff, landing].some(isCautionState);
  const status: WeightBalanceStatus = stateIssues.length
    ? 'out-of-limits'
    : caution
      ? 'caution'
      : 'within-limits';

  return {
    status,
    message: formatWeightBalanceMessage(status, ramp, takeoff, landing),
    ramp,
    takeoff,
    landing,
    issues: stateIssues,
    calculatedAt: new Date().toISOString(),
  };
}

export function interpolateEnvelopeLimits(
  envelope: WeightBalanceEnvelopePoint[],
  weightLb: number
): { forwardArmIn: number; aftArmIn: number } | null {
  const points = normalizeEnvelope(envelope);
  if (points.length < 2 || !Number.isFinite(weightLb)) return null;

  if (weightLb < points[0].weightLb || weightLb > points[points.length - 1].weightLb) {
    return null;
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if (weightLb < start.weightLb || weightLb > end.weightLb) continue;

    const span = end.weightLb - start.weightLb;
    const progress = span === 0 ? 0 : (weightLb - start.weightLb) / span;
    return {
      forwardArmIn: interpolate(start.forwardArmIn, end.forwardArmIn, progress),
      aftArmIn: interpolate(start.aftArmIn, end.aftArmIn, progress),
    };
  }

  return null;
}

export function getWeightBalanceStatusLabel(status: WeightBalanceStatus): string {
  const labels: Record<WeightBalanceStatus, string> = {
    unconfigured: 'Needs POH setup',
    incomplete: 'Incomplete',
    'within-limits': 'Within limits',
    caution: 'Near limit',
    'out-of-limits': 'Out of limits',
  };
  return labels[status];
}

function calculateState(
  label: WeightBalanceStateResult['label'],
  config: WeightBalanceConfig,
  loading: WeightBalanceLoading,
  fuelGal: number,
  maxWeightLb: number | undefined
): WeightBalanceStateResult {
  const emptyWeightLb = config.emptyWeightLb ?? 0;
  const emptyArmIn = config.emptyArmIn ?? 0;
  const fuelWeightLb = fuelGal * config.fuel.weightPerGalLb;
  const fuelMomentLbIn = fuelWeightLb * (config.fuel.armIn ?? 0);
  const stationTotals = config.stations.reduce(
    (sum, station) => {
      const weightLb = clampNonNegative(loading.stationWeights[station.id] ?? 0);
      const armIn = station.armIn ?? 0;
      return {
        weightLb: sum.weightLb + weightLb,
        momentLbIn: sum.momentLbIn + weightLb * armIn,
      };
    },
    { weightLb: 0, momentLbIn: 0 }
  );
  const weightLb = emptyWeightLb + fuelWeightLb + stationTotals.weightLb;
  const momentLbIn = emptyWeightLb * emptyArmIn + fuelMomentLbIn + stationTotals.momentLbIn;
  const armIn = weightLb > 0 ? momentLbIn / weightLb : 0;
  const limits = interpolateEnvelopeLimits(config.envelope, weightLb);
  const withinEnvelope = Boolean(limits && armIn >= limits.forwardArmIn && armIn <= limits.aftArmIn);
  const withinWeight = typeof maxWeightLb === 'number' ? weightLb <= maxWeightLb : true;
  const marginIn = limits
    ? Math.min(armIn - limits.forwardArmIn, limits.aftArmIn - armIn)
    : undefined;
  const marginWeightLb = typeof maxWeightLb === 'number' ? maxWeightLb - weightLb : undefined;

  return {
    label,
    weightLb,
    armIn,
    momentLbIn,
    forwardLimitIn: limits?.forwardArmIn,
    aftLimitIn: limits?.aftArmIn,
    maxWeightLb,
    withinEnvelope,
    withinWeight,
    marginIn,
    marginWeightLb,
  };
}

function validateConfig(config: WeightBalanceConfig): string[] {
  const issues: string[] = [];
  if (!isPositive(config.emptyWeightLb)) issues.push('Empty weight is required.');
  if (!isPositive(config.emptyArmIn)) issues.push('Empty arm is required.');
  if (!isPositive(config.fuel.armIn)) issues.push('Fuel arm is required.');
  if (!isPositive(config.fuel.weightPerGalLb)) issues.push('Fuel weight per gallon is required.');
  if (!isPositive(config.maxTakeoffWeightLb)) issues.push('Max takeoff weight is required.');
  if (!isPositive(config.maxLandingWeightLb)) issues.push('Max landing weight is required.');
  if (config.envelope.length < 2) issues.push('At least two CG envelope points are required.');
  if (config.envelope.some((point) => !isPositive(point.weightLb) || !isPositive(point.forwardArmIn) || !isPositive(point.aftArmIn))) {
    issues.push('Every CG envelope point needs weight, forward arm, and aft arm.');
  }
  if (config.envelope.some((point) => point.forwardArmIn > point.aftArmIn)) {
    issues.push('CG envelope forward arm cannot exceed aft arm.');
  }
  if (config.stations.length === 0) issues.push('At least one loading station is required.');
  if (config.stations.some((station) => !station.name.trim() || !isPositive(station.armIn))) {
    issues.push('Every loading station needs a name and arm.');
  }
  return Array.from(new Set(issues));
}

function validateLoading(
  config: WeightBalanceConfig,
  loading: WeightBalanceLoading,
  usableFuelGal: number
): string[] {
  const issues: string[] = [];
  if (loading.fuelGal < 0) issues.push('Fuel load cannot be negative.');
  if (loading.fuelGal > usableFuelGal) issues.push('Fuel load exceeds selected aircraft usable fuel.');

  for (const station of config.stations) {
    const weight = loading.stationWeights[station.id] ?? 0;
    if (weight < 0) issues.push(`${station.name} weight cannot be negative.`);
    if (typeof station.maxWeightLb === 'number' && weight > station.maxWeightLb) {
      issues.push(`${station.name} exceeds station max weight.`);
    }
  }

  return Array.from(new Set(issues));
}

function stateIssuesFor(state: WeightBalanceStateResult): string[] {
  const issues: string[] = [];
  if (!state.withinEnvelope) {
    if (state.forwardLimitIn === undefined || state.aftLimitIn === undefined) {
      issues.push(`${capitalize(state.label)} weight is outside the configured CG envelope weight range.`);
    } else {
      issues.push(`${capitalize(state.label)} CG is outside envelope limits.`);
    }
  }
  if (!state.withinWeight) {
    issues.push(`${capitalize(state.label)} weight exceeds maximum allowed weight.`);
  }
  return issues;
}

function isCautionState(state: WeightBalanceStateResult): boolean {
  return (
    state.withinEnvelope &&
    state.withinWeight &&
    (
      (typeof state.marginIn === 'number' && state.marginIn <= CAUTION_ARM_MARGIN_IN) ||
      (typeof state.marginWeightLb === 'number' && state.marginWeightLb <= CAUTION_WEIGHT_MARGIN_LB)
    )
  );
}

function formatWeightBalanceMessage(
  status: WeightBalanceStatus,
  ramp: WeightBalanceStateResult,
  takeoff: WeightBalanceStateResult,
  landing: WeightBalanceStateResult
): string {
  if (status === 'out-of-limits') {
    return 'W&B is out of limits. Adjust loading or aircraft setup before dispatch.';
  }
  if (status === 'caution') {
    return 'W&B is within limits but near a CG or maximum-weight boundary.';
  }
  return `W&B within limits. Ramp ${formatWeight(ramp.weightLb)} @ ${formatArm(ramp.armIn)}, takeoff ${formatWeight(takeoff.weightLb)} @ ${formatArm(takeoff.armIn)}, landing ${formatWeight(landing.weightLb)} @ ${formatArm(landing.armIn)}.`;
}

function normalizeEnvelope(envelope: WeightBalanceEnvelopePoint[]): WeightBalanceEnvelopePoint[] {
  return [...envelope]
    .filter((point) =>
      Number.isFinite(point.weightLb) &&
      Number.isFinite(point.forwardArmIn) &&
      Number.isFinite(point.aftArmIn)
    )
    .sort((a, b) => a.weightLb - b.weightLb);
}

function isPositive(value: number | undefined): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clampNonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function interpolate(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatWeight(value: number): string {
  return `${Math.round(value)} lb`;
}

function formatArm(value: number): string {
  return `${value.toFixed(2)} in`;
}
