# Integration Tests and CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use systematic-debugging when issues arise, verification-before-completion before claiming success.

**Goal:** Add repeatable integration coverage and CI gates so Halo is verified as a production-built Next.js app before future flight-planning slices are released.

**Architecture:** Keep Vitest responsible for pure unit tests and Playwright responsible for app/API integration tests. Playwright starts `next build && next start` rather than `next dev` to avoid lazy route compilation and dev-server streaming instability.

**Tech Stack:** Next.js 14 App Router, Playwright Test, Vitest, GitHub Actions, pnpm.

---

## Tasks

### Task 1: Playwright Production-Server Integration Tests

- [x] Add `@playwright/test`.
- [x] Add `playwright.config.ts`.
- [x] Configure Playwright `webServer.command` to run `pnpm build && pnpm exec next start`.
- [x] Set Playwright test server env to empty OpenAIP/MapTiler credentials so tests verify safe degraded behavior without external services.
- [x] Add a UI integration test for starter-waypoint route creation and briefing generation.
- [x] Add API integration checks for OpenAIP style fallback, weather input validation, OpenAIP search credential protection, and Core airspace-review unavailable state.

### Task 2: CI Workflow

- [x] Add `.github/workflows/ci.yml`.
- [x] Install dependencies with `pnpm install --frozen-lockfile`.
- [x] Run `pnpm test`.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm build`.
- [x] Install Playwright Chromium in CI.
- [x] Run `pnpm test:e2e`.

### Task 3: Verification and Release

- [x] Run local Playwright tests against production build.
- [x] Run full local verification after documentation updates.
- [ ] Push PR branch.

## Decisions

- Do not run integration tests against `next dev`; the project policy requires production build/start for Playwright.
- Do not rely on OpenAIP or MapTiler credentials for CI. The fallback behavior is part of Halo's product contract and can be tested deterministically.
- Keep API integration tests at the request layer for third-party-facing boundaries. The test validates Halo route-handler behavior without depending on external provider DOMs or live data.
- Leave `pnpm test` as the Vitest unit-test command and add `pnpm test:e2e` for Playwright so the runners stay separated.

## Verification Evidence

- `pnpm install --frozen-lockfile`: passed.
- `pnpm test`: 34 Vitest tests passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: no ESLint warnings or errors.
- `pnpm build`: production build passed.
- `pnpm test:e2e`: 2 Playwright tests passed against `next build && next start`.
