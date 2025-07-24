/**
 * Debug utility to inspect OpenAIP vector tiles and identify source layers
 */
export const debugOpenAipTiles = (map) => {
  if (!map) return;

  console.log('🔍 Starting OpenAIP tile debugging...');

  // Listen for source data events
  map.on('sourcedata', (e) => {
    if (e.sourceId === 'openaip' && e.isSourceLoaded) {
      const source = map.getSource('openaip');
      
      if (source && source._tiles) {
        const tiles = Object.values(source._tiles);
        console.log(`📊 Total OpenAIP tiles: ${tiles.length}`);
        
        tiles.forEach((tile, index) => {
          if (tile.vectorTile) {
            const layers = Object.keys(tile.vectorTile.layers);
            console.log(`🎯 Tile ${index} source layers:`, layers);
            
            // Count features in each layer
            layers.forEach(layerName => {
              const layer = tile.vectorTile.layers[layerName];
              const featureCount = layer.length;
              console.log(`  - ${layerName}: ${featureCount} features`);
              
              // Log first feature properties for inspection
              if (featureCount > 0) {
                const firstFeature = layer.feature(0);
                console.log(`    Sample properties:`, firstFeature.properties);
              }
            });
          }
        });
      }
    }
  });

  // Add a test button to manually trigger debugging
  const debugButton = document.createElement('button');
  debugButton.innerHTML = '🔍 Debug OpenAIP';
  debugButton.style.cssText = `
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1000;
    background: #fff;
    border: 1px solid #ccc;
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  debugButton.onclick = () => {
    const source = map.getSource('openaip');
    if (source) {
      console.log('🔍 Manual debug triggered');
      console.log('Source:', source);
      console.log('Tiles:', source._tiles);
      
      // Try to query features at map center
      const center = map.getCenter();
      const features = map.querySourceFeatures('openaip');
      console.log(`🎯 Features at center: ${features.length}`);
      
      if (features.length > 0) {
        console.log('Sample features:', features.slice(0, 5));
      }
    }
  };
  
  map.getContainer().appendChild(debugButton);
};

/**
 * Test different source layer names to find the correct ones
 */
export const testSourceLayers = (map) => {
  const possibleLayerNames = [
    'airports',
    'airport', 
    'airfield',
    'airfields',
    'airspaces',
    'airspace',
    'navaids',
    'navaid',
    'navigation',
    'openaip',
    'data',
    'features'
  ];

  possibleLayerNames.forEach(layerName => {
    try {
      map.addLayer({
        id: `test-${layerName}`,
        type: 'circle',
        source: 'openaip',
        'source-layer': layerName,
        paint: {
          'circle-radius': 5,
          'circle-color': '#ff0000'
        }
      });
      console.log(`✅ Test layer added: ${layerName}`);
    } catch (error) {
      console.log(`❌ Failed to add test layer: ${layerName}`, error.message);
    }
  });
};
