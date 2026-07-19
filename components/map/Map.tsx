'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore } from '@/stores/mapStore';
import { parseFeature } from '@/lib/openaip/featureParser';
import { getClickableLayers } from '@/lib/openaip/styleConverter';
import { formatCoordinates } from '@/lib/planning/navigation';
import type { ParsedFeature } from '@/types/openaip';

interface MapProps {
  className?: string;
}

type FeatureGeometry = maplibregl.MapGeoJSONFeature['geometry'];

const OPENAIP_DETAIL_ENDPOINTS: Partial<Record<ParsedFeature['type'], string>> = {
  airport: 'airports',
  navaid: 'navaids',
  airspace: 'airspaces',
  reportingPoint: 'reporting-points',
  obstacle: 'obstacles',
  hotspot: 'hotspots',
  hangGliding: 'hang-glidings',
  rcAirfield: 'rc-airfields',
};

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

export default function Map({ className = '' }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const enrichmentRequestId = useRef(0);
  const missingSpriteIds = useRef<Set<string>>(new Set());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    center, 
    zoom, 
    setViewport, 
    setSelectedFeature,
    visibleLayers,
    waypoints,
    planningMode,
    addUserWaypoint,
  } = useMapStore();

  const updateRouteOverlay = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    ensureRouteLayers(map.current);
    const lineSource = map.current.getSource('halo-route-line') as maplibregl.GeoJSONSource | undefined;
    const pointSource = map.current.getSource('halo-route-points') as maplibregl.GeoJSONSource | undefined;

    lineSource?.setData({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: waypoints.map((waypoint) => waypoint.coordinates),
      },
    } as any);

    pointSource?.setData({
      type: 'FeatureCollection',
      features: waypoints.map((waypoint, index) => ({
        type: 'Feature',
        properties: {
          index: index + 1,
          title: waypoint.ident ?? waypoint.name,
        },
        geometry: {
          type: 'Point',
          coordinates: waypoint.coordinates,
        },
      })),
    } as any);
  }, [mapLoaded, waypoints]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Fetch our transformed OpenAIP style
        const styleResponse = await fetch('/api/openaip/style', {
          cache: 'no-store',
        });
        
        if (!styleResponse.ok) {
          throw new Error('Failed to load map style');
        }
        
        const style = await styleResponse.json();
        
        // Initialize MapLibre
        map.current = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center,
          zoom,
          hash: true,
        });

        // Add navigation controls
        map.current.addControl(
          new maplibregl.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        // Add geolocation control
        map.current.addControl(
          new maplibregl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            trackUserLocation: true,
          }),
          'top-right'
        );

        // Add scale control
        map.current.addControl(
          new maplibregl.ScaleControl({
            maxWidth: 200,
            unit: 'nautical',
          }),
          'bottom-left'
        );

        // Map load event
        map.current.on('load', () => {
          setMapLoaded(true);
          ensureRouteLayers(map.current!);
        });

        // Style load event
        map.current.on('style.load', () => {
          setStyleLoaded(true);
          const clickableLayers = getClickableLayers(style);
          setupClickHandlers(clickableLayers);
          updateRouteOverlay();
        });

        // Track viewport changes
        map.current.on('moveend', () => {
          if (!map.current) return;
          const newCenter = map.current.getCenter();
          const newZoom = map.current.getZoom();
          setViewport([newCenter.lng, newCenter.lat], newZoom);
        });

        // Handle missing images (sprites) without breaking the map. Missing IDs
        // are still logged because they indicate style/sprite drift.
        map.current.on('styleimagemissing', (event) => {
          if (!map.current || map.current.hasImage(event.id)) return;

          if (!missingSpriteIds.current.has(event.id)) {
            missingSpriteIds.current.add(event.id);
            console.warn('Missing OpenAIP sprite image:', event.id);
          }

          map.current.addImage(event.id, createTransparentImageData(16, 16), {
            pixelRatio: 1,
          });
        });

        map.current.on('error', (event) => {
          const mapError = event.error instanceof Error
            ? event.error.message
            : 'Aviation map rendering failed';
          console.error('MapLibre error:', mapError);
          setError(mapError);
        });

      } catch (err) {
        console.error('Failed to initialize map:', err);
        setError(err instanceof Error ? err.message : 'Failed to load map');
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up click handlers for aviation features
  const setupClickHandlers = (layers: string[]) => {
    if (!map.current) return;

    // Filter to existing layers
    const existingLayers = layers.filter(id => map.current?.getLayer(id));
    
    // Click handler
    map.current.on('click', (e) => {
      if (!map.current) return;
      
      const features = existingLayers.length
        ? map.current.queryRenderedFeatures(e.point, { layers: existingLayers })
        : [];

      if (features.length > 0) {
        const feature = pickBestFeature(features);
        const parsed = parseFeature({
          properties: feature.properties as Record<string, unknown>,
          geometry: toParserGeometry(feature.geometry),
          sourceLayer: feature.sourceLayer,
          source: feature.source,
        });

        setSelectedFeature(parsed);
        
        if (parsed.sourceId) {
          enrichFeature(parsed, feature.geometry as FeatureGeometry);
        }
      } else if (planningMode) {
        enrichmentRequestId.current += 1;
        addUserWaypoint([e.lngLat.lng, e.lngLat.lat]);
      } else {
        enrichmentRequestId.current += 1;
        setSelectedFeature(null);
      }
    });

    // Hover cursor change
    existingLayers.forEach(layer => {
      map.current?.on('mouseenter', layer, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });
      
      map.current?.on('mouseleave', layer, () => {
        if (map.current) {
          map.current.getCanvas().style.cursor = '';
        }
      });
    });
  };

  // Fetch full feature details from REST API
  const enrichFeature = async (
    feature: ParsedFeature,
    geometry?: FeatureGeometry
  ) => {
    if (!feature.sourceId || !feature.type) return;
    
    const endpoint = OPENAIP_DETAIL_ENDPOINTS[feature.type];
    
    if (!endpoint) return;

    const requestId = ++enrichmentRequestId.current;
    
    try {
      const response = await fetch(`/api/openaip/${endpoint}/${feature.sourceId}`);
      
      if (response.ok) {
        const fullData = await response.json();
        const enrichedFeature = parseFeature({
          properties: fullData as Record<string, unknown>,
          geometry: toParserGeometry(((fullData as Record<string, unknown>).geometry as FeatureGeometry | undefined) ?? geometry),
          sourceLayer: feature.sourceLayer,
        });

        if (requestId !== enrichmentRequestId.current) return;

        setSelectedFeature({
          ...feature,
          ...enrichedFeature,
          sourceId: feature.sourceId,
          sourceLayer: feature.sourceLayer,
          coordinates: feature.coordinates ?? enrichedFeature.coordinates,
          raw: fullData,
          enriched: true,
        });
      }
    } catch (err) {
      console.error('Failed to enrich feature:', err);
    }
  };

  // Update layer visibility
  useEffect(() => {
    if (!map.current || !styleLoaded) return;

    // Map layer visibility to OpenAIP layer prefixes
    const layerPrefixes = {
      airports: ['airport'],
      navaids: ['navaid'],
      airspaces: ['airspace'],
      reportingPoints: ['reporting_point'],
      obstacles: ['obstacle'],
      hotspots: ['hotspot'],
      hangGlidings: ['hang_gliding'],
      rcAirfields: ['rc_airfield'],
    };

    Object.entries(visibleLayers).forEach(([key, visible]) => {
      const prefixes = layerPrefixes[key as keyof typeof layerPrefixes];
      if (!prefixes) return;

      // Find and update all layers with matching prefix
      const style = map.current?.getStyle();
      style?.layers.forEach(layer => {
        const matches = prefixes.some(prefix => 
          layer.id.toLowerCase().includes(prefix)
        );
        
        if (matches) {
          map.current?.setLayoutProperty(
            layer.id,
            'visibility',
            visible ? 'visible' : 'none'
          );
        }
      });
    });
  }, [visibleLayers, styleLoaded]);

  useEffect(() => {
    updateRouteOverlay();
  }, [updateRouteOverlay]);

  // Error state
  if (error) {
    return (
      <div className={`relative h-full w-full bg-slate-100 ${className}`}>
        <OfflinePlanningCanvas />
        <div className="absolute left-4 top-4 max-w-sm rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">Map degraded</p>
          <p>{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="mt-3 rounded bg-amber-900 px-3 py-1.5 text-white hover:bg-amber-800"
          >
            Retry map
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border border-slate-200 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur">
        {planningMode ? 'Planning mode' : 'Inspect mode'}
      </div>
      
      {/* Loading overlay */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading aviation map...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function pickBestFeature(features: maplibregl.MapGeoJSONFeature[]): maplibregl.MapGeoJSONFeature {
  return [...features].sort((a, b) => featurePriority(a) - featurePriority(b))[0];
}

function featurePriority(feature: maplibregl.MapGeoJSONFeature): number {
  const sourceLayer = feature.sourceLayer ?? '';
  const basePriority = FEATURE_PRIORITY[sourceLayer] ?? 100;
  const layerId = feature.layer.id.toLowerCase();

  if (layerId.includes('clicktarget')) return basePriority;
  if (feature.layer.type === 'symbol') return basePriority + 1;
  if (feature.layer.type === 'circle') return basePriority + 2;
  if (feature.layer.type === 'fill') return basePriority + 3;
  if (feature.layer.type === 'line') return basePriority + 4;

  return basePriority + 5;
}

function createTransparentImageData(width: number, height: number) {
  return {
    width,
    height,
    data: new Uint8Array(width * height * 4),
  };
}

function toParserGeometry(geometry: FeatureGeometry | undefined) {
  if (!geometry || !('coordinates' in geometry) || !Array.isArray(geometry.coordinates)) {
    return undefined;
  }

  return geometry as {
    type: string;
    coordinates: number[] | number[][] | number[][][] | number[][][][];
  };
}

function ensureRouteLayers(mapInstance: maplibregl.Map) {
  if (!mapInstance.getSource('halo-route-line')) {
    mapInstance.addSource('halo-route-line', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [],
        },
      } as any,
    });
  }

  if (!mapInstance.getSource('halo-route-points')) {
    mapInstance.addSource('halo-route-points', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      } as any,
    });
  }

  if (!mapInstance.getLayer('halo-route-casing')) {
    mapInstance.addLayer({
      id: 'halo-route-casing',
      type: 'line',
      source: 'halo-route-line',
      paint: {
        'line-color': '#0f172a',
        'line-width': 7,
        'line-opacity': 0.65,
      },
    });
  }

  if (!mapInstance.getLayer('halo-route-line')) {
    mapInstance.addLayer({
      id: 'halo-route-line',
      type: 'line',
      source: 'halo-route-line',
      paint: {
        'line-color': '#f59e0b',
        'line-width': 4,
        'line-opacity': 0.95,
      },
    });
  }

  if (!mapInstance.getLayer('halo-route-points')) {
    mapInstance.addLayer({
      id: 'halo-route-points',
      type: 'circle',
      source: 'halo-route-points',
      paint: {
        'circle-radius': 7,
        'circle-color': '#0f766e',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });
  }

  if (!mapInstance.getLayer('halo-route-labels')) {
    mapInstance.addLayer({
      id: 'halo-route-labels',
      type: 'symbol',
      source: 'halo-route-points',
      layout: {
        'text-field': ['get', 'index'],
        'text-size': 11,
        'text-font': ['Open Sans Bold'],
      },
      paint: {
        'text-color': '#ffffff',
      },
    });
  }
}

function OfflinePlanningCanvas() {
  const { waypoints } = useMapStore();

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#eef2f1]">
      <div className="absolute inset-0 bg-[linear-gradient(#d9e2e1_1px,transparent_1px),linear-gradient(90deg,#d9e2e1_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <div className="max-w-md rounded-md border border-slate-200 bg-white/90 p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Planning route remains available</p>
          <p className="mt-1 text-sm text-slate-600">
            {waypoints.length > 0
              ? `${waypoints.length} waypoint${waypoints.length === 1 ? '' : 's'} saved locally. Last point: ${formatCoordinates(
                  waypoints[waypoints.length - 1].coordinates
                )}`
              : 'Add airports from search or retry the map when credentials/network are ready.'}
          </p>
        </div>
      </div>
    </div>
  );
}
