'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { Deduper, aircraftKey } = require('../deduper')

describe('aircraftKey', () => {
  test('prefers hex', () => {
    expect(aircraftKey({ hex: 'abc123', r: 'N1', flight: 'RCH1' })).toBe(
      'hex:abc123',
    )
  })
  test('falls back to callsign', () => {
    expect(aircraftKey({ flight: 'RCH1' })).toBe('callsign:RCH1')
  })
  test('returns null when no identifying fields', () => {
    expect(aircraftKey({})).toBeNull()
  })
  test('hex is lowercased', () => {
    expect(aircraftKey({ hex: 'ABCDEF' })).toBe('hex:abcdef')
  })
})

describe('Deduper', () => {
  test('allows alert for first-time aircraft', () => {
    const d = new Deduper(1200)
    expect(d.shouldAlert({ hex: 'aaa' })).toBe(true)
  })

  test('blocks alert within cooldown', () => {
    const d = new Deduper(1200)
    const now = Date.now()
    d.shouldAlert({ hex: 'aaa' }, now)
    expect(d.shouldAlert({ hex: 'aaa' }, now + 100)).toBe(false)
  })

  test('allows alert after cooldown expires', () => {
    const d = new Deduper(60) // 60 second cooldown
    const now = Date.now()
    d.shouldAlert({ hex: 'bbb' }, now)
    expect(d.shouldAlert({ hex: 'bbb' }, now + 61000)).toBe(true)
  })

  test('tracks different aircraft independently', () => {
    const d = new Deduper(1200)
    const now = Date.now()
    d.shouldAlert({ hex: 'aaa' }, now)
    expect(d.shouldAlert({ hex: 'bbb' }, now)).toBe(true)
    expect(d.shouldAlert({ hex: 'aaa' }, now + 100)).toBe(false)
  })

  test('size reflects tracked aircraft', () => {
    const d = new Deduper(1200)
    d.shouldAlert({ hex: 'aaa' })
    d.shouldAlert({ hex: 'bbb' })
    expect(d.size).toBe(2)
  })

  test('returns false for aircraft with no key', () => {
    const d = new Deduper(1200)
    expect(d.shouldAlert({})).toBe(false)
  })

  test('getLastAlertTime returns null before first alert', () => {
    const d = new Deduper(1200)
    expect(d.getLastAlertTime({ hex: 'aaa' })).toBeNull()
  })

  test('getLastAlertTime returns timestamp after alert', () => {
    const d = new Deduper(1200)
    const now = Date.now()
    d.shouldAlert({ hex: 'aaa' }, now)
    expect(d.getLastAlertTime({ hex: 'aaa' })).toBe(now)
  })

  describe('evictExpired', () => {
    test('removes entries past cooldown', () => {
      const d = new Deduper(60)
      const now = Date.now()
      d.shouldAlert({ hex: 'aaa' }, now)
      d.shouldAlert({ hex: 'bbb' }, now)
      d.evictExpired(now + 61000)
      expect(d.size).toBe(0)
    })

    test('keeps entries within cooldown', () => {
      const d = new Deduper(60)
      const now = Date.now()
      d.shouldAlert({ hex: 'aaa' }, now)
      d.evictExpired(now + 30000)
      expect(d.size).toBe(1)
    })

    test('after eviction, aircraft can be alerted again', () => {
      const d = new Deduper(60)
      const now = Date.now()
      d.shouldAlert({ hex: 'aaa' }, now)
      d.evictExpired(now + 61000)
      expect(d.shouldAlert({ hex: 'aaa' }, now + 62000)).toBe(true)
    })
  })

  describe('persistence (load/save)', () => {
    let tmpDir
    let stateFile

    beforeEach(async () => {
      tmpDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'deduper-test-'),
      )
      stateFile = path.join(tmpDir, 'state.json')
    })

    afterEach(async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
    })

    test('save writes JSON file and load restores state', async () => {
      const now = Date.now()
      const d1 = new Deduper(1200)
      d1.shouldAlert({ hex: 'aaa' }, now)
      d1.shouldAlert({ hex: 'bbb' }, now)
      await d1.save(stateFile)

      const d2 = new Deduper(1200)
      await d2.load(stateFile)
      expect(d2.size).toBe(2)
      expect(d2.shouldAlert({ hex: 'aaa' }, now + 100)).toBe(false)
      expect(d2.shouldAlert({ hex: 'bbb' }, now + 100)).toBe(false)
    })

    test('load on missing file does not throw', async () => {
      const d = new Deduper(1200)
      await expect(d.load(stateFile)).resolves.toBeUndefined()
      expect(d.size).toBe(0)
    })

    test('load drops entries that have already expired', async () => {
      const now = Date.now()
      const d1 = new Deduper(60) // 60-second cooldown
      d1.shouldAlert({ hex: 'aaa' }, now - 61000) // expired
      d1.shouldAlert({ hex: 'bbb' }, now) // still active
      await d1.save(stateFile)

      const d2 = new Deduper(60)
      await d2.load(stateFile)
      expect(d2.size).toBe(1)
      expect(d2.getLastAlertTime({ hex: 'bbb' })).toBe(now)
    })

    test('save is atomic (file is valid JSON even on concurrent calls)', async () => {
      const d = new Deduper(1200)
      d.shouldAlert({ hex: 'aaa' })
      await Promise.all([d.save(stateFile), d.save(stateFile)])
      const raw = await fs.promises.readFile(stateFile, 'utf8')
      expect(() => JSON.parse(raw)).not.toThrow()
    })

    test('save creates parent directory if missing', async () => {
      const nested = path.join(tmpDir, 'sub', 'dir', 'state.json')
      const d = new Deduper(1200)
      d.shouldAlert({ hex: 'aaa' })
      await d.save(nested)
      expect(fs.existsSync(nested)).toBe(true)
    })
  })

  describe('usecase: multiple calls in same cycle', () => {
    test('second shouldAlert call in same ms returns false', () => {
      const d = new Deduper(1200)
      const now = Date.now()
      expect(d.shouldAlert({ hex: 'zzz' }, now)).toBe(true)
      expect(d.shouldAlert({ hex: 'zzz' }, now)).toBe(false)
    })
  })
})
