/**
 * Turns the store's per-(game, player) rows into one row per human.
 *
 * Lives apart from ParticipantsPage.tsx purely so it stays testable — importing
 * the component pulls in react-router, which CRA's jest can't resolve at v7.
 */

import { ScoreEntry, byRank, normalizeName } from './scoreStore';

/** RFC-4180 quoting, so a name with a comma or a quote survives Excel. */
const csvCell = (value: string | number): string => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const CSV_HEADER = 'Name,Phone,Game,Best,Last Score,Plays,Last Played';

/**
 * One line per (person, game) — the raw rows, not the grouped view, because a
 * spreadsheet is easier to pivot than to un-flatten.
 */
export const toCsv = (entries: ScoreEntry[], titleOf: (gameId: string) => string): string => {
  const lines = entries
    .slice()
    .sort(
      (a, b) => normalizeName(a.name).localeCompare(normalizeName(b.name)) ||
        a.gameId.localeCompare(b.gameId)
    )
    .map((e) =>
      [e.name.trim(), e.phone, titleOf(e.gameId), e.best, e.lastScore, e.plays, e.updatedAt]
        .map(csvCell)
        .join(',')
    );

  return [CSV_HEADER, ...lines].join('\n');
};

export interface Participant {
  key: string;
  name: string;
  phone: string;
  /** Every game this person has played, best first. */
  runs: ScoreEntry[];
  totalPlays: number;
  totalBest: number;
  lastPlayed: string;
}

export const groupByPlayer = (entries: ScoreEntry[]): Participant[] => {
  const byPlayer = new Map<string, Participant>();

  for (const entry of entries) {
    // Same rule the store uses for identity, minus the game — one human, many games.
    const key = `${entry.phone}|${normalizeName(entry.name)}`;
    const existing = byPlayer.get(key);

    if (existing) {
      existing.runs.push(entry);
      existing.totalPlays += entry.plays;
      existing.totalBest += entry.best;
      if (entry.updatedAt > existing.lastPlayed) existing.lastPlayed = entry.updatedAt;
    } else {
      byPlayer.set(key, {
        key,
        name: entry.name,
        phone: entry.phone,
        runs: [entry],
        totalPlays: entry.plays,
        totalBest: entry.best,
        lastPlayed: entry.updatedAt,
      });
    }
  }

  // Array.from, not spread: the build targets ES5 and won't iterate a Map.
  const people = Array.from(byPlayer.values());
  for (const person of people) person.runs.sort(byRank);
  return people;
};
