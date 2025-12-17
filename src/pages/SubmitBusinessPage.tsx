import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { toast } from 'react-hot-toast'
import { Callout, CalloutDescription } from '../components/ui/callout'
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Globe,
  Mail,
  FileText,
  Loader2,
  CheckCircle,
  Info,
} from 'lucide-react'

type BusinessType = 'tackle_shop' | 'charter' | 'club' | 'guide'

interface FormData {
  name: string
  type: BusinessType
  description: string
  address: string
  city: string
  postcode: string
  phone: string
  email: string
  website: string
}

const BUSINESS_TYPES: { value: BusinessType; label: string; description: string }[] = [
  { value: 'tackle_shop', label: 'Tackle Shop', description: 'Fishing tackle and bait retailer' },
  { value: 'charter', label: 'Charter Boat', description: 'Fishing charter or boat hire service' },
  { value: 'club', label: 'Fishing Club', description: 'Angling club or society' },
  { value: 'guide', label: 'Fishing Guide', description: 'Professional fishing guide service' },
]

export default function SubmitBusinessPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: 'tackle_shop',
    description: '',
    address: '',
    city: '',
    postcode: '',
    phone: '',
    email: '',
    website: '',
  })

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      toast.error('Please log in to submit a business')
      return
    }

    if (!formData.name.trim() || !formData.address.trim() || !formData.city.trim()) {
      toast.error('Please fill in required fields')
      return
    }

    setIsSubmitting(true)

    try {
      // Geocode the address using Nominatim
      const searchQuery = `${formData.address}, ${formData.city}, ${formData.postcode}`.trim()
      const geocodeRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'User-Agent': 'FishingApp/1.0' } }
      )
      const geocodeData = await geocodeRes.json()

      let lat = 0
      let lng = 0

      if (geocodeData && geocodeData.length > 0) {
        lat = parseFloat(geocodeData[0].lat)
        lng = parseFloat(geocodeData[0].lon)
      } else {
        toast.error('Could not find address. Please check and try again.')
        setIsSubmitting(false)
        return
      }

      // Insert business
      const { error } = await supabase.from('businesses').insert({
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || null,
        address: formData.address.trim(),
        city: formData.city.trim(),
        postcode: formData.postcode.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        lat,
        lng,
        status: 'pending',
        source: 'user_submitted',
        created_by: user.id,
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
      })

      if (error) throw error

      setIsSuccess(true)
      toast.success('Business submitted for review!')
    } catch (error) {
      console.error('Error submitting business:', error)
      toast.error('Failed to submit business. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Layout>
        <div className="flex min-h-[80vh] items-center justify-center p-4">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Submission Received!</h1>
            <p className="mb-6 text-muted-foreground">
              Thank you for submitting your business. Our team will review it and get back to you
              within 2-3 business days.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate('/explore')}
                className="rounded-xl bg-navy-800 px-6 py-3 font-semibold text-white hover:bg-navy-900"
              >
                Back to Explore
              </button>
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setFormData({
                    name: '',
                    type: 'tackle_shop',
                    description: '',
                    address: '',
                    city: '',
                    postcode: '',
                    phone: '',
                    email: '',
                    website: '',
                  })
                }}
                className="text-sm font-semibold text-navy-800 hover:underline"
              >
                Submit Another Business
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-card px-4 py-3 shadow-sm">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 hover:bg-muted"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">List Your Business</h1>
            <p className="text-xs text-muted-foreground">Get discovered by local anglers</p>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="mx-auto max-w-lg p-4">
          {/* Business Type */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              Business Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BUSINESS_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => updateField('type', type.value)}
                  className={`rounded-xl border-2 p-3 text-left transition-colors ${
                    formData.type === type.value
                      ? 'border-navy-800 bg-navy-50'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <p className="text-sm font-semibold text-foreground">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Business Name */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              <Store size={14} className="mr-1 inline" />
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="e.g. Bob's Tackle & Bait"
              className="w-full rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
              required
            />
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              <MapPin size={14} className="mr-1 inline" />
              Street Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="e.g. 123 High Street"
              className="w-full rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
              required
            />
          </div>

          {/* City & Postcode */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="e.g. London"
                className="w-full rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-foreground">Postcode</label>
              <input
                type="text"
                value={formData.postcode}
                onChange={(e) => updateField('postcode', e.target.value)}
                placeholder="e.g. SW1A 1AA"
                className="w-full rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
              />
            </div>
          </div>

          {/* Phone */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              <Phone size={14} className="mr-1 inline" />
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="e.g. 020 1234 5678"
              className="w-full rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
            />
          </div>

          {/* Email */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              <Mail size={14} className="mr-1 inline" />
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="e.g. info@bobstackle.com"
              className="w-full rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
            />
          </div>

          {/* Website */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              <Globe size={14} className="mr-1 inline" />
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => updateField('website', e.target.value)}
              placeholder="e.g. https://www.bobstackle.com"
              className="w-full rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-foreground">
              <FileText size={14} className="mr-1 inline" />
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Tell anglers about your business, specialties, services offered..."
              rows={4}
              className="w-full resize-none rounded-xl border-2 border-border bg-background text-foreground px-4 py-3 text-sm focus:border-navy-800 focus:outline-none"
            />
          </div>

          {/* Info Box */}
          <div className="mb-6">
            <Callout variant="info">
              <Info />
              <CalloutDescription className="text-blue-800 dark:text-blue-200">
                <strong>What happens next?</strong>
                <br />
                Our team will review your submission within 2-3 business days. Once approved, your
                business will appear on the Explore map for local anglers to discover.
              </CalloutDescription>
            </Callout>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-navy-800 py-4 font-semibold text-white hover:bg-navy-900 disabled:bg-navy-400"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit for Review'
            )}
          </button>
        </form>
      </div>
    </Layout>
  )
}
