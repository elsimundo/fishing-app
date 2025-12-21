import { useAppSettings } from './useAppSettings'

const BRANDING_KEYS = {
  LOGO_LIGHT: 'branding_logo_light_url',
  LOGO_DARK: 'branding_logo_dark_url',
  LOGO_ICON: 'branding_logo_icon_url',
  LOGO_ICON_LIGHT: 'branding_logo_icon_light_url',
  LOGO_ICON_DARK: 'branding_logo_icon_dark_url',
  PWA_ICON: 'branding_pwa_icon_url',
  SPLASH_LOGO: 'branding_splash_logo_url',
  SPLASH_BG_TYPE: 'branding_splash_bg_type',
  SPLASH_BG_COLOR1: 'branding_splash_bg_color1',
  SPLASH_BG_COLOR2: 'branding_splash_bg_color2',
  SPLASH_GRADIENT_DIRECTION: 'branding_splash_gradient_direction',
}

const DEFAULT_LOGOS = {
  light: '/catchi-logo-light.png',
  dark: '/catchi-logo-dark.png',
  icon: '/catchi-icon.png',
  splash: '/catchi-splash.png',
}

export function useBranding() {
  const { data: settings, isLoading } = useAppSettings()

  const getSettingValue = (key: string): string | null => {
    const setting = settings?.find(s => s.key === key)
    if (!setting?.value) return null
    // Value is stored as JSONB, so it might be a string or already parsed
    let val = setting.value
    if (typeof val === 'string') {
      // Try to parse if it's a JSON string
      try {
        val = JSON.parse(val)
      } catch {
        // Keep as-is if not valid JSON
      }
    }
    const strVal = String(val)
    return strVal && strVal !== 'null' && strVal !== 'undefined' ? strVal : null
  }

  // Collapsed icon falls back to main icon if not set
  const mainIcon = getSettingValue(BRANDING_KEYS.LOGO_ICON) || DEFAULT_LOGOS.icon

  return {
    isLoading,
    logoLight: getSettingValue(BRANDING_KEYS.LOGO_LIGHT) || DEFAULT_LOGOS.light,
    logoDark: getSettingValue(BRANDING_KEYS.LOGO_DARK) || DEFAULT_LOGOS.dark,
    logoIcon: mainIcon,
    logoIconLight: getSettingValue(BRANDING_KEYS.LOGO_ICON_LIGHT) || mainIcon,
    logoIconDark: getSettingValue(BRANDING_KEYS.LOGO_ICON_DARK) || mainIcon,
    pwaIcon: getSettingValue(BRANDING_KEYS.PWA_ICON) || mainIcon,
    splashLogo: getSettingValue(BRANDING_KEYS.SPLASH_LOGO) || DEFAULT_LOGOS.splash,
    splashBgType: getSettingValue(BRANDING_KEYS.SPLASH_BG_TYPE) || 'solid',
    splashBgColor1: getSettingValue(BRANDING_KEYS.SPLASH_BG_COLOR1) || '#0f172a',
    splashBgColor2: getSettingValue(BRANDING_KEYS.SPLASH_BG_COLOR2) || '#1e3a5f',
    splashGradientDirection: getSettingValue(BRANDING_KEYS.SPLASH_GRADIENT_DIRECTION) || 'to-b',
  }
}
