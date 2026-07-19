# OpenAIP Sprite Files

This directory contains the OpenAIP sprite files served to MapLibre through `/api/openaip/sprites/*`.

## Required Files

- `openaip.json` - Sprite metadata (standard resolution)
- `openaip.png` - Sprite image (standard resolution)
- `openaip@2x.json` - Sprite metadata (retina)
- `openaip@2x.png` - Sprite image (retina)

## How to Build

```bash
pnpm build:sprites
```

The build script clones OpenAIP's public map resource repository in temporary storage, runs `spreet`, copies the generated files here, and fails if any sprite output is empty.

## Source and License

The default sprite source is `openAIP/openaip-map-resources` because it matches the current OpenAIP map style, including newer obstacle, RC airfield, and hang-gliding symbols.

See `ATTRIBUTION.md` before using these assets in a commercial product. The archived `openAIP/mapstyles` repo can be selected with `./scripts/build-sprites.sh --force --source=legacy-mapstyles`, but it does not cover all current OpenAIP style symbols.
