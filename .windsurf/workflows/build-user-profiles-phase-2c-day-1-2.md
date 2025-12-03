---
description: Build User Profiles (Phase 2C Day 1-2)
---
CREATE WORKFLOW: "Build User Profiles (Phase 2C Day 1-2)"

I want to save this as a workflow that builds the complete user profile system including own profile page, other users' profiles, follow system, edit profile, and a stacked post feed (not grid).

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Build User Profiles (Phase 2C Day 1-2)

DESCRIPTION: 
Creates the complete profile system with 2 pages and 5 components. Users can view their own profile, view other users' profiles, follow/unfollow, edit their profile, and see a stacked feed of their posts with full context.

═══════════════════════════════════════════════════════════════

IMPORTANT DESIGN DECISION - CARD FEED vs GRID:

We deliberately use a STACKED CARD FEED on profiles (not an Instagram-style photo grid) for these reasons:

1. RICHER SESSION & CATCH CONTEXT
   - Each post shows full session summaries (location, dates, water type, catch counts)
   - Full catch stats visible (weight, length, bait, rig)
   - Posts can represent sessions, catches, or photos - a grid doesn't surface these differences

2. VISIBILITY CONTROL UX (PUBLIC vs PRIVATE)
   - Profile is the user's personal saved feed containing both public and private posts
   - Stacked cards have room for clear "Public" / "Private" pill
   - For owner: pill is tappable control to toggle visibility
   - For viewers: pill shows post privacy (read-only)
   - In a grid, there's no good place for this control without clutter

3. CONSISTENCY WITH MAIN FEED
   - We reuse the SAME FeedPostCard component for:
     * Main feed
     * Own profile feed (with visibility controls)
     * Other users' profile feeds (read-only)
   - Keeps interaction model consistent: header, image, caption, stats, actions

4. FUTURE FEATURES
   - Space for live like/comment counts
   - Repost indicators
   - Metadata like "reposted from @user"
   - Grid would be too cramped on mobile

THEREFORE: Profiles show posts as a stacked feed using FeedPostCard, NOT as a photo grid.

═══════════════════════════════════════════════════════════════

FEATURE REQUIREMENTS:

YOUR PROFILE (/profile):
- Cover photo (gradient if none)
- Avatar (gradient with initial if none)
- Username, full name, bio, location
- Stats: Posts, Followers, Following
- Edit Profile button
- Share button
- Settings gear icon
- Stacked post feed using FeedPostCard (IMPORTANT: NOT a grid)
- Empty state if no posts
- Posts show Public/Private pill (tappable to toggle)

OTHER USERS' PROFILES (/profile/:userId):
- Same layout as your profile
- Follow/Unfollow button instead of Edit
- No settings gear
- Can't edit their profile
- Stacked post feed (read-only visibility pills)
- Only shows PUBLIC posts from this user

FOLLOW SYSTEM:
- Follow button on other users' profiles
- Toggles between "Follow" and "Following"
- Updates follower/following counts
- Optimistic updates

EDIT PROFILE:
- Modal opens from Edit button
- Fields: Full name, bio, location
- Character limits (bio 200 chars)
- Save changes to database
- Refresh profile after save

POST FEED (NOT GRID):
- Shows sessions/catches user has shared to feed
- Uses FeedPostCard component (same as main feed)
- Stacked vertically (not grid)
- Shows full post context (session details, catches, etc.)
- Public/Private pill visible
- Like/comment/share actions
- Empty state with icon

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS:

Task 1: Create Directory Structure
Create components/profile/ folder if it doesn't exist
Report: "Profile components directory ready ✓"

Task 2: Create ProfilePage.tsx (Your Own Profile)
File: src/pages/ProfilePage.tsx

Full implementation:

import { useAuth } from '@/hooks/useAuth';
import { useFollowCounts } from '@/hooks/useFollows';
import { useUserPosts } from '@/hooks/usePosts';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { Settings, Share2 } from 'lucide-react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

Features:
- Fetch current user from useAuth
- Fetch follow counts for current user
- Fetch posts from current user (both public AND private)
- Show loading spinner while loading
- Display ProfileHeader component
- Display ProfileStats component
- Show action buttons: Edit Profile, Share, Settings
- Display posts in STACKED FEED using FeedPostCard (NOT grid)
- Each FeedPostCard shows Public/Private pill (owner can toggle)
- EditProfileModal state management
- Settings button shows alert "Settings coming soon"
- Refresh page after profile edit

