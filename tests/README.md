# Halo Flight Planning - Test Suite

## Overview
This directory contains unit tests, integration tests, and end-to-end tests for the Halo Flight Planning application.

## Test Structure
```
tests/
├── unit/                   # Unit tests for individual components
│   ├── components/         # React component tests
│   ├── utils/             # Utility function tests
│   └── calculations/      # Aviation calculation tests
├── integration/           # Integration tests
│   ├── api/              # API integration tests
│   └── map/              # Map functionality tests
├── e2e/                  # End-to-end tests
│   ├── flight-planning/  # Flight planning workflow tests
│   └── user-flows/       # Complete user journey tests
└── fixtures/             # Test data and mock responses
    ├── airports.json     # Sample airport data
    ├── weather.json      # Sample weather data
    └── flight-plans.json # Sample flight plans
```

## Running Tests

### All Tests
```bash
npm test
```

### Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# Watch mode for development
npm run test:watch
```

## Test Coverage

### Current Coverage
- [ ] Map component rendering
- [ ] Flight plan calculations
- [ ] Weather data integration
- [ ] User authentication flows
- [ ] OpenAIP data processing

### Target Coverage
- **Components**: 90%+
- **Utilities**: 95%+
- **Calculations**: 100% (critical for aviation safety)
- **API Integration**: 85%+

## Aviation-Specific Testing

### Critical Test Areas
1. **Navigation Calculations**
   - Great circle distance calculations
   - Bearing computations
   - Wind triangle calculations
   - Fuel consumption estimates

2. **Safety Validations**
   - Minimum fuel requirements
   - Weight and balance limits
   - Airspace compliance checks
   - Weather minimums validation

3. **Data Accuracy**
   - Airport information validation
   - Airspace boundary accuracy
   - Navigation aid positioning
   - Chart data integrity

## Test Data Sources
- **Real Aviation Data**: Limited use for accuracy validation
- **Synthetic Data**: Primary source for testing scenarios
- **Mock APIs**: Simulated OpenAIP and weather responses
- **Edge Cases**: Extreme weather, unusual routes, emergency scenarios

## Continuous Integration
Tests are automatically run on:
- Pull request creation
- Merge to main branch
- Scheduled daily runs
- Pre-deployment validation

---

**Note**: Aviation software requires rigorous testing. All calculation-related tests must achieve 100% coverage and include edge case validation.
