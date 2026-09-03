import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './YudhishtiraQuestGame.css';
import questionsData from './questions.json';
import { GameIntro, GameResultPanel } from '../../leaderboard';

const backgroundImage = '/yudhistir_quest_BG.png';

const backgroundStyle = {
    backgroundImage: `linear-gradient(135deg, rgba(15, 20, 25, 0.8) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.8) 100%), url('${backgroundImage}')`,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
    backgroundRepeat: 'no-repeat' as const
};

const gameBackgroundStyle = {
    backgroundImage: `url('${backgroundImage}')`,
    backgroundSize: 'cover' as const,
    backgroundPosition: 'center' as const,
    backgroundRepeat: 'no-repeat' as const
};

interface YudhishtiraQuestGameProps {
    onBack: () => void;
}

interface Question {
    question: string;
    options: string[];
    correctAnswerIndex: number;
    explanation: string;
}

const YudhishtiraQuestGame: React.FC<YudhishtiraQuestGameProps> = ({ onBack }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const errorAudioRef = useRef<HTMLAudioElement>(null);
    const successAudioRef = useRef<HTMLAudioElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [gameState, setGameState] = useState<'intro' | 'intro_video' | 'game' | 'win_video' | 'win_end' | 'lose_end'>('intro');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);
    const [isTimerActive, setIsTimerActive] = useState(false);
    const [finalScore, setFinalScore] = useState(0);
    const gameStartTimeRef = useRef<number | null>(null);
    const errorCountRef = useRef<number>(0);
    const resultSavedRef = useRef(false);
    const totalTimeRemainingRef = useRef<number>(0);


    const questions = useMemo<Question[]>(() => {
        // Shuffle the questions array and take only 6 questions
        const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 6);
    }, []);

    const startGame = () => {
        gameStartTimeRef.current = null;
        errorCountRef.current = 0;
        totalTimeRemainingRef.current = 0;
        resultSavedRef.current = false;

        setCurrentQuestionIndex(0);
        setCorrectAnswers(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setTimeLeft(15);

        setGameState('intro_video');
    };

    const handleVideoEnd = useCallback(() => {
        if (gameState === 'intro_video') {
            gameStartTimeRef.current = Date.now();
    
            errorCountRef.current = 0;
            totalTimeRemainingRef.current = 0;
            resultSavedRef.current = false;
    
            setCurrentQuestionIndex(0);
            setCorrectAnswers(0);
            setSelectedAnswer(null);
            setShowExplanation(false);
            setTimeLeft(15);
    
            setGameState('game');
        } else if (gameState === 'win_video') {
            setGameState('win_end');
        }
    }, [gameState]);

    const skipVideo = () => {
        if (videoRef.current) {
            videoRef.current.pause();
        }
        handleVideoEnd();
    };

    /**
     * Works out the run's score. Recording it is the result panel's job — this
     * only has to be right, and only once per run.
     *
     * SCORE FORMULA
     *   correct answer     +100
     *   each unused second  +10
     *   each error           -5
     *   floored at 0
     */
    const finishGame = useCallback((finalCorrectAnswers: number) => {
        if (resultSavedRef.current) return;
        resultSavedRef.current = true;

        const score = Math.max(
            0,
            finalCorrectAnswers * 100 +
                totalTimeRemainingRef.current * 10 -
                errorCountRef.current * 5
        );

        setFinalScore(score);
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsTimerActive(false);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, []);

    const startTimer = useCallback(() => {
        // Always clear any existing timer first
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    
        // Every question starts with exactly 15 seconds
        setTimeLeft(15);
        setIsTimerActive(true);
    
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
    
            audioRef.current.play().catch(() => {
                // Audio may be blocked by browser autoplay policy.
            });
        }
    
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    // Stop timer
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
    
                    setIsTimerActive(false);
    
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                    }
    
                    // Time expired = one error
                    errorCountRef.current += 1;
    
                    // No remaining time is added
                    setSelectedAnswer(-1);
                    setShowExplanation(true);
    
                    if (errorAudioRef.current) {
                        errorAudioRef.current.currentTime = 0;
    
                        errorAudioRef.current.play().catch(() => {
                            // Ignore audio errors
                        });
                    }
    
                    // Give player time to read explanation
                    setTimeout(() => {
                        if (
                            currentQuestionIndex <
                            questions.length - 1
                        ) {
                            setCurrentQuestionIndex(
                                (prevIndex) =>
                                    prevIndex + 1
                            );
    
                            setSelectedAnswer(null);
                            setShowExplanation(false);
    
                            // New question gets a fresh 15 seconds
                            setTimeLeft(15);
                        } else {
                            // Last question timed out
                            finishGame(correctAnswers);

                            setGameState('lose_end');
                        }
                    }, 5000);
    
                    return 0;
                }
    
                return prev - 1;
            });
        }, 1000);
    }, [
        currentQuestionIndex,
        questions.length,
        correctAnswers,
        finishGame
    ]);

    const handleAnswerSelect = useCallback(
        (answerIndex: number) => {
            if (
                selectedAnswer !== null ||
                !isTimerActive
            ) {
                return;
            }
    
            // Save this question's remaining time
            totalTimeRemainingRef.current += timeLeft;
    
            // Stop this question's timer
            stopTimer();
    
            const isCorrect =
                answerIndex ===
                questions[currentQuestionIndex]
                    .correctAnswerIndex;
    
            setSelectedAnswer(answerIndex);
            setShowExplanation(true);
    
            if (isCorrect) {
                setCorrectAnswers(
                    (prev) => prev + 1
                );
    
                if (successAudioRef.current) {
                    successAudioRef.current.currentTime = 0;
    
                    successAudioRef.current
                        .play()
                        .catch(() => {});
                }
            } else {
                // Wrong answer = one error
                errorCountRef.current += 1;
    
                if (errorAudioRef.current) {
                    errorAudioRef.current.currentTime = 0;
    
                    errorAudioRef.current
                        .play()
                        .catch(() => {});
                }
            }
    
            setTimeout(() => {
                if (
                    currentQuestionIndex <
                    questions.length - 1
                ) {
                    // Go to next question
                    setCurrentQuestionIndex(
                        (prevIndex) =>
                            prevIndex + 1
                    );
    
                    setSelectedAnswer(null);
                    setShowExplanation(false);
    
                    // Timer will be restarted by useEffect
                    setTimeLeft(15);
                } else {
                    // Include the current answer
                    // because setCorrectAnswers is async
                    const finalCorrectAnswers =
                        correctAnswers +
                        (isCorrect ? 1 : 0);
    
                    finishGame(finalCorrectAnswers);

                    setGameState(
                        finalCorrectAnswers === questions.length
                            ? 'win_video'
                            : 'lose_end'
                    );
                }
            }, 5000);
        },
        [
            questions,
            currentQuestionIndex,
            correctAnswers,
            selectedAnswer,
            isTimerActive,
            timeLeft,
            stopTimer,
            finishGame
        ]
    );

    const restartGame = () => {
        stopTimer();

        setGameState('intro');

        setCurrentQuestionIndex(0);
        setCorrectAnswers(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setTimeLeft(15);
        setIsTimerActive(false);
        setFinalScore(0);

        errorCountRef.current = 0;
        totalTimeRemainingRef.current = 0;
        resultSavedRef.current = false;
        gameStartTimeRef.current = null;
    };

    // Video handling
    useEffect(() => {
        if ((gameState === 'intro_video' || gameState === 'win_video') && videoRef.current) {
            const video = videoRef.current;
            video.currentTime = 0;

            const handleEnded = () => {
                handleVideoEnd();
            };

            video.addEventListener('ended', handleEnded);
            video.play().catch(() => {
                handleVideoEnd();
            });

            return () => {
                video.removeEventListener('ended', handleEnded);
            };
        }
    }, [gameState, handleVideoEnd]);

    // Timer and question handling
    useEffect(() => {
        if (
            gameState === 'game' &&
            selectedAnswer === null &&
            !showExplanation
        ) {
            startTimer();
        }
    
        return () => {
            stopTimer();
        };
    }, [
        gameState,
        currentQuestionIndex,
        selectedAnswer,
        showExplanation,
        startTimer,
        stopTimer
    ]);
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopTimer();
        };
    }, [stopTimer]);


    const renderVideoScreen = (videoSrc: string, skipText: string) => (
        <div className="yudhishtira-quest-game">
            <button onClick={onBack} className="back-btn-corner">← Back</button>
            <div className="video-screen">
                <video
                    ref={videoRef}
                    className="intro-video"
                    preload="auto"
                    autoPlay
                    playsInline
                >
                    <source src={videoSrc} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
                <button onClick={skipVideo} className="skip-video-btn">
                    {skipText}
                </button>
            </div>
        </div>
    );

    if (gameState === 'intro') {
        return (
            <div className="yudhishtira-quest-game yudhishtira-intro" style={backgroundStyle}>
                {/* The quest's own opening film, muted and looping, over the
                    scene art — the attract screen is the game's own footage.
                    `videoRef` is left alone: it belongs to the real playback. */}
                <video
                    className="yud-attract-video"
                    src="/yudhisthir_quest_start.mp4"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden="true"
                />
                <GameIntro
                    gameId="yudhishtira-quest"
                    emoji="👑"
                    title="Yudhishthira's Quest"
                    tagline="The Pandava brothers lie unconscious by the lake, cursed by Dharmaraj. Answer truthfully and wisely — their lives depend on it."
                    hints={[
                        '👑 Dharmaraj asks; you answer for all five brothers',
                        '⏱ 15 seconds a question — every second you save is points',
                        '📜 Each answer comes with the story behind it',
                        '🏹 Six questions stand between you and their lives',
                    ]}
                    ctaLabel="Begin the Quest"
                    /* The film behind is the showreel — nothing over it. */
                    overlay
                    onStart={startGame}
                    onBack={onBack}
                />
            </div>
        );
    }

    if (gameState === 'intro_video') {
        return renderVideoScreen('/yudhisthir_quest_start.mp4', 'Skip to Game');
    }

    if (gameState === 'game') {
        const currentQuestion = questions[currentQuestionIndex];

        return (
            <div className="yudhishtira-quest-game game-active" style={gameBackgroundStyle}>
                <button onClick={onBack} className="back-btn-corner">← Back</button>

                {/* Audio element for timer */}
                <audio ref={audioRef} loop>
                    <source src="/game_audio.mp3" type="audio/mpeg" />
                </audio>

                {/* Audio element for error sound */}
                <audio ref={errorAudioRef}>
                    <source src="/error.mp3" type="audio/mpeg" />
                </audio>

                {/* Audio element for success sound */}
                <audio ref={successAudioRef}>
                    <source src="/ding.mp3" type="audio/mpeg" />
                </audio>

                <div className="yud-game-header">
                    <div className="progress-text">Question {currentQuestionIndex + 1} of {questions.length}</div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Timer display */}
                <div className="timer-container">
                    <div className={`timer ${timeLeft <= 3 ? 'timer-warning' : ''}`}>
                        {timeLeft}s
                    </div>
                </div>

                <div className="dharmaraj-image">👑</div>

                <div className="game-ui">
                    <div className="question-box">
                        {currentQuestion.question}
                    </div>

                    <div className="options-container">
                        {currentQuestion.options.map((option, index) => (
                            <button
                                key={index}
                                className={`option-button ${selectedAnswer !== null
                                    ? index === currentQuestion.correctAnswerIndex
                                        ? 'correct'
                                        : index === selectedAnswer && selectedAnswer !== -1
                                            ? 'incorrect'
                                            : ''
                                    : ''
                                    }`}
                                onClick={() => handleAnswerSelect(index)}
                                disabled={selectedAnswer !== null || !isTimerActive}
                            >
                                {option}
                            </button>
                        ))}
                    </div>

                    {showExplanation && (
                        <div className={`message-box ${selectedAnswer === currentQuestion.correctAnswerIndex ? 'success' : 'failure'}`}>
                            {selectedAnswer === -1 ? 'Time\'s up! ' : ''}{currentQuestion.explanation}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    /*
     * The closing film and the board share one screen. Rendering the panel from
     * a single branch across all three end states matters: a separate `if` per
     * state would remount it when the film finishes, which would restart the
     * score count-up and record the run a second time.
     */
    if (gameState === 'win_video' || gameState === 'win_end' || gameState === 'lose_end') {
        const won = gameState !== 'lose_end';
        const filmPlaying = gameState === 'win_video';

        return (
            <>
                {filmPlaying && (
                    <div className="video-screen yud-result-film">
                        <video
                            ref={videoRef}
                            className="intro-video"
                            preload="auto"
                            autoPlay
                            playsInline
                        >
                            <source src="/YudhistirQuest_Won.mp4" type="video/mp4" />
                        </video>
                    </div>
                )}
                <GameResultPanel
                    gameId="yudhishtira-quest"
                    gameTitle="Yudhishthira's Quest"
                    headline={won ? 'Victory!' : 'Defeat'}
                    subline={
                        won
                            ? `You helped Yudhishthira Maharaj get his brothers back — ${correctAnswers} of ${questions.length} answered correctly.`
                            : `Wisdom was not sufficient to save the Pandava brothers — ${correctAnswers} of ${questions.length} answered correctly.`
                    }
                    score={finalScore}
                    won={won}
                    stats={[
                        { label: 'Correct', value: `${correctAnswers}/${questions.length}` },
                        { label: 'Time Saved', value: `${totalTimeRemainingRef.current}s` },
                    ]}
                    playAgainLabel={won ? 'Play Again' : 'Try Again'}
                    overlay={filmPlaying}
                    onPlayAgain={restartGame}
                    onBack={onBack}
                />
            </>
        );
    }

    return null;
};

export default YudhishtiraQuestGame;