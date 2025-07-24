/**
 * Creates an authentic OpenAIP style that works with MapLibre GL
 * This preserves the real OpenAIP visual appearance while fixing sprite issues
 */
export const createAuthenticOpenAipStyle = (apiKey) => {
  return {
    version: 8,
    name: "OpenAIP Authentic",
    // Remove sprite reference to avoid format errors
    // sprite: undefined, // Intentionally omitted
    
    // Use MapTiler for fonts (OpenAIP uses Mapbox fonts which we can't access)
    glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${apiKey}`,
    
    sources: {
      // OpenAIP vector tiles
      openaip: {
        type: "vector",
        tiles: ["http://localhost:3001/api/tiles/{z}/{x}/{y}.pbf"],
        minzoom: 0,
        maxzoom: 14
      },
      // Optional: MapTiler terrain for elevation shading
      terrain: {
        type: "raster-dem",
        url: `https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json?key=${apiKey}`,
        tileSize: 256
      },
      // Base map tiles for ground reference
      base: {
        type: "raster",
        tiles: [`https://api.maptiler.com/maps/topo-v2/{z}/{x}/{y}.png?key=${apiKey}`],
        tileSize: 256,
        attribution: "© MapTiler © OpenStreetMap contributors"
      }
    },
    
    layers: [
      // Background - authentic OpenAIP beige color
      {
        id: "background",
        type: "background",
        paint: {
          "background-color": "#f5f2e9" // OpenAIP's signature background color
        }
      },
      
      // Base map with reduced opacity for terrain reference
      {
        id: "base-map",
        type: "raster",
        source: "base",
        paint: {
          "raster-opacity": 0.4, // Subtle base map for terrain context
          "raster-saturation": -0.8 // Desaturate for chart-like appearance
        }
      },
      
      // Terrain hillshading (optional but enhances the aviation chart look)
      {
        id: "hillshading",
        type: "hillshade",
        source: "terrain",
        layout: { visibility: "visible" },
        paint: {
          "hillshade-shadow-color": "#473B24",
          "hillshade-highlight-color": "#FFFFFF",
          "hillshade-accent-color": "#8B7355",
          "hillshade-exaggeration": 0.3
        }
      },
      
      // AIRSPACES - Authentic OpenAIP styling
      
      // CTR (Control Zones) - Red
      {
        id: "airspace-ctr-fill",
        type: "fill",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "CTR"],
        paint: {
          "fill-color": "rgba(255, 0, 0, 0.1)",
          "fill-outline-color": "#FF0000"
        }
      },
      {
        id: "airspace-ctr-line",
        type: "line",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "CTR"],
        paint: {
          "line-color": "#FF0000",
          "line-width": 2,
          "line-dasharray": [5, 5]
        }
      },
      
      // Class D Airspace - Blue
      {
        id: "airspace-d-fill",
        type: "fill",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "D"],
        paint: {
          "fill-color": "rgba(0, 0, 255, 0.1)",
          "fill-outline-color": "#0000FF"
        }
      },
      {
        id: "airspace-d-line",
        type: "line",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "D"],
        paint: {
          "line-color": "#0000FF",
          "line-width": 2,
          "line-dasharray": [5, 5]
        }
      },
      
      // Prohibited Areas - Dark Red with cross-hatch pattern
      {
        id: "airspace-prohibited-fill",
        type: "fill",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "P"],
        paint: {
          "fill-color": "rgba(139, 0, 0, 0.2)",
          "fill-outline-color": "#8B0000"
        }
      },
      {
        id: "airspace-prohibited-line",
        type: "line",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "P"],
        paint: {
          "line-color": "#8B0000",
          "line-width": 2
        }
      },
      
      // Restricted Areas - Orange
      {
        id: "airspace-restricted-fill",
        type: "fill",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "R"],
        paint: {
          "fill-color": "rgba(255, 140, 0, 0.2)",
          "fill-outline-color": "#FF8C00"
        }
      },
      {
        id: "airspace-restricted-line",
        type: "line",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "R"],
        paint: {
          "line-color": "#FF8C00",
          "line-width": 2,
          "line-dasharray": [10, 5]
        }
      },
      
      // Danger Areas - Red pattern
      {
        id: "airspace-danger-fill",
        type: "fill",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "DANGER"],
        paint: {
          "fill-color": "rgba(255, 0, 0, 0.15)",
          "fill-outline-color": "#FF0000"
        }
      },
      {
        id: "airspace-danger-line",
        type: "line",
        source: "openaip",
        "source-layer": "airspaces",
        filter: ["==", ["get", "type"], "DANGER"],
        paint: {
          "line-color": "#FF0000",
          "line-width": 2,
          "line-dasharray": [5, 10]
        }
      },
      
      // AIRPORTS - Authentic OpenAIP symbols
      
      // Major airports - Blue circle with cross
      {
        id: "airports-major",
        type: "circle",
        source: "openaip",
        "source-layer": "airports",
        filter: ["any", 
          ["==", ["get", "type"], 1],
          ["==", ["get", "type"], "INTL_APT"],
          ["==", ["get", "type"], "APT"]
        ],
        paint: {
          "circle-radius": 8,
          "circle-color": "#FFFFFF",
          "circle-stroke-color": "#0066CC",
          "circle-stroke-width": 2
        }
      },
      
      // Regional airports - Magenta circle
      {
        id: "airports-regional",
        type: "circle",
        source: "openaip",
        "source-layer": "airports",
        filter: ["any",
          ["==", ["get", "type"], 2],
          ["==", ["get", "type"], "REGIONAL"]
        ],
        paint: {
          "circle-radius": 6,
          "circle-color": "#FFFFFF",
          "circle-stroke-color": "#CC0066",
          "circle-stroke-width": 2
        }
      },
      
      // Glider sites - specific symbol
      {
        id: "airports-glider",
        type: "circle",
        source: "openaip",
        "source-layer": "airports",
        filter: ["==", ["get", "type"], "GLIDER"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#FFFFFF",
          "circle-stroke-color": "#00AA00",
          "circle-stroke-width": 2
        }
      },
      
      // NAVAIDS - Authentic styling
      
      // VOR - Blue hexagon-like circle
      {
        id: "navaids-vor",
        type: "circle",
        source: "openaip",
        "source-layer": "navaids",
        filter: ["any",
          ["==", ["get", "type"], "VOR"],
          ["==", ["get", "type"], "VORDME"],
          ["==", ["get", "type"], "VORTAC"]
        ],
        paint: {
          "circle-radius": 10,
          "circle-color": "rgba(0, 102, 204, 0.2)",
          "circle-stroke-color": "#0066CC",
          "circle-stroke-width": 2
        }
      },
      
      // NDB - Orange circle
      {
        id: "navaids-ndb",
        type: "circle",
        source: "openaip",
        "source-layer": "navaids",
        filter: ["==", ["get", "type"], "NDB"],
        paint: {
          "circle-radius": 8,
          "circle-color": "rgba(255, 102, 0, 0.2)",
          "circle-stroke-color": "#FF6600",
          "circle-stroke-width": 2
        }
      },
      
      // LABELS - Authentic OpenAIP text styling
      
      // Airport labels
      {
        id: "airport-labels",
        type: "symbol",
        source: "openaip",
        "source-layer": "airports",
        layout: {
          "text-field": "{name}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-max-width": 8
        },
        paint: {
          "text-color": "#003366",
          "text-halo-color": "#FFFFFF",
          "text-halo-width": 2
        }
      },
      
      // Airport ICAO codes
      {
        id: "airport-icao",
        type: "symbol",
        source: "openaip",
        "source-layer": "airports",
        layout: {
          "text-field": "{icao}",
          "text-font": ["Noto Sans Bold"],
          "text-size": 10,
          "text-offset": [0, -1.5],
          "text-anchor": "bottom"
        },
        paint: {
          "text-color": "#0066CC",
          "text-halo-color": "#FFFFFF",
          "text-halo-width": 1.5
        }
      },
      
      // Airspace labels
      {
        id: "airspace-labels",
        type: "symbol",
        source: "openaip",
        "source-layer": "airspaces",
        layout: {
          "text-field": "{name}",
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-transform": "uppercase",
          "symbol-placement": "point"
        },
        paint: {
          "text-color": [
            "match",
            ["get", "type"],
            "CTR", "#CC0000",
            "D", "#0000CC",
            "P", "#8B0000",
            "R", "#CC6600",
            "#666666"
          ],
          "text-halo-color": "#FFFFFF",
          "text-halo-width": 1.5
        }
      },
      
      // Navaid labels
      {
        id: "navaid-labels",
        type: "symbol",
        source: "openaip",
        "source-layer": "navaids",
        layout: {
          "text-field": "{ident}",
          "text-font": ["Noto Sans Bold"],
          "text-size": 10,
          "text-offset": [0, 1.5],
          "text-anchor": "top"
        },
        paint: {
          "text-color": [
            "match",
            ["get", "type"],
            "VOR", "#0066CC",
            "NDB", "#FF6600",
            "#666666"
          ],
          "text-halo-color": "#FFFFFF",
          "text-halo-width": 1.5
        }
      }
    ]
  };
};
