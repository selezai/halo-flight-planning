# 🎯 OpenAIP Sprite Extraction Guide

## Method 1: Direct Extraction from OpenAIP.net (BEST METHOD)

This is the most reliable way to get the **exact** OpenAIP icons used on their official map.

### Step-by-Step Instructions:

1. **Open OpenAIP Map**
   - Go to https://www.openaip.net/map in Chrome
   - Wait for the map to fully load with all aviation icons visible

2. **Open Developer Tools**
   - Press `F12` or right-click → "Inspect"
   - Go to the "Console" tab

3. **Run the Extraction Script**
   - Copy and paste this script into the console:

```javascript
// Get the map instance
const openAipMap = map || window.map || window.mapboxgl;
console.log('🗺️ Found map instance:', openAipMap);

// Extract all loaded images from MapLibre/Mapbox
let images = {};
try {
  // Try MapLibre GL format
  if (openAipMap.style && openAipMap.style.imageManager) {
    images = openAipMap.style.imageManager.images;
    console.log('✅ Using MapLibre GL image manager');
  }
  // Try Mapbox GL format
  else if (openAipMap.style && openAipMap.style._images) {
    images = openAipMap.style._images;
    console.log('✅ Using Mapbox GL image manager');
  }
  // Try alternative access
  else if (openAipMap._images) {
    images = openAipMap._images;
    console.log('✅ Using direct image access');
  }
} catch (error) {
  console.error('❌ Error accessing images:', error);
}

console.log('🎨 Found icons:', Object.keys(images));
console.log('📊 Total icons:', Object.keys(images).length);

// Extract specific OpenAIP aviation icons
const aviationIcons = [
  'apt-dot', 'apt-dot-small', 'apt-dot-medium', 'apt-dot-large',
  'navaid_vor-small', 'navaid_vor-medium', 'navaid_vor-large',
  'navaid_ndb-small', 'navaid_ndb-medium', 'navaid_ndb-large',
  'navaid_dme-small', 'navaid_dme-medium', 'navaid_dme-large',
  'navaid_tacan-small', 'navaid_tacan-medium', 'navaid_tacan-large',
  'navaid_rose-small', 'navaid_rose-medium', 'navaid_rose-large',
  'runway_paved-small', 'runway_paved-medium', 'runway_paved-large',
  'runway_unpaved-small', 'runway_unpaved-medium', 'runway_unpaved-large',
  'obstacle-small', 'obstacle-medium', 'obstacle-large',
  'waypoint-small', 'waypoint-medium', 'waypoint-large'
];

// Extract and log each aviation icon
const extractedIcons = {};
aviationIcons.forEach(iconName => {
  if (images[iconName]) {
    const icon = images[iconName];
    console.log(`🎯 Found aviation icon: ${iconName}`, icon);
    
    // Extract image data
    if (icon.data) {
      extractedIcons[iconName] = {
        width: icon.data.width,
        height: icon.data.height,
        data: Array.from(icon.data.data), // Convert Uint8Array to regular array
        pixelRatio: icon.pixelRatio || 1
      };
      console.log(`✅ Extracted ${iconName}: ${icon.data.width}x${icon.data.height}`);
    }
  } else {
    console.log(`❌ Missing icon: ${iconName}`);
  }
});

// Also check for any icons containing aviation keywords
const allIcons = Object.keys(images);
const aviationKeywords = ['apt', 'navaid', 'runway', 'obstacle', 'vor', 'ndb', 'dme', 'tacan'];
const foundAviationIcons = allIcons.filter(name => 
  aviationKeywords.some(keyword => name.toLowerCase().includes(keyword))
);

console.log('🛩️ All aviation-related icons found:', foundAviationIcons);

// Extract all aviation icons
foundAviationIcons.forEach(iconName => {
  if (images[iconName] && !extractedIcons[iconName]) {
    const icon = images[iconName];
    if (icon.data) {
      extractedIcons[iconName] = {
        width: icon.data.width,
        height: icon.data.height,
        data: Array.from(icon.data.data),
        pixelRatio: icon.pixelRatio || 1
      };
      console.log(`✅ Extracted aviation icon: ${iconName}: ${icon.data.width}x${icon.data.height}`);
    }
  }
});

// Output the extracted data for copying
console.log('\n🎉 EXTRACTION COMPLETE!');
console.log('📋 Copy this data to use in your application:');
console.log('const openAipIcons =', JSON.stringify(extractedIcons, null, 2));

// Also save to window for easy access
window.extractedOpenAipIcons = extractedIcons;
console.log('💾 Data also saved to window.extractedOpenAipIcons');

return extractedIcons;
```

