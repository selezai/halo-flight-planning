/**
 * Safe OpenAIP layer addition without changing the base map style
 * This approach adds OpenAIP data layers on top of the existing map
 */

export const addOpenAipLayers = async (map, apiKey) => {
  try {
    console.log('🛩️ Adding OpenAIP layers safely...');
    
    // Add OpenAIP vector source
    if (!map.getSource('openaip')) {
      map.addSource('openaip', {
        type: 'vector',
        tiles: [`http://localhost:3001/api/tiles/{z}/{x}/{y}.pbf`],
        minzoom: 7,
        maxzoom: 14
      });
      console.log('✅ Added OpenAIP vector source');
      
      // Debug: Listen for source data to inspect actual source layers
      map.on('sourcedata', (e) => {
        if (e.sourceId === 'openaip' && e.isSourceLoaded) {
          console.log('🔍 OpenAIP source loaded, inspecting tiles...');
          const source = map.getSource('openaip');
          console.log('🔍 Source object:', source);
          
          if (source && source._tiles) {
            const tiles = Object.values(source._tiles);
            console.log(`📦 Found ${tiles.length} OpenAIP tiles`);
            
            // Inspect the first few tiles more thoroughly
            tiles.slice(0, 2).forEach((tile, index) => {
              console.log(`🔍 Tile ${index} structure:`, {
                hasData: !!tile.data,
                hasBuckets: !!tile.buckets,
                hasLayers: !!tile.layers,
                keys: Object.keys(tile)
              });
              
              // Check different possible locations for source layer info
              if (tile.buckets) {
                console.log(`🔍 Tile ${index} buckets:`, Object.keys(tile.buckets));
                Object.entries(tile.buckets).forEach(([key, bucket]) => {
                  console.log(`  Bucket '${key}':`, {
                    hasLayer: !!bucket.layer,
                    layerKeys: bucket.layer ? Object.keys(bucket.layer) : 'none'
                  });
                  if (bucket.layer && bucket.layer['source-layer']) {
                    console.log(`  ✅ Source layer found: '${bucket.layer['source-layer']}'`);
                  }
                });
              }
              
              if (tile.layers) {
                console.log(`🔍 Tile ${index} layers:`, Object.keys(tile.layers));
              }
              
              // Check if there's vector tile data
              if (tile.vectorTile) {
                console.log(`🔍 Tile ${index} vector tile layers:`, Object.keys(tile.vectorTile.layers || {}));
              }
            });
          }
        }
      });
    }

    // Add basic airport layer
    if (!map.getLayer('openaip-airports')) {
      map.addLayer({
        id: 'openaip-airports',
        type: 'circle',
        source: 'openaip',
        'source-layer': 'airports',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 4,
            10, 6,
            14, 10
          ],
          'circle-color': '#3a70b8',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.8
        }
      });
      console.log('✅ Added airports layer');
    }

    // Add airport labels
    if (!map.getLayer('openaip-airport-labels')) {
      map.addLayer({
        id: 'openaip-airport-labels',
        type: 'symbol',
        source: 'openaip',
        'source-layer': 'airports',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#003366',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1
        }
      });
      console.log('✅ Added airport labels');
    }

    // Add basic airspace layer
    if (!map.getLayer('openaip-airspaces')) {
      map.addLayer({
        id: 'openaip-airspaces',
        type: 'fill',
        source: 'openaip',
        'source-layer': 'airspaces',
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'type'], 'CTR'], 'rgba(255, 0, 0, 0.1)',
            ['==', ['get', 'type'], 'TMA'], 'rgba(58, 112, 184, 0.1)',
            'rgba(100, 100, 100, 0.05)'
          ],
          'fill-opacity': 0.6
        }
      });
      console.log('✅ Added airspaces layer');
    }

    // Add airspace outlines
    if (!map.getLayer('openaip-airspace-outlines')) {
      map.addLayer({
        id: 'openaip-airspace-outlines',
        type: 'line',
        source: 'openaip',
        'source-layer': 'airspaces',
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'type'], 'CTR'], '#ff0000',
            ['==', ['get', 'type'], 'TMA'], '#3a70b8',
            '#666666'
          ],
          'line-width': 2,
          'line-opacity': 0.8
        }
      });
      console.log('✅ Added airspace outlines');
    }

    // Add navaids layer
    if (!map.getLayer('openaip-navaids')) {
      map.addLayer({
        id: 'openaip-navaids',
        type: 'circle',
        source: 'openaip',
        'source-layer': 'navaids',
        paint: {
          'circle-radius': 5,
          'circle-color': [
            'case',
            ['==', ['get', 'type'], 'VOR'], '#8e44ad',
            ['==', ['get', 'type'], 'NDB'], '#d68910',
            '#27ae60'
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1
        }
      });
      console.log('✅ Added navaids layer');
    }

    // Wait for source data to be loaded, then inspect and add test layer
    setTimeout(() => {
      console.log('🔍 Starting detailed tile inspection...');
      
      // Try to query rendered features to see what's available
      const features = map.queryRenderedFeatures({
        layers: ['openaip-airports', 'openaip-airspaces', 'openaip-navaids']
      });
      console.log('🔍 Rendered features from OpenAIP layers:', features.length);
      
      // Try to get source layers from the source itself
      const source = map.getSource('openaip');
      if (source) {
        console.log('🔍 Source type:', source.type);
        console.log('🔍 Source tiles URL:', source.tiles);
        
        // Check if we can get source layers from the source
        if (source._options && source._options.tiles) {
          console.log('🔍 Source options:', source._options);
        }
        
        // Try a different approach - check the style for source layers
        const style = map.getStyle();
        if (style && style.sources && style.sources.openaip) {
          console.log('🔍 Style source definition:', style.sources.openaip);
        }
        
        // Check loaded tiles
        if (source._tiles) {
          const tiles = Object.values(source._tiles);
          console.log(`📦 Checking ${tiles.length} tiles for source layers...`);
          
          const sourceLayers = new Set();
          tiles.forEach((tile, index) => {
            console.log(`🔍 Tile ${index} state:`, {
              state: tile.state,
              hasVectorTile: !!tile.vectorTile,
              hasData: !!tile.data,
              keys: Object.keys(tile)
            });
            
            // Check vectorTile property which should contain the actual data
            if (tile.vectorTile && tile.vectorTile.layers) {
              const layerNames = Object.keys(tile.vectorTile.layers);
              console.log(`🔍 Tile ${index} vector layers:`, layerNames);
              layerNames.forEach(name => {
                sourceLayers.add(name);
                const layer = tile.vectorTile.layers[name];
                console.log(`  Layer '${name}': ${layer.length} features`);
              });
            } else if (tile.data) {
              console.log(`🔍 Tile ${index} has data but no vectorTile property`);
            }
          });
          
          console.log('🎯 Available source layers:', Array.from(sourceLayers));
          
          // Add a test layer with the first available source layer
          if (sourceLayers.size > 0 && !map.getLayer('openaip-test')) {
            const firstSourceLayer = Array.from(sourceLayers)[0];
            map.addLayer({
              id: 'openaip-test',
              type: 'circle',
              source: 'openaip',
              'source-layer': firstSourceLayer,
              paint: {
                'circle-radius': 8,
                'circle-color': '#ff0000',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2,
                'circle-opacity': 0.9
              }
            });
            console.log(`🔴 Added test layer using source-layer: '${firstSourceLayer}'`);
          } else {
            console.log('⚠️ No source layers found in tiles');
            
            // Let's try to manually inspect a tile URL to see if it's returning data
            console.log('🔍 Attempting to fetch a tile directly...');
            fetch('http://localhost:3001/api/tiles/7/67/44.pbf')
              .then(response => {
                console.log('🔍 Tile fetch response:', {
                  status: response.status,
                  contentType: response.headers.get('content-type'),
                  contentLength: response.headers.get('content-length')
                });
                return response.arrayBuffer();
              })
              .then(buffer => {
                console.log('🔍 Tile data size:', buffer.byteLength, 'bytes');
                if (buffer.byteLength === 0) {
                  console.log('⚠️ Tile is empty - no data from OpenAIP API');
                } else {
                  console.log('✅ Tile contains data - issue might be with parsing');
                }
              })
              .catch(error => {
                console.error('❌ Failed to fetch tile:', error);
              });
          }
        } else {
          console.log('⚠️ No tiles found in source');
        }
      }
    }, 3000);
    
    console.log('🎉 Successfully added all OpenAIP layers');
    return true;
  } catch (error) {
    console.error('❌ Failed to add OpenAIP layers:', error);
    return false;
  }
};

// Alternative: Add OpenAIP as PNG raster overlay (simplest approach)
export const addOpenAipPngOverlay = (map, apiKey) => {
  try {
    console.log('🛩️ Adding OpenAIP PNG overlay...');
    
    // Add OpenAIP PNG tiles as an overlay
    if (!map.getSource('openaip-png')) {
      map.addSource('openaip-png', {
        type: 'raster',
        tiles: [`https://a.api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${apiKey}`],
        tileSize: 256,
        minzoom: 7,
        maxzoom: 14
      });
    }
    
    if (!map.getLayer('openaip-png-layer')) {
      map.addLayer({
        id: 'openaip-png-layer',
        type: 'raster',
        source: 'openaip-png',
        paint: {
          'raster-opacity': 0.8 // Adjust transparency as needed
        }
      });
    }
    
    console.log('✅ Added OpenAIP PNG overlay');
    return true;
  } catch (error) {
    console.error('❌ Failed to add OpenAIP PNG overlay:', error);
    return false;
  }
};
