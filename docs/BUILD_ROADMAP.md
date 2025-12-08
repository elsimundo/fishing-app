# Build Roadmap

Master checklist for remaining features and polish.

---

## Phase 2: Core Features

### Lake Monetization ✅
- [x] Lakes table with `claimed_by`, `is_verified`, `is_premium`
- [x] Lake claims table and admin review UI
- [x] Tiered lake card display (badges, content gating)
- [x] Lake detail page with tier-appropriate content
- [x] Premium analytics dashboard for lake owners
- [x] Founding venue badge for early adopters
- [ ] Stripe integration for premium subscriptions

### Saved Marks / Watchlist ✅
- [x] `saved_marks` table with privacy levels (private/friends/public)
- [x] `mark_shares` table for friend-to-friend sharing
- [x] My Marks card on Explore page
- [x] Share modal with friend picker
- [x] Marks on Explore map (red = yours, green = shared)
- [x] Mark popup with directions and log session
- [x] Mark selector in session start form
- [x] Pre-fill location when navigating from mark
- [x] Auto-session creation when logging catch without session
- [x] `mark_id` on sessions and catches tables
- [x] Save as Mark from session detail
- [x] Save as Mark from catch detail

---

## Phase 3: Monetization & Business

### Stripe Integration ✅
- [x] Stripe account connection (`@stripe/stripe-js`)
- [x] Lake premium subscriptions (£9.99/mo or £99/yr)
- [x] Checkout flow with Stripe (Edge Function)
- [x] Webhook to update `is_premium` / `premium_expires_at`
- [x] Customer portal for managing subscriptions
- [x] Upgrade UI in Lake Owner Dashboard
- [ ] Tackle shop premium listings (pricing TBD)
- [ ] Club premium listings (pricing TBD)
- [ ] Charter premium listings (pricing TBD)

### Business Listings
- [ ] Tackle shops table with premium tier
- [ ] Clubs table with premium tier
- [ ] Charters table with premium tier
- [ ] Business claim flow (similar to lakes)
- [ ] Business owner dashboard
- [ ] Featured placement for premium businesses

---

## Phase 4: Social & Engagement

### Notifications
- [ ] In-app notification system
- [ ] Notification when friend shares mark with you
- [ ] Notification when someone catches at your mark
- [ ] Notification when someone joins your session
- [ ] Push notifications (web/mobile)
- [ ] Email digest (weekly summary)

### Feed Enhancements
- [ ] Trending catches/sessions
- [ ] Local activity feed (within X km)
- [ ] Species-specific feeds
- [ ] Hashtag support

---

## Phase 5: Offline & Performance

### Offline Support
- [ ] PWA manifest and service worker
- [ ] Cache saved marks for offline access
- [ ] Cache recent sessions/catches
- [ ] Offline catch logging (sync when online)
- [ ] Offline map tiles (limited area)

### Performance
- [ ] Code splitting for routes
- [ ] Image optimization and lazy loading
- [ ] API response caching
- [ ] Reduce bundle size (currently ~2.7MB)

---

## Phase 6: Competitions

### Foundation (Phase 2D Week 1)
- [ ] Competitions table schema
- [ ] Competition types (biggest fish, most catches, etc.)
- [ ] Entry submission flow
- [ ] Leaderboard display

### Full Implementation
- [ ] Create competition flow
- [ ] Join/leave competition
- [ ] Live leaderboards
- [ ] Competition chat/comments
- [ ] Prize/reward system
- [ ] Recurring competitions (weekly, monthly)

---

## Phase 7: Pre-Launch Polish

### Testing
- [ ] E2E tests for critical flows
- [ ] Mobile responsiveness audit
- [ ] Accessibility audit (a11y)
- [ ] Performance audit (Lighthouse)

### Content & Legal
- [ ] Terms of service
- [ ] Privacy policy
- [ ] Cookie consent
- [ ] Help/FAQ section
- [ ] Onboarding flow for new users

### Marketing
- [ ] Landing page
- [ ] App store assets (if going native)
- [ ] Social media presence
- [ ] Launch announcement

---

## Backlog / Ideas

- [ ] Weather alerts for saved marks
- [ ] Tide predictions for marks
- [ ] Fish species database with photos
- [ ] Gear/tackle inventory
- [ ] Trip planning with multiple marks
- [ ] Export data (CSV, GPX)
- [ ] Integration with fish finders
- [ ] AR fish identification
- [ ] Native mobile apps (iOS/Android)

---

*Last updated: December 2024*
