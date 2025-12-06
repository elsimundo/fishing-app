import type { WeatherData, FishingConditions } from '../types/weather'

/**
 * Calculate fishing conditions score based on weather
 * Uses fishing wisdom: ideal conditions are stable pressure, light winds, overcast skies
 */
export function calculateFishingConditions(weather: WeatherData): FishingConditions {
  const { current } = weather

  let totalScore = 0
  const factors: FishingConditions['factors'] = {
    wind: { score: 0, status: '' },
    pressure: { score: 0, status: '' },
    precipitation: { score: 0, status: '' },
    temperature: { score: 0, status: '' },
  }

  // 1. WIND SCORE (30% weight) - Most important for fishing!
  let windScore = 0
  if (current.windSpeed < 5) {
    windScore = 15
    factors.wind.status = 'Very light winds'
  } else if (current.windSpeed >= 5 && current.windSpeed <= 15) {
    windScore = 30 // IDEAL
    factors.wind.status = 'Perfect fishing winds!'
  } else if (current.windSpeed > 15 && current.windSpeed <= 25) {
    windScore = 20
    factors.wind.status = 'Moderate winds'
  } else if (current.windSpeed > 25 && current.windSpeed <= 35) {
    windScore = 10
    factors.wind.status = 'Strong winds - challenging'
  } else {
    windScore = 0
    factors.wind.status = 'Too windy for fishing'
  }
  factors.wind.score = windScore
  totalScore += windScore

  // 2. PRESSURE SCORE (25% weight) - Affects fish behavior
  let pressureScore = 0
  if (current.pressure >= 1010 && current.pressure <= 1020) {
    pressureScore = 25 // IDEAL
    factors.pressure.status = 'Stable pressure - excellent'
  } else if (current.pressure >= 1005 && current.pressure < 1010) {
    pressureScore = 20
    factors.pressure.status = 'Falling pressure - active fish'
  } else if (current.pressure > 1020 && current.pressure <= 1025) {
    pressureScore = 15
    factors.pressure.status = 'Rising pressure - fair'
  } else if (current.pressure < 1000) {
    pressureScore = 5
    factors.pressure.status = 'Low pressure - storm approaching'
  } else {
    pressureScore = 10
    factors.pressure.status = 'High pressure - less active'
  }
  factors.pressure.score = pressureScore
  totalScore += pressureScore

  // 3. PRECIPITATION SCORE (20% weight)
  let precipScore = 0
  if (current.precipitation === 0 && current.cloudCover >= 40 && current.cloudCover <= 70) {
    precipScore = 20 // IDEAL - overcast, no rain
    factors.precipitation.status = 'Overcast - perfect!'
  } else if (current.precipitation === 0 && current.cloudCover < 40) {
    precipScore = 15
    factors.precipitation.status = 'Clear skies'
  } else if (current.precipitation > 0 && current.precipitation < 2) {
    precipScore = 18
    factors.precipitation.status = 'Light rain - fish active'
  } else if (current.precipitation >= 2 && current.precipitation < 5) {
    precipScore = 10
    factors.precipitation.status = 'Moderate rain'
  } else {
    precipScore = 0
    factors.precipitation.status = 'Heavy rain - poor conditions'
  }
  factors.precipitation.score = precipScore
  totalScore += precipScore

  // 4. TEMPERATURE SCORE (25% weight)
  let tempScore = 0
  if (current.temperature >= 15 && current.temperature <= 25) {
    tempScore = 25 // IDEAL
    factors.temperature.status = 'Ideal temperature'
  } else if (current.temperature >= 10 && current.temperature < 15) {
    tempScore = 20
    factors.temperature.status = 'Cool - fair'
  } else if (current.temperature > 25 && current.temperature <= 30) {
    tempScore = 15
    factors.temperature.status = 'Warm - fish deeper'
  } else if (current.temperature < 10) {
    tempScore = 10
    factors.temperature.status = 'Cold - slow fishing'
  } else {
    tempScore = 5
    factors.temperature.status = 'Too hot - fish deep'
  }
  factors.temperature.score = tempScore
  totalScore += tempScore

  // Determine rating and recommendation
  let rating: FishingConditions['rating']
  let recommendation: string

  if (totalScore >= 80) {
    rating = 'excellent'
    recommendation = 'Prime fishing conditions! Get out there now! 🎣'
  } else if (totalScore >= 60) {
    rating = 'good'
    recommendation = 'Good conditions for fishing. You should have success!'
  } else if (totalScore >= 40) {
    rating = 'fair'
    recommendation = 'Fair conditions. Fish are catchable with right approach.'
  } else {
    rating = 'poor'
    recommendation = 'Challenging conditions. Consider waiting for improvement.'
  }

  return {
    score: totalScore,
    rating,
    factors,
    recommendation,
  }
}

/**
 * Get wind direction as compass bearing
 */
export function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const index = Math.round(degrees / 45) % 8
  return directions[index]
}

/**
 * Get wind direction arrow emoji
 */
export function getWindArrow(degrees: number): string {
  const arrows = ['↓', '↙', '←', '↖', '↑', '↗', '→', '↘']
  const index = Math.round(degrees / 45) % 8
  return arrows[index]
}
