import React, { useState, useEffect, useRef } from 'react';
import Muuri from 'muuri';
import './ArrangeGame.css';

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
type GameState = 'playing' | 'victory-celebration' | 'lost';

interface LilaStory {
  id: string;
  image: string;
  title: string;
  order: number;
}

// Base story data - all available stories
const storyData: Record<string, Omit<LilaStory, 'order'>> = {
  birth: { id: 'birth', image: '/krishna_lila/krishna_birth.png', title: 'Krishna\'s Birth' },
  vasudeva: { id: 'vasudeva', image: '/krishna_lila/vasude_carries_krishna.png', title: 'Vasudeva Carries Krishna' },
  damodar: { id: 'damodar', image: '/krishna_lila/damodar_lila.jpg', title: 'Damodar Lila' },
  brahma: { id: 'brahma', image: '/krishna_lila/krishna_humbles_bramha.png', title: 'Krishna Humbles Brahma' },
  kalia: { id: 'kalia', image: '/krishna_lila/krishna_kills_kalia.png', title: 'Krishna Defeats Kaliya' },
  govardhan: { id: 'govardhan', image: '/krishna_lila/krishna_lifts_govardhan.png', title: 'Lifting Govardhan Hill' },
  leaves: { id: 'leaves', image: '/krishna_lila/krishna_leaves_vrindavan.png', title: 'Leaving Vrindavan' },
  kamsa: { id: 'kamsa', image: '/krishna_lila/krishna_kills_kamsa.png', title: 'Defeating Kamsa' },
  gurukul: { id: 'gurukul', image: '/krishna_lila/krishna_goes_to_gurukul.png', title: 'Going to Gurukul' },
  gita: { id: 'gita', image: '/krishna_lila/krishna_speaks_gita.png', title: 'Krishna Speaks Gita' },
  sudama: { id: 'sudama', image: '/krishna_lila/krishna_meets_sudama.png', title: 'Krishna Meets Sudama' },
  dwarka: { id: 'dwarka', image: '/krishna_lila/krishna_shifts_dwarka.png', title: 'Krishna Shifts to Dwarka' }
};

// Story sequences - just the order configurations
const storySequences: string[][] = [
  ['birth', 'vasudeva', 'damodar', 'brahma', 'kalia', 'govardhan', 'leaves', 'kamsa', 'gurukul'],
  ['birth', 'vasudeva', 'damodar', 'kalia', 'govardhan', 'kamsa', 'gita', 'sudama', 'dwarka'],
  ['birth', 'damodar', 'brahma', 'govardhan', 'leaves', 'gurukul', 'kamsa', 'gita', 'dwarka']
];

// Generate story set from sequence
const createStorySet = (sequence: string[]): LilaStory[] =>
  sequence.map((id, index) => ({ ...storyData[id], order: index + 1 }));

interface ArrangeGameProps {
  onBack?: () => void;
}

