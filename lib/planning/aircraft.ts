import type { AircraftProfile, PersonalMinimums, WeightBalanceConfig } from '@/types/planning';
import { createDefaultWeightBalanceConfig } from './weightBalance';

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
    compassDeviationDeg: 0,
    glideRatio: 9,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 9,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 9,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 9.5,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 10,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 9,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 12,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 11,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 9,
    weightBalance: createDefaultWeightBalanceConfig(),
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
    compassDeviationDeg: 0,
    glideRatio: 9,
    weightBalance: createDefaultWeightBalanceConfig(),
  },
];

export const DEFAULT_AIRCRAFT = PRESET_AIRCRAFT[0];

export function clampAircraftProfile(profile: AircraftProfile): AircraftProfile {
  return {
    ...profile,
    cruiseSpeedKts: clampNumber(profile.cruiseSpeedKts, 40, 450),
    fuelBurnGph: clampNumber(profile.fuelBurnGph, 1, 200),
    usableFuelGal: clampNumber(profile.usableFuelGal, 1, 600),
    reserveMinutes: clampNumber(profile.reserveMinutes, 30, 180),
    contingencyPercent: clampNumber(profile.contingencyPercent, 0, 40),
    magneticVariationDeg: clampNumber(profile.magneticVariationDeg, -40, 40),
    compassDeviationDeg: clampNumber(profile.compassDeviationDeg ?? 0, -30, 30),
    glideRatio: clampNumber(profile.glideRatio ?? 9, 5, 30),
    weightBalance: clampWeightBalanceConfig(profile.weightBalance),
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

function clampWeightBalanceConfig(config: WeightBalanceConfig | undefined): WeightBalanceConfig {
  const fallback = createDefaultWeightBalanceConfig();
  if (!config) return fallback;

  return {
    units: 'imperial',
    setupStatus: config.setupStatus === 'configured' ? 'configured' : 'needs-poh',
    emptyWeightLb: clampOptional(config.emptyWeightLb, 1, 20000),
    emptyArmIn: clampOptional(config.emptyArmIn, 1, 300),
    maxRampWeightLb: clampOptional(config.maxRampWeightLb, 1, 25000),
    maxTakeoffWeightLb: clampOptional(config.maxTakeoffWeightLb, 1, 25000),
    maxLandingWeightLb: clampOptional(config.maxLandingWeightLb, 1, 25000),
    fuel: {
      weightPerGalLb: clampNumber(config.fuel?.weightPerGalLb ?? fallback.fuel.weightPerGalLb, 4, 8),
      armIn: clampOptional(config.fuel?.armIn, 1, 300),
      taxiFuelGal: clampOptional(config.fuel?.taxiFuelGal, 0, 20),
    },
    stations: (config.stations?.length ? config.stations : fallback.stations).map((station, index) => ({
      id: station.id || `station-${index + 1}`,
      name: station.name || 'Station',
      armIn: clampOptional(station.armIn, 1, 300),
      maxWeightLb: clampOptional(station.maxWeightLb, 0, 5000),
    })),
    envelope: (config.envelope ?? []).map((point) => ({
      weightLb: clampNumber(point.weightLb, 1, 25000),
      forwardArmIn: clampNumber(point.forwardArmIn, 1, 300),
      aftArmIn: clampNumber(point.aftArmIn, 1, 300),
    })),
  };
}

function clampOptional(value: number | undefined, min: number, max: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}
