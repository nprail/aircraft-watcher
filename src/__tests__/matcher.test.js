'use strict';

const { isTailMatch, isMilitaryMatch, isInteresting, getTail, getCallsign, getHex } = require('../matcher');

describe('getTail', () => {
  test('returns r field uppercased', () => {
    expect(getTail({ r: 'n12345' })).toBe('N12345');
  });
  test('returns registration field uppercased', () => {
    expect(getTail({ registration: 'g-abcd' })).toBe('G-ABCD');
  });
  test('returns tail field uppercased', () => {
    expect(getTail({ tail: 'c-fabc' })).toBe('C-FABC');
  });
  test('prefers r over registration', () => {
    expect(getTail({ r: 'n1', registration: 'n2' })).toBe('N1');
  });
  test('returns empty string when no tail fields', () => {
    expect(getTail({})).toBe('');
  });
});

describe('getCallsign', () => {
  test('returns flight field trimmed uppercased', () => {
    expect(getCallsign({ flight: 'rch123  ' })).toBe('RCH123');
  });
  test('returns callsign field trimmed uppercased', () => {
    expect(getCallsign({ callsign: 'eagle1' })).toBe('EAGLE1');
  });
  test('prefers flight over callsign', () => {
    expect(getCallsign({ flight: 'a1', callsign: 'b2' })).toBe('A1');
  });
  test('returns empty string when missing', () => {
    expect(getCallsign({})).toBe('');
  });
});

describe('getHex', () => {
  test('returns hex lowercased', () => {
    expect(getHex({ hex: 'ABC123' })).toBe('abc123');
  });
  test('returns icao fallback lowercased', () => {
    expect(getHex({ icao: 'DEF456' })).toBe('def456');
  });
  test('returns empty string when missing', () => {
    expect(getHex({})).toBe('');
  });
});

describe('isTailMatch', () => {
  const watchTails = ['N12345', 'G-ABCD'];

  test('matches tail in watch list (r field)', () => {
    expect(isTailMatch({ r: 'n12345' }, watchTails)).toBe(true);
  });
  test('matches tail in watch list (registration field)', () => {
    expect(isTailMatch({ registration: 'G-ABCD' }, watchTails)).toBe(true);
  });
  test('does not match tail not in watch list', () => {
    expect(isTailMatch({ r: 'N99999' }, watchTails)).toBe(false);
  });
  test('returns false when watch list is empty', () => {
    expect(isTailMatch({ r: 'N12345' }, [])).toBe(false);
  });
  test('returns false when aircraft has no tail', () => {
    expect(isTailMatch({}, watchTails)).toBe(false);
  });
  test('returns false when watchTails is null', () => {
    expect(isTailMatch({ r: 'N12345' }, null)).toBe(false);
  });
});

describe('isMilitaryMatch', () => {
  const milPrefixes = ['RCH', 'REACH', 'EAGLE', 'HAWK'];

  test('returns true when military: true', () => {
    expect(isMilitaryMatch({ military: true }, milPrefixes)).toBe(true);
  });
  test('returns false when military: false', () => {
    expect(isMilitaryMatch({ military: false, flight: 'UAL123' }, milPrefixes)).toBe(false);
  });
  test('returns true when category contains "military"', () => {
    expect(isMilitaryMatch({ category: 'Military' }, milPrefixes)).toBe(true);
  });
  test('returns true for known callsign prefix (flight field)', () => {
    expect(isMilitaryMatch({ flight: 'RCH210  ' }, milPrefixes)).toBe(true);
  });
  test('returns true for known callsign prefix (callsign field)', () => {
    expect(isMilitaryMatch({ callsign: 'EAGLE21' }, milPrefixes)).toBe(true);
  });
  test('returns false for non-military callsign', () => {
    expect(isMilitaryMatch({ flight: 'UAL456' }, milPrefixes)).toBe(false);
  });
  test('returns false when no relevant fields', () => {
    expect(isMilitaryMatch({}, milPrefixes)).toBe(false);
  });
  test('prefix match is case-insensitive via uppercased prefix list', () => {
    expect(isMilitaryMatch({ flight: 'REACH99' }, ['REACH'])).toBe(true);
  });
  test('does not partially match mid-string (REACH in NOREACH)', () => {
    expect(isMilitaryMatch({ flight: 'NOREACH1' }, milPrefixes)).toBe(false);
  });
});

describe('isInteresting', () => {
  const config = {
    watchTails: ['N12345'],
    enableMilitaryHeuristics: true,
    milCallsignPrefixes: ['RCH', 'EAGLE'],
  };

  test('returns true for watched tail', () => {
    expect(isInteresting({ r: 'n12345' }, config)).toBe(true);
  });
  test('returns true for military callsign when heuristics enabled', () => {
    expect(isInteresting({ flight: 'RCH001' }, config)).toBe(true);
  });
  test('returns false for ordinary aircraft', () => {
    expect(isInteresting({ r: 'N99999', flight: 'UAL500' }, config)).toBe(false);
  });
  test('returns false for military callsign when heuristics disabled', () => {
    const cfg = { ...config, enableMilitaryHeuristics: false };
    expect(isInteresting({ flight: 'RCH001' }, cfg)).toBe(false);
  });
  test('returns true for military: true even with heuristics', () => {
    expect(isInteresting({ military: true }, config)).toBe(true);
  });
});
