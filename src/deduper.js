'use strict'

const { getHex, getCallsign } = require('./matcher')

/**
 * Builds a stable deduplication key for an aircraft.
 * Prefers hex, then falls back to callsign.
 */
function aircraftKey(aircraft) {
  const hex = getHex(aircraft)
  if (hex) return `hex:${hex}`
  const callsign = getCallsign(aircraft)
  if (callsign) return `callsign:${callsign}`
  return null
}

class Deduper {
  /**
   * @param {number} cooldownSec - seconds before the same aircraft can be alerted again
   */
  constructor(cooldownSec) {
    this.cooldownMs = (cooldownSec || 1200) * 1000
    /** @type {Map<string, number>} key -> last alert timestamp (ms) */
    this._lastAlert = new Map()
  }

  /**
   * Returns true if an alert should be sent for this aircraft.
   * Marks the aircraft as alerted if returning true.
   * @param {object} aircraft
   * @param {number} [nowMs] - override current time for testing
   */
  shouldAlert(aircraft, nowMs) {
    const key = aircraftKey(aircraft)
    if (!key) return false

    const now = nowMs !== undefined ? nowMs : Date.now()
    const last = this._lastAlert.get(key)

    if (last !== undefined && now - last < this.cooldownMs) return false

    this._lastAlert.set(key, now)
    return true
  }

  /**
   * Returns the last alert timestamp for an aircraft, or null if never alerted.
   * @param {object} aircraft
   */
  getLastAlertTime(aircraft) {
    const key = aircraftKey(aircraft)
    if (!key) return null
    return this._lastAlert.get(key) || null
  }

  /**
   * Clears expired entries to prevent unbounded memory growth.
   * Should be called periodically (e.g. once per poll cycle).
   * @param {number} [nowMs]
   */
  evictExpired(nowMs) {
    const now = nowMs !== undefined ? nowMs : Date.now()
    for (const [key, ts] of this._lastAlert) {
      if (now - ts >= this.cooldownMs) {
        this._lastAlert.delete(key)
      }
    }
  }

  /** Number of tracked aircraft. */
  get size() {
    return this._lastAlert.size
  }
}

module.exports = { Deduper, aircraftKey }
