/**
 * Feature Popup Component for OpenAIP Map
 * 
 * Displays detailed information about clicked features (airports, airspaces, navaids, obstacles)
 */

import React from 'react';
import { FEATURE_TYPES } from '../utils/featureDetection.js';

/**
 * Main feature popup component
 */
export const FeaturePopup = ({ popupInfo, onClose }) => {
  if (!popupInfo || !popupInfo.feature) {
    return null;
  }

  const { feature, coordinates } = popupInfo;

  return (
    <div className="feature-popup">
      <div className="popup-header">
        <h3 className="popup-title">
          {getFeatureIcon(feature.type)}
          {feature.name || feature.id || 'Unknown Feature'}
        </h3>
        <button className="popup-close" onClick={onClose} aria-label="Close popup">
          ×
        </button>
      </div>
      
      <div className="popup-content">
        {renderFeatureContent(feature)}
      </div>
      
      <div className="popup-footer">
        <div className="coordinates">
          📍 {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
        </div>
      </div>
    </div>
  );
};

/**
 * Get appropriate icon for feature type
 */
const getFeatureIcon = (featureType) => {
  switch (featureType) {
    case FEATURE_TYPES.AIRPORT:
      return '✈️ ';
    case FEATURE_TYPES.AIRSPACE:
      return '🛡️ ';
    case FEATURE_TYPES.NAVAID:
      return '📡 ';
    case FEATURE_TYPES.OBSTACLE:
      return '⚠️ ';
    case FEATURE_TYPES.HOTSPOT:
      return '🔥 ';
    case FEATURE_TYPES.HANG_GLIDING:
      return '🪂 ';
    case FEATURE_TYPES.RC_AIRFIELD:
      return '🛩️ ';
    case FEATURE_TYPES.REPORTING_POINT:
      return '📍 ';
    default:
      return '📌 ';
  }
};

/**
 * Render feature-specific content
 */
const renderFeatureContent = (feature) => {
  switch (feature.type) {
    case FEATURE_TYPES.AIRPORT:
      return <AirportContent feature={feature} />;
    case FEATURE_TYPES.AIRSPACE:
      return <AirspaceContent feature={feature} />;
    case FEATURE_TYPES.NAVAID:
      return <NavaidContent feature={feature} />;
    case FEATURE_TYPES.OBSTACLE:
      return <ObstacleContent feature={feature} />;
    default:
      return <GenericContent feature={feature} />;
  }
};

/**
 * Airport-specific content
 */
const AirportContent = ({ feature }) => (
  <div className="airport-content">
    <div className="info-grid">
      {feature.icaoCode && (
        <div className="info-item">
          <span className="label">ICAO:</span>
          <span className="value">{feature.icaoCode}</span>
        </div>
      )}
      {feature.iataCode && (
        <div className="info-item">
          <span className="label">IATA:</span>
          <span className="value">{feature.iataCode}</span>
        </div>
      )}
      {feature.elevation !== undefined && (
        <div className="info-item">
          <span className="label">Elevation:</span>
          <span className="value">{feature.elevation} ft</span>
        </div>
      )}
      {feature.type && (
        <div className="info-item">
          <span className="label">Type:</span>
          <span className="value">{feature.type}</span>
        </div>
      )}
      {feature.controlled !== undefined && (
        <div className="info-item">
          <span className="label">Controlled:</span>
          <span className="value">{feature.controlled ? 'Yes' : 'No'}</span>
        </div>
      )}
    </div>
    
    {feature.runways && feature.runways.length > 0 && (
      <div className="runways-section">
        <h4>Runways</h4>
        <ul className="runways-list">
          {feature.runways.map((runway, index) => (
            <li key={index}>{runway}</li>
          ))}
        </ul>
      </div>
    )}
    
    {feature.frequencies && feature.frequencies.length > 0 && (
      <div className="frequencies-section">
        <h4>Frequencies</h4>
        <ul className="frequencies-list">
          {feature.frequencies.map((freq, index) => (
            <li key={index}>{freq}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

/**
 * Airspace-specific content
 */
const AirspaceContent = ({ feature }) => (
  <div className="airspace-content">
    <div className="info-grid">
      {feature.class && (
        <div className="info-item">
          <span className="label">Class:</span>
          <span className="value">{feature.class}</span>
        </div>
      )}
      {feature.upperLimit && (
        <div className="info-item">
          <span className="label">Upper Limit:</span>
          <span className="value">{feature.upperLimit}</span>
        </div>
      )}
      {feature.lowerLimit && (
        <div className="info-item">
          <span className="label">Lower Limit:</span>
          <span className="value">{feature.lowerLimit}</span>
        </div>
      )}
      {feature.activity && (
        <div className="info-item">
          <span className="label">Activity:</span>
          <span className="value">{feature.activity}</span>
        </div>
      )}
      {feature.activeHours && (
        <div className="info-item">
          <span className="label">Active Hours:</span>
          <span className="value">{feature.activeHours}</span>
        </div>
      )}
    </div>
    
    {feature.restrictions && feature.restrictions.length > 0 && (
      <div className="restrictions-section">
        <h4>Restrictions</h4>
        <ul className="restrictions-list">
          {feature.restrictions.map((restriction, index) => (
            <li key={index}>{restriction}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

/**
 * Navaid-specific content
 */
const NavaidContent = ({ feature }) => (
  <div className="navaid-content">
    <div className="info-grid">
      {feature.navaidType && (
        <div className="info-item">
          <span className="label">Type:</span>
          <span className="value">{feature.navaidType.toUpperCase()}</span>
        </div>
      )}
      {feature.identifier && (
        <div className="info-item">
          <span className="label">Identifier:</span>
          <span className="value">{feature.identifier}</span>
        </div>
      )}
      {feature.frequency && (
        <div className="info-item">
          <span className="label">Frequency:</span>
          <span className="value">{feature.frequency} MHz</span>
        </div>
      )}
      {feature.channel && (
        <div className="info-item">
          <span className="label">Channel:</span>
          <span className="value">{feature.channel}</span>
        </div>
      )}
      {feature.range && (
        <div className="info-item">
          <span className="label">Range:</span>
          <span className="value">{feature.range} nm</span>
        </div>
      )}
      {feature.elevation !== undefined && (
        <div className="info-item">
          <span className="label">Elevation:</span>
          <span className="value">{feature.elevation} ft</span>
        </div>
      )}
    </div>
  </div>
);

/**
 * Obstacle-specific content
 */
const ObstacleContent = ({ feature }) => (
  <div className="obstacle-content">
    <div className="info-grid">
      {feature.obstacleType && (
        <div className="info-item">
          <span className="label">Type:</span>
          <span className="value">{feature.obstacleType}</span>
        </div>
      )}
      {feature.height !== undefined && (
        <div className="info-item">
          <span className="label">Height:</span>
          <span className="value">{feature.height} ft</span>
        </div>
      )}
      {feature.lighting !== undefined && (
        <div className="info-item">
          <span className="label">Lighting:</span>
          <span className="value">{feature.lighting ? 'Yes' : 'No'}</span>
        </div>
      )}
      {feature.markings !== undefined && (
        <div className="info-item">
          <span className="label">Markings:</span>
          <span className="value">{feature.markings ? 'Yes' : 'No'}</span>
        </div>
      )}
    </div>
  </div>
);

/**
 * Generic content for unknown feature types
 */
const GenericContent = ({ feature }) => (
  <div className="generic-content">
    <div className="info-grid">
      <div className="info-item">
        <span className="label">Type:</span>
        <span className="value">{feature.type || 'Unknown'}</span>
      </div>
      {feature.id && (
        <div className="info-item">
          <span className="label">ID:</span>
          <span className="value">{feature.id}</span>
        </div>
      )}
    </div>
    
    {feature.properties && Object.keys(feature.properties).length > 0 && (
      <details className="properties-section">
        <summary>Raw Properties</summary>
        <pre className="properties-data">
          {JSON.stringify(feature.properties, null, 2)}
        </pre>
      </details>
    )}
  </div>
);

export default FeaturePopup;
