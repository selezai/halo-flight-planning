/**
 * OpenAIP Airspace Enhancement
 * Provides authentic airspace styling with proper transparency, patterns, and borders
 */

// OpenAIP Airspace Colors - matching official appearance
const AIRSPACE_COLORS = {
  // Control Tower Zones (CTR)
  CTR_FILL: 'rgba(255, 0, 0, 0.08)',
  CTR_BORDER: '#ff0000',
  
  // Terminal Control Areas (TMA/TCA)
  TMA_FILL: 'rgba(58, 112, 184, 0.08)',
  TMA_BORDER: '#3a70b8',
  
  // Control Areas (CTA)
  CTA_FILL: 'rgba(58, 112, 184, 0.06)',
  CTA_BORDER: '#4a80c8',
  
  // Military Operating Areas (MOA)
  MOA_FILL: 'rgba(142, 68, 173, 0.08)',
  MOA_BORDER: '#8e44ad',
  
  // Restricted Areas
  RESTRICTED_FILL: 'rgba(204, 0, 0, 0.12)',
  RESTRICTED_BORDER: '#cc0000',
  
  // Danger Areas
  DANGER_FILL: 'rgba(255, 0, 0, 0.15)',
  DANGER_BORDER: '#ff0000',
  
  // Prohibited Areas
  PROHIBITED_FILL: 'rgba(255, 0, 0, 0.18)',
  PROHIBITED_BORDER: '#ff0000',
  
  // Temporary Restricted Areas (TRA)
  TRA_FILL: 'rgba(255, 165, 0, 0.10)',
  TRA_BORDER: '#ffa500',
  
  // Alert Areas
  ALERT_FILL: 'rgba(255, 255, 0, 0.10)',
  ALERT_BORDER: '#ffff00',
  
  // Warning Areas
  WARNING_FILL: 'rgba(255, 140, 0, 0.10)',
  WARNING_BORDER: '#ff8c00',
  
  // Default fallback
  DEFAULT_FILL: 'rgba(100, 100, 100, 0.05)',
  DEFAULT_BORDER: '#666666',
  
  // Text colors
  LABEL_TEXT: '#2c3e50',
  LABEL_HALO: '#ffffff',
};

// Airspace border patterns
const BORDER_PATTERNS = {
  SOLID: [],
  DASHED: [5, 5],
  DOTTED: [2, 3],
  DASH_DOT: [8, 3, 2, 3],
  LONG_DASH: [12, 4],
};

/**
 * Determines airspace type from layer ID and source layer
 */
const getAirspaceType = (layerId, sourceLayer) => {
  const id = layerId.toLowerCase();
  const source = sourceLayer ? sourceLayer.toLowerCase() : '';
  
  // Check layer ID first
  if (id.includes('ctr') || id.includes('control_zone')) return 'CTR';
  if (id.includes('tma') || id.includes('terminal')) return 'TMA';
  if (id.includes('cta') || id.includes('control_area')) return 'CTA';
  if (id.includes('moa') || id.includes('military')) return 'MOA';
  if (id.includes('restricted')) return 'RESTRICTED';
  if (id.includes('danger')) return 'DANGER';
  if (id.includes('prohibited')) return 'PROHIBITED';
  if (id.includes('tra') || id.includes('temporary')) return 'TRA';
  if (id.includes('alert')) return 'ALERT';
  if (id.includes('warning')) return 'WARNING';
  
  // Check source layer
  if (source.includes('ctr')) return 'CTR';
  if (source.includes('tma')) return 'TMA';
  if (source.includes('cta')) return 'CTA';
  if (source.includes('moa')) return 'MOA';
  if (source.includes('restricted')) return 'RESTRICTED';
  if (source.includes('danger')) return 'DANGER';
  if (source.includes('prohibited')) return 'PROHIBITED';
  if (source.includes('tra')) return 'TRA';
  if (source.includes('alert')) return 'ALERT';
  if (source.includes('warning')) return 'WARNING';
  
  return 'DEFAULT';
};

/**
 * Gets airspace colors based on type
 */
