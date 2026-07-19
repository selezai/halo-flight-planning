# Competitor Pain Points and Halo Responses

Research date: 2026-07-19

## Summary

Halo should not try to out-feature mature EFBs in one release. The better product position is a clean browser-first planner that keeps the core pilot workflow fast: build a route, choose an aircraft, understand fuel and weather risk, produce a briefing, and keep working even when live map data is degraded.

## Findings

| Competitor / source | Observed pain point | Halo response |
| --- | --- | --- |
| ForeFlight pricing: https://foreflight.com/pricing/ | Mature EFB features are split across annual subscription tiers, creating cost/value pressure for private and student pilots. | Halo keeps core planning, fuel, weather categories, and briefing local-first and usable without account lock-in. |
| ForeFlight App Store reviews: https://apps.apple.com/us/app/foreflight-mobile-efb/id333252638?platform=ipad&see-all=reviews | Some reviews praise polish while others object to renewal cost. | Halo avoids making basic planning dependent on premium-only features. |
| Garmin Pilot App Store reviews: https://apps.apple.com/us/app/garmin-pilot/id340917615?platform=ipad&see-all=reviews | Review snippets report freezes, weather-tab instability, and missing logbook entries. | Halo separates calculations from network calls and persists the route locally so planning state survives failed live data. |
| FltPlan Go App Store reviews: https://apps.apple.com/us/app/fltplan-go/id694832363?platform=ipad&see-all=reviews | Users mention useful features but also crashes around breadcrumbs, split view, and plates. | Halo keeps the first release route-first and avoids nested or heavy UI surfaces. |
| FltPlan Go pilot forum discussion: https://www.pilotsofamerica.com/community/threads/fltplan-go.147386/ | Pilot reports describe slow response, battery drain, and dated UX. | Halo uses a compact sidebar plus map workspace with small, testable local state instead of a sprawling multi-window interface. |
| SkyDemon planning page: https://www.skydemon.aero/start/planning | Pilots value leg modelling, minimum safe altitudes, headings, fuel, weather, hazards, and weight-and-balance awareness. | Halo now calculates per-leg distance/course/ETE/fuel, route fuel totals, personal minimum warnings, and a briefing risk summary. |
| FAA Aviation Weather Data API: https://aviationweather.gov/data/api/ | Machine-readable aviation weather is available, but apps must normalize it into pilot decisions. | Halo proxies METAR/TAF requests and displays VFR/MVFR/IFR/LIFR categories beside raw reports. |
| FAA Personal Minimums: https://www.faa.gov/newsroom/safety-briefing/personal-minimums-worksheet | The FAA encourages pilots to choose limits above legal minimums and use them before the final go/no-go decision. | Halo includes configurable personal minimums and flags weather below those limits in the weather and briefing panels. |
| FAA NOTAM Search: https://notams.aim.faa.gov/notamSearch/ | NOTAMs are essential but require route-relevant search and careful interpretation. | Halo explicitly marks NOTAM review as a briefing risk item instead of pretending to provide validated live NOTAM coverage. |

## Features Incorporated

- Browser-first planning works before account creation.
- Route, aircraft, weather, fuel, and briefing live in one workspace.
- Route state persists locally.
- Fuel status is visible continuously in the map status bar.
- Weather is decoded into operational categories while still showing raw METAR/TAF text.
- Personal minimums are editable and used for warnings.
- NOTAM review is explicit and cannot be accidentally hidden.
- Live map credentials are server-only, and missing credentials produce a degraded planning map instead of a broken app.

## Deferred Requirements

- Live NOTAM rendering and filtering require a vetted data feed.
- Supabase sync requires live schema, RLS policies, and smoke tests before any production database migration.
- Weight-and-balance needs aircraft-specific arms/envelopes; generic inputs would be misleading for operational use.
