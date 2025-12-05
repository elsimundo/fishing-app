---
description: Improve Mobile UX for Outdoor Use (Large Touch Targets & Web App Feel)
---

# Improve Mobile UX for Outdoor Use

## Context
The fishing app will be used outdoors in challenging conditions:
- Cold weather with gloves
- Bright sunlight (need high contrast)
- Wind and movement (need stable, easy-to-press targets)
- Possibly on boats (wet hands, unstable platform)

## Design Principles
1. **Minimum touch target: 48px × 48px** (Apple/Google recommendation: 44-48px)
2. **Preferred touch target: 56-64px** for primary actions
3. **High contrast ratios** (WCAG AA: 4.5:1 for text, 3:1 for UI)
4. **Clear visual feedback** on touch/press
5. **Generous spacing** between interactive elements
6. **Web app feel** - native-like, not website-like

## Workflow Steps

### Phase 1: Update Design System (Tailwind Config)
**Goal:** Establish consistent sizing and spacing standards

1. **Update `tailwind.config.js`:**
   - Add custom spacing scale for touch targets
   - Define minimum button heights (min-h-12, min-h-14, min-h-16)
   - Add tap-highlight utilities
   - Increase default border radius for modern feel

2. **Create button size variants:**
   - `btn-sm`: 44px height (secondary actions)
   - `btn-md`: 48px height (standard)
   - `btn-lg`: 56px height (primary actions)
   - `btn-xl`: 64px height (critical actions like "Log Catch")

3. **Update color palette for outdoor visibility:**
   - Ensure navy-800 has good contrast on white
   - Add high-contrast mode colors
   - Test colors in bright sunlight simulation

### Phase 2: Bottom Navigation & Primary Actions
**Goal:** Make core navigation bulletproof

4. **Update `BottomNav.tsx`:**
   - Increase icon size from 24px to 28-32px
   - Increase touch target to 64px height
   - Add more padding between items
   - Increase active state visual feedback
   - Add haptic feedback (if supported)

5. **Update FAB (Post button):**
   - Increase size to 64px × 64px minimum
   - Add prominent shadow/elevation
   - Ensure 16px minimum from screen edges
   - Make icon larger (32px)

### Phase 3: Forms & Input Fields
**Goal:** Easy data entry with gloves

6. **Update all input fields:**
   - Minimum height: 56px
   - Larger font size: 16px (prevents zoom on iOS)
   - Increase padding: py-4 px-4
   - Larger tap targets for select dropdowns

7. **Update `CatchForm.tsx` and `SessionForm.tsx`:**
   - Larger input fields
   - Bigger increment/decrement buttons for numbers
   - Larger photo upload button
   - More spacing between fields

8. **Update species/location pickers:**
   - Larger list items (min 56px height)
   - Bigger checkboxes/radio buttons
   - More spacing in lists

### Phase 4: Cards & List Items
**Goal:** Easy browsing and selection

9. **Update `SessionCard.tsx`:**
   - Increase card height/padding
   - Larger text (title 18px, body 15px)
   - Bigger action buttons
   - More spacing between cards

10. **Update `CompetitionCard.tsx`:**
    - Already has good gradient design
    - Increase padding
    - Larger "View" button
    - Bigger text

11. **Update `PostCard.tsx` (feed):**
    - Larger like/comment buttons (48px touch target)
    - Bigger profile avatars
    - More padding

### Phase 5: Modals & Bottom Sheets
**Goal:** Easy interaction with overlays

12. **Update `BottomSheet.tsx`:**
    - Larger drag handle
    - Bigger close button (48px)
    - More padding in content area
    - Larger action buttons at bottom

13. **Update all modals:**
    - Larger header text
    - Bigger close buttons
    - Larger confirm/cancel buttons
    - More spacing

### Phase 6: Competition & Session Detail Pages
**Goal:** Clear information hierarchy

14. **Update `CompetitionDetailPage.tsx`:**
    - Larger organizer action buttons (already good, verify)
    - Bigger tab buttons
    - Increase leaderboard item height
    - Larger "Log a Catch" button

15. **Update `SessionDetailPage.tsx`:**
    - Larger action buttons
    - Bigger catch cards
    - More spacing

### Phase 7: Web App Polish
**Goal:** Native app feel

16. **Add PWA meta tags in `index.html`:**
    - Viewport settings for web app
    - Status bar styling
    - Disable text selection where appropriate
    - Add touch-action CSS

17. **Update `index.css`:**
    ```css
    /* Prevent text selection on buttons */
    button, .btn {
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }
    
    /* Smooth scrolling */
    html {
      scroll-behavior: smooth;
      -webkit-font-smoothing: antialiased;
    }
    
    /* Remove 300ms tap delay */
    * {
      touch-action: manipulation;
    }
    ```

18. **Add loading states:**
    - Skeleton screens for all pages
    - Loading spinners on buttons
    - Optimistic UI updates

### Phase 8: Accessibility & Touch Feedback
**Goal:** Clear feedback for every interaction

19. **Add visual feedback:**
    - Active states on all buttons (scale-95 on press)
    - Ripple effect on cards
    - Clear focus states
    - Disabled states with reduced opacity

20. **Test touch targets:**
    - Use browser dev tools to visualize hit areas
    - Test with actual gloves if possible
    - Ensure 8px minimum spacing between targets

### Phase 9: Typography Scale
**Goal:** Readable text outdoors

21. **Update font sizes:**
    - Body text: 16px (was 14px)
    - Small text: 14px (was 12px)
    - Buttons: 16px (was 14px)
    - Headers: Increase by 2-4px
    - Line height: 1.5 minimum

22. **Font weight:**
    - Use semibold (600) for important text
    - Use bold (700) for headers
    - Ensure good contrast

### Phase 10: Testing & Refinement

23. **Test in different conditions:**
    - Bright sunlight (use Chrome DevTools)
    - With gloves (test on actual device)
    - One-handed use
    - Landscape orientation

24. **Performance:**
    - Ensure animations are smooth (60fps)
    - Optimize images
    - Lazy load where appropriate

25. **Final polish:**
    - Consistent spacing throughout
    - All buttons follow size standards
    - No tiny touch targets remain
    - Test on iOS and Android

## Success Criteria
- [ ] All primary buttons are 56px+ height
- [ ] All interactive elements are 48px+ touch target
- [ ] Font sizes are 16px+ for body text
- [ ] Spacing between interactive elements is 8px+
- [ ] App feels native, not like a website
- [ ] Can be used comfortably with gloves
- [ ] High contrast in bright conditions
- [ ] No accidental taps due to small targets
- [ ] Smooth animations and transitions
- [ ] Clear visual feedback on all interactions

## Priority Order
1. **High Priority:** Bottom nav, FAB, primary action buttons, forms
2. **Medium Priority:** Cards, lists, modals
3. **Low Priority:** Polish, animations, edge cases

## Notes
- Start with mobile-first approach
- Test on real devices frequently
- Get user feedback early
- Consider adding a "large text" mode in settings
- May need to adjust desktop layouts separately
