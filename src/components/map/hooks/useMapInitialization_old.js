import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { createAuthenticOpenAipStyle } from '../utils/openAipAuthenticStyle';
import { addOpenAipSymbols, createCanvasSymbols } from '../utils/openAipSymbols';
import { debugOpenAipTiles } from '../utils/debugOpenAip';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
const OPENAIP_KEY = import.meta.env.VITE_OPENAIP_API_KEY;

// Feature flag to control OpenAIP integration
// Set to false to use existing working setup, true to try OpenAIP
const ENABLE_OPENAIP_INTEGRATION = true;

// Enhanced aeronautical styling function
function applyAeronauticalStyling(map) {
  console.log('🎨 Applying enhanced aeronautical styling...');
  
  // Get all current layers to see what we're working with
  const allLayers = map.getStyle().layers;
  console.log('🔍 Available layers for styling:');
  allLayers.forEach(layer => {
    if (layer.source === 'openaip-data' || layer.source === 'openaip-tiles') {
      console.log(`  - ${layer.id} (${layer.type}) from ${layer.source}`);
    }
  });
  
  // Apply styling to all OpenAIP layers dynamically
  allLayers.forEach(layer => {
    if (layer.source === 'openaip-data' || layer.source === 'openaip-tiles') {
      const layerId = layer.id;
      
      try {
        // Style airspace layers
        if (layerId.toLowerCase().includes('airspace')) {
          if (layer.type === 'fill') {
            map.setPaintProperty(layerId, 'fill-opacity', 0.3);
            map.setPaintProperty(layerId, 'fill-color', [
              'case',
              ['==', ['get', 'type'], 'CTR'], '#ff0000',
              ['==', ['get', 'type'], 'TMA'], '#ff4444', 
              ['==', ['get', 'type'], 'CTA'], '#ff6666',
              '#ff8888'
            ]);
          } else if (layer.type === 'line') {
            map.setPaintProperty(layerId, 'line-color', '#cc0000');
            map.setPaintProperty(layerId, 'line-width', 2);
            map.setPaintProperty(layerId, 'line-opacity', 0.8);
          }
        }
        
        // Style airport layers
        else if (layerId.toLowerCase().includes('airport')) {
          if (layer.type === 'circle') {
            map.setPaintProperty(layerId, 'circle-radius', [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 4,
              10, 8,
              15, 12
            ]);
            map.setPaintProperty(layerId, 'circle-color', '#0066cc');
            map.setPaintProperty(layerId, 'circle-stroke-color', '#003366');
            map.setPaintProperty(layerId, 'circle-stroke-width', 2);
          } else if (layer.type === 'symbol') {
            // Make airport labels more visible
            map.setPaintProperty(layerId, 'text-color', '#003366');
            map.setPaintProperty(layerId, 'text-halo-color', '#ffffff');
            map.setPaintProperty(layerId, 'text-halo-width', 1);
          }
        }
        
        // Style navigation aid layers
        else if (layerId.toLowerCase().includes('navaid') || layerId.toLowerCase().includes('nav_aid')) {
          if (layer.type === 'circle') {
            map.setPaintProperty(layerId, 'circle-radius', 6);
            map.setPaintProperty(layerId, 'circle-color', '#00cc00');
            map.setPaintProperty(layerId, 'circle-stroke-color', '#006600');
            map.setPaintProperty(layerId, 'circle-stroke-width', 2);
          } else if (layer.type === 'symbol') {
            map.setPaintProperty(layerId, 'text-color', '#006600');
            map.setPaintProperty(layerId, 'text-halo-color', '#ffffff');
            map.setPaintProperty(layerId, 'text-halo-width', 1);
          }
        }
        
        // Style obstacle layers
        else if (layerId.toLowerCase().includes('obstacle')) {
          if (layer.type === 'circle') {
            map.setPaintProperty(layerId, 'circle-radius', 4);
            map.setPaintProperty(layerId, 'circle-color', '#ff6600');
            map.setPaintProperty(layerId, 'circle-stroke-color', '#cc3300');
            map.setPaintProperty(layerId, 'circle-stroke-width', 1);
          }
        }
        
        // Style waypoint layers
        else if (layerId.toLowerCase().includes('waypoint')) {
          if (layer.type === 'circle') {
            map.setPaintProperty(layerId, 'circle-radius', 3);
            map.setPaintProperty(layerId, 'circle-color', '#9900cc');
            map.setPaintProperty(layerId, 'circle-stroke-color', '#660099');
            map.setPaintProperty(layerId, 'circle-stroke-width', 1);
          }
        }
        
        console.log(`✅ Applied styling to ${layerId}`);
      } catch (err) {
        console.warn(`⚠️ Could not style layer ${layerId}:`, err);
      }
    }
  });
  
  console.log('✅ Enhanced aeronautical styling applied');
}

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

        // Handle map load
        map.once('load', () => {
          console.log('✅ Map loaded successfully');
          
          if (ENABLE_OPENAIP_INTEGRATION) {
            // Add OpenAIP symbols and interactions
            addOpenAipSymbols(map);
            createCanvasSymbols(map);
            setupOpenAipInteractions(map);
            
            // Add debugging tools
            debugOpenAipTiles(map);
          }
          
          // Add controls
          map.addControl(new maplibregl.NavigationControl(), 'top-right');
          map.addControl(new maplibregl.ScaleControl({
            maxWidth: 200,
            unit: 'metric'
          }), 'bottom-left');

          setMapLoaded(true);
        });

        // Handle errors - ignore sprite errors
        map.on('error', (e) => {
          const errorMessage = e.error?.message || '';
          
          // Ignore sprite-related errors since we don't use sprites
          if (errorMessage.includes('sprite') || 
              errorMessage.includes('image') ||
              errorMessage.includes('mismatched image size')) {
            console.log('🔇 Ignoring sprite/image error (not using sprites):', errorMessage);
            return;
          }
          
          console.error('❌ Map error:', e.error);
          setError(errorMessage);
        });

        // Add debugging for tile loading
        map.on('sourcedata', (e) => {
          if (e.sourceId === 'openaip' && e.isSourceLoaded) {
            console.log('📡 OpenAIP source loaded');
            
            // Debug tile loading
            const source = map.getSource('openaip');
            if (source && source._tiles) {
              const tileCount = Object.keys(source._tiles).length;
              console.log(`🔍 OpenAIP tiles loaded: ${tileCount}`);
              
              // Log source layers from first tile
              Object.values(source._tiles).forEach((tile, index) => {
                if (tile.vectorTile && index === 0) {
                  const layers = Object.keys(tile.vectorTile.layers);
                  console.log('🎯 Available source layers:', layers);
                }
              });
            }
          }
        });

      } catch (err) {
        console.error('❌ Failed to initialize map:', err);
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
  }, [mapContainerRef, options]);

  return { map: mapRef.current, mapLoaded, error };
};

