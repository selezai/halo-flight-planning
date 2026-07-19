import type {
  AircraftProfile,
  AircraftWeightBalanceConfig,
  PersonalMinimums,
  WeightBalanceLoading,
} from '@/types/planning';

export const DEFAULT_PERSONAL_MINIMUMS: PersonalMinimums = {
  minimumCeilingFt: 2500,
  minimumVisibilitySm: 6,
  minimumFuelReserveMinutes: 45,
  maxSurfaceWindKts: 25,
  maxCrosswindKts: 15,
};

export const PRESET_AIRCRAFT: AircraftProfile[] = [
  {
    id: 'c172s',
    registration: 'ZS-C172',
    type: 'C172S',
    name: 'Cessna 172S Skyhawk',
    cruiseSpeedKts: 120,
    fuelBurnGph: 9.5,
    usableFuelGal: 53,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'pa28-181',
    registration: 'ZS-PA28',
    type: 'PA-28-181',
    name: 'Piper Archer III',
    cruiseSpeedKts: 125,
    fuelBurnGph: 10.5,
    usableFuelGal: 48,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'c182t',
    registration: 'ZS-C182',
    type: 'C182T',
    name: 'Cessna 182T Skylane',
    cruiseSpeedKts: 145,
    fuelBurnGph: 13.5,
    usableFuelGal: 87,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'sr22',
    registration: 'ZS-SR22',
    type: 'SR22',
    name: 'Cirrus SR22',
    cruiseSpeedKts: 175,
    fuelBurnGph: 17.5,
    usableFuelGal: 81,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'da40',
    registration: 'ZS-DA40',
    type: 'DA40',
    name: 'Diamond DA40',
    cruiseSpeedKts: 135,
    fuelBurnGph: 8.8,
    usableFuelGal: 39,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'be36',
    registration: 'ZS-BE36',
    type: 'BE36',
    name: 'Beechcraft Bonanza A36',
    cruiseSpeedKts: 165,
    fuelBurnGph: 15.5,
    usableFuelGal: 74,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'tbm960',
    registration: 'ZS-TBM',
    type: 'TBM 960',
    name: 'Daher TBM 960',
    cruiseSpeedKts: 315,
    fuelBurnGph: 58,
    usableFuelGal: 291,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'pc12',
    registration: 'ZS-PC12',
    type: 'PC-12',
    name: 'Pilatus PC-12',
    cruiseSpeedKts: 260,
    fuelBurnGph: 55,
    usableFuelGal: 402,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'c208',
    registration: 'ZS-C208',
    type: 'C208B',
    name: 'Cessna Grand Caravan',
    cruiseSpeedKts: 175,
    fuelBurnGph: 48,
    usableFuelGal: 335,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
  {
    id: 'rv7',
    registration: 'ZS-RV7',
    type: 'RV-7',
    name: "Van's RV-7",
    cruiseSpeedKts: 165,
    fuelBurnGph: 8.5,
    usableFuelGal: 42,
    reserveMinutes: 45,
    contingencyPercent: 10,
    magneticVariationDeg: -24,
  },
];

export const DEFAULT_AIRCRAFT = PRESET_AIRCRAFT[0];

export function clampAircraftProfile(profile: AircraftProfile): AircraftProfile {
  const weightBalance = profile.weightBalance ? clampWeightBalanceConfig(profile.weightBalance) : undefined;

  return {
    ...profile,
    cruiseSpeedKts: clampNumber(profile.cruiseSpeedKts, 40, 450),
    fuelBurnGph: clampNumber(profile.fuelBurnGph, 1, 200),
    usableFuelGal: clampNumber(profile.usableFuelGal, 1, 600),
    reserveMinutes: clampNumber(profile.reserveMinutes, 30, 180),
    contingencyPercent: clampNumber(profile.contingencyPercent, 0, 40),
    magneticVariationDeg: clampNumber(profile.magneticVariationDeg, -40, 40),
    weightBalance,
    weightBalanceLoading: weightBalance
      ? clampWeightBalanceLoading(profile.weightBalanceLoading, weightBalance)
      : undefined,
  };
}

export function clampPersonalMinimums(minimums: PersonalMinimums): PersonalMinimums {
  return {
    minimumCeilingFt: clampNumber(minimums.minimumCeilingFt, 0, 10000),
    minimumVisibilitySm: clampNumber(minimums.minimumVisibilitySm, 0, 20),
    minimumFuelReserveMinutes: clampNumber(minimums.minimumFuelReserveMinutes, 30, 180),
    maxSurfaceWindKts: clampNumber(minimums.maxSurfaceWindKts, 0, 80),
    maxCrosswindKts: clampNumber(minimums.maxCrosswindKts, 0, 50),
  };
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampOptionalNumber(value: number | undefined, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  return clampNumber(value, min, max);
}

function clampWeightBalanceConfig(config: AircraftWeightBalanceConfig): AircraftWeightBalanceConfig {
  return {
    ...config,
    emptyWeightLb: clampNumber(config.emptyWeightLb, 0, 100000),
    emptyArmIn: clampNumber(config.emptyArmIn, 0, 1000),
    maxRampWeightLb: clampOptionalNumber(config.maxRampWeightLb, 0, 100000),
    maxTakeoffWeightLb: clampNumber(config.maxTakeoffWeightLb, 0, 100000),
    maxLandingWeightLb: clampOptionalNumber(config.maxLandingWeightLb, 0, 100000),
    fuelArmIn: clampNumber(config.fuelArmIn, 0, 1000),
    fuelWeightLbPerGal: clampNumber(config.fuelWeightLbPerGal, 1, 10),
    stations: config.stations.map((station) => ({
      ...station,
      label: station.label.slice(0, 80),
      armIn: clampNumber(station.armIn, 0, 1000),
      maxWeightLb: clampOptionalNumber(station.maxWeightLb, 0, 10000),
    })),
    envelope: config.envelope.map((point) => ({
      weightLb: clampNumber(point.weightLb, 0, 100000),
      forwardArmIn: clampNumber(point.forwardArmIn, 0, 1000),
      aftArmIn: clampNumber(point.aftArmIn, 0, 1000),
    })),
    notes: config.notes?.slice(0, 1000),
  };
}

function clampWeightBalanceLoading(
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
