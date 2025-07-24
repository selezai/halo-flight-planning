// Simple debug script to understand OpenAIP vector tile properties
// This will help us understand what simple properties are available without over-engineering

// Based on the map labels using ["get", "name"], let's see what other simple properties exist
// From the grep search, I can see map labels use these simple patterns:

const SIMPLE_AIRPORT_PROPERTIES = {
  // Basic identification (used by map labels)
  name: 'name',                    // Used by map text-field: ["get", "name"]
  icao: 'icao',                   // Used by map text-field: "{icao}"
  identifier: 'identifier',       // Alternative to icao
  
  // Basic info that might be directly available
  type: 'type',
  country: 'country',
  elevation: 'elevation',
  
  // Frequency info (might be in name_label_full)
  name_label_full: 'name_label_full',  // This often contains frequency info
  name_label: 'name_label',
  
  // Other potential simple properties
  latitude: 'latitude',
  longitude: 'longitude',
  
  // Properties we've seen in console logs
  sourceLayer: 'sourceLayer'
};

// Simple extraction function - just get the raw property values
function getSimpleAirportData(feature) {
  const props = feature.properties || {};
  
  console.log('🔍 Raw OpenAIP vector tile properties:', props);
  
  // Extract simple data directly from properties (no complex processing)
  return {
    // Basic info
    name: props.name || 'Unknown',
    icao: props.icao || props.identifier || 'N/A',
    type: props.type || 'Unknown',
    country: props.country || 'Unknown',
    
    // Location
    coordinates: feature.geometry?.coordinates || [props.longitude, props.latitude],
    elevation: props.elevation || 'Unknown',
    
    // Labels (might contain frequency/runway info)
    fullLabel: props.name_label_full || props.name_label || '',
    
    // Source info
    sourceLayer: feature.sourceLayer || 'Unknown',
    
    // All raw properties for debugging
    rawProperties: props
  };
}

export { getSimpleAirportData, SIMPLE_AIRPORT_PROPERTIES };
