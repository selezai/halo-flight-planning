/**
 * Layer Controls Component for OpenAIP Sidebar
 * 
 * Handles layer visibility toggles and filtering options
 */

import React, { useState } from 'react';

export const LayerControls = ({ onLayerToggle }) => {
  const [layerStates, setLayerStates] = useState({
    airports: true,
    airspaces: true,
    navaids: true,
    obstacles: true,
    waypoints: false,
    hotspots: false,
    hangGliding: false,
    rcAirfields: false,
    reportingPoints: false
  });

  const [baseMapStyle, setBaseMapStyle] = useState('satellite');

  const layerConfigs = [
    {
      key: 'airports',
      name: 'Airports',
      icon: '✈️',
      description: 'Airports and airfields'
    },
    {
      key: 'airspaces',
      name: 'Airspaces',
      icon: '🛡️',
      description: 'Controlled airspace areas'
    },
    {
      key: 'navaids',
      name: 'Navigation Aids',
      icon: '📡',
      description: 'VOR, NDB, DME stations'
    },
    {
      key: 'obstacles',
      name: 'Obstacles',
      icon: '⚠️',
      description: 'Towers, masts, buildings'
    },
    {
      key: 'waypoints',
      name: 'Waypoints',
      icon: '📍',
      description: 'Navigation waypoints'
    },
    {
      key: 'hotspots',
      name: 'Hotspots',
      icon: '🔥',
      description: 'Thermal hotspots'
    },
    {
      key: 'hangGliding',
      name: 'Hang Gliding',
      icon: '🪂',
      description: 'Hang gliding sites'
    },
    {
      key: 'rcAirfields',
      name: 'RC Airfields',
      icon: '🛩️',
      description: 'Radio-controlled aircraft fields'
    },
    {
      key: 'reportingPoints',
      name: 'Reporting Points',
      icon: '📋',
      description: 'Aviation reporting points'
    }
  ];

  const baseMapOptions = [
    { key: 'satellite', name: 'Satellite', icon: '🛰️' },
    { key: 'terrain', name: 'Terrain', icon: '🗻' },
    { key: 'streets', name: 'Streets', icon: '🛣️' },
    { key: 'basic', name: 'Basic', icon: '🗺️' }
  ];

  const handleLayerToggle = (layerKey) => {
    const newState = !layerStates[layerKey];
    setLayerStates(prev => ({
      ...prev,
      [layerKey]: newState
    }));
    
    if (onLayerToggle) {
      onLayerToggle(layerKey, newState);
    }
  };

  const handleBaseMapChange = (styleKey) => {
    setBaseMapStyle(styleKey);
    if (onLayerToggle) {
      onLayerToggle('baseMap', styleKey);
    }
  };

  const toggleAllLayers = (enabled) => {
    const newStates = {};
    Object.keys(layerStates).forEach(key => {
      newStates[key] = enabled;
    });
    setLayerStates(newStates);
    
    if (onLayerToggle) {
      onLayerToggle('all', enabled);
    }
  };

  return (
    <div className="layer-controls">
      {/* Base Map Selection */}
      <div className="control-section">
        <h4>Base Map</h4>
        <div className="base-map-options">
          {baseMapOptions.map(option => (
            <button
              key={option.key}
              className={`base-map-btn ${baseMapStyle === option.key ? 'active' : ''}`}
              onClick={() => handleBaseMapChange(option.key)}
              title={option.name}
            >
              <span className="map-icon">{option.icon}</span>
              <span className="map-name">{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="control-section">
        <div className="section-header">
          <h4>Aviation Layers</h4>
          <div className="bulk-actions">
            <button 
              className="bulk-btn"
              onClick={() => toggleAllLayers(true)}
              title="Show all layers"
            >
              All On
            </button>
            <button 
              className="bulk-btn"
              onClick={() => toggleAllLayers(false)}
              title="Hide all layers"
            >
              All Off
            </button>
          </div>
        </div>

        <div className="layer-list">
          {layerConfigs.map(layer => (
            <div key={layer.key} className="layer-item">
              <label className="layer-toggle">
                <input
                  type="checkbox"
                  checked={layerStates[layer.key]}
                  onChange={() => handleLayerToggle(layer.key)}
                />
                <span className="toggle-slider"></span>
                <div className="layer-info">
                  <div className="layer-main">
                    <span className="layer-icon">{layer.icon}</span>
                    <span className="layer-name">{layer.name}</span>
                  </div>
                  <div className="layer-description">{layer.description}</div>
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Options */}
      <div className="control-section">
        <h4>Filters</h4>
        <div className="filter-options">
          <div className="filter-group">
            <label>Airport Types:</label>
            <select className="filter-select">
              <option value="all">All Airports</option>
              <option value="international">International</option>
              <option value="regional">Regional</option>
              <option value="private">Private</option>
              <option value="military">Military</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Airspace Classes:</label>
            <select className="filter-select">
              <option value="all">All Classes</option>
              <option value="A">Class A</option>
              <option value="B">Class B</option>
              <option value="C">Class C</option>
              <option value="D">Class D</option>
              <option value="E">Class E</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Obstacle Height:</label>
            <select className="filter-select">
              <option value="all">All Heights</option>
              <option value="low">Below 100ft</option>
              <option value="medium">100-500ft</option>
              <option value="high">Above 500ft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Layer Statistics */}
      <div className="control-section">
        <h4>Layer Statistics</h4>
        <div className="layer-stats">
          <div className="stat-item">
            <span className="stat-label">Visible Features:</span>
            <span className="stat-value">1,247</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Features:</span>
            <span className="stat-value">3,891</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Current Zoom:</span>
            <span className="stat-value">8.5</span>
          </div>
        </div>
      </div>
    </div>
  );
};
