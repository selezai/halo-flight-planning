/**
 * Feature Information Panel Component
 * 
 * Displays detailed aviation feature information in OpenAIP-exact format
 */

import React from 'react';
import { formatCoordinates, formatElevation, formatFrequency } from '../utils/featureFormatters';
import { extractFeatureInfo } from '../utils/featureDetection';
import './OpenAipSidebar.css';

const FeatureInfoPanel = ({ feature, onClose }) => {
  if (!feature) {
    return (
      <div className="feature-info-panel">
        <div className="no-feature">
          <p>Click on any aviation feature to view detailed information</p>
        </div>
      </div>
    );
  }
  
  // Use comprehensive data extraction
  const extractedData = extractFeatureInfo(feature);
  const displayFeature = extractedData || feature;
  
  console.log('📊 Displaying feature data:', displayFeature);
  console.log('🔍 Elevation value:', displayFeature.elevation, typeof displayFeature.elevation);
  console.log('🔍 Frequency value:', displayFeature.frequency, typeof displayFeature.frequency);

  const getCountryFlag = (countryCode) => {
    const flagMap = {
      'ZA': '🇿🇦', 'US': '🇺🇸', 'GB': '🇬🇧', 'DE': '🇩🇪', 'FR': '🇫🇷',
      'IT': '🇮🇹', 'ES': '🇪🇸', 'NL': '🇳🇱', 'BE': '🇧🇪', 'CH': '🇨🇭',
      'AT': '🇦🇹', 'SE': '🇸🇪', 'NO': '🇳🇴', 'DK': '🇩🇰', 'FI': '🇫🇮',
      'AU': '🇦🇺', 'CA': '🇨🇦', 'JP': '🇯🇵', 'CN': '🇨🇳', 'IN': '🇮🇳',
      'BR': '🇧🇷', 'MX': '🇲🇽', 'AR': '🇦🇷', 'CL': '🇨🇱', 'PE': '🇵🇪'
    };
    return flagMap[countryCode] || '🏳️';
  };
  
  const getAirportTypeDisplay = (feature) => {
    // OpenAIP.net format: "Airfield Civil", "Airport International", etc.
    const type = feature.airportType || feature.type || 'unknown';
    
    const typeMap = {
      // OpenAIP specific types
      'intl_apt': 'Airport International',
      'reg_apt': 'Airport Regional',
      'civil_apt': 'Airfield Civil',
      'mil_apt': 'Airfield Military',
      'priv_apt': 'Airfield Private',
      'apt': 'Airport',  // Simple 'apt' maps to 'Airport'
      
      // Standard types
      'large_airport': 'Airport International',
      'medium_airport': 'Airport Regional', 
      'small_airport': 'Airfield Civil',
      'heliport': 'Heliport',
      'seaplane_base': 'Seaplane Base',
      'balloonport': 'Balloonport',
      'closed': 'Airport Closed',
      'civil': 'Airfield Civil',
      'military': 'Airfield Military',
      'private': 'Airfield Private',
      
      // Additional OpenAIP types
      'airport': 'Airport',
      'airfield': 'Airfield',
      'international': 'Airport International'
    };
    
    const mappedType = typeMap[type.toLowerCase()];
    if (mappedType) {
      return mappedType;
    }
    
    // Improved fallback formatting
    const lowerType = type.toLowerCase();
    
    // Handle _apt suffix types
    if (lowerType.endsWith('_apt')) {
      const prefix = lowerType.replace('_apt', '').replace('_', ' ');
      return `Airport ${prefix.charAt(0).toUpperCase() + prefix.slice(1)}`;
    }
    
    // Handle simple 'apt' case (shouldn't reach here due to direct mapping above)
    if (lowerType === 'apt') {
      return 'Airport';
    }
    
    // Default fallback
    return `Airfield ${type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}`;
  };
  
  const getOpenAipTypeDisplay = (feature) => {
    // OpenAIP.net specific type formatting
    const type = feature.airportType || feature.type || 'unknown';
    const lowerType = type.toLowerCase();
    
    // OpenAIP.net uses specific formats like "Airport resp. Airfield IFR"
    if (lowerType.includes('intl') || lowerType.includes('international')) {
      return 'Airport resp. Airfield IFR';
    }
    if (lowerType === 'apt' || lowerType === 'airport') {
      return 'Airport resp. Airfield IFR';
    }
    if (lowerType.includes('civil')) {
      return 'Airfield Civil';
    }
    if (lowerType.includes('military')) {
      return 'Airfield Military';
    }
    if (lowerType.includes('private')) {
      return 'Airfield Private';
    }
    
    return getAirportTypeDisplay(feature);
  };

  const getFeatureIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'airport':
        return '✈️';
      case 'airspace':
        return '🛡️';
      case 'navaid':
        return '📡';
      case 'obstacle':
        return '⚠️';
      case 'waypoint':
        return '📍';
      case 'hotspot':
        return '🔥';
      case 'hang_gliding':
        return '🪂';
      case 'rc_airfield':
        return '🛩️';
      case 'reporting_point':
        return '📋';
      default:
        return '📌';
    }
  };

  const getFeatureTitle = (feature) => {
    // For airports, show ICAO code + name like OpenAIP.net: "FACR CARLETONVILLE"
    if (feature.type === 'airport' || feature.sourceLayer === 'airports') {
      const icao = feature.icaoCode || feature.identifier || feature.id;
      const name = feature.name || feature.identifier;
      if (icao && name && icao !== name) {
        return `${icao} ${name.toUpperCase()}`;
      }
      return name || icao || 'Airport';
    }
    
    // For other features, use standard format
    return feature.name || 
           feature.identifier || 
           feature.icaoCode || 
           feature.designator ||
           `${feature.type || 'Feature'}`;
  };

  // OpenAIP.net exact format sections
  const renderCountrySection = () => (
    <div className="openaip-section country-section">
      <h4>Country</h4>
      <div className="country-display">
        <span className="country-flag">{getCountryFlag(displayFeature.country)}</span>
        <span className="country-code">{displayFeature.country || 'NIL'}</span>
      </div>
    </div>
  );
  
  const renderTypeSection = () => (
    <div className="openaip-section type-section">
      <h4>Type</h4>
      <div className="type-display">
        {getOpenAipTypeDisplay(displayFeature)}
      </div>
    </div>
  );
  
  const renderCodesSection = () => (
    <div className="openaip-section codes-section">
      {displayFeature.icaoCode && (
        <>
          <h4>ICAO code</h4>
          <div className="code-display">{displayFeature.icaoCode}</div>
        </>
      )}
      {displayFeature.iataCode && (
        <>
          <h4>IATA code</h4>
          <div className="code-display">{displayFeature.iataCode}</div>
        </>
      )}
    </div>
  );
  
  const renderTrafficTypesSection = () => (
    <div className="openaip-section traffic-section">
      <h4>Traffic Types</h4>
      <div className="traffic-display">
        {displayFeature.trafficTypes || displayFeature.flightRules || 'VFR'}
      </div>
    </div>
  );
  
  const renderOwnershipSection = () => {
    const hasPPR = displayFeature.ppr !== undefined;
    const isPrivate = displayFeature.ownership === 'private' || displayFeature.private;
    
    if (!hasPPR && !isPrivate) return null;
    
    return (
      <div className="openaip-section ownership-section">
        <h4>Ownership / Legal Restrictions</h4>
        <div className="ownership-grid">
          <div className="ownership-item">
            <label>PPR</label>
            <span>{displayFeature.ppr ? 'Yes' : 'No'}</span>
          </div>
          <div className="ownership-item">
            <label>Private</label>
            <span>{isPrivate ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderLocationSection = () => (
    <div className="openaip-section location-section">
      <h4>Location</h4>
      <div className="location-content">
        <div className="location-subsection">
          <h5>DMS</h5>
          <div className="coordinate-display">
            {displayFeature.coordinates ? 
              formatCoordinates({ lat: displayFeature.coordinates[1], lng: displayFeature.coordinates[0] }, 'dms') : 
              'NIL'
            }
          </div>
        </div>
        <div className="location-subsection">
          <h5>Decimals</h5>
          <div className="coordinate-display">
            {displayFeature.coordinates ? 
              formatCoordinates({ lat: displayFeature.coordinates[1], lng: displayFeature.coordinates[0] }, 'decimal') : 
              'NIL'
            }
          </div>
        </div>
        <div className="location-subsection">
          <h5>Elevation</h5>
          <div className="elevation-display">
            {displayFeature.elevation !== undefined && displayFeature.elevation !== null ? 
              `${formatElevation(displayFeature.elevation)} ${displayFeature.elevationUnit || 'm'} MSL` : 
              'NIL'
            }
          </div>
        </div>
      </div>
    </div>
  );

  const renderFrequenciesSection = () => {
    const isAirport = displayFeature.sourceLayer === 'airports';
    if (!isAirport) return null;
    
    return (
      <div className="openaip-section frequencies-section">
        <h4>Frequencies</h4>
        <div className="frequencies-content">
          {/* OpenAIP.net specific frequency types */}
          <div className="frequency-item">
            <label>APRON OFFICE</label>
            <span>{displayFeature.apronFreq || displayFeature.apron_freq || 'NIL'}</span>
          </div>
          <div className="frequency-item">
            <label>TOWER</label>
            <span>{displayFeature.frequency || displayFeature.towerFreq || displayFeature.tower_freq || displayFeature.frequencies?.find(f => f.type === 'Tower')?.frequency || 'NIL'}</span>
          </div>
          <div className="frequency-item">
            <label>RADAR APP (W)</label>
            <span>{displayFeature.radarAppW || 'NIL'}</span>
          </div>
          <div className="frequency-item">
            <label>RADAR APP (S AND E)</label>
            <span>{displayFeature.radarAppSE || 'NIL'}</span>
          </div>
          <div className="frequency-item">
            <label>RADAR APP (N)</label>
            <span>{displayFeature.radarAppN || 'NIL'}</span>
          </div>
          {/* Additional frequencies if available */}
          {displayFeature.frequencies && displayFeature.frequencies.map((freq, index) => (
            <div key={index} className="frequency-item">
              <label>{freq.type.toUpperCase()}</label>
              <span>{formatFrequency(freq.frequency)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderRunwaysSection = () => {
    const isAirport = displayFeature.sourceLayer === 'airports';
    if (!isAirport) return null;
    
    // Use extracted runway information from vector tiles
    const runwayInfo = displayFeature.runwayInfo;
    const hasRunwayData = runwayInfo && (runwayInfo.length || runwayInfo.surface || runwayInfo.rotation);
    
    return (
      <div className="openaip-section runways-section">
        <h4>Runways</h4>
        <div className="runways-content">
          {hasRunwayData ? (
            <div className="runway-item">
              <div className="runway-specs">
                {runwayInfo.length && `${runwayInfo.length} m`}
                {runwayInfo.surface && ` ${runwayInfo.surface.toUpperCase()}`}
                {runwayInfo.rotation && ` (${runwayInfo.rotation}°)`}
              </div>
            </div>
          ) : (
            // Fallback to legacy runway data if available
            displayFeature.runways && displayFeature.runways.length > 0 ? (
              displayFeature.runways.map((runway, index) => (
                <div key={index} className="runway-item">
                  <div className="runway-designator">{runway.designator || `${index + 1}`}</div>
                  <div className="runway-specs">
                    {runway.length && runway.width ? 
                      `${runway.length} x ${runway.width} m` : 
                      'Dimensions not available'
                    }
                    {runway.surface && ` ${runway.surface.toUpperCase()}`}
                  </div>
                </div>
              ))
            ) : (
              <div className="runway-item">
                <div className="runway-specs">NIL</div>
              </div>
            )
          )}
        </div>
      </div>
    );
  };
  
  const renderSpecialActivitiesSection = () => {
    const isAirport = displayFeature.sourceLayer === 'airports';
    if (!isAirport) return null;
    
    // Extract skydiving activity from vector tile data
    const skydivingActivity = displayFeature.skydiving || displayFeature.skydive_activity;
    
    return (
      <div className="openaip-section activities-section">
        <h4>Special Activities</h4>
        <div className="activities-grid">
          <div className="activity-item">
            <span className="activity-label">Skydiving</span>
            <span className="activity-value">
              {skydivingActivity === true || skydivingActivity === 'true' ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderFuelTypesSection = () => {
    const isAirport = displayFeature.sourceLayer === 'airports';
    if (!isAirport) return null;
    
    return (
      <div className="openaip-section fuel-types-section">
        <h4>Fuel Types</h4>
        <div className="fuel-content">
          <div className="fuel-item">
            <label>AVGAS</label>
            <span>{displayFeature.avgas || displayFeature.fuel_avgas ? 'Yes' : 'No'}</span>
          </div>
          <div className="fuel-item">
            <label>AVGAS UL91</label>
            <span>{displayFeature.avgas_ul91 ? 'Yes' : 'No'}</span>
          </div>
          <div className="fuel-item">
            <label>Diesel</label>
            <span>{displayFeature.diesel || displayFeature.fuel_diesel ? 'Yes' : 'No'}</span>
          </div>
          <div className="fuel-item">
            <label>JET A</label>
            <span>{displayFeature.jet_a || displayFeature.fuel_jet_a ? 'Yes' : 'No'}</span>
          </div>
          <div className="fuel-item">
            <label>JET A1</label>
            <span>{displayFeature.jet_a1 || displayFeature.fuel_jet_a1 ? 'Yes' : 'No'}</span>
          </div>
          <div className="fuel-item">
            <label>JET B</label>
            <span>{displayFeature.jet_b || displayFeature.fuel_jet_b ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderHandlingFacilitiesSection = () => {
    const isAirport = displayFeature.sourceLayer === 'airports';
    if (!isAirport) return null;
    
    return (
      <div className="openaip-section handling-facilities-section">
        <h4>Handling Facilities</h4>
        <div className="facilities-content">
          <div className="facility-item">
            <label>Cargo Handling</label>
            <span>{displayFeature.cargo_handling ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>De-Icing</label>
            <span>{displayFeature.deicing || displayFeature.de_icing ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Maintenance</label>
            <span>{displayFeature.maintenance ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Security</label>
            <span>{displayFeature.security ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Shelter</label>
            <span>{displayFeature.shelter ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderPassengerFacilitiesSection = () => {
    const isAirport = displayFeature.sourceLayer === 'airports';
    if (!isAirport) return null;
    
    return (
      <div className="openaip-section passenger-facilities-section">
        <h4>Passenger Facilities</h4>
        <div className="facilities-content">
          <div className="facility-item">
            <label>Bank Office</label>
            <span>{displayFeature.bank_office ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Post Office</label>
            <span>{displayFeature.post_office ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Customs</label>
            <span>{displayFeature.hasCustoms || displayFeature.customs ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Lodging</label>
            <span>{displayFeature.lodging ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Medical Facility</label>
            <span>{displayFeature.medical_facility ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Restaurant</label>
            <span>{displayFeature.restaurant ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Sanitation</label>
            <span>{displayFeature.sanitation ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Transportation</label>
            <span>{displayFeature.transportation ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Laundry Service</label>
            <span>{displayFeature.laundry_service ? 'Yes' : 'No'}</span>
          </div>
          <div className="facility-item">
            <label>Camping</label>
            <span>{displayFeature.camping ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderGliderTowingSection = () => {
    const isAirport = displayFeature.sourceLayer === 'airports';
    if (!isAirport) return null;
    
    return (
      <div className="openaip-section glider-towing-section">
        <h4>Glider Towing</h4>
        <div className="glider-content">
          <div className="glider-item">
            <label>Self Launch</label>
            <span>{displayFeature.self_launch ? 'Yes' : 'No'}</span>
          </div>
          <div className="glider-item">
            <label>Aero Tow</label>
            <span>{displayFeature.aero_tow ? 'Yes' : 'No'}</span>
          </div>
          <div className="glider-item">
            <label>Winch</label>
            <span>{displayFeature.winch ? 'Yes' : 'No'}</span>
          </div>
          <div className="glider-item">
            <label>Auto Tow</label>
            <span>{displayFeature.auto_tow ? 'Yes' : 'No'}</span>
          </div>
          <div className="glider-item">
            <label>Bungee</label>
            <span>{displayFeature.bungee ? 'Yes' : 'No'}</span>
          </div>
          <div className="glider-item">
            <label>Gravity</label>
            <span>{displayFeature.gravity ? 'Yes' : 'No'}</span>
          </div>
        </div>
      </div>
    );
  };
  
  const renderHoursOfOperationSection = () => (
    <div className="openaip-section hours-section">
      <h4>Hours Of Operation</h4>
      <div className="hours-content">
        {displayFeature.operatingHours || displayFeature.hours || 'NIL'}
      </div>
    </div>
  );
  
  const renderRemarksSection = () => (
    <div className="openaip-section remarks-section">
      <h4>Remarks</h4>
      <div className="remarks-content">
        {displayFeature.remarks || 'NIL'}
      </div>
    </div>
  );
  
  const renderOperationalInfo = () => {
    const hasOperationalInfo = displayFeature.operatingHours || displayFeature.remarks || 
                              displayFeature.status || displayFeature.ownership;
    
    if (!hasOperationalInfo) {
      return null;
    }

    return (
      <div className="info-section operational-info">
        {displayFeature.operatingHours && (
          <div className="operational-hours">
            <h4>Hours Of Operation</h4>
            <div className="hours-content">
              {displayFeature.operatingHours || '24H'}
            </div>
          </div>
        )}
        
        {displayFeature.status && (
          <div className="status-info">
            <h4>Operational Status</h4>
            <div className="status-content">
              <span className={`status ${displayFeature.status === 'active' ? 'active' : 'inactive'}`}>
                {displayFeature.status.toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        {displayFeature.ownership && (
          <div className="ownership-info">
            <h4>Ownership</h4>
            <div className="ownership-content">
              {displayFeature.ownership}
            </div>
          </div>
        )}
        
        {displayFeature.remarks && (
          <div className="remarks">
            <h4>Remarks</h4>
            <div className="remarks-content">
              {displayFeature.remarks || 'NIL'}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const renderAirportServices = () => {
    const isAirport = displayFeature.type === 'airport' || displayFeature.sourceLayer === 'airports';
    
    if (!isAirport) return null;
    
    const hasServices = displayFeature.hasControlTower || displayFeature.hasFuel || 
                       displayFeature.hasCustoms || displayFeature.hasApproachLighting;
    
    if (!hasServices) return null;
    
    return (
      <div className="info-section services-info">
        <h4>Airport Services</h4>
        <div className="info-grid">
          {displayFeature.hasControlTower !== null && (
            <div className="info-item">
              <label>Control Tower:</label>
              <span className={`status ${displayFeature.hasControlTower ? 'active' : 'inactive'}`}>
                {displayFeature.hasControlTower ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          {displayFeature.hasFuel !== null && (
            <div className="info-item">
              <label>Fuel Available:</label>
              <span className={`status ${displayFeature.hasFuel ? 'active' : 'inactive'}`}>
                {displayFeature.hasFuel ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          {displayFeature.hasCustoms !== null && (
            <div className="info-item">
              <label>Customs:</label>
              <span className={`status ${displayFeature.hasCustoms ? 'active' : 'inactive'}`}>
                {displayFeature.hasCustoms ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          {displayFeature.hasApproachLighting !== null && (
            <div className="info-item">
              <label>Approach Lighting:</label>
              <span className={`status ${displayFeature.hasApproachLighting ? 'active' : 'inactive'}`}>
                {displayFeature.hasApproachLighting ? 'Yes' : 'No'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderRunwayInfo = () => {
    const isAirport = displayFeature.type === 'airport' || displayFeature.sourceLayer === 'airports';
    
    if (!isAirport) return null;
    
    const hasRunwayInfo = displayFeature.runways || displayFeature.longestRunway || 
                         displayFeature.runwayCount || displayFeature.surfaceType;
    
    if (!hasRunwayInfo) return null;
    
    return (
      <div className="info-section runway-info">
        <h4>Runway Information</h4>
        <div className="info-grid">
          {displayFeature.runwayCount && (
            <div className="info-item">
              <label>Runway Count:</label>
              <span>{displayFeature.runwayCount}</span>
            </div>
          )}
          {displayFeature.longestRunway && (
            <div className="info-item">
              <label>Longest Runway:</label>
              <span>{displayFeature.longestRunway} ft</span>
            </div>
          )}
          {displayFeature.surfaceType && (
            <div className="info-item">
              <label>Surface Type:</label>
              <span>{displayFeature.surfaceType}</span>
            </div>
          )}
          {displayFeature.runways && displayFeature.runways.map((runway, index) => (
            <div key={index} className="info-item">
              <label>Runway {runway.designator || index + 1}:</label>
              <span>
                {runway.length && `${runway.length}ft`}
                {runway.surface && ` (${runway.surface})`}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  const renderContactInfo = () => {
    const hasContactInfo = displayFeature.website || displayFeature.phone;
    
    if (!hasContactInfo) return null;
    
    return (
      <div className="info-section contact-info">
        <h4>Contact Information</h4>
        <div className="info-grid">
          {displayFeature.website && (
            <div className="info-item">
              <label>Website:</label>
              <span>
                <a href={displayFeature.website} target="_blank" rel="noopener noreferrer">
                  {displayFeature.website}
                </a>
              </span>
            </div>
          )}
          {displayFeature.phone && (
            <div className="info-item">
              <label>Phone:</label>
              <span>{displayFeature.phone}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderAirspaceInfo = () => {
    const isAirspace = displayFeature.sourceLayer === 'airspaces';
    
    if (!isAirspace) return null;
    
    return (
      <div className="info-section airspace-info">
        <h4>Airspace Information</h4>
        <div className="info-grid">
          {displayFeature.airspaceClass && (
            <div className="info-item">
              <label>Class:</label>
              <span className="airspace-class">{displayFeature.airspaceClass}</span>
            </div>
          )}
          {displayFeature.lowerLimit && (
            <div className="info-item">
              <label>Lower Limit:</label>
              <span>{displayFeature.lowerLimit}</span>
            </div>
          )}
          {displayFeature.upperLimit && (
            <div className="info-item">
              <label>Upper Limit:</label>
              <span>{displayFeature.upperLimit}</span>
            </div>
          )}
          {displayFeature.activity && (
            <div className="info-item">
              <label>Activity:</label>
              <span>{displayFeature.activity}</span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderObstacleInfo = () => {
    const isObstacle = displayFeature.sourceLayer === 'obstacles';
    
    if (!isObstacle) return null;
    
    return (
      <div className="info-section obstacle-info">
        <h4>Obstacle Information</h4>
        <div className="info-grid">
          {displayFeature.height && (
            <div className="info-item">
              <label>Height:</label>
              <span>{displayFeature.height} {displayFeature.heightUnit || 'ft'}</span>
            </div>
          )}
          {displayFeature.agl && (
            <div className="info-item">
              <label>AGL:</label>
              <span>{displayFeature.agl} ft</span>
            </div>
          )}
          {displayFeature.lighting && (
            <div className="info-item">
              <label>Lighting:</label>
              <span>{displayFeature.lighting}</span>
            </div>
          )}
          {displayFeature.marking && (
            <div className="info-item">
              <label>Marking:</label>
              <span>{displayFeature.marking}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdditionalInfo = () => {
    const additionalFields = Object.entries(displayFeature)
      .filter(([key, value]) => 
        !['name', 'identifier', 'icaoCode', 'iataCode', 'country', 'type', 'status', 
          'coordinates', 'elevation', 'magneticVariation', 'frequency', 'range', 
          'channel', 'power', 'class', 'upperLimit', 'lowerLimit', 'activity', 
          'runways'].includes(key) && 
        value !== null && 
        value !== undefined && 
        value !== ''
      );

    if (additionalFields.length === 0) return null;

    return (
      <div className="info-section additional-info">
        <h4>Additional Information</h4>
        <div className="info-grid">
          {additionalFields.map(([key, value]) => {
            // Format certain fields using the same logic as main display
            let displayValue = String(value);
            
            if (key === 'airportType' && displayFeature.sourceLayer === 'airports') {
              displayValue = getAirportTypeDisplay({ airportType: value, type: value });
            }
            
            return (
              <div key={key} className="info-item">
                <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</label>
                <span>{displayValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="feature-info-panel openaip-format">
      <div className="feature-header">
        <div className="feature-title">
          <h3>{getFeatureTitle(displayFeature)}</h3>
        </div>
      </div>
      
      <div className="feature-content">
        {renderCountrySection()}
        {renderTypeSection()}
        {renderCodesSection()}
        {renderTrafficTypesSection()}
        {renderLocationSection()}
        {renderOwnershipSection()}
        {renderFrequenciesSection()}
        {renderRunwaysSection()}
        {renderSpecialActivitiesSection()}
        {renderFuelTypesSection()}
        {renderHandlingFacilitiesSection()}
        {renderPassengerFacilitiesSection()}
        {renderGliderTowingSection()}
        {renderHoursOfOperationSection()}
        {renderRemarksSection()}
      </div>
    </div>
  );
};

export default FeatureInfoPanel;
