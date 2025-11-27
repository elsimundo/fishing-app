import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CatchCard } from '../CatchCard'
import type { Catch } from '../../../types'

const baseCatch: Catch = {
  id: '1',
  user_id: 'u1',
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
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

test('renders species, location and formatted weight', () => {
  render(
    <MemoryRouter>
      <CatchCard item={baseCatch} />
    </MemoryRouter>,
  )

  expect(screen.getByText('Bass')).toBeInTheDocument()
  expect(screen.getByText('Southend Pier')).toBeInTheDocument()
  expect(screen.getByText('2.5 kg')).toBeInTheDocument()
})