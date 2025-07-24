/**
 * Feature Detection and Analysis Utilities for OpenAIP Vector Tiles
 * 
 * This module provides utilities to detect, classify, and extract information
 * from OpenAIP vector tile features including airports, airspaces, navaids, and obstacles.
 */

/**
 * Extract elevation from name_label or name_label_full fields
 * @param {Object} props - Feature properties
 * @returns {number|null} - Elevation in meters or null
 */
function extractElevationFromLabels(props) {
  const labelFields = ['name_label_full', 'name_label', 'label', 'full_name'];
  
  for (const field of labelFields) {
    if (props[field]) {
      const label = props[field];
      console.log(`🔍 Checking elevation in ${field}:`, label);
      
      // Match patterns like "LFEV 207 m MSL" or "207 m MSL"
      const elevationMatch = label.match(/(?:^|\s)(\d+)\s*m\s*MSL/i);
      if (elevationMatch) {
        const elevation = parseInt(elevationMatch[1]);
        console.log(`✅ Found elevation: ${elevation} m`);
        if (!isNaN(elevation)) {
          return elevation;
        }
      }
      
      // Also try patterns like "LFEV 207 FT MSL" or "207 FT MSL"
      const elevationFtMatch = label.match(/(?:^|\s)(\d+)\s*ft\s*MSL/i);
      if (elevationFtMatch) {
        const elevationFt = parseInt(elevationFtMatch[1]);
        console.log(`✅ Found elevation: ${elevationFt} ft (${Math.round(elevationFt * 0.3048)} m)`);
        if (!isNaN(elevationFt)) {
          return Math.round(elevationFt * 0.3048); // Convert feet to meters
        }
      }
      
      console.log(`❌ No elevation pattern matched in: ${label}`);
    }
  }
  
  return null;
}

/**
 * Extract frequency from name_label_full field
 * @param {Object} props - Feature properties
 * @returns {string|null} - Frequency or null
 */
function extractFrequencyFromLabels(props) {
  const labelFields = ['name_label_full', 'name_label', 'label', 'full_name', 'frequency', 'freq'];
  
  for (const field of labelFields) {
    if (props[field]) {
      const label = props[field].toString();
      console.log(`🔍 Checking frequency in ${field}:`, label);
      
      // Enhanced patterns for different frequency formats
      const frequencyPatterns = [
        // Standard aviation frequencies: "118.500 MHz", "118.50", "118.5"
        /(\d{3}\.\d{1,3})(?:\s*MHz)?/i,
        // Alternative format: "118500" (kHz format)
        /(\d{6})(?:\s*kHz)?/i,
        // Short format: "118.5" without decimals
        /(\d{3}\.\d{1,2})/,
        // VHF range with explicit MHz: "121.5 MHz"
        /(1[0-3]\d\.\d{1,3})\s*MHz/i
      ];
      
      for (const pattern of frequencyPatterns) {
        const match = label.match(pattern);
        if (match) {
          let frequency = parseFloat(match[1]);
          
          // Convert kHz to MHz if needed
          if (frequency > 1000) {
            frequency = frequency / 1000;
          }
          
          console.log(`✅ Found frequency: ${frequency} MHz`);
          
          // Validate aviation frequency range (VHF: 108-137 MHz)
          if (!isNaN(frequency) && frequency >= 108 && frequency <= 137) {
            return `${frequency.toFixed(3)} MHz`;
          }
          
          // Also check UHF range for military (225-400 MHz)
          if (!isNaN(frequency) && frequency >= 225 && frequency <= 400) {
            return `${frequency.toFixed(3)} MHz`;
          }
        }
      }
      
      console.log(`❌ No frequency pattern matched in: ${label}`);
    }
  }
  
  return null;
}

/**
 * Extract runway information from vector tile properties
 * @param {Object} props - Feature properties
 * @returns {Object} - Runway information
 */
const extractRunwayInfo = (props) => {
  const runways = [];
  
  // Check for runway length patterns in various fields
  const fieldsToCheck = [
    'name_label_full',
    'name_label', 
    'runway_length',
    'runway_info',
    'runways',
    'description',
    'label',
    'full_name'
  ];
  
  // Enhanced pattern to match runway lengths like "1000 m", "3280 ft", "1000m", "3280ft"
  const runwayLengthPattern = /(\d{3,4})\s*(m|ft|meters|feet)\b/gi;
  
  // Pattern to match runway designators like "09/27", "18/36"
  const runwayDesignatorPattern = /(\d{2})\/(\d{2})/g;
  
  for (const field of fieldsToCheck) {
    if (props[field]) {
      const fieldValue = props[field].toString();
      console.log(`🔍 Checking runway info in ${field}:`, fieldValue);
      
      const lengthMatches = [...fieldValue.matchAll(runwayLengthPattern)];
      const designatorMatches = [...fieldValue.matchAll(runwayDesignatorPattern)];
      
      for (const match of lengthMatches) {
        const length = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        
        // Validate runway length (reasonable range)
        if (length >= 100 && length <= 10000) {
          const runway = {
            length: length,
            unit: unit.startsWith('f') ? 'ft' : 'm',
            surface: extractSurfaceType(props),
            designator: designatorMatches.length > 0 ? designatorMatches[0][0] : null
          };
          
          console.log(`✅ Found runway data:`, runway);
          runways.push(runway);
        }
      }
    }
  }
  
  // If no runway length found, try to extract other runway info
  if (runways.length === 0) {
    const surface = extractSurfaceType(props);
    const designator = extractRunwayDesignator(props.name_label_full || props.name_label || '');
    
    if (surface || designator) {
      const basicInfo = {
        length: null,
        unit: 'm',
        surface: surface,
        designator: designator
      };
      console.log(`✅ Found basic runway info:`, basicInfo);
      return basicInfo;
    }
  }
  
  return runways.length > 0 ? runways[0] : null;
};

