'use strict'

require('dotenv').config()

const DEFAULT_MIL_PREFIXES = [
  'RCH',
  'REACH',
  'RRR',
  'PAT',
  'SAM',
  'VENUS',
  'CASA',
  'FORTE',
  'GOLD',
  'JAKE',
  'KNIFE',
  'LOBO',
  'MARIO',
  'GHOST',
  'EAGLE',
  'HAWK',
  'VIPER',
  'COBRA',
  'FALCON',
  'RAPTOR',
  'TALON',
  'HOUND',
  'WOLF',
  'BARON',
  'DUKE',
  'REAPER',
  'PREDATOR',
  'SENTRY',
  'RIVET',
  'COMBAT',
  'IRON',
  'STEEL',
  'MAGIC',
  'DARKSTAR',
  'SHADOW',
  'SPECTRE',
  'SPOOKY',
  'BONE',
  'BUFF',
  'WARTHOG',
  'JOLLY',
  'PEDRO',
  'SANDY',
  'GUARDIAN',
  'SPARTAN',
  'RANGER',
  'TROJAN',
  'RAVEN',
  'CROW',
  'OWL',
  'HORNET',
  'TOMCAT',
  'VIGILANTE',
  'INTRUDER',
  'PROWLER',
  'HAWKEYE',
  'VIKING',
  'CORSAIR',
  'ORION',
  'NEPTUNE',
  'HERCULES',
]

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue
  return value.toLowerCase() !== 'false' && value !== '0'
}

function parsePositiveInt(value, defaultValue) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? n : defaultValue
}

function parseStringList(value, defaultList) {
  if (!value || !value.trim()) return defaultList
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const config = {
  tar1090Url:
    process.env.TAR1090_URL || 'https://airspace.prail.space/combine1090',
  pollIntervalSec: parsePositiveInt(process.env.POLL_INTERVAL_SEC, 10),
  alertCooldownSec: parsePositiveInt(process.env.ALERT_COOLDOWN_SEC, 1200),
  maxAircraftPerPoll: parsePositiveInt(process.env.MAX_AIRCRAFT_PER_POLL, 500),
  fetchTimeoutMs: parsePositiveInt(process.env.FETCH_TIMEOUT_MS, 15000),

  deduperStateFile: process.env.DEDUPER_STATE_FILE || '.deduper-state.json',

  watchCallsigns: parseStringList(process.env.WATCH_CALLSIGNS, []).map((c) =>
    c.toUpperCase(),
  ),

  enableMilitaryHeuristics: parseBoolean(
    process.env.ENABLE_MILITARY_HEURISTICS,
    true,
  ),
  milCallsignPrefixes: parseStringList(
    process.env.MIL_CALLSIGN_PREFIXES,
    DEFAULT_MIL_PREFIXES,
  ).map((p) => p.toUpperCase()),

  webhookUrl: process.env.WEBHOOK_URL || '',

  location: {
    lat: parseFloat(process.env.LOCATION_LAT) || null,
    lon: parseFloat(process.env.LOCATION_LON) || null,
  },
}

module.exports = config
