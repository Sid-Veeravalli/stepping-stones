/**
 * API utility for backend communication
 */
import axios from 'axios';

// Use environment variable for production, fallback to local for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ====================  Authentication ====================
export const facilitatorAPI = {
  register: (data) => api.post('/facilitator/register', data),
  login: (data) => api.post('/facilitator/login', new URLSearchParams(data), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }),
  getMe: () => api.get('/facilitator/me'),
};

// ==================== Quiz ====================
export const quizAPI = {
  create: (data) => api.post('/quizzes', data),
  getAll: () => api.get('/quizzes'),
  getById: (id) => api.get(`/quizzes/${id}`),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  validate: (id) => api.post(`/quizzes/${id}/validate`),
  launch: (id) => api.post(`/quizzes/${id}/launch`),
};

// ==================== Questions ====================
export const questionAPI = {
  create: (quizId, data) => api.post(`/quizzes/${quizId}/questions`, data),
  getAll: (quizId) => api.get(`/quizzes/${quizId}/questions`),
  update: (quizId, questionId, data) => api.put(`/questions/${questionId}`, data),
  delete: (quizId, questionId) => api.delete(`/questions/${questionId}`),
  getCounts: (quizId) => api.get(`/quizzes/${quizId}/questions/count`),
  importExcel: (quizId, formData) => {
    return api.post(`/quizzes/${quizId}/questions/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
};

// ==================== Game ====================
export const gameAPI = {
  joinTeam: (data) => api.post('/game/join', data),
  getByRoomCode: (roomCode) => api.get(`/game/room/${roomCode}`),
  getSession: (sessionId) => api.get(`/game/${sessionId}`),
  getGameState: (sessionId) => api.get(`/game/${sessionId}/state`),
  startGame: (sessionId) => api.post(`/game/${sessionId}/start`),
  getTeams: (sessionId) => api.get(`/game/${sessionId}/teams`),
  submitAnswer: (sessionId, data) => api.post(`/game/${sessionId}/answer`, data),
  gradeAnswer: (sessionId, data) => api.post(`/game/${sessionId}/grade`, data),
  serveQuestion: (sessionId) => api.post(`/game/${sessionId}/question/serve`),
};

export default api;
