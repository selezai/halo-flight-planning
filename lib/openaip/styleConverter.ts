/**
 * OpenAIP Style Converter
 * Transforms OpenAIP's Mapbox GL style to work with MapLibre GL
 */

import type { RasterBaseMapOptions } from '@/lib/openaip/basemap';

export interface StyleLayer {
  id: string;
  type: string;
  source?: string;
  'source-layer'?: string;
  filter?: unknown[];
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
  minzoom?: number;
  maxzoom?: number;
}

export interface MapStyle {
  version: number;
  name?: string;
  sprite?: string;
  glyphs?: string;
  metadata?: Record<string, unknown>;
  sources: Record<string, unknown>;
  layers: StyleLayer[];
}

export interface VectorBaseMapStyle {
  sources: Record<string, unknown>;
  layers: StyleLayer[];
}

/**
 * Main converter function
 */
export function convertOpenAipStyle(
  style: MapStyle,
  options: {
    spriteUrl: string;
    glyphsUrl: string;
    tilesProxyUrl: string;
    baseMapStyle?: VectorBaseMapStyle;
    rasterBaseMap: RasterBaseMapOptions;
    backgroundColor?: string;
  }
): MapStyle {
  const converted = JSON.parse(JSON.stringify(style)) as MapStyle;

  // 1. Replace sprite URL with our hosted sprites
  converted.sprite = options.spriteUrl;

  // 2. Replace glyphs URL (MapTiler or self-hosted)
  converted.glyphs = options.glyphsUrl;

  // 3. Rewrite OpenAIP source tile URLs to go through our proxy and remove
  // Mapbox-only sources. Halo uses a MapLibre-compatible vector basemap instead
  // of OpenAIP's original mapbox:// composite source.
  converted.sources = rewriteSources(converted.sources, options.tilesProxyUrl);

  // 4. Add MapLibre-compatible base-map sources after rewriting the OpenAIP
  // sources so MapTiler/OSM URLs are preserved.
  converted.sources = {
    ...buildBaseMapSources(options),
    ...converted.sources,
  };

  // 5. Fix OpenAIP aviation layers for MapLibre compatibility and filter out
  // Mapbox-only composite ground layers. Replacement vector ground layers are
  // added below.
  converted.layers = converted.layers
    .filter(layer => !isProblematicLayer(layer, converted.sources))
    .map(fixLayer);

  // 6. Add vector base-map layer(s) at the beginning. This mirrors OpenAIP's
  // real architecture: ground vector layers below OpenAIP aviation vectors.
  converted.layers = [
    ...buildBaseMapLayers(options),
    ...converted.layers,
  ];

  return converted;
}

function buildBaseMapSources(options: {
  baseMapStyle?: VectorBaseMapStyle;
  rasterBaseMap: RasterBaseMapOptions;
}): Record<string, unknown> {
  if (options.baseMapStyle) {
    return JSON.parse(JSON.stringify(options.baseMapStyle.sources)) as Record<string, unknown>;
  }

  return {
    'halo-raster-base': {
      type: 'raster',
      tiles: [options.rasterBaseMap.tilesUrl],
      tileSize: options.rasterBaseMap.tileSize,
      attribution: options.rasterBaseMap.attribution,
      maxzoom: 19,
    },
  };
}

function buildBaseMapLayers(options: {
  baseMapStyle?: VectorBaseMapStyle;
  rasterBaseMap: RasterBaseMapOptions;
  backgroundColor?: string;
}): StyleLayer[] {
  if (options.baseMapStyle) {
    return options.baseMapStyle.layers
      .filter(isUsableVectorBaseLayer)
      .map(normalizeVectorBaseLayer)
      .filter((layer): layer is StyleLayer => layer !== null)
      .map(fixLayer);
  }

  return [
    {
      id: 'halo-ground-background',
      type: 'background',
      minzoom: 0,
      paint: {
        'background-color': options.backgroundColor ?? '#f3f0e8'
      }
    },
    {
      id: 'halo-raster-base',
      type: 'raster',
      source: 'halo-raster-base',
      minzoom: 0,
      maxzoom: 22
    },
  ];
}

