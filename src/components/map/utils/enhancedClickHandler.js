/**
 * Enhanced Click Event Handler for OpenAIP Map
 * Follows the implementation guide specifications for proper feature handling
 * 
 * This module implements the exact click handling flow described in the guide:
 * 1. Extract feature properties from vector tiles
 * 2. Handle limited tile data with fallback mechanisms
 * 3. Integrate REST API calls for detailed information
 * 4. Process and format data for sidebar display
 */

import { extractFeatureData, detectFeatureType, isFeatureInteractive } from './featureDetection.js';
import { getEnhancedFeatureData } from './openAipRestApi.js';

/**
 * Extract coordinates from feature geometry
 * @param {Object} feature - MapLibre feature object
 * @returns {Object|null} - Coordinates {lng, lat} or null
 */
const extractCoordinates = (feature) => {
  const geometry = feature.geometry;
  
  if (!geometry || !geometry.coordinates) {
    return null;
  }
  
  // Handle different geometry types
  switch (geometry.type) {
    case 'Point':
      return {
        lng: geometry.coordinates[0],
        lat: geometry.coordinates[1]
      };
    case 'LineString':
    case 'MultiLineString':
      // Use first coordinate for lines
      const coords = geometry.type === 'LineString' ? 
        geometry.coordinates[0] : 
        geometry.coordinates[0][0];
      return {
        lng: coords[0],
        lat: coords[1]
      };
    case 'Polygon':
    case 'MultiPolygon':
      // Use centroid or first coordinate for polygons
      const polyCoords = geometry.type === 'Polygon' ? 
        geometry.coordinates[0][0] : 
        geometry.coordinates[0][0][0];
      return {
        lng: polyCoords[0],
        lat: polyCoords[1]
      };
    default:
      return null;
  }
};

/**
 * Extract frequency from various label fields
 * @param {Object} props - Feature properties
 * @returns {string|null} - Frequency or null
 */
const extractFrequencyFromLabel = (props) => {
  const labelFields = ['name_label_full', 'name_label', 'label', 'full_name', 'name'];
  
  for (const field of labelFields) {
    if (props[field]) {
      const label = props[field];
      // Match frequency patterns like "118.50" or "118.500 MHz"
      const freqMatch = label.match(/(\d{2,3}\.\d{1,3})\s*(?:MHz)?/i);
      if (freqMatch) {
        return `${freqMatch[1]} MHz`;
      }
    }
  }
  
  return props.frequency || props.freq || props.radio_frequency || null;
};

/**
 * Extract feature properties following implementation guide specifications
 * @param {Object} feature - MapLibre feature object
 * @returns {Object} - Extracted properties with fallback handling
 */
export const extractFeatureProperties = (feature) => {
  const props = feature.properties;
  const coordinates = extractCoordinates(feature);
  const sourceLayer = feature.sourceLayer;
  
  console.log(`🔍 Extracting properties for ${sourceLayer} feature:`, props);
  
  // Base properties for all features
  const baseProperties = {
    // Basic identification
    id: props.id || props.feature_id || props.osm_id || props.gml_id,
    name: props.name || props.name_en || props.name_local || props.label,
    type: props.type || props.feature_type || props.class,
    
    // ICAO/Identifier codes
    icao: props.icao || props.icao_code || props.ident,
    iata: props.iata || props.iata_code,
    identifier: props.identifier || props.ident || props.code,
    
    // Location data (FIXED: use geometry coordinates)
    coordinates: coordinates,
    elevation: props.elevation || props.elev || props.altitude || props.alt,
    country: props.country || props.country_code || props.iso_country,
    region: props.region || props.state || props.admin_level_4,
    
    // Operational status
    status: props.status || props.operational_status,
    public: props.public !== false,
    
    // Additional metadata
    sourceLayer: sourceLayer,
    featureType: detectFeatureType(feature),
    
    // Raw properties for debugging
    _raw: props
  };
  
  // Feature-specific properties based on source layer
  if (sourceLayer === 'navaids') {
    return {
      ...baseProperties,
      // Navigation specific
      frequency: extractFrequencyFromLabel(props),
      range: props.range || props.nav_range || 'NIL',
      channel: props.channel || props.vor_channel || 'NIL',
      magneticDeclination: props.magnetic_declination || props.mag_var || props.declination,
      alignedTrueNorth: props.aligned_true_north || props.true_north || false,
      hoursOfOperation: props.hours || props.operating_hours || '24H',
      remarks: props.remarks || props.comment || 'NIL'
    };
  } else if (sourceLayer === 'airports') {
    return {
      ...baseProperties,
      // Airport specific
      runway: props.runway || props.runways || props.runway_info,
      surface: props.surface || props.runway_surface || props.surface_type,
      length: props.length || props.runway_length,
      width: props.width || props.runway_width,
      lighting: props.lighting || props.runway_lighting,
      trafficTypes: props.traffic_types || props.traffic || 'Unknown'
    };
  } else if (sourceLayer === 'airspaces') {
    return {
      ...baseProperties,
      // Airspace specific
      class: props.class || props.airspace_class,
      lowerLimit: props.lower_limit || props.floor,
      upperLimit: props.upper_limit || props.ceiling,
      activity: props.activity || props.airspace_activity
    };
  } else if (sourceLayer === 'obstacles') {
    return {
      ...baseProperties,
      // Obstacle specific
      height: props.height || props.obstacle_height,
      lighting: props.lighting || props.obstacle_lighting,
      marking: props.marking || props.obstacle_marking
    };
  }
  
  return baseProperties;
};

