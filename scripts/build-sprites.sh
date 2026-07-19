#!/bin/bash

# Halo Flight Planning - Sprite Build Script
# This script automates the process of building OpenAIP sprites

set -e

echo "🚀 Halo Flight Planning - Sprite Builder"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SPRITES_DIR="$PROJECT_ROOT/public/sprites"
TEMP_DIR="/tmp/openaip-mapstyles-build"

echo "📁 Project root: $PROJECT_ROOT"
echo "📁 Sprites directory: $SPRITES_DIR"
echo ""

# Check if sprites already exist
if [ -f "$SPRITES_DIR/openaip.json" ] && [ -f "$SPRITES_DIR/openaip.png" ]; then
    echo -e "${YELLOW}⚠️  Sprites already exist!${NC}"
    echo ""
    read -p "Do you want to rebuild them? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping sprite build."
        exit 0
    fi
fi

# Create temp directory
echo "📦 Creating temporary directory..."
mkdir -p "$TEMP_DIR"
cd "$TEMP_DIR"

# Clone or update mapstyles repo
if [ -d "mapstyles" ]; then
    echo "📥 Updating existing mapstyles repository..."
    cd mapstyles
    git pull
else
    echo "📥 Cloning OpenAIP mapstyles repository..."
    git clone https://github.com/openAIP/mapstyles.git
    cd mapstyles
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building sprites..."
npm run build:style:default

echo ""
echo "📋 Copying sprite files to project..."

# Check if build was successful
if [ ! -f "dist/maps/styles/default/sprite.json" ]; then
    echo -e "${RED}❌ Build failed! Sprite files not found.${NC}"
    exit 1
fi

# Copy files
cp dist/maps/styles/default/sprite.json "$SPRITES_DIR/openaip.json"
cp dist/maps/styles/default/sprite.png "$SPRITES_DIR/openaip.png"
cp dist/maps/styles/default/sprite@2x.json "$SPRITES_DIR/openaip@2x.json"
cp dist/maps/styles/default/sprite@2x.png "$SPRITES_DIR/openaip@2x.png"

echo ""
echo "✅ Verifying sprite files..."
ls -lh "$SPRITES_DIR"

echo ""
echo -e "${GREEN}✅ Sprites built successfully!${NC}"
echo ""
echo "Sprite files:"
echo "  - openaip.json ($(du -h "$SPRITES_DIR/openaip.json" | cut -f1))"
echo "  - openaip.png ($(du -h "$SPRITES_DIR/openaip.png" | cut -f1))"
echo "  - openaip@2x.json ($(du -h "$SPRITES_DIR/openaip@2x.json" | cut -f1))"
echo "  - openaip@2x.png ($(du -h "$SPRITES_DIR/openaip@2x.png" | cut -f1))"
echo ""
echo "🎉 You can now run the development server!"
echo "   cd $PROJECT_ROOT && pnpm dev"
echo ""

# Optional: Clean up temp directory
read -p "Clean up temporary files? (Y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🧹 Cleaning up..."
    rm -rf "$TEMP_DIR"
    echo "✅ Done!"
fi
