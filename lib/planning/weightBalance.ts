import type {
  AircraftProfile,
  AircraftWeightBalanceConfig,
  RouteAnalysis,
  WeightBalanceEnvelopePoint,
  WeightBalanceLoading,
  WeightBalancePhaseResult,
  WeightBalanceResult,
  WeightBalanceStatus,
  WeightBalanceStation,
} from '@/types/planning';

const DEFAULT_FUEL_WEIGHT_LB_PER_GAL = 6;
const ARM_CAUTION_MARGIN_IN = 0.5;
const WEIGHT_CAUTION_RATIO = 0.02;

export function createDefaultWeightBalanceConfig(): AircraftWeightBalanceConfig {
  return {
    emptyWeightLb: 0,
    emptyArmIn: 0,
    maxRampWeightLb: 0,
    maxTakeoffWeightLb: 0,
    maxLandingWeightLb: 0,
    fuelArmIn: 0,
    fuelWeightLbPerGal: DEFAULT_FUEL_WEIGHT_LB_PER_GAL,
    stations: [
      { id: 'front-seats', label: 'Front seats', armIn: 0 },
      { id: 'rear-seats', label: 'Rear seats', armIn: 0 },
      { id: 'baggage', label: 'Baggage', armIn: 0 },
    ],
    envelope: [
      { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 },
      { weightLb: 0, forwardArmIn: 0, aftArmIn: 0 },
    ],
    notes: '',
  };
}

export function createDefaultWeightBalanceLoading(
  config: AircraftWeightBalanceConfig
): WeightBalanceLoading {
  return {
    fuelGallons: 0,
    taxiFuelGallons: 0,
    stationWeightsLb: Object.fromEntries(config.stations.map((station) => [station.id, 0])),
  };
}

export function calculateWeightBalance(
  aircraft: AircraftProfile,
  route?: RouteAnalysis
): WeightBalanceResult {
  const config = aircraft.weightBalance;
  if (!config) {
    return {
      status: 'unconfigured',
      phases: [],
      messages: ['Weight and balance is not configured. Enter aircraft POH/AFM arms and envelope before using W&B operationally.'],
    };
  }

  const configMessages = validateWeightBalanceConfig(config);
  if (configMessages.length > 0) {
    return {
      status: 'incomplete',
      phases: [],
      messages: configMessages,
    };
  }

  const loading = normalizeLoading(aircraft.weightBalanceLoading, config);
  const phaseInputs = buildPhaseInputs(config, loading, route);
  const phases = phaseInputs.map((phaseInput) => calculatePhase(config, loading, phaseInput));
  const messages = [
    ...phases.flatMap((phase) => phase.messages),
    ...stationLimitMessages(config.stations, loading),
  ];

  return {
    status: worstStatus([...phases.map((phase) => phase.status), ...stationStatuses(config.stations, loading)]),
    phases,
    messages,
  };
}

export function interpolateEnvelopeLimits(
  envelope: WeightBalanceEnvelopePoint[],
  weightLb: number
): { forwardLimitIn: number; aftLimitIn: number } | null {
  const sorted = [...envelope]
    .filter((point) => isPositive(point.weightLb) && isPositive(point.forwardArmIn) && isPositive(point.aftArmIn))
    .sort((a, b) => a.weightLb - b.weightLb);

  if (sorted.length < 2) return null;
  if (weightLb < sorted[0].weightLb || weightLb > sorted[sorted.length - 1].weightLb) return null;

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const lower = sorted[index];
    const upper = sorted[index + 1];

    if (weightLb >= lower.weightLb && weightLb <= upper.weightLb) {
      const span = upper.weightLb - lower.weightLb;
      const ratio = span === 0 ? 0 : (weightLb - lower.weightLb) / span;
      return {
        forwardLimitIn: lower.forwardArmIn + (upper.forwardArmIn - lower.forwardArmIn) * ratio,
        aftLimitIn: lower.aftArmIn + (upper.aftArmIn - lower.aftArmIn) * ratio,
      };
    }
  }

  return null;
}

export function formatWeightBalanceStatus(status: WeightBalanceStatus): string {
  const labels: Record<WeightBalanceStatus, string> = {
    unconfigured: 'Needs POH setup',
    incomplete: 'Incomplete',
    'within-limits': 'Within limits',
    caution: 'Caution',
    'out-of-limits': 'Out of limits',
  };

  return labels[status];
}

