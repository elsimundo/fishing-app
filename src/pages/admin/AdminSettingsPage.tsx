import { useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Shield, Save, CreditCard, Eye, EyeOff, ToggleLeft, Fish, Store, Users, Swords, Camera, Loader2 } from 'lucide-react'
import { useFeatureFlags, useUpdateFeatureFlag } from '../../hooks/useFeatureFlags'
import { ThemeSettingsSection } from '../../components/admin/ThemeSettingsSection'

export default function AdminSettingsPage() {
  const [autoApprovePremium, setAutoApprovePremium] = useState(false)
  const [notifyOnSubmissions, setNotifyOnSubmissions] = useState(true)
  const [publicMode, setPublicMode] = useState(true)
  
  // Feature flags
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags()
  const { mutate: updateFlag, isPending: isUpdating } = useUpdateFeatureFlag()

  // Stripe settings
  const [stripeSandboxMode, setStripeSandboxMode] = useState(true)
  const [stripePublishableKey, setStripePublishableKey] = useState('')
  const [stripeSecretKey, setStripeSecretKey] = useState('')
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState('')
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900/10 text-navy-900">
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
              onChange={setAutoApprovePremium}
            />
          </SettingCard>

          <SettingCard
            title="Notifications"
            description="Control when admins receive alerts for new submissions."
          >
            <Toggle
              label="Notify on new submissions"
              checked={notifyOnSubmissions}
              onChange={setNotifyOnSubmissions}
            />
          </SettingCard>

          <SettingCard
            title="Public Visibility"
            description="Temporarily disable public access for maintenance windows."
          >
            <Toggle label="Site is public" checked={publicMode} onChange={setPublicMode} />
          </SettingCard>

          <SettingCard
            title="Save Changes"
            description="Settings are local-only for now. Hook up to Supabase to persist."
          >
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-900"
            >
              <Save size={16} />
              Save (coming soon)
            </button>
          </SettingCard>
        </div>

        {/* Feature Flags */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
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
                onChange={(val) => updateFlag({ key: 'feature_freshwater_enabled', value: val })}
                isUpdating={isUpdating}
                color="blue"
              />
              <FeatureFlagCard
                icon={<Store size={20} />}
                title="Tackle Shops"
                description="Enable tackle shop listings and directory features."
                enabled={featureFlags?.find(f => f.key === 'feature_tackle_shops_enabled')?.value ?? false}
                onChange={(val) => updateFlag({ key: 'feature_tackle_shops_enabled', value: val })}
                isUpdating={isUpdating}
                color="green"
              />
              <FeatureFlagCard
                icon={<Users size={20} />}
                title="Fishing Clubs"
                description="Enable fishing club listings and membership features."
                enabled={featureFlags?.find(f => f.key === 'feature_clubs_enabled')?.value ?? false}
                onChange={(val) => updateFlag({ key: 'feature_clubs_enabled', value: val })}
                isUpdating={isUpdating}
                color="amber"
              />
              <FeatureFlagCard
                icon={<Swords size={20} />}
                title="Competitions"
                description="Enable fishing competitions and leaderboards."
                enabled={featureFlags?.find(f => f.key === 'feature_competitions_enabled')?.value ?? false}
                onChange={(val) => updateFlag({ key: 'feature_competitions_enabled', value: val })}
                isUpdating={isUpdating}
                color="purple"
              />
              <FeatureFlagCard
                icon={<Camera size={20} />}
                title="AI Fish Identifier"
                description="Enable AI-powered fish species identification from photos."
                enabled={featureFlags?.find(f => f.key === 'feature_ai_identifier_enabled')?.value ?? false}
                onChange={(val) => updateFlag({ key: 'feature_ai_identifier_enabled', value: val })}
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

        {/* Stripe Integration */}
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
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

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold text-blue-900">Setup Instructions</h3>
            <ol className="mt-2 space-y-1 text-xs text-blue-800">
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
}: {
  label: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-navy-800' : 'bg-muted'
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
    blue: enabled ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground',
    green: enabled ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
    amber: enabled ? 'bg-amber-100 text-amber-700' : 'bg-muted text-muted-foreground',
    purple: enabled ? 'bg-purple-100 text-purple-700' : 'bg-muted text-muted-foreground',
    rose: enabled ? 'bg-rose-100 text-rose-700' : 'bg-muted text-muted-foreground',
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
