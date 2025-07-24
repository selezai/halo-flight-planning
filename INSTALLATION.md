# Halo Flight Planning - Installation Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

### System Requirements
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: 500MB free space for dependencies
- **Network**: Internet connection for aeronautical data

## 📥 Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/selezai/halo-flight-planning.git
cd halo-flight-planning
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```env
# OpenAIP Configuration
VITE_OPENAIP_CLIENT_ID=your_openaip_client_id
VITE_OPENAIP_CLIENT_SECRET=your_openaip_client_secret

# Supabase Configuration (if using authentication)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Weather API (optional)
VITE_WEATHER_API_KEY=your_weather_api_key
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔑 API Key Setup

### OpenAIP API Key (Required)
1. Visit [OpenAIP Developer Portal](https://www.openaip.net/developers)
2. Create a developer account
3. Generate API credentials
4. Add to your `.env.local` file

### Weather API Key (Optional)
For enhanced weather features:
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get free API key
3. Add to environment variables

### Supabase Setup (Optional)
For user authentication and data persistence:
1. Create account at [Supabase](https://supabase.com)
2. Create new project
3. Copy URL and anon key to environment

## 🛠️ Development Tools

### Available Scripts
```bash
# Development
npm run dev          # Start development server
npm run dev:host     # Start with network access

# Building
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
```

### VS Code Setup (Recommended)
Install recommended extensions:
```json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

## 🐳 Docker Setup (Alternative)

### Using Docker Compose
```bash
# Build and start containers
docker-compose up --build

# Run in background
docker-compose up -d

# Stop containers
docker-compose down
```

### Manual Docker Build
```bash
# Build image
docker build -t halo-flight-planning .

# Run container
docker run -p 5173:5173 halo-flight-planning
```

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

#### Node Version Issues
```bash
# Check Node version
node --version

# Update Node using nvm
nvm install 18
nvm use 18
```

#### Dependency Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### OpenAIP API Issues
- Verify API credentials are correct
- Check API quota limits
- Ensure network connectivity
- Review browser console for errors

### Performance Optimization

#### For Development
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
npm run dev
```

#### For Production
```bash
# Build with optimizations
npm run build

# Analyze bundle size
npm run build:analyze
```

## 🌐 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

### Netlify
```bash
# Build command: npm run build
# Publish directory: dist
# Environment variables: Set in Netlify dashboard
```

### Self-hosted
```bash
# Build for production
npm run build

# Serve static files from dist/ directory
# Configure web server (nginx, Apache, etc.)
```

## 📱 Mobile Development

### PWA Installation
The app supports Progressive Web App features:
1. Visit the app in mobile browser
2. Add to home screen when prompted
3. Use as native-like app

### Offline Capabilities
- Chart caching (coming soon)
- Flight plan storage
- Basic calculations

## 🔒 Security Considerations

### API Key Security
- Never commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Monitor API usage

### HTTPS Requirements
- OpenAIP requires HTTPS in production
- Use SSL certificates
- Configure secure headers

## 📞 Support

### Getting Help
- **Documentation**: Check this guide first
- **Issues**: Create GitHub issue with details
- **Email**: selezmj@gmail.com
- **Community**: Join aviation developer discussions

### Reporting Bugs
Include in bug reports:
- Operating system and version
- Browser and version
- Node.js version
- Steps to reproduce
- Console error messages
- Screenshots if applicable

---

**Note**: This is aviation software. Always verify all information with official sources before actual flight operations.
