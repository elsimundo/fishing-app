/**
 * Validate username format
 * Rules: 3-20 characters, alphanumeric + underscore, no spaces
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const trimmed = username.trim()

  if (trimmed.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' }
  }

  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' }
  }

  if (trimmed.startsWith('_')) {
    return { valid: false, error: 'Username cannot start with underscore' }
  }

  const reserved = ['admin', 'moderator', 'theswim', 'support', 'help', 'api', 'www']
  if (reserved.includes(trimmed.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' }
  }

  return { valid: true }
}

/**
 * Normalize username (lowercase, trim)
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}