4. **Copy the Extracted Data**
   - The script will output a JSON object with all extracted icons
   - Copy the `const openAipIcons = { ... }` data
   - This contains the exact pixel data from OpenAIP's sprites

5. **Use the Extracted Icons**
   - Save the data to a new file: `/src/components/map/utils/realOpenAipIcons.js`
   - Import and use in your map initialization

## Method 2: Alternative - Find Sprite URLs

If the direct extraction doesn't work, try finding OpenAIP's sprite sheet URLs:

```javascript
// Run this in the OpenAIP.net console to find sprite URLs
const possibleUrls = [
  'https://api.tiles.openaip.net/api/sprites/default',
  'https://api.tiles.openaip.net/sprites/openaip',
  'https://cdn.openaip.net/sprites/openaip',
  'https://www.openaip.net/sprites/default'
];

for (const url of possibleUrls) {
  fetch(url + '.json')
    .then(response => response.ok ? response.json() : null)
    .then(data => data && console.log(`✅ Found sprite at: ${url}`, data))
    .catch(() => console.log(`❌ Failed: ${url}`));
}
```

## Method 3: Extract from Our Map Instance

You can also extract icons from our own map after it loads OpenAIP data:

```javascript
import { extractFromMapInstance } from './utils/extractOpenAIPIcons.js';

// After map loads
map.on('load', async () => {
  const extractedIcons = await extractFromMapInstance(map);
  console.log('Extracted from our map:', extractedIcons);
});
```

## Expected Results

The extraction should give you authentic OpenAIP icons including:
- **Airport dots** (`apt-dot-small`, `apt-dot-medium`, `apt-dot-large`)
- **VOR symbols** (`navaid_vor-small`, `navaid_vor-medium`, `navaid_vor-large`)
- **NDB symbols** (`navaid_ndb-small`, `navaid_ndb-medium`, `navaid_ndb-large`)
- **DME symbols** (`navaid_dme-small`, `navaid_dme-medium`, `navaid_dme-large`)
- **TACAN symbols** (`navaid_tacan-small`, `navaid_tacan-medium`, `navaid_tacan-large`)
- **Compass roses** (`navaid_rose-small`, `navaid_rose-medium`, `navaid_rose-large`)
- **Runway symbols** (`runway_paved-*`, `runway_unpaved-*`)
- **Obstacles** (`obstacle-small`, `obstacle-medium`, `obstacle-large`)
- **Waypoints** (`waypoint-small`, `waypoint-medium`, `waypoint-large`)

Each icon will have:
- `width` and `height` dimensions
- `data` array with RGBA pixel values
- `pixelRatio` for high-DPI displays

## Integration

Once you have the extracted icons, create a new file to use them:

```javascript
// /src/components/map/utils/realOpenAipIcons.js
export const realOpenAipIcons = {
  // Paste extracted icon data here
};

export function addRealOpenAipIcons(map) {
  Object.entries(realOpenAipIcons).forEach(([name, iconData]) => {
    if (!map.hasImage(name)) {
      // Convert array back to ImageData
      const imageData = new ImageData(
        new Uint8ClampedArray(iconData.data),
        iconData.width,
        iconData.height
      );
      map.addImage(name, imageData, { pixelRatio: iconData.pixelRatio });
      console.log(`✅ Added real OpenAIP icon: ${name}`);
    }
  });
}
```

This method gives you the **exact same icons** that OpenAIP uses on their official map! 🎯
