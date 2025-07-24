// EXTRACT AUTHENTIC OPENAIP SPRITES
// Run this script in the OpenAIP.net browser console to extract authentic sprites

console.log('🎯 Starting authentic OpenAIP sprite extraction...');

const extractAuthenticSprites = async () => {
  try {
    // OpenAIP's authentic sprite configuration
    const styleId = 'ckn740ghl0xv717p1jc6wi59p';
    const username = 'webmaster-openaip';
    const accessToken = 'pk.eyJ1Ijoid2VibWFzdGVyLW9wZW5haXAiLCJhIjoiY2x3MDk4ajdmMzRuazJrb2RodGs1M3RiZSJ9.oBnOUp8plNDs9Ef8l8jCeg';
    
    const baseUrl = `https://api.mapbox.com/styles/v1/${username}/${styleId}/sprite`;
    
    console.log('📡 Fetching sprite metadata...');
    
    // Get sprite metadata (JSON)
    const jsonResponse = await fetch(`${baseUrl}.json?access_token=${accessToken}`);
    if (!jsonResponse.ok) {
      throw new Error(`Failed to fetch sprite metadata: ${jsonResponse.status}`);
    }
    const spriteData = await jsonResponse.json();
    
    console.log('🖼️ Fetching sprite image...');
    
    // Get sprite image (PNG)
    const pngResponse = await fetch(`${baseUrl}.png?access_token=${accessToken}`);
    if (!pngResponse.ok) {
      throw new Error(`Failed to fetch sprite image: ${pngResponse.status}`);
    }
    const imageBlob = await pngResponse.blob();
    const imageUrl = URL.createObjectURL(imageBlob);
    
    // Count aviation-specific icons
    const aviationIcons = Object.keys(spriteData).filter(name => 
      ['apt', 'navaid', 'runway', 'obstacle', 'vor', 'ndb', 'dme', 'tacan', 'airport', 'heliport'].some(keyword => 
        name.toLowerCase().includes(keyword)
      )
    );
    
    console.log(`✅ Successfully extracted ${Object.keys(spriteData).length} total icons!`);
    console.log(`🛩️ Including ${aviationIcons.length} aviation-specific icons:`);
    console.log('📋 Aviation icons:', aviationIcons.slice(0, 10).join(', ') + (aviationIcons.length > 10 ? '...' : ''));
    
    // Save to window for integration
    window.openAipSpriteData = {
      metadata: spriteData,
      imageUrl: imageUrl,
      totalIcons: Object.keys(spriteData).length,
      aviationIcons: aviationIcons.length,
      extractedAt: new Date().toISOString(),
      spriteSize: imageBlob.size
    };
    
    console.log('💾 Sprite data saved to window.openAipSpriteData');
    console.log('🔗 Sprite image URL:', imageUrl);
    console.log(`📊 Sprite sheet size: ${Math.round(imageBlob.size / 1024)} KB`);
    console.log('🎯 Ready for integration in your Halo map!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Go to your Halo map tab (http://localhost:5174/map)');
    console.log('   2. Refresh the page (Ctrl+R or Cmd+R)');
    console.log('   3. Look for "Real OpenAIP sprites integrated successfully" in console');
    
    return true;
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    console.log('💡 Make sure you are running this on https://www.openaip.net/map');
    return false;
  }
};

// Run the extraction
extractAuthenticSprites().then(success => {
  if (success) {
    console.log('🎉 Extraction completed successfully!');
    console.log('🔄 Now refresh your Halo map to see authentic OpenAIP sprites');
  } else {
    console.log('❌ Extraction failed - check the error messages above');
  }
});
