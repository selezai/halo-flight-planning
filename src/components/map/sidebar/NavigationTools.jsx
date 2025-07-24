/**
 * Navigation Tools Component for OpenAIP Sidebar
 * 
 * Provides measurement tools, export options, and navigation utilities
 */

import React, { useState } from 'react';

export const NavigationTools = ({ onToolSelect }) => {
  const [activeTool, setActiveTool] = useState(null);
  const [measurements, setMeasurements] = useState([]);

  const tools = [
    {
      key: 'measure-distance',
      name: 'Measure Distance',
      icon: '📏',
      description: 'Measure distance between points'
    },
    {
      key: 'measure-area',
      name: 'Measure Area',
      icon: '📐',
      description: 'Calculate area of polygon'
    },
    {
      key: 'draw-route',
      name: 'Draw Route',
      icon: '🛤️',
      description: 'Plan flight route'
    },
    {
      key: 'coordinates',
      name: 'Get Coordinates',
      icon: '🎯',
      description: 'Click to get coordinates'
    },
    {
      key: 'print',
      name: 'Print Map',
      icon: '🖨️',
      description: 'Print current map view'
    },
    {
      key: 'export',
      name: 'Export Data',
      icon: '💾',
      description: 'Export visible features'
    }
  ];

  const handleToolSelect = (toolKey) => {
    const newActiveTool = activeTool === toolKey ? null : toolKey;
    setActiveTool(newActiveTool);
    
    if (onToolSelect) {
      onToolSelect(toolKey, newActiveTool !== null);
    }
  };

  const clearMeasurements = () => {
    setMeasurements([]);
    if (onToolSelect) {
      onToolSelect('clear-measurements', true);
    }
  };

  const formatDistance = (distance) => {
    if (distance < 1000) {
      return `${distance.toFixed(0)} m`;
    } else if (distance < 1852) {
      return `${(distance / 1000).toFixed(2)} km`;
    } else {
      return `${(distance / 1852).toFixed(2)} NM`;
    }
  };

  const formatArea = (area) => {
    if (area < 1000000) {
      return `${(area / 10000).toFixed(2)} ha`;
    } else {
      return `${(area / 1000000).toFixed(2)} km²`;
    }
  };

  return (
    <div className="navigation-tools">
      {/* Tool Selection */}
      <div className="tool-section">
        <h4>Tools</h4>
        <div className="tool-grid">
          {tools.map(tool => (
            <button
              key={tool.key}
              className={`tool-btn ${activeTool === tool.key ? 'active' : ''}`}
              onClick={() => handleToolSelect(tool.key)}
              title={tool.description}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-name">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Tool Instructions */}
      {activeTool && (
        <div className="tool-instructions">
          <div className="instruction-header">
            <h5>Instructions</h5>
            <button 
              className="deactivate-btn"
              onClick={() => handleToolSelect(activeTool)}
              title="Deactivate tool"
            >
              ✕
            </button>
          </div>
          <div className="instruction-content">
            {activeTool === 'measure-distance' && (
              <p>Click on the map to start measuring. Click again to add points. Double-click to finish.</p>
            )}
            {activeTool === 'measure-area' && (
              <p>Click on the map to start drawing a polygon. Double-click to close and calculate area.</p>
            )}
            {activeTool === 'draw-route' && (
              <p>Click waypoints to create a flight route. Right-click to add intermediate points.</p>
            )}
            {activeTool === 'coordinates' && (
              <p>Click anywhere on the map to get precise coordinates in multiple formats.</p>
            )}
            {activeTool === 'print' && (
              <p>Adjust the map view and click "Generate Print View" to create a printable map.</p>
            )}
            {activeTool === 'export' && (
              <p>Select export format and click "Export" to download visible aviation data.</p>
            )}
          </div>
        </div>
      )}

      {/* Measurements Display */}
      {measurements.length > 0 && (
        <div className="measurements-section">
          <div className="section-header">
            <h4>Measurements</h4>
            <button 
              className="clear-btn"
              onClick={clearMeasurements}
              title="Clear all measurements"
            >
              Clear All
            </button>
          </div>
          <div className="measurements-list">
            {measurements.map((measurement, index) => (
              <div key={index} className="measurement-item">
                <div className="measurement-type">
                  {measurement.type === 'distance' ? '📏' : '📐'} 
                  {measurement.type.charAt(0).toUpperCase() + measurement.type.slice(1)}
                </div>
                <div className="measurement-value">
                  {measurement.type === 'distance' 
                    ? formatDistance(measurement.value)
                    : formatArea(measurement.value)
                  }
                </div>
                <button 
                  className="remove-measurement"
                  onClick={() => setMeasurements(prev => prev.filter((_, i) => i !== index))}
                  title="Remove measurement"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Options */}
      {activeTool === 'export' && (
        <div className="export-section">
          <h4>Export Options</h4>
          <div className="export-options">
            <div className="export-format">
              <label>Format:</label>
              <select className="format-select">
                <option value="geojson">GeoJSON</option>
                <option value="kml">KML</option>
                <option value="csv">CSV</option>
                <option value="gpx">GPX</option>
              </select>
            </div>
            <div className="export-layers">
              <label>Include Layers:</label>
              <div className="layer-checkboxes">
                <label><input type="checkbox" defaultChecked /> Airports</label>
                <label><input type="checkbox" defaultChecked /> Airspaces</label>
                <label><input type="checkbox" defaultChecked /> Navaids</label>
                <label><input type="checkbox" /> Obstacles</label>
              </div>
            </div>
            <button className="export-btn primary">
              📥 Export Data
            </button>
          </div>
        </div>
      )}

      {/* Print Options */}
      {activeTool === 'print' && (
        <div className="print-section">
          <h4>Print Options</h4>
          <div className="print-options">
            <div className="print-format">
              <label>Paper Size:</label>
              <select className="format-select">
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
              </select>
            </div>
            <div className="print-orientation">
              <label>Orientation:</label>
              <div className="orientation-options">
                <label><input type="radio" name="orientation" value="portrait" /> Portrait</label>
                <label><input type="radio" name="orientation" value="landscape" defaultChecked /> Landscape</label>
              </div>
            </div>
            <div className="print-elements">
              <label>Include:</label>
              <div className="element-checkboxes">
                <label><input type="checkbox" defaultChecked /> Scale</label>
                <label><input type="checkbox" defaultChecked /> North Arrow</label>
                <label><input type="checkbox" defaultChecked /> Legend</label>
                <label><input type="checkbox" /> Grid</label>
              </div>
            </div>
            <button className="print-btn primary">
              🖨️ Generate Print View
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <h4>Quick Actions</h4>
        <div className="action-buttons">
          <button className="action-btn">
            🧭 Find My Location
          </button>
          <button className="action-btn">
            🎯 Center Map
          </button>
          <button className="action-btn">
            🔄 Reset View
          </button>
          <button className="action-btn">
            📱 Share Location
          </button>
        </div>
      </div>
    </div>
  );
};
