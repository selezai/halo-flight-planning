import { expect, test } from '@playwright/test';

test('server APIs validate input and degrade safely without aviation credentials', async ({ request }) => {
  const styleResponse = await request.get('/api/openaip/style');
  expect(styleResponse.status()).toBe(200);
  const style = await styleResponse.json();
  expect(style).toMatchObject({
    version: 8,
    metadata: {
      haloDegraded: true,
    },
  });
  expect(style.sources).toHaveProperty('maptiler-base');

  const invalidMetarResponse = await request.get('/api/weather/metar/ABC');
  expect(invalidMetarResponse.status()).toBe(400);
  await expect(invalidMetarResponse.json()).resolves.toMatchObject({
    error: 'ICAO identifier must be four letters or numbers.',
  });

  const openAipSearchResponse = await request.get('/api/openaip/search?q=EGLL&limit=6');
  expect(openAipSearchResponse.status()).toBe(503);
  await expect(openAipSearchResponse.json()).resolves.toMatchObject({
    error: 'OpenAIP API key not configured',
  });

  const airspaceReviewResponse = await request.post('/api/openaip/airspace-review', {
    data: {
      waypoints: [],
      cruiseAltitudeFt: 6500,
    },
  });
  expect(airspaceReviewResponse.status()).toBe(503);
  await expect(airspaceReviewResponse.json()).resolves.toMatchObject({
    source: 'openaip-core',
    status: 'unavailable',
  });

  const notamReviewResponse = await request.post('/api/notams/route', {
    data: {
      waypoints: [
        { type: 'airport', ident: 'FAOR' },
        { type: 'airport', ident: 'FALA' },
      ],
    },
  });
  expect(notamReviewResponse.status()).toBe(200);
  await expect(notamReviewResponse.json()).resolves.toMatchObject({
    source: 'south-africa-official',
    status: 'manual-required',
  });
});