const ArrangeGame: React.FC<ArrangeGameProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>('playing');
  const [shuffledEvents, setShuffledEvents] = useState<LilaStory[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [showError, setShowError] = useState(false);
  const [showCelebration, setCelebration] = useState(false);
  const gameGridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const muuriGridRef = useRef<Muuri | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const celebrationAudioRef = useRef<HTMLAudioElement>(null);

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
    return items.map(item => {
      const eventId = item.getElement()?.getAttribute('data-id') || '';
      return shuffledEvents.find(event => event.id === eventId)!;
    }).filter(Boolean);
  }, [shuffledEvents]);

  // Check if order is correct
  const checkWinCondition = React.useCallback((events: LilaStory[]) => {
    const isCorrect = events.every((event, index) => event.order === index + 1);
    if (isCorrect && gameState === 'playing') {
      // Immediately stop the timer and change game state
      setGameState('victory-celebration');
      setCelebration(true);
      
      // Play celebration sound
      if (celebrationAudioRef.current) {
        celebrationAudioRef.current.play().catch(console.error);
      }
    }
  }, [gameState]);

  // Get time limit from URL params
  const getTimeLimitFromURL = (): number => {
    const urlParams = new URLSearchParams(window.location.search);
    const timeLimit = urlParams.get('timeLimit');
    return timeLimit ? parseInt(timeLimit, 10) : 60; // Default to 60 seconds
  };

  // Get story set from URL params or random selection
  const getStorySet = (): LilaStory[] => {
    const urlParams = new URLSearchParams(window.location.search);
    const setParam = urlParams.get('set');
    const setNumber = setParam ? parseInt(setParam, 10) : 0;
    const sequenceIndex = (setNumber >= 1 && setNumber <= 3) ? setNumber - 1 : Math.floor(Math.random() * storySequences.length);
    return createStorySet(storySequences[sequenceIndex]);
  };

  // Initialize game on component mount
  useEffect(() => {
    setShuffledEvents(shuffleArray(getStorySet()));
    setTimeLeft(getTimeLimitFromURL());
  }, []);

  // Initialize Muuri grid
  useEffect(() => {
    if (gameGridRef.current && shuffledEvents.length > 0) {
      // Destroy existing grid if it exists
      if (muuriGridRef.current) {
        muuriGridRef.current.destroy();
      }

      // Create new Muuri grid
      muuriGridRef.current = new Muuri(gameGridRef.current, {
        items: '.muuri-item',
        dragEnabled: true,
        dragSortHeuristics: { sortInterval: 10, minDragDistance: 10, minBounceBackAngle: 1 },
        dragContainer: gameGridRef.current,
        dragPlaceholder: {
          enabled: true,
          createElement: () => {
            const placeholder = document.createElement('div');
            placeholder.className = 'muuri-item-placeholder';
            placeholder.innerHTML = '<div class="muuri-item-placeholder-content"><div class="placeholder-shadow">Drop here</div></div>';
            return placeholder;
          },
          onCreate: (item: { getWidth(): number; getHeight(): number }, element: HTMLElement) => {
            element.style.width = item.getWidth() + 'px';
            element.style.height = item.getHeight() + 'px';
          },
          onRemove: (_: any, element: HTMLElement) => element.remove()
        },
        dragRelease: { duration: 400, easing: 'ease-out', useDragContainer: true },
        layoutOnResize: true,
        layout: { fillGaps: true, rounding: true }
      });

      // Listen for drag end events
      muuriGridRef.current.on('dragEnd', () => {
        setTimeout(() => {
          const currentOrder = getCurrentOrder();
          checkWinCondition(currentOrder);
        }, 100);
      });

      // Initial layout
      muuriGridRef.current.refreshItems().layout();
    }

    return () => {
      if (muuriGridRef.current) {
        muuriGridRef.current.destroy();
        muuriGridRef.current = null;
      }
    };
  }, [checkWinCondition, getCurrentOrder, shuffledEvents]);

  // Reset/start game - consolidated function
  const resetGame = () => {
    if (muuriGridRef.current) {
      muuriGridRef.current.destroy();
      muuriGridRef.current = null;
    }
    setShuffledEvents(shuffleArray(getStorySet()));
    setTimeLeft(getTimeLimitFromURL());
    setGameState('playing');
    setShowError(false);
    setCelebration(false);
  };

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('lost');
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState, timeLeft]);

  // Audio control effect - play ticking sound from 1-4 seconds in loop
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;
      
      if (gameState === 'playing' && timeLeft > 0) {
        // Set up the time range loop (1-4 seconds)
        const handleTimeUpdate = () => {
          if (audio.currentTime >= 4) {
            audio.currentTime = 1; // Loop back to 1 second
          }
        };
        
        // Start playing from 1 second
        audio.currentTime = 1;
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.play().catch(console.error);
        
        // Cleanup function to remove event listener
        return () => {
          audio.removeEventListener('timeupdate', handleTimeUpdate);
        };
      } else {
        audio.pause();
        audio.currentTime = 1; // Reset to start position
      }
    }
  }, [gameState, timeLeft]);

  // Celebration audio effect - play when victory state is reached
  useEffect(() => {
    if (celebrationAudioRef.current && gameState === 'victory-celebration') {
      celebrationAudioRef.current.play().catch(console.error);
    }
  }, [gameState]);

  // Manual validate order
  const validateOrder = () => {
    const currentOrder = getCurrentOrder();
    const isCorrect = currentOrder.every((event, index) => event.order === index + 1);

    if (isCorrect) {
      // Immediately stop the timer and change game state
      setGameState('victory-celebration');
      setCelebration(true);
      
      // Play celebration sound
      if (celebrationAudioRef.current) {
        celebrationAudioRef.current.play().catch(console.error);
      }
    } else {
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  };

  // Celebration component - optimized
  const CelebrationAnimation = () => {
    const emojis = ['🎉', '🎊', '🥳', '🎈', '🎆', '✨', '🌟', '💫', '🎁', '🏆'];
    const createEmoji = (i: number, type: 'popper' | 'wave') => (
      <div
        key={`${type}-${i}`}
        className={`emoji celebration-${type}`}
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * (type === 'popper' ? 1 : 1.5) + (type === 'wave' ? 1 : 0)}s`,
          animationDuration: `${(type === 'popper' ? 3 : 2.5) + Math.random() * (type === 'popper' ? 2 : 1.5)}s`,
          fontSize: `${(type === 'popper' ? 1.5 : 1.2) + Math.random() * (type === 'popper' ? 1 : 0.8)}rem`
        }}
      >
        {emojis[Math.floor(Math.random() * emojis.length)]}
      </div>
    );

    return (
      <div className="celebration">
        {Array.from({ length: 35 }, (_, i) => createEmoji(i, 'popper'))}
        {Array.from({ length: 20 }, (_, i) => createEmoji(i, 'wave'))}
      </div>
    );
  };

  return (
    <div className="arrange-game-app">
      {/* Audio elements - always available */}
      <audio ref={audioRef}>
        <source src="/ticking_effect.mp3" type="audio/mpeg" />
      </audio>
      <audio ref={celebrationAudioRef}>
        <source src="/celebration_effect.mp3" type="audio/mpeg" />
      </audio>

      {/* Game Screen */}
      {gameState === 'playing' && (
        <div className="game-screen">
          <div className="arrange-game-header">
            <button className="back-button" onClick={onBack || resetGame}>
              {onBack ? '← Back' : '🔄 New Game'}
            </button>
            <div className="game-title-section">
              <h1>Krishna Lila Stories</h1>
              <p>Arrange the divine pastimes in chronological order</p>
            </div>
            <div className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}>
              {timeLeft}s
            </div>
          </div>

          <div className="instructions glass">
            <p>Drag and drop the story tiles to arrange them in the correct chronological order.</p>
          </div>

          <div className="game-container">
            <div
              ref={gameGridRef}
              className={`muuri-grid glass ${showError ? 'error vibrating' : ''}`}
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
                <div
                  key={story.id}
                  className="muuri-item"
                  data-id={story.id}
                >
                  <div className="muuri-item-content">
                    <div className="tile-image">
                      <img
                        src={story.image}
                        alt={story.title}
                        className="story-image"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23FFD700"/><text x="50" y="50" text-anchor="middle" dy=".3em" font-size="40">🕉️</text></svg>';
                        }}
                      />
                    </div>
                    <div className="tile-title">
                      {story.title}
                    </div>
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

      {/* Victory Screen */}
      {gameState === 'victory-celebration' && (
        <div className="victory-screen">
          <div className="victory-content glass">
            <h1 className="victory-title">🎉 Victory! 🎉</h1>
            <p className="victory-message">
              Congratulations! You've successfully arranged the Krishna Lila events in the correct chronological order!
            </p>
            <button className="play-again-button" onClick={resetGame}>
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Lost Screen */}
      {gameState === 'lost' && (
        <div className="lost-screen">
          <div className="lost-content glass">
            <h1 className="lost-title">⏰ Time's Up!</h1>
            <p className="lost-message">
              Don't worry! The Krishna Lila stories are complex and take time to master. Try again!
            </p>
            <button className="play-again-button" onClick={resetGame}>
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Celebration Animation */}
      {showCelebration && <CelebrationAnimation />}
    </div>
  );
};

export default ArrangeGame;