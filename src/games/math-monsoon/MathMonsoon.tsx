import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MathMonsoon.css';

interface MathMonsoonProps {
  onBack: () => void;
}

interface Drop {
  id: number;
  question: string;
  answer: number;
  x: number;
  y: number;
  speed: number;
  hit?: boolean;
}

type GameState = 'start' | 'playing' | 'gameover';

const generateQuestion = (): { question: string; answer: number } => {
  const operations = ['+', '-', '×', '÷'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  let a: number, b: number, answer: number, question: string;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 20) + 1;
      b = Math.floor(Math.random() * 20) + 1;
      answer = a + b;
      question = `${a} + ${b}`;
      break;
    case '-':
      a = Math.floor(Math.random() * 20) + 10;
      b = Math.floor(Math.random() * a);
      answer = a - b;
      question = `${a} - ${b}`;
      break;
    case '×':
      a = Math.floor(Math.random() * 10) + 1;
      b = Math.floor(Math.random() * 10) + 1;
      answer = a * b;
      question = `${a} × ${b}`;
      break;
    case '÷':
      b = Math.floor(Math.random() * 9) + 1;
      answer = Math.floor(Math.random() * 10) + 1;
      a = b * answer;
      question = `${a} ÷ ${b}`;
      break;
    default:
      a = 1; b = 1; answer = 2; question = '1 + 1';
  }

  return { question, answer };
};