function isUsableVectorBaseLayer(layer: StyleLayer): boolean {
  if (!['background', 'fill', 'hillshade', 'line', 'raster', 'symbol'].includes(layer.type)) {
    return false;
  }

  const id = layer.id.toLowerCase();
  const sourceLayer = layer['source-layer']?.toLowerCase();

  // OpenAIP already supplies aerodrome symbols/labels. Keeping provider ground
  // aerodrome labels creates duplicate airport names and non-OpenAIP icons.
  if (sourceLayer === 'aerodrome_label' || id.includes('airport label')) {
    return false;
  }

  return true;
}

function normalizeVectorBaseLayer(layer: StyleLayer): StyleLayer | null {
  const normalized: StyleLayer = JSON.parse(JSON.stringify(layer)) as StyleLayer;
  normalized.id = `halo-ground-${layer.id}`;

  if (normalized.type === 'background') {
    normalized.paint = {
      ...normalized.paint,
      'background-color': [
        'interpolate',
        ['linear'],
        ['zoom'],
        11,
        'hsl(35, 25%, 93%)',
        13,
        'hsl(35, 9%, 91%)',
      ],
    };
  }

  if (normalized.type === 'symbol') {
    normalized.layout = {
      ...normalized.layout,
    };

    // Halo serves OpenAIP sprites, not MapTiler/Mapbox POI sprites. Ground
    // symbols keep their text labels but omit unrelated map POI icons.
    delete normalized.layout['icon-image'];

    tuneGroundLabelDensity(normalized, layer.id);
  }

  return normalized;
}

function tuneGroundLabelDensity(layer: StyleLayer, originalId: string): void {
  const id = originalId.toLowerCase();
  const sourceLayer = layer['source-layer']?.toLowerCase();

  if (id.includes('city labels')) {
    layer.minzoom = Math.max(layer.minzoom ?? 0, 8);
    layer.maxzoom = Math.min(layer.maxzoom ?? 24, 15);
    return;
  }

  if (id.includes('town labels')) {
    layer.minzoom = Math.max(layer.minzoom ?? 0, 9);
    layer.maxzoom = Math.min(layer.maxzoom ?? 24, 15);
    return;
  }

  if (id.includes('village labels')) {
    layer.minzoom = Math.max(layer.minzoom ?? 0, 10);
    layer.maxzoom = Math.min(layer.maxzoom ?? 24, 15);
    return;
  }

  if (id.includes('place labels')) {
    layer.minzoom = Math.max(layer.minzoom ?? 0, 11);
    return;
  }

  if (id.includes('road labels')) {
    layer.minzoom = Math.max(layer.minzoom ?? 0, 10);
    return;
  }

  if (id.includes('contour labels')) {
    layer.minzoom = Math.max(layer.minzoom ?? 0, 12);
    return;
  }

  if (sourceLayer === 'poi' || sourceLayer === 'outdoor_poi') {
    layer.minzoom = Math.max(layer.minzoom ?? 0, 14);
  }
}

/**
 * Check if a layer has known compatibility issues
 */
function isProblematicLayer(layer: StyleLayer, sources: MapStyle['sources']): boolean {
  // Remove Mapbox basemap/terrain layers. Halo provides a MapLibre-compatible
  // vector basemap and keeps OpenAIP aviation data as the interactive vector
  // overlay.
  if (layer.type === 'background' || layer.source === 'composite' || layer.source === 'mapbox-dem') {
    return true;
  }

  // Drop layers whose source was removed during source rewriting.
  if (layer.source && !sources[layer.source]) {
    return true;
  }
  
  return false;
}

/**
 * Rewrite tile source URLs to proxy through our backend
 */
function rewriteSources(
  sources: Record<string, unknown>,
  proxyUrl: string
): Record<string, unknown> {
  const rewritten: Record<string, unknown> = {};

  for (const [name, source] of Object.entries(sources)) {
    const src = source as Record<string, unknown>;

    // Skip Mapbox sources (terrain, DEM) - MapLibre can't load them
    if (typeof src.url === 'string' && src.url.startsWith('mapbox://')) {
      continue;
    }

    if (src.type === 'vector') {
      // Rewrite OpenAIP tile URLs to go through our proxy
      if (typeof src.url === 'string' && src.url.includes('tiles.openaip.net')) {
        // Remove the url property and use tiles array instead
        const { url, ...rest } = src;
        rewritten[name] = {
          ...rest,
          type: 'vector',
          tiles: [`${proxyUrl}/{z}/{x}/{y}.pbf`],
        };
      } else if (Array.isArray(src.tiles)) {
        // Handle tiles array format
        const tiles = src.tiles as string[];
        if (tiles.some(tile => tile.includes('tiles.openaip.net'))) {
          rewritten[name] = {
            ...src,
            tiles: [`${proxyUrl}/{z}/{x}/{y}.pbf`],
          };
        } else {
          rewritten[name] = src;
        }
      } else {
        rewritten[name] = src;
      }
    } else {
      rewritten[name] = src;
    }
  }

  return rewritten;
}

