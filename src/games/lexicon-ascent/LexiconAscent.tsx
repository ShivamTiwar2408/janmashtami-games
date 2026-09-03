import React, { useState, useEffect, useRef, useCallback } from 'react';
import Muuri from 'muuri';
import './LexiconAscent.css';
import { GameIntro, GameResultPanel } from '../../leaderboard';

interface LexiconAscentProps {
  onBack: () => void;
}

interface Word {
  word: string;
  meaning: string;
  intensity: number;
}

interface WordSet {
  category: string;
  words: Word[];
}

type GameState = 'start' | 'playing' | 'success' | 'failed' | 'victory';

// Word pools organized by difficulty level
const wordPools: Record<number, WordSet[]> = {
  1: [
    {
      category: 'Hunger',
      words: [
        { word: 'Peckish', meaning: 'Slightly hungry, wanting a small snack', intensity: 1 },
        { word: 'Hungry', meaning: 'Feeling the need to eat', intensity: 2 },
        { word: 'Famished', meaning: 'Extremely hungry, very eager to eat', intensity: 3 },
        { word: 'Ravenous', meaning: 'Desperately hungry, could eat anything', intensity: 4 },
      ]
    },
    {
      category: 'Happiness',
      words: [
        { word: 'Content', meaning: 'Satisfied and at ease', intensity: 1 },
        { word: 'Happy', meaning: 'Feeling pleasure and enjoyment', intensity: 2 },
        { word: 'Joyful', meaning: 'Full of happiness and delight', intensity: 3 },
        { word: 'Ecstatic', meaning: 'Overwhelmed with extreme happiness', intensity: 4 },
      ]
    },
    {
      category: 'Anger',
      words: [
        { word: 'Annoyed', meaning: 'Slightly irritated or bothered', intensity: 1 },
        { word: 'Angry', meaning: 'Feeling strong displeasure', intensity: 2 },
        { word: 'Furious', meaning: 'Extremely angry, full of rage', intensity: 3 },
        { word: 'Livid', meaning: 'Intensely angry, beside oneself', intensity: 4 },
      ]
    },
    {
      category: 'Size',
      words: [
        { word: 'Small', meaning: 'Limited in size, not large', intensity: 1 },
        { word: 'Medium', meaning: 'Average or moderate in size', intensity: 2 },
        { word: 'Large', meaning: 'Of considerable size', intensity: 3 },
        { word: 'Enormous', meaning: 'Extremely large, immense', intensity: 4 },
      ]
    },
  ],
  2: [
    {
      category: 'Fear',
      words: [
        { word: 'Uneasy', meaning: 'Slightly anxious or uncomfortable', intensity: 1 },
        { word: 'Anxious', meaning: 'Worried and nervous', intensity: 2 },
        { word: 'Frightened', meaning: 'Filled with fear', intensity: 3 },
        { word: 'Petrified', meaning: 'Paralyzed with extreme fear', intensity: 4 },
      ]
    },
    {
      category: 'Tiredness',
      words: [
        { word: 'Drowsy', meaning: 'Feeling sleepy, half-awake', intensity: 1 },
        { word: 'Tired', meaning: 'In need of rest or sleep', intensity: 2 },
        { word: 'Exhausted', meaning: 'Completely drained of energy', intensity: 3 },
        { word: 'Shattered', meaning: 'Utterly broken with fatigue', intensity: 4 },
      ]
    },
    {
      category: 'Cold',
      words: [
        { word: 'Cool', meaning: 'Moderately cold, refreshing', intensity: 1 },
        { word: 'Chilly', meaning: 'Uncomfortably cold', intensity: 2 },
        { word: 'Frigid', meaning: 'Extremely cold, icy', intensity: 3 },
        { word: 'Glacial', meaning: 'Intensely cold like ice', intensity: 4 },
      ]
    },
    {
      category: 'Sadness',
      words: [
        { word: 'Glum', meaning: 'Slightly sad, low spirits', intensity: 1 },
        { word: 'Melancholy', meaning: 'Deep, thoughtful sadness', intensity: 2 },
        { word: 'Despondent', meaning: 'In low spirits from loss of hope', intensity: 3 },
        { word: 'Devastated', meaning: 'Completely overwhelmed by grief', intensity: 4 },
      ]
    },
  ],
  3: [
    {
      category: 'Confusion',
      words: [
        { word: 'Puzzled', meaning: 'Unable to understand something', intensity: 1 },
        { word: 'Perplexed', meaning: 'Completely baffled', intensity: 2 },
        { word: 'Bewildered', meaning: 'Utterly confused and disoriented', intensity: 3 },
        { word: 'Flummoxed', meaning: 'Totally bewildered, at a complete loss', intensity: 4 },
      ]
    },
    {
      category: 'Dislike',
      words: [
        { word: 'Averse', meaning: 'Having a strong dislike', intensity: 1 },
        { word: 'Repelled', meaning: 'Driven away by disgust', intensity: 2 },
        { word: 'Revolted', meaning: 'Feeling intense disgust', intensity: 3 },
        { word: 'Abhorrent', meaning: 'Inspiring utter loathing', intensity: 4 },
      ]
    },
    {
      category: 'Certainty',
      words: [
        { word: 'Dubious', meaning: 'Hesitating or doubting', intensity: 1 },
        { word: 'Uncertain', meaning: 'Not able to be relied on', intensity: 2 },
        { word: 'Confident', meaning: 'Feeling sure about something', intensity: 3 },
        { word: 'Adamant', meaning: 'Refusing to change one\'s mind', intensity: 4 },
      ]
    },
    {
      category: 'Speed',
      words: [
        { word: 'Leisurely', meaning: 'Acting without haste', intensity: 1 },
        { word: 'Brisk', meaning: 'Active and energetic', intensity: 2 },
        { word: 'Swift', meaning: 'Moving very fast', intensity: 3 },
        { word: 'Meteoric', meaning: 'Extremely rapid, like a meteor', intensity: 4 },
      ]
    },
  ],
  4: [
    {
      category: 'Praise',
      words: [
        { word: 'Commend', meaning: 'To praise formally or officially', intensity: 1 },
        { word: 'Extol', meaning: 'To praise enthusiastically', intensity: 2 },
        { word: 'Venerate', meaning: 'To regard with great respect', intensity: 3 },
        { word: 'Apotheosis', meaning: 'The highest point of glory or power', intensity: 4 },
      ]
    },
    {
      category: 'Secrecy',
      words: [
        { word: 'Discreet', meaning: 'Careful to avoid attention', intensity: 1 },
        { word: 'Covert', meaning: 'Not openly acknowledged', intensity: 2 },
        { word: 'Clandestine', meaning: 'Kept secret, often illicit', intensity: 3 },
        { word: 'Surreptitious', meaning: 'Kept secret by stealth', intensity: 4 },
      ]
    },
    {
      category: 'Stubbornness',
      words: [
        { word: 'Resolute', meaning: 'Admirably purposeful and determined', intensity: 1 },
        { word: 'Tenacious', meaning: 'Holding firmly to something', intensity: 2 },
        { word: 'Obstinate', meaning: 'Stubbornly refusing to change', intensity: 3 },
        { word: 'Intransigent', meaning: 'Unwilling to compromise at all', intensity: 4 },
      ]
    },
    {
      category: 'Eloquence',
      words: [
        { word: 'Articulate', meaning: 'Expressing oneself clearly', intensity: 1 },
        { word: 'Eloquent', meaning: 'Fluent and persuasive in speech', intensity: 2 },
        { word: 'Mellifluous', meaning: 'Sweet-sounding, pleasant to hear', intensity: 3 },
        { word: 'Grandiloquent', meaning: 'Pompous or extravagant in speech', intensity: 4 },
      ]
    },
  ],
};

