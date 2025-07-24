// OpenAIP Visual Patterns and Symbols
// Replicates the exact visual elements used in OpenAIP maps

// Create canvas patterns for special use airspace (like OpenAIP)
export const createOpenAipPatterns = (map) => {
  // Prohibited area pattern - Diagonal red lines
  const prohibitedCanvas = document.createElement('canvas');
  prohibitedCanvas.width = 20;
  prohibitedCanvas.height = 20;
  const prohibitedCtx = prohibitedCanvas.getContext('2d');
  
  prohibitedCtx.strokeStyle = '#FF0000';
  prohibitedCtx.lineWidth = 2;
  prohibitedCtx.beginPath();
  prohibitedCtx.moveTo(0, 0);
  prohibitedCtx.lineTo(20, 20);
  prohibitedCtx.moveTo(0, 20);
  prohibitedCtx.lineTo(20, 0);
  prohibitedCtx.stroke();
  
  map.addImage('prohibited-pattern', prohibitedCtx.getImageData(0, 0, 20, 20));
  
  // Restricted area pattern - Red dots
  const restrictedCanvas = document.createElement('canvas');
  restrictedCanvas.width = 16;
  restrictedCanvas.height = 16;
  const restrictedCtx = restrictedCanvas.getContext('2d');
  
  restrictedCtx.fillStyle = '#FF3300';
  restrictedCtx.beginPath();
  restrictedCtx.arc(8, 8, 2, 0, 2 * Math.PI);
  restrictedCtx.fill();
  
  map.addImage('restricted-pattern', restrictedCtx.getImageData(0, 0, 16, 16));
  
  console.log('✈️ OpenAIP patterns created');
};

// OpenAIP-style symbols (using canvas for precise control)
export const createOpenAipSymbols = (map) => {
  // VOR Compass Rose Symbol
  const vorCanvas = document.createElement('canvas');
  vorCanvas.width = 32;
  vorCanvas.height = 32;
  const vorCtx = vorCanvas.getContext('2d');
  
  // VOR outer circle
  vorCtx.strokeStyle = '#0066CC';
  vorCtx.lineWidth = 2;
  vorCtx.beginPath();
  vorCtx.arc(16, 16, 14, 0, 2 * Math.PI);
  vorCtx.stroke();
  
  // VOR compass points (8 directions)
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x1 = 16 + Math.cos(angle) * 10;
    const y1 = 16 + Math.sin(angle) * 10;
    const x2 = 16 + Math.cos(angle) * 14;
    const y2 = 16 + Math.sin(angle) * 14;
    
    vorCtx.beginPath();
    vorCtx.moveTo(x1, y1);
    vorCtx.lineTo(x2, y2);
    vorCtx.stroke();
  }
  
  // VOR center dot
  vorCtx.fillStyle = '#0066CC';
  vorCtx.beginPath();
  vorCtx.arc(16, 16, 3, 0, 2 * Math.PI);
  vorCtx.fill();
  
  map.addImage('vor-compass', vorCtx.getImageData(0, 0, 32, 32));
  
  // NDB Symbol - Circle with cross
  const ndbCanvas = document.createElement('canvas');
  ndbCanvas.width = 24;
  ndbCanvas.height = 24;
  const ndbCtx = ndbCanvas.getContext('2d');
  
  // NDB circle
  ndbCtx.strokeStyle = '#CC6600';
  ndbCtx.lineWidth = 2;
  ndbCtx.beginPath();
  ndbCtx.arc(12, 12, 10, 0, 2 * Math.PI);
  ndbCtx.stroke();
  
  // NDB cross
  ndbCtx.beginPath();
  ndbCtx.moveTo(2, 12);
  ndbCtx.lineTo(22, 12);
  ndbCtx.moveTo(12, 2);
  ndbCtx.lineTo(12, 22);
  ndbCtx.stroke();
  
  map.addImage('ndb-cross', ndbCtx.getImageData(0, 0, 24, 24));
  
  // Airport Symbol - Circle with cross (towered)
  const airportCanvas = document.createElement('canvas');
  airportCanvas.width = 20;
  airportCanvas.height = 20;
  const airportCtx = airportCanvas.getContext('2d');
  
  // Airport circle (white fill, blue border)
  airportCtx.fillStyle = '#FFFFFF';
  airportCtx.strokeStyle = '#0066CC';
  airportCtx.lineWidth = 2;
  airportCtx.beginPath();
  airportCtx.arc(10, 10, 8, 0, 2 * Math.PI);
  airportCtx.fill();
  airportCtx.stroke();
  
  // Airport cross
  airportCtx.strokeStyle = '#0066CC';
  airportCtx.lineWidth = 1.5;
  airportCtx.beginPath();
  airportCtx.moveTo(4, 10);
  airportCtx.lineTo(16, 10);
  airportCtx.moveTo(10, 4);
  airportCtx.lineTo(10, 16);
  airportCtx.stroke();
  
  map.addImage('airport-towered', airportCtx.getImageData(0, 0, 20, 20));
  
  // Regional Airport Symbol - Smaller circle (untowered)
  const regionalCanvas = document.createElement('canvas');
  regionalCanvas.width = 16;
  regionalCanvas.height = 16;
  const regionalCtx = regionalCanvas.getContext('2d');
  
  regionalCtx.fillStyle = '#FFFFFF';
  regionalCtx.strokeStyle = '#CC0066';
  regionalCtx.lineWidth = 2;
  regionalCtx.beginPath();
  regionalCtx.arc(8, 8, 6, 0, 2 * Math.PI);
  regionalCtx.fill();
  regionalCtx.stroke();
  
  map.addImage('airport-untowered', regionalCtx.getImageData(0, 0, 16, 16));
  
  console.log('✈️ OpenAIP symbols created');
};

