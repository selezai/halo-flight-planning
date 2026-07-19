import { describe, expect, it } from 'vitest';
import { parseFeature } from '@/lib/openaip/featureParser';

describe('OpenAIP feature parser', () => {
  it('parses airport properties from OpenAIP vector tiles', () => {
    const feature = parseFeature({
      sourceLayer: 'airports',
      properties: {
        source_id: 'apt123',
        feature_type: 'airport',
        country: 'ZA',
        name: 'O R Tambo Intl',
        type: 'intl_apt',
        icao_code: 'FAOR',
        iata_code: 'JNB',
        runway_rotation: 32,
        runway_surface: 'paved',
        skydive_activity: false,
        winch_only: false,
      },
      geometry: {
        type: 'Point',
        coordinates: [28.246, -26.133],
      },
    });

    expect(feature.type).toBe('airport');
    expect(feature.sourceId).toBe('apt123');
    expect(feature.icao).toBe('FAOR');
    expect(feature.iata).toBe('JNB');
    expect(feature.airportType).toBe('Intl Apt');
    expect(feature.runwaySurface).toBe('paved');
    expect(feature.coordinates).toEqual([28.246, -26.133]);
  });

  it('parses airspace class, limits, and activation flags from snake_case tile fields', () => {
    const feature = parseFeature({
      sourceLayer: 'airspaces',
      properties: {
        source_id: 'asp456',
        feature_type: 'airspace',
        country: 'ZA',
        name: 'JOHANNESBURG CTR',
        type: 'ctr',
        icao_class: 'd',
        lower_limit_value: 0,
        lower_limit_unit: 'ft',
        lower_limit_reference_datum: 'gnd',
        upper_limit_value: 7500,
        upper_limit_unit: 'ft',
        upper_limit_reference_datum: 'msl',
        by_notam: true,
        on_request: false,
        on_demand: true,
        special_agreement: false,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[[28, -26], [29, -26], [29, -27], [28, -27], [28, -26]]],
      },
    });

    expect(feature.type).toBe('airspace');
    expect(feature.airspaceType).toBe('CTR');
    expect(feature.airspaceClass).toBe('Class D');
    expect(feature.lowerLimit).toBe('GND');
    expect(feature.upperLimit).toBe('7500 ft MSL');
    expect(feature.lowerLimitFt).toBe(0);
    expect(feature.upperLimitFt).toBe(7500);
    expect(feature.activationFlags).toEqual(['On demand', 'By NOTAM']);
    expect(feature.coordinates?.[0]).toBeCloseTo(28.4);
    expect(feature.coordinates?.[1]).toBeCloseTo(-26.4);
  });

  it('formats Core API airspace STD limits as flight levels', () => {
    const feature = parseFeature({
      sourceLayer: 'airspaces',
      properties: {
        _id: '631093afdbb2734cdc9e1b50',
        name: 'JOHANNESBURG SOUTHWEST',
        type: 10,
        icaoClass: 6,
        lowerLimit: {
          value: 110,
          unit: 6,
          referenceDatum: 2,
        },
        upperLimit: {
          value: 195,
          unit: 6,
          referenceDatum: 2,
        },
        activity: 0,
      },
    });

    expect(feature.airspaceType).toBe('FIR');
    expect(feature.airspaceClass).toBe('Class G');
    expect(feature.lowerLimit).toBe('FL110');
    expect(feature.upperLimit).toBe('FL195');
    expect(feature.lowerLimitFt).toBe(11000);
    expect(feature.upperLimitFt).toBe(19500);
    expect(feature.activity).toBeUndefined();
  });

  it('formats Core API airspace MSL feet limits with Core vertical unit codes', () => {
    const feature = parseFeature({
      sourceLayer: 'airspaces',
      properties: {
        _id: 'core-feet-airspace',
        name: 'CTR FAOR',
        type: 4,
        icaoClass: 3,
        lowerLimit: {
          value: 0,
          unit: 1,
          referenceDatum: 0,
        },
        upperLimit: {
          value: 7600,
          unit: 1,
          referenceDatum: 1,
        },
      },
    });

    expect(feature.lowerLimit).toBe('GND');
    expect(feature.upperLimit).toBe('7600 ft MSL');
    expect(feature.lowerLimitFt).toBe(0);
    expect(feature.upperLimitFt).toBe(7600);
  });

  it('converts metric airspace limits to feet for route review', () => {
    const feature = parseFeature({
      sourceLayer: 'airspaces',
      properties: {
        source_id: 'metric-airspace',
        feature_type: 'airspace',
        name: 'Metric Training Area',
        type: 'tra',
        lower_limit_value: 300,
        lower_limit_unit: 'm',
        lower_limit_reference_datum: 'msl',
        upper_limit_value: 1500,
        upper_limit_unit: 'm',
        upper_limit_reference_datum: 'msl',
      },
    });

    expect(feature.lowerLimit).toBe('300 m MSL');
    expect(feature.upperLimit).toBe('1500 m MSL');
    expect(feature.lowerLimitFt).toBe(984);
    expect(feature.upperLimitFt).toBe(4921);
  });

  it('parses obstacles from current OpenAIP tile properties', () => {
    const feature = parseFeature({
      sourceLayer: 'obstacles',
      properties: {
        source_id: 'obs789',
        osm_id: 123456,
        feature_type: 'obstacle',
        country: 'ZA',
        name: 'Tower',
        type: 'wind_turbine',
        elevation_top: 1840,
        height: 95,
      },
      geometry: {
        type: 'Point',
        coordinates: [28.6, -26.4],
      },
    });

    expect(feature.type).toBe('obstacle');
    expect(feature.obstacleType).toBe('Wind Turbine');
    expect(feature.elevationTop).toBe(1840);
    expect(feature.height).toBe(95);
    expect(feature.osmId).toBe(123456);
  });

  it('normalizes enriched Core API navaid detail records', () => {
    const feature = parseFeature({
      sourceLayer: 'navaids',
      properties: {
        _id: '62616da5abdcc7f0ccbc0bdf',
        name: 'LANSERIA',
        identifier: 'LIV',
        type: 4,
        country: 'ZA',
        elevation: {
          value: 1378,
          unit: 0,
          referenceDatum: 1,
        },
        frequency: {
          value: '117.400',
          unit: 0,
        },
        hoursOfOperation: {
          operatingHours: [
            { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', byNotam: false },
            { dayOfWeek: 1, startTime: '00:00', endTime: '00:00', byNotam: false },
            { dayOfWeek: 2, startTime: '00:00', endTime: '00:00', byNotam: false },
            { dayOfWeek: 3, startTime: '00:00', endTime: '00:00', byNotam: false },
            { dayOfWeek: 4, startTime: '00:00', endTime: '00:00', byNotam: false },
            { dayOfWeek: 5, startTime: '00:00', endTime: '00:00', byNotam: false },
            { dayOfWeek: 6, startTime: '00:00', endTime: '00:00', byNotam: false },
          ],
        },
      },
      geometry: {
        type: 'Point',
        coordinates: [27.913513, -25.948784],
      },
    });

    expect(feature.type).toBe('navaid');
    expect(feature.navaidType).toBe('VOR-DME');
    expect(feature.elevation).toBe(1378);
    expect(feature.elevationUnit).toBe('m');
    expect(feature.frequency).toBe('117.400 MHz');
    expect(feature.hoursOfOperation).toBe('Daily 00:00-00:00');
  });

  it('detects RC airfields from camelCase feature_type values', () => {
    const feature = parseFeature({
      properties: {
        source_id: 'rc123',
        feature_type: 'rcAirfield',
        name: 'Model Club',
        electric: true,
        combustion: false,
        turbine: true,
      },
      geometry: {
        type: 'Point',
        coordinates: [30, -25],
      },
    });

    expect(feature.type).toBe('rcAirfield');
    expect(feature.sourceLayer).toBe('rc_airfields');
    expect(feature.electric).toBe(true);
    expect(feature.turbine).toBe(true);
  });
});
