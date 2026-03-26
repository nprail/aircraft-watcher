'use strict'

require('dotenv').config()

const settingsStore = require('./settingsStore')

// Proxy over the live settings store so all reads reflect the current value.
// deduperStateFile is environment-only (not user-configurable via UI).
const config = new Proxy(
  {},
  {
    get(_, key) {
      if (key === 'deduperStateFile') {
        return process.env.DEDUPER_STATE_FILE || 'data/.deduper-state.json'
      }
      if (key === 'sightingsFile') {
        return process.env.SIGHTINGS_FILE || 'data/.sightings.json'
      }
      return settingsStore.get()[key]
    },
  },
)

module.exports = config