// OpenAIP Layer Visibility Control (like their zoom behavior)
export const setupOpenAipVisibility = (map) => {
  map.on('zoom', () => {
    const zoom = map.getZoom();
    
    // OpenAIP zoom behavior replication
    if (zoom < 6) {
      // Very low zoom - only major features
      setLayerVisibility(map, 'airports-major', 'visible');
      setLayerVisibility(map, 'airports-regional', 'none');
      setLayerVisibility(map, 'navaid-vor', 'none');
      setLayerVisibility(map, 'navaid-ndb', 'none');
      setLayerVisibility(map, 'airport-labels', 'none');
      setLayerVisibility(map, 'navaid-labels', 'none');
      setLayerVisibility(map, 'airspace-labels', 'none');
    }
    else if (zoom < 8) {
      // Low zoom - major airports and airspace
      setLayerVisibility(map, 'airports-major', 'visible');
      setLayerVisibility(map, 'airports-regional', 'none');
      setLayerVisibility(map, 'navaid-vor', 'none');
      setLayerVisibility(map, 'navaid-ndb', 'none');
      setLayerVisibility(map, 'airport-labels', 'none');
      setLayerVisibility(map, 'navaid-labels', 'none');
      setLayerVisibility(map, 'airspace-labels', 'visible');
    }
    else if (zoom < 10) {
      // Medium zoom - airports and major navaids
      setLayerVisibility(map, 'airports-major', 'visible');
      setLayerVisibility(map, 'airports-regional', 'visible');
      setLayerVisibility(map, 'navaid-vor', 'visible');
      setLayerVisibility(map, 'navaid-ndb', 'none');
      setLayerVisibility(map, 'airport-labels', 'visible');
      setLayerVisibility(map, 'navaid-labels', 'none');
      setLayerVisibility(map, 'airspace-labels', 'visible');
    }
    else if (zoom < 12) {
      // High zoom - all features
      setLayerVisibility(map, 'airports-major', 'visible');
      setLayerVisibility(map, 'airports-regional', 'visible');
      setLayerVisibility(map, 'navaid-vor', 'visible');
      setLayerVisibility(map, 'navaid-ndb', 'visible');
      setLayerVisibility(map, 'airport-labels', 'visible');
      setLayerVisibility(map, 'navaid-labels', 'visible');
      setLayerVisibility(map, 'airspace-labels', 'visible');
    }
    else {
      // Very high zoom - all details including elevation
      setLayerVisibility(map, 'airports-major', 'visible');
      setLayerVisibility(map, 'airports-regional', 'visible');
      setLayerVisibility(map, 'navaid-vor', 'visible');
      setLayerVisibility(map, 'navaid-ndb', 'visible');
      setLayerVisibility(map, 'airport-labels', 'visible');
      setLayerVisibility(map, 'airport-elevation', 'visible');
      setLayerVisibility(map, 'navaid-labels', 'visible');
      setLayerVisibility(map, 'airspace-labels', 'visible');
    }
  });
};

// Helper function for layer visibility
const setLayerVisibility = (map, layerId, visibility) => {
  if (map.getLayer(layerId)) {
    map.setLayoutProperty(layerId, 'visibility', visibility);
  }
};

// OpenAIP-style click interactions
export const setupOpenAipInteractions = (map) => {
  // Airport click handler
  ['airports-major', 'airports-regional'].forEach(layerId => {
    map.on('click', layerId, (e) => {
      const props = e.features[0].properties;
      showOpenAipPopup(map, e.lngLat, 'airport', props);
    });
    
    // Hover effects
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });
  
  // Navaid click handler
  ['navaid-vor', 'navaid-ndb'].forEach(layerId => {
    map.on('click', layerId, (e) => {
      const props = e.features[0].properties;
      const type = layerId.includes('vor') ? 'VOR' : 'NDB';
      showOpenAipPopup(map, e.lngLat, 'navaid', props, type);
    });
    
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    
    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });
  
  // Airspace click handler
  ['class-b-fill', 'class-c-fill', 'class-d-fill', 'prohibited-fill', 'restricted-fill', 'danger-fill'].forEach(layerId => {
    map.on('click', layerId, (e) => {
      const props = e.features[0].properties;
      showOpenAipPopup(map, e.lngLat, 'airspace', props);
    });
  });
};

