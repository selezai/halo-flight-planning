'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useMapStore } from '@/stores/mapStore';
import { buildRouteNotamLocations, createNotamReview } from '@/lib/planning/notams';
import type { RouteNotamReview } from '@/types/planning';

export default function RouteNotamReviewSync() {
  const {
    waypoints,
    setRouteNotamReview,
  } = useMapStore();
  const requestId = useRef(0);
  const routeSignature = useMemo(
    () => buildNotamRouteSignature(waypoints),
    [waypoints]
  );

  useEffect(() => {
    const locations = buildRouteNotamLocations(waypoints);

    if (waypoints.length < 2) {
      setRouteNotamReview(createNotamReview({
        source: 'south-africa-official',
        status: 'needs-route',
        message: 'Add at least two route waypoints to prepare the official NOTAM briefing checklist.',
      }));
      return;
    }

    const controller = new AbortController();
    const currentRequestId = ++requestId.current;

    setRouteNotamReview(createNotamReview({
      source: 'south-africa-official',
      status: 'checking',
      message: 'Preparing route NOTAM briefing requirements...',
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
          throw new Error(payload?.error || 'Route NOTAM review failed.');
        }

        return isRouteNotamReview(payload)
          ? payload
          : createNotamReview({
              source: 'unavailable',
              status: 'unavailable',
              message: payload?.error || 'Route NOTAM review failed.',
            });
      })
      .then((review) => {
        if (currentRequestId !== requestId.current) return;
        setRouteNotamReview(review);
      })
      .catch((error) => {
        if (controller.signal.aborted || currentRequestId !== requestId.current) return;

        setRouteNotamReview(createNotamReview({
          source: 'unavailable',
          status: 'unavailable',
          message: error instanceof Error
            ? error.message
            : 'Route NOTAM review failed.',
          locations,
        }));
      });

    return () => controller.abort();
  }, [routeSignature, setRouteNotamReview, waypoints]);

  return null;
}

function buildNotamRouteSignature(waypoints: Array<{ ident?: string; type: string }>): string {
  return JSON.stringify(waypoints.map((waypoint) => ({
    ident: waypoint.ident?.trim().toUpperCase() ?? '',
    type: waypoint.type,
  })));
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
