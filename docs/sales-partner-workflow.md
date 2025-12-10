# Sales Partner System - Implementation Workflow

## Overview
Affiliate/partner system where your friends earn recurring commission (25%) for every lake or tackle shop they sign up. Businesses pay £20-50/month, partners earn £5-15/month per business, forever.

---

## Phase 1: MVP (Week 1-2)

### 1. Database Schema
```sql
-- Sales partners table
CREATE TABLE sales_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  partner_code TEXT UNIQUE, -- e.g., JOHN2024
  commission_rate DECIMAL(3,2) DEFAULT 0.25, -- 25%
  total_signups INT DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT, -- 'bank_transfer', 'paypal', 'stripe'
  payment_details JSONB, -- { iban: '...', paypal_email: '...' }
  status TEXT DEFAULT 'active', -- 'active', 'suspended', 'inactive'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business listings (add partner tracking)
ALTER TABLE business_listings 
  ADD COLUMN referred_by_partner_id UUID REFERENCES sales_partners(id),
  ADD COLUMN partner_commission_rate DECIMAL(3,2); -- Locked rate

-- Commission transactions
CREATE TABLE commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES sales_partners(id),
  business_id UUID REFERENCES business_listings(id),
  subscription_amount DECIMAL(10,2), -- £35.00
  commission_amount DECIMAL(10,2), -- £8.75
  commission_rate DECIMAL(3,2), -- 0.25 (locked)
  period_start DATE, -- 2025-11-01
  period_end DATE, -- 2025-11-30
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner applications
CREATE TABLE partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  why_join TEXT,
  experience TEXT,
  expected_signups INT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Partner Application Form
- **Route:** `/partner/apply`
- **Fields:** Full name, email, phone, why join, experience, expected signups
- **Submit → Admin review**

### 3. Business Signup Tracking
- **URL:** `catchrank.io/signup?ref=JOHN2024`
- **Capture ref param** → lock in partner commission

### 4. Partner Dashboard
- **Route:** `/partner/dashboard`
- **Show:** Earnings, businesses, referral link, commission history

### 5. Admin Dashboard
- **Route:** `/admin/partners`
- **Manage:** Applications, commissions, payouts

---

## Phase 2: Automation (Week 3-4)

### 6. Auto-Calculate Commissions
- Supabase Edge Function runs 1st of each month
- Creates pending commission transactions

### 7. Email Notifications
- Partner approved
- Business signed up
- Commission approved
- Payment sent

### 8. Payout Workflow
- Manual bank transfer (Phase 1)
- Stripe Connect (Phase 3)

---

## Phase 3: Scale (Month 2+)

### 9. Stripe Connect Integration
- Partners connect Stripe account
- Automated instant payouts
- 1.5% fee

### 10. Marketing Materials
- Email templates, sales scripts, flyers

### 11. Gamification
- Leaderboard, bonuses, monthly prizes

---

## Commission Structure

**Simple (Recommended):**
- Flat 25% for everyone

**Tiered (Add later):**
- 0-20 signups: 20%
- 21+ signups: 30%

**Lock-In:** Partner earns their % forever on businesses they refer

---

## Subscription Pricing

| Tier | Price | Partner Earns (25%) |
|------|-------|---------------------|
| Basic | £20/mo | £5/mo |
| Premium | £35/mo | £8.75/mo |
| Featured | £50/mo | £12.50/mo |

---

## Revenue Projections

**50 businesses:** £1,125/month profit (£13,500/year)
**225 businesses:** £5,906/month profit (£70,875/year)
**600 businesses:** £18,000/month profit (£216,000/year)

---

## Implementation Checklist

### Week 1
- [ ] Create database tables
- [ ] Build partner application form
- [ ] Build admin approval page

### Week 2
- [ ] Build partner dashboard
- [ ] Add referral tracking to signup
- [ ] Build admin partners page

### Week 3
- [ ] Commission calculation function
- [ ] Email notifications
- [ ] Payout workflow

### Week 4
- [ ] Test end-to-end
- [ ] Launch beta with 3-5 partners

---

**Ready to build and scale to £10k/month recurring revenue!** 🚀
