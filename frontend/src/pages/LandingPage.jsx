import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">🪨</span>
          <span className="logo-text">Stepping Stones</span>
        </div>
        <div className="nav-right">
          <button className="btn btn-outline" onClick={() => navigate('/play')}>
            Join as Player
          </button>
          <button className="btn btn-nav-primary" onClick={() => navigate('/login')}>
            Facilitator Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background">
          {/* Animated floating stones */}
          <div className="floating-stone stone-1">🪨</div>
          <div className="floating-stone stone-2">🪨</div>
          <div className="floating-stone stone-3">🪨</div>
          <div className="floating-stone stone-4">🪨</div>

          {/* Animated trees */}
          <div className="hero-tree tree-1">🌲</div>
          <div className="hero-tree tree-2">🌳</div>
          <div className="hero-tree tree-3">🌲</div>
          <div className="hero-tree tree-4">🌳</div>

          {/* Animated animals */}
          <div className="hero-animal animal-1">🦊</div>
          <div className="hero-animal animal-2">🐰</div>
          <div className="hero-animal animal-3">🦉</div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title">
            <span className="title-line">Stepping</span>
            <span className="title-line highlight">Stones</span>
          </h1>
          <p className="hero-subtitle">
            Gamified Corporate Training Platform
          </p>
          <p className="hero-description">
            Transform your team training into an engaging adventure! Roll the dice, answer challenges,
            and watch your team grow as they hop across stepping stones to mastery.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-hero-primary" onClick={() => navigate('/login')}>
              <span>Get Started</span>
              <span className="btn-arrow">→</span>
            </button>
            <button className="btn btn-hero-secondary" onClick={() => navigate('/play')}>
              <span>Join as Player</span>
            </button>
          </div>
        </div>

        <div className="scroll-indicator">
          <span className="scroll-text">Scroll to learn more</span>
          <div className="scroll-arrow">
            <span></span>
            <span></span>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-icon">📝</div>
            <div className="step-number">1</div>
            <h3>Design Training</h3>
            <p>Create training modules with questions of varying difficulty levels</p>
          </div>
          <div className="step-connector">
            <div className="connector-line"></div>
          </div>
          <div className="step-card">
            <div className="step-icon">🚀</div>
            <div className="step-number">2</div>
            <h3>Launch Session</h3>
            <p>Start a training session and share the room code with your teams</p>
          </div>
          <div className="step-connector">
            <div className="connector-line"></div>
          </div>
          <div className="step-card">
            <div className="step-icon">🎲</div>
            <div className="step-number">3</div>
            <h3>Engage & Learn</h3>
            <p>Teams roll dice, tackle challenges, and learn through competition</p>
          </div>
          <div className="step-connector">
            <div className="connector-line"></div>
          </div>
          <div className="step-card">
            <div className="step-icon">🏆</div>
            <div className="step-number">4</div>
            <h3>Celebrate Growth</h3>
            <p>Teams master content while competing for the top spot</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-wrapper">
          <h2 className="section-title">Why Stepping Stones?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3>Adaptive Learning Paths</h3>
              <p>Easy to Insane difficulty levels ensure progressive skill building</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Team Collaboration</h3>
              <p>Foster teamwork with 3-5 teams competing and learning together</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Feedback</h3>
              <p>Live leaderboards and real-time progress tracking for trainers</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>Gamified Experience</h3>
              <p>Boost engagement and retention through interactive gameplay</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Transform Your Training?</h2>
          <p>Join facilitators who are making learning fun and effective</p>
          <div className="cta-buttons">
            <button className="btn btn-cta-primary" onClick={() => navigate('/login')}>
              Get Started
            </button>
            <button className="btn btn-cta-secondary" onClick={() => navigate('/play')}>
              Join as Player
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span>🪨</span> Stepping Stones
          </div>
          <p>Gamified corporate training that drives engagement and results</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
