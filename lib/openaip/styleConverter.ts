/**
 * OpenAIP Style Converter
 * Transforms OpenAIP's Mapbox GL style to work with MapLibre GL
 */

interface StyleLayer {
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

interface MapStyle {
  version: number;
  name?: string;
  sprite?: string;
  glyphs?: string;
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
    baseTilesUrl: string;
    baseAttribution: string;
    baseTileSize: number;
  }
): MapStyle {
  const converted = JSON.parse(JSON.stringify(style)) as MapStyle;

  // 1. Replace sprite URL with our hosted sprites
  converted.sprite = options.spriteUrl;

  // 2. Replace glyphs URL (MapTiler or self-hosted)
  converted.glyphs = options.glyphsUrl;

  // 3. Add a base map source
  converted.sources['maptiler-base'] = {
    type: 'raster',
    tiles: [options.baseTilesUrl],
    tileSize: options.baseTileSize,
    attribution: options.baseAttribution,
    maxzoom: 19
  };

  // 4. Rewrite source tile URLs to go through our proxy
  converted.sources = rewriteSources(converted.sources, options.tilesProxyUrl);

  // 5. Fix layers for MapLibre compatibility and filter out problematic ones
  converted.layers = converted.layers
    .filter(layer => !isProblematicLayer(layer))
    .map(fixLayer);

  // 6. Add base map layer at the beginning
  converted.layers.unshift({
    id: 'maptiler-base',
    type: 'raster',
    source: 'maptiler-base',
    minzoom: 0,
    maxzoom: 22
  });

  return converted;
}

/**
 * Check if a layer has known compatibility issues
 */
function isProblematicLayer(layer: StyleLayer): boolean {
  // Remove layers that reference the "composite" source (Mapbox terrain)
  if (layer.source === 'composite') {
    return true;
  }
  
  // Remove layers with complex expressions that cause errors
  // Keep only fill, line, and circle layers - remove all symbol layers
  if (layer.type === 'symbol') {
    return true; // Remove all symbol layers (text/icons)
  }
  
  // Remove line layers with dasharray issues (airspace boundaries)
  if (layer.type === 'line' && layer.paint) {
    const paint = layer.paint as Record<string, unknown>;
    if (paint['line-dasharray']) {
      return true; // Remove lines with dasharray for now
    }
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
          tiles: [`${proxyUrl}/${name}/{z}/{x}/{y}.pbf`],
        };
      } else if (Array.isArray(src.tiles)) {
        // Handle tiles array format
        const tiles = src.tiles as string[];
        if (tiles.some(tile => tile.includes('tiles.openaip.net'))) {
          rewritten[name] = {
            ...src,
            tiles: [`${proxyUrl}/${name}/{z}/{x}/{y}.pbf`],
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
        if (nonInterpolatableProps.includes(key)) {
          fixed[key] = convertStopsToStep(obj);
        } else {
          fixed[key] = convertStopsToExpression(obj);
        }
      } else {
        fixed[key] = value;
      }
    } else if (Array.isArray(value)) {
      // Handle array properties that need fixing
      fixed[key] = fixArrayProperty(key, value);
    } else {
      fixed[key] = value;
    }
  }

  return fixed;
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
function convertStopsToStep(obj: Record<string, unknown>): unknown[] {
  const stops = obj.stops as [number, unknown][];
  
  if (stops.length === 0) {
    return ['step', ['zoom'], null];
  }

  const expression: unknown[] = ['step', ['zoom'], stops[0][1]];
  
  for (let i = 1; i < stops.length; i++) {
    expression.push(stops[i][0], stops[i][1]);
  }

  return expression;
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
    
    // Check if it's an interpolate/step/match expression with array values
    if (operator === 'interpolate' || operator === 'step' || operator === 'match') {
      // Recursively fix array values in the expression
      const fixed = value.map((item, index) => {
        // Skip operator, interpolation type, and input (first 3 items)
        if (index < 3) return item;
        
        // For step/match, check if this is a value (not a stop/condition)
        if (Array.isArray(item)) {
          // Check if it's a nested expression or a literal array
          const isNestedExpression = item.length > 0 && typeof item[0] === 'string';
          
          if (!isNestedExpression) {
            // It's a literal array value, wrap it
            return ['literal', item];
          }
        }
        
        return item;
      });
      return fixed;
    }
    
    return value;
  }
  
  // Not an expression - check if it needs literal wrapping
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

/**
 * Convert legacy stops syntax to MapLibre expression
 */
function convertStopsToExpression(obj: Record<string, unknown>): unknown[] {
  const stops = obj.stops as [number, unknown][];
  const base = (obj.base as number) || 1;

  // Build interpolate expression
  const expression: unknown[] = [
    'interpolate',
    base === 1 ? ['linear'] : ['exponential', base],
    ['zoom'],
  ];

  for (const [zoom, value] of stops) {
    expression.push(zoom, value);
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
  const clickablePrefixes = [
    'airport',
    'navaid',
    'airspace',
    'reporting_point',
    'hotspot',
    'obstacle',
  ];

  return style.layers
    .filter(layer => {
      const id = layer.id.toLowerCase();
      return clickablePrefixes.some(prefix => id.includes(prefix));
    })
    .map(layer => layer.id);
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
