---
description: Polish Comments & Add Feed Features (Phase 2C Day 5-7)
---
I want to save this as a workflow that polishes the existing bottom-sheet comments system and adds feed polish features like pull-to-refresh, infinite scroll, and loading states.

═══════════════════════════════════════════════════════════════

WORKFLOW NAME: Polish Comments & Add Feed Features

DESCRIPTION: 
Polishes the existing bottom-sheet comments system with better animations, loading states, and error handling. Adds pull-to-refresh and infinite scroll to the feed. Ensures entire social experience is smooth and professional.

IMPORTANT NOTE: Comments already use a bottom sheet pattern (not inline under posts). This workflow focuses on polishing the existing bottom sheet implementation.

═══════════════════════════════════════════════════════════════

FEATURE REQUIREMENTS:

BOTTOM SHEET COMMENTS (Polish Existing):
- Smooth slide-up animation
- Swipe-down to dismiss
- Backdrop fade-in/out
- Optimistic comment posting
- Loading skeletons
- Error states with retry
- Keyboard management (input stays visible)
- Character counter (500 max)
- Empty state
- Comment count badge

PULL-TO-REFRESH:
- Drag down on feed to refresh
- Loading indicator
- Fetch latest posts
- Smooth animation
- Mobile only

INFINITE SCROLL:
- Load more posts as scrolling
- "Load More" button
- Loading spinner
- "No more posts" message

POLISH:
- Loading skeletons for posts
- Toast notifications
- Error boundaries
- Consistent empty states
- Optimistic UI updates
- Smooth transitions

═══════════════════════════════════════════════════════════════

WORKFLOW TASKS:

Task 1: Verify Comments Implementation
Check that bottom sheet comments are already implemented:
- [ ] post_comments table exists
- [ ] usePostComments hook exists
- [ ] useAddPostComment hook exists
- [ ] Bottom sheet component exists (or modal that slides up)
- [ ] PostActions has comment button that opens sheet
- [ ] Comments display in sheet
- [ ] Add comment input works

Report: "Bottom sheet comments verified ✓" or list what's missing

