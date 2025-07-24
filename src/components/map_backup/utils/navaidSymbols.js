/**
 * OpenAIP Navigation Aid Symbol Generator
 * Creates authentic VOR compass roses, NDB symbols, and other navaid representations
 */

// Navaid symbol colors matching OpenAIP
const NAVAID_COLORS = {
  VOR: '#8e44ad',                  // Purple for VOR
  VOR_DME: '#9b59b6',              // Slightly lighter purple for VOR-DME
  NDB: '#d68910',                  // Orange for NDB
  TACAN: '#e67e22',                // Orange-red for TACAN
  WAYPOINT: '#27ae60',             // Green for waypoints
  FIX: '#2ecc71',                  // Light green for fixes
  SYMBOL_OUTLINE: '#ffffff',       // White outline for symbols
  TEXT: '#2c3e50',                 // Dark blue-gray for text
  TEXT_HALO: '#ffffff',            // White halo for text
};

/**
 * Creates VOR compass rose symbol on canvas
 */
const createVORSymbol = (size = 32) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  
  // Draw outer circle
  ctx.strokeStyle = NAVAID_COLORS.VOR;
  ctx.fillStyle = NAVAID_COLORS.VOR;
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Draw compass rose spokes (8 directions)
  const spokeLength = radius * 0.8;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const startX = centerX + Math.cos(angle) * (radius * 0.3);
    const startY = centerY + Math.sin(angle) * (radius * 0.3);
    const endX = centerX + Math.cos(angle) * spokeLength;
    const endY = centerY + Math.sin(angle) * spokeLength;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
  }
  
  // Draw center dot
  ctx.beginPath();
  ctx.arc(centerX, centerY, 3, 0, 2 * Math.PI);
  ctx.fill();
  
  // Add white outline for visibility
  ctx.strokeStyle = NAVAID_COLORS.SYMBOL_OUTLINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.stroke();
  
  // Convert canvas to ImageData for MapLibre GL compatibility
  return ctx.getImageData(0, 0, size, size);
};

/**
 * Creates NDB symbol on canvas
 */
const createNDBSymbol = (size = 24) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;
  
  // Draw filled circle
  ctx.fillStyle = NAVAID_COLORS.NDB;
  ctx.strokeStyle = NAVAID_COLORS.SYMBOL_OUTLINE;
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();
  
  // Draw two perpendicular lines through center
  ctx.strokeStyle = NAVAID_COLORS.SYMBOL_OUTLINE;
  ctx.lineWidth = 2;
  
  // Horizontal line
  ctx.beginPath();
  ctx.moveTo(centerX - radius * 0.7, centerY);
  ctx.lineTo(centerX + radius * 0.7, centerY);
  ctx.stroke();
  
  // Vertical line
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius * 0.7);
  ctx.lineTo(centerX, centerY + radius * 0.7);
  ctx.stroke();
  
  // Convert canvas to ImageData for MapLibre GL compatibility
  return ctx.getImageData(0, 0, size, size);
};

/**
 * Creates waypoint symbol on canvas
 */
const createWaypointSymbol = (size = 20) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.25;
  
  // Draw diamond shape
  ctx.fillStyle = NAVAID_COLORS.WAYPOINT;
  ctx.strokeStyle = NAVAID_COLORS.SYMBOL_OUTLINE;
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX + radius, centerY);
  ctx.lineTo(centerX, centerY + radius);
  ctx.lineTo(centerX - radius, centerY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Convert canvas to ImageData for MapLibre GL compatibility
  return ctx.getImageData(0, 0, size, size);
};

/**
 * Creates TACAN symbol on canvas
 */
const createTACANSymbol = (size = 28) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = size;
  canvas.height = size;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);
  
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3;
  
  // Draw hexagon
  ctx.fillStyle = NAVAID_COLORS.TACAN;
  ctx.strokeStyle = NAVAID_COLORS.SYMBOL_OUTLINE;
  ctx.lineWidth = 1;
  
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Convert canvas to ImageData for MapLibre GL compatibility
  return ctx.getImageData(0, 0, size, size);
};

/**
 * Generates navaid symbol layers with authentic representations
 */