/**
 * Fix individual layer for MapLibre compatibility
 */
function fixLayer(layer: StyleLayer): StyleLayer {
  const fixed = { ...layer };

  // Fix layout properties
  if (fixed.layout) {
    fixed.layout = fixProperties(fixed.layout, 'layout');
  }

  // Fix paint properties
  if (fixed.paint) {
    fixed.paint = fixProperties(fixed.paint, 'paint');
  }

  // Fix filter expressions
  if (fixed.filter) {
    fixed.filter = fixFilter(fixed.filter as unknown[]);
  }

  return fixed;
}

/**
 * Fix paint/layout properties - convert legacy stops to expressions
 */
function fixProperties(props: Record<string, unknown>, propType: 'layout' | 'paint' = 'layout'): Record<string, unknown> {
  const fixed: Record<string, unknown> = {};

  // Properties that cannot be interpolated in MapLibre
  const nonInterpolatableProps = [
    'icon-image',
    'text-field',
    'fill-pattern',
    'line-pattern',
    'fill-extrusion-pattern'
  ];
  const arrayValuedProps = [
    'text-offset',
    'icon-offset',
    'text-translate',
    'icon-translate',
  ];

  for (const [key, value] of Object.entries(props)) {
    // Check if this property cannot be interpolated
    if (nonInterpolatableProps.includes(key) && isInterpolateExpression(value)) {
      // Remove interpolation, use step or match instead
      fixed[key] = convertToStepExpression(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      
      // Convert legacy "stops" syntax to interpolate expression
      if ('stops' in obj && Array.isArray(obj.stops)) {
        // Check if this property can be interpolated
        if (key === 'line-dasharray') {
          fixed[key] = convertStopsToStep(obj, normalizeDasharray);
        } else if (key === 'text-font') {
          fixed[key] = convertStopsToStep(obj, wrapAnyArrayValue);
        } else if (nonInterpolatableProps.includes(key)) {
          fixed[key] = convertStopsToStep(obj, (item) => normalizePropertyValue(key, item));
        } else if (arrayValuedProps.includes(key)) {
          fixed[key] = convertStopsToExpression(obj, wrapLiteralArrayValue);
        } else {
          fixed[key] = convertStopsToExpression(obj);
        }
      } else {
        fixed[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Handle array properties that need fixing
      fixed[key] = fixArrayProperty(key, value);
    } else if (typeof value === 'string') {
      fixed[key] = normalizePropertyValue(key, value);
    } else {
      fixed[key] = value;
    }
  }

  return fixed;
}

function normalizePropertyValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') return value;

  if (key === 'icon-image' && value === 'airfield-15') {
    return 'rc_airfield';
  }

  if (key === 'icon-image' || key === 'text-field' || key === 'fill-pattern' || key === 'line-pattern') {
    return convertTokenString(value);
  }

  return value;
}

function convertTokenString(value: string): string | unknown[] {
  const tokenMatches = Array.from(value.matchAll(/\{([^}]+)\}/g));
  if (tokenMatches.length === 0) return value;

  const parts: unknown[] = [];
  let lastIndex = 0;

  for (const match of tokenMatches) {
    const index = match.index ?? 0;
    const propertyName = match[1];

    if (index > lastIndex) {
      parts.push(value.slice(lastIndex, index));
    }

    parts.push(['coalesce', ['to-string', ['get', propertyName]], '']);
    lastIndex = index + match[0].length;
  }

  if (lastIndex < value.length) {
    parts.push(value.slice(lastIndex));
  }

  if (parts.length === 1) {
    return parts[0] as unknown[];
  }

  return ['concat', ...parts];
}

/**
 * Check if value is an interpolate expression
 */
function isInterpolateExpression(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0 && value[0] === 'interpolate';
}

/**
 * Convert interpolate expression to step expression for non-interpolatable types
 */
function convertToStepExpression(value: unknown): unknown {
  if (!Array.isArray(value) || value[0] !== 'interpolate') {
    return value;
  }

  // Extract zoom levels and values from interpolate expression
  // Format: ['interpolate', ['linear'], ['zoom'], zoom1, value1, zoom2, value2, ...]
  const input = value[2]; // Usually ['zoom']
  const pairs: [number, unknown][] = [];
  
  for (let i = 3; i < value.length; i += 2) {
    if (i + 1 < value.length) {
      pairs.push([value[i] as number, value[i + 1]]);
    }
  }

  if (pairs.length === 0) {
    return value;
  }

  // Convert to step expression
  // Format: ['step', ['zoom'], defaultValue, stop1, value1, stop2, value2, ...]
  const stepExpr: unknown[] = ['step', input, pairs[0][1]];
  
  for (let i = 1; i < pairs.length; i++) {
    stepExpr.push(pairs[i][0], pairs[i][1]);
  }

  return stepExpr;
}

/**
 * Convert stops to step expression instead of interpolate
 */
function convertStopsToStep(
  obj: Record<string, unknown>,
  normalizeValue: (value: unknown) => unknown = (value) => value
): unknown {
  const stops = obj.stops as [number, unknown][];
  
  if (stops.length === 0) {
    return ['step', ['zoom'], null];
  }

  if (stops.length === 1) {
    return normalizeValue(stops[0][1]) as unknown[];
  }

  const expression: unknown[] = ['step', ['zoom'], normalizeValue(stops[0][1])];
  
  for (let i = 1; i < stops.length; i++) {
    expression.push(stops[i][0], normalizeValue(stops[i][1]));
  }

  return expression;
}

function normalizeDasharray(value: unknown): unknown {
  if (!Array.isArray(value)) return value;

  const numbers = value.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
  if (numbers.length === 0) return ['literal', [1, 1]];
  if (numbers.length === 1) return ['literal', [numbers[0], numbers[0]]];
  return ['literal', numbers];
}

/**
 * Fix array properties for MapLibre compatibility
 */
function fixArrayProperty(key: string, value: unknown[]): unknown {
  // Properties that can't be interpolated and need literal wrapping
  const literalProperties = [
    'text-offset',
    'icon-offset', 
    'text-translate',
    'icon-translate',
    'line-dasharray',
    'text-font'
  ];
  
  // Check if this is an expression (starts with a string operator)
  const isExpression = value.length > 0 && typeof value[0] === 'string';
  
  if (isExpression) {
    // It's already an expression, check if it needs fixing
    const operator = value[0] as string;
    
    if (operator === 'step') return fixStepArrayValues(value);
    if (operator === 'interpolate') return fixInterpolateArrayValues(value);
    if (operator === 'match') return fixMatchArrayValues(value);
    
    return value;
  }
  
  // Not an expression - check if it needs literal wrapping
  if (key === 'line-dasharray') {
    const normalized = normalizeDasharray(value);
    return Array.isArray(normalized) && normalized[0] === 'literal' ? normalized[1] : normalized;
  }

  if (literalProperties.includes(key)) {
    // Simple array value for a property that can't be interpolated
    return value;
  }
  
  // Fix text-offset: [0] -> [0, 0]
  if (key === 'text-offset' && value.length === 1) {
    return [value[0], 0];
  }
  
  return value;
}

function fixStepArrayValues(expression: unknown[]): unknown[] {
  return expression.map((item, index) => {
    if (index < 2) return item;
    if (index >= 3 && index % 2 === 1) return item;
    return wrapLiteralArrayValue(item);
  });
}

function fixInterpolateArrayValues(expression: unknown[]): unknown[] {
  return expression.map((item, index) => {
    if (index < 3) return item;
    if (index % 2 === 1) return item;
    return wrapLiteralArrayValue(item);
  });
}

function fixMatchArrayValues(expression: unknown[]): unknown[] {
  const defaultIndex = expression.length - 1;

  return expression.map((item, index) => {
    if (index < 2) return item;
    if (index === defaultIndex) return wrapLiteralArrayValue(item);
    if (index % 2 === 0) return item;
    return wrapLiteralArrayValue(item);
  });
}

function wrapLiteralArrayValue(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const isNestedExpression = value.length > 0 && typeof value[0] === 'string';
  return isNestedExpression ? value : ['literal', value];
}

function wrapAnyArrayValue(value: unknown): unknown {
  return Array.isArray(value) ? ['literal', value] : value;
}

/**
 * Convert legacy stops syntax to MapLibre expression
 */
function convertStopsToExpression(
  obj: Record<string, unknown>,
  normalizeValue: (value: unknown) => unknown = (value) => value
): unknown[] {
  const stops = obj.stops as [number, unknown][];
  const base = (obj.base as number) || 1;

  // Build interpolate expression
  const expression: unknown[] = [
    'interpolate',
    base === 1 ? ['linear'] : ['exponential', base],
    ['zoom'],
  ];

  for (const [zoom, value] of stops) {
    expression.push(zoom, normalizeValue(value));
  }

  return expression;
}

/**
 * Fix filter expressions for MapLibre compatibility
 */
function fixFilter(filter: unknown[]): unknown[] {
  if (!Array.isArray(filter)) return filter;

  const [operator, ...args] = filter;

  // Fix ["in", "$type", "Point"] -> ["==", ["geometry-type"], "Point"]
  if (operator === 'in' && args[0] === '$type') {
    if (args.length === 2) {
      return ['==', ['geometry-type'], args[1]];
    }
    // Multiple types: ["in", "$type", "Point", "LineString"]
    return ['any', ...args.slice(1).map(type => ['==', ['geometry-type'], type])];
  }

  // Fix ["==", "$type", "Point"] -> ["==", ["geometry-type"], "Point"]
  if ((operator === '==' || operator === '!=') && args[0] === '$type') {
    return [operator, ['geometry-type'], args[1]];
  }

  // Fix ["has", "property"] - already valid, but ensure it's correct
  if (operator === 'has' && typeof args[0] === 'string' && args[0].startsWith('$')) {
    // $type, $id etc need special handling
    return filter;
  }

  // Recursively fix nested filters (all, any, none)
  if (['all', 'any', 'none'].includes(operator as string)) {
    return [operator, ...args.map(arg => 
      Array.isArray(arg) ? fixFilter(arg) : arg
    )];
  }

  // Fix legacy ["!in", ...] -> ["!", ["in", ...]]
  if (operator === '!in') {
    return ['!', ['in', ...args]];
  }

  return filter;
}

/**
 * Get list of clickable layer IDs from style
 */
export function getClickableLayers(style: MapStyle): string[] {
  const sourceLayerPriority: Record<string, number> = {
    airports: 10,
    navaids: 20,
    reporting_points: 30,
    obstacles: 40,
    hang_glidings: 50,
    hotspots: 60,
    rc_airfields: 70,
    airspaces: 80,
    airspaces_border_offset: 90,
    airspaces_border_offset_2x: 91,
  };

  return style.layers
    .filter(layer => {
      const id = layer.id.toLowerCase();
      if (id.startsWith('highlighted-') || id.startsWith('selected-')) return false;

      const sourceLayer = layer['source-layer'];
      if (sourceLayer && sourceLayer in sourceLayerPriority) return true;

      return [
        'airport',
        'navaid',
        'airspace',
        'reporting_point',
        'hotspot',
        'obstacle',
        'hang_gliding',
        'rc_airfield',
      ].some(prefix => id.includes(prefix));
    })
    .sort((a, b) => {
      const sourceLayerA = a['source-layer'] ?? '';
      const sourceLayerB = b['source-layer'] ?? '';
      const priorityA = sourceLayerPriority[sourceLayerA] ?? 100;
      const priorityB = sourceLayerPriority[sourceLayerB] ?? 100;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return clickableLayerPaintPriority(a) - clickableLayerPaintPriority(b);
    })
    .map(layer => layer.id);
}

function clickableLayerPaintPriority(layer: StyleLayer): number {
  if (layer.id.toLowerCase().includes('clicktarget')) return 0;
  if (layer.type === 'symbol') return 1;
  if (layer.type === 'circle') return 2;
  if (layer.type === 'fill') return 3;
  if (layer.type === 'line') return 4;
  return 5;
}

/**
 * Validate converted style
 */
export function validateStyle(style: MapStyle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!style.version || style.version !== 8) {
    errors.push('Style must be version 8');
  }

  if (!style.sources || Object.keys(style.sources).length === 0) {
    errors.push('Style must have at least one source');
  }

  if (!style.layers || style.layers.length === 0) {
    errors.push('Style must have at least one layer');
  }

  if (!style.sprite) {
    errors.push('Style must have a sprite URL');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
