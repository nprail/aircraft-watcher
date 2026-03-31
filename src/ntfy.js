import config from './config.js'

export async function notifyNtfy({ title, message, url }) {
  const { url: serverUrl, topic, token, priority } = config.ntfy || {}
  if (!topic) return // not configured, skip silently

  const ntfyUrl = `${(serverUrl || 'https://ntfy.sh').replace(/\/$/, '')}/${encodeURIComponent(topic)}`

  const headers = {
    Title: title,
    Priority: String(priority ?? 3),
    'Content-Type': 'text/plain',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(ntfyUrl, {
    method: 'POST',
    headers,
    body: url ? `${message}\n\n${url}` : message,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ntfy request failed: ${res.status} ${text}`)
  }
}
