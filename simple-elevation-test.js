// Simple test to see what elevation data is actually in vector tiles
// Run this in browser console on the map page

function testVectorTileElevation() {
  console.log('🎯 TESTING VECTOR TILE ELEVATION DATA');
  
  const map = window.mapRef?.current;
  if (!map) {
    console.error('Map not found');
    return;
  }

  // Query all navaid features currently visible
  const features = map.querySourceFeatures('openaip', {
    sourceLayer: 'navaids'
  });

  console.log(`Found ${features.length} navaid features in vector tiles`);

  // Check first 10 features for elevation data
  features.slice(0, 10).forEach((feature, index) => {
    const props = feature.properties;
    console.log(`\n--- Navaid ${index + 1} ---`);
    console.log(`Name: ${props.name || 'Unknown'}`);
    console.log(`Identifier: ${props.identifier || props.ident || 'Unknown'}`);
    console.log(`Type: ${props.type || 'Unknown'}`);
    console.log(`Elevation: ${props.elevation || 'NOT IN VECTOR TILE'}`);
    console.log(`Frequency: ${props.frequency || 'NOT IN VECTOR TILE'}`);
    console.log(`Country: ${props.country || 'Unknown'}`);
    
    // Show ALL properties to see what's actually available
    console.log('ALL PROPERTIES:', Object.keys(props).sort());
    
    // Check for elevation in different property names
    const elevationFields = ['elevation', 'elev', 'altitude', 'alt', 'height', 'msl'];
    const foundElevation = elevationFields.find(field => props[field] !== undefined);
    if (foundElevation) {
      console.log(`✅ FOUND ELEVATION in field '${foundElevation}': ${props[foundElevation]}`);
    } else {
      console.log('❌ NO ELEVATION DATA in any common field');
    }
  });

  // Specifically look for LUXEUIL if available
  const luxeuil = features.find(f => 
    f.properties.identifier === 'LUL' || 
    f.properties.ident === 'LUL' ||
    f.properties.name?.includes('LUXEUIL')
  );

  if (luxeuil) {
    console.log('\n🎯 LUXEUIL FOUND IN VECTOR TILES:');
    console.log('Properties:', luxeuil.properties);
    console.log('Elevation:', luxeuil.properties.elevation || 'NOT AVAILABLE');
    console.log('Frequency:', luxeuil.properties.frequency || 'NOT AVAILABLE');
  } else {
    console.log('\n❌ LUXEUIL not found in current vector tile view');
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('Run testVectorTileElevation() in console to test elevation data');
} else {
  testVectorTileElevation();
}
