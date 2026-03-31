import config from './config.js'

export async function notifyWebhook({ title, message, url }) {
  const urls = (config.webhookUrls || []).filter(Boolean)
  if (urls.length === 0) {
    throw new Error('No webhook URLs configured')
  }

  const results = await Promise.allSettled(
    urls.map((webhookUrl) =>
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, url }),
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Webhook ${webhookUrl} failed: ${res.status} ${text}`)
        }
      }),
    ),
  )

  const failures = results.filter((r) => r.status === 'rejected')
  if (failures.length > 0) {
    throw new Error(failures.map((f) => f.reason.message).join('; '))
  }
}
