import { parseFeature } from '@/lib/openaip/featureParser';
import type { ParsedFeature } from '@/types/openaip';

type RenderedGeometry = {
  type: string;
  coordinates?: number[] | number[][] | number[][][] | number[][][][];
};

type ParserGeometry = {
  type: string;
  coordinates: number[] | number[][] | number[][][] | number[][][][];
};

export interface RenderedFeatureLike {
  layer?: {
    id?: string;
    type?: string;
  };
  source?: string;
  sourceLayer?: string;
  properties?: Record<string, unknown> | null;
  geometry?: RenderedGeometry | null;
}

const FEATURE_PRIORITY: Record<string, number> = {
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

const DEFAULT_STACK_LIMIT = 12;

export function buildFeatureSelectionStack(
  features: RenderedFeatureLike[],
  limit = DEFAULT_STACK_LIMIT
): ParsedFeature[] {
  const sorted = [...features].sort((a, b) => featurePriority(a) - featurePriority(b));
  const seen = new Set<string>();
  const stack: ParsedFeature[] = [];

  for (const feature of sorted) {
    const parsed = parseFeature({
      properties: feature.properties ?? {},
      geometry: toParserGeometry(feature.geometry),
      sourceLayer: feature.sourceLayer,
      source: feature.source,
    });

    if (parsed.type === 'unknown' && !parsed.sourceId && !parsed.name) {
      continue;
    }

    const key = featureSelectionKey(parsed);
    if (seen.has(key)) continue;

    seen.add(key);
    stack.push(parsed);

    if (stack.length >= limit) break;
  }

  return stack;
}

export function featureSelectionKey(feature: ParsedFeature): string {
  if (feature.sourceId) return `${feature.type}:${feature.sourceId}`;

  const coordinates = feature.coordinates
    ? `${feature.coordinates[0].toFixed(5)},${feature.coordinates[1].toFixed(5)}`
    : 'no-coordinates';
  const label =
    feature.icao ??
    feature.identifier ??
    feature.name ??
    feature.subtype ??
    feature.sourceLayer ??
    feature.featureType ??
    'unknown';

  return `${feature.type}:${label}:${coordinates}`;
}

export function featurePriority(feature: RenderedFeatureLike): number {
  const sourceLayer = normalizeSourceLayer(feature.sourceLayer ?? '');
  const basePriority = FEATURE_PRIORITY[sourceLayer] ?? 100;
  const layerId = feature.layer?.id?.toLowerCase() ?? '';

  if (layerId.includes('clicktarget')) return basePriority;
  if (feature.layer?.type === 'symbol') return basePriority + 1;
  if (feature.layer?.type === 'circle') return basePriority + 2;
  if (feature.layer?.type === 'fill') return basePriority + 3;
  if (feature.layer?.type === 'line') return basePriority + 4;

  return basePriority + 5;
}

function normalizeSourceLayer(sourceLayer: string): string {
  return sourceLayer.replace(/-/g, '_');
}

function toParserGeometry(geometry: RenderedFeatureLike['geometry']): ParserGeometry | undefined {
  if (!geometry || !Array.isArray(geometry.coordinates)) {
    return undefined;
  }

  return {
    type: geometry.type,
    coordinates: geometry.coordinates,
  };
}