Post Feed Section:
```typescript
<div className="bg-gray-50">
  {postsLoading ? (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-navy-800" />
    </div>
  ) : posts && posts.length > 0 ? (
    <div className="space-y-4 pb-20">
      {posts.map((post) => (
        <FeedPostCard 
          key={post.id} 
          post={post}
          isOwnProfile={true}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">📝</div>
      <p className="text-base font-semibold text-gray-900 mb-1">No posts yet</p>
      <p className="text-sm text-gray-600">Share your first fishing session!</p>
    </div>
  )}
</div>
```

Structure:
- Full height layout
- White sections with gray borders
- Mobile responsive padding
- Loading states

Report: "ProfilePage.tsx created with stacked post feed ✓"

Task 3: Create UserProfilePage.tsx (Other Users)
File: src/pages/UserProfilePage.tsx

Full implementation:

import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useFollowCounts, useIsFollowing } from '@/hooks/useFollows';
import { FeedPostCard } from '@/components/feed/FeedPostCard';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileStats } from '@/components/profile/ProfileStats';
import { FollowButton } from '@/components/profile/FollowButton';
import { Loader2 } from 'lucide-react';

Features:
- Get userId from URL params
- Fetch target user's profile from Supabase
- Check if viewing own profile
- Fetch follow counts for target user
- Fetch PUBLIC posts ONLY from target user (filter: is_public = true)
- Check if current user is following target user
- Show loading spinner
- Show "User not found" if profile doesn't exist
- Display ProfileHeader
- Display ProfileStats
- Show FollowButton (only if not own profile)
- Display posts in STACKED FEED using FeedPostCard
- Posts show Public pill (read-only, no toggle)

Posts query for other users:
```typescript
const { data: posts } = useQuery({
  queryKey: ['userPosts', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        session:sessions(*),
        profile:profiles(username, avatar_url)
      `)
      .eq('user_id', userId)
      .eq('is_public', true)  // ONLY public posts
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  enabled: !!userId,
});
```

Post Feed Section:
```typescript
<div className="bg-gray-50">
  {postsLoading ? (
    <div className="flex justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-navy-800" />
    </div>
  ) : posts && posts.length > 0 ? (
    <div className="space-y-4 pb-20">
      {posts.map((post) => (
        <FeedPostCard 
          key={post.id} 
          post={post}
          isOwnProfile={false}
        />
      ))}
    </div>
  ) : (
    <div className="text-center py-12">
      <div className="text-5xl mb-3">📝</div>
      <p className="text-base font-semibold text-gray-900 mb-1">No posts yet</p>
      <p className="text-sm text-gray-600">This user hasn't shared anything yet.</p>
    </div>
  )}
