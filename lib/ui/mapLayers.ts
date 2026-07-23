export const HALO_MAP_LAYER_ORDER = [
  'airports',
  'navaids',
  'airspaces',
  'reportingPoints',
  'obstacles',
  'hotspots',
  'hangGlidings',
  'rcAirfields',
] as const;

export type HaloMapLayerId = typeof HALO_MAP_LAYER_ORDER[number];

export const HALO_MAP_LAYER_LABELS: Record<HaloMapLayerId, string> = {
  airports: 'Airports',
  navaids: 'Navaids',
  airspaces: 'Airspaces',
  reportingPoints: 'Reporting points',
  obstacles: 'Obstacles',
  hotspots: 'Hotspots',
  hangGlidings: 'Hang gliding',
  rcAirfields: 'RC airfields',
};

export function formatMapLayerName(layer: string): string {
  return HALO_MAP_LAYER_LABELS[layer as HaloMapLayerId] ?? layer.replace(/([A-Z])/g, ' $1');
}

export function getOrderedMapLayerEntries(
  visibleLayers: Record<string, boolean>
): Array<{ id: string; label: string; enabled: boolean }> {
  const orderedIds = [
    ...HALO_MAP_LAYER_ORDER,
    ...Object.keys(visibleLayers).filter((layer) => !HALO_MAP_LAYER_ORDER.includes(layer as HaloMapLayerId)).sort(),
  ];

  return orderedIds
    .filter((layer) => layer in visibleLayers)
    .map((layer) => ({
      id: layer,
      label: formatMapLayerName(layer),
      enabled: Boolean(visibleLayers[layer]),
    }));
}

export function countEnabledMapLayers(visibleLayers: Record<string, boolean>): number {
  return Object.values(visibleLayers).filter(Boolean).length;
}
