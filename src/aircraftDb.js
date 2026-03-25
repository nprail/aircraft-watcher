'use strict'

const zlib = require('zlib')
const { promisify } = require('util')
const logger = require('./logger')

const gunzip = promisify(zlib.gunzip)

const DB_URL =
  'https://github.com/wiedehopf/tar1090-db/raw/refs/heads/csv/aircraft.csv.gz'
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours
const FETCH_TIMEOUT_MS = 30_000

// Map<hex, { registration, typeCode, isMilitary }>
let db = new Map()
let refreshTimer = null

/**
 * Downloads and parses the tar1090 aircraft.csv.gz database.
 * CSV format (no header): icao24hex,registration,typecode,dbFlags,...
 * dbFlags bit 0 = military.
 */
async function downloadAndParse() {
  const res = await fetch(DB_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`)
  }

  const compressed = Buffer.from(await res.arrayBuffer())
  const decompressed = await gunzip(compressed)
  const text = decompressed.toString('utf8')

  const newDb = new Map()
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('icao24'))
      continue

    const parts = trimmed.split(';')
    const hex = parts[0] ? parts[0].trim().toLowerCase() : ''
    if (!hex || hex.length > 6) continue

    const registration = parts[1] ? parts[1].trim() : ''
    const typeCode = parts[2] ? parts[2].trim() : ''
    const dbFlags = parts[3] ? parseInt(parts[3].trim(), 10) : 0
    const isMilitary = Number.isFinite(dbFlags) && (dbFlags & 1) !== 0

    newDb.set(hex, { registration, typeCode, isMilitary })
  }

  return newDb
}

async function refreshDb() {
  try {
    logger.info('Downloading aircraft DB from tar1090-db')
    const newDb = await downloadAndParse()
    db = newDb
    logger.info('Aircraft DB loaded', { entries: db.size })
  } catch (err) {
    logger.error('Failed to load aircraft DB', { error: err.message })
    // Keep the existing DB if we already have one
  }
}

/**
 * Initialises the DB and schedules daily refreshes.
 * Resolves once the first load attempt completes (success or failure).
 */
async function init() {
  await refreshDb()
  refreshTimer = setInterval(refreshDb, REFRESH_INTERVAL_MS)
  // Don't keep the Node process alive just for the refresh timer
  if (refreshTimer.unref) refreshTimer.unref()
}

/**
 * Returns stored info for the given ICAO hex address, or null if unknown.
 * @param {string} hex
 * @returns {{ registration: string, typeCode: string, isMilitary: boolean } | null}
 */
function getAircraftInfo(hex) {
  if (!hex) return null
  return db.get(hex.toLowerCase()) || null
}

function shutdown() {
  if (refreshTimer) clearInterval(refreshTimer)
}

module.exports = { init, getAircraftInfo, shutdown }
