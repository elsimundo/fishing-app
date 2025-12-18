---
description: Lake claim to verification user journey - analysis and implementation
---

# Lake Claim → Verification Flow

## Current State Analysis

### User Journey (What Exists ✅)
1. User visits unclaimed lake detail page
2. Sees "Own or manage this venue?" CTA
3. Opens ClaimLakeModal (4-step wizard):
   - Step 1: Role & contact info
   - Step 2: Upload proof document
   - Step 3: Venue details (optional)
   - Step 4: Premium interest & terms acceptance
4. Claim submitted → toast "We'll review it within 24-48 hours"

### Admin Journey (What Exists ✅)
1. Admin goes to Admin > Lakes
2. Filter by "Claimed" or view "Unverified"
3. See pending claims inline on lake cards
4. Can view proof document, claimant info
5. Approve → sets claimed_by, is_verified, claim status
6. Reject → sets claim status + optional reason

---

## Gaps Identified & Fixed

### User Side
| Gap | Priority | Status |
|-----|----------|--------|
| No "My Claims" view to check status | High | ✅ Hook created (`useMyLakeClaims`) |
| No notification on approve/reject | High | ✅ Notifications sent |
| User sees claim CTA even after submitting | Medium | ✅ Shows "Pending Review" message |
| No link to owner dashboard after approval | Medium | ✅ In notification action_url |
| Can submit duplicate claims for same lake | Low | ✅ Prevented via `useHasPendingClaim` |

### Admin Side
| Gap | Priority | Status |
|-----|----------|--------|
| No notification sent on approve/reject | High | ✅ Implemented |
| No dedicated "Pending Claims" filter | Medium | ✅ Added with count badge |
| No admin notification on new claims | Low | TODO (future) |

---

## Implementation Plan

### Phase 1: Core Notifications (High Priority)
1. Send `lake_claim_approved` notification when admin approves
2. Send `lake_claim_rejected` notification when admin rejects
3. Add notification rendering for these types

### Phase 2: User Claim Visibility (High Priority)
1. Create hook `useMyLakeClaims()` to fetch user's claims
2. Add "My Claims" section to Settings or Profile
3. Show claim status (pending/approved/rejected)
4. Hide claim CTA if user has pending claim for that lake

### Phase 3: Post-Approval UX (Medium Priority)
1. Link to owner dashboard in approval notification
2. Show "You own this venue" banner instead of claim CTA
3. Quick actions for verified owners

### Phase 4: Admin Improvements (Medium Priority)
1. Add "Pending Claims" filter to admin lakes page
2. Show claim count badge
3. Optional: Admin notification on new claims

---

## Technical Notes

- Notification types already defined in `useNotifications.ts`:
  - `lake_claim_submitted`
  - `lake_claim_approved`  
  - `lake_claim_rejected`
- Lake owner dashboard exists at `/lakes/:lakeId/dashboard`
- Claims stored in `lake_claims` table with status enum
