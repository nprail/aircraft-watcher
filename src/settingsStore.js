import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DATA_FOLDER = process.env.DATA_FOLDER ?? path.join(__dirname, '../data')
const SETTINGS_FILE = path.join(DATA_FOLDER, 'settings.json')


export const DEFAULTS = {
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
  noLocationGrace: true,
  noLocationThreshold: 5,
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

export function get() {
  return _settings
}

export function update(newSettings) {
  _settings = { ...DEFAULTS, ...newSettings }
  const dir = path.dirname(SETTINGS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(_settings, null, 2), 'utf8')
  return _settings
}

load()
