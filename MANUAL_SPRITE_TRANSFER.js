// MANUAL SPRITE TRANSFER UTILITY
// Use this to manually transfer OpenAIP sprite data between browser tabs

console.log('🔄 Manual OpenAIP Sprite Transfer Utility');

/**
 * STEP 1: Run this in the OpenAIP.net tab AFTER running OPENAIP_SPECIFIC_EXTRACTION.js
 * This will prepare the sprite data for transfer
 */
function prepareOpenAipSpriteForTransfer() {
  console.log('📦 Preparing OpenAIP sprite data for transfer...');
  
  if (!window.openAipSpriteData) {
    console.error('❌ No OpenAIP sprite data found!');
    console.log('💡 Run OPENAIP_SPECIFIC_EXTRACTION.js first');
    return null;
  }
  
  const transferData = {
    imageUrl: window.openAipSpriteData.imageUrl,
    metadata: window.openAipSpriteData.metadata,
    aviationIcons: window.openAipSpriteData.aviationIcons,
    timestamp: new Date().toISOString()
  };
  
  console.log('✅ Sprite data prepared for transfer:');
  console.log(`📊 Icons: ${Object.keys(transferData.metadata).length}`);
  console.log(`🛩️ Aviation icons: ${transferData.aviationIcons.length}`);
  console.log(`🔗 Image URL: ${transferData.imageUrl.substring(0, 50)}...`);
  
  // Create a copyable string
  const transferString = JSON.stringify(transferData);
  
  console.log('\n📋 COPY THIS DATA:');
  console.log('='.repeat(50));
  console.log(transferString);
  console.log('='.repeat(50));
  
  // Also try to copy to clipboard if possible
  if (navigator.clipboard) {
    navigator.clipboard.writeText(transferString).then(() => {
      console.log('✅ Data copied to clipboard!');
    }).catch(() => {
      console.log('⚠️ Could not copy to clipboard, please copy manually');
    });
  }
  
  return transferData;
}

/**
 * STEP 2: Run this in your Halo map tab with the copied data
 * This will load the sprite data into your map application
 */
function loadOpenAipSpriteFromTransfer(transferDataString) {
  console.log('📥 Loading OpenAIP sprite data from transfer...');
  
  try {
    const transferData = JSON.parse(transferDataString);
    
    // Validate the data
    if (!transferData.imageUrl || !transferData.metadata) {
      throw new Error('Invalid transfer data format');
    }
    
    // Store in window for the integration utility to find
    window.openAipSpriteData = transferData;
    
    console.log('✅ OpenAIP sprite data loaded successfully!');
    console.log(`📊 Icons: ${Object.keys(transferData.metadata).length}`);
    console.log(`🛩️ Aviation icons: ${transferData.aviationIcons.length}`);
    console.log(`⏰ Extracted: ${transferData.timestamp}`);
    
    // Try to integrate immediately if map is available
    if (window.map) {
      console.log('🎯 Map found, attempting automatic integration...');
      
      // Import and use the integration utility
      import('./src/components/map/utils/openAipSpriteIntegration.js')
        .then(({ quickIntegrateFromWindow }) => {
          return quickIntegrateFromWindow(window.map);
        })
        .then((success) => {
          if (success) {
            console.log('🎉 Automatic integration successful!');
          } else {
            console.log('⚠️ Automatic integration failed, reload the map');
          }
        })
        .catch((error) => {
          console.log('⚠️ Integration error:', error.message);
          console.log('💡 Reload the map to integrate sprites');
        });
    } else {
      console.log('💡 Reload the map to integrate the sprites');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to load transfer data:', error);
    return false;
  }
}

// Export functions for manual use
window.prepareOpenAipSpriteForTransfer = prepareOpenAipSpriteForTransfer;
window.loadOpenAipSpriteFromTransfer = loadOpenAipSpriteFromTransfer;

console.log('\n🎯 USAGE INSTRUCTIONS:');
console.log('1. In OpenAIP.net tab: prepareOpenAipSpriteForTransfer()');
console.log('2. Copy the generated data string');
console.log('3. In Halo map tab: loadOpenAipSpriteFromTransfer("paste_data_here")');
console.log('4. Reload the map to see authentic OpenAIP sprites!');
