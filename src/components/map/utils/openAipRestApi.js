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
 * @param {string} name - Navaid name
 * @returns {Promise<Object|null>} - Detailed navaid data or null if not found
 */
export const fetchNavaidDetails = async (identifier, name = null) => {
  if (!identifier || !API_KEY) {
    console.warn('Missing identifier or API key for navaid details fetch');
    return null;
  }

  try {
    // First try searching by identifier
    console.log(`🔍 Fetching detailed navaid data for identifier: ${identifier} from OpenAIP REST API via proxy...`);
    
    let response = await fetch(`${PROXY_API_BASE}/navaids?ident=${identifier}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    let data = null;
    if (response.ok) {
      data = await response.json();
      console.log(`✅ Fetched navaid data by identifier ${identifier}:`, data);
      
      // Check if we found the specific navaid in the results
      if (data && data.items && Array.isArray(data.items)) {
        const matchingNavaid = data.items.find(item => 
          item.identifier === identifier ||
          item.ident === identifier
        );
        if (matchingNavaid) {
          console.log(`✅ Found exact match for identifier ${identifier}`);
          return data;
        }
      }
    }

    // If identifier search failed or didn't find exact match, try searching by name
    if (name) {
      console.log(`🔍 Trying navaid search by name: ${name}`);
      response = await fetch(`${PROXY_API_BASE}/navaids?name=${name}`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const nameData = await response.json();
        console.log(`✅ Fetched navaid data by name ${name}:`, nameData);
        
        // Check if we found the specific navaid by name
        if (nameData && nameData.items && Array.isArray(nameData.items)) {
          const matchingNavaid = nameData.items.find(item => 
            item.name === name ||
            item.identifier === identifier ||
            item.ident === identifier
          );
          if (matchingNavaid) {
            console.log(`✅ Found exact match for name ${name}`);
            return nameData;
          }
        }
      }
    }

    // Return the identifier search data if we have it, even if no exact match
    if (data) {
      console.log(`⚠️ No exact match found, returning identifier search results`);
      return data;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching navaid details for ${identifier}:`, error);
    return null;
  }
};

/**
 * Fetch detailed navaid information using location-based search
 * @param {string} identifier - Navaid identifier (e.g., 'LUL')
 * @param {Object} coordinates - {lat, lng} coordinates
 * @returns {Promise<Object|null>} - Detailed navaid data or null if not found
 */
