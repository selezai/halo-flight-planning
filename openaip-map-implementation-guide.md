## Step 6: Handle OpenAIP's Authentic Sprites

OpenAIP uses MapTiler sprites with custom aviation icons. You need to load these properly:

```javascript
// Load authentic OpenAIP sprites
const loadOpenAipSprites = async (map) => {
  try {
    // Load sprite metadata and image
    const spriteJsonUrl = `${PROXY_BASE}/api/sprites/basic-v2.json`;
    const spriteImageUrl = `${PROXY_BASE}/api/sprites/basic-v2.png`;
    
    const response = await fetch(spriteJsonUrl);
    const spriteData = await response.json();
    
    // Load sprite image
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = spriteImageUrl;
    });
    
    // Extract individual icons
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    for (const [iconName, iconData] of Object.entries(spriteData)) {
      const { x, y, width, height, pixelRatio = 1 } = iconData;
      
      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(image, x, y, width, height, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      
      if (!map.hasImage(iconName)) {
        map.addImage(iconName, imageData, { pixelRatio });
      }
    }
    
    console.log('✅ OpenAIP sprites loaded');
  } catch (error) {
    console.error('Failed to load sprites:', error);
  }
};

// Call after style loads
map.on('style.load', () => {
  loadOpenAipSprites(map);
});
```# Comprehensive Guide: Implementing OpenAIP-Style Map Click Functionality with MapLibre GL

## Overview

This guide explains how to implement an interactive aviation map similar to OpenAIP, with click events that display detailed airport information in a sidebar. Based on your codebase analysis, the implementation uses MapLibre GL JS (not Mapbox) for the map interface and OpenAIP's vector tiles for aeronautical data.

## Prerequisites