export const createNavaidSymbolLayers = () => {
  return [
    // VOR symbols
    {
      id: 'openaip-vor-symbols',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'navaids',
      layout: {
        'icon-image': 'vor-symbol',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.6,
          12, 1.0,
          16, 1.4
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': false
      },
      paint: {
        'icon-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.8,
          12, 1.0
        ]
      },
      filter: [
        'any',
        ['==', ['get', 'type'], 'VOR'],
        ['==', ['get', 'type'], 'VOR-DME'],
        ['==', ['get', 'type'], 'VORTAC']
      ]
    },
    
    // NDB symbols
    {
      id: 'openaip-ndb-symbols',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'navaids',
      layout: {
        'icon-image': 'ndb-symbol',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.7,
          12, 1.1,
          16, 1.5
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': false
      },
      paint: {
        'icon-opacity': 1.0
      },
      filter: ['==', ['get', 'type'], 'NDB']
    },
    
    // TACAN symbols
    {
      id: 'openaip-tacan-symbols',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'navaids',
      layout: {
        'icon-image': 'tacan-symbol',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.6,
          12, 1.0,
          16, 1.4
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': false
      },
      paint: {
        'icon-opacity': 1.0
      },
      filter: ['==', ['get', 'type'], 'TACAN']
    },
    
    // Waypoint symbols
    {
      id: 'openaip-waypoint-symbols',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'waypoints',
      layout: {
        'icon-image': 'waypoint-symbol',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.6,
          14, 1.0,
          18, 1.4
        ],
        'icon-allow-overlap': false,
        'icon-ignore-placement': false
      },
      paint: {
        'icon-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 0.7,
          14, 1.0
        ]
      }
    },
    
    // Navaid identification labels
    {
      id: 'openaip-navaid-labels',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'navaids',
      layout: {
        'text-field': [
          'case',
          ['has', 'ident'],
          ['get', 'ident'],
          ['has', 'name'],
          ['get', 'name'],
          ''
        ],
        'text-font': ['Open Sans Bold'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 8,
          12, 10,
          16, 12
        ],
        'text-transform': 'uppercase',
        'text-anchor': 'top',
        'text-offset': [0, 1.2],
        'text-max-width': 6,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': NAVAID_COLORS.TEXT,
        'text-halo-color': NAVAID_COLORS.TEXT_HALO,
        'text-halo-width': 1.5,
        'text-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.8,
          12, 1.0
        ]
      },
      minzoom: 10
    },
    
    // Navaid frequency labels (at higher zoom levels)
    {
      id: 'openaip-navaid-frequencies',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'navaids',
      layout: {
        'text-field': [
          'case',
          ['has', 'frequency'],
          ['concat', ['get', 'frequency'], ' MHz'],
          ''
        ],
        'text-font': ['Open Sans Regular'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 7,
          16, 9
        ],
        'text-transform': 'none',
        'text-anchor': 'bottom',
        'text-offset': [0, -1.5],
        'text-max-width': 8,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': NAVAID_COLORS.TEXT,
        'text-halo-color': NAVAID_COLORS.TEXT_HALO,
        'text-halo-width': 1,
        'text-opacity': 0.8
      },
      minzoom: 14
    },
    
    // Waypoint labels
    {
      id: 'openaip-waypoint-labels',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'waypoints',
      layout: {
        'text-field': [
          'case',
          ['has', 'ident'],
          ['get', 'ident'],
          ['has', 'name'],
          ['get', 'name'],
          ''
        ],
        'text-font': ['Open Sans Bold'],
        'text-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          10, 8,
          14, 10,
          18, 12
        ],
        'text-transform': 'uppercase',
        'text-anchor': 'top',
        'text-offset': [0, 1],
        'text-max-width': 6,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': NAVAID_COLORS.TEXT,
        'text-halo-color': NAVAID_COLORS.TEXT_HALO,
        'text-halo-width': 1.5,
        'text-opacity': 0.9
      },
      minzoom: 12
    }
  ];
};

/**
 * Creates all navaid symbols and adds them to the map
 */
export const createNavaidSymbols = (map) => {
  console.log('🧭 Creating navaid symbols...');
  
  try {
    // Create and add VOR symbol
    if (!map.hasImage('vor-symbol')) {
      const vorSymbol = createVORSymbol(32);
      map.addImage('vor-symbol', vorSymbol);
      console.log('✅ VOR symbol added successfully');
    }
    
    // Create and add NDB symbol
    if (!map.hasImage('ndb-symbol')) {
      const ndbSymbol = createNDBSymbol(24);
      map.addImage('ndb-symbol', ndbSymbol);
      console.log('✅ NDB symbol added successfully');
    }
    
    // Create and add TACAN symbol
    if (!map.hasImage('tacan-symbol')) {
      const tacanSymbol = createTACANSymbol(28);
      map.addImage('tacan-symbol', tacanSymbol);
      console.log('✅ TACAN symbol added successfully');
    }
    
    // Create and add waypoint symbol
    if (!map.hasImage('waypoint-symbol')) {
      const waypointSymbol = createWaypointSymbol(20);
      map.addImage('waypoint-symbol', waypointSymbol);
      console.log('✅ Waypoint symbol added successfully');
    }
    
    console.log('✅ Navaid symbols created successfully');
  } catch (error) {
    console.error('❌ Error creating navaid symbols:', error);
  }
};

