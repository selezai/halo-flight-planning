'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { buildRouteSignature } from '@/lib/planning/airspaceCorridor';
import { createNotamReview } from '@/lib/planning/notams';
import type { RouteNotamReview } from '@/types/planning';

const NOTAM_ROUTE_SIGNATURE_CORRIDOR_NM = 0;

export default function RouteNotamReviewSync() {
  const {
    waypoints,
    cruiseAltitudeFt,
    setRouteNotamReview,
  } = useMapStore();
  const requestId = useRef(0);
  const routeSignature = useMemo(
    () => buildRouteSignature(waypoints, cruiseAltitudeFt, NOTAM_ROUTE_SIGNATURE_CORRIDOR_NM),
    [cruiseAltitudeFt, waypoints]
  );

  useEffect(() => {
    const locations = routeLocations(waypoints);

    if (waypoints.length < 2) {
      setRouteNotamReview(createNotamReview({
        source: 'south-africa-official',
        status: 'needs-route',
        message: 'Add at least two route waypoints to prepare official NOTAM review.',
      }));
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;

    setRouteNotamReview(createNotamReview({
      source: 'south-africa-official',
      status: 'checking',
      message: 'Checking configured NOTAM provider for route airports and navaids...',
      locations,
    }));

    fetch('/api/notams/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        waypoints: waypoints.map((waypoint) => ({
          ident: waypoint.ident,
          type: waypoint.type,
        })),
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok && !isRouteNotamReview(payload)) {
          throw new Error(payload?.error || 'NOTAM review failed.');
        }

        return isRouteNotamReview(payload)
          ? payload
          : createNotamReview({
              source: 'unavailable',
              status: 'unavailable',
              message: payload?.error || 'NOTAM review failed.',
            });
      })
      .then((review) => {
        if (currentRequestId !== requestId.current) return;
        setRouteNotamReview({
          ...review,
          locations: review.locations.length > 0 ? review.locations : locations,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || currentRequestId !== requestId.current) return;

        setRouteNotamReview(createNotamReview({
          source: 'unavailable',
          status: 'unavailable',
          message: error instanceof Error
            ? error.message
            : 'NOTAM review failed.',
          locations,
        }));
      });

    return () => controller.abort();
  }, [routeSignature, setRouteNotamReview, waypoints]);

  return null;
}

function isRouteNotamReview(payload: unknown): payload is RouteNotamReview {
  return (
    Boolean(payload) &&
    typeof payload === 'object' &&
    typeof (payload as RouteNotamReview).source === 'string' &&
    typeof (payload as RouteNotamReview).status === 'string' &&
    typeof (payload as RouteNotamReview).message === 'string' &&
    Array.isArray((payload as RouteNotamReview).notams)
  );
}

function routeLocations(waypoints: Array<{ ident?: string }>): string[] {
  return Array.from(new Set(
    waypoints
      .map((waypoint) => waypoint.ident?.trim().toUpperCase())
      .filter((ident): ident is string => Boolean(ident))
  ));
}
