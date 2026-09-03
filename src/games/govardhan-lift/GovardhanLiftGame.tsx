import React, { useState, useEffect, useCallback, useRef } from 'react';
import './GovardhanLiftGame.css';
import { GameIntro, GameResultPanel } from '../../leaderboard';

interface GovardhanLiftGameProps {
    onBack: () => void;
}

const GAME_TIME = 25;          // seconds to lift the hill together
const TARGET_ENERGY = 500;     // total taps needed to fully raise the hill
const DECAY_PER_TICK = 3;      // energy drains if the crowd stops (per 250ms)
const TAP_POWER = 6;           // energy per key press
const REGISTER_URL = 'https://janmashtami-games.vercel.app/';

const GovardhanLiftGame: React.FC<GovardhanLiftGameProps> = ({ onBack }) => {
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'won' | 'lost'>('intro');
    const [energy, setEnergy] = useState(0);
    const [taps, setTaps] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_TIME);
    const [tps, setTps] = useState(0); // taps per second (crowd intensity)

    const energyRef = useRef(0);
    const recentTapsRef = useRef<number[]>([]); // timestamps for TPS meter
    const celebrateAudioRef = useRef<HTMLAudioElement>(null);
    const dingAudioRef = useRef<HTMLAudioElement>(null);

    const liftPercent = Math.min(100, (energy / TARGET_ENERGY) * 100);

    const startGame = useCallback(() => {
        energyRef.current = 0;
        recentTapsRef.current = [];
        setEnergy(0);
        setTaps(0);
        setTps(0);
        setTimeLeft(GAME_TIME);
        setGameState('playing');
    }, []);

    const registerTap = useCallback(() => {
        if (gameState !== 'playing') return;
        energyRef.current = Math.min(TARGET_ENERGY, energyRef.current + TAP_POWER);
        setEnergy(energyRef.current);
        setTaps((t) => t + 1);
        recentTapsRef.current.push(performance.now());
        if (energyRef.current >= TARGET_ENERGY) {
            const el = celebrateAudioRef.current;
            if (el) { el.currentTime = 0; el.play().catch(() => {}); }
            setGameState('won');
        }
    }, [gameState]);

    // Key controls: any of the "helping hands" keys pumps energy
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const key = e.key;
            // Intro and the result screens own their own keys — and the result
            // screen has a form to type a name into.
            if (gameState !== 'playing') return;
            // The whole crowd hammers keys together — accept almost everything
            if (key.length === 1 || key === 'Enter' || key === ' ' || key.startsWith('Arrow')) {
                e.preventDefault();
                registerTap();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gameState, startGame, registerTap]);

    // Timer
    useEffect(() => {
        if (gameState !== 'playing') return;
        if (timeLeft <= 0) {
            setGameState('lost');
            return;
        }
        const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [gameState, timeLeft]);

    // Energy decay + TPS meter (crowd must keep going or the hill sinks)
    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            // decay
            energyRef.current = Math.max(0, energyRef.current - DECAY_PER_TICK);
            setEnergy(energyRef.current);
            // taps-per-second over the last 1s window
            const now = performance.now();
            recentTapsRef.current = recentTapsRef.current.filter((ts) => now - ts < 1000);
            setTps(recentTapsRef.current.length);
        }, 250);
        return () => clearInterval(interval);
    }, [gameState]);

    return (
        <div className="gl-game">
            <audio ref={celebrateAudioRef} src="/celebration_effect.mp3" preload="auto" />
            <audio ref={dingAudioRef} src="/ding.mp3" preload="auto" />

            {/* The attract screen carries its own Back button. */}
            {gameState !== 'intro' && (
                <button className="gl-back-btn" onClick={onBack} aria-label="Back to home">← Back</button>
            )}

            {/* INTRO */}
            {gameState === 'intro' && (
                <GameIntro
                    gameId="govardhan-lift"
                    emoji="⛰️"
                    title="Lift Govardhan Together"
                    tagline="Krishna held the hill on one finger — the villagers raised their sticks too. Everyone taps to lift it before time runs out."
                    hints={[
                        '👏 Everyone press ANY key, or tap the screen, as fast as you can',
                        '⛰️ Keep going — the moment the crowd stops, the hill sinks',
                        `⏱ ${GAME_TIME} seconds to reach 100%`,
                        '🙌 Every hand counts — the more people, the higher it rises',
                    ]}
                    ctaLabel="Start Lifting 🙏"
                    onStart={startGame}
                    onBack={onBack}
                />
            )}

            {/* PLAYING */}
            {gameState === 'playing' && (
                <div className="gl-play">
                    <div className="gl-hud">
                        <div className="gl-hud-item gl-timer">⏱ {timeLeft}s</div>
                        <div className="gl-hud-item">🙌 {taps} hands</div>
                        <div className="gl-hud-item gl-intensity">
                            {tps >= 8 ? '🔥 Amazing!' : tps >= 4 ? '💪 Keep going!' : '👏 Faster!'}
                        </div>
                    </div>

                    <div className="gl-stage">
                        {/* Krishna + hill that rises with energy */}
                        <div
                            className="gl-hill"
                            style={{ transform: `translateY(${(100 - liftPercent) * 0.35}px)` }}
                        >
                            <div className="gl-hill-emoji">🏔️</div>
                            <div className="gl-finger">☝️</div>
                        </div>
                        <div className="gl-crowd">🧑‍🤝‍🧑👦👧🧑‍🦱👵🧓</div>
                    </div>

                    <div className="gl-meter">
                        <div className="gl-meter-fill" style={{ width: `${liftPercent}%` }}>
                            <span className="gl-meter-label">{Math.round(liftPercent)}%</span>
                        </div>
                    </div>
                    <p className="gl-meter-caption">Raise the hill to 100% — all together now!</p>
                </div>
            )}

            {/* RESULT — one screen for both outcomes, same as every other game */}
            {(gameState === 'won' || gameState === 'lost') && (
                <GameResultPanel
                    gameId="govardhan-lift"
                    gameTitle="Lift Govardhan Together"
                    headline={gameState === 'won' ? 'Govardhan Lifted!' : 'So Close!'}
                    subline={
                        gameState === 'won'
                            ? "Together you did what no one could do alone — surrender and unity move mountains. 🙏"
                            : `You reached ${Math.round(liftPercent)}%. The hill needs more hands — gather friends and lift again!`
                    }
                    score={taps}
                    won={gameState === 'won'}
                    stats={[
                        { label: 'Lifted To', value: `${Math.round(liftPercent)}%` },
                        { label: 'Time Taken', value: `${GAME_TIME - timeLeft}s` },
                    ]}
                    playAgainLabel={gameState === 'won' ? 'Lift Again' : 'Try Again'}
                    onPlayAgain={startGame}
                    onBack={onBack}
                >
                    <div className="gl-qr-row">
                        <img className="gl-qr" alt="Scan to join" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(REGISTER_URL)}`} />
                        <span className="gl-qr-label">
                            Bring the whole family to our Janmashtami programs — scan to join! 🙏
                        </span>
                    </div>
                </GameResultPanel>
            )}
        </div>
    );
};

export default GovardhanLiftGame;
