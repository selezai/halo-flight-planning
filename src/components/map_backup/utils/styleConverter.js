/**
 * Converts OpenAIP's Mapbox GL style to MapLibre GL compatible format
 * with filtering for essential aeronautical layers only and authentic OpenAIP styling
 */

// OpenAIP Official Color Palette
const OPENAIP_COLORS = {
  // Airspace colors
  CTR_FILL: 'rgba(255, 0, 0, 0.08)',
  CTR_STROKE: '#ff0000',
  TMA_FILL: 'rgba(58, 112, 184, 0.08)',
  TMA_STROKE: '#3a70b8',
  MOA_FILL: 'rgba(142, 68, 173, 0.08)',
  MOA_STROKE: '#8e44ad',
  RESTRICTED_FILL: 'rgba(204, 0, 0, 0.12)',
  RESTRICTED_STROKE: '#cc0000',
  DANGER_FILL: 'rgba(255, 0, 0, 0.15)',
  DANGER_STROKE: '#ff0000',
  PROHIBITED_FILL: 'rgba(255, 0, 0, 0.18)',
  PROHIBITED_STROKE: '#ff0000',
  
  // Feature colors
  AIRPORT_PRIMARY: '#3a70b8',
  AIRPORT_SECONDARY: '#5a8bc4',
  HELIPORT: '#27ae60',
  GLIDER_SITE: '#f39c12',
  VOR_NAVAID: '#8e44ad',
  NDB_NAVAID: '#d68910',
  WAYPOINT: '#27ae60',
  OBSTACLE_HIGH: '#e74c3c',
  OBSTACLE_MEDIUM: '#f39c12',
  OBSTACLE_LOW: '#f1c40f',
  
  // Common colors
  WHITE: '#ffffff',
  BLACK: '#000000',
  TRANSPARENT: 'rgba(0,0,0,0)',
  
  // Default airspace colors
  AIRSPACE_DEFAULT: 'rgba(100, 100, 100, 0.05)',
  AIRSPACE_OUTLINE: '#666666'
};

// Helper functions to determine feature types
const getAirspaceType = (layerId, sourceLayer) => {
  const id = layerId.toLowerCase();
  if (id.includes('ctr') || id.includes('control')) return 'CTR';
  if (id.includes('tma') || id.includes('terminal')) return 'TMA';
  if (id.includes('moa') || id.includes('military')) return 'MOA';
  if (id.includes('restricted')) return 'restricted';
  if (id.includes('danger')) return 'danger';
  if (id.includes('prohibited')) return 'prohibited';
  return 'generic';
};

const getAirportType = (layerId, sourceLayer) => {
  const id = layerId.toLowerCase();
  if (id.includes('major') || id.includes('international') || id.includes('intl')) return 'major';
  if (id.includes('heliport') || id.includes('heli')) return 'heliport';
  if (id.includes('glider') || id.includes('gliding')) return 'glider';
  if (id.includes('regional') || id.includes('domestic')) return 'regional';
  return 'default';
};

const getNavaidType = (layerId, sourceLayer) => {
  const id = layerId.toLowerCase();
  if (id.includes('vor')) return 'VOR';
  if (id.includes('ndb')) return 'NDB';
  if (id.includes('dme')) return 'DME';
  return 'generic';
};

const getObstacleHeight = (layerId, sourceLayer) => {
  const id = layerId.toLowerCase();
  if (id.includes('high') || id.includes('tall')) return 'high';
  if (id.includes('medium') || id.includes('mid')) return 'medium';
  return 'low';
};

/**
 * Enhanced aeronautical styling function
 * Applies authentic OpenAIP colors and styling to map layers
 * This function now works in conjunction with the specialized styling modules
 */
