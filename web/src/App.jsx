import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── useLocalStorage ──────────────────────────────────────────────────────

function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : defaultValue
    } catch {
      return defaultValue
    }
  })
  const set = useCallback(
    (v) => {
      setValue(v)
      try {
        localStorage.setItem(key, JSON.stringify(v))
      } catch {}
    },
    [key],
  )
  return [value, set]
}

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

function TagInput({ items, onChange, onAdd, placeholder, transform }) {
  const [value, setValue] = useState('')

  const commit = () => {
    const raw = value.trim()
    if (!raw) return
    const tag = transform ? transform(raw) : raw
    if (!items.includes(tag)) {
      const next = [...items, tag]
      onChange(next)
      if (onAdd) onAdd(next)
    }
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
  const set = (i, v) =>
    onChange(items.map((item, idx) => (idx === i ? v : item)))
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
        <p className="text-sm text-gray-600 italic">
          No webhook URLs configured
        </p>
      )}
    </div>
  )
}

// ─── CollapsibleSection ───────────────────────────────────────────────────

function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between py-3 px-1 text-left group border-b border-gray-800"
      >
        <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider group-hover:text-white transition-colors">
          {title}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && <div className="space-y-5 pt-5">{children}</div>}
    </div>
  )
}

// ─── SightingHistory ──────────────────────────────────────────────────────

const ACTIVE_WINDOW_MS = 5 * 60 * 1000

function isActive(s) {
  const t = s.lastUpdated ?? s.timestamp ?? 0
  return Date.now() - t < ACTIVE_WINDOW_MS
}

function LiveDot() {
  return (
    <span className="relative inline-flex items-center justify-center w-2 h-2 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
    </span>
  )
}

const matchReasonStyles = {
  callsign: {
    badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    border: 'border-l-blue-500',
    row: 'bg-blue-950/20',
  },
  type: {
    badge: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
    border: 'border-l-purple-500',
    row: 'bg-purple-950/20',
  },
  military: {
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    border: 'border-l-amber-500/60',
    row: 'bg-amber-950/10',
  },
}

