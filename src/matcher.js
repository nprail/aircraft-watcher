'use strict'

/**
 * Extracts the callsign/flight from an aircraft object.
 * Checks flight and callsign fields.
 */
function getCallsign(aircraft) {
  return (aircraft.flight || aircraft.callsign || '').trim().toUpperCase()
}

/**
 * Extracts the hex/ICAO address from an aircraft object.
 */
function getHex(aircraft) {
  return (aircraft.hex || aircraft.icao || '').trim().toLowerCase()
}

/**
 * Returns true if the aircraft's callsign is in the watch list.
 * @param {object} aircraft
 * @param {string[]} watchCallsigns - uppercased list of callsigns to watch
 */
function isCallsignMatch(aircraft, watchCallsigns) {
  if (!watchCallsigns || watchCallsigns.length === 0) return false
  const callsign = getCallsign(aircraft)
  if (!callsign) return false
  return watchCallsigns.includes(callsign)
}

/**
 * Returns true if the aircraft appears to be military.
 * Checks explicit military boolean, category strings, and callsign prefix heuristics.
 * @param {object} aircraft
 * @param {string[]} milCallsignPrefixes - uppercased list of military callsign prefixes
 */
function isMilitaryMatch(aircraft, milCallsignPrefixes) {
  // Explicit military flag
  if (aircraft.military === true) return true

  // Category-based detection: look for "military" in the category string
  const category = (aircraft.category || '').toLowerCase()
  if (category.includes('military')) return true

  // Callsign prefix heuristics
  const callsign = getCallsign(aircraft)
  if (callsign && milCallsignPrefixes && milCallsignPrefixes.length > 0) {
    for (const prefix of milCallsignPrefixes) {
      if (callsign.startsWith(prefix)) return true
    }
  }

  return false
}

/**
 * Returns true if the aircraft should trigger an alert.
 * @param {object} aircraft
 * @param {object} config - parsed config object
 */
function isInteresting(aircraft, config) {
  if (isCallsignMatch(aircraft, config.watchCallsigns)) return true
  if (
    config.enableMilitaryHeuristics &&
    isMilitaryMatch(aircraft, config.milCallsignPrefixes)
  )
    return true
  return false
}

module.exports = {
  getCallsign,
  getHex,
  isCallsignMatch,
  isMilitaryMatch,
  isInteresting,
}