/**
 * Enhanced navaid styling function that applies different styles based on navaid type
 */
export const enhanceNavaidStyling = (map) => {
  console.log('🧭 Enhancing navaid styling...');
  
  // Get all navaid-related layers
  const navaidLayers = map.getStyle().layers.filter(layer => 
    (layer.id.toLowerCase().includes('navaid') || 
     layer.id.toLowerCase().includes('nav_aid') ||
     layer.id.toLowerCase().includes('waypoint')) && 
    layer.source === 'openaip-data'
  );
  
  navaidLayers.forEach(layer => {
    const layerId = layer.id;
    
    if (layer.type === 'circle') {
      // Enhanced circle styling for navaids
      map.setPaintProperty(layerId, 'circle-color', [
        'case',
        ['in', ['get', 'type'], ['literal', ['VOR', 'VOR-DME', 'VORTAC']]], NAVAID_COLORS.VOR,
        ['==', ['get', 'type'], 'NDB'], NAVAID_COLORS.NDB,
        ['==', ['get', 'type'], 'TACAN'], NAVAID_COLORS.TACAN,
        ['in', ['get', 'type'], ['literal', ['waypoint', 'fix']]], NAVAID_COLORS.WAYPOINT,
        NAVAID_COLORS.WAYPOINT
      ]);
      
      map.setPaintProperty(layerId, 'circle-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, [
          'case',
          ['in', ['get', 'type'], ['literal', ['VOR', 'VOR-DME', 'VORTAC']]], 6,
          ['==', ['get', 'type'], 'NDB'], 5,
          ['==', ['get', 'type'], 'TACAN'], 5,
          4
        ],
        12, [
          'case',
          ['in', ['get', 'type'], ['literal', ['VOR', 'VOR-DME', 'VORTAC']]], 8,
          ['==', ['get', 'type'], 'NDB'], 7,
          ['==', ['get', 'type'], 'TACAN'], 7,
          6
        ],
        16, [
          'case',
          ['in', ['get', 'type'], ['literal', ['VOR', 'VOR-DME', 'VORTAC']]], 10,
          ['==', ['get', 'type'], 'NDB'], 9,
          ['==', ['get', 'type'], 'TACAN'], 9,
          8
        ]
      ]);
      
      map.setPaintProperty(layerId, 'circle-stroke-color', NAVAID_COLORS.SYMBOL_OUTLINE);
      map.setPaintProperty(layerId, 'circle-stroke-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, 1,
        12, 1.5,
        16, 2
      ]);
      
      map.setPaintProperty(layerId, 'circle-opacity', 0.9);
      map.setPaintProperty(layerId, 'circle-stroke-opacity', 0.8);
    }
    
    if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
      // Enhanced text styling for navaid labels
      map.setPaintProperty(layerId, 'text-color', NAVAID_COLORS.TEXT);
      map.setPaintProperty(layerId, 'text-halo-color', NAVAID_COLORS.TEXT_HALO);
      map.setPaintProperty(layerId, 'text-halo-width', 1.5);
      
      // Adjust text size based on navaid type
      map.setLayoutProperty(layerId, 'text-size', [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, [
          'case',
          ['in', ['get', 'type'], ['literal', ['VOR', 'VOR-DME', 'VORTAC']]], 10,
          ['==', ['get', 'type'], 'NDB'], 9,
          8
        ],
        12, [
          'case',
          ['in', ['get', 'type'], ['literal', ['VOR', 'VOR-DME', 'VORTAC']]], 12,
          ['==', ['get', 'type'], 'NDB'], 11,
          10
        ],
        16, [
          'case',
          ['in', ['get', 'type'], ['literal', ['VOR', 'VOR-DME', 'VORTAC']]], 14,
          ['==', ['get', 'type'], 'NDB'], 13,
          12
        ]
      ]);
    }
  });
  
  console.log('✅ Navaid styling enhanced');
};
