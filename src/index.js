import 'dotenv/config'

import config from './config.js'
import logger from './logger.js'
import {
  isInteresting,
  isCallsignMatch,
  isTypeMatch,
  isMilitaryMatch,
} from './matcher.js'
import { Deduper } from './deduper.js'
import { formatMessage } from './formatter.js'
import * as aircraftDb from './aircraftDb.js'
import {
  fetchAircraft,
  enrichAircraft,
  computeDistanceMi,
  sendNotifications,
} from './utils.js'
import { startServer } from './server.js'
import { SightingsStore } from './sightingsStore.js'

const WEB_PORT = parseInt(process.env.WEB_PORT, 10) || 3000
const sightingsStore = new SightingsStore()
const webServer = startServer(WEB_PORT, sightingsStore)

const deduper = new Deduper(config.alertCooldownSec)
/** @type {Map<string, number>} Counts consecutive sightings of aircraft lacking a position fix. */
const noLocationCounts = new Map()
/** @type {Set<string>} Aircraft keys that were notified while lacking a position fix. */
const alertedWithoutLocation = new Set()
let running = true
let pollTimer = null

/**
 * Returns true if this aircraft should be suppressed because it has appeared
 * fewer than `noLocationThreshold` times without a position fix.
 * Increments (and caps) the per-aircraft counter.
 */
function isSuppressedByNoLocationGrace(ac) {
  if (!config.noLocationGrace) return false
  if (ac.lat !== undefined || ac.lon !== undefined) return false

  const acKey = ac.hex || ac.r || ac.flight || ac.callsign || ''
  const threshold = config.noLocationThreshold
  if (!acKey || threshold <= 0) return false

  const count = (noLocationCounts.get(acKey) || 0) + 1
  // Cap at threshold+1 to prevent unbounded counter growth once the grace period is over
  noLocationCounts.set(acKey, Math.min(count, threshold + 1))

  if (count <= threshold) {
    logger.debug('Aircraft without location, ignoring', {
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

      // Check if a previously-locationless-alerted aircraft now has a position fix.
      const acKey = ac.hex || ac.r || ac.flight || ac.callsign || ''
      if (
        alertedWithoutLocation.has(acKey) &&
        (ac.lat !== undefined || ac.lon !== undefined)
      ) {
        logger.info(
          'Military aircraft previously alerted without location now has a position fix',
          {
            hex: ac.hex,
            callsign: ac.flight || ac.callsign,
            lat: ac.lat,
            lon: ac.lon,
            ac,
          },
        )
        alertedWithoutLocation.delete(acKey)
      }

      if (!isInteresting(ac, config)) continue

      // Build a cycle-level key to avoid duplicate alerts within the same poll
      const cycleKey =
        ac.hex || ac.r || ac.flight || ac.callsign || JSON.stringify(ac)
      if (alreadyAlertedThisCycle.has(cycleKey)) continue

      const distanceMi = computeDistanceMi(ac)

      // Determine the best match reason for sighting history.
      const callsignMatch = isCallsignMatch(ac, config.watchCallsigns)
      const typeMatch = isTypeMatch(ac, config.watchTypes)
      const matchReason = callsignMatch ? 'callsign' : typeMatch ? 'type' : null

      // Record sightings for watched callsign/type aircraft regardless of
      // distance threshold or notification cooldown, so the history is always complete.
      if (matchReason) {
        sightingsStore.record(ac, distanceMi, matchReason)
        newSightings = true
        logger.info('Watched aircraft sighted', {
          callsign: ac.flight || ac.callsign,
          hex: ac.hex,
          matchReason,
        })
      } else if (isMilitaryMatch(ac)) {
        // Record military sightings before the no-location grace check so
        // every detected military aircraft appears in history.
        sightingsStore.record(ac, distanceMi, 'military')
        newSightings = true
        logger.info('Military aircraft sighted', {
          callsign: ac.flight || ac.callsign,
          hex: ac.hex,
        })
      }

      if (isSuppressedByNoLocationGrace(ac)) continue

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

      if (ac.lat === undefined && ac.lon === undefined) {
        const acKey = ac.hex || ac.r || ac.flight || ac.callsign || ''
        logger.warn('Notifying for aircraft without a position fix', {
          hex: ac.hex,
          callsign,
          noLocationCount: noLocationCounts.get(acKey),
          noLocationThreshold: config.noLocationThreshold,
          noLocationGrace: config.noLocationGrace,
          ac,
        })
        alertedWithoutLocation.add(acKey)
      }

      logger.info('Interesting aircraft detected', {
        hex: ac.hex,
        callsign,
        ac,
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
