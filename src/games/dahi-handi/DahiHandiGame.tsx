import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createDahiHandiScene, DahiHandiEngine } from './scene';
import './DahiHandiGame.css';
import { GameIntro, GameResultPanel } from '../../leaderboard';

interface DahiHandiGameProps {
    onBack: () => void;
}

const STONES_PER_LEVEL = 3;
const SHOT_SECONDS = 10;   // hold a stone longer than this and it's forfeit

type Phase = 'intro' | 'playing' | 'broke' | 'over';

const DahiHandiGame: React.FC<DahiHandiGameProps> = ({ onBack }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<DahiHandiEngine | null>(null);

    const [phase, setPhase] = useState<Phase>('intro');
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [stones, setStones] = useState(STONES_PER_LEVEL);
    const [power, setPower] = useState(0);
    const [flash, setFlash] = useState('');
    const [lastPoints, setLastPoints] = useState(0);
    const [armed, setArmed] = useState(false);   // stone loaded and the clock ticking
    const [clock, setClock] = useState(SHOT_SECONDS);

    const dingRef = useRef<HTMLAudioElement>(null);
    const celebrateRef = useRef<HTMLAudioElement>(null);
    const errorRef = useRef<HTMLAudioElement>(null);

    const play = (ref: React.RefObject<HTMLAudioElement | null>) => {
        const el = ref.current;
        if (!el) return;
        el.currentTime = 0;
        el.play().catch(() => { });
    };

    // Engine callbacks need current state — route them through a ref so the
    // three.js scene is built exactly once.
    const handlers = useRef({
        onHit: (_acc: number) => { },
        onBreak: () => { },
        onMiss: (_reason?: string) => { },
        onShoot: () => { },
    });

    const accuracyRef = useRef(0);
    const stonesRef = useRef(STONES_PER_LEVEL);
    const levelRef = useRef(1);
    stonesRef.current = stones;
    levelRef.current = level;

    handlers.current.onHit = (acc: number) => {
        accuracyRef.current = acc;
        play(dingRef);
        setFlash(acc > 0.75 ? 'Bullseye! 🎯' : 'Direct hit!');
    };

    handlers.current.onBreak = () => {
        const acc = accuracyRef.current;
        const pts =
            100 +
            Math.round(acc * 100) +
            Math.max(0, stonesRef.current - 1) * 50 +
            levelRef.current * 25;
        setLastPoints(pts);
        setScore((s) => s + pts);
        play(celebrateRef);
        engineRef.current?.setInputEnabled(false);
        setPhase('broke');
    };

    handlers.current.onMiss = (reason?: string) => {
        setStones((n) => {
            const left = n - 1;
            if (left <= 0) {
                play(errorRef);
                engineRef.current?.setInputEnabled(false);
                setPhase('over');
                setFlash('');
            } else {
                setFlash(reason ?? (left === 1 ? 'Last stone!' : 'Missed — try again'));
                setArmed(true);          // next stone loaded, clock restarts
            }
            return Math.max(0, left);
        });
    };

    handlers.current.onShoot = () => {
        setFlash('');
        setArmed(false);                 // no clock while the stone is in the air
    };

    // Build the scene once.
    useEffect(() => {
        const el = mountRef.current;
        if (!el) return;
        const engine = createDahiHandiScene(el, {
            onHit: (a) => handlers.current.onHit(a),
            onBreak: () => handlers.current.onBreak(),
            onMiss: () => handlers.current.onMiss(),
            onShoot: () => handlers.current.onShoot(),
            onAim: (p) => setPower(p),
        });
        engineRef.current = engine;
        return () => {
            engine.dispose();
            engineRef.current = null;
        };
    }, []);

    // Clear the transient "Missed" / "Direct hit" banner.
    useEffect(() => {
        if (!flash) return;
        const t = setTimeout(() => setFlash(''), 1400);
        return () => clearTimeout(t);
    }, [flash]);

    // Shot clock: dithering costs you the stone. Restarts on every fresh stone
    // (armed / stones change) and stops while one is in flight.
    useEffect(() => {
        if (phase !== 'playing' || !armed) return;
        engineRef.current?.setInputEnabled(true);
        let left = SHOT_SECONDS;
        setClock(left);
        const t = setInterval(() => {
            left -= 1;
            setClock(left);
            if (left > 0) return;
            clearInterval(t);
            engineRef.current?.setInputEnabled(false);   // a forfeited stone can't still be thrown
            handlers.current.onMiss('Too slow — stone lost! ⏳');
        }, 1000);
        return () => clearInterval(t);
    }, [phase, armed, stones]);

    // showreel whenever nobody is playing
    useEffect(() => {
        engineRef.current?.setAttract(phase === 'intro' || phase === 'over');
    }, [phase]);

    const start = useCallback(() => {
        setScore(0);
        setLevel(1);
        setStones(STONES_PER_LEVEL);
        setFlash('');
        stonesRef.current = STONES_PER_LEVEL;
        levelRef.current = 1;
        engineRef.current?.setLevel(1);
        engineRef.current?.setInputEnabled(true);
        setArmed(true);
        setPhase('playing');
    }, []);

    const nextLevel = useCallback(() => {
        const n = levelRef.current + 1;
        setLevel(n);
        setStones(STONES_PER_LEVEL);
        levelRef.current = n;
        stonesRef.current = STONES_PER_LEVEL;
        engineRef.current?.setLevel(n);
        engineRef.current?.setInputEnabled(true);
        setArmed(true);
        setPhase('playing');
    }, []);

    // Auto-advance a few seconds after the pot bursts (kiosk friendly).
    useEffect(() => {
        if (phase !== 'broke') return;
        const t = setTimeout(nextLevel, 5400);
        return () => clearTimeout(t);
    }, [phase, nextLevel]);

    // Enter / Space works for menus so it can run on a big screen too. The
    // intro is GameIntro's — it has its own key handling.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (phase !== 'broke') return;
            e.preventDefault();
            nextLevel();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [phase, nextLevel]);

    return (
        <div className="dh-game">
            <div className="dh-canvas" ref={mountRef} />

            <audio ref={dingRef} src="/ding.mp3" preload="auto" />
            <audio ref={celebrateRef} src="/celebration_effect.mp3" preload="auto" />
            <audio ref={errorRef} src="/error.mp3" preload="auto" />

            {/* The attract screen carries its own Back button. */}
            {phase !== 'intro' && (
                <button className="dh-back-btn" onClick={onBack} aria-label="Back to home">← Back</button>
            )}

            {phase === 'playing' && (
                <>
                    <div className="dh-hud">
                        <div className="dh-hud-item">Level {level}</div>
                        <div className="dh-hud-item dh-score">{score} pts</div>
                        <div className={`dh-hud-item dh-clock${clock <= 3 ? ' low' : ''}`}>⏳ {clock}s</div>
                        <div className="dh-hud-item dh-stones">
                            {Array.from({ length: STONES_PER_LEVEL }, (_, i) => (
                                <span key={i} className={i < stones ? 'dh-stone' : 'dh-stone used'}>🪨</span>
                            ))}
                        </div>
                    </div>

                    <div className="dh-power-wrap" aria-hidden="true">
                        <div className="dh-power-track">
                            <div className="dh-power-fill" style={{ height: `${power * 100}%` }} />
                        </div>
                        <span className="dh-power-label">Pull</span>
                    </div>

                    <p className="dh-hint">Drag down &amp; back to stretch the sling — release to throw 🎯</p>
                    {flash && <div className="dh-flash">{flash}</div>}
                </>
            )}

            {/* The 3D showreel keeps playing behind this — hence `overlay`. */}
            {phase === 'intro' && (
                <GameIntro
                    gameId="dahi-handi"
                    emoji="🫙"
                    title="Dahi Handi"
                    tagline="Draw the sling, judge the arc, and burst the pot of makhan."
                    hints={[
                        '🎯 Drag down & back to stretch the sling, release to throw',
                        '🪨 Three stones a level, 10 seconds a shot',
                        '📏 The cord grows longer every round',
                        '🌬️ A draught pushes every throw off line — allow for it',
                    ]}
                    ctaLabel="Take the Shot 🙏"
                    overlay
                    onStart={start}
                    onBack={onBack}
                />
            )}

            {phase === 'over' && (
                <GameResultPanel
                    gameId="dahi-handi"
                    gameTitle="Dahi Handi 3D"
                    headline="Out of Stones!"
                    subline="The handi still swings — Krishna took many tries too."
                    score={score}
                    won={false}
                    stats={[{ label: 'Level Reached', value: level }]}
                    playAgainLabel="Throw Again"
                    onPlayAgain={start}
                    onBack={onBack}
                />
            )}

            {phase === 'broke' && (
                <div className="dh-overlay dh-overlay-light">
                    <div className="dh-panel dh-panel-win">
                        <div className="dh-emoji">🎉</div>
                        <h2 className="dh-title">Handi Phod!</h2>
                        <p className="dh-text">The pot bursts and the makhan spills — Krishna is delighted.</p>
                        <div className="dh-points">+{lastPoints} pts</div>
                        <button className="dh-primary-btn" onClick={nextLevel}>Level {level + 1} →</button>
                    </div>
                </div>
            )}

        </div>
    );
};

export default DahiHandiGame;