// Setup OpenAIP feature interactions
function setupOpenAipInteractions(map) {
  const interactiveLayers = [
    'airports-major',
    'airports-regional', 
    'airports-glider',
    'navaids-vor',
    'navaids-ndb',
    'airspace-ctr-fill',
    'airspace-d-fill',
    'airspace-prohibited-fill',
    'airspace-restricted-fill',
    'airspace-danger-fill'
  ];

  // Add hover effects
  interactiveLayers.forEach(layerId => {
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });
  });

  // Handle feature clicks
  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: interactiveLayers
    });

    if (features.length === 0) return;

    const feature = features[0];
    const properties = feature.properties;
    const layerId = feature.layer.id;

    // Create popup content based on feature type
    let popupContent = createFeaturePopup(properties, layerId);

    if (popupContent) {
      new maplibregl.Popup({ closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(popupContent)
        .addTo(map);
    }
  });
}

// Create popup content for different feature types
function createFeaturePopup(properties, layerId) {
  if (layerId.includes('airports')) {
    return `
      <div class="p-3 min-w-[200px]">
        <h3 class="font-bold text-blue-600 mb-2 text-lg">
          ${properties.name || 'Airport'}
        </h3>
        ${properties.icao ? `<p class="mb-1"><span class="font-semibold">ICAO:</span> ${properties.icao}</p>` : ''}
        ${properties.iata ? `<p class="mb-1"><span class="font-semibold">IATA:</span> ${properties.iata}</p>` : ''}
        ${properties.elevation ? `<p class="mb-1"><span class="font-semibold">Elevation:</span> ${properties.elevation} ft</p>` : ''}
        ${properties.type ? `<p class="mb-1"><span class="font-semibold">Type:</span> ${properties.type}</p>` : ''}
      </div>
    `;
  }
  
  if (layerId.includes('navaids')) {
    const typeColors = {
      'VOR': '#0066CC',
      'VORDME': '#0066CC', 
      'VORTAC': '#0066CC',
      'NDB': '#FF6600'
    };
    const color = typeColors[properties.type] || '#666666';
    
    return `
      <div class="p-3 min-w-[200px]">
        <h3 class="font-bold mb-2 text-lg" style="color: ${color};">
          ${properties.ident || properties.name || 'Navaid'}
        </h3>
        ${properties.type ? `<p class="mb-1"><span class="font-semibold">Type:</span> ${properties.type}</p>` : ''}
        ${properties.frequency ? `<p class="mb-1"><span class="font-semibold">Frequency:</span> ${properties.frequency} MHz</p>` : ''}
        ${properties.elevation ? `<p class="mb-1"><span class="font-semibold">Elevation:</span> ${properties.elevation} ft</p>` : ''}
      </div>
    `;
  }
  
  if (layerId.includes('airspace')) {
    const typeColors = {
      'CTR': '#FF0000',
      'D': '#0000FF', 
      'P': '#8B0000',
      'R': '#FF8C00',
      'DANGER': '#FF0000'
    };
    const color = typeColors[properties.type] || '#666666';
    
    return `
      <div class="p-3 min-w-[200px]">
        <h3 class="font-bold mb-2 text-lg" style="color: ${color};">
          ${properties.name || 'Airspace'}
        </h3>
        ${properties.type ? `<p class="mb-1"><span class="font-semibold">Class:</span> ${properties.type}</p>` : ''}
        ${properties.upperLimit ? `<p class="mb-1"><span class="font-semibold">Upper:</span> ${properties.upperLimit}</p>` : ''}
        ${properties.lowerLimit ? `<p class="mb-1"><span class="font-semibold">Lower:</span> ${properties.lowerLimit}</p>` : ''}
      </div>
    `;
  }
  
  return null;
}
