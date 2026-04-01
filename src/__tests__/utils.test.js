import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module mocks – must be declared before any import that transitively uses them
// ---------------------------------------------------------------------------

vi.mock('../config.js', () => ({
  default: {
    tar1090Url: 'http://localhost:8080',
    fetchTimeoutMs: 15000,
    location: { lat: 37.0, lon: -122.0 },
  },
}))

vi.mock('../aircraftDb.js', () => ({
  getAircraftInfo: vi.fn(),
}))

vi.mock('../webhook.js', () => ({
  notifyWebhook: vi.fn(),
}))

vi.mock('../ntfy.js', () => ({
  notifyNtfy: vi.fn(),
}))

vi.mock('../formatter.js', () => ({
  haversineDistanceMiles: vi.fn(() => 42),
}))

// Import after mocks are registered
import {
  fetchAircraft,
  enrichAircraft,
  computeDistanceMi,
  sendNotifications,
} from '../utils.js'
import * as aircraftDb from '../aircraftDb.js'
import * as webhook from '../webhook.js'
import * as ntfy from '../ntfy.js'
import { haversineDistanceMiles } from '../formatter.js'
import config from '../config.js'

// ---------------------------------------------------------------------------
// fetchAircraft
// ---------------------------------------------------------------------------

describe('fetchAircraft', () => {
  let fetchSpy

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  test('returns aircraft array from feed', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aircraft: [{ hex: 'aaa' }, { hex: 'bbb' }] }),
    })

    const result = await fetchAircraft()
    expect(result).toEqual([{ hex: 'aaa' }, { hex: 'bbb' }])
  })

  test('calls the correct URL from config', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aircraft: [] }),
    })

    await fetchAircraft()
    const calledUrl = fetchSpy.mock.calls[0][0]
    expect(calledUrl).toBe('http://localhost:8080/data/aircraft.json')
  })

  test('strips trailing slash from tar1090Url', async () => {
    config.tar1090Url = 'http://localhost:8080/'
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aircraft: [] }),
    })

    await fetchAircraft()
    const calledUrl = fetchSpy.mock.calls[0][0]
    expect(calledUrl).toBe('http://localhost:8080/data/aircraft.json')
    config.tar1090Url = 'http://localhost:8080' // restore
  })

  test('returns empty array when aircraft field is absent', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    const result = await fetchAircraft()
    expect(result).toEqual([])
  })

  test('returns empty array when aircraft field is not an array', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aircraft: null }),
    })

    const result = await fetchAircraft()
    expect(result).toEqual([])
  })

  test('throws when feed returns non-OK HTTP status', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    })

    await expect(fetchAircraft()).rejects.toThrow('Feed returned HTTP 503')
  })

  test('throws when fetch rejects (network error)', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network failure'))
    await expect(fetchAircraft()).rejects.toThrow('Network failure')
  })

  test('passes AbortSignal with configured timeout', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ aircraft: [] }),
    })

    await fetchAircraft()
    const options = fetchSpy.mock.calls[0][1]
    expect(options).toHaveProperty('signal')
  })
})

// ---------------------------------------------------------------------------
// enrichAircraft
// ---------------------------------------------------------------------------

describe('enrichAircraft', () => {
  beforeEach(() => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReset()
  })

  test('adds registration from DB when ac.r is absent', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce({
      registration: 'N12345',
      typeCode: 'B738',
      isMilitary: false,
    })
    const ac = { hex: 'abc' }
    enrichAircraft(ac)
    expect(ac.r).toBe('N12345')
  })

  test('does not overwrite existing ac.r', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce({
      registration: 'N99999',
      typeCode: '',
      isMilitary: false,
    })
    const ac = { hex: 'abc', r: 'N12345' }
    enrichAircraft(ac)
    expect(ac.r).toBe('N12345')
  })

  test('adds type code from DB when ac.t is absent', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce({
      registration: '',
      typeCode: 'C130',
      isMilitary: false,
    })
    const ac = { hex: 'abc' }
    enrichAircraft(ac)
    expect(ac.t).toBe('C130')
  })

  test('does not overwrite existing ac.t', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce({
      registration: '',
      typeCode: 'B738',
      isMilitary: false,
    })
    const ac = { hex: 'abc', t: 'C130' }
    enrichAircraft(ac)
    expect(ac.t).toBe('C130')
  })

  test('sets military flag when DB reports isMilitary', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce({
      registration: 'MIL001',
      typeCode: 'C17',
      isMilitary: true,
    })
    const ac = { hex: 'abc' }
    enrichAircraft(ac)
    expect(ac.military).toBe(true)
  })

  test('does not set military flag when isMilitary is false', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce({
      registration: '',
      typeCode: '',
      isMilitary: false,
    })
    const ac = { hex: 'abc' }
    enrichAircraft(ac)
    expect(ac.military).toBeUndefined()
  })

  test('falls back to icao field when hex is absent', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce({
      registration: 'N99',
      typeCode: 'PA28',
      isMilitary: false,
    })
    const ac = { icao: 'def456' }
    enrichAircraft(ac)
    expect(aircraftDb.getAircraftInfo).toHaveBeenCalledWith('def456')
    expect(ac.r).toBe('N99')
  })

  test('works when DB returns null (unknown aircraft)', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce(null)
    const ac = { hex: 'unknown' }
    expect(() => enrichAircraft(ac)).not.toThrow()
    expect(ac.r).toBeUndefined()
    expect(ac.t).toBeUndefined()
    expect(ac.military).toBeUndefined()
  })

  test('uses lastPosition.lat/lon when lat/lon absent', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce(null)
    const ac = {
      hex: 'abc',
      lastPosition: { lat: 40.0, lon: -75.0 },
    }
    enrichAircraft(ac)
    expect(ac.lat).toBe(40.0)
    expect(ac.lon).toBe(-75.0)
  })

  test('does not overwrite existing lat/lon with lastPosition', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce(null)
    const ac = {
      hex: 'abc',
      lat: 10.0,
      lon: 20.0,
      lastPosition: { lat: 40.0, lon: -75.0 },
    }
    enrichAircraft(ac)
    expect(ac.lat).toBe(10.0)
    expect(ac.lon).toBe(20.0)
  })

  test('handles missing hex and icao gracefully', () => {
    vi.mocked(aircraftDb.getAircraftInfo).mockReturnValueOnce(null)
    const ac = { flight: 'AAL1' }
    expect(() => enrichAircraft(ac)).not.toThrow()
    expect(aircraftDb.getAircraftInfo).toHaveBeenCalledWith('')
  })
})

