import React from 'react';
import NavaidDisplay from './NavaidDisplay';
import AirportDisplay from './AirportDisplay';

/**
 * Enhanced feature display component that uses feature-specific components
 * for accurate OpenAIP-style data presentation
 */
const SimpleFeatureDisplay = ({ feature, onClose }) => {
  console.log('🎯 SimpleFeatureDisplay received feature:', feature);
  
  if (!feature) {
    return (
      <div className="feature-info-panel">
        <p>No feature selected</p>
      </div>
    );
  }
  
  // Get source layer to determine which component to use
  const sourceLayer = feature.sourceLayer;
  
  // Prioritize enhanced REST API data over basic extracted properties
  const enhancedData = feature.enhancedData;
  const basicProps = feature.extractedProperties || feature.properties || {};
  const props = enhancedData || basicProps;
  
  console.log('🔍 Enhanced display - Source layer:', sourceLayer);
  console.log('🔍 Enhanced display - Full feature object:', feature);
  console.log('🔍 Enhanced display - Enhanced data available:', !!enhancedData);
  console.log('🔍 Enhanced display - Enhanced data content:', enhancedData);
  console.log('🔍 Enhanced display - Basic props:', basicProps);
  console.log('🔍 Enhanced display - Using data:', enhancedData ? 'REST API' : 'Vector Tiles');
  console.log('🔍 Enhanced display - Final props:', props);
  console.log('🔍 Enhanced display - Feature loading state:', feature._loading);
  console.log('🔍 Enhanced display - Feature data complete:', feature._dataComplete);
  
  // Show loading indicator if data is still being fetched
  if (feature._loading) {
    return (
      <div className="feature-info-panel">
        <div className="feature-header">
          <h3>Loading feature data...</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Fetching detailed information from OpenAIP...</p>
        </div>
      </div>
    );
  }
  
  // Route to feature-specific display components
  console.log('🔍 SimpleFeatureDisplay routing - sourceLayer:', sourceLayer);
  console.log('🔍 SimpleFeatureDisplay routing - feature.sourceLayer:', feature.sourceLayer);
  console.log('🔍 SimpleFeatureDisplay routing - feature.layer:', feature.layer);
  
  if (sourceLayer === 'navaids') {
    console.log('✅ Routing to NavaidDisplay');
    return <NavaidDisplay feature={feature} onClose={onClose} />;
  } else if (sourceLayer === 'airports') {
    console.log('✅ Routing to AirportDisplay');
    return <AirportDisplay feature={feature} onClose={onClose} />;
  }
  
  console.log('⚠️ Falling back to GenericFeatureDisplay for sourceLayer:', sourceLayer);
  
  // Fallback to generic display for other feature types
  return (
    <GenericFeatureDisplay feature={feature} onClose={onClose} />
  );
};

/**
 * Generic fallback display for feature types that don't have specific components yet
 */
const GenericFeatureDisplay = ({ feature, onClose }) => {
  const props = feature.extractedProperties || feature.properties || {};
  
  return (
    <div className="feature-info-panel openaip-format">
      {/* Header */}
      <div className="feature-header">
        <h3 className="feature-title">
          {props.identifier || props.name || props.id || 'Unknown Feature'}
        </h3>
        <button className="close-btn" onClick={onClose} title="Close">
          ×
        </button>
      </div>
      
      {/* Feature Type */}
      <div className="openaip-section">
        <h4>Feature Type</h4>
        <div className="type-display">
          {feature.sourceLayer || 'Unknown'}
        </div>
      </div>
      
      {/* Basic Properties */}
      {props.name && (
        <div className="openaip-section">
          <h4>Name</h4>
          <div>{props.name}</div>
        </div>
      )}
      
      {props.type && (
        <div className="openaip-section">
          <h4>Type</h4>
          <div>{props.type}</div>
        </div>
      )}
      
      {/* Coordinates */}
      {props.coordinates && (
        <div className="openaip-section">
          <h4>Location</h4>
          <div className="location-subsection">
            <h5>Coordinates</h5>
            <div>{props.coordinates.lat.toFixed(6)}, {props.coordinates.lng.toFixed(6)}</div>
          </div>
        </div>
      )}
      
      {/* Debug Section */}
      {process.env.NODE_ENV === 'development' && (
        <div className="openaip-section debug-section">
          <h4>Debug Info</h4>
          <details>
            <summary>All Properties</summary>
            <pre>{JSON.stringify(props, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default SimpleFeatureDisplay;