function enhanceAeronauticalStyling(layer) {
  if (!layer) {
    return layer;
  }
  
  // Initialize paint and layout if missing
  if (!layer.paint) layer.paint = {};
  if (!layer.layout) layer.layout = {};
  
  const layerId = layer.id || '';
  const sourceLayer = layer['source-layer'] || '';
  const layerType = layer.type;
  
  // Skip layers that will be handled by specialized styling modules
  if (layerId.includes('airport') || layerId.includes('navaid') || layerId.includes('airspace')) {
    console.log(` Skipping ${layerId} - will be handled by specialized styling`);
    return layer;
  }
  
  // Only apply styling to appropriate layer types to prevent property mismatch errors
  
  // Airspace fill styling with authentic OpenAIP colors
  if (layerId.includes('airspace') && (layerType === 'fill') && 
      (layerId.includes('fill') || layerId.includes('offset') || layerId.includes('clicktarget'))) {
    const airspaceType = getAirspaceType(layerId, sourceLayer);
    
    switch (airspaceType) {
      case 'CTR':
      case 'ctr':
        layer.paint['fill-color'] = OPENAIP_COLORS.CTR_FILL;
        layer.paint['fill-outline-color'] = OPENAIP_COLORS.CTR_STROKE;
        break;
        
      case 'TMA':
      case 'tma':
      case 'cta':
        layer.paint['fill-color'] = OPENAIP_COLORS.TMA_FILL;
        layer.paint['fill-outline-color'] = OPENAIP_COLORS.TMA_STROKE;
        break;
        
      case 'MOA':
      case 'moa':
        layer.paint['fill-color'] = OPENAIP_COLORS.MOA_FILL;
        layer.paint['fill-outline-color'] = OPENAIP_COLORS.MOA_STROKE;
        break;
        
      case 'RESTRICTED':
      case 'restricted':
      case 'rdp':
        layer.paint['fill-color'] = OPENAIP_COLORS.RESTRICTED_FILL;
        layer.paint['fill-outline-color'] = OPENAIP_COLORS.RESTRICTED_STROKE;
        break;
        
      case 'DANGER':
      case 'danger':
      case 'cd':
        layer.paint['fill-color'] = OPENAIP_COLORS.DANGER_FILL;
        layer.paint['fill-outline-color'] = OPENAIP_COLORS.DANGER_STROKE;
        break;
        
      case 'PROHIBITED':
      case 'prohibited':
        layer.paint['fill-color'] = OPENAIP_COLORS.PROHIBITED_FILL;
        layer.paint['fill-outline-color'] = OPENAIP_COLORS.PROHIBITED_STROKE;
        break;
        
      default:
        // Default airspace styling
        layer.paint['fill-color'] = 'rgba(100, 100, 100, 0.05)';
        layer.paint['fill-outline-color'] = '#666666';
    }
    
    // Common airspace properties
    layer.paint['fill-opacity'] = 0.15;
  }
  
  // Airspace borders with authentic OpenAIP line styling
  if (layerId.includes('airspace') && layerType === 'line' && layerId.includes('border')) {
    const airspaceType = getAirspaceType(layerId, sourceLayer);
    
    switch (airspaceType) {
      case 'CTR':
      case 'ctr':
        layer.paint['line-color'] = OPENAIP_COLORS.CTR_STROKE;
        layer.paint['line-width'] = 2;
        break;
        
      case 'TMA':
      case 'tma':
      case 'cta':
        layer.paint['line-color'] = OPENAIP_COLORS.TMA_STROKE;
        layer.paint['line-width'] = 2;
        break;
        
      case 'MOA':
      case 'moa':
        layer.paint['line-color'] = OPENAIP_COLORS.MOA_STROKE;
        layer.paint['line-width'] = 2;
        layer.paint['line-dasharray'] = [4, 4];
        break;
        
      case 'RESTRICTED':
      case 'restricted':
      case 'rdp':
        layer.paint['line-color'] = OPENAIP_COLORS.RESTRICTED_STROKE;
        layer.paint['line-width'] = 2;
        layer.paint['line-dasharray'] = [6, 3];
        break;
        
      case 'DANGER':
      case 'danger':
      case 'cd':
        layer.paint['line-color'] = OPENAIP_COLORS.DANGER_STROKE;
        layer.paint['line-width'] = 3;
        break;
        
      case 'PROHIBITED':
      case 'prohibited':
        layer.paint['line-color'] = OPENAIP_COLORS.PROHIBITED_STROKE;
        layer.paint['line-width'] = 3;
        break;
        
      default:
        layer.paint['line-color'] = '#666666';
        layer.paint['line-width'] = 1;
    }
    
    // Common line properties
    layer.paint['line-opacity'] = 0.8;
  }

  // Airport styling with size-based differentiation
  if (layerId.includes('airport')) {
    const airportType = getAirportType(layerId, sourceLayer);
    
    if (layer.type === 'circle') {
      switch (airportType) {
        case 'major':
          layer.paint['circle-color'] = OPENAIP_COLORS.AIRPORT_PRIMARY;
          layer.paint['circle-radius'] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 4,
            10, 8,
            14, 12,
            18, 16
          ];
          break;
          
        case 'regional':
          layer.paint['circle-color'] = OPENAIP_COLORS.AIRPORT_SECONDARY;
          layer.paint['circle-radius'] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 3,
            12, 6,
            16, 10
          ];
          break;
          
        case 'heliport':
          layer.paint['circle-color'] = OPENAIP_COLORS.HELIPORT;
          layer.paint['circle-radius'] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 2,
            14, 4,
            18, 6
          ];
          break;
          
        case 'glider':
          layer.paint['circle-color'] = OPENAIP_COLORS.GLIDER_SITE;
          layer.paint['circle-radius'] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            10, 2,
            14, 4,
            18, 6
          ];
          break;
          
        default:
          layer.paint['circle-color'] = OPENAIP_COLORS.AIRPORT_PRIMARY;
          layer.paint['circle-radius'] = [
            'interpolate',
            ['linear'],
            ['zoom'],
            8, 3,
            12, 6,
            16, 10
          ];
      }
      
      // Common airport properties
      layer.paint['circle-stroke-color'] = OPENAIP_COLORS.WHITE;
      layer.paint['circle-stroke-width'] = [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 1,
        14, 2
      ];
      layer.paint['circle-opacity'] = 0.9;
    }
  }

  // Navigation aids with authentic OpenAIP styling
  if ((layerId.includes('navaid') || layerId.includes('vor') || layerId.includes('ndb')) && layer.type === 'circle') {
    const navaidType = getNavaidType(layerId, sourceLayer);
    
    switch (navaidType) {
      case 'VOR':
      case 'vor':
        layer.paint['circle-color'] = OPENAIP_COLORS.VOR_NAVAID;
        layer.paint['circle-radius'] = [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 3,
          14, 5,
          18, 7
        ];
        break;
        
      case 'NDB':
      case 'ndb':
        layer.paint['circle-color'] = OPENAIP_COLORS.NDB_NAVAID;
        layer.paint['circle-radius'] = [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 2,
          14, 4,
          18, 6
        ];
        break;
        
      default:
        layer.paint['circle-color'] = OPENAIP_COLORS.VOR_NAVAID;
        layer.paint['circle-radius'] = 4;
    }
    
    layer.paint['circle-stroke-color'] = OPENAIP_COLORS.WHITE;
    layer.paint['circle-stroke-width'] = 1;
    layer.paint['circle-opacity'] = 0.9;
  }

  // Waypoint styling
  if ((layerId.includes('waypoint') || layerId.includes('fix')) && layer.type === 'circle') {
    layer.paint['circle-color'] = OPENAIP_COLORS.WAYPOINT;
    layer.paint['circle-radius'] = [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 1,
      14, 2,
      18, 3
    ];
    layer.paint['circle-stroke-color'] = OPENAIP_COLORS.WHITE;
    layer.paint['circle-stroke-width'] = 0.5;
    layer.paint['circle-opacity'] = 0.8;
  }

  // Obstacle styling with height-based colors
  if (layerId.includes('obstacle') && layer.type === 'circle') {
    const obstacleHeight = getObstacleHeight(layerId, sourceLayer);
    
    if (obstacleHeight === 'high') {
      layer.paint['circle-color'] = OPENAIP_COLORS.OBSTACLE_HIGH;
    } else if (obstacleHeight === 'medium') {
      layer.paint['circle-color'] = OPENAIP_COLORS.OBSTACLE_MEDIUM;
    } else {
      layer.paint['circle-color'] = OPENAIP_COLORS.OBSTACLE_LOW;
    }
    
    layer.paint['circle-radius'] = [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 2,
      14, 4,
      18, 6
    ];
    layer.paint['circle-stroke-color'] = OPENAIP_COLORS.WHITE;
    layer.paint['circle-stroke-width'] = 1;
    layer.paint['circle-opacity'] = 0.9;
  }

  // Text styling for labels
  if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
    layer.paint['text-color'] = OPENAIP_COLORS.BLACK;
    layer.paint['text-halo-color'] = OPENAIP_COLORS.WHITE;
    layer.paint['text-halo-width'] = 1;
    layer.layout['text-size'] = [
      'interpolate',
      ['linear'],
      ['zoom'],
      8, 10,
      14, 12,
      18, 14
    ];
  }

  return layer;
};

