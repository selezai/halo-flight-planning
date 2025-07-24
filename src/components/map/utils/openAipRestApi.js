/**
 * OpenAIP REST API Integration
 * 
 * This module provides utilities to fetch detailed aviation feature information
 * from the OpenAIP REST API to supplement the limited metadata available in vector tiles.
 * 
 * Vector tiles are optimized for map rendering performance but lack rich metadata.
 * The REST API provides comprehensive details needed for the sidebar display.
 */

const PROXY_API_BASE = 'http://localhost:3001/api/openaip';
const API_KEY = import.meta.env.VITE_OPENAIP_API_KEY;

/**
 * Fetch detailed airport information from OpenAIP REST API
 * @param {string} icaoCode - ICAO code of the airport
 * @returns {Promise<Object|null>} - Detailed airport data or null if not found
 */
export const fetchAirportDetails = async (icaoCode) => {
  if (!icaoCode || !API_KEY) {
    console.warn('Missing ICAO code or API key for airport details fetch');
    return null;
  }

  try {
    console.log(`🔍 Fetching detailed airport data for ${icaoCode} from OpenAIP REST API via proxy...`);
    
    const response = await fetch(`${PROXY_API_BASE}/airports?icao=${icaoCode}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch airport details: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Fetched detailed airport data for ${icaoCode}:`, data);
    
    // OpenAIP API typically returns an array of airports
    if (Array.isArray(data) && data.length > 0) {
      return data[0]; // Return the first match
    } else if (data && typeof data === 'object') {
      return data; // Single airport object
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error fetching airport details for ${icaoCode}:`, error);
    return null;
  }
};

/**
 * Fetch detailed navaid information from OpenAIP REST API
 * @param {string} identifier - Navaid identifier
 * @returns {Promise<Object|null>} - Detailed navaid data or null if not found
 */
export const fetchNavaidDetails = async (identifier) => {
  if (!identifier || !API_KEY) {
    console.warn('Missing identifier or API key for navaid details fetch');
    return null;
  }

  try {
    console.log(`🔍 Fetching detailed navaid data for ${identifier} from OpenAIP REST API via proxy...`);
    
    const response = await fetch(`${PROXY_API_BASE}/navaids?ident=${identifier}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch navaid details: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Fetched detailed navaid data for ${identifier}:`, data);
    
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    } else if (data && typeof data === 'object') {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error fetching navaid details for ${identifier}:`, error);
    return null;
  }
};

/**
 * Fetch detailed airspace information from OpenAIP REST API
 * @param {string} name - Airspace name or identifier
 * @returns {Promise<Object|null>} - Detailed airspace data or null if not found
 */
export const fetchAirspaceDetails = async (name) => {
  if (!name || !API_KEY) {
    console.warn('Missing name or API key for airspace details fetch');
    return null;
  }

  try {
    console.log(`🔍 Fetching detailed airspace data for ${name} from OpenAIP REST API via proxy...`);
    
    const response = await fetch(`${PROXY_API_BASE}/airspaces?name=${encodeURIComponent(name)}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch airspace details: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Fetched detailed airspace data for ${name}:`, data);
    
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    } else if (data && typeof data === 'object') {
      return data;
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error fetching airspace details for ${name}:`, error);
    return null;
  }
};

/**
 * Enhanced feature data extraction that combines vector tile data with REST API data
 * @param {Object} vectorTileFeature - Feature from vector tiles (basic data)
 * @returns {Promise<Object>} - Enhanced feature data with REST API details
 */
export const getEnhancedFeatureData = async (vectorTileFeature) => {
  if (!vectorTileFeature || !vectorTileFeature.properties) {
    return null;
  }

  const props = vectorTileFeature.properties;
  const sourceLayer = vectorTileFeature.sourceLayer;
  
  console.log(`🔄 Enhancing ${sourceLayer} feature data with REST API...`);
  
  // Start with vector tile data as base
  let enhancedData = {
    ...props,
    sourceLayer,
    coordinates: vectorTileFeature.geometry?.coordinates,
    _vectorTileData: props // Keep original for reference
  };

  try {
    // Fetch detailed data based on feature type using proxy
    switch (sourceLayer) {
      case 'airports': {
        const icaoCode = props.icao_code || props.icao || props.ident || props.code || props.id;
        if (icaoCode) {
          console.log(`🔍 Fetching airport details for ${icaoCode} via proxy...`);
          const airportDetails = await fetchAirportDetails(icaoCode);
          if (airportDetails) {
            enhancedData = {
              ...enhancedData,
              ...airportDetails,
              _restApiData: airportDetails
            };
            console.log(`✅ Enhanced airport ${icaoCode} with REST API data`);
          } else {
            console.log(`ℹ️ No REST API data found for airport ${icaoCode}`);
          }
        }
        break;
      }
      
      case 'navaids': {
        const identifier = props.identifier || props.ident || props.name || props.id;
        if (identifier) {
          console.log(`🔍 Fetching navaid details for ${identifier} via proxy...`);
          const navaidDetails = await fetchNavaidDetails(identifier);
          if (navaidDetails) {
            enhancedData = {
              ...enhancedData,
              ...navaidDetails,
              _restApiData: navaidDetails
            };
            console.log(`✅ Enhanced navaid ${identifier} with REST API data`);
          } else {
            console.log(`ℹ️ No REST API data found for navaid ${identifier}`);
          }
        }
        break;
      }
      
      case 'airspaces': {
        const name = props.name || props.identifier || props.designation;
        if (name) {
          console.log(`🔍 Fetching airspace details for ${name} via proxy...`);
          const airspaceDetails = await fetchAirspaceDetails(name);
          if (airspaceDetails) {
            enhancedData = {
              ...enhancedData,
              ...airspaceDetails,
              _restApiData: airspaceDetails
            };
            console.log(`✅ Enhanced airspace ${name} with REST API data`);
          } else {
            console.log(`ℹ️ No REST API data found for airspace ${name}`);
          }
        }
        break;
      }
      
      default:
        console.log(`ℹ️ No REST API enhancement available for ${sourceLayer}`);
    }
  } catch (error) {
    console.error(`❌ Error enhancing ${sourceLayer} feature:`, error);
  }

  return enhancedData;
};

/**
 * Proxy the REST API calls through our backend to handle CORS and authentication
 * @param {string} endpoint - API endpoint (e.g., 'airports', 'navaids')
 * @param {Object} params - Query parameters
 * @returns {Promise<Object|null>} - API response data
 */
export const fetchThroughProxy = async (endpoint, params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `http://localhost:3001/api/openaip/${endpoint}${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🔍 Fetching ${endpoint} through proxy:`, url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Proxy request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Proxy response for ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Proxy request error for ${endpoint}:`, error);
    return null;
  }
};

/**
 * Get comprehensive airport data using proxy
 * @param {string} icaoCode - ICAO code
 * @returns {Promise<Object|null>} - Enhanced airport data
 */
export const getAirportData = async (icaoCode) => {
  return await fetchThroughProxy('airports', { icao: icaoCode });
};

/**
 * Get comprehensive navaid data using proxy
 * @param {string} identifier - Navaid identifier
 * @returns {Promise<Object|null>} - Enhanced navaid data
 */
export const getNavaidData = async (identifier) => {
  return await fetchThroughProxy('navaids', { ident: identifier });
};

/**
 * Get comprehensive airspace data using proxy
 * @param {string} name - Airspace name
 * @returns {Promise<Object|null>} - Enhanced airspace data
 */
export const getAirspaceData = async (name) => {
  return await fetchThroughProxy('airspaces', { name: name });
};
