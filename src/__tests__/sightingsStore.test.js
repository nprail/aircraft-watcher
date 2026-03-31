import fs from 'fs'
import os from 'os'
import path from 'path'
import { SightingsStore } from '../sightingsStore.js'

const SAMPLE_AC = {
  flight: 'UAL123',
  hex: 'a1b2c3',
  r: 'N12345',
  t: 'B738',
  alt_baro: 8500,
  gs: 320.4,
  track: 270.1,
  lat: 37.7749,
  lon: -122.4194,
}

describe('SightingsStore', () => {
  test('starts empty', () => {
    const s = new SightingsStore()
    expect(s.size).toBe(0)
    expect(s.getAll()).toEqual([])
  })

  test('add records a sighting with normalised fields', () => {
    const s = new SightingsStore()
    s.add(SAMPLE_AC, 42.7)
    expect(s.size).toBe(1)
    const [entry] = s.getAll()
    expect(entry.callsign).toBe('UAL123')
    expect(entry.hex).toBe('a1b2c3')
    expect(entry.registration).toBe('N12345')
    expect(entry.type).toBe('B738')
    expect(entry.distanceMi).toBe(43) // rounded
    expect(entry.altitude).toBe(8500)
    expect(entry.speed).toBe(320) // rounded
    expect(entry.heading).toBe(270) // rounded
    expect(entry.lat).toBe(37.7749)
    expect(entry.lon).toBe(-122.4194)
    expect(typeof entry.timestamp).toBe('number')
  })

  test('add stores null distanceMi when not provided', () => {
    const s = new SightingsStore()
    s.add(SAMPLE_AC)
    expect(s.getAll()[0].distanceMi).toBeNull()
  })

  test('add stores newest entry first', () => {
    const s = new SightingsStore()
    s.add({ flight: 'AAA' })
    s.add({ flight: 'BBB' })
    const all = s.getAll()
    expect(all[0].callsign).toBe('BBB')
    expect(all[1].callsign).toBe('AAA')
  })

  test('add handles aircraft with missing optional fields', () => {
    const s = new SightingsStore()
    s.add({})
    const [entry] = s.getAll()
    expect(entry.callsign).toBeNull()
    expect(entry.hex).toBeNull()
    expect(entry.registration).toBeNull()
    expect(entry.type).toBeNull()
    expect(entry.distanceMi).toBeNull()
    expect(entry.altitude).toBeNull()
    expect(entry.speed).toBeNull()
    expect(entry.heading).toBeNull()
    expect(entry.lat).toBeNull()
    expect(entry.lon).toBeNull()
  })

  test('getAll returns a copy (mutation does not affect store)', () => {
    const s = new SightingsStore()
    s.add(SAMPLE_AC)
    const all = s.getAll()
    all.push({ callsign: 'FAKE' })
    expect(s.size).toBe(1)
  })

  test('getAll filters by callsign (case-insensitive normalisation)', () => {
    const s = new SightingsStore()
    s.add({ flight: 'UAL123' })
    s.add({ flight: 'DAL456' })
    s.add({ flight: 'UAL123' })
    const ual = s.getAll('ual123')
    expect(ual).toHaveLength(2)
    ual.forEach((e) => expect(e.callsign).toBe('UAL123'))
  })

  test('getAll with unknown callsign returns empty array', () => {
    const s = new SightingsStore()
    s.add(SAMPLE_AC)
    expect(s.getAll('NOBODY')).toEqual([])
  })

  test('add caps entries at MAX_SIGHTINGS (500)', () => {
    const s = new SightingsStore()
    for (let i = 0; i < 510; i++) {
      s.add({ flight: `CS${i}` })
    }
    expect(s.size).toBe(500)
    // Newest should be at index 0
    expect(s.getAll()[0].callsign).toBe('CS509')
  })

  describe('persistence (load/save)', () => {
    let tmpDir
    let stateFile

    beforeEach(async () => {
      tmpDir = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), 'sightings-test-'),
      )
      stateFile = path.join(tmpDir, 'sightings.json')
    })

    afterEach(async () => {
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
    })

    test('save writes JSON and load restores sightings', async () => {
      const s1 = new SightingsStore()
      s1.add(SAMPLE_AC)
      await s1.save(stateFile)

      const s2 = new SightingsStore()
      await s2.load(stateFile)
      expect(s2.size).toBe(1)
      expect(s2.getAll()[0].callsign).toBe('UAL123')
    })

    test('load on missing file does not throw', async () => {
      const s = new SightingsStore()
      await expect(s.load(stateFile)).resolves.toBeUndefined()
      expect(s.size).toBe(0)
    })

    test('save is atomic (file is valid JSON on concurrent calls)', async () => {
      const s = new SightingsStore()
      s.add(SAMPLE_AC)
      await Promise.all([s.save(stateFile), s.save(stateFile)])
      const raw = await fs.promises.readFile(stateFile, 'utf8')
      expect(() => JSON.parse(raw)).not.toThrow()
    })

    test('save creates parent directory if missing', async () => {
      const nested = path.join(tmpDir, 'sub', 'dir', 'sightings.json')
      const s = new SightingsStore()
      s.add(SAMPLE_AC)
      await s.save(nested)
      expect(fs.existsSync(nested)).toBe(true)
    })
  })
})
