# Automatic Account Sync Plan

## Goal

Make signed-in Halo users automatically keep their planner/account data in the existing Clerk-authenticated Neon snapshot store so clearing browser data no longer loses saved missions, route setup, aircraft profile, W&B, personal minimums, emergency sites, and filing/admin records.

## Existing Foundation

- `app/api/account/snapshot/route.ts` already exposes authenticated `GET` and `PUT`.
- `lib/account/plannerSnapshot.ts` already validates and merges the planner snapshot state.
- `stores/mapStore.ts` already persists the same planner fields locally and exposes `restorePlannerSnapshotState`.
- `components/auth/AccountSyncPanel.tsx` has manual sync UI, but it is not mounted in the main app.

## Implementation Steps

1. Add account sync helper functions:
   - Fingerprint only the meaningful planner snapshot fields.
   - Detect whether the local `halo-map-store` browser key exists.
   - Choose restore behavior:
     - No local persisted state: trust the remote account snapshot.
     - Local persisted state exists: merge local and remote, with local edits winning and remote-only saved items retained.
2. Add a hidden client component:
   - Wait for Clerk `useUser()` to be loaded and signed in.
   - Fetch `/api/account/snapshot` with `cache: 'no-store'`.
   - Restore/merge the remote snapshot using the helper decision.
   - Debounce planner snapshot changes and `PUT` the latest payload.
   - Do not sync transient live GPS, active navigation, selected map feature, or open UI state.
3. Mount the hidden sync component only inside the signed-in dashboard.
4. Add unit coverage for:
   - Remote wins after browser storage is cleared.
   - Local persisted state merges with remote data.
   - Snapshot fingerprints ignore transient state.
5. Verify with typecheck, lint, unit tests, and production build. Do not run Playwright.

## E2E Testing Readiness

Halo is close enough for controlled test-pilot E2E/beta testing after this slice, but not for operational release. The main remaining limitation is that Clerk is still using the development instance on the `vercel.app` domain until a custom production domain is added.
