// config/openAipStyle.js
export const openAipStyle = {
  version: 8,
  name: 'OpenAIP Clone',
  glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key={key}',
  sprite: 'https://openmaptiles.github.io/osm-bright-gl-style/sprite',
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://api.maptiler.com/tiles/v3-openmaptiles/tiles.json?key={key}',
    },
    terrain: {
      type: 'raster-dem',
      url: 'https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key={key}',
      tileSize: 256,
    },
    hillshade: {
      type: 'raster-dem',
      url: 'https://api.maptiler.com/tiles/terrain-rgb/tiles.json?key={key}',
      tileSize: 256,
    },
    'openaip-airspaces': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    },
    'openaip-navaids': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    },
    'openaip-airports': {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f8f4f0' },
    },
    {
      id: 'hillshading',
      source: 'hillshade',
      type: 'hillshade',
      paint: {
        'hillshade-accent-color': '#8B7355',
        'hillshade-exaggeration': 0.3,
        'hillshade-highlight-color': '#FFFFFF',
        'hillshade-shadow-color': '#473B24',
      },
    },
    {
      id: 'landcover-glacier',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'subclass', 'glacier'],
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': '#fff',
        'fill-opacity': { base: 1, stops: [[0, 0.9], [10, 0.3]] },
      },
    },
    {
      id: 'landuse-residential',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['all', ['in', 'class', 'residential', 'suburb', 'neighbourhood']],
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': {
          base: 1,
          stops: [[12, 'hsla(30, 19%, 90%, 0.4)'], [16, 'hsla(30, 19%, 90%, 0.2)']],
        },
      },
    },
    {
      id: 'landuse-commercial',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['all', ['==', '$type', 'Polygon'], ['==', 'class', 'commercial']],
      layout: { visibility: 'visible' },
      paint: { 'fill-color': 'hsla(0, 60%, 87%, 0.23)' },
    },
    {
      id: 'landuse-industrial',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['all', ['==', '$type', 'Polygon'], ['in', 'class', 'industrial', 'garages', 'dam']],
      layout: { visibility: 'visible' },
      paint: { 'fill-color': 'hsla(49, 100%, 88%, 0.34)' },
    },
    {
      id: 'landuse-cemetery',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'cemetery'],
      paint: { 'fill-color': '#e0e4dd' },
    },
    {
      id: 'landuse-hospital',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'hospital'],
      paint: { 'fill-color': '#fde' },
    },
    {
      id: 'landuse-school',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'school'],
      paint: { 'fill-color': '#f0e8f8' },
    },
    {
      id: 'landuse-railway',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landuse',
      filter: ['==', 'class', 'railway'],
      layout: { visibility: 'visible' },
      paint: { 'fill-color': 'hsla(30, 19%, 90%, 0.4)' },
    },
    {
      id: 'landcover-wood',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'wood'],
      paint: {
        'fill-antialias': { base: 1, stops: [[0, false], [9, true]] },
        'fill-color': '#6a4',
        'fill-opacity': 0.1,
        'fill-outline-color': 'hsla(0, 0%, 0%, 0.03)',
      },
    },
    {
      id: 'landcover-grass',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'grass'],
      paint: { 'fill-color': '#d8e8c8', 'fill-opacity': 1 },
    },
    {
      id: 'landcover-grass-park',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849388993.3071' },
      source: 'openmaptiles',
      'source-layer': 'park',
      filter: ['==', 'class', 'public_park'],
      paint: { 'fill-color': '#d8e8c8', 'fill-opacity': 0.8 },
    },
    {
      id: 'waterway_tunnel',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'waterway',
      minzoom: 14,
      filter: ['all', ['in', 'class', 'river', 'stream', 'canal'], ['==', 'brunnel', 'tunnel']],
      layout: { 'line-cap': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#a0c8f0',
        'line-dasharray': [2, 4],
        'line-width': { base: 1.3, stops: [[13, 0.5], [20, 6]] },
      },
    },
    {
      id: 'waterway-other',
      type: 'line',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['all', ['!in', 'class', 'canal', 'river', 'stream'], ['==', 'intermittent', 0]],
      layout: { 'line-cap': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#a0c8f0',
        'line-width': { base: 1.3, stops: [[13, 0.5], [20, 2]] },
      },
    },
    {
      id: 'waterway-other-intermittent',
      type: 'line',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['all', ['!in', 'class', 'canal', 'river', 'stream'], ['==', 'intermittent', 1]],
      layout: { 'line-cap': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#a0c8f0',
        'line-dasharray': [4, 3],
        'line-width': { base: 1.3, stops: [[13, 0.5], [20, 2]] },
      },
    },
    {
      id: 'waterway-stream-canal',
      type: 'line',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['all', ['in', 'class', 'canal', 'stream'], ['!=', 'brunnel', 'tunnel'], ['==', 'intermittent', 0]],
      layout: { 'line-cap': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#a0c8f0',
        'line-width': { base: 1.3, stops: [[13, 0.5], [20, 6]] },
      },
    },
    {
      id: 'waterway-stream-canal-intermittent',
      type: 'line',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['all', ['in', 'class', 'canal', 'stream'], ['!=', 'brunnel', 'tunnel'], ['==', 'intermittent', 1]],
      layout: { 'line-cap': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#a0c8f0',
        'line-dasharray': [4, 3],
        'line-width': { base: 1.3, stops: [[13, 0.5], [20, 6]] },
      },
    },
    {
      id: 'waterway-river',
      type: 'line',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['all', ['==', 'class', 'river'], ['!=', 'brunnel', 'tunnel'], ['==', 'intermittent', 0]],
      layout: { 'line-cap': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#a0c8f0',
        'line-width': { base: 1.2, stops: [[10, 0.8], [20, 6]] },
      },
    },
    {
      id: 'waterway-river-intermittent',
      type: 'line',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'waterway',
      filter: ['all', ['==', 'class', 'river'], ['!=', 'brunnel', 'tunnel'], ['==', 'intermittent', 1]],
      layout: { 'line-cap': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#a0c8f0',
        'line-dasharray': [3, 2.5],
        'line-width': { base: 1.2, stops: [[10, 0.8], [20, 6]] },
      },
    },
    {
      id: 'water-offset',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'water',
      maxzoom: 8,
      filter: ['==', '$type', 'Polygon'],
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': '#a0c8f0',
        'fill-opacity': 1,
        'fill-translate': { base: 1, stops: [[6, [2, 0]], [8, [0, 0]]] },
      },
    },
    {
      id: 'water',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'water',
      filter: ['all', ['!=', 'intermittent', 1], ['!=', 'brunnel', 'tunnel']],
      layout: { visibility: 'visible' },
      paint: { 'fill-color': 'hsl(210, 67%, 85%)' },
    },
    {
      id: 'water-intermittent',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'water',
      filter: ['all', ['==', 'intermittent', 1]],
      layout: { visibility: 'visible' },
      paint: { 'fill-color': 'hsl(210, 67%, 85%)', 'fill-opacity': 0.7 },
    },
    {
      id: 'water-pattern',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'water',
      filter: ['all'],
      layout: { visibility: 'visible' },
      paint: { 'fill-pattern': 'wave', 'fill-translate': [0, 2.5] },
    },
    {
      id: 'landcover-ice-shelf',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'subclass', 'ice_shelf'],
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': '#fff',
        'fill-opacity': { base: 1, stops: [[0, 0.9], [10, 0.3]] },
      },
    },
    {
      id: 'landcover-sand',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849382550.77' },
      source: 'openmaptiles',
      'source-layer': 'landcover',
      filter: ['==', 'class', 'sand'],
      layout: { visibility: 'visible' },
      paint: { 'fill-color': 'rgba(245, 238, 188, 1)', 'fill-opacity': 1 },
    },
    {
      id: 'building',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849364238.8171' },
      source: 'openmaptiles',
      'source-layer': 'building',
      paint: {
        'fill-antialias': true,
        'fill-color': { base: 1, stops: [[15.5, '#f2eae2'], [16, '#dfdbd7']] },
      },
    },
    {
      id: 'building-top',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849364238.8171' },
      source: 'openmaptiles',
      'source-layer': 'building',
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': '#f2eae2',
        'fill-opacity': { base: 1, stops: [[13, 0], [16, 1]] },
        'fill-outline-color': '#dfdbd7',
        'fill-translate': { base: 1, stops: [[14, [0, 0]], [16, [-2, -2]]] },
      },
    },
    {
      id: 'tunnel-service-track-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'service', 'track']],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#cfcdca',
        'line-dasharray': [0.5, 0.25],
        'line-width': { base: 1.2, stops: [[15, 1], [16, 4], [20, 11]] },
      },
    },
    {
      id: 'tunnel-motorway-link-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'motorway'], ['==', 'ramp', 1]],
      layout: { 'line-join': 'round', visibility: 'visible' },
      paint: {
        'line-color': 'rgba(200, 147, 102, 1)',
        'line-dasharray': [0.5, 0.25],
        'line-width': {
          base: 1.2,
          stops: [[12, 1], [13, 3], [14, 4], [20, 15]],
        },
      },
    },
    {
      id: 'tunnel-minor-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'minor']],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#cfcdca',
        'line-opacity': { stops: [[12, 0], [12.5, 1]] },
        'line-width': {
          base: 1.2,
          stops: [[12, 0.5], [13, 1], [14, 4], [20, 15]],
        },
        'line-dasharray': [0.5, 0.25],
      },
    },
    {
      id: 'tunnel-link-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'trunk', 'primary', 'secondary', 'tertiary'], ['==', 'ramp', 1]],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': 1,
        'line-width': {
          base: 1.2,
          stops: [[12, 1], [13, 3], [14, 4], [20, 15]],
        },
        'line-dasharray': [0.5, 0.25],
      },
    },
    {
      id: 'tunnel-secondary-tertiary-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'secondary', 'tertiary'], ['!=', 'ramp', 1]],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': 1,
        'line-width': { base: 1.2, stops: [[8, 1.5], [20, 17]] },
        'line-dasharray': [0.5, 0.25],
      },
    },
    {
      id: 'tunnel-trunk-primary-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'primary', 'trunk'], ['!=', 'ramp', 1]],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#e9ac77',
        'line-width': {
          base: 1.2,
          stops: [[5, 0.4], [6, 0.6], [7, 1.5], [20, 22]],
        },
      },
    },
    {
      id: 'tunnel-motorway-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'motorway'], ['!=', 'ramp', 1]],
      layout: { 'line-join': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#e9ac77',
        'line-dasharray': [0.5, 0.25],
        'line-width': {
          base: 1.2,
          stops: [[5, 0.4], [6, 0.6], [7, 1.5], [20, 22]],
        },
      },
    },
    {
      id: 'tunnel-path-steps-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['==', 'brunnel', 'tunnel'], ['==', 'class', 'path'], ['==', 'subclass', 'steps']],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#cfcdca',
        'line-opacity': { stops: [[12, 0], [12.5, 1]] },
        'line-width': {
          base: 1.2,
          stops: [[12, 0.5], [13, 1], [14, 2], [20, 9.25]],
        },
        'line-dasharray': [0.5, 0.25],
      },
    },
    {
      id: 'tunnel-path-steps',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['==', 'brunnel', 'tunnel'], ['==', 'class', 'path'], ['==', 'subclass', 'steps']],
      layout: { 'line-join': 'bevel', 'line-cap': 'butt' },
      paint: {
        'line-color': '#fff',
        'line-opacity': 1,
        'line-width': {
          base: 1.2,
          stops: [[13.5, 0], [14, 1.25], [20, 5.75]],
        },
        'line-dasharray': [0.5, 0.25],
      },
    },
    {
      id: 'tunnel-path',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['==', 'brunnel', 'tunnel'], ['==', 'class', 'path'], ['!=', 'subclass', 'steps']],
      paint: {
        'line-color': '#cba',
        'line-dasharray': [1.5, 0.75],
        'line-width': { base: 1.2, stops: [[15, 1.2], [20, 4]] },
      },
    },
    {
      id: 'tunnel-motorway-link',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'motorway'], ['==', 'ramp', 1]],
      layout: { 'line-join': 'round', visibility: 'visible' },
      paint: {
        'line-color': 'rgba(244, 209, 158, 1)',
        'line-width': {
          base: 1.2,
          stops: [[12.5, 0], [13, 1.5], [14, 2.5], [20, 11.5]],
        },
      },
    },
    {
      id: 'tunnel-service-track',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'service', 'track']],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#fff',
        'line-width': { base: 1.2, stops: [[15.5, 0], [16, 2], [20, 7.5]] },
      },
    },
    {
      id: 'tunnel-link',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'trunk', 'primary', 'secondary', 'tertiary'], ['==', 'ramp', 1]],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#fff4c6',
        'line-width': {
          base: 1.2,
          stops: [[12.5, 0], [13, 1.5], [14, 2.5], [20, 11.5]],
        },
      },
    },
    {
      id: 'tunnel-minor',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'minor']],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#fff',
        'line-opacity': 1,
        'line-width': { base: 1.2, stops: [[13.5, 0], [14, 2.5], [20, 11.5]] },
      },
    },
    {
      id: 'tunnel-secondary-tertiary',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'secondary', 'tertiary'], ['!=', 'ramp', 1]],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#fff4c6',
        'line-width': { base: 1.2, stops: [[6.5, 0], [7, 0.5], [20, 10]] },
      },
    },
    {
      id: 'tunnel-trunk-primary',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['in', 'class', 'primary', 'trunk'], ['!=', 'ramp', 1]],
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': '#fff4c6',
        'line-width': { base: 1.2, stops: [[6.5, 0], [7, 0.5], [20, 18]] },
      },
    },
    {
      id: 'tunnel-motorway',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'motorway'], ['!=', 'ramp', 1]],
      layout: { 'line-join': 'round', visibility: 'visible' },
      paint: {
        'line-color': '#ffdaa6',
        'line-width': { base: 1.2, stops: [[6.5, 0], [7, 0.5], [20, 18]] },
      },
    },
    {
      id: 'tunnel-railway',
      type: 'line',
      metadata: { 'mapbox:group': '1444849354174.1904' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', 'brunnel', 'tunnel'], ['==', 'class', 'rail']],
      paint: {
        'line-color': '#bbb',
        'line-dasharray': [2, 2],
        'line-width': { base: 1.4, stops: [[14, 0.4], [15, 0.75], [20, 2]] },
      },
    },
    {
      id: 'ferry',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['in', 'class', 'ferry']],
      layout: { 'line-join': 'round', visibility: 'visible' },
      paint: {
        'line-color': 'rgba(108, 159, 182, 1)',
        'line-dasharray': [2, 2],
        'line-width': 1.1,
      },
    },
    {
      id: 'aeroway-taxiway-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 12,
      filter: ['all', ['in', 'class', 'taxiway']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': 'rgba(153, 153, 153, 1)',
        'line-opacity': 1,
        'line-width': { base: 1.5, stops: [[11, 2], [17, 12]] },
      },
    },
    {
      id: 'aeroway-runway-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 12,
      filter: ['all', ['in', 'class', 'runway']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': 'rgba(153, 153, 153, 1)',
        'line-opacity': 1,
        'line-width': { base: 1.5, stops: [[11, 5], [17, 55]] },
      },
    },
    {
      id: 'aeroway-area',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 4,
      filter: ['all', ['==', '$type', 'Polygon'], ['in', 'class', 'runway', 'taxiway']],
      layout: { visibility: 'visible' },
      paint: {
        'fill-color': 'rgba(255, 255, 255, 1)',
        'fill-opacity': { base: 1, stops: [[13, 0], [14, 1]] },
      },
    },
    {
      id: 'aeroway-taxiway',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 4,
      filter: ['all', ['in', 'class', 'taxiway'], ['==', '$type', 'LineString']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': 'rgba(255, 255, 255, 1)',
        'line-opacity': { base: 1, stops: [[11, 0], [12, 1]] },
        'line-width': { base: 1.5, stops: [[11, 1], [17, 10]] },
      },
    },
    {
      id: 'aeroway-runway',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'aeroway',
      minzoom: 4,
      filter: ['all', ['in', 'class', 'runway'], ['==', '$type', 'LineString']],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': 'rgba(255, 255, 255, 1)',
        'line-opacity': { base: 1, stops: [[11, 0], [12, 1]] },
        'line-width': { base: 1.5, stops: [[11, 4], [17, 50]] },
      },
    },
    {
      id: 'road_area_pier',
      type: 'fill',
      metadata: {},
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'Polygon'], ['==', 'class', 'pier']],
      layout: { visibility: 'visible' },
      paint: { 'fill-antialias': true, 'fill-color': '#f8f4f0' },
    },
    {
      id: 'road_pier',
      type: 'line',
      metadata: {},
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'pier']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#f8f4f0',
        'line-width': { base: 1.2, stops: [[15, 1], [17, 4]] },
      },
    },
    {
      id: 'highway-area',
      type: 'fill',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'Polygon'], ['!in', 'class', 'pier']],
      layout: { visibility: 'visible' },
      paint: {
        'fill-antialias': false,
        'fill-color': 'hsla(0, 0%, 89%, 0.56)',
        'fill-opacity': 0.9,
        'fill-outline-color': '#cfcdca',
      },
    },
    {
      id: 'highway-path-steps-casing',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'path'], ['in', 'subclass', 'steps']],
      layout: { 'line-cap': 'butt', 'line-join': 'round' },
      paint: {
        'line-color': '#cfcdca',
        'line-opacity': { stops: [[12, 0], [12.5, 1]] },
        'line-width': {
          base: 1.2,
          stops: [[12, 0.5], [13, 1], [14, 2], [20, 9.25]],
        },
      },
    },
    {
      id: 'highway-motorway-link-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'motorway'], ['==', 'ramp', 1]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': 1,
        'line-width': {
          base: 1.2,
          stops: [[12, 1], [13, 3], [14, 4], [20, 15]],
        },
      },
    },
    {
      id: 'highway-link-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'trunk', 'primary', 'secondary', 'tertiary'], ['==', 'ramp', 1]],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': 1,
        'line-width': {
          base: 1.2,
          stops: [[12, 1], [13, 3], [14, 4], [20, 15]],
        },
      },
    },
    {
      id: 'highway-minor-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['!=', 'brunnel', 'tunnel'], ['in', 'class', 'minor', 'service', 'track']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#cfcdca',
        'line-opacity': { stops: [[12, 0], [12.5, 1]] },
        'line-width': {
          base: 1.2,
          stops: [[12, 0.5], [13, 1], [14, 4], [20, 15]],
        },
      },
    },
    {
      id: 'highway-secondary-tertiary-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'secondary', 'tertiary'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'butt',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': 1,
        'line-width': { base: 1.2, stops: [[8, 1.5], [20, 17]] },
      },
    },
    {
      id: 'highway-primary-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 5,
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'primary'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'butt',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': { stops: [[7, 0], [8, 1]] },
        'line-width': {
          base: 1.2,
          stops: [[7, 0], [8, 0.6], [9, 1.5], [20, 22]],
        },
      },
    },
    {
      id: 'highway-trunk-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 5,
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'trunk'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'butt',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': { stops: [[5, 0], [6, 1]] },
        'line-width': {
          base: 1.2,
          stops: [[5, 0], [6, 0.6], [7, 1.5], [20, 22]],
        },
      },
    },
    {
      id: 'highway-motorway-casing',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 4,
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'motorway'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'butt',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#e9ac77',
        'line-opacity': { stops: [[4, 0], [5, 1]] },
        'line-width': {
          base: 1.2,
          stops: [[4, 0], [5, 0.4], [6, 0.6], [7, 1.5], [20, 22]],
        },
      },
    },
    {
      id: 'highway-path',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'path'], ['!=', 'subclass', 'steps']],
      paint: {
        'line-color': '#cba',
        'line-dasharray': [1.5, 0.75],
        'line-width': { base: 1.2, stops: [[15, 1.2], [20, 4]] },
      },
    },
    {
      id: 'highway-path-steps',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'path'], ['==', 'subclass', 'steps']],
      layout: { 'line-join': 'bevel', 'line-cap': 'butt' },
      paint: {
        'line-color': '#fff',
        'line-opacity': 1,
        'line-width': {
          base: 1.2,
          stops: [[13.5, 0], [14, 1.25], [20, 5.75]],
        },
        'line-dasharray': [0.5, 0.25],
      },
    },
    {
      id: 'highway-motorway-link',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 12,
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'motorway'], ['==', 'ramp', 1]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#fc8',
        'line-width': {
          base: 1.2,
          stops: [[12.5, 0], [13, 1.5], [14, 2.5], [20, 11.5]],
        },
      },
    },
    {
      id: 'highway-link',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 13,
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'trunk', 'primary', 'secondary', 'tertiary'], ['==', 'ramp', 1]],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#fea',
        'line-width': {
          base: 1.2,
          stops: [[12.5, 0], [13, 1.5], [14, 2.5], [20, 11.5]],
        },
      },
    },
    {
      id: 'highway-minor',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['!=', 'brunnel', 'tunnel'], ['in', 'class', 'minor', 'service', 'track']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#fff',
        'line-opacity': 1,
        'line-width': { base: 1.2, stops: [[13.5, 0], [14, 2.5], [20, 11.5]] },
      },
    },
    {
      id: 'highway-secondary-tertiary',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'secondary', 'tertiary'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#fea',
        'line-width': { base: 1.2, stops: [[6.5, 0], [8, 0.5], [20, 13]] },
      },
    },
    {
      id: 'highway-primary',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'primary'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#fea',
        'line-width': { base: 1.2, stops: [[8.5, 0], [9, 0.5], [20, 18]] },
      },
    },
    {
      id: 'highway-trunk',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['all', ['==', '$type', 'LineString'], ['!in', 'brunnel', 'bridge', 'tunnel'], ['in', 'class', 'trunk'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#fea',
        'line-width': { base: 1.2, stops: [[6.5, 0], [7, 0.5], [20, 18]] },
      },
    },
    {
      id: 'highway-motorway',
      type: 'line',
      metadata: { 'mapbox:group': '1444849345966.4436' },
      source: 'openmaptiles',
      'source-layer': 'transportation',
      minzoom: 5,
      filter: ['all', ['==', '$type', 'LineString'], ['!in', 'brunnel', 'bridge', 'tunnel'], ['==', 'class', 'motorway'], ['!=', 'ramp', 1]],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
        visibility: 'visible',
      },
      paint: {
        'line-color': '#fc8',
        'line-width': { base: 1.2, stops: [[6.5, 0], [7, 0.5], [20, 18]] },
      },
    },
    {
      "id": "bridge_motorway_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "motorway"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[5, 0.4], [6, 0.6], [7, 1.5], [20, 22]]
        },
        "line-opacity": 1
      }
    },
    {
      "id": "bridge_trunk_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "trunk"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[5, 0.4], [6, 0.6], [7, 1.5], [20, 22]]
        }
      }
    },
    {
      "id": "bridge_primary_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "primary"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[5, 0.4], [6, 0.6], [7, 1.5], [20, 22]]
        }
      }
    },
    {
      "id": "bridge_secondary_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "secondary"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[10, 0.6], [12, 1.5], [20, 18]]
        }
      }
    },
    {
      "id": "bridge_tertiary_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "tertiary"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[10, 0.6], [12, 1.5], [20, 18]]
        }
      }
    },
    {
      "id": "bridge_minor_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "minor"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[12, 0.6], [14, 1.5], [20, 15]]
        }
      }
    },
    {
      "id": "bridge_service_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "service"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[15, 0.6], [16, 1.5], [20, 11]]
        }
      }
    },
    {
      "id": "bridge_track_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "track"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[15, 0.6], [16, 1], [20, 8]]
        }
      }
    },
    {
      "id": "bridge_path_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["in", "class", "path", "pedestrian"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[15, 0.6], [20, 6]]
        }
      }
    },
    {
      "id": "bridge_steps_casing",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "subclass", "steps"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#e9ac77",
        "line-width": {
          "base": 1.2,
          "stops": [[15, 0.6], [20, 6]]
        }
      }
    },
    {
      "id": "bridge_motorway",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "motorway"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fc8",
        "line-width": {
          "base": 1.2,
          "stops": [[5, 0], [7, 1], [20, 18]]
        }
      }
    },
    {
      "id": "bridge_trunk",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "trunk"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fea",
        "line-width": {
          "base": 1.2,
          "stops": [[5, 0], [7, 1], [20, 18]]
        }
      }
    },
    {
      "id": "bridge_primary",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "primary"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fea",
        "line-width": {
          "base": 1.2,
          "stops": [[5, 0], [7, 1], [20, 18]]
        }
      }
    },
    {
      "id": "bridge_secondary",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "secondary"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fea",
        "line-width": {
          "base": 1.2,
          "stops": [[10, 0.5], [18, 13]]
        }
      }
    },
    {
      "id": "bridge_tertiary",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "tertiary"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fea",
        "line-width": {
          "base": 1.2,
          "stops": [[10, 0.5], [18, 13]]
        }
      }
    },
    {
      "id": "bridge_minor",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "minor"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fff",
        "line-width": {
          "base": 1.2,
          "stops": [[13.5, 0], [14, 2.5], [20, 11.5]]
        }
      }
    },
    {
      "id": "bridge_service",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "service"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fff",
        "line-width": {
          "base": 1.2,
          "stops": [[15.5, 0], [16, 2], [20, 7.5]]
        }
      }
    },
    {
      "id": "bridge_track",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "track"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#fff",
        "line-width": {
          "base": 1.2,
          "stops": [[15.5, 0], [16, 1], [20, 4.5]]
        },
        "line-dasharray": [0.3, 0.3]
      }
    },
    {
      "id": "bridge_path",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["in", "class", "path", "pedestrian"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#cba",
        "line-width": {
          "base": 1.2,
          "stops": [[15, 1.2], [20, 4]]
        },
        "line-dasharray": [1.5, 0.75]
      }
    },
    {
      "id": "bridge_steps",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "subclass", "steps"]],
      "layout": {"line-join": "round"},
      "paint": {
        "line-color": "#cba",
        "line-width": {
          "base": 1.2,
          "stops": [[15, 1.2], [20, 4]]
        },
        "line-dasharray": [0.3, 0.3]
      }
    },
    {
      "id": "bridge_railway",
      "type": "line",
      "source": "openmaptiles",
      "source-layer": "transportation",
      "filter": ["all", ["==", "brunnel", "bridge"], ["==", "class", "rail"]],
      "paint": {
        "line-color": "#bbb",
        "line-width": {
          "base": 1.4,
          "stops": [[14, 0.4], [15, 0.75], [20, 2]]
        },
        "line-dasharray": [2, 2]
      }
    },
  ]
};
