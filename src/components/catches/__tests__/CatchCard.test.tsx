import { test, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CatchCard } from '../CatchCard'
import type { Catch } from '../../../types'

// Mock localStorage
beforeAll(() => {
  const localStorageMock = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
  vi.stubGlobal('localStorage', localStorageMock)
})

// Mock useAuth hook
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false, signOut: vi.fn() })
}))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
})

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
)

const baseCatch: Catch = {
  id: '1',
  user_id: 'u1',
  session_id: null,
  species: 'Bass',
  weight_kg: 2.5,
  length_cm: 55,
  caught_at: new Date('2024-01-01T12:00:00Z').toISOString(),
  location_name: 'Southend Pier',
  latitude: 51.5,
  longitude: 0.7,
  bait: null,
  rig: null,
  fishing_style: null,
  photo_url: null,
  notes: null,
  weather_temp: null,
  weather_condition: null,
  wind_speed: null,
  moon_phase: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

test('renders species, location and formatted weight', () => {
  render(<CatchCard item={baseCatch} />, { wrapper: Wrapper })

  // Text is combined: "Bass · 5 lb 8.2 oz · 55 cm"
  expect(screen.getByText(/Bass/)).toBeInTheDocument()
  expect(screen.getByText(/Southend Pier/)).toBeInTheDocument()
  expect(screen.getByText(/5 lb 8.2 oz/)).toBeInTheDocument()
})
