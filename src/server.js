'use strict'

const express = require('express')
const path = require('path')
const settingsStore = require('./settingsStore')
const logger = require('./logger')

const DIST_DIR = path.join(__dirname, '../web/dist')

function startServer(port) {
  const app = express()

  app.use(express.json())

  // GET /api/settings — return current settings
  app.get('/api/settings', (req, res) => {
    res.json(settingsStore.get())
  })

  // PUT /api/settings — persist updated settings
  app.put('/api/settings', (req, res) => {
    try {
      const updated = settingsStore.update(req.body)
      res.json(updated)
    } catch (err) {
      res.status(400).json({ error: err.message })
    }
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

module.exports = { startServer }
