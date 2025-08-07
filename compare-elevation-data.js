// Test to compare elevation data between airports and navaids
// This will help us understand why airports show elevation but navaids don't

console.log('🔍 COMPARING ELEVATION DATA: AIRPORTS vs NAVAIDS');

// Test function to run in browser console
function compareElevationData() {
  // Try to find the map instance
  let map = null;
  
  // Check React DevTools for map reference
  if (window.React) {
    const reactFiber = document.querySelector('#root')._reactInternalInstance || 
                      document.querySelector('#root')._reactInternals;
    // Try to find map in React component tree
  }
  
  // Fallback: look for MapLibre instances
  const possibleMaps = [];
  for (let key in window) {
    if (window[key] && typeof window[key] === 'object' && window[key].getSource) {
      possibleMaps.push(window[key]);
    }
  }
  
  if (possibleMaps.length > 0) {
    map = possibleMaps[0];
  }
  
  if (!map) {
    console.error('❌ Could not find map instance');
    console.log('💡 Try clicking on an airport first, then run this test');
    return;
  }
  
  console.log('✅ Found map instance');
  
  try {
    // Get airport features
    const airports = map.querySourceFeatures('openaip', {
      sourceLayer: 'airports'
    });
    
    // Get navaid features  
    const navaids = map.querySourceFeatures('openaip', {
      sourceLayer: 'navaids'
    });
    
    console.log(`\n📊 Found ${airports.length} airports, ${navaids.length} navaids`);
    
    // Analyze first few airports
    console.log('\n--- AIRPORT ELEVATION DATA ---');
    airports.slice(0, 3).forEach((airport, i) => {
      const props = airport.properties;
      console.log(`${i+1}. ${props.name || 'Unknown'} (${props.icao || props.identifier})`);
      console.log(`   elevation: ${props.elevation}`);
      console.log(`   elevation.value: ${props.elevation?.value}`);
      console.log(`   elevation type: ${typeof props.elevation}`);
      console.log(`   All elevation-like props:`, Object.keys(props).filter(k => 
        k.toLowerCase().includes('elev') || k.toLowerCase().includes('alt') || k.toLowerCase().includes('height')
      ));
    });
    
    // Analyze first few navaids
    console.log('\n--- NAVAID ELEVATION DATA ---');
    navaids.slice(0, 3).forEach((navaid, i) => {
      const props = navaid.properties;
      console.log(`${i+1}. ${props.name || 'Unknown'} (${props.identifier || props.ident})`);
      console.log(`   elevation: ${props.elevation}`);
      console.log(`   elevation.value: ${props.elevation?.value}`);
      console.log(`   elevation type: ${typeof props.elevation}`);
      console.log(`   All elevation-like props:`, Object.keys(props).filter(k => 
        k.toLowerCase().includes('elev') || k.toLowerCase().includes('alt') || k.toLowerCase().includes('height')
      ));
    });
    
    // Look specifically for VESOUL FROTEY airport
    const vesoul = airports.find(a => 
      a.properties.name?.toUpperCase().includes('VESOUL') ||
      a.properties.icao === 'LFOW'
    );
    
    if (vesoul) {
      console.log('\n🎯 VESOUL FROTEY AIRPORT (the one showing 366m):');
      console.log('Properties:', vesoul.properties);
      console.log('Elevation data:', {
        elevation: vesoul.properties.elevation,
        elevationType: typeof vesoul.properties.elevation,
        elevationValue: vesoul.properties.elevation?.value,
        elevationUnit: vesoul.properties.elevation?.unit
      });
    }
    
    // Look for LUXEUIL navaid
    const luxeuil = navaids.find(n => 
      n.properties.identifier === 'LUL' || 
      n.properties.ident === 'LUL' ||
      n.properties.name?.toUpperCase().includes('LUXEUIL')
    );
    
    if (luxeuil) {
      console.log('\n🎯 LUXEUIL VOR (the one missing elevation):');
      console.log('Properties:', luxeuil.properties);
      console.log('Elevation data:', {
        elevation: luxeuil.properties.elevation,
        elevationType: typeof luxeuil.properties.elevation,
        elevationValue: luxeuil.properties.elevation?.value,
        elevationUnit: luxeuil.properties.elevation?.unit
      });
    }
    
    // Summary
    const airportsWithElevation = airports.filter(a => a.properties.elevation !== undefined).length;
    const navaidsWithElevation = navaids.filter(n => n.properties.elevation !== undefined).length;
    
    console.log('\n📈 SUMMARY:');
    console.log(`Airports with elevation: ${airportsWithElevation}/${airports.length}`);
    console.log(`Navaids with elevation: ${navaidsWithElevation}/${navaids.length}`);
    
    if (airportsWithElevation > 0 && navaidsWithElevation === 0) {
      console.log('🚨 CONCLUSION: Airports have elevation in vector tiles, navaids do NOT');
      console.log('💡 This explains why we need REST API for navaid elevation');
    } else if (navaidsWithElevation > 0) {
      console.log('✅ CONCLUSION: Both airports and navaids have elevation data');
      console.log('💡 We might be able to simplify our navaid logic');
    }
    
  } catch (error) {
    console.error('❌ Error analyzing features:', error);
  }
}

// Instructions
console.log('💡 To run this test:');
console.log('1. Make sure the map is loaded and showing the VESOUL/LUXEUIL area');
console.log('2. Run: compareElevationData()');
