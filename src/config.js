import 'dotenv/config'
import path from 'path'
import * as settingsStore from './settingsStore.js'

// Proxy over the live settings store so all reads reflect the current value.
// deduperStateFile is environment-only (not user-configurable via UI).
export default new Proxy(
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
