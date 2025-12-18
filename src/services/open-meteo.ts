import type {
  WeatherData,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  MarineConditions,
} from '../types/weather'
import { trackApiCall } from '../lib/apiTracker'

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1'
const MARINE_API_URL = 'https://marine-api.open-meteo.com/v1'

/**
 * Get current weather and forecast from Open-Meteo
 */
export async function getWeatherData(lat: number, lng: number): Promise<WeatherData | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: [
        'temperature_2m',
        'apparent_temperature',
        'weather_code',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'precipitation',
        'cloud_cover',
        'pressure_msl',
        'visibility',
        'uv_index',
      ].join(','),
      hourly: [
        'temperature_2m',
        'precipitation',
        'precipitation_probability',
        'wind_speed_10m',
        'wind_direction_10m',
        'wind_gusts_10m',
        'weather_code',
      ].join(','),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'sunrise',
        'sunset',
        'precipitation_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'weather_code',
        'uv_index_max',
      ].join(','),
      timezone: 'auto',
      forecast_days: '7',
    })

    const response = await fetch(`${OPEN_METEO_BASE_URL}/forecast?${params}`)

    // Track API call
    trackApiCall({ apiName: 'open_meteo_weather', endpoint: '/forecast' })

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`)
    }

    const data = await response.json()

    const current: CurrentWeather = {
      time: data.current.time,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      weatherCode: data.current.weather_code,
      windSpeed: data.current.wind_speed_10m,
      windDirection: data.current.wind_direction_10m,
      windGusts: data.current.wind_gusts_10m,
      precipitation: data.current.precipitation,
      cloudCover: data.current.cloud_cover,
      pressure: data.current.pressure_msl,
      visibility: data.current.visibility,
      uvIndex: data.current.uv_index,
    }

    const hourly: HourlyForecast = {
      time: data.hourly.time.slice(0, 48),
      temperature: data.hourly.temperature_2m.slice(0, 48),
      precipitation: data.hourly.precipitation.slice(0, 48),
      precipitationProbability: data.hourly.precipitation_probability.slice(0, 48),
      windSpeed: data.hourly.wind_speed_10m.slice(0, 48),
      windDirection: data.hourly.wind_direction_10m.slice(0, 48),
      windGusts: data.hourly.wind_gusts_10m.slice(0, 48),
      weatherCode: data.hourly.weather_code.slice(0, 48),
    }

    const daily: DailyForecast = {
      time: data.daily.time,
      temperatureMax: data.daily.temperature_2m_max,
      temperatureMin: data.daily.temperature_2m_min,
      sunrise: data.daily.sunrise,
      sunset: data.daily.sunset,
      precipitationSum: data.daily.precipitation_sum,
      precipitationProbabilityMax: data.daily.precipitation_probability_max,
      windSpeedMax: data.daily.wind_speed_10m_max,
      windGustsMax: data.daily.wind_gusts_10m_max,
      weatherCode: data.daily.weather_code,
      uvIndexMax: data.daily.uv_index_max,
    }

    return {
      location: { lat, lng },
      current,
      hourly,
      daily,
      fetchedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[Weather] Error fetching weather data:', error)
    return null
  }
}

/**
 * Get marine conditions (for coastal/offshore fishing)
 */
export async function getMarineConditions(
  lat: number,
  lng: number
): Promise<MarineConditions | null> {
  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: ['wave_height', 'wave_direction', 'wave_period', 'swell_wave_height'].join(','),
    })

    const response = await fetch(`${MARINE_API_URL}/marine?${params}`)

    // Track API call
    trackApiCall({ apiName: 'open_meteo_marine', endpoint: '/marine' })

    if (!response.ok) {
      // Marine data not available for all locations (inland areas)
      return null
    }

    const data = await response.json()

    if (!data.current) return null

    return {
      waveHeight: data.current.wave_height || 0,
      waveDirection: data.current.wave_direction || 0,
      wavePeriod: data.current.wave_period || 0,
      swellHeight: data.current.swell_wave_height || 0,
      seaTemperature: 0, // Not always available
    }
  } catch (error) {
    // Silently fail for marine data - it's optional
    return null
  }
}

/**
 * Get complete weather data including marine conditions
 */
export async function getCompleteWeatherData(
  lat: number,
  lng: number
): Promise<WeatherData | null> {
  const weatherData = await getWeatherData(lat, lng)
  if (!weatherData) return null

  // Try to get marine conditions (might not be available for inland)
  const marine = await getMarineConditions(lat, lng)
  if (marine) {
    weatherData.marine = marine
  }

  return weatherData
}
