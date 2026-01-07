import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import KrishnaWheelGame from './games/krishna-wheel';
import YudhishtiraQuestGame from './games/yudhishtira-quest';
import ArrangeGame from './games/arrange';
import MathMonsoonGame from './games/math-monsoon';
import MemoryMatrixGame from './games/memory-matrix';
import LexiconAscentGame from './games/lexicon-ascent';

function KrishnaWheelGamePage() {
  const navigate = useNavigate();
  return <KrishnaWheelGame onBack={() => navigate('/')} />;
}

function YudhishtiraQuestGamePage() {
  const navigate = useNavigate();
  return <YudhishtiraQuestGame onBack={() => navigate('/')} />;
}

function ArrangeGamePage() {
  const navigate = useNavigate();
  return <ArrangeGame onBack={() => navigate('/')} />;
}

function MathMonsoonGamePage() {
  const navigate = useNavigate();
  return <MathMonsoonGame onBack={() => navigate('/')} />;
}

function MemoryMatrixGamePage() {
  const navigate = useNavigate();
  return <MemoryMatrixGame onBack={() => navigate('/')} />;
}

function LexiconAscentGamePage() {
  const navigate = useNavigate();
  return <LexiconAscentGame onBack={() => navigate('/')} />;
}

function HomePage() {
  const navigate = useNavigate();

  const renderHeader = () => (
    <header className="main-header">
      <div className="header-content">
        <div className="brand-section">
          <span className="brand-icon">🪔</span>
          <div className="brand-text">
            <h1 className="brand-title">Janmashtami Games</h1>
            <p className="brand-subtitle">Divine Wisdom Through Play</p>
          </div>
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="home-section">
      <div className="floating-elements">
        <span className="floating-icon" style={{ top: '15%', left: '8%' }}>🪔</span>
        <span className="floating-icon" style={{ top: '25%', right: '12%' }}>🌸</span>
        <span className="floating-icon" style={{ top: '45%', left: '15%' }}>✨</span>
        <span className="floating-icon" style={{ top: '65%', right: '20%' }}>🎭</span>
        <span className="floating-icon" style={{ top: '35%', right: '35%' }}>🌺</span>
        <span className="floating-icon" style={{ top: '75%', left: '25%' }}>🕉️</span>
      </div>

      <div className="hero-section">
        <div className="hero-content">
          <div className="festival-badge">
            ⭐ Festival Special 2025
          </div>
          <h2 className="hero-title">
            Celebrate Janmashtami
            <span className="hero-subtitle">with Divine Games & Wisdom</span>
          </h2>
          <p className="hero-description">
            Immerse yourself in the joy of Krishna's birthday with interactive games,
            sacred wisdom, and festive celebrations designed for the whole family.
          </p>
        </div>
      </div>

      <div className="games-showcase">
        <div className="container">
          <h2 className="section-title">Choose Your Divine Adventure</h2>
          <p className="section-subtitle">Experience Krishna's wisdom through interactive gameplay</p>

          <div className="games-grid">
            <div className="game-card featured krishna-card" onClick={() => navigate('/krishna-wheel')}>
              <div className="game-badge">Most Popular</div>
              <div
                className="game-visual krishna-visual"
                style={{
                  backgroundImage: `url('/wheel_game_card.png')`
                }}
              >
              </div>
              <div className="game-content">
                <h3 className="game-title">Krishna's Divine Wheel</h3>
                <p className="game-description">
                  Spin the sacred wheel to receive personalized wisdom and blessings from Lord Krishna's eternal teachings.
                </p>
                <div className="game-features">
                  <span className="feature">🎯 Interactive Wheel</span>
                  <span className="feature">📜 Sacred Teachings</span>
                  <span className="feature">✨ Divine Guidance</span>
                </div>
                <div className="game-tags">
                  <span className="tag spiritual">SPIRITUAL</span>
                  <span className="tag easy">EASY</span>
                </div>
              </div>
            </div>

            <div className="game-card yudhishtira-card" onClick={() => navigate('/yudhishtira-quest')}>
              <div
                className="game-visual yudhishtira-visual"
                style={{
                  backgroundImage: `url('/yudhistir_quest_BG.png')`
                }}
              >
              </div>
              <div className="game-content">
                <h3 className="game-title">Yudhishtira's Quest</h3>
                <p className="game-description">
                  Test your wisdom as Yudhishtira faces Dharmaraj's challenging questions to save his brothers.
                </p>
                <div className="game-features">
                  <span className="feature">🎮 Story Mode</span>
                  <span className="feature">🧠 Wisdom Test</span>
                  <span className="feature">⏱️ Timed Challenges</span>
                </div>
                <div className="game-tags">
                  <span className="tag wisdom">WISDOM</span>
                  <span className="tag challenging">CHALLENGING</span>
                </div>
              </div>
            </div>

            <div className="game-card arrange-card" onClick={() => navigate('/arrange')}>
              <div
                className="game-visual arrange-visual"
                style={{
                  backgroundImage: `url('/krishna_lila_landing.png')`
                }}
              >
              </div>
              <div className="game-content">
                <h3 className="game-title">Divine Stories Arrange</h3>
                <p className="game-description">
                  Choose from Krishna Lila, Mahabharat, or Gaur Lila and arrange story tiles in chronological order.
                </p>
                <div className="game-features">
                  <span className="feature">🧩 Multiple Stories</span>
                  <span className="feature">📖 3 Epic Tales</span>
                  <span className="feature">⏰ 60 Second Timer</span>
                </div>
                <div className="game-tags">
                  <span className="tag puzzle">PUZZLE</span>
                  <span className="tag medium">MEDIUM</span>
                </div>
              </div>
            </div>

            <div className="game-card math-monsoon-card" onClick={() => navigate('/math-monsoon')}>
              <div
                className="game-visual math-monsoon-visual"
                style={{
                  background: 'linear-gradient(180deg, #87CEEB 0%, #4A90D9 60%, #1E90FF 100%)'
                }}
              >
                <div className="math-monsoon-preview">
                  <span className="preview-cloud">☁️</span>
                  <span className="preview-drop">💧</span>
                  <span className="preview-equation">3 + 4</span>
                </div>
              </div>
              <div className="game-content">
                <h3 className="game-title">Math Monsoon</h3>
                <p className="game-description">
                  Solve math problems before raindrops hit the water! Quick thinking earns more points.
                </p>
                <div className="game-features">
                  <span className="feature">🧮 Math Challenge</span>
                  <span className="feature">⚡ Speed Bonus</span>
                  <span className="feature">🌧️ Increasing Difficulty</span>
                </div>
                <div className="game-tags">
                  <span className="tag math">MATH</span>
                  <span className="tag fun">FUN</span>
                </div>
              </div>
            </div>

            <div className="game-card memory-matrix-card" onClick={() => navigate('/memory-matrix')}>
              <div
                className="game-visual memory-matrix-visual"
                style={{
                  background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)'
                }}
              >
                <div className="memory-matrix-preview">
                  <div className="preview-grid">
                    <span className="preview-tile"></span>
                    <span className="preview-tile lit"></span>
                    <span className="preview-tile"></span>
                    <span className="preview-tile lit"></span>
                    <span className="preview-tile"></span>
                    <span className="preview-tile"></span>
                    <span className="preview-tile"></span>
                    <span className="preview-tile lit"></span>
                    <span className="preview-tile"></span>
                  </div>
                </div>
              </div>
              <div className="game-content">
                <h3 className="game-title">Memory Matrix</h3>
                <p className="game-description">
                  Test your visual memory! Memorize the pattern and select the correct tiles.
                </p>
                <div className="game-features">
                  <span className="feature">🧠 Memory Test</span>
                  <span className="feature">⚡ Time Bonus</span>
                  <span className="feature">📈 Progressive Stages</span>
                </div>
                <div className="game-tags">
                  <span className="tag memory">MEMORY</span>
                  <span className="tag challenging">CHALLENGING</span>
                </div>
              </div>
            </div>

            <div className="game-card lexicon-ascent-card" onClick={() => navigate('/lexicon-ascent')}>
              <div
                className="game-visual lexicon-ascent-visual"
                style={{
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 50%, #d1d5db 100%)'
                }}
              >
                <div className="lexicon-ascent-preview">
                  <span className="preview-word">📚</span>
                  <div className="preview-ladder">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                  </div>
                </div>
              </div>
              <div className="game-content">
                <h3 className="game-title">Lexicon Ascent</h3>
                <p className="game-description">
                  Arrange words by intensity! Tap to reveal meanings and order from least to most.
                </p>
                <div className="game-features">
                  <span className="feature">📖 Vocabulary</span>
                  <span className="feature">⏱️ Time-Based</span>
                  <span className="feature">📈 4 Levels</span>
                </div>
                <div className="game-tags">
                  <span className="tag vocab">VOCAB</span>
                  <span className="tag knowledge">KNOWLEDGE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="about-section">
        <div className="container">
          <div className="about-content">
            <div className="about-text">
              <h3>About Janmashtami Games</h3>
              <p>
                Celebrate the divine birth of Lord Krishna through interactive games that combine
                entertainment with spiritual learning. Perfect for families and devotees of all ages.
              </p>
            </div>
            <div className="about-features">
              <div className="feature-item">
                <span className="feature-icon">✨</span>
                <span>Interactive spiritual learning</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">👨‍👩‍👧‍👦</span>
                <span>Family-friendly design</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <span>Works on all devices</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );



  return (
    <div className="App">
      {renderHeader()}
      <main className="main-content">
        {renderHome()}
      </main>
      <footer className="main-footer">
        <div className="container">
          <p>&copy; 2025 Janmashtami Games. Celebrating Krishna's divine wisdom through interactive play.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/krishna-wheel" element={<KrishnaWheelGamePage />} />
        <Route path="/yudhishtira-quest" element={<YudhishtiraQuestGamePage />} />
        <Route path="/arrange" element={<ArrangeGamePage />} />
        <Route path="/math-monsoon" element={<MathMonsoonGamePage />} />
        <Route path="/memory-matrix" element={<MemoryMatrixGamePage />} />
        <Route path="/lexicon-ascent" element={<LexiconAscentGamePage />} />
      </Routes>
      <Analytics />
    </Router>
  );
}

export default App;
