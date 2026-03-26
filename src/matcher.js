'use strict'

/**
 * ICAO type designators for aircraft that are primarily civilian.
 * Military variants of these airframes (e.g., USAF Cessna 172 trainers) are
 * intentionally excluded from military alerts because they are not tactically
 * significant and generate noise.
 */
const CIVILIAN_TYPE_CODES = new Set([
  // Cessna piston singles
  'C120',
  'C140',
  'C150',
  'C152',
  'C162',
  'C165',
  'C170',
  'C172',
  'C175',
  'C177',
  'C180',
  'C182',
  'C185',
  'C188',
  'C190',
  'C195',
  'C205',
  'C206',
  'C207',
  'C208',
  'C210',
  // Cessna piston singles (high-performance)
  'C350',
  'C400',
  // Cessna piston twins
  'C303',
  'C310',
  'C320',
  'C335',
  'C336',
  'C337',
  'C340',
  'C401',
  'C402',
  'C404',
  'C406',
  'C408',
  'C411',
  'C414',
  'C421',
  'C425',
  'C441',
  // Cessna Citation jets
  'C500',
  'C501',
  'C510',
  'C525',
  'C526',
  'C25A',
  'C25B',
  'C25C',
  'C25M',
  'C550',
  'C551',
  'C55B',
  'C560',
  'C56X',
  'C650',
  'C680',
  'C68A',
  'C700',
  'C750',
  // Piper
  'PA18',
  'PA22',
  'PA24',
  'PA28',
  'PA30',
  'PA32',
  'PA34',
  'PA38',
  'PA44',
  'PA46',
  'PA47',
  // Beechcraft (non-King Air: King Air / C-12 variants are military)
  'BE17',
  'BE23',
  'BE24',
  'BE33',
  'BE35',
  'BE36',
  'A36',
  'V35',
  'B36T',
  'BE40',
  'BE55',
  'BE56',
  'BE58',
  'BE60',
  'BE65',
  'BE76',
  'BE77',
  'BE80',
  'BE95',
  'BE99',
  'PRM1',
  // Learjet
  'LJ23',
  'LJ24',
  'LJ25',
  'LJ28',
  'LJ31',
  'LJ35',
  'LJ36',
  'LJ40',
  'LJ45',
  'LJ55',
  'LJ60',
  'LJ70',
  'LJ75',
  // Embraer Phenom / Legacy / Praetor
  'E50P',
  'E55P',
  'E45X',
  // Daher TBM
  'TBM7',
  'TBM8',
  'TBM9',
  // Pilatus
  'PC6',
  'PC12',
  'PC24',
  // Diamond
  'DA20',
  'DA40',
  'DA42',
  'DA62',
  // Cirrus
  'SR20',
  'SR22',
  'SF50',
  // Mooney
  'M20P',
  'M20T',
  // HondaJet
  'HDJT',
  'HA4T',
  // Dassault Falcon
  'FA10',
  'FA20',
  'FA50',
  'F900',
  'F2TH',
  'FA7X',
  'F8EX',
  'F6X',
  // Gulfstream / Gulfstream American / Grumman American
  'GLF2',
  'GLF3',
  'GLF4',
  'GLF5',
  'GLF6',
  'G100',
  'G150',
  'G200',
  'G280',
  'G350',
  'G400',
  'G450',
  'G500',
  'G550',
  'G600',
  'G650',
  'G700',
  'G800',
  'GALX',
  'GA6C',
  'GA7',
  'GA8',
  // Bombardier Challenger / Global
  'CL30',
  'CL35',
  'CL60',
  'CL604',
  'CL605',
  'CL650',
  'GL5T',
  'GLEX',
  'GL7T',
  // Hawker / BAe 125
  'H25A',
  'H25B',
  'H25C',
  'H400',
  'H4000',
  // Boeing narrowbodies
  'B703',
  'B712',
  'B717',
  'B721',
  'B722',
  'B732',
  'B733',
  'B734',
  'B735',
  'B736',
  'B737',
  'B738',
  'B739',
  'B37M',
  'B38M',
  'B39M',
  'B3XM',
  // Boeing widebodies
  'B741',
  'B742',
  'B743',
  'B744',
  'B748',
  'B74S',
  'B74D',
  'B752',
  'B753',
  'B762',
  'B763',
  'B764',
  'B772',
  'B773',
  'B778',
  'B779',
  'B77L',
  'B77W',
  'B788',
  'B789',
  'B78X',
  // Airbus narrowbodies
  'A306',
  'A30B',
  'A310',
  'A318',
  'A319',
  'A320',
  'A321',
  'A19N',
  'A20N',
  'A21N',
  // Airbus widebodies
  'A332',
  'A333',
  'A338',
  'A339',
  'A342',
  'A343',
  'A345',
  'A346',
  'A359',
  'A35K',
  'A388',
  // Embraer regional jets
  'E135',
  'E145',
  'E170',
  'E175',
  'E190',
  'E195',
  'E75L',
  'E75S',
  // Bombardier / Canadair regional jets
  'CRJ1',
  'CRJ2',
  'CRJ7',
  'CRJ9',
  'CRJX',
  // ATR turboprops
  'AT43',
  'AT44',
  'AT45',
  'AT46',
  'AT72',
  'AT73',
  'AT75',
  'AT76',
  // Dash 8 / Q-Series
  'DH8A',
  'DH8B',
  'DH8C',
  'DH8D',
])

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
  // Never flag a known civilian airframe as military (e.g. Cessna, private jets)
  const typeCode = (aircraft.t || aircraft.type || '').trim().toUpperCase()
  if (typeCode && CIVILIAN_TYPE_CODES.has(typeCode)) return false

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
 * Returns true if the aircraft's ICAO type code is in the watch list.
 * @param {object} aircraft
 * @param {string[]} watchTypes - uppercased list of ICAO type codes to watch
 */
function isTypeMatch(aircraft, watchTypes) {
  if (!watchTypes || watchTypes.length === 0) return false
  const typeCode = (aircraft.t || aircraft.type || '').trim().toUpperCase()
  if (!typeCode) return false
  return watchTypes.includes(typeCode)
}

/**
 * @param {object} aircraft
 * @param {object} config - parsed config object
 */
function isInteresting(aircraft, config) {
  // Watch checks — explicit watches override all ignores
  if (isCallsignMatch(aircraft, config.watchCallsigns)) return true
  if (isTypeMatch(aircraft, config.watchTypes)) return true

  // Blacklist checks — suppress military/other heuristic matches
  const callsign = getCallsign(aircraft)
  if (
    callsign &&
    config.blacklistCallsigns &&
    config.blacklistCallsigns.length > 0 &&
    config.blacklistCallsigns.includes(callsign)
  )
    return false

  const typeCode = (aircraft.t || aircraft.type || '').trim().toUpperCase()
  if (
    typeCode &&
    config.blacklistTypes &&
    config.blacklistTypes.length > 0 &&
    config.blacklistTypes.includes(typeCode)
  )
    return false

  if (
    config.enableMilitaryHeuristics &&
    isMilitaryMatch(aircraft, config.milCallsignPrefixes)
  )
    return true
  return false
}

module.exports = {
  CIVILIAN_TYPE_CODES,
  getCallsign,
  getHex,
  isCallsignMatch,
  isTypeMatch,
  isMilitaryMatch,
  isInteresting,
}
