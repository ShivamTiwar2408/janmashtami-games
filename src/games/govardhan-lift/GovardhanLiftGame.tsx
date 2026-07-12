import React, { useState, useEffect, useCallback, useRef } from 'react';
import './GovardhanLiftGame.css';

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
            if (gameState === 'intro') {
                if (key === 'Enter' || key === ' ') { e.preventDefault(); startGame(); }
                return;
            }
            if (gameState === 'won' || gameState === 'lost') {
                if (key === 'Enter' || key === ' ') { e.preventDefault(); startGame(); }
                return;
            }
            if (gameState === 'playing') {
                // The whole crowd hammers keys together — accept almost everything
                if (key.length === 1 || key === 'Enter' || key === ' ' ||
                    key.startsWith('Arrow')) {
                    e.preventDefault();
                    registerTap();
                }
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

            <button className="gl-back-btn" onClick={onBack} aria-label="Back to home">← Back</button>

            {/* INTRO */}
            {gameState === 'intro' && (
                <div className="gl-intro">
                    <div className="gl-intro-hill">⛰️</div>
                    <h1 className="gl-title">Lift Govardhan Together</h1>
                    <p className="gl-subtitle">
                        When Krishna lifted Govardhan Hill on His little finger, the villagers
                        raised their sticks too — believing they were helping. Together, as one
                        family, <strong>everyone taps to lift the hill</strong> before time runs out!
                    </p>
                    <div className="gl-controls-hint">
                        <span>👏 Everyone press ANY key / tap repeatedly</span>
                        <span>Keep going — if you stop, the hill sinks!</span>
                    </div>
                    <button className="gl-primary-btn" onClick={startGame}>Start Lifting 🙏</button>
                </div>
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

            {/* WON */}
            {gameState === 'won' && (
                <div className="gl-end gl-won">
                    <div className="gl-end-icon">🎉🏔️🎉</div>
                    <h1 className="gl-title">Govardhan Lifted!</h1>
                    <p className="gl-end-text">
                        Together you did what no one could do alone. This is Krishna's lesson:
                        surrender and unity move mountains. 🙏
                    </p>
                    <div className="gl-end-stats">
                        <div className="gl-stat"><span className="gl-stat-num">{taps}</span><span className="gl-stat-label">Helping Hands</span></div>
                        <div className="gl-stat"><span className="gl-stat-num">{GAME_TIME - timeLeft}s</span><span className="gl-stat-label">Time Taken</span></div>
                    </div>
                    <p className="gl-cta">Bring the whole family to our Janmashtami programs — scan to join!</p>
                    <div className="gl-qr-row">
                        <img className="gl-qr" alt="Scan to join" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(REGISTER_URL)}`} />
                    </div>
                    <div className="gl-end-actions">
                        <button className="gl-primary-btn" onClick={startGame}>Lift Again</button>
                        <button className="gl-secondary-btn" onClick={onBack}>Home</button>
                    </div>
                </div>
            )}

            {/* LOST */}
            {gameState === 'lost' && (
                <div className="gl-end gl-lost">
                    <div className="gl-end-icon">💪</div>
                    <h1 className="gl-title">So Close!</h1>
                    <p className="gl-end-text">
                        You reached <strong>{Math.round(liftPercent)}%</strong>. The hill needs
                        even more hands — gather more friends and try again together!
                    </p>
                    <div className="gl-end-actions">
                        <button className="gl-primary-btn" onClick={startGame}>Try Again</button>
                        <button className="gl-secondary-btn" onClick={onBack}>Home</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GovardhanLiftGame;
