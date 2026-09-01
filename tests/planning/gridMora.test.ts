import { describe, expect, it } from 'vitest';
import {
  buildDefaultGridMoraReview,
  buildGridMoraRouteSignature,
  reviewGridMoraForRoute,
  type GridMoraProvider,
} from '@/lib/planning/gridMora';
import type { Waypoint } from '@/types/planning';

const faor: Waypoint = {
  id: 'faor',
  type: 'airport',
  ident: 'FAOR',
  name: 'O.R. Tambo',
  coordinates: [28.246, -26.1337],
};

const fala: Waypoint = {
  id: 'fala',
  type: 'airport',
  ident: 'FALA',
  name: 'Lanseria',
  coordinates: [27.9261, -25.9385],
};

describe('Grid MORA review', () => {
  it('requires a route before checking Grid MORA', () => {
    const review = buildDefaultGridMoraReview([faor]);

    expect(review.status).toBe('needs-route');
    expect(review.cells).toEqual([]);
  });

  it('does not derive official-looking Grid MORA when no provider is configured', () => {
    const review = buildDefaultGridMoraReview([faor, fala]);

    expect(review.status).toBe('provider-not-configured');
    expect(review.source).toBe('unavailable');
    expect(review.cells).toEqual([]);
    expect(review.message).toContain('licensed SACAA/ATNS');
  });

  it('returns provider-backed route cells with a stable route signature', async () => {
    const provider: GridMoraProvider = {
      source: 'south-africa-official',
      sourceUrl: 'https://example.test/grid-mora',
      loadRouteCells: async () => [
        {
          id: 'cell-1',
          label: '2628S',
          moraFt: 7600,
          bounds: [[28, -26], [29, -27]],
          accuracy: 'normal',
          source: 'south-africa-official',
        },
      ],
    };

    const review = await reviewGridMoraForRoute([faor, fala], provider);

    expect(review.status).toBe('complete');
    expect(review.source).toBe('south-africa-official');
    expect(review.routeSignature).toBe(buildGridMoraRouteSignature([faor, fala]));
    expect(review.cells[0]).toMatchObject({ label: '2628S', moraFt: 7600 });
  });

  it('reports provider outages without fabricating cells', async () => {
    const provider: GridMoraProvider = {
      source: 'jeppesen',
      sourceUrl: 'https://example.test/grid-mora',
      loadRouteCells: async () => {
        throw new Error('provider offline');
      },
    };

    const review = await reviewGridMoraForRoute([faor, fala], provider);

    expect(review.status).toBe('unavailable');
    expect(review.source).toBe('jeppesen');
    expect(review.cells).toEqual([]);
    expect(review.message).toContain('provider is unavailable');
  });
});