/**
 * Extract surface type from various fields
 * @param {Object} props - Feature properties
 * @returns {string|null} - Surface type
 */
const extractSurfaceType = (props) => {
  const surfaceKeywords = {
    'Asphalt': ['asphalt', 'paved', 'asp', 'sealed'],
    'Concrete': ['concrete', 'con', 'cement'],
    'Grass': ['grass', 'turf', 'sod'],
    'Gravel': ['gravel', 'stone', 'crushed'],
    'Dirt': ['dirt', 'soil', 'earth', 'clay'],
    'Sand': ['sand', 'sandy'],
    'Water': ['water', 'sea', 'lake']
  };
  
  // Fields to check for surface information
  const fieldsToCheck = [
    props.surface_type,
    props.runway_surface,
    props.surface,
    props.name_label_full,
    props.name_label,
    props.remarks
  ];
  
  const textToCheck = fieldsToCheck
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  
  for (const [surface, keywords] of Object.entries(surfaceKeywords)) {
    if (keywords.some(keyword => textToCheck.includes(keyword))) {
      console.log(`✅ Found surface type: ${surface}`);
      return surface;
    }
  }
  
  return null;
};

/**
 * Extract runway designator from text
 * @param {string} text - Text to search
 * @returns {string|null} - Runway designator
 */
const extractRunwayDesignator = (text) => {
  if (!text) return null;
  
  const designatorPattern = /(\d{2})\/(\d{2})/;
  const match = text.match(designatorPattern);
  
  if (match) {
    console.log(`✅ Found runway designator: ${match[0]}`);
    return match[0];
  }
  
  return null;
};

/**
 * Extract traffic types from vector tile properties
 * @param {Object} props - Feature properties
 * @returns {string} - Traffic types
 */
const extractTrafficTypes = (props) => {
  console.log('🔍 Extracting traffic types from:', props);
  
  // Direct property check first
  const directTrafficTypes = extractProperty(props, [
    'traffic_types', 'flight_rules', 'vfr_ifr', 'rules', 'traffic_type'
  ]);
  
  if (directTrafficTypes) {
    console.log('✅ Found direct traffic types:', directTrafficTypes);
    return directTrafficTypes;
  }
  
  // Analyze airport type and characteristics to determine traffic types
  const airportType = (props.type || props.airport_type || '').toLowerCase();
  const icaoClass = (props.icao_class || '').toLowerCase();
  const nameLabel = (props.name_label_full || props.name_label || '').toLowerCase();
  const use = (props.use || props.usage || '').toLowerCase();
  
  const trafficTypes = [];
  
  // Enhanced IFR detection
  const ifrIndicators = [
    'ifr', 'instrument', 'ils', 'approach', 'controlled', 'tower',
    'radar', 'international', 'commercial', 'airline'
  ];
  
  const vfrOnlyIndicators = [
    'ultralight', 'microlight', 'glider', 'balloon', 'private',
    'recreational', 'training', 'uncontrolled'
  ];
  
  const textToCheck = `${airportType} ${icaoClass} ${nameLabel} ${use}`;
  console.log('🔍 Analyzing text for traffic types:', textToCheck);
  
  // Check for explicit IFR indicators
  const hasIfrIndicators = ifrIndicators.some(indicator => textToCheck.includes(indicator));
  
  // Check airport type for IFR capability
  const ifrCapableTypes = [
    'intl_apt', 'large_airport', 'medium_airport', 'airport',
    'reg_apt', 'civil_apt', 'mil_apt'
  ];
  
  const hasIfrCapableType = ifrCapableTypes.some(type => airportType.includes(type));
  
  // Check ICAO class for controlled airspace
  const controlledClasses = ['c', 'd', 'b', 'a'];
  const hasControlledClass = controlledClasses.includes(icaoClass);
  
  // Determine IFR capability
  if (hasIfrIndicators || hasIfrCapableType || hasControlledClass) {
    trafficTypes.push('IFR');
    console.log('✅ IFR capability detected');
  }
  
  // Check for VFR-only restrictions
  const hasVfrOnlyIndicators = vfrOnlyIndicators.some(indicator => textToCheck.includes(indicator));
  const isVfrOnly = textToCheck.includes('vfr only') || textToCheck.includes('visual only');
  
  // Most airports support VFR unless explicitly IFR-only
  if (!textToCheck.includes('ifr only') && !textToCheck.includes('instrument only')) {
    trafficTypes.push('VFR');
    console.log('✅ VFR capability detected');
  }
  
  // Special case: if only VFR indicators found, remove IFR
  if (hasVfrOnlyIndicators && !hasIfrIndicators && !hasControlledClass) {
    const vfrIndex = trafficTypes.indexOf('VFR');
    const ifrIndex = trafficTypes.indexOf('IFR');
    if (ifrIndex !== -1 && vfrIndex !== -1) {
      trafficTypes.splice(ifrIndex, 1);
      console.log('✅ Removed IFR due to VFR-only indicators');
    }
  }
  
  const result = trafficTypes.length > 0 ? trafficTypes.join(', ') : 'VFR';
  console.log('✅ Final traffic types:', result);
  return result;
};

/**
 * Extract boolean property with multiple fallbacks
 * @param {Object} props - Feature properties
 * @param {Array} fieldNames - Array of possible field names to check
 * @returns {boolean|null} - Boolean value or null
 */
function extractBooleanProperty(props, fieldNames) {
  for (const field of fieldNames) {
    if (props[field] !== undefined && props[field] !== null) {
      if (typeof props[field] === 'boolean') {
        return props[field];
      }
      if (typeof props[field] === 'string') {
        const val = props[field].toLowerCase();
        if (val === 'true' || val === 'yes' || val === '1') return true;
        if (val === 'false' || val === 'no' || val === '0') return false;
      }
      if (typeof props[field] === 'number') {
        return props[field] > 0;
      }
    }
  }
  return null;
}

/**
 * Extract property from multiple possible field names
 * @param {Object} props - Feature properties
 * @param {Array} fieldNames - Array of possible field names to check
 * @returns {*} - Extracted value or null
 */
