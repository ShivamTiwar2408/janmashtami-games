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

type GameCategory = 'krishna-lila' | 'mahabharat' | 'gaur-lila';

interface GameCategoryData {
    id: GameCategory;
    title: string;
    subtitle: string;
    stories: LilaStory[];
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

const mahabharatStories: LilaStory[] = [
    { id: 'birth-pandavas', image: '/krishna_with_flute.jpg', title: 'Birth of Pandavas', order: 1 },
    { id: 'education', image: '/krishna_with_flute.jpg', title: 'Education at Hastinapur', order: 2 },
    { id: 'tournament', image: '/krishna_with_flute.jpg', title: 'Tournament Display', order: 3 },
    { id: 'marriage-draupadi', image: '/krishna_with_flute.jpg', title: 'Marriage to Draupadi', order: 4 },
    { id: 'dice-game', image: '/krishna_with_flute.jpg', title: 'The Dice Game', order: 5 },
    { id: 'exile', image: '/krishna_with_flute.jpg', title: 'Forest Exile', order: 6 },
    { id: 'kurukshetra', image: '/krishna_lila/krishna_speaks_gita.png', title: 'Kurukshetra War', order: 7 },
    { id: 'victory', image: '/krishna_with_flute.jpg', title: 'Victory of Dharma', order: 8 }
];

const gaurLilaStories: LilaStory[] = [
    { id: 'birth-chaitanya', image: '/krishna_with_flute.jpg', title: 'Birth of Chaitanya', order: 1 },
    { id: 'childhood', image: '/krishna_with_flute.jpg', title: 'Divine Childhood', order: 2 },
    { id: 'student-life', image: '/krishna_with_flute.jpg', title: 'Student Life', order: 3 },
    { id: 'sankirtan', image: '/krishna_with_flute.jpg', title: 'Starting Sankirtan', order: 4 },
    { id: 'sannyasa', image: '/krishna_with_flute.jpg', title: 'Taking Sannyasa', order: 5 },
    { id: 'vrindavan', image: '/krishna_with_flute.jpg', title: 'Visiting Vrindavan', order: 6 },
    { id: 'jagannath', image: '/krishna_with_flute.jpg', title: 'Jagannath Puri', order: 7 },
    { id: 'final-lila', image: '/krishna_with_flute.jpg', title: 'Final Pastimes', order: 8 }
];

const gameCategories: GameCategoryData[] = [
    {
        id: 'krishna-lila',
        title: 'Krishna\'s Life Story',
        subtitle: 'Arrange the tiles in chronological order',
        stories: krishnaLilaStories
    },
    {
        id: 'mahabharat',
        title: 'Mahabharat Epic',
        subtitle: 'Arrange the great epic events in order',
        stories: mahabharatStories
    },
    {
        id: 'gaur-lila',
        title: 'Gaur Lila',
        subtitle: 'Arrange Chaitanya Mahaprabhu\'s pastimes',
        stories: gaurLilaStories
    }
];

const ArrangeGame: React.FC<ArrangeGameProps> = ({ onBack }) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const muuriRef = useRef<Muuri | null>(null);
    const [gameState, setGameState] = useState<'selecting' | 'playing' | 'won' | 'lost'>('selecting');
    const [timeLeft, setTimeLeft] = useState(60);
    const [shuffledStories, setShuffledStories] = useState<LilaStory[]>([]);

    const [currentCategoryData, setCurrentCategoryData] = useState<GameCategoryData>(gameCategories[0]);

    // Shuffle array function
    const shuffleArray = (array: LilaStory[]) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    // Handle category selection
    const handleCategorySelect = (categoryId: GameCategory) => {
        const categoryData = gameCategories.find(cat => cat.id === categoryId);
        if (categoryData) {
            setCurrentCategoryData(categoryData);
            const shuffled = shuffleArray(categoryData.stories);
            setShuffledStories(shuffled);
            setGameState('playing');
            setTimeLeft(60);
        }
    };

    // Initialize game when category changes
    useEffect(() => {
        if (gameState === 'playing' && currentCategoryData) {
            const shuffled = shuffleArray(currentCategoryData.stories);
            setShuffledStories(shuffled);
        }
    }, [currentCategoryData, gameState]);

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
        if (!muuriRef.current || !currentCategoryData) return;

        const items = muuriRef.current.getItems();
        const currentOrder = items.map(item => {
            const element = item.getElement();
            return element?.getAttribute('data-id');
        });

