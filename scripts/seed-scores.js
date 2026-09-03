/*
 * Fills the leaderboard with fake players for every game, so the end-of-game
 * board can be eyeballed with a realistic (long, scrollable) list instead of
 * the single row you get from actually playing.
 *
 * Paste this whole file into the DevTools console with the game open — the
 * scores live in that browser's own IndexedDB, so nothing outside the console
 * can reach them (a Node script gets its own throwaway profile, not yours).
 *
 *   seedScores()            // 40 players per game
 *   seedScores(150)         // a long list, for testing the scroll
 *   seedScores.clear()      // wipe every seeded and real score on this origin
 *
 * Then play any game to its end screen. You are "Test Player", seeded
 * mid-table everywhere, so the highlighted row and the auto-scroll both show.
 *
 * Schema mirrors src/leaderboard/scoreStore.ts — if the DB name, version,
 * keyPath or gameId index change there, change them here too.
 */
window.seedScores = (function () {
  var DB_NAME = 'KrishnaLilaScores';
  var DB_VERSION = 1;
  var STORE = 'scores';
  var PLAYER_KEY = 'krishnaLila.currentPlayer';

  var GAMES = [
    'arrange',
    'krishna-wheel',
    'math-monsoon',
    'memory-matrix',
    'lexicon-ascent',
    'match-wisdom',
    'govardhan-lift',
    'dahi-handi',
    'yudhishtira-quest',
  ];

  var NAMES = [
    'Radha', 'Meera', 'Arjun', 'Yashoda', 'Nanda', 'Balaram', 'Subhadra',
    'Rukmini', 'Uddhava', 'Akrura', 'Devaki', 'Vasudev', 'Sudama', 'Satyaki',
    'Aarav', 'Ishaan', 'Kavya', 'Anaya', 'Vihaan', 'Diya', 'Reyansh', 'Myra',
    'Advait', 'Saanvi', 'Kabir', 'Aditi', 'Rohan', 'Tara', 'Neel', 'Ira',
    'Shivam', 'Priya', 'Manav', 'Nisha', 'Dev', 'Anika', 'Yuvan', 'Rhea', 'Om',
  ];

  /** The player the app will think you are, so the board shows a "you" row. */
  var ME = { name: 'Test Player', phone: '9000000001' };

  function open() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      // Only fires if the app has never run here; otherwise the store exists.
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' }).createIndex('gameId', 'gameId');
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function rowsFor(players) {
    var rows = [];
    GAMES.forEach(function (gameId, g) {
      for (var i = 0; i < players; i += 1) {
        var isMe = i === 0;
        var name = isMe ? ME.name : NAMES[i % NAMES.length] + ' ' + 'ABCDEFGH'[i % 8];
        var phone = isMe ? ME.phone : String(9100000000 + g * 1000 + i);
        // Mid-table on purpose for me: a rank-1 row would never exercise the
        // highlight-and-scroll-into-view path.
        var best = isMe
          ? 300 + Math.round(players / 2) * 41
          : 120 + Math.round((players - i) * 41 + (i % 7) * 13);
        rows.push({
          id: gameId + '|' + phone + '|' + name.trim().toLowerCase(),
          gameId: gameId,
          name: name,
          phone: phone,
          best: best,
          lastScore: Math.max(0, best - (i % 5) * 40),
          plays: 1 + (i % 4),
          updatedAt: new Date(Date.now() - (i * 97 + g * 1000) * 60000).toISOString(),
        });
      }
    });
    return rows;
  }

  function seed(players) {
    var count = players || 40;
    return open().then(function (db) {
      var rows = rowsFor(count);
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        var store = tx.objectStore(STORE);
        rows.forEach(function (row) { store.put(row); });
        tx.oncomplete = function () {
          localStorage.setItem(PLAYER_KEY, JSON.stringify(ME));
          console.log(
            'seeded ' + rows.length + ' rows across ' + GAMES.length + ' games; ' +
            'you are "' + ME.name + '" (' + ME.phone + '), mid-table everywhere'
          );
          resolve(rows.length);
        };
        tx.onerror = function () { reject(tx.error); };
        tx.onabort = function () { reject(tx.error); };
      });
    });
  }

  seed.clear = function () {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = function () {
          localStorage.removeItem(PLAYER_KEY);
          console.log('cleared every score on this origin');
          resolve();
        };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  };

  seed.games = GAMES;
  return seed;
})();