export const fetchNavaidDetailsWithLocation = async (identifier, coordinates) => {
  if (!identifier || !coordinates || !API_KEY) {
    console.warn('Missing identifier, coordinates, or API key for navaid details fetch');
    return null;
  }

  try {
    console.log(`🔍 Fetching navaid data for ${identifier} near ${coordinates.lat}, ${coordinates.lng} from OpenAIP REST API via proxy...`);
    
    // Search by location with a small radius (5km) to find nearby navaids
    const radius = 5000; // 5km in meters
    const response = await fetch(`${PROXY_API_BASE}/navaids?lat=${coordinates.lat}&lon=${coordinates.lng}&radius=${radius}`, {
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
    console.log(`✅ Fetched location-based navaid data:`, data);
    
    // Find the matching navaid by identifier in the results
    if (data && data.items && Array.isArray(data.items)) {
      const matchingNavaid = data.items.find(item => 
        item.identifier === identifier ||
        item.ident === identifier ||
        item.name === identifier
      );
      
      if (matchingNavaid) {
        console.log(`✅ Found matching navaid ${identifier} in location search:`, matchingNavaid);
        return {
          ...data,
          _matchedNavaid: matchingNavaid,
          items: [matchingNavaid] // Return only the matched navaid
        };
      } else {
        console.log(`⚠️ Navaid ${identifier} not found in location search results`);
        console.log('Available navaids:', data.items.slice(0, 10).map(item => ({ 
          identifier: item.identifier, 
          name: item.name, 
          country: item.country,
          coordinates: item.geometry?.coordinates,
          distance: item.geometry?.coordinates ? 
            Math.sqrt(Math.pow(item.geometry.coordinates[0] - coordinates.lng, 2) + Math.pow(item.geometry.coordinates[1] - coordinates.lat, 2)) * 111000 : 'unknown'
        })));
        
        // Try to find a close match by relaxing the search criteria
        // First priority: exact identifier match
        let closeMatch = data.items.find(item => 
          item.identifier && item.identifier.toLowerCase() === identifier.toLowerCase()
        );
        
        // Second priority: exact name match
        if (!closeMatch) {
          closeMatch = data.items.find(item => 
            item.name && item.name.toLowerCase() === name.toLowerCase()
          );
        }
        
        // Third priority: geographic proximity (within 1km for the correct country)
        if (!closeMatch) {
          closeMatch = data.items.find(item => 
            item.country === 'FR' && item.geometry?.coordinates && 
            Math.abs(item.geometry.coordinates[0] - coordinates.lng) < 0.01 && 
            Math.abs(item.geometry.coordinates[1] - coordinates.lat) < 0.01
          );
        }
        
        // Fourth priority: any navaid within 500m (very close proximity)
        if (!closeMatch) {
          closeMatch = data.items.find(item => 
            item.geometry?.coordinates && 
            Math.abs(item.geometry.coordinates[0] - coordinates.lng) < 0.005 && 
            Math.abs(item.geometry.coordinates[1] - coordinates.lat) < 0.005
          );
        }
        
        if (closeMatch) {
          console.log(`✅ Found close match for ${identifier}:`, closeMatch);
          return {
            ...data,
            _matchedNavaid: closeMatch,
            items: [closeMatch]
          };
        }
      }
    }

    return data; // Return full data if no specific match found
  } catch (error) {
    console.error(`Error fetching location-based navaid details for ${identifier}:`, error);
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
        console.log('🎯 VECTOR-FIRST APPROACH: Processing navaid data');
        
        // Extract navaid data from vector tile - THIS IS OUR SOURCE OF TRUTH
        const vectorNavaidData = {
          // Core identity from vector tiles - this is our truth
          name: props.name,
          identifier: props.identifier || props.ident || props.id,
          country: props.country,
          type: props.type,
          
          // Include any other available properties
          frequency: props.frequency,
          channel: props.channel,
          elevation: props.elevation,
          magneticDeclination: props.magnetic_declination || props.magneticDeclination,
          
          // Geometry for location matching
          geometry: vectorTileFeature.geometry,
          
          // Metadata
          _source: 'vector_tile',
          _layerId: vectorTileFeature.layer?.id,
          _sourceLayer: vectorTileFeature.sourceLayer
        };

        console.log('📤 Vector navaid data extracted:', vectorNavaidData);

        // Check what data we already have from vector tiles
        console.log('📊 Vector tile data completeness check:', {
          hasElevation: !!vectorNavaidData.elevation,
          hasFrequency: !!vectorNavaidData.frequency,
          hasMagneticDeclination: !!vectorNavaidData.magneticDeclination,
          elevation: vectorNavaidData.elevation,
          frequency: vectorNavaidData.frequency
        });

        // Only try REST API enhancement if we're missing critical data
        const needsEnhancement = !vectorNavaidData.elevation || !vectorNavaidData.frequency || !vectorNavaidData.magneticDeclination;
        
        if (needsEnhancement) {
          console.log(`🔍 Vector tile missing some data, attempting REST API enhancement for ${vectorNavaidData.identifier}`);
          
          try {
            const apiResponse = await fetchNavaidDetails(vectorNavaidData.identifier);
            
            if (apiResponse?.items?.length) {
              // STRICT COORDINATE-BASED MATCHING ONLY
              let matchedNavaid = null;
              
              console.log('🔍 Vector tile coordinates:', vectorNavaidData.geometry?.coordinates);
              console.log('🔍 Available API navaids:', apiResponse.items.map(item => ({
                identifier: item.identifier,
                name: item.name,
                country: item.country,
                coordinates: item.geometry?.coordinates,
                frequency: item.frequency?.value,
                elevation: item.elevation?.value
              })));
              
              // ONLY use coordinate proximity - ignore country matching as it's unreliable
              if (vectorNavaidData.geometry?.coordinates) {
                const [vLng, vLat] = vectorNavaidData.geometry.coordinates;
                console.log(`🎯 Looking for navaid near coordinates: ${vLat}, ${vLng}`);
                
                let bestMatch = null;
                let bestDistance = Infinity;
                
                apiResponse.items.forEach(item => {
                  if (!item.geometry?.coordinates) return;
                  const [aLng, aLat] = item.geometry.coordinates;
                  
                  // Calculate distance in degrees (rough approximation)
                  const distance = Math.sqrt(
                    Math.pow(aLng - vLng, 2) + Math.pow(aLat - vLat, 2)
                  );
                  
                  console.log(`📏 Distance to ${item.name} (${item.identifier}): ${distance.toFixed(6)} degrees`);
                  console.log(`   Coordinates: ${aLat}, ${aLng}`);
                  console.log(`   Frequency: ${item.frequency?.value} MHz, Elevation: ${item.elevation?.value}m`);
                  
                  if (distance < bestDistance) {
                    bestDistance = distance;
                    bestMatch = item;
                  }
                });
                
                // Only accept if very close (within ~1km = ~0.01 degrees)
                if (bestMatch && bestDistance < 0.01) {
                  matchedNavaid = bestMatch;
                  console.log(`✅ Found precise coordinate match: ${bestMatch.name} at distance ${bestDistance.toFixed(6)} degrees`);
                  console.log(`   Matched navaid data:`, {
                    name: bestMatch.name,
                    identifier: bestMatch.identifier,
                    frequency: bestMatch.frequency?.value,
                    elevation: bestMatch.elevation?.value,
                    magneticDeclination: bestMatch.magneticDeclination
                  });
                } else {
                  console.log(`❌ No precise coordinate match found. Best distance: ${bestDistance.toFixed(6)} degrees`);
                  console.log('⚠️ Using vector-only data to avoid wrong navaid information');
                }
              }
              
              if (matchedNavaid) {
                // SELECTIVE ENHANCEMENT: Only use API data for missing fields
                const enhancedData = {
                  // Start with vector tile data (our source of truth)
                  ...vectorNavaidData,
                  
                  // Only enhance missing fields from API
                  elevation: vectorNavaidData.elevation || matchedNavaid.elevation?.value,
                  frequency: vectorNavaidData.frequency || matchedNavaid.frequency?.value,
                  magneticDeclination: vectorNavaidData.magneticDeclination || matchedNavaid.magneticDeclination,
                  channel: vectorNavaidData.channel || matchedNavaid.channel,
                  range: matchedNavaid.range,
                  
                  // Data source tracking
                  _source: 'vector_enhanced',
                  _enhancement: 'REST API used only for missing fields'
                };
                
                console.log('✅ ENHANCED DATA (vector priority + selective API enhancement):', enhancedData);
                return enhancedData;
              } else {
                console.log('⚠️ No coordinate match found, using complete vector data');
                return {
                  ...vectorNavaidData,
                  _source: 'vector_complete'
                };
              }
            } else {
              console.log('⚠️ No API data available, using complete vector data');
              return {
                ...vectorNavaidData,
                _source: 'vector_complete'
              };
            }
          } catch (error) {
            console.error('❌ REST API enhancement failed:', error);
            return {
              ...vectorNavaidData,
              _source: 'vector_complete',
              _note: 'REST API unavailable - using complete vector tile data'
            };
          }
        } else {
          console.log('✅ Vector tile data is complete, no REST API enhancement needed');
          return {
            ...vectorNavaidData,
            _source: 'vector_complete',
            _note: 'Complete data available from vector tiles'
          };
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
