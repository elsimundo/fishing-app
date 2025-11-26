import { supabase } from '../lib/supabase'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
    throw new Error('Please upload a JPG, PNG, or WebP image.')
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Max file size is 5MB.')
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${Date.now()}.${ext}`
  const filePath = `${userId}/${fileName}`

  const { error } = await supabase.storage.from('catch-photos').upload(filePath, file)

  if (error) {
    throw new Error(error.message)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('catch-photos').getPublicUrl(filePath)

  return { url: publicUrl, path: filePath }
}
