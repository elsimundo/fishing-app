import { supabase } from '../lib/supabase'
import { compressPhoto } from '../utils/imageCompression'

const MAX_FILE_SIZE_BEFORE_COMPRESSION = 20 * 1024 * 1024 // 20MB max before compression
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

export type PhotoUploadResult = {
  url: string
  path: string
}

export async function uploadCatchPhoto(params: {
  file: File
  userId: string
}): Promise<PhotoUploadResult> {
  const { file, userId } = params

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a JPG, PNG, WebP, or HEIC image.')
  }

  if (file.size > MAX_FILE_SIZE_BEFORE_COMPRESSION) {
    throw new Error('Image must be less than 20MB.')
  }

  // Compress the image before upload
  const compressedFile = await compressPhoto(file)

  const fileName = `${Date.now()}.jpg` // Always jpg after compression
  const filePath = `${userId}/${fileName}`

  const { error } = await supabase.storage.from('catch-photos').upload(filePath, compressedFile)

  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('catch-photos').getPublicUrl(filePath)

  return { url: publicUrl, path: filePath }
}