const MathMonsoon: React.FC<MathMonsoonProps> = ({ onBack }) => {
  const [gameState, setGameState] = useState<GameState>('start');
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [input, setInput] = useState('');
  const [gameTime, setGameTime] = useState(0);
  const [splashes, setSplashes] = useState<{id: number, x: number}[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropIdRef = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const lastSpawnTimeRef = useRef(0);
  const correctAnswersRef = useRef(0);

  const waterLevel = 75; // percentage from top where water starts (increased water height)

  const getBaseSpeed = useCallback(() => {
    // Speed increases over time: starts at 0.3, increases by 0.05 every 10 seconds
    return 0.3 + Math.floor(gameTime / 10) * 0.05;
  }, [gameTime]);

  const createDrop = useCallback(() => {
    const { question, answer } = generateQuestion();
    const newDrop: Drop = {
      id: dropIdRef.current++,
      question,
      answer,
      x: Math.random() * 70 + 15, // 15-85% to keep drops visible
      y: 0,
      speed: getBaseSpeed() + Math.random() * 0.1,
    };
    return newDrop;
  }, [getBaseSpeed]);

  // Game loop - handles movement and spawning
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      const now = Date.now();
      
      setDrops(prevDrops => {
        const updatedDrops = prevDrops.map(drop => ({
          ...drop,
          y: drop.y + drop.speed,
        }));

        // Check for drops hitting water (only count ones not already hit)
        const dropsHitWater = updatedDrops.filter(d => d.y >= waterLevel && !d.hit);
        const remainingDrops = updatedDrops
          .filter(d => d.y < waterLevel + 5) // Keep drops slightly past water for splash
          .map(d => d.y >= waterLevel ? { ...d, hit: true } : d);

        if (dropsHitWater.length > 0) {
          // Create splash effects for each drop hitting water
          dropsHitWater.forEach(drop => {
            setSplashes(prev => [...prev, { id: drop.id, x: drop.x }]);
            // Remove splash after animation
            setTimeout(() => {
              setSplashes(prev => prev.filter(s => s.id !== drop.id));
            }, 600);
          });
          
          setLives(l => {
            const newLives = l - dropsHitWater.length;
            if (newLives < 1) {
              setGameState('gameover');
              return 0;
            }
            return newLives;
          });
        }

        // Remove drops that have been hit and finished animating
        const activeDrops = remainingDrops.filter(d => !d.hit || d.y < waterLevel + 3);

        // Always spawn a new drop if there are none (excluding hit drops)
        const nonHitDrops = activeDrops.filter(d => !d.hit);
        if (nonHitDrops.length === 0) {
          const { question, answer } = generateQuestion();
          const newDrop: Drop = {
            id: dropIdRef.current++,
            question,
            answer,
            x: Math.random() * 70 + 15,
            y: 0,
            speed: 0.3 + correctAnswersRef.current * 0.02 + Math.random() * 0.1,
          };
          lastSpawnTimeRef.current = now;
          return [...activeDrops, newDrop];
        }
        // Spawn additional drops based on time interval
        else if (now - lastSpawnTimeRef.current > 2500 && nonHitDrops.length < 5) {
          const { question, answer } = generateQuestion();
          const newDrop: Drop = {
            id: dropIdRef.current++,
            question,
            answer,
            x: Math.random() * 70 + 15,
            y: 0,
            speed: 0.3 + correctAnswersRef.current * 0.02 + Math.random() * 0.1,
          };
          lastSpawnTimeRef.current = now;
          return [...activeDrops, newDrop];
        }

        return activeDrops;
      });
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameState]);

  // Game timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      setGameTime(t => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const startGame = () => {
    setGameState('playing');
    setDrops([createDrop()]);
    setScore(0);
    setLives(3);
    setInput('');
    setGameTime(0);
    dropIdRef.current = 1;
    lastSpawnTimeRef.current = Date.now();
    correctAnswersRef.current = 0;
    setCorrectAnswers(0);
    setSplashes([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const userAnswer = parseInt(input, 10);
    
    if (isNaN(userAnswer)) {
      setInput('');
      return;
    }

    const matchingDrop = drops.find(d => d.answer === userAnswer);
    
    if (matchingDrop) {
      // Calculate score based on drop position (higher = more points)
      const distanceFromWater = waterLevel - matchingDrop.y;
      const basePoints = 10;
      const bonusPoints = Math.floor(distanceFromWater / 10) * 5;
      const totalPoints = basePoints + bonusPoints;
      
      setScore(s => s + totalPoints);
      setDrops(prev => prev.filter(d => d.id !== matchingDrop.id));
      setCorrectAnswers(c => c + 1);
      correctAnswersRef.current += 1;
    }
    
    setInput('');
    inputRef.current?.focus();
  };

  const renderStartScreen = () => (
    <div className="mm-start-screen">
      <div className="mm-start-content">
        <h1 className="mm-title">🌧️ Math Monsoon</h1>
        <p className="mm-subtitle">Solve math problems before raindrops hit the water!</p>
        
        <div className="mm-instructions">
          <h3>How to Play</h3>
          <ul>
            <li>🌧️ Raindrops fall from the sky with math problems</li>
            <li>⌨️ Type the answer and press Enter</li>
            <li>⚡ Faster answers = More points!</li>
            <li>💔 You lose a life when a drop hits the water</li>
            <li>❤️ You have 3 lives - don't let them run out!</li>
          </ul>
        </div>

        <button className="mm-start-btn" onClick={startGame}>
          Start Game
        </button>
        <button className="mm-back-btn" onClick={onBack}>
          ← Back to Home
        </button>
      </div>
    </div>
  );

  const renderGameOver = () => (
    <div className="mm-gameover-screen">
      <div className="mm-gameover-content">
        <h1>Game Over!</h1>
        <div className="mm-final-score">
          <span className="mm-score-label">Final Score</span>
          <span className="mm-score-value">{score}</span>
        </div>
        <p className="mm-time-survived">You survived for {Math.floor(gameTime)} seconds!</p>
        <button className="mm-start-btn" onClick={startGame}>
          Play Again
        </button>
        <button className="mm-back-btn" onClick={onBack}>
          ← Back to Home
        </button>
      </div>
    </div>
  );

  const renderGame = () => (
    <div className="mm-game-container" ref={gameAreaRef}>
      {/* Sky background with clouds */}
      <div className="mm-sky">
        <div className="mm-cloud mm-cloud-1">☁️</div>
        <div className="mm-cloud mm-cloud-2">☁️</div>
        <div className="mm-cloud mm-cloud-3">☁️</div>
        <div className="mm-cloud mm-cloud-4">☁️</div>
      </div>

      {/* HUD */}
      <div className="mm-hud">
        <div className="mm-hud-item">
          <span className="mm-hud-label">Score</span>
          <span className="mm-hud-value">{score}</span>
        </div>
        <div className="mm-hud-item mm-lives">
          <span className="mm-hud-label">Lives</span>
          <span className="mm-hud-value">
            {Array(lives).fill('❤️').join('')}
            {Array(3 - lives).fill('🖤').join('')}
          </span>
        </div>
        <div className="mm-hud-item">
          <span className="mm-hud-label">Time</span>
          <span className="mm-hud-value">{Math.floor(gameTime)}s</span>
        </div>
      </div>

      {/* Drops */}
      {drops.map(drop => (
        <div
          key={drop.id}
          className="mm-drop"
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
          }}
        >
          <div className="mm-drop-shape">💧</div>
          <div className="mm-drop-question">{drop.question}</div>
        </div>
      ))}

      {/* Water */}
      <div className="mm-water" style={{ top: `${waterLevel}%` }}>
        <div className="mm-water-surface"></div>
        <div className="mm-water-body"></div>
      </div>

      {/* Splash effects */}
      {splashes.map(splash => (
        <div
          key={splash.id}
          className="mm-splash"
          style={{ left: `${splash.x}%`, top: `${waterLevel}%` }}
        >
          <span className="mm-splash-drop">💦</span>
          <span className="mm-splash-ring"></span>
        </div>
      ))}

      {/* Input area */}
      <div className="mm-input-area">
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type answer..."
            className="mm-input"
            autoFocus
          />
          <button type="submit" className="mm-submit-btn">
            ✓
          </button>
        </form>
      </div>

      {/* Back button */}
      <button className="mm-game-back-btn" onClick={onBack}>
        ✕
      </button>
    </div>
  );

  return (
    <div className="math-monsoon">
      {gameState === 'start' && renderStartScreen()}
      {gameState === 'playing' && renderGame()}
      {gameState === 'gameover' && renderGameOver()}
    </div>
  );
};

export default MathMonsoon;
