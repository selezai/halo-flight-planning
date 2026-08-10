# Test Pilot Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Add a low-friction "Continue as test pilot" path that bypasses signup for controlled testing while tracking coded source links.

**Architecture:** Signed-in users keep the authenticated account-sync planner. Unsigned users with `testPilot=1` get the existing local-only planner plus a browser-only tracker. Unsigned users without the test flag still see the account gate.

**Tech Stack:** Next.js App Router, Clerk, Vercel Analytics, React client components, Vitest.

---

### Task 1: Dashboard Gate

**Files:**
- Modify: `app/(dashboard)/page.tsx`

- [x] **Step 1: Read the existing dashboard gate**

Run: `sed -n '1,220p' app/'(dashboard)'/page.tsx`

- [x] **Step 2: Add search param parsing**

Implementation:

```tsx
type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function isTestPilotRequest(searchParams: Record<string, string | string[] | undefined>): boolean {
  return getSingleSearchParam(searchParams.testPilot) === '1';
}
```

- [x] **Step 3: Route unsigned test pilots to local-only planner**

Implementation:

```tsx
if (!userId && testPilotRequest) {
  return (
    <>
      <TestPilotTracker />
      <HaloAppShell />
    </>
  );
}
```

### Task 2: Test Pilot Tracker

**Files:**
- Create: `components/testing/TestPilotTracker.tsx`

- [x] **Step 1: Store a local anonymous session id**

Implementation:

```tsx
const TEST_PILOT_SESSION_STORAGE_KEY = 'halo-test-pilot-session';
```

- [x] **Step 2: Emit Vercel Analytics events**

Implementation:

```tsx
track('test_pilot_started', eventProperties);
track('test_pilot_opened', eventProperties);
```

### Task 3: Gate Button

**Files:**
- Modify: `components/auth/HaloAuthNav.tsx`

- [x] **Step 1: Add a gate-only link**

Implementation:

```tsx
{gate ? (
  <Link href="/?testPilot=1&source=access-gate">Continue as test pilot</Link>
) : null}
```

### Task 4: Verification

**Files:**
- Test: `tests/testing/testPilotAccess.test.ts`

- [x] **Step 1: Add unit coverage for link parsing helpers**

Run: `pnpm test -- tests/testing/testPilotAccess.test.ts`

- [x] **Step 2: Run typecheck**

Run: `pnpm typecheck`

- [x] **Step 3: Run lint**

Run: `pnpm lint`

- [x] **Step 4: Run production build**

Run: `pnpm build`
