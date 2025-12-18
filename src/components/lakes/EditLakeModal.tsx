import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import type { Lake, LakeWaterType, LakeType } from '../../types'

interface EditLakeModalProps {
  lake: Lake
  onClose: () => void
}

const WATER_TYPES: { value: LakeWaterType; label: string }[] = [
  { value: 'lake', label: 'Lake' },
  { value: 'pond', label: 'Pond' },
  { value: 'reservoir', label: 'Reservoir' },
  { value: 'river', label: 'River' },
  { value: 'canal', label: 'Canal' },
  { value: 'other', label: 'Other' },
]

const LAKE_TYPES: { value: LakeType; label: string }[] = [
  { value: 'day_ticket', label: 'Day Ticket' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'syndicate', label: 'Syndicate' },
  { value: 'club', label: 'Club' },
  { value: 'public', label: 'Public/Free' },
  { value: 'private', label: 'Private' },
]

export function EditLakeModal({ lake, onClose }: EditLakeModalProps) {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)

  // Form state
  const [description, setDescription] = useState(lake.description || '')
  const [waterType, setWaterType] = useState<LakeWaterType | ''>(lake.water_type || '')
  const [lakeType, setLakeType] = useState<LakeType | ''>(lake.lake_type || '')
  const [species, setSpecies] = useState(lake.species?.join(', ') || '')
  const [rules, setRules] = useState(lake.rules || '')
  const [dayTicketPrice, setDayTicketPrice] = useState(lake.day_ticket_price?.toString() || '')
  const [nightTicketPrice, setNightTicketPrice] = useState(lake.night_ticket_price?.toString() || '')
  const [seasonTicketPrice, setSeasonTicketPrice] = useState(lake.season_ticket_price?.toString() || '')
  const [openingHours, setOpeningHours] = useState((lake as any).opening_hours || '')
  const [specialOffers, setSpecialOffers] = useState((lake as any).special_offers || '')
  const [phone, setPhone] = useState(lake.phone || '')
  const [email, setEmail] = useState(lake.email || '')
  const [website, setWebsite] = useState(lake.website || '')
  const [bookingUrl, setBookingUrl] = useState(lake.booking_url || '')

  // Facilities
  const [hasParking, setHasParking] = useState(lake.has_parking || false)
  const [hasToilets, setHasToilets] = useState(lake.has_toilets || false)
  const [hasCafe, setHasCafe] = useState(lake.has_cafe || false)
  const [hasTackleShop, setHasTackleShop] = useState(lake.has_tackle_shop || false)
  const [isNightFishingAllowed, setIsNightFishingAllowed] = useState(lake.is_night_fishing_allowed || false)
  const [isDisabledAccessible, setIsDisabledAccessible] = useState(lake.is_disabled_accessible || false)

  // Rules
  const [barblessOnly, setBarblessOnly] = useState(lake.barbless_only || false)
  const [catchAndReleaseOnly, setCatchAndReleaseOnly] = useState(lake.catch_and_release_only || false)
  const [maxRods, setMaxRods] = useState(lake.max_rods?.toString() || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const updates: Record<string, unknown> = {
        description: description.trim() || null,
        water_type: waterType || null,
        lake_type: lakeType || null,
        species: species.trim() ? species.split(',').map((s) => s.trim()).filter(Boolean) : null,
        rules: rules.trim() || null,
        day_ticket_price: dayTicketPrice ? parseFloat(dayTicketPrice) : null,
        night_ticket_price: nightTicketPrice ? parseFloat(nightTicketPrice) : null,
        season_ticket_price: seasonTicketPrice ? parseFloat(seasonTicketPrice) : null,
        opening_hours: openingHours.trim() || null,
        special_offers: specialOffers.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
        booking_url: bookingUrl.trim() || null,
        has_parking: hasParking,
        has_toilets: hasToilets,
        has_cafe: hasCafe,
        has_tackle_shop: hasTackleShop,
        is_night_fishing_allowed: isNightFishingAllowed,
        is_disabled_accessible: isDisabledAccessible,
        barbless_only: barblessOnly,
        catch_and_release_only: catchAndReleaseOnly,
        max_rods: maxRods ? parseInt(maxRods, 10) : null,
      }

      const { error } = await supabase
        .from('lakes')
        .update(updates)
        .eq('id', lake.id)

      if (error) throw error

      toast.success('Lake details updated!')
      queryClient.invalidateQueries({ queryKey: ['lake-owner-dashboard', lake.id] })
      queryClient.invalidateQueries({ queryKey: ['lake', lake.id] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lake')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-xl border border-border">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card p-4">
          <h2 className="text-lg font-bold text-foreground">Edit Lake Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800 resize-none"
              placeholder="Tell anglers about your venue..."
              maxLength={1000}
            />
          </div>

          {/* Type selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Water Type</label>
              <select
                value={waterType}
                onChange={(e) => setWaterType(e.target.value as LakeWaterType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select...</option>
                {WATER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Venue Type</label>
              <select
                value={lakeType}
                onChange={(e) => setLakeType(e.target.value as LakeType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select...</option>
                {LAKE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Species */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Species (comma-separated)</label>
            <input
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-navy-800 focus:outline-none focus:ring-1 focus:ring-navy-800"
              placeholder="Carp, Tench, Bream, Pike..."
            />
          </div>

          {/* Pricing */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Pricing</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Day Ticket (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={dayTicketPrice}
                  onChange={(e) => setDayTicketPrice(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="10.00"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Night Ticket (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={nightTicketPrice}
                  onChange={(e) => setNightTicketPrice(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="20.00"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground mb-1">Season (£)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={seasonTicketPrice}
                  onChange={(e) => setSeasonTicketPrice(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                  placeholder="150.00"
                />
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Opening Hours</label>
            <input
              type="text"
              value={openingHours}
              onChange={(e) => setOpeningHours(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="e.g. Dawn to Dusk, 7am-7pm, 24 hours"
            />
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground">Contact Details</p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Phone number"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Email address"
            />
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Website URL"
            />
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              placeholder="Online booking URL"
            />
          </div>

          {/* Special Offers (Premium feature) */}
          {lake.is_premium && (
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Special Offers <span className="text-amber-500">(Premium)</span>
              </label>
              <textarea
                value={specialOffers}
                onChange={(e) => setSpecialOffers(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                placeholder="e.g. 10% off for new members, Free night session with day booking..."
                maxLength={500}
              />
            </div>
          )}

          {/* Facilities */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Facilities</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Parking', checked: hasParking, onChange: setHasParking },
                { label: 'Toilets', checked: hasToilets, onChange: setHasToilets },
                { label: 'Café', checked: hasCafe, onChange: setHasCafe },
                { label: 'Tackle Shop', checked: hasTackleShop, onChange: setHasTackleShop },
                { label: 'Night Fishing', checked: isNightFishingAllowed, onChange: setIsNightFishingAllowed },
                { label: 'Disabled Access', checked: isDisabledAccessible, onChange: setIsDisabledAccessible },
              ].map((facility) => (
                <label key={facility.label} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={facility.checked}
                    onChange={(e) => facility.onChange(e.target.checked)}
                    className="rounded border-border"
                  />
                  {facility.label}
                </label>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">Fishing Rules</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={barblessOnly}
                  onChange={(e) => setBarblessOnly(e.target.checked)}
                  className="rounded border-border"
                />
                Barbless Only
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={catchAndReleaseOnly}
                  onChange={(e) => setCatchAndReleaseOnly(e.target.checked)}
                  className="rounded border-border"
                />
                Catch & Release
              </label>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm text-foreground">Max Rods:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxRods}
                onChange={(e) => setMaxRods(e.target.value)}
                className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
              />
            </div>
            <textarea
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
              placeholder="Additional venue rules..."
              maxLength={2000}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-navy-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-900 disabled:bg-navy-400"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
