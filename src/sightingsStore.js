'use strict'

const fs = require('fs')
const path = require('path')

const MAX_SIGHTINGS = 500

/**
 * In-memory store for watched-callsign sighting events.
 * Each sighting represents a time the callsign was positively matched and
 * passed the deduplication cooldown (i.e., the same event that fires a webhook).
 *
 * Persisted as a flat JSON array, newest entries first, capped at MAX_SIGHTINGS.
 */
class SightingsStore {
  constructor() {
    /** @type {Array<object>} */
    this._sightings = []
  }

  /**
   * Records a new sighting.
   * @param {object} aircraft - enriched aircraft object from the poll loop
   */
  add(aircraft) {
    const entry = {
      timestamp: Date.now(),
      callsign: (aircraft.flight || aircraft.callsign || '').trim().toUpperCase() || null,
      hex: (aircraft.hex || aircraft.icao || '').trim().toLowerCase() || null,
      registration: (aircraft.r || '').trim() || null,
      type: (aircraft.t || aircraft.type || '').trim().toUpperCase() || null,
      altitude: aircraft.alt_baro !== undefined ? aircraft.alt_baro : null,
      speed: aircraft.gs !== undefined ? Math.round(aircraft.gs) : null,
      heading: aircraft.track !== undefined ? Math.round(aircraft.track) : null,
      lat: aircraft.lat !== undefined ? aircraft.lat : null,
      lon: aircraft.lon !== undefined ? aircraft.lon : null,
    }

    this._sightings.unshift(entry)

    // Cap to prevent unbounded growth
    if (this._sightings.length > MAX_SIGHTINGS) {
      this._sightings.length = MAX_SIGHTINGS
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
      this._sightings = data.slice(0, MAX_SIGHTINGS)
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

module.exports = { SightingsStore }
