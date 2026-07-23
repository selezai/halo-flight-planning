'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Navigation, Trash2, X } from 'lucide-react';
import { useMapStore } from '@/stores/mapStore';
import {
  buildFeatureSelectionStack,
  featureSelectionKey,
} from '@/lib/openaip/featureSelection';
import { parseFeature } from '@/lib/openaip/featureParser';
import { getClickableLayers } from '@/lib/openaip/styleConverter';
import { buildRouteAirspaceAlert, sortRouteAirspaceAlerts } from '@/lib/planning/airspaceReview';
import { calculateGlideRadiusNm } from '@/lib/planning/emergencyPlanning';
import {
  didPointerDrag,
  getPlanningMapClickAction,
  isMultiTouchGesture,
  normalizeScreenPoint,
  type ScreenPoint,
} from '@/lib/planning/mapInteraction';
import { calculateDistanceNm, createUserWaypoint, formatCoordinates } from '@/lib/planning/navigation';
import { getNearestRouteLegIndex } from '@/lib/planning/rubberBandRoute';
import type { ParsedFeature } from '@/types/openaip';
import type { Coordinates, RouteAirspaceAlert, RouteAirspaceReview, Waypoint } from '@/types/planning';

interface MapProps {
  className?: string;
}

type FeatureGeometry = maplibregl.MapGeoJSONFeature['geometry'];

const ROUTE_AIRSPACE_SAMPLE_SPACING_PX = 32;
const ROUTE_AIRSPACE_REVIEW_DEBOUNCE_MS = 700;
const ROUTE_GESTURE_CLICK_SUPPRESSION_MS = 250;

const AIRSPACE_SOURCE_LAYERS = new Set([
  'airspaces',
  'airspaces_border_offset',
  'airspaces_border_offset_2x',
]);

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

