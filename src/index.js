'use strict'

require('dotenv').config()

const config = require('./config')
const logger = require('./logger')
const {
  isInteresting,
  isCallsignMatch,
  isTypeMatch,
  isMilitaryMatch,
} = require('./matcher')
const { Deduper } = require('./deduper')
const { formatMessage } = require('./formatter')
const aircraftDb = require('./aircraftDb')
const {
  fetchAircraft,
  enrichAircraft,
  computeDistanceMi,
  sendNotifications,
} = require('./utils')
const { startServer } = require('./server')
const { SightingsStore } = require('./sightingsStore')

const WEB_PORT = parseInt(process.env.WEB_PORT, 10) || 3000
const sightingsStore = new SightingsStore()
const webServer = startServer(WEB_PORT, sightingsStore)

const deduper = new Deduper(config.alertCooldownSec)
/** @type {Map<string, number>} Counts consecutive sightings of mil aircraft lacking a position fix. */
const milNoLocationCounts = new Map()
let running = true
let pollTimer = null

/**
 * Returns true if this military-heuristic aircraft should be suppressed
 * because it has appeared fewer than `milNoLocationThreshold` times without
 * a position fix. Increments (and caps) the per-aircraft counter.
 */
function isSuppressedByMilNoLocationGrace(ac) {
  if (!config.milNoLocationGrace) return false
  if (isCallsignMatch(ac, config.watchCallsigns)) return false
  if (isTypeMatch(ac, config.watchTypes)) return false
  if (!isMilitaryMatch(ac, config.milCallsignPrefixes)) return false
  if (ac.lat !== undefined || ac.lon !== undefined) return false

  const milKey = ac.hex || ac.r || ac.flight || ac.callsign || ''
  const threshold = config.milNoLocationThreshold
  if (!milKey || threshold <= 0) return false

  const count = (milNoLocationCounts.get(milKey) || 0) + 1
  // Cap at threshold+1 to prevent unbounded counter growth once the grace period is over
  milNoLocationCounts.set(milKey, Math.min(count, threshold + 1))

  if (count <= threshold) {
    logger.debug('Military aircraft without location, ignoring', {
      hex: ac.hex,
      callsign: ac.flight || ac.callsign,
      count,
      threshold,
    })
    return true
  }

  return false
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
      enrichAircraft(ac)

      if (!isInteresting(ac, config)) continue

      // Build a cycle-level key to avoid duplicate alerts within the same poll
      const cycleKey =
        ac.hex || ac.r || ac.flight || ac.callsign || JSON.stringify(ac)
      if (alreadyAlertedThisCycle.has(cycleKey)) continue

      const distanceMi = computeDistanceMi(ac)

      // Record sightings for watched aircraft regardless of distance threshold
      // or notification cooldown, so the history is always complete.
      if (
        isCallsignMatch(ac, config.watchCallsigns) ||
        isTypeMatch(ac, config.watchTypes)
      ) {
        sightingsStore.record(ac, distanceMi, config.alertCooldownSec * 1000)
        newSightings = true
        logger.info('Watched aircraft sighted', {
          callsign: ac.flight || ac.callsign,
          hex: ac.hex,
        })
      }

      if (isSuppressedByMilNoLocationGrace(ac)) continue

      // Skip notification if the aircraft is outside the configured radius.
      // We check before stamping the deduper so the cooldown slot is only
      // consumed once the aircraft is actually within range.
      const distanceThresholdMi = config.notifyDistanceThresholdMi
      if (
        distanceThresholdMi !== null &&
        distanceThresholdMi !== undefined &&
        distanceMi !== null &&
        distanceMi > distanceThresholdMi
      ) {
        logger.debug(
          'Aircraft outside distance threshold, skipping notification',
          {
            hex: ac.hex,
            distanceMi: distanceMi.toFixed(1),
            thresholdMi: distanceThresholdMi,
          },
        )
        continue
      }

      if (!deduper.shouldAlert(ac)) continue

      alreadyAlertedThisCycle.add(cycleKey)
      await deduper
        .save(config.deduperStateFile)
        .catch((err) =>
          logger.warn('Failed to save deduper state', { error: err.message }),
        )

      const callsign = ac.flight || ac.callsign || ac.hex || 'Unknown'
      logger.info('Interesting aircraft detected', {
        hex: ac.hex,
        callsign,
        lat: ac.lat,
        lon: ac.lon,
      })

      await sendNotifications({
        title: `Aircraft Alert: ${callsign}`,
        message: formatMessage(ac),
        url: `${config.tar1090Url.replace(/\/$/, '')}/?icao=${ac.hex || ''}`,
      })
    } catch (acErr) {
      logger.error('Error processing aircraft', {
        error: acErr.message,
        aircraft: ac,
      })
    }
  }

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
  webServer.close(() => {
    logger.info('Web server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack })
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { error: String(reason) })
})

async function init() {
  logger.info('Aircraft watcher starting', {
    tar1090Url: config.tar1090Url,
    pollIntervalSec: config.pollIntervalSec,
    alertCooldownSec: config.alertCooldownSec,
    watchCallsigns: config.watchCallsigns,
    watchTypes: config.watchTypes,
    enableMilitaryHeuristics: config.enableMilitaryHeuristics,
  })

  await aircraftDb.init()

  await deduper
    .load(config.deduperStateFile)
    .catch((err) =>
      logger.warn('Failed to load deduper state', { error: err.message }),
    )

  await sightingsStore
    .load(config.sightingsFile)
    .catch((err) =>
      logger.warn('Failed to load sightings', { error: err.message }),
    )

  await pollLoop()
}

init().catch((err) => {
  logger.error('Fatal initialization error', { error: err.message })
  process.exit(1)
})
