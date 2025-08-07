/**
 * Sidebar State Management Hook
 * 
 * Manages OpenAIP sidebar state, feature selection, and interactions
 */

import { useState, useCallback } from 'react';
import { detectFeatureType, extractFeatureInfo } from '../utils/featureDetection';

export const useSidebar = (map) => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('search');

  // Handle feature selection from map clicks
  const handleFeatureSelect = useCallback((feature) => {
    if (!feature) {
      setSelectedFeature(null);
      return;
    }

    // Preserve enhanced data if available, otherwise extract feature info
    let featureInfo;
    if (feature.enhancedData || feature._loading !== undefined) {
      // Feature already has enhanced data or loading state - preserve it
      console.log('🔄 useSidebar: Preserving enhanced feature data');
      featureInfo = feature;
    } else {
      // Extract detailed feature information for basic features
      console.log('🔄 useSidebar: Extracting basic feature info');
      featureInfo = extractFeatureInfo(feature);
    }
    
    console.log('🔄 useSidebar: Setting selected feature:', featureInfo);
    setSelectedFeature(featureInfo);
    
    // Switch to search tab to show feature info
    setActiveTab('search');
    
    // Ensure sidebar is visible
    setSidebarVisible(true);
  }, []);

  // Handle search functionality
  const handleSearch = useCallback(async (query, action = 'search') => {
    if (!map || !query) {
      setSearchResults([]);
      return [];
    }

    try {
      // If action is 'navigate', handle navigation to selected result
      if (action === 'navigate' && typeof query === 'object') {
        const result = query;
        if (result.coordinates) {
          map.flyTo({
            center: [result.coordinates.lng, result.coordinates.lat],
            zoom: result.type === 'airport' ? 12 : 10,
            duration: 1000
          });
        }
        return [];
      }

      // Perform search on visible features
      const results = await searchVisibleFeatures(map, query);
      setSearchResults(results);
      return results;
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      return [];
    }
  }, [map]);

  // Handle layer toggle
  const handleLayerToggle = useCallback((layerKey, enabled) => {
    if (!map) return;

    try {
      if (layerKey === 'all') {
        // Toggle all aviation layers
        const aviationLayers = [
          'airports', 'airspaces', 'navaids', 'obstacles', 
          'waypoints', 'hotspots', 'hang_glidings', 'rc_airfields', 'reporting_points'
        ];
        
        aviationLayers.forEach(layer => {
          const visibility = enabled ? 'visible' : 'none';
          if (map.getLayer(layer)) {
            map.setLayoutProperty(layer, 'visibility', visibility);
          }
        });
      } else if (layerKey === 'baseMap') {
        // Handle base map style change
        handleBaseMapChange(enabled);
      } else {
        // Toggle individual layer
        const visibility = enabled ? 'visible' : 'none';
        if (map.getLayer(layerKey)) {
          map.setLayoutProperty(layerKey, 'visibility', visibility);
        }
      }
    } catch (error) {
      console.error('Layer toggle error:', error);
    }
  }, [map]);

  // Handle base map style change
  const handleBaseMapChange = useCallback((styleKey) => {
    if (!map) return;

    const styleUrls = {
      satellite: 'https://api.maptiler.com/maps/satellite/style.json',
      terrain: 'https://api.maptiler.com/maps/terrain/style.json',
      streets: 'https://api.maptiler.com/maps/streets/style.json',
      basic: 'https://api.maptiler.com/maps/basic/style.json'
    };

    const styleUrl = styleUrls[styleKey];
    if (styleUrl) {
      // Note: This would require re-adding OpenAIP layers after style change
      // For now, we'll just log the intention
      console.log('Base map change requested:', styleKey);
      // TODO: Implement base map switching with layer preservation
    }
  }, [map]);

  // Handle tool selection
  const handleToolSelect = useCallback((toolKey, enabled) => {
    if (!map) return;

    console.log('Tool selected:', toolKey, enabled);
    
    // TODO: Implement tool functionality
    switch (toolKey) {
      case 'measure-distance':
        // Implement distance measurement
        break;
      case 'measure-area':
        // Implement area measurement
        break;
      case 'draw-route':
        // Implement route drawing
        break;
      case 'coordinates':
        // Implement coordinate display
        break;
      case 'print':
        // Implement print functionality
        break;
      case 'export':
        // Implement export functionality
        break;
      case 'clear-measurements':
        // Clear all measurements
        break;
      default:
        break;
    }
  }, [map]);

  // Close feature info panel
  const handleCloseFeature = useCallback(() => {
    setSelectedFeature(null);
  }, []);

  // Toggle sidebar visibility
  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  return {
    // State
    sidebarVisible,
    selectedFeature,
    searchResults,
    activeTab,
    
    // Actions
    handleFeatureSelect,
    handleSearch,
    handleLayerToggle,
    handleToolSelect,
    handleCloseFeature,
    toggleSidebar,
    setActiveTab,
    setSidebarVisible
  };
};

