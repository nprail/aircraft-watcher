import config from './config.js'
import logger from './logger.js'
import { haversineDistanceMiles } from './formatter.js'
import { notifyWebhook } from './webhook.js'
import { notifyNtfy } from './ntfy.js'
import * as aircraftDb from './aircraftDb.js'

/**
 * Fetches the aircraft list from the configured tar1090 feed.
 * @returns {Promise<object[]>}
 */
export async function fetchAircraft() {
  const feedUrl = `${config.tar1090Url.replace(/\/$/, '')}/data/aircraft.json`
  const res = await fetch(feedUrl, {
    signal: AbortSignal.timeout(config.fetchTimeoutMs),
  })
  if (!res.ok) {
    throw new Error(`Feed returned HTTP ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  return Array.isArray(json.aircraft) ? json.aircraft : []
}

/** Enriches an aircraft object in-place with DB registration/type info and position fallback. */
export function enrichAircraft(ac) {
  const hex = ac.hex || ac.icao || ''
  const dbInfo = aircraftDb.getAircraftInfo(hex)
  if (dbInfo) {
    if (!ac.r && dbInfo.registration) ac.r = dbInfo.registration
    if (!ac.t && dbInfo.typeCode) ac.t = dbInfo.typeCode
    if (dbInfo.isMilitary) ac.military = true
  }

  if (ac.lat === undefined && ac.lastPosition?.lat !== undefined)
    ac.lat = ac.lastPosition.lat
  if (ac.lon === undefined && ac.lastPosition?.lon !== undefined)
    ac.lon = ac.lastPosition.lon
}

/**
 * Returns the great-circle distance in miles from the configured home location
 * to the aircraft, or null if either endpoint is unavailable.
 */
export function computeDistanceMi(ac) {
  const { lat: cfgLat, lon: cfgLon } = config.location
  if (
    cfgLat === null ||
    cfgLon === null ||
    ac.lat === undefined ||
    ac.lon === undefined
  ) {
    return null
  }
  return haversineDistanceMiles(cfgLat, cfgLon, ac.lat, ac.lon)
}

/** Sends an alert to all configured notification channels. */
export async function sendNotifications(payload) {
  try {
    await notifyWebhook(payload)
    logger.info('Webhook notified')
  } catch (err) {
    logger.error('Webhook error', { error: err.message })
  }

  try {
    await notifyNtfy(payload)
    logger.info('ntfy notified')
  } catch (err) {
    logger.error('ntfy error', { error: err.message })
  }
}
