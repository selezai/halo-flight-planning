# Test Pilot Activity Tracking Design Document

## Problem Statement
Halo needs a reliable way to see whether invited test pilots are opening the app during the early test phase. Vercel Analytics code is already mounted, but project-level Web Analytics is disabled, so Vercel is not currently returning pageview or custom event data.

## Solution Overview
Add a minimal first-party telemetry path for anonymous test-pilot events. The existing browser-local test-pilot tracker will keep sending Vercel events, and it will also POST a small event payload to a new server-side API route that writes to Neon.

## Key Decisions
- Store only anonymous testing metadata: event name, source, optional pilot code, session id, user agent, referrer, and server timestamp.
- Keep the route public because test pilots can use the app without signing up; authorization is enforced by strict schema validation and event allowlists.
- Use an append-only table so this does not affect planner behavior, Clerk users, or mission data.
- Do not block the planner if telemetry fails.

## Implementation Notes
- Add `halo_test_pilot_events` with a check constraint for accepted event names.
- Add a repository helper that inserts validated events with parameterized Drizzle values.
- Add `POST /api/testing/test-pilot-events` with Zod validation and structured API logging.
- Update `TestPilotTracker` to send its existing `test_pilot_started` and `test_pilot_opened` events to the new API.
- Add Vitest coverage for validation, repository behavior, API success, and client fire-and-forget behavior.

## Open Questions
None for the first test phase. Dashboard/reporting views can be added later after the event table has real traffic.