Task 2: Add Comment Sheet Animations
File: Bottom sheet component (wherever it's implemented)

Add smooth animations:
```typescript
// Slide up from bottom
<motion.div
  initial={{ y: '100%' }}
  animate={{ y: 0 }}
  exit={{ y: '100%' }}
  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
  className="fixed inset-x-0 bottom-0 max-h-[80vh] bg-white rounded-t-2xl shadow-xl z-50"
>
  {/* Comments content */}
</motion.div>

// Backdrop fade
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  onClick={onClose}
  className="fixed inset-0 bg-black/50 z-40"
/>
```

Install framer-motion if needed:
```bash
pnpm add framer-motion
```

Report: "Comment sheet animations added ✓"

Task 3: Add Swipe-to-Dismiss Gesture
Add drag gesture to close sheet:
```typescript
import { PanInfo } from 'framer-motion';

const [dragY, setDragY] = useState(0);

<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 0 }}
  dragElastic={0.2}
  onDrag={(e, info: PanInfo) => {
    if (info.offset.y > 0) {
      setDragY(info.offset.y);
    }
  }}
  onDragEnd={(e, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose(); // Close if dragged down >100px
    }
    setDragY(0);
  }}
>
  {/* Handle bar for drag affordance */}
  <div className="mx-auto my-3 h-1 w-12 rounded-full bg-gray-300" />
  {/* Comments content */}
</motion.div>
```

Report: "Swipe-to-dismiss gesture added ✓"

Task 4: Add Optimistic Comment Posting
Update existing `useAddPostComment` hook to show comment instantly:
```typescript
export function useAddPostComment() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user?.id,
          text: text.trim(),
        })
        .select(
          `*,
           profile:profiles(id, username, avatar_url)
          `,
        )
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ postId, text }) => {
      await queryClient.cancelQueries({ queryKey: ['comments', postId] });
      const previousComments = queryClient.getQueryData<Comment[]>(['comments', postId]);

      const optimisticComment: Comment = {
        id: 'temp-' + Date.now(),
        post_id: postId,
        user_id: user?.id ?? '',
        text: text.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          id: user?.id ?? '',
          username: profile?.username ?? null,
          avatar_url: (profile as any)?.avatar_url ?? null,
        },
      };

      queryClient.setQueryData<Comment[]>(['comments', postId], (old) => [
        ...(old ?? []),
        optimisticComment,
      ]);

      return { previousComments };
    },
    onError: (err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', variables.postId], context.previousComments);
      }
      // Toast will be added in a later task
      console.error('Failed to post comment', err);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

Report: "Optimistic comment posting added ✓"

Task 5: Add Comment Loading Skeletons
Create skeleton loader for comments:

File: `src/components/feed/CommentSkeleton.tsx`
```typescript
export function CommentSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse">
      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gray-200" />
      <div className="flex-1">
        <div className="mb-2 h-3 w-24 rounded bg-gray-200" />
        <div className="mb-1 h-4 w-full rounded bg-gray-200" />
        <div className="h-4 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}
```

Show while loading in the comment sheet:
```typescript
{isLoading && (
  <div className="space-y-3 px-5 py-4">
    <CommentSkeleton />
    <CommentSkeleton />
    <CommentSkeleton />
  </div>
)}
```

Report: "Comment loading skeletons added ✓"

Task 6: Add Empty State for Comments
When no comments exist:
```typescript
{!isLoading && comments && comments.length === 0 && (
  <div className="px-5 py-12 text-center">
    <div className="mb-3 text-5xl">💬</div>
    <p className="mb-1 text-base font-semibold text-gray-900">No comments yet</p>
    <p className="text-sm text-gray-600">Be the first to comment! 🎣</p>
  </div>
)}
```

Report: "Comment empty state added ✓"

Task 7: Add Character Counter to Comment Input
Show character count (500 max) in the existing comment input:
```typescript
<textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  maxLength={500}
  // ...
/>
{text.length > 0 && (
  <div
    className={`mt-1 text-right text-xs ${
      text.length > 450 ? 'text-red-600' : 'text-gray-500'
    }`}
  >
    {text.length}/500
  </div>
)}
```

Report: "Character counter added ✓"

Task 8: Ensure Comment Count Badge on PostActions
Confirm `PostActions` shows live comment count from hooks and toggles the comments sheet.

If needed, ensure the comment button:
```typescript
<button
  onClick={onCommentClick}
  className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100"
>
  <MessageCircle size={20} className="text-gray-600" />
  {commentCount > 0 && (
    <span className="text-sm font-semibold text-gray-900">{commentCount}</span>
  )}
</button>
```

Report: "Comment count badge verified ✓" or list changes made

Task 9: Improve Keyboard Handling (Mobile)
Ensure input stays visible when keyboard opens:
```typescript
const inputRef = useRef<HTMLTextAreaElement | null>(null);

useEffect(() => {
  const el = inputRef.current;
  if (!el) return;

  const handleFocus = () => {
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 250);
  };

  el.addEventListener('focus', handleFocus);
  return () => el.removeEventListener('focus', handleFocus);
}, []);
```

Report: "Keyboard handling improved ✓"

Task 10: Add Error State with Retry for Comments
Show friendly error if comments fail to load:
```typescript
{isError && (
  <div className="px-5 py-12 text-center">
    <div className="mb-3 text-5xl">😕</div>
    <p className="mb-1 text-base font-semibold text-gray-900">Can't load comments</p>
    <p className="mb-4 text-sm text-gray-600">Something went wrong</p>
    <button
      type="button"
      onClick={() => refetch()}
      className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
    >
      Try Again
    </button>
  </div>
)}
```

Report: "Comment error state with retry added ✓"

Task 11: Add Pull-to-Refresh (Mobile) to Feed
File: `src/pages/FeedView.tsx`

1. Install pull-to-refresh helper:
```bash
pnpm add react-simple-pull-to-refresh
```

2. Wrap feed list:
```typescript
import PullToRefresh from 'react-simple-pull-to-refresh';

<PullToRefresh onRefresh={refetch}>
  <div className="space-y-4">
    {/* FeedPostCard list */}
  </div>
</PullToRefresh>
```

Report: "Pull-to-refresh added ✓"

Task 12: Add Infinite Scroll / Load More to Feed
Use `useInfiniteQuery` or a simple page/offset in the existing posts hook to:
- Load posts in pages (e.g., 10 at a time)
- Append pages on "Load More" button

At the bottom of the feed:
```typescript
{hasNextPage && (
  <button
    type="button"
    onClick={() => fetchNextPage()}
    disabled={isFetchingNextPage}
    className="w-full py-4 text-center text-sm font-semibold text-navy-800 hover:bg-gray-50 disabled:cursor-not-allowed"
  >
    {isFetchingNextPage ? 'Loading...' : 'Load More Posts'}
  </button>
)}

