import type { AircraftProfile, RouteAnalysis, TrainingNavLog, TrainingNavLogLeg, TrainingWind } from '@/types/planning';
import { normalizeHeading } from './navigation';

const MIN_GROUND_SPEED_KTS = 30;

export const DEFAULT_TRAINING_WIND: TrainingWind = {
  directionDeg: 0,
  speedKts: 0,
};

export function buildTrainingNavLog(
  route: RouteAnalysis,
  aircraft: AircraftProfile,
  wind: TrainingWind
): TrainingNavLog {
  const normalizedWind = normalizeTrainingWind(wind);
  const legs = route.legs.map((leg): TrainingNavLogLeg => {
    const trueCourseDeg = leg.trueCourseDeg;
    const magneticCourseDeg = leg.magneticCourseDeg;
    const windAngleDeg = normalizeWindAngle(normalizedWind.directionDeg - trueCourseDeg);
    const crosswindKts = normalizedWind.speedKts * Math.sin(toRadians(windAngleDeg));
    const headwindKts = normalizedWind.speedKts * Math.cos(toRadians(windAngleDeg));
    const ratio = clamp(crosswindKts / aircraft.cruiseSpeedKts, -0.95, 0.95);
    const windCorrectionAngleDeg = toDegrees(Math.asin(ratio));
    const trueHeadingDeg = normalizeHeading(trueCourseDeg + windCorrectionAngleDeg);
    const groundSpeedKts = Math.max(
      MIN_GROUND_SPEED_KTS,
      aircraft.cruiseSpeedKts * Math.cos(toRadians(windCorrectionAngleDeg)) - headwindKts
    );
    const estimatedTimeMinutes = (leg.distanceNm / groundSpeedKts) * 60;
    const fuelRequiredGal = (estimatedTimeMinutes / 60) * aircraft.fuelBurnGph;
    const magneticHeadingDeg = normalizeHeading(trueHeadingDeg - aircraft.magneticVariationDeg);
    const compassHeadingDeg = normalizeHeading(magneticHeadingDeg + (aircraft.compassDeviationDeg ?? 0));

    return {
      id: leg.id,
      from: leg.from.ident ?? leg.from.name,
      to: leg.to.ident ?? leg.to.name,
      trueCourseDeg,
      magneticCourseDeg,
      windCorrectionAngleDeg,
      trueHeadingDeg,
      magneticHeadingDeg,
      compassHeadingDeg,
      groundSpeedKts,
      estimatedTimeMinutes,
      fuelRequiredGal,
      formula: `WCA=asin(crosswind/TAS), TH=TC+WCA, MH=TH-var, CH=MH+dev, GS=TAS*cos(WCA)-headwind.`,
    };
  });

  return {
    wind: normalizedWind,
    legs,
    totalTimeMinutes: legs.reduce((sum, leg) => sum + leg.estimatedTimeMinutes, 0),
    totalFuelGal: legs.reduce((sum, leg) => sum + leg.fuelRequiredGal, 0),
  };
}

export function normalizeTrainingWind(wind: TrainingWind): TrainingWind {
  return {
    directionDeg: normalizeHeading(Number.isFinite(wind.directionDeg) ? wind.directionDeg : 0),
    speedKts: clamp(Number.isFinite(wind.speedKts) ? wind.speedKts : 0, 0, 150),
  };
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
