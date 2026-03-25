'use strict'

require('dotenv').config()

const config = require('./config')
const logger = require('./logger')
const { isInteresting } = require('./matcher')
const { Deduper } = require('./deduper')
const { sendAlert } = require('./sms')

const deduper = new Deduper(config.alertCooldownSec)
let running = true
let pollTimer = null

async function fetchAircraft() {
  const res = await fetch(config.feedUrl, {
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

  const alreadyAlertedThisCycle = new Set()

  for (const ac of aircraft) {
    try {
      if (!isInteresting(ac, config)) continue

      // Build a cycle-level key to avoid duplicate alerts within the same poll
      const cycleKey =
        ac.hex || ac.r || ac.flight || ac.callsign || JSON.stringify(ac)
      if (alreadyAlertedThisCycle.has(cycleKey)) continue

      if (!deduper.shouldAlert(ac)) continue

      alreadyAlertedThisCycle.add(cycleKey)

      logger.info('Interesting aircraft detected', {
        hex: ac.hex,
        callsign: ac.flight || ac.callsign,
        lat: ac.lat,
        lon: ac.lon,
      })

      try {
        const results = await sendAlert(ac, config)
        for (const r of results) {
          if (r.error) {
            logger.error('SMS send failed', { to: r.to, error: r.error })
          } else {
            logger.info('SMS sent', { to: r.to, sid: r.sid })
          }
        }
      } catch (smsErr) {
        logger.error('SMS error', { error: smsErr.message })
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
  feedUrl: config.feedUrl,
  pollIntervalSec: config.pollIntervalSec,
  alertCooldownSec: config.alertCooldownSec,
  watchCallsigns: config.watchCallsigns,
  enableMilitaryHeuristics: config.enableMilitaryHeuristics,
  recipients: config.twilio.to.length,
})

pollLoop().catch((err) => {
  logger.error('Fatal poll loop error', { error: err.message })
  process.exit(1)
})
