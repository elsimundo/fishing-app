---
description: Build Admin Dashboard for Monetization & Management
---

# Build Admin Dashboard

Creates a comprehensive admin panel accessible only to app owners/admins. Features include: user management, premium business listings (tackle shops, charters, clubs), featured placement controls, request approval system, and monetization tools. Built with proper RLS security to prevent unauthorized access.

## Phase 1: Database Schema

### Task 1: Add User Roles to Profiles
Run in Supabase SQL Editor:
```sql
-- Add role column to profiles
alter table profiles add column if not exists role text 
  check (role in ('user', 'moderator', 'admin', 'owner'))
  default 'user';

-- Add banned/suspended status
alter table profiles add column if not exists status text
  check (status in ('active', 'suspended', 'banned'))
  default 'active';

alter table profiles add column if not exists banned_at timestamptz;
alter table profiles add column if not exists banned_reason text;
alter table profiles add column if not exists banned_by uuid references profiles(id);

-- Index for admin queries
create index if not exists idx_profiles_role on profiles(role);
create index if not exists idx_profiles_status on profiles(status);
```

### Task 2: Create Businesses Table
```sql
-- Table for all business listings (shops, charters, clubs)
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('tackle_shop', 'charter', 'club', 'guide')),
  description text,
  lat numeric not null,
  lng numeric not null,
  address text,
  postcode text,
  city text,
  country text default 'GB',
  phone text,
  email text,
  website text,
  facebook text,
  instagram text,
  opening_hours jsonb,
  amenities text[],
  logo_url text,
  cover_image_url text,
  gallery_urls text[],
  is_premium boolean default false,
  premium_expires_at timestamptz,
  is_featured boolean default false,
  featured_expires_at timestamptz,
  featured_position int,
  claimed_by uuid references profiles(id),
  claimed_at timestamptz,
  verified boolean default false,
  verified_at timestamptz,
  verified_by uuid references profiles(id),
  source text default 'osm' check (source in ('osm', 'user_submitted', 'admin_added')),
  osm_id text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

-- Indexes
create index idx_businesses_type on businesses(type);
create index idx_businesses_status on businesses(status);
create index idx_businesses_premium on businesses(is_premium, premium_expires_at);
create index idx_businesses_featured on businesses(is_featured, featured_position);
create index idx_businesses_claimed_by on businesses(claimed_by);

-- RLS Policies
alter table businesses enable row level security;

create policy "Approved businesses visible to all"
  on businesses for select
  using (status = 'approved');

create policy "Users can submit businesses"
  on businesses for insert
  with check (auth.uid() = created_by and status = 'pending' and source = 'user_submitted');

create policy "Admins can manage businesses"
  on businesses for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));

create policy "Owners can update claimed businesses"
  on businesses for update
  using (claimed_by = auth.uid());
```

### Task 3: Create Premium Subscriptions Table
```sql
create table if not exists premium_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  tier text not null check (tier in ('basic', 'premium', 'featured')),
  price_paid numeric(10,2),
  currency text default 'GBP',
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  payment_method text,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text default 'active' check (status in ('active', 'cancelled', 'expired', 'pending')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index idx_subscriptions_business on premium_subscriptions(business_id);
create index idx_subscriptions_status on premium_subscriptions(status, expires_at);

alter table premium_subscriptions enable row level security;

create policy "Admins manage subscriptions"
  on premium_subscriptions for all
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
```

### Task 4: Create Admin Activity Log
```sql
create table if not exists admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_log_admin on admin_activity_log(admin_id, created_at desc);
create index idx_admin_log_entity on admin_activity_log(entity_type, entity_id);

alter table admin_activity_log enable row level security;

create policy "Admins view activity log"
  on admin_activity_log for select
  using (exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'owner')));
```

## Phase 2: RPC Functions

### Task 5: Admin Check Function
```sql
create or replace function is_admin(user_id uuid default auth.uid())
returns boolean as $$
begin
  return exists (select 1 from profiles where id = user_id and role in ('admin', 'owner'));
end;
$$ language plpgsql security definer;

grant execute on function is_admin(uuid) to authenticated;
```

### Task 6: Business Approval Functions
```sql
create or replace function approve_business(p_business_id uuid, p_admin_id uuid)
returns void as $$
begin
  if not is_admin(p_admin_id) then raise exception 'Only admins can approve businesses'; end if;
  update businesses set status = 'approved', approved_at = now(), approved_by = p_admin_id where id = p_business_id;
  insert into admin_activity_log (admin_id, action, entity_type, entity_id, details)
  values (p_admin_id, 'approve_business', 'business', p_business_id, jsonb_build_object('approved_at', now()));
end;
$$ language plpgsql security definer;

create or replace function reject_business(p_business_id uuid, p_admin_id uuid, p_reason text)
returns void as $$
begin
  if not is_admin(p_admin_id) then raise exception 'Only admins can reject businesses'; end if;
  update businesses set status = 'rejected', rejection_reason = p_reason where id = p_business_id;
  insert into admin_activity_log (admin_id, action, entity_type, entity_id, details)
  values (p_admin_id, 'reject_business', 'business', p_business_id, jsonb_build_object('reason', p_reason));
end;
$$ language plpgsql security definer;

grant execute on function approve_business(uuid, uuid) to authenticated;
grant execute on function reject_business(uuid, uuid, text) to authenticated;
```

