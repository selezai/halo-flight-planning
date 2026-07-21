# Unified Planner + Mission Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Replace the visually competing dashboard/deck controls with one unified Planner surface and add a local Mission Library so Halo supports multiple mission drafts while keeping one active mission on the map.

**Architecture:** Keep the existing map-first shell and planning calculations. Move mission status from a large competing dashboard into a compact closed-state map card plus a Planner summary header. Store Mission Library records in the existing Zustand planner store and account snapshot JSON, avoiding database migrations.

**Tech Stack:** Next.js App Router, React client components, Zustand persistence, TypeScript, Vitest, shadcn/ui/Radix primitives, Tailwind CSS.

---

### Task 1: Add mission library domain helpers

**Files:**
- Modify: `types/planning.ts`
- Create: `lib/planning/missions.ts`
- Test: `tests/planning/missions.test.ts`

- [ ] **Step 1: Add mission types**

Add `HaloMissionStatus`, `HaloMissionPlannerState`, and `HaloMissionRecord` to `types/planning.ts`.

- [ ] **Step 2: Add helper functions**

Create `lib/planning/missions.ts` with pure helpers:

```ts
export function buildMissionDisplayName(routeName: string | undefined, waypoints: Waypoint[]): string;
export function buildMissionRouteLabel(waypoints: Waypoint[]): string;
export function createMissionRecord(params: CreateMissionRecordParams): HaloMissionRecord;
export function upsertMissionRecord(records: HaloMissionRecord[], record: HaloMissionRecord): HaloMissionRecord[];
export function sortMissionRecords(records: HaloMissionRecord[]): HaloMissionRecord[];
export function getMissionStatusFromHaloStatus(status: HaloStatusTone): HaloMissionStatus;
```

- [ ] **Step 3: Add unit tests**

Tests must cover:

- unnamed missions fall back to route identifiers or “Untitled mission”;
- active mission save upserts instead of duplicating;
- archived missions sort after active drafts;
- Halo `idle/review/stop/ready` status maps to mission library status.

- [ ] **Step 4: Run focused test**

Run: `pnpm vitest run tests/planning/missions.test.ts`

Expected: mission helper tests pass.

---

### Task 2: Persist Mission Library in the planner store

**Files:**
- Modify: `stores/mapStore.ts`
- Modify: `lib/account/plannerSnapshot.ts`
- Modify: `tests/account/plannerSnapshot.test.ts`

- [ ] **Step 1: Add store fields**

Add:

```ts
activeMissionId: string;
missionLibrary: HaloMissionRecord[];
```

- [ ] **Step 2: Add store actions**

Add:

```ts
saveActiveMission: (status?: HaloMissionStatus) => void;
createBlankMission: () => void;
duplicateActiveMission: () => void;
loadMission: (id: string) => void;
archiveMission: (id: string) => void;
```

- [ ] **Step 3: Snapshot compatibility**

Add `activeMissionId` and `missionLibrary` to `PLANNER_SNAPSHOT_KEYS` and schema validation.

- [ ] **Step 4: Tests**

Update account snapshot tests to prove mission library data is extracted and merged through account sync JSON.

---

### Task 3: Replace competing decks with one Planner concept

**Files:**
- Modify: `components/shell/HaloAppShell.tsx`
- Modify: `components/sidebar/Sidebar.tsx`
- Modify: `components/shell/haloNavigation.tsx` if labels need adjustment.

- [ ] **Step 1: Rename user-facing Deck to Planner**

Top bar button text becomes `Planner`. Desktop floating fallback becomes `Open planner`.

- [ ] **Step 2: Convert large map dashboard to compact closed-state status**

Closed map state should show a compact `MissionStatusCard` with:

- status;
- title;
- one-line detail;
- primary action;
- mission library action.

- [ ] **Step 3: Add Planner summary header**

The existing mission metrics move into the top of the Planner panel, above Route/Wx/W&B/Brief/Admin/Emerg tabs.

- [ ] **Step 4: Keep map tools separate**

Rename conceptually from deck to map tools. Map tools stay small and only control the map.

---

### Task 4: Add Mission Library UI

**Files:**
- Modify: `components/shell/HaloAppShell.tsx`

- [ ] **Step 1: Add Mission Library dialog**

Dialog includes:

- active mission status;
- recent saved missions;
- Save active mission;
- New blank mission;
- Duplicate active mission;
- Load mission;
- Archive mission.

- [ ] **Step 2: Mobile behavior**

Use the same dialog component with full-width responsive sizing. Do not introduce another deck.

- [ ] **Step 3: Empty state**

When there are no saved missions, show “Save this mission to keep it in your library.”

---

### Task 5: Documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `PROJECT_SESSION_LOG.md`
- Modify: `docs/superpowers/plans/2026-07-21-halo-ux-ui-overhaul.md`

- [ ] **Step 1: Document decisions**

Document that Halo has one active mission on the map and many saved mission drafts in the Mission Library.

- [ ] **Step 2: Run approved checks**

Run:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Do not run Playwright/E2E.

- [ ] **Step 3: Browser smoke**

Use browser smoke only for visual layout inspection:

- phone: verify Planner opens and scrolls;
- desktop: verify only one Planner surface opens;
- verify Mission Library dialog opens.

---

## Implementation Result

Implemented in this slice:

- One detailed Planner surface across desktop/tablet/mobile.
- Compact closed-state Mission Status card.
- Planner summary header with route, fuel, airspace, W&B, admin, freshness, fuel margin, Save active, and Missions actions.
- Mission Library dialog with Save active, New mission, Duplicate, Load, and Archive.
- Local/Zustand persisted Mission Library.
- Existing account snapshot JSON now includes `activeMissionId` and `missionLibrary`.
- User-facing “Deck” copy removed from app code and replaced with “Planner”.
- Map controls retained as separate map tools, not a second planning deck.

Follow-up fix after desktop review:

- Removed the closed-state Active Mission card at desktop widths because the top bar and right Planner already provide that context.
- Kept the compact Mission Status card only below the desktop breakpoint.
- Moved Route/Wx/W&B/Brief/Admin/Emerg navigation above the Planner summary header so the planning options are immediately reachable.
- Compressed the Planner summary header so it behaves like a header instead of another dashboard:
  - one-line detail;
  - four compact status chips;
  - smaller fuel margin bar;
  - Save active and Missions actions retained.

Verification completed:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- Local browser smoke at phone and desktop widths.

No Playwright/E2E command was run.
