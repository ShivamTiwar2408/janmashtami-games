import React, { useState, useEffect, useRef, useCallback } from 'react';
import './KrishnaWheelGame.css';

interface KrishnaWheelGameProps {
  onBack: () => void;
}

interface Message {
  text: string;
  reference: string;
}

const KrishnaWheelGame: React.FC<KrishnaWheelGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const krishnaImageRef = useRef<HTMLImageElement | null>(null);

  const messages: Message[] = [
    {
      text: "You have the right to perform your prescribed duty, but not to the fruits of action",
      reference: "BG 2.47"
    },
    {
      text: "The soul is neither born, and nor does it die; it is unborn, eternal, permanent",
      reference: "BG 2.20"
    },
    {
      text: "Better is one's own dharma, though imperfectly performed, than the dharma of another",
      reference: "BG 3.35"
    },
    {
      text: "The mind is restless, but it can be controlled by practice and detachment",
      reference: "BG 6.35"
    },
    {
      text: "One who sees inaction in action, and action in inaction, is wise among men",
      reference: "BG 4.18"
    },
    {
      text: "Whatever you do, whatever you eat, offer it all to the Divine",
      reference: "BG 9.27"
    },
    {
      text: "I am the same to all beings; none are dear to Me, nor do I dislike anyone",
      reference: "BG 9.29"
    },
    {
      text: "Abandon all varieties of dharma and surrender unto Me alone",
      reference: "BG 18.66"
    },
    {
      text: "Those who worship Me with devotion, I reside in their hearts",
      reference: "BG 9.29"
    },
    {
      text: "When meditation is mastered, the mind is unwavering like a flame in a windless place",
      reference: "BG 6.19"
    },
    {
      text: "Rise up with your own efforts; do not degrade yourself",
      reference: "BG 6.5"
    },
    {
      text: "I am Time, the destroyer and creator of worlds",
      reference: "BG 11.32"
    }
  ];

  // Shorter versions for wheel display
  const wheelTexts = [
    "Right to duty, not fruits",
    "Soul is eternal",
    "Own dharma is better",
    "Mind can be controlled",
    "Wise see true action",
    "Offer all to Divine",
    "I am same to all",
    "Surrender unto Me",
    "I reside in devotees",
    "Steady mind in meditation",
    "Rise with own efforts",
    "I am Time itself"
  ];

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
  ];

  const darkColors = [
    '#E74C3C', '#16A085', '#2980B9', '#27AE60',
    '#F39C12', '#8E44AD', '#1ABC9C', '#E67E22',
    '#9B59B6', '#3498DB', '#D68910', '#58D68D'
  ];

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

    const fontSize = Math.max(16, Math.min(20, radius / 25));
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
    const maxCharsPerLine = Math.floor((radius * 0.25) / (fontSize * 0.5));

    for (let i = 0; i < words.length; i++) {
      const testLine = currentLine + (currentLine ? ' ' : '') + words[i];

      if (testLine.length > maxCharsPerLine && currentLine) {
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

    const segments = messages.length;
    const anglePerSegment = (2 * Math.PI) / segments;

    // Draw segments with gradients
    for (let i = 0; i < segments; i++) {
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
  }, [currentRotation, imageLoaded, messages, colors, darkColors, drawTextAlongRadius, drawMarker]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setupCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      // Make the wheel as large as possible - use the minimum of container width and height
      // Leave minimal margin for visual breathing room
      const size = Math.min(containerRect.width - 10, containerRect.height - 10);

      console.log('Canvas setup - Container size:', containerRect, 'Canvas size:', size);

      const dpr = window.devicePixelRatio || 1;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = size + 'px';
      canvas.style.height = size + 'px';

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        console.log('Drawing wheel with size:', size);
        drawWheel(ctx, size);
      }
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    return () => {
      window.removeEventListener('resize', setupCanvas);
    };
  }, [drawWheel]);

  const spin = () => {
    if (isSpinning) return;

    setIsSpinning(true);

    const segmentAngle = (2 * Math.PI) / messages.length;
    const baseSpins = 4 + Math.random() * 3;
    const randomSegment = Math.floor(Math.random() * messages.length);
    const targetSegmentCenter = randomSegment * segmentAngle + (segmentAngle / 2);
    const finalRotation = currentRotation + (baseSpins * 2 * Math.PI) + targetSegmentCenter;

    const duration = 3000;
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
        
        // Calculate which segment the marker is actually pointing to
        // The marker is at 0 degrees (right side), so we need to find which segment is at that position
        const normalizedRotation = finalRotation % (2 * Math.PI);
        // Since segments start at 0 and go counter-clockwise, and marker points right (0 degrees)
        // We need to find which segment is currently at 0 degrees position
        const markerAngle = (2 * Math.PI - normalizedRotation) % (2 * Math.PI);
        const winningSegmentIndex = Math.floor(markerAngle / segmentAngle) % messages.length;
        
        setCurrentMessage(messages[winningSegmentIndex]);
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
      <button onClick={onBack} className="back-btn-corner">← Back</button>
      <div className="wheel-section">
        <canvas ref={canvasRef} className="wheel-canvas" onClick={spin} />
      </div>
      <div className="right-section">
        <div className="game-intro">
          <h2>🎡 Krishna's Wheel of Wisdom</h2>
          <p>
            Spin the sacred wheel to receive divine guidance from Lord Krishna's teachings in the Bhagavad Gita. 
            Each spin reveals timeless wisdom to guide your spiritual journey.
          </p>
        </div>

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
              <img 
                src="/BG_Krishna.jpg" 
                alt="Lord Krishna" 
                className="krishna-image"
              />
              <div className="message-text">"{currentMessage.text}"</div>
              <div className="message-reference">- {currentMessage.reference}</div>
            </>
          ) : (
            <div style={{ opacity: 0.7 }}>
              <div>🙏</div>
              <div style={{ marginTop: '1rem' }}>Click the wheel or button above to receive Krishna's wisdom</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KrishnaWheelGame;