function extractProperty(props, fieldNames) {
  for (const field of fieldNames) {
    if (props[field] !== undefined && props[field] !== null && props[field] !== '') {
      return props[field];
    }
  }
  return null;
}

/**
 * Extract numeric property from multiple possible field names
 * @param {Object} props - Feature properties
 * @param {Array} fieldNames - Array of possible field names to check
 * @returns {number|null} - Extracted numeric value or null
 */
function extractNumericProperty(props, fieldNames) {
  for (const field of fieldNames) {
    if (props[field] !== undefined && props[field] !== null) {
      const value = parseFloat(props[field]);
      if (!isNaN(value)) {
        return value;
      }
    }
  }
  return null;
}

/**
 * OpenAIP feature types and their corresponding source layers
 */
export const FEATURE_TYPES = {
  AIRPORT: 'airports',
  AIRSPACE: 'airspaces', 
  NAVAID: 'navaids',
  OBSTACLE: 'obstacles',
  HOTSPOT: 'hotspots',
  HANG_GLIDING: 'hang_glidings',
  RC_AIRFIELD: 'rc_airfields',
  REPORTING_POINT: 'reporting_points'
};

/**
 * Feature type detection based on source layer
 * @param {Object} feature - MapLibre feature object
 * @returns {string|null} - Feature type or null if unknown
 */
export const detectFeatureType = (feature) => {
  if (!feature || !feature.source || !feature.sourceLayer) {
    return null;
  }

  const sourceLayer = feature.sourceLayer;
  
  // Direct mapping from source layer to feature type
  switch (sourceLayer) {
    case 'airports':
      return FEATURE_TYPES.AIRPORT;
    case 'airspaces':
      return FEATURE_TYPES.AIRSPACE;
    case 'navaids':
      return FEATURE_TYPES.NAVAID;
    case 'obstacles':
      return FEATURE_TYPES.OBSTACLE;
    case 'hotspots':
      return FEATURE_TYPES.HOTSPOT;
    case 'hang_glidings':
      return FEATURE_TYPES.HANG_GLIDING;
    case 'rc_airfields':
      return FEATURE_TYPES.RC_AIRFIELD;
    case 'reporting_points':
      return FEATURE_TYPES.REPORTING_POINT;
    default:
      console.warn('Unknown feature source layer:', sourceLayer);
      return null;
  }
};

/**
 * Comprehensive OpenAIP feature data extraction function
 * Extracts all available properties from OpenAIP vector tiles for sidebar display
 */
export const extractFeatureData = (feature) => {
  if (!feature || !feature.properties) {
    return null;
  }

  const props = feature.properties;
  const geometry = feature.geometry;
  
  console.log('🔍 Extracting data from feature:', feature.sourceLayer);
  console.log('📊 Available properties:', Object.keys(props));
  console.log('📊 Full properties object:', props);
  
  // Enhanced debugging for key fields
  console.log('🔍 Key field analysis:');
  console.log('  - ICAO Code candidates:', ['icao_code', 'icao', 'ident', 'code', 'icao_id', 'icao_identifier'].filter(k => props[k]).map(k => `${k}: ${props[k]}`));
  console.log('  - Country candidates:', ['country', 'country_code', 'iso_country', 'ctry', 'ctr', 'cc', 'iso2'].filter(k => props[k]).map(k => `${k}: ${props[k]}`));
  console.log('  - Elevation candidates:', ['elevation', 'elev', 'alt', 'height', 'ele', 'z', 'elevation_m', 'elevation_ft', 'field_elevation', 'airport_elevation'].filter(k => props[k]).map(k => `${k}: ${props[k]}`));
  console.log('  - Type candidates:', ['type', 'subtype', 'category', 'cat', 'facility_type', 'airport_type'].filter(k => props[k]).map(k => `${k}: ${props[k]}`));
  console.log('  - Name candidates:', ['name', 'nam', 'full_name', 'identifier', 'title'].filter(k => props[k]).map(k => `${k}: ${props[k]}`));
  console.log('  - All other properties:', Object.keys(props).filter(k => 
    !['icao_code', 'icao', 'ident', 'code', 'icao_id', 'icao_identifier',
      'country', 'country_code', 'iso_country', 'ctry', 'ctr', 'cc', 'iso2',
      'elevation', 'elev', 'alt', 'height', 'ele', 'z', 'elevation_m', 'elevation_ft',
      'type', 'subtype', 'category', 'cat', 'facility_type', 'airport_type',
      'name', 'nam', 'full_name', 'identifier', 'title'].includes(k)
  ).map(k => `${k}: ${props[k]}`));
  
  // Extract coordinates
  let coordinates = null;
  if (geometry && geometry.coordinates) {
    if (geometry.type === 'Point') {
      coordinates = geometry.coordinates;
    } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      // For polygons, use centroid or first coordinate
      const coords = geometry.type === 'Polygon' ? 
        geometry.coordinates[0] : 
        geometry.coordinates[0][0];
      if (coords && coords.length > 0) {
        coordinates = coords[0];
      }
    }
  }

  // Comprehensive base data extraction
  const baseData = {
    // Identifiers - OpenAIP specific field names
    id: extractProperty(props, ['id', 'identifier', 'icao_code', 'icao', 'ident', 'fid', 'osm_id']),
    name: extractProperty(props, ['name', 'identifier', 'title', 'description', 'nam', 'full_name']),
    type: extractProperty(props, ['type', 'subtype', 'category', 'cat', 'facility_type']) || feature.sourceLayer,
    sourceLayer: feature.sourceLayer,
    coordinates: coordinates,
    
    // Location data - OpenAIP specific field names
    country: extractProperty(props, ['country', 'country_code', 'iso_country', 'ctry', 'ctr', 'cc', 'iso2']),
    region: extractProperty(props, ['region', 'state', 'province', 'admin_region', 'reg']),
    municipality: extractProperty(props, ['municipality', 'city', 'town', 'locale', 'mun']),
    
    // Elevation data - try label parsing first, then field extraction
    elevation: extractElevationFromLabels(props) || extractNumericProperty(props, [
      'elevation', 'elevation_m', 'elev', 'elevation_ft', 'alt', 'altitude',
      'field_elevation', 'airport_elevation', 'elev_m', 'elev_ft',
      'height', 'height_m', 'height_ft', 'msl', 'amsl', 'ele', 'z',
      'field_elev', 'apt_elev', 'aerodrome_elevation', 'ground_elevation'
    ]),
    elevationUnit: detectElevationUnit(props),
    
    // Aviation codes - OpenAIP specific field names
    icaoCode: extractProperty(props, ['icao_code', 'icao', 'ident', 'code', 'icao_id', 'icao_identifier']),
    iataCode: extractProperty(props, ['iata_code', 'iata', 'iata_ident', 'iata_id']),
    localCode: extractProperty(props, ['local_code', 'local_ident', 'lid', 'local_id']),
    
    // Operational data
    status: extractProperty(props, ['status', 'operational_status', 'active']),
    operatingHours: extractProperty(props, ['operating_hours', 'hours', 'operation_hours', 'schedule']),
    ownership: extractProperty(props, ['ownership', 'owner', 'operator']),
    
    // Contact information
    website: extractProperty(props, ['website', 'home_link', 'url']),
    phone: extractProperty(props, ['phone', 'telephone', 'contact']),
    
    // Additional metadata
    remarks: extractProperty(props, ['remarks', 'description', 'notes', 'comment']),
    source: extractProperty(props, ['source', 'data_source']),
    lastUpdate: extractProperty(props, ['last_updated', 'updated_at', 'modified']),
    
    // All original properties for debugging and fallback
    _allProperties: props
  };

  // Feature-specific data extraction
  const specificData = extractFeatureSpecificData(feature.sourceLayer, props);
  
  return {
    ...baseData,
    ...specificData
  };
};