</div>
```

Report: "UserProfilePage.tsx created with stacked post feed (public only) ✓"

Task 4: Create ProfileHeader Component
File: src/components/profile/ProfileHeader.tsx

Props:
- profile (Profile type)
- isOwnProfile (boolean)

Layout:
- Cover photo section (full width, 200px height)
  - If has cover_photo_url: Show image
  - If no cover: Gradient bg-gradient-to-r from-cyan-600 to-emerald-500
- Avatar overlapping cover (-mt-12)
  - 96px circle (w-24 h-24)
  - 4px white border
  - If has avatar_url: Show image
  - If no avatar: Gradient circle with first letter of username
- User info (px-5 pb-4)
  - Full name or username (text-xl font-bold)
  - @username (text-sm text-gray-600)
  - Bio (text-[15px] text-gray-700)
  - Location with 📍 emoji (text-sm text-gray-600)

Styling:
- bg-white
- Rounded corners where appropriate
- Proper spacing and padding
- Mobile responsive

Report: "ProfileHeader.tsx created ✓"

Task 5: Create ProfileStats Component
File: src/components/profile/ProfileStats.tsx

Props:
- postCount (number)
- followerCount (number)
- followingCount (number)

Layout:
- Three columns: Posts, Followers, Following
- Each column is a button (for future modal functionality)
- Number: text-lg font-bold
- Label: text-xs uppercase tracking-wide text-gray-600
- Centered text
- Even spacing with flex justify-around

Styling:
- bg-white
- Padding px-5 py-4
- Border bottom border-gray-200

Report: "ProfileStats.tsx created ✓"

Task 6: Verify FeedPostCard Component Exists
File: src/components/feed/FeedPostCard.tsx

Check that FeedPostCard exists and accepts:
- post prop (Post type)
- isOwnProfile prop (boolean) - determines if visibility pill is editable

FeedPostCard should show:
- PostHeader (user info, timestamp)
- Post image/content
- Session summary (if type='session')
- Catch details (if type='catch')
- Caption
- Public/Private pill:
  - If isOwnProfile=true: Tappable button to toggle visibility
  - If isOwnProfile=false: Read-only badge showing visibility
- Like/comment/share actions (PostActions component)

If FeedPostCard doesn't exist or needs updates, report what's needed.

Report: "FeedPostCard verified ✓" or "FeedPostCard needs: [list updates]"

Task 7: Create FollowButton Component
File: src/components/profile/FollowButton.tsx

Props:
- userId (string)
- isFollowing (boolean)

Features:
- Use useFollowUser and useUnfollowUser hooks
- Show loading spinner while pending
- If isFollowing: Show "Following" (gray button)
- If not following: Show "Follow" (navy button)
- Disabled state while pending
- onClick: Toggle follow/unfollow

Button styling:
- Full width
- px-4 py-2
- rounded-lg
- font-semibold
- transition-colors
- disabled:opacity-50 disabled:cursor-not-allowed

Following state:
- bg-gray-100 text-gray-900 hover:bg-gray-200

Not following state:
- bg-navy-800 text-white hover:bg-navy-900

Loading state:
- Show Loader2 icon spinning
- Text: "Following..." or "Unfollowing..."

Report: "FollowButton.tsx created ✓"

Task 8: Create EditProfileModal Component
File: src/components/profile/EditProfileModal.tsx

Props:
- profile (Profile)
- onClose (function)
- onSuccess (function)

Features:
- Modal overlay (fixed inset-0 bg-black/50 z-50)
- Modal content:
  - Bottom sheet on mobile (rounded-t-2xl)
  - Centered on desktop (rounded-2xl max-w-lg)
- Header: "Edit Profile" with X button
- Form fields:
  1. Full Name (input, max 100 chars)
  2. Bio (textarea, max 200 chars, shows counter)
  3. Location (input, max 100 chars)
- Action buttons: Cancel (gray), Save Changes (navy)
- Loading state on save
- Error handling

Save function:
```typescript
const handleSave = async () => {
  setIsSaving(true);
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
      })
      .eq('id', profile.id);

    if (error) throw error;
    onSuccess();
  } catch (error) {
    console.error('Error updating profile:', error);
    alert('Failed to update profile. Please try again.');
  } finally {
    setIsSaving(false);
  }
};
```

Styling:
- Modal: white bg, max-h-[90vh], overflow-hidden
- Header: border-bottom, px-5 py-4
- Form: p-5, space-y-4
- Inputs: border-2 border-gray-200 rounded-xl focus:ring-navy-800
- Bio counter: text-xs text-gray-500 text-right
- Buttons: flex gap-3, equal width

Report: "EditProfileModal.tsx created ✓"

Task 9: Add Profile Routes to App.tsx
File: src/App.tsx

Add these routes inside ProtectedRoute:

<Route path="/profile" element={<ProfilePage />} />
<Route path="/profile/:userId" element={<UserProfilePage />} />

Import statements needed:
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';

Report: "Profile routes added to App.tsx ✓"

Task 10: Verify Required Hooks Exist
Check that these hooks exist in src/hooks/:

- useAuth.ts (should exist)
- useFollows.ts (should have useFollowCounts, useIsFollowing, useFollowUser, useUnfollowUser)
- usePosts.ts (should have useUserPosts that fetches posts by user_id)

useUserPosts should:
- Accept userId parameter
- Query posts table
- Include session and profile relations
- Order by created_at descending
- For own profile: Return ALL posts (public + private)
- For other users: Filter is_public = true

If hooks are missing functions, report which ones need to be added.

Report: "Hooks verified ✓" or "Missing hooks: [list]"

Task 11: Verify TypeScript Types
Check that Profile type exists in src/types/index.ts:

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  cover_photo_url: string | null;
  created_at: string;
  updated_at: string;
}

Check that Post type exists and has:
- id, user_id, session_id, catch_id, photo_url
- type ('session' | 'catch' | 'photo')
- caption, is_public, location_privacy
- session?: Session (full session object)
- profile?: Profile (user who created post)
- like_count, comment_count
- created_at

Report: "TypeScript types verified ✓" or list missing types

Task 12: Update FeedPostCard for Profile Context
Ensure FeedPostCard handles isOwnProfile prop:

If isOwnProfile = true:
- Show Public/Private pill as editable button
- onClick pill: Toggle post.is_public in database
- Optimistically update UI

If isOwnProfile = false:
- Show Public/Private pill as read-only badge
- No click handler

Visibility pill styling:
- Small rounded pill (rounded-full px-3 py-1 text-xs font-semibold)
- Public: bg-emerald-100 text-emerald-700
- Private: bg-gray-200 text-gray-700
- Position: Top-right corner of post or in header

Report: "FeedPostCard updated for profile context ✓"

Task 13: Test ProfilePage (Your Own Profile)
Verify ProfilePage works:
1. Navigate to /profile
2. Shows your avatar, username, bio
3. Shows correct stats (posts/followers/following)
4. Edit Profile button visible
5. Settings gear visible
6. Share button visible
7. Posts show in stacked feed (NOT grid)
8. Each post shows full context (session details, catches)
9. Public/Private pills visible and clickable
10. Click pill toggles visibility
11. Click Edit Profile opens modal
12. Edit bio, save, profile updates
13. No console errors

Report: "ProfilePage tested ✓" or list issues

Task 14: Test UserProfilePage (Other Users)
Verify UserProfilePage works:
1. Navigate to /profile/[some-user-id]
2. Shows other user's profile
3. Follow button visible (not Edit)
4. Stats show correctly
5. Posts show in stacked feed
6. ONLY public posts visible
7. Public pills show (read-only, not clickable)
8. Click Follow → Changes to "Following"
9. Follower count increases
10. Navigate to /profile → Following count increased
11. No console errors

Report: "UserProfilePage tested ✓" or list issues

Task 15: Test Follow System
Verify follow functionality:
1. Go to another user's profile
2. Click Follow button
3. Button shows loading state
4. Button changes to "Following"
5. Follower count updates
6. Go back to feed
7. Click username to return to profile
8. Still shows "Following"
9. Click Unfollow
10. Button changes back to "Follow"
11. Counts update

Report: "Follow system tested ✓" or list issues

Task 16: Test Post Feed Features
Verify stacked feed works:
1. Go to own profile
2. Posts show as full cards (not tiles)
3. Each card shows:
   - User header
   - Image/content
   - Session details (location, dates, water type)
   - Catch stats (weight, length)
   - Caption
   - Public/Private pill
   - Like/comment counts
   - Action buttons
4. Click post → Goes to session detail
5. Back button returns to profile
6. Public/Private pill toggles on own profile
7. Other user profiles: Pills are read-only

Report: "Post feed features tested ✓" or list issues

Task 17: Test Responsive Design
Verify responsive behavior:
1. Desktop view (>768px):
   - Post cards: centered max-w-2xl
   - Profile layout: max-width container
   - Modal: centered
2. Mobile view (<768px):
   - Post cards: full width
   - Profile: full width
   - Modal: bottom sheet
3. No horizontal scroll
4. All buttons accessible
5. Text readable
6. Images scale properly

Report: "Responsive design tested ✓" or list issues

Task 18: Final Verification
Confirm all requirements met:
✅ ProfilePage shows your profile correctly
✅ UserProfilePage shows other users' profiles
✅ Posts show in STACKED FEED (not grid)
✅ FeedPostCard reused for consistency
✅ Public/Private pills work (editable on own, read-only on others)
✅ Full session/catch context visible in posts
✅ Edit Profile modal works
✅ Follow/unfollow works
✅ Stats show correct counts
✅ Empty state shows when no posts
✅ Navigation between profiles works
✅ Click posts goes to session detail
✅ Mobile responsive
✅ No TypeScript errors
✅ No console errors
✅ All components styled consistently

Report: "Build User Profiles Workflow Complete ✅"
List any remaining issues or "All requirements met ✅"

═══════════════════════════════════════════════════════════════

KEY DIFFERENCES FROM GRID APPROACH:

❌ DON'T create PostsGrid component (we're using FeedPostCard instead)
❌ DON'T use grid layout (grid-cols-2 md:grid-cols-3)
❌ DON'T show just images with hover overlay
❌ DON'T hide post context

✅ DO use FeedPostCard component (already exists in components/feed/)
✅ DO show posts in vertical stack (space-y-4)
✅ DO show full session/catch details
✅ DO show Public/Private pills prominently
✅ DO allow visibility toggling on own profile
✅ DO maintain consistency with main feed

═══════════════════════════════════════════════════════════════

STYLING GUIDELINES:

Colors:
- Primary: #1e3a8a (bg-navy-800)
- Hover: #1e40af (hover:bg-navy-900)
- Gray backgrounds: #f8fafc (bg-gray-50)
- Borders: #e2e8f0 (border-gray-200)
- Text primary: #0f172a (text-gray-900)
- Text secondary: #64748b (text-gray-600)
- Avatar gradient: from-cyan-600 to-emerald-500
- Public pill: bg-emerald-100 text-emerald-700
- Private pill: bg-gray-200 text-gray-700

Spacing:
- Post feed: space-y-4 (16px between cards)
- Section padding: px-5 py-4
- Card padding: p-4
- Gap between elements: gap-3 or gap-4

Typography:
- Profile name: text-xl font-bold
- Username: text-sm text-gray-600
- Bio: text-[15px] text-gray-700
- Stats number: text-lg font-bold
- Stats label: text-xs uppercase tracking-wide

Buttons:
- Primary: bg-navy-800 text-white rounded-lg px-4 py-2
- Secondary: bg-gray-100 text-gray-900 rounded-lg px-4 py-2
- Icon buttons: p-2 bg-gray-100 rounded-lg

═══════════════════════════════════════════════════════════════

DATABASE QUERIES REFERENCE:

Fetch user profile:
```typescript
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

