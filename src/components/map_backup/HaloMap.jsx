// src/components/map/HaloMap.jsx
import React, { useRef, useState, useEffect } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapInitialization } from './hooks/useMapInitialization';
import { OpenAipSidebar } from './ui/OpenAipSidebar';
import { FeaturePopup } from './ui/FeaturePopup';
import { setupOpenAipZoomBehavior } from './utils/openAipZoomRules';
import '../../styles/openaip.css';

const HaloMap = () => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const error = useMapInitialization(mapContainerRef, mapRef, setMapLoaded);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    // Define OpenAIP interactive layers
    const interactiveLayers = [
      // Airports
      'airport_clicktarget',
      'airport_label_clicktarget',
      // Airspaces
      'airspace_clicktarget',
      'airspace_label_clicktarget',
      // Navaids
      'navaid_clicktarget',
      'navaid_label_clicktarget',
      // Waypoints
      'waypoint_clicktarget',
      'waypoint_label_clicktarget'
    ];
    
    const handleFeatureClick = (e) => {
      // Query all layers at the click point
      const features = map.queryRenderedFeatures(e.point);
      
      // 4. ADD CLICK INTERACTIONS
      // Filter for OpenAIP aviation features from multiple possible sources.
      const aviationFeatures = features.filter(feature => {
        const source = feature.source;
        const layerId = feature.layer.id;
        
        // Check if it's from OpenAIP source or has OpenAIP layer ID
        return source === 'openaip' || 
               source === 'composite' || 
               layerId.includes('openaip-') ||
               // Check if it's an aviation feature type
               (feature.sourceLayer && (
                 feature.sourceLayer.toLowerCase().includes('airport') ||
                 feature.sourceLayer.toLowerCase().includes('airspace') ||
                 feature.sourceLayer.toLowerCase().includes('navaid') ||
                 feature.sourceLayer.toLowerCase().includes('waypoint')
               ));
      });
      
      if (aviationFeatures.length > 0) {
        console.log('Selected feature:', aviationFeatures[0]);
        setSelectedFeature(aviationFeatures[0]);
      } else {
        // If clicked outside any aviation feature, clear selection
        setSelectedFeature(null);
      }
    };
    
    map.on('click', handleFeatureClick);
    
    // Set cursor to pointer when hovering over interactive layers
    interactiveLayers.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      }
    });

    // Apply OpenAIP zoom behavior for layer visibility
    setupOpenAipZoomBehavior(map);

    return () => {
      map.off('click', handleFeatureClick);
      
      interactiveLayers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.off('mouseenter', layerId);
          map.off('mouseleave', layerId);
        }
      });
    };
  }, [mapLoaded, mapRef.current]);

  const handleLayerToggle = (layerGroup, isVisible) => {
    const map = mapRef.current;
    if (!map) return;
    
    // Get all layers from the map style
    const layers = map.getStyle().layers;
    
    // Define layer group patterns
    const layerPatterns = {
      'airports': ['airport_', 'airports_'],
      'airspaces': ['airspace_'],
      'navaids': ['navaid_'],
      'waypoints': ['waypoint_', 'reportingpoint_'],
      'obstacles': ['obstacle_']
    };
    
    // Get patterns for the requested layer group
    const patterns = layerPatterns[layerGroup];
    if (!patterns) return;
    
    // Toggle visibility for all layers in the group
    layers.forEach(layer => {
      const layerId = layer.id;
      if (patterns.some(pattern => layerId.includes(pattern))) {
        map.setLayoutProperty(layerId, 'visibility', isVisible ? 'visible' : 'none');
      }
    });
    
    console.log(`${isVisible ? 'Showing' : 'Hiding'} ${layerGroup} layers`);
  };

  const handleSearch = (query) => {
    // Implement search functionality
    console.log('Searching for:', query);
  };

  const handleToolSelect = (tool) => {
    // Implement tool selection
    console.log('Tool selected:', tool);
  };

  return (
    <div className="relative w-full h-full">
      {showSidebar && (
        <OpenAipSidebar
          onSearch={handleSearch}
          onLayerToggle={handleLayerToggle}
          onToolSelect={handleToolSelect}
        />
      )}
      
      <div ref={mapContainerRef} className="map-container" style={{ width: '100%', height: '100vh' }} />
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(211, 47, 47, 0.9)', // Material UI error red
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000,
          textAlign: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          maxWidth: '80%',
        }}>
          <h3 style={{ marginTop: 0, borderBottom: '1px solid rgba(255,255,255,0.5)', paddingBottom: '10px', marginBottom: '10px' }}>Map Failed to Load</h3>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      )}
      
      <FeaturePopup 
        feature={selectedFeature}
        onClose={() => setSelectedFeature(null)}
      />
      
      {!mapLoaded && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-4 rounded-md shadow-lg">
          Loading Aviation Data...
        </div>
      )}
    </div>
  );
};

export default HaloMap;