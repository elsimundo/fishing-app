import { useState, useRef } from 'react'
import { X, ChevronRight, ChevronLeft, Upload, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import type { Lake, LakeClaimRole, LakeClaimProofType, LakeClaimDetails, LakeType, LakeWaterType } from '../../types'

interface ClaimLakeModalProps {
  lake: Lake
  userId: string
  onClose: () => void
  onSuccess: () => void
}

const ROLE_OPTIONS: { value: LakeClaimRole; label: string }[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff Member' },
  { value: 'committee', label: 'Club Committee' },
  { value: 'other', label: 'Other' },
]

const PROOF_TYPE_OPTIONS: { value: LakeClaimProofType; label: string }[] = [
  { value: 'insurance', label: 'Insurance Certificate' },
  { value: 'lease', label: 'Lease Agreement' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'companies_house', label: 'Companies House Listing' },
  { value: 'club_membership', label: 'Club Membership / Committee Doc' },
  { value: 'website_admin', label: 'Website Admin Access' },
  { value: 'other', label: 'Other Document' },
]

const WATER_TYPE_OPTIONS: { value: LakeWaterType; label: string }[] = [
  { value: 'lake', label: 'Lake' },
  { value: 'pond', label: 'Pond' },
  { value: 'reservoir', label: 'Reservoir' },
  { value: 'river', label: 'River' },
  { value: 'canal', label: 'Canal' },
  { value: 'other', label: 'Other' },
]

const LAKE_TYPE_OPTIONS: { value: LakeType; label: string }[] = [
  { value: 'commercial', label: 'Commercial Fishery' },
  { value: 'day_ticket', label: 'Day Ticket Water' },
  { value: 'syndicate', label: 'Syndicate' },
  { value: 'club', label: 'Club Water' },
  { value: 'public', label: 'Public Water' },
  { value: 'private', label: 'Private' },
]

const FACILITY_OPTIONS = [
  'Parking',
  'Toilets',
  'Café / Food',
  'Tackle Shop',
  'Bait Available',
  'Night Fishing',
  'Disabled Access',
  'Camping / Bivvying',
  'Electric Hook-ups',
  'Showers',
]

type Step = 1 | 2 | 3 | 4

export function ClaimLakeModal({ lake, userId, onClose, onSuccess }: ClaimLakeModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Step 1: Role & Contact
  const [role, setRole] = useState<LakeClaimRole | ''>('')
  const [businessName, setBusinessName] = useState('')
  const [website, setWebsite] = useState(lake.website || '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Step 2: Proof
  const [proofType, setProofType] = useState<LakeClaimProofType | ''>('')
  const [proofUrl, setProofUrl] = useState('')
  const [proofFileName, setProofFileName] = useState('')

  // Step 3: Venue Details
  const [waterType, setWaterType] = useState<LakeWaterType | ''>(lake.water_type || '')
  const [lakeType, setLakeType] = useState<LakeType | ''>(lake.lake_type || '')
  const [dayTicketPrice, setDayTicketPrice] = useState(lake.day_ticket_price?.toString() || '')
  const [nightTicketPrice, setNightTicketPrice] = useState(lake.night_ticket_price?.toString() || '')
  const [facilities, setFacilities] = useState<string[]>([])
  const [description, setDescription] = useState(lake.description || '')

  // Step 4: Commercial
  const [interestedInPremium, setInterestedInPremium] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const canProceedStep1 = role !== '' && email.trim() !== ''
  const canProceedStep2 = proofType !== ''
  const canProceedStep3 = true // All optional
  const canSubmit = termsAccepted

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB')
      return
    }

    setIsUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `claim-proofs/${userId}/${lake.id}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(path, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path)
      setProofUrl(urlData.publicUrl)
      setProofFileName(file.name)
      toast.success('File uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const toggleFacility = (facility: string) => {
    setFacilities((prev) =>
      prev.includes(facility) ? prev.filter((f) => f !== facility) : [...prev, facility]
    )
  }

  const handleSubmit = async () => {
    if (!canSubmit || !role) return

    setIsSubmitting(true)
    try {
      const lakeDetails: LakeClaimDetails = {
        water_type: waterType || undefined,
        lake_type: lakeType || undefined,
        day_ticket_price: dayTicketPrice ? parseFloat(dayTicketPrice) : undefined,
        night_ticket_price: nightTicketPrice ? parseFloat(nightTicketPrice) : undefined,
        facilities: facilities.length > 0 ? facilities : undefined,
        description: description.trim() || undefined,
      }

      let targetLakeId = lake.id

      // If this is an OSM lake, create a DB lake first
      const isOsmLake = typeof lake.id === 'string' && lake.id.startsWith('osm-')
      if (isOsmLake) {
        // Create a new DB lake from OSM data
        const { data: newLake, error: createError } = await supabase
          .from('lakes')
          .insert({
            name: lake.name,
            latitude: lake.latitude,
            longitude: lake.longitude,
            region: lake.region || null,
            water_type: waterType || lake.water_type || 'lake',
            lake_type: lakeType || lake.lake_type || null,
            day_ticket_price: dayTicketPrice ? parseFloat(dayTicketPrice) : null,
            night_ticket_price: nightTicketPrice ? parseFloat(nightTicketPrice) : null,
            website: website.trim() || null,
            description: description.trim() || null,
            is_verified: false, // Will be verified when claim is approved
            is_premium: false,
            is_founding_venue: true, // Early adopter!
          })
          .select('id')
          .single()

        if (createError) throw createError
        if (!newLake) throw new Error('Failed to create lake')

        targetLakeId = newLake.id
      }

      // Now create the claim against the DB lake
      const { error } = await supabase.from('lake_claims').insert({
        lake_id: targetLakeId,
        user_id: userId,
        role,
        business_name: businessName.trim() || null,
        website: website.trim() || null,
        phone: phone.trim() || null,
        email: email.trim(),
        proof_type: proofType || null,
        proof_url: proofUrl || null,
        lake_details: lakeDetails,
        interested_in_premium: interestedInPremium,
        terms_accepted: termsAccepted,
      })

      if (error) throw error

      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit claim')
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => setStep((s) => Math.min(s + 1, 4) as Step)
  const prevStep = () => setStep((s) => Math.max(s - 1, 1) as Step)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Claim {lake.name}</h2>
            <p className="text-xs text-gray-500">Step {step} of 4</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Your Role & Contact</h3>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Your role at this venue *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as LakeClaimRole)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select role...</option>
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Business name (if different)
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder={lake.name}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Website</label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Proof of Ownership</h3>
              <p className="text-sm text-gray-500">
                Help us verify you're authorised to manage this venue. This speeds up approval.
              </p>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Document type *
                </label>
                <select
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value as LakeClaimProofType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select type...</option>
                  {PROOF_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Upload document (optional but recommended)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {proofUrl ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="flex-1 truncate text-sm text-green-700">{proofFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setProofUrl('')
                        setProofFileName('')
                      }}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Click to upload (PDF, image, or doc)
                      </>
                    )}
                  </button>
                )}
                <p className="mt-1 text-xs text-gray-400">Max 10MB. We keep this private.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Venue Details</h3>
              <p className="text-sm text-gray-500">
                Help anglers find your venue. You can update these later.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Water type</label>
                  <select
                    value={waterType}
                    onChange={(e) => setWaterType(e.target.value as LakeWaterType)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select...</option>
                    {WATER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Venue type</label>
                  <select
                    value={lakeType}
                    onChange={(e) => setLakeType(e.target.value as LakeType)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Select...</option>
                    {LAKE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Day ticket (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={dayTicketPrice}
                    onChange={(e) => setDayTicketPrice(e.target.value)}
                    placeholder="10.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Night ticket (£)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={nightTicketPrice}
                    onChange={(e) => setNightTicketPrice(e.target.value)}
                    placeholder="20.00"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Facilities</label>
                <div className="flex flex-wrap gap-2">
                  {FACILITY_OPTIONS.map((facility) => (
                    <button
                      key={facility}
                      type="button"
                      onClick={() => toggleFacility(facility)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        facilities.includes(facility)
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {facility}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Tell anglers about your venue..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Almost Done!</h3>

              <div className="rounded-lg bg-amber-50 p-4">
                <h4 className="text-sm font-medium text-amber-800">🌟 Early Adopter Offer</h4>
                <p className="mt-1 text-sm text-amber-700">
                  Claim your venue for <strong>FREE</strong> during our launch period (normally £29).
                  You'll also get a "Founding Venue" badge displayed permanently.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={interestedInPremium}
                    onChange={(e) => setInterestedInPremium(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      I'm interested in Premium features
                    </span>
                    <p className="text-xs text-gray-500">
                      Featured placement, analytics, photo gallery, booking integration & more.
                      We'll notify you when it's available.
                    </p>
                  </div>
                </label>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">
                      I confirm I'm authorised to manage this venue *
                    </span>
                    <p className="text-xs text-gray-500">
                      By submitting, you agree to our terms and confirm you have the right to
                      represent this venue.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
          <button
            type="button"
            onClick={step === 1 ? onClose : prevStep}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <ChevronLeft size={16} />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Claim'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
