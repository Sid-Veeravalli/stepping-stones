import { createContext, useContext, useState } from 'react';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const [gameSession, setGameSession] = useState(null);
  const [teams, setTeams] = useState([]);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, in_progress, completed

  const resetGame = () => {
    setGameSession(null);
    setTeams([]);
    setCurrentTeam(null);
    setCurrentQuestion(null);
    setLeaderboard([]);
    setCurrentRound(0);
    setTimeLeft(null);
    setGameStatus('waiting');
  };

  return (
    <GameContext.Provider
      value={{
        gameSession,
        setGameSession,
        teams,
        setTeams,
        currentTeam,
        setCurrentTeam,
        currentQuestion,
        setCurrentQuestion,
        leaderboard,
        setLeaderboard,
        currentRound,
        setCurrentRound,
        timeLeft,
        setTimeLeft,
        gameStatus,
        setGameStatus,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
