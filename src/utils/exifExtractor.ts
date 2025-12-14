import { parse } from 'exifr'

export interface PhotoMetadata {
  latitude?: number
  longitude?: number
  timestamp?: string
  cameraMake?: string
  cameraModel?: string
  hasGPS: boolean
  hasTimestamp: boolean
}

/**
 * Extract EXIF metadata from an image file
 * Returns GPS coordinates, timestamp, and camera info for verification
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    
    const exif = await parse(file, {
      gps: true,
      pick: [
        'latitude',
        'longitude',
        'DateTimeOriginal',
        'DateTime',
        'CreateDate',
        'Make',
        'Model',
      ],
    })


    if (!exif) {
      return { hasGPS: false, hasTimestamp: false }
    }

    // Extract GPS coordinates
    const latitude = exif.latitude
    const longitude = exif.longitude
    const hasGPS = typeof latitude === 'number' && typeof longitude === 'number'

    // Extract timestamp (try multiple EXIF fields)
    let timestamp: string | undefined
    const dateFields = [exif.DateTimeOriginal, exif.DateTime, exif.CreateDate]
    
    for (const date of dateFields) {
      if (date) {
        // Convert EXIF date to ISO string
        if (date instanceof Date) {
          timestamp = date.toISOString()
        } else if (typeof date === 'string') {
          // EXIF dates are typically "YYYY:MM:DD HH:MM:SS"
          const parsed = parseExifDate(date)
          if (parsed) {
            timestamp = parsed.toISOString()
          }
        }
        if (timestamp) break
      }
    }

    // Extract camera info
    const cameraMake = exif.Make?.trim()
    const cameraModel = exif.Model?.trim()

    return {
      latitude: hasGPS ? latitude : undefined,
      longitude: hasGPS ? longitude : undefined,
      timestamp,
      cameraMake,
      cameraModel,
      hasGPS,
      hasTimestamp: !!timestamp,
    }
  } catch (error) {
    console.warn('[EXIF] Failed to extract metadata:', error)
    return { hasGPS: false, hasTimestamp: false }
  }
}

/**
 * Parse EXIF date string (format: "YYYY:MM:DD HH:MM:SS") to Date object
 */
function parseExifDate(exifDate: string): Date | null {
  try {
    // Replace colons in date part with dashes
    const normalized = exifDate.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    const date = new Date(normalized)
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}
