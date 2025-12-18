import { useEffect } from 'react'
import { useThemeSettings, applyThemeSettings } from '../hooks/useThemeSettings'
import { useThemeColors } from '../hooks/useThemeColors'

/**
 * Component that loads and applies theme settings from the database.
 * Should be placed near the root of the app tree.
 */
export function ThemeLoader({ children }: { children: React.ReactNode }) {
  const { data: settings } = useThemeSettings()
  
  // Apply custom theme colors (border color, etc.) from admin settings
  useThemeColors()

  useEffect(() => {
    if (settings && settings.length > 0) {
      applyThemeSettings(settings)
    }
  }, [settings])

  return <>{children}</>
}
