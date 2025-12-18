---
description: Business claim to verification user journey - analysis and implementation
---

# Business Claim → Verification Flow

## Current State Analysis

### Two Separate Flows

#### Flow 1: Submit New Business (User-Created)
1. User goes to `/businesses/submit`
2. Fills out form: name, type, address, phone, website, description
3. Address is geocoded via Nominatim
4. Inserted into `businesses` table with `status: 'pending'`, `claimed_by: user.id`
5. Admin reviews in Admin > Businesses > "Pending" tab
6. Approve/Reject via RPC functions

#### Flow 2: Claim Existing Business (OSM-Synced)
1. User sees unclaimed business on Explore map (from OpenStreetMap)
2. Clicks "Claim" → ClaimBusinessModal opens
3. Selects relationship (owner/manager) + adds proof notes
4. Inserted into `business_claims` table with `status: 'pending'`
5. ❌ **NO ADMIN UI TO REVIEW CLAIMS**

### Admin Journey (What Exists ✅)
1. Admin goes to Admin > Businesses
2. Filters: pending, approved, premium, featured, all
3. Can approve/reject BUSINESSES (status column)
4. Can set premium/featured status
5. Can add new businesses manually

---

## Gaps Identified & Fixed

### User Side
| Gap | Priority | Status |
|-----|----------|--------|
| No notification when business approved/rejected | High | ✅ Implemented |
| No notification when claim approved/rejected | High | ✅ Implemented |
| No "My Submissions" view | Medium | ✅ Hook created (`useMyBusinessSubmissions`) |
| No "My Claims" view | Medium | ✅ Hook created (`useMyBusinessClaims`) |
| No business owner dashboard | Low | Future |

### Admin Side
| Gap | Priority | Status |
|-----|----------|--------|
| No UI to review business_claims | High | ✅ Claims tab added |
| No notification sent on approve/reject | High | ✅ Implemented |
| No "Pending Claims" filter | Medium | ✅ Added with count badge |

---

## Implementation Plan

### Phase 1: Add Notifications (High Priority)
1. Send notification when business is approved
2. Send notification when business is rejected
3. Add notification types for business claims

### Phase 2: Add Claims Review to Admin (High Priority)
1. Add "Pending Claims" tab to BusinessesPage
2. Fetch from `business_claims` table with pending status
3. Add approve/reject UI for claims
4. Send notifications on claim approval/rejection

### Phase 3: User Hooks (Medium Priority)
1. Create `useMyBusinessSubmissions` hook
2. Create `useMyBusinessClaims` hook

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `businesses` | Main business data (status, claimed_by, is_premium) |
| `business_claims` | Claims for existing OSM businesses |
| `notifications` | Approval/rejection notifications |

## RPC Functions

| Function | Purpose |
|----------|---------|
| `approve_business` | Approve a pending business submission |
| `reject_business` | Reject a pending business submission |
| `approve_business_claim` | Approve/reject a claim on existing business |

## Key Files

| File | Purpose |
|------|---------|
| `src/pages/SubmitBusinessPage.tsx` | User form to submit new business |
| `src/components/business/ClaimBusinessModal.tsx` | Claim existing business modal |
| `src/pages/admin/BusinessesPage.tsx` | Admin review page |
