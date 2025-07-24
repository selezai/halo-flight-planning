# Halo Flight Planning - Deployment Configuration

## 🚀 Deployment Options

### Vercel (Recommended)
Optimized for React applications with global CDN.

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Configuration**: `vercel.json`
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    "VITE_OPENAIP_CLIENT_ID": "@openaip_client_id",
    "VITE_OPENAIP_CLIENT_SECRET": "@openaip_client_secret",
    "VITE_SUPABASE_URL": "@supabase_url",
    "VITE_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### Netlify
Alternative deployment with form handling and edge functions.

```bash
# Build settings
Build command: npm run build
Publish directory: dist
```

**Configuration**: `netlify.toml`
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### Railway
For full-stack deployment with backend services.

```yaml
# railway.json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run preview",
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 5173

# Start application
CMD ["npm", "run", "preview"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  halo-frontend:
    build: .
    ports:
      - "5173:5173"
    environment:
      - VITE_OPENAIP_CLIENT_ID=${OPENAIP_CLIENT_ID}
      - VITE_OPENAIP_CLIENT_SECRET=${OPENAIP_CLIENT_SECRET}
      - VITE_SUPABASE_URL=${SUPABASE_URL}
      - VITE_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
    volumes:
      - ./dist:/app/dist
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - halo-frontend
    restart: unless-stopped
```

## ⚙️ Environment Configuration

### Production Environment Variables
```bash
# OpenAIP Configuration
VITE_OPENAIP_CLIENT_ID=your_production_client_id
VITE_OPENAIP_CLIENT_SECRET=your_production_client_secret
VITE_OPENAIP_API_URL=https://api.openaip.net

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key

# Weather API
VITE_WEATHER_API_KEY=your_weather_api_key
VITE_WEATHER_API_URL=https://api.openweathermap.org

# Application Configuration
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.halo-flight-planning.com
```

### Staging Environment
```bash
# Use staging/development API endpoints
VITE_OPENAIP_API_URL=https://api-staging.openaip.net
VITE_SUPABASE_URL=https://staging-project.supabase.co
VITE_APP_ENV=staging
```

## 🔒 Security Configuration

### HTTPS Setup
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name halo-flight-planning.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://halo-frontend:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Security Headers
```javascript
// vite.config.js security headers
export default defineConfig({
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    }
  }
});
```

## 📊 Monitoring & Analytics

### Performance Monitoring
```javascript
// Add to index.html
<script>
  // Web Vitals monitoring
  import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
  
  getCLS(console.log);
  getFID(console.log);
  getFCP(console.log);
  getLCP(console.log);
  getTTFB(console.log);
</script>
```

### Error Tracking
```javascript
// Sentry configuration
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.VITE_APP_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
});
```

## 🚦 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build
        env:
          VITE_OPENAIP_CLIENT_ID: ${{ secrets.OPENAIP_CLIENT_ID }}
          VITE_OPENAIP_CLIENT_SECRET: ${{ secrets.OPENAIP_CLIENT_SECRET }}
      
      - name: Deploy to Vercel
        uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🔄 Backup & Recovery

### Database Backup
```bash
# Supabase backup
supabase db dump --db-url $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Asset Backup
```bash
# Backup static assets
aws s3 sync ./assets s3://halo-backups/assets/$(date +%Y-%m-%d)

# Backup user data
pg_dump $DATABASE_URL | gzip > user-data-$(date +%Y-%m-%d).sql.gz
```

## 📈 Scaling Considerations

### CDN Configuration
- Use Cloudflare or AWS CloudFront
- Cache static assets for 1 year
- Cache API responses for 5 minutes
- Implement proper cache invalidation

### Load Balancing
```yaml
# docker-compose.scale.yml
services:
  halo-frontend:
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

## 🚨 Emergency Procedures

### Rollback Process
```bash
# Vercel rollback
vercel rollback [deployment-url]

# Docker rollback
docker-compose down
docker-compose up -d --scale halo-frontend=3
```

### Health Checks
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VITE_APP_VERSION
  });
});
```

---

**Note**: Always test deployments in staging environment before production release. Aviation software requires zero-downtime deployment strategies.
