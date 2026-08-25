import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createDahiHandiScene, DahiHandiEngine } from './scene';
import './DahiHandiGame.css';

interface DahiHandiGameProps {
    onBack: () => void;
}

const STONES_PER_LEVEL = 3;
const SHOT_SECONDS = 10;   // hold a stone longer than this and it's forfeit
const BEST_KEY = 'dahiHandiBest';

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
    const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY) || 0));

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

    useEffect(() => {
        if (score > best) {
            setBest(score);
            localStorage.setItem(BEST_KEY, String(score));
        }
    }, [score, best]);

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

    // Enter / Space works for menus so it can run on a big screen too.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            if (phase === 'intro' || phase === 'over') {
                e.preventDefault();
                start();
            } else if (phase === 'broke') {
                e.preventDefault();
                nextLevel();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [phase, start, nextLevel]);

    return (
        <div className="dh-game">
            <div className="dh-canvas" ref={mountRef} />

            <audio ref={dingRef} src="/ding.mp3" preload="auto" />
            <audio ref={celebrateRef} src="/celebration_effect.mp3" preload="auto" />
            <audio ref={errorRef} src="/error.mp3" preload="auto" />

            <button className="dh-back-btn" onClick={onBack} aria-label="Back to home">← Back</button>

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

            {/* out of stones drops straight back onto the showreel — same bar, run's tally in it */}
            {(phase === 'intro' || phase === 'over') && (
                <div className="dh-overlay dh-overlay-attract">
                    <div className="dh-demo-tag"><span className="dh-demo-dot" />Demo playing — take the sling</div>
                    <div className="dh-attract-bar">
                        <div>
                            <h1 className="dh-title dh-title-sm">
                                {phase === 'over' ? 'Out of Stones!' : 'Dahi Handi — Break the Makhan Pot'}
                            </h1>
                            <p className="dh-attract-line">
                                {phase === 'over' ? (
                                    <>
                                        You reached <strong>level {level}</strong> with <strong>{score} pts</strong> —
                                        the handi still swings. Krishna took many tries too.
                                    </>
                                ) : (
                                    <>
                                        Drag <strong>down &amp; back</strong> and release · 3 stones a level · 10s a
                                        shot · the cord grows longer every round · a draught pushes every throw off line
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="dh-attract-cta">
                            <button className="dh-primary-btn dh-cta" onClick={start}>
                                {phase === 'over' ? 'Throw Again 🙏' : 'Take the Shot 🙏'}
                            </button>
                            {best > 0 && <p className="dh-best">Best: {best} pts</p>}
                        </div>
                    </div>
                </div>
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