// ---------------------------------------------------------------------------
// computeDistanceMi
// ---------------------------------------------------------------------------

describe('computeDistanceMi', () => {
  beforeEach(() => {
    // Reset config location to known values
    config.location = { lat: 37.0, lon: -122.0 }
    vi.mocked(haversineDistanceMiles).mockReturnValue(42)
  })

  test('returns distance in miles when all coords available', () => {
    const ac = { lat: 38.0, lon: -121.0 }
    const dist = computeDistanceMi(ac)
    expect(dist).toBe(42)
    expect(haversineDistanceMiles).toHaveBeenCalledWith(
      37.0,
      -122.0,
      38.0,
      -121.0,
    )
  })

  test('returns null when config lat is null', () => {
    config.location = { lat: null, lon: -122.0 }
    const ac = { lat: 38.0, lon: -121.0 }
    expect(computeDistanceMi(ac)).toBeNull()
  })

  test('returns null when config lon is null', () => {
    config.location = { lat: 37.0, lon: null }
    const ac = { lat: 38.0, lon: -121.0 }
    expect(computeDistanceMi(ac)).toBeNull()
  })

  test('returns null when aircraft lat is undefined', () => {
    const ac = { lon: -121.0 }
    expect(computeDistanceMi(ac)).toBeNull()
  })

  test('returns null when aircraft lon is undefined', () => {
    const ac = { lat: 38.0 }
    expect(computeDistanceMi(ac)).toBeNull()
  })

  test('returns null when aircraft has no position at all', () => {
    expect(computeDistanceMi({})).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// sendNotifications
// ---------------------------------------------------------------------------

describe('sendNotifications', () => {
  const payload = { title: 'Test', message: 'Hello', url: 'http://example.com' }

  beforeEach(() => {
    vi.mocked(webhook.notifyWebhook).mockReset()
    vi.mocked(ntfy.notifyNtfy).mockReset()
  })

  test('calls notifyWebhook and notifyNtfy with payload', async () => {
    vi.mocked(webhook.notifyWebhook).mockResolvedValueOnce(undefined)
    vi.mocked(ntfy.notifyNtfy).mockResolvedValueOnce(undefined)

    await sendNotifications(payload)

    expect(webhook.notifyWebhook).toHaveBeenCalledWith(payload)
    expect(ntfy.notifyNtfy).toHaveBeenCalledWith(payload)
  })

  test('still calls ntfy when webhook throws', async () => {
    vi.mocked(webhook.notifyWebhook).mockRejectedValueOnce(
      new Error('webhook down'),
    )
    vi.mocked(ntfy.notifyNtfy).mockResolvedValueOnce(undefined)

    await expect(sendNotifications(payload)).resolves.toBeUndefined()
    expect(ntfy.notifyNtfy).toHaveBeenCalledWith(payload)
  })

  test('still calls webhook when ntfy throws', async () => {
    vi.mocked(webhook.notifyWebhook).mockResolvedValueOnce(undefined)
    vi.mocked(ntfy.notifyNtfy).mockRejectedValueOnce(new Error('ntfy down'))

    await expect(sendNotifications(payload)).resolves.toBeUndefined()
    expect(webhook.notifyWebhook).toHaveBeenCalledWith(payload)
  })

  test('resolves even when both channels throw', async () => {
    vi.mocked(webhook.notifyWebhook).mockRejectedValueOnce(
      new Error('webhook down'),
    )
    vi.mocked(ntfy.notifyNtfy).mockRejectedValueOnce(new Error('ntfy down'))

    await expect(sendNotifications(payload)).resolves.toBeUndefined()
  })

  test('does not throw when payload fields are absent', async () => {
    vi.mocked(webhook.notifyWebhook).mockResolvedValueOnce(undefined)
    vi.mocked(ntfy.notifyNtfy).mockResolvedValueOnce(undefined)

    await expect(sendNotifications({})).resolves.toBeUndefined()
  })
})
