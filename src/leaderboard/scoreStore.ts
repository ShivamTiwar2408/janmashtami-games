/**
 * Local-only leaderboard.
 *
 * Everything lives in IndexedDB in the visitor's own browser — no network calls
 * anywhere in this file, by design. One row per (game, name, phone); replaying
 * updates that row rather than adding another.
 */

const DB_NAME = 'KrishnaLilaScores';
const DB_VERSION = 1;
const STORE = 'scores';
const PLAYER_KEY = 'krishnaLila.currentPlayer';

export interface Player {
  name: string;
  phone: string;
}

export interface ScoreEntry {
  /** `${gameId}|${phoneKey}|${nameKey}` — the uniqueness rule, as the primary key. */
  id: string;
  gameId: string;
  name: string;
  phone: string;
  best: number;
  lastScore: number;
  plays: number;
  updatedAt: string;
}

export interface SubmitResult {
  entries: ScoreEntry[];
  meId: string;
  rank: number;
  isNewBest: boolean;
  previousBest: number;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in scoreStore.test.ts)
// ---------------------------------------------------------------------------

/**
 * Digits only, keeping the last 10 — so "98765 43210", "+91-9876543210" and
 * "09876543210" all resolve to the same person rather than three board rows.
 */
export const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
};

/** Case- and whitespace-insensitive, so "Radha  M" matches "radha m". */
export const normalizeName = (name: string): string =>
  name.trim().toLowerCase().replace(/\s+/g, ' ');

export const entryId = (gameId: string, player: Player): string =>
  `${gameId}|${normalizePhone(player.phone)}|${normalizeName(player.name)}`;

/** Title-cases a typed name for display without mangling initials. */
export const displayName = (name: string): string =>
  normalizeName(name)
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/** Highest score first; on a tie the person who got there earlier ranks higher. */
export const byRank = (a: ScoreEntry, b: ScoreEntry): number =>
  b.best - a.best || a.updatedAt.localeCompare(b.updatedAt);

/** Folds a new run into an existing row, keeping the player's best score. */
export const mergeEntry = (
  existing: ScoreEntry | undefined,
  gameId: string,
  player: Player,
  score: number,
  now: string
): ScoreEntry => ({
  id: entryId(gameId, player),
  gameId,
  name: player.name.trim(),
  phone: normalizePhone(player.phone),
  best: Math.max(score, existing?.best ?? 0),
  lastScore: score,
  plays: (existing?.plays ?? 0) + 1,
  // Only a new personal best moves you up the board, so only then does the
  // tie-break timestamp change.
  updatedAt: !existing || score > existing.best ? now : existing.updatedAt,
});

export const isValidPlayer = (player: Player): boolean =>
  normalizeName(player.name).length > 0 && normalizePhone(player.phone).length === 10;

// ---------------------------------------------------------------------------
// Remembered player (so a replay doesn't re-ask for the same details)
// ---------------------------------------------------------------------------

export const getCurrentPlayer = (): Player | null => {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Player;
    return isValidPlayer(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const setCurrentPlayer = (player: Player): void => {
  try {
    localStorage.setItem(
      PLAYER_KEY,
      JSON.stringify({ name: player.name.trim(), phone: normalizePhone(player.phone) })
    );
  } catch {
    /* private-mode storage denial is not worth breaking the game over */
  }
};

export const clearCurrentPlayer = (): void => {
  try {
    localStorage.removeItem(PLAYER_KEY);
  } catch {
    /* ignore */
  }
};

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('gameId', 'gameId');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  // A failed open must not poison every later call.
  dbPromise.catch(() => {
    dbPromise = null;
  });

  return dbPromise;
};

const asPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Every score ever recorded for one game, best first. */
export const getLeaderboard = async (gameId: string): Promise<ScoreEntry[]> => {
  const db = await openDb();
  const store = db.transaction(STORE, 'readonly').objectStore(STORE);
  const rows = await asPromise<ScoreEntry[]>(store.index('gameId').getAll(gameId));
  return rows.sort(byRank);
};

/**
 * Everyone who has played anything on this device, most recent first.
 *
 * Feeds the "tap your name" shortcuts on the details form — at an event the
 * same phone gets passed around a group, and retyping a number every turn is
 * the slowest part of playing.
 */
export const getRecentPlayers = async (limit = 4): Promise<Player[]> => {
  const db = await openDb();
  const store = db.transaction(STORE, 'readonly').objectStore(STORE);
  const rows = await asPromise<ScoreEntry[]>(store.getAll());

  const seen = new Map<string, ScoreEntry>();
  for (const row of rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) {
    // Same human across different games collapses to one shortcut.
    const key = `${row.phone}|${normalizeName(row.name)}`;
    if (!seen.has(key)) seen.set(key, row);
  }

  // Array.from, not spread: the build targets ES5 and won't iterate a Map.
  return Array.from(seen.values())
    .slice(0, limit)
    .map(({ name, phone }) => ({ name, phone }));
};

/**
 * Records a finished run and hands back the board to render.
 *
 * Read + write share one transaction so two tabs finishing at once can't
 * clobber each other's play count.
 */
export const submitScore = async (
  gameId: string,
  player: Player,
  score: number
): Promise<SubmitResult> => {
  const db = await openDb();
  const id = entryId(gameId, player);

  const previousBest = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const existing = getReq.result as ScoreEntry | undefined;
      store.put(mergeEntry(existing, gameId, player, score, new Date().toISOString()));
      tx.oncomplete = () => resolve(existing?.best ?? 0);
    };

    getReq.onerror = () => reject(getReq.error);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  const entries = await getLeaderboard(gameId);

  return {
    entries,
    meId: id,
    rank: entries.findIndex((e) => e.id === id) + 1,
    isNewBest: score > previousBest,
    previousBest,
  };
};
