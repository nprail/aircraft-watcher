import { vi, describe, test, expect, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock config so we can control location without touching the real settings
// ---------------------------------------------------------------------------

vi.mock('../config.js', () => ({
  default: {
    location: { lat: 37.0, lon: -122.0 },
  },
}))

import { haversineDistanceMiles, formatMessage } from '../formatter.js'
import config from '../config.js'

// ---------------------------------------------------------------------------
// haversineDistanceMiles
// ---------------------------------------------------------------------------

describe('haversineDistanceMiles', () => {
  test('returns 0 for identical points', () => {
    expect(haversineDistanceMiles(37.0, -122.0, 37.0, -122.0)).toBe(0)
  })

  test('returns a positive number for two different points', () => {
    const d = haversineDistanceMiles(37.0, -122.0, 38.0, -121.0)
    expect(d).toBeGreaterThan(0)
  })

  test('distance is symmetric', () => {
    const d1 = haversineDistanceMiles(37.0, -122.0, 38.0, -121.0)
    const d2 = haversineDistanceMiles(38.0, -121.0, 37.0, -122.0)
    expect(d1).toBeCloseTo(d2, 5)
  })

  test('approx distance LAX to JFK is ~2475 miles', () => {
    // LAX: 33.9425, -118.4081  JFK: 40.6413, -73.7781
    const d = haversineDistanceMiles(33.9425, -118.4081, 40.6413, -73.7781)
    expect(d).toBeGreaterThan(2400)
    expect(d).toBeLessThan(2550)
  })

  test('handles negative latitudes and longitudes', () => {
    const d = haversineDistanceMiles(-33.87, 151.21, -37.81, 144.96)
    expect(d).toBeGreaterThan(0)
  })

  test('poles are ~12450 miles apart (antipodal)', () => {
    const d = haversineDistanceMiles(90, 0, -90, 0)
    // Half circumference ≈ 12,436 miles
    expect(d).toBeGreaterThan(12000)
    expect(d).toBeLessThan(13000)
  })

  test('returns a number type', () => {
    const d = haversineDistanceMiles(0, 0, 0, 1)
    expect(typeof d).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// formatMessage
// ---------------------------------------------------------------------------

describe('formatMessage', () => {
  beforeEach(() => {
    config.location = { lat: 37.0, lon: -122.0 }
  })

  const fullAc = {
    flight: 'UAL123',
    r: 'N12345',
    t: 'B738',
    alt_baro: 35000,
    gs: 480.7,
    track: 270.4,
    lat: 37.5,
    lon: -122.5,
  }

  test('includes callsign in output', () => {
    const msg = formatMessage(fullAc)
    expect(msg).toContain('UAL123')
  })

  test('includes registration in output', () => {
    const msg = formatMessage(fullAc)
    expect(msg).toContain('N12345')
  })

  test('includes type in output', () => {
    const msg = formatMessage(fullAc)
    expect(msg).toContain('B738')
  })

  test('includes altitude in output', () => {
    const msg = formatMessage(fullAc)
    expect(msg).toContain('35000 ft')
  })

  test('rounds speed to nearest integer', () => {
    const msg = formatMessage(fullAc)
    expect(msg).toContain('481 kts')
  })

  test('rounds heading to nearest integer', () => {
    const msg = formatMessage(fullAc)
    expect(msg).toContain('270°')
  })

  test('shows N/A for missing callsign', () => {
    const msg = formatMessage({ r: 'N1', t: 'C172', alt_baro: 1000, gs: 90 })
    expect(msg).toContain('N/A')
  })

  test('shows N/A for missing registration', () => {
    const msg = formatMessage({ flight: 'UAL1' })
    expect(msg).toContain('N/A')
  })

  test('shows N/A for missing altitude', () => {
    const msg = formatMessage({ flight: 'UAL1' })
    expect(msg).toContain('N/A')
  })

  test('shows N/A for missing speed', () => {
    const msg = formatMessage({ flight: 'UAL1', alt_baro: 5000 })
    expect(msg).toContain('N/A')
  })

  test('shows N/A for missing heading', () => {
    const msg = formatMessage({ flight: 'UAL1', alt_baro: 5000, gs: 300 })
    expect(msg).toContain('N/A')
  })

  test('includes MILITARY tag for military aircraft', () => {
    const msg = formatMessage({ ...fullAc, military: true })
    expect(msg).toContain('(MILITARY)')
  })

  test('does not include MILITARY tag for non-military aircraft', () => {
    const msg = formatMessage(fullAc)
    expect(msg).not.toContain('MILITARY')
  })

  test('shows distance when location and aircraft position are available', () => {
    const msg = formatMessage(fullAc)
    expect(msg).toMatch(/\d+ mi/)
  })

  test('shows N/A for distance when config location is null', () => {
    config.location = { lat: null, lon: null }
    const msg = formatMessage(fullAc)
    expect(msg).toContain('Distance: N/A')
  })

  test('shows N/A for distance when aircraft has no position', () => {
    const ac = { flight: 'UAL1', r: 'N1', t: 'B738', alt_baro: 5000 }
    const msg = formatMessage(ac)
    expect(msg).toContain('Distance: N/A')
  })

  test('uses lastPosition for distance when direct lat/lon absent', () => {
    const ac = {
      flight: 'UAL1',
      lastPosition: { lat: 37.5, lon: -122.5 },
    }
    const msg = formatMessage(ac)
    expect(msg).toMatch(/\d+ mi/)
  })

  test('uses type field as fallback for t', () => {
    const ac = { flight: 'UAL1', type: 'A320' }
    const msg = formatMessage(ac)
    expect(msg).toContain('A320')
  })

  test('uses category as fallback when both t and type absent', () => {
    const ac = { flight: 'UAL1', category: 'Small' }
    const msg = formatMessage(ac)
    expect(msg).toContain('Small')
  })

  test('trims whitespace from registration field', () => {
    const ac = { flight: 'UAL1', r: '  N12345  ' }
    const msg = formatMessage(ac)
    expect(msg).toContain('N12345')
  })

  test('returns a multi-line string', () => {
    const msg = formatMessage(fullAc)
    expect(msg.split('\n').length).toBeGreaterThan(1)
  })
})
