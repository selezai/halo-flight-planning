# Sprite Files Location

This directory should contain the OpenAIP sprite files built from the mapstyles repository.

## Required Files

- `openaip.json` - Sprite metadata (standard resolution)
- `openaip.png` - Sprite image (standard resolution)
- `openaip@2x.json` - Sprite metadata (retina)
- `openaip@2x.png` - Sprite image (retina)

## How to Build

```bash
# Clone OpenAIP mapstyles repo
git clone https://github.com/openAIP/mapstyles.git
cd mapstyles

# Install dependencies
npm install

# Build sprites
npm run build:style:default

# Copy to this directory
cp dist/maps/styles/default/sprite.json ./openaip.json
cp dist/maps/styles/default/sprite.png ./openaip.png
cp dist/maps/styles/default/sprite@2x.json ./openaip@2x.json
cp dist/maps/styles/default/sprite@2x.png ./openaip@2x.png
```

Without these files, the map will show warnings about missing images and aviation icons won't display correctly.
