import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env.local') });

const app = express();
const port = process.env.PROXY_PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// OpenAIP API proxy
app.use('/api/openaip', createProxyMiddleware({
  target: 'https://api.tiles.openaip.net',
  changeOrigin: true,
  pathRewrite: {
    '^/api/openaip': '/api'
  },
  onProxyReq: (proxyReq) => {
    // Add the API key to all requests
    proxyReq.setHeader('x-openaip-client-id', process.env.VITE_OPENAIP_API_KEY);
  },
  logLevel: 'debug'
}));

// OpenAIP CDN proxy
app.use('/api/openaip/cdn', createProxyMiddleware({
  target: 'https://cdn.openaip.net',
  changeOrigin: true,
  pathRewrite: {
    '^/api/openaip/cdn': '/'
  },
  logLevel: 'debug'
}));

app.listen(port, () => {
  console.log(`OpenAIP proxy server running on port ${port}`);
});
