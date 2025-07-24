/**
 * Aviation Mathematics Unit Tests
 * Critical calculations for flight planning safety
 */

import { describe, it, expect } from 'vitest';
import {
  calculateGreatCircleDistance,
  calculateBearing,
  calculateWindTriangle,
  calculateFuelConsumption
} from '../../../src/utils/aviation-calculations.js';

describe('Aviation Mathematics', () => {
  describe('Great Circle Distance Calculations', () => {
    it('should calculate distance between known airports accurately', () => {
      // JFK to LAX - known distance ~2,475 nautical miles
      const jfk = { lat: 40.6413, lon: -73.7781 };
      const lax = { lat: 33.9425, lon: -118.4081 };
      
      const distance = calculateGreatCircleDistance(jfk, lax);
      expect(distance).toBeCloseTo(2475, 1); // Within 1 NM tolerance
    });

    it('should handle same-point calculations', () => {
      const point = { lat: 40.0, lon: -74.0 };
      const distance = calculateGreatCircleDistance(point, point);
      expect(distance).toBe(0);
    });

    it('should handle antipodal points', () => {
      const point1 = { lat: 0, lon: 0 };
      const point2 = { lat: 0, lon: 180 };
      const distance = calculateGreatCircleDistance(point1, point2);
      expect(distance).toBeCloseTo(10800, 10); // Half Earth circumference
    });
  });

  describe('Bearing Calculations', () => {
    it('should calculate true bearing correctly', () => {
      const from = { lat: 40.0, lon: -74.0 };
      const to = { lat: 41.0, lon: -74.0 };
      
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(0, 1); // Due north
    });

    it('should handle eastward bearing', () => {
      const from = { lat: 40.0, lon: -74.0 };
      const to = { lat: 40.0, lon: -73.0 };
      
      const bearing = calculateBearing(from, to);
      expect(bearing).toBeCloseTo(90, 1); // Due east
    });
  });

  describe('Wind Triangle Calculations', () => {
    it('should calculate ground speed with headwind', () => {
      const trueAirspeed = 120; // knots
      const windSpeed = 20; // knots
      const windDirection = 0; // headwind
      const courseDirection = 0;
      
      const result = calculateWindTriangle(
        trueAirspeed,
        windSpeed,
        windDirection,
        courseDirection
      );
      
      expect(result.groundSpeed).toBeCloseTo(100, 1);
      expect(result.windCorrectionAngle).toBeCloseTo(0, 1);
    });

    it('should calculate wind correction angle for crosswind', () => {
      const trueAirspeed = 120; // knots
      const windSpeed = 20; // knots
      const windDirection = 90; // crosswind from right
      const courseDirection = 0; // heading north
      
      const result = calculateWindTriangle(
        trueAirspeed,
        windSpeed,
        windDirection,
        courseDirection
      );
      
      expect(Math.abs(result.windCorrectionAngle)).toBeGreaterThan(5);
      expect(result.groundSpeed).toBeLessThan(trueAirspeed);
    });
  });

  describe('Fuel Consumption Calculations', () => {
    it('should calculate basic fuel consumption', () => {
      const distance = 300; // nautical miles
      const groundSpeed = 120; // knots
      const fuelFlow = 10; // gallons per hour
      
      const fuelRequired = calculateFuelConsumption(
        distance,
        groundSpeed,
        fuelFlow
      );
      
      expect(fuelRequired.flightTime).toBeCloseTo(2.5, 1); // 2.5 hours
      expect(fuelRequired.fuelUsed).toBeCloseTo(25, 1); // 25 gallons
    });

    it('should include fuel reserves', () => {
      const distance = 300;
      const groundSpeed = 120;
      const fuelFlow = 10;
      const reserveMinutes = 45;
      
      const fuelRequired = calculateFuelConsumption(
        distance,
        groundSpeed,
        fuelFlow,
        { reserveMinutes }
      );
      
      const expectedReserve = (reserveMinutes / 60) * fuelFlow;
      expect(fuelRequired.totalFuel).toBeCloseTo(
        fuelRequired.fuelUsed + expectedReserve,
        1
      );
    });

    it('should handle alternate airport fuel planning', () => {
      const distance = 300;
      const alternateDistance = 50;
      const groundSpeed = 120;
      const fuelFlow = 10;
      
      const fuelRequired = calculateFuelConsumption(
        distance,
        groundSpeed,
        fuelFlow,
        { alternateDistance, alternateGroundSpeed: 110 }
      );
      
      expect(fuelRequired.alternateFuel).toBeGreaterThan(0);
      expect(fuelRequired.totalFuel).toBeGreaterThan(fuelRequired.fuelUsed);
    });
  });

  describe('Edge Cases and Safety Validations', () => {
    it('should handle invalid coordinates gracefully', () => {
      const invalidLat = { lat: 91, lon: 0 };
      const validPoint = { lat: 40, lon: -74 };
      
      expect(() => {
        calculateGreatCircleDistance(invalidLat, validPoint);
      }).toThrow('Invalid latitude');
    });

    it('should validate fuel calculation inputs', () => {
      expect(() => {
        calculateFuelConsumption(-100, 120, 10);
      }).toThrow('Distance must be positive');
      
      expect(() => {
        calculateFuelConsumption(100, 0, 10);
      }).toThrow('Ground speed must be positive');
    });

    it('should handle extreme wind conditions', () => {
      const trueAirspeed = 120;
      const windSpeed = 150; // Extreme wind exceeding airspeed
      const windDirection = 180; // Tailwind
      const courseDirection = 0;
      
      const result = calculateWindTriangle(
        trueAirspeed,
        windSpeed,
        windDirection,
        courseDirection
      );
      
      // Should still provide valid calculation
      expect(result.groundSpeed).toBeGreaterThan(0);
      expect(result.windCorrectionAngle).toBeDefined();
    });
  });
});

// Test data fixtures
export const testAirports = {
  KJFK: { lat: 40.6413, lon: -73.7781, elevation: 13 },
  KLAX: { lat: 33.9425, lon: -118.4081, elevation: 125 },
  KORD: { lat: 41.9742, lon: -87.9073, elevation: 672 },
  KDEN: { lat: 39.8561, lon: -104.6737, elevation: 5431 }
};

export const testAircraft = {
  cessna172: {
    cruiseSpeed: 120,
    fuelFlow: 9.5,
    fuelCapacity: 56,
    serviceceiling: 14000
  },
  cirrusSR22: {
    cruiseSpeed: 183,
    fuelFlow: 17.5,
    fuelCapacity: 94,
    serviceceiling: 17500
  }
};
