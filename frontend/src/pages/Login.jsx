import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (pwd) => {
    if (pwd.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
    if (!/[0-9]/.test(pwd)) return 'Password must contain at least one number';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation for registration
    if (isRegister) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        alert(passwordError);
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        const success = await register(username, password);
        if (success) {
          setIsRegister(false);
          setPassword('');
        }
      } else {
        const success = await login(username, password);
        if (success) {
          navigate('/dashboard');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container forest-bg">
      <div className="login-card">
        <div className="login-header">
          <h1>🪨 Stepping Stones</h1>
          <p>{isRegister ? 'Create Facilitator Account' : 'Facilitator Login'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="Enter username (min 3 characters)"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Enter password"
              disabled={loading}
            />
            {isRegister && (
              <div className="password-requirements">
                <small>Password must contain:</small>
                <ul>
                  <li className={password.length >= 8 ? 'valid' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'valid' : ''}>
                    At least one uppercase letter
                  </li>
                  <li className={/[0-9]/.test(password) ? 'valid' : ''}>
                    At least one number
                  </li>
                </ul>
              </div>
            )}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="btn-link"
            onClick={() => {
              setIsRegister(!isRegister);
              setPassword('');
            }}
            disabled={loading}
          >
            {isRegister
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </button>
        </div>

        <div className="player-link">
          <p>Are you a player?</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/play')}
          >
            Join Game as Player
          </button>
        </div>

        <div className="back-home">
          <button
            type="button"
            className="btn-link"
            onClick={() => navigate('/')}
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
