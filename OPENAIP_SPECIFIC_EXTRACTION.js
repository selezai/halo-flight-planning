// OPENAIP SPECIFIC SPRITE EXTRACTION
// Extract from the discovered OpenAIP sprite endpoint

console.log('🎯 OpenAIP-specific sprite extraction...');

// The network scan found this OpenAIP sprite URL:
const openAipSpriteUrl = 'https://api.mapbox.com/styles/v1/webmaster-openaip/ckn740ghl0xv717p1jc6wi59p/f1swxnvf2nax17nl4agef47uc/iconset.pbf';

console.log('🔍 Found OpenAIP sprite URL:', openAipSpriteUrl);

// Extract the access token from the URL
const tokenMatch = openAipSpriteUrl.match(/access_token=([^&]+)/);
const accessToken = tokenMatch ? tokenMatch[1] : 'pk.eyJ1Ijoid2VibWFzdGVyLW9wZW5haXAiLCJhIjoiY2x3MDk4ajdmMzRuazJrb2RodGs1M3RiZSJ9.oBnOUp8plNDs9Ef8l8jCeg';

console.log('🔑 Access token:', accessToken);

// Try to get the sprite data from the style
const extractOpenAipSprites = async () => {
  console.log('🚀 Extracting OpenAIP sprites...');
  
  // Method 1: Try to get the sprite from the style URL pattern
  const styleId = 'ckn740ghl0xv717p1jc6wi59p';
  const username = 'webmaster-openaip';
  
  const possibleSpriteUrls = [
    `https://api.mapbox.com/styles/v1/${username}/${styleId}/sprite`,
    `https://api.mapbox.com/styles/v1/${username}/${styleId}/sprite@2x`,
    `https://api.mapbox.com/v1/styles/${username}/${styleId}/sprite`,
    `https://api.mapbox.com/v1/styles/${username}/${styleId}/sprite@2x`
  ];
  
  for (const baseUrl of possibleSpriteUrls) {
    try {
      console.log(`🔍 Trying: ${baseUrl}.json`);
      
      const response = await fetch(`${baseUrl}.json?access_token=${accessToken}`);
      if (response.ok) {
        const spriteData = await response.json();
        console.log(`✅ Found OpenAIP sprite metadata!`);
        console.log(`📊 Contains ${Object.keys(spriteData).length} icons`);
        
        // Get aviation icons
        const aviationIcons = Object.keys(spriteData).filter(name => 
          ['apt', 'navaid', 'runway', 'obstacle', 'vor', 'ndb', 'dme', 'tacan', 'airport', 'heliport'].some(keyword => 
            name.toLowerCase().includes(keyword)
          )
        );
        
        console.log(`🛩️ Aviation icons found: ${aviationIcons.length}`);
        console.log('📋 Aviation icon names:', aviationIcons);
        
        // Try to get the PNG
        try {
          const pngResponse = await fetch(`${baseUrl}.png?access_token=${accessToken}`);
          if (pngResponse.ok) {
            const blob = await pngResponse.blob();
            console.log(`✅ Got OpenAIP sprite image: ${blob.size} bytes`);
            
            const imageUrl = URL.createObjectURL(blob);
            console.log(`🔗 OpenAIP sprite sheet URL: ${imageUrl}`);
            
            // Save the OpenAIP sprite data
            window.openAipSpriteData = {
              url: baseUrl,
              metadata: spriteData,
              imageUrl: imageUrl,
              aviationIcons: aviationIcons,
              allIcons: Object.keys(spriteData)
            };
            
            console.log('💾 OpenAIP sprite data saved to window.openAipSpriteData');
            
            // Show detailed aviation icon info
            console.log('\n📋 DETAILED AVIATION ICON INFO:');
            aviationIcons.forEach(iconName => {
              const iconData = spriteData[iconName];
              console.log(`   ${iconName}:`, iconData);
            });
            
            return {
              metadata: spriteData,
              imageUrl: imageUrl,
              aviationIcons: aviationIcons
            };
          }
        } catch (pngError) {
          console.log(`⚠️ Metadata found but PNG failed: ${pngError.message}`);
        }
        
        return {
          metadata: spriteData,
          aviationIcons: aviationIcons
        };
      }
    } catch (error) {
      console.log(`❌ Failed ${baseUrl}: ${error.message}`);
    }
  }
  
  return null;
};

// Method 2: Also check if we can extract from the existing sprite data
const checkExistingData = () => {
  console.log('🔍 Checking existing sprite data...');
  
  if (window.foundSpriteSheet) {
    console.log('✅ Found existing MapTiler sprite data');
    console.log('📊 Aviation icons in MapTiler:', window.foundSpriteSheet.aviationIcons);
    
    // The MapTiler sprite might contain some basic aviation icons
    return window.foundSpriteSheet;
  }
  
  if (window.allFoundSprites) {
    console.log('✅ Found all sprite data from previous extraction');
    return window.allFoundSprites;
  }
  
  return null;
};

// Method 3: Try to decode the PBF iconset
const tryPbfDecoding = async () => {
  console.log('🔍 Attempting to decode PBF iconset...');
  
  try {
    const response = await fetch(openAipSpriteUrl);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      console.log(`✅ Downloaded PBF iconset: ${arrayBuffer.byteLength} bytes`);
      
      // PBF decoding would require a protobuf library
      // For now, just save the raw data
      window.openAipPbfData = arrayBuffer;
      console.log('💾 Raw PBF data saved to window.openAipPbfData');
      console.log('💡 PBF decoding would require protobuf.js library');
      
      return arrayBuffer;
    }
  } catch (error) {
    console.log(`❌ PBF download failed: ${error.message}`);
  }
  
  return null;
};

// Main execution
const main = async () => {
  console.log('🚀 Starting OpenAIP-specific extraction...');
  
  // Check existing data first
  const existingData = checkExistingData();
  
  // Try to get OpenAIP sprites
  const openAipData = await extractOpenAipSprites();
  
  // Try PBF decoding
  const pbfData = await tryPbfDecoding();
  
  // Summary
  console.log('\n🎉 EXTRACTION SUMMARY:');
  
  if (openAipData) {
    console.log('✅ OpenAIP sprite data extracted successfully');
    console.log(`   Aviation icons: ${openAipData.aviationIcons.length}`);
    if (openAipData.imageUrl) {
      console.log(`   Sprite sheet: ${openAipData.imageUrl}`);
    }
  }
  
  if (existingData) {
    console.log('✅ MapTiler base sprites available');
    console.log(`   Aviation icons: ${existingData.aviationIcons ? existingData.aviationIcons.length : 'Unknown'}`);
  }
  
  if (pbfData) {
    console.log('✅ Raw PBF iconset downloaded');
    console.log(`   Size: ${pbfData.byteLength} bytes`);
  }
  
  // Final instructions
  console.log('\n📋 NEXT STEPS:');
  console.log('1. OpenAIP sprite data is in window.openAipSpriteData');
  console.log('2. MapTiler sprites are in window.foundSpriteSheet');
  console.log('3. Use canvas to extract individual icons from sprite sheets');
  console.log('4. PBF data is available but needs protobuf.js to decode');
  
  return {
    openAip: openAipData,
    existing: existingData,
    pbf: pbfData
  };
};

// Run the extraction
main().catch(error => {
  console.error('❌ OpenAIP extraction failed:', error);
});

console.log('⏳ Running OpenAIP-specific sprite extraction...');
