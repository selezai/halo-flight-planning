/**
 * OpenAIP Authentic Base Map Style
 * Based on the official OpenAIP map appearance at https://maps.openaip.net/
 */

// OpenAIP Color Palette (based on official map)
export const OPENAIP_COLORS = {
  // Base map colors
  BACKGROUND: '#f8f8f6',           // Light cream background
  WATER: '#b3d9ff',               // Light blue water
  LAND: '#f0f0e8',                // Very light beige land
  FOREST: '#e8f5e8',              // Very light green forests
  URBAN: '#f0f0f0',               // Light gray urban areas
  
  // Transportation
  HIGHWAY: '#ffd700',             // Yellow highways
  MAJOR_ROAD: '#ffffff',          // White major roads
  MINOR_ROAD: '#f5f5f5',          // Light gray minor roads
  RAILWAY: '#888888',             // Gray railways
  
  // Borders and boundaries
  COUNTRY_BORDER: '#999999',      // Gray country borders
  STATE_BORDER: '#cccccc',        // Light gray state borders
  
  // Text and labels
  COUNTRY_TEXT: '#333333',        // Dark gray country labels
  CITY_TEXT: '#666666',           // Medium gray city labels
  ROAD_TEXT: '#555555',           // Dark gray road labels
  
  // Aeronautical colors (authentic OpenAIP)
  AIRSPACE_CTR: '#ff6b6b',        // Red control zones
  AIRSPACE_TMA: '#4ecdc4',        // Teal terminal areas
  AIRSPACE_RESTRICTED: '#ff9f43', // Orange restricted areas
  AIRSPACE_PROHIBITED: '#ee5a52', // Red prohibited areas
  AIRSPACE_DANGER: '#ff6b6b',     // Red danger areas
  
  AIRPORT_MAJOR: '#2d3436',       // Dark gray major airports
  AIRPORT_MINOR: '#636e72',       // Medium gray minor airports
  HELIPORT: '#00b894',            // Green heliports
  
  NAVAID_VOR: '#0984e3',          // Blue VOR stations
  NAVAID_NDB: '#6c5ce7',          // Purple NDB stations
  NAVAID_TACAN: '#fd79a8',        // Pink TACAN stations
  
  WAYPOINT: '#a29bfe',            // Light purple waypoints
  OBSTACLE: '#e17055',            // Orange obstacles
};

/**
 * Creates an authentic OpenAIP base map style
 * Uses MapTiler light style as base with OpenAIP-specific modifications
 */
