import { Preferences } from '@capacitor/preferences'

const CACHE_PREFIX = 'cache_'
const DEFAULT_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface CachedData<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * Cache store for offline data persistence.
 * Uses Capacitor Preferences with TTL (time-to-live) support.
 */
export const cacheStore = {
  /**
   * Store data with optional TTL
   */
  async set<T>(key: string, data: T, ttl = DEFAULT_TTL): Promise<void> {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    }
    await Preferences.set({ 
      key: CACHE_PREFIX + key, 
      value: JSON.stringify(cached) 
    })
  },

  /**
   * Retrieve cached data (returns null if expired or not found)
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const { value } = await Preferences.get({ key: CACHE_PREFIX + key })
      if (!value) return null

      const cached: CachedData<T> = JSON.parse(value)
      const isExpired = Date.now() - cached.timestamp > cached.ttl

      if (isExpired) {
        await this.remove(key)
        return null
      }

      return cached.data
    } catch {
      return null
    }
  },

  /**
   * Remove a cached item
   */
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key: CACHE_PREFIX + key })
  },

  /**
   * Check if a cached item exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key)
    return data !== null
  },

  /**
   * Get cached data even if expired (useful for stale-while-revalidate)
   */
  async getStale<T>(key: string): Promise<{ data: T | null; isStale: boolean }> {
    try {
      const { value } = await Preferences.get({ key: CACHE_PREFIX + key })
      if (!value) return { data: null, isStale: false }

      const cached: CachedData<T> = JSON.parse(value)
      const isStale = Date.now() - cached.timestamp > cached.ttl

      return { data: cached.data, isStale }
    } catch {
      return { data: null, isStale: false }
    }
  },

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    const { keys } = await Preferences.keys()
    const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX))
    
    for (const key of cacheKeys) {
      await Preferences.remove({ key })
    }
  },
}

// Predefined cache keys for consistency
export const CACHE_KEYS = {
  MY_CATCHES: 'my_catches',
  MY_SESSIONS: 'my_sessions',
  MY_PROFILE: 'my_profile',
  SPECIES_LIST: 'species_list',
  SAVED_MARKS: 'saved_marks',
} as const

// Predefined TTLs
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000,      // 5 minutes
  MEDIUM: 60 * 60 * 1000,    // 1 hour
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  WEEK: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const
