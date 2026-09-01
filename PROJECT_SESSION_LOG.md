# Halo Session Log

## 2026-08-31 Grid MORA And Advanced Fuel Planning

Problem / requested implementation:

- Build South Africa-first, SACAA/ATNS-style planning for Grid MORA and advanced fuel.
- Do not reuse or push the earlier production-readiness stash.
- Keep Grid MORA provider-backed only, with no derived or official-looking values unless licensed data is configured.
- Replace the legacy gallons-per-hour fuel estimate with approved aircraft performance profiles, POH/AFM table validation, wind-aware routing, alternates, holding, reserves, taxi, additional/discretionary fuel, and trust status.

Root cause:

- The old route fuel summary was intentionally simple and could not account for wind, climb, descent, taxi/run-up, holding, alternate fuel, leaning/power settings, or POH/AFM table bounds.
- Aircraft data was stored as a simple aircraft preset/profile, not an account-scoped approved performance profile.
- Grid MORA was not represented in the planning state or data provider model; showing values without a licensed provider would create false authority.

Solution:

- Added fixed-wing aircraft performance profile types for piston, turboprop, and jet aircraft, including source metadata, approval status, fuel units, usable/taxi fuel, and performance tables.
- Added account-scoped aircraft profile APIs:
  - `GET/POST /api/aircraft-profiles`
  - `GET/PATCH /api/aircraft-profiles/[id]`
  - `POST /api/aircraft-profiles/[id]/approve`
  - `GET/POST /api/aircraft-profiles/[id]/tables.csv`
- Added a prepared migration for `halo_aircraft_profiles`; it was not applied to production, and runtime profile writes do not auto-create the table.
- Added CSV import/export and validation for POH/AFM tables, with bounded interpolation and no extrapolation outside available table data.
- Added advanced fuel planning with taxi, climb, cruise, descent, trip, contingency, alternate, holding, final reserve, additional, discretionary, total required, expected landing fuel, remaining fuel, wind-aware groundspeed, and unit conversion.
- Added profile trust rules: draft/incomplete profiles produce untrusted fallback results; only the approval endpoint can make a profile trusted; editing an approved profile returns it to draft.
- Added Grid MORA provider interfaces and UI/report states for route-needed, provider-not-configured, unavailable, stale, partial, and complete data.
- Wired fuel and Grid MORA status into the sidebar, route status bar, mission summary, pilot briefing, and backup/print pack.
- Kept the account planner snapshot lightweight by storing selected profile ids and per-mission fuel/Grid MORA state, not full POH tables.
- Updated the test-pilot local-store reset version to match the new persisted planner schema.

Files modified:

- `types/planning.ts`
- `stores/mapStore.ts`
- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `components/planning/RouteStatusBar.tsx`
- `lib/planning/aircraftPerformance.ts`
- `lib/planning/fuel.ts`
- `lib/planning/gridMora.ts`
- `lib/planning/aircraft.ts`
- `lib/planning/briefing.ts`
- `lib/planning/backupPack.ts`
- `lib/ui/halo.ts`
- `lib/account/aircraftProfileRepository.ts`
- `lib/account/plannerSnapshot.ts`
- `lib/account/autoSync.ts`
- `lib/db/schema.ts`
- `app/api/aircraft-profiles/**`
- `db/migrations/0003_aircraft_performance_profiles.sql`
- `tests/account/aircraftProfilesApi.test.ts`
- `tests/planning/aircraftPerformance.test.ts`
- `tests/planning/fuel.test.ts`
- `tests/planning/gridMora.test.ts`
- updated related existing tests and e2e expectations.

Verification:

- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 47 files / 236 tests.
- `pnpm build`: passed on Next.js `15.5.24`.
- `pnpm test:e2e`: passed, 3 Playwright tests against production build / `next start`.
- Earlier production-readiness changes remain local in stash `codex-prod-readiness-local-2026-08-31` and were not included in this work.

## 2026-08-31 Test Pilot Feedback Investigation

Problem / requested check:

- Investigate pilot feedback before changing behavior:
  - aircraft information entry felt confusing;
  - route loading appeared map-drag-only and needed typed routing/coordinates;
  - frequencies and Grid MORA were requested;
  - fuel calculations were not trusted.
- Keep earlier production-readiness changes local and unpushed.

Root cause:

- The aircraft panel mixed aircraft performance, fuel assumptions, W&B setup, CG envelope, loading stations, and personal minimums in one dense flow; compact navigation also labeled the section only as `W&B`.
- Route entry was map-only in the current UI even though the existing OpenAIP search API could already resolve airports/navaids.
- Feature details already displayed OpenAIP frequency fields when present, but did not explain when the current OpenAIP record had no frequency data.
- Grid MORA does not exist in the current map data model or OpenAIP integration path, so showing values would require a new authoritative chart data source.
- Fuel math intentionally uses route distance, cruise speed, cruise fuel burn, reserve, and contingency only; it does not include wind, climb, descent, taxi/run-up, holding, alternate fuel, leaning, or POH table corrections.

Solution:

- Added typed route loading in the route panel:
  - accepts identifiers such as `FAOR FALA` or `FAOR -> FALA`;
  - accepts coordinate pairs such as `-26.13370, 28.24600` and `S26.13370 E028.24600`;
  - validates all points before replacing the current route;
  - uses existing `/api/openaip/search` for airport/navaid lookup and local parsing for coordinates.
- Reworked aircraft panel wording and grouping so aircraft performance, W&B setup, and personal minimums are visually separated.
- Renamed the compact aircraft nav label from `W&B` to `A/C`.
- Added a fuel estimate basis panel beside route totals with explicit assumptions and exclusions.
- Added frequency data availability messaging in feature details and a chart data availability panel that marks Grid MORA as not loaded from current Halo map data.
- Updated stale e2e expectations to match the current fallback map source, South Africa manual NOTAM handoff, typed route UI, and mobile GPS readiness behavior.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `lib/planning/routeInput.ts`
- `lib/ui/halo.ts`
- `tests/planning/routeInput.test.ts`
- `e2e/api.spec.ts`
- `e2e/flight-planning.spec.ts`
- `e2e/location-tracking.spec.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 43 files / 217 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm test:e2e`: passed, 3 Playwright tests against production build / `next start`.
- Earlier production-readiness changes remain local in stash `codex-prod-readiness-local-2026-08-31` and were not included in this feedback branch.

## 2026-08-10 Mission Library Production Promotion

Problem / requested check:

- User noticed the Mission Library responsive layout deployment appeared as Preview only in Vercel, so production was still showing the old broken layout.

Finding:

- `origin/main` and the working branch both pointed at `b0c78b0`.
- Vercel had created the `b0c78b0` deployment as Preview (`halo-flight-planning-pkedokn7g...`), but the production alias still pointed at the older `dpl_FeY7a4tL9XARpcBiUTwncAkAouy1` deployment.

Action:

- Promoted the ready `b0c78b0` preview deployment to production with Vercel CLI.
- Vercel created production deployment `dpl_AbWeQZbXZrvYonoymmsMfXEGW5ij`.

Verification:

- `vercel inspect halo-flight-planning-kluqlprgu-pilotmerch-gmailcoms-projects.vercel.app`: status `Ready`, target `production`.
- The production deployment aliases include `https://halo-flight-planning.vercel.app`.

## 2026-08-10 Mission Library Responsive Reconstruction

Problem / requested fix:

- The Mission Library saved missions/drafts tab still rendered out of order on tablet/mobile widths.
- The visible symptom was the Drafts/History tab strip and content sitting side-by-side, squeezing the active mission card into a narrow column.

Root cause:

- The shared `Tabs` component used `data-horizontal:*` and `group-data-horizontal:*` selectors, but the Radix tabs root exposes `data-orientation="horizontal"`.
- Because those selectors never matched, horizontal tabs kept the default `flex-row` layout and placed the tab list beside the tab content.
- The tab trigger active-state selectors also used `data-active:*` instead of Radix `data-state="active"`.

Solution:

- Updated `components/ui/tabs.tsx` so horizontal tabs render as `flex-col` directly from the `orientation` prop.
- Updated tabs list/trigger orientation and active-state selectors to match Radix data attributes.
- Reworked the Mission Library dialog tab layout:
  - tab list is always full-width above content;
  - draft/history content is full-width with `min-w-0`;
  - active mission card actions are stacked or two-column on mobile/tablet and only move to a desktop side column at large widths;
  - history/draft rows retain predictable stacked behavior on smaller widths.

Files modified:

- `components/ui/tabs.tsx`
- `components/shell/HaloAppShell.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/planning/missions.test.ts tests/stores/mapStore.test.ts`: passed, 38 files / 192 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual testing were not run per user preference.

## 2026-08-10 Neon Account Sync Env Repair

Problem / requested fix:

- Halo account sync was returning `/api/account/snapshot` HTTP 503 after sign-in.
- User asked to repair `DATABASE_URL` and `POSTGRES_URL` using CLI/app tooling.

Root cause:

- The Vercel project had the Neon Marketplace resource `neon-amber-xylophone` connected, but the previously pulled Production env values for Neon normalized to empty quoted strings.
- Without a usable Postgres URL, the account snapshot API could not connect to Neon, so account data could not persist or restore reliably across sign-out/sign-in, browser clearing, or other devices.

Actions:

- Used latest Vercel CLI `58.9.0` because the installed `48.10.2` CLI did not expose marketplace resource commands.
- Inspected `neon-amber-xylophone` and confirmed it is an owned, available Neon resource connected to `halo-flight-planning`.
- Ran a scoped disconnect/reconnect:
  - `vercel integration-resource disconnect neon-amber-xylophone halo-flight-planning --yes`
  - `vercel integration-resource connect neon-amber-xylophone halo-flight-planning -e production -e preview --yes`
- Confirmed Vercel recreated Neon env vars for Production and Preview.
- Confirmed a fresh Production env pull now includes real Postgres-shaped `DATABASE_URL` and `POSTGRES_URL` values.
- Ran a read-only Neon connectivity smoke check; connection succeeded.
- Confirmed `halo_planner_snapshots` does not exist yet. This is acceptable because the first authenticated snapshot save creates it idempotently through `ensureAccountSnapshotSchema()`.
- Triggered a production redeploy with `vercel redeploy halo-flight-planning.vercel.app --no-wait` so the repaired env revision can reach runtime.

Verification:

- `vercel integration-resource inspect neon-amber-xylophone`: connected to `halo-flight-planning (production, preview)`.
- `vercel env ls production`: Neon env vars recreated for Production and Preview.
- Fresh env pull shape check: `DATABASE_URL` and `POSTGRES_URL` were present, non-empty, and started with a Postgres URL scheme.
- Read-only DB smoke check: connected successfully; no DB mutations were run.
- Production redeploy started and was intentionally not waited on.

## 2026-08-10 Mission Library Layout + Account Scope Hardening

Problem / requested check:

- The Mission Library saved drafts layout was out of order on tablet/mobile width.
- Re-check the same-browser account isolation fix with more scrutiny.

Root cause:

- Mission rows placed mission details and action buttons in a wrapping flex row. At tablet widths, the shrink-wrapped action group could steal horizontal space and make controls appear out of order.
- The previous account isolation fix reset mismatched local planner data before rendering, but the local owner marker was only written after `/api/account/snapshot` loaded successfully.
- Production account sync is currently not healthy: `vercel env pull --environment=production` shows Neon-related env keys are present but all pulled Neon values normalize to empty quoted strings, including `DATABASE_URL`, `POSTGRES_URL`, `PGHOST`, `PGUSER`, `PGPASSWORD`, and `NEON_PROJECT_ID`.
- Vercel Marketplace lists the Neon resource `neon-amber-xylophone` as connected to `halo-flight-planning`, so the issue is empty/unusable provisioned env values rather than a missing code migration.

Solution:

- Changed Mission Library rows to a stable grid: mission details first, action buttons in a predictable button grid, with side-by-side layout only once there is enough width.
- Added `overflow-x-hidden` to the Mission Library dialog as a defensive guard against accidental horizontal overflow.
- Added `resolveAccountScopedPlannerStorage()` so account startup decisions are centralized.
- `AccountScopedPlanner` and `AccountAutoSync` now write `halo-account-sync-owner` for the signed-in Clerk user before cloud sync availability matters.
- This means if Account B signs in while account sync is returning 503, Account B still claims local browser ownership immediately after any reset, preventing those edits from later being trusted as Account A's data.

Files modified:

- `components/shell/HaloAppShell.tsx`
- `components/auth/AccountAutoSync.tsx`
- `components/auth/AccountScopedPlanner.tsx`
- `lib/account/autoSync.ts`
- `tests/account/autoSync.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/account/autoSync.test.ts tests/account/snapshotApi.test.ts tests/stores/mapStore.test.ts tests/planning/missions.test.ts`: passed, 38 files / 192 tests.
- `git diff --check`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual testing were not run per user preference.

## 2026-08-10 Same-Browser Account Isolation Check

Problem / requested check:

- Verify that signing into a different Halo account on the same browser/device does not load or save the previous account's planner data.

Root cause:

- Server snapshots are correctly scoped by Clerk `userId`.
- The browser Zustand store uses one shared local storage key, `halo-map-store`, for the device/browser.
- Account auto-sync previously treated any meaningful local planner state as mergeable local data, without knowing which Clerk user wrote it.
- If Account B signed in after Account A on the same browser and Account B had no remote snapshot yet, Account A's local planner state could be saved into Account B's account snapshot.

Solution:

- Added a local account-owner marker, `halo-account-sync-owner`.
- Local planner state is now trusted only when that marker matches the currently signed-in Clerk user id.
- If the marker is missing or belongs to another account, Halo resets local planner state to the default account-sync snapshot before remote merge/save decisions.
- Added an account-scoped client boundary so the planner shell does not render until the local account-owner check has run, preventing a previous account's planner from flashing for the new account.
- Included the owner marker in Halo local recovery export/reset handling.

Files modified:

- `app/(dashboard)/page.tsx`
- `components/auth/AccountAutoSync.tsx`
- `components/auth/AccountScopedPlanner.tsx`
- `lib/account/autoSync.ts`
- `lib/recovery/haloClientRecovery.ts`
- `tests/account/autoSync.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/account/autoSync.test.ts tests/account/plannerSnapshot.test.ts tests/account/snapshotApi.test.ts tests/recovery/haloClientRecovery.test.ts`: passed, 38 files / 191 tests.
- `pnpm typecheck`: failed once on TypeScript narrowing for `user.id` inside the async loader.
- Fixed by capturing the guarded Clerk id into `signedInUserId` before defining the loader.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 38 files / 191 tests.
- `pnpm build`: passed on Next.js `15.5.18`.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- Playwright and visual testing were not run.

## 2026-08-08 Mission History UI Implementation

Problem / requested change:

- Add Mission History inside the existing Mission Library UI.
- Keep v1 as basic mission history, not a pilot logbook.
- Support manual `Mark flown` and read-only history entries with `Duplicate to plan`.

Solution:

- Added a `flownAt` timestamp to saved mission records.
- Added mission helpers for marking records flown and grouping Mission Library records into drafts, history, and archived lists.
- Added store actions:
  - `markMissionFlown(id)`
  - `duplicateMissionFromHistory(id)`
- Marking the active mission flown now snapshots the current planner state, writes a `flown` history entry, and creates a new active blank draft.
- Flown/history entries cannot be loaded or archived directly; the UI exposes only `Duplicate to plan`.
- Reworked the Mission Library dialog into `Drafts` and `History` tabs.

Files modified:

- `components/shell/HaloAppShell.tsx`
- `lib/planning/missions.ts`
- `stores/mapStore.ts`
- `types/planning.ts`
- `tests/planning/missions.test.ts`
- `tests/stores/mapStore.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/planning/missions.test.ts tests/stores/mapStore.test.ts`: passed, 38 files / 190 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual inspection were intentionally skipped per user preference.

## 2026-08-08 Flight Logs / History Capability Check

Question: does Halo currently have flight logs or history?

Finding:

- Halo has a Mission Library for saved planning drafts, mission switching, duplication, and archiving.
- Saved missions include route/planner state, aircraft label, waypoint count, status, created/updated timestamps, and archived timestamp.
- The code has a `flown` mission status type, but no UI/action currently marks missions as flown.
- Halo does not currently have a dedicated flight logbook, completed-flight history, persisted GPS breadcrumb track, block/off/on/landing times, Hobbs/Tach fields, pilot remarks, or post-flight records.

## 2026-08-08 Clerk Verification Branding Correction

Objective: verify why Halo branding did not appear in the live email verification code message.

Findings:

- User-provided screenshot shows the live verification email is still using Clerk's default development template from the Vercel Marketplace Clerk resource `clerk-celeste-island`.
- The deployed Halo app at `https://halo-flight-planning.vercel.app/` is using `fancy-burro-13.clerk.accounts.dev`.
- The local Clerk CLI remains linked to a different app, `app_3HahEvSCHPXoBp44iz961RlsKp4` (`My Application`), whose development instance is `up-wallaby-87.clerk.accounts.dev`.
- The previous CLI template branding update therefore targeted the wrong Clerk app and cannot affect emails sent by the live Halo deployment.
- Clerk development-instance emails are expected to use Clerk's development sender domain/labeling; do not force custom production-style email behavior while Halo is still on the development Clerk instance.

Decision:

- Do not add workaround code or force email branding from the app.
- Treat the live dev-mode verification email as acceptable for test pilots until Clerk/Vercel auth is aligned or a real production Clerk instance/domain is configured.

## 2026-08-08 Clerk Pilotmerch Account Deletion Check

Objective: delete the `pilotmerch` test account so it can be registered again.

Findings:

- The live app at `https://halo-flight-planning.vercel.app/` is booting with a Clerk test publishable key for `fancy-burro-13.clerk.accounts.dev`.
- The local Clerk CLI is authenticated as `pilotmerch@gmail.com`, but it is linked to a different Clerk app, `app_3HahEvSCHPXoBp44iz961RlsKp4`, whose development instance uses `up-wallaby-87.clerk.accounts.dev`.
- Listing users in the CLI-linked Clerk development instance returned no users, including no `pilotmerch@gmail.com` user.
- Vercel has encrypted Production and Preview Clerk env vars attached through the `clerk-celeste-island` Marketplace integration, but `vercel env pull --environment=production` writes empty Clerk values locally.
- Because no usable `CLERK_SECRET_KEY` for the live `fancy-burro-13` instance is available in the current CLI/session, deleting through automation would target the wrong Clerk instance.
- A temporary preview-only deletion route was drafted locally for investigation, but the path was abandoned because Preview Deployment Protection added unnecessary complexity for this one-off task. The local route file, empty route directories, one-off token file, and temporary preview deployment `dpl_F9htwsdpnDaCPDxEDrjc8BEM7Z8k` were removed before any commit.

Decision:

- No account was deleted. Deleting from `up-wallaby-87` would not affect the live Halo login on `fancy-burro-13`.
- No production code was changed or deployed.
- User will delete the live test account manually in Clerk.
- Current test-pilot users do not need to be retained when Halo moves from testing to real production; treat this auth/data set as disposable.

Next operator step:

- Open the Clerk Dashboard from the Vercel Marketplace integration resource `clerk-celeste-island`, select the live `fancy-burro-13` instance, and delete the `pilotmerch@gmail.com` user there.
- Later, fix the repo/CLI auth alignment so future account and template operations target the same Clerk instance that the deployed Halo app uses.

## 2026-08-07 Clerk Revert + Aircraft Heading Slice

Objective: revert the temporary Supabase auth swap back to Clerk because Halo's backend/account-sync path is not Supabase, then improve the aircraft marker heading so it follows the direction of travel.

Findings:

- Reverted commit `f372c79` with `git revert`, restoring the Clerk + Neon account/auth path from commit `5bb1c47`.
- Clerk CLI is authenticated as `pilotmerch@gmail.com` and the repo is linked to Clerk app `app_3HahEvSCHPXoBp44iz961RlsKp4` (`My Application`).
- `npx clerk deploy status --mode agent` reports no Clerk production instance yet: `state=not_started`, `domain=null`, `productionInstanceId=null`.
- Official Clerk docs state that Vercel production needs production Clerk keys and a domain you own; `*.vercel.app` cannot be used for Clerk production because required DNS records cannot be added there.
- Vercel aliases for Halo are only `*.vercel.app` aliases. No Halo-specific custom domain is attached to the Vercel project.
- Existing Vercel Production has encrypted `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` variables, but there are no live production Clerk keys available to pull because no Clerk production instance exists.
- The aircraft marker already accepted browser `coords.heading`, but browsers commonly return `null` until there are enough movement samples. Halo then fell back directly to route-leg bearing, so the marker could point along the plan instead of the aircraft's actual movement.

Solution:

- Kept the Clerk revert as its own commit.
- Added movement-derived heading calculation from consecutive GPS fixes when the browser does not provide `coords.heading`.
- Kept browser GPS heading as highest priority.
- Kept route-leg bearing as the last fallback when neither browser heading nor movement heading is available.
- Added safeguards so tiny/noisy movement inside the GPS accuracy gate does not create a jittery aircraft heading.

Files modified after the revert:

- `components/map/Map.tsx`
- `lib/planning/routeTracking.ts`
- `tests/planning/routeTracking.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/planning/routeTracking.test.ts`: passed, 37 files / 178 tests.
- `pnpm typecheck`: failed once because local `node_modules` still reflected the reverted Supabase install and `.next/types` still referenced the deleted `/auth/confirm` route.
- Remediation: ran `pnpm install` against the restored Clerk lockfile and cleared generated `.next/types`.
- `pnpm typecheck`: passed after dependency/type regeneration.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm test`: passed, 37 files / 178 tests.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual inspection remain intentionally skipped per user instruction.

Production note:

- The app can be pushed back to the Clerk code path on `halo-flight-planning.vercel.app`, but true Clerk production keys cannot be created for only `halo-flight-planning.vercel.app`. Clerk production needs a custom Halo domain with DNS control.

## 2026-08-07 Clerk Email/Password Auth Slice

Objective: simplify production auth to email/password sign-up and sign-in only, hide Google OAuth in the Halo UI, and check whether Clerk live keys can be set up from the CLI.

Findings:

- The local Clerk CLI is available, but it is not authenticated. `npx clerk whoami` returned `auth_required` and instructed running `clerk auth login`.
- Live Clerk production keys cannot be created, pulled, or safely copied into Vercel from this machine until the Clerk CLI session is authenticated.
- Vercel Pro is not the blocker for this slice. Clerk production still needs a production Clerk instance, live keys, and a real custom domain/DNS configuration; a `*.vercel.app` domain alone is not enough for Clerk production.
- Clerk email/password sign-up must be enabled in the Clerk instance settings. Google OAuth can remain disabled or unconfigured until later.
- Clerk's prebuilt sign-in/sign-up buttons can expose enabled social providers from the Clerk Dashboard, so Halo should not use those buttons while Google OAuth is intentionally hidden.

Solution:

- Replaced the signed-out Halo auth buttons with a custom email/password modal using Clerk's App Router client hooks.
- Added sign-up with email/password, email verification code handling, and sign-in with email/password.
- Added the Clerk captcha container required by Clerk's custom sign-up flow when bot protection is enabled.
- Reused the same email/password auth UI from the Account Sync panel so no Google/OAuth entry point remains in app UI.
- Updated the dashboard gate copy to direct users to email/password sign-up and explain that Google sign-in is hidden until production OAuth is configured.

Files modified:

- `components/auth/HaloAuthNav.tsx`
- `components/auth/AccountSyncPanel.tsx`
- `app/(dashboard)/page.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm typecheck`: passed after widening the Clerk field-error helper for nullable fields.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm test`: passed, 37 files / 176 tests.
- `pnpm build`: passed on Next.js `15.5.18`, aside from existing browser-data freshness warnings.
- Searched app code for `SignInButton`, `SignUpButton`, Google/OAuth text, and OAuth redirect calls. No Clerk prebuilt sign-in/up buttons or OAuth calls remain in app UI.
- Playwright and visual inspection were intentionally skipped per user instruction.

Next operator step:

- Authenticate the Clerk CLI with `npx clerk auth login`, then use Clerk CLI or the Clerk Dashboard to create/promote the production instance and set the resulting `pk_live_...` / `sk_live_...` values in Vercel Production environment variables.

## 2026-08-03 Vercel Git Connection Repair

Objective: investigate whether local untracked changes and missing Vercel Git integration caused GPS fixes not to reach production, then connect the Vercel project to GitHub.

Findings:

- The Vercel project `halo-flight-planning` was linked locally via `.vercel/project.json`, but production deployments before this repair were manual/CLI uploads rather than GitHub-triggered builds.
- The production deployment that was live before repair was `halo-flight-planning-d4omr7r7q-pilotmerch-gmailcoms-projects.vercel.app`, created at `2026-08-03 02:55:21 +02:00`.
- Its build logs showed uploaded deployment files rather than a Git clone, and the route list did not include `/gps-lab`.
- Local `app/gps-lab/page.tsx` is still untracked and was not present in production. It is a diagnostic route, not the production Track Aircraft marker fix.
- The actual production Track Aircraft fix is tracked in `components/map/Map.tsx` and was committed in `3772943`.

Actions:

- Connected the Vercel project to `https://github.com/selezai/halo-flight-planning.git` with `vercel git connect`.
- Created and pushed empty commit `3c1b03a` (`Trigger Vercel Git deployment`) to force a Git-triggered production deployment after the connection was established.
- Vercel then created production deployment `halo-flight-planning-8lkqe1rx1-pilotmerch-gmailcoms-projects.vercel.app`.
- The new Vercel build logs show `Cloning github.com/selezai/halo-flight-planning (Branch: main, Commit: 3c1b03a)`.
- The production alias `https://halo-flight-planning.vercel.app` now points to that Git-based deployment.

Verification:

- GitHub Actions for `3c1b03a` passed unit tests, typecheck, lint, and production build.
- Vercel deployment `dpl_Bu4z12odQUScrEKa92Pyg3dNsdfB` completed with status `Ready`.
- Production browser smoke against `https://halo-flight-planning.vercel.app` with granted mocked geolocation reached `Aircraft tracking`, rendered `.halo-location-aircraft-marker`, and emitted no `location_overlay_failed` or `location_tracking_fix_rejected` console events.

Prevention:

- Future pushes to GitHub `main` now produce Vercel Git deployments, so production source should match tracked Git state.
- Avoid manual `vercel --prod` deployments from a dirty worktree because they can package local untracked files.
- Keep `.vercel/` ignored because it contains local project linkage and environment material.

## 2026-08-03 Track Aircraft Marker Fix

Objective: fix the Track Aircraft stuck `GPS acquiring` state after Halo receives a granted browser GPS fix.

Problem:

- Mobile/Chrome testing showed the browser could return coordinates, but Halo remained in `GPS acquiring`.
- Console evidence showed `location_overlay_failed` and `location_tracking_fix_rejected` with `Cannot read properties of undefined (reading 'lng')`.

Root cause:

- `components/map/Map.tsx` created the MapLibre aircraft `Marker` and called `.addTo(mapInstance)` before `.setLngLat(...)`.
- MapLibre calls the marker's internal update immediately during `addTo`, and that update expects `_lngLat` to already be set.

Solution:

- Initialize the aircraft marker with `.setLngLat(trackedPosition.coordinates)` before `.addTo(mapInstance)`.
- Keep later GPS updates on the existing marker via `marker.setLngLat(...)`.
- Added a focused production-mode Playwright regression test that grants mobile geolocation, taps Track Aircraft, expects `Aircraft tracking`, expects the aircraft marker to render, and fails on overlay recovery logs.

Files modified:

- `components/map/Map.tsx`
- `e2e/location-tracking.spec.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Red test before implementation: `PLAYWRIGHT_PORT=3025 pnpm exec playwright test e2e/location-tracking.spec.ts --project=chromium` failed with `GPS acquiring` and the overlay recovery message.
- Green test after implementation: `PLAYWRIGHT_PORT=3026 pnpm exec playwright test e2e/location-tracking.spec.ts --project=chromium` passed, 1 test.
- `pnpm test -- tests/planning/routeTracking.test.ts tests/stores/mapStore.test.ts`: passed, 37 files / 175 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed.

Prevention:

- MapLibre markers should always be positioned before they are attached to the map.
- Browser GPS tests should verify both raw geolocation success and downstream overlay rendering, because a fetched fix can still fail after the callback.

## 2026-08-03 Track Aircraft Location Fetch Investigation

Objective: investigate why tapping Track Aircraft appears unable to fetch location on mobile/Chrome, without applying a fix.

Evidence:

- Current Track Aircraft flow is raw browser geolocation in `components/map/Map.tsx`, not MapLibre geolocation and not an API route.
- The button only toggles Zustand state; the map effect then calls `navigator.geolocation.getCurrentPosition(...)` with `enableHighAccuracy: false`, `maximumAge: 300_000`, and `timeout: 15_000`.
- Local production build passed, focused GPS/store tests passed, and a mobile Chromium Playwright context with granted geolocation returned coordinates to Halo.
- In the controlled-success run, Halo received both `getCurrentPosition` and `watchPosition` successes, but the UI still fell back to `GPS acquiring`.
- Browser console showed `location_overlay_failed` with `Cannot read properties of undefined (reading 'lng')`, followed by `location_tracking_fix_rejected` on refinement updates.
- The overlay path creates a MapLibre `Marker` with `.addTo(mapInstance)` before `.setLngLat(...)`; MapLibre's `Marker.addTo` immediately calls `_update`, which expects `_lngLat` to already exist and can throw through `smartWrap`.
- A simulated browser `POSITION_UNAVAILABLE` path correctly produced the visible `GPS unavailable` state and provider message, confirming that provider-unavailable is a separate browser/OS failure mode.

Finding:

- The main reproducible stuck state is not that Halo never receives a GPS fix. Halo can receive the coordinates, then the aircraft overlay fails before the marker is positioned, and the recovery boundary downgrades the UI back to `GPS acquiring`.
- The desktop symptom where the map moves but no aircraft location appears is consistent with this: follow mode can receive/use the fix, while marker rendering fails afterward.
- No implementation fix was applied in this investigation.

## 2026-08-03 GPS Location Root-Cause Diagnostics

Objective: stop guessing at the aircraft-tracking GPS failure and isolate raw browser geolocation behavior before changing or deploying the production tracker again.

Evidence:

- Production Halo now surfaces the browser error rather than hanging indefinitely: permission is enabled, but the browser returns `POSITION_UNAVAILABLE` / "Position update is unavailable."
- This is not a JavaScript exception from Halo; it is the browser Geolocation API reporting that the OS/browser location provider did not deliver coordinates.
- Multiple affected devices mean Halo should not assume this is a single-device settings issue without a controlled raw browser test.
- Open-source map controls (MapLibre, Leaflet, OpenLayers) all use `navigator.geolocation`; they cannot bypass OS/browser location providers, but their patterns show useful handling differences such as keeping watch mode alive through temporary unavailable/timeout events.

Decision:

- Do not deploy another GPS change to production until local diagnostics identify a strategy that returns coordinates.
- Add a standalone local diagnostic route that bypasses MapLibre, route state, waypoint handlers, and Halo overlays.
- Compare permission state, current-position options, and watch-position options side by side.
- If a watch strategy succeeds where current-position fails, update Halo's tracker to start watch mode earlier and treat unavailable watch events as recoverable.
- If every raw strategy fails with code 2 on a device, the failure is below Halo and must be handled with device/browser guidance or a non-GPS fallback.

Changes:

- Added `app/gps-lab/page.tsx`.
- The GPS Lab records environment details, permission state, raw `getCurrentPosition` results, raw `watchPosition` results, event logs, timings, coordinates, accuracy, browser messages, and copyable JSON output.
- The route includes direct reference links for MDN, MapLibre, Leaflet, and OpenLayers geolocation behavior.

Verification plan:

- Run `pnpm typecheck`, `pnpm lint`, and `pnpm build`.
- Smoke the local route only.
- No Vercel production deploy for this diagnostic step.

## 2026-07-20 Full Pilot Pain-Point Completion - Slice 3 Data Freshness

Objective: make stale/unknown planning data visible instead of letting old weather, NOTAM, airspace, route, or W&B state appear clear.

Decisions:

- Freshness statuses are `current`, `stale`, and `unknown`.
- Missing timestamps are `unknown` and require pilot review.
- Freshness is surfaced in the Briefing tab, Pilot Digest, exported briefing text, and route status bar.

Changes:

- Added `DataFreshness` and `DataFreshnessStatus` types.
- Added `assessDataFreshness`, threshold constants, labels, and worst-status helper.
- Added route, weather, airspace, NOTAM, and W&B freshness calculations in the Briefing tab.
- Added freshness badges and freshness export section.
- Added compact airspace/NOTAM freshness chips to the bottom route status bar.
- Added unit tests for current/stale/unknown classification, worst-status priority, digest inclusion, and exported briefing text.

Verification:

- `pnpm test -- tests/planning/freshness.test.ts`: 55 tests passed.
- `pnpm typecheck`: passed.
- Full slice check:
  - `pnpm test`: 55 tests passed.
  - `pnpm lint`: no warnings or errors after fixing the route timestamp hook dependency.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed sequentially after build completed.

## 2026-07-20 Full Pilot Pain-Point Completion - Slice 2 Briefing Digest

Objective: reduce briefing overload by adding a concise, prioritized Pilot Digest above the full raw briefing.

Decisions:

- Digest status is `stop`, `review`, or `ready` based on highest-priority critical/caution/info items.
- Digest items are generated from the same verified route, risk, W&B, weather, airspace, and NOTAM inputs already used by the briefing.
- The raw briefing remains available underneath the digest for backup and completeness.

Changes:

- Added `BriefingDigest`, `BriefingDigestItem`, and `BriefingDigestStatus` types.
- Added `buildBriefingDigest` and digest text formatting in the briefing library.
- Added a Pilot Digest panel in the Briefing tab and included the digest in exported briefing text.
- Added unit tests for critical status priority, review actions, and export inclusion.

Verification:

- `pnpm test -- tests/planning/briefingDigest.test.ts`: 52 tests passed.
- `pnpm typecheck`: passed.
- Full slice check:
  - `pnpm test`: 52 tests passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed sequentially after build completed.

## 2026-07-20 Full Pilot Pain-Point Completion - Slice 1 W&B

Objective: finish W&B as the first required launch slice before implementing the 8 social/forum pain-point features.

Decisions:

- W&B is hybrid: existing aircraft presets remain available, but CG status is `unconfigured` until the pilot enters aircraft-specific POH/AFM empty weight, arms, max weights, station arms, and envelope points.
- Halo calculates ramp, takeoff, and landing states and does not invent missing aircraft envelope data.
- W&B status is included in Aircraft, Briefing, Risk Review, and exported briefing text.

Changes:

- Added W&B domain types, loading state, envelope interpolation, ramp/takeoff/landing CG calculations, station loading, and status labels.
- Extended aircraft profiles with `weightBalance`, `glideRatio`, and `compassDeviationDeg`.
- Added Aircraft-panel W&B setup/loading UI for empty weight/arm, max weights, fuel arm, station arms/weights, and envelope points.
- Added Briefing-panel W&B review and briefing/risk text output.
- Added unit tests for envelope interpolation, unconfigured setup, within-limits states, overweight/out-of-limits states, incomplete setup, and landing fuel state.

Verification:

- `pnpm test -- tests/planning/weightBalance.test.ts`: 49 tests passed.
- `pnpm typecheck`: passed.
- Full slice check:
  - `pnpm test`: 49 tests passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed sequentially after build completed.

## 2026-07-19 Live South Africa NOTAM Data Path

Objective: build the live SACAA/ATNS NOTAM data path without scraping, faking data, or using FAA as the South Africa launch default.

Research:

- SACAA's NOTAM page says the public daily summary should not be used for flight preparation and directs pilots to AIMU/File2Fly for latest NOTAMs.
- ATNS File2Fly provides online pre-flight preparation, NOTAM briefing, MET, and e-AIP behind a registered login.
- The File2Fly manual documents route, aerodrome, and zone PIBs produced in browser HTML or PDF.
- No public unauthenticated SACAA/ATNS machine-readable NOTAM API was found.

Decision:

- Keep `NOTAM_PROVIDER=south-africa-manual` as the production-safe default.
- Add an authorized live JSON adapter behind `NOTAM_PROVIDER=south-africa-live`.
- Require real `SOUTH_AFRICA_NOTAM_API_URL` and `SOUTH_AFRICA_NOTAM_API_KEY` from SACAA/ATNS or an authorized provider before enabling the live provider.
- Do not scrape File2Fly, automate a logged-in File2Fly browser session, parse SACAA's public summary as operational data, or fake NOTAM results.
- Keep `NOTAM_PROVIDER=faa` available only for later international rollout.

Changes:

- Extended `RouteNotamReview` with `source=south-africa-official` and `status=manual-required`.
- Refactored `/api/notams/route` to choose between South Africa manual, South Africa live, and FAA providers.
- Added a South Africa live adapter that posts route locations/waypoints to an authorized JSON endpoint with server-side auth, rejects unsafe config, and normalizes flexible provider payloads.
- Updated route sync, default persisted state, risk review, briefing export, and sidebar NOTAM panel copy for South Africa-first behavior.
- Updated env templates, README, setup docs, provider research, and launch TODOs.
- Added Vercel production env vars:
  - `SOUTH_AFRICA_NOTAM_SOURCE_URL`
  - `SOUTH_AFRICA_NOTAM_API_AUTH_HEADER`
  - `SOUTH_AFRICA_NOTAM_API_AUTH_SCHEME`
- Did not add `SOUTH_AFRICA_NOTAM_API_URL` or `SOUTH_AFRICA_NOTAM_API_KEY` because no authorized SACAA/ATNS API endpoint/key was available.

Verification:

- `pnpm test -- tests/planning/notams.test.ts tests/planning/navigation.test.ts`: 44 tests passed.
- `pnpm test`: 44 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Final verification rerun:
  - `pnpm test`: 44 tests passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
  - `pnpm typecheck`: passed when rerun sequentially after build completed. A parallel verification attempt produced TS6053 missing `.next/types` errors because `next build` regenerated `.next` while `tsc` was reading generated type files.
- Local production API smoke on port 3011:
  - `POST /api/notams/route` with FAOR/FALA returned `source=south-africa-official`, `status=manual-required`, `locations=["FAOR","FALA"]`, `sourceUrl=https://file2fly.atns.co.za/aes/login.jsp`.
- Local live-provider safety smoke on port 3012:
  - `NOTAM_PROVIDER=south-africa-live` without `SOUTH_AFRICA_NOTAM_API_URL` / `SOUTH_AFRICA_NOTAM_API_KEY` returned HTTP 503, `source=south-africa-official`, `status=unavailable`, and explicit official File2Fly/SACAA guidance.
- Vercel production deployment inspected as Ready:
  - Deployment URL: `https://halo-flight-planning-9dyovsrz6-pilotmerch-gmailcoms-projects.vercel.app`
  - Production alias: `https://halo-flight-planning.vercel.app`
  - Deployment ID: `dpl_8PHrikwis9AtCni66hjVDinSX8y2`
- Production API smoke:
  - `POST https://halo-flight-planning.vercel.app/api/notams/route` with FAOR/FALA returned HTTP 200 and `status=manual-required`.
- Vercel runtime log stream emitted no runtime errors during the post-deploy smoke window.

Prevention guidelines:

- Provider failure or missing credentials must never be interpreted as "no NOTAMs."
- Public SACAA summaries are not operational flight-prep data.
- All live NOTAM credentials stay server-side and must never use `NEXT_PUBLIC_`.

## 2026-07-19 Initial Completion

Objective: complete the Halo flight planning project into a deployable, useful browser-first planning app.

Decisions:

- Use the local `halo-scaffold` Next.js app as the implementation base because it has the safer server-proxied OpenAIP architecture.
- Use the GitHub `selezai/halo-flight-planning` repo as historical reference because it is an older Vite/Supabase implementation.
- Keep Supabase account sync deferred until live schema and RLS can be verified. No database mutations were added.
- Keep NOTAMs as an explicit briefing risk/checklist item until an authorized live NOTAM API is configured.
- Prioritize local route planning, aircraft performance, METAR/TAF weather, fuel reserves, personal minimums, briefing export, and graceful map degradation.

Files changed in this session are documented in `halo-scaffold/docs/superpowers/plans/2026-07-19-halo-flight-planning.md`.

Verification:

- `pnpm test`: 5 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Local browser against `next start`: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps (`CTR FALA`, `CTR FAOR`, `TMA FALA A`) plus informational airway/FIR crossings outside cruise altitude.
- Local briefing panel and exported briefing text included the airspace review and critical risk item.
- Browser console/page error checks were clean.
- Browser verification against `next start`: content rendered, no framework overlay, no captured console errors, route creation and briefing flow verified.
- Vercel production deployment inspected as Ready:
  - Primary alias: https://halo-flight-planning.vercel.app
  - Deployment URL: https://halo-flight-planning-pcmjzhdlk-pilotmerch-gmailcoms-projects.vercel.app
- Production smoke checks passed:
  - `/api/openaip/style` returned HTTP 200.
  - `/api/weather/metar/FAOR` returned current METAR JSON.
  - Browser verification on the production alias showed content, no Next.js overlay, no captured console errors, and FAOR→FACT route planning with expected metrics.
- GitHub branch pushed: `agent/complete-halo-flight-planner-20260719`.
- Draft PR opened: https://github.com/selezai/halo-flight-planning/pull/1.

## 2026-07-19 Aviation Map Fix

Problem: the deployed map showed a fallback/ground-style map instead of a useful manned-flight aviation chart.

Root causes:

- Vercel production did not have `OPENAIP_API_KEY` or `NEXT_PUBLIC_MAPTILER_KEY`, so `/api/openaip/style` returned the fallback base-map style.
- After production env was configured, OpenAIP style loaded but vector tiles were still empty because the style converter generated tile URLs with a source prefix, and the proxy forwarded that prefix to OpenAIP. OpenAIP expects only `{z}/{x}/{y}.pbf`.
- The tile proxy copied the upstream `Content-Encoding` header after reading the body through server-side fetch. That can cause browsers to decode an already-decoded protobuf again, preventing vector tile rendering.
- MapLibre errors were being swallowed, hiding the failure mode.

Decision: keep OpenAIP as the primary free/global aviation source. Research found FAA VFR raster charts are authoritative and free but US-only, while openflightmaps is open and VFR-focused but regional and less straightforward as a global app-ready vector source.

Solution:

- Added production Vercel env vars for OpenAIP and MapTiler.
- Normalized OpenAIP tile paths so both `/tiles/{z}/{x}/{y}.pbf` and older `/tiles/{source}/{z}/{x}/{y}.pbf` forms work, but only `{z}/{x}/{y}.pbf` is sent upstream.
- Rewrote converted OpenAIP style sources to coordinate-only proxy tile URLs.
- Removed the stale `Content-Encoding` response header from proxied vector tiles.
- Preserved dashed airspace boundary layers instead of filtering them out.
- Added visible MapLibre error reporting.
- Added regression tests for OpenAIP tile path/style conversion.

Verification:

- Local `pnpm test`: 9 tests passed.
- Local `pnpm typecheck`: passed.
- Local `pnpm lint`: no warnings or errors.
- Local `pnpm build`: production build passed.
- Local API: `/api/openaip/style` returned 74 layers, 46 airspace layers, and tile URL `/api/openaip/tiles/{z}/{x}/{y}.pbf`.
- Local API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 and a 50 KB vector tile.
- Local browser: aviation chart rendered with visible airspace/airway/restricted outlines and feature inspection opened `AWY G853`.
- Production deployment inspected as Ready:
  - https://halo-flight-planning-5pvu1gz5y-pilotmerch-gmailcoms-projects.vercel.app
- Production API: `/api/openaip/style` returned 74 layers and 46 airspace layers.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without `Content-Encoding`.
- Production browser: aviation chart rendered and feature inspection opened `AWY G853`.

## 2026-07-19 Global OpenAIP Vector Map and Sprites Slice

Objective: make Halo's browser map behave like a real manned-flight aviation map with global OpenAIP vector data, authentic sprites, and useful click-to-detail inspection.

Research and decisions:

- OpenAIP remains the best free/global primary aviation map source for Halo because it provides MapLibre-compatible vector tiles through the Tiles API and feature detail records through the Core API.
- OpenAIP is not Halo's flight-planning function layer. It supplies map/data records; Halo supplies route planning, click behavior, filtering, warnings, briefing, and export workflow.
- OpenAIP Core API schema paths were verified for airports, airspaces, navaids, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- The archived `openAIP/mapstyles` build path fails on current Node because its Node 8-era `@mapbox/spritezero-cli` dependency pulls obsolete `mapnik` tooling.
- Current authentic sprites are generated from `openAIP/openaip-map-resources` with `spreet`.
- OpenAIP's current public map resources are CC BY-NC-SA 4.0. Halo needs OpenAIP permission or replacement sprites before commercial use.

Changes:

- Generated real OpenAIP sprite files in `halo-scaffold/public/sprites/` and added attribution.
- Replaced the interactive sprite builder with a non-interactive `pnpm build:sprites` workflow.
- Restored OpenAIP aviation symbol layers and kept Mapbox/composite basemap symbol layers filtered out.
- Added MapLibre token conversion for OpenAIP style values such as `{type}-medium` and `{icao_code}`.
- Added feature click prioritization so point aviation features beat airspace border/decorative layers when stacked.
- Added OpenAIP-style clicked-feature stack inspection so a click keeps the full deduped aviation feature stack and the sidebar can switch between overlapping icons, airspaces, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Expanded parsed feature support for airports, navaids, airspaces, reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Added detail API proxies for reporting points, obstacles, hotspots, hang-gliding sites, and RC airfields.
- Expanded sidebar fields for vertical limits, activation flags, runway hints, navaid alignment, obstacle dimensions, RC airfield power types, source layer, and source ID.
- Added parser/converter regression tests for actual OpenAIP vector-tile property names.

Prevention guidelines:

- Do not deploy empty sprite placeholders; `pnpm build:sprites` validates file sizes and sprite key count.
- Do not strip all `symbol` layers; filter only incompatible basemap/terrain sources.
- Do not discard overlapping click results. OpenAIP supplies data; Halo must preserve and rank the clicked feature stack so the pilot can inspect the intended aviation record.
- Normalize OpenAIP snake_case tile properties at the parser boundary before displaying feature information.
- Keep OpenAIP API keys server-side in route handlers/proxies only.
- Convert legacy OpenAIP style `stops` carefully for MapLibre: tokenized text/icon strings, array-valued offsets, one-stop functions, and font-stack arrays each need specific handling.
- Use `cache: 'no-store'` for the client style fetch so a bad browser-cached style does not survive deployment.

Local verification:

- `pnpm build:sprites`: generated 128 OpenAIP sprite entries.
- `pnpm test`: 41 tests passed, including clicked-feature stack ordering/deduplication.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included all added OpenAIP detail routes.
- Local production API: `/api/openaip/style` returned 96 layers and 22 OpenAIP aviation symbol layers.
- Local production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Local production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without stale `Content-Encoding`.
- Local browser: no framework overlay, no degraded-map error, aviation symbols/labels visible, navaid click selected `LIV` with enriched details, and airspace click selected `JOHANNESBURG SOUTHWEST` with `FL110` to `FL195` limits.

Production deployment and verification:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2k36aug5m-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FYEx7JLtPWeDPV5XM126dUCTbSid`
- Production API: `/api/openaip/style` returned 96 layers and 22 OpenAIP aviation symbol layers.
- Production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 without stale `Content-Encoding`.
- Production browser: no framework overlay, no degraded-map error, navaid click selected `LIV` with enriched details, and airspace click selected `JOHANNESBURG SOUTHWEST` with `FL110` to `FL195` limits.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `464c5be`
  - PR: https://github.com/selezai/halo-flight-planning/pull/1

Clicked-feature stack follow-up:

- Added `lib/openaip/featureSelection.ts` and sidebar stack selection so overlapping OpenAIP click results are preserved instead of discarded.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `f679905`
- Verification:
  - `pnpm test`: 41 tests passed.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: no warnings or errors.
  - `pnpm build`: production build passed.
- Vercel production deployment inspected Ready:
  - Deployment URL: https://halo-flight-planning-qmk9rmzj2-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_DVXvVwLtRyuNXxhVWT2SAVYCM4BQ`
- Production API checks:
  - `/api/openaip/style`: HTTP 200, 96 layers, 22 symbol layers.
  - `/api/openaip/sprites/openaip.json`: HTTP 200, 128 sprite keys.
  - `/api/openaip/tiles/8/147/147.pbf`: HTTP 200, 50,990 bytes, no stale `Content-Encoding`.

## 2026-07-19 Route-Aware Airspace Review Slice

