import { useState, useRef } from 'react'
import { Image, Upload, Loader2, Check, Palette } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppSettings, useUpdateAppSetting } from '../../hooks/useAppSettings'
import { toast } from 'sonner'
import { Callout, CalloutDescription } from '../ui/callout'

const BRANDING_KEYS = {
  LOGO_LIGHT: 'branding_logo_light_url',
  LOGO_DARK: 'branding_logo_dark_url',
  LOGO_ICON: 'branding_logo_icon_url',
  LOGO_ICON_LIGHT: 'branding_logo_icon_light_url',
  LOGO_ICON_DARK: 'branding_logo_icon_dark_url',
  SPLASH_LOGO: 'branding_splash_logo_url',
  SPLASH_BG_TYPE: 'branding_splash_bg_type', // 'solid' | 'gradient'
  SPLASH_BG_COLOR1: 'branding_splash_bg_color1',
  SPLASH_BG_COLOR2: 'branding_splash_bg_color2',
  SPLASH_GRADIENT_DIRECTION: 'branding_splash_gradient_direction',
  // Theme colors
  BORDER_COLOR: 'theme_border_color',
}

const DEFAULT_SPLASH_COLORS = {
  color1: '#0f172a',
  color2: '#1e3a5f',
  direction: 'to-b', // top to bottom
}

const DEFAULT_THEME_COLORS = {
  border: '#334155',
}

const GRADIENT_DIRECTIONS = [
  { value: 'to-t', label: '↑ Top' },
  { value: 'to-b', label: '↓ Bottom' },
  { value: 'to-l', label: '← Left' },
  { value: 'to-r', label: '→ Right' },
  { value: 'to-tl', label: '↖ Top Left' },
  { value: 'to-tr', label: '↗ Top Right' },
  { value: 'to-bl', label: '↙ Bottom Left' },
  { value: 'to-br', label: '↘ Bottom Right' },
]

