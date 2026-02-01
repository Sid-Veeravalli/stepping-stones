import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gameAPI } from '../utils/api';
import toast from 'react-hot-toast';
import './JoinGame.css';

function JoinGame() {
  const [roomCode, setRoomCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoinGame = async (e) => {
    e.preventDefault();

    if (!roomCode.trim()) {
      toast.error('Please enter a room code');
      return;
    }

    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    if (teamName.length < 2 || teamName.length > 50) {
      toast.error('Team name must be between 2 and 50 characters');
      return;
    }

    try {
      setJoining(true);
      const response = await gameAPI.joinTeam({
        room_code: roomCode.toUpperCase().trim(),
        team_name: teamName.trim(),
      });

      const { game_session_id, id: team_id } = response.data;

      // Store in sessionStorage for persistence
      sessionStorage.setItem(`team_${game_session_id}`, team_id);
      sessionStorage.setItem(`teamName_${game_session_id}`, teamName);

      toast.success(`Joined as ${teamName}!`);

      // Navigate to player game page
      navigate(`/game/${game_session_id}/player`, {
        state: { teamId: team_id, teamName: teamName },
      });
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to join game';
      toast.error(message);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="join-game-container forest-bg">
      <div className="join-game-card">
        <div className="join-header">
          <h1>Join the Session</h1>
          <p>Enter the room code provided by your facilitator</p>
        </div>

        <form onSubmit={handleJoinGame} className="join-form">
          <div className="form-group">
            <label>Room Code</label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="room-code-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              maxLength={50}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={joining}
          >
            {joining ? 'Joining...' : 'Join Session'}
          </button>
        </form>

        <div className="join-footer">
          <p>
            Are you a facilitator?{' '}
            <a href="/login" className="link">
              Login here
            </a>
          </p>
          <p className="back-home-link">
            <a href="/" className="link">
              ← Back to Home
            </a>
          </p>
        </div>
      </div>

      <div className="forest-animals">
        <div className="animal bear">🐻</div>
        <div className="animal fox">🦊</div>
        <div className="animal rabbit">🐰</div>
        <div className="animal deer">🦌</div>
        <div className="animal owl">🦉</div>
      </div>
    </div>
  );
}

export default JoinGame;
