// src/components/map/HaloMap.jsx
import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapInitialization } from './hooks/useMapInitialization';
import { useSidebar } from './hooks/useSidebar';
import { OpenAipSidebar } from './sidebar/OpenAipSidebar';
// Removed over-engineered imports - using simple vector tile properties directly
import { setupOpenAipZoomBehavior } from './utils/openAipZoomRules';
import './sidebar/OpenAipSidebar.css';
import '../../styles/openaip.css';

const HaloMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const error = useMapInitialization(mapContainerRef, mapRef, setMapLoaded);
  
  // Direct MapLibre click handling for sidebar integration
  const [clickedFeature, setClickedFeature] = useState(null);

  // Use OpenAIP-exact sidebar system
  const {
    sidebarVisible,
    selectedFeature: sidebarSelectedFeature,
    searchResults,
    activeTab,
    handleFeatureSelect,
    handleSearch,
    handleLayerToggle,
    handleToolSelect,
    handleCloseFeature,
    toggleSidebar,
    setActiveTab,
    setSidebarVisible
  } = useSidebar(mapRef.current);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Apply OpenAIP zoom behavior for layer visibility
    setupOpenAipZoomBehavior(map);
    
    console.log('✅ Map loaded with OpenAIP-exact sidebar system');
  }, [mapLoaded, mapRef.current]);

  // Set up direct MapLibre click handlers for sidebar integration
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const handleMapClick = (e) => {
      // Query all rendered features at click point (no layer filter to catch all OpenAIP features)
      const features = map.queryRenderedFeatures(e.point);
      
      // Filter for OpenAIP features (those with source 'openaip-data')
      const openAipFeatures = features.filter(feature => 
        feature.source === 'openaip-data' || 
        feature.sourceLayer // OpenAIP vector tile features have sourceLayer
      );

      if (openAipFeatures.length > 0) {
        const feature = openAipFeatures[0];
        console.log('🎯 OpenAIP Feature clicked:', feature);
        console.log('📊 Feature properties:', feature.properties);
        console.log('🗂️ Source layer:', feature.sourceLayer);
        
        // SIMPLE APPROACH: Use raw vector tile properties directly (like map labels do)
        console.log('✅ Using simple vector tile properties directly - no over-engineering!');
        
        // Show raw vector tile data directly (same as map labels use)
        handleFeatureSelect(feature);
        setClickedFeature(feature);
      } else {
        // Clear sidebar selection if clicking empty area
        console.log('🔍 No OpenAIP features found at click point');
        handleCloseFeature();
        setClickedFeature(null);
      }
    };

    // Add click handler
    map.on('click', handleMapClick);

    // Cleanup
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mapLoaded, mapRef.current, handleFeatureSelect, handleCloseFeature]);

  // Removed legacy handlers - implementing OpenAIP-exact functionality

  return (
    <div className="relative w-full h-full">
      {/* OpenAIP-Exact Sidebar */}
      <OpenAipSidebar
        selectedFeature={sidebarSelectedFeature}
        onSearch={handleSearch}
        onLayerToggle={handleLayerToggle}
        onToolSelect={handleToolSelect}
        onClose={handleCloseFeature}
      />
      
      {/* Map Container - adjusted for sidebar */}
      <div 
        ref={mapContainerRef} 
        className="map-container" 
        style={{ 
          width: '100%', 
          height: '100vh',
          marginLeft: sidebarVisible ? '380px' : '0px',
          transition: 'margin-left 0.3s ease'
        }} 
      />
      {error && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: sidebarVisible ? '390px' : '10px',
          background: 'red',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          zIndex: 1000,
          transition: 'left 0.3s ease'
        }}>
          Error loading map: {error}
        </div>
      )}
      
      {/* Sidebar Toggle Button - for mobile/collapsed view */}
      {!sidebarVisible && (
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '12px',
            cursor: 'pointer',
            zIndex: 1000,
            fontSize: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
          title="Open sidebar"
        >
          🛩️
        </button>
      )}
      
      {!mapLoaded && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
          Loading Aviation Data...
        </div>
      )}
    </div>
  );
};

export default HaloMap;