// OpenAIP-style popup (matches their design)
const showOpenAipPopup = (map, lngLat, type, properties, subtype = '') => {
  let content = '';
  
  if (type === 'airport') {
    content = `
      <div class="openaip-popup">
        <div class="popup-header" style="background: #0066CC; color: white; padding: 8px; font-weight: bold;">
          ${properties.icao || properties.identifier || 'Airport'}
        </div>
        <div class="popup-content" style="padding: 12px;">
          <h4 style="margin: 0 0 8px 0; color: #003366;">${properties.name || 'Unknown Airport'}</h4>
          <div class="airport-details">
            ${properties.elevation ? `<p><strong>Elevation:</strong> ${properties.elevation} ft AMSL</p>` : ''}
            ${properties.tower_frequency ? `<p><strong>Tower:</strong> ${properties.tower_frequency} MHz</p>` : ''}
            ${properties.atis_frequency ? `<p><strong>ATIS:</strong> ${properties.atis_frequency} MHz</p>` : ''}
            ${properties.ground_frequency ? `<p><strong>Ground:</strong> ${properties.ground_frequency} MHz</p>` : ''}
            <p><strong>Type:</strong> ${getAirportTypeText(properties.type)}</p>
            ${properties.runways ? `<p><strong>Runways:</strong> ${properties.runways.length}</p>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  else if (type === 'navaid') {
    content = `
      <div class="openaip-popup">
        <div class="popup-header" style="background: ${subtype === 'VOR' ? '#0066CC' : '#CC6600'}; color: white; padding: 8px; font-weight: bold;">
          ${properties.identifier || properties.name || subtype}
        </div>
        <div class="popup-content" style="padding: 12px;">
          <h4 style="margin: 0 0 8px 0; color: #003366;">${properties.name || 'Navigation Aid'}</h4>
          <div class="navaid-details">
            <p><strong>Type:</strong> ${subtype}</p>
            ${properties.frequency ? `<p><strong>Frequency:</strong> ${properties.frequency} MHz</p>` : ''}
            ${properties.channel ? `<p><strong>Channel:</strong> ${properties.channel}</p>` : ''}
            ${properties.elevation ? `<p><strong>Elevation:</strong> ${properties.elevation} ft AMSL</p>` : ''}
            ${properties.range ? `<p><strong>Range:</strong> ${properties.range} nm</p>` : ''}
          </div>
        </div>
      </div>
    `;
  }
  else if (type === 'airspace') {
    content = `
      <div class="openaip-popup">
        <div class="popup-header" style="background: #CC0000; color: white; padding: 8px; font-weight: bold;">
          ${properties.name || 'Airspace'}
        </div>
        <div class="popup-content" style="padding: 12px;">
          <div class="airspace-details">
            <p><strong>Class:</strong> ${getAirspaceClassText(properties.type)}</p>
            ${properties.upperLimit ? `<p><strong>Upper Limit:</strong> ${properties.upperLimit}</p>` : ''}
            ${properties.lowerLimit ? `<p><strong>Lower Limit:</strong> ${properties.lowerLimit}</p>` : ''}
            ${properties.frequency ? `<p><strong>Frequency:</strong> ${properties.frequency} MHz</p>` : ''}
            <p><strong>Type:</strong> ${getAirspaceTypeText(properties.type)}</p>
          </div>
        </div>
      </div>
    `;
  }
  
  new maplibregl.Popup({ closeOnClick: true })
    .setLngLat(lngLat)
    .setHTML(content)
    .addTo(map);
};

// Helper functions for text conversion
const getAirportTypeText = (type) => {
  const types = {
    1: 'Major Airport (Towered)',
    'INTL_APT': 'International Airport',
    'MAJOR': 'Major Airport',
    'REGIONAL': 'Regional Airport',
    'PRIVATE': 'Private Airport'
  };
  return types[type] || 'Airport';
};

const getAirspaceClassText = (type) => {
  const classes = {
    1: 'Class B', 2: 'Class C', 3: 'Restricted', 4: 'Danger', 5: 'Prohibited',
    'CLASS_B': 'Class B', 'CLASS_C': 'Class C', 'CLASS_D': 'Class D',
    'CTR': 'Control Zone', 'TMA': 'Terminal Control Area'
  };
  return classes[type] || 'Unknown';
};

const getAirspaceTypeText = (type) => {
  const types = {
    1: 'Controlled Airspace', 2: 'Controlled Airspace',
    3: 'Special Use - Restricted', 4: 'Special Use - Danger', 5: 'Special Use - Prohibited',
    'P': 'Prohibited Area', 'R': 'Restricted Area', 'DANGER': 'Danger Area'
  };
  return types[type] || 'Airspace';
};

// Test function for OpenAIP map
export const testOpenAipMap = (map) => {
  // Fly to Dallas area with rich airspace for testing
  map.flyTo({
    center: [-96.8, 32.8], // Dallas area
    zoom: 10,
    duration: 2000
  });
  
  console.log('✈️ Flying to Dallas area to test OpenAIP map features');
  console.log('🎯 Look for Class B airspace (blue), airports, and navigation aids');
  console.log('🔍 Click on airports and navaids for detailed information');
};
