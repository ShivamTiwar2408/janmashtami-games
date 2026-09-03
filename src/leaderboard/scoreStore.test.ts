import {
  byRank,
  displayName,
  entryId,
  isValidPlayer,
  mergeEntry,
  normalizeName,
  normalizePhone,
  ScoreEntry,
} from './scoreStore';

const player = { name: 'Radha M', phone: '9876543210' };

describe('identity', () => {
  it('treats formatting differences as the same person', () => {
    expect(entryId('arrange', { name: 'Radha M', phone: '98765 43210' })).toBe(
      entryId('arrange', { name: '  radha   m ', phone: '+91-9876543210' })
    );
  });

  it('keeps players separate per game', () => {
    expect(entryId('arrange', player)).not.toBe(entryId('math-monsoon', player));
  });

  it('distinguishes same name on a different phone', () => {
    expect(entryId('arrange', player)).not.toBe(
      entryId('arrange', { name: 'Radha M', phone: '9999999999' })
    );
  });

  it('normalizes and formats names for display', () => {
    expect(normalizeName('  RADHA   m ')).toBe('radha m');
    expect(displayName('  RADHA   m ')).toBe('Radha M');
    expect(normalizePhone('+91 (98765) 43210')).toBe('9876543210');
    expect(normalizePhone('09876543210')).toBe('9876543210');
    expect(normalizePhone('98765')).toBe('98765');
  });

  it('requires a name and exactly ten phone digits', () => {
    expect(isValidPlayer(player)).toBe(true);
    expect(isValidPlayer({ name: '  ', phone: '9876543210' })).toBe(false);
    expect(isValidPlayer({ name: 'Radha', phone: '98765' })).toBe(false);
  });
});

describe('mergeEntry', () => {
  const first = mergeEntry(undefined, 'arrange', player, 400, '2026-01-01T00:00:00.000Z');

  it('starts a new row at one play', () => {
    expect(first).toMatchObject({ best: 400, lastScore: 400, plays: 1 });
  });

  it('raises best and bumps the timestamp on an improvement', () => {
    const better = mergeEntry(first, 'arrange', player, 900, '2026-01-02T00:00:00.000Z');
    expect(better).toMatchObject({ best: 900, lastScore: 900, plays: 2 });
    expect(better.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('keeps the old best — and its timestamp — on a worse run', () => {
    const worse = mergeEntry(first, 'arrange', player, 120, '2026-01-03T00:00:00.000Z');
    expect(worse).toMatchObject({ best: 400, lastScore: 120, plays: 2 });
    expect(worse.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('never creates a second row for the same person', () => {
    const again = mergeEntry(first, 'arrange', { name: 'RADHA  M', phone: '98765-43210' }, 10, 'x');
    expect(again.id).toBe(first.id);
  });
});

describe('byRank', () => {
  const row = (best: number, updatedAt: string): ScoreEntry => ({
    id: `${best}`,
    gameId: 'g',
    name: 'n',
    phone: '0000000000',
    best,
    lastScore: best,
    plays: 1,
    updatedAt,
  });

  it('sorts by score, earliest first on a tie', () => {
    const sorted = [
      row(500, '2026-01-03T00:00:00.000Z'),
      row(900, '2026-01-02T00:00:00.000Z'),
      row(500, '2026-01-01T00:00:00.000Z'),
    ].sort(byRank);

    expect(sorted.map((r) => [r.best, r.updatedAt.slice(8, 10)])).toEqual([
      [900, '02'],
      [500, '01'],
      [500, '03'],
    ]);
  });
});
