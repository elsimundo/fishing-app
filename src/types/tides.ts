export interface TideStation {
  id: string
  name: string
  lat: number
  lng: number
  distance?: number // Distance from search location in km
  source: 'noaa' | 'worldtides'
}

export interface TidePrediction {
  time: string // ISO timestamp
  height: number // Meters
  type: 'high' | 'low'
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
}

export interface TideChartData {
  time: string
  height: number
  predicted?: boolean
}
