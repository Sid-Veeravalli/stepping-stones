import { useEffect, useState } from 'react';
import './Timer.css';

function Timer({ duration, onTimeUp, stopped = false }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    // Don't run timer if stopped
    if (stopped) return;

    if (timeLeft <= 0) {
      if (onTimeUp) onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeUp) onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp, stopped]);

  const getTimerClass = () => {
    const percentage = (timeLeft / duration) * 100;
    if (percentage <= 20) return 'critical';
    if (percentage <= 50) return 'warning';
    return 'normal';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`timer ${getTimerClass()}`}>
      <div className="timer-display">
        <span className="timer-icon">⏱️</span>
        <span className="timer-text">{formatTime(timeLeft)}</span>
      </div>
      <div className="timer-bar">
        <div
          className="timer-fill"
          style={{ width: `${(timeLeft / duration) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default Timer;
