# Revenue Streams

Potential monetization opportunities for the Fishing App.

---

## 1. Data Licensing (B2B)

### Local Intel / Aggregated Catch Data
Sell anonymized, aggregated fishing data to:

- **Environment Agency / Conservation Bodies**
  - Species distribution and population trends
  - Catch rates by region and season
  - Invasive species tracking
  - Release rates and fish health data

- **Fishing Brands / Tackle Manufacturers**
  - Bait effectiveness by region/species
  - Popular gear and rigs
  - Seasonal trends
  - Market research for new products

- **Tourism Boards / Local Councils**
  - Fishing hotspot identification
  - Visitor patterns and activity levels
  - Economic impact of recreational fishing

- **Academic / Research Institutions**
  - Citizen science data
  - Long-term population studies
  - Climate impact on fish behavior

---

## 2. Business Listings (B2B)

### Tackle Shops, Charters, Clubs
- **Free tier**: Basic listing with name, location, contact
- **Premium tier**: Enhanced profile, photos, promotions, featured placement
- **Advertising**: Sponsored listings in Explore results

### Lake / Venue Ownership Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Unclaimed** | Free | Community data only (session/catch counts, species) |
| **Claimed (Free)** | Free | Owner badge, website link, contact info, day ticket price, opening hours, description, respond to comments |
| **Claimed (Premium)** | £9.99/mo or £99/yr | Featured placement, photo gallery, detailed facilities, multiple pegs, booking link, analytics dashboard, remove competitor ads, priority support |

#### Early Adopter Program (Launch Period)
- **First 100 venues OR first 3 months** (whichever comes first)
- Free verification (normally £29 one-time fee post-launch)
- "Founding Venue" badge displayed permanently on lake page
- Locked-in lower premium pricing if they upgrade during launch

#### Post-Launch Pricing
- **Verification fee**: £29 one-time to claim a venue
- **Premium**: £9.99/mo or £99/yr

#### Lake Card Display by Tier

| Content | Unclaimed | Claimed (Free) | Premium |
|---------|-----------|----------------|---------|
| Name, location, distance | ✅ | ✅ | ✅ |
| Water type | ✅ | ✅ | ✅ |
| Session/catch counts | ✅ | ✅ | ✅ |
| Species caught | ✅ | ✅ | ✅ |
| Basic facilities | ✅ | ✅ | ✅ |
| Owner badge | ❌ | ✅ | ✅ |
| Website/contact | ❌ | ✅ | ✅ |
| Day ticket price | ❌ | ✅ | ✅ |
| Opening hours | ❌ | ✅ | ✅ |
| Description | ❌ | ✅ | ✅ |
| Recent catches (3) | ❌ | ✅ | ✅ |
| Full session feed | ❌ | ❌ | ✅ |
| Photo gallery | ❌ | ❌ | ✅ |
| Featured placement | ❌ | ❌ | ✅ |
| Analytics dashboard | ❌ | ❌ | ✅ |
| Booking integration | ❌ | ❌ | ✅ |

---

## 3. Premium Features (B2C)

### Angler Subscriptions
Potential premium features for individual users:
- Advanced analytics on personal catches
- Detailed historical weather/tide correlation
- Export data (CSV, PDF reports)
- Priority support
- Ad-free experience
- Extended catch history

---

## 4. Competitions (B2B + B2C)

### Hosted Competitions
- **Entry fees**: Platform takes percentage of entry fees
- **Sponsored competitions**: Brands pay to sponsor/host competitions
- **Prize partnerships**: Tackle brands provide prizes for exposure

---

## 5. Affiliate / Referral

- Tackle shop product links (affiliate commission)
- Charter booking referrals
- Fishing license purchase referrals (where applicable)

---

## 6. Advertising

- In-app display ads (non-intrusive)
- Sponsored content in feed
- Location-based promotions from local businesses

---

## Notes

- **Privacy first**: All B2B data sales must be anonymized and aggregated
- **User consent**: Clear opt-in for any data sharing
- **Value exchange**: Users get free app; data helps improve fishing industry

---

*Last updated: December 2024*

---

## Implementation Status

### Lake Ownership ✅
- [x] `lakes` table with `claimed_by`, `is_verified`, `is_premium` fields
- [x] `lake_claims` table for claim requests
- [x] Admin UI to review/approve claims
- [x] Admin UI to add lakes manually
- [x] Add `claimed_at` timestamp for early adopter tracking (migration ready)
- [x] Add `is_founding_venue` boolean (migration ready)
- [x] Tiered lake card display in Explore (badges + content gating)
- [x] Lake detail page with tier-appropriate content
- [x] Premium analytics dashboard for lake owners (`/lakes/:id/dashboard`)
- [ ] Stripe integration for premium subscriptions (deferred)

### Saved Marks / Watchlist ✅
- [x] `saved_marks` table with privacy levels (private/friends/public)
- [x] `mark_shares` table for friend-to-friend sharing
- [x] My Marks card on Explore page
- [x] Share modal with friend picker
- [x] Mark selector in session start form
- [x] Auto-session creation when logging catch without session
- [x] `mark_id` on sessions and catches tables
