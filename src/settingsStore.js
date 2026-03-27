'use strict'

const fs = require('fs')
const path = require('path')

const DATA_FOLDER = process.env.DATA_FOLDER ?? path.join(__dirname, '../data')
const SETTINGS_FILE = path.join(DATA_FOLDER, 'settings.json')

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

const DEFAULTS = {
  tar1090Url: 'http://localhost:8080',
  pollIntervalSec: 10,
  alertCooldownSec: 1200,
  maxAircraftPerPoll: 500,
  fetchTimeoutMs: 15000,
  watchCallsigns: [],
  watchTypes: [],
  blacklistCallsigns: [],
  blacklistTypes: [],
  enableMilitaryHeuristics: true,
  milCallsignPrefixes: DEFAULT_MIL_PREFIXES,
  webhookUrls: [],
  ntfy: {
    url: 'https://ntfy.sh',
    topic: '',
    token: '',
    priority: 3,
  },
  location: {
    lat: null,
    lon: null,
  },
  notifyDistanceThresholdMi: null,
}

let _settings = JSON.parse(JSON.stringify(DEFAULTS))

function load() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8')
      const fileSettings = JSON.parse(raw)
      _settings = { ...DEFAULTS, ...fileSettings }
    }
  } catch (err) {
    process.stderr.write(
      `[settingsStore] Failed to load settings file, using defaults: ${err.message}\n`,
    )
  }
}

function get() {
  return _settings
}

function update(newSettings) {
  _settings = { ...DEFAULTS, ...newSettings }
  const dir = path.dirname(SETTINGS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(_settings, null, 2), 'utf8')
  return _settings
}

load()

module.exports = { get, update, DEFAULTS, DEFAULT_MIL_PREFIXES }
