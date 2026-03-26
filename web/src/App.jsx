import { useState, useEffect, useCallback } from 'react'

// ─── Primitive UI helpers ──────────────────────────────────────────────────

const inputCls =
  'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors'

function Input({ className = '', ...props }) {
  return <input className={`${inputCls} ${className}`} {...props} />
}

function Card({ title, description, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {description && (
          <p className="text-sm text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        value ? 'bg-blue-600' : 'bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ─── TagInput — add/remove short string items (callsigns, etc.) ────────────

function TagInput({ items, onChange, placeholder, transform }) {
  const [value, setValue] = useState('')

  const commit = () => {
    const raw = value.trim()
    if (!raw) return
    const tag = transform ? transform(raw) : raw
    if (!items.includes(tag)) onChange([...items, tag])
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit()
    }
  }

  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
        />
        <button
          type="button"
          onClick={commit}
          className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 bg-gray-800 border border-gray-700 text-gray-200 text-sm px-2.5 py-1 rounded-md"
            >
              {item}
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-gray-500 hover:text-gray-200 transition-colors leading-none"
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-600 italic">None configured</p>
      )}
    </div>
  )
}

// ─── UrlList — ordered list of URL inputs ─────────────────────────────────

function UrlList({ items, onChange }) {
  const add = () => onChange([...items, ''])
  const set = (i, v) => onChange(items.map((item, idx) => (idx === i ? v : item)))
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-2">
      {items.map((url, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            type="url"
            value={url}
            onChange={(e) => set(i, e.target.value)}
            placeholder="https://hooks.example.com/…"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => remove(i)}
            className="text-gray-500 hover:text-red-400 transition-colors p-2 rounded"
            title="Remove URL"
            aria-label="Remove URL"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 mt-1"
      >
        <span className="text-lg leading-none">+</span> Add webhook URL
      </button>
      {items.length === 0 && (
        <p className="text-sm text-gray-600 italic">No webhook URLs configured</p>
      )}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────

function SightingHistory() {
  const [sightings, setSightings] = useState(null)
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    const url = filter.trim()
      ? `/api/history?callsign=${encodeURIComponent(filter.trim().toUpperCase())}`
      : '/api/history'
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setSightings(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filter])

  useEffect(() => {
    load()
    const interval = setInterval(load, 30_000)
    return () => clearInterval(interval)
  }, [load])

  const fmt = (ts) => {
    const d = new Date(ts)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <Card
      title="Sighting History"
      description="Each entry records when a watched callsign was detected. Refreshes every 30 s."
    >
      <div className="flex gap-2 mb-2">
        <Input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by callsign…"
          className="max-w-xs"
        />
        {filter && (
          <button
            type="button"
            onClick={() => setFilter('')}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors px-2"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 italic">Loading…</p>
      ) : !sightings || sightings.length === 0 ? (
        <p className="text-sm text-gray-600 italic">No sightings recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-3 py-2 whitespace-nowrap">Time</th>
                <th className="px-3 py-2 whitespace-nowrap">Callsign</th>
                <th className="px-3 py-2 whitespace-nowrap">Reg</th>
                <th className="px-3 py-2 whitespace-nowrap">Type</th>
                <th className="px-3 py-2 whitespace-nowrap">Alt (ft)</th>
                <th className="px-3 py-2 whitespace-nowrap">Spd (kts)</th>
                <th className="px-3 py-2 whitespace-nowrap">Hdg</th>
              </tr>
            </thead>
            <tbody>
              {sightings.map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/40 transition-colors"
                >
                  <td className="px-3 py-2 text-gray-400 whitespace-nowrap font-mono text-xs">
                    {fmt(s.timestamp)}
                  </td>
                  <td className="px-3 py-2 text-blue-400 font-semibold whitespace-nowrap">
                    {s.callsign ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                    {s.registration ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                    {s.type ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                    {s.altitude !== null ? s.altitude.toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                    {s.speed !== null ? s.speed : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-300 whitespace-nowrap">
                    {s.heading !== null ? `${s.heading}°` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'success' | { type:'error', msg }

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load settings:', err)
        setLoading(false)
      })
  }, [])

  const update = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const updateLocation = useCallback((key, raw) => {
    setSettings((prev) => ({
      ...prev,
      location: {
        ...prev.location,
        [key]: raw !== '' && raw !== null ? parseFloat(raw) : null,
      },
    }))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      setSettings(await res.json())
      setSaveStatus('success')
    } catch (err) {
      setSaveStatus({ type: 'error', msg: err.message })
    } finally {
      setSaving(false)
      setTimeout(() => setSaveStatus(null), 5000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading settings…</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-red-400 text-sm">
          Failed to load settings. Is the server running?
        </p>
      </div>
    )
  }

  const cooldownMin = Math.floor((settings.alertCooldownSec || 0) / 60)

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-5">
        {/* Header */}
        <div className="pb-4 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            ✈&nbsp; Aircraft Watcher
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Configure monitoring settings. Changes take effect on the next poll.
          </p>
        </div>

        {/* Sighting History */}
        <SightingHistory />

        {/* Feed Source */}
        <Card
          title="Feed Source"
          description="Where to fetch the ADS-B aircraft list from."
        >
          <Field label="ADS-B Feed URL">
            <Input
              type="url"
              value={settings.tar1090Url}
              onChange={(e) => update('tar1090Url', e.target.value)}
              placeholder="https://example.com/tar1090"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Poll Interval (s)">
              <Input
                type="number"
                min={1}
                max={3600}
                value={settings.pollIntervalSec}
                onChange={(e) =>
                  update('pollIntervalSec', parseInt(e.target.value) || 10)
                }
              />
            </Field>
            <Field label="Fetch Timeout (ms)">
              <Input
                type="number"
                min={1000}
                step={1000}
                value={settings.fetchTimeoutMs}
                onChange={(e) =>
                  update('fetchTimeoutMs', parseInt(e.target.value) || 15000)
                }
              />
            </Field>
            <Field
              label="Max Aircraft / Poll"
              hint="Safety cap to prevent runaway processing."
            >
              <Input
                type="number"
                min={1}
                max={10000}
                value={settings.maxAircraftPerPoll}
                onChange={(e) =>
                  update('maxAircraftPerPoll', parseInt(e.target.value) || 500)
                }
              />
            </Field>
          </div>
        </Card>

        {/* Alert Settings */}
        <Card title="Alert Settings">
          <Field
            label="Alert Cooldown (s)"
            hint={`Minimum time between repeated alerts for the same aircraft (${cooldownMin} min).`}
          >
            <Input
              type="number"
              min={0}
              value={settings.alertCooldownSec}
              onChange={(e) =>
                update('alertCooldownSec', parseInt(e.target.value) || 0)
              }
              className="max-w-xs"
            />
          </Field>
        </Card>

        {/* Location */}
        <Card
          title="Location"
          description="Your coordinates used for distance calculation in alert messages."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Latitude">
              <Input
                type="number"
                step={0.0001}
                min={-90}
                max={90}
                value={settings.location?.lat ?? ''}
                onChange={(e) => updateLocation('lat', e.target.value)}
                placeholder="e.g. 37.7749"
              />
            </Field>
            <Field label="Longitude">
              <Input
                type="number"
                step={0.0001}
                min={-180}
                max={180}
                value={settings.location?.lon ?? ''}
                onChange={(e) => updateLocation('lon', e.target.value)}
                placeholder="e.g. -122.4194"
              />
            </Field>
          </div>
        </Card>

        {/* Watch Callsigns */}
        <Card
          title="Watch Callsigns"
          description="Alert on any aircraft with one of these exact callsigns."
        >
          <TagInput
            items={settings.watchCallsigns}
            onChange={(v) => update('watchCallsigns', v)}
            placeholder="e.g. UAL123 — press Enter to add"
            transform={(s) => s.toUpperCase()}
          />
        </Card>

        {/* Blacklist */}
        <Card
          title="Blacklist"
          description="Never alert on aircraft matching these callsigns or ICAO type codes, even if they would otherwise match."
        >
          <Field label="Blacklisted Callsigns" hint="Exact callsign match — e.g. UAL123">
            <TagInput
              items={settings.blacklistCallsigns ?? []}
              onChange={(v) => update('blacklistCallsigns', v)}
              placeholder="e.g. UAL123 — press Enter to add"
              transform={(s) => s.toUpperCase()}
            />
          </Field>
          <Field label="Blacklisted Aircraft Types" hint="ICAO type designator — e.g. C172, B738">
            <TagInput
              items={settings.blacklistTypes ?? []}
              onChange={(v) => update('blacklistTypes', v)}
              placeholder="e.g. C172 — press Enter to add"
              transform={(s) => s.toUpperCase()}
            />
          </Field>
        </Card>

        {/* Military Detection */}
        <Card title="Military Detection">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-200">
                Enable Military Heuristics
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Detect military aircraft by callsign prefix, ICAO category, and
                database flags
              </p>
            </div>
            <Toggle
              value={settings.enableMilitaryHeuristics}
              onChange={(v) => update('enableMilitaryHeuristics', v)}
            />
          </div>

          {settings.enableMilitaryHeuristics && (
            <Field
              label="Callsign Prefixes"
              hint={`${settings.milCallsignPrefixes.length} prefix${settings.milCallsignPrefixes.length !== 1 ? 'es' : ''} — one per line or comma-separated`}
            >
              <textarea
                rows={8}
                value={settings.milCallsignPrefixes.join('\n')}
                onChange={(e) =>
                  update(
                    'milCallsignPrefixes',
                    e.target.value
                      .split(/[\n,]/)
                      .map((s) => s.trim().toUpperCase())
                      .filter(Boolean),
                  )
                }
                className={`${inputCls} font-mono resize-y`}
              />
            </Field>
          )}
        </Card>

        {/* Webhooks */}
        <Card
          title="Webhooks"
          description="Receive alert notifications via HTTP POST. Payload: { title, message, url }."
        >
          <UrlList
            items={settings.webhookUrls}
            onChange={(v) => update('webhookUrls', v)}
          />
        </Card>
      </div>

      {/* ── Fixed save bar ───────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-sm min-h-[1.25rem]">
            {saveStatus === 'success' && (
              <span className="text-green-400">✓ Settings saved</span>
            )}
            {saveStatus?.type === 'error' && (
              <span className="text-red-400">✗ {saveStatus.msg}</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