// Define essential aeronautical layers we want to keep
const ESSENTIAL_AERONAUTICAL_LAYERS = [
  // Airspace layers
  'airspace_clicktarget',
  'airspace_ctr_fill',
  'airspace_ctr_border', 
  'airspace_tma_cta_offset',
  'airspace_tma_cta_border',
  'airspace_rmz_tiz_tia_fill',
  'airspace_rmz_tiz_tia_border',
  'airspace_g_offset',
  'airspace_g_border',
  'airspace_e_border',
  'airspace_f_offset',
  'airspace_f_border',
  'airspace_ab_offset',
  'airspace_ab_border',
  'airspace_cd_border',
  'airspace_rdp_border',
  'airspace_tfr_border',
  'airspace_tsa_border',
  'airspace_moa_fill',
  'airspace_moa_border',
  'airspace_adiz_offset',
  'airspace_adiz_border',
  'airspace_gliding_sector',
  'airspace_gliding_sector_border',
  'airspace_aerial_sporting_recreational_border',
  'airspace_overflight_restriction_border',
  'airspace_overflight_restriction_symbol',
  'airspace_label_full',
  'airspace_label_medium',
  'airspace_label_minimal',
  
  // Airport layers
  'airport_clicktarget',
  'airport_runway',
  'airport_runway_intl',
  'airport_with_code',
  'airport_with_code_runway',
  'airport_intl',
  'airport_other',
  'airport_gliding',
  'airport_gliding_winch',
  'airport_parachute',
  
  // Navigation aids
  'navaid_clicktarget',
  'navaid_ndb',
  'navaid_other',
  'navaid_beam_rose',
  
  // Obstacles
  'obstacle_clicktarget',
  'obstacle',
  
  // Reporting points
  'reporting_point_clicktarget',
  'reporting_point',
  
  // RC airfields
  'rc_airfield_clicktarget',
  'rc_airfield',
  'rc_airfield_airspace',
  
  // Hang gliding
  'hang_gliding_clicktarget',
  'hang_gliding',
  
  // Hotspots
  'hotspot_clicktarget',
  'hotspot_cloud',
  'hotspot_industrial'
];

