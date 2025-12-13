import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { Layout } from '../components/layout/Layout'
import { Handshake, ArrowLeft, Loader2 } from 'lucide-react'

export default function PartnerApplicationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    email: user?.email || '',
    phone: '',
    whyJoin: '',
    experience: '',
    expectedSignups: 10,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('You must be logged in to apply')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('partner_applications').insert({
        user_id: user.id,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || null,
        why_join: formData.whyJoin,
        experience: formData.experience || null,
        expected_signups: formData.expectedSignups,
      })

      if (error) throw error

      toast.success('Application submitted! We\'ll review it soon.')
      navigate('/logbook')
    } catch (error) {
      console.error('Application error:', error)
      toast.error('Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Layout>
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              <Handshake size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Become a Sales Partner</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Earn 25% recurring commission for every business you sign up
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 p-4">
            <h2 className="text-sm font-semibold text-foreground">Partner Benefits</h2>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>✓ <strong>25% recurring commission</strong> on every business you refer</li>
              <li>✓ <strong>Passive income</strong> - earn monthly as long as they stay subscribed</li>
              <li>✓ <strong>£5-15/month per business</strong> depending on their plan</li>
              <li>✓ <strong>No upfront costs</strong> - completely free to join</li>
              <li>✓ <strong>Flexible schedule</strong> - work when you want</li>
              <li>✓ <strong>Help local businesses</strong> get discovered by anglers</li>
            </ul>
          </div>

          {/* Example earnings */}
          <div className="mb-6 rounded-xl border border-purple-200 bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">Example Earnings</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sign up 10 businesses at £30/mo avg</span>
                <span className="font-semibold text-purple-700">£75/month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sign up 20 businesses at £35/mo avg</span>
                <span className="font-semibold text-purple-700">£175/month</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium text-foreground">Annual earnings (20 businesses)</span>
                <span className="text-lg font-bold text-purple-700">£2,100/year</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              These are recurring revenues - you earn every month they stay subscribed!
            </p>
          </div>

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground bg-background focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground bg-background focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground bg-background focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="+44 7700 900000"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Why do you want to become a partner? <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={formData.whyJoin}
                onChange={(e) => setFormData({ ...formData, whyJoin: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground bg-background focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="I'm passionate about fishing and know many local tackle shops and fisheries..."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Sales or marketing experience (optional)
              </label>
              <textarea
                rows={3}
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground bg-background focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="Previous sales roles, marketing experience, etc."
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                How many businesses do you think you can sign up?
              </label>
              <select
                value={formData.expectedSignups}
                onChange={(e) => setFormData({ ...formData, expectedSignups: Number(e.target.value) })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground bg-background focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value={5}>5 businesses</option>
                <option value={10}>10 businesses</option>
                <option value={15}>15 businesses</option>
                <option value={20}>20 businesses</option>
                <option value={30}>30+ businesses</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>
            </div>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            We'll review your application and get back to you within 2-3 business days.
          </p>
        </div>
      </main>
    </Layout>
  )
}
