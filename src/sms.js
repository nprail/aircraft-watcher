'use strict'

const { formatMessage } = require('./formatter')

/**
 * Sends an SMS alert to all configured recipients.
 * Returns an array of results: { to, sid } or { to, error }.
 * @param {object} aircraft
 * @param {object} config - full config object
 * @param {object} [twilioClientOverride] - optional Twilio client for testing
 */
async function sendAlert(aircraft, config, twilioClientOverride) {
  const { twilio: twilioConfig } = config

  if (
    !twilioConfig.accountSid ||
    !twilioConfig.authToken ||
    !twilioConfig.from
  ) {
    throw new Error(
      'Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)',
    )
  }

  if (!twilioConfig.to || twilioConfig.to.length === 0) {
    throw new Error('No SMS recipients configured (TWILIO_TO)')
  }

  let client = twilioClientOverride
  if (!client) {
    const twilio = require('twilio')
    client = twilio(twilioConfig.accountSid, twilioConfig.authToken)
  }

  const body = formatMessage(aircraft)

  const results = await Promise.allSettled(
    twilioConfig.to.map((to) =>
      client.messages.create({
        body,
        from: twilioConfig.from,
        to,
      }),
    ),
  )

  return results.map((result, i) => {
    const to = twilioConfig.to[i]
    if (result.status === 'fulfilled') {
      return { to, sid: result.value.sid }
    } else {
      return {
        to,
        error:
          result.reason && result.reason.message
            ? result.reason.message
            : String(result.reason),
      }
    }
  })
}

module.exports = { sendAlert }
