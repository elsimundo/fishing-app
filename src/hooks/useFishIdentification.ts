import { useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import type { FishIdentificationResult, FishIdentificationError } from '../types/fish'
import { identifyFishFromPhoto } from '../services/fishIdentificationService'

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Invalid image'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

async function resizeImageToBase64(file: File, maxSize = 1280): Promise<string> {
  const img = await fileToImage(file)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas not supported')
  }

  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
  const width = img.width * ratio
  const height = img.height * ratio

  canvas.width = width
  canvas.height = height

  ctx.drawImage(img, 0, 0, width, height)

  return canvas.toDataURL('image/jpeg', 0.85)
}

export function useFishIdentification() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<FishIdentificationResult | null>(null)
  const [error, setError] = useState<FishIdentificationError | null>(null)

  const identifyFish = useCallback(async (file: File) => {
    setLoading(true)
    setError(null)

    try {
      const base64 = await resizeImageToBase64(file)
      const base64Data = base64.split(',')[1] ?? ''
      const res = await identifyFishFromPhoto(base64Data)
      setResult(res)
      return res
    } catch (err) {
      const typedError: FishIdentificationError =
        err && typeof err === 'object' && 'type' in err
          ? (err as FishIdentificationError)
          : { type: 'unknown', message: err instanceof Error ? err.message : 'Failed to identify fish' }

      setError(typedError)
      toast.error(typedError.message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { identifyFish, loading, result, error, reset }
}