export function BrandingSettingsSection() {
  const { data: settings, isLoading } = useAppSettings()
  const { mutate: updateSetting, isPending } = useUpdateAppSetting()
  
  const [uploading, setUploading] = useState<string | null>(null)
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({})
  
  const logoLightRef = useRef<HTMLInputElement>(null)
  const logoDarkRef = useRef<HTMLInputElement>(null)
  const logoIconRef = useRef<HTMLInputElement>(null)
  const logoIconLightRef = useRef<HTMLInputElement>(null)
  const logoIconDarkRef = useRef<HTMLInputElement>(null)
  const splashLogoRef = useRef<HTMLInputElement>(null)

  const getSettingValue = (key: string, defaultValue = ''): string => {
    if (localSettings[key] !== undefined) return localSettings[key]
    const setting = settings?.find(s => s.key === key)
    return String(setting?.value ?? defaultValue)
  }

  const handleLocalChange = (key: string, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (key: string, value: string) => {
    try {
      updateSetting({ key, value, category: 'branding' })
      toast.success('Setting saved')
    } catch {
      toast.error('Failed to save setting')
    }
  }

  const handleFileUpload = async (file: File, key: string) => {
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, SVG, or WebP image')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setUploading(key)
    try {
      const ext = file.name.split('.').pop() || 'png'
      const fileName = `${key.replace('branding_', '')}_${Date.now()}.${ext}`
      const filePath = `branding/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('catch-photos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('catch-photos')
        .getPublicUrl(filePath)

      updateSetting({ key, value: publicUrl, category: 'branding' })
      setLocalSettings(prev => ({ ...prev, [key]: publicUrl }))
      toast.success('Logo uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(null)
    }
  }

  const bgType = getSettingValue(BRANDING_KEYS.SPLASH_BG_TYPE, 'solid')
  const color1 = getSettingValue(BRANDING_KEYS.SPLASH_BG_COLOR1, DEFAULT_SPLASH_COLORS.color1)
  const color2 = getSettingValue(BRANDING_KEYS.SPLASH_BG_COLOR2, DEFAULT_SPLASH_COLORS.color2)
  const direction = getSettingValue(BRANDING_KEYS.SPLASH_GRADIENT_DIRECTION, DEFAULT_SPLASH_COLORS.direction)

  const getGradientStyle = () => {
    if (bgType === 'solid') {
      return { backgroundColor: color1 }
    }
    const dirMap: Record<string, string> = {
      'to-t': 'to top',
      'to-b': 'to bottom',
      'to-l': 'to left',
      'to-r': 'to right',
      'to-tl': 'to top left',
      'to-tr': 'to top right',
      'to-bl': 'to bottom left',
      'to-br': 'to bottom right',
    }
    return { background: `linear-gradient(${dirMap[direction] || 'to bottom'}, ${color1}, ${color2})` }
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

  const renderLogoUploader = (
    label: string,
    description: string,
    settingKey: string,
    inputRef: React.RefObject<HTMLInputElement | null>,
    currentUrl?: string
  ) => (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-24 items-center justify-center rounded-lg border border-dashed border-border bg-muted">
          {currentUrl || getSettingValue(settingKey) ? (
            <img
              src={currentUrl || getSettingValue(settingKey)}
              alt={label}
              className="max-h-14 max-w-20 object-contain"
            />
          ) : (
            <Image size={24} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, settingKey)
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading === settingKey}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {uploading === settingKey ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Upload size={12} />
            )}
            Upload
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
          <Image size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Branding</h2>
          <p className="text-xs text-muted-foreground">
            Customize logos and splash screen
          </p>
        </div>
      </div>

      {/* Logo Uploads */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">App Logos</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {renderLogoUploader(
            'Logo (Light Mode)',
            'Horizontal logo for light backgrounds',
            BRANDING_KEYS.LOGO_LIGHT,
            logoLightRef
          )}
          {renderLogoUploader(
            'Logo (Dark Mode)',
            'Horizontal logo for dark backgrounds',
            BRANDING_KEYS.LOGO_DARK,
            logoDarkRef
          )}
          {renderLogoUploader(
            'App Icon',
            'Square icon for app icon & favicon',
            BRANDING_KEYS.LOGO_ICON,
            logoIconRef
          )}
          {renderLogoUploader(
            'Collapsed Menu Icon (Light)',
            'Small icon for collapsed sidebar (light mode)',
            BRANDING_KEYS.LOGO_ICON_LIGHT,
            logoIconLightRef
          )}
          {renderLogoUploader(
            'Collapsed Menu Icon (Dark)',
            'Small icon for collapsed sidebar (dark mode)',
            BRANDING_KEYS.LOGO_ICON_DARK,
            logoIconDarkRef
          )}
          {renderLogoUploader(
            'Splash Logo',
            'Stacked logo for splash screen',
            BRANDING_KEYS.SPLASH_LOGO,
            splashLogoRef
          )}
        </div>
      </div>

      {/* Splash Background */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Splash Screen Background</h3>
        
        {/* Background Type Toggle */}
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              handleLocalChange(BRANDING_KEYS.SPLASH_BG_TYPE, 'solid')
              handleSave(BRANDING_KEYS.SPLASH_BG_TYPE, 'solid')
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              bgType === 'solid'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Solid Color
          </button>
          <button
            type="button"
            onClick={() => {
              handleLocalChange(BRANDING_KEYS.SPLASH_BG_TYPE, 'gradient')
              handleSave(BRANDING_KEYS.SPLASH_BG_TYPE, 'gradient')
            }}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              bgType === 'gradient'
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Gradient
          </button>
        </div>

        {/* Color Pickers */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <input
              type="color"
              value={color1}
              onChange={(e) => handleLocalChange(BRANDING_KEYS.SPLASH_BG_COLOR1, e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-lg border-2 border-border bg-transparent"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {bgType === 'solid' ? 'Background Color' : 'Start Color'}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{color1}</p>
            </div>
            <button
              type="button"
              onClick={() => handleSave(BRANDING_KEYS.SPLASH_BG_COLOR1, color1)}
              disabled={isPending}
              className="rounded-lg p-2 text-primary hover:bg-primary/10"
            >
              <Check size={14} />
            </button>
          </div>

          {bgType === 'gradient' && (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <input
                  type="color"
                  value={color2}
                  onChange={(e) => handleLocalChange(BRANDING_KEYS.SPLASH_BG_COLOR2, e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border-2 border-border bg-transparent"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">End Color</p>
                  <p className="font-mono text-xs text-muted-foreground">{color2}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSave(BRANDING_KEYS.SPLASH_BG_COLOR2, color2)}
                  disabled={isPending}
                  className="rounded-lg p-2 text-primary hover:bg-primary/10"
                >
                  <Check size={14} />
                </button>
              </div>

              <div className="lg:col-span-2">
                <p className="mb-2 text-sm font-medium text-foreground">Gradient Direction</p>
                <div className="flex flex-wrap gap-2">
                  {GRADIENT_DIRECTIONS.map((dir) => (
                    <button
                      key={dir.value}
                      type="button"
                      onClick={() => {
                        handleLocalChange(BRANDING_KEYS.SPLASH_GRADIENT_DIRECTION, dir.value)
                        handleSave(BRANDING_KEYS.SPLASH_GRADIENT_DIRECTION, dir.value)
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        direction === dir.value
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {dir.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Preview */}
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-foreground">Preview</p>
          <div
            className="flex h-48 w-full items-center justify-center rounded-xl"
            style={getGradientStyle()}
          >
            {getSettingValue(BRANDING_KEYS.SPLASH_LOGO) ? (
              <img
                src={getSettingValue(BRANDING_KEYS.SPLASH_LOGO)}
                alt="Splash logo"
                className="max-h-24 max-w-32 object-contain"
              />
            ) : (
              <div className="text-center text-white/60">
                <Palette size={32} className="mx-auto mb-2" />
                <p className="text-xs">Upload splash logo to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Colors */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Theme Colors</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Customize CSS variables that affect the app's appearance
        </p>
        
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Border Color */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <input
              type="color"
              value={getSettingValue(BRANDING_KEYS.BORDER_COLOR, DEFAULT_THEME_COLORS.border)}
              onChange={(e) => handleLocalChange(BRANDING_KEYS.BORDER_COLOR, e.target.value)}
              className="h-10 w-10 cursor-pointer rounded-lg border-2 border-border bg-transparent"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Border Color</p>
              <p className="font-mono text-xs text-muted-foreground">
                {getSettingValue(BRANDING_KEYS.BORDER_COLOR, DEFAULT_THEME_COLORS.border)}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Used for card borders, dividers, inputs
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSave(BRANDING_KEYS.BORDER_COLOR, getSettingValue(BRANDING_KEYS.BORDER_COLOR, DEFAULT_THEME_COLORS.border))}
              disabled={isPending}
              className="rounded-lg p-2 text-primary hover:bg-primary/10"
            >
              <Check size={14} />
            </button>
          </div>
        </div>

        {/* Reset to defaults */}
        <button
          type="button"
          onClick={() => {
            handleLocalChange(BRANDING_KEYS.BORDER_COLOR, DEFAULT_THEME_COLORS.border)
            handleSave(BRANDING_KEYS.BORDER_COLOR, DEFAULT_THEME_COLORS.border)
          }}
          className="mt-4 text-xs text-muted-foreground hover:text-foreground"
        >
          Reset to defaults
        </button>
      </div>

      {/* Info */}
      <Callout variant="info">
        <Palette />
        <CalloutDescription>
          <strong>Note:</strong> Uploaded logos will be used in the app dynamically. 
          Native app icon and splash screen require a new app build to update.
        </CalloutDescription>
      </Callout>
    </div>
  )
}