/**
 * Handle data fetch with fallback mechanisms
 * @param {Object} feature - MapLibre feature object
 * @returns {Promise<Object>} - Enhanced feature data
 */
export const handleDataFetch = async (feature) => {
  try {
    // Try REST API first for detailed information
    console.log('🔍 Attempting to fetch detailed data from REST API...');
    const enhancedData = await getEnhancedFeatureData(feature);
    
    if (enhancedData && Object.keys(enhancedData).length > 0) {
      console.log('✅ Successfully fetched enhanced data from REST API');
      return enhancedData;
    }
  } catch (error) {
    console.warn('⚠️ REST API fetch failed, falling back to vector tile data:', error);
  }
  
  // Fallback to vector tile properties
  console.log('📍 Using vector tile properties as fallback');
  const vectorTileData = extractFeatureData(feature);
  
  return {
    ...vectorTileData,
    _dataSource: 'vector_tile',
    _note: 'Limited data from vector tiles. REST API unavailable.'
  };
};

/**
 * Enhanced map click handler following implementation guide specifications
 * @param {maplibregl.Map} map - MapLibre GL map instance
 * @param {maplibregl.MapMouseEvent} e - Click event
 * @param {Function} onFeatureSelect - Callback for feature selection
 * @returns {Promise<void>}
 */
export const handleMapClick = async (map, e, onFeatureSelect) => {
  console.log('🎯 Map clicked at:', e.lngLat);
  
  // Query all rendered features at click point
  const features = map.queryRenderedFeatures(e.point);
  console.log(`🔍 Found ${features.length} features at click point`);
  
  // Filter for OpenAIP features (those with source 'openaip-data' or similar)
  const openAipFeatures = features.filter(feature => {
    return (
      feature.source === 'openaip-data' || 
      feature.source === 'openaip' ||
      feature.sourceLayer || // OpenAIP vector tile features have sourceLayer
      isFeatureInteractive(feature)
    );
  });
  
  console.log(`🎯 Found ${openAipFeatures.length} OpenAIP features`);
  
  if (openAipFeatures.length > 0) {
    const feature = openAipFeatures[0]; // Select the first/topmost feature
    
    console.log('📊 Selected feature:', {
      source: feature.source,
      sourceLayer: feature.sourceLayer,
      properties: feature.properties,
      geometry: feature.geometry?.type
    });
    
    // Extract basic properties immediately for responsive UI
    const basicProperties = extractFeatureProperties(feature);
    console.log('📋 Extracted basic properties:', basicProperties);
    
    // Show basic info immediately
    onFeatureSelect({
      ...feature,
      extractedProperties: basicProperties,
      _loading: true
    });
    
    try {
      // Fetch enhanced data in the background
      console.log('🔄 Fetching enhanced feature data...');
      const enhancedData = await handleDataFetch(feature);
      
      // Update with enhanced data - create completely new object for React re-rendering
      console.log('🔄 Updating sidebar with enhanced data:', enhancedData);
      const updatedFeature = {
        type: 'Feature',
        properties: { ...feature.properties },
        geometry: feature.geometry,
        layer: feature.layer,
        source: feature.source,
        sourceLayer: feature.sourceLayer,
        extractedProperties: { ...basicProperties },
        enhancedData: { ...enhancedData },
        _loading: false,
        _dataComplete: true,
        _timestamp: Date.now() // Force React re-render
      };
      console.log('🔄 Complete updated feature object:', updatedFeature);
      onFeatureSelect(updatedFeature);
      
      console.log('✅ Feature data loading complete');
      
    } catch (error) {
      console.error('❌ Failed to fetch enhanced data:', error);
      
      // Update with error state but keep basic data
      onFeatureSelect({
        ...feature,
        extractedProperties: basicProperties,
        _loading: false,
        _error: error.message
      });
    }
    
  } else {
    // Clear selection if clicking empty area
    console.log('🔍 No OpenAIP features found at click point');
    onFeatureSelect(null);
  }
};

/**
 * Convert OpenAIP style for MapLibre compatibility
 * @param {Object} style - OpenAIP style object
 * @returns {Object} - MapLibre compatible style
 */
