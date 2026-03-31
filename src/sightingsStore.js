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
   */
  add(aircraft, distanceMi = null) {
    const entry = {
      timestamp: Date.now(),
      callsign:
        (aircraft.flight || aircraft.callsign || '').trim().toUpperCase() ||
        null,
      hex: (aircraft.hex || aircraft.icao || '').trim().toLowerCase() || null,
      registration: (aircraft.r || '').trim() || null,
      type: (aircraft.t || aircraft.type || '').trim().toUpperCase() || null,
      distanceMi: distanceMi !== null ? Math.round(distanceMi) : null,
      altitude: aircraft.alt_baro !== undefined ? aircraft.alt_baro : null,
      speed: aircraft.gs !== undefined ? Math.round(aircraft.gs) : null,
      heading: aircraft.track !== undefined ? Math.round(aircraft.track) : null,
      lat: aircraft.lat ?? aircraft.lastPosition?.lat ?? null,
      lon: aircraft.lon ?? aircraft.lastPosition?.lon ?? null,
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
   *
   * @param {object} aircraft
   * @param {number|null} distanceMi
   */
  record(aircraft, distanceMi) {
    const hex =
      (aircraft.hex || aircraft.icao || '').trim().toLowerCase() || null
    const callsign =
      (aircraft.flight || aircraft.callsign || '').trim().toUpperCase() || null

    const now = Date.now()
    const existing = this._sightings.find((s) => {
      if (hex && s.hex === hex) return true
      if (!hex && callsign && s.callsign === callsign) return true
      return false
    })

    if (existing) {
      existing.lastUpdated = now
      existing.lat = aircraft.lat ?? aircraft.lastPosition?.lat ?? existing.lat
      existing.lon = aircraft.lon ?? aircraft.lastPosition?.lon ?? existing.lon
      existing.altitude =
        aircraft.alt_baro !== undefined ? aircraft.alt_baro : existing.altitude
      existing.speed =
        aircraft.gs !== undefined ? Math.round(aircraft.gs) : existing.speed
      existing.heading =
        aircraft.track !== undefined
          ? Math.round(aircraft.track)
          : existing.heading
      existing.distanceMi =
        distanceMi !== null ? Math.round(distanceMi) : existing.distanceMi
    } else {
      this.add(aircraft, distanceMi)
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
