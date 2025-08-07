import React, { useEffect, useState } from 'react';
import openAipRestApi from '../utils/openAipRestApi_vectorFirst';

const NavaidDisplay = ({ feature, onClose }) => {
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataQuality, setDataQuality] = useState('unknown');

  useEffect(() => {
    if (!feature) {
      setDisplayData(null);
      return;
    }

    const loadNavaidDetails = async () => {
      setLoading(true);
      console.log('🎯 NavaidDisplay received feature:', feature);

      try {
        // Extract navaid data from vector tile feature
        const vectorNavaidData = {
          // Core identity from vector tiles - this is our truth
          name: feature.properties?.name || feature.extractedProperties?.name,
          identifier: feature.properties?.identifier || feature.properties?.ident || feature.extractedProperties?.identifier,
          country: feature.properties?.country || feature.extractedProperties?.country,
          type: feature.properties?.type || feature.extractedProperties?.type,
          
          // Include any other available properties
          frequency: feature.properties?.frequency || feature.extractedProperties?.frequency,
          channel: feature.properties?.channel || feature.extractedProperties?.channel,
          elevation: feature.properties?.elevation || feature.extractedProperties?.elevation,
          magneticDeclination: feature.properties?.magnetic_declination || feature.properties?.magneticDeclination,
          
          // Geometry for location matching
          geometry: feature.geometry,
          
          // Metadata
          _source: 'vector_tile',
          _layerId: feature.layer?.id,
          _sourceLayer: feature.sourceLayer
        };

        console.log('📤 Vector navaid data extracted:', vectorNavaidData);

        // Always use the vector-first approach
        const enrichedData = await openAipRestApi.getNavaidDetails(vectorNavaidData);
        
        console.log('📊 NavaidDisplay enriched data:', enrichedData);
        
        // Determine data quality for user feedback
        if (enrichedData._dataSource === 'hybrid_verified') {
          setDataQuality('complete');
        } else if (enrichedData._dataSource === 'vector_only') {
          setDataQuality('partial');
        } else {
          setDataQuality('unknown');
        }

        setDisplayData(enrichedData);
      } catch (error) {
        console.error('❌ Error loading navaid details:', error);
        // Fall back to vector data on error
        const fallbackData = {
          name: feature.properties?.name || feature.extractedProperties?.name || 'Unknown',
          identifier: feature.properties?.identifier || feature.properties?.ident || feature.extractedProperties?.identifier || 'N/A',
          country: feature.properties?.country || feature.extractedProperties?.country || 'Unknown',
          type: feature.properties?.type || feature.extractedProperties?.type,
          _dataSource: 'error_fallback'
        };
        setDisplayData(fallbackData);
        setDataQuality('partial');
      } finally {
        setLoading(false);
      }
    };

    loadNavaidDetails();
  }, [feature]);

  if (!displayData && !loading) {
    return (
      <div className="navaid-display">
        <div className="navaid-header">
          <h2>No navaid selected</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="navaid-display">
        <div className="navaid-header">
          <h2>Loading...</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        <p>Loading navaid details...</p>
      </div>
    );
  }

  // Helper function to display value or indicate it's missing
  const displayValue = (value, unit = '') => {
    if (value === null || value === undefined || value === '') {
      return <span className="data-missing">Not available</span>;
    }
    
    // Handle elevation object format from API
    if (typeof value === 'object' && value.value !== undefined) {
      return `${value.value}${unit}`;
    }
    
    return `${value}${unit}`;
  };

  // Get navaid type label
  const getNavaidTypeLabel = (type) => {
    const types = {
      0: 'VOR',
      1: 'VOR-DME', 
      2: 'DME',
      3: 'NDB',
      4: 'TACAN',
      5: 'VOR-TACAN',
      6: 'Locator',
      'vor': 'VOR',
      'vor-dme': 'VOR-DME',
      'dme': 'DME',
      'ndb': 'NDB',
      'tacan': 'TACAN'
    };
    return types[type] || 'Unknown';
  };

  // Format coordinates
  const formatCoordinates = (geometry) => {
    if (!geometry?.coordinates) return 'Not available';
    const [lng, lat] = geometry.coordinates;
    return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
  };

  // Format frequency
  const formatFrequency = (frequency) => {
    if (!frequency) return null;
    
    // Handle frequency object from API
    if (typeof frequency === 'object' && frequency.value) {
      const unit = frequency.unit === 1 ? 'kHz' : 'MHz';
      return `${frequency.value} ${unit}`;
    }
    
    // Handle string format
    if (typeof frequency === 'string') {
      return frequency.includes('MHz') || frequency.includes('kHz') ? frequency : `${frequency} MHz`;
    }
    
    return `${frequency} MHz`;
  };

  return (
    <div className="navaid-display">
      {/* Header */}
      <div className="navaid-header">
        <h2>{displayData.name || 'Unknown Navaid'}</h2>
        <button onClick={onClose} className="close-button">×</button>
      </div>

      {/* Data Quality Indicator */}
      {dataQuality === 'partial' && (
        <div className="data-quality-warning">
          ⚠️ Limited data available - showing vector tile information only
        </div>
      )}
      
      {/* Identity Section - Always from Vector Tiles */}
      <div className="navaid-section">
        <h3>Navaid Information</h3>
        <div className="navaid-identity">
          <div className="navaid-field">
            <label>Name:</label>
            <span className="navaid-value primary">{displayData.name}</span>
          </div>
          <div className="navaid-field">
            <label>Identifier:</label>
            <span className="navaid-value primary">{displayData.identifier}</span>
          </div>
          <div className="navaid-field">
            <label>Country:</label>
            <span className="navaid-value">{displayData.country}</span>
          </div>
          <div className="navaid-field">
            <label>Type:</label>
            <span className="navaid-value">
              {getNavaidTypeLabel(displayData.type)}
            </span>
          </div>
        </div>
      </div>

      {/* Technical Details Section */}
      <div className="navaid-section">
        <h3>Technical Details</h3>
        <div className="navaid-field">
          <label>Frequency:</label>
          <span className="navaid-value">
            {displayValue(formatFrequency(displayData.frequency))}
          </span>
        </div>
        <div className="navaid-field">
          <label>Channel:</label>
          <span className="navaid-value">
            {displayValue(displayData.channel)}
          </span>
        </div>
        <div className="navaid-field">
          <label>Elevation:</label>
          <span className="navaid-value">
            {displayValue(displayData.elevation, ' m MSL')}
          </span>
        </div>
        <div className="navaid-field">
          <label>Magnetic Declination:</label>
          <span className="navaid-value">
            {displayValue(displayData.magneticDeclination, '°')}
          </span>
        </div>
        <div className="navaid-field">
          <label>Aligned True North:</label>
          <span className="navaid-value">
            {displayData.alignedTrueNorth !== undefined ? 
              (displayData.alignedTrueNorth ? 'Yes' : 'No') : 
              <span className="data-missing">Not available</span>
            }
          </span>
        </div>
      </div>

      {/* Location Section */}
      <div className="navaid-section">
        <h3>Location</h3>
        <div className="navaid-field">
          <label>Coordinates:</label>
          <span className="navaid-value">
            {formatCoordinates(displayData.geometry)}
          </span>
        </div>
      </div>

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="navaid-debug">
          <details>
            <summary>Debug Info</summary>
            <pre>{JSON.stringify({
              dataSource: displayData._dataSource,
              vectorName: displayData._vectorName,
              apiName: displayData._apiName,
              hasElevation: displayData.elevation !== null && displayData.elevation !== undefined,
              hasMagDec: displayData.magneticDeclination !== null && displayData.magneticDeclination !== undefined,
              warning: displayData._warning
            }, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default NavaidDisplay;
