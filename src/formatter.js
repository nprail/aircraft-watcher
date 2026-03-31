import { getCallsign, getHex } from './matcher.js'
import config from './config.js'

/**
 * Calculates the distance in miles between two lat/lon points using the Haversine formula.
 */
export function haversineDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8 // Earth radius in miles
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Formats an aircraft alert into a human-readable message.
 * @param {object} aircraft
 * @returns {string}
 */
export function formatMessage(aircraft) {
  const callsign = getCallsign(aircraft) || 'N/A'
  const registration = (aircraft.r || '').trim() || 'N/A'
  const type = (aircraft.t || aircraft.type || aircraft.category || 'N/A')
    .toString()
    .trim()
  const altitude =
    aircraft.alt_baro !== undefined ? `${aircraft.alt_baro} ft` : 'N/A'
  const speed =
    aircraft.gs !== undefined ? `${Math.round(aircraft.gs)} kts` : 'N/A'
  const heading =
    aircraft.track !== undefined ? `${Math.round(aircraft.track)}°` : 'N/A'

  const isMilitary = aircraft.military === true
  const militaryStr = isMilitary ? ' (MILITARY)' : ''

  let distanceStr = 'N/A'
  const { lat: cfgLat, lon: cfgLon } = config.location
  if (
    cfgLat !== null &&
    cfgLon !== null &&
    (aircraft.lat ?? aircraft.lastPosition?.lat) !== undefined &&
    (aircraft.lon ?? aircraft.lastPosition?.lon) !== undefined
  ) {
    const lat = aircraft.lat ?? aircraft.lastPosition?.lat
    const lon = aircraft.lon ?? aircraft.lastPosition?.lon
    const miles = haversineDistanceMiles(cfgLat, cfgLon, lat, lon)
    distanceStr = `${Math.round(miles)} mi`
  }

  const message = [
    `Callsign: ${callsign}  Reg: ${registration}${militaryStr}`,
    `Type: ${type}`,
    `Alt: ${altitude}  Spd: ${speed}  Hdg: ${heading}`,
    `Distance: ${distanceStr}`,
  ].join('\n')

  return message
}
