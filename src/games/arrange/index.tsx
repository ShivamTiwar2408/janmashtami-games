import React, { useEffect, useRef, useState } from 'react';
import Muuri from 'muuri';
import './ArrangeGame.css';

interface ArrangeGameProps {
    onBack: () => void;
}

interface LilaStory {
    id: string;
    image: string;
    title: string;
    order: number;
}

const krishnaLilaStories: LilaStory[] = [
    { id: 'birth', image: '/krishna_lila/krishna_birth.png', title: 'Krishna\'s Birth', order: 1 },
    { id: 'vasudeva', image: '/krishna_lila/vasude_carries_krishna.png', title: 'Vasudeva Carries Krishna', order: 2 },
    { id: 'damodar', image: '/krishna_lila/damodar_lila.jpg', title: 'Damodar Lila', order: 3 },
    { id: 'kalia', image: '/krishna_lila/krishna_kills_kalia.png', title: 'Krishna Defeats Kaliya', order: 4 },
    { id: 'govardhan', image: '/krishna_lila/krishna_lifts_govardhan.png', title: 'Lifting Govardhan Hill', order: 5 },
    { id: 'brahma', image: '/krishna_lila/krishna_humbles_bramha.png', title: 'Krishna Humbles Brahma', order: 6 },
    { id: 'gurukul', image: '/krishna_lila/krishna_goes_to_gurukul.png', title: 'Going to Gurukul', order: 7 },
    { id: 'kamsa', image: '/krishna_lila/krishna_kills_kamsa.png', title: 'Defeating Kamsa', order: 8 },
    { id: 'leaves', image: '/krishna_lila/krishna_leaves_vrindavan.png', title: 'Leaving Vrindavan', order: 9 }
];

const ArrangeGame: React.FC<ArrangeGameProps> = ({ onBack }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const muuriRef = useRef<Muuri | null>(null);
    const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
    const [timeLeft, setTimeLeft] = useState(60);
    const [shuffledStories, setShuffledStories] = useState<LilaStory[]>([]);

    // Shuffle array function
    const shuffleArray = (array: LilaStory[]) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Initialize game
    useEffect(() => {
        const shuffled = shuffleArray(krishnaLilaStories);
        setShuffledStories(shuffled);
    }, []);

    // Initialize Muuri grid
    useEffect(() => {
        if (!gridRef.current || shuffledStories.length === 0) return;

        muuriRef.current = new Muuri(gridRef.current, {
            items: '.tile',
            dragEnabled: true,
            layout: {
                fillGaps: false,
                horizontal: false,
                alignRight: false,
                alignBottom: false,
                rounding: true
            }
        });

        // Refresh layout after initialization
        setTimeout(() => {
            if (muuriRef.current) {
                muuriRef.current.refreshItems();
                muuriRef.current.layout();
            }
        }, 200);

        return () => {
            if (muuriRef.current) {
                muuriRef.current.destroy();
            }
        };

    }, [shuffledStories]);

    // Timer effect
    useEffect(() => {
        if (gameState !== 'playing') return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    setGameState('lost');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);

    // Check win condition
    const checkWinCondition = React.useCallback(() => {
        if (!muuriRef.current) return;

        const items = muuriRef.current.getItems();
        const currentOrder = items.map(item => {
            const element = item.getElement();
            return element?.getAttribute('data-id');
        });

        const correctOrder = krishnaLilaStories
            .sort((a, b) => a.order - b.order)
            .map(story => story.id);

        const isCorrect = currentOrder.every((id, index) => id === correctOrder[index]);

        if (isCorrect && gameState === 'playing') {
            setGameState('won');
        }
    }, [gameState]);

    // Add event listener for drag end
    useEffect(() => {
        if (!muuriRef.current) return;

        const handleDragEnd = () => {
            setTimeout(checkWinCondition, 100);
        };

        muuriRef.current.on('dragEnd', handleDragEnd);

        return () => {
            if (muuriRef.current) {
                muuriRef.current.off('dragEnd', handleDragEnd);
            }
        };
    }, [gameState, checkWinCondition]);

    const resetGame = () => {
        setGameState('playing');
        setTimeLeft(60);
        const shuffled = shuffleArray(krishnaLilaStories);
        setShuffledStories(shuffled);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="arrange-game">
            <div className="game-header">
                <button className="back-button" onClick={onBack}>
                    ← Back to Games
                </button>
                <div className="game-info">
                    <h1>Krishna's Life Story</h1>
                    <p>Arrange the tiles in chronological order</p>
                </div>
                <div className="game-stats">
                    <div className="timer">
                        Time: {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="game-content">
                <div className="instructions">
                    <p>Drag and drop the tiles to arrange Krishna's life events in the correct chronological order!</p>
                </div>

                <div className="grid-container">
                    <div ref={gridRef} className="muuri-grid">
                        {shuffledStories.map((story) => (
                            <div
                                key={story.id}
                                className="tile"
                                data-id={story.id}
                            >
                                <div className="tile-content">
                                    <img
                                        src={story.image}
                                        alt={story.title}
                                        onError={(e) => {
                                            e.currentTarget.src = '/krishna_with_flute.jpg';
                                        }}
                                    />
                                    <div className="tile-title">{story.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {gameState === 'won' && (
                    <div className="game-overlay win-overlay">
                        <div className="overlay-content">
                            <h2>🎉 Congratulations!</h2>
                            <p>You've successfully arranged Krishna's life story!</p>
                            <div className="overlay-buttons">
                                <button onClick={resetGame} className="play-again-btn">
                                    Play Again
                                </button>
                                <button onClick={onBack} className="back-btn">
                                    Back to Games
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {gameState === 'lost' && (
                    <div className="game-overlay lose-overlay">
                        <div className="overlay-content">
                            <h2>⏰ Time's Up!</h2>
                            <p>Don't worry, Krishna's story is eternal. Try again!</p>
                            <div className="overlay-buttons">
                                <button onClick={resetGame} className="play-again-btn">
                                    Try Again
                                </button>
                                <button onClick={onBack} className="back-btn">
                                    Back to Games
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArrangeGame;
