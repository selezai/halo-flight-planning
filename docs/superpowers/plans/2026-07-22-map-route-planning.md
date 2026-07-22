# Map Route Planning UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Make the map the primary route-planning surface by separating `Plan route` and `Inspect map` behaviors and streamlining the Route tab into a worksheet.

**Architecture:** Keep all route state in the existing Zustand map store. Add map-only selected-waypoint UI state inside `components/map/Map.tsx`, while the Route tab remains a persisted worksheet using existing waypoint fields and actions.

**Tech Stack:** Next.js App Router, React 18, TypeScript, Zustand, MapLibre GL, Tailwind CSS, Vitest.

---

### Task 1: Persist approved design

**Files:**
- Create: `docs/superpowers/plans/2026-07-22-map-route-planning-design.md`
- Create: `docs/superpowers/plans/2026-07-22-map-route-planning.md`

- [x] **Step 1: Save design doc**

Create the design doc with the mode split, route tab scope, exact-click placement rule, and no auto-snap decision.

- [x] **Step 2: Save implementation plan**

Create this implementation plan with file boundaries, verification steps, and no Playwright/E2E requirement.

### Task 2: Fix store behavior for map-created waypoints

**Files:**
- Modify: `stores/mapStore.ts`
- Test: existing store/planning tests where applicable

- [x] **Step 1: Change `addUserWaypoint` return type**

Change the action type from:

```ts
addUserWaypoint: (coordinates: Coordinates) => void;
```

to:

```ts
addUserWaypoint: (coordinates: Coordinates) => string;
```

- [x] **Step 2: Prevent map-created waypoints from opening the planner**

Implement `addUserWaypoint` with `get()` so it returns the created ID and leaves `sidebarOpen` untouched:

```ts
addUserWaypoint: (coordinates) => {
  const state = get();
  const waypoint = createUserWaypoint(coordinates, state.waypoints.length + 1);

  set({
    waypoints: [...state.waypoints, waypoint],
    selectedFeature: null,
    selectedFeatureCandidates: [],
  });

  return waypoint.id;
},
```

- [x] **Step 3: Prevent rubber-band insert from opening the planner**

Remove `sidebarPanel: 'route'` and `sidebarOpen: true` from `insertRouteWaypoint`. It is a map editing action.

### Task 3: Refactor map event behavior

**Files:**
- Modify: `components/map/Map.tsx`

- [x] **Step 1: Add selected waypoint state**

Add local `selectedWaypointId` state and clear it when the selected waypoint disappears or when the app switches to inspect mode.

- [x] **Step 2: Add route point hit target**

Add `halo-route-point-hit-target` as a larger nearly-transparent circle layer over `halo-route-points` so mouse and touch selection are easier.

- [x] **Step 3: Rewrite click behavior**

Inside the click handler:

```ts
const state = useMapStore.getState();
if (state.planningMode) {
  const waypoint = getRouteWaypointAtPoint(mapInstance, e.point);
  if (waypoint) {
    setSelectedWaypointId(waypoint.id);
    return;
  }

  const waypointId = state.addUserWaypoint([e.lngLat.lng, e.lngLat.lat]);
  setSelectedWaypointId(waypointId);
  return;
}
```

Only run OpenAIP feature picking in inspect mode.

- [x] **Step 4: Add mouse/touch drag support**

Attach route-point drag start to `mousedown` and `touchstart`, update coordinates on `mousemove` and `touchmove`, and finish on `mouseup`, `touchend`, or `touchcancel`.

- [x] **Step 5: Remove automatic snap on drop**

Do not call `getSnapWaypoint` during drag release. The point should remain at the exact dragged coordinate.

- [x] **Step 6: Add floating waypoint editor**

Show a floating map card in `Plan route` when a waypoint is selected with:

```tsx
<input value={waypoint.name} onChange={...} />
<textarea value={waypoint.notes ?? ''} onChange={...} />
<button onClick={delete}>Delete</button>
```

Include coordinates, waypoint index, close action, and touch-friendly sizing.

### Task 4: Add visible map mode control

**Files:**
- Modify: `components/shell/HaloAppShell.tsx`

- [x] **Step 1: Add segmented mode control**

Add a visible control while the planner is closed:

```tsx
<MapModeControl planningMode={planningMode} onChange={setPlanningMode} />
```

The control must expose `Plan route` and `Inspect map` buttons and be usable on phone, tablet, and desktop.

- [x] **Step 2: Remove duplicate mode toggle from icon rail**

Keep the rail for layers, emergency, and focus route. Do not rely on icon-only mode switching.

### Task 5: Streamline Route tab

**Files:**
- Modify: `components/sidebar/Sidebar.tsx`

- [x] **Step 1: Remove add-point search/manual-coordinate block**

Delete Route panel local search/manual coordinate state, OpenAIP waypoint search usage, and the Add waypoint `PanelBlock`.

- [x] **Step 2: Reword route setup**

Keep route name and mode control. Use pilot-facing labels:

```tsx
Plan route
Inspect map
```

- [x] **Step 3: Reorder Route tab sections**

Use:

1. Route setup
2. Navigation log
3. Pilot scan
4. Map layers
5. Danger zone

- [x] **Step 4: Add waypoint notes to route sequence**

Keep inline waypoint name editing and add a note textarea below each waypoint.

### Task 6: Tests, docs, verification, deploy

**Files:**
- Modify: `PROJECT_SESSION_LOG.md`
- Test: existing Vitest suite

- [x] **Step 1: Run approved checks**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

- [x] **Step 2: Do not run Playwright/E2E**

Manual E2E inspection remains user-owned.

- [x] **Step 3: Document the session**

Add a session log entry covering the mode split, exact-click route placement, route tab cleanup, map waypoint editor, verification results, and deployment details.

- [x] **Step 4: Commit, push, deploy**

Commit, push to GitHub, deploy to Vercel production, inspect deployment status, and run a lightweight production route check.
