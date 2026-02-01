import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { quizAPI } from '../utils/api';
import toast from 'react-hot-toast';
import './Dashboard.css';

function Dashboard() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const quizSectionRef = useRef(null);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await quizAPI.getAll();
      setQuizzes(response.data);
    } catch (error) {
      toast.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (quizId, quizName) => {
    if (!window.confirm(`Delete quiz "${quizName}"?`)) return;

    try {
      await quizAPI.delete(quizId);
      toast.success('Quiz deleted successfully');
      fetchQuizzes();
    } catch (error) {
      toast.error('Failed to delete quiz');
    }
  };

  const handleLaunch = async (quizId) => {
    try {
      const response = await quizAPI.launch(quizId);
      const { id, room_code } = response.data;
      toast.success(`Game launched! Room code: ${room_code}`);
      navigate(`/game/${id}/facilitator`);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to launch quiz';
      toast.error(message);
    }
  };

  const scrollToQuizzes = () => {
    quizSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <span className="logo-icon">🪨</span>
          <span className="logo-text">Stepping Stones</span>
        </div>
        <div className="nav-right">
          <span className="welcome-text">Welcome, {user?.username}!</span>
          <button className="btn btn-outline" onClick={logout}>
            Logout
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
            <button className="btn btn-hero-primary" onClick={scrollToQuizzes}>
              <span>Manage Trainings</span>
              <span className="btn-arrow">↓</span>
            </button>
            <button className="btn btn-hero-secondary" onClick={() => navigate('/quiz/create')}>
              <span>+ Create New Training</span>
            </button>
          </div>
        </div>

        <div className="scroll-indicator" onClick={scrollToQuizzes}>
          <span className="scroll-text">Scroll to explore</span>
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
            <div className="connector-dot"></div>
          </div>
          <div className="step-card">
            <div className="step-icon">🚀</div>
            <div className="step-number">2</div>
            <h3>Launch Session</h3>
            <p>Start a training session and share the room code with your teams</p>
          </div>
          <div className="step-connector">
            <div className="connector-line"></div>
            <div className="connector-dot"></div>
          </div>
          <div className="step-card">
            <div className="step-icon">🎲</div>
            <div className="step-number">3</div>
            <h3>Engage & Learn</h3>
            <p>Teams roll dice, tackle challenges, and learn through competition</p>
          </div>
          <div className="step-connector">
            <div className="connector-line"></div>
            <div className="connector-dot"></div>
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
      </section>

      {/* Training Management Section */}
      <section className="quiz-section" ref={quizSectionRef}>
        <div className="section-header">
          <h2 className="section-title">Your Training Modules</h2>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => navigate('/quiz/create')}
          >
            + Create New Training
          </button>
        </div>

        <div className="quiz-content">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>No Training Modules Yet</h3>
              <p>Create your first training module to start engaging your teams!</p>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/quiz/create')}>
                Create Your First Training
              </button>
            </div>
          ) : (
            <div className="quiz-grid">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="quiz-card">
                  <div className="quiz-card-header">
                    <div className="quiz-title-row">
                      <h3>{quiz.name}</h3>
                      {(() => {
                        const totalQuestions = quiz.easy_questions_count +
                          quiz.medium_questions_count +
                          quiz.hard_questions_count +
                          quiz.insane_questions_count;
                        const requiredQuestions = quiz.num_teams * quiz.num_rounds;
                        return totalQuestions < requiredQuestions ? (
                          <span className="pending-badge">Pending</span>
                        ) : (
                          <span className="ready-badge">Ready</span>
                        );
                      })()}
                    </div>
                    <span className="quiz-date">
                      {new Date(quiz.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="quiz-card-body">
                    <div className="quiz-info">
                      <div className="info-item">
                        <span className="label">Teams</span>
                        <span className="value">{quiz.num_teams}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Rounds</span>
                        <span className="value">{quiz.num_rounds}</span>
                      </div>
                      <div className="info-item">
                        <span className="label">Questions</span>
                        <span className="value">
                          {quiz.easy_questions_count +
                            quiz.medium_questions_count +
                            quiz.hard_questions_count +
                            quiz.insane_questions_count}
                        </span>
                      </div>
                    </div>

                    <div className="difficulty-breakdown">
                      <div className="diff-item easy">E: {quiz.easy_questions_count}</div>
                      <div className="diff-item medium">M: {quiz.medium_questions_count}</div>
                      <div className="diff-item hard">H: {quiz.hard_questions_count}</div>
                      <div className="diff-item insane">I: {quiz.insane_questions_count}</div>
                    </div>
                  </div>

                  <div className="quiz-card-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/quiz/${quiz.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleLaunch(quiz.id)}
                    >
                      Launch
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(quiz.id, quiz.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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

export default Dashboard;