const getAirspaceColors = (type) => {
  switch (type) {
    case 'CTR':
      return { fill: AIRSPACE_COLORS.CTR_FILL, border: AIRSPACE_COLORS.CTR_BORDER };
    case 'TMA':
      return { fill: AIRSPACE_COLORS.TMA_FILL, border: AIRSPACE_COLORS.TMA_BORDER };
    case 'CTA':
      return { fill: AIRSPACE_COLORS.CTA_FILL, border: AIRSPACE_COLORS.CTA_BORDER };
    case 'MOA':
      return { fill: AIRSPACE_COLORS.MOA_FILL, border: AIRSPACE_COLORS.MOA_BORDER };
    case 'RESTRICTED':
      return { fill: AIRSPACE_COLORS.RESTRICTED_FILL, border: AIRSPACE_COLORS.RESTRICTED_BORDER };
    case 'DANGER':
      return { fill: AIRSPACE_COLORS.DANGER_FILL, border: AIRSPACE_COLORS.DANGER_BORDER };
    case 'PROHIBITED':
      return { fill: AIRSPACE_COLORS.PROHIBITED_FILL, border: AIRSPACE_COLORS.PROHIBITED_BORDER };
    case 'TRA':
      return { fill: AIRSPACE_COLORS.TRA_FILL, border: AIRSPACE_COLORS.TRA_BORDER };
    case 'ALERT':
      return { fill: AIRSPACE_COLORS.ALERT_FILL, border: AIRSPACE_COLORS.ALERT_BORDER };
    case 'WARNING':
      return { fill: AIRSPACE_COLORS.WARNING_FILL, border: AIRSPACE_COLORS.WARNING_BORDER };
    default:
      return { fill: AIRSPACE_COLORS.DEFAULT_FILL, border: AIRSPACE_COLORS.DEFAULT_BORDER };
  }
};

/**
 * Gets border pattern based on airspace type
 */
const getBorderPattern = (type) => {
  switch (type) {
    case 'CTR':
    case 'TMA':
    case 'CTA':
      return BORDER_PATTERNS.SOLID;
    case 'RESTRICTED':
    case 'DANGER':
    case 'PROHIBITED':
      return BORDER_PATTERNS.DASHED;
    case 'MOA':
    case 'TRA':
      return BORDER_PATTERNS.DASH_DOT;
    case 'ALERT':
    case 'WARNING':
      return BORDER_PATTERNS.DOTTED;
    default:
      return BORDER_PATTERNS.SOLID;
  }
};

/**
 * Creates enhanced airspace fill layers
 */
export const createAirspaceFillLayers = () => {
  return [
    // Airspace fill layers with proper transparency
    {
      id: 'openaip-airspace-fills',
      type: 'fill',
      source: 'openaip-data',
      'source-layer': 'airspaces',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'type'], 'CTR'], AIRSPACE_COLORS.CTR_FILL,
          ['==', ['get', 'type'], 'TMA'], AIRSPACE_COLORS.TMA_FILL,
          ['==', ['get', 'type'], 'CTA'], AIRSPACE_COLORS.CTA_FILL,
          ['==', ['get', 'type'], 'MOA'], AIRSPACE_COLORS.MOA_FILL,
          ['==', ['get', 'type'], 'RESTRICTED'], AIRSPACE_COLORS.RESTRICTED_FILL,
          ['==', ['get', 'type'], 'DANGER'], AIRSPACE_COLORS.DANGER_FILL,
          ['==', ['get', 'type'], 'PROHIBITED'], AIRSPACE_COLORS.PROHIBITED_FILL,
          ['==', ['get', 'type'], 'TRA'], AIRSPACE_COLORS.TRA_FILL,
          ['==', ['get', 'type'], 'ALERT'], AIRSPACE_COLORS.ALERT_FILL,
          ['==', ['get', 'type'], 'WARNING'], AIRSPACE_COLORS.WARNING_FILL,
          AIRSPACE_COLORS.DEFAULT_FILL
        ],
        'fill-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.6,
          10, 0.8,
          14, 1.0
        ]
      }
    }
  ];
};

/**
 * Creates enhanced airspace border layers
 */
