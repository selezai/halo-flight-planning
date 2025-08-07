import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-proxy-server.com/api'
  : 'http://localhost:3001/api';

class OpenAipRestApi {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Main entry point - Vector-first approach
   * The vector tile data is ALWAYS the source of truth for identity
   */
  async getNavaidDetails(vectorTileData) {
    console.log('📡 Vector-first navaid lookup:', vectorTileData);
    
    if (!vectorTileData?.identifier) {
      console.warn('⚠️ No identifier in vector tile data');
      return this.createVectorOnlyResponse(vectorTileData);
    }

    // Create a unique cache key including country for disambiguation
    const cacheKey = `${vectorTileData.identifier}_${vectorTileData.country || 'XX'}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      console.log('📦 Using cached data for:', cacheKey);
      return this.cache.get(cacheKey);
    }

    // Check for pending request
    if (this.pendingRequests.has(cacheKey)) {
      console.log('⏳ Waiting for pending request:', cacheKey);
      return this.pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = this.fetchAndValidateNavaid(vectorTileData, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch navaid from API and validate it matches our vector tile
   */
  async fetchAndValidateNavaid(vectorTileData, cacheKey) {
    try {
      // Try to get navaids with this identifier
      const response = await axios.get(`${API_BASE_URL}/openaip/navaids`, {
        params: { ident: vectorTileData.identifier },
        timeout: 5000
      });

      if (!response.data?.items?.length) {
        console.log('❌ No REST API results for identifier:', vectorTileData.identifier);
        return this.createVectorOnlyResponse(vectorTileData);
      }

      // Find the best matching navaid from the results
      const matchedNavaid = this.findBestMatch(vectorTileData, response.data.items);

      if (matchedNavaid) {
        console.log('✅ Found matching navaid in REST API:', matchedNavaid.name);
        return this.mergeVectorAndApiData(vectorTileData, matchedNavaid);
      } else {
        console.log('⚠️ No country/location match found in REST API results');
        return this.createVectorOnlyResponse(vectorTileData);
      }

    } catch (error) {
      console.error('❌ REST API error:', error.message);
      return this.createVectorOnlyResponse(vectorTileData);
    }
  }

  /**
   * Find the best matching navaid from API results
   * Priority: Country match > Location proximity > First result
   */
  findBestMatch(vectorTileData, apiNavaids) {
    if (!apiNavaids || apiNavaids.length === 0) return null;

    // If we have country info, try to match on country first
    if (vectorTileData.country) {
      const countryMatch = apiNavaids.find(navaid => 
        navaid.country === vectorTileData.country
      );
      if (countryMatch) {
        console.log('✅ Matched by country:', countryMatch.country);
        return countryMatch;
      }
    }

    // If we have coordinates, try proximity matching
    if (vectorTileData.geometry?.coordinates) {
      const [vLon, vLat] = vectorTileData.geometry.coordinates;
      
      // Find navaid within reasonable distance (0.5 degrees ~55km)
      const proximityMatch = apiNavaids.find(navaid => {
        if (!navaid.geometry?.coordinates) return false;
        const [aLon, aLat] = navaid.geometry.coordinates;
        const distance = Math.sqrt(
          Math.pow(aLon - vLon, 2) + Math.pow(aLat - vLat, 2)
        );
        return distance < 0.5;
      });

      if (proximityMatch) {
        console.log('✅ Matched by proximity');
        return proximityMatch;
      }
    }

    // No reliable match - don't use API data
    console.log('❌ No reliable match found in API results');
    return null;
  }

  /**
   * Merge vector tile and API data
   * CRITICAL: Vector tile data ALWAYS takes precedence for identity fields
   */
  mergeVectorAndApiData(vectorTileData, apiData) {
    // Start with all API data
    const merged = { ...apiData };

    // OVERRIDE with vector tile identity - this is non-negotiable
    merged.name = vectorTileData.name || apiData.name;
    merged.identifier = vectorTileData.identifier;
    merged.country = vectorTileData.country || apiData.country;
    
    // Preserve vector tile geometry if available (it's more accurate for display)
    if (vectorTileData.geometry) {
      merged.geometry = vectorTileData.geometry;
    }

    // Add any vector-specific properties
    if (vectorTileData.type !== undefined) {
      merged.type = vectorTileData.type;
    }

    // Mark as verified match
    merged._dataSource = 'hybrid_verified';
    merged._vectorName = vectorTileData.name;
    merged._apiName = apiData.name;

    console.log('🔄 Merged data - Vector identity with API details:', {
      vector: `${vectorTileData.name} (${vectorTileData.identifier})`,
      api: `${apiData.name} (${apiData.identifier})`,
      final: `${merged.name} (${merged.identifier})`
    });

    return merged;
  }

  /**
   * Create response using only vector tile data
   * This is our fallback when API data is unreliable
   */
  createVectorOnlyResponse(vectorTileData) {
    console.log('📍 Using vector-only data (no reliable API match)');
    
    return {
      ...vectorTileData,
      _dataSource: 'vector_only',
      _warning: 'Limited data available - REST API match not found',
      // Explicitly mark missing data
      elevation: vectorTileData.elevation || null,
      magneticDeclination: vectorTileData.magneticDeclination || null,
      // Ensure required fields are present
      name: vectorTileData.name || 'Unknown',
      identifier: vectorTileData.identifier || 'N/A',
      country: vectorTileData.country || 'Unknown',
      type: vectorTileData.type !== undefined ? vectorTileData.type : null
    };
  }

  /**
   * Clear cache - useful for debugging
   */
  clearCache() {
    this.cache.clear();
    console.log('🧹 Cache cleared');
  }
}

// Export singleton instance
export default new OpenAipRestApi();
