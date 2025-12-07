/**
 * Compress an image file to a target size
 * Uses Canvas API to resize and compress
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number
    maxHeight?: number
    maxSizeMB?: number
    quality?: number
  } = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    maxSizeMB = 1,
    quality = 0.8
  } = options

  const maxSizeBytes = maxSizeMB * 1024 * 1024

  // If already small enough, return original
  if (file.size <= maxSizeBytes) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height
        height = maxHeight
      }

      canvas.width = width
      canvas.height = height

      // Draw image
      ctx?.drawImage(img, 0, 0, width, height)

      // Try different quality levels to get under max size
      const tryCompress = (currentQuality: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'))
              return
            }

            // If still too large and quality can be reduced, try again
            if (blob.size > maxSizeBytes && currentQuality > 0.1) {
              tryCompress(currentQuality - 0.1)
              return
            }

            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })

            resolve(compressedFile)
          },
          'image/jpeg',
          currentQuality
        )
      }

      tryCompress(quality)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Load image from file
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Compress an avatar image (smaller dimensions, smaller file)
 */
export async function compressAvatar(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 500,
    maxHeight: 500,
    maxSizeMB: 0.5,
    quality: 0.85
  })
}

/**
 * Compress a photo for posts/catches (larger, but still compressed)
 */
export async function compressPhoto(file: File): Promise<File> {
  return compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1920,
    maxSizeMB: 2,
    quality: 0.85
  })
}
