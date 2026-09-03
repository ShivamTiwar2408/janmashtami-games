import React, { useState, useEffect, useRef } from "react";
import Muuri from "muuri";
import "./ArrangeGame.css";
import { GameIntro, GameResultPanel } from "../../leaderboard";
/**
 * DEVELOPER SIZING CONTROL
 * ========================
 * To change the size of tiles and grid, modify the --tile-size variable in App.css:
 *
 * Examples:
 * --tile-size: 120px;  → Grid becomes ~390px × 390px (3×3)
 * --tile-size: 150px;  → Grid becomes ~480px × 480px (3×3)
 * --tile-size: 200px;  → Grid becomes ~630px × 630px (3×3)
 * --tile-size: 250px;  → Grid becomes ~780px × 780px (3×3)
 *
 * All other dimensions (padding, margins, font sizes, etc.) scale proportionally.
 * Mobile breakpoint automatically uses 2×4 grid with scaled-down tiles.
 */

// Types
type GameState = "playing" | "victory-celebration" | "lost";

interface LilaStory {
  id: string;
  image: string;
  title: string;
  order: number;
}

// Base story data - all available stories
const storyData: Record<string, Omit<LilaStory, "order">> = {
  birth: {
    id: "birth",
    image: "/krishna_lila/krishna_birth.png",
    title: "Krishna's Birth",
  },
  vasudeva: {
    id: "vasudeva",
    image: "/krishna_lila/vasude_carries_krishna.png",
    title: "Vasudeva Carries Krishna",
  },
  damodar: {
    id: "damodar",
    image: "/krishna_lila/damodar_lila.jpg",
    title: "Damodar Lila",
  },
  brahma: {
    id: "brahma",
    image: "/krishna_lila/krishna_humbles_bramha.png",
    title: "Krishna Humbles Brahma",
  },
  kalia: {
    id: "kalia",
    image: "/krishna_lila/krishna_kills_kalia.png",
    title: "Krishna Defeats Kaliya",
  },
  govardhan: {
    id: "govardhan",
    image: "/krishna_lila/krishna_lifts_govardhan.png",
    title: "Lifting Govardhan Hill",
  },
  leaves: {
    id: "leaves",
    image: "/krishna_lila/krishna_leaves_vrindavan.png",
    title: "Leaving Vrindavan",
  },
  kamsa: {
    id: "kamsa",
    image: "/krishna_lila/krishna_kills_kamsa.png",
    title: "Defeating Kamsa",
  },
  gurukul: {
    id: "gurukul",
    image: "/krishna_lila/krishna_goes_to_gurukul.png",
    title: "Going to Gurukul",
  },
  gita: {
    id: "gita",
    image: "/krishna_lila/krishna_speaks_gita.png",
    title: "Krishna Speaks Gita",
  },
  sudama: {
    id: "sudama",
    image: "/krishna_lila/krishna_meets_sudama.png",
    title: "Krishna Meets Sudama",
  },
  dwarka: {
    id: "dwarka",
    image: "/krishna_lila/krishna_shifts_dwarka.png",
    title: "Krishna Shifts to Dwarka",
  },
};

// Story sequences - just the order configurations
const storySequences: string[][] = [
  [
    "birth",
    "vasudeva",
    "damodar",
    "brahma",
    "kalia",
    "govardhan",
    "leaves",
    "kamsa",
    "gurukul",
  ],
  [
    "birth",
    "vasudeva",
    "damodar",
    "kalia",
    "govardhan",
    "kamsa",
    "dwarka",
    "sudama",
    "gita",
  ],
  [
    "birth",
    "damodar",
    "brahma",
    "govardhan",
    "leaves",
    "kamsa",
    "gurukul",
    "dwarka",
    "gita",
  ],
];

// Generate story set from sequence
const createStorySet = (sequence: string[]): LilaStory[] =>
  sequence.map((id, index) => ({ ...storyData[id], order: index + 1 }));

