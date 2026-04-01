# aircraft-watcher

A Node.js service that polls an ADS-B aircraft feed and sends alerts when interesting aircraft are detected — watched callsigns, watched ICAO types, or military aircraft. Includes a React/Tailwind web UI for live settings management and sighting history.

## Features

- Polls a live ADS-B JSON feed (from a [tar1090](https://github.com/wiedehopf/tar1090) instance) at a configurable interval
- Military aircraft detection: explicit flag from aircraft DB or category strings
- Civilian type exclusion list to suppress false positives (Cessnas, Pipers, etc.)
- Watch list alerts for specific callsigns or ICAO type designators
- Blacklist to permanently suppress alerts for specific callsigns or ICAO aircraft types
- Enriches aircraft data from the [tar1090-db](https://github.com/wiedehopf/tar1090-db) database (registration, type code, military flag), refreshed every 24 hours
- Webhook notifications with a link to the tar1090 map
- ntfy.sh push notifications (optional, with access token support)
- Optional distance threshold — only notify when an aircraft is within a configured radius
- Military no-location grace period — suppress alerts for military aircraft until they have a position fix
- Per-aircraft alert cooldown to prevent notification floods, persisted across restarts
- Sighting history for watched callsigns and types, viewable in the web UI
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

Optionally create a `.env` file to override `WEB_PORT` or `DATA_FOLDER`.

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
| `watchCallsigns`              | `[]`                                       | Callsigns to always alert on (exact match, case-insensitive)         |
| `watchTypes`                  | `[]`                                       | ICAO type designators to always alert on (e.g. `C130`, `B52`)       |
| `blacklistCallsigns`          | `[]`                                       | Callsigns to never alert on, even if they match the watch list or military heuristics |
| `blacklistTypes`              | `[]`                                       | ICAO type designators (e.g. `C172`, `B738`) to never alert on       |
| `enableMilitaryHeuristics`    | `true`                                     | Master toggle for military aircraft detection                        |
| `noLocationGrace`             | `true`                                     | Suppress alerts for aircraft without a position fix until seen a number of times |
| `noLocationThreshold`         | `5`                                        | Number of sightings without a position before alerting anyway        |
| `webhookUrls`                 | `[]`                                       | HTTP POST targets for alert notifications                            |
| `ntfy`                        | _(see below)_                             | ntfy.sh push notification settings                                   |
| `ntfy.url`                    | `https://ntfy.sh`                          | ntfy server URL                                                      |
| `ntfy.topic`                  | `""`                                       | ntfy topic — leave blank to disable                                  |
| `ntfy.token`                  | `""`                                       | Optional Bearer token for protected topics                           |
| `ntfy.priority`               | `3`                                        | Message priority 1 (min) – 5 (max)                                  |
| `location`                    | `{ lat: null, lon: null }`                 | Your coordinates, used to compute distance in alerts                 |
| `notifyDistanceThresholdMi`   | `null`                                     | Only notify when aircraft is within this distance (miles); `null` to always notify |

### Environment variables

| Variable             | Default                    | Description                            |
| -------------------- | -------------------------- | -------------------------------------- |
| `WEB_PORT`           | `3000`                     | Port for the web UI / API server       |
| `DATA_FOLDER`        | `data`                     | Directory for all persisted state files |

## Alert Format

Alerts are delivered to all configured notification channels with the following payload:

```json
{
  "title": "Aircraft Alert: RCH210",
  "message": "Callsign: RCH210  Reg: 68-20467 (MILITARY)\nType: C17\nAlt: 8500 ft  Spd: 320 kts  Hdg: 270°\nDistance: 42 mi",
  "url": "https://<tar1090Url>/?icao=<hex>"
}
```

The `url` field links directly to the tar1090 map centred on the aircraft. Distance is only included when `location` is configured.

### Webhook

The payload is sent as a `POST` request with a JSON body to each URL in `webhookUrls`.

### ntfy.sh

The `message` and `url` are combined into the request body, with `title` sent as a header. Notifications are sent to the configured `ntfy.topic`; leave the topic blank to disable ntfy.

## Web UI

The web UI is served at `http://localhost:3000` (or the configured `WEB_PORT`). It provides settings cards for:

- **Sighting History** — Browse recent sightings for watched callsigns and types (auto-refreshes every 30 s)
- **Feed Source** — ADS-B feed URL, poll interval, fetch timeout, max aircraft per poll
- **Alert Settings** — alert cooldown
- **Location** — latitude/longitude for distance calculations and optional distance threshold
- **Watch Callsigns** — manage the callsign watch list
- **Watch Aircraft Types** — alert on specific ICAO type designators regardless of callsign
- **Blacklist** — suppress alerts by callsign or ICAO type code (overrides all other rules)
- **Military Detection** — toggle heuristics on/off, configure no-location grace period, edit callsign prefixes
- **Webhooks** — add/remove webhook URLs
- **ntfy.sh Notifications** — configure ntfy server, topic, access token, and priority

Changes are saved immediately via the API and take effect on the next poll cycle.

## Project Structure

```
src/
  index.js          — Main entry point and poll loop
  config.js         — Live config proxy over settingsStore + env vars
  matcher.js        — Aircraft matching logic (callsign/type watch list + military heuristics)
  deduper.js        — Alert deduplication with cooldown tracking
  formatter.js      — Builds the plain-text alert message
  webhook.js        — Sends webhook notifications
  ntfy.js           — Sends ntfy.sh push notifications
  utils.js          — Shared helpers (fetch, enrich, distance, send notifications)
  aircraftDb.js     — Downloads and maintains the in-memory aircraft registry
  settingsStore.js  — Reads/writes data/settings.json
  sightingsStore.js — In-memory + persisted sighting history for watched aircraft
  server.js         — Express server (REST API + serves the web UI)
  logger.js         — Structured JSON logger
  __tests__/
    matcher.test.js
    deduper.test.js
    sightingsStore.test.js
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
{"level":"info","time":"2026-01-15T12:00:10.000Z","msg":"Interesting aircraft detected","data":{"hex":"ae1234","callsign":"RCH210","lat":37.77,"lon":-122.41}}
{"level":"info","time":"2026-01-15T12:00:10.100Z","msg":"Webhook notified","data":{}}
{"level":"info","time":"2026-01-15T12:00:10.150Z","msg":"ntfy notified","data":{}}
```
