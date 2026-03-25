# aircraft-watcher

A Node.js service that polls an ADS-B aircraft feed and sends webhook alerts when interesting aircraft are detected — watched callsigns or military aircraft. Includes a React/Tailwind web UI for live settings management.

## Features

- Polls a live ADS-B JSON feed (from a [tar1090](https://github.com/wiedehopf/tar1090) instance) at a configurable interval
- Military aircraft detection: explicit flag from aircraft DB, category strings, or callsign prefix matching
- Civilian type exclusion list to suppress false positives (Cessnas, Pipers, etc.)
- Watch list alerts for specific callsigns
- Blacklist to permanently suppress alerts for specific callsigns or ICAO aircraft types
- Enriches aircraft data from the [tar1090-db](https://github.com/wiedehopf/tar1090-db) database (registration, type code, military flag), refreshed every 24 hours
- Webhook notifications with a link to the tar1090 map
- Per-aircraft alert cooldown to prevent notification floods, persisted across restarts
- Web UI for managing all settings without restarting
- Structured JSON logging to stdout
- Graceful shutdown on `SIGTERM`/`SIGINT`
- Docker-ready with a multi-stage build

## Requirements

- Node.js >= 20

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure

`data/settings.json` is created automatically on first run with built-in defaults. Edit it directly or use the web UI at `http://localhost:3000`.

Optionally create a `.env` file to override `WEB_PORT`, `DEDUPER_STATE_FILE`, or `SETTINGS_FILE`.

### 3. Run

```bash
npm start
```

### 4. Run with Docker Compose

```bash
docker compose up -d
```

## Configuration

All application settings are managed via `data/settings.json` and can be updated live through the web UI without restarting the service.

| Setting                    | Default                                    | Description                                                          |
| -------------------------- | ------------------------------------------ | -------------------------------------------------------------------- |
| `tar1090Url`               | `http://localhost:8080` | Base URL of the tar1090 / ADS-B feed                                 |
| `pollIntervalSec`          | `10`                                       | Seconds between feed polls                                           |
| `alertCooldownSec`         | `1200`                                     | Seconds before re-alerting on the same aircraft (20 min)             |
| `maxAircraftPerPoll`       | `500`                                      | Safety cap on aircraft processed per poll cycle                      |
| `fetchTimeoutMs`           | `15000`                                    | HTTP fetch timeout for the feed request (ms)                         |
| `watchCallsigns`           | `[]`                                       | Callsigns to always alert on (case-insensitive exact match)          |
| `blacklistCallsigns`       | `[]`                                       | Callsigns to never alert on, even if they match the watch list or military heuristics |
| `blacklistTypes`           | `[]`                                       | ICAO type designators (e.g. `C172`, `B738`) to never alert on       |
| `enableMilitaryHeuristics` | `true`                                     | Master toggle for military aircraft detection                        |
| `milCallsignPrefixes`      | _(60+ entries — see source)_               | Callsign prefixes that imply military (e.g. `RCH`, `REACH`, `REAPER`) |
| `webhookUrls`              | `[]`                                       | HTTP POST targets for alert notifications                            |
| `location`                 | `null`                                     | `{ lat, lon }` — your coordinates, used to compute distance in alerts |

### Environment variables

| Variable             | Default                    | Description                            |
| -------------------- | -------------------------- | -------------------------------------- |
| `WEB_PORT`           | `3000`                     | Port for the web UI / API server       |
| `DEDUPER_STATE_FILE` | `data/.deduper-state.json` | Path for persisting cooldown state     |
| `SETTINGS_FILE`      | `data/settings.json`       | Path to the settings file              |

## Alert Format

Alerts are sent as `POST` requests to all configured `webhookUrls` with the following JSON body:

```json
{
  "title": "Aircraft Alert: RCH210",
  "message": "Callsign: RCH210  Reg: 68-20467 (MILITARY)\nType: C17\nAlt: 8500 ft  Spd: 320 kts  Hdg: 270°\nDistance: 42 mi",
  "url": "https://<tar1090Url>/?icao=<hex>"
}
```

The `url` field links directly to the tar1090 map centred on the aircraft. Distance is only included when `location` is configured.

## Web UI

The web UI is served at `http://localhost:3000` (or the configured `WEB_PORT`). It provides settings cards for:

- **Feed Source** — ADS-B feed URL, poll interval, fetch timeout, max aircraft per poll
- **Alert Settings** — alert cooldown
- **Location** — latitude/longitude for distance calculations
- **Watch Callsigns** — manage the callsign watch list
- **Blacklist** — suppress alerts by callsign or ICAO type code (overrides all other rules)
- **Military Detection** — toggle heuristics on/off, edit callsign prefixes
- **Webhooks** — add/remove webhook URLs

Changes are saved immediately via the API and take effect on the next poll cycle.

## Project Structure

```
src/
  index.js          — Main entry point and poll loop
  config.js         — Live config proxy over settingsStore + env vars
  matcher.js        — Aircraft matching logic (callsign watch list + military heuristics)
  deduper.js        — Alert deduplication with cooldown tracking
  formatter.js      — Builds the plain-text alert message
  webhook.js        — Sends webhook notifications
  aircraftDb.js     — Downloads and maintains the in-memory aircraft registry
  settingsStore.js  — Reads/writes data/settings.json
  server.js         — Express server (REST API + serves the web UI)
  logger.js         — Structured JSON logger
  __tests__/
    matcher.test.js
    deduper.test.js
web/
  src/
    App.jsx         — React settings UI
```

## Development

```bash
# Run the backend with auto-restart on file changes (Node 20+)
npm run dev

# Run the Vite dev server for the web UI with hot reload
npm run dev:web

# Build the web UI for production
npm run build:web

# Run tests
npm test
```

## Logging

All output is structured JSON lines to stdout:

```json
{"level":"info","time":"2026-01-15T12:00:00.000Z","msg":"Aircraft watcher starting","data":{}}
{"level":"info","time":"2026-01-15T12:00:10.000Z","msg":"Interesting aircraft detected","data":{"hex":"ae1234","callsign":"RCH210"}}
{"level":"info","time":"2026-01-15T12:00:10.100Z","msg":"Webhook notified","data":{}}
```