Objective: make Halo use the OpenAIP browser vector map as planning data by reviewing rendered route airspace crossings against the selected cruise altitude.

Decisions:

- Keep OpenAIP as the aviation map/data source and implement route-aware planning logic inside Halo.
- Use currently rendered OpenAIP vector airspaces for this browser-first slice. The UI explicitly says when the review is partial because the route is outside the viewport, the airspace layer is hidden, or map tiles are still loading.
- Compare parsed airspace vertical limits in feet against the pilot-selected cruise altitude.
- Treat controlled/special-use intersections at cruise altitude as critical, unknown vertical data as caution, and crossed airspaces outside cruise altitude as informational.
- Keep derived route airspace review state out of persisted local storage because it depends on live map render state.

Changes:

- Added `RouteAirspaceAlert` and `RouteAirspaceReview` planning types.
- Added `lowerLimitFt` and `upperLimitFt` to parsed OpenAIP airspace features.
- Added `lib/planning/airspaceReview.ts` for pure alert classification and sorting.
- Added MapLibre route sampling against visible OpenAIP airspace layers.
- Added route airspace review output to the route panel, briefing panel, route status bar, and exported briefing text.
- Added regression tests for altitude parsing and airspace conflict classification.

Local verification:

- `pnpm test`: 21 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Local browser against `next start`: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps (`CTR FALA`, `CTR FAOR`, `TMA FALA A`) plus informational airway/FIR crossings outside cruise altitude.
- Local briefing panel and exported briefing text included the airspace review and critical risk item.
- Browser console/page error checks were clean.

Production deployment and verification:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2zz9w1tks-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_CXFcKk8gw94YcSQ9abmrPbSFVJn7`
- Production API: `/api/openaip/style` returned 96 layers, 49 airspace layers, and 22 aviation symbol layers.
- Production API: `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production API: `/api/openaip/tiles/8/147/147.pbf` returned HTTP 200 and a 50,990-byte vector tile.
- Production browser: FAOR→FALA at 6,500 ft showed 3 critical rendered OpenAIP airspace overlaps and the same briefing/risk output as local.
- Sampled Vercel runtime log stream showed no errors after production smoke requests.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `3ec0d42`
  - PR: https://github.com/selezai/halo-flight-planning/pull/1

## 2026-07-19 Backend Airspace Corridor Review Slice

Objective: replace the viewport-only airspace review limitation with a server-side OpenAIP Core route-corridor review.

Research and decisions:

- OpenAIP docs load Swagger specs from `https://api.core.openaip.net/api/system/specs/v1/schema.json`.
- The live Core API schema verifies `GET /airspaces` and `GET /airspaces/{id}`. `GET /airspaces` supports `bbox`, `limit`, `fields`, search, type, class, and activation filters.
- OpenAIP documents bbox queries as compute-intensive and rate-limited, so Halo uses bounded leg-segment queries, a 24-query cap, deduplication, and partial/rate-limited review states.
- Core API review is now preferred over rendered-vector review. Rendered-vector review remains a fallback when Core review is unavailable.
- Core API vertical-limit unit parsing was corrected separately from elevation unit parsing: airspace limits use `0=m`, `1=ft`, and `6=FL`.

Changes:

- Added `lib/planning/airspaceCorridor.ts` for bbox generation, route splitting, polygon intersection, and corridor-distance filtering.
- Added validated read-only `POST /api/openaip/airspace-review`.
- Added `components/planning/RouteAirspaceReviewSync.tsx` and mounted it on the dashboard.
- Split route airspace state into rendered fallback, Core API review, and active selected review.
- Updated route panel and status bar to display review source, query count, candidate count, and corridor width.
- Added tests for corridor geometry, Core vertical-limit parsing, and corridor alert descriptions.

Verification:

- `pnpm test`: 29 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included `/api/openaip/airspace-review`.
- Production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-h7r99c6ns-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FhHKr9zxqQFTeis7AdiCbHCEPxSR`
- Production API: FAOR→FALA at 6,500 ft returned `source=openaip-core`, `status=complete`, `queryCount=1`, `candidateCount=24`, `alerts=18`, and `critical=4`.
- Production browser: route panel showed Core API review with 4 critical airspace items (`ATZ FAGC`, `CTR FALA`, `CTR FAOR`, `TMA FALA A`), 1 query, 24 candidates, and 5 nm corridor.
- Production briefing/export text included the Core API corridor review and critical risk item.
- GitHub PR branch pushed:
  - Branch: `agent/complete-halo-flight-planner-20260719`
  - Commit: `565479d`
  - PR: https://github.com/selezai/halo-flight-planning/pull/1

## 2026-07-19 Global OpenAIP Route Search Slice

Objective: remove the starter-only waypoint search limitation by adding global OpenAIP Core airport and navaid search to the route panel.

Research and decisions:

- The live OpenAIP Core schema verifies `GET /airports` and `GET /navaids`; both support search, pagination/limit, field selection, and optional country filtering.
- OpenAIP supplies global records, but Halo owns the planning function. Search results are converted into Halo waypoints so they can be used by route math, airspace review, weather lookup, briefing, and persistence.
- The search endpoint is read-only and server-side to keep `OPENAIP_API_KEY` out of the browser.
- Starter search stays in place as an instant fallback when the query is short or OpenAIP is unavailable.

Changes:

- Added `GET /api/openaip/search`.
- Added OpenAIP airport/navaid waypoint normalization.
- Added shared route-search deduplication so starter and OpenAIP versions of the same ICAO/navaid ident display once.
- Updated the route panel with debounced global search, OpenAIP result counts, global-source badges, and loading/warning/error/empty states.
- Added tests for normalization and deduplication.

Verification:

- `pnpm test`: 34 tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed and included `/api/openaip/search`.
- Production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-3fr8tvz7a-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_Eo6AWb36Npec35v2YruTr7SYE25G`
- Production API: `/api/openaip/search?q=EGLL&limit=6` returned one OpenAIP waypoint for `EGLL` London Heathrow.
- Production API: `/api/openaip/style` returned 96 layers, 50 airspace-named layers, and 22 aviation symbol layers; `/api/openaip/sprites/openaip.json` returned 128 sprite keys.
- Production browser: route search for `EGLL` showed one deduped result row, and route search for `LOWW` showed an OpenAIP-only global result badge.
- Production browser: map inspection mode selected point feature `FARF` with enriched airport details and airspace `JOHANNESBURG SOUTHWEST` with class, vertical limits, activation flags, source layer/id, and enriched Core API record status.
- Vercel CLI returned `Not authorized` after creating the deployment URL, but inspection showed the deployment completed as Ready and assigned the production alias; no second deployment was started.

## 2026-07-19 Integration Tests and CI Slice

Objective: add production-build integration coverage and GitHub Actions gates before continuing into deeper launch features.

Decisions:

- Playwright must run against `next build && next start`, not `next dev`.
- CI should not depend on OpenAIP/MapTiler credentials; Halo's degraded OpenAIP style/search/airspace-review behavior is now a tested contract.
- Keep unit tests and integration tests separated by runner and filename pattern.

Changes:

- Added `@playwright/test` and `pnpm test:e2e`.
- Added `playwright.config.ts` with a production Next.js web server and deterministic no-credential env.
- Added UI integration coverage for route creation and briefing generation.
- Added API integration coverage for route-handler validation/degraded states.
- Added `.github/workflows/ci.yml` for install, unit tests, typecheck, lint, production build, Playwright Chromium install, and e2e tests.

Verification:

- `pnpm install --frozen-lockfile`: passed.
- `pnpm test`: 34 Vitest tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no ESLint warnings or errors.
- `pnpm build`: production build passed.
- `pnpm test:e2e`: 2 Playwright tests passed against `next build && next start`.

## 2026-07-19 Route NOTAM Review Slice

Objective: replace the static NOTAM checklist with a credential-gated live-provider integration path that filters by route airport/navaid identifiers and clearly attributes source/status.

Research and decisions:

- FAA NOTAM API is available behind FAA API Portal credentials and is cataloged with base URL `https://external-api.faa.gov/notamapi/v1`.
- Unauthenticated FAA NOTAM API probe returned HTTP 401.
- AviationWeather.gov Data API does not provide NOTAM products.
- Halo must not say "no NOTAMs" when the provider is unavailable. Missing credentials, authentication failure, or provider errors produce unavailable/partial states.

Changes:

- Added NOTAM planning types and helper functions.
- Added `POST /api/notams/route`.
- Added route NOTAM sync/state to the app.
- Added briefing-panel NOTAM review UI, source link, route locations, count/status, and NOTAM rows.
- Added NOTAM review to risk assessment and exported briefing text.
- Added NOTAM provider research documentation and setup instructions.
- Preserved prepared route locations in unavailable NOTAM reviews so missing FAA credentials do not hide the route identifiers that would be queried.

Verification:

- `pnpm test tests/planning/notams.test.ts tests/planning/navigation.test.ts`: 9 targeted tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no ESLint warnings or errors.
- `pnpm test`: 38 Vitest tests passed.
- `pnpm build`: production build passed and included `/api/notams/route`.
- `pnpm test:e2e`: 2 Playwright tests passed against `next build && next start`, including the no-credential NOTAM unavailable API/UI path.
- Follow-up route-location fix verification: `pnpm typecheck`, `pnpm test:e2e`, `pnpm test`, `pnpm lint`, and `pnpm build` passed.

## 2026-07-20 Full Pilot Pain-Point Slice 4: Training / Checkride Navlog

Objective: add a checkride-friendly navlog view without changing Halo's operational route math.

Decisions:

- Keep training calculations as a separate view/export section driven by one manually entered route-wind value.
- Reuse existing route legs, aircraft true airspeed, magnetic variation, compass deviation, and fuel burn.
- Preserve the normal route ETE/fuel calculations above the training panel so teaching/checkride math cannot silently alter the operational summary.

Changes:

- Added `TrainingWind`, `TrainingNavLogLeg`, and `TrainingNavLog` planning types.
- Added `lib/planning/trainingNavlog.ts` for WCA, true heading, magnetic heading, compass heading, groundspeed, ETE, and fuel calculations.
- Persisted route-wind inputs in local Zustand state.
- Added a Training / Checkride Navlog panel to the Briefing tab.
- Added a `TRAINING / CHECKRIDE NAVLOG` section to briefing text exports with formula explanation.
- Added unit tests for calm wind, headwind/tailwind, crosswind correction, heading derivation, fuel/time, and export text.

Verification:

- `pnpm test -- tests/planning/trainingNavlog.test.ts`: 13 test files passed, 59 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 13 test files passed, 59 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-m9my9k0uy-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_rsVbQ6vXu8epQsTHNSPWWUq4hBJP`

## 2026-07-20 Full Pilot Pain-Point Slice 5: Backup / Print Pack

Objective: add a one-click printable/text backup pack that gives pilots an offline cockpit reference and explicit official-source reminders.

Decisions:

- Build the pack as a pure text-export helper so it is testable and reusable by later filing/emergency slices.
- Keep raw briefing export unchanged, and add a separate backup-pack download button for pilots who want a fuller offline worksheet.
- Include emergency and filing worksheet fields now, then enrich them with calculated state in later slices.

Changes:

- Added `lib/planning/backupPack.ts` and exported `buildBackupPackText(...)`.
- Backup pack includes pilot digest, freshness warnings, dispatch snapshot, waypoint list, operational navlog, training navlog, fuel, W&B, weather, airspace, NOTAM source/status, risk review, filing worksheet, emergency worksheet, official-source links, and pilot notes.
- Added a Backup pack download button in the Briefing package panel.
- Added unit tests for backup-pack inclusion of W&B, digest, NOTAM official source, stale warnings, emergency section, and training formula text.

Verification:

- `pnpm test -- tests/planning/backupPack.test.ts`: 14 test files passed, 60 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 14 test files passed, 60 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-is13397w6-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_AAHTqxt1oKFM8RUbBAgZ6GtQGFHd`

## 2026-07-20 Full Pilot Pain-Point Slice 6: Airspace Vertical Profile

Objective: make airspace review more usable by showing where along the route airspace bands occur relative to the selected cruise altitude.

Decisions:

- Extend existing airspace alerts with optional along-route distance ranges instead of creating a separate hidden review model.
- Estimate Core API ranges by sampling the planned route against matched OpenAIP geometry and corridor distance.
- Estimate rendered-browser ranges by aggregating the route sample distances that hit each rendered airspace feature.
- Keep profile visualization compact and aligned with existing critical/caution/info risk colors.

Changes:

- Added `AirspaceVerticalProfile` and `AirspaceVerticalProfileItem` planning types.
- Added `lib/planning/airspaceProfile.ts` for route-distance clamping and profile status generation.
- Added optional `startDistanceNm` and `endDistanceNm` to route airspace alerts.
- Extended Core and rendered airspace review paths to populate approximate route ranges where possible.
- Added vertical profile UI inside the airspace review panel.
- Added `AIRSPACE VERTICAL PROFILE` sections to briefing and backup-pack text exports.
- Added unit tests for profile distance/altitude mapping, range clamping, Core geometry range estimation, and briefing export text.

Verification:

- `pnpm test -- tests/planning/airspaceProfile.test.ts tests/planning/airspaceCorridor.test.ts`: 15 test files passed, 64 tests passed.
- Initial `pnpm typecheck` failed because `airspaceVerticalProfile` was accidentally passed into `buildBriefingDigest`; root cause was corrected by moving the profile argument to `buildBriefingText`.
- Rerun `pnpm typecheck`: passed.
- `pnpm test`: 15 test files passed, 64 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-q9r730x59-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_9eENWf4d3PPvXxmYYmhjrLnBKGkJ`

## 2026-07-20 Full Pilot Pain-Point Slice 7: Filing + Close Reminder

Objective: add a South Africa-safe official filing handoff and close-flight reminder workflow without automating File2Fly/SACAA/ATNS filing.

Decisions:

- Do not file, close, scrape, or fake any official SACAA/ATNS/File2Fly state.
- Persist the checklist and reminder locally in Zustand.
- Use explicit pilot action for browser notification permission; notifications only work while the app remains open.
- Treat missing close reminder and incomplete filing handoff as review items, and overdue close reminder as critical.

Changes:

- Added `FilingChecklistState`, `FlightCloseReminder`, `FilingReminderStatus`, and `FilingWorkflowReview` planning types.
- Added `lib/planning/filingReminder.ts` for not-planned/planned/due-soon/overdue/closed state calculation, checklist completion, route-ETE time seeding, and export lines.
- Added persisted filing checklist and close-reminder state/actions.
- Added Briefing-tab Filing + Close Reminder panel with checklist toggles, File2Fly handoff link, planned/arrival/close-by fields, route-ETE seeding, close acknowledgement, and optional browser notification.
- Added filing/close state to briefing digest, risk review, briefing export, and backup-pack export.
- Added unit tests for planned, due-soon, overdue, closed, digest, and briefing export states.

Verification:

- `pnpm test -- tests/planning/filingReminder.test.ts`: 16 test files passed, 68 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 16 test files passed, 68 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-98voiojdb-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_AhpRthQKXsb3FMiDBRJ6yci1wQt4`

## 2026-07-20 Full Pilot Pain-Point Slice 8: Emergency / Forced-Landing Layer

Objective: add emergency planning surfaces for glide radius, nearest available landing candidates, and pilot-marked forced-landing sites.

Decisions:

- Use available local route airport waypoints, starter aerodromes, and user-marked sites. Do not invent live aerodrome suitability.
- Treat glide rings as approximate still-air planning aids from selected cruise altitude and aircraft glide ratio.
- Persist user forced-landing sites locally.
- Feed emergency state into digest, risk review, briefing export, backup pack, and map overlays.

Changes:

- Added `EmergencyLandingSite`, `EmergencyAerodromeCandidate`, `EmergencyPlanningReview`, and suitability types.
- Added `lib/planning/emergencyPlanning.ts` for glide radius, candidate scoring, route-distance calculation, candidate generation, and export lines.
- Added persisted user emergency landing sites and store actions.
- Added Briefing-tab Emergency / Forced Landing panel with candidate list, glide radius, user site creation/editing/removal, suitability, notes, and last verified date.
- Added map overlays for approximate glide rings around route waypoints and colored user forced-landing site markers.
- Added emergency state to briefing digest, risk review, briefing export, and backup-pack export.
- Added unit tests for glide radius, scoring, candidate generation, user-site inclusion, digest, and briefing export.

Verification:

- `pnpm test -- tests/planning/emergencyPlanning.test.ts`: 17 test files passed, 72 tests passed.
- `pnpm typecheck`: passed.
- `pnpm test`: 17 test files passed, 72 tests passed.
- `pnpm lint`: no warnings or errors.
- `pnpm build`: production build passed.
- Post-build `pnpm typecheck`: passed.
- No Playwright/E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-hbq24i38h-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_GbC5RHeHg9DkaruaXS9ghVpEGBC9`

## 2026-07-20 Full Pilot Pain-Point Completion + Flight Admin

Objective: complete the remaining launch-readiness pilot pain-point work without Playwright/E2E and keep South Africa as the default launch market.

Completed:

- Hybrid W&B with editable POH/AFM setup, ramp/takeoff/landing CG checks, custom stations, caution/out-of-limits states, and insufficient loaded trip fuel detection.
- Pilot Digest, data freshness badges, training/checkride navlog, backup/print pack, airspace vertical profile, filing/close reminders, emergency/forced-landing layer, and rubber-band routing.
- Optional Flight Admin records for official NOTAM briefing and manual flight-plan filing:
  - NOTAM statuses: `not-recorded`, `completed`, `not-applicable`, `needs-rebrief`.
  - Filing statuses: `not-filing`, `preparing`, `filed-manually`, `accepted`, `rejected`, `cancelled`, `closed`.
  - Copyable route PIB request text and File2Fly handoff link.
  - Stale official NOTAM record detection when route or ETD changes.
  - Missing admin records are informational; rejected filing and overdue close remain stop-level states.
- Next.js upgraded to `15.5.18`; dynamic route handlers updated to the Next 15 async params contract.
- Broad global API CORS removed; public tile/sprite CORS remains route-specific.

Verification:

- `pnpm test`: passed, 19 files / 83 tests for the Flight Admin deployment.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/browser E2E command was run; manual E2E remains user-owned.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-jwfl6opsq-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_EK27rQDsTKn8dbrZsRL8wMnfxvki`

## 2026-07-20 Observability + GitHub Sync

Objective: add production observability instrumentation and sync the local codebase to GitHub.

Changes:

- Added `@vercel/analytics` and `@vercel/speed-insights`.
- Mounted Vercel Analytics and Speed Insights in the root App Router layout.
- Added `lib/observability/api.ts` for structured API route logging with route, method, status, duration, Vercel request id, and safe error names for unhandled failures.
- Wrapped all app API route handlers with the structured logging helper.
- Added `app/error.tsx` and `app/global-error.tsx` safe client error boundaries that log failures without exposing secret values.
- Added unit coverage for structured logging output, wrapper completion logs, and safe generic failure responses.
- Updated the TODO list to mark observability implemented.
- Updated GitHub Actions CI to run only the approved automated gate: unit tests, typecheck, lint, and production build. Playwright/E2E remains excluded for this implementation path.

Verification:

- `pnpm test`: passed, 20 files / 86 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/browser E2E command was run; manual E2E remains user-owned.

Production deployment and smoke verification:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-2o2fsh9qe-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_72rPhuL3XXL5rxYResFAssGajduK`
- Production API: `/api/openaip/style` returned HTTP 200 with style version 8 and 96 layers.
- Production API: `/api/notams/route` for FAOR → FALA returned HTTP 200 with `source=south-africa-official` and `status=manual-required`.
- Vercel runtime log stream showed structured `api_request_start` and `api_request_complete` entries for `/api/notams/route` with route, method, request id, status, and duration.
- This Vercel CLI version does not support `vercel logs --level`; downstream JSON filtering is required for error-only scans.

GitHub sync scope:

- Sync target is the existing GitHub PR branch `agent/complete-halo-flight-planner-20260719` on `selezai/halo-flight-planning`.
- The local app source is being mirrored into that Git checkout without `.env.local`, `.vercel`, `.next`, `node_modules`, or other local/generated artifacts.

Remaining external blockers:

- Live SACAA/ATNS NOTAM data remains deferred until an authorized feed/API exists.
- Automatic File2Fly/SACAA/ATNS filing remains deferred until authorized integration access exists.
- Paid/commercial launch remains blocked until OpenAIP grants written permission for authentic sprite/icon usage or the icon set is replaced.

## 2026-07-20 Clerk + Neon Account Sync

Objective: replace the deferred Supabase account-sync path with the best fit for Halo: Clerk authentication plus Neon Postgres persistence.

Decision:

- Use Clerk for auth because it has a Vercel Marketplace integration and drop-in Next.js account UI.
- Use Neon Postgres because Halo data is relational and Postgres remains the right long-term storage model.
- Use one owner-scoped latest planner snapshot for this phase instead of normalizing routes/aircraft immediately. This preserves the full current Zustand planner shape while the product model continues to evolve.
- Keep local-only mode as the default fallback when Clerk/Neon env vars are not present.
- Do not expose database credentials to the browser. Sync mutations go through authenticated server API routes only.

Vercel provisioning status:

- `vercel integration add neon` and `vercel integration add clerk` both reached Vercel Marketplace terms/account approval and opened the Dashboard.
- `vercel integration ls` still reports no resources, so production account sync remains pending until those external approvals are completed.
- Current Vercel env still has aviation/runtime variables only; Clerk/Neon env vars are not present yet.

Changes:

- Added `@clerk/nextjs`, `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`, and `zod`.
- Added a conditional Clerk provider so the app builds and runs without Clerk env vars.
- Added account sync UI in the sidebar with signed-out, signed-in, save, refresh, load, merge, and local-only states.
- Added `app/api/account/snapshot` with authenticated GET/PUT handlers.
- Added server-side auth guard for Clerk and lazy Neon/Drizzle database initialization.
- Added `halo_planner_snapshots` migration SQL and `pnpm db:migrate`.
- Added snapshot validation, size limiting, extraction, and merge helpers.
- Added a Zustand restore action that reuses existing persisted-state defaults and legacy migration behavior.
- Updated README, SETUP, QUICKSTART, TODO, and env template for the Clerk + Neon path.

Focused verification:

- `pnpm test -- tests/account/plannerSnapshot.test.ts tests/account/snapshotApi.test.ts`: passed, 22 files / 95 tests.
- `pnpm typecheck`: initially failed because the route test passed plain `Request` to a `NextRequest` route handler; fixed by constructing `NextRequest` in the test.
- `pnpm typecheck`: passed after the test fix.
- Production smoke initially showed `/api/account/snapshot` returning HTTP 500 while Clerk/Neon were not configured.
- Root cause: production-only Clerk auth initialization can throw before account sync is fully configured; the original guard only handled the obvious missing-env path.
- Fix: hardened `requireAccountUserId()` to trim env values and convert Clerk import/session failures into a safe HTTP 503 setup/auth-unavailable response.
- Follow-up root cause: once Clerk env vars appeared, Clerk auth still needed request context from `clerkMiddleware()`. Without middleware, signed-in account sync would not be reliable.
- Fix: added conditional `middleware.ts` that runs Clerk middleware only when Clerk env vars are configured and otherwise passes through for local-only environments.
- Added `tests/auth/accountAuth.test.ts`.

Final verification:

- `pnpm test`: passed, 23 files / 97 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Re-ran the full gate after adding `middleware.ts`; all checks still passed.
- No Playwright/browser E2E command was run.

Production deployment:

- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-dd3rrxayf-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_CBJQbZfbEKooLCMbCY42EnNzE37k`
- Production API: `/api/openaip/style` returned HTTP 200 with style version 8 and 96 layers.
- Production API: `/api/notams/route` for FAOR → FALA returned HTTP 200 with `source=south-africa-official` and `status=manual-required`.
- Production API: `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming Clerk middleware/auth context is active.
- Vercel runtime logs showed structured account and NOTAM API start/complete entries; no unhandled `api_request_failed` entry appeared after the auth-guard fix.

Neon activation follow-up:

- After Neon provisioning, `vercel integration ls` reports both Marketplace resources as available for `halo-flight-planning`.
- `vercel env ls` reports Neon database variables and Clerk variables for Preview and Production.
- `vercel env pull .env.local --environment=production --yes` and `vercel pull --environment=production --yes` both wrote sensitive Marketplace values as empty local placeholders in this CLI environment.
- Root cause: the deployed Vercel runtime can receive the real integration secrets, but this local CLI session cannot read those sensitive values back for `pnpm db:migrate`.
- Fix: treat empty quoted env placeholders as unconfigured locally, keep GET read-only when the table is absent, and idempotently ensure the `halo_planner_snapshots` table on authenticated PUT before saving the owner-scoped planner snapshot.
- This keeps local-only mode safe when secrets are unavailable locally while allowing production account sync to initialize through the real runtime Neon env values.

## 2026-07-21 UX/UI Overhaul

Objective: redesign Halo as a daylight luxury aviation planner with a map-first mission dashboard, responsive phone/tablet workflow, premium code-first design system, and no operational Research tab.

Research and decisions:

- Brand direction uses “halo” as a ring/light/protective aura and atmospheric light-ring concept.
- Aviation UI direction follows FAA EFB/human-factors guidance: high legibility, consistent controls, low workload, and clear operational status colors.
- Figma remains deferred because no live Figma MCP tool was available in this session; implementation proceeded code-first.
- Authentic OpenAIP sprites remain active; commercial written-permission blocker is unchanged.
- The Research tab was removed from the production pilot UI. Repository research documentation remains available in `docs/research/`.

Changes:

- Initialized shadcn/ui with Radix defaults and added the requested primitives.
- Added explicit Tailwind/CSS design tokens for pearl/ivory background, navy/graphite text, muted gold accents, cyan route glow, and strict red/amber/green operational states.
- Added a generated-logo-inspired production SVG mark: halo ring plus route arrow, plus `app/icon.svg`.
- Added `HaloAppShell`:
  - full-screen map as the opening workspace;
  - top mission bar;
  - pilot-action mission dashboard;
  - mobile bottom navigation and bottom-sheet command deck;
  - tablet map-first command-deck access;
  - desktop floating right command deck;
  - floating map controls for planning mode, airspace layer, emergency tools, and route focus.
- Refactored sidebar navigation to production panels only: Route, Weather, Aircraft/W&B, Briefing, Admin, Emergency.
- Promoted Flight Admin and Emergency/forced-landing workflow out of the raw briefing into first-class panels.
- Kept existing route, W&B, weather, NOTAM, filing, emergency, OpenAIP, account sync, export, and observability logic intact.
- Added UI state helpers for panel migration and mission summary derivation.
- Persisted legacy `research` panel state now maps to `briefing`; legacy `feature` panel state maps to `route` while clicked-feature inspection remains controlled by selected-feature state.
- Updated README and added `docs/superpowers/plans/2026-07-21-halo-ux-ui-overhaul.md`.

Generated visual reference:

- Image generation prompt: daylight luxury aviation app logo mark, halo ring and route arrow, pearl ivory background, deep navy route arrow, muted gold ring, sky cyan glow, no text, clean vector-like, premium cockpit planning feel.
- Generated bitmap reference path: `/Users/Selezmassozi/.codex/generated_images/019f78b3-5c3d-7e92-9c5a-ebeab3cc43b5/_image_id_.png`
- Final production mark is implemented as SVG code rather than depending on the bitmap.

Verification:

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm test`: passed, 26 files / 106 tests.
- `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/browser E2E command was run.
- Local production browser smoke with `agent-browser`: page loaded, no Next.js error overlay, content was present, and key map/deck controls rendered.
- Screenshot artifact: `/Users/Selezmassozi/.agent-browser/tmp/screenshots/screenshot-1784623261194.png`

Production deployment:

- Vercel production deployment inspected as Ready after final dependency cleanup:
  - Deployment URL: https://halo-flight-planning-j3bktrjcg-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_46aSKpSvkBMJpr58jT8WfJWbrCX6`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned HTTP 200 with style version 8, 96 layers, and 5 sources.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Vercel runtime log stream showed expected signed-out account request start/401 completion entries and no `api_request_failed` or error-level entry during the final scan.

