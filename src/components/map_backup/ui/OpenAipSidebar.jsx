// components/map/ui/OpenAipSidebar.jsx
import React, { useState } from 'react';
import { Search, Layers, Navigation, Ruler, Info } from 'lucide-react';

export const OpenAipSidebar = ({ onSearch, onLayerToggle, onToolSelect }) => {
  const [activePanel, setActivePanel] = useState('layers');
  
  return (
    <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl z-50">
      {/* Tool buttons */}
      <div className="flex border-b">
        <button className="flex-1 p-4 hover:bg-gray-100">
          <Search className="w-5 h-5 mx-auto" />
        </button>
        <button className="flex-1 p-4 hover:bg-gray-100 bg-gray-100">
          <Layers className="w-5 h-5 mx-auto" />
        </button>
        <button className="flex-1 p-4 hover:bg-gray-100">
          <Navigation className="w-5 h-5 mx-auto" />
        </button>
        <button className="flex-1 p-4 hover:bg-gray-100">
          <Ruler className="w-5 h-5 mx-auto" />
        </button>
      </div>
      
      {/* Panel content */}
      <div className="p-4">
        {activePanel === 'layers' && <LayerPanel onToggle={onLayerToggle} />}
        {activePanel === 'search' && <SearchPanel onSearch={onSearch} />}
        {/* Add other panels */}
      </div>
    </div>
  );
};

// Layer panel with OpenAIP styling
const LayerPanel = ({ onToggle }) => {
  const layers = [
    { id: 'airports', name: 'Airports', icon: '✈️', color: '#0066CC' },
    { id: 'airspaces', name: 'Airspaces', icon: '📍', color: '#FF0000' },
    { id: 'navaids', name: 'Nav Aids', icon: '📡', color: '#9B59B6' },
    { id: 'obstacles', name: 'Obstacles', icon: '⚠️', color: '#FF6600' }
  ];
  
  return (
    <div>
      <h3 className="font-bold text-lg mb-4">Map Layers</h3>
      {layers.map(layer => (
        <div key={layer.id} className="flex items-center p-2 hover:bg-gray-50 rounded">
          <input 
            type="checkbox" 
            defaultChecked 
            onChange={(e) => onToggle(layer.id, e.target.checked)}
            className="mr-3"
          />
          <span className="text-2xl mr-3">{layer.icon}</span>
          <span className="flex-1">{layer.name}</span>
          <div 
            className="w-4 h-4 rounded"
            style={{ backgroundColor: layer.color }}
          />
        </div>
      ))}
    </div>
  );
};
