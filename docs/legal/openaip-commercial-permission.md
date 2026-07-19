# OpenAIP Commercial Readiness Checklist

Halo currently uses authentic OpenAIP sprite assets generated from `openAIP/openaip-map-resources`.

## Current license state

- Source: https://github.com/openAIP/openaip-map-resources
- OpenAIP project: https://www.openaip.net
- Published resource license: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
- License text: https://creativecommons.org/licenses/by-nc-sa/4.0/

## Launch rule

Do not launch Halo as a paid, commercial, or revenue-generating product with these sprites unless one of these is complete:

1. Written commercial permission or a commercial license is obtained from OpenAIP.
2. The sprites are replaced with an icon set that Halo owns or has commercial rights to use.

## Permission checklist

- [ ] Identify exact assets used: `public/sprites/openaip.json`, `public/sprites/openaip.png`, `public/sprites/openaip@2x.json`, `public/sprites/openaip@2x.png`.
- [ ] Send OpenAIP a written permission request covering commercial web-app use, screenshots, marketing pages, and paid subscriptions.
- [ ] Store the written approval or license agreement with project legal records.
- [ ] Confirm whether attribution text must appear in-app, in docs, or both.
- [ ] Confirm whether derivative generated sprites may be modified, cached, redistributed through Vercel, or bundled in mobile/offline builds.
- [ ] If permission is not granted, replace the sprites before commercial launch.

## Current in-app/doc attribution

Halo keeps source attribution in `public/sprites/ATTRIBUTION.md`, `public/sprites/README.md`, setup docs, and release notes. The map data and sprite use remain OpenAIP-attributed; Halo owns the flight-planning workflow, calculations, UI state, and briefing logic.
