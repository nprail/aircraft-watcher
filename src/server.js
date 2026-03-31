import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import * as settingsStore from './settingsStore.js'
import logger from './logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.join(__dirname, '../web/dist')

export function startServer(port, sightingsStore) {
  const app = express()

  app.use(express.json())

  // GET /api/settings — return current settings
  app.get('/api/settings', (req, res) => {
    res.json(settingsStore.get())
  })

  // PUT /api/settings — persist updated settings
  app.put('/api/settings', (req, res) => {
    if (
      typeof req.body !== 'object' ||
      req.body === null ||
      Array.isArray(req.body)
    ) {
      return res
        .status(400)
        .json({ error: 'Request body must be a JSON object' })
    }
    try {
      const updated = settingsStore.update(req.body)
      res.json(updated)
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
  })

  // GET /api/history — return sighting history, optionally filtered by ?callsign=
  app.get('/api/history', (req, res) => {
    const callsign = req.query.callsign || null
    res.json(sightingsStore.getAll(callsign))
  })

  // Serve the built React app
  app.use(express.static(DIST_DIR))

  // SPA fallback — any unmatched route serves index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST_DIR, 'index.html'))
  })

  const server = app.listen(port, () => {
    logger.info(`Web UI available at http://localhost:${port}`)
  })

  return server
}
