import { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import toast from 'react-hot-toast';
import { gameAPI } from '../utils/api';

// Use environment variable for production, fallback to local for development
// WebSocket URL is derived from API URL or set explicitly
const getWebSocketUrl = () => {
  const wsUrl = import.meta.env.VITE_WS_URL;
  if (wsUrl) return wsUrl;

  // Derive from API URL if not set
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Convert http(s)://domain/api to ws(s)://domain
    return apiUrl
      .replace('/api', '')
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
  }

  return 'ws://localhost:8000';
};

const WS_BASE_URL = getWebSocketUrl();

export const useWebSocket = (sessionId, role, teamId = null, callbacks = {}) => {
  const wsRef = useRef(null);
  const callbacksRef = useRef(callbacks);
  const [isConnected, setIsConnected] = useState(false);
  const {
    setTeams,
    setLeaderboard,
    setCurrentQuestion,
    setGameStatus,
    setTimeLeft,
    setCurrentRound
  } = useGame();

  // Keep callbacks ref up to date on every render
  useEffect(() => {
    callbacksRef.current = callbacks;
  });

  // Stable message handler that reads from refs
  const handleMessage = useCallback(async (message) => {
    const { type, data } = message;
    const currentCallbacks = callbacksRef.current;

    switch (type) {
      case 'team_joined':
        toast.success(`${data.name} joined the game!`);
        // Refresh teams list from API
        try {
          const response = await gameAPI.getTeams(data.session_id);
          setTeams(response.data || []);
        } catch (error) {
          // Silent fail - teams will update on next event
        }
        break;

      case 'game_started':
        setGameStatus('in_progress');
        toast.success('Game has started!');
        break;

      case 'question_ready_for_dice':
        // Question allocated, now assigned team needs to roll dice
        if (currentCallbacks.onQuestionReadyForDice) {
          currentCallbacks.onQuestionReadyForDice(data.team_name);
        }
        break;

      case 'dice_rolled':
        // A team rolled the dice - result shown on dice face, no toast needed
        if (currentCallbacks.onDiceRolled) {
          currentCallbacks.onDiceRolled(data);
        }
        break;

      case 'question_served':
        // Add team info to question object
        const questionWithTeam = {
          ...data.question,
          team_id: data.current_team.id,
          team_name: data.current_team.name
        };
        setTimeLeft(data.question.time_limit);
        setCurrentRound(data.round_number);
        // Pass question to callback - let GamePage decide when to show it
        // (may need to wait for dice animation to complete)
        if (currentCallbacks.onQuestionServed) {
          currentCallbacks.onQuestionServed(questionWithTeam);
        } else {
          // Fallback if no callback - set directly
          setCurrentQuestion(questionWithTeam);
        }
        break;

      case 'answer_submitted':
        toast.info(`${data.team_name} submitted their answer`);
        if (currentCallbacks.onAnswerSubmitted) {
          currentCallbacks.onAnswerSubmitted(data);
        }
        break;

      case 'answer_submitted_details':
        // Non-MCQ answer details sent to facilitator for grading
        if (currentCallbacks.onAnswerSubmittedDetails) {
          currentCallbacks.onAnswerSubmittedDetails(data);
        }
        break;

      case 'answer_graded':
        const teamName = data.team_name || 'A team';
        const resultMessage = data.is_correct
          ? `✅ ${teamName}: Correct! +${data.points_awarded} pts`
          : `❌ ${teamName}: Incorrect (0 pts)`;
        toast.success(resultMessage, {
          duration: 4000,
          style: {
            background: data.is_correct ? '#10b981' : '#ef4444',
            color: '#fff',
          }
        });
        if (currentCallbacks.onAnswerGraded) {
          currentCallbacks.onAnswerGraded(data);
        }
        break;

      case 'leaderboard_update':
        setLeaderboard(data.leaderboard);
        // Also update teams with the new scores and positions
        if (data.leaderboard && data.leaderboard.length > 0) {
          setTeams(prevTeams => {
            return prevTeams.map(team => {
              const updatedTeam = data.leaderboard.find(l => l.id === team.id);
              if (updatedTeam) {
                return {
                  ...team,
                  score: updatedTeam.score,
                  position: updatedTeam.position
                };
              }
              return team;
            });
          });
        }
        break;

      case 'timer_started':
        // Handle timer
        break;

      case 'time_up':
        toast.error("Time's up!", { icon: '⏰' });
        if (currentCallbacks.onTimeUp) {
          currentCallbacks.onTimeUp();
        }
        break;

      case 'game_ended':
        setGameStatus('completed');
        // Update leaderboard with final standings if provided
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        }
        if (currentCallbacks.onGameEnded) {
          currentCallbacks.onGameEnded(data);
        }
        break;

      default:
        break;
    }
  }, [setTeams, setGameStatus, setCurrentQuestion, setTimeLeft, setCurrentRound, setLeaderboard]);

  useEffect(() => {
    if (!sessionId) return;

    const wsUrl = `${WS_BASE_URL}/ws/${sessionId}/${role}${teamId ? `?team_id=${teamId}` : ''}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      handleMessage(message);
    };

    ws.onerror = () => {
      toast.error('Connection error. Please refresh the page.');
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current = ws;

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId, role, teamId, handleMessage]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const requestLeaderboard = useCallback(() => {
    sendMessage({ type: 'request_leaderboard' });
  }, [sendMessage]);

  return {
    isConnected,
    sendMessage,
    requestLeaderboard,
  };
};
