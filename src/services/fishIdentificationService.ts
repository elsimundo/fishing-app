import type { FishIdentificationResult, FishIdentificationError } from '../types/fish'
import { supabase } from '../lib/supabase'
import { trackApiCall } from '../lib/apiTracker'

const EDGE_FUNCTION_NAME = 'identify-fish'

interface IdentifyFishResponse extends FishIdentificationResult {}

export async function identifyFishFromPhoto(imageBase64: string): Promise<FishIdentificationResult> {
  if (!imageBase64) {
    const error: FishIdentificationError = {
      type: 'invalid_image',
      message: 'Please upload a valid image',
    }
    throw error
  }

  const { data, error } = await supabase.functions.invoke<IdentifyFishResponse>(EDGE_FUNCTION_NAME, {
    body: { imageBase64 },
  })

  if (error) {
    const status = (error as any).status ?? 500
    const message = error.message || 'Failed to identify fish'

    const mappedError: FishIdentificationError =
      status === 401 || status === 403
        ? { type: 'missing_api_key', message: 'AI identification is not configured yet' }
        : status === 429
        ? { type: 'rate_limit', message: 'Too many requests, please try again later' }
        : status >= 500
        ? { type: 'network', message: 'Network error, please try again' }
        : { type: 'unknown', message }

    throw mappedError
  }

  if (!data) {
    const error: FishIdentificationError = {
      type: 'parse',
      message: 'Could not read identification result. Please try again.',
    }
    throw error
  }

  // Track API call
  trackApiCall({ apiName: 'fish_identifier_ai', endpoint: 'identify' })

  return data
}
