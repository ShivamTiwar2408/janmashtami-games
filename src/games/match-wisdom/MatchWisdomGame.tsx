import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './MatchWisdomGame.css';
import wisdomData from './wisdom-data.json';
import { GameIntro, GameResultPanel } from '../../leaderboard';

interface MatchWisdomGameProps {
    onBack: () => void;
}

interface Option {
    verse: string;
    reference: string;
    correct: boolean;
}

interface Round {
    situation: string;
    icon: string;
    options: Option[];
    teaching: string;
}

const ROUND_TIME = 20; // seconds per situation
const REGISTER_URL = 'https://janmashtami-games.vercel.app/';

// Fisher-Yates shuffle (returns a new array)
function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const MatchWisdomGame: React.FC<MatchWisdomGameProps> = ({ onBack }) => {
    const [gameState, setGameState] = useState<'intro' | 'playing' | 'reveal' | 'end'>('intro');
    const [rounds, setRounds] = useState<Round[]>([]);
    const [roundIndex, setRoundIndex] = useState(0);
    const [shuffledOptions, setShuffledOptions] = useState<Option[]>([]);
    const [focusIndex, setFocusIndex] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);

    const successAudioRef = useRef<HTMLAudioElement>(null);
    const errorAudioRef = useRef<HTMLAudioElement>(null);
    const dingAudioRef = useRef<HTMLAudioElement>(null);

    const totalRounds = rounds.length;
    const currentRound = rounds[roundIndex];

    const playSound = useCallback((ref: React.RefObject<HTMLAudioElement | null>) => {
        const el = ref.current;
        if (!el) return;
        el.currentTime = 0;
        el.play().catch(() => { /* autoplay may be blocked; ignore */ });
    }, []);

    const setupRound = useCallback((rnds: Round[], idx: number) => {
        const round = rnds[idx];
        if (!round) return;
        setShuffledOptions(shuffle(round.options));
        setFocusIndex(0);
        setSelectedIndex(null);
        setTimeLeft(ROUND_TIME);
    }, []);

    const startGame = useCallback(() => {
        const shuffledRounds = shuffle(wisdomData.rounds as Round[]);
        setRounds(shuffledRounds);
        setRoundIndex(0);
        setScore(0);
        setStreak(0);
        setBestStreak(0);
        setupRound(shuffledRounds, 0);
        setGameState('playing');
    }, [setupRound]);

    const lockAnswer = useCallback((idx: number) => {
        if (gameState !== 'playing') return;
        setSelectedIndex(idx);
        const chosen = shuffledOptions[idx];
        const isCorrect = !!chosen?.correct;
        if (isCorrect) {
            const timeBonus = Math.max(0, timeLeft) * 5;
            const points = 100 + timeBonus;
            setScore((s) => s + points);
            setStreak((st) => {
                const next = st + 1;
                setBestStreak((b) => Math.max(b, next));
                return next;
            });
            playSound(successAudioRef);
        } else {
            setStreak(0);
            playSound(errorAudioRef);
        }
        setGameState('reveal');
    }, [gameState, shuffledOptions, timeLeft, playSound]);

    const handleTimeout = useCallback(() => {
        if (gameState !== 'playing') return;
        setSelectedIndex(-1); // -1 = timed out, no selection
        setStreak(0);
        playSound(errorAudioRef);
        setGameState('reveal');
    }, [gameState, playSound]);

    const nextRound = useCallback(() => {
        const next = roundIndex + 1;
        if (next >= totalRounds) {
            playSound(dingAudioRef);
            setGameState('end');
        } else {
            setRoundIndex(next);
            setupRound(rounds, next);
            setGameState('playing');
        }
    }, [roundIndex, totalRounds, rounds, setupRound, playSound]);

    // Countdown timer during play
    useEffect(() => {
        if (gameState !== 'playing') return;
        if (timeLeft <= 0) {
            handleTimeout();
            return;
        }
        const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
        return () => clearTimeout(t);
    }, [gameState, timeLeft, handleTimeout]);

    // Keyboard / remote controls
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const key = e.key;
            // 'intro' and 'end' are owned by GameIntro / GameResultPanel — both
            // have their own Enter handling and a form to type into.
            if (gameState === 'intro' || gameState === 'end') return;
            if (gameState === 'playing') {
                const count = shuffledOptions.length;
                if (key === 'ArrowUp' || key === 'ArrowLeft') {
                    e.preventDefault();
                    setFocusIndex((i) => (i - 1 + count) % count);
                } else if (key === 'ArrowDown' || key === 'ArrowRight') {
                    e.preventDefault();
                    setFocusIndex((i) => (i + 1) % count);
                } else if (key >= '1' && key <= '9') {
                    const n = parseInt(key, 10) - 1;
                    if (n < count) { e.preventDefault(); lockAnswer(n); }
                } else if (key === 'Enter' || key === ' ') {
                    e.preventDefault();
                    lockAnswer(focusIndex);
                }
                return;
            }
            if (gameState === 'reveal') {
                if (key === 'Enter' || key === ' ' || key === 'ArrowRight') { e.preventDefault(); nextRound(); }
                return;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [gameState, shuffledOptions.length, focusIndex, startGame, lockAnswer, nextRound]);

    const correctOptionIndex = useMemo(
        () => shuffledOptions.findIndex((o) => o.correct),
        [shuffledOptions]
    );

    return (
        <div className="mw-game">
            <audio ref={successAudioRef} src="/ding.mp3" preload="auto" />
            <audio ref={errorAudioRef} src="/error.mp3" preload="auto" />
            <audio ref={dingAudioRef} src="/celebration_effect.mp3" preload="auto" />

            {/* The attract screen carries its own Back button. */}
            {gameState !== 'intro' && (
                <button className="mw-back-btn" onClick={onBack} aria-label="Back to home">← Back</button>
            )}

            {/* INTRO */}
            {gameState === 'intro' && (
                <GameIntro
                    gameId="match-wisdom"
                    emoji="🪷"
                    title="Match the Wisdom"
                    tagline="A real-life feeling appears on screen — choose the Bhagavad Gita verse that answers it."
                    hints={[
                        '🪷 Read the situation, then pick the verse that speaks to it',
                        '⬆︎⬇︎ / ⬅︎➡︎ to move, 1–3 to quick-pick, Enter to lock in',
                        '🔥 Answer in a row to build a streak bonus',
                        '⏱ Every second left on the clock is worth points',
                    ]}
                    ctaLabel="Begin ✨"
                    onStart={startGame}
                    onBack={onBack}
                />
            )}

            {/* PLAYING */}
            {gameState === 'playing' && currentRound && (
                <div className="mw-play">
                    <div className="mw-hud">
                        <div className="mw-hud-item">Round {roundIndex + 1}/{totalRounds}</div>
                        <div className="mw-hud-item mw-score">Score {score}</div>
                        <div className={`mw-hud-item mw-timer ${timeLeft <= 5 ? 'mw-timer-low' : ''}`}>⏱ {timeLeft}s</div>
                        {streak >= 2 && <div className="mw-hud-item mw-streak">🔥 {streak} streak</div>}
                    </div>

                    <div className="mw-situation">
                        <span className="mw-situation-icon">{currentRound.icon}</span>
                        <p className="mw-situation-text">"{currentRound.situation}"</p>
                        <p className="mw-prompt">Which verse speaks to this?</p>
                    </div>

                    <div className="mw-options">
                        {shuffledOptions.map((opt, i) => (
                            <button
                                key={i}
                                className={`mw-option ${i === focusIndex ? 'mw-focused' : ''}`}
                                onMouseEnter={() => setFocusIndex(i)}
                                onClick={() => lockAnswer(i)}
                            >
                                <span className="mw-option-num">{i + 1}</span>
                                <span className="mw-option-verse">"{opt.verse}"</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* REVEAL */}
            {gameState === 'reveal' && currentRound && (
                <div className="mw-reveal">
                    {(() => {
                        const gotItRight = selectedIndex === correctOptionIndex;
                        const correctOpt = shuffledOptions[correctOptionIndex];
                        return (
                            <>
                                <div className={`mw-verdict ${gotItRight ? 'mw-right' : 'mw-wrong'}`}>
                                    {gotItRight ? '🎉 Perfectly matched!' : selectedIndex === -1 ? '⏱ Time\'s up!' : '💡 Not quite'}
                                </div>
                                <div className="mw-situation-recap">
                                    <span className="mw-situation-icon">{currentRound.icon}</span>
                                    <span>"{currentRound.situation}"</span>
                                </div>
                                <div className="mw-answer-card">
                                    <p className="mw-answer-verse">"{correctOpt?.verse}"</p>
                                    <p className="mw-answer-ref">— {correctOpt?.reference}</p>
                                </div>
                                <p className="mw-teaching">{currentRound.teaching}</p>
                                <button className="mw-primary-btn" onClick={nextRound}>
                                    {roundIndex + 1 >= totalRounds ? 'See Results →' : 'Next Situation →'}
                                </button>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* END */}
            {gameState === 'end' && (
                <GameResultPanel
                    gameId="match-wisdom"
                    gameTitle="Match the Wisdom"
                    headline="Wisdom Complete"
                    subline="Every verse you matched is Krishna's counsel for a real moment in your day."
                    score={score}
                    stats={[
                        { label: 'Best Streak', value: `🔥 ${bestStreak}` },
                        { label: 'Rounds', value: totalRounds },
                    ]}
                    onPlayAgain={startGame}
                    onBack={onBack}
                >
                    <div className="mw-qr-row">
                        <img
                            className="mw-qr"
                            alt="Scan to get daily wisdom"
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(REGISTER_URL)}`}
                        />
                        <span className="mw-qr-label">
                            Get a daily Gita verse on WhatsApp — scan to sign up 🙏
                        </span>
                    </div>
                </GameResultPanel>
            )}
        </div>
    );
};

export default MatchWisdomGame;
