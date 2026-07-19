'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { buildRouteSignature } from '@/lib/planning/airspaceCorridor';
import type { RouteAirspaceReview } from '@/types/planning';

const CORE_REVIEW_CORRIDOR_NM = 5;

export default function RouteAirspaceReviewSync() {
  const {
    waypoints,
    cruiseAltitudeFt,
    setCoreRouteAirspaceReview,
  } = useMapStore();
  const requestId = useRef(0);
  const routeSignature = useMemo(
    () => buildRouteSignature(waypoints, cruiseAltitudeFt, CORE_REVIEW_CORRIDOR_NM),
    [cruiseAltitudeFt, waypoints]
  );

  useEffect(() => {
    if (waypoints.length < 2) {
      setCoreRouteAirspaceReview(createClientReview({
        status: 'needs-route',
        message: 'Add at least two waypoints to run the OpenAIP Core route corridor airspace review.',
        routeSignature,
      }));
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;

    setCoreRouteAirspaceReview(createClientReview({
      status: 'checking',
      message: 'Checking OpenAIP Core airspaces along the full route corridor...',
      corridorNm: CORE_REVIEW_CORRIDOR_NM,
      routeSignature,
    }));

    fetch('/api/openaip/airspace-review', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        waypoints: waypoints.map((waypoint) => ({
          coordinates: waypoint.coordinates,
        })),
        cruiseAltitudeFt,
        corridorNm: CORE_REVIEW_CORRIDOR_NM,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok && !isRouteAirspaceReview(payload)) {
          throw new Error(payload?.error || 'OpenAIP Core airspace review failed.');
        }

        return isRouteAirspaceReview(payload)
          ? payload
          : createClientReview({
              status: 'unavailable',
              message: payload?.error || 'OpenAIP Core airspace review failed.',
              corridorNm: CORE_REVIEW_CORRIDOR_NM,
              routeSignature,
            });
      })
      .then((review) => {
        if (currentRequestId !== requestId.current) return;
        setCoreRouteAirspaceReview(review);
      })
      .catch((error) => {
        if (controller.signal.aborted || currentRequestId !== requestId.current) return;

        setCoreRouteAirspaceReview(createClientReview({
          status: 'unavailable',
          message: error instanceof Error
            ? error.message
            : 'OpenAIP Core airspace review failed.',
          corridorNm: CORE_REVIEW_CORRIDOR_NM,
          routeSignature,
        }));
      });

    return () => controller.abort();
  }, [cruiseAltitudeFt, routeSignature, setCoreRouteAirspaceReview, waypoints]);

  return null;
}

function createClientReview(
  review: Pick<RouteAirspaceReview, 'status' | 'message'> & Partial<RouteAirspaceReview>
): RouteAirspaceReview {
  return {
    source: 'openaip-core',
    alerts: [],
    sampledPointCount: 0,
    visibleLayerCount: 0,
    updatedAt: new Date().toISOString(),
    ...review,
  };
}

function isRouteAirspaceReview(payload: unknown): payload is RouteAirspaceReview {
  return (
    Boolean(payload) &&
    typeof payload === 'object' &&
    (payload as RouteAirspaceReview).source === 'openaip-core' &&
    typeof (payload as RouteAirspaceReview).status === 'string' &&
    typeof (payload as RouteAirspaceReview).message === 'string' &&
    Array.isArray((payload as RouteAirspaceReview).alerts)
  );
}