// Fix MapLibre GL compatibility issues
function fixLayerCompatibility(layer) {
  const fixedLayer = JSON.parse(JSON.stringify(layer));
  
  // Fix line-dasharray expressions
  if (fixedLayer.paint && fixedLayer.paint['line-dasharray']) {
    const dashArray = fixedLayer.paint['line-dasharray'];
    if (Array.isArray(dashArray) && dashArray.length > 0) {
      // If it's a complex expression with arrays, simplify it
      if (Array.isArray(dashArray[0]) || typeof dashArray[0] === 'object') {
        fixedLayer.paint['line-dasharray'] = [2, 2]; // Simple fallback
      }
    }
  }
  
  // Fix text-offset expressions
  if (fixedLayer.layout && fixedLayer.layout['text-offset']) {
    const textOffset = fixedLayer.layout['text-offset'];
    if (Array.isArray(textOffset) && textOffset.length > 0) {
      if (Array.isArray(textOffset[0]) || typeof textOffset[0] === 'object') {
        fixedLayer.layout['text-offset'] = [0, 1]; // Enhanced aeronautical styling based on OpenAIP official standards
      }
    }
  }
  
  // Fix icon-offset expressions
  if (fixedLayer.layout && fixedLayer.layout['icon-offset']) {
    const iconOffset = fixedLayer.layout['icon-offset'];
    if (Array.isArray(iconOffset) && iconOffset.length > 0) {
      if (Array.isArray(iconOffset[0]) || typeof iconOffset[0] === 'object') {
        fixedLayer.layout['icon-offset'] = [0, 0]; // Simple fallback
      }
    }
  }
  
  // Remove problematic fill-pattern (causes interpolation errors)
  if (fixedLayer.paint && fixedLayer.paint['fill-pattern']) {
    delete fixedLayer.paint['fill-pattern'];
    // Add a solid color instead
    if (!fixedLayer.paint['fill-color']) {
      fixedLayer.paint['fill-color'] = 'rgba(255, 0, 0, 0.3)';
    }
  }
  
  // Remove problematic icon-image for now (until we fix sprite loading)
  if (fixedLayer.layout && fixedLayer.layout['icon-image']) {
    delete fixedLayer.layout['icon-image'];
  }
  
  // Fix text-field formatting issues
  if (fixedLayer.layout && fixedLayer.layout['text-field']) {
    const textField = fixedLayer.layout['text-field'];
    if (typeof textField === 'object' && textField.type === 'formatted') {
      // Simplify formatted text to plain text
      fixedLayer.layout['text-field'] = '{name}';
    }
  }
  
  // Fix text-font issues
  if (fixedLayer.layout && fixedLayer.layout['text-font']) {
    const textFont = fixedLayer.layout['text-font'];
    if (Array.isArray(textFont) && textFont.length > 0) {
      if (Array.isArray(textFont[0]) || typeof textFont[0] === 'object') {
        fixedLayer.layout['text-font'] = ['Open Sans Regular', 'Arial Unicode MS Regular'];
      }
    }
  }
  
  // Fix text-translate issues
  if (fixedLayer.paint && fixedLayer.paint['text-translate']) {
    const textTranslate = fixedLayer.paint['text-translate'];
    if (Array.isArray(textTranslate) && textTranslate.length > 0) {
      if (Array.isArray(textTranslate[0]) || typeof textTranslate[0] === 'object') {
        fixedLayer.paint['text-translate'] = [0, 0];
      }
    }
  }
  
  // Apply enhanced aeronautical styling based on OpenAIP standards
  return enhanceAeronauticalStyling(fixedLayer);
}

