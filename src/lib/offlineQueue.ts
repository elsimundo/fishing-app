import { Preferences } from '@capacitor/preferences'

export type QueuedActionType = 
  | 'create_catch'
  | 'update_catch'
  | 'delete_catch'
  | 'create_session'
  | 'update_session'
  | 'end_session'
  | 'create_post'
  | 'like_post'
  | 'unlike_post'
  | 'add_comment'

export interface OfflinePhoto {
  localPath: string
  fileName: string
  mimeType: string
}

export interface QueuedAction {
  id: string
  type: QueuedActionType
  payload: Record<string, unknown>
  createdAt: string
  retryCount: number
  offlinePhoto?: OfflinePhoto
}

const QUEUE_KEY = 'offline_sync_queue'

/**
 * Offline sync queue - stores actions to be synced when back online.
 * Uses Capacitor Preferences for persistent storage.
 */
export const offlineQueue = {
  /**
   * Add an action to the sync queue
   */
  async add(action: { 
    type: QueuedActionType; 
    payload: Record<string, unknown>;
    offlinePhoto?: OfflinePhoto;
  }): Promise<QueuedAction> {
    const queue = await this.getAll()
    const newAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    }
    queue.push(newAction)
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) })
    return newAction
  },

  /**
   * Get all queued actions
   */
  async getAll(): Promise<QueuedAction[]> {
    const { value } = await Preferences.get({ key: QUEUE_KEY })
    return value ? JSON.parse(value) : []
  },

  /**
   * Remove a successfully synced action from the queue
   */
  async remove(id: string): Promise<void> {
    const queue = await this.getAll()
    const filtered = queue.filter(a => a.id !== id)
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(filtered) })
  },

  /**
   * Increment retry count for a failed action
   */
  async incrementRetry(id: string): Promise<void> {
    const queue = await this.getAll()
    const updated = queue.map(a => 
      a.id === id ? { ...a, retryCount: a.retryCount + 1 } : a
    )
    await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(updated) })
  },

  /**
   * Clear all queued actions (use with caution)
   */
  async clear(): Promise<void> {
    await Preferences.remove({ key: QUEUE_KEY })
  },

  /**
   * Get count of pending actions
   */
  async getPendingCount(): Promise<number> {
    const queue = await this.getAll()
    return queue.length
  },

  /**
   * Check if there are any pending actions
   */
  async hasPending(): Promise<boolean> {
    const count = await this.getPendingCount()
    return count > 0
  },
}