export default function Map({ className = '' }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const enrichmentRequestId = useRef(0);
  const missingSpriteIds = useRef<Set<string>>(new Set());
  const draggingWaypointId = useRef<string | null>(null);
  const draggingInsertedWaypoint = useRef(false);
  const dragStartPoint = useRef<ScreenPoint | null>(null);
  const dragMoved = useRef(false);
  const lastDragCoordinates = useRef<Coordinates | null>(null);
  const selectedWaypointIdRef = useRef<string | null>(null);
  const rubberBandHandlersAttached = useRef(false);
  const routeAirspaceReviewTimer = useRef<number | null>(null);
  const routeGestureClickSuppressionTimer = useRef<number | null>(null);
  const suppressNextMapClick = useRef(false);
  const initialViewport = useRef<{ center: [number, number]; zoom: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [styleLoaded, setStyleLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWaypointId, setSelectedWaypointId] = useState<string | null>(null);

  if (!initialViewport.current) {
    const state = useMapStore.getState();
    initialViewport.current = {
      center: state.center,
      zoom: state.zoom,
    };
  }

  const setViewport = useMapStore((state) => state.setViewport);
  const setSelectedFeature = useMapStore((state) => state.setSelectedFeature);
  const selectedFeature = useMapStore((state) => state.selectedFeature);
  const selectedFeatureCandidates = useMapStore((state) => state.selectedFeatureCandidates);
  const visibleLayers = useMapStore((state) => state.visibleLayers);
  const waypoints = useMapStore((state) => state.waypoints);
  const activeAircraft = useMapStore((state) => state.activeAircraft);
  const cruiseAltitudeFt = useMapStore((state) => state.cruiseAltitudeFt);
  const emergencyLandingSites = useMapStore((state) => state.emergencyLandingSites);
  const planningMode = useMapStore((state) => state.planningMode);
  const routeEditingActive = useMapStore((state) => state.routeEditingActive);
  const updateRouteWaypoint = useMapStore((state) => state.updateRouteWaypoint);
  const removeRouteWaypoint = useMapStore((state) => state.removeRouteWaypoint);
  const setRenderedRouteAirspaceReview = useMapStore((state) => state.setRenderedRouteAirspaceReview);
  const selectedWaypoint = useMemo(
    () => waypoints.find((waypoint) => waypoint.id === selectedWaypointId) ?? null,
    [selectedWaypointId, waypoints]
  );
  const selectedWaypointIndex = selectedWaypoint
    ? waypoints.findIndex((waypoint) => waypoint.id === selectedWaypoint.id)
    : -1;

  useEffect(() => {
    selectedWaypointIdRef.current = selectedWaypointId;
  }, [selectedWaypointId]);

  const updateRouteOverlay = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    updateRouteOverlayData(map.current, waypoints, selectedWaypointId);
  }, [mapLoaded, selectedWaypointId, waypoints]);

  const updateEmergencyOverlay = useCallback(() => {
    if (!map.current || !mapLoaded) return;

    ensureEmergencyLayers(map.current);
    const ringsSource = map.current.getSource('halo-glide-rings') as maplibregl.GeoJSONSource | undefined;
    const sitesSource = map.current.getSource('halo-emergency-sites') as maplibregl.GeoJSONSource | undefined;
    const glideRadiusNm = calculateGlideRadiusNm(cruiseAltitudeFt, activeAircraft.glideRatio ?? 9);

    ringsSource?.setData({
      type: 'FeatureCollection',
      features: glideRadiusNm > 0
        ? waypoints.map((waypoint, index) => ({
          type: 'Feature',
          properties: {
            title: waypoint.ident ?? waypoint.name,
            index: index + 1,
            radiusNm: glideRadiusNm,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [buildCircleCoordinates(waypoint.coordinates, glideRadiusNm)],
          },
        }))
        : [],
    } as any);

    sitesSource?.setData({
      type: 'FeatureCollection',
      features: emergencyLandingSites.map((site) => ({
        type: 'Feature',
        properties: {
          title: site.name,
          suitability: site.suitability,
        },
        geometry: {
          type: 'Point',
          coordinates: site.coordinates,
        },
      })),
    } as any);
  }, [activeAircraft.glideRatio, cruiseAltitudeFt, emergencyLandingSites, mapLoaded, waypoints]);

  const updateRouteAirspaceReview = useCallback(() => {
    if (routeEditingActive) return;

    if (waypoints.length < 2) {
      setRenderedRouteAirspaceReview(createRouteAirspaceReview({
        status: 'needs-route',
        message: 'Add at least two waypoints to review rendered OpenAIP airspace along the route.',
      }));
      return;
    }

    if (!map.current || !mapLoaded || !styleLoaded) {
      setRenderedRouteAirspaceReview(createRouteAirspaceReview({
        status: 'map-loading',
        message: 'Aviation map tiles are still loading; airspace review will refresh automatically.',
      }));
      return;
    }

    if (!visibleLayers.airspaces) {
      setRenderedRouteAirspaceReview(createRouteAirspaceReview({
        status: 'airspace-hidden',
        message: 'Enable the OpenAIP airspace layer to run the rendered route airspace review.',
      }));
      return;
    }

    const mapInstance = map.current;
    const airspaceLayers = getVisibleAirspaceLayerIds(mapInstance);
    const allSamples = sampleRouteScreenPoints(mapInstance, waypoints);
    const visibleSamples = allSamples.filter((sample) => isPointInsideMapCanvas(mapInstance, sample.screenPoint));

    if (airspaceLayers.length === 0) {
      setRenderedRouteAirspaceReview(createRouteAirspaceReview({
        status: 'map-loading',
        message: 'No visible OpenAIP airspace layers are available yet; zoom or wait for the style to finish loading.',
        sampledPointCount: visibleSamples.length,
      }));
      return;
    }

    if (visibleSamples.length === 0) {
      setRenderedRouteAirspaceReview(createRouteAirspaceReview({
        status: 'partial',
        message: 'The planned route is outside the current map view. Pan or zoom to the route to refresh the rendered airspace review.',
        visibleLayerCount: airspaceLayers.length,
      }));
      return;
    }

    const alertsById = new globalThis.Map<string, RouteAirspaceAlert>();

    for (const sample of visibleSamples) {
      const features = mapInstance.queryRenderedFeatures(sample.screenPoint, { layers: airspaceLayers });

      for (const feature of features) {
        const parsed = parseFeature({
          properties: feature.properties as Record<string, unknown>,
          geometry: toParserGeometry(feature.geometry),
          sourceLayer: feature.sourceLayer,
          source: feature.source,
        });
        const alert = buildRouteAirspaceAlert(parsed, cruiseAltitudeFt, {
          startDistanceNm: sample.distanceNm,
          endDistanceNm: sample.distanceNm,
        });

        if (!alert) continue;

        const existing = alertsById.get(alert.id);
        alertsById.set(alert.id, existing ? mergeRenderedAirspaceAlert(existing, alert) : alert);
      }
    }

    const alerts = sortRouteAirspaceAlerts(Array.from(alertsById.values()));
    const status = visibleSamples.length < allSamples.length ? 'partial' : 'complete';

    setRenderedRouteAirspaceReview(createRouteAirspaceReview({
      status,
      message: buildRouteAirspaceReviewMessage({
        alerts,
        status,
        cruiseAltitudeFt,
        routePartlyOutsideView: visibleSamples.length < allSamples.length,
      }),
      alerts,
      sampledPointCount: visibleSamples.length,
      visibleLayerCount: airspaceLayers.length,
    }));
  }, [
    cruiseAltitudeFt,
    mapLoaded,
    routeEditingActive,
    setRenderedRouteAirspaceReview,
    styleLoaded,
    visibleLayers.airspaces,
    waypoints,
  ]);

  const scheduleRouteAirspaceReview = useCallback(() => {
    if (routeAirspaceReviewTimer.current) {
      window.clearTimeout(routeAirspaceReviewTimer.current);
    }

    routeAirspaceReviewTimer.current = window.setTimeout(() => {
      routeAirspaceReviewTimer.current = null;
      updateRouteAirspaceReview();
    }, ROUTE_AIRSPACE_REVIEW_DEBOUNCE_MS);
  }, [updateRouteAirspaceReview]);

  useEffect(() => {
    if (!selectedWaypointId) return;
    if (!planningMode || !waypoints.some((waypoint) => waypoint.id === selectedWaypointId)) {
      setSelectedWaypointId(null);
    }
  }, [planningMode, selectedWaypointId, waypoints]);

  useEffect(() => {
    return () => {
      if (routeAirspaceReviewTimer.current) {
        window.clearTimeout(routeAirspaceReviewTimer.current);
      }
      if (routeGestureClickSuppressionTimer.current) {
        window.clearTimeout(routeGestureClickSuppressionTimer.current);
      }
      useMapStore.getState().setRouteEditingActive(false);
    };
  }, []);

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
        const { center: initialCenter, zoom: initialZoom } = initialViewport.current ?? {
          center: [28.0, -26.0] as [number, number],
          zoom: 7,
        };
        
        // Initialize MapLibre
        map.current = new maplibregl.Map({
          container: mapContainer.current!,
          style,
          center: initialCenter,
          zoom: initialZoom,
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
          ensureEmergencyLayers(map.current!);
        });

        // Style load event
        map.current.on('style.load', () => {
          setStyleLoaded(true);
          ensureRouteLayers(map.current!);
          ensureEmergencyLayers(map.current!);
          const clickableLayers = getClickableLayers(style);
          setupClickHandlers(clickableLayers);
          setupRubberBandHandlers();
          updateRouteOverlay();
          updateEmergencyOverlay();
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

          if (!missingSpriteIds.current.has(event.id) && process.env.NODE_ENV !== 'production') {
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
    map.current.on('click', (event) => {
      const mapInstance = map.current;
      if (!mapInstance) return;

      if (suppressNextMapClick.current) {
        suppressNextMapClick.current = false;
        return;
      }

      const state = useMapStore.getState();

      if (state.planningMode) {
        enrichmentRequestId.current += 1;
        const routeWaypoint = getRouteWaypointAtPoint(mapInstance, event.point);
        const planningClickAction = getPlanningMapClickAction(routeWaypoint?.id);

        if (planningClickAction.kind === 'select-waypoint') {
          setSelectedWaypointId(planningClickAction.waypointId);
          return;
        }

        state.addUserWaypoint([event.lngLat.lng, event.lngLat.lat]);
        setSelectedWaypointId(null);
        return;
      }
      
      const features = existingLayers.length
        ? mapInstance.queryRenderedFeatures(event.point, { layers: existingLayers })
        : [];
      const featureStack = buildFeatureSelectionStack(features);

      if (featureStack.length > 0) {
        setSelectedFeature(featureStack[0], featureStack);
      } else {
        enrichmentRequestId.current += 1;
        state.clearSelection();
      }
    });

    // Hover cursor change
    existingLayers.forEach(layer => {
      map.current?.on('mouseenter', layer, () => {
        if (map.current && !useMapStore.getState().planningMode) {
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

  const setupRubberBandHandlers = () => {
    if (!map.current || rubberBandHandlersAttached.current) return;
    if (!map.current.getLayer('halo-route-line') || !map.current.getLayer('halo-route-point-hit-target')) return;

    rubberBandHandlersAttached.current = true;
    const mapInstance = map.current;

    const suppressRouteGestureClick = () => {
      if (routeGestureClickSuppressionTimer.current) {
        window.clearTimeout(routeGestureClickSuppressionTimer.current);
      }

      suppressNextMapClick.current = true;
      routeGestureClickSuppressionTimer.current = window.setTimeout(() => {
        routeGestureClickSuppressionTimer.current = null;
        suppressNextMapClick.current = false;
      }, ROUTE_GESTURE_CLICK_SUPPRESSION_MS);
    };

    const clearRouteGestureState = () => {
      draggingWaypointId.current = null;
      draggingInsertedWaypoint.current = false;
      dragStartPoint.current = null;
      dragMoved.current = false;
      lastDragCoordinates.current = null;
      mapInstance.dragPan.enable();
      mapInstance.getCanvas().style.cursor = '';
    };

    const cancelRouteGesture = () => {
      const waypointId = draggingWaypointId.current;
      const wasInsertedWaypoint = draggingInsertedWaypoint.current;

      if (waypointId && wasInsertedWaypoint) {
        useMapStore.getState().removeRouteWaypoint(waypointId);
      }

      const state = useMapStore.getState();
      state.setRouteEditingActive(false);

      if (waypointId) {
        updateRouteOverlayData(mapInstance, state.waypoints, selectedWaypointIdRef.current);
      }

      clearRouteGestureState();
      suppressRouteGestureClick();
    };

    const cancelRouteGestureForMultiTouch = (event: maplibregl.MapTouchEvent) => {
      if (isMultiTouchGesture(event)) {
        cancelRouteGesture();
      }
    };

    const startWaypointDrag = (event: maplibregl.MapLayerMouseEvent | maplibregl.MapLayerTouchEvent) => {
      if (isMultiTouchGesture(event)) {
        cancelRouteGesture();
        return;
      }

      const state = useMapStore.getState();
      if (!state.planningMode) return;

      const id = String(event.features?.[0]?.properties?.id ?? '');
      if (!id) return;

      event.preventDefault();
      draggingWaypointId.current = id;
      draggingInsertedWaypoint.current = false;
      dragStartPoint.current = getEventScreenPoint(event);
      dragMoved.current = false;
      lastDragCoordinates.current = [event.lngLat.lng, event.lngLat.lat];
      state.setRouteEditingActive(true);
      suppressRouteGestureClick();
      mapInstance.dragPan.disable();
      mapInstance.getCanvas().style.cursor = 'grabbing';
    };

    const startInsertDrag = (event: maplibregl.MapLayerMouseEvent | maplibregl.MapLayerTouchEvent) => {
      if (isMultiTouchGesture(event)) {
        cancelRouteGesture();
        return;
      }

      if (draggingWaypointId.current) return;
      const state = useMapStore.getState();
      if (!state.planningMode || state.waypoints.length < 2) return;

      event.preventDefault();
      const coordinates: Coordinates = [event.lngLat.lng, event.lngLat.lat];
      const insertIndex = getNearestRouteLegIndex(state.waypoints, coordinates) + 1;
      const waypoint = createUserWaypoint(coordinates, state.waypoints.length + 1);

      state.insertRouteWaypoint(insertIndex, waypoint);
      draggingWaypointId.current = waypoint.id;
      draggingInsertedWaypoint.current = true;
      dragStartPoint.current = getEventScreenPoint(event);
      dragMoved.current = true;
      lastDragCoordinates.current = coordinates;
      state.setRouteEditingActive(true);
      suppressRouteGestureClick();
      mapInstance.dragPan.disable();
      mapInstance.getCanvas().style.cursor = 'grabbing';
    };

    mapInstance.on('touchstart', cancelRouteGestureForMultiTouch);
    mapInstance.on('mousedown', 'halo-route-point-hit-target', startWaypointDrag);
    mapInstance.on('touchstart', 'halo-route-point-hit-target', startWaypointDrag);
    mapInstance.on('mousedown', 'halo-route-line', startInsertDrag);
    mapInstance.on('mousedown', 'halo-route-casing', startInsertDrag);
    mapInstance.on('touchstart', 'halo-route-line', startInsertDrag);
    mapInstance.on('touchstart', 'halo-route-casing', startInsertDrag);

    const updateDragPosition = (event: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      if (!draggingWaypointId.current) return;
      if (isMultiTouchGesture(event)) {
        cancelRouteGesture();
        return;
      }

      const coordinates: Coordinates = [event.lngLat.lng, event.lngLat.lat];
      event.preventDefault();
      dragMoved.current = didPointerDrag(dragStartPoint.current, getEventScreenPoint(event), dragMoved.current);
      lastDragCoordinates.current = coordinates;
      const state = useMapStore.getState();
      updateRouteOverlayData(
        mapInstance,
        state.waypoints.map((waypoint) =>
          waypoint.id === draggingWaypointId.current ? { ...waypoint, coordinates } : waypoint
        ),
        draggingWaypointId.current
      );
    };

    const finishDrag = (event?: maplibregl.MapMouseEvent | maplibregl.MapTouchEvent) => {
      if (!draggingWaypointId.current) return;
      if (isMultiTouchGesture(event)) {
        cancelRouteGesture();
        return;
      }

      const waypointId = draggingWaypointId.current;
      const coordinates: Coordinates | null = event
        ? [event.lngLat.lng, event.lngLat.lat]
        : lastDragCoordinates.current;
      const state = useMapStore.getState();
      const currentWaypoint = state.waypoints.find((waypoint) => waypoint.id === waypointId);
      const wasDrag = didPointerDrag(dragStartPoint.current, getEventScreenPoint(event), dragMoved.current);

      event?.preventDefault();

      if (currentWaypoint && coordinates && (wasDrag || draggingInsertedWaypoint.current)) {
        state.updateRouteWaypoint(waypointId, {
          coordinates,
          type: 'user',
          ident: currentWaypoint.type === 'user' ? currentWaypoint.ident : undefined,
          name: currentWaypoint.type === 'user' ? currentWaypoint.name : `Moved ${currentWaypoint.ident ?? currentWaypoint.name}`,
          sourceId: undefined,
        });
      } else if (event && currentWaypoint && !draggingInsertedWaypoint.current) {
        setSelectedWaypointId(waypointId);
      }

      state.setRouteEditingActive(false);
      clearRouteGestureState();
      suppressRouteGestureClick();
    };

    mapInstance.on('mousemove', updateDragPosition);
    mapInstance.on('touchmove', updateDragPosition);
    mapInstance.on('mouseup', finishDrag);
    mapInstance.on('touchend', finishDrag);
    mapInstance.on('touchcancel', cancelRouteGesture);

    mapInstance.on('mouseenter', 'halo-route-point-hit-target', () => {
      if (useMapStore.getState().planningMode) {
        mapInstance.getCanvas().style.cursor = 'grab';
      }
    });

    mapInstance.on('mouseleave', 'halo-route-point-hit-target', () => {
      if (!draggingWaypointId.current) {
        mapInstance.getCanvas().style.cursor = '';
      }
    });

    mapInstance.on('mouseenter', 'halo-route-line', () => {
      if (useMapStore.getState().planningMode) {
        mapInstance.getCanvas().style.cursor = 'copy';
      }
    });
    mapInstance.on('mouseenter', 'halo-route-casing', () => {
      if (useMapStore.getState().planningMode) {
        mapInstance.getCanvas().style.cursor = 'copy';
      }
    });

    mapInstance.on('mouseleave', 'halo-route-line', () => {
      if (!draggingWaypointId.current) {
        mapInstance.getCanvas().style.cursor = '';
      }
    });
    mapInstance.on('mouseleave', 'halo-route-casing', () => {
      if (!draggingWaypointId.current) {
        mapInstance.getCanvas().style.cursor = '';
      }
    });
  };

  // Fetch full feature details from REST API
  const enrichFeature = useCallback(async (
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

        const selectedKey = featureSelectionKey(feature);
        const enrichedSelection = {
          ...feature,
          ...enrichedFeature,
          sourceId: feature.sourceId,
          sourceLayer: feature.sourceLayer,
          coordinates: feature.coordinates ?? enrichedFeature.coordinates,
          raw: fullData,
          enriched: true,
        };
        const updatedCandidates = selectedFeatureCandidates.length
          ? selectedFeatureCandidates.map((candidate) =>
              featureSelectionKey(candidate) === selectedKey
                ? enrichedSelection
                : candidate
            )
          : [enrichedSelection];

        setSelectedFeature(enrichedSelection, updatedCandidates);
      }
    } catch (err) {
      console.error('Failed to enrich feature:', err);
    }
  }, [selectedFeatureCandidates, setSelectedFeature]);

  useEffect(() => {
    if (!selectedFeature || selectedFeature.enriched || !selectedFeature.sourceId) return;
    enrichFeature(selectedFeature);
  }, [enrichFeature, selectedFeature]);

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

  useEffect(() => {
    updateEmergencyOverlay();
  }, [updateEmergencyOverlay]);

  useEffect(() => {
    if (routeEditingActive) return;
    scheduleRouteAirspaceReview();
  }, [routeEditingActive, scheduleRouteAirspaceReview]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !styleLoaded) return;

    const mapInstance = map.current;
    const handleRefresh = () => {
      if (routeEditingActive) return;
      scheduleRouteAirspaceReview();
    };

    mapInstance.on('moveend', handleRefresh);
    mapInstance.on('zoomend', handleRefresh);

    return () => {
      mapInstance.off('moveend', handleRefresh);
      mapInstance.off('zoomend', handleRefresh);
    };
  }, [mapLoaded, routeEditingActive, scheduleRouteAirspaceReview, styleLoaded]);

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

      {planningMode && selectedWaypoint && (
        <RouteWaypointEditor
          waypoint={selectedWaypoint}
          waypointIndex={selectedWaypointIndex}
          waypointCount={waypoints.length}
          onClose={() => setSelectedWaypointId(null)}
          onDelete={() => {
            removeRouteWaypoint(selectedWaypoint.id);
            setSelectedWaypointId(null);
          }}
          onUpdate={(updates) => updateRouteWaypoint(selectedWaypoint.id, updates)}
        />
      )}
      
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

function getEventScreenPoint(event?: unknown): ScreenPoint | null {
  if (!event || typeof event !== 'object' || !('point' in event)) return null;
  return normalizeScreenPoint((event as { point?: unknown }).point);
}

function RouteWaypointEditor({
  waypoint,
  waypointIndex,
  waypointCount,
  onClose,
  onDelete,
  onUpdate,
}: {
  waypoint: Waypoint;
  waypointIndex: number;
  waypointCount: number;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Waypoint>) => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-3 bottom-40 z-20 rounded-[1.35rem] border border-white/80 bg-white/95 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.24)] backdrop-blur-xl sm:bottom-24 sm:left-5 sm:right-auto sm:w-80">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-800">
            <Navigation className="h-3.5 w-3.5" />
            Waypoint {waypointIndex + 1} of {waypointCount}
          </div>
          <p className="mt-1 truncate text-xs font-medium text-slate-500">
            {waypoint.ident ?? waypoint.type.toUpperCase()} · {formatCoordinates(waypoint.coordinates)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          aria-label="Close waypoint editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Name
      </label>
      <input
        value={waypoint.name}
        onChange={(event) => onUpdate({ name: event.target.value })}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
      />

      <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        Pilot note
      </label>
      <textarea
        value={waypoint.notes ?? ''}
        onChange={(event) => onUpdate({ notes: event.target.value })}
        placeholder="Frequency, altitude, visual cue, checkpoint reminder..."
        rows={3}
        className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
      />

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Drag the point to move it.</span>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
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

function getRouteWaypointAtPoint(
  mapInstance: maplibregl.Map,
  point: { x: number; y: number }
): Waypoint | null {
  const radiusPx = 18;
  const bbox: [[number, number], [number, number]] = [
    [point.x - radiusPx, point.y - radiusPx],
    [point.x + radiusPx, point.y + radiusPx],
  ];
  const layers = ['halo-route-point-hit-target', 'halo-route-points'].filter((layer) => mapInstance.getLayer(layer));
  if (layers.length === 0) return null;

  const feature = mapInstance.queryRenderedFeatures(bbox, { layers })[0];
  const waypointId = feature?.properties?.id;
  if (typeof waypointId !== 'string') return null;

  return useMapStore.getState().waypoints.find((waypoint) => waypoint.id === waypointId) ?? null;
}

function makeWaypointFromFeature(feature: ParsedFeature): Waypoint | null {
  if (!feature.coordinates) return null;
  if (feature.type !== 'airport' && feature.type !== 'navaid' && feature.type !== 'reportingPoint') {
    return null;
  }

  const ident = feature.icao ?? feature.identifier;
  const name = feature.name ?? ident ?? 'Snapped waypoint';
  const waypointType = feature.type === 'reportingPoint' ? 'reporting-point' : feature.type;

  return {
    id: String(feature.sourceId ?? ident ?? `${feature.coordinates[0]}-${feature.coordinates[1]}`),
    type: waypointType,
    name: String(name),
    ident: ident ? String(ident) : undefined,
    coordinates: feature.coordinates,
    sourceId: feature.sourceId,
    elevationFt: feature.elevationUnit === 'ft' ? feature.elevation : undefined,
  };
}

function createRouteAirspaceReview(
  review: Pick<RouteAirspaceReview, 'status' | 'message'> & Partial<RouteAirspaceReview>
): RouteAirspaceReview {
  return {
    source: 'rendered-vector',
    alerts: [],
    sampledPointCount: 0,
    visibleLayerCount: 0,
    updatedAt: new Date().toISOString(),
    ...review,
  };
}

function getVisibleAirspaceLayerIds(mapInstance: maplibregl.Map): string[] {
  return (mapInstance.getStyle().layers ?? [])
    .filter((layer) => {
      const sourceLayer = String((layer as Record<string, unknown>)['source-layer'] ?? '').replace(/-/g, '_');
      return AIRSPACE_SOURCE_LAYERS.has(sourceLayer);
    })
    .map((layer) => layer.id)
    .filter((id) => {
      if (!mapInstance.getLayer(id)) return false;
      return mapInstance.getLayoutProperty(id, 'visibility') !== 'none';
    });
}

function sampleRouteScreenPoints(
  mapInstance: maplibregl.Map,
  waypoints: Waypoint[]
): Array<{ screenPoint: [number, number]; distanceNm: number }> {
  const samples: Array<{ screenPoint: [number, number]; distanceNm: number }> = [];
  let cumulativeDistanceNm = 0;

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const from = waypoints[index];
    const to = waypoints[index + 1];
    const start = mapInstance.project(toLngLatLike(waypoints[index]));
    const end = mapInstance.project(toLngLatLike(waypoints[index + 1]));
    const pixelDistance = Math.hypot(end.x - start.x, end.y - start.y);
    const legDistanceNm = calculateDistanceNm(from.coordinates, to.coordinates);
    const steps = Math.max(1, Math.ceil(pixelDistance / ROUTE_AIRSPACE_SAMPLE_SPACING_PX));

    for (let step = 0; step <= steps; step += 1) {
      if (index > 0 && step === 0) continue;

      const progress = step / steps;
      samples.push({
        screenPoint: [
          start.x + (end.x - start.x) * progress,
          start.y + (end.y - start.y) * progress,
        ],
        distanceNm: cumulativeDistanceNm + legDistanceNm * progress,
      });
    }

    cumulativeDistanceNm += legDistanceNm;
  }

  return samples;
}

function mergeRenderedAirspaceAlert(existing: RouteAirspaceAlert, incoming: RouteAirspaceAlert): RouteAirspaceAlert {
  const best = sortRouteAirspaceAlerts([existing, incoming])[0];
  const starts = [existing.startDistanceNm, incoming.startDistanceNm].filter(isFiniteNumber);
  const ends = [existing.endDistanceNm, incoming.endDistanceNm].filter(isFiniteNumber);

  return {
    ...best,
    startDistanceNm: starts.length ? Math.min(...starts) : best.startDistanceNm,
    endDistanceNm: ends.length ? Math.max(...ends) : best.endDistanceNm,
  };
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function toLngLatLike(waypoint: Waypoint): maplibregl.LngLatLike {
  const [lng, lat] = waypoint.coordinates;
  return { lng, lat };
}

function isPointInsideMapCanvas(mapInstance: maplibregl.Map, point: [number, number]): boolean {
  const canvas = mapInstance.getCanvas();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  return point[0] >= 0 && point[0] <= width && point[1] >= 0 && point[1] <= height;
}

function buildRouteAirspaceReviewMessage({
  alerts,
  cruiseAltitudeFt,
  routePartlyOutsideView,
}: {
  alerts: RouteAirspaceAlert[];
  status: RouteAirspaceReview['status'];
  cruiseAltitudeFt: number;
  routePartlyOutsideView: boolean;
}): string {
  const reviewableCount = alerts.filter((alert) => alert.requiresReview).length;
  const criticalCount = alerts.filter((alert) => alert.level === 'critical').length;
  const partialPrefix = routePartlyOutsideView
    ? 'Partial rendered review: part of the route is outside the current map view. '
    : '';

  if (criticalCount > 0) {
    return `${partialPrefix}${criticalCount} rendered OpenAIP airspace intersection${criticalCount === 1 ? '' : 's'} overlap the selected ${Math.round(cruiseAltitudeFt)} ft cruise altitude and require pilot review.`;
  }

  if (reviewableCount > 0) {
    return `${partialPrefix}${reviewableCount} rendered OpenAIP airspace crossing${reviewableCount === 1 ? '' : 's'} require pilot review at ${Math.round(cruiseAltitudeFt)} ft.`;
  }

  if (alerts.length > 0) {
    return `${partialPrefix}${alerts.length} rendered OpenAIP airspace crossing${alerts.length === 1 ? '' : 's'} found; parsed vertical limits do not include ${Math.round(cruiseAltitudeFt)} ft.`;
  }

  return `${partialPrefix}No rendered OpenAIP airspace intersections found along the visible route samples.`;
}

function updateRouteOverlayData(
  mapInstance: maplibregl.Map,
  waypoints: Waypoint[],
  selectedWaypointId: string | null
) {
  ensureRouteLayers(mapInstance);
  const lineSource = mapInstance.getSource('halo-route-line') as maplibregl.GeoJSONSource | undefined;
  const pointSource = mapInstance.getSource('halo-route-points') as maplibregl.GeoJSONSource | undefined;

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
        id: waypoint.id,
        index: index + 1,
        title: waypoint.ident ?? waypoint.name,
        selected: waypoint.id === selectedWaypointId,
      },
      geometry: {
        type: 'Point',
        coordinates: waypoint.coordinates,
      },
    })),
  } as any);
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

  if (!mapInstance.getLayer('halo-route-point-hit-target')) {
    mapInstance.addLayer({
      id: 'halo-route-point-hit-target',
      type: 'circle',
      source: 'halo-route-points',
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['get', 'selected'], false],
          24,
          20,
        ],
        'circle-color': '#0f172a',
        'circle-opacity': 0.01,
      },
    });
  }

  if (!mapInstance.getLayer('halo-route-points')) {
    mapInstance.addLayer({
      id: 'halo-route-points',
      type: 'circle',
      source: 'halo-route-points',
      paint: {
        'circle-radius': [
          'case',
          ['boolean', ['get', 'selected'], false],
          9,
          7,
        ],
        'circle-color': [
          'case',
          ['boolean', ['get', 'selected'], false],
          '#0ea5e9',
          '#0f766e',
        ],
        'circle-stroke-color': [
          'case',
          ['boolean', ['get', 'selected'], false],
          '#fef3c7',
          '#ffffff',
        ],
        'circle-stroke-width': [
          'case',
          ['boolean', ['get', 'selected'], false],
          4,
          2,
        ],
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

function ensureEmergencyLayers(mapInstance: maplibregl.Map) {
  if (!mapInstance.getSource('halo-glide-rings')) {
    mapInstance.addSource('halo-glide-rings', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      } as any,
    });
  }

  if (!mapInstance.getSource('halo-emergency-sites')) {
    mapInstance.addSource('halo-emergency-sites', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      } as any,
    });
  }

  if (!mapInstance.getLayer('halo-glide-rings-fill')) {
    mapInstance.addLayer({
      id: 'halo-glide-rings-fill',
      type: 'fill',
      source: 'halo-glide-rings',
      paint: {
        'fill-color': '#38bdf8',
        'fill-opacity': 0.08,
      },
    });
  }

  if (!mapInstance.getLayer('halo-glide-rings-line')) {
    mapInstance.addLayer({
      id: 'halo-glide-rings-line',
      type: 'line',
      source: 'halo-glide-rings',
      paint: {
        'line-color': '#0284c7',
        'line-width': 2,
        'line-dasharray': [2, 2],
        'line-opacity': 0.75,
      },
    });
  }

  if (!mapInstance.getLayer('halo-emergency-sites')) {
    mapInstance.addLayer({
      id: 'halo-emergency-sites',
      type: 'circle',
      source: 'halo-emergency-sites',
      paint: {
        'circle-radius': 7,
        'circle-color': [
          'match',
          ['get', 'suitability'],
          'good',
          '#059669',
          'caution',
          '#d97706',
          'unsuitable',
          '#e11d48',
          '#64748b',
        ],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });
  }
}

function buildCircleCoordinates(center: Coordinates, radiusNm: number): Coordinates[] {
  const steps = 64;
  const [lng, lat] = center;
  const coordinates: Coordinates[] = [];
  const latRadius = radiusNm / 60;
  const lngRadius = radiusNm / (60 * Math.max(0.15, Math.cos((lat * Math.PI) / 180)));

  for (let index = 0; index <= steps; index += 1) {
    const angle = (index / steps) * Math.PI * 2;
    coordinates.push([
      lng + Math.cos(angle) * lngRadius,
      lat + Math.sin(angle) * latRadius,
    ]);
  }

  return coordinates;
}

function OfflinePlanningCanvas() {
  const waypoints = useMapStore((state) => state.waypoints);

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
