# aircraft-watcher

A Node.js service that polls an ADS-B aircraft feed and sends webhook alerts when interesting aircraft are detected — watched callsigns or military aircraft.

## Features

- Polls a live ADS-B JSON feed at a configurable interval
- Optional military heuristics: explicit `military` flag, category strings, or callsign prefix matching
- Webhook notifications
- Per-aircraft cooldown to prevent alert floods
- Structured JSON logging to stdout
- Graceful shutdown on SIGTERM/SIGINT
- Docker-ready

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Run

```bash
npm start
```

### 4. Run with Docker Compose

```bash
docker compose up -d
```

## Configuration

All configuration is via environment variables (loaded from `.env` via dotenv).

| Variable                     | Default                                    | Description                                                     |
| ---------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| `TAR1090_URL`                | `https://airspace.prail.space/combine1090` | URL of the TAR1090 web interface                                |
| `POLL_INTERVAL_SEC`          | `10`                                       | Seconds between feed polls                                      |
| `ALERT_COOLDOWN_SEC`         | `1200`                                     | Seconds before re-alerting on the same aircraft (20 min)        |
| `MAX_AIRCRAFT_PER_POLL`      | `500`                                      | Safety cap on aircraft processed per cycle                      |
| `FETCH_TIMEOUT_MS`           | `15000`                                    | HTTP fetch timeout for the feed request (ms)                    |
| `WATCH_CALLSIGNS`            | _(empty)_                                  | Comma-separated callsigns to always alert on (case-insensitive) |
| `ENABLE_MILITARY_HEURISTICS` | `true`                                     | Enable military aircraft detection                              |
| `MIL_CALLSIGN_PREFIXES`      | _(see below)_                              | Comma-separated callsign prefixes for military detection        |

### Default military callsign prefixes

```
RCH, REACH, RRR, PAT, SAM, VENUS, CASA, FORTE, GOLD, JAKE, KNIFE, LOBO,
MARIO, GHOST, EAGLE, HAWK, VIPER, COBRA, FALCON, RAPTOR, TALON, HOUND,
WOLF, BARON, DUKE, REAPER, PREDATOR, SENTRY, RIVET, COMBAT, IRON, STEEL,
MAGIC, DARKSTAR, SHADOW, SPECTRE, SPOOKY, BONE, BUFF, WARTHOG, JOLLY,
PEDRO, SANDY, GUARDIAN, SPARTAN, RANGER, TROJAN, RAVEN, CROW, OWL,
HORNET, TOMCAT, VIGILANTE, INTRUDER, PROWLER, HAWKEYE, VIKING, CORSAIR,
ORION, NEPTUNE, HERCULES
```

## Alert Format

```
✈ Aircraft Alert
Hex: abc123
Callsign: RCH210  Cat: A3
Pos: 37.1230, -122.4560
Map: https://www.google.com/maps?q=37.123000,-122.456000
Alt: 35000 ft  Spd: 450 kts  Hdg: 270°
Last seen: 2.5s ago
```

## Project Structure

```
src/
  config.js       — Parse all env vars into a config object
  matcher.js      — Aircraft matching logic (callsign, military)
  deduper.js      — Alert deduplication with cooldown tracking
  logger.js       — Structured JSON logger
  webhook.js      — Send webhook notifications
  index.js        — Main entry point and poll loop
  __tests__/
    matcher.test.js
    deduper.test.js
```

## Development

```bash
# Run tests
npm test

# Run with file watching (Node 20+)
npm run dev
```

## Logging

All output is JSON lines to stdout:

```json
{"level":"info","time":"2024-01-15T12:00:00.000Z","msg":"Aircraft watcher starting","data":{...}}
{"level":"info","time":"2024-01-15T12:00:10.000Z","msg":"Interesting aircraft detected","data":{"hex":"abc123",...}}
{"level":"info","time":"2024-01-15T12:00:10.100Z","msg":"Webhook notified","data":{}}
```