        const correctOrder = currentCategoryData.stories
            .sort((a, b) => a.order - b.order)
            .map(story => story.id);

        const isCorrect = currentOrder.every((id, index) => id === correctOrder[index]);

        if (isCorrect && gameState === 'playing') {
            setGameState('won');
        }
    }, [gameState, currentCategoryData]);

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
        if (currentCategoryData) {
            const shuffled = shuffleArray(currentCategoryData.stories);
            setShuffledStories(shuffled);
        }
    };

    const goBackToSelection = () => {
        setGameState('selecting');
        setTimeLeft(60);
        setShuffledStories([]);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="arrange-game">
            <button
                onClick={gameState === 'selecting' ? onBack : goBackToSelection}
                className={`back-btn-corner ${gameState === 'won' || gameState === 'lost' ? 'hidden' : ''}`}
            >
                ← {gameState === 'selecting' ? 'Back' : 'Categories'}
            </button>

            {gameState === 'selecting' && (
                <div className="category-selection">
                    <div className="selection-header">
                        <h1 className="selection-title">Choose Your Adventure</h1>
                        <p className="selection-subtitle">Select a story to arrange in chronological order</p>
                    </div>
                    <div className="category-grid">
                        {gameCategories.map((category) => (
                            <div
                                key={category.id}
                                className="category-card"
                                onClick={() => handleCategorySelect(category.id)}
                            >
                                <div className="category-content">
                                    <h3 className="category-title">{category.title}</h3>
                                    <p className="category-description">{category.subtitle}</p>
                                    <div className="category-count">
                                        {category.stories.length} Events
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {gameState !== 'selecting' && (
                <>
                    <div className="game-header">
                        <div className="header-top">
                            <h1 className="game-title">{currentCategoryData.title}</h1>
                            <div className="timer-section">
                                <div className={`timer ${timeLeft <= 10 ? 'warning' : ''}`}>
                                    {formatTime(timeLeft)}
                                </div>
                            </div>
                        </div>
                        <p className="game-subtitle">{currentCategoryData.subtitle}</p>
                    </div>
                </>
            )}

            {gameState === 'playing' && (
                <div className="game-content">
                    <div className="instructions">
                        <p>Drag and drop the tiles to arrange the events in the correct chronological order!</p>
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
                </div>
            )}

            {gameState === 'won' && (
                <div className="game-overlay win-overlay">
                    <div className="celebration-particles">
                        {Array.from({ length: 100 }, (_, i) => (
                            <div key={i} className={`particle particle-${i % 8} direction-${i % 4}`}>
                                {['🎉', '✨', '🌟', '🎊', '💫', '🏆', '🎈', '🌈'][i % 8]}
                            </div>
                        ))}
                    </div>
                    <div className="fireworks">
                        {Array.from({ length: 20 }, (_, i) => (
                            <div key={i} className={`firework firework-${i % 4}`}>
                                <div className="explosion">
                                    {Array.from({ length: 12 }, (_, j) => (
                                        <div key={j} className={`spark spark-${j}`}></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="overlay-content">
                        <div className="victory-icon">🏆</div>
                        <h2>Congratulations!</h2>
                        <p className="victory-message">You've successfully arranged the {currentCategoryData.title.toLowerCase()}!</p>
                        <div className="victory-stats">
                            <div className="stat">
                                <span className="stat-value">{60 - timeLeft}s</span>
                                <span className="stat-label">Time Taken</span>
                            </div>
                            <div className="stat">
                                <span className="stat-value">Perfect!</span>
                                <span className="stat-label">Accuracy</span>
                            </div>
                        </div>
                        <div className="overlay-buttons">
                            <button onClick={resetGame} className="play-again-btn">
                                🎮 Play Again
                            </button>
                            <button onClick={goBackToSelection} className="back-btn">
                                📚 Choose Another Story
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'lost' && (
                <div className="game-overlay lose-overlay">
                    <div className="overlay-content">
                        <h2>⏰ Time's Up!</h2>
                        <p>Don't worry, these stories are eternal. Try again!</p>
                        <div className="overlay-buttons">
                            <button onClick={resetGame} className="play-again-btn">
                                Try Again
                            </button>
                            <button onClick={goBackToSelection} className="back-btn">
                                📚 Choose Another Story
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArrangeGame;
