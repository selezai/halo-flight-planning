/**
 * AirportDisplay Component
 * Displays detailed airport information in OpenAIP-exact format
 */

import React from 'react';

/**
 * Format coordinates to DMS (Degrees, Minutes, Seconds)
 * @param {Object} coordinates - {lng, lat}
 * @returns {string} - Formatted DMS string
 */
const formatDMS = (coordinates) => {
  if (!coordinates || !coordinates.lat || !coordinates.lng) {
    return 'NIL';
  }
  
  const { lat, lng } = coordinates;
  
  // Convert latitude
  const latDeg = Math.floor(Math.abs(lat));
  const latMin = Math.floor((Math.abs(lat) - latDeg) * 60);
  const latSec = ((Math.abs(lat) - latDeg - latMin / 60) * 3600).toFixed(1);
  const latDir = lat >= 0 ? 'N' : 'S';
  
  // Convert longitude
  const lngDeg = Math.floor(Math.abs(lng));
  const lngMin = Math.floor((Math.abs(lng) - lngDeg) * 60);
  const lngSec = ((Math.abs(lng) - lngDeg - lngMin / 60) * 3600).toFixed(1);
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  return `${latDeg}°${latMin}'${latSec}"${latDir}, ${lngDeg}°${lngMin}'${lngSec}"${lngDir}`;
};

/**
 * Get country flag emoji from country code
 * @param {string} countryCode - ISO country code
 * @returns {string} - Flag emoji
 */
const getCountryFlag = (countryCode) => {
  if (!countryCode) return '🏳️';
  
  const flagMap = {
    'ZA': '🇿🇦', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
    'IT': '🇮🇹', 'ES': '🇪🇸', 'CH': '🇨🇭', 'AT': '🇦🇹', 'NL': '🇳🇱',
    'BE': '🇧🇪', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮'
  };
  
  return flagMap[countryCode.toUpperCase()] || '🏳️';
};