function validateWeightBalanceConfig(config: AircraftWeightBalanceConfig): string[] {
  const messages: string[] = [];

  if (!isPositive(config.emptyWeightLb)) messages.push('Empty weight is required.');
  if (!isPositive(config.emptyArmIn)) messages.push('Empty arm is required.');
  if (!isPositive(config.maxTakeoffWeightLb)) messages.push('Maximum takeoff weight is required.');
  if (!isPositive(config.fuelArmIn)) messages.push('Fuel arm is required.');
  if (!isPositive(config.fuelWeightLbPerGal)) messages.push('Fuel weight per gallon is required.');
  if (config.stations.length === 0) messages.push('At least one loading station is required.');
  if (config.stations.some((station) => !station.id.trim())) {
    messages.push('Each station needs a stable id.');
  }
  if (new Set(config.stations.map((station) => station.id)).size !== config.stations.length) {
    messages.push('Station ids must be unique.');
  }
  if (config.stations.some((station) => !station.label.trim() || !isPositive(station.armIn))) {
    messages.push('Each station needs a label and arm.');
  }
  if (config.envelope.length < 2) {
    messages.push('At least two CG envelope points are required.');
  }
  if (config.envelope.some((point) => !isPositive(point.weightLb) || !isPositive(point.forwardArmIn) || !isPositive(point.aftArmIn))) {
    messages.push('Each CG envelope point needs weight, forward arm, and aft arm.');
  }
  if (config.envelope.some((point) => point.forwardArmIn > point.aftArmIn)) {
    messages.push('Each CG envelope point forward arm must be less than or equal to aft arm.');
  }

  return messages;
}

function normalizeLoading(
  loading: WeightBalanceLoading | undefined,
  config: AircraftWeightBalanceConfig
): WeightBalanceLoading {
  return {
    fuelGallons: clampNumber(loading?.fuelGallons ?? 0, 0, 1000),
    taxiFuelGallons: clampNumber(loading?.taxiFuelGallons ?? 0, 0, 1000),
    stationWeightsLb: Object.fromEntries(
      config.stations.map((station) => [
        station.id,
        clampNumber(loading?.stationWeightsLb?.[station.id] ?? 0, 0, 10000),
      ])
    ),
  };
}

function buildPhaseInputs(
  config: AircraftWeightBalanceConfig,
  loading: WeightBalanceLoading,
  route?: RouteAnalysis
) {
  const taxiFuelGallons = Math.min(loading.taxiFuelGallons, loading.fuelGallons);
  const takeoffFuelGallons = Math.max(0, loading.fuelGallons - taxiFuelGallons);
  const tripFuelGallons = route?.summary.tripFuelGal ?? 0;
  const landingFuelGallons = Math.max(0, takeoffFuelGallons - tripFuelGallons);
  const landingFuelShortfallGallons = Math.max(0, tripFuelGallons - takeoffFuelGallons);
  const maxRampWeightLb = isPositive(config.maxRampWeightLb) ? config.maxRampWeightLb : config.maxTakeoffWeightLb;
  const maxLandingWeightLb = isPositive(config.maxLandingWeightLb) ? config.maxLandingWeightLb : config.maxTakeoffWeightLb;

  return [
    { phase: 'ramp' as const, fuelGallons: loading.fuelGallons, maxWeightLb: maxRampWeightLb },
    { phase: 'takeoff' as const, fuelGallons: takeoffFuelGallons, maxWeightLb: config.maxTakeoffWeightLb },
    {
      phase: 'landing' as const,
      fuelGallons: landingFuelGallons,
      maxWeightLb: maxLandingWeightLb,
      fuelShortfallGallons: landingFuelShortfallGallons,
    },
  ];
}

