'use strict';

const { getTail, getCallsign, getHex } = require('./matcher');

/**
 * Formats an aircraft alert into a human-readable SMS message.
 * @param {object} aircraft
 * @returns {string}
 */
function formatMessage(aircraft) {
  const tail = getTail(aircraft) || 'N/A';
  const hex = getHex(aircraft) || 'N/A';
  const callsign = getCallsign(aircraft) || 'N/A';
  const category = (aircraft.category || aircraft.t || aircraft.type || 'N/A').toString().trim();

  const lat = aircraft.lat;
  const lon = aircraft.lon;
  const hasCoords = typeof lat === 'number' && typeof lon === 'number';
  const coordStr = hasCoords ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : 'N/A';
  const mapsLink = hasCoords
    ? `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`
    : 'N/A';

  const altitude = aircraft.alt_baro !== undefined ? `${aircraft.alt_baro} ft` : 'N/A';
  const speed = aircraft.gs !== undefined ? `${Math.round(aircraft.gs)} kts` : 'N/A';
  const heading = aircraft.track !== undefined ? `${Math.round(aircraft.track)}°` : 'N/A';

  const seenRaw = aircraft.seen !== undefined ? aircraft.seen : aircraft.lastSeen;
  const seenStr = seenRaw !== undefined ? `${seenRaw}s ago` : 'N/A';

  return [
    `✈ Aircraft Alert`,
    `Tail: ${tail}  Hex: ${hex}`,
    `Callsign: ${callsign}  Cat: ${category}`,
    `Pos: ${coordStr}`,
    `Map: ${mapsLink}`,
    `Alt: ${altitude}  Spd: ${speed}  Hdg: ${heading}`,
    `Last seen: ${seenStr}`,
  ].join('\n');
}

/**
 * Sends an SMS alert to all configured recipients.
 * Returns an array of results: { to, sid } or { to, error }.
 * @param {object} aircraft
 * @param {object} config - full config object
 * @param {object} [twilioClientOverride] - optional Twilio client for testing
 */
async function sendAlert(aircraft, config, twilioClientOverride) {
  const { twilio: twilioConfig } = config;

  if (!twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.from) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM)');
  }

  if (!twilioConfig.to || twilioConfig.to.length === 0) {
    throw new Error('No SMS recipients configured (TWILIO_TO)');
  }

  let client = twilioClientOverride;
  if (!client) {
    const twilio = require('twilio');
    client = twilio(twilioConfig.accountSid, twilioConfig.authToken);
  }

  const body = formatMessage(aircraft);

  const results = await Promise.allSettled(
    twilioConfig.to.map((to) =>
      client.messages.create({
        body,
        from: twilioConfig.from,
        to,
      })
    )
  );

  return results.map((result, i) => {
    const to = twilioConfig.to[i];
    if (result.status === 'fulfilled') {
      return { to, sid: result.value.sid };
    } else {
      return { to, error: result.reason && result.reason.message ? result.reason.message : String(result.reason) };
    }
  });
}

module.exports = { formatMessage, sendAlert };
