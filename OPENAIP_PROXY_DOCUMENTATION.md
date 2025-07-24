# OpenAIP Proxy Server Documentation

## Overview

This document provides comprehensive documentation for the OpenAIP proxy server implementation, which serves as a critical middleware component for the Halo application's aeronautical chart functionality. The proxy server handles authentication, request forwarding, and resource transformation for OpenAIP's vector tile API, styles API, and CDN resources.

## Architecture

The proxy server is built on Express.js and implements several specialized middleware components:

1. **Tiles API Proxy**: Forwards vector tile requests to OpenAIP's tile server
2. **Styles API Proxy**: Fetches and transforms style JSON with sprite URL rewriting
3. **CDN Proxy**: Serves static sprite resources and fallback proxying
4. **Health Endpoint**: Provides status information for monitoring

## Implementation Details

### Authentication Handling

- API keys are sourced from:
  - Request headers (`x-openaip-client-id` or `x-openaip-api-key`)
  - Environment variables (`VITE_OPENAIP_API_KEY`)
- Keys are forwarded securely in headers, never exposed in URLs
- Partial key masking in logs for security

### Styles API Proxy

The styles proxy implements a robust fallback mechanism that tries multiple possible endpoint paths sequentially:

```javascript
const possibleEndpoints = [
  `/api/styles/v1/${styleFilename}`,
  `/api/styles/${styleFilename}`,
  `/styles/v1/${styleFilename}`,
  `/styles/${styleFilename}`,
  `/v1/styles/${styleFilename}`
];
```

This approach handles potential API path variations and ensures maximum compatibility. The proxy also:

1. Parses the JSON response
2. Rewrites sprite URLs to point to the local proxy
3. Provides detailed logging for debugging
4. Returns a minimal fallback style JSON if all endpoints fail

### CDN Sprite Handling

Instead of attempting to dynamically proxy Mapbox sprite URLs (which caused 502 errors), the implementation:

1. Serves static placeholder sprite files:
   - `openaip-icons.png`
   - `openaip-icons.json`
   - `openaip-icons@2x.png` (retina)
   - `openaip-icons@2x.json` (retina)
2. Provides fallback proxying for other CDN requests to `https://cdn.openaip.net`

This approach resolves the persistent 502 Bad Gateway errors when requesting icon sprites.

### Error Handling and Logging

- Extensive logging for all proxy operations:
  - Incoming requests
  - Outgoing proxy requests
  - Responses and errors
  - Endpoint trials
- Process-level error handlers to prevent crashes
- Detailed error responses with appropriate HTTP status codes

## Technical Decisions

### Native Node.js HTTPS vs http-proxy-middleware

Initially, `http-proxy-middleware` was used with on-the-fly response body rewriting. However, this approach proved problematic for complex JSON transformations. The implementation was switched to native Node.js `https` requests for:

1. Better control over request/response handling
2. More reliable response body collection and parsing
3. Improved error handling and logging
4. Ability to implement the sequential endpoint trial strategy

### Static Sprites vs Dynamic Proxying

The decision to serve static sprite files rather than dynamically proxying Mapbox sprite URLs was made because:

1. Direct Mapbox API requests were unauthorized and resulted in 502 errors
2. OpenAIP's sprite URLs in the style JSON pointed to Mapbox URLs that required authentication
3. The application doesn't actually need the full sprite functionality, just valid placeholder files

### CORS Configuration

CORS headers are permissively set (`Access-Control-Allow-Origin: *`) for development ease. For production deployment, these should be tightened to specific origins.

## Testing

The proxy server can be tested using:

1. The `/health` endpoint to verify server status
2. The test page at `openaip-test.html` which includes:
   - Health endpoint test
   - Style JSON fetch test
   - CDN sprite fetch test
   - Map rendering with OpenAIP vector tiles

## Integration with React Application

The React application connects to the proxy server through:

1. Style JSON fetching in `useMapInitialization.js`
2. Vector tile source configuration in map initialization
3. API key forwarding in request headers

## Troubleshooting

Common issues and solutions:

1. **404 Not Found for Style JSON**: The proxy tries multiple endpoint paths to handle API variations
2. **502 Bad Gateway for Sprites**: Resolved by serving static placeholder sprites
3. **Missing API Key**: Check environment variables and request headers
4. **CORS Errors**: Ensure CORS headers are properly configured

## Future Improvements

1. Add caching for style JSON and sprite resources
2. Implement rate limiting for API requests
3. Add automated tests for proxy endpoints
4. Tighten security settings for production deployment
5. Add monitoring and alerting for proxy server health
