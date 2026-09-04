import { CSV_HEADER, groupByPlayer, toCsv } from './participants';
import { ScoreEntry } from './scoreStore';

const row = (gameId: string, name: string, phone: string, best: number, plays: number, at: string): ScoreEntry => ({
  id: `${gameId}|${phone}|${name}`,
  gameId,
  name,
  phone,
  best,
  lastScore: best,
  plays,
  updatedAt: at,
});

describe('groupByPlayer', () => {
  it('collapses one person across games and totals their plays', () => {
    const people = groupByPlayer([
      row('arrange', 'Radha M', '9876543210', 600, 2, '2026-09-01T10:00:00.000Z'),
      row('dahi-handi', 'radha  m', '9876543210', 450, 3, '2026-09-01T11:00:00.000Z'),
      row('arrange', 'Mohan', '9999999999', 300, 1, '2026-09-01T09:00:00.000Z'),
    ]);

    expect(people).toHaveLength(2);

    const radha = people.find((p) => p.phone === '9876543210')!;
    expect(radha.runs).toHaveLength(2);
    expect(radha.totalPlays).toBe(5);
    expect(radha.totalBest).toBe(1050);
    // Latest run across all games wins the "last played" stamp.
    expect(radha.lastPlayed).toBe('2026-09-01T11:00:00.000Z');
    // Runs come back best-first.
    expect(radha.runs[0].gameId).toBe('arrange');
  });
});

describe('toCsv', () => {
  it('quotes names containing commas and quotes, one line per game played', () => {
    const csv = toCsv(
      [
        row('arrange', 'Radha "Rani", M', '9876543210', 600, 2, '2026-09-01T10:00:00.000Z'),
        row('dahi-handi', 'Mohan', '9999999999', 450, 1, '2026-09-01T11:00:00.000Z'),
      ],
      (id) => id.toUpperCase()
    );

    const lines = csv.split('\n');
    expect(lines[0]).toBe(CSV_HEADER);
    expect(lines).toHaveLength(3);
    // Sorted by name: Mohan before Radha.
    expect(lines[1]).toBe('Mohan,9999999999,DAHI-HANDI,450,450,1,2026-09-01T11:00:00.000Z');
    expect(lines[2]).toBe(
      '"Radha ""Rani"", M",9876543210,ARRANGE,600,600,2,2026-09-01T10:00:00.000Z'
    );
  });
});
