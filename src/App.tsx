import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './App.css';
import KrishnaWheelGame from './games/krishna-wheel';
import YudhishtiraQuestGame from './games/yudhishtira-quest';
import ArrangeGame from './games/arrange';

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
      </Routes>
      <Analytics />
    </Router>
  );
}

export default App;