1. **OpenAIP Account**: Sign up at [openaip.net](https://www.openaip.net) to get an API key
2. **MapTiler Account** (optional): For high-quality base map tiles - get a free key at [maptiler.com](https://www.maptiler.com)
3. **Proxy Server**: Required to handle CORS and authentication for OpenAIP tiles
4. **Basic knowledge** of JavaScript/React, HTML, and CSS

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Map Click     │────►│  Vector Tile     │────►│   REST API      │
│   Event         │     │  Properties      │     │   (Optional)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                          │
                                ▼                          ▼
                        ┌───────────────┐         ┌────────────────┐
                        │ Limited Props │         │ Full Airport   │
                        │ from MVT      │         │ Data via API   │
                        └───────────────┘         └────────────────┘
```

## Key Implementation Insights

Based on your code analysis:

1. **Vector Tiles Have Limited Data**: OpenAIP vector tiles (MVT format) contain only basic properties needed for rendering. Detailed information requires REST API calls.

2. **Proxy Server Required**: OpenAIP uses API key authentication that doesn't work well with browser CORS. You need a proxy server to handle authentication headers.

3. **Authentic Sprites**: OpenAIP uses MapTiler sprites as a base, with custom aviation icons. The sprite sheet contains 630 icons, 44 of which are aviation-specific.

4. **Layer Structure**: OpenAIP uses specific source layers: `airports`, `airspaces`, `navaids`, `obstacles`, `waypoints`, `hotspots`, `hang_glidings`, `rc_airfields`, `reporting_points`.

## Step 1: Set Up Your Proxy Server

Since OpenAIP requires API key authentication, you need a proxy server. Here's a simple Express.js proxy:

```javascript
// server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY;

// Proxy for vector tiles
app.get('/api/maps/openaip-vectortiles/:z/:x/:y.pbf', async (req, res) => {
  const { z, x, y } = req.params;
  try {
    const response = await axios.get(
      `https://api.tiles.openaip.net/api/data/openaip/${z}/${x}/${y}.pbf?apiKey=${OPENAIP_API_KEY}`,
      { responseType: 'arraybuffer' }
    );
    res.set('Content-Type', 'application/x-protobuf');
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Tile fetch failed');
  }
});

// Proxy for sprite files
app.get('/api/sprites/:file', async (req, res) => {
  const { file } = req.params;
  try {
    const url = `https://api.maptiler.com/maps/basic-v2/sprite/${file}?key=${MAPTILER_KEY}`;
    const response = await axios.get(url, { 
      responseType: file.endsWith('.png') ? 'arraybuffer' : 'json' 
    });
    res.set('Content-Type', file.endsWith('.png') ? 'image/png' : 'application/json');
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Sprite fetch failed');
  }
});

app.listen(3001, () => {
  console.log('Proxy server running on port 3001');
});
```

## Step 2: Initialize MapLibre GL Map with OpenAIP Layers

```javascript
// map.js
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const PROXY_BASE = 'http://localhost:3001';

// Initialize map with transform request for authentication
const map = new maplibregl.Map({
  container: 'map',
  style: {
    version: 8,
    sources: {
      // Base map tiles
      'base': {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      },
      // OpenAIP vector tiles via proxy
      'openaip-data': {
        type: 'vector',
        tiles: [`${PROXY_BASE}/api/maps/openaip-vectortiles/{z}/{x}/{y}.pbf`],
        minzoom: 4,
        maxzoom: 14
      }
    },
    sprite: `${PROXY_BASE}/api/sprites/basic-v2`,
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${MAPTILER_KEY}`,
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#f8f6f0' }
      },
      {
        id: 'base-map',
        type: 'raster',
        source: 'base',
        paint: { 'raster-opacity': 0.3 }
      }
    ]
  },
  center: [27.725556, -26.081667], // Krugersdorp
  zoom: 7
});
```

## Step 3: Add OpenAIP Layers After Map Loads

```javascript
map.on('load', async () => {
  // Add all OpenAIP layers - these match the exact layer IDs from OpenAIP
  const openAipLayers = [
    // Airports
    {
      id: 'airports',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'airports',
      layout: {
        'icon-image': 'apt-medium',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 14, 1.2],
        'text-field': ['get', 'name'],
        'text-font': ['Open Sans Regular'],
        'text-size': 12,
        'text-offset': [0, 1.2],
        'text-anchor': 'top'
      },
      paint: {
        'text-color': '#333',
        'text-halo-color': '#fff',
        'text-halo-width': 1
      }
    },
    // Airspaces
    {
      id: 'airspace-fill',
      type: 'fill',
      source: 'openaip-data',
      'source-layer': 'airspaces',
      paint: {
        'fill-color': [
          'match',
          ['get', 'type'],
          'CTR', 'rgba(255, 0, 0, 0.1)',
          'TMA', 'rgba(58, 112, 184, 0.1)',
          'D', 'rgba(0, 153, 0, 0.1)',
          'DANGER', 'rgba(255, 0, 0, 0.15)',
          'RESTRICTED', 'rgba(255, 0, 0, 0.12)',
          'rgba(128, 128, 128, 0.1)'
        ]
      }
    },
    // Navaids
    {
      id: 'navaids',
      type: 'symbol',
      source: 'openaip-data',
      'source-layer': 'navaids',
      layout: {
        'icon-image': ['concat', 'navaid_', ['get', 'type'], '-medium'],
        'text-field': ['get', 'ident'],
        'text-size': 10,
        'text-offset': [0, 1]
      }
    }
  ];

  // Add each layer
  for (const layer of openAipLayers) {
    if (!map.getLayer(layer.id)) {
      map.addLayer(layer);
    }
  }
});
```

## Step 4: Implement Click Handlers with Feature Detection

```javascript
// Feature detection utility based on your codebase
const detectFeatureType = (feature) => {
  const sourceLayer = feature.sourceLayer;
  const layerTypeMap = {
    'airports': 'airport',
    'airspaces': 'airspace',
    'navaids': 'navaid',
    'obstacles': 'obstacle',
    'waypoints': 'waypoint',
    'hotspots': 'hotspot',
    'hang_glidings': 'hang_gliding',
    'rc_airfields': 'rc_airfield',
    'reporting_points': 'reporting_point'
  };
  return layerTypeMap[sourceLayer] || null;
};

// Extract basic properties from vector tile
const extractFeatureProperties = (feature) => {
  const props = feature.properties;
  
  // Try multiple field variations OpenAIP might use
  return {
    id: props.id || props.identifier || props.icao_code || props.icao,
    name: props.name || props.nam || props.identifier,
    type: detectFeatureType(feature),
    sourceLayer: feature.sourceLayer,
    
    // Airport specific
    icaoCode: props.icao_code || props.icao || props.ident,
    iataCode: props.iata_code || props.iata,
    country: props.country || props.country_code || props.iso_country,
    elevation: props.elevation || props.elev || props.alt,
    
    // All raw properties for debugging
    _raw: props
  };
};

// Set up click handlers
map.on('click', (e) => {
  // Query all rendered features at click point
  const features = map.queryRenderedFeatures(e.point);
  
  // Filter for OpenAIP features
  const openAipFeatures = features.filter(f => 
    f.source === 'openaip-data' && f.sourceLayer
  );
  
  if (openAipFeatures.length > 0) {
    const feature = openAipFeatures[0];
    const extractedData = extractFeatureProperties(feature);
    
    console.log('Feature clicked:', extractedData);
    
    // Display in sidebar (simple version first)
    displayFeatureInfo(extractedData);
    
    // Optionally fetch detailed data from REST API
    if (extractedData.type === 'airport' && extractedData.icaoCode) {
      fetchDetailedAirportData(extractedData.icaoCode);
    }
  }
});
```

## Step 5: Display Feature Information in Sidebar

```javascript
// Simple display for vector tile data
const displayFeatureInfo = (feature) => {
  const sidebar = document.getElementById('sidebar');
  
  sidebar.innerHTML = `
    <div class="feature-info">
      <h2>${feature.name || 'Unknown Feature'}</h2>
      
      <div class="info-section">
        <h3>Basic Information</h3>
        <div class="info-row">
          <span class="label">Type:</span>
          <span class="value">${feature.type}</span>
        </div>
        ${feature.icaoCode ? `
        <div class="info-row">
          <span class="label">ICAO:</span>
          <span class="value">${feature.icaoCode}</span>
        </div>
        ` : ''}
        ${feature.country ? `
        <div class="info-row">
          <span class="label">Country:</span>
          <span class="value">${feature.country}</span>
        </div>
        ` : ''}
        ${feature.elevation ? `
        <div class="info-row">
          <span class="label">Elevation:</span>
          <span class="value">${feature.elevation} m</span>
        </div>
        ` : ''}
      </div>
      
      <div class="info-section">
        <h3>Raw Properties</h3>
        <pre style="font-size: 11px; overflow: auto;">
${JSON.stringify(feature._raw, null, 2)}
        </pre>
      </div>
    </div>
  `;
};

// Fetch and display detailed data (optional enhancement)
const fetchDetailedAirportData = async (icaoCode) => {
  try {
    const response = await fetch(
      `${PROXY_BASE}/api/openaip/airports?icao=${icaoCode}`
    );
    
    if (!response.ok) return;
    
    const data = await response.json();
    const airport = Array.isArray(data) ? data[0] : data;
    
    // Display OpenAIP format exactly like their sidebar
    displayOpenAipFormat(airport);
  } catch (error) {
    console.error('Failed to fetch detailed data:', error);
  }
};
```

## Step 7: Important Implementation Details

### Understanding Vector Tile Limitations

Vector tiles contain limited properties for performance. Common fields in OpenAIP tiles:

```javascript
// Airport properties typically available in vector tiles:
{
  id: "airport_123",
  name: "KRUGERSDORP",
  icao: "FAKR",
  type: "apt",
  country: "ZA",
  elevation: 1676,
  // Limited additional properties
}

// Full details require REST API call
```

### Handling Different Feature Types

```javascript
// Enhanced click handler for all feature types
map.on('click', (e) => {
  const features = map.queryRenderedFeatures(e.point);
  const openAipFeature = features.find(f => f.source === 'openaip-data');
  
  if (!openAipFeature) return;
  
  switch (openAipFeature.sourceLayer) {
    case 'airports':
      handleAirportClick(openAipFeature);
      break;
    case 'airspaces':
      handleAirspaceClick(openAipFeature);
      break;
    case 'navaids':
      handleNavaidClick(openAipFeature);
      break;
    // ... other feature types
  }
});
```

### Style Conversion for MapLibre

OpenAIP styles are designed for Mapbox GL. You need to convert them:

```javascript
const convertOpenAipStyle = (style) => {
  // Replace Mapbox sources with proxy URLs
  if (style.sources) {
    Object.entries(style.sources).forEach(([id, source]) => {
      if (source.tiles) {
        source.tiles = source.tiles.map(url => 
          url.includes('openaip') ? 
            url.replace(/https?:\/\/[^/]+/, PROXY_BASE + '/api/maps/openaip-vectortiles') : 
            url
        );
      }
    });
  }
  
  // Fix sprite URL
  if (style.sprite) {
    style.sprite = `${PROXY_BASE}/api/sprites/basic-v2`;
  }
  
  return style;
};
```

## Step 8: Complete Working Example

Here's a complete React component based on your architecture:

```javascript
// HaloMap.jsx - Simplified version
import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const HaloMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Initialize map
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createOpenAipStyle(),
      center: [27.725556, -26.081667],
      zoom: 7,
      transformRequest: (url) => {
        // Handle OpenAIP tile authentication
        if (url.includes('openaip')) {
          return {
            url: url.replace(
              /https?:\/\/[^/]+/,
              'http://localhost:3001/api/maps/openaip-vectortiles'
            )
          };
        }
        return { url };
      }
    });
    
    mapRef.current = map;
    
    // Set up click handler after map loads
    map.on('load', () => {
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point);
        const openAipFeature = features.find(f => 
          f.source === 'openaip-data' && f.sourceLayer
        );
        
        if (openAipFeature) {
          const featureData = extractFeatureData(openAipFeature);
          setSelectedFeature(featureData);
        }
      });
    });
    
    return () => map.remove();
  }, []);
  
  return (
    <div className="flex h-screen">
      <div ref={mapContainerRef} className="flex-1" />
      {selectedFeature && (
        <div className="w-96 p-4 bg-white shadow-lg overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">
            {selectedFeature.name || 'Unknown Feature'}
          </h2>
          <pre className="text-xs">
            {JSON.stringify(selectedFeature, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// Helper functions
const createOpenAipStyle = () => ({
  version: 8,
  sources: {
    'openaip-data': {
      type: 'vector',
      tiles: ['https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.pbf'],
      minzoom: 4,
      maxzoom: 14
    }
  },
  sprite: 'http://localhost:3001/api/sprites/basic-v2',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#f8f6f0' }
    }
    // Add OpenAIP layers here
  ]
});

const extractFeatureData = (feature) => {
  const props = feature.properties;
  return {
    type: feature.sourceLayer,
    name: props.name || props.identifier,
    icao: props.icao_code || props.icao,
    country: props.country,
    elevation: props.elevation,
    coordinates: feature.geometry?.coordinates,
    _raw: props
  };
};

export default HaloMap;
```

## Key Takeaways and Best Practices

### 1. **Vector Tiles vs REST API**
- **Vector tiles** provide basic properties for map rendering (name, type, id)
- **REST API** provides comprehensive details (frequencies, runways, services)
- Use vector tiles for initial display, REST API for detailed sidebar

### 2. **Authentication Strategy**
- OpenAIP requires API key in headers, which browsers can't send directly
- Proxy server is essential for production use
- Store API keys securely on server side

### 3. **Layer Organization**
OpenAIP uses these source layers:
- `airports` - All types of airports and airfields
- `airspaces` - CTR, TMA, restricted areas, etc.
- `navaids` - VOR, NDB, DME, TACAN
- `obstacles` - Towers, buildings, wind turbines
- `waypoints` - Navigation waypoints
- `hotspots` - Thermal hotspots for gliding
- `hang_glidings` - Hang gliding sites
- `rc_airfields` - RC model aircraft fields
- `reporting_points` - VFR reporting points

### 4. **Performance Optimization**
```javascript
// Implement feature caching
const featureCache = new Map();

const getCachedFeature = async (id) => {
  if (featureCache.has(id)) {
    return featureCache.get(id);
  }
  
  const data = await fetchDetailedData(id);
  featureCache.set(id, data);
  return data;
};

// Debounce rapid clicks
const debouncedClick = debounce(handleFeatureClick, 300);
```

### 5. **Error Handling**
```javascript
// Graceful fallbacks
const handleDataFetch = async (feature) => {
  try {
    // Try REST API first
    return await fetchFromAPI(feature.id);
  } catch (error) {
    console.warn('API failed, using vector tile data');
    // Fall back to vector tile properties
    return feature.properties;
  }
};
```

## Troubleshooting Common Issues

1. **CORS Errors**: Always use proxy server for OpenAIP requests
2. **Missing Icons**: Ensure sprites are loaded after style.load event
3. **Empty Click Results**: Check source-layer names match exactly
4. **Slow Performance**: Implement clustering for dense areas

## Resources

- [OpenAIP API Documentation](https://www.openaip.net/docs)
- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/)
- [OpenAIP GitHub Issues](https://github.com/openAIP) - Community discussions
- [MapTiler Sprites](https://docs.maptiler.com/sdk-js/api/sprites/) - Sprite documentation

## License Considerations

OpenAIP data is licensed under CC BY-NC 4.0:
- ✅ Free for non-commercial use
- ✅ Can be included in commercial apps (but data itself not sold)
- ❌ Cannot sell OpenAIP data exclusively
- ℹ️ Must provide attribution: "© OpenAIP contributors"

---

This implementation provides the foundation for OpenAIP-style map interactions. The key is understanding that vector tiles provide basic data for map display, while detailed information requires additional API calls. The proxy server handles authentication, and careful attention to layer names and sprite loading ensures a smooth user experience.