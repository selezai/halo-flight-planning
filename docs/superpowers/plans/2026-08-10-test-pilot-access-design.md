# Test Pilot Access Design Document

## Problem Statement

Halo's first real-pilot testing phase is losing people at the account gate. Interested pilots should be able to experience the planner before creating a Clerk account.

## Solution Overview

Allow unauthenticated visitors to continue into Halo as local-only test pilots. Test links can include `?testPilot=1&source=...&pilot=...`; Halo stores a non-sensitive anonymous session id in `localStorage` and emits Vercel Analytics events for the test-pilot start/open path.

## Key Decisions

- Keep signed-in users on the existing `AccountScopedPlanner` path so Clerk + Neon account sync is unchanged.
- Keep test pilots on the existing `HaloAppShell` planner without `AccountAutoSync`, preserving the current local-only behavior.
- Use coded links such as `pilot=p01`, never personal names, emails, or phone numbers in URLs.
- Use Vercel Analytics custom events for the first testing phase instead of adding a database migration.

## Implementation Notes

- `app/(dashboard)/page.tsx` accepts `searchParams`, checks `testPilot=1`, and renders the local-only planner for unsigned test pilots.
- `components/testing/TestPilotTracker.tsx` runs in the browser, stores `halo-test-pilot-session`, and emits `test_pilot_started` once per browser session plus `test_pilot_opened` on each test-pilot page open.
- `components/auth/HaloAuthNav.tsx` adds a gate-only "Continue as test pilot" button that links to `/?testPilot=1&source=access-gate`.

## Open Questions

- Deeper activation events, such as route creation or briefing export, can be added after the first testing cohort starts if Vercel Analytics shows enough opens but poor activation.