/**
 * Extract feature-specific data based on source layer
 */
const extractFeatureSpecificData = (sourceLayer, props) => {
  switch (sourceLayer) {
    case 'airports':
    case 'airfields':
      return extractAirportData(props);
      
    case 'navaids':
    case 'navigation_aids':
      return extractNavaidData(props);
      
    case 'airspaces':
    case 'airspace':
      return extractAirspaceData(props);
      
    case 'obstacles':
    case 'obstructions':
      return extractObstacleData(props);
      
    case 'waypoints':
    case 'fixes':
      return extractWaypointData(props);
      
    case 'runways':
      return extractRunwayData(props);
      
    case 'frequencies':
    case 'radio':
      return extractFrequencyData(props);
      
    case 'hotspots':
    case 'thermal_hotspots':
      return extractHotspotData(props);
      
    case 'hang_glidings':
    case 'paragliding':
      return extractHangGlidingData(props);
      
    case 'rc_airfields':
    case 'model_airfields':
      return extractRCData(props);
      
    case 'reporting_points':
    case 'vfr_points':
      return extractReportingPointData(props);
      
    default:
      return {};
  }
};

/**
 * Airport-specific data extraction
 */
const extractAirportData = (props) => {
  console.log('🔍 Extracting airport data from properties:', props);
  
  // Enhanced runway information extraction
  const runwayInfo = extractRunwayInfo(props);
  
  // Enhanced frequency extraction with multiple fallbacks
  const primaryFreq = extractFrequencyFromLabels(props) || 
                     extractProperty(props, ['frequency', 'freq', 'tower_freq', 'ctaf', 'unicom', 'twr']);
  
  // Enhanced traffic types extraction
  const trafficTypes = extractTrafficTypes(props);
  
  // Analyze text fields for additional service information
  const textFields = [
    props.name_label_full,
    props.name_label,
    props.remarks,
    props.description,
    props.services
  ].filter(Boolean).join(' ').toLowerCase();
  
  // Enhanced service detection from text analysis
  const detectServiceFromText = (keywords) => {
    return keywords.some(keyword => textFields.includes(keyword));
  };
  
  const extractedData = {
    airportType: extractProperty(props, ['type', 'airport_type', 'facility_type', 'subtype', 'cat']),
    use: extractProperty(props, ['use', 'usage', 'facility_use']),
    
    // Enhanced frequency data with better fallbacks
    frequency: primaryFreq,
    towerFreq: primaryFreq || extractProperty(props, ['tower_freq', 'tower_frequency', 'twr']),
    
    // Enhanced traffic types
    trafficTypes: trafficTypes,
    flightRules: trafficTypes,
    
    // Enhanced runway information
    runwayInfo: runwayInfo,
    runways: runwayInfo ? [runwayInfo] : [],
    
    // Ownership / Legal Restrictions with text analysis
    ppr: extractBooleanProperty(props, ['ppr', 'prior_permission', 'permission_required']) ||
         detectServiceFromText(['ppr', 'permission required', 'prior permission']),
    private: extractBooleanProperty(props, ['private', 'is_private', 'ownership_private']) ||
             detectServiceFromText(['private', 'restricted']),
    ownership: extractProperty(props, ['ownership', 'owner', 'operator', 'public_private']),
    
    // Enhanced OpenAIP Frequencies with better extraction
    apronFreq: extractProperty(props, ['apron_freq', 'apron_frequency', 'apron_office']) ||
               (textFields.match(/(apron|ground).*?(\d{3}\.\d{1,3})/i) ? 
                textFields.match(/(apron|ground).*?(\d{3}\.\d{1,3})/i)[2] + ' MHz' : null),
    
    radarAppW: extractProperty(props, ['radar_app_w', 'approach_w', 'app_w']),
    radarAppSE: extractProperty(props, ['radar_app_se', 'approach_se', 'app_se']),
    radarAppN: extractProperty(props, ['radar_app_n', 'approach_n', 'app_n']),
    frequencies: extractAllFrequencies(props),
    
    // Enhanced Special Activities detection
    skydiving: extractBooleanProperty(props, ['skydiving', 'parachute', 'parachuting']) ||
               detectServiceFromText(['skydiv', 'parachut', 'jump']),
    
    // Enhanced Fuel Types detection with text analysis
    avgas: extractBooleanProperty(props, ['avgas', 'fuel_avgas', 'avgas_available']) ||
           detectServiceFromText(['avgas', '100ll', 'aviation gasoline']),
    avgas_ul91: extractBooleanProperty(props, ['avgas_ul91', 'fuel_avgas_ul91', 'ul91']) ||
                detectServiceFromText(['ul91', 'unleaded']),
    diesel: extractBooleanProperty(props, ['diesel', 'fuel_diesel', 'diesel_available']) ||
            detectServiceFromText(['diesel']),
    jet_a: extractBooleanProperty(props, ['jet_a', 'fuel_jet_a', 'jeta']) ||
           detectServiceFromText(['jet a', 'jeta', 'turbine fuel']),
    jet_a1: extractBooleanProperty(props, ['jet_a1', 'fuel_jet_a1', 'jeta1']) ||
            detectServiceFromText(['jet a1', 'jeta1']),
    jet_b: extractBooleanProperty(props, ['jet_b', 'fuel_jet_b', 'jetb']) ||
           detectServiceFromText(['jet b', 'jetb']),
    
    // Enhanced Handling Facilities with text analysis
    cargo_handling: extractBooleanProperty(props, ['cargo_handling', 'cargo', 'freight']) ||
                    detectServiceFromText(['cargo', 'freight', 'shipping']),
    deicing: extractBooleanProperty(props, ['deicing', 'de_icing', 'anti_ice']) ||
             detectServiceFromText(['deicing', 'de-icing', 'anti-ice']),
    maintenance: extractBooleanProperty(props, ['maintenance', 'repair', 'service']) ||
                 detectServiceFromText(['maintenance', 'repair', 'service', 'mechanic']),
    security: extractBooleanProperty(props, ['security', 'security_service']) ||
              detectServiceFromText(['security', 'guard']),
    shelter: extractBooleanProperty(props, ['shelter', 'hangar', 'covered_parking']) ||
             detectServiceFromText(['hangar', 'shelter', 'covered']),
    
    // Enhanced Passenger Facilities with text analysis
    bank_office: extractBooleanProperty(props, ['bank_office', 'bank', 'banking']) ||
                 detectServiceFromText(['bank', 'atm', 'financial']),
    post_office: extractBooleanProperty(props, ['post_office', 'postal', 'mail']) ||
                 detectServiceFromText(['post', 'mail']),
    customs: extractBooleanProperty(props, ['customs', 'has_customs', 'international']) ||
             detectServiceFromText(['customs', 'immigration', 'international']),
    hasCustoms: extractBooleanProperty(props, ['customs', 'has_customs', 'international']) ||
                detectServiceFromText(['customs', 'immigration', 'international']),
    lodging: extractBooleanProperty(props, ['lodging', 'hotel', 'accommodation']) ||
             detectServiceFromText(['hotel', 'lodging', 'accommodation', 'motel']),
    medical_facility: extractBooleanProperty(props, ['medical_facility', 'medical', 'first_aid']) ||
                      detectServiceFromText(['medical', 'hospital', 'first aid', 'clinic']),
    restaurant: extractBooleanProperty(props, ['restaurant', 'food', 'dining']) ||
                detectServiceFromText(['restaurant', 'food', 'dining', 'cafe', 'catering']),
    sanitation: extractBooleanProperty(props, ['sanitation', 'restrooms', 'toilets']) ||
                detectServiceFromText(['restroom', 'toilet', 'sanitation']),
    transportation: extractBooleanProperty(props, ['transportation', 'transport', 'ground_transport']) ||
                    detectServiceFromText(['transport', 'taxi', 'bus', 'rental']),
    laundry_service: extractBooleanProperty(props, ['laundry_service', 'laundry']) ||
                     detectServiceFromText(['laundry']),
    camping: extractBooleanProperty(props, ['camping', 'campsite']) ||
             detectServiceFromText(['camping', 'camp']),
    
    // Enhanced Services and facilities
    hasControlTower: extractBooleanProperty(props, ['has_tower', 'control_tower', 'tower']) ||
                     detectServiceFromText(['tower', 'controlled', 'atc']) ||
                     (primaryFreq !== null), // If has frequency, likely has tower
    hasFuel: extractBooleanProperty(props, ['has_fuel', 'fuel_available', 'fuel']) ||
             detectServiceFromText(['fuel', 'avgas', 'jet']),
    hasApproachLighting: extractBooleanProperty(props, ['has_approach_lighting', 'approach_lighting']) ||
                         detectServiceFromText(['lighting', 'approach light', 'ils']),
    
    // Additional enhanced data
    gpsCode: extractProperty(props, ['gps_code', 'gps_ident', 'identifier']),
    magneticVariation: extractNumericProperty(props, ['magnetic_variation', 'mag_var', 'declination']),
    timezone: extractProperty(props, ['timezone', 'tz']),
    
    // Operating hours extraction
    operatingHours: extractProperty(props, ['operating_hours', 'hours', 'active_hours']) ||
                    (detectServiceFromText(['24 hour', 'h24']) ? 'H24' : 
                     detectServiceFromText(['sunrise', 'sunset', 'sr-ss']) ? 'SR-SS' : null)
  };
  
  console.log('✅ Extracted airport data:', extractedData);
  return extractedData;
};

