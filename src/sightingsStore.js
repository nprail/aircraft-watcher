import fs from 'fs'
import path from 'path'

const MAX_SIGHTINGS = 500

/**
 * In-memory store for watched-callsign sighting events.
 * Each sighting represents a time the callsign was positively matched and
 * passed the deduplication cooldown (i.e., the same event that fires a webhook).
 *
 * Persisted as a flat JSON array, newest entries first, capped at MAX_SIGHTINGS.
 */
export class SightingsStore {
  constructor() {
    /** @type {Array<object>} */
    this._sightings = []
  }

  /**
   * Records a new sighting.
   * @param {object} aircraft - enriched aircraft object from the poll loop
   * @param {number|null} [distanceMi] - distance from configured location in miles, or null
   * @param {string|null} [matchReason] - 'callsign', 'type', or 'military'
   */
  add(aircraft, distanceMi = null, matchReason = null) {
    const seenAt =
      aircraft.seen != null ? Date.now() - aircraft.seen * 1000 : Date.now()
    const entry = {
      timestamp: seenAt,
      callsign:
        (aircraft.flight || aircraft.callsign || '').trim().toUpperCase() ||
        null,
      hex: (aircraft.hex || aircraft.icao || '').trim().toLowerCase() || null,
      registration: (aircraft.r || '').trim() || null,
      type: (aircraft.t || aircraft.type || '').trim().toUpperCase() || null,
      distanceMi: distanceMi !== null ? Math.round(distanceMi) : null,
      altitude: aircraft.alt_baro != null ? aircraft.alt_baro : null,
      speed: aircraft.gs != null ? Math.round(aircraft.gs) : null,
      heading: aircraft.track != null ? Math.round(aircraft.track) : null,
      lat: aircraft.lat ?? aircraft.lastPosition?.lat ?? null,
      lon: aircraft.lon ?? aircraft.lastPosition?.lon ?? null,
      matchReason,
    }

    this._sightings.unshift(entry)

    // Cap to prevent unbounded growth
    if (this._sightings.length > MAX_SIGHTINGS) {
      this._sightings.length = MAX_SIGHTINGS
    }
  }

  /**
   * Updates the most recent sighting for the same hex code (or callsign if no
   * hex is available), or adds a new entry if none exists. Fields that reflect
   * current position (lat, lon, altitude, speed, heading, distanceMi) are
   * refreshed; the original `timestamp` is preserved and `lastUpdated` is set.
   * No field is ever overwritten with null or undefined — the existing value
   * is kept when the incoming aircraft data has no value for a given field.
   *
   * @param {object} aircraft
   * @param {number|null} distanceMi
   * @param {string|null} [matchReason] - 'callsign', 'type', or 'military'
   */
  record(aircraft, distanceMi, matchReason = null) {
    const hex =
      (aircraft.hex || aircraft.icao || '').trim().toLowerCase() || null
    const callsign =
      (aircraft.flight || aircraft.callsign || '').trim().toUpperCase() || null

    const now =
      aircraft.seen != null ? Date.now() - aircraft.seen * 1000 : Date.now()
    const existing = this._sightings.find((s) => {
      if (hex && s.hex === hex) return true
      if (!hex && callsign && s.callsign === callsign) return true
      return false
    })

    if (existing) {
      existing.lastUpdated = now

      // Only overwrite a field when the incoming value is non-null/non-undefined
      const newCallsign =
        (aircraft.flight || aircraft.callsign || '').trim().toUpperCase() ||
        null
      if (newCallsign != null) existing.callsign = newCallsign

      const newRegistration = (aircraft.r || '').trim() || null
      if (newRegistration != null) existing.registration = newRegistration

      const newType =
        (aircraft.t || aircraft.type || '').trim().toUpperCase() || null
      if (newType != null) existing.type = newType

      const newLat = aircraft.lat ?? aircraft.lastPosition?.lat ?? null
      if (newLat != null) existing.lat = newLat

      const newLon = aircraft.lon ?? aircraft.lastPosition?.lon ?? null
      if (newLon != null) existing.lon = newLon

      if (aircraft.alt_baro != null) existing.altitude = aircraft.alt_baro
      if (aircraft.gs != null) existing.speed = Math.round(aircraft.gs)
      if (aircraft.track != null) existing.heading = Math.round(aircraft.track)
      if (distanceMi != null) existing.distanceMi = Math.round(distanceMi)

      if (matchReason != null) existing.matchReason = matchReason
    } else {
      this.add(aircraft, distanceMi, matchReason)
    }
  }

  /**
   * Returns all sightings (newest first).
   * @param {string} [callsign] - optional filter
   */
  getAll(callsign) {
    if (!callsign) return this._sightings.slice()
    const upper = callsign.trim().toUpperCase()
    return this._sightings.filter((s) => s.callsign === upper)
  }

  /** Number of recorded sightings. */
  get size() {
    return this._sightings.length
  }

  /**
   * Loads persisted sightings from a JSON file.
   * Safe to call when the file does not yet exist.
   * @param {string} filePath
   */
  async load(filePath) {
    let raw
    try {
      raw = await fs.promises.readFile(filePath, 'utf8')
    } catch (err) {
      if (err.code === 'ENOENT') return
      throw err
    }
    const data = JSON.parse(raw)
    if (Array.isArray(data)) {
      // Dedupe by hex (with callsign fallback), keeping the first occurrence
      // (which is the newest, since the array is stored newest-first).
      const seen = new Set()
      const deduped = []
      for (const entry of data) {
        const key = entry.hex
          ? `hex:${entry.hex}`
          : entry.callsign
            ? `cs:${entry.callsign}`
            : null
        if (key === null || !seen.has(key)) {
          if (key !== null) seen.add(key)
          deduped.push(entry)
        }
      }
      this._sightings = deduped.slice(0, MAX_SIGHTINGS)
    }
  }

  /**
   * Atomically persists the current sightings to a JSON file.
   * @param {string} filePath
   */
  async save(filePath) {
    const json = JSON.stringify(this._sightings)
    const dir = path.dirname(filePath)
    const tmp = path.join(
      dir,
      `.sightings-tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(tmp, json, 'utf8')
    await fs.promises.rename(tmp, filePath)
  }
}
