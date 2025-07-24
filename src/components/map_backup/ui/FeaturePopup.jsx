// components/map/ui/FeaturePopup.jsx
import React from 'react';

export const FeaturePopup = ({ feature, onClose }) => {
  if (!feature) return null;
  
  // Extract properties from OpenAIP feature
  const { properties, sourceLayer } = feature;
  
  // Determine feature type from sourceLayer
  const featureType = sourceLayer ? getFeatureTypeFromSourceLayer(sourceLayer) : 'Unknown';
  
  // Format properties for display
  const displayProps = formatFeatureProperties(properties, featureType);
  
  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                    bg-white rounded-lg shadow-xl p-4 min-w-[300px] max-w-[400px] z-50">
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      >
        ✕
      </button>
      
      {/* Feature icon and title */}
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-2">{getFeatureIcon(featureType)}</span>
        <h3 className="font-bold text-lg">
          {displayProps.name || displayProps.ident || 'Unnamed Feature'}
        </h3>
      </div>
      
      {/* Feature type */}
      <div className="mb-2 bg-gray-100 px-2 py-1 rounded inline-block">
        <span className="font-medium">{displayProps.type || featureType}</span>
      </div>
      
      {/* Feature details */}
      <div className="mt-3 space-y-2">
        {Object.entries(displayProps).map(([key, value]) => {
          // Skip name and type as they're already displayed
          if (key === 'name' || key === 'type' || !value) return null;
          
          return (
            <div key={key} className="flex">
              <span className="text-gray-600 w-1/3 capitalize">{formatLabel(key)}:</span>
              <span className="ml-2 flex-1">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Determine feature type from OpenAIP sourceLayer
 */
const getFeatureTypeFromSourceLayer = (sourceLayer) => {
  if (sourceLayer.includes('airport')) return 'Airport';
  if (sourceLayer.includes('navaid')) return 'Navaid';
  if (sourceLayer.includes('waypoint')) return 'Waypoint';
  if (sourceLayer.includes('airspace')) return 'Airspace';
  if (sourceLayer.includes('obstacle')) return 'Obstacle';
  return 'Feature';
};

/**
 * Get appropriate icon for feature type
 */
const getFeatureIcon = (featureType) => {
  switch (featureType) {
    case 'Airport': return '✈️';
    case 'Navaid': return '📡';
    case 'Waypoint': return '📍';
    case 'Airspace': return '🔷';
    case 'Obstacle': return '⚠️';
    default: return '📌';
  }
};

/**
 * Format feature properties for display
 */
const formatFeatureProperties = (properties, featureType) => {
  const result = {};
  
  // Common properties
  if (properties.name) result.name = properties.name;
  if (properties.ident) result.ident = properties.ident;
  if (properties.type) result.type = properties.type;
  
  // Type-specific properties
  switch (featureType) {
    case 'Airport':
      if (properties.icao) result.icao = properties.icao;
      if (properties.iata) result.iata = properties.iata;
      if (properties.elevation) result.elevation = `${properties.elevation} ft`;
      if (properties.runways) result.runways = properties.runways;
      if (properties.frequency) result.frequency = `${properties.frequency} MHz`;
      break;
      
    case 'Navaid':
      if (properties.ident) result.ident = properties.ident;
      if (properties.frequency) result.frequency = `${properties.frequency} MHz`;
      if (properties.range) result.range = `${properties.range} NM`;
      break;
      
    case 'Airspace':
      if (properties.class) result.class = properties.class;
      if (properties.upperLimit) result.upperLimit = properties.upperLimit;
      if (properties.lowerLimit) result.lowerLimit = properties.lowerLimit;
      if (properties.upperLimit && properties.lowerLimit) {
        result.verticalLimits = `${properties.lowerLimit} - ${properties.upperLimit}`;
      }
      break;
      
    case 'Waypoint':
      if (properties.ident) result.ident = properties.ident;
      if (properties.type) result.type = properties.type;
      break;
      
    case 'Obstacle':
      if (properties.height) result.height = `${properties.height} ft`;
      if (properties.elevation) result.elevation = `${properties.elevation} ft`;
      if (properties.type) result.type = properties.type;
      break;
  }
  
  return result;
};

/**
 * Format property key as readable label
 */
const formatLabel = (key) => {
  return key
    .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
};