/**
 * Navaid-specific data extraction
 */
const extractNavaidData = (props) => {
  return {
    navaidType: extractProperty(props, ['type', 'navaid_type', 'facility_type']),
    
    // Radio data
    frequency: extractNumericProperty(props, ['frequency', 'freq', 'radio_frequency']),
    channel: extractProperty(props, ['channel', 'tacan_channel']),
    
    // Range and bearing
    range: extractNumericProperty(props, ['range', 'range_nm', 'service_range']),
    bearing: extractNumericProperty(props, ['bearing', 'radial', 'magnetic_bearing']),
    
    // Magnetic data
    magneticDeclination: extractNumericProperty(props, ['magnetic_declination', 'mag_dec', 'variation']),
    alignedTrueNorth: extractBooleanProperty(props, ['aligned_true_north', 'true_north_aligned']),
    
    // DME information
    hasDME: extractBooleanProperty(props, ['has_dme', 'dme_available', 'dme']),
    dmeFrequency: extractNumericProperty(props, ['dme_frequency', 'dme_freq']),
    dmeChannel: extractProperty(props, ['dme_channel']),
    
    // Service information
    serviceVolume: extractProperty(props, ['service_volume', 'coverage']),
    operationalStatus: extractProperty(props, ['operational_status', 'status', 'active']),
  };
};