Fetch own posts (ALL - public + private):
```typescript
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    session:sessions(*),
    profile:profiles(username, avatar_url)
  `)
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

Fetch other user's posts (PUBLIC only):
```typescript
const { data } = await supabase
  .from('posts')
  .select(`
    *,
    session:sessions(*),
    profile:profiles(username, avatar_url)
  `)
  .eq('user_id', userId)
  .eq('is_public', true)
  .order('created_at', { ascending: false });
```

Toggle post visibility:
```typescript
const { error } = await supabase
  .from('posts')
  .update({ is_public: !currentIsPublic })
  .eq('id', postId)
  .eq('user_id', currentUserId); // Security: only owner can change
```

Update profile:
```typescript
const { error } = await supabase
  .from('profiles')
  .update({
    full_name: fullName,
    bio: bio,
    location: location,
  })
  .eq('id', userId);
```

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA:

✅ 2 pages created (ProfilePage, UserProfilePage)
✅ 4 components created (Header, Stats, Follow, Edit)
✅ FeedPostCard reused for post display
✅ Routes added to App.tsx
✅ Own profile shows ALL posts in stacked feed
✅ Other profiles show PUBLIC posts only
✅ Public/Private pills work correctly
✅ Full session/catch context visible
✅ Edit profile works
✅ Follow/unfollow works
✅ Stats show correct counts
✅ Empty state shows when no posts
✅ Navigation works
✅ Responsive design works
✅ No errors in console
✅ TypeScript compiles
✅ Consistent with main feed design

