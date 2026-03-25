'use strict'

require('dotenv').config()

const config = require('./config')
const logger = require('./logger')
const { isInteresting } = require('./matcher')
const { Deduper } = require('./deduper')
const { formatMessage } = require('./formatter')
const { notifyWebhook } = require('./webhook')
const aircraftDb = require('./aircraftDb')
const { startServer } = require('./server')

const WEB_PORT = parseInt(process.env.WEB_PORT, 10) || 3000
startServer(WEB_PORT)

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

      try {
        const callsign = ac.flight || ac.callsign || ac.hex || 'Unknown'
        await notifyWebhook({
          title: `Aircraft Alert: ${callsign}`,
          message: formatMessage(ac),
          url: `${config.tar1090Url.replace(/\/$/, '')}/?icao=${ac.hex || ''}`,
        })
        logger.info('Webhook notified')
      } catch (webhookErr) {
        logger.error('Webhook error', { error: webhookErr.message })
      }
    } catch (acErr) {
      logger.error('Error processing aircraft', {
        error: acErr.message,
        aircraft: ac,
      })
    }
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
  enableMilitaryHeuristics: config.enableMilitaryHeuristics,
})

aircraftDb
  .init()
  .then(() => deduper.load(config.deduperStateFile))
  .catch((err) =>
    logger.warn('Failed to load deduper state', { error: err.message }),
  )
  .then(() => pollLoop())
  .catch((err) => {
    logger.error('Fatal poll loop error', { error: err.message })
    process.exit(1)
  })
