import type { Session } from '../types'

export type ViewerRole = 'owner' | 'guest'

export function getLocationPrivacyLabel(session: Session): string {
  switch (session.location_privacy) {
    case 'private':
      return 'Private location'
    case 'general':
      return 'General area'
    case 'exact':
    default:
      return 'Exact location'
  }
}

// Placeholder for future use: when we add guest/shared views, this helper
// can decide whether to mask or offset coordinates based on viewer role.
export function getDisplayCoordinates(
  session: Session,
  _viewerRole: ViewerRole,
): { latitude: number; longitude: number } {
  return {
    latitude: session.latitude,
    longitude: session.longitude,
  }
}
