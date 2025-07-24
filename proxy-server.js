import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import winston from 'winston';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: './.env.local' });

const app = express();
const port = process.env.PORT || 3001;
const apiKey = process.env.VITE_OPENAIP_API_KEY;

// --- Logger Setup ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'proxy-server' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
    }),
    new winston.transports.File({ filename: 'proxy-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'proxy-combined.log' }),
  ],
});

if (!apiKey) {
  logger.error('FATAL: VITE_OPENAIP_API_KEY is not defined in the environment.');
  process.exit(1);
}

logger.info('Proxy server starting up...');
logger.info(`OpenAIP API Key Loaded: ${apiKey.substring(0, 4)}...`);

// --- Middleware for CORS ---
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-openaip-api-key, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

// --- Proxy Route for OpenAIP Vector Tiles ---
// Handle CORS preflight requests for vector tiles
app.options('/api/maps/openaip-vectortiles/:z/:x/:y', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-openaip-api-key');
  res.sendStatus(200);
});

app.get('/api/maps/openaip-vectortiles/:z/:x/:y', (req, res) => {
  const { z, x, y } = req.params;
  
  // Handle both .pbf and non-.pbf formats by ensuring .pbf is always used for the target
  const y_coord = y.split('.')[0]; 

  const targetUrl = `https://api.tiles.openaip.net/api/data/openaip/${z}/${x}/${y_coord}.pbf`;
  
  logger.info(`🗺️  Vector Tile Request: ${req.url}`);
  logger.info(`➡️  Forwarding to: ${targetUrl}`);

  // Configure request options with proper authentication headers
  const requestOptions = {
    headers: {
      'x-openaip-api-key': apiKey,
      'User-Agent': 'Halo-Flight-Planning/1.0'
    }
  };

  const proxyRequest = https.get(targetUrl, requestOptions, (proxyResponse) => {
    if (proxyResponse.statusCode !== 200) {
      logger.error(`❌ Tile Error: ${proxyResponse.statusCode} for ${targetUrl}`);
      res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
      proxyResponse.pipe(res, { end: true });
      return;
    }
    
    logger.info(`⬅️  Tile Response: ${proxyResponse.statusCode} for ${targetUrl}`);
    res.writeHead(proxyResponse.statusCode, proxyResponse.headers);
    proxyResponse.pipe(res, { end: true });
  });

  proxyRequest.on('error', (err) => {
    logger.error(`❌ Tile Proxy Error for ${targetUrl}:`, err);
    res.status(500).send('Proxy error');
  });
});

// --- Proxy Route for OpenAIP Styles ---
app.get('/api/styles/:styleFile', (req, res) => {
    const { styleFile } = req.params;
    
    // Route to actual OpenAIP style endpoint instead of MapTiler basic
    let targetUrl;
    if (styleFile.includes('openaip')) {
        // Use correct OpenAIP style endpoint from API documentation
        // Available styles: 'openaip-default-style' and 'openaip-satellite-style'
        targetUrl = `https://api.tiles.openaip.net/api/styles/${styleFile}?api_key=${apiKey}`;
    } else {
        // Fallback to MapTiler for other styles
        targetUrl = `https://api.maptiler.com/maps/basic-v2/style.json?key=${process.env.VITE_MAPTILER_API_KEY}`;
    }

    logger.info(`🎨 Style Request: ${req.url}`);
    logger.info(`➡️  Forwarding to: ${targetUrl}`);

    const proxyRequest = https.get(targetUrl, (proxyResponse) => {
        if (proxyResponse.statusCode !== 200) {
            logger.error(`❌ Style Error: ${proxyResponse.statusCode} for ${targetUrl}`);
            res.status(proxyResponse.statusCode).send('Error fetching style');
            return;
        }
        
        logger.info(`⬅️  Style Response: ${proxyResponse.statusCode} for ${targetUrl}`);
        res.setHeader('Content-Type', 'application/json');
        proxyResponse.pipe(res);
    });

    proxyRequest.on('error', (err) => {
        logger.error(`❌ Style Proxy Error for ${targetUrl}:`, err);
        res.status(500).send('Proxy error');
    });
});