export function convertOpenAipStyle(openAipStyle) {
  console.log(' Converting OpenAIP style for MapLibre GL...');
  console.log(' Original style sources:', Object.keys(openAipStyle.sources || {}));
  console.log(' Original style layers:', openAipStyle.layers?.length || 0);
  
  // Create a copy of the style
  const convertedStyle = JSON.parse(JSON.stringify(openAipStyle));
  
  // Find all OpenAIP vector tile sources by examining tile URLs
  const openAipSources = [];
  if (convertedStyle.sources) {
    Object.entries(convertedStyle.sources).forEach(([sourceId, source]) => {
      if (source.type === 'vector' && source.tiles) {
        // Check if any tile URL contains 'openaip'
        const hasOpenAipTiles = source.tiles.some(tileUrl => 
          tileUrl.includes('openaip') || 
          tileUrl.includes('api.tiles.openaip.net') ||
          tileUrl.includes('tiles.openaip.net')
        );
        
        if (hasOpenAipTiles) {
          openAipSources.push(sourceId);
          console.log(`🎯 Found OpenAIP vector source: ${sourceId}`);
          
          // Replace tile URLs with local proxy URLs
          source.tiles = source.tiles.map(tileUrl => {
            if (tileUrl.includes('openaip')) {
              const proxyUrl = tileUrl.replace(
                /https?:\/\/[^/]+/, 
                'http://localhost:3001/api/maps/openaip-vectortiles'
              );
              console.log(`🔄 Tile URL: ${tileUrl} → ${proxyUrl}`);
              return proxyUrl;
            }
            return tileUrl;
          });
          
          // Ensure proper zoom levels
          source.minzoom = source.minzoom || 0;
          source.maxzoom = source.maxzoom || 22;
        }
      }
    });
  }
  
  console.log(`✅ Found ${openAipSources.length} OpenAIP vector sources:`, openAipSources);
  
  // Remove incompatible Mapbox sources that use mapbox:// URLs
  if (convertedStyle.sources) {
    const sourcesToRemove = [];
    
    Object.entries(convertedStyle.sources).forEach(([sourceId, source]) => {
      // Check for Mapbox-specific URLs that aren't supported by MapLibre GL
      if (source.url && source.url.startsWith('mapbox://')) {
        sourcesToRemove.push(sourceId);
        console.log(`❌ Removing incompatible Mapbox source: ${sourceId} (${source.url})`);
      }
      
      // Also check tiles array for mapbox:// URLs
      if (source.tiles && Array.isArray(source.tiles)) {
        const hasMapboxTiles = source.tiles.some(tile => tile.startsWith('mapbox://'));
        if (hasMapboxTiles) {
          sourcesToRemove.push(sourceId);
          console.log(`❌ Removing source with Mapbox tiles: ${sourceId}`);
        }
      }
    });
    
    // Remove the incompatible sources
    sourcesToRemove.forEach(sourceId => {
      delete convertedStyle.sources[sourceId];
    });
    
    if (sourcesToRemove.length > 0) {
      console.log(`🧹 Removed ${sourcesToRemove.length} incompatible Mapbox sources:`, sourcesToRemove);
    }
  }
  
  // Filter layers to only include essential aeronautical ones
  if (convertedStyle.layers) {
    const originalLayerCount = convertedStyle.layers.length;
    
    convertedStyle.layers = convertedStyle.layers.filter(layer => {
      // Skip layers that reference removed sources
      if (layer.source && !convertedStyle.sources[layer.source]) {
        console.log(`❌ Skipping layer with removed source: ${layer.id} (source: ${layer.source})`);
        return false;
      }
      
      // Keep layers that belong to OpenAIP sources and are essential
      const belongsToOpenAip = openAipSources.includes(layer.source);
      const isEssential = ESSENTIAL_AERONAUTICAL_LAYERS.includes(layer.id);
      
      if (belongsToOpenAip && isEssential) {
        console.log(`✅ Keeping essential layer: ${layer.id} (${layer.type})`);
        return true;
      } else if (belongsToOpenAip && !isEssential) {
        console.log(`❌ Filtering out non-essential layer: ${layer.id} (${layer.type})`);
        return false;
      }
      
      return false; // Don't include non-OpenAIP layers
    });
    
    // Fix compatibility issues for remaining layers
    convertedStyle.layers = convertedStyle.layers.map(layer => {
      try {
        return fixLayerCompatibility(layer);
      } catch (error) {
        console.warn(`⚠️ Error fixing layer ${layer.id}:`, error);
        return layer; // Return original if fixing fails
      }
    });
    
    console.log(`🎯 Filtered layers: ${originalLayerCount} → ${convertedStyle.layers.length}`);
  }
  
  return {
    convertedStyle,
    openAipSources
  };
}
