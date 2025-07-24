/**
 * Adds authentic OpenAIP symbols to the map using canvas rendering
 * This replaces sprite-based symbols to avoid format errors
 */
export const addOpenAipSymbols = (map) => {
  // Wait for map to be ready
  if (!map.isStyleLoaded()) {
    map.once('styledata', () => addOpenAipSymbols(map));
    return;
  }

  // Add airport cross symbol for major airports
  map.addLayer({
    id: 'airport-symbol-cross',
    type: 'symbol',
    source: 'openaip',
    'source-layer': 'airports',
    filter: ['any', 
      ['==', ['get', 'type'], 1],
      ['==', ['get', 'type'], 'INTL_APT'],
      ['==', ['get', 'type'], 'APT']
    ],
    layout: {
      'text-field': '+',
      'text-font': ['Noto Sans Bold'],
      'text-size': 16,
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#0066CC'
    }
  });

  // Add VOR compass rose using text symbols
  map.addLayer({
    id: 'vor-symbol',
    type: 'symbol',
    source: 'openaip',
    'source-layer': 'navaids',
    filter: ['any',
      ['==', ['get', 'type'], 'VOR'],
      ['==', ['get', 'type'], 'VORDME'],
      ['==', ['get', 'type'], 'VORTAC']
    ],
    layout: {
      'text-field': '◈',
      'text-font': ['Noto Sans Regular'],
      'text-size': 20,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
      'text-rotate': 45
    },
    paint: {
      'text-color': '#0066CC'
    }
  });

  // Add NDB symbol
  map.addLayer({
    id: 'ndb-symbol',
    type: 'symbol',
    source: 'openaip',
    'source-layer': 'navaids',
    filter: ['==', ['get', 'type'], 'NDB'],
    layout: {
      'text-field': '◉',
      'text-font': ['Noto Sans Bold'],
      'text-size': 16,
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#FF6600'
    }
  });

  // Add glider site symbol
  map.addLayer({
    id: 'glider-symbol',
    type: 'symbol',
    source: 'openaip',
    'source-layer': 'airports',
    filter: ['==', ['get', 'type'], 'GLIDER'],
    layout: {
      'text-field': '⩙',
      'text-font': ['Noto Sans Regular'],
      'text-size': 18,
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#00AA00'
    }
  });

  console.log('✅ OpenAIP symbols added');
};

/**
 * Creates canvas-based images for more complex symbols
 * Use this if you need custom graphics beyond text symbols
 */
export const createCanvasSymbols = (map) => {
  // Create VOR compass rose
  const vorCanvas = document.createElement('canvas');
  vorCanvas.width = 32;
  vorCanvas.height = 32;
  const vorCtx = vorCanvas.getContext('2d');
  
  // Draw VOR compass rose
  vorCtx.strokeStyle = '#0066CC';
  vorCtx.lineWidth = 2;
  
  // Outer circle
  vorCtx.beginPath();
  vorCtx.arc(16, 16, 14, 0, 2 * Math.PI);
  vorCtx.stroke();
  
  // Compass points
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const innerRadius = 8;
    const outerRadius = 14;
    
    vorCtx.beginPath();
    vorCtx.moveTo(
      16 + Math.cos(angle) * innerRadius,
      16 + Math.sin(angle) * innerRadius
    );
    vorCtx.lineTo(
      16 + Math.cos(angle) * outerRadius,
      16 + Math.sin(angle) * outerRadius
    );
    vorCtx.stroke();
  }
  
  // Center dot
  vorCtx.fillStyle = '#0066CC';
  vorCtx.beginPath();
  vorCtx.arc(16, 16, 3, 0, 2 * Math.PI);
  vorCtx.fill();
  
  // Add the image to the map
  if (!map.hasImage('vor-compass')) {
    map.addImage('vor-compass', vorCtx.getImageData(0, 0, 32, 32));
  }
  
  // Create prohibited area pattern
  const prohibitedCanvas = document.createElement('canvas');
  prohibitedCanvas.width = 20;
  prohibitedCanvas.height = 20;
  const prohibitedCtx = prohibitedCanvas.getContext('2d');
  
  prohibitedCtx.strokeStyle = '#8B0000';
  prohibitedCtx.lineWidth = 2;
  
  // Draw cross-hatch pattern
  for (let i = 0; i < 20; i += 5) {
    prohibitedCtx.beginPath();
    prohibitedCtx.moveTo(i, 0);
    prohibitedCtx.lineTo(i, 20);
    prohibitedCtx.stroke();
    
    prohibitedCtx.beginPath();
    prohibitedCtx.moveTo(0, i);
    prohibitedCtx.lineTo(20, i);
    prohibitedCtx.stroke();
  }
  
  if (!map.hasImage('prohibited-pattern')) {
    map.addImage('prohibited-pattern', prohibitedCtx.getImageData(0, 0, 20, 20), {
      pixelRatio: 2
    });
  }
  
  console.log('✅ Canvas symbols created');
};
