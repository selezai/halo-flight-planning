# Halo Flight Planning - Assets Directory

## 📁 Directory Structure

```
assets/
├── screenshots/           # Application screenshots for documentation
│   ├── dashboard.png     # Main dashboard view
│   ├── openaip-charts.png # OpenAIP chart integration
│   ├── flight-plan-creation.png # Flight planning interface
│   ├── aircraft-management.png # Aircraft profiles
│   └── weather-integration.png # Weather data display
├── icons/                # Application icons and branding
│   ├── logo.svg         # Main application logo
│   ├── favicon.ico      # Browser favicon
│   └── aviation-icons/  # Aviation-specific iconography
└── documentation/        # Visual documentation assets
    ├── architecture-diagrams/ # System architecture visuals
    ├── user-flow-diagrams/   # User experience flows
    └── technical-specs/      # Technical specification images
```

## 📸 Screenshots Guidelines

### Capture Standards
- **Resolution**: Minimum 1920x1080 for desktop views
- **Format**: PNG for UI screenshots, JPG for photos
- **Quality**: High quality, clear text, professional appearance
- **Content**: Remove any sensitive or personal information

### Required Screenshots
1. **Main Dashboard** - Clean overview of the application
2. **OpenAIP Integration** - Aeronautical charts with data overlay
3. **Flight Planning** - Route creation and waypoint management
4. **Aircraft Management** - Aircraft profiles and performance data
5. **Weather Integration** - Weather data visualization
6. **Mobile Views** - Responsive design on tablet/mobile

### Naming Convention
```
feature-name-view-type.png
Examples:
- dashboard-main-view.png
- flight-planning-route-creation.png
- weather-integration-forecast-view.png
```

## 🎨 Branding Assets

### Logo Requirements
- **Vector Format**: SVG for scalability
- **Variants**: Light/dark theme versions
- **Sizes**: Multiple resolutions (16x16 to 512x512)
- **Usage**: Consistent across all platforms

### Color Palette
```css
/* Aviation-inspired color scheme */
--primary-blue: #1e40af;      /* Aviation blue */
--secondary-orange: #ea580c;   /* Aviation orange */
--accent-green: #16a34a;       /* Success/safe green */
--warning-yellow: #ca8a04;     /* Caution yellow */
--danger-red: #dc2626;         /* Alert red */
--neutral-gray: #6b7280;       /* Text/UI gray */
```

### Typography
- **Primary**: Inter (modern, readable)
- **Monospace**: JetBrains Mono (code/coordinates)
- **Aviation**: Custom aviation-style numbers for instruments

## 📊 Documentation Assets

### Architecture Diagrams
- System architecture overview
- Data flow diagrams
- API integration maps
- Database schema visuals

### User Flow Diagrams
- Flight planning workflow
- User onboarding process
- Emergency procedures
- Mobile app navigation

## 🔧 Asset Optimization

### Image Optimization
```bash
# Optimize PNG files
pngquant --quality=65-80 *.png

# Optimize JPG files
jpegoptim --max=85 *.jpg

# Convert to WebP for web use
cwebp -q 80 input.png -o output.webp
```

### SVG Optimization
```bash
# Optimize SVG files
svgo --multipass *.svg
```

## 📱 Responsive Assets

### Breakpoint Considerations
- **Desktop**: 1920x1080+ screenshots
- **Tablet**: 768x1024 (iPad) screenshots
- **Mobile**: 375x667 (iPhone) screenshots
- **Ultra-wide**: 2560x1440+ for large displays

### Asset Variants
Each major screenshot should have variants for:
- Light/dark themes
- Different screen sizes
- Various data states (empty, populated, error)

## 🚀 Usage in Documentation

### README.md Integration
```markdown
![Feature Screenshot](assets/screenshots/feature-name.png)
*Caption describing the feature*
```

### Demo Documentation
- Link screenshots to specific features
- Provide context for each image
- Include alt text for accessibility

## 📋 Asset Checklist

### Pre-release Requirements
- [ ] All screenshots updated to current UI
- [ ] Logo variants created and optimized
- [ ] Documentation diagrams current
- [ ] Mobile screenshots captured
- [ ] All images optimized for web
- [ ] Alt text provided for accessibility
- [ ] Branding consistency verified

### Maintenance
- Update screenshots with each major UI change
- Refresh documentation assets quarterly
- Optimize new assets before committing
- Maintain consistent visual style

---

**Note**: All assets should maintain professional aviation industry standards and be suitable for use in commercial presentations.
