import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './GameResultPanel.css';
import PlayerForm from './PlayerForm';
import { Player, ScoreEntry, displayName, getCurrentPlayer, submitScore } from './scoreStore';

export interface ResultStat {
  label: string;
  value: React.ReactNode;
}

interface GameResultPanelProps {
  /** Stable key the board is filtered by — one board per game. */
  gameId: string;
  gameTitle: string;
  score: number;
  /** False shows a gentler headline; the score is still recorded either way. */
  won?: boolean;
  /** Overrides the default "Victory!" / "Round Over" headline. */
  headline?: string;
  subline?: React.ReactNode;
  /** Secondary numbers shown beside the score (streak, stage, errors…). */
  stats?: ResultStat[];
  onPlayAgain: () => void;
  onBack: () => void;
  playAgainLabel?: string;
  /**
   * Drops the panel's own backdrop so whatever the game is still drawing shows
   * through — Yudhishthira's closing film keeps playing behind the board.
   */
  overlay?: boolean;
  /** Anything a single game wants below the buttons — a QR code, a hint, a CTA. */
  children?: React.ReactNode;
}

const COUNT_UP_MS = 1000;
const BOARD_DELAY_MS = 850;
const CONFETTI = ['🎉', '🎊', '✨', '🌟', '🪷', '🦚', '💫'];

/** Eases a number from 0 to `target`, so the reveal lands rather than snaps. */
const useCountUp = (target: number, active: boolean): number => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (target <= 0) {
      setValue(0);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active]);

  return value;
};

