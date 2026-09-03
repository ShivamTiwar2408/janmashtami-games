import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './KrishnaWheelGame.css';
import krishnaWheelData from './krishna-wheel-data.json';
import { GameIntro } from '../../leaderboard';

interface KrishnaWheelGameProps {
  onBack: () => void;
}

interface Message {
  problem: string;
  text: string;
  reference: string;
}

const KrishnaWheelGame: React.FC<KrishnaWheelGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [showKrishnaAnimation, setShowKrishnaAnimation] = useState(false);
  const krishnaImageRef = useRef<HTMLImageElement | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const dingAudioRef = useRef<HTMLAudioElement>(null);
  const [showPlayerPopup, setShowPlayerPopup] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);

  const segments = useMemo(() => krishnaWheelData.wheelSegments, []);
  const wheelTexts = useMemo(() => krishnaWheelData.wheelSegments.map(segment => segment.wheelText), []);
  const colors = useMemo(() => krishnaWheelData.wheelSegments.map(segment => segment.color), []);
  const darkColors = useMemo(() => krishnaWheelData.wheelSegments.map(segment => segment.darkColor), []);

  const drawTextOnArc = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    angle: number,
    radius: number,
    centerX: number,
    centerY: number
  ) => {
    ctx.save();

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);

    ctx.restore();
  }, []);

  const drawTextAlongRadius = useCallback((
    ctx: CanvasRenderingContext2D,
    text: string,
    startAngle: number,
    endAngle: number,
    centerX: number,
    centerY: number,
    radius: number
  ) => {
    const midAngle = (startAngle + endAngle) / 2;
    const words = text.split(' ');

    // Labels run along the arc, so the segment's arc width is the real space available
    const arcWidth = Math.abs(endAngle - startAngle) * radius * 0.85;
    const fontSize = Math.max(11, Math.min(20, radius / 25, arcWidth / 7));
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let currentRadius = radius * 0.85;
    const radiusStep = fontSize + 4;
    const maxRadius = radius * 0.4;

    let currentLine = '';
    const maxLineWidth = arcWidth * 0.95;

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];

      if (ctx.measureText(testLine).width > maxLineWidth && currentLine) {
        drawTextOnArc(ctx, currentLine, midAngle, currentRadius, centerX, centerY);
        currentLine = words[i];
        currentRadius -= radiusStep;

        if (currentRadius < maxRadius) break;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine && currentRadius >= maxRadius) {
      drawTextOnArc(ctx, currentLine, midAngle, currentRadius, centerX, centerY);
    }
  }, [drawTextOnArc]);

  const drawMarker = useCallback((ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
    // Draw a large black triangular pointer on the right side (like original)
    const markerSize = radius * 0.25; // Responsive but much larger
    const markerX = centerX + radius - 20;
    const markerY = centerY;

    // Draw marker shadow first
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Draw the large triangular pointer pointing left towards the wheel
    ctx.beginPath();
    ctx.moveTo(markerX, markerY); // Sharp point of the triangle (pointing at wheel)
    ctx.lineTo(markerX + markerSize, markerY - markerSize / 2); // Top corner
    ctx.lineTo(markerX + markerSize, markerY + markerSize / 2); // Bottom corner
    ctx.closePath();

    // Fill with solid black
    ctx.fillStyle = '#000000';
    ctx.fill();
  }, []);

  const drawWheel = useCallback((ctx: CanvasRenderingContext2D, size: number) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size / 2) - 8;

    ctx.clearRect(0, 0, size, size);

    // Fill background with white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    const segmentCount = segments.length;
    const anglePerSegment = (2 * Math.PI) / segmentCount;

    // Draw segments with gradients
    for (let i = 0; i < segmentCount; i++) {
      const startAngle = (i * anglePerSegment) + currentRotation;
      const endAngle = ((i + 1) * anglePerSegment) + currentRotation;

      // Create gradient for each segment
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 80,
        centerX, centerY, radius
      );
      gradient.addColorStop(0, colors[i]);
      gradient.addColorStop(1, darkColors[i]);

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add segment border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw message text along the radius
      drawTextAlongRadius(ctx, wheelTexts[i], startAngle, endAngle, centerX, centerY, radius);
    }

    // Draw center circle with white background
    ctx.beginPath();
    ctx.arc(centerX, centerY, 80, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();

    // Draw Krishna image in center if loaded
    if (imageLoaded && krishnaImageRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, 75, 0, 2 * Math.PI);
      ctx.clip();

      const imageSize = 150;
      ctx.drawImage(
        krishnaImageRef.current,
        centerX - imageSize / 2,
        centerY - imageSize / 2,
        imageSize,
        imageSize
      );
      ctx.restore();
    }

    // Draw marker on the right side
    drawMarker(ctx, centerX, centerY, radius);
  }, [segments.length, imageLoaded, drawMarker, currentRotation, colors, darkColors, drawTextAlongRadius, wheelTexts]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      // Get the full screen dimensions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Use the minimum of screen width or height for maximum wheel size
      // Leave some margin for UI elements and visual breathing room
      const maxSize = Math.min(screenWidth, screenHeight) - 5;

      // Also consider container constraints to ensure it fits
      const containerRect = container.getBoundingClientRect();
      const containerMaxSize = Math.min(containerRect.width - 10, containerRect.height - 10);

      // Use the smaller of the two to ensure it fits properly
      const size = Math.min(maxSize, containerMaxSize);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        drawWheel(ctx, size);
      }
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, [drawWheel]);

  // Attract mode: the wheel itself is the screensaver, turning slowly on its
  // own until someone takes it over.
  useEffect(() => {
    if (!showPlayerPopup || isSpinning) return;
    let frame = 0;
    const tick = () => {
      setCurrentRotation((r) => r + 0.0025);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [showPlayerPopup, isSpinning]);

  const spin = () => {
    if (isSpinning) return;

    if (!playerReady) {
      setShowPlayerPopup(true);
      return;
    }

    setCurrentMessage(null);
    setIsSpinning(true);

    // Play wheel sound from 2 seconds to 10 seconds
    if (audioRef.current) {
      audioRef.current.currentTime = 2;
      audioRef.current.play();

      // Stop at 10 seconds
      const stopAudioTimeout = setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
      }, 8000); // 8 seconds duration (from 2s to 10s)

      // Store timeout to clear it if needed
      audioRef.current.dataset.stopTimeout = stopAudioTimeout.toString();
    }

    const segmentAngle = (2 * Math.PI) / segments.length;
    const baseSpins = 4 + Math.random() * 3;
    const randomSegment = Math.floor(Math.random() * segments.length);
    const targetSegmentCenter = randomSegment * segmentAngle + (segmentAngle / 2);
    const finalRotation = currentRotation + (baseSpins * 2 * Math.PI) + targetSegmentCenter;

    const duration = 10000;
    const startTime = Date.now();
    const startRotation = currentRotation;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 6);

      setCurrentRotation(startRotation + (finalRotation - startRotation) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentRotation(finalRotation);
        setIsSpinning(false);

        // Stop wheel sound and clear timeout
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;

          // Clear the timeout if it exists
          const timeoutId = audioRef.current.dataset.stopTimeout;
          if (timeoutId) {
            clearTimeout(parseInt(timeoutId));
            delete audioRef.current.dataset.stopTimeout;
          }
        }

        // Calculate which segment the marker is actually pointing to
        // The marker is at 0 degrees (right side), so we need to find which segment is at that position
        const normalizedRotation = finalRotation % (2 * Math.PI);
        // Since segments start at 0 and go counter-clockwise, and marker points right (0 degrees)
        // We need to find which segment is currently at 0 degrees position
        const markerAngle = (2 * Math.PI - normalizedRotation) % (2 * Math.PI);
        const winningSegmentIndex = Math.floor(markerAngle / segmentAngle) % segments.length;

        // Reset animation state first, then set message and trigger animation
        const winner = segments[winningSegmentIndex];
        const verse = winner.verses[Math.floor(Math.random() * winner.verses.length)];
        setShowKrishnaAnimation(false);
        setCurrentMessage({ problem: winner.problem, ...verse });

        // Play ding sound when Krishna's message appears
        if (dingAudioRef.current) {
          dingAudioRef.current.currentTime = 0;
          dingAudioRef.current.play().catch(() => {
            // Audio play failed, continue without audio
          });
        }

        // Trigger animation after a small delay to ensure state reset
        setTimeout(() => {
          setShowKrishnaAnimation(true);
        }, 50);
      }
    };

    animate();
  };



  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      krishnaImageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load Krishna image');
      setImageLoaded(false);
    };
    img.src = '/krishna_with_flute.jpg';
  }, []);

  return (
    <div className="krishna-wheel-container">
      {showPlayerPopup && (
        <GameIntro
          gameId="krishna-wheel"
          emoji="🎡"
          title="Krishna's Wheel of Wisdom"
          tagline="Every section of the wheel is a problem we all face. Spin it, and Krishna answers with the verse that holds the solution."
          hints={[
            '🎡 Tap the wheel — or the button — to set it spinning',
            '💭 Wherever it stops is a feeling we all know',
            '📖 Krishna answers with a verse from the Bhagavad Gita',
            '🔁 Spin as often as you like — each verse is a new lesson',
          ]}
          ctaLabel="Spin the Wheel"
          /* The live wheel behind is the showreel — nothing of ours over it. */
          overlay
          onStart={() => {
            setPlayerReady(true);
            setShowPlayerPopup(false);
          }}
          onBack={onBack}
        />
      )}
      {/* The attract screen carries its own Back button. */}
      {!showPlayerPopup && <button onClick={onBack} className="back-btn-corner">← Back</button>}
      <div className="wheel-section">
        <canvas ref={canvasRef} className="wheel-canvas" onClick={spin} />
      </div>
      <div className="right-section">
        <div className="game-intro">
          <h2>🎡 Krishna's Wheel of Wisdom</h2>
          <p>
            Every section of the wheel is a problem we all face. Spin it, and Lord Krishna answers
            with a verse from the Bhagavad Gita that holds the solution.
          </p>
        </div>

        <audio ref={audioRef} loop>
          <source src="/wheel.mp3" type="audio/mpeg" />
        </audio>

        <audio ref={dingAudioRef}>
          <source src="/ding.mp3" type="audio/mpeg" />
        </audio>
        <button
          className="spin-button"
          onClick={spin}
          disabled={isSpinning}
        >
          {isSpinning ? '🌀 Spinning...' : '✨ Spin the Wheel'}
        </button>

        <div className="message-display">
          {currentMessage ? (
            <>
              <div>
                <div className="message-problem">{currentMessage.problem}</div>
                <div className="message-text">"{currentMessage.text}"</div>
                <div className="message-reference">- {currentMessage.reference}</div>
              </div>
              <img
                src="/BG_Krishna.jpg"
                alt="Lord Krishna"
                className={`krishna-image ${showKrishnaAnimation ? 'animate' : ''}`}
              />
            </>
          ) : (
              <div style={{ opacity: 0.7 }}>
                <div>🙏</div>
                <div style={{ marginTop: '1rem' }}>Spin the wheel to find the Gita's solution to a problem</div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default KrishnaWheelGame;
