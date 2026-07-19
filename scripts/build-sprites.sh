#!/usr/bin/env bash

# Halo Flight Planning - OpenAIP Sprite Builder
#
# Generates Mapbox/MapLibre sprite sheets from OpenAIP's public SVG resources.
# The previous OpenAIP mapstyles build uses Node 8-era mapnik tooling; this
# script uses spreet, a current MapLibre-compatible sprite generator.

set -euo pipefail

SOURCE="map-resources"
FORCE=false
KEEP_TEMP=false
TEMP_DIR="${TMPDIR:-/tmp}/halo-openaip-sprite-build"
SPREET_VERSION="v0.13.1"

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE=true
      ;;
    --keep-temp)
      KEEP_TEMP=true
      ;;
    --source=map-resources)
      SOURCE="map-resources"
      ;;
    --source=legacy-mapstyles)
      SOURCE="legacy-mapstyles"
      ;;
    -h|--help)
      cat <<'HELP'
Usage: ./scripts/build-sprites.sh [--force] [--keep-temp] [--source=map-resources|legacy-mapstyles]

Options:
  --force                   Overwrite existing sprite files.
  --keep-temp               Keep the cloned OpenAIP repository in /tmp.
  --source=map-resources    Use current OpenAIP SVG resources. Default.
  --source=legacy-mapstyles Use archived MIT mapstyles SVGs. Less complete for current OpenAIP style.
HELP
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SPRITES_DIR="$PROJECT_ROOT/public/sprites"
OUTPUT_DIR="$TEMP_DIR/output"
BIN_DIR="$TEMP_DIR/bin"

if [[ "$FORCE" != true ]]; then
  for file in openaip.json openaip.png openaip@2x.json openaip@2x.png; do
    if [[ -s "$SPRITES_DIR/$file" ]]; then
      echo "Sprite file already exists: $SPRITES_DIR/$file"
      echo "Re-run with --force to rebuild."
      exit 0
    fi
  done
fi

rm -rf "$TEMP_DIR"
mkdir -p "$OUTPUT_DIR" "$SPRITES_DIR" "$BIN_DIR"

if [[ "$SOURCE" == "map-resources" ]]; then
  REPO_URL="https://github.com/openAIP/openaip-map-resources.git"
  REPO_DIR="$TEMP_DIR/openaip-map-resources"
  SVG_DIR="$REPO_DIR/resources/svg"
else
  REPO_URL="https://github.com/openAIP/mapstyles.git"
  REPO_DIR="$TEMP_DIR/mapstyles"
  SVG_DIR="$REPO_DIR/src/default/sprites-src"
fi

echo "Building OpenAIP sprites"
echo "Project root: $PROJECT_ROOT"
echo "Source: $REPO_URL"

git clone --depth 1 "$REPO_URL" "$REPO_DIR"

if [[ ! -d "$SVG_DIR" ]]; then
  echo "SVG source directory not found: $SVG_DIR" >&2
  exit 1
fi

case "$(uname -s)-$(uname -m)" in
  Darwin-x86_64)
    SPREET_ASSET="spreet-x86_64-apple-darwin.tar.gz"
    ;;
  Darwin-arm64)
    SPREET_ASSET="spreet-aarch64-apple-darwin.tar.gz"
    ;;
  Linux-x86_64)
    SPREET_ASSET="spreet-x86_64-unknown-linux-musl.tar.gz"
    ;;
  Linux-aarch64|Linux-arm64)
    SPREET_ASSET="spreet-aarch64-unknown-linux-musl.tar.gz"
    ;;
  *)
    echo "Unsupported platform for automatic spreet download: $(uname -s)-$(uname -m)" >&2
    exit 1
    ;;
esac

curl -fsSL \
  "https://github.com/flother/spreet/releases/download/${SPREET_VERSION}/${SPREET_ASSET}" \
  -o "$TEMP_DIR/spreet.tar.gz"
LC_ALL=C LANG=C tar -xzf "$TEMP_DIR/spreet.tar.gz" -C "$BIN_DIR"

"$BIN_DIR/spreet" --unique --minify-index-file "$SVG_DIR" "$OUTPUT_DIR/openaip"
"$BIN_DIR/spreet" --unique --retina --minify-index-file "$SVG_DIR" "$OUTPUT_DIR/openaip@2x"

cp "$OUTPUT_DIR/openaip.json" "$SPRITES_DIR/openaip.json"
cp "$OUTPUT_DIR/openaip.png" "$SPRITES_DIR/openaip.png"
cp "$OUTPUT_DIR/openaip@2x.json" "$SPRITES_DIR/openaip@2x.json"
cp "$OUTPUT_DIR/openaip@2x.png" "$SPRITES_DIR/openaip@2x.png"

node - "$SPRITES_DIR" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const spritesDir = process.argv[2];
const files = ['openaip.json', 'openaip.png', 'openaip@2x.json', 'openaip@2x.png'];

for (const file of files) {
  const filePath = path.join(spritesDir, file);
  const size = fs.statSync(filePath).size;
  if (size <= 3) {
    throw new Error(`${file} is empty or still a placeholder`);
  }
  console.log(`${file}: ${size} bytes`);
}

const icons = Object.keys(
  JSON.parse(fs.readFileSync(path.join(spritesDir, 'openaip.json'), 'utf8'))
);

if (icons.length < 100) {
  throw new Error(`Expected at least 100 OpenAIP sprite entries, found ${icons.length}`);
}

console.log(`OpenAIP sprite entries: ${icons.length}`);
NODE

if [[ "$KEEP_TEMP" != true ]]; then
  rm -rf "$TEMP_DIR"
fi

echo "OpenAIP sprites generated in $SPRITES_DIR"
