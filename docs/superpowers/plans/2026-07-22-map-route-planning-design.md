# Map Route Planning UX Design Document

## Problem Statement

Halo currently mixes route editing and aviation-data inspection. In practice, a pilot can click the map intending to place a route waypoint, but the app may open airspace/feature info and force the planner panel open. That makes the map feel unreliable as the primary flight-planning surface.

## Solution Overview

Split map interaction into two explicit modes:

- `Plan route`: map clicks place route waypoints exactly at the clicked coordinates; route waypoints can be selected, edited, dragged, annotated, and deleted on the map.
- `Inspect map`: map clicks inspect OpenAIP aviation features and open the feature details panel; route editing is locked from accidental changes.

The Route panel becomes a worksheet for route setup, sequence review, airspace/fuel scan, layer controls, and dangerous actions. It no longer contains a generic add-point/search block because the map is the primary planning surface.

## Key Decisions

- Use pilot-facing labels `Plan route` and `Inspect map` instead of ambiguous `Planning mode`.
- In `Plan route`, aviation feature picking is bypassed. A map tap/click should never open an airport/airspace tab.
- In `Plan route`, creating or rubber-band inserting a waypoint must not automatically open the Route panel.
- Keep route waypoint editing available in the Route panel, but make the map edit card the primary quick action for a selected waypoint.
- Support mouse and touch dragging by using a larger invisible route-point hit layer and disabling map pan while dragging.
- Do not auto-snap map-created or dragged points. Exact placement is safer and matches the current user request; snap can return later as an explicit action.

## Implementation Notes

- Update `stores/mapStore.ts` so map-created waypoints do not force `sidebarOpen: true`.
- Update `components/map/Map.tsx`:
  - read current `planningMode` from `useMapStore.getState()` inside event handlers to avoid stale closure behavior;
  - in `Plan route`, map click adds a user waypoint exactly at `event.lngLat`;
  - in `Inspect map`, map click uses OpenAIP clickable layers for feature inspection;
  - add a route-point hit target layer;
  - add local selected-waypoint state and a floating map waypoint editor;
  - add touch drag handlers for route points and rubber-band insertion.
- Update `components/shell/HaloAppShell.tsx`:
  - add a visible map mode segmented control while the planner is closed;
  - keep layer/emergency/focus controls separate.
- Update `components/sidebar/Sidebar.tsx`:
  - remove the Add waypoint/search/manual-coordinate block from Route;
  - reword Route setup and empty states around map-first route planning;
  - keep route sequence, notes, reorder, and delete controls.

## Open Questions

- Airport/navaid search as a map overlay or command palette should be designed as a separate slice. It should not live as an overloaded Route tab block.
