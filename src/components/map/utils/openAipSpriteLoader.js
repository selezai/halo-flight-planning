/**
 * MapTiler Sprite Loader - Loads MapTiler sprites used by OpenAIP
 * OpenAIP uses MapTiler's sprite system, not custom sprites
 * This loads the actual sprites that OpenAIP layers reference
 */

// MapTiler icon naming conventions (used by OpenAIP)
export const MAPTILER_ICON_NAMES = {
  // Basic icons available in MapTiler basic-v2 sprite
  'airport-15': 'Airport symbol',
  'heliport-15': 'Heliport symbol',
  'dot-11': 'Small dot marker',
  'circle-11': 'Circle marker',
  'triangle-11': 'Triangle marker',
  'square-11': 'Square marker',
  'star-11': 'Star marker',
  'cross-11': 'Cross marker'
};

/**
 * Load MapTiler sprites used by OpenAIP from the proxy server
 * @param {maplibregl.Map} map - The MapLibre GL map instance
 * @returns {Promise<boolean>} - Success status
 */
export const loadOpenAipSprites = async (map) => {
  console.log('🎨 Loading MapTiler sprites (used by OpenAIP)...');
  
  try {
    // Load MapTiler sprite JSON and PNG through proxy
    const spriteJsonUrl = 'http://localhost:3001/api/sprites/basic-v2.json';
    const spriteImageUrl = 'http://localhost:3001/api/sprites/basic-v2.png';
    
    console.log('📡 Fetching sprite metadata from:', spriteJsonUrl);
    
    // Fetch sprite metadata
    const response = await fetch(spriteJsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sprite metadata: ${response.status} ${response.statusText}`);
    }
    
    const spriteData = await response.json();
    console.log('✅ Sprite metadata loaded:', Object.keys(spriteData).length, 'icons');
    
    // Load sprite image
    console.log('🖼️ Loading sprite image from:', spriteImageUrl);
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      image.onload = () => {
        console.log('✅ Sprite image loaded successfully');
        resolve();
      };
      image.onerror = (error) => {
        console.error('❌ Failed to load sprite image:', error);
        reject(new Error('Failed to load sprite image'));
      };
      image.src = spriteImageUrl;
    });
    
    // Create canvas to extract individual icons
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let iconsAdded = 0;
    
    // Add each icon from the sprite sheet to the map
    for (const [iconName, iconData] of Object.entries(spriteData)) {
      try {
        const { x, y, width, height, pixelRatio = 1 } = iconData;
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Clear canvas with transparent background
        ctx.clearRect(0, 0, width, height);
        
        // Draw the specific icon from sprite sheet
        ctx.drawImage(
          image,
          x, y, width, height,  // Source rectangle
          0, 0, width, height   // Destination rectangle
        );
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        
        // Add to map if not already present
        if (!map.hasImage(iconName)) {
          map.addImage(iconName, imageData, { pixelRatio });
          iconsAdded++;
          console.log(`✅ Added icon: ${iconName} (${width}x${height})`);
        } else {
          console.log(`⚠️ Icon already exists: ${iconName}`);
        }
      } catch (iconError) {
        console.error(`❌ Failed to add icon ${iconName}:`, iconError);
      }
    }
    
    console.log(`🎯 MapTiler sprites loaded successfully: ${iconsAdded} icons added`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to load MapTiler sprites:', error);
    
    // Fallback: create basic icons if sprites fail to load
    console.log('🔧 Creating fallback icons for OpenAIP...');
    console.log('⚠️ MapTiler sprite loading failed - no fallback icons created (using authentic OpenAIP sprites only)');
    return false;
  }
};

// Note: Removed createFallbackIcons function - using authentic OpenAIP sprites only

/**
 * Alternative method: Use OpenAIP's public sprite CDN directly
 * Note: This might have CORS issues, which is why proxying is preferred
 * @param {Object} style - MapLibre GL style object
 * @returns {Object} - Updated style with CDN sprite URL
 */
export const useOpenAipCdnSprites = (style) => {
  console.log('🌐 Using OpenAIP CDN sprites directly (may have CORS issues)');
  style.sprite = 'https://cdn.openaip.net/sprites/openaip-default';
  return style;
};
