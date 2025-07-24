/**
 * Local fallback for OpenAIP style when direct API access fails due to CORS
 * This is a simplified version of the OpenAIP style that works with MapLibre GL
 */
export const localOpenAipStyle = {
  version: 8,
  name: "OpenAIP",
  metadata: {
    "mapbox:autocomposite": true
  },
  sources: {
    composite: {
      type: "vector",
      // Use a local GeoJSON source instead of remote vector tiles
      // This will be replaced by our converter with proper vector tile source
      tiles: []
    },
    "openaip-basemap": {
      type: "raster",
      tiles: [
        "https://api.maptiler.com/maps/outdoor/{z}/{x}/{y}.png?key={key}"
      ],
      tileSize: 256
    }
  },
  sprite: "https://cdn.openaip.net/sprites/openaip-icons",
  glyphs: "https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key={key}",
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#f8f4f0"
      }
    },
    {
      id: "openaip-basemap",
      type: "raster",
      source: "openaip-basemap",
      layout: {
        visibility: "visible"
      },
      paint: {}
    },
    // Airspaces
    {
      id: "airspace-fill",
      type: "fill",
      source: "composite",
      "source-layer": "airspaces",
      paint: {
        "fill-color": [
          "match",
          ["get", "class"],
          "A", "rgba(0, 102, 204, 0.1)",
          "B", "rgba(0, 102, 204, 0.1)",
          "C", "rgba(204, 0, 102, 0.1)",
          "D", "rgba(0, 153, 0, 0.1)",
          "E", "rgba(153, 153, 153, 0.1)",
          "F", "rgba(204, 102, 0, 0.1)",
          "G", "rgba(0, 0, 0, 0)",
          "CTR", "rgba(204, 0, 0, 0.1)",
          "DANGER", "rgba(255, 0, 0, 0.1)",
          "RESTRICTED", "rgba(255, 0, 0, 0.1)",
          "PROHIBITED", "rgba(255, 0, 0, 0.1)",
          "rgba(128, 128, 128, 0.1)"
        ],
        "fill-opacity": 0.5
      }
    },
    {
      id: "airspace-outline",
      type: "line",
      source: "composite",
      "source-layer": "airspaces",
      paint: {
        "line-color": [
          "match",
          ["get", "class"],
          "A", "#0066CC",
          "B", "#0066CC",
          "C", "#CC0066",
          "D", "#009900",
          "E", "#999999",
          "F", "#CC6600",
          "G", "#000000",
          "CTR", "#CC0000",
          "DANGER", "#FF0000",
          "RESTRICTED", "#FF0000",
          "PROHIBITED", "#FF0000",
          "#808080"
        ],
        "line-width": 1,
        "line-dasharray": [
          "match",
          ["get", "class"],
          "DANGER", [4, 2],
          "RESTRICTED", [4, 2],
          "PROHIBITED", [2, 1],
          [1, 0]
        ]
      }
    },
    // Airports
    {
      id: "airports",
      type: "symbol",
      source: "composite",
      "source-layer": "airports",
      layout: {
        "icon-image": [
          "match",
          ["get", "type"],
          "large_airport", "airport-15",
          "medium_airport", "airport-15",
          "small_airport", "airport-15",
          "heliport", "heliport-15",
          "airport-15"
        ],
        "icon-size": 1.2,
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": 12,
        "text-offset": [0, 1],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#333",
        "text-halo-color": "#fff",
        "text-halo-width": 1
      }
    },
    // Navaids
    {
      id: "navaids",
      type: "symbol",
      source: "composite",
      "source-layer": "navaids",
      layout: {
        "icon-image": [
          "match",
          ["get", "type"],
          "VOR", "navaid-vor-15",
          "VORDME", "navaid-vordme-15",
          "DME", "navaid-dme-15",
          "NDB", "navaid-ndb-15",
          "TACAN", "navaid-tacan-15",
          "navaid-15"
        ],
        "icon-size": 1,
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": 11,
        "text-offset": [0, 1],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#333",
        "text-halo-color": "#fff",
        "text-halo-width": 1
      }
    },
    // Waypoints
    {
      id: "waypoints",
      type: "symbol",
      source: "composite",
      "source-layer": "waypoints",
      layout: {
        "icon-image": "waypoint-15",
        "icon-size": 0.8,
        "text-field": ["get", "name"],
        "text-font": ["Open Sans Regular"],
        "text-size": 10,
        "text-offset": [0, 1],
        "text-anchor": "top"
      },
      paint: {
        "text-color": "#333",
        "text-halo-color": "#fff",
        "text-halo-width": 1
      }
    },
    // Obstacles
    {
      id: "obstacles",
      type: "symbol",
      source: "composite",
      "source-layer": "obstacles",
      layout: {
        "icon-image": "obstacle-15",
        "icon-size": 0.8
      }
    }
  ]
};
