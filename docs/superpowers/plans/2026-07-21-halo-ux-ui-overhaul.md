# 2026-07-21 Halo UX/UI Overhaul

## Objective

Redesign Halo as a daylight luxury aviation planner: light-first, map-first, mobile/tablet-balanced, and pilot-action focused while preserving the existing flight-planning, OpenAIP, W&B, NOTAM handoff, filing admin, emergency, account sync, export, and observability behavior.

## Locked product decisions

- Visual direction: daylight luxury aviation.
- Primary devices: phone and iPad/tablet, with desktop support.
- Opening experience: full-screen map with mission dashboard overlay.
- Motion: subtle and purposeful only.
- Logo direction: halo ring plus route arrow.
- Production pilot UI: no in-app Research tab.
- Source of truth: code-first design system using shadcn/ui primitives.
- Figma is deferred because no live Figma MCP tool was available in this session.

## Research basis

- Brand meaning: “halo” as a ring/light/protective aura from Merriam-Webster and atmospheric halo/light-ring concepts from the National Weather Service.
  - https://www.merriam-webster.com/dictionary/halo
  - https://www.weather.gov/arx/why_halos_sundogs_pillars
- Aviation UI constraints: FAA EFB and flight-deck human-factors guidance emphasize legibility, consistency, error resistance, and workload reduction.
  - https://www.faa.gov/regulations_policies/advisory_circulars/index.cfm/go/document.information/documentID/1042829
  - https://www.faa.gov/documentLibrary/media/Advisory_Circular/AC_120-76E_FAA_Web.pdf
  - https://www.faa.gov/sites/faa.gov/files/data_research/research/med_humanfacs/oamtechreports/0117.pdf
- Product pain-point source remains the repository research documentation:
  - `docs/research/competitor-pain-points.md`

## Design system

Halo now uses a pearl/ivory daylight base, deep navy/graphite text, muted gold brand accents, sky-cyan route/glow accents, and strict operational red/amber/green for safety state.

Core tokens:

- Pearl: `#fff9ec`
- Ivory: `#f8f1e3`
- Navy: `#0f2742`
- Graphite: `#1f2937`
- Gold: `#d6a84d`
- Cyan: `#38bdf8`
- Operational green/amber/red: `#059669`, `#d97706`, `#e11d48`

The shadcn/ui primitives were installed with Radix defaults and theme tokens were mapped in Tailwind/CSS variables.

Installed primitives:

- button
- card
- badge
- tabs
- sheet
- dialog
- input
- textarea
- select
- checkbox
- switch
- separator
- scroll-area
- skeleton
- alert
- tooltip
- dropdown-menu
- command
- progress

## Logo direction

Image generation was used as concept input for a “halo ring + route arrow” mark:

- Prompt: daylight luxury aviation app logo mark, halo ring and route arrow, pearl ivory background, deep navy route arrow, muted gold ring, sky cyan glow, no text, clean vector-like, premium cockpit planning feel.
- Generated bitmap reference path: `/Users/Selezmassozi/.codex/generated_images/019f78b3-5c3d-7e92-9c5a-ebeab3cc43b5/_image_id_.png`

The production app mark is a clean SVG implementation in code, not a rough bitmap dependency.

## Product shell changes

- Added a responsive `HaloAppShell`.
- The map now loads immediately as the full-screen workspace.
- Added a top mission bar with the app mark, current route status, and command-deck access.
- Added a mission dashboard overlay with quick route/search/sample/briefing actions.
- Added floating map controls for planning/inspect mode, airspace layer, emergency tools, and route focus.
- Phone layout uses full-screen map, top mission bar, bottom thumb navigation, and bottom-sheet panels.
- Tablet layout keeps map-first planning with a dashboard overlay and command deck access.
- Desktop layout uses a floating right command deck instead of the old dense fixed sidebar.

## Workflow changes

- Route creation is now the most visible opening action.
- Pilot Digest remains the decision surface at the top of Briefing.
- Flight Admin is now a first-class panel for optional NOTAM/FPL record keeping and official File2Fly handoff.
- Emergency is now a first-class panel for glide/forced-landing planning.
- Aircraft + W&B remains guided around POH/AFM setup and loading status.
- Weather remains station-card oriented with raw reports secondary.
- OpenAIP authentic sprites and aviation map layers remain active.

## Compatibility

- Removed UI panel id `research`.
- Persisted `research` panel state migrates to `briefing`.
- Legacy selected-feature panel state migrates to `route`.
- Clicked OpenAIP feature inspection still works through the selected-feature state, independent of panel navigation.

## Verification plan

Approved automated checks only:

- `pnpm test`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

Do not run:

- `pnpm test:e2e`
- Playwright/browser E2E

Manual browser/device E2E remains user-owned.

## Mobile regression fix

After the first production pass, mobile inspection showed two issues:

- The command deck could feel trapped because the sheet used a nested flex scroll container without a reliable mobile scroll surface.
- The opening phone view was too busy because the mission dashboard, map controls, bottom nav, and deck could compete for the same small viewport.

Fix:

- The mobile deck is now a full-screen sheet at phone widths.
- The sheet itself is the scroll surface with `overflow-y-auto`, `overscroll-contain`, `touch-action: pan-y`, `100dvh`, and iOS momentum scrolling.
- The sidebar keeps desktop internal scrolling, but the mobile sheet avoids nested scroll traps.
- The command deck is closed by default so the first view is map/dashboard/navigation, not an open panel.
- The mission dashboard hides dense metrics on phone widths and hides entirely while the deck is open.
- Floating map utility controls are hidden on phones; bottom navigation handles panel access.
