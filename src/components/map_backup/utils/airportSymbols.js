/**
 * OpenAIP Airport Symbol Generator
 * Creates authentic runway symbols and ICAO code labels that match OpenAIP's appearance
 */

// Airport symbol colors matching OpenAIP
const AIRPORT_COLORS = {
  MAJOR_AIRPORT: '#0066cc',        // Blue for major airports
  REGIONAL_AIRPORT: '#3399ff',     // Lighter blue for regional
  SMALL_AIRPORT: '#66ccff',        // Light blue for small airports
  HELIPORT: '#00cc66',             // Green for heliports
  GLIDER_SITE: '#ff9900',          // Orange for glider sites
  RUNWAY_FILL: '#666666',          // Gray for runway surface
  RUNWAY_OUTLINE: '#333333',       // Dark gray for runway outline
  ICAO_TEXT: '#003366',            // Dark blue for ICAO codes
  ICAO_HALO: '#ffffff',            // White halo for text
};

/**
 * Generates airport symbol layers with authentic runway representations
 */
export const createAirportSymbolLayers = () => {
  return [
    // Airport runway symbols (replacing simple circles)
    {
      id: 'openaip-airports-runway',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'airports',
      layout: {
        'icon-image': 'runway-symbol',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.3,
          10, 0.6,
          14, 1.0,
          18, 1.5
        ],
        'icon-rotation-alignment': 'map',
        'icon-rotate': [
          'case',
          ['has', 'runway_direction'],
          ['get', 'runway_direction'],
          0
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': false
      },
      paint: {
        'icon-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          6, 0.8,
          10, 1.0
        ]
      },
      filter: ['!=', ['get', 'type'], 'heliport']
    },
    
    // Heliport symbols
    {
      id: 'openaip-heliports',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'airports',
      layout: {
        'icon-image': 'heliport-symbol',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.4,
          12, 0.8,
          16, 1.2
        ],
        'icon-allow-overlap': true
      },
      paint: {
        'icon-opacity': 1.0
      },
      filter: ['==', ['get', 'type'], 'heliport']
    },
    
    // Airport ICAO code labels
    {
      id: 'openaip-airports-icao',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'airports',
      layout: {
        'text-field': [
          'case',
          ['has', 'icao'],
          ['get', 'icao'],
          ['has', 'iata'],
          ['get', 'iata'],
          ['get', 'name']
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
        'text-anchor': 'top',
        'text-offset': [0, 1.5],
        'text-max-width': 8,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': AIRPORT_COLORS.ICAO_TEXT,
        'text-halo-color': AIRPORT_COLORS.ICAO_HALO,
        'text-halo-width': 1.5,
        'text-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          8, 0.8,
          12, 1.0
        ]
      },
      minzoom: 8
    },
    
    // Airport name labels (for larger airports at higher zoom)
    {
      id: 'openaip-airports-names',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'airports',
      layout: {
        'text-field': ['get', 'name'],
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
        'text-anchor': 'bottom',
        'text-offset': [0, -2],
        'text-max-width': 12,
        'text-allow-overlap': false,
        'text-ignore-placement': false
      },
      paint: {
        'text-color': AIRPORT_COLORS.ICAO_TEXT,
        'text-halo-color': AIRPORT_COLORS.ICAO_HALO,
        'text-halo-width': 1,
        'text-opacity': 0.8
      },
      filter: [
        'any',
        ['==', ['get', 'type'], 'large_airport'],
        ['==', ['get', 'type'], 'medium_airport']
      ],
      minzoom: 12
    }
  ];
};

/**
 * Creates canvas-based runway symbols for airports
 * This generates the actual runway icon that will be used in the symbol layer
 */
export const createRunwaySymbol = (map) => {
  console.log('🛬 Creating runway symbols...');
  
  // Create canvas for runway symbol
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  
  // Clear canvas with transparent background
  ctx.clearRect(0, 0, size, size);
  
  // Draw runway symbol
  ctx.fillStyle = AIRPORT_COLORS.RUNWAY_FILL;
  ctx.strokeStyle = AIRPORT_COLORS.RUNWAY_OUTLINE;
  ctx.lineWidth = 1;
  
  // Main runway rectangle
  const runwayWidth = 20;
  const runwayHeight = 4;
  const centerX = size / 2;
  const centerY = size / 2;
  
  ctx.fillRect(
    centerX - runwayWidth / 2,
    centerY - runwayHeight / 2,
    runwayWidth,
    runwayHeight
  );
  
  ctx.strokeRect(
    centerX - runwayWidth / 2,
    centerY - runwayHeight / 2,
    runwayWidth,
    runwayHeight
  );
  
  // Add runway threshold markings
  ctx.fillStyle = AIRPORT_COLORS.RUNWAY_OUTLINE;
  const thresholdWidth = 2;
  const thresholdHeight = runwayHeight;
  
  // Left threshold
  ctx.fillRect(
    centerX - runwayWidth / 2 + 2,
    centerY - thresholdHeight / 2,
    thresholdWidth,
    thresholdHeight
  );
  
  // Right threshold
  ctx.fillRect(
    centerX + runwayWidth / 2 - 4,
    centerY - thresholdHeight / 2,
    thresholdWidth,
    thresholdHeight
  );
  
  // Convert canvas to ImageData for MapLibre GL compatibility
  const imageData = ctx.getImageData(0, 0, size, size);
  
  // Add to map as image
  if (!map.hasImage('runway-symbol')) {
    map.addImage('runway-symbol', imageData);
    console.log('✅ Runway symbol added successfully');
  }
  
  // Create heliport symbol
  const heliCanvas = document.createElement('canvas');
  const heliCtx = heliCanvas.getContext('2d');
  heliCanvas.width = size;
  heliCanvas.height = size;
  
  // Clear canvas with transparent background
  heliCtx.clearRect(0, 0, size, size);
  
  // Draw heliport circle with H
  heliCtx.fillStyle = AIRPORT_COLORS.HELIPORT;
  heliCtx.strokeStyle = '#006633';
  heliCtx.lineWidth = 2;
  
  // Circle
  heliCtx.beginPath();
  heliCtx.arc(centerX, centerY, 12, 0, 2 * Math.PI);
  heliCtx.fill();
  heliCtx.stroke();
  
  // H symbol
  heliCtx.fillStyle = '#ffffff';
  heliCtx.font = 'bold 14px Arial';
  heliCtx.textAlign = 'center';
  heliCtx.textBaseline = 'middle';
  heliCtx.fillText('H', centerX, centerY);
  
  // Convert canvas to ImageData for MapLibre GL compatibility
  const heliImageData = heliCtx.getImageData(0, 0, size, size);
  
  // Add to map as image
  if (!map.hasImage('heliport-symbol')) {
    map.addImage('heliport-symbol', heliImageData);
    console.log('✅ Heliport symbol added successfully');
  }
  
  console.log('✅ Runway symbols created');
};

