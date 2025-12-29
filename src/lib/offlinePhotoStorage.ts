import { Filesystem, Directory } from '@capacitor/filesystem'

export interface OfflinePhoto {
  localPath: string
  fileName: string
  mimeType: string
}

/**
 * Offline photo storage - saves photos locally when offline,
 * to be uploaded when connection is restored.
 */
export const offlinePhotoStorage = {
  /**
   * Save a photo file locally for offline use
   */
  async savePhoto(file: File): Promise<OfflinePhoto> {
    try {
      // Read file as base64
      const base64 = await this.fileToBase64(file)
      
      // Generate unique filename
      const fileName = `offline_${Date.now()}_${file.name}`
      
      // Save to device filesystem
      const result = await Filesystem.writeFile({
        path: `catches/${fileName}`,
        data: base64,
        directory: Directory.Data,
      })

      return {
        localPath: result.uri,
        fileName,
        mimeType: file.type,
      }
    } catch (error) {
      console.error('Failed to save photo offline:', error)
      throw error
    }
  },

  /**
   * Read a locally stored photo
   */
  async readPhoto(localPath: string): Promise<string> {
    try {
      const result = await Filesystem.readFile({
        path: localPath,
      })
      return result.data as string
    } catch (error) {
      console.error('Failed to read offline photo:', error)
      throw error
    }
  },

  /**
   * Delete a locally stored photo after successful upload
   */
  async deletePhoto(localPath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: localPath,
      })
    } catch (error) {
      console.error('Failed to delete offline photo:', error)
      // Don't throw - photo cleanup is not critical
    }
  },

  /**
   * Convert File to base64 string
   */
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  },

  /**
   * Convert base64 to File object for upload
   */
  async base64ToFile(base64: string, fileName: string, mimeType: string): Promise<File> {
    const response = await fetch(`data:${mimeType};base64,${base64}`)
    const blob = await response.blob()
    return new File([blob], fileName, { type: mimeType })
  },
}
