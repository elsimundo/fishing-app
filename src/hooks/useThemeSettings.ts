import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ThemeSetting {
  id: string
  key: string
  value: string
  label: string
  description: string | null
  created_at: string
  updated_at: string
}

export function useThemeSettings() {
  return useQuery({
    queryKey: ['theme-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('theme_settings')
        .select('*')
        .order('key')

      if (error) throw error
      return data as ThemeSetting[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useUpdateThemeSetting() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { data, error } = await supabase
        .from('theme_settings')
        .update({ value })
        .eq('key', key)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-settings'] })
    },
  })
}

// Apply theme settings to CSS custom properties
export function applyThemeSettings(settings: ThemeSetting[]) {
  const root = document.documentElement

  root.style.removeProperty('--background')
  root.style.removeProperty('--card')
  root.style.removeProperty('--popover')
  root.style.removeProperty('--sidebar')
  root.style.removeProperty('--sidebar-accent')

  settings.forEach((setting) => {
    switch (setting.key) {
      case 'primary':
        root.style.setProperty('--primary', setting.value)
        root.style.setProperty('--color-primary', setting.value)
        root.style.setProperty('--ring', setting.value)
        root.style.setProperty('--sidebar-primary', setting.value)
        root.style.setProperty('--sidebar-ring', setting.value)
        // Also update the teal-600 and navy-800 aliases
        root.style.setProperty('--color-teal-600', setting.value)
        break
      case 'primary_hover':
        root.style.setProperty('--color-teal-700', setting.value)
        break
      case 'secondary':
        root.style.setProperty('--secondary', setting.value)
        root.style.setProperty('--color-secondary', setting.value)
        root.style.setProperty('--color-teal-800', setting.value)
        break
      case 'accent':
        root.style.setProperty('--accent', setting.value)
        root.style.setProperty('--color-accent', setting.value)
        root.style.setProperty('--color-teal-500', setting.value)
        break
      case 'background_dark':
        root.style.setProperty('--background-dark', setting.value)
        root.style.setProperty('--sidebar-dark', setting.value)
        break
      case 'card_dark':
        root.style.setProperty('--card-dark', setting.value)
        root.style.setProperty('--popover-dark', setting.value)
        root.style.setProperty('--sidebar-accent-dark', setting.value)
        break
      case 'background_light':
        root.style.setProperty('--background-light', setting.value)
        root.style.setProperty('--sidebar-light', setting.value)
        break
      case 'card_light':
        root.style.setProperty('--card-light', setting.value)
        root.style.setProperty('--popover-light', setting.value)
        break
    }
  })
}

// Hook to load and apply theme settings on mount
export function useApplyThemeSettings() {
  const { data: settings } = useThemeSettings()

  // Apply settings when they change
  if (settings && settings.length > 0) {
    applyThemeSettings(settings)
  }

  return settings
}
