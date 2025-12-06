export interface TackleShop {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  phone?: string
  website?: string
  openingHours?: string
  shopType?: 'fishing' | 'outdoor' | 'sports'
  distance?: number
  source: 'osm'
  verified?: boolean
}

export interface TackleShopsResponse {
  shops: TackleShop[]
  fetchedAt: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
}
