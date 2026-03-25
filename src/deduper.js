'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
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

  /**
   * Loads persisted state from a JSON file.
   * Entries that have already expired are silently dropped.
   * Safe to call even if the file doesn't exist yet.
   * @param {string} filePath
   */
  async load(filePath) {
    let raw
    try {
      raw = await fs.promises.readFile(filePath, 'utf8')
    } catch (err) {
      if (err.code === 'ENOENT') return // first run — nothing to load
      throw err
    }

    const data = JSON.parse(raw)
    const now = Date.now()
    for (const [key, ts] of Object.entries(data)) {
      if (typeof ts === 'number' && now - ts < this.cooldownMs) {
        this._lastAlert.set(key, ts)
      }
    }
  }

  /**
   * Atomically persists current state to a JSON file (write to tmp + rename).
   * @param {string} filePath
   */
  async save(filePath) {
    const data = Object.fromEntries(this._lastAlert)
    const json = JSON.stringify(data)
    const dir = path.dirname(filePath)
    const tmp = path.join(
      dir,
      `.deduper-tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    )
    await fs.promises.mkdir(dir, { recursive: true })
    await fs.promises.writeFile(tmp, json, 'utf8')
    await fs.promises.rename(tmp, filePath)
  }
}

module.exports = { Deduper, aircraftKey }