Save this as a reusable workflow for building profile systems with rich post context.

🎯 KEY CHANGES FROM PREVIOUS VERSION
What Changed:
❌ Removed PostsGrid component - We're using FeedPostCard instead
✅ Added stacked feed layout - Posts show as full cards, not tiles
✅ Added Public/Private pills - Editable on own profile, read-only on others
✅ Full session/catch context - Shows all details, not just images
✅ Component reuse - Same FeedPostCard as main feed for consistency
✅ Privacy filtering - Own profile shows all, others show public only
Why This Is Better:
✅ Users see full fishing context (sessions, catches, stats)
✅ Clear visibility control with Public/Private pills
✅ Consistent UX between feed and profile
✅ Room for future features (comments, reposts)
✅ Better mobile experience (less cramped)

📋 WHAT TO EXPECT
Workflow will create:
ProfilePage (your profile with stacked feed)
UserProfilePage (others' profiles with public posts only)
ProfileHeader (cover, avatar, bio)
ProfileStats (counts)
FollowButton (follow/unfollow)
EditProfileModal (edit bio, name, location)
Updates to FeedPostCard (if needed for profile context)
It will NOT create:
❌ PostsGrid component
❌ Grid layout styles
❌ Hover overlays for tiles

✅ TESTING CHECKLIST (After Workflow)
Own Profile:
Posts show as full cards (not grid)
Can see ALL posts (public + private)
Public/Private pills are clickable
Toggle pill changes visibility
Full session details visible
Other User Profiles:
Posts show as full cards
Only PUBLIC posts visible
Public pills show (read-only)
Can't see their private posts
Consistency:
Post cards look same as main feed
Same interaction patterns
Same like/comment buttons
