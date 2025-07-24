# Halo Flight Planning Application

A professional flight planning application with OpenAIP aeronautical chart integration, designed for pilots and aviation professionals.

![Halo Flight Planning](https://img.shields.io/badge/Version-0.0.1-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg)
![MapLibre GL](https://img.shields.io/badge/MapLibre%20GL-5.6.1-orange.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)

## 🚀 Features

### ✈️ Flight Planning
- **Multi-leg Flight Plans**: Create complex flight plans with multiple waypoints and legs
- **ICAO Flight Plan Forms**: Generate standard ICAO flight plan documents
- **Route Optimization**: Calculate optimal routes with fuel and time considerations
- **Waypoint Management**: Add, edit, and manage waypoints with detailed information

### 🗺️ Aeronautical Charts
- **OpenAIP Integration**: Authentic aeronautical chart styling with real aviation data
- **Interactive Maps**: Click on airports, airspaces, and navigation aids for detailed information
- **Layer Controls**: Toggle visibility of airports, airspaces, navaids, obstacles, and terrain
- **Professional Symbology**: Industry-standard aviation symbols and color coding

### ✈️ Aircraft Management
- **Aircraft Database**: Manage multiple aircraft with performance specifications
- **Performance Calculations**: Fuel burn, range, and endurance calculations
- **Mass & Balance**: Weight and balance calculations with CG envelope verification
- **Aircraft Profiles**: Store detailed aircraft specifications and limitations

### 🧮 Aviation Calculations
- **Fuel Planning**: Comprehensive fuel calculations with reserves
- **Weight & Balance**: Center of gravity and moment calculations
- **Performance Analysis**: Takeoff, landing, and cruise performance
- **Weather Integration**: Weather data integration for flight planning

### 🔐 User Management
- **Supabase Authentication**: Secure user authentication and authorization
- **User Profiles**: Personal flight planning profiles and preferences
- **Data Persistence**: Save and retrieve flight plans, aircraft, and settings

## 🛠️ Technology Stack

- **Frontend**: React 18.2.0 with modern hooks and functional components
- **Mapping**: MapLibre GL 5.6.1 for high-performance vector maps
- **Styling**: Tailwind CSS for responsive and modern UI design
- **Backend**: Supabase for authentication, database, and real-time features
- **Charts**: OpenAIP integration for authentic aeronautical data
- **Build Tool**: Vite for fast development and optimized builds

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- Supabase account and project
- OpenAIP API key
- MapTiler API key (optional, for base maps)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/selezai/halo-flight-planning.git
cd halo-flight-planning
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAIP Configuration
VITE_OPENAIP_API_KEY=your_openaip_api_key

# MapTiler Configuration (Optional)
VITE_MAPTILER_API_KEY=your_maptiler_api_key
```

### 4. Start the Proxy Server
The application requires a proxy server for OpenAIP API requests:
```bash
npm run start:proxy
```

### 5. Start the Development Server
In a new terminal:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
halo-flight-planning/
├── src/
│   ├── app/                    # Main application component
│   ├── components/
│   │   ├── aircraft/           # Aircraft management components
│   │   ├── auth/              # Authentication components
│   │   ├── flight-plans/      # Flight planning components
│   │   └── map/               # Map and aeronautical chart components
│   ├── lib/                   # Utility libraries and configurations
│   ├── pages/                 # Page components
│   └── styles/                # Global styles and themes
├── supabase/                  # Database migrations and configuration
├── proxy-server.js            # OpenAIP proxy server
└── public/                    # Static assets
```

## 🗺️ Map Features

### OpenAIP Integration
- **Authentic Styling**: Exact replication of OpenAIP's professional aeronautical charts
- **Vector Tiles**: High-performance vector tile rendering with zoom-responsive styling
- **Aviation Data**: Real-time airport, airspace, navaid, and obstacle information
- **Interactive Elements**: Click features for detailed aviation information

### Supported Aviation Features
- **Airports**: Major and minor airports with runway information
- **Airspaces**: Controlled airspace (CTR, TMA, CTA) with altitude information
- **Navigation Aids**: VOR, NDB, DME, and TACAN stations
- **Obstacles**: Towers, buildings, and other aviation hazards
- **Waypoints**: Named waypoints and reporting points

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run start:proxy` - Start OpenAIP proxy server

### API Configuration
The application uses a proxy server to handle OpenAIP API requests with proper authentication and CORS handling. The proxy server runs on port 3001 by default.

## 🚀 Deployment

### Building for Production
```bash
npm run build
```

### Environment Variables for Production
Ensure all environment variables are properly configured for your production environment:
- Supabase URL and keys
- OpenAIP API key
- Any additional API keys for map tiles

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAIP** for providing comprehensive aeronautical data and APIs
- **MapLibre GL** for high-performance vector map rendering
- **Supabase** for backend infrastructure and authentication
- **React** and the broader React ecosystem for frontend development tools

## 📞 Support

For support, questions, or feature requests:
- Create an issue on GitHub
- Check the documentation in the `docs/` folder
- Review the project wiki for detailed guides

## 🔄 Version History

- **v0.0.1** - Initial release with core flight planning and mapping features

---

**Built with ❤️ for the aviation community**
