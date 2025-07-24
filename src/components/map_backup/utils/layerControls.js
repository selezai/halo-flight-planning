// Layer toggle controls for OpenAIP map
export function addLayerToggleControls(map) {
  console.log('🎛️ Adding layer toggle controls...');
  
  // Create control container
  const controlContainer = document.createElement('div');
  controlContainer.className = 'maplibregl-ctrl maplibregl-ctrl-group';
  controlContainer.style.cssText = `
    background: white;
    border-radius: 4px;
    box-shadow: 0 0 0 2px rgba(0,0,0,0.1);
    padding: 8px;
    margin: 10px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
    min-width: 150px;
  `;
  
  // Layer toggle options
  const layerToggles = [
    { id: 'airspace', label: 'Airspace', layers: ['airspace-fill', 'airspace-outline', 'airspace-labels'], default: true },
    { id: 'airports', label: 'Airports', layers: ['airport', 'airport_runway', 'airport_with_code', 'airport_intl'], default: true },
    { id: 'navaids', label: 'Navigation Aids', layers: ['navaid', 'navaids'], default: true },
    { id: 'obstacles', label: 'Obstacles', layers: ['obstacle', 'obstacles'], default: true },
    { id: 'base-topo', label: 'Topographic Base', layers: ['satellite', 'raster'], default: true }
  ];
  
  // Create title
  const title = document.createElement('div');
  title.textContent = 'Map Layers';
  title.style.cssText = `
    font-weight: bold;
    margin-bottom: 8px;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 4px;
  `;
  controlContainer.appendChild(title);
  
  // Create toggles
  layerToggles.forEach(toggle => {
    const toggleContainer = document.createElement('div');
    toggleContainer.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 6px;
      cursor: pointer;
    `;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `toggle-${toggle.id}`;
    checkbox.checked = toggle.default;
    checkbox.style.cssText = `
      margin-right: 8px;
      cursor: pointer;
    `;
    
    const label = document.createElement('label');
    label.textContent = toggle.label;
    label.htmlFor = `toggle-${toggle.id}`;
    label.style.cssText = `
      cursor: pointer;
      color: #333;
      user-select: none;
    `;
    
    // Add event listener
    checkbox.addEventListener('change', (e) => {
      const visibility = e.target.checked ? 'visible' : 'none';
      toggle.layers.forEach(layerId => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visibility);
        }
      });
      console.log(`🔄 ${toggle.label} layers ${e.target.checked ? 'enabled' : 'disabled'}`);
    });
    
    toggleContainer.appendChild(checkbox);
    toggleContainer.appendChild(label);
    controlContainer.appendChild(toggleContainer);
  });
  
  // Add base map style switcher
  const styleTitle = document.createElement('div');
  styleTitle.textContent = 'Base Map Style';
  styleTitle.style.cssText = `
    font-weight: bold;
    margin: 12px 0 8px 0;
    color: #333;
    border-bottom: 1px solid #eee;
    padding-bottom: 4px;
  `;
  controlContainer.appendChild(styleTitle);
  
  const styleOptions = [
    { id: 'topo', label: 'Topographic', url: 'topo-v2' },
    { id: 'satellite', label: 'Satellite', url: 'satellite' },
    { id: 'streets', label: 'Streets', url: 'streets-v2' }
  ];
  
  styleOptions.forEach((style, index) => {
    const styleContainer = document.createElement('div');
    styleContainer.style.cssText = `
      display: flex;
      align-items: center;
      margin-bottom: 6px;
      cursor: pointer;
    `;
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'base-style';
    radio.id = `style-${style.id}`;
    radio.checked = index === 0; // Default to topographic
    radio.style.cssText = `
      margin-right: 8px;
      cursor: pointer;
    `;
    
    const label = document.createElement('label');
    label.textContent = style.label;
    label.htmlFor = `style-${style.id}`;
    label.style.cssText = `
      cursor: pointer;
      color: #333;
      user-select: none;
    `;
    
    // Add event listener for style switching
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY;
        const newStyleUrl = `https://api.maptiler.com/maps/${style.url}/style.json?key=${MAPTILER_KEY}`;
        
        // Store current OpenAIP layers
        const openAipLayers = [];
        const style = map.getStyle();
        style.layers.forEach(layer => {
          if (layer.source === 'openaip-data' || layer.source === 'openaip-tiles') {
            openAipLayers.push(layer);
          }
        });
        
        // Switch base map style
        map.setStyle(newStyleUrl);
        
        // Re-add OpenAIP layers after style loads
        map.once('style.load', () => {
          // Re-add OpenAIP sources and layers
          setTimeout(() => {
            window.location.reload(); // Simple reload for now
          }, 100);
        });
        
        console.log(`🎨 Switched to ${style.label} base map`);
      }
    });
    
    styleContainer.appendChild(radio);
    styleContainer.appendChild(label);
    controlContainer.appendChild(styleContainer);
  });
  
  // Add control to map
  const customControl = {
    onAdd: function(map) {
      return controlContainer;
    },
    onRemove: function() {
      controlContainer.parentNode.removeChild(controlContainer);
    }
  };
  
  map.addControl(customControl, 'top-right');
  console.log('✅ Layer toggle controls added');
}