// --- Proxy Route for Sprites (MapTiler base + fallback system) ---
app.get('/api/sprites/:name.:ext', (req, res) => {
  const { name, ext } = req.params;
  const maptilerKey = process.env.VITE_MAPTILER_API_KEY;
  
  logger.info(`🎨 Sprite Request: ${req.url}`);
  
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  
  // For now, only handle MapTiler sprites (basic-v2)
  // OpenAIP-specific icons will be handled by fallback system
  let targetUrl;
  
  if (name === 'basic-v2') {
    targetUrl = `https://api.maptiler.com/maps/basic-v2/sprite.${ext}?key=${maptilerKey}`;
  } else {
    // For any other sprite name, return 404 - fallback system will handle it
    logger.info(`⚠️  Unknown sprite '${name}' - fallback system will handle missing icons`);
    res.status(404).send('Sprite not found - using fallback system');
    return;
  }
  
  logger.info(`➡️  Proxying MapTiler sprite: ${targetUrl}`);
  
  // Use simple HTTP request instead of axios
  const proxyRequest = https.get(targetUrl, (proxyResponse) => {
    if (proxyResponse.statusCode !== 200) {
      logger.error(`❌ Sprite Error: ${proxyResponse.statusCode} for ${targetUrl}`);
      res.status(proxyResponse.statusCode).send('Error fetching sprite');
      return;
    }
    
    logger.info(`⬅️  Sprite Success: ${proxyResponse.statusCode} for ${targetUrl}`);
    
    // Set appropriate content type
    const contentType = ext === 'json' ? 'application/json' : 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // Pipe the response
    proxyResponse.pipe(res);
  });
  
  proxyRequest.on('error', (err) => {
    logger.error(`❌ Sprite Proxy Error for ${targetUrl}:`, err.message);
    res.status(500).send('Proxy error');
  });
});

// --- Unified CDN proxy for OpenAIP sprites and other assets ---
app.use('/cdn', (req, res) => {
  const assetPath = req.url.replace(/^\/cdn/, '').trim();
  const targetUrl = `https://cdn.openaip.net${assetPath}`;

  logger.info(`📡 CDN Proxy Request: ${req.method} ${req.url}`);
  logger.info(`➡️  Forwarding to: ${targetUrl}`);

  const parsedUrl = new URL(targetUrl);
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: req.method,
    headers: {
      'User-Agent': req.headers['user-agent'] || 'OpenAIP-Proxy/1.0',
      'Accept': req.headers['accept'] || '*/*',
      'Accept-Encoding': req.headers['accept-encoding'] || 'gzip, deflate, br',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    logger.info(`⬅️  CDN Response: ${proxyRes.statusCode} for ${targetUrl}`);
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    logger.error(`❌ CDN Proxy Error for ${targetUrl}:`, err);
    res.status(502).json({ error: 'Proxy request failed' });
  });

  proxyReq.end();
});


