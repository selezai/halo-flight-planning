// Simple vector tile analysis script
const fs = require('fs');

// Read the tile as binary and look for layer names
const data = fs.readFileSync('test-tile.pbf');

// Convert to string to find readable layer names
const str = data.toString('binary');

// Extract potential layer names (simple pattern matching)
const layerNames = new Set();
const matches = str.match(/[a-z_]{3,20}/g);

if (matches) {
  matches.forEach(match => {
    // Filter for likely layer names
    if (match.length > 3 && match.includes('_') || 
        ['airports', 'navaids', 'airspaces', 'obstacles', 'hotspots'].includes(match)) {
      layerNames.add(match);
    }
  });
}

console.log('=== POTENTIAL LAYER NAMES IN VECTOR TILE ===');
console.log('Found layer names:', Array.from(layerNames).sort());

// Also check for specific aviation terms
const aviationTerms = ['airport', 'navaid', 'airspace', 'obstacle', 'hotspot', 'waypoint'];
aviationTerms.forEach(term => {
  if (str.includes(term)) {
    console.log(`✅ Found aviation term: ${term}`);
  }
});
