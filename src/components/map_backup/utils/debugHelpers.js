/**
 * Debug helpers for OpenAIP map development
 */

export const debugMapLayers = (map) => {
  const layers = map.getStyle().layers;
  console.group('🗺️ Map Layers Debug');
  
  // Group layers by source
  const layersBySource = {};
  layers.forEach(layer => {
    const source = layer.source || 'no-source';
    if (!layersBySource[source]) {
      layersBySource[source] = [];
    }
    layersBySource[source].push(layer);
  });
  
  Object.entries(layersBySource).forEach(([source, sourceLayers]) => {
    console.group(`📍 Source: ${source} (${sourceLayers.length} layers)`);
    sourceLayers.forEach(layer => {
      console.log(`  - ${layer.id} (${layer.type})`);
    });
    console.groupEnd();
  });
  
  console.groupEnd();
};

export const debugOpenAipData = (map) => {
  console.group('✈️ OpenAIP Data Debug');
  
  // Check if composite source exists
  const compositeSource = map.getSource('composite');
  if (compositeSource) {
    console.log('✅ Composite source loaded');
  } else {
    console.error('❌ Composite source missing!');
  }
  
  // List all OpenAIP layers
  const openaipLayers = map.getStyle().layers.filter(layer => 
    layer.source === 'composite'
  );
  
  console.log(`Found ${openaipLayers.length} OpenAIP layers`);
  
  // Check for key layer types
  const layerTypes = {
    airports: openaipLayers.filter(l => l.id.includes('airport')).length,
    airspaces: openaipLayers.filter(l => l.id.includes('airspace')).length,
    navaids: openaipLayers.filter(l => l.id.includes('navaid')).length,
    waypoints: openaipLayers.filter(l => l.id.includes('waypoint')).length
  };
  
  console.table(layerTypes);
  console.groupEnd();
};

// Add debug controls to the map
export const addDebugControls = (map) => {
  // Add button to log layers
  const debugButton = document.createElement('button');
  debugButton.textContent = '🐛 Debug';
  debugButton.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
    padding: 8px 16px;
    background: white;
    border: 2px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
  `;
  
  debugButton.onclick = () => {
    debugMapLayers(map);
    debugOpenAipData(map);
  };
  
  map.getContainer().appendChild(debugButton);
};