export const convertOpenAipStyle = (style) => {
  // Replace Mapbox sources with proxy URLs
  if (style.sources) {
    Object.entries(style.sources).forEach(([id, source]) => {
      if (source.tiles) {
        // Update tile URLs to use proxy
        source.tiles = source.tiles.map(tileUrl => {
          if (tileUrl.includes('openaip.net')) {
            return tileUrl.replace(
              'https://api.tiles.openaip.net',
              'http://localhost:3001/api/maps'
            );
          }
          return tileUrl;
        });
      }
      
      // Update sprite URLs to use proxy
      if (source.sprite) {
        source.sprite = source.sprite.replace(
          'https://cdn.openaip.net/sprites',
          'http://localhost:3001/api/sprites'
        );
      }
    });
  }
  
  // Update global sprite URL
  if (style.sprite) {
    style.sprite = style.sprite.replace(
      'https://cdn.openaip.net/sprites',
      'http://localhost:3001/api/sprites'
    );
  }
  
  return style;
};

/**
 * Setup click event listeners on map
 * @param {maplibregl.Map} map - MapLibre GL map instance
 * @param {Function} onFeatureSelect - Feature selection callback
 * @returns {Function} - Cleanup function
 */
export const setupClickHandlers = (map, onFeatureSelect) => {
  const clickHandler = (e) => handleMapClick(map, e, onFeatureSelect);
  
  // Add click handler
  map.on('click', clickHandler);
  
  // Return cleanup function
  return () => {
    map.off('click', clickHandler);
  };
};

/**
 * Debug vector tile properties comprehensively
 * @param {Object} feature - MapLibre feature object
 */
export const debugVectorTileProperties = (feature) => {
  console.group(`🔍 VECTOR TILE DEBUG: ${feature.sourceLayer}`);
  
  // Basic feature info
  console.log('🏷️ Basic Info:', {
    source: feature.source,
    sourceLayer: feature.sourceLayer,
    geometryType: feature.geometry?.type,
    id: feature.id
  });
  
  // Geometry details
  console.log('🗺️ Geometry:', {
    type: feature.geometry?.type,
    coordinates: feature.geometry?.coordinates,
    extractedCoords: extractCoordinates(feature)
  });
  
  // All available properties
  const props = feature.properties;
  console.log('📊 All Properties:', props);
  console.log('🔑 Property Keys:', Object.keys(props));
  
  // Property analysis by category
  const propertyCategories = {
    identification: [],
    location: [],
    aviation: [],
    operational: [],
    other: []
  };
  
  Object.keys(props).forEach(key => {
    const value = props[key];
    const keyLower = key.toLowerCase();
    
    if (keyLower.includes('id') || keyLower.includes('name') || keyLower.includes('code') || keyLower.includes('ident')) {
      propertyCategories.identification.push({ key, value });
    } else if (keyLower.includes('lat') || keyLower.includes('lng') || keyLower.includes('coord') || keyLower.includes('elev') || keyLower.includes('alt')) {
      propertyCategories.location.push({ key, value });
    } else if (keyLower.includes('freq') || keyLower.includes('runway') || keyLower.includes('nav') || keyLower.includes('vor') || keyLower.includes('channel')) {
      propertyCategories.aviation.push({ key, value });
    } else if (keyLower.includes('status') || keyLower.includes('hours') || keyLower.includes('public') || keyLower.includes('active')) {
      propertyCategories.operational.push({ key, value });
    } else {
      propertyCategories.other.push({ key, value });
    }
  });
  
  console.log('📁 Categorized Properties:', propertyCategories);
  
  // Feature-specific analysis
  if (feature.sourceLayer === 'navaids') {
    console.log('📰 NAVAID Analysis:', {
      possibleFrequency: extractFrequencyFromLabel(props),
      frequencyFields: Object.keys(props).filter(k => k.toLowerCase().includes('freq')),
      rangeFields: Object.keys(props).filter(k => k.toLowerCase().includes('range')),
      channelFields: Object.keys(props).filter(k => k.toLowerCase().includes('channel')),
      typeFields: Object.keys(props).filter(k => k.toLowerCase().includes('type'))
    });
  }
  
  console.log('✅ Extracted Properties:', extractFeatureProperties(feature));
  console.groupEnd();
};

/**
 * Debug utility to log feature information
 * @param {Object} feature - MapLibre feature object
 */
export const debugFeatureClick = (feature) => {
  console.group('🐛 Feature Debug Information');
  console.log('Source:', feature.source);
  console.log('Source Layer:', feature.sourceLayer);
  console.log('Geometry Type:', feature.geometry?.type);
  console.log('Properties:', feature.properties);
  console.log('Extracted Properties:', extractFeatureProperties(feature));
  console.log('Feature Type:', detectFeatureType(feature));
  console.log('Interactive:', isFeatureInteractive(feature));
  
  // Add comprehensive debugging
  debugVectorTileProperties(feature);
  
  console.groupEnd();
};