// --- Fallback for all other routes - return 404 ---
app.use((req, res) => {
  logger.warn(`🚫 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Not Found' });
});

// --- OpenAIP REST API Endpoints ---
// These endpoints provide detailed feature information to supplement vector tile data

/**
 * Fetch detailed airport information from OpenAIP REST API
 * GET /api/openaip/airports?icao=XXXX
 */
app.get('/api/openaip/airports', async (req, res) => {
  const { icao, name, country } = req.query;
  
  if (!icao && !name) {
    return res.status(400).json({ error: 'ICAO code or name parameter required' });
  }

  try {
    logger.info(`🔍 Fetching airport details: ${icao || name}`);
    
    let queryParams = new URLSearchParams();
    if (icao) queryParams.append('icao', icao);
    if (name) queryParams.append('name', name);
    if (country) queryParams.append('country', country);
    
    const targetUrl = `https://api.openaip.net/api/airports?${queryParams.toString()}`;
    
    const requestOptions = {
      headers: {
        'x-openaip-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Halo-Flight-Planning/1.0'
      }
    };

    const data = await makeRequest(targetUrl, requestOptions);
    
    logger.info(`✅ Airport data fetched successfully for ${icao || name}`);
    res.json(data);
  } catch (error) {
    logger.error(`❌ Error fetching airport details: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch airport details', details: error.message });
  }
});

/**
 * Fetch detailed navaid information from OpenAIP REST API
 * GET /api/openaip/navaids?ident=XXX
 */
app.get('/api/openaip/navaids', async (req, res) => {
  const { ident, name, type } = req.query;
  
  if (!ident && !name) {
    return res.status(400).json({ error: 'Identifier or name parameter required' });
  }

  try {
    logger.info(`🔍 Fetching navaid details: ${ident || name}`);
    
    let queryParams = new URLSearchParams();
    if (ident) queryParams.append('ident', ident);
    if (name) queryParams.append('name', name);
    if (type) queryParams.append('type', type);
    
    const targetUrl = `https://api.openaip.net/api/navaids?${queryParams.toString()}`;
    
    const requestOptions = {
      headers: {
        'x-openaip-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Halo-Flight-Planning/1.0'
      }
    };

    const data = await makeRequest(targetUrl, requestOptions);
    
    logger.info(`✅ Navaid data fetched successfully for ${ident || name}`);
    res.json(data);
  } catch (error) {
    logger.error(`❌ Error fetching navaid details: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch navaid details', details: error.message });
  }
});

/**
 * Fetch detailed airspace information from OpenAIP REST API
 * GET /api/openaip/airspaces?name=XXX
 */
app.get('/api/openaip/airspaces', async (req, res) => {
  const { name, country, type } = req.query;
  
  if (!name) {
    return res.status(400).json({ error: 'Name parameter required' });
  }

  try {
    logger.info(`🔍 Fetching airspace details: ${name}`);
    
    let queryParams = new URLSearchParams();
    queryParams.append('name', name);
    if (country) queryParams.append('country', country);
    if (type) queryParams.append('type', type);
    
    const targetUrl = `https://api.openaip.net/api/airspaces?${queryParams.toString()}`;
    
    const requestOptions = {
      headers: {
        'x-openaip-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Halo-Flight-Planning/1.0'
      }
    };

    const data = await makeRequest(targetUrl, requestOptions);
    
    logger.info(`✅ Airspace data fetched successfully for ${name}`);
    res.json(data);
  } catch (error) {
    logger.error(`❌ Error fetching airspace details: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch airspace details', details: error.message });
  }
});

/**
 * Generic OpenAIP API proxy endpoint
 * GET /api/openaip/:endpoint
 */
app.get('/api/openaip/:endpoint', async (req, res) => {
  const { endpoint } = req.params;
  const queryParams = new URLSearchParams(req.query).toString();
  
  try {
    logger.info(`🔍 Generic OpenAIP API request: ${endpoint}`);
    
    const targetUrl = `https://api.openaip.net/api/${endpoint}${queryParams ? `?${queryParams}` : ''}`;
    
    const requestOptions = {
      headers: {
        'x-openaip-api-key': apiKey,
        'Accept': 'application/json',
        'User-Agent': 'Halo-Flight-Planning/1.0'
      }
    };

    const data = await makeRequest(targetUrl, requestOptions);
    
    logger.info(`✅ Generic API data fetched successfully for ${endpoint}`);
    res.json(data);
  } catch (error) {
    logger.error(`❌ Error fetching ${endpoint} data: ${error.message}`);
    res.status(500).json({ error: `Failed to fetch ${endpoint} data`, details: error.message });
  }
});

// --- Start Server ---
app.listen(port, () => {
  logger.info(`🚀 Proxy server running on http://localhost:${port}`);
  logger.info('📡 Available endpoints:');
  logger.info('   - /api/styles/:styleFile');
  logger.info('   - /api/maps/openaip-vectortiles/:z/:x/:y');
  logger.info('   - /api/sprites/:name.:ext');
  logger.info('   - /api/openaip/airports?icao=XXXX');
  logger.info('   - /api/openaip/navaids?ident=XXX');
  logger.info('   - /api/openaip/airspaces?name=XXX');
  logger.info('   - /api/openaip/:endpoint (generic)');
});
