import React from 'react';

const MapPopup = ({ feature }) => {
  if (!feature || !feature.properties) {
    return null;
  }

  // Extract common properties, providing fallbacks
  const name = feature.properties.name || 'Unnamed Feature';
  const type = feature.properties.type || 'N/A';

  return (
    <div className="map-popup">
      <h3>{name}</h3>
      <p><strong>Type:</strong> {type}</p>
      {/* We can add more feature-specific details here later */}
    </div>
  );
};

export default MapPopup;
