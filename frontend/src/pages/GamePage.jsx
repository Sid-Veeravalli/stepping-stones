import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { gameAPI } from '../utils/api';
import toast from 'react-hot-toast';
import Leaderboard from '../components/Leaderboard';
import Timer from '../components/Timer';
import GameBoard from '../components/GameBoard';
import QuestionDisplay from '../components/QuestionDisplay';
import ResultPopup from '../components/ResultPopup';
import './GamePage.css';

function GamePage({ role }) {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    gameSession,
    teams,
    currentQuestion,
    leaderboard,
    currentRound,
    timeLeft,
    gameStatus,
    setGameSession,
    setTeams,
    setCurrentQuestion,
  } = useGame();

  const [loading, setLoading] = useState(true);

  // Initialize teamId and teamName from location.state or sessionStorage
  const [teamId, setTeamId] = useState(() => {
    const stateTeamId = location.state?.teamId;
    const storedTeamId = sessionStorage.getItem(`team_${sessionId}`);
    return stateTeamId || (storedTeamId ? parseInt(storedTeamId) : null);
  });
  const [teamName, setTeamName] = useState(() => {
    const stateTeamName = location.state?.teamName;
    const storedTeamName = sessionStorage.getItem(`teamName_${sessionId}`);
    return stateTeamName || storedTeamName || '';
  });
  const [roomCode, setRoomCode] = useState('');
  const [waitingToStart, setWaitingToStart] = useState(true);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [pendingAnswer, setPendingAnswer] = useState(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceAnimating, setDiceAnimating] = useState(false);
  const [diceResult, setDiceResult] = useState(null);
  const [waitingForDice, setWaitingForDice] = useState(false);
  const [currentTurnTeam, setCurrentTurnTeam] = useState(null);
  const [submittedAnswers, setSubmittedAnswers] = useState([]);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [diceTimer, setDiceTimer] = useState(null);
  const [showDiceSkipModal, setShowDiceSkipModal] = useState(false);
  const [showDiceResult, setShowDiceResult] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [winners, setWinners] = useState([]);
  const [allQuestionsDone, setAllQuestionsDone] = useState(false);
  const diceTimerRef = useRef(null);
  const diceStateRef = useRef({ rolling: false, showResult: false });

  // Keep diceStateRef in sync with state (to avoid stale closure issues)
  useEffect(() => {
    diceStateRef.current = { rolling: diceRolling, showResult: showDiceResult };
  }, [diceRolling, showDiceResult]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (diceTimerRef.current) {
        clearInterval(diceTimerRef.current);
      }
    };
  }, []);

  // Start dice timer when waiting for dice (visible to all, but skip modal only for facilitator)
  const startDiceTimer = useCallback(() => {
    setDiceTimer(30);
    if (diceTimerRef.current) {
      clearInterval(diceTimerRef.current);
    }

    diceTimerRef.current = setInterval(() => {
      setDiceTimer((prev) => {
        if (prev <= 1) {
          clearInterval(diceTimerRef.current);
          diceTimerRef.current = null;
          // Only show skip modal to facilitator
          if (role === 'facilitator') {
            setShowDiceSkipModal(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [role]);

  // Clear dice timer
  const clearDiceTimer = useCallback(() => {
    if (diceTimerRef.current) {
      clearInterval(diceTimerRef.current);
      diceTimerRef.current = null;
    }
    setDiceTimer(null);
    setShowDiceSkipModal(false);
  }, []);

  // WebSocket callbacks
  const handleQuestionReadyForDice = (teamName) => {
    setWaitingForDice(true);
    setCurrentTurnTeam(teamName);
    startDiceTimer(teamName);
  };

  const handleDiceRolled = (data) => {
    // Clear dice timer since someone rolled
    clearDiceTimer();

    // If we're already showing dice result (we initiated the roll), skip re-animation
    // Just update the team name if needed
    if (showDiceResult) {
      return;
    }

    // Show dice rolling animation
    setDiceRolling(true);
    setDiceAnimating(true);
    setDiceResult(null);
    setShowDiceResult(false);
    setCurrentTurnTeam(data.team_name);
    // Update ref immediately to prevent stale closure issues
    diceStateRef.current = { rolling: true, showResult: false };

    // Simulate the dice rolling animation for 2 seconds
    const rollInterval = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(rollInterval);
      // Stop animation and show final result
      setDiceAnimating(false);
      setDiceResult(data.roll);
      setShowDiceResult(true);
      diceStateRef.current = { rolling: true, showResult: true };

      // Keep showing result for 1.5 seconds, then show pending question
      setTimeout(() => {
        setDiceRolling(false);
        setWaitingForDice(false);
        setShowDiceResult(false);
        setCurrentTurnTeam(null);
        diceStateRef.current = { rolling: false, showResult: false };

        // Now show the pending question if any
        setPendingQuestion(prev => {
          if (prev) {
            setCurrentQuestion(prev);
          }
          return null;
        });
      }, 1500);
    }, 2000);
  };

  const handleQuestionServed = (questionData) => {
    // Use ref to get current dice state (avoids stale closure issues)
    const { rolling, showResult } = diceStateRef.current;

    // If dice animation is still in progress, store question as pending
    if (rolling || showResult) {
      setPendingQuestion(questionData);
    } else {
      // No dice animation, show question immediately
      setCurrentQuestion(questionData);
      setWaitingForDice(false);
      setCurrentTurnTeam(null);
    }
    // Clear submitted answers for new question
    setSubmittedAnswers([]);
    setAnswerSubmitted(false);
    setTimeExpired(false);
  };

  const handleAnswerSubmitted = () => {
    // Mark that answer was submitted (stops timer for everyone)
    setAnswerSubmitted(true);
  };

  const handleAnswerSubmittedDetails = (answerData) => {
    // Add submitted answer to list (for facilitator grading)
    // Prevent duplicates by checking answer_id
    if (role === 'facilitator') {
      setSubmittedAnswers(prev => {
        const exists = prev.some(a => a.answer_id === answerData.answer_id);
        if (exists) return prev;
        return [...prev, answerData];
      });
    }
  };

  const handleAnswerGraded = (gradeData) => {
    // Stop timer (in case MCQ auto-grading happens before answer_submitted)
    setAnswerSubmitted(true);

    // Clear submitted answers
    setSubmittedAnswers([]);

    // Show result popup ONLY to the team that was graded
    if (role === 'player' && Number(gradeData.team_id) === Number(teamId)) {
      setResultData({
        isCorrect: gradeData.is_correct,
        teamName: gradeData.team_name,
        points: gradeData.points_awarded || 0
      });
      setShowResultPopup(true);
    }

    // Delay clearing question so players can see the result
    setTimeout(() => {
      setCurrentQuestion(null);
      setAnswerSubmitted(false);
      setTimeExpired(false);
    }, 3500);
  };

  const [timeExpired, setTimeExpired] = useState(false);

  const handleTimeUp = () => {
    // Mark time as expired and stop timer
    setAnswerSubmitted(true);
    setTimeExpired(true);
  };

  const handleSkipQuestion = () => {
    // Facilitator skips question when no answer was submitted
    setCurrentQuestion(null);
    setAnswerSubmitted(false);
    setTimeExpired(false);
    setSubmittedAnswers([]);
    clearDiceTimer();
    toast.info('Question skipped - no points awarded');
  };

  const handleHopToNextQuestion = () => {
    // Facilitator wants to skip current turn (dice not rolled or player away)
    setWaitingForDice(false);
    setDiceRolling(false);
    setCurrentTurnTeam(null);
    setCurrentQuestion(null);
    setAnswerSubmitted(false);
    setTimeExpired(false);
    setSubmittedAnswers([]);
    clearDiceTimer();
    setShowDiceSkipModal(false);
    toast.info('Hopped to next question');
  };

  const handleFinishGame = async () => {
    try {
      // Get final leaderboard
      const teamsToSort = leaderboard || teams;
      const sortedTeams = [...teamsToSort].sort((a, b) => (b.score || 0) - (a.score || 0));

      // Find all teams with the highest score (handle ties)
      const highestScore = sortedTeams[0]?.score || 0;
      const gameWinners = sortedTeams.filter(team => (team.score || 0) === highestScore);

      setWinners(gameWinners);
      setGameEnded(true);
      setShowCelebration(true);

      // Broadcast game end to all players
      sendMessage({
        type: 'game_ended',
        data: {
          winners: gameWinners,
          leaderboard: sortedTeams
        }
      });

      const winnerNames = gameWinners.map(w => w.team_name || w.name).join(' & ');
      toast.success(`Game finished! Winner${gameWinners.length > 1 ? 's' : ''}: ${winnerNames}!`);
    } catch (error) {
      toast.error('Failed to finish game');
    }
  };

  const handleCloseResultPopup = () => {
    setShowResultPopup(false);
    setResultData(null);
  };

  const handleGameEnded = (data) => {
    // Game ended by facilitator - show celebration to players
    // Handle both old format (winner) and new format (winners)
    const gameWinners = data.winners || (data.winner ? [data.winner] : []);
    setWinners(gameWinners);
    setGameEnded(true);
    setShowCelebration(true);
    // No auto-redirect - players click Exit Game button manually
  };

  // Connect to WebSocket
  const { sendMessage } = useWebSocket(sessionId, role, teamId, {
    onQuestionReadyForDice: handleQuestionReadyForDice,
    onDiceRolled: handleDiceRolled,
    onQuestionServed: handleQuestionServed,
    onAnswerSubmitted: handleAnswerSubmitted,
    onAnswerSubmittedDetails: handleAnswerSubmittedDetails,
    onAnswerGraded: handleAnswerGraded,
    onTimeUp: handleTimeUp,
    onGameEnded: handleGameEnded
  });

  useEffect(() => {
    loadGameData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Ensure teamId is set from location.state when component mounts or state changes
  useEffect(() => {
    if (location.state?.teamId && !teamId) {
      const numericTeamId = parseInt(location.state.teamId);
      sessionStorage.setItem(`team_${sessionId}`, numericTeamId);
      sessionStorage.setItem(`teamName_${sessionId}`, location.state.teamName);
      setTeamId(numericTeamId);
      setTeamName(location.state.teamName);
    }
  }, [location.state, sessionId, teamId]);

  useEffect(() => {
    if (gameStatus === 'in_progress') {
      setWaitingToStart(false);
    }
  }, [gameStatus]);

  const loadGameData = async () => {
    try {
      const response = await gameAPI.getSession(sessionId);
      const session = response.data;
      setGameSession(session);
      setRoomCode(session.room_code);

      // Load teams
      const teamsResponse = await gameAPI.getTeams(sessionId);
      setTeams(teamsResponse.data);

      if (session.status === 'in_progress') {
        setWaitingToStart(false);

        // Fetch current game state to restore question if any
        try {
          const stateResponse = await gameAPI.getGameState(sessionId);
          const gameState = stateResponse.data;

          // Restore current question if exists
          if (gameState.current_question && gameState.current_team) {
            const questionWithTeam = {
              ...gameState.current_question,
              team_id: gameState.current_team.id,
              team_name: gameState.current_team.name
            };
            setCurrentQuestion(questionWithTeam);

            // If waiting for dice roll
            if (gameState.waiting_for_dice) {
              setWaitingForDice(true);
              setCurrentTurnTeam(gameState.current_team.name);
            }
          }

          // Restore pending answers for facilitator (answers awaiting grading)
          if (role === 'facilitator' && gameState.pending_answers && gameState.pending_answers.length > 0) {
            setSubmittedAnswers(gameState.pending_answers);
          }

          // Update teams with latest scores
          if (gameState.teams && gameState.teams.length > 0) {
            setTeams(gameState.teams);
          }
        } catch (stateError) {
          // Game state fetch failed, continue without it
          console.log('Could not fetch game state:', stateError);
        }
      }
    } catch (error) {
      toast.error('Failed to load game data');
      if (role === 'facilitator') {
        navigate('/dashboard');
      } else {
        navigate('/play');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (teams.length < gameSession.num_teams) {
      toast.error(`Waiting for ${gameSession.num_teams - teams.length} more team(s) to join`);
      return;
    }

    try {
      await gameAPI.startGame(sessionId);
      toast.success('Game started!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to start game';
      toast.error(message);
    }
  };

  const handleServeQuestion = async () => {
    try {
      await gameAPI.serveQuestion(sessionId);
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to serve question';
      // Check if all questions are done
      if (message.includes('No more questions') || message.includes('game complete')) {
        setAllQuestionsDone(true);
        toast.success('All questions completed! Click "Finish and Get Results" to end the game.');
      } else {
        toast.error(message);
      }
    }
  };

  const handleRollDice = () => {
    // Start dice rolling animation locally
    setDiceRolling(true);
    setDiceAnimating(true);
    setDiceResult(null);
    setShowDiceResult(false);
    // Update ref immediately to prevent stale closure issues
    diceStateRef.current = { rolling: true, showResult: false };

    // Simulate dice rolling for 2 seconds
    const rollInterval = setInterval(() => {
      setDiceResult(Math.floor(Math.random() * 6) + 1);
    }, 100);

    setTimeout(() => {
      clearInterval(rollInterval);
      const finalRoll = Math.floor(Math.random() * 6) + 1;

      // Stop animation and show final result
      setDiceAnimating(false);
      setDiceResult(finalRoll);
      setShowDiceResult(true);
      diceStateRef.current = { rolling: true, showResult: true };

      // Show difficulty range based on dice roll
      const difficultyRange = finalRoll <= 3 ? 'Easy/Medium' : 'Hard/Insane';

      // Broadcast dice roll result via WebSocket
      sendMessage({
        type: 'dice_rolled',
        data: {
          team_id: teamId,
          team_name: teamName,
          roll: finalRoll,
          difficulty_range: difficultyRange
        }
      });

      // Keep showing result for 1.5 seconds, then show pending question
      setTimeout(() => {
        setDiceRolling(false);
        setWaitingForDice(false);
        setShowDiceResult(false);
        setCurrentTurnTeam(null);
        diceStateRef.current = { rolling: false, showResult: false };

        // Now show the pending question if any
        setPendingQuestion(prev => {
          if (prev) {
            setCurrentQuestion(prev);
          }
          return null;
        });
      }, 1500);
    }, 2000);
  };

  const handleSubmitAnswer = async (answer) => {
    if (!currentQuestion || !teamId) return;

    try {
      // Stop timer immediately when player submits
      setAnswerSubmitted(true);

      await gameAPI.submitAnswer(sessionId, {
        game_session_id: parseInt(sessionId),
        team_id: teamId,
        question_id: currentQuestion.id,
        submitted_answer: answer,
        round_number: currentRound,
      });
      toast.success('Answer submitted!');
    } catch (error) {
      // Revert timer stop if submission failed
      setAnswerSubmitted(false);
      const message = error.response?.data?.detail || 'Failed to submit answer';
      toast.error(message);
    }
  };

  const handleGradeAnswer = async (answerId, isCorrect, points) => {
    try {
      await gameAPI.gradeAnswer(sessionId, {
        answer_id: answerId,
        is_correct: isCorrect,
        points_awarded: points,
      });
      setShowGradingModal(false);
      setPendingAnswer(null);
      toast.success('Answer graded!');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to grade answer';
      toast.error(message);
    }
  };

  if (loading) {
    return <div className="loading">Loading game...</div>;
  }

  // Facilitator waiting room
  if (role === 'facilitator' && waitingToStart) {
    return (
      <div className="game-container forest-bg">
        <div className="waiting-room">
          <h1>Game Lobby</h1>
          <div className="room-code-display">
            <h2>Room Code</h2>
            <div className="room-code">{roomCode}</div>
            <p>Share this code with players to join</p>
          </div>

          <div className="teams-waiting">
            <h3>Teams Joined ({teams.length}/{gameSession?.num_teams || 0})</h3>
            <div className="teams-list">
              {teams.map((team) => (
                <div key={team.id} className="team-item">
                  <span className="team-icon">🎯</span>
                  <span className="team-name">{team.team_name}</span>
                  <span className="team-position">Position {team.position}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={handleStartGame}
            disabled={teams.length < (gameSession?.num_teams || 0)}
          >
            {teams.length < (gameSession?.num_teams || 0)
              ? `Waiting for ${(gameSession?.num_teams || 0) - teams.length} more team(s)...`
              : 'Start Game'}
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Player waiting room
  if (role === 'player' && waitingToStart) {
    return (
      <div className="game-container forest-bg">
        <div className="waiting-room">
          <h1>Welcome, {teamName}!</h1>
          <div className="room-code-display">
            <h2>Room Code</h2>
            <div className="room-code">{roomCode}</div>
          </div>

          <div className="teams-waiting">
            <h3>Teams in Lobby ({teams.length}/{gameSession?.num_teams || 0})</h3>
            <div className="teams-list">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`team-item ${Number(team.id) === Number(teamId) ? 'current-team' : ''}`}
                >
                  <span className="team-icon">🎯</span>
                  <span className="team-name">{team.team_name}</span>
                  {Number(team.id) === Number(teamId) && <span className="badge">You</span>}
                </div>
              ))}
            </div>
          </div>

          <p className="waiting-message">Waiting for facilitator to start the game...</p>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="game-container forest-bg">
      <div className="game-header">
        <div className="game-info">
          <h2>Round {currentRound}</h2>
          <span className="room-code-small">Room: {roomCode}</span>
        </div>
        {role === 'player' && (
          <div className="team-badge">
            <span>{teamName}</span>
          </div>
        )}
      </div>

      <div className="game-layout">
        <div className="game-main">
          {/* Game Board */}
          <GameBoard
            teams={teams}
            currentTurnTeamId={
              currentQuestion?.team_id ||
              (currentTurnTeam ? teams.find(t => t.team_name === currentTurnTeam)?.id : null)
            }
          />

          {/* Question Display */}
          {(diceRolling || showDiceResult) ? (
            <div className="dice-rolling-container">
              <h3>{currentTurnTeam ? `${currentTurnTeam} is rolling the dice...` : 'Rolling the dice...'}</h3>
              <div className="dice-display">
                <div className={`dice-3d ${diceAnimating ? 'rolling' : ''}`} data-face={diceResult || 1}>
                  <div className="dice-face face-1">
                    <span className="dot center"></span>
                  </div>
                  <div className="dice-face face-2">
                    <span className="dot top-right"></span>
                    <span className="dot bottom-left"></span>
                  </div>
                  <div className="dice-face face-3">
                    <span className="dot top-right"></span>
                    <span className="dot center"></span>
                    <span className="dot bottom-left"></span>
                  </div>
                  <div className="dice-face face-4">
                    <span className="dot top-left"></span>
                    <span className="dot top-right"></span>
                    <span className="dot bottom-left"></span>
                    <span className="dot bottom-right"></span>
                  </div>
                  <div className="dice-face face-5">
                    <span className="dot top-left"></span>
                    <span className="dot top-right"></span>
                    <span className="dot center"></span>
                    <span className="dot bottom-left"></span>
                    <span className="dot bottom-right"></span>
                  </div>
                  <div className="dice-face face-6">
                    <span className="dot top-left"></span>
                    <span className="dot top-right"></span>
                    <span className="dot middle-left"></span>
                    <span className="dot middle-right"></span>
                    <span className="dot bottom-left"></span>
                    <span className="dot bottom-right"></span>
                  </div>
                </div>
              </div>
              {showDiceResult && diceResult && (
                <div className="dice-result-announcement">
                  <p className="dice-result-text">Rolled a <strong>{diceResult}</strong>!</p>
                </div>
              )}
            </div>
          ) : currentQuestion ? (
            <div className="question-section">
              {currentQuestion.team_id && role === 'player' && (
                <div className="current-turn-notice">
                  {Number(currentQuestion.team_id) === Number(teamId) ? (
                    <div className="your-turn">🎯 Your Turn! Answer the question below</div>
                  ) : (
                    <div className="not-your-turn">⏳ {currentQuestion.team_name}'s turn - Please wait</div>
                  )}
                </div>
              )}
              <Timer
                duration={currentQuestion.time_limit || timeLeft}
                stopped={answerSubmitted}
                onTimeUp={handleTimeUp}
              />
              <QuestionDisplay
                question={currentQuestion}
                onSubmit={role === 'player' && Number(currentQuestion.team_id) === Number(teamId) ? handleSubmitAnswer : null}
                disabled={role === 'facilitator' || (role === 'player' && Number(currentQuestion.team_id) !== Number(teamId))}
                teamId={teamId}
              />
            </div>
          ) : waitingForDice ? (
            <div className="waiting-for-dice">
              {/* Dice Timer Display for all players */}
              {diceTimer !== null && (
                <div className="dice-timer-player">
                  <span className={`timer-countdown ${diceTimer <= 5 ? 'warning' : ''}`}>
                    ⏱️ {diceTimer}s
                  </span>
                </div>
              )}
              {role === 'player' && currentTurnTeam && teamName === currentTurnTeam ? (
                <div className="your-turn-to-roll">
                  <h2 className="turn-announcement">🎯 It's Your Turn!</h2>
                  <p>Roll the dice to get your question</p>
                  <button className="btn btn-primary btn-lg" onClick={handleRollDice}>
                    🎲 Roll Your Dice
                  </button>
                </div>
              ) : (
                <div className="other-team-turn">
                  <h2 className="turn-announcement">
                    {currentTurnTeam ? `🎲 It's ${currentTurnTeam}'s turn now!` : 'Waiting for dice roll...'}
                  </h2>
                  <p>Wait for them to roll the dice...</p>
                </div>
              )}
            </div>
          ) : (
            <div className="no-question">
              {role === 'facilitator' ? (
                allQuestionsDone ? (
                  <div className="all-questions-done">
                    <div className="done-icon">🎉</div>
                    <h2>All Questions Completed!</h2>
                    <p>Great job! All questions have been served and answered.</p>
                    <button className="btn btn-success btn-lg" onClick={handleFinishGame}>
                      🏆 Finish and Get Results
                    </button>
                  </div>
                ) : (
                  <div className="facilitator-controls">
                    <h3>Ready to serve next question?</h3>
                    <button className="btn btn-primary btn-lg" onClick={handleServeQuestion}>
                      Serve Question
                    </button>
                  </div>
                )
              ) : (
                <div className="waiting-for-question">
                  <h3>Waiting for next question...</h3>
                </div>
              )}
            </div>
          )}

          {/* Facilitator: Mini status indicator when question is active */}
          {role === 'facilitator' && currentQuestion && (
            <div className="grading-status-bar">
              <span>Answers: {submittedAnswers.length}</span>
              {timeExpired && <span className="time-expired-badge">Time Expired</span>}
            </div>
          )}
        </div>

        {/* Sidebar with Leaderboard */}
        <div className="game-sidebar">
          <Leaderboard teams={leaderboard || teams} originalTeams={teams} />

          {role === 'facilitator' && (
            <div className="facilitator-actions">
              {/* Dice Timer Display */}
              {diceTimer !== null && waitingForDice && (
                <div className="dice-timer-display">
                  <span className="dice-timer-label">Dice Timer:</span>
                  <span className={`dice-timer-value ${diceTimer <= 5 ? 'warning' : ''}`}>
                    {diceTimer}s
                  </span>
                </div>
              )}

              {/* Hop to Next Question - always available for facilitator */}
              <button
                className="btn btn-warning btn-block"
                onClick={handleHopToNextQuestion}
              >
                Hop to Next Question
              </button>

              {/* Finish Game Button */}
              <button
                className="btn btn-success btn-block"
                onClick={handleFinishGame}
              >
                Finish Game
              </button>

              <button
                className="btn btn-secondary btn-block"
                onClick={() => navigate('/dashboard')}
              >
                Exit to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grading Popup Modal (Facilitator) - Shows when answers are submitted */}
      {role === 'facilitator' && currentQuestion && submittedAnswers.length > 0 && (
        <div className="modal-overlay grading-overlay">
          <div className="modal-content grading-popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="grading-popup-header">
              <h2>Grade Submitted Answers</h2>
              <span className="answer-count-badge">{submittedAnswers.length} answer(s)</span>
            </div>
            <div className="grading-popup-content">
              {submittedAnswers.map((answer) => (
                <div key={answer.answer_id} className={`grading-answer-card ${answer.auto_graded ? (answer.auto_is_correct ? 'auto-correct' : 'auto-incorrect') : ''}`}>
                  <div className="answer-card-header">
                    <strong className="team-name-label">{answer.team_name}</strong>
                    {answer.auto_graded && (
                      <span className={`auto-grade-badge ${answer.auto_is_correct ? 'correct' : 'incorrect'}`}>
                        {answer.auto_is_correct ? '✓ Auto: Correct' : '✗ Auto: Incorrect'}
                      </span>
                    )}
                  </div>
                  <div className="answer-card-body">
                    <div className="answer-display">
                      <span className="label">Answer:</span>
                      <span className="value">{answer.submitted_answer}</span>
                    </div>
                    {answer.correct_answer && (
                      <div className="correct-answer-display">
                        <span className="label">Correct:</span>
                        <span className="value">{answer.correct_answer}</span>
                      </div>
                    )}
                  </div>
                  <div className="answer-card-actions">
                    {answer.auto_graded && answer.auto_is_correct ? (
                      <>
                        <button
                          className="btn btn-success"
                          onClick={() => handleGradeAnswer(answer.answer_id, true, answer.auto_points)}
                        >
                          Accept ({answer.auto_points} pts)
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleGradeAnswer(answer.answer_id, true, answer.auto_points + 1)}
                        >
                          + Bonus ({answer.auto_points + 1} pts)
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleGradeAnswer(answer.answer_id, false, 0)}
                        >
                          Override: Incorrect
                        </button>
                      </>
                    ) : answer.auto_graded && !answer.auto_is_correct ? (
                      <>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleGradeAnswer(answer.answer_id, false, 0)}
                        >
                          Accept (0 pts)
                        </button>
                        <button
                          className="btn btn-success"
                          onClick={() => {
                            const pts = currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3;
                            handleGradeAnswer(answer.answer_id, true, pts);
                          }}
                        >
                          Override: Correct
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            const pts = currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3;
                            handleGradeAnswer(answer.answer_id, true, pts + 1);
                          }}
                        >
                          Correct + Bonus
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-success"
                          onClick={() => {
                            const pts = currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3;
                            handleGradeAnswer(answer.answer_id, true, pts);
                          }}
                        >
                          Correct ({currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? '2' : '3'} pts)
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            const pts = currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3;
                            handleGradeAnswer(answer.answer_id, true, pts + 1);
                          }}
                        >
                          + Bonus ({(currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3) + 1} pts)
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleGradeAnswer(answer.answer_id, false, 0)}
                        >
                          Incorrect (0 pts)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Time Expired Modal (Facilitator) */}
      {role === 'facilitator' && currentQuestion && timeExpired && submittedAnswers.length === 0 && (
        <div className="modal-overlay">
          <div className="modal-content time-expired-modal" onClick={(e) => e.stopPropagation()}>
            <div className="time-expired-icon">⏰</div>
            <h2>Time Expired!</h2>
            <p>No answer was submitted for this question.</p>
            <button
              className="btn btn-secondary btn-lg"
              onClick={handleSkipQuestion}
            >
              Skip Question (0 pts)
            </button>
          </div>
        </div>
      )}

      {/* Detailed Grading Modal (for non-MCQ questions) */}
      {showGradingModal && pendingAnswer && (
        <div className="modal-overlay" onClick={() => setShowGradingModal(false)}>
          <div className="modal-content grading-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Grade Answer</h2>
            <div className="answer-to-grade">
              <p><strong>Team:</strong> {pendingAnswer.team_name}</p>
              <p><strong>Answer:</strong> {pendingAnswer.submitted_answer}</p>
              {currentQuestion?.model_answer && (
                <p><strong>Model Answer:</strong> {currentQuestion.model_answer}</p>
              )}
            </div>
            <div className="grading-actions">
              <button
                className="btn btn-success"
                onClick={() => {
                  const points = currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3;
                  handleGradeAnswer(pendingAnswer.answer_id, true, points);
                }}
              >
                Correct ({currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? '2' : '3'} pts)
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const points = (currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3) + 1;
                  handleGradeAnswer(pendingAnswer.answer_id, true, points);
                }}
              >
                Correct + Bonus ({(currentQuestion.difficulty === 'Easy' || currentQuestion.difficulty === 'Medium' ? 2 : 3) + 1} pts)
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleGradeAnswer(pendingAnswer.answer_id, false, 0)}
              >
                Incorrect (0 pts)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dice Skip Modal (when player doesn't roll) */}
      {showDiceSkipModal && role === 'facilitator' && (
        <div className="modal-overlay">
          <div className="modal-content dice-skip-modal" onClick={(e) => e.stopPropagation()}>
            <div className="skip-modal-icon">⏰</div>
            <h2>Time's Up!</h2>
            <p>{currentTurnTeam} didn't roll the dice in time.</p>
            <div className="skip-modal-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleHopToNextQuestion}
              >
                Hop to Next Question
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDiceSkipModal(false)}
              >
                Wait More
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Popup (for players after grading) */}
      {showResultPopup && resultData && (
        <ResultPopup
          isCorrect={resultData.isCorrect}
          teamName={resultData.teamName}
          points={resultData.points}
          onClose={handleCloseResultPopup}
        />
      )}

      {/* Game End Celebration */}
      {showCelebration && winners.length > 0 && (
        <div className="modal-overlay celebration-overlay">
          <div className="celebration-modal">
            <div className="confetti-burst">
              {Array.from({ length: 100 }, (_, i) => (
                <div
                  key={i}
                  className="celebration-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff8fab', '#a855f7'][Math.floor(Math.random() * 6)]
                  }}
                />
              ))}
            </div>
            <div className="celebration-content">
              <div className="trophy-icon">{winners.length > 1 ? '🏆🏆' : '🏆'}</div>
              <h1>Game Over!</h1>
              <h2 className="winner-announcement">
                {winners.length > 1 ? (
                  <>It's a Tie! {winners.map(w => w.team_name || w.name).join(' & ')} Win!</>
                ) : (
                  <>{winners[0].team_name || winners[0].name} Wins!</>
                )}
              </h2>
              <p className="winner-score">
                Final Score: {winners[0]?.score || 0} points
              </p>
              <div className="final-leaderboard">
                <h3>Final Standings</h3>
                <Leaderboard teams={leaderboard || teams} originalTeams={teams} />
              </div>
              {role === 'player' && (
                <p className="exit-game-hint">
                  Click the button below to exit and return to the join game page.
                </p>
              )}
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate(role === 'facilitator' ? '/dashboard' : '/play')}
              >
                {role === 'facilitator' ? 'Back to Dashboard' : 'Exit Game'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GamePage;
