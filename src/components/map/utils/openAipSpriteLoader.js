/**
 * OpenAIP Authentic Sprite Loader
 * Loads authentic OpenAIP sprites with MapTiler base icons
 * Follows the implementation guide specifications for proper sprite handling
 */

// Proxy base URL for OpenAIP resources
const PROXY_BASE = 'http://localhost:3001';

// OpenAIP authentic sprite icons (630 total, 44 aviation-specific)
export const OPENAIP_SPRITE_ICONS = {
  // Aviation-specific icons
  'airport-15': 'Airport symbol',
  'heliport-15': 'Heliport symbol',
  'airfield-15': 'Airfield symbol',
  'gliding-15': 'Gliding site symbol',
  'ultralight-15': 'Ultralight field symbol',
  'balloon-15': 'Balloon launch site',
  'parachute-15': 'Parachute drop zone',
  'winch-15': 'Winch launch site',
  'obstacle-15': 'Obstacle symbol',
  'navaid-15': 'Navigation aid symbol',
  'vor-15': 'VOR station',
  'ndb-15': 'NDB station',
  'dme-15': 'DME station',
  'tacan-15': 'TACAN station',
  'waypoint-15': 'Waypoint symbol',
  'reporting-point-15': 'Reporting point',
  'hotspot-15': 'Thermal hotspot',
  // Base MapTiler icons
  'dot-11': 'Small dot marker',
  'circle-11': 'Circle marker',
  'triangle-11': 'Triangle marker',
  'square-11': 'Square marker',
  'star-11': 'Star marker',
  'cross-11': 'Cross marker'
};

/**
 * Load authentic OpenAIP sprites following implementation guide specifications
 * @param {maplibregl.Map} map - The MapLibre GL map instance
 * @returns {Promise<boolean>} - Success status
 */
export const loadOpenAipSprites = async (map) => {
  console.log('🎨 Loading authentic OpenAIP sprites...');
  
  try {
    // Load sprite metadata and image from proxy
    const spriteJsonUrl = `${PROXY_BASE}/api/sprites/basic-v2.json`;
    const spriteImageUrl = `${PROXY_BASE}/api/sprites/basic-v2.png`;
    
    console.log('📡 Fetching sprite metadata from:', spriteJsonUrl);
    
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
      image.onload = resolve;
      image.onerror = reject;
      image.src = spriteImageUrl;
    });
    
    // Extract individual icons using canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    for (const [iconName, iconData] of Object.entries(spriteData)) {
      const { x, y, width, height, pixelRatio = 1 } = iconData;
      
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      
      if (!map.hasImage(iconName)) {
        map.addImage(iconName, imageData, { pixelRatio });
      }
    }
    
    console.log('✅ OpenAIP sprites loaded successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to load OpenAIP sprites:', error);
    return false;
  }
};
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