/**
 * Airspace-specific data extraction
 */
const extractAirspaceData = (props) => {
  return {
    airspaceClass: extractProperty(props, ['class', 'airspace_class', 'classification']),
    
    // Altitude limits
    lowerLimit: extractProperty(props, ['lower_limit', 'floor', 'bottom', 'lower_alt']),
    upperLimit: extractProperty(props, ['upper_limit', 'ceiling', 'top', 'upper_alt']),
    
    // Activity and restrictions
    activity: extractProperty(props, ['activity', 'purpose', 'restriction_type']),
    restrictionType: extractProperty(props, ['restriction_type', 'restriction']),
    
    // Operational data
    operatingHours: extractProperty(props, ['operating_hours', 'hours', 'active_times']),
    frequency: extractNumericProperty(props, ['frequency', 'radio_freq', 'contact_freq']),
    
    // Military/Special use
    militaryUse: extractBooleanProperty(props, ['military_use', 'military', 'restricted']),
    specialUse: extractBooleanProperty(props, ['special_use', 'sua']),
  };
};

/**
 * Obstacle-specific data extraction
 */
const extractObstacleData = (props) => {
  return {
    obstacleType: extractProperty(props, ['type', 'obstacle_type', 'structure_type']),
    
    // Height information
    height: extractNumericProperty(props, ['height', 'height_m', 'height_ft', 'structure_height']),
    heightUnit: detectHeightUnit(props),
    agl: extractNumericProperty(props, ['agl', 'height_agl', 'above_ground']),
    msl: extractNumericProperty(props, ['msl', 'height_msl', 'above_sea_level']),
    
    // Visual aids
    lighting: extractProperty(props, ['lighting', 'light_type', 'obstruction_lighting']),
    marking: extractProperty(props, ['marking', 'paint_scheme', 'obstruction_marking']),
    
    // Construction details
    material: extractProperty(props, ['material', 'construction_material']),
    shape: extractProperty(props, ['shape', 'structure_shape']),
    
    // Verification
    verified: extractBooleanProperty(props, ['verified', 'surveyed', 'confirmed']),
    verificationDate: extractProperty(props, ['verification_date', 'survey_date']),
  };
};

/**
 * Waypoint-specific data extraction
 */
const extractWaypointData = (props) => {
  return {
    waypointType: extractProperty(props, ['type', 'waypoint_type', 'fix_type']),
    usage: extractProperty(props, ['usage', 'waypoint_usage']),
    
    // Navigation data
    magneticBearing: extractNumericProperty(props, ['magnetic_bearing', 'bearing']),
    distance: extractNumericProperty(props, ['distance', 'distance_nm']),
    
    // Associated navaids
    associatedNavaid: extractProperty(props, ['associated_navaid', 'navaid_id']),
    radial: extractNumericProperty(props, ['radial', 'bearing_from_navaid']),
  };
};

/**
 * Runway-specific data extraction
 */
const extractRunwayData = (props) => {
  return {
    runwayDesignator: extractProperty(props, ['runway_designator', 'runway_id', 'designation']),
    length: extractNumericProperty(props, ['length', 'runway_length', 'length_m', 'length_ft']),
    width: extractNumericProperty(props, ['width', 'runway_width', 'width_m', 'width_ft']),
    surface: extractProperty(props, ['surface', 'surface_type', 'runway_surface']),
    
    // Lighting and markings
    lighting: extractProperty(props, ['lighting', 'runway_lighting']),
    markings: extractProperty(props, ['markings', 'runway_markings']),
    
    // Approach information
    approachType: extractProperty(props, ['approach_type', 'approach']),
    hasILS: extractBooleanProperty(props, ['has_ils', 'ils_available']),
    
    // Threshold information
    thresholdElevation: extractNumericProperty(props, ['threshold_elevation', 'threshold_elev']),
    displacedThreshold: extractNumericProperty(props, ['displaced_threshold', 'displaced_thr']),
  };
};

/**
 * Extract all frequency information
 */
const extractAllFrequencies = (props) => {
  const frequencies = [];
  
  // Define frequency mappings
  const freqMappings = [
    { keys: ['frequency', 'main_freq', 'primary_freq'], type: 'Main' },
    { keys: ['tower_freq', 'tower_frequency', 'twr'], type: 'Tower' },
    { keys: ['ground_freq', 'ground_frequency', 'gnd'], type: 'Ground' },
    { keys: ['approach_freq', 'approach_frequency', 'app'], type: 'Approach' },
    { keys: ['departure_freq', 'departure_frequency', 'dep'], type: 'Departure' },
    { keys: ['atis_freq', 'atis_frequency', 'atis'], type: 'ATIS' },
    { keys: ['unicom_freq', 'unicom_frequency', 'unicom'], type: 'UNICOM' },
    { keys: ['ctaf_freq', 'ctaf_frequency', 'ctaf'], type: 'CTAF' },
    { keys: ['multicom_freq', 'multicom_frequency'], type: 'Multicom' },
    { keys: ['emergency_freq', 'emergency_frequency'], type: 'Emergency' },
    { keys: ['radar_freq', 'radar_frequency'], type: 'Radar' },
    { keys: ['clearance_freq', 'clearance_frequency'], type: 'Clearance' }
  ];
  
  freqMappings.forEach(mapping => {
    const freq = extractNumericProperty(props, mapping.keys);
    if (freq) {
      frequencies.push({ type: mapping.type, frequency: freq });
    }
  });
  
  return frequencies.length > 0 ? frequencies : null;
};

