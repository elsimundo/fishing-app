export interface CurrentWeather {
  time: string
  temperature: number
  apparentTemperature: number
  weatherCode: number
  windSpeed: number
  windDirection: number
  windGusts: number
  precipitation: number
  cloudCover: number
  pressure: number
  visibility: number
  uvIndex: number
}

export interface HourlyForecast {
  time: string[]
  temperature: number[]
  precipitation: number[]
  precipitationProbability: number[]
  windSpeed: number[]
  windDirection: number[]
  windGusts: number[]
  weatherCode: number[]
}

export interface DailyForecast {
  time: string[]
  temperatureMax: number[]
  temperatureMin: number[]
  sunrise: string[]
  sunset: string[]
  precipitationSum: number[]
  precipitationProbabilityMax: number[]
  windSpeedMax: number[]
  windGustsMax: number[]
  weatherCode: number[]
  uvIndexMax: number[]
}

export interface MarineConditions {
  waveHeight: number
  waveDirection: number
  wavePeriod: number
  swellHeight: number
  seaTemperature: number
}

export interface WeatherData {
  location: {
    lat: number
    lng: number
  }
  current: CurrentWeather
  hourly: HourlyForecast
  daily: DailyForecast
  marine?: MarineConditions
  fetchedAt: string
}

export interface FishingConditions {
  score: number
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  factors: {
    wind: { score: number; status: string }
    pressure: { score: number; status: string }
    precipitation: { score: number; status: string }
    temperature: { score: number; status: string }
  }
  recommendation: string
}

// WMO Weather interpretation codes
export const WEATHER_CODES: Record<number, { description: string; icon: string }> = {
  0: { description: 'Clear sky', icon: '☀️' },
  1: { description: 'Mainly clear', icon: '🌤️' },
  2: { description: 'Partly cloudy', icon: '⛅' },
  3: { description: 'Overcast', icon: '☁️' },
  45: { description: 'Foggy', icon: '🌫️' },
  48: { description: 'Depositing rime fog', icon: '🌫️' },
  51: { description: 'Light drizzle', icon: '🌦️' },
  53: { description: 'Moderate drizzle', icon: '🌦️' },
  55: { description: 'Dense drizzle', icon: '🌧️' },
  56: { description: 'Freezing drizzle', icon: '🌧️' },
  57: { description: 'Dense freezing drizzle', icon: '🌧️' },
  61: { description: 'Slight rain', icon: '🌧️' },
  63: { description: 'Moderate rain', icon: '🌧️' },
  65: { description: 'Heavy rain', icon: '🌧️' },
  66: { description: 'Freezing rain', icon: '🌧️' },
  67: { description: 'Heavy freezing rain', icon: '🌧️' },
  71: { description: 'Slight snow', icon: '🌨️' },
  73: { description: 'Moderate snow', icon: '🌨️' },
  75: { description: 'Heavy snow', icon: '❄️' },
  77: { description: 'Snow grains', icon: '🌨️' },
  80: { description: 'Slight rain showers', icon: '🌦️' },
  81: { description: 'Moderate rain showers', icon: '🌧️' },
  82: { description: 'Violent rain showers', icon: '⛈️' },
  85: { description: 'Slight snow showers', icon: '🌨️' },
  86: { description: 'Heavy snow showers', icon: '❄️' },
  95: { description: 'Thunderstorm', icon: '⛈️' },
  96: { description: 'Thunderstorm with slight hail', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', icon: '⛈️' },
}
