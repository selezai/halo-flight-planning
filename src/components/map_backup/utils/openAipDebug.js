/**
 * Debug utilities for OpenAIP map integration
 */

/**
 * Logs information about OpenAIP sources and layers
 * @param {maplibregl.Map} map - The MapLibre map instance
 */
export const logOpenAipInfo = (map) => {
  if (!map) return;
  
  const style = map.getStyle();
  
  console.group('🗺️ OpenAIP Map Debug Info');
  
  // Log sources
  console.group('📍 Sources');
  Object.entries(style.sources).forEach(([id, source]) => {
    console.log(`${id}: ${source.type}`);
    if (source.url) {
      console.log(`  URL: ${source.url}`);
    }
  });
  console.groupEnd();
  
  // Log layers by type
  console.group('📚 Layers by Type');
  const layersByType = {};
  style.layers.forEach(layer => {
    if (!layersByType[layer.type]) {
      layersByType[layer.type] = [];
    }
    layersByType[layer.type].push(layer.id);
  });
  
  Object.entries(layersByType).forEach(([type, layers]) => {
    console.log(`${type} (${layers.length}):`);
    layers.forEach(id => console.log(`  - ${id}`));
  });
  console.groupEnd();
  
  // Log OpenAIP specific layers
  console.group('✈️ OpenAIP Layers');
  const categories = {
    airports: style.layers.filter(l => l.id.includes('airport')),
    airspaces: style.layers.filter(l => l.id.includes('airspace')),
    navaids: style.layers.filter(l => l.id.includes('navaid')),
    waypoints: style.layers.filter(l => l.id.includes('waypoint')),
    obstacles: style.layers.filter(l => l.id.includes('obstacle'))
  };
  
  Object.entries(categories).forEach(([category, layers]) => {
    console.log(`${category} (${layers.length}):`);
    layers.forEach(layer => console.log(`  - ${layer.id}`));
  });
  console.groupEnd();
  
  console.groupEnd();
};

/**
 * Creates a debug button on the map
 * @param {maplibregl.Map} map - The MapLibre map instance
 */
export const addOpenAipDebugButton = (map) => {
  const debugButton = document.createElement('button');
  debugButton.textContent = '🐛 Debug OpenAIP';
  debugButton.style.cssText = `
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 1000;
    padding: 8px 16px;
    background: white;
    border: 2px solid #ccc;
    border-radius: 4px;
    cursor: pointer;
    font-family: sans-serif;
  `;
  
  debugButton.onclick = () => {
    logOpenAipInfo(map);
  };
  
  map.getContainer().appendChild(debugButton);
};