/**
 * Hotspot-specific data extraction
 */
const extractHotspotData = (props) => {
  return {
    hotspotType: extractProperty(props, ['type', 'hotspot_type', 'thermal_type']),
    reliability: extractProperty(props, ['reliability', 'quality', 'strength']),
    season: extractProperty(props, ['season', 'best_season', 'active_season']),
    windDirection: extractProperty(props, ['wind_direction', 'best_wind']),
    thermalStrength: extractProperty(props, ['thermal_strength', 'strength']),
  };
};

/**
 * Hang gliding site data extraction
 */
const extractHangGlidingData = (props) => {
  return {
    siteType: extractProperty(props, ['type', 'site_type', 'launch_type']),
    difficulty: extractProperty(props, ['difficulty', 'skill_level']),
    launchDirection: extractProperty(props, ['launch_direction', 'takeoff_direction']),
    landingArea: extractProperty(props, ['landing_area', 'landing_field']),
    windDirection: extractProperty(props, ['wind_direction', 'best_wind']),
    restrictions: extractProperty(props, ['restrictions', 'limitations']),
  };
};

/**
 * RC airfield data extraction
 */
const extractRCData = (props) => {
  return {
    rcType: extractProperty(props, ['type', 'rc_type', 'model_type']),
    maxWeight: extractNumericProperty(props, ['max_weight', 'weight_limit']),
    frequency: extractProperty(props, ['frequency', 'radio_freq']),
    clubName: extractProperty(props, ['club_name', 'club', 'organization']),
    restrictions: extractProperty(props, ['restrictions', 'rules']),
  };
};

/**
 * Reporting point data extraction
 */
const extractReportingPointData = (props) => {
  return {
    pointType: extractProperty(props, ['type', 'point_type', 'reporting_type']),
    usage: extractProperty(props, ['usage', 'purpose']),
    associatedAirport: extractProperty(props, ['associated_airport', 'airport_id']),
    radial: extractNumericProperty(props, ['radial', 'bearing']),
    distance: extractNumericProperty(props, ['distance', 'distance_nm']),
  };
};

/**
 * Frequency data extraction
 */
const extractFrequencyData = (props) => {
  if (value !== null) {
    const num = parseFloat(value);
    return !isNaN(num) ? num : null;
  }
  return null;
};

const detectElevationUnit = (props) => {
  if (props.elevation_ft || props.elev_ft) return 'ft';
  if (props.elevation_m || props.elev_m) return 'm';
  // Default assumption based on common usage
  return 'ft';
};

const detectHeightUnit = (props) => {
  if (props.height_ft) return 'ft';
  if (props.height_m) return 'm';
  return 'ft';
};

/**
 * Extract standardized feature information
 * @param {Object} feature - MapLibre feature object
 * @returns {Object} - Standardized feature information
 */
export const extractFeatureInfo = (feature) => {
  if (!feature || !feature.properties) {
    return null;
  }

  const featureType = detectFeatureType(feature);
  const props = feature.properties;
  
  // Extract coordinates from geometry
  let coordinates = null;
  if (feature.geometry && feature.geometry.coordinates) {
    const coords = feature.geometry.coordinates;
    if (feature.geometry.type === 'Point') {
      coordinates = {
        lng: coords[0],
        lat: coords[1]
      };
    } else if (Array.isArray(coords) && coords.length >= 2) {
      coordinates = {
        lng: coords[0],
        lat: coords[1]
      };
    }
  }

  const baseInfo = {
    id: props.id || props.identifier || props.name || props.ident,
    type: featureType,
    name: props.name || props.identifier || props.ident,
    identifier: props.identifier || props.ident || props.id,
    coordinates: coordinates,
    geometry: feature.geometry,
    sourceLayer: feature.sourceLayer,
    
    // Core OpenAIP properties - use the working extraction functions
    country: props.country || props.country_code,
    elevation: extractElevationFromLabels(props) || extractNumericProperty(props, ['elevation', 'elev', 'alt']),
    frequency: extractFrequencyFromLabels(props) || extractProperty(props, ['frequency', 'freq']),
    range: props.range,
    channel: props.channel,
    
    // Navigation properties
    magneticDeclination: props.magnetic_declination || props.mag_dec || props.magdec,
    alignedTrueNorth: props.aligned_true_north || props.true_north,
    
    // Operational properties
    hoursOfOperation: props.hours_of_operation || props.operating_hours || props.hours,
    remarks: props.remarks || props.comment || props.notes,
    
    // All original properties for debugging and completeness
    properties: props
  };

  // Add type-specific information
  switch (featureType) {
    case FEATURE_TYPES.AIRPORT:
      // Use enhanced airport data extraction
      const airportData = extractAirportData(props);
      return {
        ...baseInfo,
        icaoCode: props.icao_code || props.icaoCode || props.icao,
        iataCode: props.iata_code || props.iataCode || props.iata,
        elevation: extractElevationFromLabels(props) || extractNumericProperty(props, ['elevation', 'elev', 'alt']),
        
        // Enhanced airport data from extractAirportData
        ...airportData,
        
        // Additional airport properties
        city: props.city,
        region: props.region || props.state,
        timezone: props.timezone,
        usage: props.usage,
        owner: props.owner,
        operator: props.operator
      };

    case FEATURE_TYPES.AIRSPACE:
      return {
        ...baseInfo,
        airspaceClass: props.class || props.airspace_class || props.type,
        upperLimit: props.upper_limit || props.upperLimit || props.ceiling,
        lowerLimit: props.lower_limit || props.lowerLimit || props.floor,
        activity: props.activity,
        restrictions: props.restrictions || [],
        activeHours: props.active_hours || props.activeHours || props.operating_hours,
        
        // Additional airspace properties
        designator: props.designator,
        purpose: props.purpose,
        usage: props.usage,
        military: props.military,
        danger: props.danger,
        restricted: props.restricted
      };

    case FEATURE_TYPES.NAVAID:
      return {
        ...baseInfo,
        navaidType: props.type || props.navaid_type || 'VOR',
        frequency: props.frequency || props.freq,
        range: props.range || 'NIL',
        elevation: props.elevation || props.elev || props.alt,
        channel: props.channel || 'NIL',
        identifier: props.identifier || props.ident,
        
        // Additional navaid properties
        power: props.power,
        service: props.service,
        usage: props.usage,
        dmeChannel: props.dme_channel,
        tacanChannel: props.tacan_channel,
        
        // Specific to VOR/DME/TACAN
        vorClass: props.vor_class,
        dmeElevation: props.dme_elevation,
        biasElevation: props.bias_elevation
      };

    case FEATURE_TYPES.OBSTACLE:
      return {
        ...baseInfo,
        height: props.height || props.elevation,
        obstacleType: props.type || props.obstacle_type,
        lighting: props.lighting || false,
        markings: props.markings || false
      };

    default:
      return baseInfo;
  }
};

