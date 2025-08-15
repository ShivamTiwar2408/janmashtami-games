import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './YudhishtiraQuestGame.css';
import questionsData from './questions.json';

const backgroundImage = '/yudhistir_quest_BG.png';
const victoryBackgroundImage = '/Yudhishtir_quest_victory_BG.png';

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

const victoryBackgroundStyle = {
    backgroundImage: `linear-gradient(135deg, rgba(15, 20, 25, 0.6) 0%, rgba(26, 26, 46, 0.6) 50%, rgba(22, 33, 62, 0.6) 100%), url('${victoryBackgroundImage}')`,
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
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [gameState, setGameState] = useState<'intro' | 'intro_video' | 'game' | 'win_video' | 'win_end' | 'lose_end'>('intro');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showExplanation, setShowExplanation] = useState(false);
    const [timeLeft, setTimeLeft] = useState(10);
    const [isTimerActive, setIsTimerActive] = useState(false);

    const questions = useMemo<Question[]>(() => {
        // Shuffle the questions array and take only 8 questions
        const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, 8);
    }, []);

    const startGame = () => {
        setGameState('intro_video');
    };

    const handleVideoEnd = useCallback(() => {
        if (gameState === 'intro_video') {
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
        setTimeLeft(10);
        setIsTimerActive(true);

        // Start audio
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {
                // Audio play failed, continue without audio
            });
        }

        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // Time's up - treat as wrong answer
                    setSelectedAnswer(-1); // Use -1 to indicate timeout
                    setShowExplanation(true);

                    setTimeout(() => {
                        if (currentQuestionIndex < questions.length - 1) {
                            setCurrentQuestionIndex(prev => prev + 1);
                            setSelectedAnswer(null);
                            setShowExplanation(false);
                        } else {
                            // Game finished
                            if (correctAnswers === questions.length) {
                                setGameState('win_video');
                            } else {
                                setGameState('lose_end');
                            }
                        }
                    }, 3000);

                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [currentQuestionIndex, questions.length, correctAnswers]);

    const handleAnswerSelect = useCallback((answerIndex: number) => {
        if (selectedAnswer !== null || !isTimerActive) return;

        stopTimer();

        const isCorrect = answerIndex === questions[currentQuestionIndex].correctAnswerIndex;
        setSelectedAnswer(answerIndex);
        setShowExplanation(true);

        if (isCorrect) {
            setCorrectAnswers(prev => prev + 1);
        }

        setTimeout(() => {
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex(prev => prev + 1);
                setSelectedAnswer(null);
                setShowExplanation(false);
            } else {
                // Game finished - check results
                const finalScore = correctAnswers + (isCorrect ? 1 : 0);
                if (finalScore === questions.length) {
                    // All questions must be correct to win
                    setGameState('win_video');
                } else {
                    setGameState('lose_end');
                }
            }
        }, 3000);
    }, [questions, currentQuestionIndex, correctAnswers, selectedAnswer, isTimerActive, stopTimer]);

    const restartGame = () => {
        stopTimer();
        setGameState('intro');
        setCurrentQuestionIndex(0);
        setCorrectAnswers(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setTimeLeft(10);
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
        if (gameState === 'game' && selectedAnswer === null && !showExplanation) {
            startTimer();
        }

        return () => {
            stopTimer();
        };
    }, [gameState, currentQuestionIndex, selectedAnswer, showExplanation, startTimer, stopTimer]);

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
                <button onClick={onBack} className="back-btn-corner">← Back</button>
                <div className="intro-screen">
                    <h1 className="intro-title">Yudhishthira's Quest</h1>
                    <p className="intro-text">
                        The Pandava brothers lie unconscious by the tranquil lake, cursed by Dharmaraj.
                        Help Yudhishthira Maharaj get his brothers back. Answer the questions truthfully and wisely,
                        for the life of the Pandava brothers depends on it!
                    </p>
                    <button onClick={startGame} className="start-button">Begin Quest</button>
                </div>
            </div>
        );
    }

    if (gameState === 'intro_video') {
        return renderVideoScreen('/yudhisthir_quest_start.mp4', 'Skip to Game');
    }

    if (gameState === 'win_video') {
        return renderVideoScreen('/YudhistirQuest_Won.mp4', 'Skip to Results');
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

    if (gameState === 'win_end') {
        return (
            <div className="yudhishtira-quest-game yudhishtira-end yudhishtira-victory" style={victoryBackgroundStyle}>
                <button onClick={onBack} className="back-btn-corner">← Back</button>

                {/* Poppers Animation */}
                <div className="poppers-container">
                    {Array.from({ length: 20 }, (_, i) => (
                        <div
                            key={i}
                            className="popper"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }}
                        >
                            🎉
                        </div>
                    ))}
                    {Array.from({ length: 15 }, (_, i) => (
                        <div
                            key={`confetti-${i}`}
                            className="popper"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }}
                        >
                            🎊
                        </div>
                    ))}
                    {Array.from({ length: 10 }, (_, i) => (
                        <div
                            key={`star-${i}`}
                            className="popper"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }}
                        >
                            ⭐
                        </div>
                    ))}
                </div>

                <div className="end-screen victory-popup">
                    <h1 className="end-message victory-title">Victory!</h1>
                    <p className="end-summary victory-text">Congratulations! You helped Yudhishthira Maharaj get his brothers back. You answered {correctAnswers} out of {questions.length} questions correctly.</p>
                    <div className="end-actions">
                        <button onClick={restartGame} className="restart-button victory-button">Play Again</button>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'lose_end') {
        return (
            <div className="yudhishtira-quest-game yudhishtira-end" style={backgroundStyle}>
                <button onClick={onBack} className="back-btn-corner">← Back</button>
                <div className="end-screen">
                    <h1 className="end-message">Defeat</h1>
                    <p className="end-summary">Wisdom was not sufficient to save the Pandava brothers. You answered {correctAnswers} out of {questions.length} questions correctly.</p>
                    <div className="end-actions">
                        <button onClick={restartGame} className="restart-button">Try Again</button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export default YudhishtiraQuestGame;