import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './GameIntro.css';
import PlayerForm from './PlayerForm';
import { Player, ScoreEntry, displayName, getLeaderboard } from './scoreStore';

/* Enough of them, at enough sizes, that an idle screen reads as a screensaver
   rather than an empty gradient. */
const DRIFT = ['🪈', '🦚', '🪷', '✨', '🌟', '🧈', '🎉', '💫', '🪷', '🦚', '✨', '🌟', '💫', '🎊', '🪈', '🌼'];
const HINT_MS = 3200;

interface GameIntroProps {
  /** Same id the result panel records under — used to tempt with the top scores. */
  gameId: string;
  emoji: string;
  title: string;
  tagline: React.ReactNode;
  /** Cycled one at a time, screensaver style. Also listed under the CTA. */
  hints?: React.ReactNode[];
  ctaLabel?: string;
  /** Called once the player has given their details. */
  onStart: () => void;
  onBack: () => void;
  /**
   * Transparent backdrop, for a game that already renders its own live demo
   * behind this screen (Dahi Handi's 3D scene, Krishna's turning wheel,
   * Yudhishthira's looping video).
   */
  overlay?: boolean;
  /**
   * Replaces the default emoji showreel for a game that can tease itself
   * without giving anything away (Arrange's face-down tiles).
   */
  reel?: React.ReactNode;
  /** Anything extra inside the bar — a QR code, a note. */
  children?: React.ReactNode;
}

/**
 * The attract screen every game opens with: it plays by itself, tempts a
 * passer-by to press one button, then takes their details before the first
 * point is scored — so every score on the board has a name on it.
 *
 * The play option is a low bar, never a centred dialog: the showreel is what
 * draws someone over, so nothing is allowed to cover it.
 *
 * Portalled to <body> for the same reason the result panel is: several games
 * wrap their screens in a `.wrapper * { padding: 0 }` reset that would
 * otherwise flatten everything in here.
 */
const GameIntro: React.FC<GameIntroProps> = ({
  gameId,
  emoji,
  title,
  tagline,
  hints = [],
  ctaLabel = 'Play Now',
  onStart,
  onBack,
  overlay = false,
  reel,
  children,
}) => {
  const [gateOpen, setGateOpen] = useState(false);
  const [hint, setHint] = useState(0);
  const [top, setTop] = useState<ScoreEntry[]>([]);
  const gateOpenRef = useRef(false);
  gateOpenRef.current = gateOpen;

  // Everyone who has ever scored, not a top-N slice: at an event the person
  // waiting to play wants to find their own name, which a podium hides.
  useEffect(() => {
    getLeaderboard(gameId)
      .then(setTop)
      .catch(() => setTop([]));
  }, [gameId]);

  useEffect(() => {
    if (hints.length < 2) return;
    const t = setInterval(() => setHint((i) => (i + 1) % hints.length), HINT_MS);
    return () => clearInterval(t);
  }, [hints.length]);

  // A kiosk is driven by whatever is nearest — a big screen's keyboard included.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (gateOpenRef.current) return;
      e.preventDefault();
      setGateOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const begin = (_player: Player) => {
    setGateOpen(false);
    onStart();
  };

  return createPortal(
    <>
      {/* Nothing covers the showreel — but a tap anywhere on it still opens the
          details form, so someone who prods the game itself gets the popup
          rather than a dead click. */}
      <div
        className={`gi-root${overlay ? ' gi-root-overlay' : ''}`}
        onClick={() => setGateOpen(true)}
      >
        <div className="gi-demo">
          <span className="gi-demo-dot" />
          Demo playing — press play to take over
        </div>

        {/* The showreel. A game that draws its own live demo behind this
            (`overlay`) gets the frame to itself. */}
        {!overlay && (
          <div className="gi-reel" aria-hidden="true">
            <div className="gi-drift">
              {DRIFT.map((glyph, i) => (
                <span
                  key={i}
                  className="gi-drift-bit"
                  style={{
                    left: `${2 + i * 6.2}%`,
                    fontSize: `${(1.6 + (i % 4) * 0.9).toFixed(2)}rem`,
                    // Negative: every glyph is already mid-flight on the first
                    // frame, so the screen is never half empty while it fills.
                    animationDelay: `-${(i * 1.35).toFixed(2)}s`,
                    animationDuration: `${(10 + (i % 5) * 2.5).toFixed(2)}s`,
                  }}
                >
                  {glyph}
                </span>
              ))}
            </div>
            {reel ?? (
              <div className="gi-hero">
                <span className="gi-hero-emoji">{emoji}</span>
                <span className="gi-hero-ring" />
              </div>
            )}
            <p className="gi-tagline">{tagline}</p>
          </div>
        )}

        <button
          type="button"
          className="gi-back"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
        >
          ← Back
        </button>

        {/* One low bar, so the frame above it stays watchable. */}
        <div className="gi-bar">
          <div className="gi-bar-text">
            <h1 className="gi-bar-title">{title}</h1>
            {hints.length > 0 ? (
              <p className="gi-hint" key={hint} aria-live="polite">
                {hints[hint]}
              </p>
            ) : (
              <p className="gi-hint">{tagline}</p>
            )}
            {children}
          </div>

          <div className="gi-bar-cta">
            <button type="button" className="gi-cta" onClick={() => setGateOpen(true)}>
              {ctaLabel} <span className="gi-cta-arrow">→</span>
            </button>
            {top.length > 0 && (
              <div className="gi-top">
                <p className="gi-top-label">
                  Leaderboard · {top.length} player{top.length === 1 ? '' : 's'}
                </p>
                {/* Capped in height and scrollable, so a hundred players don't
                    grow the bar over the showreel it sits on. */}
                <ol className="gi-top-list">
                  {top.map((entry, i) => (
                    <li className="gi-top-entry" key={entry.id}>
                      <span className="gi-top-rank">
                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                      </span>
                      <span className="gi-top-name">{displayName(entry.name)}</span>
                      <b>{entry.best.toLocaleString('en-IN')}</b>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      </div>

      {gateOpen && (
        <PlayerForm
          variant="modal"
          greeting={emoji}
          title={title}
          subtitle={tagline}
          submitLabel={ctaLabel}
          onSubmit={begin}
          onCancel={() => setGateOpen(false)}
        />
      )}
    </>,
    document.body
  );
};

export default GameIntro;