/**
 * Check if a feature is clickable/interactive
 * @param {Object} feature - MapLibre feature object
 * @returns {boolean} - True if feature should be interactive
 */
export const isFeatureInteractive = (feature) => {
  const featureType = detectFeatureType(feature);
  
  // All OpenAIP features should be interactive
  return featureType !== null;
};

/**
 * Get appropriate icon name for a feature
 * @param {Object} feature - MapLibre feature object
 * @returns {string|null} - Icon name or null
 */
export const getFeatureIconName = (feature) => {
  const featureType = detectFeatureType(feature);
  const props = feature.properties || {};

  switch (featureType) {
    case FEATURE_TYPES.AIRPORT:
      // Determine airport icon based on type and size
      if (props.type === 'heliport' || props.type === 'helipad') {
        return 'heliport';
      }
      if (props.controlled) {
        return 'airport-controlled';
      }
      return 'airport';

    case FEATURE_TYPES.NAVAID:
      const navaidType = props.type || props.navaid_type;
      switch (navaidType?.toLowerCase()) {
        case 'vor':
          return 'navaid-vor';
        case 'ndb':
          return 'navaid-ndb';
        case 'dme':
          return 'navaid-dme';
        case 'vordme':
          return 'navaid-vordme';
        case 'vortac':
          return 'navaid-vortac';
        case 'tacan':
          return 'navaid-tacan';
        default:
          return 'navaid-generic';
      }

    case FEATURE_TYPES.OBSTACLE:
      return 'obstacle';

    case FEATURE_TYPES.HOTSPOT:
      return 'hotspot';

    case FEATURE_TYPES.HANG_GLIDING:
      return 'hang-gliding';

    case FEATURE_TYPES.RC_AIRFIELD:
      return 'rc-airfield';

    case FEATURE_TYPES.REPORTING_POINT:
      return 'reporting-point';

    default:
      return null;
  }
};

/**
 * Filter features by type
 * @param {Array} features - Array of MapLibre features
 * @param {string} featureType - Feature type to filter by
 * @returns {Array} - Filtered features
 */
export const filterFeaturesByType = (features, featureType) => {
  return features.filter(feature => detectFeatureType(feature) === featureType);
};

/**
 * Get all unique feature types from a collection of features
 * @param {Array} features - Array of MapLibre features
 * @returns {Array} - Array of unique feature types
 */
export const getUniqueFeatureTypes = (features) => {
  const types = new Set();
  features.forEach(feature => {
    const type = detectFeatureType(feature);
    if (type) {
      types.add(type);
    }
  });
  return Array.from(types);
};

/**
 * Debug utility to log feature information
 * @param {Object} feature - MapLibre feature object
 */
export const debugFeature = (feature) => {
  const info = extractFeatureInfo(feature);
  console.log('🔍 Feature Debug:', {
    type: info?.type,
    name: info?.name,
    id: info?.id,
    sourceLayer: feature.sourceLayer,
    properties: feature.properties,
    geometry: feature.geometry?.type,
    coordinates: feature.geometry?.coordinates
  });
};

/**
 * Validate feature data completeness
 * @param {Object} feature - MapLibre feature object
 * @returns {Object} - Validation result with missing fields
 */
export const validateFeature = (feature) => {
  const info = extractFeatureInfo(feature);
  const missing = [];
  const warnings = [];

  if (!info) {
    return { valid: false, missing: ['entire feature'], warnings: [] };
  }

  // Common validations
  if (!info.name && !info.id) {
    missing.push('name or id');
  }
  if (!info.coordinates) {
    missing.push('coordinates');
  }

  // Type-specific validations
  switch (info.type) {
    case FEATURE_TYPES.AIRPORT:
      if (!info.icaoCode && !info.iataCode) {
        warnings.push('missing airport codes');
      }
      if (info.elevation === undefined) {
        warnings.push('missing elevation');
      }
      break;

    case FEATURE_TYPES.NAVAID:
      if (!info.frequency && !info.channel) {
        warnings.push('missing frequency/channel');
      }
      if (!info.navaidType) {
        warnings.push('missing navaid type');
      }
      break;

    case FEATURE_TYPES.AIRSPACE:
      if (!info.class) {
        warnings.push('missing airspace class');
      }
      if (!info.upperLimit || !info.lowerLimit) {
        warnings.push('missing altitude limits');
      }
      break;
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings
  };
};
