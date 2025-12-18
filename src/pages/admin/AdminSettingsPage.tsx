import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Shield, Save, CreditCard, Eye, EyeOff, ToggleLeft, Fish, Store, Users, Swords, Camera, Loader2, Zap } from 'lucide-react'
import { useFeatureFlags, useUpdateFeatureFlag } from '../../hooks/useFeatureFlags'
import { ThemeSettingsSection } from '../../components/admin/ThemeSettingsSection'
import { BrandingSettingsSection } from '../../components/admin/BrandingSettingsSection'
import { useAppSettings, useUpdateAppSetting, useSpeciesTiers, useUpdateSpeciesTier } from '../../hooks/useAppSettings'
import { XP_SETTING_KEYS, XP_SETTING_LABELS, DEFAULT_XP_VALUES } from '../../types/appSettings'
import type { SpeciesTier } from '../../types/appSettings'
import { toast } from 'sonner'

const ADMIN_SETTING_KEYS = {
  AUTO_APPROVE_PREMIUM: 'admin_auto_approve_premium',
  NOTIFY_ON_SUBMISSIONS: 'admin_notify_on_submissions',
  PUBLIC_MODE: 'admin_public_mode',
} as const

export default function AdminSettingsPage() {
  const [autoApprovePremium, setAutoApprovePremium] = useState(false)
  const [notifyOnSubmissions, setNotifyOnSubmissions] = useState(true)
  const [publicMode, setPublicMode] = useState(true)
  
  // Feature flags
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags()
  const { mutateAsync: updateFlagAsync, isPending: isUpdating } = useUpdateFeatureFlag()

  const handleFlagChange = async (key: string, value: boolean) => {
    try {
      await updateFlagAsync({ key: key as any, value })
      toast.success('Feature flag updated')
    } catch (err) {
      toast.error('Failed to update feature flag')
      console.error('Feature flag update error:', err)
    }
  }

  // Stripe settings
  const [stripeSandboxMode, setStripeSandboxMode] = useState(true)
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  // XP Settings
  const { data: appSettings, isLoading: settingsLoading } = useAppSettings()
  const { mutate: updateSetting, mutateAsync: updateSettingAsync, isPending: isSettingUpdating } = useUpdateAppSetting()
  const { data: speciesTiers, isLoading: tiersLoading } = useSpeciesTiers()
  const { mutate: updateTier, isPending: isTierUpdating } = useUpdateSpeciesTier()
  const [editingTier, setEditingTier] = useState<string | null>(null)

  const getSettingValue = (key: string): string => {
    const setting = appSettings?.find(s => s.key === key)
    if (setting) {
      return String(setting.value).replace(/"/g, '')
    }
    const defaultVal = DEFAULT_XP_VALUES[key]
    return defaultVal !== undefined ? String(defaultVal) : ''
  }

  useEffect(() => {
    if (!appSettings) return

    const findBool = (key: string, defaultValue: boolean): boolean => {
      const setting = appSettings.find((s) => s.key === key)
      if (!setting) return defaultValue

      const raw = setting.value
      if (typeof raw === 'boolean') return raw
      if (typeof raw === 'string') return raw === 'true'
      return defaultValue
    }

    setAutoApprovePremium(findBool(ADMIN_SETTING_KEYS.AUTO_APPROVE_PREMIUM, false))
    setNotifyOnSubmissions(findBool(ADMIN_SETTING_KEYS.NOTIFY_ON_SUBMISSIONS, true))
    setPublicMode(findBool(ADMIN_SETTING_KEYS.PUBLIC_MODE, true))
  }, [appSettings])

  const handleSettingChange = (key: string, value: string | boolean) => {
    updateSetting({ key, value })
  }

  const setAdminSetting = async (params: {
    key: string
    value: boolean
    setLocal: (val: boolean) => void
    prevValue: boolean
  }) => {
    const { key, value, setLocal, prevValue } = params
    setLocal(value)

    try {
      await updateSettingAsync({ key, value, category: 'system' })
      toast.success('Saved')
    } catch {
      setLocal(prevValue)
      toast.error('Failed to save setting')
    }
  }

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-400/15 dark:text-yellow-300">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground lg:text-3xl">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage admin preferences and defaults.</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <SettingCard
            title="Business Moderation"
            description="Automatically approve premium businesses submitted by trusted owners."
          >
            <Toggle
              label="Auto-approve premium"
              checked={autoApprovePremium}
              onChange={(val) => {
                setAdminSetting({
                  key: ADMIN_SETTING_KEYS.AUTO_APPROVE_PREMIUM,
                  value: val,
                  setLocal: setAutoApprovePremium,
                  prevValue: autoApprovePremium,
                })
              }}
              disabled={isSettingUpdating}
            />
          </SettingCard>

          <SettingCard
            title="Notifications"
            description="Control when admins receive alerts for new submissions."
          >
            <Toggle
              label="Notify on new submissions"
              checked={notifyOnSubmissions}
              onChange={(val) => {
                setAdminSetting({
                  key: ADMIN_SETTING_KEYS.NOTIFY_ON_SUBMISSIONS,
                  value: val,
                  setLocal: setNotifyOnSubmissions,
                  prevValue: notifyOnSubmissions,
                })
              }}
              disabled={isSettingUpdating}
            />
          </SettingCard>

          <SettingCard
            title="Public Visibility"
            description="Temporarily disable public access for maintenance windows."
          >
            <Toggle
              label="Site is public"
              checked={publicMode}
              onChange={(val) => {
                setAdminSetting({
                  key: ADMIN_SETTING_KEYS.PUBLIC_MODE,
                  value: val,
                  setLocal: setPublicMode,
                  prevValue: publicMode,
                })
              }}
              disabled={isSettingUpdating}
            />
          </SettingCard>

          <SettingCard
            title="Save Changes"
            description="Settings are saved automatically."
          >
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:bg-primary/60"
            >
              <Save size={16} />
              Saved automatically
            </button>
          </SettingCard>
        </div>

        {/* Feature Flags */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200">
              <ToggleLeft size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Feature Flags</h2>
              <p className="text-sm text-muted-foreground">Enable or disable app features for launch phases</p>
            </div>
          </div>

          {flagsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <FeatureFlagCard
                icon={<Fish size={20} />}
                title="Freshwater Fishing"
                description="Enable freshwater species, challenges, and filters. Currently sea fishing only."
                enabled={featureFlags?.find(f => f.key === 'feature_freshwater_enabled')?.value ?? false}
                onChange={(val) => handleFlagChange('feature_freshwater_enabled', val)}
                isUpdating={isUpdating}
                color="blue"
              />
              <FeatureFlagCard
                icon={<Store size={20} />}
                title="Tackle Shops"
                description="Enable tackle shop listings and directory features."
                enabled={featureFlags?.find(f => f.key === 'feature_tackle_shops_enabled')?.value ?? false}
                onChange={(val) => handleFlagChange('feature_tackle_shops_enabled', val)}
                isUpdating={isUpdating}
                color="green"
              />
              <FeatureFlagCard
                icon={<Users size={20} />}
                title="Fishing Clubs"
                description="Enable fishing club listings and membership features."
                enabled={featureFlags?.find(f => f.key === 'feature_clubs_enabled')?.value ?? false}
                onChange={(val) => handleFlagChange('feature_clubs_enabled', val)}
                isUpdating={isUpdating}
                color="amber"
              />
              <FeatureFlagCard
                icon={<Swords size={20} />}
                title="Competitions"
                description="Enable fishing competitions and leaderboards."
                enabled={featureFlags?.find(f => f.key === 'feature_competitions_enabled')?.value ?? false}
                onChange={(val) => handleFlagChange('feature_competitions_enabled', val)}
                isUpdating={isUpdating}
                color="purple"
              />
              <FeatureFlagCard
                icon={<Camera size={20} />}
                title="AI Fish Identifier"
                description="Enable AI-powered fish species identification from photos."
                enabled={featureFlags?.find(f => f.key === 'feature_ai_identifier_enabled')?.value ?? false}
                onChange={(val) => handleFlagChange('feature_ai_identifier_enabled', val)}
                isUpdating={isUpdating}
                color="rose"
              />
            </div>
          )}
        </div>

        {/* Theme Settings */}
        <div className="mt-8">
          <ThemeSettingsSection />
        </div>

        {/* Branding Settings */}
        <div className="mt-8">
          <BrandingSettingsSection />
        </div>

        {/* XP & Gamification Settings */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">XP & Gamification</h2>
              <p className="text-sm text-muted-foreground">Configure XP values, species tiers, and rewards</p>
            </div>
          </div>

          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* XP Tier Values */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Species Tier XP Values</h3>
                <div className="grid gap-4 lg:grid-cols-4">
                  {[
                    { key: XP_SETTING_KEYS.TIER_COMMON, color: 'bg-slate-500/20 text-slate-300 border border-slate-500/30' },
                    { key: XP_SETTING_KEYS.TIER_STANDARD, color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
                    { key: XP_SETTING_KEYS.TIER_TROPHY, color: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' },
                    { key: XP_SETTING_KEYS.TIER_RARE, color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
                  ].map(({ key, color }) => (
                    <div key={key} className="rounded-xl border border-border bg-card p-4">
                      <div className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color} mb-2`}>
                        {XP_SETTING_LABELS[key].label.replace(' XP', '')}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={getSettingValue(key)}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          disabled={isSettingUpdating}
                          className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-lg font-bold text-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-sm text-muted-foreground">XP</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{XP_SETTING_LABELS[key].description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* XP Bonuses */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">XP Bonuses</h3>
                <div className="grid gap-4 lg:grid-cols-3">
                  {[
                    XP_SETTING_KEYS.FIRST_SPECIES,
                    XP_SETTING_KEYS.RELEASED_BONUS,
                    XP_SETTING_KEYS.FULL_DETAILS_BONUS,
                    XP_SETTING_KEYS.START_SESSION,
                    XP_SETTING_KEYS.REFERRAL_SIGNUP,
                    XP_SETTING_KEYS.PB_MULTIPLIER,
                  ].map((key) => (
                    <div key={key} className="rounded-xl border border-border bg-card p-4">
                      <p className="text-sm font-medium text-foreground">{XP_SETTING_LABELS[key].label}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          value={getSettingValue(key)}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          disabled={isSettingUpdating}
                          className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-lg font-bold text-foreground focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <span className="text-sm text-muted-foreground">
                          {key === XP_SETTING_KEYS.PB_MULTIPLIER ? 'x multiplier' : 'XP'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{XP_SETTING_LABELS[key].description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* XP Rules */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">XP Rules</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{XP_SETTING_LABELS[XP_SETTING_KEYS.REQUIRE_PHOTO].label}</p>
                        <p className="text-xs text-muted-foreground">{XP_SETTING_LABELS[XP_SETTING_KEYS.REQUIRE_PHOTO].description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSettingChange(XP_SETTING_KEYS.REQUIRE_PHOTO, getSettingValue(XP_SETTING_KEYS.REQUIRE_PHOTO) !== 'true')}
                        disabled={isSettingUpdating}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          getSettingValue(XP_SETTING_KEYS.REQUIRE_PHOTO) === 'true' ? 'bg-emerald-500' : 'bg-muted'
                        }`}
                      >
                        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          getSettingValue(XP_SETTING_KEYS.REQUIRE_PHOTO) === 'true' ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{XP_SETTING_LABELS[XP_SETTING_KEYS.BACKLOG_EARNS].label}</p>
                        <p className="text-xs text-muted-foreground">{XP_SETTING_LABELS[XP_SETTING_KEYS.BACKLOG_EARNS].description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSettingChange(XP_SETTING_KEYS.BACKLOG_EARNS, getSettingValue(XP_SETTING_KEYS.BACKLOG_EARNS) !== 'true')}
                        disabled={isSettingUpdating}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          getSettingValue(XP_SETTING_KEYS.BACKLOG_EARNS) === 'true' ? 'bg-emerald-500' : 'bg-muted'
                        }`}
                      >
                        <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          getSettingValue(XP_SETTING_KEYS.BACKLOG_EARNS) === 'true' ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Species Tiers Management */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Species Tier Assignments</h3>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  {tiersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Species</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Tier</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Base XP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {speciesTiers?.map((tier) => (
                            <tr key={tier.species} className="hover:bg-muted/50">
                              <td className="px-4 py-2 font-medium text-foreground">{tier.species}</td>
                              <td className="px-4 py-2">
                                {editingTier === tier.species ? (
                                  <select
                                    value={tier.tier}
                                    onChange={(e) => {
                                      const newTier = e.target.value as SpeciesTier
                                      const xpMap: Record<SpeciesTier, number> = {
                                        common: Number(getSettingValue(XP_SETTING_KEYS.TIER_COMMON)) || 5,
                                        standard: Number(getSettingValue(XP_SETTING_KEYS.TIER_STANDARD)) || 10,
                                        trophy: Number(getSettingValue(XP_SETTING_KEYS.TIER_TROPHY)) || 15,
                                        rare: Number(getSettingValue(XP_SETTING_KEYS.TIER_RARE)) || 20,
                                      }
                                      updateTier({ species: tier.species, tier: newTier, base_xp: xpMap[newTier] })
                                      setEditingTier(null)
                                    }}
                                    disabled={isTierUpdating}
                                    className="rounded border border-border bg-background px-2 py-1 text-foreground"
                                  >
                                    <option value="common">Common</option>
                                    <option value="standard">Standard</option>
                                    <option value="trophy">Trophy</option>
                                    <option value="rare">Rare</option>
                                  </select>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditingTier(tier.species)}
                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                      tier.tier === 'common' ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30' :
                                      tier.tier === 'standard' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                      tier.tier === 'trophy' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                      'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    }`}
                                  >
                                    {tier.tier.charAt(0).toUpperCase() + tier.tier.slice(1)}
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">{tier.base_xp} XP</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Click on a tier badge to change it. Changes are saved automatically.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Stripe Integration */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
              <CreditCard size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Stripe Integration</h2>
              <p className="text-sm text-muted-foreground">Configure Stripe for partner payouts and subscriptions</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SettingCard
              title="Environment Mode"
              description="Use sandbox mode for testing. Switch to live when ready to process real payments."
            >
              <Toggle
                label="Sandbox mode (test keys)"
                checked={stripeSandboxMode}
                onChange={setStripeSandboxMode}
              />
              {stripeSandboxMode && (
                <p className="mt-2 text-xs text-amber-600">
                  ⚠️ Using test mode - no real money will be processed
                </p>
              )}
              {!stripeSandboxMode && (
                <p className="mt-2 text-xs text-green-600">
                  ✓ Live mode - real payments will be processed
                </p>
              )}
            </SettingCard>

            <SettingCard
              title="API Keys"
              description="Get these from your Stripe dashboard. Keep secret keys secure."
            >
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Publishable Key {stripeSandboxMode ? '(Test)' : '(Live)'}
                  </label>
                  <input
                    type="text"
                    value={stripePublishableKey}
                    onChange={(e) => setStripePublishableKey(e.target.value)}
                    placeholder={stripeSandboxMode ? 'pk_test_...' : 'pk_live_...'}
                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Secret Key {stripeSandboxMode ? '(Test)' : '(Live)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecretKey ? 'text' : 'password'}
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      placeholder={stripeSandboxMode ? 'sk_test_...' : 'sk_live_...'}
                      className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretKey(!showSecretKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Webhook Configuration"
              description="Set up webhooks to receive payment events from Stripe."
            >
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Webhook Endpoint URL
                  </label>
                  <input
                    type="text"
                    value="https://your-app.com/api/stripe/webhook"
                    readOnly
                    className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add this URL to your Stripe dashboard webhooks
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    Webhook Signing Secret
                  </label>
                  <div className="relative">
                    <input
                      type={showWebhookSecret ? 'text' : 'password'}
                      value={stripeWebhookSecret}
                      onChange={(e) => setStripeWebhookSecret(e.target.value)}
                      placeholder="whsec_..."
                      className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="Partner Payouts"
              description="Configure how partner commissions are paid out via Stripe Connect."
            >
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>✓ Automated instant payouts</p>
                <p>✓ 1.5% Stripe fee (deducted automatically)</p>
                <p>✓ Partners connect their own Stripe account</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Once configured, partners will be able to connect their Stripe account and receive
                  automated monthly payouts.
                </p>
              </div>
            </SettingCard>
          </div>

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Setup Instructions</h3>
            <ol className="mt-2 space-y-1 text-xs text-blue-800 dark:text-blue-200/90">
              <li>1. Create a Stripe account at stripe.com</li>
              <li>2. Get your API keys from the Stripe dashboard</li>
              <li>3. Enable Stripe Connect for partner payouts</li>
              <li>4. Add the webhook endpoint URL to Stripe</li>
              <li>5. Copy the webhook signing secret here</li>
              <li>6. Test in sandbox mode first, then switch to live</li>
            </ol>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

function SettingCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className={`flex items-center gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-yellow-400' : 'bg-muted'
        }`}
      >
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
      <input
        type="checkbox"
        className="hidden"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}

function FeatureFlagCard({
  icon,
  title,
  description,
  enabled,
  onChange,
  isUpdating,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  enabled: boolean
  onChange: (val: boolean) => void
  isUpdating: boolean
  color: 'blue' | 'green' | 'amber' | 'purple' | 'rose'
}) {
  const colorClasses = {
    blue: enabled ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'bg-muted text-muted-foreground',
    green: enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' : 'bg-muted text-muted-foreground',
    amber: enabled ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' : 'bg-muted text-muted-foreground',
    purple: enabled ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' : 'bg-muted text-muted-foreground',
    rose: enabled ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' : 'bg-muted text-muted-foreground',
  }

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-colors ${
      enabled ? 'border-border bg-card' : 'border-border bg-muted'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>{title}</h3>
            <button
              type="button"
              onClick={() => onChange(!enabled)}
              disabled={isUpdating}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                enabled ? 'bg-emerald-500' : 'bg-muted'
              } ${isUpdating ? 'opacity-50' : ''}`}
            >
              <span
                className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          <p className={`mt-1 text-sm ${enabled ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{description}</p>
          <p className={`mt-2 text-xs font-medium ${enabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            {enabled ? '✓ Enabled' : '○ Disabled'}
          </p>
        </div>
      </div>
    </div>
  )
}