function MatchBadge({ reason }) {
  if (!reason) return null
  const styles = matchReasonStyles[reason]
  if (!styles) return null
  const labels = { callsign: 'callsign', type: 'type', military: 'mil' }
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded ${styles.badge}`}
    >
      {labels[reason] ?? reason}
    </span>
  )
}

function SightingCard({ s, fmt, fmtFull, onBlacklistType, blacklistTypes, tar1090Url }) {
  const styles = matchReasonStyles[s.matchReason]
  const active = isActive(s)
  const canBlacklist =
    s.type &&
    !(blacklistTypes ?? []).includes(s.type.toUpperCase()) &&
    onBlacklistType

  return (
    <div
      className={`border border-l-2 rounded-xl p-4 space-y-3 transition-colors ${
        active
          ? 'bg-green-950/20 border-gray-700/60 border-l-green-500'
          : `bg-gray-800/50 border-gray-700/60 ${styles ? styles.border : 'border-l-transparent'}`
      }`}
    >
      {/* Top row: callsign + time */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {tar1090Url && s.hex ? (
            <a
              href={`${tar1090Url}/?icao=${s.hex}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 font-bold text-base leading-tight truncate hover:text-blue-300 hover:underline"
            >
              {s.callsign ?? '—'}
            </a>
          ) : (
            <span className="text-blue-400 font-bold text-base leading-tight truncate">
              {s.callsign ?? '—'}
            </span>
          )}
          <MatchBadge reason={s.matchReason} />
          {active && <LiveDot />}
          {s.registration && (
            <span className="text-gray-500 text-xs font-mono shrink-0">
              {s.registration}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-xs font-mono shrink-0 text-right" title={fmtFull(s.lastUpdated ?? s.timestamp)}>
          {fmt(s.lastUpdated ?? s.timestamp)}
        </span>
      </div>

      {/* Middle row: type badge + distance */}
      <div className="flex items-center gap-2 flex-wrap">
        {s.type && (
          <span className="inline-flex items-center bg-gray-700/80 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">
            {s.type}
          </span>
        )}
        {s.distanceMi !== null && s.distanceMi !== undefined && (
          <span className="text-gray-400 text-xs">
            <span className="text-gray-300 font-medium">{s.distanceMi}</span> mi
            away
          </span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-gray-700/50">
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-wide leading-none mb-1">
            Alt
          </p>
          <p className="text-gray-200 text-sm font-medium">
            {s.altitude !== null && s.altitude !== undefined
              ? s.altitude.toLocaleString()
              : '—'}
          </p>
          {s.altitude !== null && s.altitude !== undefined && (
            <p className="text-gray-600 text-xs">ft</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-wide leading-none mb-1">
            Speed
          </p>
          <p className="text-gray-200 text-sm font-medium">
            {s.speed !== null && s.speed !== undefined ? s.speed : '—'}
          </p>
          {s.speed !== null && s.speed !== undefined && (
            <p className="text-gray-600 text-xs">kts</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-xs uppercase tracking-wide leading-none mb-1">
            Hdg
          </p>
          <p className="text-gray-200 text-sm font-medium">
            {s.heading !== null && s.heading !== undefined
              ? `${s.heading}°`
              : '—'}
          </p>
        </div>
      </div>

      {/* Action */}
      {canBlacklist && (
        <button
          type="button"
          onClick={() => onBlacklistType(s.type)}
          className="w-full text-xs text-red-400 hover:text-red-300 transition-colors border border-red-900/60 hover:border-red-700 px-3 py-1.5 rounded-lg"
          title={`Blacklist type ${s.type}`}
        >
          Blacklist {s.type}
        </button>
      )}
    </div>
  )
}

// Sort key → comparison accessor
const SORT_OPTIONS = [
  { key: 'lastSeen', label: 'Last Seen' },
  { key: 'callsign', label: 'Callsign' },
  { key: 'type', label: 'Type' },
  { key: 'distance', label: 'Distance' },
]

const MATCH_FILTERS = [
  { key: null, label: 'All' },
  { key: 'callsign', label: 'Callsign' },
  { key: 'type', label: 'Type' },
  { key: 'military', label: 'Military' },
]

function SortableHeader({ label, colKey, sortKey, sortDir, onSort }) {
  const active = sortKey === colKey
  return (
    <th
      className="px-4 py-3 whitespace-nowrap font-medium cursor-pointer select-none group"
      onClick={() => onSort(colKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span
          className={`text-gray-400 transition-opacity ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
          }`}
        >
          {active && sortDir === 'asc' ? '↑' : '↓'}
        </span>
      </div>
    </th>
  )
}

// ─── SightingsTable — shared mobile-card + desktop-table renderer ─────────

function SightingsTable({
  sightings,
  fmt,
  fmtFull,
  onBlacklistType,
  blacklistTypes,
  tar1090Url,
  sortKey,
  sortDir,
  onSort,
}) {
  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {sightings.map((s, i) => (
          <SightingCard
            key={i}
            s={s}
            fmt={fmt}
            fmtFull={fmtFull}
            onBlacklistType={onBlacklistType}
            blacklistTypes={blacklistTypes}
            tar1090Url={tar1090Url}
          />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-500 text-xs uppercase tracking-wide">
              {onSort ? (
                <>
                  <SortableHeader
                    label="Last Seen"
                    colKey="lastSeen"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                  />
                  <SortableHeader
                    label="Callsign"
                    colKey="callsign"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                  />
                  <SortableHeader
                    label="Dist"
                    colKey="distance"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                  />
                  <SortableHeader
                    label="Type"
                    colKey="type"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={onSort}
                  />
                </>
              ) : (
                <>
                  <th className="px-4 py-3 whitespace-nowrap font-medium">Last Seen</th>
                  <th className="px-4 py-3 whitespace-nowrap font-medium">Callsign</th>
                  <th className="px-4 py-3 whitespace-nowrap font-medium">Dist</th>
                  <th className="px-4 py-3 whitespace-nowrap font-medium">Type</th>
                </>
              )}
              <th className="px-4 py-3 whitespace-nowrap font-medium">Alt (ft)</th>
              <th className="px-4 py-3 whitespace-nowrap font-medium">Spd (kts)</th>
              <th className="px-4 py-3 whitespace-nowrap font-medium">Hdg</th>
              <th className="px-4 py-3 whitespace-nowrap font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {sightings.map((s, i) => {
              const rowStyles = matchReasonStyles[s.matchReason]
              const active = isActive(s)
              return (
                <tr
                  key={i}
                  className={`transition-colors ${
                    active
                      ? 'bg-green-950/20 hover:bg-green-950/30'
                      : `hover:bg-gray-800/40 ${rowStyles ? rowStyles.row : ''}`
                  }`}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap font-mono text-xs">
                    <span title={fmtFull(s.lastUpdated ?? s.timestamp)}>
                      {fmt(s.lastUpdated ?? s.timestamp)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {active && <LiveDot />}
                      {tar1090Url && s.hex ? (
                        <a
                          href={`${tar1090Url}/?icao=${s.hex}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 font-semibold hover:text-blue-300 hover:underline"
                        >
                          {s.callsign ?? s.hex}
                        </a>
                      ) : (
                        <span className="text-blue-400 font-semibold">
                          {s.callsign ?? s.hex}
                        </span>
                      )}
                      <MatchBadge reason={s.matchReason} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {s.distanceMi !== null && s.distanceMi !== undefined
                      ? `${s.distanceMi} mi`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {s.type ? (
                      <span className="inline-flex items-center bg-gray-700/80 text-gray-300 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {s.type}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {s.altitude !== null && s.altitude !== undefined
                      ? s.altitude.toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {s.speed !== null && s.speed !== undefined ? s.speed : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {s.heading !== null && s.heading !== undefined
                      ? `${s.heading}°`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {s.type &&
                      !(blacklistTypes ?? []).includes(s.type.toUpperCase()) &&
                      onBlacklistType && (
                        <button
                          type="button"
                          onClick={() => onBlacklistType(s.type)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors border border-red-900/50 hover:border-red-700 px-2.5 py-1 rounded-lg"
                          title={`Blacklist type ${s.type}`}
                        >
                          Blacklist
                        </button>
                      )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Shared loading / error elements ─────────────────────────────────────

function LoadingRows() {
  return (
    <div className="flex items-center justify-center py-10">
      <svg
        className="animate-spin h-5 w-5 text-gray-500 mr-2"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="text-sm text-gray-500">Loading…</span>
    </div>
  )
}

function ErrorRows() {
  return (
    <div className="flex items-center gap-2 py-4 px-4 bg-red-950/30 border border-red-900/40 rounded-lg">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 text-red-400 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm text-red-400">
        Failed to load sighting history. Please try again.
      </p>
    </div>
  )
}

function SightingHistory({ onBlacklistType, blacklistTypes, tar1090Url }) {
  const [sightings, setSightings] = useState(null)
  const [callsignFilter, setCallsignFilter] = useState('')
  const [matchFilter, setMatchFilter] = useState(null)
  const [sortKey, setSortKey] = useLocalStorage('aw_history_sort_key', 'lastSeen')
  const [sortDir, setSortDir] = useLocalStorage('aw_history_sort_dir', 'desc')
  const [activeSortKey, setActiveSortKey] = useLocalStorage('aw_active_sort_key', 'lastSeen')
  const [activeSortDir, setActiveSortDir] = useLocalStorage('aw_active_sort_dir', 'desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(ticker)
  }, [])

  const load = useCallback(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((data) => {
        setSightings(data)
        setError(false)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [load])

  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
      } else {
        setSortKey(key)
        setSortDir(key === 'lastSeen' ? 'desc' : 'asc')
      }
    },
    [sortKey, sortDir, setSortKey, setSortDir],
  )

  const handleActiveSort = useCallback(
    (key) => {
      if (activeSortKey === key) {
        setActiveSortDir(activeSortDir === 'asc' ? 'desc' : 'asc')
      } else {
        setActiveSortKey(key)
        setActiveSortDir(key === 'lastSeen' ? 'desc' : 'asc')
      }
    },
    [activeSortKey, activeSortDir, setActiveSortKey, setActiveSortDir],
  )

  const fmtFull = (ts) => {
    const d = new Date(ts)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const fmt = (ts) => {
    const ageMs = now - new Date(ts).getTime()
    if (ageMs < 600_000) {
      const secs = Math.floor(ageMs / 1000)
      if (secs < 60) return `${secs}s ago`
      const mins = Math.floor(secs / 60)
      const remSecs = secs % 60
      return remSecs > 0 ? `${mins}m ${remSecs}s ago` : `${mins}m ago`
    }
    return fmtFull(ts)
  }

  const activeSightings = useMemo(() => {
    if (!sightings) return []
    const dir = activeSortDir === 'asc' ? 1 : -1
    return [...sightings].filter(isActive).sort((a, b) => {
      let av, bv
      if (activeSortKey === 'lastSeen') {
        av = a.lastUpdated ?? a.timestamp ?? 0
        bv = b.lastUpdated ?? b.timestamp ?? 0
      } else if (activeSortKey === 'distance') {
        av = a.distanceMi ?? Infinity
        bv = b.distanceMi ?? Infinity
      } else if (activeSortKey === 'type') {
        av = a.type ?? ''
        bv = b.type ?? ''
      } else {
        av = a.callsign ?? ''
        bv = b.callsign ?? ''
      }
      if (av < bv) return -dir
      if (av > bv) return dir
      return 0
    })
  }, [sightings, activeSortKey, activeSortDir])

  const historyFiltered = useMemo(() => {
    if (!sightings) return []
    let result = sightings.filter((s) => !isActive(s))
    const csq = callsignFilter.trim().toUpperCase()
    if (csq) result = result.filter((s) => s.callsign?.includes(csq))
    if (matchFilter)
      result = result.filter((s) => s.matchReason === matchFilter)
    const dir = sortDir === 'asc' ? 1 : -1
    return [...result].sort((a, b) => {
      let av, bv
      if (sortKey === 'lastSeen') {
        av = a.lastUpdated ?? a.timestamp ?? 0
        bv = b.lastUpdated ?? b.timestamp ?? 0
      } else if (sortKey === 'distance') {
        av = a.distanceMi ?? Infinity
        bv = b.distanceMi ?? Infinity
      } else if (sortKey === 'type') {
        av = a.type ?? ''
        bv = b.type ?? ''
      } else {
        av = a.callsign ?? ''
        bv = b.callsign ?? ''
      }
      if (av < bv) return -dir
      if (av > bv) return dir
      return 0
    })
  }, [sightings, callsignFilter, matchFilter, sortKey, sortDir])

  const historyDisplayed = historyFiltered.slice(0, 20)

  const tableProps = { fmt, fmtFull, onBlacklistType, blacklistTypes, tar1090Url }

  return (
    <>
      {/* ── Active Aircraft ──────────────────────────────────────────── */}
      <Card
        title={
          <span className="flex items-center gap-2">
            Active Aircraft
            {!loading && !error && activeSightings.length > 0 && <LiveDot />}
          </span>
        }
        description="Aircraft currently in range, updated within the last 5 minutes."
      >
        {loading ? (
          <LoadingRows />
        ) : error ? (
          <ErrorRows />
        ) : activeSightings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8 text-gray-700 mb-2"
            >
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
            <p className="text-sm text-gray-600">No aircraft currently in range.</p>
          </div>
        ) : (
          <>
            {/* Mobile-only sort selector for active */}
            <div className="md:hidden flex items-center gap-1.5 mb-3">
              <label className="text-xs text-gray-500">Sort</label>
              <select
                value={`${activeSortKey}:${activeSortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split(':')
                  setActiveSortKey(k)
                  setActiveSortDir(d)
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="lastSeen:desc">Last Seen ↓</option>
                <option value="lastSeen:asc">Last Seen ↑</option>
                <option value="callsign:asc">Callsign A→Z</option>
                <option value="callsign:desc">Callsign Z→A</option>
                <option value="type:asc">Type A→Z</option>
                <option value="type:desc">Type Z→A</option>
                <option value="distance:asc">Distance ↑</option>
                <option value="distance:desc">Distance ↓</option>
              </select>
            </div>
            <SightingsTable
              sightings={activeSightings}
              {...tableProps}
              sortKey={activeSortKey}
              sortDir={activeSortDir}
              onSort={handleActiveSort}
            />
          </>
        )}
      </Card>

      {/* ── Sighting History ─────────────────────────────────────────── */}
      <Card
        title="Sighting History"
        description="Past sightings. Refreshes every 10 s."
      >
        {/* Controls */}
        <div className="space-y-2">
          {/* Row 1: search + count */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
              <Input
                type="text"
                value={callsignFilter}
                onChange={(e) => setCallsignFilter(e.target.value)}
                placeholder="Filter by callsign…"
                className="pl-9"
              />
            </div>
            {callsignFilter && (
              <button
                type="button"
                onClick={() => setCallsignFilter('')}
                className="text-sm text-gray-400 hover:text-gray-200 transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
              >
                Clear
              </button>
            )}
            {!loading && !error && sightings && sightings.length > 0 && (
              <span className="ml-auto text-xs text-gray-600 shrink-0">
                {Math.min(historyFiltered.length, 20)} of {historyFiltered.length}
              </span>
            )}
          </div>

          {/* Row 2: match-type filter pills + mobile sort */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {MATCH_FILTERS.map(({ key, label }) => {
                const active = matchFilter === key
                const style =
                  key === 'callsign'
                    ? active
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'border-gray-700 text-gray-400 hover:border-blue-700 hover:text-blue-300'
                    : key === 'type'
                      ? active
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'border-gray-700 text-gray-400 hover:border-purple-700 hover:text-purple-300'
                      : key === 'military'
                        ? active
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'border-gray-700 text-gray-400 hover:border-amber-700 hover:text-amber-300'
                        : active
                          ? 'bg-gray-600 text-white border-gray-500'
                          : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                return (
                  <button
                    key={String(key)}
                    type="button"
                    onClick={() => setMatchFilter(key)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${style}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* Mobile-only sort selector */}
            <div className="md:hidden ml-auto flex items-center gap-1.5">
              <label className="text-xs text-gray-500">Sort</label>
              <select
                value={`${sortKey}:${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split(':')
                  setSortKey(k)
                  setSortDir(d)
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="lastSeen:desc">Last Seen ↓</option>
                <option value="lastSeen:asc">Last Seen ↑</option>
                <option value="callsign:asc">Callsign A→Z</option>
                <option value="callsign:desc">Callsign Z→A</option>
                <option value="type:asc">Type A→Z</option>
                <option value="type:desc">Type Z→A</option>
                <option value="distance:asc">Distance ↑</option>
                <option value="distance:desc">Distance ↓</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingRows />
        ) : error ? (
          <ErrorRows />
        ) : !sightings || sightings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-8 h-8 text-gray-700 mb-2"
            >
              <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
            </svg>
            <p className="text-sm text-gray-600">No sightings recorded yet.</p>
          </div>
        ) : historyDisplayed.length === 0 ? (
          <p className="text-sm text-gray-600 italic py-4 text-center">
            No past sightings match the current filters.
          </p>
        ) : (
          <SightingsTable
            sightings={historyDisplayed}
            {...tableProps}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )}
      </Card>
    </>
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

  const updateNtfy = useCallback((key, value) => {
    setSettings((prev) => ({
      ...prev,
      ntfy: { ...prev.ntfy, [key]: value },
    }))
  }, [])

  const handleBlacklistType = useCallback(
    async (type) => {
      const upperType = type.toUpperCase()
      if ((settings.blacklistTypes ?? []).includes(upperType)) return
      const updated = {
        ...settings,
        blacklistTypes: [...(settings.blacklistTypes ?? []), upperType],
      }
      setSettings(updated)
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        })
        if (res.ok) setSettings(await res.json())
      } catch (err) {
        console.error('Failed to blacklist type:', err)
      }
    },
    [settings],
  )

  const saveWith = useCallback(
    async (key, value) => {
      const updated = { ...settings, [key]: value }
      setSettings(updated)
      setSaving(true)
      setSaveStatus(null)
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
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
    },
    [settings],
  )

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
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-5">
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
        <SightingHistory
          onBlacklistType={handleBlacklistType}
          blacklistTypes={settings.blacklistTypes}
          tar1090Url={settings.tar1090Url}
        />

        {/* ── Watchlist ─────────────────────────────────────────────────── */}
        <CollapsibleSection title="Watchlist">
          {/* Watch Callsigns */}
          <Card
            title="Watch Callsigns"
            description="Alert on any aircraft with one of these exact callsigns."
          >
            <TagInput
              items={settings.watchCallsigns}
              onChange={(v) => update('watchCallsigns', v)}
              onAdd={(v) => saveWith('watchCallsigns', v)}
              placeholder="e.g. UAL123 — press Enter to add"
              transform={(s) => s.toUpperCase()}
            />
          </Card>

          {/* Watch Aircraft Types */}
          <Card
            title="Watch Aircraft Types"
            description="Alert on any aircraft matching one of these ICAO type designators, regardless of callsign."
          >
            <TagInput
              items={settings.watchTypes ?? []}
              onChange={(v) => update('watchTypes', v)}
              onAdd={(v) => saveWith('watchTypes', v)}
              placeholder="e.g. C130 — press Enter to add"
              transform={(s) => s.toUpperCase()}
            />
          </Card>
        </CollapsibleSection>

        {/* ── Blacklist ─────────────────────────────────────────────────── */}
        <CollapsibleSection title="Blacklist">
          <Card
            title="Blacklist"
            description="Never alert on aircraft matching these callsigns or ICAO type codes, even if they would otherwise match."
          >
            <Field
              label="Blacklisted Callsigns"
              hint="Exact callsign match — e.g. UAL123"
            >
              <TagInput
                items={settings.blacklistCallsigns ?? []}
                onChange={(v) => update('blacklistCallsigns', v)}
                onAdd={(v) => saveWith('blacklistCallsigns', v)}
                placeholder="e.g. UAL123 — press Enter to add"
                transform={(s) => s.toUpperCase()}
              />
            </Field>
            <Field
              label="Blacklisted Aircraft Types"
              hint="ICAO type designator — e.g. C172, B738"
            >
              <TagInput
                items={settings.blacklistTypes ?? []}
                onChange={(v) => update('blacklistTypes', v)}
                onAdd={(v) => saveWith('blacklistTypes', v)}
                placeholder="e.g. C172 — press Enter to add"
                transform={(s) => s.toUpperCase()}
              />
            </Field>
          </Card>
        </CollapsibleSection>

        {/* ── Notifications ─────────────────────────────────────────────── */}
        <CollapsibleSection title="Notifications">
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

          {/* ntfy.sh */}
          <Card
            title="ntfy.sh Notifications"
            description="Push alerts to a ntfy topic. Leave Topic blank to disable."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Server URL" hint="Default: https://ntfy.sh">
                <Input
                  type="url"
                  value={settings.ntfy?.url ?? 'https://ntfy.sh'}
                  onChange={(e) => updateNtfy('url', e.target.value)}
                  placeholder="https://ntfy.sh"
                />
              </Field>
              <Field
                label="Topic"
                hint="Leave blank to disable ntfy notifications."
              >
                <Input
                  type="text"
                  value={settings.ntfy?.topic ?? ''}
                  onChange={(e) => updateNtfy('topic', e.target.value)}
                  placeholder="e.g. aircraft-alerts"
                />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Access Token"
                hint="Optional — for protected topics."
              >
                <Input
                  type="password"
                  value={settings.ntfy?.token ?? ''}
                  onChange={(e) => updateNtfy('token', e.target.value)}
                  placeholder="tk_…"
                  autoComplete="off"
                />
              </Field>
              <Field label="Priority" hint="1 (min) – 5 (max). Default: 3.">
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={settings.ntfy?.priority ?? 3}
                  onChange={(e) =>
                    updateNtfy('priority', parseInt(e.target.value) || 3)
                  }
                  className="max-w-xs"
                />
              </Field>
            </div>
          </Card>
        </CollapsibleSection>

        {/* ── Settings ──────────────────────────────────────────────────── */}
        <CollapsibleSection title="Settings">
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
                    update(
                      'maxAircraftPerPoll',
                      parseInt(e.target.value) || 500,
                    )
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
            <Field
              label="Notify Distance Threshold (miles)"
              hint="Only notify when an aircraft is within this distance. Leave blank to notify regardless of distance."
            >
              <Input
                type="number"
                min={0}
                step={1}
                value={settings.notifyDistanceThresholdMi ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  update(
                    'notifyDistanceThresholdMi',
                    raw === '' ? null : parseFloat(raw) || null,
                  )
                }}
                placeholder="e.g. 50 (leave blank to always notify)"
                className="max-w-xs"
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
                  Detect military aircraft by ICAO category and database flags
                </p>
              </div>
              <Toggle
                value={settings.enableMilitaryHeuristics}
                onChange={(v) => update('enableMilitaryHeuristics', v)}
              />
            </div>

            {settings.enableMilitaryHeuristics && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      Ignore Military Without Location
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Suppress notifications for military aircraft that have no
                      position data until they are seen a certain number of
                      times
                    </p>
                  </div>
                  <Toggle
                    value={settings.milNoLocationGrace ?? true}
                    onChange={(v) => update('milNoLocationGrace', v)}
                  />
                </div>

                {settings.milNoLocationGrace && (
                  <Field
                    label="No-Location Threshold"
                    hint="Number of sightings without location before notifying anyway."
                  >
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={settings.milNoLocationThreshold ?? 5}
                      onChange={(e) =>
                        update(
                          'milNoLocationThreshold',
                          parseInt(e.target.value) || 5,
                        )
                      }
                      className="max-w-xs"
                    />
                  </Field>
                )}
              </>
            )}
          </Card>
        </CollapsibleSection>
      </div>

      {/* ── Fixed save bar ───────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
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
