import { useEffect, useState } from 'react';
import './ResultPopup.css';

function ResultPopup({ isCorrect, teamName, points, onClose }) {
  const [confetti, setConfetti] = useState([]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (isCorrect) {
      // Generate confetti particles
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2 + Math.random() * 2,
        color: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8fab', '#a855f7'][Math.floor(Math.random() * 6)],
        size: 8 + Math.random() * 8,
        rotation: Math.random() * 360,
      }));
      setConfetti(particles);
    }

    // Auto-close after 3 seconds
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isCorrect, onClose]);

  if (!visible) return null;

  return (
    <div className={`result-popup-overlay ${visible ? 'visible' : ''}`}>
      <div className={`result-popup ${isCorrect ? 'correct' : 'incorrect'}`}>
        {isCorrect && (
          <div className="confetti-container">
            {confetti.map((particle) => (
              <div
                key={particle.id}
                className="confetti"
                style={{
                  left: `${particle.left}%`,
                  animationDelay: `${particle.delay}s`,
                  animationDuration: `${particle.duration}s`,
                  backgroundColor: particle.color,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  transform: `rotate(${particle.rotation}deg)`,
                }}
              />
            ))}
          </div>
        )}

        <div className="result-content">
          {isCorrect ? (
            <>
              <div className="result-emoji correct-emoji">
                <span className="emoji-main">🎉</span>
                <span className="emoji-burst">✨</span>
                <span className="emoji-burst">⭐</span>
                <span className="emoji-burst">🌟</span>
              </div>
              <h2 className="result-title correct-title">Hurray!</h2>
              <p className="result-subtitle">You got it right!</p>
              <div className="points-badge correct-badge">
                +{points} points
              </div>
              {teamName && <p className="team-congrats">{teamName} is on fire! 🔥</p>}
            </>
          ) : (
            <>
              <div className="result-emoji incorrect-emoji">
                <span className="emoji-main">😔</span>
              </div>
              <h2 className="result-title incorrect-title">Oops!</h2>
              <p className="result-subtitle">Better luck next time!</p>
              <div className="points-badge incorrect-badge">
                0 points
              </div>
              {teamName && <p className="team-encourage">Keep going, {teamName}! 💪</p>}
            </>
          )}
        </div>

        <button className="close-result-btn" onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default ResultPopup;