const AirportDisplay = ({ feature, onClose }) => {
  // Prioritize enhanced REST API data over basic extracted properties
  const enhancedData = feature.enhancedData;
  const basicProps = feature.extractedProperties || feature.properties || feature;
  const props = enhancedData || basicProps;
  
  console.log('🛩️ AirportDisplay rendering with enhanced data:', !!enhancedData);
  console.log('🛩️ AirportDisplay data source:', enhancedData ? 'REST API' : 'Vector Tiles');
  console.log('🛩️ AirportDisplay props:', props);
  
  // Extract coordinates from geometry if available
  const coordinates = feature.geometry?.coordinates ? {
    lng: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1]
  } : (props.geometry?.coordinates ? {
    lng: props.geometry.coordinates[0], 
    lat: props.geometry.coordinates[1]
  } : props.coordinates);
  
  // Extract runway information from enhanced data
  const runways = props.runways || [];
  const primaryRunway = runways.length > 0 ? runways[0] : null;
  
  // Extract frequency information
  const frequencies = props.frequencies || [];
  const primaryFreq = frequencies.find(f => f.primary) || frequencies[0];
  
  // Extract elevation data
  const elevation = props.elevation?.value || props.elevation || null;
  const elevationUnit = props.elevation?.unit === 0 ? 'm' : 'ft';
  
  // Format airport type
  const airportType = props.type !== undefined ? 
    ['Civil', 'Military', 'Private', 'Heliport', 'Seaplane Base'][props.type] || 'Unknown' :
    'Airport';
  
  return (
    <div className="feature-info-panel openaip-format">
      {/* Header */}
      <div className="feature-header">
        <h3 className="feature-title">
          {props.icaoCode || props.icao || props.identifier || props.id} {props.name || 'Unnamed Airport'}
        </h3>
        <button className="close-btn" onClick={onClose} title="Close">
          ×
        </button>
      </div>
      
      {/* Country Section */}
      <div className="openaip-section">
        <h4>Country</h4>
        <div className="country-display">
          <span className="country-flag">{getCountryFlag(props.country)}</span>
          <span className="country-code">{props.country || 'Unknown'}</span>
        </div>
      </div>
      
      {/* Type Section */}
      <div className="openaip-section">
        <h4>Type</h4>
        <div className="type-display">
          {airportType}
        </div>
      </div>
      
      {/* ICAO/IATA Codes */}
      {(props.icaoCode || props.icao || props.iataCode || props.iata) && (
        <div className="openaip-section">
          <h4>Codes</h4>
          {(props.icaoCode || props.icao) && (
            <div className="code-subsection">
              <h5>ICAO</h5>
              <div className="code-display">{props.icaoCode || props.icao}</div>
            </div>
          )}
          {(props.iataCode || props.iata) && (
            <div className="code-subsection">
              <h5>IATA</h5>
              <div className="code-display">{props.iataCode || props.iata}</div>
            </div>
          )}
        </div>
      )}
      
      {/* Location Section */}
      <div className="openaip-section">
        <h4>Location</h4>
        
        <div className="location-subsection">
          <h5>DMS</h5>
          <div className="dms-coords">
            {formatDMS(coordinates)}
          </div>
        </div>
        
        <div className="location-subsection">
          <h5>Decimals</h5>
          <div className="decimal-coords">
            {coordinates ? 
              `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : 
              'NIL'}
          </div>
        </div>
        
        <div className="location-subsection">
          <h5>Elevation</h5>
          <div className="elevation-display">
            {elevation ? `${elevation} ${elevationUnit} MSL` : 'NIL'}
          </div>
        </div>
      </div>
      
      {/* Frequencies Section */}
      {frequencies.length > 0 && (
        <div className="openaip-section">
          <h4>Frequencies</h4>
          {frequencies.map((freq, index) => (
            <div key={index} className="frequency-subsection">
              <h5>{freq.name || freq.type || 'Frequency'}</h5>
              <div className="frequency-display">
                {freq.value} MHz {freq.primary ? '(Primary)' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Runway Information */}
      {runways.length > 0 && (
        <div className="openaip-section">
          <h4>Runways</h4>
          {runways.map((runway, index) => (
            <div key={index} className="runway-item">
              <h5>Runway {runway.designator}</h5>
              <div className="runway-details">
                {runway.dimension && (
                  <div className="runway-subsection">
                    <span>Dimensions: {runway.dimension.length?.value}m × {runway.dimension.width?.value}m</span>
                  </div>
                )}
                {runway.surface && (
                  <div className="runway-subsection">
                    <span>Surface: {runway.surface.mainComposite !== undefined ? 
                      ['Concrete', 'Asphalt', 'Grass', 'Gravel', 'Sand', 'Water'][runway.surface.mainComposite] || 'Unknown' :
                      runway.surface}
                    </span>
                  </div>
                )}
                {runway.trueHeading !== undefined && (
                  <div className="runway-subsection">
                    <span>Heading: {runway.trueHeading}°</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Runway Information */}
      {(props.runway || props.length || props.width || props.surface) && (
        <div className="openaip-section">
          <h4>Runway Information</h4>
          
          {props.runway && (
            <div className="runway-subsection">
              <h5>Runway</h5>
              <div className="runway-display">{props.runway}</div>
            </div>
          )}
          
          {props.length && (
            <div className="runway-subsection">
              <h5>Length</h5>
              <div className="length-display">{props.length} m</div>
            </div>
          )}
          
          {props.width && (
            <div className="runway-subsection">
              <h5>Width</h5>
              <div className="width-display">{props.width} m</div>
            </div>
          )}
          
          {props.surface && (
            <div className="runway-subsection">
              <h5>Surface</h5>
              <div className="surface-display">{props.surface}</div>
            </div>
          )}
          
          {props.lighting && (
            <div className="runway-subsection">
              <h5>Lighting</h5>
              <div className="lighting-display">{props.lighting}</div>
            </div>
          )}
        </div>
      )}
      
      {/* Traffic Types */}
      {props.trafficTypes && (
        <div className="openaip-section">
          <h4>Traffic Types</h4>
          <div className="traffic-display">
            {props.trafficTypes}
          </div>
        </div>
      )}
      
      {/* Operational Status */}
      {props.status && (
        <div className="openaip-section">
          <h4>Status</h4>
          <div className="status-display">
            {props.status}
          </div>
        </div>
      )}
      
      {/* Public Access */}
      <div className="openaip-section">
        <h4>Public Access</h4>
        <div className="public-display">
          {props.public ? 'Yes' : 'No'}
        </div>
      </div>
      
      {/* Debug Section (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="openaip-section debug-section">
          <h4>Debug Info</h4>
          <details>
            <summary>Raw Properties</summary>
            <pre>{JSON.stringify(props._raw || props, null, 2)}</pre>
          </details>
          <details>
            <summary>Source Layer</summary>
            <div>{props.sourceLayer}</div>
          </details>
          <details>
            <summary>Data Source</summary>
            <div>{props._dataSource || 'vector_tile'}</div>
          </details>
        </div>
      )}
    </div>
  );
};

export default AirportDisplay;