### Task 7: Premium Management Functions
```sql
create or replace function set_business_premium(p_business_id uuid, p_admin_id uuid, p_expires_at timestamptz, p_price_paid numeric default 0)
returns uuid as $$
declare v_subscription_id uuid;
begin
  if not is_admin(p_admin_id) then raise exception 'Only admins can set premium status'; end if;
  update businesses set is_premium = true, premium_expires_at = p_expires_at where id = p_business_id;
  insert into premium_subscriptions (business_id, tier, price_paid, starts_at, expires_at, status, payment_method, created_by)
  values (p_business_id, 'premium', p_price_paid, now(), p_expires_at, 'active', 'manual', p_admin_id)
  returning id into v_subscription_id;
  insert into admin_activity_log (admin_id, action, entity_type, entity_id, details)
  values (p_admin_id, 'set_premium', 'business', p_business_id, jsonb_build_object('expires_at', p_expires_at, 'price', p_price_paid));
  return v_subscription_id;
end;
$$ language plpgsql security definer;

create or replace function set_business_featured(p_business_id uuid, p_admin_id uuid, p_position int, p_expires_at timestamptz)
returns void as $$
begin
  if not is_admin(p_admin_id) then raise exception 'Only admins can set featured status'; end if;
  update businesses set is_featured = true, featured_position = p_position, featured_expires_at = p_expires_at where id = p_business_id;
  insert into admin_activity_log (admin_id, action, entity_type, entity_id, details)
  values (p_admin_id, 'set_featured', 'business', p_business_id, jsonb_build_object('position', p_position, 'expires_at', p_expires_at));
end;
$$ language plpgsql security definer;

grant execute on function set_business_premium(uuid, uuid, timestamptz, numeric) to authenticated;
grant execute on function set_business_featured(uuid, uuid, int, timestamptz) to authenticated;
```

### Task 8: User Management Functions
```sql
create or replace function ban_user(p_user_id uuid, p_admin_id uuid, p_reason text)
returns void as $$
begin
  if not is_admin(p_admin_id) then raise exception 'Only admins can ban users'; end if;
  if p_user_id = p_admin_id then raise exception 'Cannot ban yourself'; end if;
  update profiles set status = 'banned', banned_at = now(), banned_reason = p_reason, banned_by = p_admin_id where id = p_user_id;
  insert into admin_activity_log (admin_id, action, entity_type, entity_id, details)
  values (p_admin_id, 'ban_user', 'user', p_user_id, jsonb_build_object('reason', p_reason));
end;
$$ language plpgsql security definer;

create or replace function unban_user(p_user_id uuid, p_admin_id uuid)
returns void as $$
begin
  if not is_admin(p_admin_id) then raise exception 'Only admins can unban users'; end if;
  update profiles set status = 'active', banned_at = null, banned_reason = null, banned_by = null where id = p_user_id;
  insert into admin_activity_log (admin_id, action, entity_type, entity_id, details)
  values (p_admin_id, 'unban_user', 'user', p_user_id, jsonb_build_object('unbanned_at', now()));
end;
$$ language plpgsql security definer;

grant execute on function ban_user(uuid, uuid, text) to authenticated;
grant execute on function unban_user(uuid, uuid) to authenticated;
```

## Phase 3: Frontend Components

### Task 9: Create useAdminAuth hook
File: src/hooks/useAdminAuth.ts

### Task 10: Create AdminLayout component
File: src/components/admin/AdminLayout.tsx

### Task 11: Create AdminDashboardPage
File: src/pages/admin/AdminDashboardPage.tsx

### Task 12: Create UsersPage
File: src/pages/admin/UsersPage.tsx

### Task 13: Create BusinessesPage
File: src/pages/admin/BusinessesPage.tsx

### Task 14: Add admin routes to App.tsx
- /admin → AdminDashboardPage
- /admin/users → UsersPage
- /admin/businesses → BusinessesPage

## Phase 4: Testing

1. Set your user as owner in database
2. Test admin access control
3. Test user ban/unban
4. Test business approval/rejection
5. Test premium/featured settings
6. Verify activity logging

## Monetization Pricing (Suggested)

| Type | Premium | Featured |
|------|---------|----------|
| Tackle Shops | £20/month | £50/month |
| Charters | £30/month | £75/month |
| Clubs | £15/month | £40/month |
