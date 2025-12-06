export interface TideStation {
  id: string
  name: string
  lat: number
  lng: number
  distance?: number // Distance from search location in km
  source: 'noaa' | 'worldtides' | 'uk-ea'
}

export interface TideReading {
  time: string // ISO timestamp
  level: number // Meters
  quality?: string // Data quality indicator
}

export interface TidePrediction {
  time: string // ISO timestamp
  height: number // Meters
  type: 'high' | 'low'
}

export interface TideGaugeData {
  station: TideStation
  latestReading?: TideReading
  readings?: TideReading[] // Historical readings
  predictions?: TidePrediction[] // Derived from readings
  fetchedAt: string
}

export interface TideData {
  station: TideStation
  predictions: TidePrediction[]
  current?: {
    height: number // Current tide height in meters
    type: 'rising' | 'falling'
    nextTide: TidePrediction
  }
  extremes?: {
    nextHigh: TidePrediction | null
    nextLow: TidePrediction | null
  }
  fetchedAt: string
  gaugeData?: TideGaugeData // Real-time gauge data (UK-EA)
}

export interface TideChartData {
  time: string
  height: number
  predicted?: boolean
}