/**
 * Search visible features on the map
 */
const searchVisibleFeatures = async (map, query) => {
  if (!map || !query) return [];

  try {
    // Get current map bounds
    const bounds = map.getBounds();
    
    // Query all rendered features in the current view
    const features = map.queryRenderedFeatures(undefined, {
      layers: ['airports', 'airspaces', 'navaids', 'obstacles', 'waypoints', 'hotspots']
    });

    // Filter and rank results based on query
    const results = features
      .map(feature => extractFeatureInfo(feature))
      .filter(feature => matchesSearchQuery(feature, query))
      .sort((a, b) => rankSearchResult(a, query) - rankSearchResult(b, query))
      .slice(0, 20); // Limit to top 20 results

    return results;
  } catch (error) {
    console.error('Feature search error:', error);
    return [];
  }
};

/**
 * Check if feature matches search query
 */
const matchesSearchQuery = (feature, query) => {
  if (!feature || !query) return false;

  const searchText = query.toLowerCase().trim();
  
  // Check various feature properties
  const searchableFields = [
    feature.name,
    feature.identifier,
    feature.icaoCode,
    feature.iataCode,
    feature.type,
    feature.country
  ].filter(Boolean).map(field => field.toLowerCase());

  // Check for exact matches first
  if (searchableFields.some(field => field === searchText)) {
    return true;
  }

  // Check for partial matches
  if (searchableFields.some(field => field.includes(searchText))) {
    return true;
  }

  // Check for coordinate search
  if (isCoordinateSearch(searchText)) {
    return true; // TODO: Implement coordinate matching
  }

  return false;
};

/**
 * Rank search results by relevance
 */
const rankSearchResult = (feature, query) => {
  if (!feature || !query) return 1000;

  const searchText = query.toLowerCase().trim();
  let score = 0;

  // Exact ICAO code match gets highest priority
  if (feature.icaoCode && feature.icaoCode.toLowerCase() === searchText) {
    score = 1;
  }
  // Exact name match
  else if (feature.name && feature.name.toLowerCase() === searchText) {
    score = 2;
  }
  // ICAO code starts with query
  else if (feature.icaoCode && feature.icaoCode.toLowerCase().startsWith(searchText)) {
    score = 3;
  }
  // Name starts with query
  else if (feature.name && feature.name.toLowerCase().startsWith(searchText)) {
    score = 4;
  }
  // ICAO code contains query
  else if (feature.icaoCode && feature.icaoCode.toLowerCase().includes(searchText)) {
    score = 5;
  }
  // Name contains query
  else if (feature.name && feature.name.toLowerCase().includes(searchText)) {
    score = 6;
  }
  // Other field matches
  else {
    score = 10;
  }

  // Boost score for airports
  if (feature.type === 'airport') {
    score -= 0.5;
  }

  return score;
};

/**
 * Check if query looks like coordinates
 */
const isCoordinateSearch = (query) => {
  // Simple coordinate pattern detection
  const coordinatePatterns = [
    /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/, // Decimal: "40.6413, -73.7781"
    /^\d+°\d+'[\d.]*"[NS]\s+\d+°\d+'[\d.]*"[EW]$/, // DMS: "40°38'28"N 73°46'41"W"
  ];

  return coordinatePatterns.some(pattern => pattern.test(query.trim()));
};
