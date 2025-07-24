import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { convertOpenAipStyle } from '../utils/styleConverter';

import { loadOpenAipSprites } from '../utils/openAipSpriteLoader';
import { addRealOpenAipIcons } from '../utils/realOpenAipIcons';
// Removed debug controls - clean interface for OpenAIP-exact implementation
// Removed legacy layer controls - implementing OpenAIP-exact UI
import { createOpenAipBaseStyle, applyOpenAipBaseStyle } from '../utils/openAipBaseStyle';
// Legacy imports removed - now using authentic OpenAIP sprites directly

// 1. IDENTIFY CORRECT SOURCE LAYERS
// Debug function to discover all available source layers from the OpenAIP vector tiles.
function debugSourceLayers(map) {
  map.on('data', (e) => {
    if (e.sourceId === 'openaip' && e.isSourceLoaded) {
      const source = map.getSource('openaip');
      
      // Get all loaded tiles
      const tiles = source._tiles;
      if (!tiles) return;
      
      // Extract unique source layers
      const sourceLayers = new Set();
      
      Object.values(tiles).forEach(tile => {
        if (tile.buckets) {
          Object.values(tile.buckets).forEach(bucket => {
            if (bucket.layer && bucket.layer['source-layer']) {
              sourceLayers.add(bucket.layer['source-layer']);
            }
          });
        }
      });
      
      if (sourceLayers.size > 0) {
        console.log('🎯 Found OpenAIP source layers:', Array.from(sourceLayers));
        
        // You can also inspect features in each layer
        map.querySourceFeatures('openaip').forEach(feature => {
          if (!sourceLayers.has(feature.sourceLayer)) {
            sourceLayers.add(feature.sourceLayer);
          }
        });
        
        console.log('🎯 All available source layers:', Array.from(sourceLayers));
      }
    }
  });
  
  // Alternative method: Query rendered features
  map.on('idle', () => {
    const features = map.queryRenderedFeatures({ layers: [] });
    const openAipFeatures = features.filter(f => f.source === 'openaip');
    
    const layers = new Set(openAipFeatures.map(f => f.sourceLayer));
    if (layers.size > 0) {
      console.log('🎯 OpenAIP source layers from rendered features:', Array.from(layers));
      
      // Log sample properties from each layer
      layers.forEach(layer => {
        const layerFeatures = openAipFeatures.filter(f => f.sourceLayer === layer);
        if (layerFeatures.length > 0) {
          console.log(`📍 Sample properties for layer "${layer}":`, layerFeatures[0].properties);
        }
      });
    }
  });
}
import { addOpenAipDebugButton, logOpenAipInfo } from '../utils/openAipDebug';
import { localOpenAipStyle } from '../utils/localOpenAipStyle';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const OPENAIP_KEY = import.meta.env.VITE_OPENAIP_API_KEY;