export const createOpenAipBaseStyle = () => {
  return {
    version: 8,
    name: 'OpenAIP Authentic Base',
    metadata: {
      'mapbox:autocomposite': false,
      'mapbox:type': 'template',
      'openaip:version': '1.0.0'
    },
    sources: {
      'maptiler-base': {
        type: 'raster',
        tiles: [
          // Use MapTiler basic style for better reliability
          `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${import.meta.env.VITE_MAPTILER_API_KEY || ''}`,
          // Fallback to OpenStreetMap if MapTiler fails
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© MapTiler © OpenStreetMap contributors'
      }
    },
    layers: [
      // Background layer with OpenAIP cream color
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': OPENAIP_COLORS.BACKGROUND
        }
      },
      // Base raster layer with reduced opacity for subtle terrain
      {
        id: 'base-raster',
        type: 'raster',
        source: 'maptiler-base',
        layout: {
          visibility: 'visible'
        },
        paint: {
          'raster-opacity': 0.4,
          'raster-brightness-min': 0.2,
          'raster-brightness-max': 0.8,
          'raster-contrast': -0.1,
          'raster-saturation': -0.3
        }
      }
    ],
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${import.meta.env.VITE_MAPTILER_API_KEY || ''}`
    // No sprite property to avoid conflicts with OpenAIP symbols
  };
};

/**
 * Applies OpenAIP-style base map styling to an existing map
 */
export const applyOpenAipBaseStyle = (map) => {
  console.log('🎨 Applying OpenAIP base style...');
  
  try {
    // Set map background to match OpenAIP
    map.setPaintProperty('background', 'background-color', OPENAIP_COLORS.BACKGROUND);
    
    // Adjust existing layers to match OpenAIP appearance
    const style = map.getStyle();
    
    style.layers.forEach(layer => {
      const layerId = layer.id;
      
      try {
        // Style water features
        if (layerId.includes('water') || layerId.includes('ocean') || layerId.includes('lake')) {
          if (layer.type === 'fill') {
            map.setPaintProperty(layerId, 'fill-color', OPENAIP_COLORS.WATER);
            map.setPaintProperty(layerId, 'fill-opacity', 0.6);
          }
        }
        
        // Style land features
        else if (layerId.includes('land') || layerId.includes('landcover')) {
          if (layer.type === 'fill') {
            map.setPaintProperty(layerId, 'fill-color', OPENAIP_COLORS.LAND);
            map.setPaintProperty(layerId, 'fill-opacity', 0.3);
          }
        }
        
        // Style forest/vegetation
        else if (layerId.includes('forest') || layerId.includes('wood') || layerId.includes('vegetation')) {
          if (layer.type === 'fill') {
            map.setPaintProperty(layerId, 'fill-color', OPENAIP_COLORS.FOREST);
            map.setPaintProperty(layerId, 'fill-opacity', 0.2);
          }
        }
        
        // Style urban areas
        else if (layerId.includes('urban') || layerId.includes('built') || layerId.includes('residential')) {
          if (layer.type === 'fill') {
            map.setPaintProperty(layerId, 'fill-color', OPENAIP_COLORS.URBAN);
            map.setPaintProperty(layerId, 'fill-opacity', 0.1);
          }
        }
        
        // Style roads with OpenAIP colors
        else if (layerId.includes('road') || layerId.includes('highway')) {
          if (layer.type === 'line') {
            if (layerId.includes('highway') || layerId.includes('motorway')) {
              map.setPaintProperty(layerId, 'line-color', OPENAIP_COLORS.HIGHWAY);
              map.setPaintProperty(layerId, 'line-width', 2);
            } else if (layerId.includes('primary') || layerId.includes('secondary')) {
              map.setPaintProperty(layerId, 'line-color', OPENAIP_COLORS.MAJOR_ROAD);
              map.setPaintProperty(layerId, 'line-width', 1);
            } else {
              map.setPaintProperty(layerId, 'line-color', OPENAIP_COLORS.MINOR_ROAD);
              map.setPaintProperty(layerId, 'line-width', 0.5);
            }
            map.setPaintProperty(layerId, 'line-opacity', 0.8);
          }
        }
        
        // Style railways
        else if (layerId.includes('railway') || layerId.includes('rail')) {
          if (layer.type === 'line') {
            map.setPaintProperty(layerId, 'line-color', OPENAIP_COLORS.RAILWAY);
            map.setPaintProperty(layerId, 'line-width', 1);
            map.setPaintProperty(layerId, 'line-opacity', 0.6);
          }
        }
        
        // Style borders
        else if (layerId.includes('boundary') || layerId.includes('border')) {
          if (layer.type === 'line') {
            if (layerId.includes('country')) {
              map.setPaintProperty(layerId, 'line-color', OPENAIP_COLORS.COUNTRY_BORDER);
              map.setPaintProperty(layerId, 'line-width', 1);
            } else {
              map.setPaintProperty(layerId, 'line-color', OPENAIP_COLORS.STATE_BORDER);
              map.setPaintProperty(layerId, 'line-width', 0.5);
            }
            map.setPaintProperty(layerId, 'line-opacity', 0.7);
          }
        }
        
        // Style text labels
        else if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
          if (layerId.includes('country')) {
            map.setPaintProperty(layerId, 'text-color', OPENAIP_COLORS.COUNTRY_TEXT);
            map.setPaintProperty(layerId, 'text-halo-color', '#ffffff');
            map.setPaintProperty(layerId, 'text-halo-width', 1);
          } else if (layerId.includes('city') || layerId.includes('place')) {
            map.setPaintProperty(layerId, 'text-color', OPENAIP_COLORS.CITY_TEXT);
            map.setPaintProperty(layerId, 'text-halo-color', '#ffffff');
            map.setPaintProperty(layerId, 'text-halo-width', 1);
          } else if (layerId.includes('road')) {
            map.setPaintProperty(layerId, 'text-color', OPENAIP_COLORS.ROAD_TEXT);
            map.setPaintProperty(layerId, 'text-halo-color', '#ffffff');
            map.setPaintProperty(layerId, 'text-halo-width', 1);
          }
        }
        
      } catch (err) {
        // Silently continue if layer doesn't support the property
      }
    });
    
    console.log('✅ OpenAIP base style applied successfully');
    
  } catch (error) {
    console.error('❌ Error applying OpenAIP base style:', error);
  }
};

/**
 * Font configuration for OpenAIP text rendering
 */
export const OPENAIP_FONTS = {
  REGULAR: ['Open Sans Regular', 'Arial Unicode MS Regular'],
  BOLD: ['Open Sans Bold', 'Arial Unicode MS Bold'],
  ITALIC: ['Open Sans Italic', 'Arial Unicode MS Regular'],
  CONDENSED: ['Open Sans Condensed Bold', 'Arial Unicode MS Bold']
};

/**
 * Text size configuration for different zoom levels
 */
export const OPENAIP_TEXT_SIZES = {
  COUNTRY: [
    'interpolate',
    ['linear'],
    ['zoom'],
    2, 14,
    6, 18,
    10, 22
  ],
  CITY_MAJOR: [
    'interpolate',
    ['linear'],
    ['zoom'],
    4, 12,
    8, 16,
    12, 20
  ],
  CITY_MINOR: [
    'interpolate',
    ['linear'],
    ['zoom'],
    6, 10,
    10, 14,
    14, 18
  ],
  AIRPORT: [
    'interpolate',
    ['linear'],
    ['zoom'],
    8, 10,
    12, 14,
    16, 18
  ],
  NAVAID: [
    'interpolate',
    ['linear'],
    ['zoom'],
    10, 9,
    14, 12,
    18, 16
  ]
};
