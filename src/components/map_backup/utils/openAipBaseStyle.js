/**
 * OpenAIP Authentic Base Map Style
 * Creates a clean, light beige/cream base map that matches OpenAIP's official appearance
 */

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;

// OpenAIP Base Colors - matching the official OpenAIP appearance
const OPENAIP_BASE_COLORS = {
  // Background colors
  BACKGROUND: '#f8f6f0',           // Light cream/beige background
  LAND: '#f8f6f0',                 // Same as background for clean look
  WATER: '#b8d4f0',                // Light blue for water bodies
  WATER_OUTLINE: '#8bb8e8',        // Slightly darker blue for water outlines
  
  // Terrain and elevation
  TERRAIN_LOW: '#f0f0e8',          // Very light beige for low elevation
  TERRAIN_MID: '#e8e8d8',          // Slightly darker for mid elevation
  TERRAIN_HIGH: '#d8d8c8',         // Darker beige for high elevation
  
  // Transportation
  ROAD_MAJOR: '#d0d0d0',           // Light gray for major roads
  ROAD_MINOR: '#e0e0e0',           // Very light gray for minor roads
  RAILWAY: '#c0c0c0',              // Medium gray for railways
  
  // Boundaries and administrative
  COUNTRY_BORDER: '#999999',       // Medium gray for country borders
  STATE_BORDER: '#bbbbbb',         // Light gray for state/province borders
  
  // Labels and text
  LABEL_TEXT: '#333333',           // Dark gray for text
  LABEL_HALO: '#ffffff',           // White halo for text readability
  
  // Urban areas
  URBAN_AREA: '#f0f0f0',           // Very light gray for urban areas
  BUILDING: '#e8e8e8',             // Light gray for buildings
};

/**
 * Creates an OpenAIP-style base map configuration
 * This provides a clean, minimal base that doesn't compete with aeronautical features
 */
