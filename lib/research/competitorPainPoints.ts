import type { CompetitorPainPoint } from '@/types/planning';

export const COMPETITOR_PAIN_POINTS: CompetitorPainPoint[] = [
  {
    competitor: 'ForeFlight',
    painPoint: 'Pilots like the polish, but price increases and subscription tiers create value anxiety.',
    evidence: 'ForeFlight lists annual plans from Starter through higher tiers, and App Store reviews include price/value complaints.',
    haloResponse:
      'Halo keeps a useful browser-first planning workflow available without account lock-in: route math, aircraft fuel planning, weather checks, and printable briefing work locally.',
    sourceUrl: 'https://foreflight.com/pricing/',
  },
  {
    competitor: 'Garmin Pilot',
    painPoint: 'Some reviewers report stability problems in flight and freezes around weather/logbook workflows.',
    evidence: 'Recent App Store review snippets mention weather-tab freezes and missing logbook entries.',
    haloResponse:
      'Halo separates pure planning calculations from network data, persists the route locally, and degrades gracefully when live aviation map data is unavailable.',
    sourceUrl: 'https://apps.apple.com/us/app/garmin-pilot/id340917615?platform=ipad&see-all=reviews',
  },
  {
    competitor: 'FltPlan Go',
    painPoint: 'The free tool is valued, but pilots describe a dated, slow, and crash-prone interface.',
    evidence: 'App Store and pilot-forum reviews call out crashes, lag, and dated UI.',
    haloResponse:
      'Halo uses a compact route-first workspace with persistent sidebar panels, immediate fuel math, and no card-heavy marketing surface before the cockpit task.',
    sourceUrl: 'https://apps.apple.com/us/app/fltplan-go/id694832363?platform=ipad&see-all=reviews',
  },
  {
    competitor: 'SkyDemon',
    painPoint: 'VFR pilots value route hazard awareness, minimum safe altitude, weather, NOTAM, and profile-view clarity.',
    evidence: 'SkyDemon describes modelling each leg with aircraft performance, weather, fuel, enroute hazards, and weight and balance.',
    haloResponse:
      'Halo puts leg-by-leg distance, course, ETE, fuel, weather category, personal minimums, and NOTAM review status in one briefing surface.',
    sourceUrl: 'https://www.skydemon.aero/start/planning',
  },
  {
    competitor: 'NOTAM tools generally',
    painPoint: 'Raw NOTAMs are hard to interpret and pilots need route-relevant filtering, not a wall of text.',
    evidence: 'FAA NOTAM Search is positioned for flight planning familiarization, and industry coverage highlights route-of-flight query improvements.',
    haloResponse:
      'Halo does not fake a NOTAM feed; it makes NOTAM review an explicit briefing risk item and documents the live-feed integration needed before launch.',
    sourceUrl: 'https://notams.aim.faa.gov/notamSearch/',
  },
];
