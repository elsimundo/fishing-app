import { offlineQueue } from './offlineQueue'
import type { QueuedAction } from './offlineQueue'
import { supabase } from './supabase'
import { offlinePhotoStorage } from './offlinePhotoStorage'
import { uploadCatchPhoto } from '../hooks/usePhotoUpload'

const MAX_RETRIES = 3

export interface SyncResult {
  success: number
  failed: number
  errors: Array<{ actionId: string; error: string }>
}

/**
 * Sync service - processes queued offline actions when back online.
 */
export const syncService = {
  /**
   * Process all queued actions
   */
  async syncAll(): Promise<SyncResult> {
    const queue = await offlineQueue.getAll()
    const results: SyncResult = { success: 0, failed: 0, errors: [] }

    // Process actions in order (FIFO)
    for (const action of queue) {
      // Skip actions that have exceeded max retries
      if (action.retryCount >= MAX_RETRIES) {
        results.failed++
        results.errors.push({ 
          actionId: action.id, 
          error: 'Max retries exceeded' 
        })
        continue
      }

      try {
        await this.processAction(action)
        await offlineQueue.remove(action.id)
        results.success++
      } catch (error) {
        console.error('Sync failed for action:', action.id, error)
        await offlineQueue.incrementRetry(action.id)
        results.failed++
        results.errors.push({ 
          actionId: action.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    return results
  },

  /**
   * Process a single queued action
   */
  async processAction(action: QueuedAction): Promise<void> {
    const { type, payload, offlinePhoto } = action

    switch (type) {
      case 'create_catch': {
        // If there's an offline photo, upload it first
        let photoUrl: string | null = null
        if (offlinePhoto) {
          try {
            // Read the locally stored photo
            const base64Data = await offlinePhotoStorage.readPhoto(offlinePhoto.localPath)
            
            // Convert back to File for upload
            const photoFile = await offlinePhotoStorage.base64ToFile(
              base64Data,
              offlinePhoto.fileName,
              offlinePhoto.mimeType
            )
            
            // Upload to Supabase Storage
            const { user_id } = payload as { user_id: string }
            const uploadResult = await uploadCatchPhoto({ file: photoFile, userId: user_id })
            photoUrl = uploadResult.url
            
            // Delete local photo after successful upload
            await offlinePhotoStorage.deletePhoto(offlinePhoto.localPath)
          } catch (photoError) {
            console.error('Failed to upload offline photo:', photoError)
            // Continue without photo rather than failing the entire catch
          }
        }

        // Insert catch with photo URL if available
        const catchData = photoUrl 
          ? { ...payload, photo_url: photoUrl }
          : payload

        const { error } = await supabase
          .from('catches')
          .insert(catchData as Record<string, unknown>)
        if (error) throw new Error(error.message)
        break
      }

      case 'update_catch': {
        const { id, ...updates } = payload as { id: string; [key: string]: unknown }
        const { error } = await supabase
          .from('catches')
          .update(updates)
          .eq('id', id)
        if (error) throw new Error(error.message)
        break
      }

      case 'delete_catch': {
        const { id } = payload as { id: string }
        const { error } = await supabase
          .from('catches')
          .delete()
          .eq('id', id)
        if (error) throw new Error(error.message)
        break
      }

      case 'create_session': {
        const { error } = await supabase
          .from('sessions')
          .insert(payload as Record<string, unknown>)
        if (error) throw new Error(error.message)
        break
      }

      case 'update_session': {
        const { id, ...updates } = payload as { id: string; [key: string]: unknown }
        const { error } = await supabase
          .from('sessions')
          .update(updates)
          .eq('id', id)
        if (error) throw new Error(error.message)
        break
      }

      case 'end_session': {
        const { id, ended_at } = payload as { id: string; ended_at: string }
        const { error } = await supabase
          .from('sessions')
          .update({ ended_at })
          .eq('id', id)
        if (error) throw new Error(error.message)
        break
      }

      case 'create_post': {
        const { error } = await supabase
          .from('posts')
          .insert(payload as Record<string, unknown>)
        if (error) throw new Error(error.message)
        break
      }

      case 'like_post': {
        const { post_id, user_id } = payload as { post_id: string; user_id: string }
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id, user_id })
        if (error) throw new Error(error.message)
        break
      }

      case 'unlike_post': {
        const { post_id, user_id } = payload as { post_id: string; user_id: string }
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post_id)
          .eq('user_id', user_id)
        if (error) throw new Error(error.message)
        break
      }

      case 'add_comment': {
        const { error } = await supabase
          .from('post_comments')
          .insert(payload as Record<string, unknown>)
        if (error) throw new Error(error.message)
        break
      }

      default:
        throw new Error(`Unknown action type: ${type}`)
    }
  },

  /**
   * Check if sync is needed
   */
  async needsSync(): Promise<boolean> {
    return offlineQueue.hasPending()
  },
}