export const createOpenAipBaseStyle = () => {
  return {
    version: 8,
    name: 'OpenAIP Base Style',
    metadata: {
      'maplibre:renderer': 'mbgl'
    },
    sources: {
      // Use OpenStreetMap as the base data source for geographic features
      'osm': {
        type: 'raster',
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      },
      // Add MapTiler for better quality if available
      ...(MAPTILER_KEY ? {
        'maptiler-base': {
          type: 'vector',
          url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${MAPTILER_KEY}`,
          attribution: '© MapTiler © OpenStreetMap contributors'
        }
      } : {})
    },
    sprite: MAPTILER_KEY ? `https://api.maptiler.com/maps/basic-v2/sprite?key=${MAPTILER_KEY}` : undefined,
    glyphs: MAPTILER_KEY ? `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}` : undefined,
    layers: [
      // Background layer - clean cream/beige
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': OPENAIP_BASE_COLORS.BACKGROUND
        }
      },
      
      // If MapTiler is available, use vector layers for better quality
      ...(MAPTILER_KEY ? [
        // Water bodies
        {
          id: 'water',
          type: 'fill',
          source: 'maptiler-base',
          'source-layer': 'water',
          paint: {
            'fill-color': OPENAIP_BASE_COLORS.WATER,
            'fill-outline-color': OPENAIP_BASE_COLORS.WATER_OUTLINE
          }
        },
        
        // Land areas
        {
          id: 'land',
          type: 'fill',
          source: 'maptiler-base',
          'source-layer': 'landcover',
          filter: ['==', 'class', 'land'],
          paint: {
            'fill-color': OPENAIP_BASE_COLORS.LAND
          }
        },
        
        // Major roads (minimal styling)
        {
          id: 'road-major',
          type: 'line',
          source: 'maptiler-base',
          'source-layer': 'transportation',
          filter: ['in', 'class', 'motorway', 'trunk', 'primary'],
          paint: {
            'line-color': OPENAIP_BASE_COLORS.ROAD_MAJOR,
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 0.5,
              10, 1,
              15, 2
            ],
            'line-opacity': 0.6
          }
        },
        
        // Country borders
        {
          id: 'country-border',
          type: 'line',
          source: 'maptiler-base',
          'source-layer': 'boundary',
          filter: ['==', 'admin_level', 2],
          paint: {
            'line-color': OPENAIP_BASE_COLORS.COUNTRY_BORDER,
            'line-width': 1,
            'line-opacity': 0.5
          }
        },
        
        // Place labels (minimal)
        {
          id: 'place-labels',
          type: 'symbol',
          source: 'maptiler-base',
          'source-layer': 'place',
          filter: ['in', 'class', 'country', 'state', 'city'],
          layout: {
            'text-field': '{name}',
            'text-font': ['Open Sans Regular'],
            'text-size': [
              'interpolate',
              ['linear'],
              ['zoom'],
              4, 10,
              8, 12,
              12, 14
            ],
            'text-transform': 'none'
          },
          paint: {
            'text-color': OPENAIP_BASE_COLORS.LABEL_TEXT,
            'text-halo-color': OPENAIP_BASE_COLORS.LABEL_HALO,
            'text-halo-width': 1,
            'text-opacity': 0.7
          }
        }
      ] : [
        // Fallback to OSM raster tiles if no MapTiler key
        {
          id: 'osm-raster',
          type: 'raster',
          source: 'osm',
          paint: {
            'raster-opacity': 0.3, // Make it very light to not compete with aeronautical features
            'raster-saturation': -0.8, // Desaturate to match OpenAIP's clean look
            'raster-brightness-min': 0.8,
            'raster-brightness-max': 1.2
          }
        }
      ])
    ]
  };
};

/**
 * Applies OpenAIP base styling to an existing map
 * This can be used to override the base layers while keeping aeronautical layers
 */
export const applyOpenAipBaseStyle = (map) => {
  console.log('🎨 Applying OpenAIP base style...');
  
  // Set background color
  if (map.getLayer('background')) {
    map.setPaintProperty('background', 'background-color', OPENAIP_BASE_COLORS.BACKGROUND);
  }
  
  // Style water bodies if they exist
  const waterLayers = ['water', 'waterway', 'ocean'];
  waterLayers.forEach(layerId => {
    if (map.getLayer(layerId)) {
      if (map.getLayer(layerId).type === 'fill') {
        map.setPaintProperty(layerId, 'fill-color', OPENAIP_BASE_COLORS.WATER);
        map.setPaintProperty(layerId, 'fill-opacity', 0.8);
      }
    }
  });
  
  // Minimize road visibility
  const roadLayers = ['road', 'highway', 'street', 'path'];
  roadLayers.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'line-opacity', 0.3);
      map.setPaintProperty(layerId, 'line-color', OPENAIP_BASE_COLORS.ROAD_MAJOR);
    }
  });
  
  // Minimize building visibility
  const buildingLayers = ['building', 'building-3d'];
  buildingLayers.forEach(layerId => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, 'fill-opacity', 0.1);
      map.setPaintProperty(layerId, 'fill-color', OPENAIP_BASE_COLORS.BUILDING);
    }
  });
  
  // Style text labels to match OpenAIP
  const textLayers = map.getStyle().layers.filter(layer => 
    layer.type === 'symbol' && layer.layout && layer.layout['text-field']
  );
  
  textLayers.forEach(layer => {
    const layerId = layer.id;
    if (!layerId.includes('openaip') && !layerId.includes('airport') && !layerId.includes('navaid')) {
      // Only style non-aeronautical text layers
      map.setPaintProperty(layerId, 'text-color', OPENAIP_BASE_COLORS.LABEL_TEXT);
      map.setPaintProperty(layerId, 'text-halo-color', OPENAIP_BASE_COLORS.LABEL_HALO);
      map.setPaintProperty(layerId, 'text-halo-width', 1);
      map.setPaintProperty(layerId, 'text-opacity', 0.6);
    }
  });
  
  console.log('✅ OpenAIP base style applied');
};
