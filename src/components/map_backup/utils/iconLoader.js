/**
 * Loads OpenAIP icons as map images
 */

// Common aviation icons that OpenAIP uses
const OPENAIP_ICONS = [
  // Airports
  'airport-15',
  'airport-paved-15', 
  'airport-unpaved-15',
  'airport-heliport-15',
  'airport-closed-15',
  
  // Navaids
  'navaid-vor-15',
  'navaid-vordme-15',
  'navaid-vortac-15',
  'navaid-ndb-15',
  'navaid-tacan-15',
  
  // Waypoints
  'waypoint-15',
  'reportingpoint-15',
  
  // Airspace
  'airspace-prohibited-15',
  'airspace-restricted-15',
  'airspace-danger-15',
  
  // Other
  'obstacle-15',
  'hotspot-15'
];

/**
 * Loads all necessary OpenAIP icons into the map instance
 * @param {maplibregl.Map} map - The MapLibre map instance
 */
export const loadOpenAipIcons = async (map) => {
  console.log('🎨 Loading OpenAIP icons...');
  
  // Create all placeholder icons first to ensure we have something to display
  OPENAIP_ICONS.forEach(iconName => {
    if (!map.hasImage(iconName)) {
      createPlaceholderIcon(map, iconName);
    }
  });
  
  // Also create some generic symbols
  createGenericAviationSymbols(map);
  
  console.log('✅ Icon loading complete with placeholders');
  
  // Skip actual icon loading for now to avoid decode errors
  // The placeholders are sufficient for debugging the OpenAIP integration
  console.log('📝 Using placeholder icons only (actual icon loading disabled for debugging)');
  
  // TODO: Implement proper icon loading from OpenAIP CDN when proxy supports it
  // For now, the placeholder icons provide sufficient visual feedback
};

const loadIconFromUrl = (map, iconName, url) => {
  return new Promise((resolve, reject) => {
    map.loadImage(url, (error, image) => {
      if (error) {
        reject(error);
      } else {
        if (!map.hasImage(iconName)) {
          map.addImage(iconName, image, { sdf: true });
        }
        resolve();
      }
    });
  });
};

const createPlaceholderIcon = (map, iconName) => {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Determine icon type and color
  let color = '#0066CC'; // Default blue
  let symbol = '✈'; // Default plane
  
  if (iconName.includes('airport')) {
    color = '#0066CC';
    symbol = '✈';
  } else if (iconName.includes('navaid') || iconName.includes('vor')) {
    color = '#9B59B6';
    symbol = '◈';
  } else if (iconName.includes('ndb')) {
    color = '#E67E22';
    symbol = '◉';
  } else if (iconName.includes('waypoint')) {
    color = '#2ECC71';
    symbol = '△';
  } else if (iconName.includes('prohibited')) {
    color = '#E74C3C';
    symbol = 'P';
  } else if (iconName.includes('restricted')) {
    color = '#E74C3C';
    symbol = 'R';
  } else if (iconName.includes('danger')) {
    color = '#FF6600';
    symbol = 'D';
  } else if (iconName.includes('obstacle')) {
    color = '#F39C12';
    symbol = '⚠';
  }
  
  // Draw circle background
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, 2 * Math.PI);
  ctx.fill();
  
  // Draw border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Draw symbol
  ctx.fillStyle = color;
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, size/2, size/2);
  
  // Add to map
  const imageData = ctx.getImageData(0, 0, size, size);
  if (!map.hasImage(iconName)) {
    map.addImage(iconName, imageData);
  }
};

const createGenericAviationSymbols = (map) => {
  // Create pattern for restricted areas
  const restrictedPattern = createStripedPattern('#FF0000', 16);
  if (!map.hasImage('restricted-pattern')) {
    map.addImage('restricted-pattern', restrictedPattern);
  }
  
  // Create pattern for danger areas
  const dangerPattern = createStripedPattern('#FF6600', 16);
  if (!map.hasImage('danger-pattern')) {
    map.addImage('danger-pattern', dangerPattern);
  }
};

const createStripedPattern = (color, size) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, size, size);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.stroke();
  
  return ctx.getImageData(0, 0, size, size);
};