## 2026-07-21 Mobile UX Regression Fix

Objective: fix the reported mobile layout/scroll regression after the UX/UI overhaul.

Problem:

- On phone-width inspection, too many surfaces competed for the viewport: mission dashboard, map controls, bottom nav, and the command deck.
- The mobile command deck used a nested flex scroll area inside a Radix sheet. The nested container could overflow or feel trapped on mobile instead of behaving like one page-like scroll surface.

Root cause:

- The fixed-position mobile sheet had a child scroll container. Even with `overflow-y-auto`, nested flex scrolling on mobile is fragile unless every parent/child height and touch behavior is exact.
- The app also defaulted the command deck to open, so mobile users could land directly in a dense panel instead of a clean map-first opening.

Fix:

- Changed the default `sidebarOpen` state to `false` so Halo opens to map/dashboard/bottom nav instead of an open deck.
- Hid the mission dashboard and floating map controls while the deck is open.
- Hid phone floating map controls below the small-screen breakpoint to reduce clutter.
- Converted the phone command deck into a full-screen `100dvh` sheet.
- Moved mobile scrolling to the sheet itself with `overflow-y-auto`, `overscroll-contain`, `touch-action: pan-y`, and iOS momentum scrolling.
- Kept desktop behavior as a fixed command deck with internal sidebar scrolling.
- Kept the mobile panel nav and header sticky enough to remain usable while the deck scrolls.

Verification:

- `pnpm test`: passed, 26 files / 106 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with only the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed.
- Local production browser smoke at 408 × 593:
  - initial phone state showed map/dashboard/bottom nav with no sheet auto-open;
  - Emergency panel opened full-screen;
  - sheet reported `overflow: auto`, `touch-action: pan-y`, `scrollHeight 851`, `clientHeight 592`;
  - programmatic sheet scroll changed `scrollTop` to 220;
  - no Next.js error overlay appeared.
- Screenshot artifact: `/tmp/halo-mobile-final.png`

Production deployment:

