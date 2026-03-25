'use strict'

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

function log(level, msg, data) {
  const entry = {
    level,
    time: new Date().toISOString(),
    msg,
  }
  if (data !== undefined && data !== null) {
    entry.data = data
  }
  process.stdout.write(JSON.stringify(entry) + '\n')
}

const logger = {
  debug: (msg, data) => log('debug', msg, data),
  info: (msg, data) => log('info', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
}

module.exports = logger