interface ArrangeGameProps {
  onBack?: () => void;
}

const ArrangeGame: React.FC<ArrangeGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>("playing");
  const [shuffledEvents, setShuffledEvents] = useState<LilaStory[]>([]);
  const [showPlayerPopup, setShowPlayerPopup] = useState(true);
  const [finalScore, setFinalScore] = useState(0);
  const [secondsUsed, setSecondsUsed] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showError, setShowError] = useState(false);
  const [showCelebration, setCelebration] = useState(false);
  const gameGridRef = useRef<HTMLDivElement>(null);
  const gameStartTimeRef = useRef<number | null>(null);
  const errorCountRef = useRef<number>(0);
  const resultSavedRef = useRef(false);
  const checkWinConditionRef = useRef<
    (events: LilaStory[]) => void | Promise<void>
  >(() => { });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const muuriGridRef = useRef<Muuri | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const celebrationAudioRef = useRef<HTMLAudioElement>(null);
  const errorAudioRef = useRef<HTMLAudioElement>(null);

  // Shuffle array utility
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get current order of items
  const getCurrentOrder = React.useCallback((): LilaStory[] => {
    if (!muuriGridRef.current) return shuffledEvents;

    const items = muuriGridRef.current.getItems();
    return items
      .map((item) => {
        const eventId = item.getElement()?.getAttribute("data-id") || "";
        return shuffledEvents.find((event) => event.id === eventId)!;
      })
      .filter(Boolean);
  }, [shuffledEvents]);

  /**
   * Works out the run's score. Recording it is the result panel's job — this
   * only has to be right, and only once per run.
   *
   * SCORE FORMULA (a finished board only; running out of time scores 0)
   *   base                 500
   *   each second left      +5
   *   each wrong validate  -25
   *   floored at 100
   */
  const finishGame = React.useCallback(
    (completedSuccessfully: boolean) => {
      if (resultSavedRef.current) return;
      resultSavedRef.current = true;

      setSecondsUsed(
        gameStartTimeRef.current
          ? Math.floor((Date.now() - gameStartTimeRef.current) / 1000)
          : 0
      );

      if (!completedSuccessfully) {
        setFinalScore(0);
        return;
      }

      const timeBonus = timeLeft * 5;
      const errorPenalty = errorCountRef.current * 25;
      setFinalScore(Math.max(100, 500 + timeBonus - errorPenalty));
    },
    [timeLeft]
  );

  // Check if order is correct
  const checkWinCondition = React.useCallback(
    async (events: LilaStory[]) => {
      const isCorrect = events.every(
        (event, index) => event.order === index + 1
      );

      if (isCorrect && gameState === "playing") {
        // Save result before changing game state
        finishGame(true);

        // Stop the timer and show victory
        setGameState("victory-celebration");
        setCelebration(true);

        // Play celebration sound
        if (celebrationAudioRef.current) {
          celebrationAudioRef.current.play().catch(console.error);
        }
      }
    },
    [gameState, finishGame]
  );

  useEffect(() => {
    checkWinConditionRef.current = checkWinCondition;
  }, [checkWinCondition]);

  // Get time limit from URL params
  const getTimeLimitFromURL = (): number => {
    const urlParams = new URLSearchParams(window.location.search);
    const timeLimit = urlParams.get("timeLimit");
    return timeLimit ? parseInt(timeLimit, 10) : 60; // Default to 60 seconds
  };

  // Get story set from URL params or random selection
  const getStorySet = (): LilaStory[] => {
    const urlParams = new URLSearchParams(window.location.search);
    const setParam = urlParams.get("set");
    const setNumber = setParam ? parseInt(setParam, 10) : 0;
    const sequenceIndex =
      setNumber >= 1 && setNumber <= 3
        ? setNumber - 1
        : Math.floor(Math.random() * storySequences.length);
    return createStorySet(storySequences[sequenceIndex]);
  };

  // Initialize Muuri grid
  useEffect(() => {
    if (gameGridRef.current && shuffledEvents.length > 0) {
      if (muuriGridRef.current) {
        muuriGridRef.current.destroy();
        muuriGridRef.current = null;
      }

      muuriGridRef.current = new Muuri(gameGridRef.current, {
        items: ".muuri-item",
        dragEnabled: true,

        dragSortHeuristics: {
          sortInterval: 10,
          minDragDistance: 10,
          minBounceBackAngle: 1,
        },

        dragContainer: gameGridRef.current,

        dragPlaceholder: {
          enabled: true,

          createElement: () => {
            const placeholder = document.createElement("div");

            placeholder.className = "muuri-item-placeholder";

            placeholder.innerHTML =
              '<div class="muuri-item-placeholder-content"><div class="placeholder-shadow">Drop here</div></div>';

            return placeholder;
          },

          onCreate: (
            item: { getWidth(): number; getHeight(): number },
            element: HTMLElement
          ) => {
            element.style.width = item.getWidth() + "px";
            element.style.height = item.getHeight() + "px";
          },

          onRemove: (_: any, element: HTMLElement) => element.remove(),
        },

        dragRelease: {
          duration: 400,
          easing: "ease-out",
          useDragContainer: true,
        },

        layoutOnResize: true,
        layout: {
          fillGaps: true,
          rounding: true,
        },
      });

      muuriGridRef.current.on("dragEnd", () => {
        setTimeout(() => {
          if (!muuriGridRef.current) return;

          const items = muuriGridRef.current.getItems();

          const currentOrder = items
            .map((item) => {
              const eventId = item.getElement()?.getAttribute("data-id") || "";

              return shuffledEvents.find((event) => event.id === eventId);
            })
            .filter(Boolean) as LilaStory[];

          checkWinConditionRef.current(currentOrder);
        }, 100);
      });

      muuriGridRef.current.refreshItems().layout();
    }

    return () => {
      if (muuriGridRef.current) {
        muuriGridRef.current.destroy();
        muuriGridRef.current = null;
      }
    };
  }, [shuffledEvents]);

  const goToUserForm = () => {
    setShowPlayerPopup(true);
    setFinalScore(0);
    setGameState("playing");
  };

  // Reset/start game - consolidated function
  const resetGame = () => {
    if (muuriGridRef.current) {
      muuriGridRef.current.destroy();
      muuriGridRef.current = null;
    }

    // Reset game data
    errorCountRef.current = 0;
    resultSavedRef.current = false;
    gameStartTimeRef.current = null;

    setShuffledEvents(shuffleArray(getStorySet()));
    setTimeLeft(getTimeLimitFromURL());
    setGameState("playing");
    setShowError(false);
    setCelebration(false);
  };

  useEffect(() => {
    if (!showPlayerPopup && gameState === "playing" && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (!showPlayerPopup && gameState === "playing" && timeLeft === 0) {
      finishGame(false);
      setGameState("lost");

      if (errorAudioRef.current) {
        errorAudioRef.current.play().catch(console.error);
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState, timeLeft, showPlayerPopup, finishGame]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    if (showPlayerPopup || gameState !== "playing" || timeLeft <= 0) {
      audio.pause();
      audio.currentTime = 1;
      return;
    }

    // Set up the time range loop (1-4 seconds)
    const handleTimeUpdate = () => {
      if (audio.currentTime >= 4) {
        audio.currentTime = 1;
      }
    };

    // Start playing from 1 second
    audio.currentTime = 1;

    audio.addEventListener("timeupdate", handleTimeUpdate);

    audio.play().catch(console.error);

    // Cleanup
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);

      audio.pause();
    };
  }, [gameState, timeLeft, showPlayerPopup]);

  useEffect(() => {
    if (!showPlayerPopup) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 1;
    }

    if (celebrationAudioRef.current) {
      celebrationAudioRef.current.pause();
      celebrationAudioRef.current.currentTime = 0;
    }

    if (errorAudioRef.current) {
      errorAudioRef.current.pause();
      errorAudioRef.current.currentTime = 0;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [showPlayerPopup]);

  // Celebration audio effect - play when victory state is reached
  useEffect(() => {
    if (celebrationAudioRef.current && gameState === "victory-celebration") {
      celebrationAudioRef.current.play().catch(console.error);
    }
  }, [gameState]);

  // Manual validate order
  const validateOrder = async () => {
    const currentOrder = getCurrentOrder();

    const isCorrect = currentOrder.every(
      (event, index) => event.order === index + 1
    );

    if (isCorrect) {
      finishGame(true);

      setGameState("victory-celebration");
      setCelebration(true);

      if (celebrationAudioRef.current) {
        celebrationAudioRef.current.play().catch(console.error);
      }
    } else {
      // Count incorrect validation
      errorCountRef.current += 1;

      console.log("Errors:", errorCountRef.current);

      setShowError(true);

      if (errorAudioRef.current) {
        errorAudioRef.current.play().catch(console.error);
      }

      setTimeout(() => setShowError(false), 2000);
    }
  };

  // Celebration component - optimized
  const CelebrationAnimation = () => {
    const emojis = ["🎉", "🎊", "🥳", "🎈", "🎆", "✨", "🌟", "💫", "🎁", "🏆"];
    const createEmoji = (i: number, type: "popper" | "wave") => (
      <div
        key={`${type}-${i}`}
        className={`emoji celebration-${type}`}
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${
            Math.random() * (type === "popper" ? 1 : 1.5) +
            (type === "wave" ? 1 : 0)
            }s`,
          animationDuration: `${
            (type === "popper" ? 3 : 2.5) +
            Math.random() * (type === "popper" ? 2 : 1.5)
            }s`,
          fontSize: `${
            (type === "popper" ? 1.5 : 1.2) +
            Math.random() * (type === "popper" ? 1 : 0.8)
            }rem`,
        }}
      >
        {emojis[Math.floor(Math.random() * emojis.length)]}
      </div>
    );

    return (
      <div className="celebration">
        {Array.from({ length: 35 }, (_, i) => createEmoji(i, "popper"))}
        {Array.from({ length: 20 }, (_, i) => createEmoji(i, "wave"))}
      </div>
    );
  };

  /** PlayerForm has already validated and remembered the player by this point. */
  const beginRun = () => {
    setShuffledEvents(shuffleArray(getStorySet()));
    setTimeLeft(getTimeLimitFromURL());
    gameStartTimeRef.current = Date.now();

    errorCountRef.current = 0;
    resultSavedRef.current = false;

    setShowPlayerPopup(false);
    setGameState("playing");
  };

  return (
    <div className="arrange-game-app">
      {showPlayerPopup && (
        <GameIntro
          gameId="arrange"
          emoji="🪈"
          title="Krishna Lila Stories"
          tagline="Put the divine pastimes back in the order they happened — before the clock runs out."
          hints={[
            "🖼️ Nine scenes from Krishna's life, shuffled",
            '🔀 Drag the tiles into chronological order',
            '✅ Hit Validate Order when you think it is right',
            '⏱ Finish with time to spare and the score goes up',
          ]}
          ctaLabel="Start Playing"
          /* Backs only — the attract screen must not leak a pastime or the
             order they belong in. */
          reel={
            <div className="ag-reel" aria-hidden="true">
              {/* Scrambled numbers on the backs: it reads as "these are out of
                  order, fix them" without showing a pastime or the real
                  sequence. Two pairs keep swapping places, so the board is
                  visibly solving itself just enough to invite a hand. */}
              {[
                { glyph: '🪈', slot: 4, swap: 'a' },
                { glyph: '🦚', slot: 9, swap: '' },
                { glyph: '🪷', slot: 2, swap: 'b' },
                { glyph: '🕉️', slot: 7, swap: '' },
                /* c and d must be the two cards *in one column*, and a and b the
                   two ends of one row — a pair that isn't aligned leaves a hole
                   in the grid and stacks two cards in one slot. */
                { glyph: '🧈', slot: 1, swap: 'c' },
                { glyph: '🐄', slot: 5, swap: '' },
                { glyph: '🪔', slot: 8, swap: '' },
                { glyph: '🌼', slot: 3, swap: 'd' },
                { glyph: '🏹', slot: 6, swap: '' },
              ].map((card, i) => (
                <div
                  className={`ag-card${card.swap ? ` ag-swap-${card.swap}` : ''}`}
                  key={i}
                  /* A swapping card's delays are set in CSS: both halves of a
                     pair need the *same* swap delay to move as one, and an
                     inline delay would override both animations at once. */
                  style={card.swap ? undefined : { animationDelay: `-${(i * 0.6).toFixed(2)}s` }}
                >
                  <span className="ag-card-slot">{card.slot}</span>
                  <span className="ag-card-glyph">{card.glyph}</span>
                </div>
              ))}
            </div>
          }
          onStart={beginRun}
          onBack={onBack ?? resetGame}
        />
      )}
      {/* Audio elements - always available */}
      <audio ref={audioRef}>
        <source src="/ticking_effect.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={celebrationAudioRef}>
        <source src="/celebration_effect.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={errorAudioRef}>
        <source src="/error.mp3" type="audio/mpeg" />
      </audio>

      {/* Game Screen */}
      {gameState === "playing" && !showPlayerPopup && (
        <div className="game-screen">
          <div className="arrange-game-header">
            <button className="back-button" onClick={onBack || resetGame}>
              {onBack ? "← Back" : "🔄 New Game"}
            </button>
            <div className="game-title-section">
              <h1>Krishna Lila Stories</h1>
              <p>Drag the tiles into the order the pastimes happened</p>
            </div>
            <div className={`timer ${timeLeft <= 10 ? "warning" : ""}`}>
              {timeLeft}s
            </div>
          </div>

          <div className="game-container">
            <div
              ref={gameGridRef}
              className={`muuri-grid glass ${
                showError ? "error vibrating" : ""
                }`}
            >
              {/* Position indicators - fixed grid positions */}
              {Array.from({ length: 9 }, (_, index) => (
                <div
                  key={`position-${index}`}
                  className="position-indicator"
                  data-position={index + 1}
                >
                  {index + 1}
                </div>
              ))}

              {shuffledEvents.map((story) => (
                <div key={story.id} className="muuri-item" data-id={story.id}>
                  <div className="muuri-item-content">
                    <div className="tile-image">
                      <img
                        src={story.image}
                        alt={story.title}
                        className="story-image"
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23FFD700"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-size="40">🕉️</text></svg>';
                        }}
                      />
                    </div>
                    <div className="tile-title">{story.title}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="validate-button" onClick={validateOrder}>
              Validate Order
            </button>
          </div>
        </div>
      )}

      {/* Result: score reveal on the left, leaderboard sliding in on the right */}
      {(gameState === "victory-celebration" || gameState === "lost") && (
        <GameResultPanel
          gameId="arrange"
          gameTitle="Krishna Lila Stories"
          headline={
            gameState === "victory-celebration" ? "Victory!" : "Time's Up!"
          }
          subline={
            gameState === "victory-celebration"
              ? "You placed every divine pastime in its true chronological order."
              : "The Krishna Lila stories are complex and take time to master. Try again!"
          }
          score={finalScore}
          won={gameState === "victory-celebration"}
          stats={[
            { label: "Time Taken", value: `${secondsUsed}s` },
            { label: "Wrong Tries", value: errorCountRef.current },
          ]}
          playAgainLabel={
            gameState === "victory-celebration" ? "Play Again" : "Try Again"
          }
          onPlayAgain={resetGame}
          onBack={goToUserForm}
        />
      )}

      {/* Celebration Animation */}
      {showCelebration && <CelebrationAnimation />}
    </div>
  );
};

export default ArrangeGame;
