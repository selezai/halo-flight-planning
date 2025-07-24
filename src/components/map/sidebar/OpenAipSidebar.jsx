/**
 * OpenAIP-Exact Sidebar Component
 * 
 * Replicates the authentic OpenAIP.net sidebar interface with search,
 * feature information display, and navigation tools.
 */

import React, { useState } from 'react';
import { SearchSection } from './SearchSection';
import SimpleFeatureDisplay from './SimpleFeatureDisplay';
import { LayerControls } from './LayerControls';
import { NavigationTools } from './NavigationTools';
import './OpenAipSidebar.css';

export const OpenAipSidebar = ({ 
  selectedFeature, 
  onSearch, 
  onLayerToggle, 
  onToolSelect,
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState('search');
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`openaip-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">🛩️</div>
          <span className="logo-text">OpenAIP</span>
        </div>
        <button 
          className="collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* Tab Navigation */}
          <div className="sidebar-tabs">
            <button 
              className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
              title="Search"
            >
              🔍
            </button>
            <button 
              className={`tab-btn ${activeTab === 'layers' ? 'active' : ''}`}
              onClick={() => setActiveTab('layers')}
              title="Layers"
            >
              🗂️
            </button>
            <button 
              className={`tab-btn ${activeTab === 'tools' ? 'active' : ''}`}
              onClick={() => setActiveTab('tools')}
              title="Tools"
            >
              🛠️
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="sidebar-content">
            {/* Search Section - Always visible at top */}
            {activeTab === 'search' && (
              <SearchSection onSearch={onSearch} />
            )}

            {/* Layer Controls */}
            {activeTab === 'layers' && (
              <LayerControls onLayerToggle={onLayerToggle} />
            )}

            {/* Navigation Tools */}
            {activeTab === 'tools' && (
              <NavigationTools onToolSelect={onToolSelect} />
            )}

            {/* Feature Information Panel */}
            {selectedFeature && (
              <SimpleFeatureDisplay 
                feature={selectedFeature} 
                onClose={onClose}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
