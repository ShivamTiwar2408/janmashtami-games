/*
 * players.json — the on-disk copy of every run, one row per (game, name,
 * phone), holding exactly the fields IndexedDB holds: gameId, name, phone,
 * best, lastScore, plays, updatedAt.
 *
 * Run `node electron/scoreFile.js` for a self-check.
 */

const fs = require('fs');

/**
 * Upserts one row, keyed by the same id the browser store uses.
 *
 * ponytail: reads and rewrites the whole file per submission. Fine for an
 * exhibition's worth of rows; switch to append-only JSONL past ~10k plays.
 */
const saveScore = (file, entry) => {
  let rows = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Array.isArray(parsed)) rows = parsed;
  } catch {
    /* first run, or a truncated file we're about to replace anyway */
  }

  const at = rows.findIndex((row) => row && row.id === entry.id);
  if (at >= 0) rows[at] = entry;
  else rows.push(entry);

  // tmp + rename: a power cut mid-write can't leave half a JSON file behind.
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
  fs.renameSync(tmp, file);
  return rows.length;
};

module.exports = { saveScore };

// ---------------------------------------------------------------------------

if (require.main === module) {
  const assert = require('assert');
  const os = require('os');
  const path = require('path');

  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kiosk-')), 'players.json');
  const row = (id, plays, best) => ({ id, gameId: 'arrange', name: 'Radha', phone: '9876543210', best, lastScore: best, plays, updatedAt: '2024-01-01T00:00:00.000Z' });

  // Missing file, then a second player, then a replay of the first.
  assert.strictEqual(saveScore(file, row('a', 1, 10)), 1);
  assert.strictEqual(saveScore(file, row('b', 1, 20)), 2);
  assert.strictEqual(saveScore(file, row('a', 2, 30)), 2, 'replay must update, not append');

  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepStrictEqual(rows.map((r) => [r.id, r.plays, r.best]), [['a', 2, 30], ['b', 1, 20]]);

  // A corrupted file gets replaced rather than throwing at a player.
  fs.writeFileSync(file, '{not json');
  assert.strictEqual(saveScore(file, row('c', 1, 5)), 1);

  fs.rmSync(path.dirname(file), { recursive: true, force: true });
  console.log('scoreFile self-check ok');
}
