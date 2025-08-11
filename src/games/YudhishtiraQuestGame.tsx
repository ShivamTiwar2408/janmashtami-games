import React, { useState, useEffect, useRef, useCallback } from 'react';
import './YudhishtiraQuestGame.css';

interface YudhishtiraQuestGameProps {
  onBack: () => void;
}

interface Brother {
  name: string;
  status: 'unconscious' | 'saved' | 'dead';
  emoji: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  brotherIndex: number;
}

const YudhishtiraQuestGame: React.FC<YudhishtiraQuestGameProps> = ({ onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [gameState, setGameState] = useState<'intro' | 'video' | 'game' | 'end'>('intro');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [videoPhase, setVideoPhase] = useState<'intro' | 'conclusion'>('intro');
  const [questionTimer, setQuestionTimer] = useState(10); // 10 seconds per question
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [brothers, setBrothers] = useState<Brother[]>([
    { name: 'Arjuna', status: 'unconscious', emoji: '🏹' },
    { name: 'Bhima', status: 'unconscious', emoji: '💪' },
    { name: 'Nakula', status: 'unconscious', emoji: '🗡️' },
    { name: 'Sahadeva', status: 'unconscious', emoji: '📚' }
  ]);

  const questions: Question[] = [
    {
      question: 'What is the greatest enemy?',
      options: ['Anger', 'Greed', 'Lust', 'Ignorance'],
      correctAnswerIndex: 0,
      explanation: 'Anger destroys wisdom, burns merit, and leads to the destruction of relationships and peace.',
      brotherIndex: 0
    },
    {
      question: 'What is the true path?',
      options: ['The path of wealth', 'The path of power', 'The path trodden by the great ones', 'The path of solitude'],
      correctAnswerIndex: 2,
      explanation: 'The true path is that which has been walked by great souls and sages throughout history.',
      brotherIndex: 0
    },
    {
      question: 'What is the best of all gains?',
      options: ['Health', 'Wealth', 'Knowledge', 'Friendship'],
      correctAnswerIndex: 0,
      explanation: 'Health is the foundation of all other achievements and the greatest gain one can have.',
      brotherIndex: 1
    },
    {
      question: 'What makes a person truly wealthy?',
      options: ['Gold and jewels', 'Good character', 'Land and property', 'Knowledge'],
      correctAnswerIndex: 1,
      explanation: 'Good character is the true wealth that cannot be stolen and brings lasting prosperity.',
      brotherIndex: 1
    },
    {
      question: 'What is that which, if renounced, makes one agreeable?',
      options: ['Anger', 'Greed', 'Pride', 'Lust'],
      correctAnswerIndex: 2,
      explanation: 'Renouncing pride makes one humble and agreeable to others, as pride creates barriers between people.',
      brotherIndex: 2
    },
    {
      question: 'What is true happiness?',
      options: ['Contentment', 'Wealth', 'Fame', 'Power'],
      correctAnswerIndex: 0,
      explanation: 'True happiness comes from contentment, which is independent of external circumstances.',
      brotherIndex: 2
    },
    {
      question: 'What is the source of all dharma?',
      options: ['The Vedas', 'The conduct of good people', 'Both the Vedas and the conduct of good people', 'Personal conscience'],
      correctAnswerIndex: 2,
      explanation: 'Dharma is established both by the Vedas and by the conduct of virtuous people who follow them.',
      brotherIndex: 3
    },
    {
      question: 'What is the greatest wonder in the world?',
      options: ['The vastness of the ocean', 'The birth of a new star', 'Even though creatures die every moment, those who remain desire to live forever', 'The complexity of the human mind'],
      correctAnswerIndex: 2,
      explanation: 'Despite witnessing death constantly, living beings continue to believe they will live forever - this is indeed the greatest wonder.',
      brotherIndex: 3
    }
  ];

  const startGame = () => {
    setGameState('video');
    setVideoPhase('intro');
  };

  const skipVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (videoPhase === 'intro') {
      setGameState('game');
      setQuestionTimer(10); // Reset timer for first question
    } else {
      setGameState('end');
    }
  };

  const handleVideoEnd = useCallback(() => {
    if (videoPhase === 'intro') {
      setGameState('game');
      setQuestionTimer(10); // Reset timer for first question
    } else {
      setGameState('end');
    }
  }, [videoPhase]);

  const handleAnswerSelect = useCallback((answerIndex: number) => {
    if (selectedAnswer !== null || showExplanation) return;
    
    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex >= 0 && answerIndex === questions[currentQuestionIndex].correctAnswerIndex;
    
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1);
      // Save a brother - mark the specific brother for this question as saved
      setBrothers(prev => {
        const newBrothers = [...prev];
        const unconsciousBrothers = newBrothers.filter(b => b.status === 'unconscious');
        if (unconsciousBrothers.length > 0) {
          unconsciousBrothers[0].status = 'saved';
        }
        return newBrothers;
      });
    } else {
      // Kill a brother - mark the specific brother for this question as dead (wrong answer or timeout)
      setBrothers(prev => {
        const newBrothers = [...prev];
        const unconsciousBrothers = newBrothers.filter(b => b.status === 'unconscious');
        if (unconsciousBrothers.length > 0) {
          unconsciousBrothers[unconsciousBrothers.length - 1].status = 'dead';
        }
        return newBrothers;
      });
    }
    
    setShowExplanation(true);
    
    // Auto-advance to next question after 3 seconds (like original)
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setQuestionTimer(10); // Reset timer for next question
      } else {
        // Play conclusion video
        setGameState('video');
        setVideoPhase('conclusion');
      }
    }, 3000);
  }, [selectedAnswer, showExplanation, questions, currentQuestionIndex]);



  const restartGame = () => {
    setGameState('intro');
    setCurrentQuestionIndex(0);
    setCorrectAnswers(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuestionTimer(10);
    setVideoPhase('intro');
    setBrothers([
      { name: 'Arjuna', status: 'unconscious', emoji: '🏹' },
      { name: 'Bhima', status: 'unconscious', emoji: '💪' },
      { name: 'Nakula', status: 'unconscious', emoji: '🗡️' },
      { name: 'Sahadeva', status: 'unconscious', emoji: '📚' }
    ]);
  };

  const getEndMessage = () => {
    const savedBrothers = brothers.filter(b => b.status === 'saved').length;
    
    if (savedBrothers === 4) {
      return {
        title: 'Victory!',
        message: `Congratulations! Your wisdom has saved all your brothers. You answered ${correctAnswers} out of ${questions.length} questions correctly. The Pandavas are reunited and ready to continue their journey.`
      };
    } else if (savedBrothers >= 2) {
      return {
        title: 'Partial Success',
        message: `You have saved ${savedBrothers} of your brothers through your wisdom. ${4 - savedBrothers} brothers could not be revived. Your journey continues with those who remain.`
      };
    } else if (savedBrothers === 1) {
      return {
        title: 'Difficult Victory',
        message: `Only one brother could be saved through your answers. The path of dharma is challenging, but you have shown some wisdom. Learn from this experience.`
      };
    } else {
      return {
        title: 'Defeat',
        message: `All your brothers remain unconscious. Your answers did not demonstrate sufficient wisdom to save them. Reflect on the teachings and try again.`
      };
    }
  };

  // Timer effect for questions
  useEffect(() => {
    if (gameState === 'game' && !showExplanation && questionTimer > 0) {
      timerRef.current = setTimeout(() => {
        setQuestionTimer(prev => prev - 1);
      }, 1000);
    } else if (questionTimer === 0 && !showExplanation) {
      // Time's up - treat as wrong answer
      handleAnswerSelect(-1); // -1 indicates timeout
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [gameState, questionTimer, showExplanation, handleAnswerSelect]);

  // Video playback effect - handles starting video when state changes
  useEffect(() => {
    if (gameState === 'video' && videoRef.current) {
      const video = videoRef.current;
      
      // Set up video for playback
      const playVideo = async () => {
        try {
          // Unmute the video for sound
          video.muted = false;
          video.volume = 0.8; // Set volume to 80%
          
          if (videoPhase === 'intro') {
            video.currentTime = 0; // Start from the beginning for intro
          } else if (videoPhase === 'conclusion') {
            video.currentTime = 347; // Start at 5:47 for conclusion
          }
          
          // Add a small delay to ensure currentTime is set
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Try to play the video with sound
          await video.play();
        } catch (error) {
          console.error('Video play failed:', error);
          // If autoplay fails, try playing muted first, then unmute after user interaction
          try {
            video.muted = true;
            await video.play();
            // Try to unmute after a short delay
            setTimeout(() => {
              video.muted = false;
            }, 500);
          } catch (mutedError) {
            console.error('Even muted video play failed:', mutedError);
          }
        }
      };

      playVideo();
    }
  }, [gameState, videoPhase]);

  // Video handling effect for time updates and events
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      const handleTimeUpdate = () => {
        if (videoPhase === 'intro' && video.currentTime >= 65) { // Video ends at 65 seconds
          video.pause();
          setGameState('game');
          setQuestionTimer(10); // Reset timer for first question
        } else if (videoPhase === 'conclusion' && video.currentTime >= 410) { // 6:50
          video.pause();
          setGameState('end');
        }
      };

      const handleCanPlay = () => {
        // Video is ready to play
        console.log('Video can play');
      };

      const handleLoadedData = () => {
        // Video data is loaded
        console.log('Video data loaded');
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('ended', handleVideoEnd);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('loadeddata', handleLoadedData);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('ended', handleVideoEnd);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [handleVideoEnd, videoPhase]);

  if (gameState === 'intro') {
    return (
      <div className="yudhishtira-quest-game yudhishtira-intro" style={{
        backgroundImage: `linear-gradient(135deg, rgba(15, 20, 25, 0.8) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.8) 100%), url('/yudhistir_quest_BG.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <button onClick={onBack} className="back-btn-corner">← Back</button>
        <div className="background-particles">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }} />
          ))}
        </div>
        
        <div className="intro-screen">
          <h1 className="intro-title">Yudhishthira's Quest</h1>
          <p className="intro-text">
            The Pandava brothers lie unconscious by the tranquil lake, cursed by Dharmaraj.
            Only Yudhishthira's wisdom can save them. Answer the questions truthfully and wisely,
            for the life of your brothers depends on it!
          </p>
          <button onClick={startGame} className="start-button">Begin Quest</button>
        </div>
      </div>
    );
  }

  if (gameState === 'video') {
    return (
      <div className="yudhishtira-quest-game">
        <button onClick={onBack} className="back-btn-corner">← Back</button>
        <div className="video-screen">
          <video
            ref={videoRef}
            className="intro-video"
            preload="auto"
            playsInline
          >
            <source src="/yudhisthir_quest_start.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <button onClick={skipVideo} className="skip-video-btn">
            Skip to {videoPhase === 'intro' ? 'Game' : 'Results'}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'game') {
    const currentQuestion = questions[currentQuestionIndex];
    
    return (
      <div className="yudhishtira-quest-game game-active">
        <button onClick={onBack} className="back-btn-corner">← Back</button>
        <div 
          className="game-background" 
          style={{
            backgroundImage: `url('/yudhistir_quest_BG.png')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        <div className="game-header">
          <div className="header-top">
            <div className="timer-section">
              <div className={`timer ${questionTimer <= 10 ? 'warning' : ''}`}>
                ⏰ {questionTimer}s
              </div>
            </div>
            <div className="question-badge-section">
              <div className="progress-text">Question {currentQuestionIndex + 1} of {questions.length}</div>
            </div>
          </div>
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
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
                className={`option-button ${
                  selectedAnswer !== null
                    ? index === currentQuestion.correctAnswerIndex
                      ? 'correct'
                      : index === selectedAnswer
                      ? 'incorrect'
                      : ''
                    : ''
                }`}
                onClick={() => handleAnswerSelect(index)}
                disabled={selectedAnswer !== null}
              >
                {option}
              </button>
            ))}
          </div>

          {showExplanation && (
            <div className={`message-box ${selectedAnswer === currentQuestion.correctAnswerIndex ? 'success' : 'failure'}`}>
              {currentQuestion.explanation}
            </div>
          )}
        </div>

        <div className="brother-icons">
          {brothers.map((brother, index) => (
            <div
              key={brother.name}
              className={`brother-icon ${brother.status}`}
              data-name={brother.name}
            >
              {brother.emoji}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (gameState === 'end') {
    const endResult = getEndMessage();
    
    return (
      <div className="yudhishtira-quest-game yudhishtira-end" style={{
        backgroundImage: `linear-gradient(135deg, rgba(15, 20, 25, 0.8) 0%, rgba(26, 26, 46, 0.8) 50%, rgba(22, 33, 62, 0.8) 100%), url('/yudhistir_quest_BG.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        <button onClick={onBack} className="back-btn-corner">← Back</button>
        <div className="background-particles">
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 4}s`
            }} />
          ))}
        </div>
        
        <div className="end-screen">
          <h1 className="end-message">{endResult.title}</h1>
          <p className="end-summary">{endResult.message}</p>
          <div className="end-actions">
            <button onClick={restartGame} className="restart-button">Play Again</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default YudhishtiraQuestGame;
