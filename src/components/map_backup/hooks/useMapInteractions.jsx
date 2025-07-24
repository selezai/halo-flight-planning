import { useEffect } from 'react';
import maplibregl from 'maplibre-gl';
import { createRoot } from 'react-dom/client';
import MapPopup from '../MapPopup.jsx';

// Define the layers that should be interactive (clickable)
const CLICKABLE_LAYERS = [
  'airport_clicktarget',
  'navaid_clicktarget',
  'airspace_clicktarget',
  'reporting_point_clicktarget',
  'hotspot_clicktarget',
  'obstacle_clicktarget',
  'hang_gliding_clicktarget',
  'rc_airfield_clicktarget',
];

export const useMapInteractions = (map, mapLoaded) => {
  useEffect(() => {
    if (!map || !mapLoaded) return;

    const popupContainer = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    const handleClick = (e) => {
      const feature = e.features[0];
      if (!feature) return;

      const popupNode = document.createElement('div');
      const root = createRoot(popupNode);
      root.render(<MapPopup feature={feature} />);

      popupContainer
        .setLngLat(e.lngLat)
        .setDOMContent(popupNode)
        .addTo(map);
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
      popupContainer.remove();
    };

    CLICKABLE_LAYERS.forEach(layerId => {
      if (map.getLayer(layerId)) {
        map.on('click', layerId, handleClick);
        map.on('mouseenter', layerId, handleMouseEnter);
        map.on('mouseleave', layerId, handleMouseLeave);
      }
    });

    return () => {
      if (!map.style) return;
      CLICKABLE_LAYERS.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.off('click', layerId, handleClick);
          map.off('mouseenter', layerId, handleMouseEnter);
          map.off('mouseleave', layerId, handleMouseLeave);
        }
      });
    };
  }, [map, mapLoaded]);
};
