/**
 * Organisers' dashboard: everyone who has played, and every score recorded.
 *
 *   /:gameId/participants   people who played that game, ranked by their best
 *   /participants           everyone, across every game
 *
 * Reads the same IndexedDB the leaderboard writes, so it only ever shows runs
 * played on THIS device/browser — that's the whole storage model (see
 * scoreStore.ts), not a limitation of this page.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './ParticipantsPage.css';
import './palette.css';
import { GAME_TITLES, gameTitle } from './gameCatalog';
import { groupByPlayer, toCsv } from './participants';
import { ScoreEntry, byRank, displayName, getAllEntries } from './scoreStore';

const formatWhen = (iso: string): string => {
  const date = new Date(iso);
  return isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

/** Hands the browser a CSV to save — no server, so it's built in the tab. */
const downloadCsv = (entries: ScoreEntry[], gameId?: string): void => {
  const blob = new Blob([toCsv(entries, gameTitle)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `participants-${gameId ?? 'all-games'}-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const ParticipantsPage: React.FC = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const [entries, setEntries] = useState<ScoreEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getAllEntries()
      .then(setEntries)
      .catch(() => setFailed(true));
  }, []);

  const rows = useMemo(() => {
    if (!entries) return [];
    const people = groupByPlayer(entries);

    if (!gameId) {
      // Whole-event view: most recent player first.
      return people.sort((a, b) => b.lastPlayed.localeCompare(a.lastPlayed));
    }

    // Single game: only people who played it, ranked by their best at it.
    return people
      .filter((p) => p.runs.some((r) => r.gameId === gameId))
      .sort((a, b) => {
        const aRun = a.runs.find((r) => r.gameId === gameId)!;
        const bRun = b.runs.find((r) => r.gameId === gameId)!;
        return byRank(aRun, bRun);
      });
  }, [entries, gameId]);

  // Export follows the page's scope: this game's rows, or every row.
  const csvRows = useMemo(
    () => (entries ?? []).filter((e) => !gameId || e.gameId === gameId),
    [entries, gameId]
  );

  const totalPlays = rows.reduce(
    (sum, p) =>
      sum + (gameId ? p.runs.find((r) => r.gameId === gameId)!.plays : p.totalPlays),
    0
  );

  return (
    <div className="pp-root gr-root">
      <header className="pp-header">
        <div>
          <p className="pp-eyebrow">Participants</p>
          <h1 className="pp-title">{gameId ? gameTitle(gameId) : 'All Games'}</h1>
        </div>
        <div className="pp-totals">
          <span>
            <strong>{rows.length}</strong> players
          </span>
          <span>
            <strong>{totalPlays}</strong> plays
          </span>
          <button
            type="button"
            className="pp-export"
            disabled={csvRows.length === 0}
            onClick={() => downloadCsv(csvRows, gameId)}
          >
            ⬇ Export CSV
          </button>
        </div>
      </header>

      <nav className="pp-nav">
        <Link to="/participants" className={gameId ? '' : 'pp-nav-current'}>
          All games
        </Link>
        {Object.keys(GAME_TITLES).map((id) => (
          <Link
            key={id}
            to={`/${id}/participants`}
            className={id === gameId ? 'pp-nav-current' : ''}
          >
            {GAME_TITLES[id]}
          </Link>
        ))}
      </nav>

      {failed && (
        <p className="pp-empty">
          Couldn't read the local score store — private browsing blocks IndexedDB.
        </p>
      )}

      {!failed && entries === null && <p className="pp-empty">Loading…</p>}

      {!failed && entries !== null && rows.length === 0 && (
        <p className="pp-empty">
          Nothing recorded on this device yet. Scores live in this browser only, so
          open this page on the machine the games were played on.
        </p>
      )}

      {rows.length > 0 && (
        <table className="pp-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Phone</th>
              {gameId ? (
                <>
                  <th>Plays</th>
                  <th>Best</th>
                  <th>Last score</th>
                </>
              ) : (
                <>
                  <th>Games</th>
                  <th>Total plays</th>
                  <th>Total best</th>
                </>
              )}
              <th>Last played</th>
              <th>Every game played</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((person, index) => {
              const focus = gameId ? person.runs.find((r) => r.gameId === gameId)! : null;
              return (
                <tr key={person.key}>
                  <td className="pp-rank">{index + 1}</td>
                  <td className="pp-name">{displayName(person.name)}</td>
                  <td className="pp-phone">{person.phone}</td>
                  {focus ? (
                    <>
                      <td>{focus.plays}</td>
                      <td className="pp-best">{focus.best}</td>
                      <td>{focus.lastScore}</td>
                    </>
                  ) : (
                    <>
                      <td>{person.runs.length}</td>
                      <td>{person.totalPlays}</td>
                      <td className="pp-best">{person.totalBest}</td>
                    </>
                  )}
                  <td className="pp-when">
                    {formatWhen(focus ? focus.updatedAt : person.lastPlayed)}
                  </td>
                  <td>
                    <div className="pp-chips">
                      {person.runs.map((run) => (
                        <span
                          key={run.gameId}
                          className={`pp-chip${run.gameId === gameId ? ' pp-chip-current' : ''}`}
                        >
                          {gameTitle(run.gameId)}
                          <b>{run.best}</b>
                          <i>×{run.plays}</i>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <footer className="pp-footer">
        <Link to="/">← Back to games</Link>
        <span>Best score per game per person; a replay updates the same row.</span>
      </footer>
    </div>
  );
};

export default ParticipantsPage;
