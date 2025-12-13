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
        root.style.setProperty('--color-navy-800', setting.value)
        break
      case 'primary_hover':
        root.style.setProperty('--color-teal-700', setting.value)
        root.style.setProperty('--color-navy-900', setting.value)
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
        // Only apply in dark mode
        if (root.classList.contains('dark') || !root.classList.contains('light')) {
          root.style.setProperty('--background', setting.value)
          root.style.setProperty('--sidebar', setting.value)
        }
        break
      case 'card_dark':
        if (root.classList.contains('dark') || !root.classList.contains('light')) {
          root.style.setProperty('--card', setting.value)
          root.style.setProperty('--popover', setting.value)
          root.style.setProperty('--sidebar-accent', setting.value)
        }
        break
      case 'background_light':
        if (root.classList.contains('light')) {
          root.style.setProperty('--background', setting.value)
          root.style.setProperty('--sidebar', setting.value)
        }
        break
      case 'card_light':
        if (root.classList.contains('light')) {
          root.style.setProperty('--card', setting.value)
          root.style.setProperty('--popover', setting.value)
        }
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