function calculatePhase(
  config: AircraftWeightBalanceConfig,
  loading: WeightBalanceLoading,
  input: {
    phase: WeightBalancePhaseResult['phase'];
    fuelGallons: number;
    maxWeightLb?: number;
    fuelShortfallGallons?: number;
  }
): WeightBalancePhaseResult {
  const emptyMoment = config.emptyWeightLb * config.emptyArmIn;
  const stationMoment = config.stations.reduce(
    (sum, station) => sum + ((loading.stationWeightsLb[station.id] ?? 0) * station.armIn),
    0
  );
  const stationWeight = config.stations.reduce((sum, station) => sum + (loading.stationWeightsLb[station.id] ?? 0), 0);
  const fuelWeight = input.fuelGallons * config.fuelWeightLbPerGal;
  const fuelMoment = fuelWeight * config.fuelArmIn;
  const weightLb = config.emptyWeightLb + stationWeight + fuelWeight;
  const momentLbIn = emptyMoment + stationMoment + fuelMoment;
  const armIn = weightLb > 0 ? momentLbIn / weightLb : undefined;
  const envelopeLimits = interpolateEnvelopeLimits(config.envelope, weightLb);
  const messages: string[] = [];
  const maxWeightLb = input.maxWeightLb && input.maxWeightLb > 0 ? input.maxWeightLb : undefined;
  let status: WeightBalanceStatus = 'within-limits';

  if (input.fuelShortfallGallons && input.fuelShortfallGallons > 0) {
    status = 'out-of-limits';
    messages.push(`${formatPhase(input.phase)} fuel state is short by ${input.fuelShortfallGallons.toFixed(1)} gal before reserve/contingency.`);
  }

  if (!armIn || !envelopeLimits) {
    status = 'out-of-limits';
    messages.push(`${formatPhase(input.phase)} weight is outside the configured CG envelope weight range.`);
  } else {
    const forwardMargin = armIn - envelopeLimits.forwardLimitIn;
    const aftMargin = envelopeLimits.aftLimitIn - armIn;

    if (forwardMargin < 0 || aftMargin < 0) {
      status = 'out-of-limits';
      messages.push(`${formatPhase(input.phase)} CG is outside the configured envelope.`);
    } else if (forwardMargin <= ARM_CAUTION_MARGIN_IN || aftMargin <= ARM_CAUTION_MARGIN_IN) {
      status = status === 'out-of-limits' ? status : 'caution';
      messages.push(`${formatPhase(input.phase)} CG is within ${ARM_CAUTION_MARGIN_IN.toFixed(1)} in of an envelope limit.`);
    }
  }

  if (maxWeightLb && weightLb > maxWeightLb) {
    status = 'out-of-limits';
    messages.push(`${formatPhase(input.phase)} weight exceeds maximum ${Math.round(maxWeightLb)} lb.`);
  } else if (maxWeightLb && maxWeightLb - weightLb <= maxWeightLb * WEIGHT_CAUTION_RATIO) {
    status = status === 'out-of-limits' ? status : 'caution';
    messages.push(`${formatPhase(input.phase)} weight is within 2% of maximum ${Math.round(maxWeightLb)} lb.`);
  }

  return {
    phase: input.phase,
    status,
    weightLb,
    armIn,
    momentLbIn,
    forwardLimitIn: envelopeLimits?.forwardLimitIn,
    aftLimitIn: envelopeLimits?.aftLimitIn,
    maxWeightLb,
    messages,
  };

}

function stationLimitMessages(
  stations: WeightBalanceStation[],
  loading: WeightBalanceLoading
): string[] {
  const messages = stations.flatMap((station) => {
    const weight = loading.stationWeightsLb[station.id] ?? 0;
    if (station.maxWeightLb && weight > station.maxWeightLb) {
      return [`${station.label} exceeds station limit ${Math.round(station.maxWeightLb)} lb.`];
    }
    return [];
  });
  return messages;
}

function stationStatuses(
  stations: WeightBalanceStation[],
  loading: WeightBalanceLoading
): WeightBalanceStatus[] {
  return stations.map((station) => {
    const weight = loading.stationWeightsLb[station.id] ?? 0;
    return station.maxWeightLb && weight > station.maxWeightLb ? 'out-of-limits' : 'within-limits';
  });
}

function worstStatus(statuses: WeightBalanceStatus[]): WeightBalanceStatus {
  if (statuses.includes('out-of-limits')) return 'out-of-limits';
  if (statuses.includes('incomplete')) return 'incomplete';
  if (statuses.includes('unconfigured')) return 'unconfigured';
  if (statuses.includes('caution')) return 'caution';
  return 'within-limits';
}

function formatPhase(phase: WeightBalancePhaseResult['phase']) {
  if (phase === 'ramp') return 'Ramp';
  if (phase === 'takeoff') return 'Takeoff';
  return 'Landing';
}

function isPositive(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
