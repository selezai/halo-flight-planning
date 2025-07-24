// utils/openAipZoomRules.js
export const setupOpenAipZoomBehavior = (map) => {
  // Define visibility rules matching OpenAIP
  const zoomRules = {
    'airports': { minZoom: 8, opacity: [8, 0.4, 10, 0.8, 12, 1] },
    'airport-labels': { minZoom: 9 },
    'airspace-fill': { minZoom: 6, opacity: [6, 0.2, 10, 0.4] },
    'airspace-labels': { minZoom: 9 },
    'navaids-unclustered': { minZoom: 8 },
    'navaids-labels': { minZoom: 10 }
  };
  
  map.on('zoom', () => {
    const zoom = map.getZoom();
    
    Object.entries(zoomRules).forEach(([layerId, rules]) => {
      if (map.getLayer(layerId)) {
        // Set visibility
        if (zoom < rules.minZoom) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        } else {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
        
        // Set opacity if defined
        if (rules.opacity) {
          const opacityExpression = ['interpolate', ['linear'], ['zoom'], ...rules.opacity];
          const paintProperty = layerId.includes('fill') ? 'fill-opacity' : 
                               layerId.includes('line') ? 'line-opacity' : 
                               'text-opacity';
          map.setPaintProperty(layerId, paintProperty, opacityExpression);
        }
      }
    });
  });
};
