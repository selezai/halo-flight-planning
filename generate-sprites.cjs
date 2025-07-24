const Spritesmith = require('spritesmith');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const sharp = require('sharp');

const iconDir = 'openaip-map-resources/resources/svg/';
const outputDir = 'public/sprites/';
const tmpDir = 'tmp-sprites';
const spriteFilename = 'sprite';

console.log('Starting sprite generation...');

async function generateSprites() {
    try {
        // 1. Create a temporary directory for PNGs
        if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
        fs.mkdirSync(tmpDir);

        // 2. Find all SVG files
        const svgFiles = glob.sync(`${iconDir}*.svg`);
        if (svgFiles.length === 0) {
            throw new Error(`No SVG files found in ${iconDir}`);
        }

        console.log(`Found ${svgFiles.length} SVG icons. Converting to PNGs in '${tmpDir}'...`);

        // 3. Convert all SVGs to PNGs and save to the temp directory
        const conversionPromises = svgFiles.map(file => {
            const filename = path.basename(file, '.svg');
            const outputPath = path.join(tmpDir, `${filename}.png`);
            return sharp(file).png().toFile(outputPath);
        });
        await Promise.all(conversionPromises);
        console.log('Conversion to PNG complete.');

        // 4. Run Spritesmith on the temporary PNG files
        const pngFiles = glob.sync(`${tmpDir}/*.png`);
        Spritesmith.run({ src: pngFiles, padding: 2 }, (err, result) => {
            if (err) {
                console.error('Error running Spritesmith:', err);
                fs.rmSync(tmpDir, { recursive: true, force: true }); // Clean up on error
                return process.exit(1);
            }

            // Ensure the final output directory exists
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            // Write the final sprite image
            const imagePath = path.join(outputDir, `${spriteFilename}.png`);
            fs.writeFileSync(imagePath, result.image);
            console.log(`Sprite image saved to ${imagePath}`);

            // Transform coordinates to MapLibre format
            const maplibreCoords = {};
            for (const [filepath, data] of Object.entries(result.coordinates)) {
                const iconName = path.basename(filepath, '.png');
                maplibreCoords[iconName] = {
                    width: data.width,
                    height: data.height,
                    x: data.x,
                    y: data.y,
                    pixelRatio: 1,
                };
            }

            // Write the final sprite JSON
            const jsonPath = path.join(outputDir, `${spriteFilename}.json`);
            fs.writeFileSync(jsonPath, JSON.stringify(maplibreCoords, null, 2));
            console.log(`Sprite JSON saved to ${jsonPath}`);

            // 5. Clean up the temporary directory
            fs.rmSync(tmpDir, { recursive: true, force: true });
            console.log(`Cleaned up temporary directory: ${tmpDir}`);

            console.log('✅ Sprite generation complete!');
        });
    } catch (err) {
        console.error('An error occurred during sprite generation:', err);
        // Ensure cleanup happens on error too
        if (fs.existsSync(tmpDir)) {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
        process.exit(1);
    }
}

generateSprites();


