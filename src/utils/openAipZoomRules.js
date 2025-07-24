// OpenAIP Zoom Behavior Replication
// Matches the exact zoom-based visibility rules from OpenAIP

export const setupOpenAipZoomBehavior = (map) => {
  // Define visibility rules matching OpenAIP exactly
  const zoomRules = {
    // Airports - appear at zoom 8, full opacity at 10
    'airports-major': { 
      minZoom: 6, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 6, 0.3, 8, 0.6, 10, 1.0]
    },
    'airports-regional': { 
      minZoom: 8, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 8, 0.4, 10, 0.8, 12, 1.0]
    },
    'airport-labels': { 
      minZoom: 9, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 9, 0.0, 10, 1.0]
    },
    
    // Airspaces - visible from zoom 6, full opacity at 10
    'airspace-fill': { 
      minZoom: 6, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 6, 0.15, 8, 0.25, 10, 0.4, 14, 0.5]
    },
    'airspace-border': { 
      minZoom: 6, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 6, 0.4, 8, 0.6, 10, 0.8, 14, 1.0]
    },
    'airspace-labels': { 
      minZoom: 9, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 9, 0.0, 10, 0.7, 12, 1.0]
    },
    
    // Navigation aids - appear at zoom 8
    'navaid-vor': { 
      minZoom: 8, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 8, 0.5, 10, 0.8, 12, 1.0]
    },
    'navaid-ndb': { 
      minZoom: 8, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 8, 0.5, 10, 0.8, 12, 1.0]
    },
    'navaid-dme': { 
      minZoom: 9, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 9, 0.4, 11, 0.7, 13, 1.0]
    },
    'navaid-labels': { 
      minZoom: 10, 
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 10, 0.0, 11, 0.8, 13, 1.0]
    },
    
    // Terrain and base layers
    'terrain-background': {
      minZoom: 0,
      maxZoom: 22,
      opacity: ['interpolate', ['linear'], ['zoom'], 0, 0.1, 6, 0.15, 12, 0.2, 16, 0.1]
    }
  };

  // Apply initial zoom rules
  const applyZoomRules = () => {
    const zoom = map.getZoom();
    
    Object.entries(zoomRules).forEach(([layerId, rules]) => {
      const layer = map.getLayer(layerId);
      if (!layer) return;
      
      // Set visibility based on zoom range
      if (zoom < rules.minZoom || zoom > rules.maxZoom) {
        map.setLayoutProperty(layerId, 'visibility', 'none');
      } else {
        map.setLayoutProperty(layerId, 'visibility', 'visible');
        
        // Apply opacity if defined
        if (rules.opacity) {
          const paintProperty = getPaintProperty(layer.type);
          if (paintProperty) {
            map.setPaintProperty(layerId, paintProperty, rules.opacity);
          }
        }
      }
    });
  };

  // Helper function to get the correct paint property for opacity
  const getPaintProperty = (layerType) => {
    switch (layerType) {
      case 'fill':
        return 'fill-opacity';
      case 'line':
        return 'line-opacity';
      case 'symbol':
        return 'text-opacity';
      case 'circle':
        return 'circle-opacity';
      case 'raster':
        return 'raster-opacity';
      default:
        return null;
    }
  };

  // Set up zoom event listener
  map.on('zoom', applyZoomRules);
  map.on('zoomend', applyZoomRules);
  
  // Apply rules immediately
  if (map.isStyleLoaded()) {
    applyZoomRules();
  } else {
    map.on('styledata', applyZoomRules);
  }

  // Return cleanup function
  return () => {
    map.off('zoom', applyZoomRules);
    map.off('zoomend', applyZoomRules);
    map.off('styledata', applyZoomRules);
  };
};

// Enhanced layer visibility control with smooth transitions
export const setLayerVisibility = (map, layerId, visibility) => {
  if (!map.getLayer(layerId)) return;
  
  if (visibility === 'visible') {
    map.setLayoutProperty(layerId, 'visibility', 'visible');
  } else {
    // Fade out before hiding
    const layer = map.getLayer(layerId);
    const paintProperty = getPaintProperty(layer.type);
    
    if (paintProperty) {
      // Animate to 0 opacity first
      map.setPaintProperty(layerId, paintProperty, 0);
      
      // Hide after animation
      setTimeout(() => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      }, 300);
    } else {
      map.setLayoutProperty(layerId, 'visibility', 'none');
    }
  }
};

// Get paint property helper (duplicate for export)
const getPaintProperty = (layerType) => {
  switch (layerType) {
    case 'fill':
      return 'fill-opacity';
    case 'line':
      return 'line-opacity';
    case 'symbol':
      return 'text-opacity';
    case 'circle':
      return 'circle-opacity';
    case 'raster':
      return 'raster-opacity';
    default:
      return null;
  }
};

// OpenAIP-style smooth zoom to location
export const flyToLocation = (map, coordinates, zoom = 12, options = {}) => {
  const defaultOptions = {
    duration: 2000,
    essential: true,
    curve: 1.42,
    speed: 0.8,
    ...options
  };

  map.flyTo({
    center: coordinates,
    zoom: zoom,
    ...defaultOptions
  });
};

// Batch layer visibility updates for performance
export const updateMultipleLayerVisibility = (map, layerUpdates) => {
  // Group updates to minimize redraws
  const updates = Object.entries(layerUpdates);
  
  updates.forEach(([layerId, visibility]) => {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visibility ? 'visible' : 'none');
    }
  });
};

// Professional zoom level definitions matching OpenAIP
export const ZOOM_LEVELS = {
  WORLD: 2,
  CONTINENT: 4,
  COUNTRY: 6,
  REGION: 8,
  CITY: 10,
  AIRPORT: 12,
  RUNWAY: 14,
  DETAIL: 16
};

// Feature clustering rules based on zoom
export const getClusteringRules = (zoom) => {
  if (zoom < ZOOM_LEVELS.REGION) {
    return {
      cluster: true,
      clusterRadius: 80,
      clusterMaxZoom: ZOOM_LEVELS.CITY - 1
    };
  } else if (zoom < ZOOM_LEVELS.CITY) {
    return {
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: ZOOM_LEVELS.AIRPORT - 1
    };
  } else {
    return {
      cluster: false
    };
  }
};
