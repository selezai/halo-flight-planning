/**
 * Feature Click Handler Hook for OpenAIP Map
 * 
 * Manages click events, feature selection, and hover states for all OpenAIP features
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  detectFeatureType, 
  extractFeatureInfo, 
  isFeatureInteractive,
  debugFeature,
  FEATURE_TYPES 
} from '../utils/featureDetection.js';

/**
 * Hook for managing feature click interactions and selection state
 * @param {Object} map - MapLibre map instance
 * @returns {Object} - Feature interaction handlers and state
 */
export const useFeatureClick = (map) => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);

  /**
   * Handle feature click events
   */
  const handleFeatureClick = useCallback((e) => {
    if (!map || !e.features || e.features.length === 0) {
      setSelectedFeature(null);
      setPopupInfo(null);
      return;
    }

    // Get the first interactive feature
    const clickedFeature = e.features.find(isFeatureInteractive);
    
    if (!clickedFeature) {
      setSelectedFeature(null);
      setPopupInfo(null);
      return;
    }

    console.log('🖱️ Feature clicked:', clickedFeature);
    debugFeature(clickedFeature);

    const featureInfo = extractFeatureInfo(clickedFeature);
    
    if (featureInfo) {
      setSelectedFeature(clickedFeature);
      setPopupInfo({
        feature: featureInfo,
        coordinates: e.lngLat,
        point: e.point
      });
      
      // Highlight the selected feature
      highlightFeature(clickedFeature);
      
      console.log('✅ Feature selected:', featureInfo.name || featureInfo.id);
    }
  }, [map]);

  /**
   * Handle feature hover events
   */
  const handleFeatureHover = useCallback((e) => {
    if (!map || !e.features || e.features.length === 0) {
      setHoveredFeature(null);
      map.getCanvas().style.cursor = '';
      return;
    }

    const hoveredFeature = e.features.find(isFeatureInteractive);
    
    if (hoveredFeature) {
      setHoveredFeature(hoveredFeature);
      map.getCanvas().style.cursor = 'pointer';
    } else {
      setHoveredFeature(null);
      map.getCanvas().style.cursor = '';
    }
  }, [map]);

  /**
   * Handle mouse leave events
   */
  const handleMouseLeave = useCallback(() => {
    setHoveredFeature(null);
    if (map) {
      map.getCanvas().style.cursor = '';
    }
  }, [map]);

  /**
   * Highlight a selected feature on the map
   */
  const highlightFeature = useCallback((feature) => {
    if (!map || !feature) return;

    const featureType = detectFeatureType(feature);
    const featureId = feature.properties?.id || feature.properties?.identifier;

    // Clear previous highlights
    clearHighlights();

    // Apply highlight based on feature type
    try {
      switch (featureType) {
        case FEATURE_TYPES.AIRPORT:
          if (map.getLayer('highlighted-airports')) {
            map.setFilter('highlighted-airports', ['==', ['get', 'id'], featureId]);
          }
          break;
          
        case FEATURE_TYPES.NAVAID:
          if (map.getLayer('highlighted-navaids')) {
            map.setFilter('highlighted-navaids', ['==', ['get', 'id'], featureId]);
          }
          break;
          
        case FEATURE_TYPES.AIRSPACE:
          if (map.getLayer('highlighted-airspaces')) {
            map.setFilter('highlighted-airspaces', ['==', ['get', 'id'], featureId]);
          }
          break;
          
        default:
          console.log('No highlight layer available for feature type:', featureType);
      }
    } catch (error) {
      console.warn('Failed to highlight feature:', error);
    }
  }, [map]);

  /**
   * Clear all feature highlights
   */
  const clearHighlights = useCallback(() => {
    if (!map) return;

    try {
      // Clear all highlight layers
      const highlightLayers = [
        'highlighted-airports',
        'highlighted-navaids', 
        'highlighted-airspaces',
        'highlighted-obstacles'
      ];

      highlightLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setFilter(layerId, ['==', ['get', 'id'], '']);
        }
      });
    } catch (error) {
      console.warn('Failed to clear highlights:', error);
    }
  }, [map]);

  /**
   * Close popup and clear selection
   */
  const closePopup = useCallback(() => {
    setSelectedFeature(null);
    setPopupInfo(null);
    clearHighlights();
  }, [clearHighlights]);

  /**
   * Get features at a specific point
   */
  const getFeaturesAtPoint = useCallback((point) => {
    if (!map) return [];

    try {
      const features = map.queryRenderedFeatures(point);
      return features.filter(isFeatureInteractive);
    } catch (error) {
      console.warn('Failed to query features at point:', error);
      return [];
    }
  }, [map]);

  /**
   * Get features in a bounding box
   */
  const getFeaturesInBounds = useCallback((bbox) => {
    if (!map) return [];

    try {
      const features = map.queryRenderedFeatures(bbox);
      return features.filter(isFeatureInteractive);
    } catch (error) {
      console.warn('Failed to query features in bounds:', error);
      return [];
    }
  }, [map]);

  /**
   * Setup event listeners when map is available
   */
  useEffect(() => {
    if (!map) return;

    console.log('🎯 Setting up feature click handlers...');

    // Add click event listener
    map.on('click', handleFeatureClick);
    
    // Add hover event listeners for all OpenAIP layers
    const openAipLayers = [
      'airports', 'airports-small', 'airports-medium', 'airports-large',
      'navaids', 'navaids-small', 'navaids-medium', 'navaids-large',
      'airspaces', 'airspaces-fill', 'airspaces-line',
      'obstacles', 'obstacles-small', 'obstacles-medium', 'obstacles-large',
      'hotspots', 'hang_glidings', 'rc_airfields', 'reporting_points'
    ];

    openAipLayers.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.on('mouseenter', layerId, handleFeatureHover);
        map.on('mouseleave', layerId, handleMouseLeave);
      }
    });

    console.log('✅ Feature click handlers setup complete');

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up feature click handlers...');
      
      map.off('click', handleFeatureClick);
      
      openAipLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.off('mouseenter', layerId, handleFeatureHover);
          map.off('mouseleave', layerId, handleMouseLeave);
        }
      });
    };
  }, [map, handleFeatureClick, handleFeatureHover, handleMouseLeave]);

  return {
    // State
    selectedFeature,
    hoveredFeature,
    popupInfo,
    
    // Actions
    closePopup,
    clearHighlights,
    highlightFeature,
    
    // Utilities
    getFeaturesAtPoint,
    getFeaturesInBounds
  };
};