{!hasNextPage && allPosts.length > 0 && (
  <div className="py-8 text-center text-sm text-gray-500">You're all caught up! 🎣</div>
)}
```

Report: "Infinite scroll / Load More added ✓"

Task 13: Add Post Loading Skeletons
File: `src/components/feed/PostSkeleton.tsx`
```typescript
export function PostSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl bg-white">
      <div className="flex items-center gap-3 p-4">
        <div className="h-10 w-10 rounded-full bg-gray-200" />
        <div className="flex-1">
          <div className="mb-2 h-4 w-32 rounded bg-gray-200" />
          <div className="h-3 w-24 rounded bg-gray-200" />
        </div>
      </div>
      <div className="h-64 w-full bg-gray-200 md:h-80" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-3/4 rounded bg-gray-200" />
      </div>
    </div>
  );
}
```

In feed while loading:
```typescript
{isLoading && (
  <>
    <PostSkeleton />
    <PostSkeleton />
    <PostSkeleton />
  </>
)}
```

Report: "Post loading skeletons added ✓"

Task 14: Add Toast Notifications
1. Install:
```bash
pnpm add react-hot-toast
```

2. In `src/main.tsx` or `src/App.tsx`:
```typescript
import { Toaster } from 'react-hot-toast';

// Inside root JSX
<Toaster
  position="top-center"
  toastOptions={{
    duration: 3000,
    style: {
      background: '#0f172a',
      color: '#fff',
    },
  }}
/>
```

3. Use across app:
```typescript
import toast from 'react-hot-toast';

toast.success('Comment posted!');

toast.error('Failed to post comment');
```

Report: "Toast notifications added ✓"

Task 15: Add Error Boundary
File: `src/components/ErrorBoundary.tsx`
```typescript
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-5 text-center">
          <div className="mb-4 text-5xl">😕</div>
          <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-navy-800 px-4 py-2 font-semibold text-white hover:bg-navy-900"
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap app in `main.tsx`:
```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

Report: "Error boundary added ✓"

Task 16: Polish Empty States
Ensure all key lists have friendly empty states (feed, sessions, discover, profile posts). For feed, for example:
```typescript
<div className="px-5 py-12 text-center">
  <div className="mb-3 text-5xl">🎣</div>
  <p className="mb-1 text-base font-semibold text-gray-900">Your feed is empty</p>
  <p className="mb-4 text-sm text-gray-600">Follow anglers to see their posts!</p>
  <button
    type="button"
    onClick={() => navigate('/discover')}
    className="rounded-lg bg-navy-800 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-900"
  >
    Discover Anglers
  </button>
</div>
```

Report: "Empty states polished ✓"

Task 17: Test Bottom Sheet Comments
Full test of comment sheet:
1. Click comment button on post
2. Sheet slides up smoothly
3. Backdrop appears
4. Swipe down → sheet closes
5. Tap backdrop → sheet closes
6. Comments load with skeletons
7. Add comment → appears instantly
8. Character counter behaves
9. Delete own comment works
10. Keyboard does not hide input
11. Error state shows on failure
12. Empty state shows when no comments

Report: "Bottom sheet comments tested ✅" or list issues

Task 18: Test Feed Features
1. Pull-to-refresh on mobile
2. Load More at bottom of feed
3. Skeletons show while loading
4. Empty feed shows friendly state
5. Toasts show on key actions
6. No console errors

Report: "Feed features tested ✅" or list issues

Task 19: Final Polish
- Quick check on slow network
- Confirm transitions feel smooth
- Confirm no obvious layout shifts
- Confirm mobile nav + gestures feel natural

Report: "Final polish complete ✅"

Task 20: Final Verification
Confirm Phase 2C polish goals are complete:
✅ Bottom sheet comments polished
✅ Animations smooth
✅ Swipe-to-dismiss works
✅ Optimistic updates work
✅ Loading states everywhere
✅ Error handling robust
✅ Pull-to-refresh works
✅ Infinite scroll / Load More works
✅ Toast notifications work
✅ Error boundary catches errors
✅ Empty states friendly
✅ Mobile responsive
✅ No console errors

Report: "Polish Comments & Feed Features Workflow Complete ✅"

═══════════════════════════════════════════════════════════════

WORKFLOW SUCCESS CRITERIA:

✅ Bottom sheet comments polished (not rebuilt inline)
✅ Smooth animations
✅ Swipe-to-dismiss gesture
✅ Optimistic comment posting
✅ Comment loading skeletons
✅ Character counter
✅ Comment count badge
✅ Error states with retry
✅ Comment empty state
✅ Pull-to-refresh works
✅ Infinite scroll / Load More works
✅ Post loading skeletons
✅ Toast notifications wired
✅ Error boundary in place
✅ No TypeScript errors (after fixes)
✅ Mobile responsive

PHASE 2C POLISH COMPLETE ✅
