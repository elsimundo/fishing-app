import { useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Shield, Bell, Globe, Save } from 'lucide-react'

export default function AdminSettingsPage() {
  const [autoApprovePremium, setAutoApprovePremium] = useState(false)
  const [notifyOnSubmissions, setNotifyOnSubmissions] = useState(true)
  const [publicMode, setPublicMode] = useState(true)

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-900/10 text-navy-900">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">Settings</h1>
            <p className="text-sm text-gray-600">Manage admin preferences and defaults.</p>
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:p-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
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
          checked ? 'bg-navy-800' : 'bg-gray-300'
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
      <span className="text-sm text-gray-800">{label}</span>
    </label>
  )
}