const ROUND_TIME = 30;
const TOTAL_ROUNDS = 4;

const LexiconAscent: React.FC<LexiconAscentProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [level, setLevel] = useState(1);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [currentWordSet, setCurrentWordSet] = useState<WordSet | null>(null);
  const [shuffledWords, setShuffledWords] = useState<Word[]>([]);
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [usedSets, setUsedSets] = useState<Set<string>>(new Set());
  const [showError, setShowError] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const muuriRef = useRef<Muuri | null>(null);

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getRandomWordSet = useCallback((lvl: number): WordSet => {
    const pool = wordPools[lvl];
    const availableSets = pool.filter(set => !usedSets.has(`${lvl}-${set.category}`));
    const setToUse = availableSets.length > 0 
      ? availableSets[Math.floor(Math.random() * availableSets.length)]
      : pool[Math.floor(Math.random() * pool.length)];
    return setToUse;
  }, [usedSets]);

  const getCurrentOrder = useCallback((): Word[] => {
    if (!muuriRef.current) return shuffledWords;
    const items = muuriRef.current.getItems();
    return items.map(item => {
      const wordText = item.getElement()?.getAttribute('data-word') || '';
      return shuffledWords.find(w => w.word === wordText)!;
    }).filter(Boolean);
  }, [shuffledWords]);

  const checkAnswer = useCallback(() => {
    const currentOrder = getCurrentOrder();
    const isCorrect = currentOrder.every((word, index) => word.intensity === index + 1);
    
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (isCorrect) {
      const timeTaken = (Date.now() - startTimeRef.current) / 1000;
      const timeBonus = Math.max(0, Math.floor((ROUND_TIME - timeTaken) * 10));
      const levelBonus = level * 50;
      const roundScore = 100 + timeBonus + levelBonus;
      setScore(prev => prev + roundScore);
      
      if (round >= TOTAL_ROUNDS && level >= 4) {
        setGameState('victory');
      } else {
        setGameState('success');
      }
    } else {
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
        setGameState('failed');
      }, 500);
    }
  }, [getCurrentOrder, level, round]);

  const startRound = useCallback((lvl: number) => {
    const wordSet = getRandomWordSet(lvl);
    setCurrentWordSet(wordSet);
    setShuffledWords(shuffleArray(wordSet.words));
    setExpandedWord(null);
    setTimeLeft(ROUND_TIME);
    setShowError(false);
    startTimeRef.current = Date.now();
    setGameState('playing');
    setUsedSets(prev => new Set(prev).add(`${lvl}-${wordSet.category}`));
  }, [getRandomWordSet]);

  const startGame = () => {
    setLevel(1);
    setRound(1);
    setScore(0);
    setUsedSets(new Set());
    startRound(1);
  };

  const nextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      const newLevel = level + 1;
      setLevel(newLevel);
      setRound(1);
      startRound(newLevel);
    } else {
      const newRound = round + 1;
      setRound(newRound);
      startRound(level);
    }
  };

  const retryRound = () => {
    startRound(level);
  };

  // Initialize Muuri grid
  useEffect(() => {
    if (gridRef.current && shuffledWords.length > 0 && gameState === 'playing') {
      if (muuriRef.current) {
        muuriRef.current.destroy();
      }

      muuriRef.current = new Muuri(gridRef.current, {
        items: '.la-word-item',
        dragEnabled: true,
        dragSortHeuristics: { sortInterval: 10, minDragDistance: 10, minBounceBackAngle: 1 },
        dragContainer: gridRef.current,
        dragPlaceholder: {
          enabled: true,
          createElement: () => {
            const placeholder = document.createElement('div');
            placeholder.className = 'la-word-placeholder';
            return placeholder;
          },
        },
        dragRelease: { duration: 300, easing: 'ease-out' },
        layout: { fillGaps: false, rounding: true },
      });

      muuriRef.current.refreshItems().layout();
    }

    return () => {
      if (muuriRef.current) {
        muuriRef.current.destroy();
        muuriRef.current = null;
      }
    };
  }, [shuffledWords, gameState]);

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState('failed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const handleWordClick = (word: Word, e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    // Don't toggle if clicking the drag handle
    const target = e.target as HTMLElement;
    if (target.classList.contains('la-drag-handle')) return;
    
    setExpandedWord(expandedWord === word.word ? null : word.word);
    
    // Refresh Muuri layout after expansion
    setTimeout(() => {
      if (muuriRef.current) {
        muuriRef.current.refreshItems().layout();
      }
    }, 50);
  };

  const renderStartScreen = () => (
    <GameIntro
      gameId="lexicon-ascent"
      emoji="📚"
      title="Lexicon Ascent"
      tagline="Master the spectrum of meaning — climb from the mildest word to the fiercest."
      hints={[
        '👆 Tap a word to reveal what it means',
        '🔀 Drag and drop to arrange them by intensity',
        '📈 Order from least intense → most intense',
        '⚡ Finish faster and the score climbs with you',
      ]}
      ctaLabel="Begin Ascent"
      onStart={startGame}
      onBack={onBack}
    />
  );

  const renderGame = () => (
    <div className="la-game-container">
      <div className="la-hud">
        <div className="la-hud-item">
          <span className="la-hud-label">Level</span>
          <span className="la-hud-value">{level}</span>
        </div>
        <div className="la-hud-item">
          <span className="la-hud-label">Round</span>
          <span className="la-hud-value">{round}/{TOTAL_ROUNDS}</span>
        </div>
        <div className="la-hud-item timer">
          <span className="la-hud-label">Time</span>
          <span className={`la-hud-value ${timeLeft <= 10 ? 'warning' : ''}`}>{timeLeft}s</span>
        </div>
        <div className="la-hud-item">
          <span className="la-hud-label">Score</span>
          <span className="la-hud-value">{score}</span>
        </div>
      </div>

      {currentWordSet && (
        <div className="la-category">
          <span className="la-category-label">Category:</span>
          <span className="la-category-name">{currentWordSet.category}</span>
        </div>
      )}

      <div className="la-prompt">
        Drag to arrange: <span className="la-highlight">Least</span> → <span className="la-highlight">Most</span> intense
      </div>

      <div className="la-intensity-scale">
        <span className="la-scale-label">1 (Mild)</span>
        <div className="la-scale-bar"></div>
        <span className="la-scale-label">4 (Extreme)</span>
      </div>

      <div ref={gridRef} className={`la-word-grid ${showError ? 'error' : ''}`}>
        {shuffledWords.map((word) => (
          <div
            key={word.word}
            className={`la-word-item ${expandedWord === word.word ? 'expanded' : ''}`}
            data-word={word.word}
            onClick={(e) => handleWordClick(word, e)}
          >
            <div className="la-word-content">
              <div className="la-word-main">
                <span className="la-drag-handle">⋮⋮</span>
                <span className="la-word-text">{word.word}</span>
                <span className="la-expand-icon">{expandedWord === word.word ? '−' : '+'}</span>
              </div>
              {expandedWord === word.word && (
                <div className="la-word-meaning">
                  {word.meaning}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="la-validate-btn" onClick={checkAnswer}>
        Check Order
      </button>

      <button className="la-quit-btn" onClick={onBack}>✕</button>
    </div>
  );

  const renderSuccessOverlay = () => (
    <div className="la-overlay">
      <div className="la-overlay-content success">
        <div className="la-success-icon">✓</div>
        <h2>Correct!</h2>
        <p className="la-score-earned">+{Math.floor((ROUND_TIME - (Date.now() - startTimeRef.current) / 1000) * 10) + 100 + level * 50} points</p>
        <button className="la-next-btn" onClick={nextRound}>
          {round >= TOTAL_ROUNDS ? 'Next Level →' : 'Next Round →'}
        </button>
      </div>
    </div>
  );

  const renderFailedOverlay = () => (
    <div className="la-overlay">
      <div className="la-overlay-content failed">
        <div className="la-failed-icon">✗</div>
        <h2>{timeLeft === 0 ? "Time's Up!" : 'Incorrect Order'}</h2>
        {currentWordSet && (
          <div className="la-correct-order">
            <p>Correct order:</p>
            <div className="la-answer-list">
              {currentWordSet.words
                .sort((a, b) => a.intensity - b.intensity)
                .map((word, i) => (
                  <span key={word.word} className="la-answer-word">
                    {i + 1}. {word.word}
                  </span>
                ))}
            </div>
          </div>
        )}
        <button className="la-retry-btn" onClick={retryRound}>
          Try Again
        </button>
      </div>
    </div>
  );

  const renderVictory = () => (
    <GameResultPanel
      gameId="lexicon-ascent"
      gameTitle="Lexicon Ascent"
      headline="Lexicon Master!"
      subline="You've conquered all 4 levels — every shade of intensity in its place."
      score={score}
      stats={[
        { label: 'Levels', value: 4 },
        { label: 'Rounds', value: TOTAL_ROUNDS * 4 },
      ]}
      onPlayAgain={startGame}
      onBack={onBack}
    />
  );

  return (
    <div className="lexicon-ascent">
      {gameState === 'start' && renderStartScreen()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'success' && (
        <>
          {renderGame()}
          {renderSuccessOverlay()}
        </>
      )}
      {gameState === 'failed' && (
        <>
          {renderGame()}
          {renderFailedOverlay()}
        </>
      )}
      {gameState === 'victory' && renderVictory()}
    </div>
  );
};

export default LexiconAscent;