export const createAirspaceBorderLayers = () => {
  return [
    // Airspace border layers with patterns
    {
      id: 'openaip-airspace-borders',
      type: 'line',
      source: 'openaip-data',
      'source-layer': 'airspaces',
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'type'], 'CTR'], AIRSPACE_COLORS.CTR_BORDER,
          ['==', ['get', 'type'], 'TMA'], AIRSPACE_COLORS.TMA_BORDER,
          ['==', ['get', 'type'], 'CTA'], AIRSPACE_COLORS.CTA_BORDER,
          ['==', ['get', 'type'], 'MOA'], AIRSPACE_COLORS.MOA_BORDER,
          ['==', ['get', 'type'], 'RESTRICTED'], AIRSPACE_COLORS.RESTRICTED_BORDER,
          ['==', ['get', 'type'], 'DANGER'], AIRSPACE_COLORS.DANGER_BORDER,
          ['==', ['get', 'type'], 'PROHIBITED'], AIRSPACE_COLORS.PROHIBITED_BORDER,
          ['==', ['get', 'type'], 'TRA'], AIRSPACE_COLORS.TRA_BORDER,
          ['==', ['get', 'type'], 'ALERT'], AIRSPACE_COLORS.ALERT_BORDER,
          ['==', ['get', 'type'], 'WARNING'], AIRSPACE_COLORS.WARNING_BORDER,
          AIRSPACE_COLORS.DEFAULT_BORDER
        ],
        'line-width': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, [
            'case',
            ['in', ['get', 'type'], ['literal', ['RESTRICTED', 'DANGER', 'PROHIBITED']]], 2,
            ['in', ['get', 'type'], ['literal', ['CTR', 'TMA', 'CTA']]], 1.5,
            1
          ],
          10, [
            'case',
            ['in', ['get', 'type'], ['literal', ['RESTRICTED', 'DANGER', 'PROHIBITED']]], 2.5,
            ['in', ['get', 'type'], ['literal', ['CTR', 'TMA', 'CTA']]], 2,
            1.5
          ],
          14, [
            'case',
            ['in', ['get', 'type'], ['literal', ['RESTRICTED', 'DANGER', 'PROHIBITED']]], 3,
            ['in', ['get', 'type'], ['literal', ['CTR', 'TMA', 'CTA']]], 2.5,
            2
          ]
        ],
        'line-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.7,
          10, 0.8,
          14, 0.9
        ]
      }
    }
  ];
};

/**
 * Creates airspace label layers
 */
export const createAirspaceLabelLayers = () => {
  return [
    // Airspace name labels
    {
      id: 'openaip-airspace-labels',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'airspaces',
      layout: {
        'text-field': [
          'case',
          ['has', 'name'],
          ['get', 'name'],
          ['has', 'ident'],
          ['get', 'ident'],
          ''
        ],
        'text-font': ['Open Sans Bold'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 9,
          12, 11,
          16, 13
        ],
        'text-transform': 'uppercase',
        'text-anchor': 'center',
        'text-max-width': 10,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'symbol-placement': 'point'
      },
      paint: {
        'text-color': AIRSPACE_COLORS.LABEL_TEXT,
        'text-halo-color': AIRSPACE_COLORS.LABEL_HALO,
        'text-halo-width': 2,
        'text-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.8,
          12, 1.0
        ]
      },
      minzoom: 9
    },
    
    // Airspace altitude labels
    {
      id: 'openaip-airspace-altitudes',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'airspaces',
      layout: {
        'text-field': [
          'case',
          ['all', ['has', 'upper_limit'], ['has', 'lower_limit']],
          ['concat', ['get', 'upper_limit'], '\n', ['get', 'lower_limit']],
          ['has', 'upper_limit'],
          ['get', 'upper_limit'],
          ['has', 'lower_limit'],
          ['get', 'lower_limit'],
          ''
        ],
        'text-font': ['Open Sans Regular'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 8,
          14, 10,
          18, 12
        ],
        'text-transform': 'none',
        'text-anchor': 'center',
        'text-max-width': 8,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'text-line-height': 1.2,
        'symbol-placement': 'point'
      },
      paint: {
        'text-color': AIRSPACE_COLORS.LABEL_TEXT,
        'text-halo-color': AIRSPACE_COLORS.LABEL_HALO,
        'text-halo-width': 1.5,
        'text-opacity': 0.9
      },
      minzoom: 11
    }
  ];
};

/**
 * Enhanced airspace styling function
 */
