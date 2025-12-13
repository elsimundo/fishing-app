import { useEffect } from 'react'
import { useThemeSettings, applyThemeSettings } from '../hooks/useThemeSettings'

/**
 * Component that loads and applies theme settings from the database.
 * Should be placed near the root of the app tree.
 */
export function ThemeLoader({ children }: { children: React.ReactNode }) {
  const { data: settings } = useThemeSettings()

  useEffect(() => {
    if (settings && settings.length > 0) {
      applyThemeSettings(settings)
    }
  }, [settings])

  return <>{children}</>
}
