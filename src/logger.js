const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

const LOG_LEVEL = (process.env.LOG_LEVEL || 'info').toLowerCase()
const MIN_LEVEL = LEVELS[LOG_LEVEL] ?? LEVELS.info

function log(level, msg, data) {
  if (LEVELS[level] < MIN_LEVEL) return
  const entry = { level, time: new Date().toISOString(), msg }
  if (data !== undefined && data !== null) entry.data = data
  process.stdout.write(JSON.stringify(entry) + '\n')
}

export default {
  debug: (msg, data) => log('debug', msg, data),
  info: (msg, data) => log('info', msg, data),
  warn: (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
}