/**
 * Enhanced airport styling function that applies different styles based on airport type
 */
export const enhanceAirportStyling = (map) => {
  console.log('🛬 Enhancing airport styling...');
  
  // Get all airport-related layers
  const airportLayers = map.getStyle().layers.filter(layer => 
    layer.id.toLowerCase().includes('airport') && layer.source === 'openaip-data'
  );
  
  airportLayers.forEach(layer => {
    const layerId = layer.id;
    
    if (layer.type === 'circle') {
      // Replace circle layers with enhanced styling
      map.setPaintProperty(layerId, 'circle-color', [
        'case',
        ['==', ['get', 'type'], 'large_airport'], AIRPORT_COLORS.MAJOR_AIRPORT,
        ['==', ['get', 'type'], 'medium_airport'], AIRPORT_COLORS.REGIONAL_AIRPORT,
        ['==', ['get', 'type'], 'small_airport'], AIRPORT_COLORS.SMALL_AIRPORT,
        ['==', ['get', 'type'], 'heliport'], AIRPORT_COLORS.HELIPORT,
        ['==', ['get', 'type'], 'glider_site'], AIRPORT_COLORS.GLIDER_SITE,
        AIRPORT_COLORS.SMALL_AIRPORT
      ]);
      
      map.setPaintProperty(layerId, 'circle-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        6, [
          'case',
          ['==', ['get', 'type'], 'large_airport'], 6,
          ['==', ['get', 'type'], 'medium_airport'], 4,
          ['==', ['get', 'type'], 'small_airport'], 3,
          ['==', ['get', 'type'], 'heliport'], 3,
          2
        ],
        10, [
          'case',
          ['==', ['get', 'type'], 'large_airport'], 10,
          ['==', ['get', 'type'], 'medium_airport'], 8,
          ['==', ['get', 'type'], 'small_airport'], 6,
          ['==', ['get', 'type'], 'heliport'], 6,
          4
        ],
        14, [
          'case',
          ['==', ['get', 'type'], 'large_airport'], 14,
          ['==', ['get', 'type'], 'medium_airport'], 12,
          ['==', ['get', 'type'], 'small_airport'], 10,
          ['==', ['get', 'type'], 'heliport'], 10,
          8
        ]
      ]);
      
      map.setPaintProperty(layerId, 'circle-stroke-color', '#ffffff');
      map.setPaintProperty(layerId, 'circle-stroke-width', [
        'interpolate',
        ['linear'],
        ['zoom'],
        6, 1,
        10, 1.5,
        14, 2
      ]);
      
      map.setPaintProperty(layerId, 'circle-opacity', 0.9);
      map.setPaintProperty(layerId, 'circle-stroke-opacity', 0.8);
    }
    
    if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
      // Enhance text styling for airport labels
      map.setPaintProperty(layerId, 'text-color', AIRPORT_COLORS.ICAO_TEXT);
      map.setPaintProperty(layerId, 'text-halo-color', AIRPORT_COLORS.ICAO_HALO);
      map.setPaintProperty(layerId, 'text-halo-width', 1.5);
      
      // Adjust text size based on airport importance
      map.setLayoutProperty(layerId, 'text-size', [
        'interpolate',
        ['linear'],
        ['zoom'],
        8, [
          'case',
          ['==', ['get', 'type'], 'large_airport'], 11,
          ['==', ['get', 'type'], 'medium_airport'], 10,
          9
        ],
        12, [
          'case',
          ['==', ['get', 'type'], 'large_airport'], 13,
          ['==', ['get', 'type'], 'medium_airport'], 12,
          11
        ],
        16, [
          'case',
          ['==', ['get', 'type'], 'large_airport'], 15,
          ['==', ['get', 'type'], 'medium_airport'], 14,
          13
        ]
      ]);
    }
  });
  
  console.log('✅ Airport styling enhanced');
};
