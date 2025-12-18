import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface ApiUsageSummary {
  api_name: string
  total_calls: number
  calls_today: number
  calls_this_week: number
  calls_this_month: number
}

interface ApiUsageDaily {
  api_name: string
  date: string
  call_count: number
}

export function useApiUsageSummary(daysBack = 30) {
  return useQuery({
    queryKey: ['api-usage-summary', daysBack],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_api_usage_summary', {
        days_back: daysBack,
      })

      if (error) throw error
      return (data as ApiUsageSummary[]) || []
    },
  })
}

export function useApiUsageDaily(daysBack = 7) {
  return useQuery({
    queryKey: ['api-usage-daily', daysBack],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysBack)

      const { data, error } = await supabase
        .from('api_usage_daily')
        .select('*')
        .gte('date', startDate.toISOString())
        .order('date', { ascending: false })

      if (error) throw error
      return (data as ApiUsageDaily[]) || []
    },
  })
}

// Estimated costs per API (rough estimates - adjust as needed)
export const API_COST_ESTIMATES: Record<string, { perCall: number; unit: string; notes: string }> = {
  mapbox_geocoding: { perCall: 0.0005, unit: 'USD', notes: '$5 per 10,000 requests' },
  mapbox_tiles: { perCall: 0.00025, unit: 'USD', notes: 'Free tier: 200k/month, then $0.25/1000' },
  mapbox_directions: { perCall: 0.001, unit: 'USD', notes: '$1 per 1,000 requests' },
  open_meteo_weather: { perCall: 0, unit: 'USD', notes: 'Free for non-commercial' },
  open_meteo_marine: { perCall: 0, unit: 'USD', notes: 'Free for non-commercial' },
  worldtides: { perCall: 0.001, unit: 'USD', notes: 'Varies by plan' },
  noaa_tides: { perCall: 0, unit: 'USD', notes: 'Free US government API' },
  environment_agency_tides: { perCall: 0, unit: 'USD', notes: 'Free UK government API' },
  openstreetmap: { perCall: 0, unit: 'USD', notes: 'Free with attribution' },
  other: { perCall: 0, unit: 'USD', notes: 'Unknown' },
}
