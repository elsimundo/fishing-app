import { useState, useEffect } from 'react'
import { Palette, Check, RotateCcw, Loader2, Info } from 'lucide-react'
import { useThemeSettings, useUpdateThemeSetting, applyThemeSettings, type ThemeSetting } from '../../hooks/useThemeSettings'
import { toast } from 'sonner'
import { Callout, CalloutDescription } from '../ui/callout'

// Default theme colors for reset
const DEFAULT_COLORS: Record<string, string> = {
  primary: '#1BA9A0',
  primary_hover: '#0D9488',
  secondary: '#0D4B4E',
  accent: '#14B8A6',
  background_dark: '#1A2D3D',
  card_dark: '#243B4A',
  background_light: '#F8FAFC',
  card_light: '#FFFFFF',
}

export function ThemeSettingsSection() {
  const { data: settings, isLoading } = useThemeSettings()
  const updateSetting = useUpdateThemeSetting()
  const [localColors, setLocalColors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize local colors from settings
  useEffect(() => {
    if (settings) {
      const colors: Record<string, string> = {}
      settings.forEach((s) => {
        colors[s.key] = s.value
      })
      setLocalColors(colors)
    }
  }, [settings])

  const handleColorChange = (key: string, value: string) => {
    setLocalColors((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async (key: string) => {
    try {
      await updateSetting.mutateAsync({ key, value: localColors[key] })
      toast.success('Color updated')
      // Apply immediately
      if (settings) {
        const updatedSettings = settings.map((s) =>
          s.key === key ? { ...s, value: localColors[key] } : s
        )
        applyThemeSettings(updatedSettings)
      }
    } catch (error) {
      toast.error('Failed to update color')
    }
  }

  const handleSaveAll = async () => {
    try {
      const promises = Object.entries(localColors).map(([key, value]) =>
        updateSetting.mutateAsync({ key, value })
      )
      await Promise.all(promises)
      toast.success('All colors saved')
      setHasChanges(false)
      // Apply all changes
      if (settings) {
        const updatedSettings = settings.map((s) => ({
          ...s,
          value: localColors[s.key] || s.value,
        }))
        applyThemeSettings(updatedSettings)
      }
    } catch (error) {
      toast.error('Failed to save colors')
    }
  }

  const handleReset = (key: string) => {
    const defaultValue = DEFAULT_COLORS[key]
    if (defaultValue) {
      setLocalColors((prev) => ({ ...prev, [key]: defaultValue }))
      setHasChanges(true)
    }
  }

  const handleResetAll = () => {
    setLocalColors(DEFAULT_COLORS)
    setHasChanges(true)
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Group settings by category
  const brandColors = settings?.filter((s) =>
    ['primary', 'primary_hover', 'secondary', 'accent'].includes(s.key)
  )
  const darkModeColors = settings?.filter((s) =>
    ['background_dark', 'card_dark'].includes(s.key)
  )
  const lightModeColors = settings?.filter((s) =>
    ['background_light', 'card_light'].includes(s.key)
  )

  const renderColorPicker = (setting: ThemeSetting) => (
    <div
      key={setting.key}
      className="flex items-center justify-between rounded-lg border border-border bg-background p-3"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={localColors[setting.key] || setting.value}
            onChange={(e) => handleColorChange(setting.key, e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-lg border-2 border-border bg-transparent"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{setting.label}</p>
          <p className="text-xs text-muted-foreground">{setting.description}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
            {localColors[setting.key] || setting.value}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleReset(setting.key)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Reset to default"
        >
          <RotateCcw size={14} />
        </button>
        <button
          type="button"
          onClick={() => handleSave(setting.key)}
          disabled={updateSetting.isPending}
          className="rounded-lg p-2 text-primary hover:bg-primary/10"
          title="Save this color"
        >
          <Check size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Palette size={20} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Theme Settings</h2>
            <p className="text-xs text-muted-foreground">
              Customize your app's brand colors
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAll}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RotateCcw size={12} />
            Reset All
          </button>
          {hasChanges && (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={updateSetting.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {updateSetting.isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Check size={12} />
              )}
              Save All
            </button>
          )}
        </div>
      </div>

      {/* Brand Colors */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Brand Colors</h3>
        <div className="space-y-2">
          {brandColors?.map(renderColorPicker)}
        </div>
      </div>

      {/* Dark Mode Colors */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Dark Mode</h3>
        <div className="space-y-2">
          {darkModeColors?.map(renderColorPicker)}
        </div>
      </div>

      {/* Light Mode Colors */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Light Mode</h3>
        <div className="space-y-2">
          {lightModeColors?.map(renderColorPicker)}
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Preview</h3>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: localColors.primary || DEFAULT_COLORS.primary }}
            >
              Primary Button
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: localColors.primary_hover || DEFAULT_COLORS.primary_hover }}
            >
              Hover State
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: localColors.secondary || DEFAULT_COLORS.secondary }}
            >
              Secondary
            </button>
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: localColors.accent || DEFAULT_COLORS.accent }}
            >
              Accent
            </button>
          </div>
          <div className="flex gap-2">
            <div
              className="flex h-16 w-24 items-center justify-center rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: localColors.background_dark || DEFAULT_COLORS.background_dark }}
            >
              Dark BG
            </div>
            <div
              className="flex h-16 w-24 items-center justify-center rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: localColors.card_dark || DEFAULT_COLORS.card_dark }}
            >
              Dark Card
            </div>
            <div
              className="flex h-16 w-24 items-center justify-center rounded-lg border border-border text-xs font-medium text-slate-900"
              style={{ backgroundColor: localColors.background_light || DEFAULT_COLORS.background_light }}
            >
              Light BG
            </div>
            <div
              className="flex h-16 w-24 items-center justify-center rounded-lg border border-border text-xs font-medium text-slate-900"
              style={{ backgroundColor: localColors.card_light || DEFAULT_COLORS.card_light }}
            >
              Light Card
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <Callout variant="info">
        <Info />
        <CalloutDescription>
          <strong>Note:</strong> Changes are applied immediately for preview. Click "Save" to persist changes.
          Some components using hardcoded colors (like{' '}
          <code className="rounded bg-blue-100 dark:bg-blue-900/50 px-1">bg-[#1BA9A0]</code>)
          will need a page refresh to see updates.
        </CalloutDescription>
      </Callout>
    </div>
  )
}