- Committed and pushed the mobile regression fix:
  - Commit: `0c809ea` (`Fix mobile mission deck scrolling`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-m37v7806u-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_6C5Z2TstyAc3NK21ioKQrLV2LVxw`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, 5 sources, and the active OpenAIP sprite URL.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Vercel runtime log stream showed expected structured account and NOTAM API entries and no error-level entry during the scan.
- Production mobile browser smoke at 408 × 593 against `https://halo-flight-planning.vercel.app`:
  - initial state opened map-first with no sheet/dialog auto-open;
  - Deck button was available;
  - opened deck reported full viewport bounds `408 × 593`;
  - deck reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2216`, `clientHeight 592`;
  - programmatic deck scroll changed `scrollTop` to 220;
  - mobile bottom navigation was hidden while the deck was open.
- Production screenshot artifact: `/tmp/halo-prod-mobile-deck.png`

## 2026-07-21 Unified Planner + Mission Library

Objective: remove the “two decks” feeling from the redesigned shell and add a clear place for multiple mission drafts.

Problem:

- The left mission dashboard and right command deck were structurally different, but visually they competed.
- The app only exposed one active planner state, so it felt like Halo opened to a single mission rather than a mission workspace.
- User-facing “Deck” language made the planning panel sound like a second cockpit surface instead of the one primary planning surface.

Product decision:

- Halo should have one active mission on the map at a time.
- Halo should also have a Mission Library for saved drafts.
- The Planner is the only detailed planning surface.
- Map tools remain separate because they directly manipulate the map, not mission content.

Changes:

- Replaced user-facing “Deck” language with “Planner”.
- Removed the duplicate desktop floating “Open mission deck” control.
- Replaced the large closed-state mission dashboard with a compact Mission Status card.
- Moved detailed mission status, route/fuel/airspace/W&B/admin/data metrics, fuel margin, Save active, and Missions controls into a Planner summary header.
- Renamed the map control concept in code from `MapControlDeck` to `MapToolsRail`.
- Added Mission Library domain types:
  - `HaloMissionStatus`;
  - `HaloMissionPlannerState`;
  - `HaloMissionRecord`.
- Added mission helper logic in `lib/planning/missions.ts` for display names, route labels, saved mission records, upsert/sort, archive, clone, and status mapping.
- Added Zustand Mission Library state and actions:
  - `activeMissionId`;
  - `missionLibrary`;
  - `saveActiveMission`;
  - `createBlankMission`;
  - `duplicateActiveMission`;
  - `loadMission`;
  - `archiveMission`.
- Mission switching auto-saves the current active mission before loading another saved draft.
- Added Mission Library dialog for saving, creating, duplicating, loading, and archiving mission drafts.
- Extended account snapshot JSON to include `activeMissionId` and `missionLibrary`; no database schema change was required.
- Updated README and UX overhaul docs with the unified Planner/Mission Library model.

Verification:

- `pnpm vitest run tests/planning/missions.test.ts`: passed, 6 tests.
- `pnpm vitest run tests/planning/missions.test.ts tests/account/plannerSnapshot.test.ts`: passed, 10 tests.
- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production browser smoke with `agent-browser`:
  - phone 408 × 593 opened to compact Mission Status card, no dialog auto-open;
  - phone top Planner button was present in DOM but hidden with `display: none`, leaving bottom navigation as the phone Planner entry point;
  - Mission Library dialog opened from the Missions button and showed Save active, Duplicate, New mission, saved drafts, Load, and Archive controls;
  - saving the active mission created one saved draft row;
  - mobile Planner sheet opened full-screen and reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2715`, `clientHeight 592`, and successful scroll;
  - desktop 1366 × 768 had no duplicate “Open mission deck” control, only one visible Planner button, and one visible Planner panel after opening;
  - rebuilt phone smoke confirmed old “mission deck” copy was gone and “Planner collects the pilot actions” was present.
- Screenshot artifacts:
  - `/tmp/halo-unified-planner-mobile.png`
  - `/tmp/halo-unified-planner-desktop.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the unified Planner/Mission Library slice:
  - Commit: `92ba0c5` (`Unify planner and add mission library`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-9h5i0w2fj-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_5RhpYUBg7MLcSM44g43BZPPRt536`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, 5 sources, and the active OpenAIP sprite URL.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Production phone browser smoke at 408 × 593:
  - old “mission deck” copy was absent;
  - “Planner collects the pilot actions” copy was present;
  - phone top Planner button was hidden with `display: none`;
  - Missions button was visible;
  - Mission Library opened and showed Save active and New mission;
  - Planner sheet opened full-screen, reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2761`, `clientHeight 592`, and successful scroll.
- Production desktop browser smoke at 1366 × 768:
  - duplicate “Open mission deck” control was absent;
  - one visible Planner button was present;
  - opening Planner produced one visible Planner panel;
  - Save active and Missions controls were present in the Planner summary header;
  - closed Mission Status card was hidden while Planner was open.
- Production screenshot artifacts:
  - `/tmp/halo-prod-unified-mobile.png`
  - `/tmp/halo-prod-unified-desktop.png`
- Vercel runtime log stream showed no new error entries during the final scan window.

## 2026-07-21 Planner Hierarchy Follow-up

Objective: address the desktop feedback that the left Active Mission card duplicated the right Planner summary and that Route/Wx/W&B/Brief/Admin/Emerg were not immediately accessible inside the Planner.

Root cause:

- The unified Planner work correctly consolidated mission detail into the right Planner, but the closed-state Active Mission card still rendered at desktop widths.
- The Planner summary header rendered above the panel navigation and consumed too much vertical space, so the actual planning panel options could sit below the visible right panel area.

Fix:

- Desktop and larger layouts no longer render the closed-state Active Mission card. The top mission bar and route status bar remain as the closed desktop context.
- The compact Mission Status card remains available below the desktop breakpoint, where there is no right-side Planner.
- Moved Route/Wx/W&B/Brief/Admin/Emerg navigation above the Planner summary header.
- Compressed the Planner summary header:
  - smaller padding;
  - one-line mission detail;
  - four compact metric chips instead of six;
  - shorter fuel margin section;
  - Save active and Missions actions retained.

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production browser smoke with `agent-browser`:
  - desktop 1366 × 768 closed state had no left Active Mission card;
  - desktop top bar retained one visible Planner button;
  - opening desktop Planner produced one visible panel;
  - Route/Wx/W&B/Brief/Admin/Emerg buttons were all visible immediately at `top 227` / `bottom 283`;
  - the closed-state Active Mission heading was hidden while Planner was open;
  - phone 408 × 593 retained the compact Active Mission card and bottom navigation;
  - phone Planner sheet opened full-screen, with Route/Wx/W&B/Brief/Admin/Emerg buttons all visible immediately at `top 131` / `bottom 187`;
  - phone Planner sheet reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2481`, `clientHeight 592`, and successful scroll.
- Screenshot artifact: `/tmp/halo-planner-hierarchy-mobile.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the Planner hierarchy fix:
  - Commit: `753d5d7` (`Fix planner hierarchy on desktop`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-a2xzvscfh-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_AU5ESFxhyhYZ3r35b3wJMUaG4CN5`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, and 5 sources.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Production desktop browser smoke at 1366 × 768:
  - closed state had no left Active Mission card;
  - one visible Planner button remained in the top bar;
  - no “Open mission deck” copy/control was present;
  - opening Planner produced one visible panel;
  - Route/Wx/W&B/Brief/Admin/Emerg buttons were all visible immediately at `top 273` / `bottom 329`;
  - closed Active Mission heading remained hidden while Planner was open.
- Production phone browser smoke at 408 × 593:
  - compact Active Mission card and bottom navigation remained available;
  - top Planner button remained hidden with `display: none`;
  - Route/Wx/W&B/Brief/Admin/Emerg buttons were all visible immediately inside the opened sheet at `top 177` / `bottom 233`;
  - phone Planner sheet reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2527`, `clientHeight 592`, and successful scroll.
- Production screenshot artifacts:
  - `/tmp/halo-prod-planner-hierarchy-desktop.png`
  - `/tmp/halo-prod-planner-hierarchy-mobile.png`
- Vercel runtime logs showed expected NOTAM API start/complete entries and no error-level entry during the final scan window.

## 2026-07-21 Planner Tab + Scroll Follow-up

Objective: address feedback that Planner tabs were visible but felt non-functional and the Planner tab content could not scroll reliably.

Root cause:

- The desktop Planner content scroll area was too small because account sync, panel navigation, and the Planner summary all sat outside the scrollable body.
- Browser inspection showed the active W&B content scroll container was only about 148 px high in the problematic layout.
- The summary itself did not participate in the scroll area, so scrolling over the summary could not move the active tab content.

Fix:

- Moved the Planner summary header into the Planner body scroll area.
- Kept Route/Wx/W&B/Brief/Admin/Emerg navigation fixed above the scroll body so tabs are reachable immediately.
- Made the desktop Planner summary compact; phone/tablet keep the fuller in-sheet summary.
- Added a scroll reset when `sidebarPanel` or selected map feature changes so newly selected tabs start at the top.
- Added a CSS `lg:hidden` guard to the closed-state Mission Status card to prevent desktop flicker while the media query initializes.

Verification so far:

- `pnpm typecheck`: passed.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production desktop browser smoke:
  - opening Planner showed Route/Wx/W&B/Brief/Admin/Emerg buttons;
  - clicking W&B made W&B active;
  - W&B content was present;
  - main Planner body scroll region measured `clientHeight 455` instead of the prior ~148 px;
  - programmatic scroll changed `scrollTop` to 420;
  - clicking Brief made Brief active and briefing content appeared.
- Local production phone browser smoke:
  - W&B tab was visible and active after click;
  - W&B content was present;
  - sheet reported `overflow-y: auto`, `touch-action: pan-y`, `scrollHeight 2156`, `clientHeight 592`, and successful scroll.
- Screenshot artifacts:
  - `/tmp/halo-planner-tab-scroll-desktop.png`
  - `/tmp/halo-planner-tab-scroll-mobile.png`
- Final verification:
  - `pnpm test`: passed, 27 files / 112 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- No Playwright/E2E command will be run.

Production deployment:

- Committed and pushed the Planner tab/scroll fix:
  - Commit: `787d62e` (`Fix planner tab scrolling`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-kehg2rxq2-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_EvTAe59jKcdQJCUKcoRbsXTwixhW`
- Production home page returned HTTP 200.
- Production API `/api/openaip/style` returned style version 8, 96 layers, and 5 sources.
- Production API `/api/notams/route` for FAOR → FALA returned `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`.
- Production API `/api/account/snapshot` returned HTTP 401 for a signed-out request, confirming the account guard remains active.
- Production desktop browser smoke at 1366 × 768:
  - opening Planner showed Route/Wx/W&B/Brief/Admin/Emerg buttons;
  - clicking W&B made W&B active and showed W&B content;
  - the main Planner scroll body reported `scrollHeight 1813`, `clientHeight 409`, and successful scroll to `scrollTop 420`;
  - clicking Brief made Brief active and showed briefing content.
- Production phone browser smoke at 408 × 593:
  - sample mission opened inside the Planner sheet;
  - clicking W&B made W&B active and showed W&B/POH content;
  - phone Planner sheet reported `overflow-y: auto`, `scrollHeight 2202`, `clientHeight 592`, and successful scroll to `scrollTop 220`.
- Production screenshot artifacts:
  - `/tmp/halo-prod-tab-scroll-desktop.png`
  - `/tmp/halo-prod-tab-scroll-mobile2.png`
- Vercel runtime log stream attached to deployment `dpl_EvTAe59jKcdQJCUKcoRbsXTwixhW` and showed no runtime error entries during the observation window.

## 2026-07-22 Mobile Map Overlay Follow-up

Objective: address feedback that the phone viewport still showed a redundant Active Mission card and that the overlay blocked too much of the aviation map.

Problem:

- At phone width, the closed Planner state rendered the top brand bar, a large Active Mission card, and the bottom Planner navigation at the same time.
- The Active Mission card duplicated the mission summary already available inside Planner and covered the primary map area, making the map feel unusable.

Root cause:

- `components/shell/HaloAppShell.tsx` rendered `MissionStatusCard` whenever `!plannerOpen && !isDesktop`.
- A previous desktop-specific cleanup intentionally kept the card for mobile, but that conflicted with the locked map-first mobile design.

Solution:

- Removed the closed-state `MissionStatusCard` render path and component from `HaloAppShell`.
- Removed the now-unused sample-route/primary-action overlay handlers and related imports.
- Kept mission status/actions inside the Planner sheet and Mission Library dialog.
- Kept the mobile bottom navigation as the entry point for Route, Wx, W&B, Brief, Admin, and Emergency.
- Updated the unified Planner design note: closed phone state must be map-first and must not render a mission card over the map.

Files modified:

- `components/shell/HaloAppShell.tsx`
- `docs/superpowers/plans/2026-07-21-unified-planner-mission-library.md`
- `PROJECT_SESSION_LOG.md`

Prevention:

- Closed mobile state should be reviewed as a map-availability surface first.
- Mission summaries may appear inside Planner/Missions, but not as a persistent phone overlay unless the user explicitly opens a planning surface.

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone browser smoke at 408 × 593:
  - no `Active mission` copy present in the closed state;
  - map region present;
  - bottom Route/Wx/W&B/Brief/Admin/Emerg navigation present;
  - no large mission-card overlay present;
  - bottom navigation opened the Planner sheet;
  - Planner sheet retained all six planning tabs and reported `scrollHeight 3090`, `clientHeight 592`.
- Screenshot artifacts:
  - `/tmp/halo-mobile-card-fix.png`
  - `/tmp/halo-mobile-card-fix-planner.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile overlay fix:
  - Commit: `9666ac5` (`Remove mobile mission card overlay`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-mc0bjnrnn-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_wM2ttxsTYCtUQgm159BQktfV6co1`
- Production phone browser smoke at 408 × 593 on `https://halo-flight-planning.vercel.app/#8.86/-26.1387/28.1843`:
  - no `Active mission` copy present in the closed state;
  - no `Plan a new mission` closed-state heading present over the map;
  - no large mission/status text overlay detected;
  - bottom Route/Wx/W&B/Brief/Admin/Emerg navigation present;
  - bottom navigation opened the Planner sheet;
  - W&B tab activated and W&B/POH content appeared;
  - Planner sheet reported `scrollHeight 2202`, `clientHeight 592`, and successful scroll to `scrollTop 220`.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA` when called with valid airport waypoint types;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Note: an initial NOTAM smoke call returned HTTP 400 because the ad-hoc request omitted required waypoint `type` values; route schema inspection confirmed this was an invalid smoke payload, not a production regression.
- Production screenshot artifacts:
  - `/tmp/halo-prod-mobile-card-fix.png`
  - `/tmp/halo-prod-mobile-card-fix-wb.png`
- Vercel runtime log stream attached to deployment `dpl_wM2ttxsTYCtUQgm159BQktfV6co1` and showed no runtime error entries during the observation window.

## 2026-07-22 Mobile Planner Bottom Tabs Follow-up

Objective: address feedback that the Route/Wx/W&B/Brief/Admin/Emerg tab bar should stay at the bottom while the mobile Planner sheet is open, matching the closed map bottom navigation pattern.

Problem:

- The mobile Planner sheet reused the desktop-style section switcher, rendering the tabs near the top of the sheet below the logo/account area.
- When pilots scrolled through dense sections such as Flight Admin or W&B, the tab controls were not under the thumb and did not match the map-first mobile interaction model.

Root cause:

- `components/sidebar/Sidebar.tsx` rendered one shared `nav` with `sticky top-[65px]` for all Planner variants.
- `SheetContent` handled sheet scrolling directly, so there was no internal layout slot for a bottom-pinned sheet nav.

Solution:

- Extracted the Planner section switcher into `PlannerPanelNavigation`.
- Desktop variant keeps the existing top sticky section switcher.
- Sheet variant renders the switcher after the scrollable content as a bottom navigation bar.
- Changed the mobile SheetContent from direct vertical scrolling to `overflow-hidden`; `Sidebar` now owns the internal scroll region above the bottom nav.
- Kept content scroll reset on panel changes so each section opens at the top of the scrollable content.
- Updated the unified Planner design note to require bottom-pinned tabs inside the phone Planner sheet.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `docs/superpowers/plans/2026-07-21-unified-planner-mission-library.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone browser smoke at 579 × 593:
  - opening Planner from bottom navigation placed the sheet section nav at `top 510`, `bottom 593`;
  - scrollable content area ended at `bottom 510`, above the nav;
  - content scroll worked with `scrollTop 180`;
  - Route → W&B → Admin tab switches updated the active section while the nav stayed at `top 510`, `bottom 593`;
  - W&B and Admin panel content appeared after switching.
- Screenshot artifacts:
  - `/tmp/halo-bottom-tabs-local-route.png`
  - `/tmp/halo-bottom-tabs-local-async.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile bottom-tab fix:
  - Commit: `da86fcf` (`Pin mobile planner tabs to bottom`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-9oez8nr4g-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_6CKmkfFKAAs6goAESCFMcd6NXY1B`
- Production phone browser smoke at 579 × 593 on `https://halo-flight-planning.vercel.app/#7.74/-26.103/28.284`:
  - opening Planner from bottom navigation placed the sheet section nav at `top 510`, `bottom 593`;
  - Route → W&B → Admin tab switches updated the active section while the nav stayed at `top 510`, `bottom 593`;
  - scrollable content stayed above the nav and reported `scrollTop 180`;
  - W&B and Admin panel content appeared after switching.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production screenshot artifact:
  - `/tmp/halo-bottom-tabs-prod.png`
- Vercel runtime logs showed expected NOTAM 200 and signed-out account 401 entries, with no runtime error-level entries during the observation window.

## 2026-07-22 Mobile Planner Summary Scope Follow-up

Objective: address feedback that the Planner mission summary appeared inside every mobile Planner tab, the closed map bottom nav showed a selected tab, and narrow widths clipped the four Route/Fuel/W&B/Admin summary cards.

Problem:

- The Planner summary appeared above Wx, W&B, Brief, Admin, and Emergency, even though it is route-planning context.
- Closed map view highlighted whichever Planner panel was last opened, making the map state look like a selected planning tab.
- At narrow phone widths, the four summary cards stayed in two columns and clipped route/fuel/W&B/admin text.

Root cause:

- `components/sidebar/Sidebar.tsx` rendered `plannerHeader` unconditionally for every non-feature Planner panel.
- `components/shell/HaloAppShell.tsx` passed `sidebarPanel` into `MobileNavigation` and applied active styling in closed map view.
- `PlannerSummaryHeader` used a fixed two-column metric grid and single-line metric values.

Solution:

- Render `plannerHeader` only when `sidebarPanel === 'route'`.
- Remove active/selected styling from the closed map bottom navigation; active state is reserved for the open Planner sheet.
- Change the mobile Planner summary metrics to one column below 430 px and two columns when width allows.
- Allow metric values to wrap to two lines and allow fuel margin text to wrap instead of truncating.
- Updated the unified Planner design note to document Route-only summary scope and narrow-phone metric behavior.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `docs/superpowers/plans/2026-07-21-unified-planner-mission-library.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone browser smoke at 579 × 593:
  - closed map bottom navigation rendered six tabs with `activeCount 0`;
  - Route panel showed exactly one Planner summary;
  - W&B, Brief, and Admin each showed zero Planner summary instances after switching.
- Local production narrow-phone browser smoke at 335 × 593:
  - Route panel showed exactly one Planner summary;
  - summary metric grid computed one column at `305px`;
  - Route/Fuel/W&B/Admin cards each measured `305px` wide;
  - W&B and Admin summary cards expanded to 68 px height for wrapped text;
  - bottom Planner nav remained pinned at `top 510`, `bottom 593`.
- Screenshot artifacts:
  - `/tmp/halo-mobile-map-no-active-local.png`
  - `/tmp/halo-mobile-summary-route-only-local.png`
  - `/tmp/halo-mobile-narrow-route-summary-local.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile Planner summary-scope fix:
  - Commit: `7f3cf90` (`Scope planner summary to route tab`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-ojx9wti72-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_8mQBtTTBGzYKNJCTYdcVqWjvT5Fz`
- Production phone browser smoke at 579 × 593 on `https://halo-flight-planning.vercel.app/#7.6/-26.132/27.967`:
  - closed map bottom navigation rendered six tabs with `mapActiveCount 0`;
  - Route panel showed one Planner summary;
  - W&B, Brief, and Admin each showed zero Planner summary instances;
  - W&B and Admin panel content appeared after switching.
- Production narrow-phone browser smoke at 335 × 593 on `https://halo-flight-planning.vercel.app/#7.99/-26.071/28.148`:
  - Route panel showed one Planner summary;
  - summary metric grid computed one column at `305px`;
  - Route/Fuel/W&B/Admin cards each measured `305px` wide;
  - W&B and Admin summary cards measured 68 px high for wrapped text;
  - bottom Planner nav remained pinned at `top 510`, `bottom 593`.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production screenshot artifacts:
  - `/tmp/halo-summary-scope-prod.png`
  - `/tmp/halo-narrow-summary-prod.png`
- Vercel runtime log stream attached to deployment `dpl_8mQBtTTBGzYKNJCTYdcVqWjvT5Fz` and showed no runtime error entries during the observation window.

## 2026-07-22 Mobile Wx Tab Alignment Follow-up

Objective: address feedback that the Wx tab looked lower than the other Planner tabs when selected.

Problem:

- The bottom Planner tabs had the same measured outer height, but the Wx active state could visually read as lower/uneven because the button internals were not hard-locked and the active bottom-sheet state used a vertical drop shadow.

Root cause:

- `PlannerPanelNavigation` and the closed map `MobileNavigation` used `min-h-12` plus direct icon/text children.
- Active Planner tabs added a `shadow-md` below the selected button, which created a visual lower-edge difference in the bottom sheet even though measured geometry stayed stable.

Solution:

- Changed mobile tab buttons from `min-h-12` to fixed `h-12`.
- Added fixed icon and label slots inside each tab button.
- Added `leading-none` and `overflow-hidden` to remove text/icon baseline variance.
- Removed the active-state drop shadow for bottom-sheet Planner tabs while keeping the black active fill.
- Kept desktop top Planner tab shadow behavior unchanged.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Production pre-fix measurement at 579 × 593 and 335 × 593 showed all buttons had stable outer geometry, confirming this was a visual/internal alignment issue rather than nav movement.
- Local production phone smoke at 335 × 593 after the fix:
  - Route, Wx, and W&B active states all measured button `top 526`, `bottom 574`, `height 48`;
  - every tab measured icon slot `top 534` and label slot `top 554`;
  - active Wx used the same fixed slots as inactive tabs.
- Local production phone smoke at 579 × 593 after the fix:
  - nav stayed at `top 510`, `bottom 593`;
  - all six tab buttons measured `top 526`, `bottom 574`, `height 48`;
  - all six icon slots measured `top 534`;
  - all six label slots measured `top 554`.
- Screenshot artifacts:
  - `/tmp/halo-wx-tab-jitter-prod.png`
  - `/tmp/halo-wx-tab-jitter-335-prod.png`
  - `/tmp/halo-wx-tab-normalized-local-335.png`
  - `/tmp/halo-wx-tab-normalized-local-579.png`
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the mobile tab alignment fix:
  - Commit: `0d0258b` (`Normalize mobile planner tab alignment`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-h6ggt1d7e-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_FFLUozYGr62vXvNpDNDfd9BkRVkb`
- Production phone browser smoke at 335 × 593:
  - nav stayed at `top 510`, `bottom 593`;
  - all six tab buttons measured `top 526`, `bottom 574`, `height 48`;
  - all six icon slots measured `top 534`;
  - all six label slots measured `top 554`;
  - active Wx had no bottom active shadow.
- Production phone browser smoke at 579 × 593:
  - nav stayed at `top 510`, `bottom 593`;
  - all six tab buttons measured `top 526`, `bottom 574`, `height 48`;
  - all six icon slots measured `top 534`;
  - all six label slots measured `top 554`;
  - active Wx had no bottom active shadow.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production screenshot artifacts:
  - `/tmp/halo-wx-tab-normalized-prod-335.png`
  - `/tmp/halo-wx-tab-normalized-prod-579.png`
- Vercel runtime log stream attached to deployment `dpl_FFLUozYGr62vXvNpDNDfd9BkRVkb` and showed no runtime error entries during the observation window.

## 2026-07-22 Route / Brief Scanability and Mobile Tab Geometry Follow-up

Objective: address pilot-facing UX feedback that the Route and Brief panels felt like information overload, that destructive route actions were mixed into the main route flow, and that the Wx tab still appeared to sit lower than the other bottom tabs.

Problem:

- Route and Brief presented too many controls and review outputs at the same visual hierarchy.
- The Route panel placed `Clear route` immediately after the navigation log, which made a destructive action feel like part of normal route review.
- The Brief panel exposed raw briefing text directly inside the main tab, making the tab hard to scan on phone screens.
- The mobile nav buttons already measured similarly, but their internal layout still relied on flex centering and icon/text line boxes that could visually read unevenly.

Root cause:

- The panels lacked explicit workflow grouping. Build/edit controls, operational review, training content, and export actions were stacked together.
- Destructive route management had no separated “actions” zone.
- Raw briefing content was visually dominant instead of secondary.
- The tab buttons did not use fixed internal grid rows for icon and label slots.

Solution:

- Added reusable `PanelGroupHeader` sections for lightweight cockpit-style categorization.
- Reorganized Route into:
  - `Build / Route builder`;
  - `Review / Pilot scan`;
  - `Sequence / Waypoints and map`;
  - a separate `Route actions` block for `Clear route`.
- Combined manual coordinate entry into the Add Waypoint block so waypoint creation is grouped in one place.
- Reorganized Brief into:
  - `Decision / Pilot digest`;
  - `Setup / Dispatch details`;
  - `Reviews / Operational checks`;
  - `Training / Checkride navlog`;
  - `Export / Briefing package`.
- Moved raw briefing text behind a collapsed `Show raw briefing text` disclosure while keeping Print, Text, Backup Pack, and Copy actions immediately reachable.
- Converted bottom planner tab buttons in both map view and planner-sheet view to fixed CSS grid rows for icon and label slots.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 27 files / 112 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production phone smoke at 579 × 593:
  - Route panel exposed section headings `Route builder`, `Pilot scan`, and `Waypoints and map`;
  - Brief panel exposed section headings `Pilot digest`, `Dispatch details`, `Operational checks`, `Checkride navlog`, and `Briefing package`;
  - raw briefing text was collapsed behind `Show raw briefing text`;
  - all six planner buttons measured `top 526`, `bottom 574`, `height 48`.
- Local production phone smoke at 335 × 593:
  - Route summary cards stacked cleanly without horizontal clipping;
  - all six planner buttons measured `top 526`, `bottom 574`, `height 48`.
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the UX scanability fix:
  - Commit: `8432866` (`Improve mobile planner scanability`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-m1ree55gg-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_4Fr7L6NM7DV63eua7bY7hY6767YR`
- Production phone browser smoke at 335 × 593:
  - map view loaded with bottom nav and no selected planner tab state;
  - Route panel headings were `Halo planner`, `Plan a new mission`, `Route builder`, `Pilot scan`, and `Waypoints and map`;
  - Brief panel headings were `Halo planner`, `Pilot digest`, `Dispatch details`, `Operational checks`, `Checkride navlog`, and `Briefing package`;
  - Briefing package raw text disclosure was closed by default;
  - all six planner buttons measured `top 526`, `bottom 574`, `height 48`.
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned style version 8, 96 layers, and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Vercel runtime log stream attached to deployment `dpl_4Fr7L6NM7DV63eua7bY7hY6767YR` and showed structured account API logs with the expected signed-out 401 warning and no runtime error entries during the observation window.

## 2026-07-22 OpenAIP-like Ground Basemap Detail

Objective: make Halo's ground/context map match the useful detail level visible in OpenAIP's own map while preserving Halo's OpenAIP aviation overlay.

Problem:

- The aviation overlay was present, but the underlying ground map was too blank compared with OpenAIP.
- Roads, terrain/landcover, water, settlement labels, and major place context were not visible enough for pilots to orient themselves.

Root cause:

- Halo replaced OpenAIP's original Mapbox outdoors-style base map with a single MapTiler `basic-v2` raster layer.
- The converted OpenAIP style kept the original `land` background layer. That layer rendered above Halo's raster basemap and covered ground details.
- A follow-up probe confirmed MapTiler `outdoor-v2` tiles returned real detailed image content for the Johannesburg/Pretoria tile, while the visible map stayed muted until the OpenAIP background layer was removed.

Solution:

- Added `lib/openaip/basemap.ts` to centralize basemap selection.
- Changed the default MapTiler basemap from sparse `basic-v2` to OpenAIP-like `outdoor-v2`.
- Added optional env override `NEXT_PUBLIC_MAPTILER_BASE_STYLE` for later tuning without code changes.
- Updated OpenAIP style conversion to remove source-less `background` layers because Halo now owns the ground basemap.
- Preserved OpenAIP vector aviation layers, authentic sprites, click behavior, and attribution.
- Documented the new basemap env option in `README.md` and `.env.local.example`.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/basemap.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/basemap.test.ts`
- `tests/openaip/tilePath.test.ts`
- `.env.local.example`
- `README.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused tests:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 8 tests.
  - Verified default basemap is `outdoor-v2`.
  - Verified unsafe style overrides fall back to `outdoor-v2`.
  - Verified OpenAIP `land` background layers are stripped.
- Full checks:
  - `pnpm test`: passed, 28 files / 116 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Local production API smoke:
  - `/api/openaip/style` returned `maptiler-base` using `outdoor-v2`;
  - `maptiler-base` remained the first layer;
  - no converted `background` layer remained;
  - converted style had 95 layers and 5 sources.
- Local production tile smoke:
  - center MapTiler `outdoor-v2` tile for the OpenAIP comparison area returned HTTP 200, `image/png`, and detailed road/place/water/terrain imagery.
- Local production browser smoke:
  - Johannesburg/Pretoria map view rendered ground context under the aviation overlay, including roads, place labels, water, terrain/landcover, and settlement names.
- No Playwright/E2E command was run.

Production deployment:

- Committed and pushed the basemap fix:
  - Commit: `a3f65ee` (`Restore OpenAIP-like ground basemap detail`)
  - Branch: `agent/complete-halo-flight-planner-20260719`
- Vercel production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-lprjso2hw-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_HE6Yp5aTockyF3Rj4TnLteskR9ZR`
- Production API smoke:
  - home page returned HTTP 200;
  - `/api/openaip/style` returned `maptiler-base` using `outdoor-v2`;
  - `/api/openaip/style` had no converted `background` layer;
  - `/api/openaip/style` returned 95 layers and 5 sources;
  - `/api/notams/route` returned HTTP 200 with `source=south-africa-official`, `status=manual-required`, and locations `FAOR`, `FALA`;
  - `/api/account/snapshot` returned HTTP 401 for a signed-out request.
- Production browser smoke:
  - Johannesburg/Pretoria comparison view loaded on the production alias;
  - map rendered MapTiler attribution;
  - outdoor basemap details were visible under OpenAIP aviation layers, including roads, place labels, water, landcover/terrain, and settlements.
- Production screenshot artifact:
  - `/tmp/halo-outdoor-basemap-prod-z9.png`
- Vercel runtime log stream attached to deployment `dpl_HE6Yp5aTockyF3Rj4TnLteskR9ZR` and showed:
  - `/api/openaip/style` structured request logs completing with HTTP 200;
  - `/api/account/snapshot` structured request logs completing with the expected signed-out HTTP 401 warning;
  - no runtime error entries during the observed requests.
- Note: the `vercel logs` command ended with Vercel's query-duration warning after the observation window; the observed request logs themselves were clean.

## 2026-07-22 Minimal OpenAIP-like Ground Labels

Objective: correct the ground basemap after user feedback that `outdoor-v2` added too much city/town information. Keep Halo closer to OpenAIP's minimal ground context and only reveal ground town/city detail at close zoom.

Research / evidence:

- OpenAIP's public `openaip-map-resources` project provides the aviation map style/resources and is designed to complement a Mapbox basemap rather than replace it with a dense city map.
- The live OpenAIP style metadata identifies an outdoors-style origin but keeps map-label/POI density intentionally constrained.
- Candidate MapTiler raster probes over the Johannesburg/Pretoria comparison area showed:
  - `outdoor-v2`: too much settlement/terrain/city context at medium zoom;
  - `dataviz-light`: quieter, but still had broad city labels in rendered map tiles;
  - `backdrop`: quieter, but still had faint labels in some medium-zoom tiles;
  - `basic-v2`: best close-zoom match for minimal road/place/water context.

Problem:

- The previous `outdoor-v2` default solved missing ground detail but over-corrected the map into a city/town map.
- Raster basemap labels are baked into the tile image, so Halo cannot selectively hide only towns/cities with MapLibre paint/layout filters.
- The user's target behavior was ground city/town context appearing only around the close `5 km` scale, not at broad/medium route-planning zooms.

Root cause:

- A single raster basemap cannot provide OpenAIP-like label density controls across zooms.
- Even low-noise MapTiler raster styles can still contain baked city/town labels at medium zoom.

Solution:

- Kept the real previous fix that strips OpenAIP source-less `background` layers so Halo's own basemap is not covered.
- Changed the default close-zoom MapTiler style back to minimal `basic-v2`.
- Removed the low-detail raster basemap layer entirely for broad/medium zooms.
- Added a neutral `halo-ground-background` layer from zoom 0 to 11.
- Added `maptiler-base` raster `basic-v2` only from zoom 11 to 22, aligning city/town ground detail with close planning scale.
- Preserved OpenAIP aviation vectors/sprites/click behavior above the base.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/basemap.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/basemap.test.ts`
- `tests/openaip/tilePath.test.ts`
- `.env.local.example`
- `README.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 9 tests.
  - `pnpm typecheck`: passed.
  - `pnpm build`: passed.
- Full checks:
  - `pnpm test`: passed, 28 files / 117 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Local production API smoke:
  - `/api/openaip/style` first layer was `halo-ground-background`, type `background`, zoom 0-11;
  - second layer was `maptiler-base`, type `raster`, style `basic-v2`, zoom 11-22;
  - no MapTiler low-detail raster source remained;
  - OpenAIP aviation layers remained above the base.
- Local production browser smoke:
  - z10 / 5 nm scale showed no ground city/town labels; aviation labels remained visible;
  - z11 / close scale showed `basic-v2` ground roads/place/water context under the aviation overlay.
- Screenshot artifacts:
  - `/tmp/halo-neutral-basemap-local-z10.png`
  - `/tmp/halo-basic-detail-local-z11.png`
- Production deployment:
  - Commit: `3658ac4`
  - Deployment URL: https://halo-flight-planning-eak6f771s-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_7BYk12tGvGRwPnMLMZnyhnGoTygd`
- Production API smoke:
  - `/api/openaip/style` first layer is `halo-ground-background`, type `background`, zoom 0-11;
  - `/api/openaip/style` second layer is `maptiler-base`, type `raster`, style `basic-v2`, zoom 11-22;
  - no `maptiler-base-low-detail` source is present;
  - OpenAIP aviation layers remain above the base.
- Production browser smoke:
  - z10 comparison view showed no broad city/town basemap clutter while aviation labels remained visible;
  - z11 comparison view showed close-zoom `basic-v2` roads/place/water context under OpenAIP aviation overlays.
- Production screenshot artifacts:
  - `/tmp/halo-neutral-basemap-prod-z10.png`
  - `/tmp/halo-basic-detail-prod-z11.png`
- Vercel runtime log scan attached to deployment `dpl_7BYk12tGvGRwPnMLMZnyhnGoTygd` showed:
  - `/api/openaip/style` structured request logs completing with HTTP 200;
  - `/api/account/snapshot` structured request logs completing with the expected signed-out HTTP 401 warning;
  - no runtime error entries during the observed requests.
- No Playwright/E2E command was run.

## 2026-07-22 OpenAIP Ground Rendering Deep Dive + Vector Basemap Correction

Objective: correct the previous ground-map fix after user feedback that a blank/neutral ground layer until zoom 11 does not match how OpenAIP actually behaves. User requested no Halo visual inspection after the fix; manual visual acceptance remains user-owned.

Research / evidence:

- OpenAIP's public map page is a Svelte app that initializes `mapbox-gl` with `style: PUBLIC_MAPBOX_STYLE_DEFAULT_URI`.
- OpenAIP's public constants identify the default style endpoint as `https://api.tiles.openaip.net/api/styles/openaip-default-style.json`.
- The fetched OpenAIP default style is named `openaip-mono`, style spec version 8, with 176 layers.
- OpenAIP does not render ground detail as one raster tile layer. Its style uses:
  - `composite`: `mapbox://mapbox.mapbox-terrain-v2,mapbox.mapbox-streets-v8`;
  - `mapbox-dem`;
  - `openaip-data`;
  - GeoJSON helper sources for selected/highlighted features.
- The OpenAIP ground map is approximately 81 vector layers from the `composite` source, including `landcover`, `landuse`, `water`, `waterway`, `hillshade`, `contour`, `road`, `admin`, `natural_label`, `place_label`, and `poi_label`.
- City/town/place labels are vector symbol layers, not raster text. OpenAIP gates settlement visibility with filters such as `filterrank` and zoom/rank expressions.

Problem:

- Halo's previous correction removed detailed ground raster at broad/medium zoom and replaced it with a neutral background. That reduced clutter, but it did not match OpenAIP's actual rendering model.
- Halo also cannot directly use OpenAIP's original `mapbox://` composite source in MapLibre without a compatible Mapbox source/token path.

Root cause:

- Halo was treating the ground map as a single raster basemap.
- OpenAIP's map is a layered vector composition where ground features and labels can be individually filtered/tuned beneath aviation layers.

Solution:

- Changed the default Halo ground provider back to `outdoor-v2`, but as a MapTiler vector style, not a raster tile layer.
- The OpenAIP style route now fetches the MapTiler vector style JSON server-side and merges its vector sources/layers underneath OpenAIP aviation layers.
- The converter still removes OpenAIP's Mapbox-only `composite` and `mapbox-dem` sources/layers because Halo runs MapLibre.
- Ground layers are prefixed with `halo-ground-*` to avoid collisions.
- Ground symbol layers keep text but remove unrelated MapTiler/Mapbox `icon-image` references so Halo's OpenAIP sprite sheet is not polluted with basemap POI icons.
- Duplicate ground aerodrome labels are removed because OpenAIP aviation layers already provide aerodrome labels/icons.
- Label density is tuned closer to OpenAIP:
  - city labels start at zoom 8 and stop at zoom 15;
  - town labels start at zoom 9 and stop at zoom 15;
  - village labels start at zoom 10 and stop at zoom 15;
  - local place/suburb labels start at zoom 11;
  - road labels start at zoom 10;
  - POI/outdoor POI labels start no earlier than zoom 14.
- If the vector style cannot be fetched, Halo falls back to a full-zoom basic raster layer rather than a blank map.
- Quoted MapTiler env values are normalized before provider URLs are built.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/basemap.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/basemap.test.ts`
- `tests/openaip/tilePath.test.ts`
- `.env.local.example`
- `README.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 11 tests.
  - `pnpm typecheck`: passed.
- Full checks:
  - `pnpm test`: passed, 28 files / 119 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `934c556`
  - Deployment URL: https://halo-flight-planning-lgkqypu7l-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_2uR3mNiCjhoz3brC37AKgwH5SJxm`
- Production API smoke:
  - `/api/openaip/style` returned `metadata.haloBaseMap.source = maptiler-vector`;
  - `/api/openaip/style` returned `metadata.haloBaseMap.style = outdoor-v2`;
  - `/api/openaip/style` returned `metadata.haloBaseMap.mode = vector-style`;
  - `/api/openaip/style` returned 113 `halo-ground-*` vector ground layers;
  - no `halo-raster-base` source was present;
  - `halo-ground-City labels` was tuned to zoom 8-15;
  - `halo-ground-Town labels` was tuned to zoom 9-15.
- Vercel runtime log scan attached to deployment `dpl_2uR3mNiCjhoz3brC37AKgwH5SJxm` showed `/api/openaip/style` completing with HTTP 200 and no runtime error entries during the observed request.
- No Playwright/E2E command was run.
- No Halo browser/visual inspection was performed after the fix, per user request.

## 2026-07-22 Vector Basemap Incident Fix

Objective: fix the production map degradation introduced by the vector-basemap deployment and keep production usable while correcting the root cause.

Problem:

- Production showed Halo's degraded grid/fallback state instead of the aviation map.
- The browser-visible MapLibre error was: `layers[106].filter[1]: Expected 2 arguments, but found 18 instead.`
- Layer `106` was a MapTiler vector ground label layer merged below OpenAIP aviation layers.

Immediate mitigation:

- Promoted the last known working Vercel deployment before continuing local fixes, so the production alias was not left on the broken vector-basemap deployment.
- Promoted deployment: `dpl_7acKpCQPo31kJtc5v29Uxxdd4AtF`.

Root cause:

- MapTiler's vector style uses legacy Mapbox filter syntax such as `["!in", "class", ...values]`.
- Halo's first converter path changed `!in` into `["!", ["in", ...args]]`, but MapLibre's expression-form `in` accepts exactly two arguments after the operator.
- This produced invalid generated style JSON, so MapLibre rejected the style and Halo fell back to the degraded planning grid.
- The `/api/openaip/style` response was also browser/cacheable for up to one hour, which could let an already-broken generated style linger after a deploy.

Solution:

- Converted legacy `in`, `!in`, comparison, and `!has` filters into MapLibre expression filters.
- Converted `$type` and `$id` legacy property selectors to MapLibre-compatible expressions.
- Normalized single-value and array-style legacy `in` filters.
- Changed `/api/openaip/style` responses to `Cache-Control: no-store` because the route generates a runtime-converted style from current server configuration.
- Added unit coverage for the exact failure shape from the MapTiler ground style.

Files modified:

- `app/api/openaip/style/route.ts`
- `lib/openaip/styleConverter.ts`
- `tests/openaip/tilePath.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test tests/openaip/basemap.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 12 tests.
- Full approved checks:
  - `pnpm test`: passed, 28 files / 120 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Local production API smoke:
  - `/api/openaip/style` returned `Cache-Control: no-store`;
  - layer `106` was converted to `["!", ["in", ["get", "class"], ["literal", [...]]]]`;
  - no legacy suspicious generated filters remained in the local style JSON.
- Local production browser diagnostic smoke:
  - Opened a cache-busted URL in production mode and checked text output only;
  - the previous `Map degraded` / `Expected 2 arguments` text was absent;
  - MapLibre attribution text was present.
- Production deployment:
  - Commit: `c590aa0`
  - Deployment URL: https://halo-flight-planning-3yuz1oq68-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_GceB58etzBjCSCywoQkAAjbELCg4`
- Production API smoke:
  - `/api/openaip/style` returned HTTP 200 with `Cache-Control: no-store`;
  - `metadata.haloBaseMap.source = maptiler-vector`;
  - `metadata.haloBaseMap.style = outdoor-v2`;
  - `metadata.haloBaseMap.mode = vector-style`;
  - 113 `halo-ground-*` vector ground layers were present;
  - no `halo-raster-base` source was present;
  - layer `106` was converted to a valid two-argument MapLibre `in` expression wrapped by `!`;
  - no legacy suspicious generated filters remained in the production style JSON.
- Production browser diagnostic smoke:
  - Opened a cache-busted production URL and checked text output only;
  - the previous `Map degraded` / `Expected 2 arguments` text was absent;
  - MapLibre attribution text was present.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200;
  - no runtime error entries appeared during the observed style request.
- No Playwright/E2E command was run.

## 2026-07-22 Map-First Route Planning UX

Objective: make route planning happen on the map, separate route editing from aviation-feature inspection, and remove the Route tab's add-point/search/manual-coordinate flow.

Problem:

- Planning and inspection were mixed together: clicking the map could add a waypoint, open OpenAIP/airspace information, and open the planner.
- Map-created waypoints and rubber-band inserted waypoints opened the Route panel automatically, which interrupted map-first planning.
- The Route tab duplicated map responsibilities and felt overloaded because it included route setup, search/add controls, review material, map layers, and destructive actions in one scan path.
- Touch planning needed selected-waypoint behavior for move/delete/notes without relying on the side panel.

Root cause:

- The map click handler queried OpenAIP clickable layers and opened feature/sidebar state from the same interaction path used for planning.
- The click handler captured planning mode too early instead of reading the latest store value at click time.
- Store actions for map-created/inserted route points mutated sidebar state.
- Route waypoint addition still depended on a panel-first workflow instead of treating the map as the editor.

Solution:

- Added an explicit map mode split:
  - `Plan route`: tapping/clicking the map places an exact waypoint and does not open panels.
  - `Inspect map`: tapping/clicking OpenAIP aviation data opens feature/airspace information.
- Changed `addUserWaypoint` to return the new waypoint ID and leave `sidebarOpen` / `sidebarPanel` untouched.
- Changed `insertRouteWaypoint` so rubber-band insertion no longer opens the planner.
- Added a larger transparent route-point hit target layer for mouse/touch selection.
- Added map-side waypoint selection and a floating waypoint editor for rename, pilot notes, coordinates, delete, and close.
- Added mouse and touch drag support for moving existing route points and rubber-band inserting points on the route line.
- Removed automatic snap-on-drop so planned points remain exactly where the pilot dropped them.
- Added a visible `Plan route` / `Inspect map` segmented control when the planner is closed.
- Removed the duplicate icon-only planning toggle from the map rail.
- Streamlined the Route tab into a worksheet:
  - route setup and mode guidance;
  - waypoint sequence with inline names, notes, reorder, and delete;
  - navigation log;
  - pilot scan / route review;
  - aviation layers;
  - danger zone.
- Removed the Route tab add-point search/manual-coordinate block per user decision.

Files modified:

- `components/map/Map.tsx`
- `components/shell/HaloAppShell.tsx`
- `components/sidebar/Sidebar.tsx`
- `stores/mapStore.ts`
- `tests/stores/mapStore.test.ts`
- `docs/superpowers/plans/2026-07-22-map-route-planning-design.md`
- `docs/superpowers/plans/2026-07-22-map-route-planning.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test`: passed, 29 files / 122 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `8eb17f8`
  - Deployment URL: https://halo-flight-planning-aycxd1y09-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_AsL17pnwq5n48BLZWpHotDbhveHX`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200 with `Cache-Control: no-store`.
  - `/api/openaip/style` reported `metadata.haloBaseMap.source = maptiler-vector`, `style = outdoor-v2`, and `mode = vector-style`.
  - `/api/openaip/style` returned 207 total style layers.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 116 ms.
  - No runtime error entries appeared during the observed request.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-23 Performance Smoothing Pass

Objective: reduce map and planner lag without removing core flight-planning functionality.

Problem:

- Halo felt laggy and less smooth, especially around map route editing and mobile/tablet usage.
- The likely causes needed to be separated from general "unused code" cleanup so performance work targeted real hot paths.

Root cause findings:

- Waypoint dragging wrote updated coordinates into the global Zustand store on every `mousemove` / `touchmove`.
- The persisted store serializes its partial planner state after store writes, so drag updates could repeatedly serialize route data into local storage.
- Route airspace and NOTAM sync components were always mounted and route-signature driven, so rapid waypoint coordinate updates could repeatedly abort/restart review work.
- The rendered airspace review sampled route screen points and called MapLibre `queryRenderedFeatures()` across many aviation layers, then also refreshed on map `idle`, `moveend`, and `zoomend`.
- Several large client components subscribed to the entire planner store, so unrelated updates such as viewport persistence could re-render shell/sidebar/status components.
- Mobile UI used expensive compositing over a live WebGL map: backdrop blur, large translucent shadows, and a full-screen atmosphere gradient.
- OpenAIP sprite drift could still generate repeated missing-sprite console warnings in development; production should avoid console-spam cost.

Solution:

- Added `routeEditingActive` as transient planner state.
- Changed map waypoint dragging to update the MapLibre route GeoJSON source locally during pointer movement.
- Committed final waypoint coordinates to Zustand only on drag end.
- Paused rendered airspace review, OpenAIP Core route review, and NOTAM review while route editing is active.
- Debounced OpenAIP Core route review and NOTAM review by 900 ms after route changes.
- Debounced rendered browser airspace review by 700 ms and removed the `idle` refresh trigger.
- Replaced full-store subscriptions in always-mounted map/shell/status/sidebar paths with field selectors.
- Switched the planner store to Zustand `createWithEqualityFn` so grouped shallow selectors do not trigger the deprecated equality-function warning.
- Normalized dynamic OpenAIP aviation icon expressions to known hosted OpenAIP sprite names for navaids, runways, airports, obstacles, hotspots, reporting points, and hang-gliding layers.
- Limited missing-sprite warnings to development builds.
- Disabled the full-screen map atmosphere overlay and backdrop blur on phone-width screens to reduce mobile GPU compositing cost.

Files modified:

- `app/globals.css`
- `components/map/Map.tsx`
- `components/planning/RouteAirspaceReviewSync.tsx`
- `components/planning/RouteNotamReviewSync.tsx`
- `components/planning/RouteStatusBar.tsx`
- `components/shell/HaloAppShell.tsx`
- `components/sidebar/Sidebar.tsx`
- `lib/openaip/styleConverter.ts`
- `stores/mapStore.ts`
- `tests/openaip/tilePath.test.ts`
- `tests/stores/mapStore.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test tests/stores/mapStore.test.ts tests/openaip/tilePath.test.ts`: passed, 2 files / 11 tests.
  - `pnpm typecheck`: initially failed on timer/ref/selector typing; fixed root causes and reran successfully.
- Full approved checks:
  - `pnpm test`: passed, 29 files / 124 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm typecheck`: passed.
  - `pnpm build`: passed on Next.js `15.5.18`; the earlier Zustand equality-function warning was removed by switching to `createWithEqualityFn`.
- Production deployment:
  - Commit: `989ab1f`
  - Deployment URL: https://halo-flight-planning-g09gwpri9-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_2bQ42gZnyHWNqQJ9oRHziCz2rKZk`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200 with `Cache-Control: no-store`.
  - `/api/openaip/style` reported `metadata.haloBaseMap.source = maptiler-vector`, `style = outdoor-v2`, and `mode = vector-style`.
  - `/api/openaip/style` returned 207 total style layers.
  - `/api/openaip/style` returned no risky dynamic aviation icon `concat` layers for airport, navaid, runway, obstacle, hotspot, reporting point, or hang-gliding layers.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 130 ms.
  - No runtime error entries appeared during the observed request.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-23 Touch Waypoint Drag Selection Fix

Objective: fix touch-screen waypoint dragging so moving a route waypoint does not open the waypoint editor; the editor should open only after an intentional tap on the waypoint.

Problem:

- In planning mode, touching a route waypoint immediately opened the waypoint editor.
- On touch devices this made dragging a waypoint feel broken because the editor appeared as soon as the pilot started the drag gesture.

Root cause:

- `components/map/Map.tsx` called `setSelectedWaypointId(id)` inside the route waypoint `touchstart` / `mousedown` handler.
- That treated pointer-down as selection before Halo could know whether the gesture was a tap or a drag.

Solution:

- Added a tested map interaction helper for normalizing MapLibre screen points and classifying tap-vs-drag movement with an 8 px tolerance.
- Changed route waypoint gestures so `touchstart` / `mousedown` starts transient route editing but does not open the waypoint editor.
- Changed drag movement to mark the gesture as a drag only after crossing the movement tolerance.
- Changed gesture finish behavior:
  - tap existing waypoint: opens the waypoint editor.
  - drag existing waypoint: commits the moved coordinates and keeps the editor closed.
  - rubber-band route-line insertion: commits the inserted waypoint without opening the editor during the drag.
- Kept a short click-suppression window after route gestures so delayed touch/click events cannot reopen the editor after a drag.

Files modified:

- `components/map/Map.tsx`
- `lib/planning/mapInteraction.ts`
- `tests/planning/mapInteraction.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test -- tests/planning/mapInteraction.test.ts`: passed; Vitest ran 30 files / 129 tests.
  - `pnpm typecheck`: passed.
- Full approved checks:
  - `pnpm test`: passed, 30 files / 129 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `3f6f990`
  - Deployment URL: https://halo-flight-planning-c1x1wkgba-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_BYidjoLRdZPr5hqFhnokWctSJhdQ`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200.
  - `/api/openaip/style` reported `metadata.haloBaseMap.source = maptiler-vector`, `style = outdoor-v2`, and `mode = vector-style`.
  - `/api/openaip/style` returned 207 total style layers.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 159 ms.
  - No runtime error entries appeared during the observed request window.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-23 Pinch-Zoom Waypoint Selection Fix

Objective: prevent two-finger pinch zoom near a route waypoint from opening the waypoint editor.

Problem:

- On touch screens, using two fingers to zoom in or out near a route waypoint could open the waypoint editor.
- This made map zooming unreliable in planning mode when a route point was near the gesture.

Root cause:

- The route waypoint gesture state machine only separated tap from drag by movement distance.
- It did not classify multi-touch gestures separately.
- A pinch gesture could start with one finger over a waypoint, enter route gesture state, and then finish like a single-finger waypoint tap.

Solution:

- Added touch-count helpers to identify active multi-touch MapLibre/browser touch events.
- Made waypoint drag and rubber-band insertion single-touch-only interactions.
- Added a cancel path for in-progress route gestures when a second touch appears:
  - restore the route overlay from the persisted route state,
  - remove a temporary rubber-band inserted waypoint if the cancelled gesture created one,
  - re-enable map drag/pinch handling,
  - suppress delayed click events that could reopen the waypoint editor.
- Changed `touchcancel` to cancel route editing instead of committing/selecting the route point.
- Tightened route gesture click-suppression timing so older timers cannot clear a newer suppression window.

Files modified:

- `components/map/Map.tsx`
- `lib/planning/mapInteraction.ts`
- `tests/planning/mapInteraction.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test -- tests/planning/mapInteraction.test.ts`: passed; Vitest ran 30 files / 131 tests.
  - `pnpm typecheck`: passed.
- Full approved checks:
  - `pnpm test`: passed, 30 files / 131 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `37a6608`
  - Deployment URL: https://halo-flight-planning-4tlqmslh3-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_6nVAMtuyD1hwW8CFSW8uJFwnhfmj`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200.
  - `/api/openaip/style` reported `metadata.haloBaseMap.source = maptiler-vector`, `style = outdoor-v2`, and `mode = vector-style`.
  - `/api/openaip/style` returned 207 total style layers.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 131 ms.
  - No runtime error entries appeared during the observed request window.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-23 Waypoint Plotting Editor Suppression Fix

Objective: keep the waypoint editor closed when the pilot plots a new waypoint on the map.

Problem:

- In planning mode, tapping empty map space to plot a waypoint immediately opened the waypoint editor for the new point.
- This interrupted fast route plotting because every plotted point created an extra panel interaction.

Root cause:

- The planning-mode map click handler added the waypoint and then called `setSelectedWaypointId(waypointId)`.
- `RouteWaypointEditor` renders whenever `planningMode && selectedWaypoint`, so plotting a new point selected and opened it immediately.

Solution:

- Added an explicit planning map-click action helper:
  - existing route waypoint hit: select/open waypoint editor,
  - empty map click: plot waypoint only.
- Updated the map click handler so empty-map plotting calls `addUserWaypoint(...)` and clears selection with `setSelectedWaypointId(null)`.
- Kept intentional existing-waypoint taps opening the waypoint editor.
- Added regression coverage for the planning click action rule.

Files modified:

- `components/map/Map.tsx`
- `lib/planning/mapInteraction.ts`
- `tests/planning/mapInteraction.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test -- tests/planning/mapInteraction.test.ts`: passed; Vitest ran 30 files / 132 tests.
  - `pnpm typecheck`: passed.
- Full approved checks:
  - `pnpm test`: passed, 30 files / 132 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `6448fb3`
  - Deployment URL: https://halo-flight-planning-fh9rsx5ta-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_2MQmtyRvZmn6rejhjAtAqoda6XPa`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200.
  - `/api/openaip/style` reported `metadata.haloBaseMap.source = maptiler-vector`, `style = outdoor-v2`, and `mode = vector-style`.
  - `/api/openaip/style` returned 207 total style layers.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request start log appeared for the production alias.
  - No runtime error entries appeared during the observed request window.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-23 Active Mission Save Feedback Fix

Objective: make the `Save active` button visibly save the current mission on the map and confirm the action to the pilot.

Problem:

- Pressing `Save active` appeared to do nothing.
- The current mission could be saved only when using the mission-library `New mission` flow, because that flow automatically saved the previous active mission before creating the new blank mission.
- The direct save button gave no pressed/saved confirmation, so even a successful upsert looked inactive.

Root cause:

- The store `saveActiveMission` action did upsert the active mission into `missionLibrary`, but the UI gave almost no visible state change when the active mission id/name stayed the same.
- The Save button stayed visually identical after being clicked.
- There was no direct regression test proving that `saveActiveMission` saves the current map route into the mission library.

Solution:

- Added transient mission-save feedback state in `HaloAppShell`.
- After `saveActiveMission(...)`, the shell reads the saved mission from the store and shows:
  - a green `Saved` button state,
  - a confirmation line with the saved mission name and save time,
  - the updated mission count through the existing `Missions (...)` button.
- Applied the same confirmation behavior to the planner header and Mission Library dialog save button.
- Added a store regression test proving direct `saveActiveMission` writes the current route, status, waypoint count, and waypoint state into `missionLibrary`.

Files modified:

- `components/shell/HaloAppShell.tsx`
- `tests/stores/mapStore.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test -- tests/stores/mapStore.test.ts`: passed; Vitest ran 30 files / 133 tests.
  - `pnpm typecheck`: passed.
- Full approved checks:
  - `pnpm test`: passed, 30 files / 133 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `0dd76a7`
  - Deployment URL: https://halo-flight-planning-d6bklatmp-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_CZUiE2m3vB4djPNH2Aao8PqUMNFp`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200.
  - `/api/openaip/style` reported `metadata.haloBaseMap.source = maptiler-vector`, `style = outdoor-v2`, and `mode = vector-style`.
  - `/api/openaip/style` returned 207 total style layers.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 113 ms and 79 ms.
  - No runtime error entries appeared during the observed request window.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-23 Map-Layer Control Relocation

Objective: move aviation layer controls out of the Route tab and onto the map itself.

Problem:

- The Route tab contained the full `Map layers` section.
- This mixed map display controls with route planning workflow and made the route worksheet feel overloaded.
- The map already had a small tool rail, but it only exposed a single airspace toggle instead of the full aviation layer set.

Decision:

- Map display controls belong on the map, not in the route/planner tab.
- The Route tab should remain focused on route name, planning mode explanation, waypoint sequence, route scan, and route-clear actions.
- Desktop can show map tools while the planner is open because the map is still visible.
- Phone/tablet show map tools when the planner sheet is closed so the controls do not fight the full-screen sheet.

Solution:

- Removed the `Aviation layers` / `Map layers` section from `RoutePanel`.
- Removed `RoutePanel` subscriptions to `visibleLayers` and `toggleLayer`.
- Replaced the old map rail's single airspace toggle with a floating `Layers` button on the map.
- Added an expandable map-layer card with:
  - all OpenAIP aviation layer toggles,
  - stable aviation-first ordering,
  - active layer count,
  - clear pressed/on-off state for each layer.
- Kept `Emergency tools` and `Focus route` as separate map controls below the layer control.
- Added shared layer label/order helpers and unit coverage.

Files modified:

- `components/shell/HaloAppShell.tsx`
- `components/sidebar/Sidebar.tsx`
- `lib/ui/mapLayers.ts`
- `tests/ui/mapLayers.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test -- tests/ui/mapLayers.test.ts`: passed; Vitest ran 31 files / 136 tests.
  - `pnpm typecheck`: passed.
- Full approved checks:
  - `pnpm test`: passed, 31 files / 136 tests.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `4049944`
  - Deployment URL: https://halo-flight-planning-4ofw4qges-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_EtATGowWeHd5gJhMqyLSTNiTNvud`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200.
  - `/api/openaip/style` reported `metadata.haloBaseMap.source = maptiler-vector`, `style = outdoor-v2`, and `mode = vector-style`.
  - `/api/openaip/style` returned 207 total style layers.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 176 ms.
  - No runtime error entries appeared during the observed request window.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-23 Inspect Feature Panel State Fix

Objective: make inspect-mode feature details behave predictably on mobile/tablet and remove the obsolete feature-to-route action.

Problem:

- In inspect mode, tapping a lower “Clicked features” item after scrolling the feature details jumped the panel back to the top.
- Closing the planner with the top-right X left the selected map feature in store state.
- Opening a bottom planner tab after that could resurrect the old airspace/feature info panel instead of showing the selected planner tab.
- The feature detail header still showed an `Add to route` button, which conflicts with the new map planning-mode workflow.

Root cause:

- `Sidebar` reset its scroll position whenever `selectedFeature` changed, including when selecting another item from the same clicked-feature stack.
- The top sidebar close button only set `sidebarOpen = false`; it did not clear `selectedFeature` or `selectedFeatureCandidates`.
- Planner panel opens did not clear stale inspect-mode state first.
- `FeatureDisplay` still converted OpenAIP features into route waypoints through the removed sidebar planning workflow.

Solution:

- Added a stable clicked-feature stack key and reset sidebar scroll only when the stack or planner panel changes.
- Updated sidebar close to clear inspect selection before closing.
- Updated planner panel opens and sheet close handling to clear inspect selection before showing planner content.
- Removed the `Add to route` button and its feature-to-waypoint helper from `FeatureDisplay`.
- Removed an unused shell subscription while touching the panel state path.
- Added regression coverage for clicked-feature stack keys and map-store selection clearing.

Files modified:

- `components/sidebar/Sidebar.tsx`
- `components/shell/HaloAppShell.tsx`
- `lib/ui/featureDetails.ts`
- `tests/ui/featureDetails.test.ts`
- `tests/stores/mapStore.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test -- tests/ui/featureDetails.test.ts tests/stores/mapStore.test.ts`: passed; Vitest ran 32 files / 138 tests.
  - `pnpm typecheck`: passed.
- Full approved checks:
  - `pnpm test`: passed, 32 files / 138 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Production deployment:
  - Commit: `5003921`
  - Deployment URL: https://halo-flight-planning-kca0mo7ir-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_5kNQWyRyr3CTCvwpER4M4DJzdcUZ`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 107 ms.
  - No runtime error entries appeared during the observed request window.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-07-25 Route Navigation + Location Tracking

Objective: add a map-first active route start/stop system and browser location tracking with a Halo-style minimalist aircraft marker.

Problem:

- Halo had route planning and map inspect modes, but no explicit “active route” state for starting/stopping a planned route.
- Browser location tracking was still represented by MapLibre’s default geolocation control rather than a Halo-branded aircraft marker.
- Pilots needed a simple way to start flying the planned route from the map without accidentally placing new waypoints during active navigation.

Decision:

- Keep route navigation and GPS tracking as transient UI/flight state, not saved mission data.
- Starting a route requires at least two waypoints, switches the map out of planning mode, clears selected inspect features, enables browser GPS, and enables follow mode.
- Stopping a route stops the active route state and disables GPS tracking that was started through the route flow.
- Location tracking remains separately available through a dedicated aircraft button.
- Only show the aircraft marker and accuracy ring for a live `tracking` state; stale fixes are cleared on GPS stop/denial/error.

Solution:

- Added active route state:
  - `idle`, `active`, `stopped`;
  - start/stop timestamps;
  - current leg index;
  - next waypoint;
  - distance-to-next and cross-track fields from latest GPS fix.
- Added browser location state:
  - `idle`, `requesting`, `tracking`, `denied`, `unavailable`, `error`;
  - browser position normalized to Halo coordinates, feet, knots, heading, accuracy, and timestamp;
  - follow mode for route-start and location tracking.
- Added pure route-tracking helpers for GPS normalization, route progress, next waypoint, and fallback aircraft heading.
- Replaced the default MapLibre geolocation control with:
  - a custom DOM/SVG Halo aircraft marker;
  - a cyan accuracy ring;
  - route-leg fallback heading when browser heading is missing.
- Added map controls:
  - `Start route` / `Stop route`;
  - `Track location` using a minimalist Halo plane icon;
  - active/error visual states and tooltips.
- Updated the desktop/tablet status bar to show active-route and GPS status.
- Added regression coverage for route progress, GPS normalization, start/stop state, active-route progress updates, and stale GPS fix clearing.

Files modified:

- `components/map/Map.tsx`
- `components/planning/RouteStatusBar.tsx`
- `components/shell/HaloAppShell.tsx`
- `components/icons/HaloPlaneIcon.tsx`
- `stores/mapStore.ts`
- `lib/planning/routeTracking.ts`
- `tests/planning/routeTracking.test.ts`
- `tests/stores/mapStore.test.ts`
- `types/planning.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused checks:
  - `pnpm test -- tests/planning/routeTracking.test.ts tests/stores/mapStore.test.ts`: passed; Vitest ran 33 files / 144 tests before the stale-GPS regression, then 145 tests after the final regression was added.
  - `pnpm typecheck`: passed.
- Full approved checks:
  - `pnpm test`: passed, 33 files / 145 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Code review:
  - Review agent reported no critical findings.
  - Important stale-GPS finding was fixed by clearing position on tracking stop/terminal errors and showing the marker only for live `tracking`.
  - Route stop now also disables GPS because route start automatically enables it.
- Production deployment:
  - Commit: `ed9dea4`
  - Deployment URL: https://halo-flight-planning-7yxav38z1-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_4xKQuR1s3LLX3BTgZqsC9jo4o8VD`
- Production smoke:
  - `/` returned HTTP 200 from the production alias.
  - `/api/openaip/style` returned HTTP 200.
- Vercel runtime log scan:
  - `/api/openaip/style` structured request logs completed with HTTP 200 in 109 ms.
  - No runtime error entries appeared during the observed request window.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

## 2026-08-02 Location Reliability, Mobile Input Zoom, Airport Lock, Offline Snapshot

Objective: fix the location-permission error state, prevent mobile keyboard focus from zooming the app, add a nearest-airfield lock to waypoint editing, and add practical offline support for active missions.

Problems:

- Accepting browser location permission could still leave Halo showing an error when the browser returned GPS timeout/unavailable callbacks while it was still acquiring a usable fix.
- The GPS success callback assumed every browser position payload could be normalized safely; malformed or incomplete payloads could bubble into a map error path.
- Mobile browsers could zoom the page when focusing small text inputs, making the planner hard to zoom/pan back out after typing.
- The waypoint editor let pilots move/name/note a waypoint, but did not provide a fast way to snap a checkpoint to the nearest visible airfield/airport.
- Offline behavior was only incidental browser/Zustand persistence. There was no deliberate “active mission reference” snapshot once a flight had started.

Decisions:

- Treat geolocation `POSITION_UNAVAILABLE` and `TIMEOUT` as non-terminal acquisition states after permission is granted. Only permission denial, unsupported browser location, or unknown failures stop tracking.
- Fix mobile keyboard zoom with 16px mobile input sizing instead of disabling user pinch zoom globally.
- Keep the waypoint airport lock conservative: it only uses visible rendered OpenAIP airport layers near the selected waypoint, and clears when the Airports layer is hidden.
- Implement offline use as an active-mission reference snapshot plus app-shell/static cache. Do not cache live weather, NOTAM, OpenAIP style, OpenAIP tiles, or airspace-review API responses because stale aviation data must not appear current.
- Keep offline copy explicit: live aviation, weather, and NOTAM data is unavailable offline unless refreshed online.

Solution:

- Added provider-neutral browser geolocation error classification in `routeTracking`.
- Wrapped GPS position normalization/update in a defensive `try/catch` and kept recoverable GPS acquisition failures in `requesting` state.
- Updated location tracking labels so recoverable timeout/unavailable states show `GPS acquiring`.
- Added mobile input/select/textarea font-size protection in the global mobile CSS and removed global viewport scale locking.
- Added nearest-airfield lock helpers and a waypoint-editor control that snaps the selected waypoint to the closest visible rendered OpenAIP airport/airfield while preserving the waypoint id and pilot notes.
- Added airport-lock refresh on selected waypoint changes, map move/zoom, and airport-layer visibility changes.
- Added an active-mission offline snapshot builder containing route summary, aircraft basics, waypoints, active-route state, and last known GPS position.
- Added a small non-blocking offline snapshot chip to the map shell.
- Added a service worker that caches only the app shell, static Next assets, icon, and static OpenAIP sprites; it explicitly avoids account/auth, NOTAM, live weather, OpenAIP style, OpenAIP tiles, search, and airspace-review responses.
- Throttled offline snapshot writes so frequent GPS updates do not create localStorage jank.

Files modified:

- `app/globals.css`
- `app/layout.tsx`
- `components/map/Map.tsx`
- `components/offline/OfflineMissionSupport.tsx`
- `components/shell/HaloAppShell.tsx`
- `lib/planning/airportLock.ts`
- `lib/planning/offlineMission.ts`
- `lib/planning/routeTracking.ts`
- `public/sw.js`
- `tests/planning/airportLock.test.ts`
- `tests/planning/offlineMission.test.ts`
- `tests/planning/routeTracking.test.ts`
- `tests/stores/mapStore.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification before deployment:

- `pnpm test`: passed, 35 files / 153 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Code review:
  - Initial critical finding: service worker could cache live aviation/weather API responses and make stale data look current.
  - Fix: removed live aviation/weather data paths from offline caching and bumped the service-worker cache version.
  - Initial important findings: offline copy implied active-state restore, airport lock did not refresh on layer visibility changes, and viewport scale lock harmed accessibility.
  - Fixes: clarified snapshot copy, refreshed/cleared airport lock with airport-layer visibility, and removed global pinch-zoom lock.
  - Reviewer re-check result: ready.
- No Playwright/E2E command was run.
- Browser/manual E2E inspection remains user-owned.

Production deployment:

- Commit: `22aec0d`
- Deployment URL: https://halo-flight-planning-a45yrwh5q-pilotmerch-gmailcoms-projects.vercel.app
- Production alias: https://halo-flight-planning.vercel.app
- Deployment ID: `dpl_D6m19SQEwfox7PsMTPxRowQ2bV3W`

Production smoke:

- `/` returned HTTP 200 from the production alias.
- `/sw.js` returned HTTP 200 from the production alias.
- `/api/openaip/style` returned HTTP 200 with `Cache-Control: no-store`.

Vercel runtime log scan:

- `/api/openaip/style` structured request logs completed with HTTP 200 in 44 ms.
- No runtime error entries appeared during the observed request window.

## 2026-08-02 Persistent Aircraft Tracking + GPS Startup Guard

Objective: make aircraft position tracking pilot-controlled and persistent, and fix the location-permission path where accepting browser GPS access could still throw an app error.

Problems:

- The map had two GPS-entry paths: route activation and the separate aircraft/location button. Both could request browser location, but only the generic location state was tracked.
- Pilots could not intentionally keep aircraft tracking enabled as a remembered preference separate from activating a route.
- If `navigator.geolocation.watchPosition(...)` threw synchronously after the permission prompt path, the effect did not catch it and the app could fall through to the global error boundary.
- Existing copy used mixed “GPS/location” wording instead of pilot-facing “aircraft tracking” wording.

Decisions:

- Keep route activation and aircraft tracking separate:
  - `Activate route` starts route guidance and can temporarily enable GPS.
  - `Track aircraft` is the pilot-controlled persistent preference.
  - `End route` only turns GPS off when the persistent aircraft-tracking preference is off.
- Persist only the tracking preference, not live aircraft coordinates.
- Disable the persistent preference after terminal permission/unavailable/error states so Halo does not repeatedly auto-prompt or auto-retry a blocked browser/system permission path.
- Keep Playwright/E2E out of the verification path; user owns manual browser inspection.

Solution:

- Added a persisted `aircraftTrackingEnabled` preference to the map store and account planner snapshot schema.
- Added `setAircraftTrackingEnabled(...)` so the tracking preference and active browser watcher state stay coordinated.
- Added an app-shell effect that re-enables browser tracking from the stored preference on reload only when the GPS state is idle.
- Wrapped `navigator.geolocation.watchPosition(...)` startup in `try/catch` and converted synchronous browser/platform failures into a safe `unavailable` UI state.
- Preserved an already-active route GPS fix when the pilot turns persistent aircraft tracking on, so the aircraft marker does not disappear while waiting for another browser fix.
- Preserved route-driven GPS when the pilot turns the persistent aircraft-tracking preference off during an active route.
- Updated route and aircraft tracking button labels/tooltips to aviation wording: `Activate route`, `End route`, and `Track aircraft`.
- Added unit tests for watcher startup failure formatting, persistent aircraft-tracking preference behavior, terminal permission failure handling, and planner snapshot serialization.

Files modified:

- `components/map/Map.tsx`
- `components/shell/HaloAppShell.tsx`
- `stores/mapStore.ts`
- `lib/planning/routeTracking.ts`
- `lib/account/plannerSnapshot.ts`
- `tests/planning/routeTracking.test.ts`
- `tests/stores/mapStore.test.ts`
- `tests/account/plannerSnapshot.test.ts`

Verification:

- `pnpm test`: passed, 35 files / 158 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Code review:
  - Initial important finding: route-driven GPS and persistent aircraft tracking were conflated, allowing the aircraft button to disable GPS during an active route.
  - Fix: added an explicit preserve-active-GPS option when disabling the persistent preference during route guidance.
  - Second important finding: enabling persistence while route GPS was already tracking reset status to `requesting`, and ARIA copy described the wrong action.
  - Fix: preserved the existing tracking status/position when making route GPS persistent and changed ARIA state/labels to reflect the persistent preference.
  - Reviewer re-check result: no Critical or Important issues.
- No Playwright/E2E command was run.

Deployment:

- Commit deployed: `b4309dc`
- Deployment URL: https://halo-flight-planning-5smwozzks-pilotmerch-gmailcoms-projects.vercel.app
- Production alias: https://halo-flight-planning.vercel.app
- Deployment ID: `dpl_4CBRtk4LH8vJTM2dTLrkwaoxa1SV`

Production smoke:

- `/` returned HTTP 200 from the production alias.
- `/sw.js` returned HTTP 200 from the production alias.
- `/api/openaip/style` returned HTTP 200 with `Cache-Control: no-store`.

Vercel runtime log scan:

- `/api/openaip/style` structured request logs completed with HTTP 200 in 126 ms.
- No runtime error entries appeared during the observed request window.

## 2026-08-02 Vercel Duplicate Project Cleanup

Objective: remove the duplicate Halo Vercel project so future deployments and dashboard checks are unambiguous.

Problem:

- Vercel contained two Halo projects:
  - `halo-flight-planning` (`prj_wcjsA04jtds3ixcBLvwkOKhXdxkm`)
  - `halo-flight-planning-inspect` (`prj_41prX4BCHx68C9NRjeArg79HqILe`)
- The duplicate `-inspect` project had stale public aliases and was still receiving preview deployments, creating confusion in the Vercel dashboard.

Findings:

- Local `.vercel/project.json` pointed to the correct live project: `halo-flight-planning`.
- `https://halo-flight-planning.vercel.app` pointed to the correct live project.
- The correct project had the real production environment variables for Neon, Clerk, OpenAIP, MapTiler, and NOTAM configuration.
- The duplicate `halo-flight-planning-inspect` project had no environment variables and its public alias pointed to an old July 19, 2026 deployment.

Actions:

- Removed duplicate aliases:
  - `halo-flight-planning-inspect.vercel.app`
  - `halo-flight-planning-inspect-pilotmerch-gmailcoms-projects.vercel.app`
- Deleted duplicate Vercel project:
  - `halo-flight-planning-inspect`

Verification:

- `vercel project ls --json` now lists only one Halo project: `halo-flight-planning`.
- `vercel alias ls` now lists only the correct Halo aliases:
  - `halo-flight-planning.vercel.app`
  - `halo-flight-planning-pilotmerch-gmailcoms-projects.vercel.app`
- `https://halo-flight-planning.vercel.app/` returned HTTP 200 after cleanup.
- `https://halo-flight-planning-inspect.vercel.app/` returned HTTP 404 `DEPLOYMENT_NOT_FOUND` after cleanup.

Code changes:

- None. This was an external Vercel configuration cleanup plus session-log documentation.

## 2026-08-02 Persisted Browser State Load Crash

Objective: fix the app error shown when loading Halo in a browser with older or corrupted local planner state.

Problem:

- Clean production browser sessions loaded correctly.
- The reported load failure reproduced when the persisted Zustand key `halo-map-store` contained stale/corrupt data such as `activeAircraft: null`.
- Reproduction console error:
  - `Cannot read properties of null (reading 'reserveMinutes')`
  - Followed by Halo's `app_error_boundary` log.

Root cause:

- `mergePersistedMapState(...)` treated local browser persistence as trusted and spread persisted values directly over safe defaults.
- If an older/corrupt browser snapshot contained `activeAircraft: null`, malformed route scalars, invalid waypoint arrays, or malformed mission state, those values reached route/fuel/W&B UI during hydration and could throw before the user could recover.

Solution:

- Added defensive normalization at the persisted-state boundary in `stores/mapStore.ts`.
- Normalized:
  - aircraft profiles
  - waypoint arrays
  - saved mission records and nested mission state
  - map center/zoom
  - visible layers
  - route text fields
  - W&B station weights
  - personal minimums
- Preserved current/default values when a persisted key is missing or malformed.
- Kept active route and live GPS fixes non-persisted on load.

Files modified:

- `stores/mapStore.ts`
- `tests/stores/mapStore.test.ts`

Verification:

- Reproduced the production error before the fix using corrupt localStorage.
- `pnpm test -- tests/stores/mapStore.test.ts`: passed, 35 files / 160 tests.
- `pnpm typecheck`: passed.
- `pnpm test`: passed, 35 files / 160 tests.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production-build browser verification:
  - Injected corrupt `halo-map-store` data with `activeAircraft: null`.
  - Reloaded `http://localhost:3020/`.
  - Halo loaded the map shell instead of the error boundary.
  - Only local Vercel analytics script warnings appeared on localhost.
- No Playwright/E2E command was run.

Code review:

- A first review agent returned a null payload.
- A second focused review agent did not return within the practical review window and was interrupted.
- Proceeded using direct reproduction, targeted regression tests, typecheck, lint, build, and local production-browser verification.

Deployment:

- Commit deployed: `eb8742c`
- Deployment URL: https://halo-flight-planning-17w5tapyi-pilotmerch-gmailcoms-projects.vercel.app
- Production alias: https://halo-flight-planning.vercel.app
- Deployment ID: `dpl_45gG2T5PBN7ToZBonZxRCSfy4A4f`

Production verification after deploy:

- `https://halo-flight-planning.vercel.app/` returned HTTP 200.
- Production browser verification:
  - Injected corrupt `halo-map-store` data with `activeAircraft: null`.
  - Reloaded `https://halo-flight-planning.vercel.app/`.
  - Halo loaded the map shell instead of the error boundary.
  - Browser console showed Vercel analytics/speed-insights and Clerk development-key warnings, but no Halo app error boundary log.

## 2026-08-02 iPhone/Chrome Aircraft Tracking Crash

Objective: fix the app error boundary shown after accepting browser location permission for aircraft tracking or route activation on iPhone/Chrome.

Problem:

- The earlier persisted-state fix addressed a separate load-time crash, but did not address the live browser-location permission crash.
- User reproduction was specific: tap aircraft tracking on iPhone/Chrome, allow location, then Halo falls into the app error boundary.
- Desktop browser geolocation mocking did not reproduce the crash, which points to a mobile GPS/map-render path rather than a generic permission-denied path.

Root-cause finding:

- The browser geolocation request path was guarded, but the downstream aircraft overlay path was not fully isolated.
- After location permission succeeds, Halo receives a GPS fix, stores it, and then MapLibre draws the aircraft marker and accuracy ring.
- That overlay update could still throw after React state changed, especially if a mobile GPS fix arrives while the MapLibre style is not fully loaded or if the browser returns an extreme/invalid accuracy value for the accuracy polygon.
- Because the exception escaped the map overlay update path, Next.js showed the app error boundary instead of keeping Halo usable.

Solution:

- Made aircraft location overlay rendering wait for both `mapLoaded` and `styleLoaded`.
- Wrapped the location source/layer creation, accuracy-ring update, aircraft marker creation, marker position update, and heading style update in a recovery boundary.
- If the overlay fails, Halo now logs a structured `location_overlay_failed` browser-console event, removes any partial marker, and returns the location state to a non-terminal acquiring state instead of crashing the planner.
- Sanitized browser GPS accuracy before it reaches map geometry:
  - zero, negative, and non-finite accuracy values are ignored;
  - extreme mobile accuracy values are capped at 100 nautical miles for rendering.

Files modified:

- `components/map/Map.tsx`
- `lib/planning/routeTracking.ts`
- `tests/planning/routeTracking.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/planning/routeTracking.test.ts tests/stores/mapStore.test.ts`: passed.
- `pnpm typecheck`: passed.
- Focused review agent found no Critical or Important issue in the current patch and independently verified route-tracking tests, typecheck, full tests, and build.
- Final full verification after this documentation entry:
  - `pnpm test`: passed, 35 files / 161 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.

Deployment note:

- User requested not to watch the production deployment after push/deploy; the deployment was started without a post-deploy observation window.

## 2026-08-02 Self-Healing Client Boot and Recovery

Objective: prevent real users from needing to manually clear browser cache or app data after stale client state, service-worker cache, or mobile browser API failures.

Problem:

- Halo had started protecting known crash paths, but recovery still depended too much on manual browser cache clearing when stale app-shell or persisted planner state was involved.
- The error boundary told users the error was logged, but client-side app-boundary errors were only logged in the browser console, so production diagnosis for iPhone/Chrome crashes was weak.
- The service worker used a fixed offline cache and did not actively force update checks/reloads when a new shell was installed.
- Zustand persisted planner state had normalization, but no explicit persistence version/migration path for future breaking client-state changes.

Solution:

- Added versioned Zustand persistence:
  - `HALO_MAP_STORE_VERSION = 3`;
  - legacy/unversioned persisted state is migrated away from crash-prone live browser fields such as active route, live location fixes, selected features, and route-editing state;
  - legacy persistent aircraft tracking is turned off during the migration so old browsers do not immediately retrigger a location prompt/crash loop after update.
- Added a reusable recovery panel for app/global error boundaries:
  - `Try again`;
  - `Repair and reload` to clear Halo offline caches and unregister Halo's service worker without clearing planner data;
  - `Download saved planner data` to export Halo-owned local records;
  - `Reset Halo app data` to clear Halo local planner/offline records after attempting a recovery backup.
- Added safe client-error ingestion:
  - `POST /api/client-errors`;
  - validates payloads;
  - strips query strings from paths;
  - redacts common token/API-key/authorization patterns;
  - logs build id, source, error name/message, user agent, and timestamp without stack traces or secrets.
- Hardened service-worker updates:
  - bumped offline shell cache to `halo-offline-shell-v3`;
  - added `updateViaCache: 'none'`;
  - checks for updates on app load;
  - activates waiting workers and reloads once on controller change;
  - serves `/sw.js` with no-store/no-cache headers.
- Added a public non-secret build id via `NEXT_PUBLIC_HALO_BUILD_ID`, sourced from Vercel git commit sha when available.

Files modified:

- `app/api/client-errors/route.ts`
- `app/error.tsx`
- `app/global-error.tsx`
- `components/offline/OfflineMissionSupport.tsx`
- `components/system/HaloRecoveryPanel.tsx`
- `lib/observability/clientErrors.ts`
- `lib/recovery/haloClientRecovery.ts`
- `next.config.js`
- `public/sw.js`
- `stores/mapStore.ts`
- `tests/observability/clientErrors.test.ts`
- `tests/recovery/haloClientRecovery.test.ts`
- `tests/stores/mapStore.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- Focused recovery/logger/migration verification:
  - `pnpm test -- tests/recovery/haloClientRecovery.test.ts tests/observability/clientErrors.test.ts tests/stores/mapStore.test.ts`: passed, 37 files / 172 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- Full verification:
  - `pnpm test`: passed, 37 files / 172 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - First `pnpm build` attempt compiled successfully but returned `ENOENT` for `.next/build-manifest.json` while an orphaned `next build` process was still running and then created the manifest.
  - Root cause was treated as a local generated-output race, not a source compile failure. The orphaned build process was terminated, generated `.next` output was removed, and `pnpm build` was rerun cleanly.
  - Clean `pnpm build`: passed on Next.js `15.5.18`, including `/api/client-errors`.
  - `git diff --check`: passed.
- Code review:
  - A focused review agent was requested for the self-healing client boot changes.
  - It did not return within two practical wait windows, so the slice proceeded using direct diff review plus the verification evidence above.

Deployment note:

- User previously requested not to watch production deployments; production deployment is started without a post-deploy observation window.

## 2026-08-02 Faster Aircraft Location Acquisition

Objective: reduce the time Halo spends showing `GPS acquiring` after route activation or aircraft tracking is enabled.

Problem:

- Halo used a single high-accuracy `watchPosition(...)` request with `maximumAge: 5_000`.
- That forced the browser toward a fresh high-accuracy fix before Halo could show the aircraft marker.
- On desktop/mobile browsers, especially after first permission grant or when GPS hardware is still warming up, this can leave the UI stuck on `GPS acquiring` even when the browser could provide a usable cached/coarse location earlier.

Root cause:

- The acquisition path optimized for high accuracy first, not first usable fix first.
- Later recoverable timeout/unavailable callbacks could also move the state back to `requesting`, hiding an already usable aircraft marker.

Solution:

- Added staged browser geolocation options:
  - fast first fix: `getCurrentPosition(...)` with `enableHighAccuracy: false`, `maximumAge: 120_000`, `timeout: 3_500`;
  - refinement: parallel `watchPosition(...)` with `enableHighAccuracy: true`, `maximumAge: 30_000`, `timeout: 20_000`.
- Both route activation and persistent aircraft tracking now share the staged acquisition path.
- Older cached fixes are ignored if a newer aircraft position is already active.
- Recoverable high-accuracy timeout/unavailable callbacks no longer hide an already usable aircraft position.

Files modified:

- `components/map/Map.tsx`
- `lib/planning/routeTracking.ts`
- `tests/planning/routeTracking.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/planning/routeTracking.test.ts`: passed, 37 files / 174 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- Final full verification after this documentation entry:
  - `pnpm test`: passed, 37 files / 174 tests.
  - `pnpm typecheck`: passed.
  - `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
  - `pnpm build`: passed on Next.js `15.5.18`.
- Code review:
  - A focused review agent was requested for the staged acquisition change.
  - It did not return within the practical wait window, so the slice proceeded using direct root-cause review plus the verification evidence above.

## 2026-08-02 Vercel Git Connection Investigation

Objective: investigate whether the wrong Halo Vercel project was removed after the dashboard showed the remaining project as not connected to a GitHub repository and the GitHub repo did not appear in the Vercel connection list.

Findings:

- Local `.vercel/project.json` is linked to:
  - project: `halo-flight-planning`
  - project id: `prj_wcjsA04jtds3ixcBLvwkOKhXdxkm`
  - team/org id: `team_OyiMFd8cjjDEnqYASTWDrjsc`
- Local Git remote is:
  - `https://github.com/selezai/halo-flight-planning.git`
- GitHub repo exists and the local GitHub account has admin access:
  - `selezai/halo-flight-planning`
  - visibility: public
- Vercel project list now contains only one Halo project:
  - `halo-flight-planning` / `prj_wcjsA04jtds3ixcBLvwkOKhXdxkm`
- The live production alias points to that same surviving project:
  - `https://halo-flight-planning.vercel.app`
- Recent Halo deployments are production CLI deployments by `pilotmerch-5340`, not Git-triggered deployments.
- Vercel aliases show Git-triggered alias history for other projects such as `sit-easy-git-*`, but no `halo-flight-planning-git-*` alias history was found in the inspected alias pages.
- Local pulled Vercel deployment environment metadata has empty `VERCEL_GIT_*` fields, which confirms the current project is not Git-connected.

Conclusion:

- The evidence does not support that the live production project was deleted.
- The surviving production project is the correct live project, but it is currently CLI-linked/deployed rather than GitHub-linked.
- The repo missing from Vercel's dashboard Git repository picker is most likely a GitHub/Vercel integration permission or account-selection issue, not a missing GitHub repository.
- There is a separate important release-management risk:
  - deployed branch: `agent/complete-halo-flight-planner-20260719`
  - open PR: `#1 Complete Halo flight planning app`
  - `origin/main` is 79 commits behind the deployed branch
  - connecting Vercel to Git with production branch `main` before merging/syncing would risk future Git-triggered production deployments using stale code.

Safe path:

1. Update the Vercel GitHub App installation or Vercel Git provider connection so it can access `selezai/halo-flight-planning`.
2. Merge PR `#1` into `main` or set Vercel's production branch to the current agent branch until the merge is complete.
3. Connect the surviving Vercel project `halo-flight-planning` to `selezai/halo-flight-planning`.
4. Keep CLI deploys as the fallback until Git integration is confirmed with a successful preview/production deploy from the intended branch.

## 2026-08-02 Aircraft Tracking Map Lock Deep Debug

Objective: investigate the persistent issue where tapping Track Aircraft leaves Halo showing `GPS acquiring`/`Locating`, the map remains clickable but cannot be panned, and waypoints plotted during the stuck state only become visible after toggling tracking and refreshing.

Evidence gathered before fixing:

- Production Vercel logs did not show `/api/client-errors` or runtime exceptions for the flow.
- Browser console showed only unrelated Clerk development-key warnings in production and local-only Vercel Analytics/Speed Insights messages during local smoke.
- A controlled geolocation stub that never returned a fix reproduced the `Locating` state, but panning still worked:
  - production test moved the map hash from `#9/-26.15/28.05` to `#9/-26.15/28.3247`.
  - conclusion: GPS acquisition/requesting state alone was not the root cause.
- Static code review found only one app path that can make MapLibre clickable but not pannable:
  - `components/map/Map.tsx` route editing disables `mapInstance.dragPan`.
  - cleanup re-enables drag pan only through MapLibre `mouseup`, `touchend`, or `touchcancel` handlers.
- Route edit state is transient and not persisted, so refresh resets the interaction lock while persisted waypoints remain available.
- Controlled browser reproduction before the fix:
  - start a route edit on the rendered route/waypoint hit target;
  - release over the top UI overlay;
  - the next pan attempt did not move the map hash.
- CDP touch verification confirmed the mobile route segment is touch-interactive:
  - a single touch on the orange route segment changed stored waypoint count from 3 to 4, proving ordinary touch gestures near the route can enter rubber-band route editing.

Root cause:

- Track Aircraft was correlated with the issue but was not itself locking the map.
- The actual lock was a stale rubber-band route gesture:
  - route/waypoint touch starts disable MapLibre `dragPan`;
  - if the browser, permission prompt, overlay, or visibility change prevents MapLibre from receiving the normal end/cancel event, the app can leave `dragPan` disabled;
  - the map remains clickable because click handlers still run, but panning is blocked until the route gesture state is cleared by another interaction or page refresh.

Solution:

- Added route gesture interactivity restoration around MapLibre drag-pan cleanup.
- Added global fallback cleanup for `mouseup`, `touchend`, `touchcancel`, window `blur`, and document `visibilitychange`.
- Added component cleanup for the global gesture listeners.
- Added a self-heal effect that re-enables MapLibre drag panning whenever `routeEditingActive` is false.
- GPS acquisition logic was intentionally left unchanged for this fix.

Files modified:

- `components/map/Map.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- --runInBand`: passed, 37 files / 174 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production smoke with `PORT=3001 pnpm start`:
  - geolocation stub stuck at `Locating` still allowed map panning;
  - after an interrupted route gesture, the immediate next pan moved the map hash from `29.1651` to `29.4398`;
  - before the fix, the same interrupted-gesture pattern caused the immediate next pan attempt to stay locked.

## 2026-08-03 Location Acquisition Simplification

Objective: address the remaining issue after the map-pan fix: Halo could still fail to acquire location on desktop Chrome and iPhone Safari/Chrome, while the UI stayed in an unhelpful `GPS acquiring` state.

Evidence gathered before fixing:

- Production headers are HTTPS/HSTS and do not set a `Permissions-Policy` blocking geolocation.
- Production browser check showed:
  - `isSecureContext: true`
  - `navigator.geolocation` available
  - Permissions API available
  - geolocation permission initially `prompt`
- Raw geolocation in the automation browser returned `PERMISSION_DENIED`, confirming the automation context cannot reproduce the user's allowed-device path.
- MDN/W3C geolocation docs identify:
  - secure context requirement;
  - `PERMISSION_DENIED` code `1`;
  - `POSITION_UNAVAILABLE` code `2`;
  - `TIMEOUT` code `3`;
  - `enableHighAccuracy: true` may take more time/power.
- Existing Halo code started both:
  - a fast `getCurrentPosition(...)`; and
  - a high-accuracy `watchPosition(...)`
  at the same time.
- Existing Halo code treated initial `POSITION_UNAVAILABLE`/`TIMEOUT` as non-terminal `requesting`, which made real browser failures look like endless acquisition.

Root cause:

- The location acquisition path was over-engineered for the first fix.
- It started high-accuracy refinement before any usable position existed.
- It also hid initial browser failures as indefinite `GPS acquiring`, so pilots could not tell whether the problem was site permission, OS Location Services, Precise Location, signal, or a browser timeout.

Solution:

- Replace parallel acquisition with sequential acquisition:
  1. request one normal first fix with `getCurrentPosition(...)`;
  2. only after first success, start high-accuracy `watchPosition(...)` for refinement.
- Increase first-fix tolerance to `maximumAge: 300_000` and `timeout: 15_000`.
- Make initial `POSITION_UNAVAILABLE` and `TIMEOUT` terminal/visible instead of indefinite `requesting`.
- Keep refinement-watch failures non-terminal only after Halo already has a usable aircraft position.
- Show the actual browser GPS error message near the map controls so mobile users can see what failed without relying on desktop-only hover/tooltips.

Files modified:

- `components/map/Map.tsx`
- `components/shell/HaloAppShell.tsx`
- `lib/planning/routeTracking.ts`
- `tests/planning/routeTracking.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/planning/routeTracking.test.ts tests/stores/mapStore.test.ts`: passed, 37 files / 175 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.

## 2026-08-03 Planner UI Slices And Auth Gate

Objective: complete the requested UI slices without Playwright or visual browser inspection, then commit and push so the Git-connected Vercel project can deploy from `main`.

Problem / requested changes:

- The waypoint editor could sit behind app chrome, sheets, or map controls on mobile and desktop.
- The route tab had a separate "Route setup" block for editing the mission name instead of making the route tab header editable.
- The map control rail still had emergency tools and focus route buttons, showed a layer count badge next to the layer icon, used the aircraft glyph for Track aircraft, and used route/stop iconography for active route state.
- Tablet mode showed a "Tablet mission mode" hint and the medium-width map tools overlapped the Plan route / Inspect map control.
- The planner was accessible before sign-in and used an in-sidebar account sync banner instead of gating access up front.

Root cause:

- The waypoint editor was rendered inside the map with `z-20`, below the shell header, mobile navigation, and Radix sheet/dialog layers.
- The route name edit surface lived in the old setup card, so removing that card required moving the input to the top of the route panel.
- The map controls had accumulated separate shortcuts after earlier planning iterations and shared the same tablet top offset as the map mode switcher.
- Clerk was configured for sync, but the dashboard route did not require a user before rendering the planner.

Solution:

- Raised the waypoint editor to `z-[70]` so it sits above the shell and modal/sheet chrome.
- Replaced the route setup card with a top route-name input and kept map mode controls as an unlabelled route-panel section.
- Removed emergency and focus route map shortcuts.
- Replaced route activation glyphs with play/pause icons and Track aircraft with the crosshair icon.
- Made the map layer trigger icon-only while keeping the detailed count inside the layer menu.
- Removed the tablet hint and moved the map controls lower at tablet widths.
- Removed the sidebar account sync panel render and changed the dashboard page to require Clerk sign-in/sign-up before rendering the planner when Clerk is configured. Local/dev without Clerk keys still renders the planner to avoid a broken auth wall.

Files modified:

- `app/(dashboard)/page.tsx`
- `components/map/Map.tsx`
- `components/shell/HaloAppShell.tsx`
- `components/sidebar/Sidebar.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual inspection were intentionally skipped per user instruction.

## 2026-08-10 Test Pilot Access

Problem / requested change:

- The first real-pilot testing day showed interest but signup was acting as an activation barrier.
- Add a "Continue as test pilot" path so invited pilots can open Halo before creating a Clerk account.
- Track coded links without putting personal names, emails, or phone numbers in URLs.

Root cause:

- The existing dashboard page required a Clerk user whenever Clerk was configured, so unsigned invitees could not experience the planner before account creation.
- The lightest viable tracking path already existed through mounted Vercel Analytics, so a database migration was unnecessary for the first testing round.
- During verification, the first typecheck failed because the dashboard page used a default props parameter. Next 15 generated types require the page first argument to match `PageProps`; allowing `undefined` in that function argument violated the generated contract.
- Follow-up finding: `Continue as test pilot` originally used the same browser-local `halo-map-store` key as the normal planner. On a browser that had stale data from a deleted account, test-pilot mode could hydrate that stale local planner state. This does not expose data across devices, but it can confuse same-browser testing.
- First storage-reset fix failed in browser because clearing `localStorage` alone did not reset an already-hydrated Zustand store during client navigation. The live map store also had to be reset before rendering the app shell.

Solution:

- Added coded-link parsing for `?testPilot=1&source=...&pilot=...`, with unsafe values falling back to non-identifying defaults.
- Added a gate-only "Continue as test pilot" link pointing to `/?testPilot=1&source=access-gate`.
- Let unsigned `testPilot=1` visitors open the existing local-only `HaloAppShell` without mounting account auto-sync.
- Added `TestPilotTracker` to create a browser-local anonymous session id and emit `test_pilot_started` once plus `test_pilot_opened` on each test-pilot open.
- Fixed the Next page prop typing by using `searchParams?: Promise<TestPilotSearchParams>` and removing the default page props argument.
- Added `TestPilotPlanner` as a client wrapper that prepares test-pilot storage before lazy-loading `HaloAppShell`.
- Test-pilot entry now backs up any previous `halo-map-store` / owner values, writes a clean test-pilot planner store, marks the browser owner as `test-pilot`, and resets the live map store when stale data was already hydrated.
- Reloads after the browser is already marked as `test-pilot` preserve the pilot's own test data.

Files modified:

- `app/(dashboard)/page.tsx`
- `components/auth/HaloAuthNav.tsx`
- `components/testing/TestPilotPlanner.tsx`
- `components/testing/TestPilotTracker.tsx`
- `lib/testing/testPilotAccess.ts`
- `tests/testing/testPilotAccess.test.ts`
- `docs/superpowers/plans/2026-08-10-test-pilot-access-design.md`
- `docs/superpowers/plans/2026-08-10-test-pilot-access.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/testing/testPilotAccess.test.ts`: passed, 39 files / 196 tests.
- First `pnpm typecheck`: failed with `.next/types/app/(dashboard)/page.ts(34,29)` because the page function props type included `undefined`.
- Follow-up `pnpm typecheck`: passed after correcting the page prop type.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm test`: passed, 39 files / 196 tests.
- `pnpm build`: passed on Next.js `15.5.18`.
- Local production server: `pnpm start` served `http://localhost:3000`.
- Browser verification against `http://localhost:3000/?testPilot=1&source=whatsapp-dm&pilot=p01`: rendered planner content, no Next/framework overlay, no captured console errors, and stored `halo-test-pilot-session` plus `halo-test-pilot-started=1`.
- Follow-up stale-local-data reproduction:
  - Seeded `localStorage` with `routeName="Deleted account route"`, one old waypoint, and `halo-account-sync-owner="deleted_user"`.
  - Opened `http://localhost:3000/?testPilot=1&source=stale-local-test&pilot=p01`.
  - Verified the planner rendered clean with `routeName="South Africa cross-country"`, `waypoints=0`, `halo-account-sync-owner="test-pilot"`, one backup key, no framework overlay, and no captured console errors.
- Production deployment inspected as Ready:
  - Deployment URL: https://halo-flight-planning-dplikhczf-pilotmerch-gmailcoms-projects.vercel.app
  - Production alias: https://halo-flight-planning.vercel.app
  - Deployment ID: `dpl_Hj5LNpSTLYfWyVZBofJeXNSJot2r`
- Production alias HTTP smoke for `/?testPilot=1&source=smoke&pilot=p01`: returned HTTP 200 and served assets with `dpl=dpl_Hj5LNpSTLYfWyVZBofJeXNSJot2r`.
- Production browser verification:
  - `/` showed the signed-out account gate text and included `Sign in`, `Sign up`, and `Continue as test pilot`.
  - `/?testPilot=1&source=smoke&pilot=p01` rendered planner content, had no Next/framework overlay, had no captured console errors, and stored the anonymous test-pilot session keys.

Notes:

- Local `.env.local` does not fully configure Clerk, so the normal local `/` route still uses the pre-existing local-only fallback. Production behavior with Clerk configured will show the account gate unless the visitor uses `testPilot=1`.
- The unique deployment URL is protected by Vercel SSO in this project, so pilot links should use the production alias.

## 2026-08-08 Clerk Verification Email Branding

Objective:

- Add Halo branding to the Clerk email verification code template used by the test-pilot email/password auth flow.

Context:

- The linked Clerk app is still the development instance `ins_3HahEtO1WB7MLYHxxu8LLEP1cAw`; no Clerk production instance exists yet.
- `auth_email` is configured with `verify_at_sign_up: true` and `verification_strategies: ["email_code"]`.
- The active verification template is Clerk email template `verification_code`.

Change made:

- Updated Clerk template `email/verification_code` through the Clerk API.
- Changed the subject to `{{otp_code}} is your Halo verification code`.
- Replaced the default body with a Halo-branded HTML email:
  - Halo Flight Planning header.
  - Public Halo icon URL from `https://halo-flight-planning.vercel.app/icon.svg`.
  - Branded cyan/navy verification code panel.
  - Pilot-account wording.
  - Security note not to share the code.
  - Request metadata using `{{requested_from}}` and `{{requested_at}}`.
- Preserved the required `{{otp_code}}` variable.
- Kept `delivered_by_clerk: true`.

Verification:

- Clerk preview before applying rendered subject `123456 is your Halo verification code` and contained Halo copy plus OTP.
- Clerk API update returned:
  - `is_custom: true`
  - `enabled: true`
  - `delivered_by_clerk: true`
  - `hasHalo: true`
  - `hasOtp: true`
- Readback from Clerk confirmed:
  - subject is `{{otp_code}} is your Halo verification code`
  - `can_revert: true`
  - body contains Halo Flight Planning, the hosted Halo icon, and `{{otp_code}}`.
- Clerk preview after applying confirmed the rendered sender remains `notifications@accounts.dev` because this is still the development instance.

Notes:

- This external Clerk config change did not require app code changes or a Vercel deployment.
- When a Clerk production instance is created later, this template must be copied to production.

## 2026-08-08 Production Account Sync Recovery Screen Hotfix

Problem:

- Production showed Halo's app error boundary with "Reload the planner" after the automatic account sync deployment.

Evidence:

- `vercel inspect halo-flight-planning.vercel.app` showed the production alias was serving deployment `dpl_EpnqNF861kqBBrSGmzxyepBhdCZj` from commit `dba550d`.
- `curl https://halo-flight-planning.vercel.app/` returned the expected signed-out server-rendered auth gate.
- `curl https://halo-flight-planning.vercel.app/api/account/snapshot` returned the expected unauthenticated `401`.
- Vercel runtime logs for the triggered snapshot request showed normal request start/complete logs, not a server crash.

Root cause:

- The new `AccountAutoSync` component computed the account snapshot fingerprint during React render using strict snapshot validation.
- Any legacy or partially invalid browser planner value could throw during hydration/render before the sync component's effect-level error handling ran, which moved the whole dashboard into the recovery screen.

Solution:

- Added safe account-sync snapshot extraction that validates fields independently and omits invalid legacy fields from autosync payloads.
- Switched `AccountAutoSync` to use the safe extractor and payload builder for render-time fingerprinting, initial local-state capture, and debounced saves.
- Added regression coverage for invalid legacy local planner fields such as `activeAircraft: null` and nested `undefined` values.

Files modified:

- `components/auth/AccountAutoSync.tsx`
- `lib/account/autoSync.ts`
- `tests/account/autoSync.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/account/autoSync.test.ts tests/account/plannerSnapshot.test.ts tests/account/snapshotApi.test.ts`: passed, 38 files / 185 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm test`: passed, 38 files / 185 tests.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual inspection were intentionally skipped per user instruction.

## 2026-08-07 Automatic Account Snapshot Sync

Problem / requested change:

- Test pilots can currently lose planner data when browser storage is cleared because the main UI relies on the local `halo-map-store` Zustand persistence.
- The account snapshot API and Neon repository existed, but sync was manual-only and the manual panel was not mounted in the app shell.

Root cause:

- Clerk account identity survived browser-data clearing, but Halo planner data did not automatically reload from the authenticated server snapshot.
- A naive auto-sync could overwrite a real remote account snapshot with startup defaults if the browser storage had been cleared or only contained the default store shape.

Solution:

- Added account auto-sync helpers that fingerprint only supported planner snapshot fields, detect local browser snapshot storage, and choose between direct remote restore or local/remote merge.
- Added a hidden signed-in `AccountAutoSync` client component that:
  - loads `/api/account/snapshot` after Clerk reports the user is signed in;
  - restores the remote snapshot directly when local browser data is missing/default;
  - merges local and remote planner data when local persisted edits exist;
  - saves the merged restore back to the account when local edits changed the remote record;
  - debounces future meaningful planner state changes back to `/api/account/snapshot`.
- Mounted the hidden sync component in the authenticated dashboard only.
- Added unit coverage for cleared-browser restore, default-local protection, local/remote merge, storage detection, and transient-state fingerprinting.

Files modified:

- `app/(dashboard)/page.tsx`
- `components/auth/AccountAutoSync.tsx`
- `lib/account/autoSync.ts`
- `tests/account/autoSync.test.ts`
- `docs/superpowers/plans/2026-08-07-automatic-account-sync.md`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/account/autoSync.test.ts tests/account/plannerSnapshot.test.ts tests/account/snapshotApi.test.ts`: passed, 38 files / 184 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm test`: passed, 38 files / 184 tests.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual inspection were intentionally skipped per user instruction.

Readiness note:

- Halo is ready for controlled test-pilot E2E/beta testing after this slice, not operational release. The biggest product/process caveat remains Clerk development-instance auth on the `vercel.app` domain until a custom production domain is available.

## 2026-08-07 Clerk App Router Quickstart Alignment

Problem / requested changes:

- Align the existing App Router Clerk setup with the current Clerk quickstart prompt.
- Install the latest `@clerk/nextjs` with the existing package manager.
- Add a `proxy.ts` entrypoint using `clerkMiddleware()`.
- Include Clerk's auto-proxy matcher path.
- Put `ClerkProvider` directly inside `app/layout.tsx`'s `<body>`.
- Use `Show`, `UserButton`, `SignInButton`, and `SignUpButton` from `@clerk/nextjs`.

Root cause / context:

- Halo already used Clerk, but it still had the active request hook in `middleware.ts` only.
- The app is currently on Next.js `15.5.18`. Clerk's current quickstart says `proxy.ts` is the newer pattern, while Next.js 15 and below still require `middleware.ts` as the active file name.
- The root layout used a project-specific `HaloClerkProvider` wrapper instead of showing the provider directly inside `<body>`.

Solution:

- Updated `@clerk/nextjs` from `7.5.20` to `7.7.0` with `pnpm`.
- Added `proxy.ts` with `clerkMiddleware()` and matchers for app routes, `'/__clerk/:path*'`, and API/trpc routes.
- Kept `middleware.ts` for Next 15 compatibility and made it delegate to the new proxy implementation with the same matcher config.
- Replaced the root layout wrapper with direct `<ClerkProvider>` inside `<body>`.
- Added `components/auth/HaloAuthNav.tsx` using `Show`, `SignInButton`, `SignUpButton`, and `UserButton`.
- Reused the auth nav on the access gate and planner header.

Files modified:

- `app/(dashboard)/page.tsx`
- `app/layout.tsx`
- `components/auth/HaloAuthNav.tsx`
- `components/shell/HaloAppShell.tsx`
- `middleware.ts`
- `proxy.ts`
- `package.json`
- `pnpm-lock.yaml`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- `pnpm test`: passed, 37 files / 176 tests.
- Playwright and visual inspection were intentionally skipped.

Notes:

- The pre-existing untracked `app/gps-lab/` route remains untracked and was not staged for this production commit. The local build still detected it because it is present on disk, but the Git deployment from `main` will not include it unless it is committed later.

## 2026-08-03 GPS Lab Commit Check

Objective: inspect the untracked `app/gps-lab/` route before committing it.

Finding:

- `app/gps-lab/page.tsx` was not required by the production Track Aircraft flow.
- It was a standalone browser geolocation diagnostic page:
  - no app state mutations;
  - no server API calls;
  - no secrets or environment variables;
  - direct use of `navigator.geolocation`, Permissions API, and clipboard export for local result sharing.
- Committing it as-is would have added a public `/gps-lab` route outside the dashboard auth gate.

Decision:

- Commit the GPS lab because it is useful for real-device GPS debugging, but do not expose it as an unauthenticated public route.

Solution:

- Moved the diagnostic UI into `app/gps-lab/GpsLabClient.tsx`.
- Added a server `app/gps-lab/page.tsx` wrapper with metadata and Clerk auth enforcement when Clerk is configured.
- Local/dev without Clerk keys can still open the lab, matching the dashboard fallback behavior.

Files modified:

- `app/gps-lab/GpsLabClient.tsx`
- `app/gps-lab/page.tsx`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual inspection were intentionally skipped.

## 2026-08-03 Mobile GPS + Inspect Follow-up

Problem / requested changes:

- Confirm whether Clerk is configured, using CLI where possible.
- Fix the edge case where Track aircraft followed by Start route temporarily removed the aircraft marker.
- Change the live aircraft map marker to a plane icon.
- Reposition the map layer panel on mobile/tablet so it does not sit on the bottom navigation.
- Closing airspace inspect details should not reveal or force the Route tab.

Root cause:

- Vercel has Clerk environment variables configured, but the production browser warning shows the deployed publishable key is still a Clerk development/test key.
- Starting route guidance re-enabled location tracking after an existing fix was already present. The store moved the status back to `requesting`, and the map overlay only rendered fixes while status was exactly `tracking`.
- The layer menu was rendered inline under the left rail button, so short mobile/tablet viewports made it collide with bottom controls.
- `clearSelection()` reset `sidebarPanel` to `route`, and the inspect close button only cleared selection instead of closing the inspect panel.

Solution:

- Preserved the current tracked fix/status when location tracking is enabled again with an existing fix.
- Allowed the map aircraft marker to render while a previous fix is being kept during `requesting`.
- Replaced the live location marker artwork with a top-down plane silhouette.
- Anchored the mobile/tablet layer menu beside the rail with viewport-bounded width and height; desktop keeps the existing stacked behavior.
- Changed inspect close to close the sidebar/sheet and changed selection clearing to preserve the active planner panel.

Files modified:

- `components/map/Map.tsx`
- `components/shell/HaloAppShell.tsx`
- `components/sidebar/Sidebar.tsx`
- `stores/mapStore.ts`
- `tests/stores/mapStore.test.ts`
- `PROJECT_SESSION_LOG.md`

Verification:

- `pnpm test -- tests/stores/mapStore.test.ts tests/planning/routeTracking.test.ts`: passed, 37 files / 176 tests.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings/errors, aside from the Next 15 `next lint` deprecation notice.
- `pnpm build`: passed on Next.js `15.5.18`.
- Playwright and visual inspection were intentionally skipped per user instruction.

## 2026-08-17 Production Activity Audit

Objective: check whether real users/test pilots are using the production Halo app and identify which telemetry sources currently show activity.

Findings:

- Production deployment is Ready at `https://halo-flight-planning.vercel.app`, backed by deployment `dpl_33bG96DXSeLLJNKvrZLd4UJWxuqy`.
- The app mounts `@vercel/analytics` and sends test-pilot custom events in code, but the Vercel Web Analytics API returns `web_analytics_not_enabled` for this project. This means pageview and `test_pilot_started` / `test_pilot_opened` event reporting is not currently available from Vercel Analytics until Web Analytics is enabled in the project settings.
- Vercel runtime logs were streamed for the maximum five-minute CLI window and returned no runtime log entries during that check.
- Production Neon is configured and reachable, but Halo's `public.halo_planner_snapshots` table does not exist. Because the app creates this table on first authenticated account-sync save, there is no evidence of account-synced planner usage yet.
- Neon Auth tables exist, but `neon_auth.user` and `neon_auth.session` both contain zero rows, so no Neon Auth users or sessions are present.
- Pulled production env values show `DATABASE_URL` / `POSTGRES_URL` populated, but `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are empty in the pulled environment. Account sign-up/sign-in tracking through Clerk is therefore not available from this deployment environment as checked.

Conclusion:

- Current observable evidence shows no account-backed user activity and no live server-side activity during the audit window.
- Test-pilot link click/open tracking cannot be confirmed because Vercel Web Analytics is disabled at the project level, despite analytics code being present in the app.

Recommended next step:

- Enable Web Analytics for `halo-flight-planning` in Vercel so existing `test_pilot_started` and `test_pilot_opened` events start recording.
- Re-check Clerk environment variables before relying on account sign-up as a test metric.

## 2026-08-17 First-Party Test Pilot Activity Tracking

Objective: add reliable first-party tracking for anonymous test-pilot link opens because Vercel Web Analytics is disabled for the project.

Decisions:

- Keep the Vercel Analytics calls in place, but do not depend on them for the first testing phase.
- Store anonymous test-pilot activity in Neon with no names, emails, Clerk user ids, or mission data.
- Keep the route public for no-signup test pilots, with authorization limited to a strict allowlist of event names and sanitized tracking values.
- Dedupe repeated `test_pilot_opened` events inside a short same-session window after browser verification showed the initial effect path could send two open events on one page load.

Changes:

- Added `halo_test_pilot_events` migration and Drizzle schema.
- Added `POST /api/testing/test-pilot-events`.
- Added server validation/repository helpers in `lib/testing/testPilotEvents.ts`.
- Added a client fire-and-forget sender and wired `TestPilotTracker` to record `test_pilot_started` and `test_pilot_opened`.
- Updated the migration runner to apply all sorted SQL files in `db/migrations`.
- Added focused Vitest coverage for validation, API behavior, client sending, and opened-event dedupe.

Production:

- Applied the additive production Neon migration: 7 idempotent statements from 2 migration files.
- Deployed production deployment `dpl_AAn5Gv3bg8SRetTrWkB4VTXxuYvJ`.
- Production alias: `https://halo-flight-planning.vercel.app`.
- Browser smoke against `/?testPilot=1&source=agent-dedupe&pilot=agent` recorded exactly one `test_pilot_started` and one `test_pilot_opened` row.

Current activity:

- Real test-pilot events excluding `source like 'agent-%'`: 0 events, 0 sessions, 0 pilot codes as of 2026-08-17 11:27 UTC.
- The table contains agent smoke rows from deployment verification; exclude `agent-%` sources when checking real pilot activity.

Verification:

- `pnpm test tests/testing/testPilotEvents.test.ts tests/testing/testPilotEventsApi.test.ts tests/testing/testPilotEventClient.test.ts`: passed, 3 files / 11 tests.
- `pnpm test tests/testing/testPilotAccess.test.ts tests/testing/testPilotEvents.test.ts tests/testing/testPilotEventsApi.test.ts tests/testing/testPilotEventClient.test.ts`: passed, 4 files / 20 tests.
- `pnpm test`: passed, 42 files / 212 tests.
- `pnpm typecheck`: passed.
- `pnpm build`: passed on Next.js `15.5.18`.
