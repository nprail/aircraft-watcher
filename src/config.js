'use strict'

require('dotenv').config()

const path = require('path')
const settingsStore = require('./settingsStore')

// Proxy over the live settings store so all reads reflect the current value.
// deduperStateFile is environment-only (not user-configurable via UI).
const config = new Proxy(
  {},
  {
    get(_, key) {
      if (key === 'deduperStateFile') {
        return path.join(
          process.env.DATA_FOLDER || 'data',
          '.deduper-state.json',
        )
      }
      if (key === 'sightingsFile') {
        return path.join(process.env.DATA_FOLDER || 'data', '.sightings.json')
      }
      return settingsStore.get()[key]
    },
  },
)

module.exports = config
