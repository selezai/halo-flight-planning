/**
 * NavaidDisplay Component
 * Displays detailed navaid information in OpenAIP-exact format
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

const NavaidDisplay = ({ feature, onClose }) => {
  // Prioritize enhanced REST API data over basic extracted properties
  const enhancedData = feature.enhancedData;
  const basicProps = feature.extractedProperties || feature.properties || feature;
  
  // VECTOR-FIRST APPROACH: Process enhanced data based on data source
  let props = basicProps;
  let dataQuality = 'vector_only';
  
  if (enhancedData) {
    console.log('📊 Data source:', enhancedData._dataSource);
    
    if (enhancedData._dataSource === 'hybrid_verified') {
      // We have verified REST API data merged with vector tile identity
      console.log('✅ Using hybrid verified data (vector identity + REST API details)');
      props = {
        ...enhancedData,
        // Ensure vector tile identity is preserved
        name: basicProps.name || enhancedData.name,
        identifier: basicProps.identifier || enhancedData.identifier,
        country: basicProps.country || enhancedData.country
      };
      dataQuality = 'complete';
      console.log('🔄 Final hybrid props:', {
        name: props.name,
        identifier: props.identifier,
        country: props.country,
        elevation: props.elevation,
        magneticDeclination: props.magneticDeclination
      });
    } else if (enhancedData._dataSource === 'vector_only') {
      // No reliable REST API match found, use vector data only
      console.log('📍 Using vector-only data (no reliable REST API match)');
      props = {
        ...basicProps,
        ...enhancedData,
        _warning: enhancedData._warning
      };
      dataQuality = 'partial';
    } else {
      // Fallback to basic props
      console.log('⚠️ Fallback to basic vector tile properties');
      props = basicProps;
      dataQuality = 'basic';
    }
  }
  
  console.log('🎯 NavaidDisplay rendering with enhanced data:', !!enhancedData);
  console.log('🎯 NavaidDisplay data source:', enhancedData ? 'REST API' : 'Vector Tiles');
  console.log('🎯 NavaidDisplay props:', props);
  console.log('🔍 NavaidDisplay enhanced data structure:', JSON.stringify(enhancedData, null, 2));
  console.log('🔍 NavaidDisplay basic props structure:', JSON.stringify(basicProps, null, 2));
  
  // Debug specific fields we need
  console.log('🔍 Enhanced data fields check:');
  console.log('  - magneticDeclination:', enhancedData?.magneticDeclination);
  console.log('  - alignedTrueNorth:', enhancedData?.alignedTrueNorth);
  console.log('  - elevation:', enhancedData?.elevation);
  console.log('  - hoursOfOperation:', enhancedData?.hoursOfOperation);
  console.log('  - geometry:', enhancedData?.geometry);
  console.log('  - coordinates:', enhancedData?.coordinates);
  
  console.log('🔍 Checking for elevation in vector tile data:');
  console.log('  - _raw.elevation:', enhancedData?._raw?.elevation);
  console.log('  - _vectorTileData.elevation:', enhancedData?._vectorTileData?.elevation);
  console.log('  - All _raw keys:', Object.keys(enhancedData?._raw || {}));
  console.log('  - All _vectorTileData keys:', Object.keys(enhancedData?._vectorTileData || {}));
  
  // Extract coordinates from geometry if available
  const coordinates = feature.geometry?.coordinates ? {
    lng: feature.geometry.coordinates[0],
    lat: feature.geometry.coordinates[1]
  } : (props.geometry?.coordinates ? {
    lng: props.geometry.coordinates[0], 
    lat: props.geometry.coordinates[1]
  } : props.coordinates);
  
  // Extract navaid-specific data from enhanced REST API response
  const navaidType = props.type !== undefined ? 
    ['DME', 'VOR', 'NDB', 'TACAN', 'VOR-DME', 'VORTAC', 'ILS', 'LOC', 'GS'][props.type] || props.type :
    (props.type || 'Unknown');
  
  // Extract frequency information
  const frequency = props.frequency?.value || props.frequency || 
    (props.name_label_full && props.name_label_full.match(/([0-9]+\.?[0-9]*) MHz/)?.[1]) || null;
  const frequencyUnit = props.frequency?.unit === 2 ? 'MHz' : (props.frequency?.unit === 1 ? 'kHz' : 'MHz');
  
  // Extract range information
  const range = props.range?.value || props.range || null;
  const rangeUnit = props.range?.unit === 1 ? 'NM' : 'km';
  
  // Extract elevation data
  const elevation = props.elevation?.value || props.elevation || null;
  const elevationUnit = props.elevation?.unit === 0 ? 'm' : 'ft';
  
  // Extract magnetic declination (from REST API or icon_rotation fallback)
  const magneticDeclination = props.magneticDeclination || props.icon_rotation || null;
  
  // Extract alignment info (from REST API alignedTrueNorth or aligned_true_north)
  const alignedTrueNorth = props.alignedTrueNorth !== undefined ? props.alignedTrueNorth : 
    (props.aligned_true_north !== undefined ? props.aligned_true_north : null);
  
  // Extract hours of operation (parse JSON string if needed)
  let hoursOfOperation = null;
  if (props.hoursOfOperation) {
    // REST API format (object)
    if (typeof props.hoursOfOperation === 'object' && props.hoursOfOperation.operatingHours) {
      const hours = props.hoursOfOperation.operatingHours;
      // Check if all days are 00:00-00:00 (24H operation)
      const is24H = hours.every(day => day.startTime === '00:00' && day.endTime === '00:00');
      hoursOfOperation = is24H ? '24H' : 'Variable';
    }
  } else if (props.hours_of_operation) {
    // Vector tile format (JSON string)
    try {
      const parsed = JSON.parse(props.hours_of_operation);
      if (parsed.operatingHours) {
        const hours = parsed.operatingHours;
        const is24H = hours.every(day => day.startTime === '00:00' && day.endTime === '00:00');
        hoursOfOperation = is24H ? '24H' : 'Variable';
      }
    } catch (e) {
      hoursOfOperation = null;
    }
  }
  
  return (
    <div className="navaid-display">
      <div className="navaid-header">
        <h2>{props.name || 'Unknown Navaid'}</h2>
        <button onClick={onClose} className="close-button">×</button>
      </div>
      
      {/* Data Quality Indicator */}
      {dataQuality === 'partial' && (
        <div className="data-quality-warning">
          ⚠️ Limited data available - showing vector tile information only
          {props._warning && <div className="warning-details">{props._warning}</div>}
        </div>
      )}
      
      {dataQuality === 'complete' && (
        <div className="data-quality-success">
          ✅ Complete data - vector tile identity with REST API details
        </div>
      )}
      
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
          {navaidType.toUpperCase()}
        </div>
      </div>
      
      {/* Range Section */}
      <div className="openaip-section">
        <h4>Range</h4>
        <div className="range-display">
          {range ? `${range} ${rangeUnit}` : 'NIL'}
        </div>
      </div>
      
      {/* Magnetic Declination */}
      <div className="openaip-section">
        <h4>Magnetic Declination</h4>
        <div className="declination-subsection">
          <h5>Magnetic Declination</h5>
          <div className="declination-display">
            {magneticDeclination !== null ? `${magneticDeclination}°` : 'NIL'}
          </div>
        </div>
      </div>
      
      {/* Aligned True North */}
      <div className="openaip-section">
        <h4>Aligned True North</h4>
        <div className="alignment-subsection">
          <h5>Aligned True North</h5>
          <div className="alignment-display">
            {alignedTrueNorth !== null ? (alignedTrueNorth ? 'Yes' : 'No') : 'NIL'}
          </div>
        </div>
      </div>
      
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
            {coordinates && coordinates.lat !== undefined && coordinates.lng !== undefined ? 
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
      
      {/* Frequency / Channel Section */}
      <div className="openaip-section">
        <h4>Frequency / Channel</h4>
        
        <div className="frequency-subsection">
          <h5>Frequency</h5>
          <div className="frequency-display">
            {frequency ? `${frequency} ${frequencyUnit}` : 'NIL'}
          </div>
        </div>
        
        <div className="channel-subsection">
          <h5>Channel</h5>
          <div className="channel-display">
            {props.channel || 'NIL'}
          </div>
        </div>
      </div>
      
      {/* Hours Of Operation Section */}
      <div className="openaip-section">
        <h4>Hours Of Operation</h4>
        <div className="operational-subsection">
          <h5>Hours Of Operation</h5>
          <div className="hours-display">
            {hoursOfOperation || 'NIL'}
          </div>
        </div>
      </div>
      
      {/* Remarks Section */}
      <div className="openaip-section">
        <h4>Remarks</h4>
        <div className="remarks-display">
          {props.remarks || 'NIL'}
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

export default NavaidDisplay;
