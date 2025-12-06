---
description: Add Open-Meteo weather & wind data with fishing conditions scoring
---

# Add Open-Meteo Weather & Wind Data

Integrates Open-Meteo (free, no API key) to display current weather, wind conditions, hourly forecast, and fishing suitability scores on the Explore map.

## API Overview

- **URL**: https://api.open-meteo.com/v1
- **Docs**: https://open-meteo.com/en/docs
- **Free**: 100% free, no API key required
- **Coverage**: Global, high-resolution forecasts

## Features

- Current weather (temp, wind, pressure, precipitation)
- Wind speed & direction (critical for fishing)
- Fishing conditions score (0-100)
- Marine conditions (wave height, swell)
- 7-day forecast
- Sunrise/sunset times

## Implementation Tasks

### Phase 1: Types & Services
1. Create weather types (`src/types/weather.ts`)
2. Create Open-Meteo service (`src/services/open-meteo.ts`)
3. Create fishing conditions calculator (`src/services/fishing-conditions.ts`)

### Phase 2: Frontend
4. Create weather data hook (`src/hooks/useWeatherData.ts`)
5. Create WeatherInfoCard component
6. Create WeatherButton component

### Phase 3: Integration
7. Add WeatherButton to ExplorePage

## Fishing Conditions Scoring

- **Wind** (30%): 5-15 km/h ideal
- **Pressure** (25%): 1010-1020 hPa ideal
- **Precipitation** (20%): Overcast/light rain ideal
- **Temperature** (25%): 15-25°C ideal

## Success Criteria

- [ ] Open-Meteo API integrated
- [ ] Fishing score calculated correctly
- [ ] Wind data prominent
- [ ] 7-day forecast displayed
- [ ] Marine conditions shown (coastal)
- [ ] Mobile responsive
- [ ] No API key required
