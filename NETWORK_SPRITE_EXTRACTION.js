// NETWORK SPRITE EXTRACTION SCRIPT
// Direct approach: fetch sprites from OpenAIP's network resources

console.log('🌐 Network-based OpenAIP sprite extraction...');

// Method 1: Find sprite URLs from network resources
const findSpriteUrls = () => {
  console.log('🔍 Scanning network resources for sprite URLs...');
  
  const entries = performance.getEntriesByType('resource');
  const spriteUrls = [];
  
  // Look for sprite-related URLs
  entries.forEach(entry => {
    const url = entry.name;
    if (url.includes('sprite') || url.includes('icon') || url.includes('symbol')) {
      spriteUrls.push(url);
      console.log('🎨 Found potential sprite URL:', url);
    }
  });
  
  return spriteUrls;
};

// Method 2: Try common OpenAIP sprite URL patterns
const tryCommonSpriteUrls = async () => {
  console.log('🔍 Trying common OpenAIP sprite URL patterns...');
  
  const baseUrls = [
    'https://api.tiles.openaip.net/api/sprites/default',
    'https://api.tiles.openaip.net/sprites/openaip',
    'https://cdn.openaip.net/sprites/default',
    'https://www.openaip.net/sprites/default',
    'https://api.maptiler.com/maps/basic-v2/sprite', // MapTiler base
    'https://api.mapbox.com/styles/v1/mapbox/streets-v11/sprite'
  ];
  
  const foundSprites = [];
  
  for (const baseUrl of baseUrls) {
    try {
      console.log(`🔍 Checking: ${baseUrl}.json`);
      
      const response = await fetch(`${baseUrl}.json`);
      if (response.ok) {
        const spriteData = await response.json();
        console.log(`✅ Found sprite metadata at: ${baseUrl}`);
        console.log(`📊 Contains ${Object.keys(spriteData).length} icons`);
        
        // Try to get the corresponding PNG
        try {
          const pngResponse = await fetch(`${baseUrl}.png`);
          if (pngResponse.ok) {
            const blob = await pngResponse.blob();
            console.log(`✅ Found sprite image: ${blob.size} bytes`);
            
            foundSprites.push({
              url: baseUrl,
              metadata: spriteData,
              imageBlob: blob,
              iconCount: Object.keys(spriteData).length
            });
          }
        } catch (pngError) {
          console.log(`⚠️ Metadata found but no PNG: ${baseUrl}`);
          foundSprites.push({
            url: baseUrl,
            metadata: spriteData,
            iconCount: Object.keys(spriteData).length
          });
        }
      }
    } catch (error) {
      console.log(`❌ Failed: ${baseUrl} - ${error.message}`);
    }
  }
  
  return foundSprites;
};

// Method 3: Extract sprites from CSS background images
const extractFromCSS = () => {
  console.log('🔍 Checking CSS for sprite references...');
  
  const stylesheets = Array.from(document.styleSheets);
  const spriteUrls = [];
  
  stylesheets.forEach(sheet => {
    try {
      const rules = Array.from(sheet.cssRules || sheet.rules || []);
      rules.forEach(rule => {
        if (rule.style && rule.style.backgroundImage) {
          const bgImage = rule.style.backgroundImage;
          if (bgImage.includes('sprite') || bgImage.includes('icon')) {
            const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch) {
              spriteUrls.push(urlMatch[1]);
              console.log('🎨 Found sprite in CSS:', urlMatch[1]);
            }
          }
        }
      });
    } catch (e) {
      // CORS or other CSS access issues
    }
  });
  
  return spriteUrls;
};

// Method 4: Intercept future network requests for sprites
const interceptNetworkRequests = () => {
  console.log('🔍 Setting up network request interception...');
  
  // Override fetch to catch sprite requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && (url.includes('sprite') || url.includes('icon'))) {
      console.log('🎯 Intercepted sprite request:', url);
      
      // Call original fetch and log result
      return originalFetch.apply(this, args).then(response => {
        if (response.ok) {
          console.log('✅ Sprite request successful:', url);
          
          // Clone response to read it
          const clonedResponse = response.clone();
          if (url.endsWith('.json')) {
            clonedResponse.json().then(data => {
              console.log('📋 Intercepted sprite metadata:', Object.keys(data));
              window.interceptedSpriteData = data;
            });
          }
        }
        return response;
      });
    }
    
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ Network interception set up');
};

// Main execution
const main = async () => {
  console.log('🚀 Starting comprehensive sprite extraction...');
  
  // Step 1: Check existing network resources
  const networkSpriteUrls = findSpriteUrls();
  
  // Step 2: Try common sprite URLs
  const foundSprites = await tryCommonSpriteUrls();
  
  // Step 3: Check CSS
  const cssSprites = extractFromCSS();
  
  // Step 4: Set up interception for future requests
  interceptNetworkRequests();
  
  // Step 5: Process results
  if (foundSprites.length > 0) {
    console.log('\n🎉 SUCCESS! Found sprite data:');
    
    foundSprites.forEach((sprite, index) => {
      console.log(`\n📋 Sprite ${index + 1}:`);
      console.log(`   URL: ${sprite.url}`);
      console.log(`   Icons: ${sprite.iconCount}`);
      
      // Look for aviation icons in metadata
      const aviationIcons = Object.keys(sprite.metadata).filter(name => 
        ['apt', 'navaid', 'runway', 'obstacle', 'vor', 'ndb', 'dme', 'tacan', 'airport'].some(keyword => 
          name.toLowerCase().includes(keyword)
        )
      );
      
      if (aviationIcons.length > 0) {
        console.log(`   🛩️ Aviation icons: ${aviationIcons.length}`);
        console.log(`   📋 Aviation icon names:`, aviationIcons);
        
        // If we have the image blob, we could extract individual icons
        if (sprite.imageBlob) {
          console.log(`   🎨 Image available: ${sprite.imageBlob.size} bytes`);
          
          // Create object URL for the sprite sheet
          const imageUrl = URL.createObjectURL(sprite.imageBlob);
          console.log(`   🔗 Sprite sheet URL: ${imageUrl}`);
          
          // Save sprite data for manual extraction
          window.foundSpriteSheet = {
            metadata: sprite.metadata,
            imageUrl: imageUrl,
            aviationIcons: aviationIcons
          };
          
          console.log('💾 Sprite sheet saved to window.foundSpriteSheet');
          console.log('💡 You can now manually extract icons or use image processing');
        }
      }
    });
    
    // Provide extraction instructions
    console.log('\n📋 EXTRACTION INSTRUCTIONS:');
    console.log('1. Sprite metadata is available in the results above');
    console.log('2. Aviation icons are identified and listed');
    console.log('3. Sprite sheet image is available at window.foundSpriteSheet.imageUrl');
    console.log('4. You can use canvas to extract individual icons from the sprite sheet');
    
    // Save all data
    window.allFoundSprites = foundSprites;
    console.log('💾 All sprite data saved to window.allFoundSprites');
    
  } else {
    console.log('❌ No sprite data found through network resources');
    console.log('💡 Try interacting with the map (zoom, pan) to trigger sprite loading');
    console.log('💡 Check window.interceptedSpriteData after map interactions');
  }
  
  // Additional info
  console.log('\n💡 Additional resources found:');
  console.log('   Network sprite URLs:', networkSpriteUrls);
  console.log('   CSS sprite URLs:', cssSprites);
  
  return foundSprites;
};

// Run the extraction
main().catch(error => {
  console.error('❌ Extraction failed:', error);
});

console.log('⏳ Running network-based sprite extraction...');