const GameResultPanel: React.FC<GameResultPanelProps> = ({
  gameId,
  gameTitle,
  score,
  won = true,
  headline,
  subline,
  stats = [],
  onPlayAgain,
  onBack,
  playAgainLabel = 'Play Again',
  overlay = false,
  children,
}) => {
  const [player, setPlayer] = useState<Player | null>(() => getCurrentPlayer());
  const [saving, setSaving] = useState(false);

  const [entries, setEntries] = useState<ScoreEntry[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [rank, setRank] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const meRowRef = useRef<HTMLLIElement>(null);
  const submittedRef = useRef(false);

  const displayScore = useCountUp(score, true);

  const record = useCallback(
    async (who: Player) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSaving(true);

      try {
        const result = await submitScore(gameId, who, score);
        setEntries(result.entries);
        setMeId(result.meId);
        setRank(result.rank);
        setIsNewBest(result.isNewBest);
        setBoardOpen(true);
      } catch (error) {
        console.error('Could not save score locally:', error);
        setSaveFailed(true);
        submittedRef.current = false;
      } finally {
        setSaving(false);
      }
    },
    [gameId, score]
  );

  // Known player: record straight away, and let the score land before the board
  // slides over it.
  useEffect(() => {
    if (!player) return;
    const t = setTimeout(() => record(player), BOARD_DELAY_MS);
    return () => clearTimeout(t);
  }, [player, record]);

  // Nudge the player's own row into view once the board is populated.
  useEffect(() => {
    if (!boardOpen || !meId) return;
    // 'nearest' rather than 'center': if the row is already on screen this does
    // nothing, instead of scrolling the list and clipping rows at both edges.
    const t = setTimeout(
      () => meRowRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
      700
    );
    return () => clearTimeout(t);
  }, [boardOpen, meId]);

  const celebrate = won || isNewBest;
  const title = headline ?? (won ? 'Victory!' : 'Round Over');

  /*
   * Portalled to <body> on purpose. Several games wrap their screens in a
   * `.wrapper * { margin: 0; padding: 0 }` reset (ArrangeGame.css,
   * KrishnaWheelGame.css). That selector ties on specificity with this panel's
   * own classes but loses nothing to source order, so rendering inside a game
   * silently flattened every padding here. Escaping the subtree fixes it for
   * every game at once — and keeps future game CSS from reaching in.
   */
  return createPortal(
    <div
      className={`gr-root${overlay ? ' gr-root-overlay' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${gameTitle} result`}
    >
      {celebrate && (
        <div className="gr-confetti" aria-hidden="true">
          {/*
            Bits are placed in two outer bands, never down the middle: they sit
            behind the panes, but the cards are translucent, so anything falling
            through the centre muddies the score and the buttons. The bands
            themselves are CSS variables because their useful width differs by
            layout — beside a side leaderboard vs. above a bottom sheet.
          */}
          {Array.from({ length: 22 }, (_, i) => (
            <span
              key={i}
              className={`gr-confetti-bit ${i % 2 === 0 ? 'gr-bit-l' : 'gr-bit-r'}`}
              style={
                {
                  '--p': Math.random().toFixed(3),
                  animationDelay: `${(Math.random() * 1.8).toFixed(2)}s`,
                  animationDuration: `${(2.6 + Math.random() * 2).toFixed(2)}s`,
                  fontSize: `${(1.1 + Math.random()).toFixed(2)}rem`,
                } as React.CSSProperties
              }
            >
              {CONFETTI[i % CONFETTI.length]}
            </span>
          ))}
        </div>
      )}

      {/* ---------------- Left: the score reveal ---------------- */}
      <section className={`gr-stage${boardOpen ? ' gr-stage-shrunk' : ''}`}>
        <div className="gr-stage-inner">
          <p className="gr-game-label">{gameTitle}</p>
          <h1 className={`gr-headline${won ? '' : ' gr-headline-soft'}`}>{title}</h1>
          {subline && <p className="gr-subline">{subline}</p>}

          <div className="gr-score-card">
            <span className="gr-score-label">Your Score</span>
            <div className="gr-score-value" aria-live="polite">
              {displayScore.toLocaleString('en-IN')}
            </div>
            <span className="gr-score-unit">points</span>
          </div>

          {/* Badges sit below the card — inside it they outgrew its width. */}
          {(isNewBest || rank > 0) && (
            <div className="gr-badges">
              {isNewBest && <span className="gr-badge gr-badge-best">★ New Personal Best</span>}
              {rank > 0 && (
                <span className={`gr-badge gr-badge-rank${rank <= 3 ? ' gr-badge-podium' : ''}`}>
                  {rank === 1 ? '🏆 Top of the board' : `Rank #${rank} of ${entries.length}`}
                </span>
              )}
            </div>
          )}

          {/* Held back until we know who played: with the details form open the
              column overflows the viewport and clips the submit button. They
              appear with the leaderboard a moment later. */}
          {stats.length > 0 && player && (
            <div className="gr-stats">
              {stats.map((stat) => (
                <div className="gr-stat" key={stat.label}>
                  <span className="gr-stat-value">{stat.value}</span>
                  <span className="gr-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          {!player ? (
            <PlayerForm
              variant="inline"
              greeting="🏆"
              title="Add your score to the board"
              submitLabel="Show Leaderboard"
              onSubmit={setPlayer}
            />
          ) : (
            <>
              <div className="gr-actions">
                <button type="button" className="gr-btn gr-btn-primary" onClick={onPlayAgain}>
                  ↻ {playAgainLabel}
                </button>
                <button type="button" className="gr-btn gr-btn-ghost" onClick={onBack}>
                  Home
                </button>
              </div>
              <p className="gr-playing-as">
                Playing as <strong>{displayName(player.name)}</strong>
                <button
                  type="button"
                  className="gr-swap"
                  onClick={() => {
                    submittedRef.current = false;
                    setPlayer(null);
                    setBoardOpen(false);
                    setMeId(null);
                    setRank(0);
                  }}
                >
                  Not you?
                </button>
              </p>
            </>
          )}

          {saveFailed && (
            <p className="gr-form-error">
              Couldn't save to this browser's storage — your score isn't on the board.
            </p>
          )}

          {children && <div className="gr-extra">{children}</div>}
        </div>
      </section>

      {/* ---------------- Right: the leaderboard ---------------- */}
      <aside className={`gr-board${boardOpen ? ' gr-board-open' : ''}`} aria-hidden={!boardOpen}>
        <header className="gr-board-head">
          <h2>Leaderboard</h2>
          <p>{gameTitle}</p>
        </header>

        <div className="gr-board-cols">
          <span>Player</span>
          <span>Score</span>
        </div>

        <ol className="gr-board-list">
          {saving && entries.length === 0 && <li className="gr-board-empty">Saving your score…</li>}
          {!saving && entries.length === 0 && (
            <li className="gr-board-empty">No scores yet — you're the first!</li>
          )}

          {entries.map((entry, i) => {
            const isMe = entry.id === meId;
            return (
              <li
                key={entry.id}
                ref={isMe ? meRowRef : undefined}
                className={`gr-row${isMe ? ' gr-row-me' : ''}${i < 3 ? ' gr-row-podium' : ''}`}
                style={{ animationDelay: `${Math.min(i, 12) * 55}ms` }}
              >
                <span className="gr-rank">{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
                <span className="gr-name">
                  {displayName(entry.name)}
                  {isMe && <em className="gr-you">you</em>}
                </span>
                <span className="gr-score">{entry.best.toLocaleString('en-IN')}</span>
              </li>
            );
          })}
        </ol>

        <footer className="gr-board-foot">🔒 Stored only on this device</footer>
      </aside>
    </div>,
    document.body
  );
};

export default GameResultPanel;
