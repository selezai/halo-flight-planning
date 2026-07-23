import { describe, expect, it } from 'vitest';
import { buildClickedFeatureStackKey } from '@/lib/ui/featureDetails';
import type { ParsedFeature } from '@/types/openaip';

describe('feature detail helpers', () => {
  it('builds a stable key for the clicked feature stack', () => {
    const airspace: ParsedFeature = {
      type: 'airspace',
      sourceId: 'airspace-1',
      name: 'Johannesburg TMA',
    };
    const airport: ParsedFeature = {
      type: 'airport',
      sourceId: 'airport-1',
      icao: 'FAOR',
      name: 'O.R. Tambo International',
    };

    expect(buildClickedFeatureStackKey([airspace, airport])).toBe('airspace:airspace-1|airport:airport-1');
    expect(buildClickedFeatureStackKey([airport, airspace])).toBe('airport:airport-1|airspace:airspace-1');
    expect(buildClickedFeatureStackKey([])).toBe('');
  });
});
