import { useEffect } from 'react'
import { useAppSettings } from './useAppSettings'

const THEME_COLOR_KEYS = {
  BORDER_COLOR: 'theme_border_color',
}

const DEFAULT_COLORS = {
  border: '#334155',
}

/**
 * Hook that applies custom theme colors from app settings to CSS variables.
 * Should be called once at the app root level.
 */
export function useThemeColors() {
  const { data: settings, isLoading } = useAppSettings()

  useEffect(() => {
    if (isLoading || !settings) return

    // Apply border color
    const borderSetting = settings.find(s => s.key === THEME_COLOR_KEYS.BORDER_COLOR)
    const borderColor = borderSetting?.value as string || DEFAULT_COLORS.border
    
    if (borderColor) {
      document.documentElement.style.setProperty('--border', borderColor)
      document.documentElement.style.setProperty('--input', borderColor)
      document.documentElement.style.setProperty('--sidebar-border', borderColor)
    }
  }, [settings, isLoading])

  return {
    isLoading,
  }
}

/**
 * Get a specific theme color value
 */
export function useThemeColor(key: keyof typeof THEME_COLOR_KEYS): string {
  const { data: settings } = useAppSettings()
  
  const settingKey = THEME_COLOR_KEYS[key]
  const setting = settings?.find(s => s.key === settingKey)
  
  return (setting?.value as string) || DEFAULT_COLORS[key.toLowerCase() as keyof typeof DEFAULT_COLORS] || ''
}
