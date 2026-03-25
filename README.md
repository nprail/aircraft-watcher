# aircraft-watcher

A Node.js service that polls an ADS-B aircraft feed and sends SMS alerts via Twilio when interesting aircraft are detected — watched tail numbers or military aircraft.

## Features

- Polls a live ADS-B JSON feed at a configurable interval
- Detects aircraft by tail/registration allowlist
- Optional military heuristics: explicit `military` flag, category strings, or callsign prefix matching
- SMS alerts sent via Twilio to one or more recipients
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
# Edit .env with your Twilio credentials and watch list
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

| Variable | Default | Description |
|---|---|---|
| `AIRCRAFT_FEED_URL` | `https://airspace.prail.space/combine1090/data/aircraft.json` | ADS-B JSON feed URL |
| `POLL_INTERVAL_SEC` | `10` | Seconds between feed polls |
| `ALERT_COOLDOWN_SEC` | `1200` | Seconds before re-alerting on the same aircraft (20 min) |
| `MAX_AIRCRAFT_PER_POLL` | `500` | Safety cap on aircraft processed per cycle |
| `WATCH_TAILS` | _(empty)_ | Comma-separated tail numbers to always alert on (case-insensitive) |
| `ENABLE_MILITARY_HEURISTICS` | `true` | Enable military aircraft detection |
| `MIL_CALLSIGN_PREFIXES` | _(see below)_ | Comma-separated callsign prefixes for military detection |
| `TWILIO_ACCOUNT_SID` | _(required)_ | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | _(required)_ | Twilio auth token |
| `TWILIO_FROM` | _(required)_ | Twilio sender phone number |
| `TWILIO_TO` | _(required)_ | Comma-separated recipient phone numbers |

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

## SMS Alert Format

```
✈ Aircraft Alert
Tail: N12345  Hex: abc123
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
  matcher.js      — Aircraft matching logic (tail, military)
  deduper.js      — Alert deduplication with cooldown tracking
  sms.js          — Format and send SMS via Twilio
  logger.js       — Structured JSON logger
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
{"level":"info","time":"2024-01-15T12:00:10.100Z","msg":"SMS sent","data":{"to":"+12025551234","sid":"SM..."}}
```
