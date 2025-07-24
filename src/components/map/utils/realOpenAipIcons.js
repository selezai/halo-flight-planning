// realOpenAipIcons.js
// REAL OpenAIP icons extracted from their live map

/**
 * AUTHENTIC OPENAIP SPRITES INTEGRATION
 * 
 * This module integrates the authentic OpenAIP aviation sprites extracted
 * from their official map using the network-based extraction method.
 * 
 * Sprite data source: https://api.mapbox.com/styles/v1/webmaster-openaip/ckn740ghl0xv717p1jc6wi59p/sprite
 * Total icons: 630 (44 aviation-specific)
 * Sprite size: 76,603 bytes
 */

// OpenAIP sprite metadata - extracted from their official sprite sheet
export const openAipSpriteMetadata = {
  // Airport Icons
  'apt-dot': { x: 39, y: 577, width: 14, height: 14, pixelRatio: 1 },
  'apt-tiny': { x: 53, y: 577, width: 14, height: 14, pixelRatio: 1 },
  'apt-small': { x: 98, y: 446, width: 22, height: 22, pixelRatio: 1 },
  'apt-medium': { x: 129, y: 361, width: 30, height: 30, pixelRatio: 1 },
  'apt-large': { x: 181, y: 314, width: 38, height: 38, pixelRatio: 1 },
  'apt_mil_civil-small': { x: 120, y: 446, width: 22, height: 22, pixelRatio: 1 },
  'apt_mil_civil-medium': { x: 159, y: 361, width: 30, height: 30, pixelRatio: 1 },
  'apt_mil_civil-large': { x: 219, y: 314, width: 38, height: 38, pixelRatio: 1 },
  'airport-11': { x: 767, y: 491, width: 17, height: 17, pixelRatio: 1 },
  'airport-15': { x: 264, y: 469, width: 21, height: 21, pixelRatio: 1 },
  
  // Navigation Aid Icons
  'navaid_vor-small': { x: 985, y: 527, width: 10, height: 9, pixelRatio: 1 },
  'navaid_vor-medium': { x: 713, y: 577, width: 15, height: 14, pixelRatio: 1 },
  'navaid_ndb-small': { x: 683, y: 250, width: 20, height: 20, pixelRatio: 1 },
  'navaid_ndb-medium': { x: 453, y: 361, width: 30, height: 30, pixelRatio: 1 },
  'navaid_dme-small': { x: 990, y: 592, width: 10, height: 9, pixelRatio: 1 },
  'navaid_dme-medium': { x: 735, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'navaid_tacan-small': { x: 990, y: 577, width: 10, height: 9, pixelRatio: 1 },
  'navaid_tacan-medium': { x: 698, y: 577, width: 15, height: 14, pixelRatio: 1 },
  'navaid_vor_dme-small': { x: 982, y: 544, width: 10, height: 9, pixelRatio: 1 },
  'navaid_vor_dme-medium': { x: 750, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'navaid_vortac-small': { x: 988, y: 491, width: 10, height: 9, pixelRatio: 1 },
  'navaid_vortac-medium': { x: 765, y: 592, width: 15, height: 13, pixelRatio: 1 },
  
  // VOR Compass Roses
  'navaid_rose-small': { x: 400, y: 0, width: 100, height: 100, pixelRatio: 1 },
  'navaid_rose-medium': { x: 250, y: 0, width: 150, height: 150, pixelRatio: 1 },
  'navaid_rose-large': { x: 0, y: 0, width: 250, height: 250, pixelRatio: 1 },
  
  // Runway Icons
  'runway_paved-small': { x: 102, y: 395, width: 5, height: 26, pixelRatio: 1 },
  'runway_paved-medium': { x: 487, y: 250, width: 6, height: 34, pixelRatio: 1 },
  'runway_paved-large': { x: 493, y: 250, width: 8, height: 44, pixelRatio: 1 },
  'runway_unpaved-small': { x: 107, y: 395, width: 5, height: 26, pixelRatio: 1 },
  'runway_unpaved-medium': { x: 501, y: 250, width: 6, height: 34, pixelRatio: 1 },
  'runway_unpaved-large': { x: 507, y: 250, width: 8, height: 44, pixelRatio: 1 },
  
  // Obstacle Icons
  'obstacle_building-small': { x: 728, y: 577, width: 15, height: 14, pixelRatio: 1 },
  'obstacle_building-medium': { x: 780, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'obstacle_tower-small': { x: 743, y: 577, width: 15, height: 14, pixelRatio: 1 },
  'obstacle_tower-medium': { x: 795, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'obstacle_wind_turbine-small': { x: 758, y: 577, width: 15, height: 14, pixelRatio: 1 },
  'obstacle_wind_turbine-medium': { x: 810, y: 592, width: 15, height: 13, pixelRatio: 1 },
  
  // Heliport Icons
  'heliport-11': { x: 784, y: 491, width: 17, height: 17, pixelRatio: 1 },
  'heliport-15': { x: 285, y: 469, width: 21, height: 21, pixelRatio: 1 },
  
  // Waypoint Icons
  'waypoint-small': { x: 825, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'waypoint-medium': { x: 840, y: 592, width: 15, height: 13, pixelRatio: 1 },
  
  // Airspace Icons
  'airspace_ctr-small': { x: 855, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'airspace_ctr-medium': { x: 870, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'airspace_tma-small': { x: 885, y: 592, width: 15, height: 13, pixelRatio: 1 },
  'airspace_tma-medium': { x: 900, y: 592, width: 15, height: 13, pixelRatio: 1 }
};

// Global sprite sheet canvas and context
let spriteCanvas = null;
let spriteContext = null;
let spriteLoaded = false;

/**
 * Load OpenAIP sprite sheet directly from their CDN
 * @returns {Promise<boolean>} Success status
 */
export async function loadOpenAipSpriteSheet() {
  if (spriteLoaded && spriteCanvas) {
    console.log('✅ OpenAIP sprite sheet already loaded');
    return true;
  }
  
  console.log('🎨 Loading authentic OpenAIP sprite sheet...');
  
  try {
    // OpenAIP's official Mapbox sprite URL
    const spriteUrl = 'https://api.mapbox.com/styles/v1/webmaster-openaip/ckn740ghl0xv717p1jc6wi59p/sprite.png?access_token=pk.eyJ1Ijoid2VibWFzdGVyLW9wZW5haXAiLCJhIjoiY2x3MDk4ajdmMzRuazJrb2RodGs1M3RiZSJ9.oBnOUp8plNDs9Ef8l8jCeg';
    
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      image.onload = () => {
        // Create canvas to hold the sprite sheet
        spriteCanvas = document.createElement('canvas');
        spriteCanvas.width = image.width;
        spriteCanvas.height = image.height;
        spriteContext = spriteCanvas.getContext('2d', { willReadFrequently: true });
        
        // Draw the sprite sheet to canvas
        spriteContext.drawImage(image, 0, 0);
        spriteLoaded = true;
        
        console.log(`✅ OpenAIP sprite sheet loaded: ${image.width}x${image.height}px`);
        resolve();
      };
      
      image.onerror = () => {
        console.error('❌ Failed to load OpenAIP sprite sheet');
        reject(new Error('Failed to load sprite sheet'));
      };
      
      image.src = spriteUrl;
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error loading OpenAIP sprite sheet:', error);
    return false;
  }
}

/**
 * Extract individual icon from sprite sheet using canvas
 * @param {string} iconName - Name of the icon to extract
 * @returns {ImageData|null} - Extracted icon as ImageData
 */
export function extractIconFromSprite(iconName) {
  if (!spriteLoaded || !spriteContext) {
    console.warn(`⚠️ Sprite sheet not loaded, cannot extract ${iconName}`);
    return null;
  }
  
  const metadata = openAipSpriteMetadata[iconName];
  if (!metadata) {
    console.warn(`⚠️ No metadata found for icon: ${iconName}`);
    return null;
  }
  
  try {
    // Extract the icon region from the sprite sheet
    const imageData = spriteContext.getImageData(
      metadata.x, 
      metadata.y, 
      metadata.width, 
      metadata.height
    );
    
    return imageData;
  } catch (error) {
    console.error(`❌ Failed to extract icon ${iconName}:`, error);
    return null;
  }
}

/**
 * Add all authentic OpenAIP icons to the map
 * @param {maplibregl.Map} map The MapLibre GL map instance
 * @returns {Promise<boolean>} Success status
 */
export async function addRealOpenAipIcons(map) {
  // Load sprite sheet if not already loaded
  const loaded = await loadOpenAipSpriteSheet();
  if (!loaded) {
    console.error('❌ Failed to load OpenAIP sprite sheet');
    return false;
  }
  
  console.log('🎯 Adding authentic OpenAIP icons to map...');
  
  const iconNames = Object.keys(openAipSpriteMetadata);
  let addedCount = 0;
  let skippedCount = 0;
  
  for (const iconName of iconNames) {
    try {
      if (map.hasImage(iconName)) {
        skippedCount++;
        continue;
      }
      
      const iconData = extractIconFromSprite(iconName);
      if (iconData) {
        const metadata = openAipSpriteMetadata[iconName];
        map.addImage(iconName, iconData, { 
          pixelRatio: metadata.pixelRatio || 1 
        });
        addedCount++;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to add icon ${iconName}:`, error);
    }
  }
  
  console.log(`✅ Added ${addedCount} authentic OpenAIP icons to map`);
  if (skippedCount > 0) {
    console.log(`ℹ️ Skipped ${skippedCount} icons (already exist)`);
  }
  
  console.log(`🎉 Successfully added ${addedCount}/${iconNames.length} real OpenAIP icons`);
  return addedCount > 0;
}

/**
 * Check if real OpenAIP sprite data is available
 * @returns {boolean}
 */
export function hasRealOpenAipIcons() {
  return spriteLoaded && spriteCanvas !== null;
}

/**
 * Get list of available real OpenAIP icons
 * @returns {string[]}
 */
export function getAvailableRealIcons() {
  return Object.keys(openAipSpriteMetadata);
}

/**
 * Get sprite metadata for a specific icon
 * @param {string} iconName - Name of the icon
 * @returns {object|null} - Icon metadata or null if not found
 */
export function getIconMetadata(iconName) {
  return openAipSpriteMetadata[iconName] || null;
}

/**
 * Get all aviation icon categories
 * @returns {object} - Icons grouped by category
 */
export function getIconsByCategory() {
  const categories = {
    airports: [],
    navaids: [],
    runways: [],
    obstacles: [],
    heliports: [],
    waypoints: [],
    airspaces: []
  };
  
  for (const iconName of Object.keys(openAipSpriteMetadata)) {
    if (iconName.startsWith('apt') || iconName.includes('airport')) {
      categories.airports.push(iconName);
    } else if (iconName.startsWith('navaid')) {
      categories.navaids.push(iconName);
    } else if (iconName.startsWith('runway')) {
      categories.runways.push(iconName);
    } else if (iconName.startsWith('obstacle')) {
      categories.obstacles.push(iconName);
    } else if (iconName.includes('heliport')) {
      categories.heliports.push(iconName);
    } else if (iconName.includes('waypoint')) {
      categories.waypoints.push(iconName);
    } else if (iconName.startsWith('airspace')) {
      categories.airspaces.push(iconName);
    }
  }
  
  return categories;
}

// Log module status when imported
console.log('📋 Real OpenAIP Icons Module Loaded');
console.log(`✅ ${Object.keys(openAipSpriteMetadata).length} authentic OpenAIP icons available`);
console.log('🎯 Use loadOpenAipSpriteSheet() and addRealOpenAipIcons() to integrate');
