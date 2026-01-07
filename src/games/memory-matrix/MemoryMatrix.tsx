import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MemoryMatrix.css';

interface MemoryMatrixProps {
  onBack: () => void;
}

type GameState = 'start' | 'showing' | 'playing' | 'success' | 'failed' | 'gameover';

const GRID_SIZE = 8;
const DISPLAY_TIME = 5000; // 5 seconds
const BASE_TILES = 3; // Starting number of highlighted tiles

const MemoryMatrix: React.FC<MemoryMatrixProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [stage, setStage] = useState(1);
  const [score, setScore] = useState(0);
  const [highlightedTiles, setHighlightedTiles] = useState<Set<number>>(new Set());
  const [selectedTiles, setSelectedTiles] = useState<Set<number>>(new Set());
  const [correctTiles, setCorrectTiles] = useState<Set<number>>(new Set());
  const [wrongTiles, setWrongTiles] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(DISPLAY_TIME / 1000);
  const [selectionTimeLeft, setSelectionTimeLeft] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [showingCountdown, setShowingCountdown] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const selectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const getTileCount = useCallback((currentStage: number) => {
    return BASE_TILES + Math.floor((currentStage - 1) * 1.5);
  }, []);

  const getSelectionTime = useCallback((currentStage: number) => {
    // More time for more tiles, but decreases slightly per stage
    const tileCount = getTileCount(currentStage);
    return Math.max(10, tileCount * 2 + 5 - Math.floor(currentStage / 3));
  }, [getTileCount]);

  const generatePattern = useCallback((currentStage: number) => {
    const tileCount = getTileCount(currentStage);
    const tiles = new Set<number>();
    const totalTiles = GRID_SIZE * GRID_SIZE;
    
    while (tiles.size < tileCount) {
      tiles.add(Math.floor(Math.random() * totalTiles));
    }
    return tiles;
  }, [getTileCount]);

  const startStage = useCallback((stageNum: number) => {
    const pattern = generatePattern(stageNum);
    setHighlightedTiles(pattern);
    setSelectedTiles(new Set());
    setCorrectTiles(new Set());
    setWrongTiles(new Set());
    setTimeLeft(DISPLAY_TIME / 1000);
    setShowingCountdown(true);
    setGameState('showing');

    // Countdown during showing phase
    let countdown = DISPLAY_TIME / 1000;
    timerRef.current = setInterval(() => {
      countdown -= 1;
      setTimeLeft(countdown);
      if (countdown <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowingCountdown(false);
        setGameState('playing');
        startTimeRef.current = Date.now();
        
        // Start selection timer
        const selTime = getSelectionTime(stageNum);
        setSelectionTimeLeft(selTime);
        selectionTimerRef.current = setInterval(() => {
          setSelectionTimeLeft(prev => {
            if (prev <= 1) {
              if (selectionTimerRef.current) clearInterval(selectionTimerRef.current);
              handleTimeUp();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }, 1000);
  }, [generatePattern, getSelectionTime]);

  const handleTimeUp = () => {
    setLives(prev => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameState('gameover');
      } else {
        setGameState('failed');
      }
      return newLives;
    });
    setCombo(0);
  };

  const startGame = () => {
    setStage(1);
    setScore(0);
    setLives(3);
    setCombo(0);
    startStage(1);
  };

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing') return;
    if (selectedTiles.has(index)) return;

    const newSelected = new Set(selectedTiles);
    newSelected.add(index);
    setSelectedTiles(newSelected);

    if (highlightedTiles.has(index)) {
      // Correct selection
      const newCorrect = new Set(correctTiles);
      newCorrect.add(index);
      setCorrectTiles(newCorrect);

      // Check if all tiles found
      if (newCorrect.size === highlightedTiles.size) {
        if (selectionTimerRef.current) clearInterval(selectionTimerRef.current);
        
        // Calculate score with time bonus
        const timeTaken = (Date.now() - startTimeRef.current) / 1000;
        const maxTime = getSelectionTime(stage);
        const timeBonus = Math.max(0, Math.floor((maxTime - timeTaken) * 10));
        const baseScore = highlightedTiles.size * 10;
        const comboBonus = combo * 5;
        const stageBonus = stage * 20;
        const totalScore = baseScore + timeBonus + comboBonus + stageBonus;
        
        setScore(prev => prev + totalScore);
        setCombo(prev => prev + 1);
        setGameState('success');
      }
    } else {
      // Wrong selection
      const newWrong = new Set(wrongTiles);
      newWrong.add(index);
      setWrongTiles(newWrong);
      
      if (selectionTimerRef.current) clearInterval(selectionTimerRef.current);
      
      setLives(prev => {
        const newLives = prev - 1;
        if (newLives <= 0) {
          setGameState('gameover');
        } else {
          setGameState('failed');
        }
        return newLives;
      });
      setCombo(0);
    }
  };

  const nextStage = () => {
    const newStage = stage + 1;
    setStage(newStage);
    startStage(newStage);
  };

  const retryStage = () => {
    startStage(stage);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (selectionTimerRef.current) clearInterval(selectionTimerRef.current);
    };
  }, []);

  const renderGrid = () => {
    const tiles = [];
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
      const isHighlighted = gameState === 'showing' && highlightedTiles.has(i);
      const isSelected = selectedTiles.has(i);
      const isCorrect = correctTiles.has(i);
      const isWrong = wrongTiles.has(i);
      const showAnswer = gameState === 'failed' || gameState === 'gameover';
      const isMissed = showAnswer && highlightedTiles.has(i) && !correctTiles.has(i);

      let tileClass = 'mmx-tile';
      if (isHighlighted) tileClass += ' highlighted';
      if (isCorrect) tileClass += ' correct';
      if (isWrong) tileClass += ' wrong';
      if (isMissed) tileClass += ' missed';
      if (gameState === 'playing' && !isSelected) tileClass += ' clickable';

      tiles.push(
        <div
          key={i}
          className={tileClass}
          onClick={() => handleTileClick(i)}
        />
      );
    }
    return tiles;
  };


  const renderStartScreen = () => (
    <div className="mmx-start-screen">
      <div className="mmx-start-content">
        <div className="mmx-logo">
          <span className="mmx-logo-icon">🧠</span>
          <h1 className="mmx-title">Memory Matrix</h1>
        </div>
        <p className="mmx-subtitle">Test your visual memory</p>
        
        <div className="mmx-instructions">
          <div className="mmx-instruction-item">
            <span className="mmx-instruction-icon">👁️</span>
            <span>Memorize the highlighted tiles</span>
          </div>
          <div className="mmx-instruction-item">
            <span className="mmx-instruction-icon">🎯</span>
            <span>Select all the tiles you saw</span>
          </div>
          <div className="mmx-instruction-item">
            <span className="mmx-instruction-icon">⚡</span>
            <span>Faster = More bonus points</span>
          </div>
          <div className="mmx-instruction-item">
            <span className="mmx-instruction-icon">❤️</span>
            <span>3 lives - don't make mistakes!</span>
          </div>
        </div>

        <button className="mmx-start-btn" onClick={startGame}>
          <span>START GAME</span>
        </button>
        <button className="mmx-back-btn" onClick={onBack}>
          ← Back to Home
        </button>
      </div>
    </div>
  );

  const renderSuccessOverlay = () => (
    <div className="mmx-overlay">
      <div className="mmx-overlay-content success">
        <div className="mmx-success-icon">✓</div>
        <h2>Stage {stage} Complete!</h2>
        <div className="mmx-score-breakdown">
          <div className="mmx-score-row">
            <span>Tiles Found</span>
            <span>+{highlightedTiles.size * 10}</span>
          </div>
          <div className="mmx-score-row">
            <span>Time Bonus</span>
            <span>+{Math.max(0, Math.floor((getSelectionTime(stage) - (Date.now() - startTimeRef.current) / 1000) * 10))}</span>
          </div>
          <div className="mmx-score-row">
            <span>Combo x{combo}</span>
            <span>+{combo * 5}</span>
          </div>
          <div className="mmx-score-row">
            <span>Stage Bonus</span>
            <span>+{stage * 20}</span>
          </div>
        </div>
        <button className="mmx-next-btn" onClick={nextStage}>
          Next Stage →
        </button>
      </div>
    </div>
  );

  const renderFailedOverlay = () => (
    <div className="mmx-overlay">
      <div className="mmx-overlay-content failed">
        <div className="mmx-failed-icon">✗</div>
        <h2>Stage Failed</h2>
        <p>Lives remaining: {lives}</p>
        <button className="mmx-retry-btn" onClick={retryStage}>
          Retry Stage
        </button>
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="mmx-gameover-screen">
      <div className="mmx-gameover-content">
        <h1>GAME OVER</h1>
        <div className="mmx-final-stats">
          <div className="mmx-stat">
            <span className="mmx-stat-label">Final Score</span>
            <span className="mmx-stat-value">{score}</span>
          </div>
          <div className="mmx-stat">
            <span className="mmx-stat-label">Stage Reached</span>
            <span className="mmx-stat-value">{stage}</span>
          </div>
          <div className="mmx-stat">
            <span className="mmx-stat-label">Best Combo</span>
            <span className="mmx-stat-value">{combo}x</span>
          </div>
        </div>
        <button className="mmx-start-btn" onClick={startGame}>
          Play Again
        </button>
        <button className="mmx-back-btn" onClick={onBack}>
          ← Back to Home
        </button>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="mmx-game-container">
      <div className="mmx-hud">
        <div className="mmx-hud-left">
          <div className="mmx-hud-item">
            <span className="mmx-hud-label">STAGE</span>
            <span className="mmx-hud-value">{stage}</span>
          </div>
          <div className="mmx-hud-item">
            <span className="mmx-hud-label">SCORE</span>
            <span className="mmx-hud-value">{score}</span>
          </div>
        </div>
        <div className="mmx-hud-center">
          {gameState === 'showing' && (
            <div className="mmx-memorize-prompt">
              <span className="mmx-prompt-text">MEMORIZE</span>
              <span className="mmx-countdown">{timeLeft}s</span>
            </div>
          )}
          {gameState === 'playing' && (
            <div className="mmx-select-prompt">
              <span className="mmx-prompt-text">SELECT {highlightedTiles.size - correctTiles.size} TILES</span>
              <span className="mmx-countdown">{selectionTimeLeft}s</span>
            </div>
          )}
        </div>
        <div className="mmx-hud-right">
          <div className="mmx-hud-item">
            <span className="mmx-hud-label">COMBO</span>
            <span className="mmx-hud-value">{combo}x</span>
          </div>
          <div className="mmx-hud-item lives">
            <span className="mmx-hud-label">LIVES</span>
            <span className="mmx-hud-value">
              {Array(lives).fill('❤️').join(' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="mmx-grid-wrapper">
        <div className="mmx-grid">
          {renderGrid()}
        </div>
      </div>

      {gameState === 'success' && renderSuccessOverlay()}
      {gameState === 'failed' && renderFailedOverlay()}

      <button className="mmx-quit-btn" onClick={onBack}>✕</button>
    </div>
  );

  return (
    <div className="memory-matrix">
      {gameState === 'start' && renderStartScreen()}
      {(gameState === 'showing' || gameState === 'playing' || gameState === 'success' || gameState === 'failed') && renderGame()}
      {gameState === 'gameover' && renderGameOver()}
    </div>
  );
};

export default MemoryMatrix;
