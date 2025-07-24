import React from 'react';

/**
 * Simple feature display component that shows raw vector tile properties
 * directly, mimicking the simple logic used by map labels.
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
  
  // Get raw properties directly 
  const props = feature.properties || {};
  
  console.log('🔍 Simple display - Raw properties:', props);
  console.log('🗂️ Source layer:', feature.sourceLayer);
  
  // Helper functions for parsing text data
  const parseElevationFromLabel = (label) => {
    if (!label) return null;
    const elevMatch = label.match(/(\d+)\s*(?:ft|m|')/i);
    return elevMatch ? elevMatch[0] : null;
  };

  const parseFrequencyFromLabel = (label) => {
    if (!label) return null;
    const freqMatch = label.match(/(\d{3}\.\d{1,3})\s*(?:MHz)?/i);
    return freqMatch ? `${freqMatch[1]} MHz` : null;
  };

  const parseRunwayInfo = (label) => {
    if (!label) return { length: null, surface: null };
    
    const lengthMatch = label.match(/(\d{3,4})\s*(?:m|ft)/i);
    
    const surfacePatterns = {
      'asph': 'Asphalt',
      'conc': 'Concrete', 
      'grass': 'Grass',
      'gravel': 'Gravel',
      'dirt': 'Dirt',
      'sand': 'Sand'
    };
    
    let surface = null;
    for (const [pattern, name] of Object.entries(surfacePatterns)) {
      if (label.toLowerCase().includes(pattern)) {
        surface = name;
        break;
      }
    }
    
    return {
      length: lengthMatch ? lengthMatch[0] : null,
      surface: surface
    };
  };

  const formatElevation = (elevation) => {
    if (elevation && elevation !== 'Unknown') {
      const num = parseFloat(elevation);
      if (!isNaN(num)) {
        return `${Math.round(num)} ft`;
      }
      return elevation;
    }
    return 'Unknown';
  };

  // Parse data from labels and properties
  const labelText = props.name_label_full || props.name_label || props.description || '';
  const runwayInfo = parseRunwayInfo(labelText);
  const elevFromLabel = parseElevationFromLabel(labelText);
  const freqFromLabel = parseFrequencyFromLabel(labelText);
  
  // Build display data object
  const displayData = {
    name: props.name || 'Unknown',
    icao: props.icao || props.identifier || 'N/A',
    iata: props.iata || 'NIL',
    type: props.type || 'Unknown',
    country: props.country || 'Unknown',
    elevation: props.elevation || 'Unknown',
    elevationFormatted: formatElevation(props.elevation) || elevFromLabel || 'Unknown',
    fullLabel: labelText,
    coordinates: feature.geometry?.coordinates || [0, 0],
    frequency: props.frequency,
    towerFreq: props.tower_frequency || props.twr_freq,
    frequencyFromLabel: freqFromLabel,
    trafficType: props.traffic_type || props.usage || 'Unknown',
    runwayLength: runwayInfo.length || props.runway_length,
    runwaySurface: runwayInfo.surface || props.runway_surface,
    description: props.description,
    remarks: props.remarks,
    skydiving: props.skydiving || false,
    avgas: props.avgas || false,
    jetA1: props.jet_a1 || props.jeta1 || false,
    ppr: props.ppr || false,
    private: props.private || false,
    sourceLayer: feature.sourceLayer || 'Unknown'
  };

  return (
    <div className="feature-info-panel">
      {/* Header */}
      <div className="feature-header">
        <h3>{displayData.name}</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>
      
      {/* Basic Info */}
      <div className="feature-section">
        <h4>Basic Information</h4>
        <div className="info-grid">
          <div className="info-item">
            <label>Country:</label>
            <span>{displayData.country}</span>
          </div>
          <div className="info-item">
            <label>Type:</label>
            <span>{displayData.type}</span>
          </div>
          <div className="info-item">
            <label>ICAO code:</label>
            <span>{displayData.icao}</span>
          </div>
          <div className="info-item">
            <label>IATA code:</label>
            <span>{displayData.iata}</span>
          </div>
          <div className="info-item">
            <label>Traffic Types:</label>
            <span>{displayData.trafficType}</span>
          </div>
        </div>
      </div>
      
      {/* Location */}
      <div className="feature-section">
        <h4>Location</h4>
        <div className="info-grid">
          <div className="info-item">
            <label>Decimals:</label>
            <span>
              {displayData.coordinates[1]?.toFixed(6)}, {displayData.coordinates[0]?.toFixed(6)}
            </span>
          </div>
          <div className="info-item">
            <label>Elevation:</label>
            <span>{displayData.elevationFormatted}</span>
          </div>
        </div>
      </div>
      
      {/* Frequencies */}
      <div className="feature-section">
        <h4>Frequencies</h4>
        <div className="info-grid">
          {displayData.frequency && (
            <div className="info-item">
              <label>Primary:</label>
              <span>{displayData.frequency}</span>
            </div>
          )}
          {displayData.towerFreq && (
            <div className="info-item">
              <label>Tower:</label>
              <span>{displayData.towerFreq}</span>
            </div>
          )}
          {displayData.frequencyFromLabel && (
            <div className="info-item">
              <label>From Label:</label>
              <span>{displayData.frequencyFromLabel}</span>
            </div>
          )}
          {!displayData.frequency && !displayData.towerFreq && !displayData.frequencyFromLabel && (
            <div className="info-item">
              <span>No frequency data available</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Runway Info */}
      {(displayData.runwayLength || displayData.runwaySurface) && (
        <div className="feature-section">
          <h4>Runways</h4>
          <div className="info-grid">
            {displayData.runwayLength && (
              <div className="info-item">
                <label>Length:</label>
                <span>{displayData.runwayLength}</span>
              </div>
            )}
            {displayData.runwaySurface && (
              <div className="info-item">
                <label>Surface:</label>
                <span>{displayData.runwaySurface}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Services */}
      <div className="feature-section">
        <h4>Services & Facilities</h4>
        <div className="info-grid">
          <div className="info-item">
            <label>Skydiving:</label>
            <span>{displayData.skydiving ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <label>AVGAS:</label>
            <span>{displayData.avgas ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <label>JET A1:</label>
            <span>{displayData.jetA1 ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <label>PPR:</label>
            <span>{displayData.ppr ? 'Yes' : 'No'}</span>
          </div>
          <div className="info-item">
            <label>Private:</label>
            <span>{displayData.private ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
      
      {/* Additional Text Info */}
      {(displayData.fullLabel || displayData.description || displayData.remarks) && (
        <div className="feature-section">
          <h4>Additional Information</h4>
          {displayData.fullLabel && (
            <div className="info-item">
              <label>Full Label:</label>
              <span>{displayData.fullLabel}</span>
            </div>
          )}
          {displayData.description && (
            <div className="info-item">
              <label>Description:</label>
              <span>{displayData.description}</span>
            </div>
          )}
          {displayData.remarks && (
            <div className="info-item">
              <label>Remarks:</label>
              <span>{displayData.remarks}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Debug Info */}
      <div className="feature-section">
        <h4>Debug Information</h4>
        <div className="info-item">
          <label>Source Layer:</label>
          <span>{displayData.sourceLayer}</span>
        </div>
        <details>
          <summary>Raw Properties</summary>
          <pre style={{ fontSize: '12px', overflow: 'auto', maxHeight: '200px' }}>
            {JSON.stringify(props, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
};

export default SimpleFeatureDisplay;
