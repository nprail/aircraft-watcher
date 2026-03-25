'use strict'

const config = require('./config')

async function notifyWebhook({ title, message, url }) {
  const webhookUrl = config.webhookUrl
  if (!webhookUrl) {
    throw new Error('Webhook URL not configured (WEBHOOK_URL)')
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, message, url }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Webhook failed: ${res.status} ${text}`)
  }
}

module.exports = { notifyWebhook }