export const enhanceAirspaceStyling = (map) => {
  console.log('🛡️ Enhancing airspace styling...');
  
  // Get all airspace-related layers
  const airspaceLayers = map.getStyle().layers.filter(layer => 
    layer.id.toLowerCase().includes('airspace') && layer.source === 'openaip-data'
  );
  
  airspaceLayers.forEach(layer => {
    const layerId = layer.id;
    const sourceLayer = layer['source-layer'] || '';
    const airspaceType = getAirspaceType(layerId, sourceLayer);
    const colors = getAirspaceColors(airspaceType);
    const pattern = getBorderPattern(airspaceType);
    
    if (layer.type === 'fill') {
      // Enhanced fill styling
      map.setPaintProperty(layerId, 'fill-color', colors.fill);
      map.setPaintProperty(layerId, 'fill-opacity', [
        'interpolate',
        ['linear'],
        ['zoom'],
        6, 0.6,
        10, 0.8,
        14, 1.0
      ]);
      
      // Add subtle outline
      map.setPaintProperty(layerId, 'fill-outline-color', colors.border);
    }
    
    if (layer.type === 'line') {
      // Enhanced border styling
      map.setPaintProperty(layerId, 'line-color', colors.border);
      map.setPaintProperty(layerId, 'line-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        6, airspaceType === 'RESTRICTED' || airspaceType === 'DANGER' || airspaceType === 'PROHIBITED' ? 2 : 1.5,
        10, airspaceType === 'RESTRICTED' || airspaceType === 'DANGER' || airspaceType === 'PROHIBITED' ? 2.5 : 2,
        14, airspaceType === 'RESTRICTED' || airspaceType === 'DANGER' || airspaceType === 'PROHIBITED' ? 3 : 2.5
      ]);
      
      map.setPaintProperty(layerId, 'line-opacity', [
        'interpolate',
        ['linear'],
        ['zoom'],
        6, 0.7,
        10, 0.8,
        14, 0.9
      ]);
      
      // Apply dash pattern for certain airspace types
      if (pattern.length > 0) {
        map.setPaintProperty(layerId, 'line-dasharray', pattern);
      }
    }
    
    if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
      // Enhanced text styling for airspace labels
      map.setPaintProperty(layerId, 'text-color', AIRSPACE_COLORS.LABEL_TEXT);
      map.setPaintProperty(layerId, 'text-halo-color', AIRSPACE_COLORS.LABEL_HALO);
      map.setPaintProperty(layerId, 'text-halo-width', 2);
      
      // Adjust text size based on airspace importance
      map.setLayoutProperty(layerId, 'text-size', [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, airspaceType === 'CTR' || airspaceType === 'TMA' ? 10 : 9,
        12, airspaceType === 'CTR' || airspaceType === 'TMA' ? 12 : 11,
        16, airspaceType === 'CTR' || airspaceType === 'TMA' ? 14 : 13
      ]);
    }
  });
  
  console.log('✅ Airspace styling enhanced');
};

/**
 * Creates pattern fills for special airspace types
 */
export const createAirspacePatterns = (map) => {
  console.log('🎨 Creating airspace patterns...');
  
  try {
    // Create hatched pattern for restricted areas
    const createHatchPattern = (color, spacing = 8) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = spacing * 2;
      canvas.height = spacing * 2;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, spacing * 2, spacing * 2);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      
      // Draw diagonal lines
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(spacing * 2, spacing * 2);
      ctx.moveTo(0, spacing * 2);
      ctx.lineTo(spacing * 2, 0);
      ctx.stroke();
      
      // Convert canvas to ImageData for MapLibre GL compatibility
      return ctx.getImageData(0, 0, spacing * 2, spacing * 2);
    };
    
    // Create dot pattern for prohibited areas
    const createDotPattern = (color, spacing = 6) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = spacing * 2;
      canvas.height = spacing * 2;
      
      // Clear canvas with transparent background
      ctx.clearRect(0, 0, spacing * 2, spacing * 2);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(spacing, spacing, 1, 0, 2 * Math.PI);
      ctx.fill();
      
      // Convert canvas to ImageData for MapLibre GL compatibility
      return ctx.getImageData(0, 0, spacing * 2, spacing * 2);
    };
    
    // Add patterns to map
    if (!map.hasImage('restricted-pattern')) {
      const restrictedPattern = createHatchPattern(AIRSPACE_COLORS.RESTRICTED_BORDER);
      map.addImage('restricted-pattern', restrictedPattern);
      console.log('✅ Restricted pattern added successfully');
    }
    
    if (!map.hasImage('prohibited-pattern')) {
      const prohibitedPattern = createDotPattern(AIRSPACE_COLORS.PROHIBITED_BORDER);
      map.addImage('prohibited-pattern', prohibitedPattern);
      console.log('✅ Prohibited pattern added successfully');
    }
    
    console.log('✅ Airspace patterns created');
  } catch (error) {
    console.error('❌ Error creating airspace patterns:', error);
  }
};
