'use strict'

const {
  isCallsignMatch,
  isMilitaryMatch,
  isInteresting,
  getCallsign,
  getHex,
  CIVILIAN_TYPE_CODES,
} = require('../matcher')

describe('getCallsign', () => {
  test('returns flight field trimmed uppercased', () => {
    expect(getCallsign({ flight: 'rch123  ' })).toBe('RCH123')
  })
  test('returns callsign field trimmed uppercased', () => {
    expect(getCallsign({ callsign: 'eagle1' })).toBe('EAGLE1')
  })
  test('prefers flight over callsign', () => {
    expect(getCallsign({ flight: 'a1', callsign: 'b2' })).toBe('A1')
  })
  test('returns empty string when missing', () => {
    expect(getCallsign({})).toBe('')
  })
})

describe('getHex', () => {
  test('returns hex lowercased', () => {
    expect(getHex({ hex: 'ABC123' })).toBe('abc123')
  })
  test('returns icao fallback lowercased', () => {
    expect(getHex({ icao: 'DEF456' })).toBe('def456')
  })
  test('returns empty string when missing', () => {
    expect(getHex({})).toBe('')
  })
})

describe('isCallsignMatch', () => {
  const watchCallsigns = ['RCH210', 'UAL123']

  test('matches callsign in watch list (flight field)', () => {
    expect(isCallsignMatch({ flight: 'rch210' }, watchCallsigns)).toBe(true)
  })
  test('matches callsign in watch list (callsign field)', () => {
    expect(isCallsignMatch({ callsign: 'UAL123' }, watchCallsigns)).toBe(true)
  })
  test('does not match callsign not in watch list', () => {
    expect(isCallsignMatch({ flight: 'DAL999' }, watchCallsigns)).toBe(false)
  })
  test('returns false when watch list is empty', () => {
    expect(isCallsignMatch({ flight: 'RCH210' }, [])).toBe(false)
  })
  test('returns false when aircraft has no callsign', () => {
    expect(isCallsignMatch({}, watchCallsigns)).toBe(false)
  })
  test('returns false when watchCallsigns is null', () => {
    expect(isCallsignMatch({ flight: 'RCH210' }, null)).toBe(false)
  })
})

describe('isMilitaryMatch', () => {
  const milPrefixes = ['RCH', 'REACH', 'EAGLE', 'HAWK']

  test('returns true when military: true', () => {
    expect(isMilitaryMatch({ military: true }, milPrefixes)).toBe(true)
  })
  test('returns false when military: false', () => {
    expect(
      isMilitaryMatch({ military: false, flight: 'UAL123' }, milPrefixes),
    ).toBe(false)
  })
  test('returns true when category contains "military"', () => {
    expect(isMilitaryMatch({ category: 'Military' }, milPrefixes)).toBe(true)
  })
  test('returns true for known callsign prefix (flight field)', () => {
    expect(isMilitaryMatch({ flight: 'RCH210  ' }, milPrefixes)).toBe(true)
  })
  test('returns true for known callsign prefix (callsign field)', () => {
    expect(isMilitaryMatch({ callsign: 'EAGLE21' }, milPrefixes)).toBe(true)
  })
  test('returns false for non-military callsign', () => {
    expect(isMilitaryMatch({ flight: 'UAL456' }, milPrefixes)).toBe(false)
  })
  test('returns false when no relevant fields', () => {
    expect(isMilitaryMatch({}, milPrefixes)).toBe(false)
  })
  test('prefix match is case-insensitive via uppercased prefix list', () => {
    expect(isMilitaryMatch({ flight: 'REACH99' }, ['REACH'])).toBe(true)
  })
  test('does not partially match mid-string (REACH in NOREACH)', () => {
    expect(isMilitaryMatch({ flight: 'NOREACH1' }, milPrefixes)).toBe(false)
  })

  test('returns false for a Cessna 172 even with military: true', () => {
    expect(isMilitaryMatch({ t: 'C172', military: true }, milPrefixes)).toBe(
      false,
    )
  })
  test('returns false for a Cessna 172 with a military callsign prefix', () => {
    expect(isMilitaryMatch({ t: 'C172', flight: 'EAGLE01' }, milPrefixes)).toBe(
      false,
    )
  })
  test('returns false for a Citation jet (C525) with military: true', () => {
    expect(isMilitaryMatch({ t: 'C525', military: true }, milPrefixes)).toBe(
      false,
    )
  })
  test('returns false for a Learjet (LJ45) with military callsign prefix', () => {
    expect(isMilitaryMatch({ t: 'LJ45', flight: 'RCH001' }, milPrefixes)).toBe(
      false,
    )
  })
  test('type code check is case-insensitive', () => {
    expect(isMilitaryMatch({ t: 'c172', military: true }, milPrefixes)).toBe(
      false,
    )
  })
  test('CIVILIAN_TYPE_CODES contains common civilian types', () => {
    expect(CIVILIAN_TYPE_CODES.has('C172')).toBe(true)
    expect(CIVILIAN_TYPE_CODES.has('PA28')).toBe(true)
    expect(CIVILIAN_TYPE_CODES.has('SR22')).toBe(true)
    expect(CIVILIAN_TYPE_CODES.has('LJ45')).toBe(true)
  })
})

describe('isInteresting', () => {
  const config = {
    watchCallsigns: ['RCH210', 'UAL123'],
    enableMilitaryHeuristics: true,
    milCallsignPrefixes: ['RCH', 'EAGLE'],
  }

  test('returns true for watched callsign', () => {
    expect(isInteresting({ flight: 'rch210' }, config)).toBe(true)
  })
  test('returns true for military callsign when heuristics enabled', () => {
    expect(isInteresting({ flight: 'RCH001' }, config)).toBe(true)
  })
  test('returns false for ordinary aircraft', () => {
    expect(isInteresting({ r: 'N99999', flight: 'AAL500' }, config)).toBe(false)
  })
  test('returns false for military callsign when heuristics disabled', () => {
    const cfg = { ...config, enableMilitaryHeuristics: false }
    expect(isInteresting({ flight: 'RCH001' }, cfg)).toBe(false)
  })
  test('returns true for military: true even with heuristics', () => {
    expect(isInteresting({ military: true }, config)).toBe(true)
  })
})