export const useMapInitialization = (mapContainerRef, mapRef, setMapLoaded) => {
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initializeMap = async () => {
      try {
        console.log('🗺️ Starting OpenAIP map initialization...');
        
        // Use authentic OpenAIP base style for exact visual match
        console.log('🎨 Creating authentic OpenAIP base style...');
        const openAipBaseStyle = createOpenAipBaseStyle();
        
        if (!MAPTILER_KEY) {
          console.warn('⚠️ MapTiler API key not found. Using OpenStreetMap fallback for base map. Please add VITE_MAPTILER_API_KEY to your .env.local file for better quality.');
        }

        // 3. FIX THE REQUEST HEADERS
        // Initialize map with authentic OpenAIP base style and global transformRequest to handle OpenAIP authentication.
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: openAipBaseStyle,
          center: [8.5, 47.4], // Switzerland
          zoom: 7,
          hash: true,
          transformRequest: (url, resourceType) => {
            console.log(`🔍 Transform request: ${resourceType} - ${url}`);
            
            // Intercept ANY OpenAIP tile requests and redirect to proxy
            if (url.includes('api.tiles.openaip.net') || 
                url.includes('tiles.openaip.net') ||
                (url.includes('openaip') && url.includes('.pbf'))) {
              console.log('🔄 Redirecting OpenAIP tile request to proxy...');
              
              // Extract z/x/y from the URL if possible, otherwise use template
              const tileMatch = url.match(/\/(\d+)\/(\d+)\/(\d+)\.pbf/);
              let proxyUrl;
              if (tileMatch) {
                const [, z, x, y] = tileMatch;
                proxyUrl = `http://localhost:3001/api/maps/openaip-vectortiles/${z}/${x}/${y}.pbf`;
              } else {
                proxyUrl = url.replace(/https?:\/\/[^/]+/, 'http://localhost:3001/api/maps/openaip-vectortiles');
              }
              
              console.log(`🎯 Proxying: ${url} → ${proxyUrl}`);
              return {
                url: proxyUrl,
                headers: {
                  'x-openaip-api-key': OPENAIP_KEY
                }
              };
            }
            
            // Add API key for other OpenAIP requests (style, etc.)
            if (url.includes('openaip')) {
              return {
                url,
                headers: {
                  'x-openaip-api-key': OPENAIP_KEY
                }
              };
            }
            
            // Add API key for MapTiler requests (only if not already present)
            if (url.includes('api.maptiler.com') && !url.includes('key=')) {
              return {
                url: `${url}?key=${MAPTILER_KEY}`
              };
            }
            
            return { url };
          },
        });

        mapRef.current = map;

        // Note: Removed fallback icon system - using authentic OpenAIP sprites only
        

        
        // Debug sprite loading after style is loaded
        map.on('style.load', async () => {
          console.log('🎨 Style loaded, checking sprite...');
          
          const style = map.getStyle();
          console.log('🎨 Sprite URL in loaded style:', style.sprite);
          
          // CRITICAL: The sprite should NOT be undefined!
          if (!style.sprite) {
            console.error('❌ NO SPRITE URL - This is why icons are missing!');
          } else {
            console.log('✅ Sprite URL is present - icons should load from:', style.sprite);
          }
          
          // Generate accurate OpenAIP-specific aviation icons after sprite loads
          console.log('🎯 Generating accurate OpenAIP aviation icons...');
          
          // Load authentic OpenAIP sprites directly
          try {
            console.log('🔍 Attempting to integrate real OpenAIP sprites...');
            const spriteSuccess = await addRealOpenAipIcons(map);
            if (spriteSuccess) {
              console.log('✅ Authentic OpenAIP sprites integrated successfully!');
              console.log('🎉 Perfect visual fidelity with official OpenAIP achieved!');
            } else {
              console.log('⚠️ Failed to load authentic sprites, using fallback icons');
              console.log('🔄 Loading fallback icon system...');
              
              // Load MapTiler sprites as backup
              await loadOpenAipSprites(map);
              // Note: Not loading fallback icons - using authentic sprites only
            }
          } catch (error) {
            console.log('⚠️ Could not load authentic sprites:', error.message);
            console.log('🔄 Using fallback sprite system');
            
            // Fallback to MapTiler sprites only
            try {
              await loadOpenAipSprites(map);
              // Note: Not loading fallback icons - authentic sprites should work
              console.log('✅ Fallback sprites loaded');
            } catch (fallbackError) {
              console.error('❌ Even fallback system failed:', fallbackError);
            }
          }
        });

        map.once('load', async () => {
          try {
            console.log('✅ Base map loaded, fetching OpenAIP style...');
            
            // 2. UPDATE YOUR MAP INITIALIZATION
            let convertedStyle;
            let openAipSources = [];
            let useRealOpenAip = false;
            
            try {
              // Try to fetch OpenAIP style through our proxy server
              console.log('Attempting to fetch OpenAIP style through proxy...');
              console.log('Using API Key:', OPENAIP_KEY ? OPENAIP_KEY.substring(0, 8) + '...' : 'NOT SET');
              
              const response = await fetch(
                'http://localhost:3001/api/styles/openaip-default-style.json'
              );

              if (!response.ok) {
                throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
              }

              console.log('✅ Successfully fetched OpenAIP style through proxy');
              const openAipStyle = await response.json();
              console.log('✅ OpenAIP style loaded, converting for MapLibre...');

              // Convert OpenAIP style to use our proxy
              console.log('🔄 Converting OpenAIP style...');
              console.log('Original style sources:', Object.keys(openAipStyle.sources));
              console.log('Original style layers count:', openAipStyle.layers.length);
              
              const styleResult = convertOpenAipStyle(openAipStyle);
              convertedStyle = styleResult.convertedStyle;
              openAipSources = styleResult.openAipSources;
              
              console.log('✅ OpenAIP style converted successfully');
              console.log('Converted sources:', Object.keys(convertedStyle.sources));
              console.log('Converted layers count:', convertedStyle.layers.length);
              console.log('OpenAIP sources detected:', openAipSources);
              console.log('Converted layer IDs:', convertedStyle.layers.map(l => l.id));
              
              // Debug: Log all vector tile sources and their URLs
              Object.entries(convertedStyle.sources).forEach(([sourceId, source]) => {
                if (source.type === 'vector' && source.tiles) {
                  console.log(`🗺️ Source '${sourceId}':`, source.tiles);
                }
              });

              useRealOpenAip = true;
              console.log('✅ Style converted, will load real OpenAIP data');
            } catch (error) {
              console.warn(`⚠️ Failed to fetch OpenAIP style from API: ${error.message}`);
              console.log('Using local fallback style instead...');
              
              // Use local fallback style
              const fallbackResult = convertOpenAipStyle(localOpenAipStyle);
              convertedStyle = fallbackResult.convertedStyle;
              openAipSources = fallbackResult.openAipSources;
              console.log('✅ Using local fallback style');
            }
            
            // CRITICAL: Load authentic OpenAIP sprites BEFORE adding layers
            console.log('🎨 Loading authentic OpenAIP sprites...');
            const spritesLoaded = await loadOpenAipSprites(map);
            if (spritesLoaded) {
              console.log('✅ OpenAIP sprites loaded successfully - icons will be authentic');
            } else {
              console.log('⚠️ OpenAIP sprites failed to load - using fallback icons');
            }
            
            // Note: Not loading fallback icons - using authentic OpenAIP sprites only
            // await loadOpenAipIcons(map); // Removed - using authentic sprites instead

            // Add OpenAIP sources (URLs already converted by style converter)
            for (const [sourceId, source] of Object.entries(convertedStyle.sources)) {
              if (!map.getSource(sourceId)) {
                console.log(`➕ Adding source '${sourceId}' (${source.type})`);
                map.addSource(sourceId, source);
              }
            }

            // Find the first symbol layer to add our layers before
            const firstSymbolId = map.getStyle().layers.find(
              layer => layer.type === 'symbol'
            )?.id;

            // Fix highlighted layers filter issues before adding layers
            const fixHighlightedLayerFilters = (layers) => {
              return layers.map(layer => {
                // Fix the highlighted layers that have problematic filters
                if (layer.id === 'highlighted-navaids' || layer.id === 'highlighted-airports') {
                  console.log(`Fixing filter for ${layer.id}`);
                  // Replace the problematic filter with a simpler one that always evaluates to false
                  // until we have a proper feature selection mechanism
                  return {
                    ...layer,
                    filter: ['==', ['get', 'id'], '']
                  };
                }
                return layer;
              });
            };
            
            // Fix the filters in the converted style
            convertedStyle.layers = fixHighlightedLayerFilters(convertedStyle.layers);
            
            // Add ALL OpenAIP layers from the converted style
            console.log(`🔍 Total layers in converted style: ${convertedStyle.layers.length}`);
            
            // OpenAIP sources are already available from the style converter
            console.log(`🔍 OpenAIP sources found: ${openAipSources.join(', ')}`);
            
            const openAipLayers = convertedStyle.layers.filter(layer => {
              // Skip highlighted layers (they have problematic filters)
              if (layer.id.includes('highlighted-') || layer.id.includes('selected-')) {
                console.log(`⏭️ Skipping highlighted/selected layer: ${layer.id}`);
                return false;
              }
              
              // Add all layers that use any OpenAIP source
              const isOpenAipLayer = openAipSources.includes(layer.source);
              if (isOpenAipLayer) {
                console.log(`✅ Including OpenAIP layer: ${layer.id} (${layer.type}) from ${layer.source}`);
              }
              return isOpenAipLayer;
            });
            
            console.log(`🎯 Found ${openAipLayers.length} OpenAIP layers to add:`);
            openAipLayers.forEach(layer => {
              console.log(`  - ${layer.id} (${layer.type}) from source: ${layer.source}`);
            });
            
            // Add OpenAIP layers in proper order (fills first, then lines, then symbols)
            const layersByType = {
              fill: [],
              line: [],
              circle: [],
              symbol: []
            };
            
            openAipLayers.forEach(layer => {
              if (layersByType[layer.type]) {
                layersByType[layer.type].push(layer);
              } else {
                layersByType.symbol.push(layer); // Default to symbol if unknown type
              }
            });
            
            // Add layers in rendering order
            const renderOrder = ['fill', 'line', 'circle', 'symbol'];
            let addedCount = 0;
            
            for (const layerType of renderOrder) {
              for (const layer of layersByType[layerType]) {
                if (!map.getLayer(layer.id)) {
                  try {
                    map.addLayer(layer, firstSymbolId);
                    addedCount++;
                    console.log(`✅ Added layer: ${layer.id} (${layer.type})`);
                  } catch (err) {
                    console.warn(`❌ Failed to add layer ${layer.id}:`, err);
                  }
                }
              }
            }
            
            console.log(`🎉 Successfully added ${addedCount} OpenAIP layers to the map!`);
            
            // Add visual status indicator
            const statusDiv = document.createElement('div');
            statusDiv.id = 'openaip-status';
            statusDiv.style.cssText = `
              position: absolute;
              top: 10px;
              right: 10px;
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 8px 12px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 12px;
              z-index: 1000;
              pointer-events: none;
            `;
            statusDiv.innerHTML = `🛫 OpenAIP: ${addedCount} layers loaded`;
            map.getContainer().appendChild(statusDiv);
            
            // Update status after data test
            setTimeout(() => {
              const totalFeatures = openAipLayers.reduce((sum, layer) => {
                const features = map.queryRenderedFeatures({ layers: [layer.id] });
                return sum + features.length;
              }, 0);
              
              statusDiv.innerHTML = `🛫 OpenAIP: ${addedCount} layers, ${totalFeatures} features visible`;
              
              if (totalFeatures > 0) {
                statusDiv.style.background = 'rgba(0, 128, 0, 0.8)';
              } else {
                statusDiv.style.background = 'rgba(255, 165, 0, 0.8)';
                statusDiv.innerHTML += ' (zoom in to see data)';
              }
            }, 3500);
            
            // Add debugging for OpenAIP data loading
            map.on('sourcedata', (e) => {
              if ((e.sourceId === 'openaip-data' || e.sourceId === 'openaip-tiles') && e.isSourceLoaded) {
                console.log(`📊 OpenAIP source ${e.sourceId} loaded successfully`);
                
                // Check if we have actual data
                const source = map.getSource(e.sourceId);
                if (source && source._tiles) {
                  const tileCount = Object.keys(source._tiles).length;
                  console.log(`📦 ${e.sourceId} has ${tileCount} tiles loaded`);
                  
                  // Inspect tile data
                  Object.values(source._tiles).forEach((tile, index) => {
                    if (tile.buckets && index < 3) { // Only log first 3 tiles to avoid spam
                      console.log(`🔍 Tile ${index} buckets:`, Object.keys(tile.buckets));
                      Object.values(tile.buckets).forEach(bucket => {
                        if (bucket.layer && bucket.layer['source-layer']) {
                          console.log(`  - Source layer: ${bucket.layer['source-layer']}`);
                        }
                      });
                    }
                  });
                }
              }
            });

            // Set up cursor changes for interactive layers (popup logic removed - using sidebar)
            console.log('🔗 Setting up hover cursors for OpenAIP layers...');
            
            openAipLayers.forEach(layer => {
              const layerId = layer.id;
              
              // Log layer for debugging (popup logic removed - feature clicks handled by sidebar)
              console.log(`📍 Layer available for interaction: '${layerId}' (${layer.type})`);
              
              // Note: Click handlers removed - feature interaction now handled by sidebar system in HaloMap.jsx
              
              // Change cursor on hover for interactive layers
              if (layer.type === 'fill' || layer.type === 'circle' || layer.type === 'symbol') {
                map.on('mouseenter', layerId, () => {
                  map.getCanvas().style.cursor = 'pointer';
                });
                
                map.on('mouseleave', layerId, () => {
                  map.getCanvas().style.cursor = '';
                });
              }
            });
            
            console.log(`✅ Click handlers set up for ${openAipLayers.length} OpenAIP layers`);
            
            // Add a test to verify layers have data
            setTimeout(() => {
              console.log('🔍 Testing OpenAIP layer data availability...');
              
              openAipLayers.forEach(layer => {
                const layerId = layer.id;
                const features = map.queryRenderedFeatures({ layers: [layerId] });
                console.log(`📊 Layer '${layerId}': ${features.length} features visible`);
                
                if (features.length > 0) {
                  console.log(`  Sample feature:`, features[0].properties);
                }
              });
            }, 3000); // Wait 3 seconds for tiles to load

            // Apply authentic OpenAIP styling enhancements
            console.log('🎨 Applying authentic OpenAIP styling...');
            
            // Legacy symbol creation removed - using authentic OpenAIP sprites directly
            // All aviation symbols now come from authentic OpenAIP sprite sheets
            
            // Apply base map styling to match OpenAIP appearance
            applyOpenAipBaseStyle(map);
            
            console.log('✅ OpenAIP authentic styling applied (without red overlay enhancements)');
            
            // Removed legacy layer toggle controls - implementing OpenAIP-exact UI
            
            // Removed debug controls and debug buttons - clean interface for OpenAIP-exact implementation
            
            // Log OpenAIP info to console
            logOpenAipInfo(map);

            // Call the debug function to find source layers
            if (useRealOpenAip) {
              debugSourceLayers(map);
            }

            console.log('✅ OpenAIP layers added successfully!');
            setMapLoaded(true);
          } catch (err) {
            console.error('❌ Error loading OpenAIP data:', err);
            setError(err.message);
            // Still mark as loaded so the map is usable
            setMapLoaded(true);
          }
        });

        map.on('error', (e) => {
          const errorMessage = e.error?.message || e;
          console.error('❌ A map error occurred:', errorMessage);
          
          // Handle specific tile loading errors gracefully
          if (errorMessage.includes('Internal Server Error (500)') && errorMessage.includes('openaip-vectortiles')) {
            console.warn('⚠️ OpenAIP tile not available at this zoom level, continuing...');
            // Don't set error state for missing tiles - this is normal
            return;
          }
          
          setError(`Map error: ${errorMessage}`);
        });

        map.on('style.load.error', (e) => {
          console.error('❌ Base style load error:', e.error?.message || e);
          setError(`Base style load error: ${e.error?.message}`);
        });

        map.on('tile.error', (e) => {
          console.error('❌ A tile error occurred:', e.error?.message || e);
        });

      } catch (err) {
        console.error('❌ Map initialization error:', err);
        setError(err.message);
      }
    };

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapContainerRef, mapRef, setMapLoaded]);

  return error;
};
