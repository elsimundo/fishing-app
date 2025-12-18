---
description: Offline features implementation workflow for Capacitor mobile app
---

# Offline Features Workflow

## Why Offline Matters for Fishing Apps

Anglers often fish in remote areas with poor/no cellular signal:
- Remote lakes, rivers, sea fishing spots
- Underground car parks when reviewing catches later
- International travel without data roaming

## Phases

### Phase 1: Core Offline (Must Have)
1. **Network Status Hook** - Detect online/offline state
2. **Offline Indicator** - Show banner when offline
3. **Offline Sync Queue** - Queue actions for later sync
4. **Auto-Sync** - Sync automatically when back online

### Phase 2: Data Caching
5. **Cache Store** - Persist data locally with TTL
6. **My Catches/Sessions** - View past data offline
7. **Species Database** - Access species info offline

### Phase 3: Enhanced
8. **Saved Marks Offline** - Fishing spots accessible offline
9. **Photo Queue** - Store photos locally, upload when online
10. **Map Tile Caching** - Pre-download maps

---

## Files Structure

```
src/
├── hooks/
│   ├── useNetworkStatus.ts     # Network detection
│   ├── useAutoSync.ts          # Auto-sync on reconnect
│   └── useOfflineQueue.ts      # Queue state hook
├── lib/
│   ├── offlineQueue.ts         # Sync queue storage
│   ├── cacheStore.ts           # Data caching
│   └── syncService.ts          # Sync processor
└── components/
    └── OfflineIndicator.tsx    # Offline banner
```

---

## Key Concepts

### Sync Queue
Actions performed offline are queued in Preferences storage with:
- Action type (create_catch, end_session, etc.)
- Payload data
- Timestamp
- Retry count

### Cache Store
Data is cached with TTL (time-to-live):
- User's catches/sessions cached for 24 hours
- Species data cached for 7 days
- Profile data cached for 24 hours

### Auto-Sync
When network reconnects:
1. Detect `wasOffline → isOnline` transition
2. Process all queued actions in order
3. Show toast with sync results
4. Invalidate React Query cache

---

## Implementation Steps

### Step 1: Add Network Status Hook
Create `src/hooks/useNetworkStatus.ts` with Capacitor Network plugin.

### Step 2: Add Offline Queue
Create `src/lib/offlineQueue.ts` using Capacitor Preferences.

### Step 3: Add Sync Service
Create `src/lib/syncService.ts` to process queued actions.

### Step 4: Add Auto-Sync Hook
Create `src/hooks/useAutoSync.ts` to sync on reconnect.

### Step 5: Add Offline Indicator
Create `src/components/OfflineIndicator.tsx` banner component.

### Step 6: Integrate into App
Add OfflineIndicator to Layout and useAutoSync to App.tsx.

### Step 7: Update Mutations
Modify catch/session mutations to queue when offline.

---

## Testing

Test on real device with airplane mode:
- [ ] Log catch while offline → queued
- [ ] End session while offline → queued  
- [ ] Reconnect → auto-syncs
- [ ] View past catches offline (after cached)
- [ ] Offline indicator shows/hides correctly
- [ ] No duplicate syncs occur
