'use strict'

require('dotenv').config()

const config = require('./config')
const logger = require('./logger')
const { isInteresting, isCallsignMatch, isTypeMatch } = require('./matcher')
const { Deduper } = require('./deduper')
const { formatMessage, haversineDistanceMiles } = require('./formatter')
const { notifyWebhook } = require('./webhook')
const { notifyNtfy } = require('./ntfy')
const aircraftDb = require('./aircraftDb')
const { startServer } = require('./server')
const { SightingsStore } = require('./sightingsStore')

const WEB_PORT = parseInt(process.env.WEB_PORT, 10) || 3000
const sightingsStore = new SightingsStore()
startServer(WEB_PORT, sightingsStore)

const deduper = new Deduper(config.alertCooldownSec)
let running = true
let pollTimer = null

async function fetchAircraft() {
  const feedUrl = `${config.tar1090Url.replace(/\/$/, '')}/data/aircraft.json`
  const res = await fetch(feedUrl, {
    signal: AbortSignal.timeout(config.fetchTimeoutMs),
  })
  if (!res.ok) {
    throw new Error(`Feed returned HTTP ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  return Array.isArray(json.aircraft) ? json.aircraft : []
}

async function processPoll() {
  let aircraft
  try {
    aircraft = await fetchAircraft()
    logger.debug('Poll complete', { count: aircraft.length })
  } catch (err) {
    logger.error('Failed to fetch aircraft feed', { error: err.message })
    return
  }

  // Safety cap
  if (aircraft.length > config.maxAircraftPerPoll) {
    logger.warn('Aircraft list exceeds safety cap; truncating', {
      received: aircraft.length,
      cap: config.maxAircraftPerPoll,
    })
    aircraft = aircraft.slice(0, config.maxAircraftPerPoll)
  }

  deduper.evictExpired()
  await deduper.save(config.deduperStateFile).catch((err) =>
    logger.warn('Failed to save deduper state after eviction', {
      error: err.message,
    }),
  )

  const alreadyAlertedThisCycle = new Set()
  let newSightings = false

  for (const ac of aircraft) {
    try {
      // Enrich with DB data (registration, type code, military flag)
      const hex = ac.hex || ac.icao || ''
      const dbInfo = aircraftDb.getAircraftInfo(hex)
      if (dbInfo) {
        if (!ac.r && dbInfo.registration) ac.r = dbInfo.registration
        if (!ac.t && dbInfo.typeCode) ac.t = dbInfo.typeCode
        if (dbInfo.isMilitary) ac.military = true
      }

      if (!isInteresting(ac, config)) continue

      // Build a cycle-level key to avoid duplicate alerts within the same poll
      const cycleKey =
        ac.hex || ac.r || ac.flight || ac.callsign || JSON.stringify(ac)
      if (alreadyAlertedThisCycle.has(cycleKey)) continue

      if (!deduper.shouldAlert(ac)) continue

      alreadyAlertedThisCycle.add(cycleKey)

      // Record sighting for watched callsigns and watched types
      if (
        isCallsignMatch(ac, config.watchCallsigns) ||
        isTypeMatch(ac, config.watchTypes)
      ) {
        const { lat: cfgLat, lon: cfgLon } = config.location
        const distanceMi =
          cfgLat !== null &&
          cfgLon !== null &&
          ac.lat !== undefined &&
          ac.lon !== undefined
            ? haversineDistanceMiles(cfgLat, cfgLon, ac.lat, ac.lon)
            : null
        sightingsStore.add(ac, distanceMi)
        newSightings = true
        logger.info('Watched aircraft sighted', {
          callsign: ac.flight || ac.callsign,
          hex: ac.hex,
        })
      }

      await deduper
        .save(config.deduperStateFile)
        .catch((err) =>
          logger.warn('Failed to save deduper state', { error: err.message }),
        )

      logger.info('Interesting aircraft detected', {
        hex: ac.hex,
        callsign: ac.flight || ac.callsign,
        lat: ac.lat,
        lon: ac.lon,
      })

      const callsign = ac.flight || ac.callsign || ac.hex || 'Unknown'
      const alertPayload = {
        title: `Aircraft Alert: ${callsign}`,
        message: formatMessage(ac),
        url: `${config.tar1090Url.replace(/\/$/, '')}/?icao=${ac.hex || ''}`,
      }

      try {
        await notifyWebhook(alertPayload)
        logger.info('Webhook notified')
      } catch (webhookErr) {
        logger.error('Webhook error', { error: webhookErr.message })
      }

      try {
        await notifyNtfy(alertPayload)
        logger.info('ntfy notified')
      } catch (ntfyErr) {
        logger.error('ntfy error', { error: ntfyErr.message })
      }
    } catch (acErr) {
      logger.error('Error processing aircraft', {
        error: acErr.message,
        aircraft: ac,
      })
    }
  }

  // Persist sightings once per cycle if any new ones were recorded
  if (newSightings) {
    await sightingsStore
      .save(config.sightingsFile)
      .catch((err) =>
        logger.warn('Failed to save sightings', { error: err.message }),
      )
  }
}

async function pollLoop() {
  while (running) {
    await processPoll()
    if (!running) break
    // Wait for the next poll interval
    await new Promise((resolve) => {
      pollTimer = setTimeout(resolve, config.pollIntervalSec * 1000)
    })
  }
  logger.info('Poll loop stopped')
}

function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully`)
  running = false
  if (pollTimer) clearTimeout(pollTimer)
  aircraftDb.shutdown()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack })
  // Keep running — log and continue
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { error: String(reason) })
})

logger.info('Aircraft watcher starting', {
  tar1090Url: config.tar1090Url,
  pollIntervalSec: config.pollIntervalSec,
  alertCooldownSec: config.alertCooldownSec,
  watchCallsigns: config.watchCallsigns,
  watchTypes: config.watchTypes,
  enableMilitaryHeuristics: config.enableMilitaryHeuristics,
})

aircraftDb
  .init()
  .then(() => deduper.load(config.deduperStateFile))
  .catch((err) =>
    logger.warn('Failed to load deduper state', { error: err.message }),
  )
  .then(() => sightingsStore.load(config.sightingsFile))
  .catch((err) =>
    logger.warn('Failed to load sightings', { error: err.message }),
  )
  .then(() => pollLoop())
  .catch((err) => {
    logger.error('Fatal poll loop error', { error: err.message })
    process.exit(1)
  })
